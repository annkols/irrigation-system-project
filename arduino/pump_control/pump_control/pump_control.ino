#define RELAY_PIN 8
#define SOIL_MOISTURE_PIN A0

int dryValue = 502;
int wetValue = 259;

int threshold = 30; // poniżej 30% pompa się włączy

void setup() {
  Serial.begin(9600);

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); // pompa OFF

  Serial.println("Soil moisture pump test");
}

void loop() {
  int raw = analogRead(SOIL_MOISTURE_PIN);

  int moisturePercent = map(raw, dryValue, wetValue, 0, 100);
  moisturePercent = constrain(moisturePercent, 0, 100);

  Serial.print("RAW: ");
  Serial.print(raw);
  Serial.print(" | Soil moisture: ");
  Serial.print(moisturePercent);
  Serial.println(" %");

  if (moisturePercent < threshold) {
    Serial.println("Soil dry -> PUMP ON");
    digitalWrite(RELAY_PIN, HIGH);
  } else {
    Serial.println("Soil wet -> PUMP OFF");
    digitalWrite(RELAY_PIN, LOW);
  }

  Serial.println("----------------");
  delay(2000);
}