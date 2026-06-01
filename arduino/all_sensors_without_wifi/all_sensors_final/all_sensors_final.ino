#include <Wire.h>
#include <BH1750.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#define SOIL_MOISTURE_PIN A0
#define DS18B20_PIN 22
#define RELAY_PIN 8

#define BH1750_ADDRESS 0x23
#define BME280_I2C_ADDRESS 0x76

#if defined(UBRR3H)
#define EspSerial Serial3
#else
#define EspSerial Serial1
#endif

BH1750 lightMeter;
Adafruit_BME280 bme;

OneWire oneWire(DS18B20_PIN);
DallasTemperature soilTempSensor(&oneWire);

int dryValue = 502;
int wetValue = 259;

int moistureLimit = 20;
int stationNumber = 1;
int potNumber = 1;

unsigned long soilMoistureIntervalMs = 10000;
unsigned long lightIntervalMs = 10000;
unsigned long soilTemperatureIntervalMs = 10000;
unsigned long airTemperatureIntervalMs = 10000;
unsigned long airHumidityIntervalMs = 10000;
unsigned long pressureIntervalMs = 10000;

unsigned long lastSoilMoistureReadAt = 0;
unsigned long lastLightReadAt = 0;
unsigned long lastSoilTemperatureReadAt = 0;
unsigned long lastAirTemperatureReadAt = 0;
unsigned long lastAirHumidityReadAt = 0;
unsigned long lastPressureReadAt = 0;

int cachedSoilMoisture = 0;
float cachedSoilTemperature = 0;
float cachedLightLux = 0;
float cachedAirTemperature = 0;
float cachedAirHumidity = 0;
float cachedPressure = 0;

const int RELAY_ON = HIGH;
const int RELAY_OFF = LOW;

bool pumpState = false;
bool manualPumpMode = false;

void setup() {
  Serial.begin(9600);
  EspSerial.begin(9600);

  Wire.begin();

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, RELAY_OFF);

  Serial.println("START SYSTEMU");
  Serial.println("--------------------------");

  if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, BH1750_ADDRESS)) {
    Serial.println("BH1750 OK");
  } else {
    Serial.println("BH1750 ERROR");
  }

  if (bme.begin(BME280_I2C_ADDRESS)) {
    Serial.println("BME280 OK");
  } else {
    Serial.println("BME280 ERROR");
  }

  soilTempSensor.begin();
  Serial.println("DS18B20 OK");
  Serial.println("--------------------------");
}

void loop() {
  handlePumpCommand();

  unsigned long now = millis();
  bool shouldSend = false;
  bool soilMoistureUpdated = false;
  bool soilTemperatureUpdated = false;
  bool lightUpdated = false;
  bool airTemperatureUpdated = false;
  bool airHumidityUpdated = false;
  bool pressureUpdated = false;

  if (shouldRead(lastSoilMoistureReadAt, soilMoistureIntervalMs, now)) {
    readSoilMoisture();
    lastSoilMoistureReadAt = now;
    soilMoistureUpdated = true;
    shouldSend = true;
  }

  if (shouldRead(lastSoilTemperatureReadAt, soilTemperatureIntervalMs, now)) {
    readSoilTemperature();
    lastSoilTemperatureReadAt = now;
    soilTemperatureUpdated = true;
    shouldSend = true;
  }

  if (shouldRead(lastLightReadAt, lightIntervalMs, now)) {
    readLight();
    lastLightReadAt = now;
    lightUpdated = true;
    shouldSend = true;
  }

  if (
    shouldRead(lastAirTemperatureReadAt, airTemperatureIntervalMs, now) ||
    shouldRead(lastAirHumidityReadAt, airHumidityIntervalMs, now) ||
    shouldRead(lastPressureReadAt, pressureIntervalMs, now)
  ) {
    readAirSensor();

    if (shouldRead(lastAirTemperatureReadAt, airTemperatureIntervalMs, now)) {
      lastAirTemperatureReadAt = now;
      airTemperatureUpdated = true;
    }

    if (shouldRead(lastAirHumidityReadAt, airHumidityIntervalMs, now)) {
      lastAirHumidityReadAt = now;
      airHumidityUpdated = true;
    }

    if (shouldRead(lastPressureReadAt, pressureIntervalMs, now)) {
      lastPressureReadAt = now;
      pressureUpdated = true;
    }

    shouldSend = true;
  }

  if (!manualPumpMode) {
    if (cachedSoilMoisture > moistureLimit) {
      if (pumpState) {
        pumpOff();
      }
    } else {
      if (!pumpState) {
        pumpOn();
      }
    }
  }

  if (!shouldSend) {
    delay(50);
    return;
  }

  Serial.println("===== ODCZYTY =====");

  Serial.print("Swiatlo: ");
  Serial.print(cachedLightLux);
  Serial.println(" lx");

  Serial.print("Temperatura powietrza: ");
  Serial.print(cachedAirTemperature);
  Serial.println(" C");

  Serial.print("Wilgotnosc powietrza: ");
  Serial.print(cachedAirHumidity);
  Serial.println(" %");

  Serial.print("Cisnienie: ");
  Serial.print(cachedPressure);
  Serial.println(" hPa");

  Serial.print("Temperatura gleby: ");
  Serial.print(cachedSoilTemperature);
  Serial.println(" C");

  Serial.print("Wilgotnosc gleby: ");
  Serial.print(cachedSoilMoisture);
  Serial.println(" %");

  Serial.print("Pompa: ");
  Serial.println(pumpState ? "WLACZONA" : "WYLACZONA");
  Serial.print("Tryb pompy: ");
  Serial.println(manualPumpMode ? "MANUAL" : "AUTO");

  Serial.println("--------------------------");

  sendJsonToEsp(
    cachedSoilMoisture,
    cachedSoilTemperature,
    cachedLightLux,
    cachedAirTemperature,
    cachedAirHumidity,
    cachedPressure,
    pumpState,
    soilMoistureUpdated,
    soilTemperatureUpdated,
    lightUpdated,
    airTemperatureUpdated,
    airHumidityUpdated,
    pressureUpdated
  );

  delay(50);
}

bool shouldRead(unsigned long lastReadAt, unsigned long intervalMs, unsigned long now) {
  return intervalMs > 0 && (lastReadAt == 0 || now - lastReadAt >= intervalMs);
}

void readSoilMoisture() {
  int rawSoil = analogRead(SOIL_MOISTURE_PIN);
  cachedSoilMoisture = map(rawSoil, dryValue, wetValue, 0, 100);
  cachedSoilMoisture = constrain(cachedSoilMoisture, 0, 100);
}

void readSoilTemperature() {
  soilTempSensor.requestTemperatures();
  cachedSoilTemperature = soilTempSensor.getTempCByIndex(0);
}

void readLight() {
  cachedLightLux = lightMeter.readLightLevel();
}

void readAirSensor() {
  cachedAirTemperature = bme.readTemperature();
  cachedAirHumidity = bme.readHumidity();
  cachedPressure = bme.readPressure() / 100.0F;
}

void pumpOn() {
  digitalWrite(RELAY_PIN, RELAY_ON);
  pumpState = true;
  Serial.println("POMPA WLACZONA");
}

void pumpOff() {
  digitalWrite(RELAY_PIN, RELAY_OFF);
  pumpState = false;
  Serial.println("POMPA WYLACZONA");
}

void handlePumpCommand() {
  if (!EspSerial.available()) {
    return;
  }

  String command = EspSerial.readStringUntil('\n');
  command.trim();

  if (command.startsWith("CONFIG:")) {
    applySensorConfig(command);
  } else if (command == "PUMP_ON") {
    manualPumpMode = true;
    pumpOn();
  } else if (command == "PUMP_OFF") {
    manualPumpMode = true;
    pumpOff();
  } else if (command == "PUMP_AUTO") {
    manualPumpMode = false;
    Serial.println("TRYB POMPY AUTO");
  }
}

void applySensorConfig(String command) {
  updateInterval(command, "soil_moisture", soilMoistureIntervalMs);
  updateInterval(command, "light", lightIntervalMs);
  updateInterval(command, "soil_temperature", soilTemperatureIntervalMs);
  updateInterval(command, "air_temperature", airTemperatureIntervalMs);
  updateInterval(command, "air_humidity", airHumidityIntervalMs);
  updateInterval(command, "pressure", pressureIntervalMs);

  Serial.println("Zaktualizowano czestotliwosci czujnikow");
}

void updateInterval(String command, String key, unsigned long &intervalMs) {
  int keyIndex = command.indexOf(key + "=");

  if (keyIndex < 0) {
    return;
  }

  int valueStart = keyIndex + key.length() + 1;
  int valueEnd = command.indexOf(';', valueStart);

  if (valueEnd < 0) {
    valueEnd = command.length();
  }

  String value = command.substring(valueStart, valueEnd);
  value.trim();

  unsigned long seconds = value.toInt();
  intervalMs = seconds * 1000UL;
}

void sendJsonToEsp(
  int soilMoisture,
  float soilTemperature,
  float lightLux,
  float airTemperature,
  float airHumidity,
  float pressure,
  bool pumpState,
  bool soilMoistureUpdated,
  bool soilTemperatureUpdated,
  bool lightUpdated,
  bool airTemperatureUpdated,
  bool airHumidityUpdated,
  bool pressureUpdated
) {
  EspSerial.print("{\"station_number\":");
  EspSerial.print(stationNumber);
  EspSerial.print(",\"pot_number\":");
  EspSerial.print(potNumber);
  EspSerial.print(",\"moisture_percent\":");
  if (soilMoistureUpdated) {
    EspSerial.print(soilMoisture);
  } else {
    EspSerial.print("null");
  }
  EspSerial.print(",\"air_temperature\":");
  if (airTemperatureUpdated) {
    EspSerial.print(airTemperature, 2);
  } else {
    EspSerial.print("null");
  }
  EspSerial.print(",\"air_humidity\":");
  if (airHumidityUpdated) {
    EspSerial.print(airHumidity, 2);
  } else {
    EspSerial.print("null");
  }
  EspSerial.print(",\"pressure_hpa\":");
  if (pressureUpdated) {
    EspSerial.print(pressure, 2);
  } else {
    EspSerial.print("null");
  }
  EspSerial.print(",\"soil_temperature\":");
  if (soilTemperatureUpdated) {
    EspSerial.print(soilTemperature, 2);
  } else {
    EspSerial.print("null");
  }
  EspSerial.print(",\"light_lux\":");
  if (lightUpdated) {
    EspSerial.print(lightLux, 2);
  } else {
    EspSerial.print("null");
  }
  EspSerial.print(",\"pump_on\":");
  EspSerial.print(pumpState ? "true" : "false");
  EspSerial.println("}");
}
