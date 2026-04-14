void setup() {
  Serial.begin(9600);      // podgląd na komputerze
  Serial3.begin(9600);     // wysyłka do ESP
}

void loop() {
  int rawValue = analogRead(A0);

  Serial.print("Mega: ");
  Serial.println(rawValue);

  Serial3.println(rawValue);

  delay(5000);
}