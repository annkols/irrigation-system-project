const int dry = 502;
const int wet = 259;

const int pumpPin = 8; // na razie LED = pompa

bool manualMode = false;
bool pumpState = false;

void setup()
{
  Serial.begin(9600);
  pinMode(pumpPin, OUTPUT);
}

void loop()
{
  // odbiór komend z Serial
  if (Serial.available() > 0)
  {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();

    if (cmd == "ON")
    {
      manualMode = true;
      pumpState = true;
    }
    else if (cmd == "OFF")
    {
      manualMode = true;
      pumpState = false;
    }
    else if (cmd == "AUTO")
    {
      manualMode = false;
    }
  }

  int sensorVal = analogRead(A0);
  int percentageHumidity = map(sensorVal, wet, dry, 100, 0);
  percentageHumidity = constrain(percentageHumidity, 0, 100);

  Serial.print("Wilgotnosc: ");
  Serial.print(percentageHumidity);
  Serial.print("% | Tryb: ");
  Serial.println(manualMode ? "MANUAL" : "AUTO");

  // tryb AUTO
  if (!manualMode)
  {
    if (percentageHumidity < 30)
    {
      pumpState = true;
    }
    else if (percentageHumidity > 50)
    {
      pumpState = false;
    }
  }

  // sterowanie wyjściem
  digitalWrite(pumpPin, pumpState ? HIGH : LOW);

  delay(1000);
}