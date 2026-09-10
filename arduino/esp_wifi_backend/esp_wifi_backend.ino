#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecureBearSSL.h>
#include "arduino_secrets.h"
#include "device_config.h"

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
int assignedExperimentId = 0;
int assignedStationNumber = 0;
int assignedPotNumber = 0;
bool assignmentReady = false;

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
  if (!assignmentReady) {
    return;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Brak WiFi, ponawiam laczenie...");
    WiFi.reconnect();
    return;
  }

  BearSSL::WiFiClientSecure client;
  client.setInsecure(); // Projekt testowy: pomija reczna konfiguracje certyfikatu HTTPS.
  HTTPClient http;

  String url = String(PUMP_COMMAND_API_URL)
    + "?station_number=" + String(assignedStationNumber)
    + "&pot_number=" + String(assignedPotNumber);
  http.begin(client, url);

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

  String url = String(ACTIVE_SENSOR_CONFIG_API_URL)
    + "?sensor_set_id=" + String(SENSOR_SET_ID)
    + "&soil_moisture_id=" + urlEncode(SOIL_MOISTURE_ID)
    + "&soil_temperature_id=" + urlEncode(SOIL_TEMPERATURE_ID)
    + "&pump_id=" + urlEncode(PUMP_ID);
  http.begin(client, url);

  int statusCode = http.GET();

  Serial.print("GET sensor config status: ");
  Serial.println(statusCode);

  if (statusCode == 200) {
    String response = http.getString();
    int experimentId = extractInteger(response, "experiment_id");
    int stationNumber = extractInteger(response, "sensor_set_id");
    int potNumber = extractInteger(response, "pot_number");

    if (experimentId < 1 || stationNumber < 1 || potNumber < 1) {
      clearAssignment();
      http.end();
      return;
    }

    assignedExperimentId = experimentId;
    assignedStationNumber = stationNumber;
    assignedPotNumber = potNumber;
    assignmentReady = true;
    String config = buildConfigCommand(response);

    if (config.length() > 0 && config != lastForwardedConfig) {
      Serial.println(config);
      lastForwardedConfig = config;
    }
  } else {
    clearAssignment();
  }

  http.end();
}

String buildConfigCommand(String response) {
  String config = "CONFIG:";
  config += "experiment_id=" + String(assignedExperimentId);
  config += ";station_number=" + String(assignedStationNumber);
  config += ";pot_number=" + String(assignedPotNumber);
  config += ";soil_moisture=" + String(extractFrequency(response, "soil_moisture"));
  config += ";light=" + String(extractFrequency(response, "light"));
  config += ";soil_temperature=" + String(extractFrequency(response, "soil_temperature"));
  config += ";air_temperature=" + String(extractFrequency(response, "air_temperature"));
  config += ";air_humidity=" + String(extractFrequency(response, "air_humidity"));
  config += ";pressure=" + String(extractFrequency(response, "pressure"));
  return config;
}

void clearAssignment() {
  if (assignmentReady || lastForwardedConfig.length() > 0) {
    Serial.println("UNASSIGNED");
  }
  assignmentReady = false;
  assignedExperimentId = 0;
  assignedStationNumber = 0;
  assignedPotNumber = 0;
  lastForwardedConfig = "";
  lastForwardedCommandId = 0;
}

String urlEncode(const char* value) {
  const char* hex = "0123456789ABCDEF";
  String encoded = "";

  while (*value) {
    uint8_t character = static_cast<uint8_t>(*value++);
    if (
      (character >= 'a' && character <= 'z') ||
      (character >= 'A' && character <= 'Z') ||
      (character >= '0' && character <= '9') ||
      character == '-' || character == '_' || character == '.' || character == '~'
    ) {
      encoded += static_cast<char>(character);
    } else {
      encoded += '%';
      encoded += hex[character >> 4];
      encoded += hex[character & 0x0F];
    }
  }

  return encoded;
}

int extractInteger(String response, String key) {
  int keyIndex = response.indexOf("\"" + key + "\"");
  if (keyIndex < 0) return 0;

  int colonIndex = response.indexOf(':', keyIndex);
  if (colonIndex < 0) return 0;

  int commaIndex = response.indexOf(',', colonIndex + 1);
  int braceIndex = response.indexOf('}', colonIndex + 1);
  int endIndex = commaIndex;
  if (endIndex < 0 || (braceIndex >= 0 && braceIndex < endIndex)) {
    endIndex = braceIndex;
  }
  if (endIndex < 0) endIndex = response.length();

  String value = response.substring(colonIndex + 1, endIndex);
  value.trim();
  return value.toInt();
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
