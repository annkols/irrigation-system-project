const int dry = 502;   // sucha gleba
const int wet = 259;   // mokra gleba

const int ledPin = 8;  // dioda LED

void setup()
{
  Serial.begin(9600);
  pinMode(ledPin, OUTPUT);
}

void loop()
{
  int sensorVal = analogRead(A0);

  // przeliczenie na %
  int percentageHumidity = map(sensorVal, wet, dry, 100, 0);
  percentageHumidity = constrain(percentageHumidity, 0, 100);

  Serial.print("Wilgotnosc: ");
  Serial.print(percentageHumidity);
  Serial.println("%");

  // sterowanie diodą
  if (percentageHumidity < 30)
  {
    digitalWrite(ledPin, HIGH);
  }
  else
  {
    digitalWrite(ledPin, LOW);
  }

  delay(1000);
}