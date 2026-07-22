# ESP32 live garden connection

1. In the backend `.env`, create values for `GARDEN_DEVICE_TOKEN`, `GARDEN_ADMIN_USERNAME`, and `GARDEN_ADMIN_PASSWORD`. Use long random values and keep them private.
2. Copy `esp32_live_bridge.h` beside the existing `.ino` file.
3. In the `.ino` file, add this include after the other includes:

```cpp
#include "esp32_live_bridge.h"
```

4. Replace `YOUR_BACKEND_LAN_IP` in the header with the LAN IP of the computer that runs FastAPI. The ESP32 and computer must be on the same Wi-Fi network.
5. Replace `SET_THE_SAME_GARDEN_DEVICE_TOKEN_AS_THE_BACKEND` with the exact `GARDEN_DEVICE_TOKEN` from the backend `.env`.
6. Inside the existing two-second sensor block, immediately after `broadcastUpdate();`, add:

```cpp
reportGardenTelemetry();
collectGardenCommands();
```

7. Restart the FastAPI backend, upload the sketch, then log into the Garden section of the React app.

The ESP32 reports telemetry every two seconds and polls commands every two seconds. Commands are protected by the device token; dashboard access requires the separate administrator login.
