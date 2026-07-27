#pragma once

const char* WIFI_SSID = "nazwaWifi";
const char* WIFI_PASSWORD = "hasloDoWifi";

// Produkcyjny backend Cultiva.
// ESP8266 wysyla dane przez Wi-Fi do wdrozonego API, a nie do localhost.
const char* MEASUREMENTS_API_URL = "https://<BACKEND_HOST>/api/measurements/";
const char* PUMP_COMMAND_API_URL = "https://<BACKEND_HOST>/api/pump-control/latest/";
const char* ACTIVE_SENSOR_CONFIG_API_URL = "https://<BACKEND_HOST>/api/experiments/active-sensor-config/?sensor_set_id=1";
