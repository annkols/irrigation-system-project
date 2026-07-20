#pragma once

const char* WIFI_SSID = "nazwaWifi";
const char* WIFI_PASSWORD = "hasloDoWifi";

// Opcjonalny stały adres IP kamery w lokalnej sieci.
// Dostosuj wartości do swojej sieci albo zostaw zgodne z aktualnym hotspotem.
IPAddress CAMERA_LOCAL_IP(192, 168, 43, 47);
IPAddress CAMERA_GATEWAY(192, 168, 43, 1);
IPAddress CAMERA_SUBNET(255, 255, 255, 0);
IPAddress CAMERA_PRIMARY_DNS(8, 8, 8, 8);
IPAddress CAMERA_SECONDARY_DNS(8, 8, 4, 4);
