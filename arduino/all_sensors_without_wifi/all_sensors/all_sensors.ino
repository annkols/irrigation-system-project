#include <Wire.h>

void setup() {
  Serial.begin(9600);
  Wire.begin();

  Serial.println("Skanowanie I2C...");
}

void loop() {

  byte error, address;
  int devices = 0;

  for(address = 1; address < 127; address++) {

    Wire.beginTransmission(address);
    error = Wire.endTransmission();

    if(error == 0) {

      Serial.print("Znaleziono I2C: 0x");

      if(address < 16)
        Serial.print("0");

      Serial.println(address, HEX);

      devices++;
    }
  }

  if(devices == 0) {
    Serial.println("Brak urzadzen I2C");
  }

  Serial.println("----------------");

  delay(5000);
}