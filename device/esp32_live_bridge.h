#pragma once

/*
  Include this file in the existing ESP32 sketch after HTTPClient and
  ArduinoJson are included. Set both values before uploading.

  The backend must be reachable from the ESP32 on the same LAN. Do not use
  localhost or 127.0.0.1 here: use the LAN IP address of the backend PC.
*/

const char* GARDEN_API_BASE = "http://YOUR_BACKEND_LAN_IP:8000/api/v1/garden";
const char* GARDEN_DEVICE_TOKEN = "SET_THE_SAME_GARDEN_DEVICE_TOKEN_AS_THE_BACKEND";

void turnPumpOn();
void turnPumpOff();

void setGrowLights(bool enabled) {
  digitalWrite(LED_RED_PIN, enabled ? HIGH : LOW);
  digitalWrite(LED_BLUE_PIN, enabled ? HIGH : LOW);
  digitalWrite(LED_GREEN_PIN, LOW);
  lightState = enabled;
}

void reportGardenTelemetry() {
  if (WiFi.status() != WL_CONNECTED) return;

  DynamicJsonDocument payload(512);
  payload["water_level"] = currentWaterLevel;
  payload["soil_moisture"] = currentSoilMoisture;
  payload["light_level"] = map(currentLightLevel, 0, 4095, 0, 100);
  payload["rain_expected"] = rainExpected;
  payload["pump_on"] = pumpState;
  payload["grow_lights_on"] = lightState;
  payload["auto_mode"] = autoMode;

  String body;
  serializeJson(payload, body);
  HTTPClient http;
  http.begin(String(GARDEN_API_BASE) + "/device/status");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Garden-Device-Key", GARDEN_DEVICE_TOKEN);
  int status = http.POST(body);
  if (status < 200 || status >= 300) {
    Serial.printf("Garden telemetry report failed: %d\n", status);
  }
  http.end();
}

void collectGardenCommands() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(String(GARDEN_API_BASE) + "/device/commands");
  http.addHeader("X-Garden-Device-Key", GARDEN_DEVICE_TOKEN);
  int status = http.GET();
  if (status != 200) {
    Serial.printf("Garden command poll failed: %d\n", status);
    http.end();
    return;
  }

  DynamicJsonDocument response(1024);
  DeserializationError error = deserializeJson(response, http.getString());
  http.end();
  if (error) return;

  for (JsonObject command : response["commands"].as<JsonArray>()) {
    String target = command["target"] | "";
    bool enabled = command["enabled"] | false;
    if (target == "pump") {
      enabled ? turnPumpOn() : turnPumpOff();
      autoMode = false;
    } else if (target == "grow_lights") {
      setGrowLights(enabled);
      autoMode = false;
    } else if (target == "auto_mode") {
      autoMode = enabled;
    }
  }
}
