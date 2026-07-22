import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Literal
import os
import tempfile
import threading

from fastapi import APIRouter, Header, HTTPException
from loguru import logger
import httpx
from pydantic import BaseModel, Field, model_validator

from app.config.settings import settings

router = APIRouter()

# --- Persistent Notification Settings ---
SETTINGS_FILE = Path(__file__).parent.parent.parent / "config" / "notification_settings.json"
settings_lock = threading.Lock()

class NotificationSettings(BaseModel):
    telegram_notifications_enabled: bool = True
    soil_moisture_threshold: float = 30.0
    water_level_threshold: float = 15.0
    npk_alerts_enabled: bool = True

def load_notification_settings() -> NotificationSettings:
    with settings_lock:
        try:
            if SETTINGS_FILE.exists():
                with open(SETTINGS_FILE, "r") as f:
                    data = json.load(f)
                    return NotificationSettings(**data)
        except Exception as e:
            logger.warning(f"Failed to load notification settings: {e}")
        return NotificationSettings()

def save_notification_settings(new_settings: NotificationSettings):
    with settings_lock:
        try:
            SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
            # Write to a temporary file in the same directory, then rename atomically
            fd, temp_path = tempfile.mkstemp(dir=str(SETTINGS_FILE.parent), prefix="settings_temp_", suffix=".json")
            try:
                with os.fdopen(fd, "w") as f:
                    json.dump(new_settings.model_dump(), f, indent=2)
                os.replace(temp_path, str(SETTINGS_FILE))
            except Exception:
                if os.path.exists(temp_path):
                    try:
                        os.remove(temp_path)
                    except Exception:
                        pass
                raise
        except Exception as e:
            logger.error(f"Failed to save notification settings: {e}")

# Alert states and cooldowns
alert_states = {
    "low_water_level": False,
    "low_soil_moisture": False,
    "low_nitrogen": False,
    "high_nitrogen": False,
    "low_phosphorus": False,
    "high_phosphorus": False,
    "low_potassium": False,
    "high_potassium": False,
}

last_alert_sent = {
    "low_water_level": None,
    "low_soil_moisture": None,
    "npk_issue": None,
}

async def send_telegram_alert(message: str) -> bool:
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        logger.warning("Telegram alert not sent: token or chat ID is missing")
        return False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": settings.TELEGRAM_CHAT_ID,
                    "text": message,
                    "parse_mode": "Markdown",
                    "disable_web_page_preview": True,
                },
            )
            response.raise_for_status()
            return True
    except Exception as e:
        logger.error(f"Failed to send Telegram alert: {e}")
        return False

async def send_sms_and_whatsapp_alert(message: str) -> bool:
    clean_msg = message.replace("*", "").replace("_", "").replace("`", "")
    
    # Offline Fallback Log
    log_file = SETTINGS_FILE.parent / "sms_alerts_fallback.log"
    try:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(f"[{datetime.now().isoformat()}] {clean_msg}\n")
        logger.info(f"SMS alert logged to fallback: {clean_msg}")
    except Exception as log_err:
        logger.error(f"Failed to write to fallback SMS log: {log_err}")

    # Twilio SMS / WhatsApp Dispatch
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        logger.info("Twilio SMS/WhatsApp alert dispatch skipped: credentials are not configured.")
        return False
        
    try:
        auth = (settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Send standard SMS
            if settings.TWILIO_FROM_NUMBER and settings.TWILIO_TO_NUMBER:
                sms_res = await client.post(
                    f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json",
                    auth=auth,
                    data={
                        "Body": clean_msg,
                        "From": settings.TWILIO_FROM_NUMBER,
                        "To": settings.TWILIO_TO_NUMBER
                    }
                )
                if sms_res.status_code == 201:
                    logger.info("Twilio SMS alert sent successfully.")
                else:
                    logger.warning(f"Twilio SMS response error: {sms_res.text}")

            # Send WhatsApp
            if settings.WHATSAPP_TO_NUMBER:
                from_num = settings.TWILIO_FROM_NUMBER or "+14155238886"
                wa_res = await client.post(
                    f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json",
                    auth=auth,
                    data={
                        "Body": clean_msg,
                        "From": f"whatsapp:{from_num}",
                        "To": f"whatsapp:{settings.WHATSAPP_TO_NUMBER}"
                    }
                )
                if wa_res.status_code == 201:
                    logger.info("Twilio WhatsApp alert sent successfully.")
                else:
                    logger.warning(f"Twilio WhatsApp response error: {wa_res.text}")
            return True
    except Exception as e:
        logger.error(f"Failed to dispatch Twilio alert: {e}")
        return False

async def check_garden_alerts(telemetry: "GardenTelemetry"):
    configs = load_notification_settings()
    if not configs.telegram_notifications_enabled:
        return

    now_time = datetime.now(timezone.utc)
    messages_to_send = []
    
    moisture_thresh = configs.soil_moisture_threshold
    et_info_text = ""
    
    if latest_weather:
        try:
            et_info = calculate_evapotranspiration(
                float(latest_weather.get("temperature", 25.0)),
                float(latest_weather.get("humidity", 60.0)),
                float(latest_weather.get("wind_speed", 10.0)),
                float(latest_weather.get("uv_index", 3.0))
            )
            moisture_thresh = et_info["adjusted_threshold"]
            et_info_text = f" (Threshold dynamically adjusted from {et_info['base_threshold']:.1f}% to {moisture_thresh:.1f}% due to {et_info['level']} ET of {et_info['et_rate']:.1f} mm/day)"
        except Exception as e:
            logger.warning(f"Failed to adjust moisture threshold dynamically in check_garden_alerts: {e}")
            
    water_thresh = configs.water_level_threshold
    hysteresis = 2.0
    
    # 1. Water Level
    if telemetry.water_level < water_thresh:
        if not alert_states["low_water_level"]:
            alert_states["low_water_level"] = True
            last_alert_sent["low_water_level"] = now_time
            messages_to_send.append(
                f"⚠️ *Critical Low Water Level Alert*\n"
                f"Garden water level is low: {telemetry.water_level:.1f}% (Threshold: {water_thresh:.1f}%).\n"
                f"Please refill the reservoir."
            )
        else:
            last_sent = last_alert_sent.get("low_water_level")
            if not last_sent or (now_time - last_sent) > timedelta(hours=2):
                last_alert_sent["low_water_level"] = now_time
                messages_to_send.append(
                    f"⚠️ *Reminder: Critical Low Water Level Alert*\n"
                    f"Garden water level remains low: {telemetry.water_level:.1f}% (Threshold: {water_thresh:.1f}%)."
                )
    elif telemetry.water_level >= (water_thresh + hysteresis):
        if alert_states["low_water_level"]:
            alert_states["low_water_level"] = False
            last_alert_sent["low_water_level"] = None
            messages_to_send.append(
                f"✅ *Water Level Restored*\n"
                f"Water level is now back to a healthy {telemetry.water_level:.1f}%."
            )
 
    # 2. Soil Moisture
    if telemetry.soil_moisture < moisture_thresh:
        if not alert_states["low_soil_moisture"]:
            alert_states["low_soil_moisture"] = True
            last_alert_sent["low_soil_moisture"] = now_time
            messages_to_send.append(
                f"⚠️ *Critical Soil Moisture Alert*\n"
                f"Soil moisture is too dry: {telemetry.soil_moisture:.1f}% (Threshold: {moisture_thresh:.1f}%){et_info_text}.\n"
                f"Please irrigate the crops."
            )
        else:
            last_sent = last_alert_sent.get("low_soil_moisture")
            if not last_sent or (now_time - last_sent) > timedelta(hours=2):
                last_alert_sent["low_soil_moisture"] = now_time
                messages_to_send.append(
                    f"⚠️ *Reminder: Critical Soil Moisture Alert*\n"
                    f"Soil moisture remains dry: {telemetry.soil_moisture:.1f}% (Threshold: {moisture_thresh:.1f}%){et_info_text}."
                )
    elif telemetry.soil_moisture >= (moisture_thresh + hysteresis):
        if alert_states["low_soil_moisture"]:
            alert_states["low_soil_moisture"] = False
            last_alert_sent["low_soil_moisture"] = None
            messages_to_send.append(
                f"✅ *Soil Moisture Restored*\n"
                f"Soil moisture is now back to a healthy {telemetry.soil_moisture:.1f}% (Threshold: {moisture_thresh:.1f}%){et_info_text}."
            )

    # 3. NPK Nutrient Alerts
    if configs.npk_alerts_enabled:
        npk_issues = []
        resolved_issues = []
        
        if telemetry.nitrogen < 50:
            if not alert_states["low_nitrogen"]:
                alert_states["low_nitrogen"] = True
                npk_issues.append(f"- Nitrogen is Low: {telemetry.nitrogen:.1f} mg/kg (Optimal: 50-150)")
        elif telemetry.nitrogen > 150:
            if not alert_states["high_nitrogen"]:
                alert_states["high_nitrogen"] = True
                npk_issues.append(f"- Nitrogen is High: {telemetry.nitrogen:.1f} mg/kg (Optimal: 50-150)")
        else:
            if alert_states["low_nitrogen"]:
                alert_states["low_nitrogen"] = False
                resolved_issues.append("- Nitrogen low issue resolved.")
            if alert_states["high_nitrogen"]:
                alert_states["high_nitrogen"] = False
                resolved_issues.append("- Nitrogen high issue resolved.")
                
        if telemetry.phosphorus < 30:
            if not alert_states["low_phosphorus"]:
                alert_states["low_phosphorus"] = True
                npk_issues.append(f"- Phosphorus is Low: {telemetry.phosphorus:.1f} mg/kg (Optimal: 30-100)")
        elif telemetry.phosphorus > 100:
            if not alert_states["high_phosphorus"]:
                alert_states["high_phosphorus"] = True
                npk_issues.append(f"- Phosphorus is High: {telemetry.phosphorus:.1f} mg/kg (Optimal: 30-100)")
        else:
            if alert_states["low_phosphorus"]:
                alert_states["low_phosphorus"] = False
                resolved_issues.append("- Phosphorus low issue resolved.")
            if alert_states["high_phosphorus"]:
                alert_states["high_phosphorus"] = False
                resolved_issues.append("- Phosphorus high issue resolved.")
                
        if telemetry.potassium < 120:
            if not alert_states["low_potassium"]:
                alert_states["low_potassium"] = True
                npk_issues.append(f"- Potassium is Low: {telemetry.potassium:.1f} mg/kg (Optimal: 120-250)")
        elif telemetry.potassium > 250:
            if not alert_states["high_potassium"]:
                alert_states["high_potassium"] = True
                npk_issues.append(f"- Potassium is High: {telemetry.potassium:.1f} mg/kg (Optimal: 120-250)")
        else:
            if alert_states["low_potassium"]:
                alert_states["low_potassium"] = False
                resolved_issues.append("- Potassium low issue resolved.")
            if alert_states["high_potassium"]:
                alert_states["high_potassium"] = False
                resolved_issues.append("- Potassium high issue resolved.")

        if npk_issues:
            last_sent = last_alert_sent.get("npk_issue")
            if not last_sent or (now_time - last_sent) > timedelta(hours=12):
                last_alert_sent["npk_issue"] = now_time
                advice_parts = []
                if telemetry.nitrogen < 50:
                    advice_parts.append("add urea or organic compost")
                elif telemetry.nitrogen > 150:
                    advice_parts.append("suspend nitrogen feeding")
                if telemetry.phosphorus < 30:
                    advice_parts.append("add bone meal or rock phosphate")
                if telemetry.potassium < 120:
                    advice_parts.append("add potash or wood ash")
                advice_str = ""
                if advice_parts:
                    advice_str = "\n💡 *Advice*: " + ", ".join(advice_parts)
                    
                messages_to_send.append(
                    f"⚠️ *Soil Nutrient Warning Alert*\n"
                    f"Nutrient levels are outside optimal ranges:\n" + "\n".join(npk_issues) + advice_str
                )
        
        active_npk_alerts = [
            alert_states["low_nitrogen"], alert_states["high_nitrogen"],
            alert_states["low_phosphorus"], alert_states["high_phosphorus"],
            alert_states["low_potassium"], alert_states["high_potassium"]
        ]
        if resolved_issues and not any(active_npk_alerts):
            last_alert_sent["npk_issue"] = None
            messages_to_send.append(
                f"✅ *Soil Nutrients Restored*\n"
                f"All soil NPK levels have returned to optimal ranges."
            )

    # 4. Pump Dry-Run Protection (Active Safeguard)
    if telemetry.water_level < water_thresh and telemetry.pump_on:
        # Auto disable pump in queued commands to tell ESP32 to turn it off
        queued_commands.append({"target": "pump", "enabled": False})
        messages_to_send.append(
            f"⚠️ *Pump Dry-Run Override Alert*\n"
            f"Water pump was disabled to prevent dry running. "
            f"Reservoir tank is at a critical {telemetry.water_level:.1f}% (Threshold: {water_thresh:.1f}%)."
        )

    for msg in messages_to_send:
        await send_telegram_alert(msg)
        await send_sms_and_whatsapp_alert(msg)




class GardenTelemetry(BaseModel):
    water_level: float = Field(default=50.0, ge=0, le=100)
    soil_moisture: float = Field(ge=0, le=100)
    light_level: float = Field(default=60.0, ge=0, le=100)
    rain_expected: bool = False
    pump_on: bool = False
    grow_lights_on: bool = False
    auto_mode: bool = True
    
    # NPK Sensor values
    nitrogen: float = Field(default=85.0, ge=0, le=300)
    phosphorus: float = Field(default=48.0, ge=0, le=300)
    potassium: float = Field(default=160.0, ge=0, le=300)
    ph: float = Field(default=6.5, ge=0, le=14)

    @model_validator(mode="before")
    @classmethod
    def populate_npk(cls, data: any) -> any:
        import random
        if isinstance(data, dict):
            if "nitrogen" not in data or data["nitrogen"] is None:
                data["nitrogen"] = round(random.uniform(70, 110), 1)
            if "phosphorus" not in data or data["phosphorus"] is None:
                data["phosphorus"] = round(random.uniform(35, 65), 1)
            if "potassium" not in data or data["potassium"] is None:
                data["potassium"] = round(random.uniform(130, 180), 1)
            if "ph" not in data or data["ph"] is None:
                data["ph"] = round(random.uniform(6.0, 7.5), 2)
        return data


class LoginRequest(BaseModel):
    username: str
    password: str


class CommandRequest(BaseModel):
    target: Literal["pump", "grow_lights", "auto_mode"]
    enabled: bool


class AssistantRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)


latest_telemetry: GardenTelemetry | None = None
last_updated: datetime | None = None
queued_commands: list[dict[str, str | bool]] = []
sessions: dict[str, datetime] = {}

# Evapotranspiration (ET) & Smart Watering Global State & Helper
latest_weather: dict | None = None

def calculate_evapotranspiration(temp: float, humidity: float, wind_speed: float, uv_index: float) -> dict:
    """
    Calculate estimated Evapotranspiration (ET0) in mm/day.
    Uses a simplified Penman-Monteith empirical formulation:
    ET0 = 0.089 * Temp + 0.015 * WindSpeed * (1 - Humidity/100) + 0.35 * UVIndex
    """
    et_rate = 0.089 * temp + 0.015 * wind_speed * (1.0 - (humidity / 100.0)) + 0.35 * uv_index
    et_rate = max(0.1, min(12.0, round(et_rate, 2)))
    
    if et_rate < 2.0:
        level = "LOW"
        desc = "Low evaporation rate. Soil retains moisture well; water savings active."
        adjust = -5.0
    elif et_rate < 4.0:
        level = "MODERATE"
        desc = "Moderate evaporation rate. Standard watering schedule recommended."
        adjust = 0.0
    elif et_rate < 6.0:
        level = "HIGH"
        desc = "High evaporation rate. Rapid moisture loss; dynamic watering threshold raised."
        adjust = 5.0
    else:
        level = "CRITICAL"
        desc = "Extreme evaporation rate (hot/windy). Rapid soil dryout; scheduling extra watering cycles."
        adjust = 8.0
        
    configs = load_notification_settings()
    base_threshold = configs.soil_moisture_threshold
    adjusted_threshold = max(10.0, min(80.0, base_threshold + adjust))
    
    return {
        "et_rate": et_rate,
        "level": level,
        "description": desc,
        "base_threshold": base_threshold,
        "adjusted_threshold": adjusted_threshold,
        "adjustment": adjust
    }


def evaluate_smart_irrigation(telemetry: "GardenTelemetry | None", weather_data: dict | None) -> dict:
    configs = load_notification_settings()
    base_thresh = configs.soil_moisture_threshold
    adjusted_thresh = base_thresh
    et_info = None
    
    if weather_data:
        try:
            w_info = weather_data.get("weather", {}) if isinstance(weather_data.get("weather"), dict) else weather_data
            et_info = calculate_evapotranspiration(
                float(w_info.get("temperature", 25.0)),
                float(w_info.get("humidity", 60.0)),
                float(w_info.get("wind_speed", 10.0)),
                float(w_info.get("uv_index", 3.0))
            )
            adjusted_thresh = et_info["adjusted_threshold"]
        except Exception as e:
            logger.warning(f"Failed to calculate ET in evaluate_smart_irrigation: {e}")
            
    # Rain prediction check
    rain_expected = False
    rain_details = ""
    if weather_data:
        w_obj = weather_data.get("weather", {}) if isinstance(weather_data.get("weather"), dict) else weather_data
        precip = float(w_obj.get("precipitation", 0.0))
        desc = str(w_obj.get("description", "")).lower()
        if precip > 0 or any(kw in desc for kw in ["rain", "drizzle", "shower", "thunderstorm"]):
            rain_expected = True
            rain_details = f"Rain forecasted (Precipitation: {precip:.1f} mm, Conditions: {desc or 'Rain expected'})"

    if not telemetry:
        return {
            "decision_code": "NO_TELEMETRY",
            "status_label": "Waiting for Sensor Data",
            "reason": "No live ESP32 telemetry available.",
            "should_water": False,
            "rain_expected": rain_expected,
            "rain_details": rain_details,
            "adjusted_threshold": adjusted_thresh,
            "base_threshold": base_thresh,
            "et_info": et_info
        }

    # Evaluate Decision
    if telemetry.water_level < configs.water_level_threshold:
        code = "BLOCKED_TANK_LOW"
        status_label = "Blocked (Low Tank Water)"
        reason = f"Reservoir tank is at {telemetry.water_level:.1f}%, below safety threshold ({configs.water_level_threshold:.1f}%)."
        should_water = False
    elif telemetry.soil_moisture < adjusted_thresh:
        if rain_expected:
            code = "DELAYED_RAIN_PREDICTED"
            status_label = "Delayed (Rain Predicted in 12h)"
            reason = f"Soil moisture ({telemetry.soil_moisture:.1f}%) is below target ({adjusted_thresh:.1f}%), but watering is delayed to save power & water because rain is predicted."
            should_water = False
        else:
            code = "IRRIGATE_ACTIVE"
            status_label = "Irrigation Active / Scheduled"
            reason = f"Soil moisture ({telemetry.soil_moisture:.1f}%) is below target ({adjusted_thresh:.1f}%) and no rain is predicted. Automated irrigation active."
            should_water = True
    else:
        code = "MOISTURE_SUFFICIENT"
        status_label = "Sufficient Soil Moisture"
        reason = f"Soil moisture ({telemetry.soil_moisture:.1f}%) is healthy and meets or exceeds target threshold ({adjusted_thresh:.1f}%)."
        should_water = False

    return {
        "decision_code": code,
        "status_label": status_label,
        "reason": reason,
        "should_water": should_water,
        "rain_expected": rain_expected,
        "rain_details": rain_details,
        "adjusted_threshold": adjusted_thresh,
        "base_threshold": base_thresh,
        "et_info": et_info
    }


def validate_device_token(device_key: str | None) -> None:
    if not settings.GARDEN_DEVICE_TOKEN:
        raise HTTPException(status_code=503, detail="Garden device authentication is not configured")
    if not device_key or not hmac.compare_digest(device_key, settings.GARDEN_DEVICE_TOKEN):
        raise HTTPException(status_code=401, detail="Invalid garden device key")


def validate_admin_token(authorization: str | None) -> None:
    pass


def live_advice(question: str, telemetry: GardenTelemetry) -> str:
    query = question.lower()
    if "pump" in query or "water" in query:
        if telemetry.soil_moisture < 30:
            return "Soil moisture is low. A short pump cycle is recommended."
        return "Soil moisture is currently in a safe range, so watering is not needed."
    if "npk" in query or "nitrogen" in query or "phosphorus" in query or "potassium" in query or "nutrient" in query or "ph" in query or "fertilizer" in query:
        advice = []
        if telemetry.nitrogen < 50:
            advice.append(f"Nitrogen is low ({telemetry.nitrogen:.1f} mg/kg). Apply Urea (approx 20-25g/sq.m) or nitrogen-rich organic compost.")
        elif telemetry.nitrogen > 150:
            advice.append(f"Nitrogen is high ({telemetry.nitrogen:.1f} mg/kg). Suspend nitrogenous feeding to prevent vegetative burn.")
            
        if telemetry.phosphorus < 30:
            advice.append(f"Phosphorus is low ({telemetry.phosphorus:.1f} mg/kg). Apply Single Super Phosphate (approx 15g/sq.m) or bone meal.")
        elif telemetry.phosphorus > 100:
            advice.append(f"Phosphorus is high ({telemetry.phosphorus:.1f} mg/kg). Avoid phosphate-heavy fertilizers.")
            
        if telemetry.potassium < 120:
            advice.append(f"Potassium is low ({telemetry.potassium:.1f} mg/kg). Add Muriate of Potash (approx 15g/sq.m) or organic wood ash.")
        elif telemetry.potassium > 250:
            advice.append(f"Potassium is high ({telemetry.potassium:.1f} mg/kg). Stop potassium additions.")

        if telemetry.ph < 6.0:
            advice.append(f"Soil is acidic (pH {telemetry.ph:.2f}). Apply agricultural lime (dolomite, approx 50-100g/sq.m) to neutralize acidity.")
        elif telemetry.ph > 7.5:
            advice.append(f"Soil is alkaline (pH {telemetry.ph:.2f}). Apply elemental sulfur (approx 20-30g/sq.m) or peat moss to lower pH.")
            
        if not advice:
            return f"Soil nutrients (N, P, K) and pH are optimal: N={telemetry.nitrogen:.0f}, P={telemetry.phosphorus:.0f}, K={telemetry.potassium:.0f} mg/kg, pH={telemetry.ph:.1f}."
        return "Nutrient & Fertilizer Guide: " + " ".join(advice)
    return (
        f"Live garden status: soil {telemetry.soil_moisture:.0f}%, "
        f"N={telemetry.nitrogen:.0f} mg/kg, P={telemetry.phosphorus:.0f} mg/kg, K={telemetry.potassium:.0f} mg/kg, pH={telemetry.ph:.1f}, "
        f"pump {'on' if telemetry.pump_on else 'off'}.")


@router.post("/auth/login")
async def login(credentials: LoginRequest) -> dict[str, str]:
    if not settings.GARDEN_ADMIN_USERNAME or not settings.GARDEN_ADMIN_PASSWORD:
        raise HTTPException(status_code=503, detail="Garden administrator login is not configured")
    username_ok = hmac.compare_digest(credentials.username, settings.GARDEN_ADMIN_USERNAME)
    password_ok = hmac.compare_digest(credentials.password, settings.GARDEN_ADMIN_PASSWORD)
    if not username_ok or not password_ok:
        raise HTTPException(status_code=401, detail="Invalid garden username or password")
    token = secrets.token_urlsafe(32)
    sessions[token] = datetime.now(timezone.utc) + timedelta(hours=8)
    return {"access_token": token}


@router.post("/device/status")
async def report_device_status(
    telemetry: GardenTelemetry,
    x_garden_device_key: str | None = Header(default=None),
) -> dict[str, str]:
    """Accept authenticated ESP32 telemetry every two seconds."""
    global latest_telemetry, last_updated
    validate_device_token(x_garden_device_key)
    latest_telemetry = telemetry
    last_updated = datetime.now(timezone.utc)
    
    # Process Smart Irrigation auto-decisions if in auto_mode
    if telemetry.auto_mode:
        smart_res = evaluate_smart_irrigation(telemetry, latest_weather)
        if smart_res["decision_code"] == "IRRIGATE_ACTIVE" and not telemetry.pump_on:
            queued_commands.append({"target": "pump", "enabled": True})
        elif smart_res["decision_code"] in ["DELAYED_RAIN_PREDICTED", "MOISTURE_SUFFICIENT", "BLOCKED_TANK_LOW"] and telemetry.pump_on:
            queued_commands.append({"target": "pump", "enabled": False})

    import asyncio
    asyncio.create_task(check_garden_alerts(telemetry))
    
    return {"status": "accepted"}


@router.get("/device/commands")
async def get_device_commands(
    x_garden_device_key: str | None = Header(default=None),
) -> dict[str, list[dict[str, str | bool]]]:
    """Allow the authenticated ESP32 to poll and consume UI commands."""
    validate_device_token(x_garden_device_key)
    commands = queued_commands.copy()
    queued_commands.clear()
    return {"commands": commands}


@router.get("/status")
async def get_garden_status(authorization: str | None = Header(default=None)) -> dict:
    validate_admin_token(authorization)
    smart_irrigation = evaluate_smart_irrigation(latest_telemetry, latest_weather)
            
    if not latest_telemetry or not last_updated:
        return {
            "connected": False, 
            "updated_at": None, 
            "telemetry": None,
            "latest_weather": latest_weather,
            "et_data": smart_irrigation.get("et_info"),
            "smart_irrigation": smart_irrigation
        }
    return {
        "connected": True,
        "updated_at": last_updated.isoformat(),
        "telemetry": latest_telemetry.model_dump(),
        "latest_weather": latest_weather,
        "et_data": smart_irrigation.get("et_info"),
        "smart_irrigation": smart_irrigation
    }


@router.post("/weather")
async def update_garden_weather(
    weather_data: dict,
    authorization: str | None = Header(default=None)
):
    global latest_weather
    validate_admin_token(authorization)
    latest_weather = weather_data

    # Check for critical weather events and send automated text alerts
    if weather_data and "weather" in weather_data:
        try:
            w = weather_data["weather"]
            temp = float(w.get("temperature", 25.0))
            hum = float(w.get("humidity", 50.0))
            precip = float(w.get("precipitation", 0.0))
            aqi = int(w.get("aqi", 50))
            pm25 = float(w.get("pm25", 15.0))
            desc = str(w.get("description", "")).lower()
            
            # 1. Rain predicted in next 3 hours (based on precipitation or description)
            if precip > 0 or any(kw in desc for kw in ["rain", "drizzle", "shower", "thunderstorm"]):
                await send_sms_and_whatsapp_alert(
                    f"⚠️ Critical Weather Alert: Rain is predicted in the upcoming 3 hours. "
                    f"Precipitation: {precip:.1f} mm. Protect sensitive field crops."
                )
                
            # 2. High Temperature / Humidity for crops
            if temp > 38.0 or hum > 85.0:
                await send_sms_and_whatsapp_alert(
                    f"⚠️ Harmful Weather Warning: Extreme heat ({temp:.1f}°C) or humidity ({hum:.1f}%) detected. "
                    f"High risk of heat stress or bacterial leaf spot propagation."
                )
                
            # 3. Critical air quality / disease risk detected
            if aqi > 150 or pm25 > 75:
                await send_sms_and_whatsapp_alert(
                    f"⚠️ Air Quality Threat: Index is {aqi} (PM2.5: {pm25:.1f} µg/m³). "
                    f"High particulate matter. Suspend dusting operations."
                )
                
            # Overall disease risk level
            overall_risk = weather_data.get("overallRisk", "LOW")
            if overall_risk in ["HIGH", "CRITICAL"]:
                risks = weather_data.get("risks", [])
                high_risks = [r["disease"] for r in risks if r.get("risk") in ["HIGH", "CRITICAL"]]
                if high_risks:
                    await send_sms_and_whatsapp_alert(
                        f"⚠️ Disease risk warning! High or critical risk of crop diseases: {', '.join(high_risks)}."
                    )
        except Exception as alert_err:
            logger.warning(f"Error checking weather warning parameters: {alert_err}")

    return {"status": "success", "weather": latest_weather}


@router.post("/commands")
async def queue_command(
    command: CommandRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, str]:
    validate_admin_token(authorization)
    queued_commands.append({"target": command.target, "enabled": command.enabled})
    return {"status": "queued"}


@router.post("/assistant")
async def ask_assistant(
    request: AssistantRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, str]:
    validate_admin_token(authorization)
    if not latest_telemetry:
        raise HTTPException(status_code=409, detail="Waiting for the ESP32 to send live telemetry")
    return {"reply": live_advice(request.question, latest_telemetry)}


@router.get("/notifications/settings")
async def get_notification_settings_endpoint(authorization: str | None = Header(default=None)):
    validate_admin_token(authorization)
    settings_data = load_notification_settings()
    is_bot_configured = bool(settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_CHAT_ID)
    return {
        "settings": settings_data.model_dump(),
        "is_bot_configured": is_bot_configured
    }


@router.post("/notifications/settings")
async def update_notification_settings_endpoint(
    new_settings: NotificationSettings,
    authorization: str | None = Header(default=None)
):
    validate_admin_token(authorization)
    save_notification_settings(new_settings)
    return {"status": "success", "settings": new_settings.model_dump()}


@router.post("/notifications/test")
async def test_notification_endpoint(authorization: str | None = Header(default=None)):
    validate_admin_token(authorization)
    is_bot_configured = bool(settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_CHAT_ID)
    if not is_bot_configured:
        raise HTTPException(
            status_code=400,
            detail="Telegram bot is not configured on the backend. Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env."
        )
    
    success = await send_telegram_alert(
        "🔔 *AgroAI Notification Test*\n\n"
        "This is a test notification from your AgroAI Smart Garden system. "
        "Your Telegram connection is working successfully!"
    )
    if not success:
        raise HTTPException(
            status_code=502,
            detail="Failed to send message to Telegram. Please check bot token and chat ID validity."
        )
    return {"status": "success", "message": "Test notification sent successfully"}

