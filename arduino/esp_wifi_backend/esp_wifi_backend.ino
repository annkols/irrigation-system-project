#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>

// Dla ESP32 zamien powyzsze include na:
// #include <WiFi.h>
// #include <HTTPClient.h>

const char* WIFI_SSID = "nazwaWifi";
const char* WIFI_PASSWORD = "hasloDoWifi";

// IP komputera z backendem w tej samej sieci Wi-Fi.
// Nie wpisuj localhost, bo dla ESP localhost oznacza samo ESP.
const char* API_URL = "http://192...:8000/api/measurements/";

unsigned long lastSendAt = 0;
const unsigned long sendIntervalMs = 10000;

void setup() {
  Serial.begin(9600);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Laczenie z WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("Polaczono. IP ESP: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  if (!Serial.available()) {
    return;
  }

  String payload = Serial.readStringUntil('\n');
  payload.trim();

  if (payload.length() == 0) {
    return;
  }

  if (millis() - lastSendAt < sendIntervalMs) {
    return;
  }

  lastSendAt = millis();
  sendToBackend(payload);
}

void sendToBackend(String payload) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Brak WiFi, ponawiam laczenie...");
    WiFi.reconnect();
    return;
  }

  WiFiClient client;
  HTTPClient http;

  http.begin(client, API_URL);
  http.addHeader("Content-Type", "application/json");

  int statusCode = http.POST(payload);

  Serial.print("POST status: ");
  Serial.println(statusCode);

  if (statusCode > 0) {
    Serial.println(http.getString());
  }

  http.end();
}
