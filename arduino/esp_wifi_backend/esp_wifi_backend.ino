#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecureBearSSL.h>
#include "arduino_secrets.h"

// Dla ESP32 zamien powyzsze include na:
// #include <WiFi.h>
// #include <HTTPClient.h>
// #include <WiFiClientSecure.h>

unsigned long lastCommandCheckAt = 0;
const unsigned long commandCheckIntervalMs = 5000;

unsigned long lastConfigCheckAt = 0;
const unsigned long configCheckIntervalMs = 30000;

int lastForwardedCommandId = 0;
String lastForwardedConfig = "";

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
  if (Serial.available()) {
    String payload = Serial.readStringUntil('\n');
    payload.trim();

    if (payload.length() > 0) {
      sendToBackend(payload);
    }
  }

  if (lastCommandCheckAt == 0 || millis() - lastCommandCheckAt >= commandCheckIntervalMs) {
    lastCommandCheckAt = millis();
    fetchPumpCommand();
  }

  if (lastConfigCheckAt == 0 || millis() - lastConfigCheckAt >= configCheckIntervalMs) {
    lastConfigCheckAt = millis();
    fetchSensorConfig();
  }
}

void sendToBackend(String payload) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Brak WiFi, ponawiam laczenie...");
    WiFi.reconnect();
    return;
  }

  BearSSL::WiFiClientSecure client;
  client.setInsecure(); // Projekt testowy: pomija reczna konfiguracje certyfikatu HTTPS.
  HTTPClient http;

  http.begin(client, MEASUREMENTS_API_URL);
  http.addHeader("Content-Type", "application/json");

  int statusCode = http.POST(payload);

  Serial.print("POST status: ");
  Serial.println(statusCode);

  if (statusCode > 0) {
    Serial.println(http.getString());
  }

  http.end();
}

void fetchPumpCommand() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Brak WiFi, ponawiam laczenie...");
    WiFi.reconnect();
    return;
  }

  BearSSL::WiFiClientSecure client;
  client.setInsecure(); // Projekt testowy: pomija reczna konfiguracje certyfikatu HTTPS.
  HTTPClient http;

  http.begin(client, PUMP_COMMAND_API_URL);

  int statusCode = http.GET();

  Serial.print("GET pump command status: ");
  Serial.println(statusCode);

  if (statusCode == 200) {
    String response = http.getString();
    int commandId = extractCommandId(response);
    String command = extractArduinoCommand(response);

    if (commandId > 0 && command.length() > 0 && commandId != lastForwardedCommandId) {
      Serial.println(command);
      lastForwardedCommandId = commandId;
    }
  }

  http.end();
}

void fetchSensorConfig() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Brak WiFi, ponawiam laczenie...");
    WiFi.reconnect();
    return;
  }

  BearSSL::WiFiClientSecure client;
  client.setInsecure(); // Projekt testowy: pomija reczna konfiguracje certyfikatu HTTPS.
  HTTPClient http;

  http.begin(client, ACTIVE_SENSOR_CONFIG_API_URL);

  int statusCode = http.GET();

  Serial.print("GET sensor config status: ");
  Serial.println(statusCode);

  if (statusCode == 200) {
    String response = http.getString();
    String config = buildConfigCommand(response);

    if (config.length() > 0 && config != lastForwardedConfig) {
      Serial.println(config);
      lastForwardedConfig = config;
    }
  }

  http.end();
}

String buildConfigCommand(String response) {
  String config = "CONFIG:";
  config += "soil_moisture=" + String(extractFrequency(response, "soil_moisture"));
  config += ";light=" + String(extractFrequency(response, "light"));
  config += ";soil_temperature=" + String(extractFrequency(response, "soil_temperature"));
  config += ";air_temperature=" + String(extractFrequency(response, "air_temperature"));
  config += ";air_humidity=" + String(extractFrequency(response, "air_humidity"));
  config += ";pressure=" + String(extractFrequency(response, "pressure"));
  return config;
}

int extractFrequency(String response, String key) {
  int keyIndex = response.indexOf("\"" + key + "\"");

  if (keyIndex < 0) {
    return 0;
  }

  int colonIndex = response.indexOf(':', keyIndex);
  int commaIndex = response.indexOf(',', colonIndex + 1);
  int braceIndex = response.indexOf('}', colonIndex + 1);

  if (colonIndex < 0) {
    return 0;
  }

  int endIndex = commaIndex;
  if (endIndex < 0 || (braceIndex > 0 && braceIndex < endIndex)) {
    endIndex = braceIndex;
  }

  if (endIndex < 0) {
    endIndex = response.length();
  }

  String value = response.substring(colonIndex + 1, endIndex);
  value.trim();
  return value.toInt();
}

int extractCommandId(String response) {
  int keyIndex = response.indexOf("\"id\"");

  if (keyIndex < 0) {
    return 0;
  }

  int colonIndex = response.indexOf(':', keyIndex);
  int commaIndex = response.indexOf(',', colonIndex + 1);

  if (colonIndex < 0) {
    return 0;
  }

  String idValue;
  if (commaIndex < 0) {
    idValue = response.substring(colonIndex + 1);
  } else {
    idValue = response.substring(colonIndex + 1, commaIndex);
  }

  idValue.trim();
  return idValue.toInt();
}

String extractArduinoCommand(String response) {
  int keyIndex = response.indexOf("\"arduino_command\"");

  if (keyIndex < 0) {
    return "";
  }

  int colonIndex = response.indexOf(':', keyIndex);
  int firstQuoteIndex = response.indexOf('"', colonIndex + 1);
  int secondQuoteIndex = response.indexOf('"', firstQuoteIndex + 1);

  if (colonIndex < 0 || firstQuoteIndex < 0 || secondQuoteIndex < 0) {
    return "";
  }

  return response.substring(firstQuoteIndex + 1, secondQuoteIndex);
}
