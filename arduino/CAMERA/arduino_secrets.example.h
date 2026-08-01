#pragma once

const char* WIFI_SSID = "nazwaWifi";
const char* WIFI_PASSWORD = "hasloDoWifi";

const char* CAMERA_UPLOAD_URL = "https://<BACKEND_HOST>/api/camera/frames/upload/";
const char* CAMERA_UPLOAD_TOKEN = "ten-sam-sekret-co-CAMERA_3_UPLOAD_TOKEN-na-backendzie";
const int CAMERA_SENSOR_SET_ID = 3;
const unsigned long CAMERA_UPLOAD_INTERVAL_MS = 60UL * 60UL * 1000UL;

// Opcjonalny stały adres IP kamery w lokalnej sieci.
// Dostosuj wartości do swojej sieci albo zostaw zgodne z aktualnym hotspotem.
IPAddress CAMERA_LOCAL_IP(192, 168, 43, 47);
IPAddress CAMERA_GATEWAY(192, 168, 43, 1);
IPAddress CAMERA_SUBNET(255, 255, 255, 0);
IPAddress CAMERA_PRIMARY_DNS(8, 8, 8, 8);
IPAddress CAMERA_SECONDARY_DNS(8, 8, 4, 4);
