#pragma once

const char* WIFI_SSID = "nazwaWifi";
const char* WIFI_PASSWORD = "hasloDoWifi";

const char* CAMERA_UPLOAD_URL = "https://<BACKEND_HOST>/api/camera/frames/upload/";
// Każda kamera musi mieć własny rekord CameraDevice i własny token.
// Token jest wyświetlany jednorazowo po utworzeniu kamery w panelu /admin/.
const char* CAMERA_UPLOAD_TOKEN = "token-skopiowany-z-panelu-admin";
// Musi być taki sam jak Hardware set ID doświadczenia.
const int CAMERA_SENSOR_SET_ID = 1;
const unsigned long CAMERA_UPLOAD_INTERVAL_MS = 60UL * 60UL * 1000UL;

// Każda z dwóch kamer musi mieć inny adres IP w tej samej sieci.
// Dostosuj wartości do swojej sieci; dla drugiej kamery zmień ostatnią liczbę.
IPAddress CAMERA_LOCAL_IP(192, 168, 43, 47);
IPAddress CAMERA_GATEWAY(192, 168, 43, 1);
IPAddress CAMERA_SUBNET(255, 255, 255, 0);
IPAddress CAMERA_PRIMARY_DNS(8, 8, 8, 8);
IPAddress CAMERA_SECONDARY_DNS(8, 8, 4, 4);
