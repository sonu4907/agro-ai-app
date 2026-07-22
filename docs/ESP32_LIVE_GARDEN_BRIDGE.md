# ESP32 live-garden bridge

The React Garden section is now live-only: it shows no sensor values until your ESP32 reports authenticated telemetry.

## 1. Configure the server

Copy the garden settings from `.env.example` into `.env` and set unique values for:

```text
GARDEN_DEVICE_TOKEN=a-long-random-device-token
GARDEN_ADMIN_USERNAME=your-admin-name
GARDEN_ADMIN_PASSWORD=a-strong-password
```

Restart the FastAPI backend after changing `.env`.

## 2. Add these values to the ESP32 sketch

Your computer's current LAN address is `192.168.1.34`. The ESP32 must join the same Wi-Fi/LAN; change this address whenever the computer's LAN address changes.

```cpp
const char* GARDEN_API_BASE = "http://192.168.1.34:8000/api/v1/garden";
const char* GARDEN_DEVICE_TOKEN = "use-the-same-value-as-the-server";
```

## 3. Add these functions to the sketch

```cpp
void applyGardenCommand(const String& target, bool enabled) {
  if (target == "pump") {
    enabled ? turnPumpOn() : turnPumpOff();
    autoMode = false;
  } else if (target == "grow_lights") {
    digitalWrite(LED_RED_PIN, enabled ? HIGH : LOW);
    digitalWrite(LED_BLUE_PIN, enabled ? HIGH : LOW);
    digitalWrite(LED_GREEN_PIN, LOW);
    lightState = enabled;
    autoMode = false;
  } else if (target == "auto_mode") {
    autoMode = enabled;
  }
}

void syncGardenWithBackend() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient telemetryHttp;
  telemetryHttp.begin(String(GARDEN_API_BASE) + "/device/status");
  telemetryHttp.addHeader("Content-Type", "application/json");
  telemetryHttp.addHeader("X-Garden-Device-Key", GARDEN_DEVICE_TOKEN);

  StaticJsonDocument<320> telemetry;
  telemetry["water_level"] = currentWaterLevel;
  telemetry["soil_moisture"] = currentSoilMoisture;
  telemetry["light_level"] = map(currentLightLevel, 0, 4095, 0, 100);
  telemetry["rain_expected"] = rainExpected;
  telemetry["pump_on"] = pumpState;
  telemetry["grow_lights_on"] = lightState;
  telemetry["auto_mode"] = autoMode;
  String payload;
  serializeJson(telemetry, payload);
  telemetryHttp.POST(payload);
  telemetryHttp.end();

  HTTPClient commandHttp;
  commandHttp.begin(String(GARDEN_API_BASE) + "/device/commands");
  commandHttp.addHeader("X-Garden-Device-Key", GARDEN_DEVICE_TOKEN);
  if (commandHttp.GET() == HTTP_CODE_OK) {
    StaticJsonDocument<512> response;
    if (deserializeJson(response, commandHttp.getString()) == DeserializationError::Ok) {
      for (JsonObject command : response["commands"].as<JsonArray>()) {
        applyGardenCommand(command["target"].as<String>(), command["enabled"] | false);
      }
    }
  }
  commandHttp.end();
}
```

## 4. Call it from the existing two-second sensor block

Add this line immediately after `broadcastUpdate();` in the `if (now - prevMillis > 2000)` block:

```cpp
syncGardenWithBackend();
```

Upload the revised sketch. Then log in through the app's Garden button; sensor readings update every two seconds, and UI controls are collected by the ESP32 on its next poll.
