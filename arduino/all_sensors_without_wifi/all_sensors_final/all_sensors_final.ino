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

const int RELAY_ON = HIGH;
const int RELAY_OFF = LOW;

bool pumpState = false;

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
  int rawSoil = analogRead(SOIL_MOISTURE_PIN);

  int soilMoisture = map(rawSoil, dryValue, wetValue, 0, 100);
  soilMoisture = constrain(soilMoisture, 0, 100);

  soilTempSensor.requestTemperatures();
  float soilTemperature = soilTempSensor.getTempCByIndex(0);

  float lightLux = lightMeter.readLightLevel();

  float airTemperature = bme.readTemperature();
  float airHumidity = bme.readHumidity();
  float pressure = bme.readPressure() / 100.0F;

  if (soilMoisture > moistureLimit) {
    if (pumpState) {
      pumpOff();
    }
  } else {
    if (!pumpState) {
      pumpOn();
    }
  }

  Serial.println("===== ODCZYTY =====");

  Serial.print("Swiatlo: ");
  Serial.print(lightLux);
  Serial.println(" lx");

  Serial.print("Temperatura powietrza: ");
  Serial.print(airTemperature);
  Serial.println(" C");

  Serial.print("Wilgotnosc powietrza: ");
  Serial.print(airHumidity);
  Serial.println(" %");

  Serial.print("Cisnienie: ");
  Serial.print(pressure);
  Serial.println(" hPa");

  Serial.print("Temperatura gleby: ");
  Serial.print(soilTemperature);
  Serial.println(" C");

  Serial.print("Wilgotnosc gleby: ");
  Serial.print(soilMoisture);
  Serial.println(" %");

  Serial.print("Pompa: ");
  Serial.println(pumpState ? "WLACZONA" : "WYLACZONA");

  Serial.println("--------------------------");

  sendJsonToEsp(
    soilMoisture,
    soilTemperature,
    lightLux,
    airTemperature,
    airHumidity,
    pressure,
    pumpState
  );

  delay(2000);
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

void sendJsonToEsp(
  int soilMoisture,
  float soilTemperature,
  float lightLux,
  float airTemperature,
  float airHumidity,
  float pressure,
  bool pumpState
) {
  EspSerial.print("{\"station_number\":");
  EspSerial.print(stationNumber);
  EspSerial.print(",\"pot_number\":");
  EspSerial.print(potNumber);
  EspSerial.print(",\"moisture_percent\":");
  EspSerial.print(soilMoisture);
  EspSerial.print(",\"air_temperature\":");
  EspSerial.print(airTemperature, 2);
  EspSerial.print(",\"air_humidity\":");
  EspSerial.print(airHumidity, 2);
  EspSerial.print(",\"pressure_hpa\":");
  EspSerial.print(pressure, 2);
  EspSerial.print(",\"soil_temperature\":");
  EspSerial.print(soilTemperature, 2);
  EspSerial.print(",\"light_lux\":");
  EspSerial.print(lightLux, 2);
  EspSerial.print(",\"pump_on\":");
  EspSerial.print(pumpState ? "true" : "false");
  EspSerial.println("}");
}
