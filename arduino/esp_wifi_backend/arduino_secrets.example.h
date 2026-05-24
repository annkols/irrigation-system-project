#pragma once

const char* WIFI_SSID = "nazwaWifi";
const char* WIFI_PASSWORD = "hasloDoWifi";

// IP komputera z backendem w tej samej sieci Wi-Fi.
// Nie wpisuj localhost, bo dla ESP localhost oznacza samo ESP.
const char* MEASUREMENTS_API_URL = "http://<IP_KOMPUTERA>:8000/api/measurements/";
const char* PUMP_COMMAND_API_URL = "http://<IP_KOMPUTERA>:8000/api/pump-control/latest/";
