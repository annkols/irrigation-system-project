#include <Wire.h>
#include <BH1750.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ---------- BH1750 ----------
BH1750 lightMeter;

// ---------- BME280 ----------
Adafruit_BME280 bme;
#define BME280_ADDRESS 0x76

// ---------- DS18B20 ----------
#define ONE_WIRE_BUS 22
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature soilTempSensor(&oneWire);

// ---------- Capacitive Soil Moisture Sensor ----------
#define SOIL_MOISTURE_PIN A0

// Kalibracja wilgotności gleby
int dryValue = 502;  // sucho
int wetValue = 259;  // mokro

void setup() {
  Serial.begin(9600);
  Wire.begin();

  Serial.println("Start greenhouse sensor node");
  Serial.println("-----------------------------");

  // BH1750
  if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)) {
    Serial.println("BH1750 OK");
  } else {
    Serial.println("BH1750 ERROR");
  }

  // BME280
  if (bme.begin(BME280_ADDRESS)) {
    Serial.println("BME280 OK");
  } else {
    Serial.println("BME280 ERROR - sprawdz adres 0x76 / 0x77");
  }

  // DS18B20
  soilTempSensor.begin();
  Serial.println("DS18B20 start");

  Serial.println("-----------------------------");
}

void loop() {
  // ---------- BH1750 ----------
  float lightLux = lightMeter.readLightLevel();

  // ---------- BME280 ----------
  float airTemperature = bme.readTemperature();
  float airHumidity = bme.readHumidity();
  float pressure = bme.readPressure() / 100.0F;

  // ---------- DS18B20 ----------
  soilTempSensor.requestTemperatures();
  float soilTemperature = soilTempSensor.getTempCByIndex(0);

  // ---------- Soil moisture ----------
  int rawSoilMoisture = analogRead(SOIL_MOISTURE_PIN);

  int soilMoisturePercent = map(
    rawSoilMoisture,
    dryValue,
    wetValue,
    0,
    100
  );

  soilMoisturePercent = constrain(soilMoisturePercent, 0, 100);

  // ---------- SERIAL OUTPUT ----------
  Serial.println("===== SENSOR READINGS =====");

  Serial.print("Light: ");
  Serial.print(lightLux);
  Serial.println(" lx");

  Serial.print("Air temperature: ");
  Serial.print(airTemperature);
  Serial.println(" *C");

  Serial.print("Air humidity: ");
  Serial.print(airHumidity);
  Serial.println(" %");

  Serial.print("Pressure: ");
  Serial.print(pressure);
  Serial.println(" hPa");

  Serial.print("Soil temperature: ");
  Serial.print(soilTemperature);
  Serial.println(" *C");

  Serial.print("Soil moisture: ");
  Serial.print(soilMoisturePercent);
  Serial.println(" %");

  Serial.println("-----------------------------");

  delay(2000);
}