#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>

const char* ssid = "NAZWA-TWOJEJ-SIECI";
const char* password = "HASLO-DO-SIECI";

const char* serverUrl = "http://<TWOJE-IP>:8000/api/measurements/";

// kalibracja - ustaw pod swoje odczyty
const int dryValue = 509;
const int wetValue = 202;

float calculateMoisturePercent(int rawValue) {
  float percent = (float)(dryValue - rawValue) * 100.0 / (dryValue - wetValue);

  if (percent < 0) percent = 0;
  if (percent > 100) percent = 100;

  return percent;
}

void setup() {
  Serial.begin(9600);
  delay(1000);

  Serial.println("Start ESP");

  WiFi.begin(ssid, password);
  Serial.print("Laczenie z WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("Polaczono z WiFi");
  Serial.print("IP ESP: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  if (Serial.available()) {
    String raw = Serial.readStringUntil('\n');
    raw.trim();

    if (raw.length() > 0) {
      int rawValue = raw.toInt();
      float moisture = calculateMoisturePercent(rawValue);

      Serial.print("Odebrane z Mega: ");
      Serial.println(rawValue);

      if (WiFi.status() == WL_CONNECTED) {
        WiFiClient client;
        HTTPClient http;

        http.begin(client, serverUrl);
        http.addHeader("Content-Type", "application/json");

        String json = "{";
        json += "\"device_name\":\"sensor_1\",";
        json += "\"raw_value\":" + String(rawValue) + ",";
        json += "\"moisture_percent\":" + String(moisture, 1);
        json += "}";

        Serial.println("Wysylam JSON:");
        Serial.println(json);

        int code = http.POST(json);

        Serial.print("Kod HTTP: ");
        Serial.println(code);

        if (code > 0) {
          String response = http.getString();
          Serial.println("Odpowiedz serwera:");
          Serial.println(response);
        } else {
          Serial.print("Blad wysylki: ");
          Serial.println(http.errorToString(code));
        }

        http.end();
      } else {
        Serial.println("Brak WiFi");
      }
    }
  }
}