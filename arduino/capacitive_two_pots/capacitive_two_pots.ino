#include <OneWire.h>
#include <DallasTemperature.h>

const byte CHANNEL_COUNT = 2;
const byte MOISTURE_PINS[CHANNEL_COUNT] = {A0, A1};
const byte SOIL_TEMPERATURE_PINS[CHANNEL_COUNT] = {24, 26};

// Wartości startowe dla SEN0193 według zakresów sprzedawcy.
const int DRY_RAW[CHANNEL_COUNT] = {550, 550};
const int WET_RAW[CHANNEL_COUNT] = {250, 250};
const byte MOISTURE_SAMPLE_COUNT = 10;
const unsigned long SEND_GAP_MS = 250;

#if defined(UBRR3H)
#define EspSerial Serial3
#else
#define EspSerial Serial1
#endif

OneWire oneWire0(SOIL_TEMPERATURE_PINS[0]);
OneWire oneWire1(SOIL_TEMPERATURE_PINS[1]);
DallasTemperature ds0(&oneWire0), ds1(&oneWire1);
DallasTemperature* temperatureSensors[CHANNEL_COUNT] = {&ds0, &ds1};

struct ChannelState {
  int potNumber;
  float moisture;
  float soilTemperature;
  bool moistureValid;
  bool temperatureValid;
};

ChannelState channels[CHANNEL_COUNT];
int experimentId = 0;
int stationNumber = 0;
bool assignmentReady = false;
unsigned long moistureIntervalMs = 0;
unsigned long temperatureIntervalMs = 0;
unsigned long lastMoistureAt = 0;
unsigned long lastTemperatureAt = 0;

void setup() {
  Serial.begin(9600);
  EspSerial.begin(9600);

  for (byte channel = 0; channel < CHANNEL_COUNT; channel++) {
    channels[channel] = {0, 0, 0, false, false};
    temperatureSensors[channel]->begin();
  }

  Serial.println("Sterownik dwoch doniczek uruchomiony");
  Serial.println("Czujniki pojemnosciowe: A0, A1; DS18B20: D24, D26");
  delay(1000);
  runStartupDiagnostics();
  Serial.println("Oczekiwanie na konfiguracje z ESP...");
}

void loop() {
  handleEspCommands();
  unsigned long now = millis();
  bool moistureUpdated = assignmentReady && due(lastMoistureAt, moistureIntervalMs, now);
  bool temperatureUpdated = assignmentReady && due(lastTemperatureAt, temperatureIntervalMs, now);

  if (moistureUpdated) {
    readMoisture();
    lastMoistureAt = now;
  }
  if (temperatureUpdated) {
    readTemperatures();
    // Używamy tego samego punktu czasu co dla wilgotności. Dzięki temu czujniki
    // z jednakowym interwałem pozostają zsynchronizowane mimo czasu konwersji DS18B20.
    lastTemperatureAt = now;
  }

  if (moistureUpdated || temperatureUpdated) {
    for (byte channel = 0; channel < CHANNEL_COUNT; channel++) {
      if (channels[channel].potNumber < 1) continue;
      sendMeasurement(channel, moistureUpdated, temperatureUpdated);
      delay(SEND_GAP_MS);
    }
  }

  delay(25);
}

bool due(unsigned long lastAt, unsigned long interval, unsigned long now) {
  return interval > 0 && (lastAt == 0 || now - lastAt >= interval);
}

void printDeviceAddress(DeviceAddress address) {
  for (byte i = 0; i < 8; i++) {
    if (address[i] < 16) Serial.print('0');
    Serial.print(address[i], HEX);
  }
}

void runStartupDiagnostics() {
  Serial.println();
  Serial.println("========== TEST STARTOWY CZUJNIKOW ==========");
  byte moistureOk = 0;
  byte temperatureOk = 0;

  for (byte channel = 0; channel < CHANNEL_COUNT; channel++) {
    unsigned long sum = 0;
    for (byte sample = 0; sample < MOISTURE_SAMPLE_COUNT; sample++) {
      sum += analogRead(MOISTURE_PINS[channel]);
      delay(2);
    }
    float raw = sum / (float)MOISTURE_SAMPLE_COUNT;
    float percent = moisturePercent(channel, raw);

    Serial.print("[Wilgotnosc "); Serial.print(channel + 1);
    Serial.print(" / A"); Serial.print(channel); Serial.print("] raw=");
    Serial.print(raw, 1); Serial.print(", wynik="); Serial.print(percent, 1); Serial.print("%: ");
    if (raw <= 0 || raw >= 1023) {
      Serial.println("BLAD - brak wiarygodnego sygnalu; sprawdz VCC, GND i AOUT");
    } else {
      moistureOk++;
      if (raw < 250 || raw > 550) Serial.println("SYGNAL JEST, ale poza zakresem 250-550; wykonaj kalibracje");
      else Serial.println("OK");
    }
  }

  for (byte channel = 0; channel < CHANNEL_COUNT; channel++) {
    DallasTemperature* sensor = temperatureSensors[channel];
    byte count = sensor->getDeviceCount();
    Serial.print("[DS18B20 "); Serial.print(channel + 1);
    Serial.print(" / D"); Serial.print(SOIL_TEMPERATURE_PINS[channel]);
    Serial.print("] wykryto: "); Serial.print(count);

    if (count == 0) {
      Serial.println(" -> BLAD - sprawdz przewody i rezystor 4,7 kOhm DATA-VCC");
      continue;
    }

    DeviceAddress address;
    if (sensor->getAddress(address, 0)) {
      Serial.print(", adres: ");
      printDeviceAddress(address);
    }

    sensor->requestTemperatures();
    float value = sensor->getTempCByIndex(0);
    Serial.print(", temperatura: "); Serial.print(value, 2); Serial.print(" C -> ");
    if (value == DEVICE_DISCONNECTED_C || value <= -126.0F) {
      Serial.println("BLAD - czujnik odlaczony lub problem z DATA");
    } else if (value == 85.0F) {
      Serial.println("BLAD/OSTRZEZENIE - 85 C oznacza zwykle problem z zasilaniem lub konwersja");
    } else if (value < -55.0F || value > 125.0F) {
      Serial.println("BLAD - wartosc poza zakresem DS18B20");
    } else {
      temperatureOk++;
      Serial.println("OK");
    }
  }

  Serial.println("---------------------------------------------");
  Serial.print("Czujniki wilgotnosci OK: "); Serial.print(moistureOk);
  Serial.print("/"); Serial.println(CHANNEL_COUNT);
  Serial.print("DS18B20 OK: "); Serial.print(temperatureOk);
  Serial.print("/"); Serial.println(CHANNEL_COUNT);
  Serial.println("=============================================");
  Serial.println();
}

float moisturePercent(byte channel, float raw) {
  // SEN0193 daje coraz mniejszy odczyt wraz ze wzrostem wilgotności.
  // 520 odpowiada 0%, 350 odpowiada 100%; zakres wody 350–260 jest
  // celowo ograniczany do 100%, ponieważ aplikacja pokazuje wilgotność gleby.
  float range = DRY_RAW[channel] - WET_RAW[channel];
  if (range <= 0) return NAN;
  return constrain((DRY_RAW[channel] - raw) * 100.0F / range, 0.0F, 100.0F);
}

void handleEspCommands() {
  while (EspSerial.available()) {
    String command = EspSerial.readStringUntil('\n');
    command.trim();
    if (command.startsWith("CONFIG:")) applyConfig(command);
    else if (command == "UNASSIGNED") clearAssignment();
  }
}

void applyConfig(String command) {
  int newExperimentId = configInt(command, "experiment_id");
  int newStationNumber = configInt(command, "station_number");
  int newPots[CHANNEL_COUNT] = {};
  bool anyPot = false;

  for (byte channel = 0; channel < CHANNEL_COUNT; channel++) {
    newPots[channel] = configInt(command, "pot" + String(channel + 1));
    anyPot = anyPot || newPots[channel] > 0;
  }

  setInterval(command, "soil_moisture", moistureIntervalMs);
  setInterval(command, "soil_temperature", temperatureIntervalMs);

  if (newExperimentId < 1 || newStationNumber < 1 || !anyPot) {
    clearAssignment();
    return;
  }

  bool assignmentChanged = !assignmentReady
    || experimentId != newExperimentId
    || stationNumber != newStationNumber;
  for (byte channel = 0; channel < CHANNEL_COUNT; channel++) {
    assignmentChanged = assignmentChanged || channels[channel].potNumber != newPots[channel];
  }

  experimentId = newExperimentId;
  stationNumber = newStationNumber;
  assignmentReady = true;
  for (byte channel = 0; channel < CHANNEL_COUNT; channel++) {
    channels[channel].potNumber = newPots[channel];
    if (moistureIntervalMs == 0) channels[channel].moistureValid = false;
    if (temperatureIntervalMs == 0) channels[channel].temperatureValid = false;
  }

  if (assignmentChanged) {
    lastMoistureAt = 0;
    lastTemperatureAt = 0;
  }

  Serial.print("Konfiguracja: eksperyment ");
  Serial.print(experimentId);
  Serial.print(", zestaw ");
  Serial.println(stationNumber);
}

void clearAssignment() {
  experimentId = 0;
  stationNumber = 0;
  assignmentReady = false;
  for (byte channel = 0; channel < CHANNEL_COUNT; channel++) {
    channels[channel].potNumber = 0;
  }
  Serial.println("Brak przypisania sprzetu");
}

void readMoisture() {
  for (byte channel = 0; channel < CHANNEL_COUNT; channel++) {
    unsigned long sum = 0;
    for (byte sample = 0; sample < MOISTURE_SAMPLE_COUNT; sample++) {
      sum += analogRead(MOISTURE_PINS[channel]);
      delay(2);
    }

    float raw = sum / (float)MOISTURE_SAMPLE_COUNT;
    float percent = moisturePercent(channel, raw);
    channels[channel].moistureValid = raw > 0 && raw < 1023 && !isnan(percent);
    if (channels[channel].moistureValid) {
      channels[channel].moisture = percent;
    }

    Serial.print("Wilgotnosc ");
    Serial.print(channel + 1);
    Serial.print(" (A");
    Serial.print(channel);
    Serial.print("): raw=");
    Serial.print(raw, 1);
    Serial.print(", wynik=");
    if (channels[channel].moistureValid) {
      Serial.print(channels[channel].moisture, 1);
      Serial.println(" %");
    }
    else Serial.println("NIEPRAWIDLOWY");
  }
}

void readTemperatures() {
  for (byte channel = 0; channel < CHANNEL_COUNT; channel++) {
    temperatureSensors[channel]->requestTemperatures();
  }
  for (byte channel = 0; channel < CHANNEL_COUNT; channel++) {
    float value = temperatureSensors[channel]->getTempCByIndex(0);
    channels[channel].temperatureValid = value != DEVICE_DISCONNECTED_C && value > -55 && value < 125;
    if (channels[channel].temperatureValid) channels[channel].soilTemperature = value;

    Serial.print("DS18B20 ");
    Serial.print(channel + 1);
    Serial.print(" (D");
    Serial.print(SOIL_TEMPERATURE_PINS[channel]);
    Serial.print("): ");
    if (channels[channel].temperatureValid) Serial.println(value, 2);
    else Serial.println("NIEPRAWIDLOWY");
  }
}

void sendMeasurement(byte channel, bool moistureUpdated, bool temperatureUpdated) {
  ChannelState &state = channels[channel];
  EspSerial.print("{\"experiment_id\":"); EspSerial.print(experimentId);
  EspSerial.print(",\"station_number\":"); EspSerial.print(stationNumber);
  EspSerial.print(",\"pot_number\":"); EspSerial.print(state.potNumber);
  EspSerial.print(",\"moisture_percent\":"); nullable(state.moisture, moistureUpdated && state.moistureValid);
  EspSerial.print(",\"air_temperature\":null");
  EspSerial.print(",\"air_humidity\":null");
  EspSerial.print(",\"pressure_hpa\":null");
  EspSerial.print(",\"soil_temperature\":"); nullable(state.soilTemperature, temperatureUpdated && state.temperatureValid);
  EspSerial.print(",\"light_lux\":null");
  EspSerial.print(",\"pump_on\":false");
  EspSerial.println("}");
}

void nullable(float value, bool valid) {
  if (valid && !isnan(value)) EspSerial.print(value, 2);
  else EspSerial.print("null");
}

int configInt(String command, String key) {
  int keyAt = command.indexOf(key + "=");
  if (keyAt < 0) return 0;
  int start = keyAt + key.length() + 1;
  int end = command.indexOf(';', start);
  if (end < 0) end = command.length();
  return command.substring(start, end).toInt();
}

void setInterval(String command, String key, unsigned long &interval) {
  int seconds = configInt(command, key);
  interval = seconds > 0 ? (unsigned long)seconds * 1000UL : 0;
}
