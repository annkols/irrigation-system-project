#include <Wire.h>
#include <BH1750.h>

BH1750 lightMeter;

void setup() {
  Serial.begin(9600);

  Wire.begin();

  lightMeter.begin();

  Serial.println("BH1750 OK");
}

void loop() {

  float lux = lightMeter.readLightLevel();

  Serial.print("Natężenie światła: ");
  Serial.print(lux);
  Serial.println(" lx");

  delay(1000);
}