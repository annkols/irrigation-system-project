#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>

Adafruit_BME280 bme;

void setup() {
  Serial.begin(9600);

  bool status = bme.begin(0x76);

  if (!status) {
    Serial.println("Nie znaleziono BME280!");
    while (1);
  }

  Serial.println("BME280 OK");
}

void loop() {

  Serial.print("Temperatura: ");
  Serial.print(bme.readTemperature());
  Serial.println(" °C");

  Serial.print("Wilgotnosc: ");
  Serial.print(bme.readHumidity());
  Serial.println(" %");

  Serial.print("Cisnienie: ");
  Serial.print(bme.readPressure() / 100.0F);
  Serial.println(" hPa");

  Serial.println("----------------");

  delay(2000);
}