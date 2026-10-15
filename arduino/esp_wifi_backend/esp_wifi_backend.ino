#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecureBearSSL.h>
#include "arduino_secrets.h"
#include "device_config.h"

unsigned long lastCommandCheckAt = 0, lastConfigCheckAt = 0;
const unsigned long commandCheckIntervalMs = 5000, configCheckIntervalMs = 30000;
int assignedExperimentId = 0, assignedStationNumber = 0;
int assignedPotNumbers[POT_CHANNEL_COUNT] = {0, 0, 0};
int lastForwardedCommandIds[POT_CHANNEL_COUNT] = {0, 0, 0};
String lastForwardedConfig = "";
bool assignmentReady = false;

void setup() {
  // Mega wysyla trzy rekordy jeden po drugim. W czasie wykonywania HTTPS POST
  // ESP nie czyta UART, dlatego domyslny bufor moze zgubic drugi lub trzeci
  // rekord. 1024 bajty mieszcza caly pakiet dla trzech doniczek.
  Serial.setRxBufferSize(1024);
  Serial.begin(9600);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Laczenie z WiFi");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println(); Serial.print("IP ESP: "); Serial.println(WiFi.localIP());
}

void loop() {
  if (Serial.available()) {
    String payload = Serial.readStringUntil('\n'); payload.trim();
    if (payload.startsWith("{")) sendToBackend(payload);
  }
  if (lastConfigCheckAt == 0 || millis() - lastConfigCheckAt >= configCheckIntervalMs) {
    lastConfigCheckAt = millis(); fetchSensorConfigs();
  }
  if (lastCommandCheckAt == 0 || millis() - lastCommandCheckAt >= commandCheckIntervalMs) {
    lastCommandCheckAt = millis(); fetchPumpCommands();
  }
}

bool ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  WiFi.reconnect();
  Serial.println("Brak WiFi");
  return false;
}

void sendToBackend(String payload) {
  if (!ensureWifi()) return;
  BearSSL::WiFiClientSecure client; client.setInsecure();
  HTTPClient http; http.begin(client, MEASUREMENTS_API_URL); http.addHeader("Content-Type", "application/json");
  int status = http.POST(payload);
  Serial.print("POST pomiaru: "); Serial.println(status);
  if (status < 200 || status >= 300) {
    Serial.print("Odpowiedz backendu: "); Serial.println(http.getString());
  }
  http.end();
}

void fetchSensorConfigs() {
  if (!ensureWifi()) return;
  int experiment = 0, station = 0;
  int pots[POT_CHANNEL_COUNT] = {0, 0, 0};
  String frequencyResponse = "";

  for (byte channel = 0; channel < POT_CHANNEL_COUNT; channel++) {
    BearSSL::WiFiClientSecure client; client.setInsecure();
    HTTPClient http;
    String url = String(ACTIVE_SENSOR_CONFIG_API_URL)
      + "?sensor_set_id=" + String(SENSOR_SET_ID)
      + "&soil_moisture_id=" + urlEncode(SOIL_MOISTURE_IDS[channel])
      + "&soil_temperature_id=" + urlEncode(SOIL_TEMPERATURE_IDS[channel]);
    http.begin(client, url);
    int status = http.GET();
    if (status == 200) {
      String response = http.getString();
      int currentExperiment = extractInteger(response, "experiment_id");
      int currentStation = extractInteger(response, "sensor_set_id");
      int currentPot = extractInteger(response, "pot_number");
      if (currentExperiment > 0 && currentStation > 0 && currentPot > 0
          && (experiment == 0 || (experiment == currentExperiment && station == currentStation))) {
        experiment = currentExperiment; station = currentStation; pots[channel] = currentPot;
        if (frequencyResponse.length() == 0) frequencyResponse = response;
      }
    }
    http.end();
  }

  if (experiment == 0 || station == 0) { clearAssignment(); return; }
  assignedExperimentId = experiment; assignedStationNumber = station;
  assignmentReady = false;
  for (byte i = 0; i < POT_CHANNEL_COUNT; i++) {
    if (assignedPotNumbers[i] != pots[i]) lastForwardedCommandIds[i] = 0;
    assignedPotNumbers[i] = pots[i];
    assignmentReady = assignmentReady || pots[i] > 0;
  }
  String config = buildConfig(frequencyResponse);
  // Wysylaj konfiguracje przy kazdym odswiezeniu. Mega moze zostac zresetowana
  // lub przeprogramowana niezaleznie od ESP i wtedy musi odzyskac przypisania.
  Serial.println(config);
  lastForwardedConfig = config;
}

String buildConfig(String response) {
  String value = "CONFIG:experiment_id=" + String(assignedExperimentId)
    + ";station_number=" + String(assignedStationNumber);
  for (byte i = 0; i < POT_CHANNEL_COUNT; i++)
    value += ";pot" + String(i + 1) + "=" + String(assignedPotNumbers[i]);
  value += ";soil_moisture=" + String(extractInteger(response, "soil_moisture"));
  value += ";light=" + String(extractInteger(response, "light"));
  value += ";soil_temperature=" + String(extractInteger(response, "soil_temperature"));
  value += ";air_temperature=" + String(extractInteger(response, "air_temperature"));
  value += ";air_humidity=" + String(extractInteger(response, "air_humidity"));
  value += ";pressure=" + String(extractInteger(response, "pressure"));
  return value;
}

void fetchPumpCommands() {
  if (!assignmentReady || !ensureWifi()) return;
  for (byte channel = 0; channel < POT_CHANNEL_COUNT; channel++) {
    if (assignedPotNumbers[channel] < 1) continue;
    BearSSL::WiFiClientSecure client; client.setInsecure();
    HTTPClient http;
    String url = String(PUMP_COMMAND_API_URL) + "?station_number=" + String(assignedStationNumber)
      + "&pot_number=" + String(assignedPotNumbers[channel]);
    http.begin(client, url);
    if (http.GET() == 200) {
      String response = http.getString();
      int id = extractInteger(response, "id");
      String command = extractString(response, "arduino_command");
      if (id > 0 && id != lastForwardedCommandIds[channel] && command.length() > 0) {
        String forwarded = commandForPot(command, assignedPotNumbers[channel]);
        if (forwarded.length() > 0) { Serial.println(forwarded); lastForwardedCommandIds[channel] = id; }
      }
    }
    http.end();
  }
}

String commandForPot(String command, int pot) {
  if (command == "PUMP_ON" || command == "PUMP_OFF" || command == "PUMP_AUTO")
    return command + ":" + String(pot);
  if (command.startsWith("PUMP_ON:"))
    return "PUMP_ON:" + String(pot) + ":" + command.substring(8);
  return "";
}

void clearAssignment() {
  if (assignmentReady || lastForwardedConfig.length() > 0) Serial.println("UNASSIGNED");
  assignmentReady = false; assignedExperimentId = 0; assignedStationNumber = 0; lastForwardedConfig = "";
  for (byte i = 0; i < POT_CHANNEL_COUNT; i++) { assignedPotNumbers[i] = 0; lastForwardedCommandIds[i] = 0; }
}

String urlEncode(const char* value) {
  const char* hex = "0123456789ABCDEF"; String encoded = "";
  while (*value) {
    uint8_t c = static_cast<uint8_t>(*value++);
    if (isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~') encoded += static_cast<char>(c);
    else { encoded += '%'; encoded += hex[c >> 4]; encoded += hex[c & 15]; }
  }
  return encoded;
}

int extractInteger(String response, String key) {
  int keyAt = response.indexOf("\"" + key + "\""); if (keyAt < 0) return 0;
  int colon = response.indexOf(':', keyAt); if (colon < 0) return 0;
  int end = response.indexOf(',', colon), brace = response.indexOf('}', colon);
  if (end < 0 || (brace >= 0 && brace < end)) end = brace;
  if (end < 0) end = response.length();
  String value = response.substring(colon + 1, end); value.trim(); return value.toInt();
}

String extractString(String response, String key) {
  int keyAt = response.indexOf("\"" + key + "\""); if (keyAt < 0) return "";
  int colon = response.indexOf(':', keyAt), firstQuote = response.indexOf('"', colon + 1);
  int secondQuote = response.indexOf('"', firstQuote + 1);
  if (colon < 0 || firstQuote < 0 || secondQuote < 0) return "";
  return response.substring(firstQuote + 1, secondQuote);
}
