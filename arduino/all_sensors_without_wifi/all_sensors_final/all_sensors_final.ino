#include <Wire.h>
#include <BH1750.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <OneWire.h>
#include <DallasTemperature.h>

const byte CHANNEL_COUNT = 3;
const byte SOIL_MOISTURE_PINS[CHANNEL_COUNT] = {A0, A1, A2};
const byte SOIL_TEMPERATURE_PINS[CHANNEL_COUNT] = {35, 36, 38};
const byte PUMP_RELAY_PIN = 22;
const byte VALVE_RELAY_PINS[CHANNEL_COUNT] = {23, 24, 25};
const byte RELAY_ON = LOW;
const byte RELAY_OFF = HIGH;
const byte BH1750_ADDRESS = 0x23;
const byte BME280_I2C_ADDRESS = 0x76;

const float ADC_REFERENCE_VOLTAGE = 5.0F;
const float MIN_VALID_SOIL_VOLTAGE = 0.15F;
const float MAX_VALID_SOIL_VOLTAGE = 3.15F;
const float MOISTURE_START_PERCENT = 16.0F;
const float MOISTURE_STOP_PERCENT = 25.0F;
const unsigned long MAX_WATERING_TIME_MS = 60UL * 1000UL;
const unsigned long VALVE_SWITCH_DELAY_MS = 200;
const unsigned long MEASUREMENT_SEND_GAP_MS = 7000;

#if defined(UBRR3H)
#define EspSerial Serial3
#else
#define EspSerial Serial1
#endif

BH1750 lightMeter;
Adafruit_BME280 bme;
OneWire oneWire0(SOIL_TEMPERATURE_PINS[0]);
OneWire oneWire1(SOIL_TEMPERATURE_PINS[1]);
OneWire oneWire2(SOIL_TEMPERATURE_PINS[2]);
DallasTemperature ds0(&oneWire0), ds1(&oneWire1), ds2(&oneWire2);
DallasTemperature* soilTemperatureSensors[CHANNEL_COUNT] = {&ds0, &ds1, &ds2};

enum ControlMode { MODE_AUTO, MODE_MANUAL_ON, MODE_MANUAL_OFF, MODE_TIMED };
struct ChannelState {
  int potNumber;
  float moisture;
  float soilTemperature;
  bool moistureValid;
  bool temperatureValid;
  bool autoDemand;
  bool safetyLockout;
  ControlMode mode;
  unsigned long timedUntil;
  unsigned long timedDurationMs;
};
ChannelState channels[CHANNEL_COUNT];

int experimentId = 0, stationNumber = 0;
bool assignmentReady = false, hasLightSensor = false, hasAirSensor = false;
float lightLux = 0, airTemperature = 0, airHumidity = 0, pressureHpa = 0;
unsigned long soilMoistureIntervalMs = 10000, soilTemperatureIntervalMs = 10000;
unsigned long lightIntervalMs = 10000, airTemperatureIntervalMs = 10000;
unsigned long airHumidityIntervalMs = 10000, pressureIntervalMs = 10000;
unsigned long lastMoistureAt = 0, lastSoilTemperatureAt = 0, lastLightAt = 0, lastAirAt = 0;
int activeChannel = -1, nextChannel = 0;
unsigned long wateringStartedAt = 0;
bool irrigationStateChanged = false;
bool measurementPending[CHANNEL_COUNT] = {false, false, false};
bool pendingMoisture[CHANNEL_COUNT] = {false, false, false};
bool pendingSoilTemperature[CHANNEL_COUNT] = {false, false, false};
bool pendingLight[CHANNEL_COUNT] = {false, false, false};
bool pendingAir[CHANNEL_COUNT] = {false, false, false};
byte nextMeasurementChannel = 0;
unsigned long lastMeasurementSentAt = 0;

void setup() {
  Serial.begin(9600);
  EspSerial.begin(9600);
  digitalWrite(PUMP_RELAY_PIN, RELAY_OFF);
  pinMode(PUMP_RELAY_PIN, OUTPUT);
  for (byte i = 0; i < CHANNEL_COUNT; i++) {
    digitalWrite(VALVE_RELAY_PINS[i], RELAY_OFF);
    pinMode(VALVE_RELAY_PINS[i], OUTPUT);
    channels[i] = {0, 0, 0, false, false, false, false, MODE_AUTO, 0, 0};
    soilTemperatureSensors[i]->begin();
    Serial.print("DS18B20 na D"); Serial.print(SOIL_TEMPERATURE_PINS[i]);
    Serial.print(": wykryto "); Serial.print(soilTemperatureSensors[i]->getDeviceCount());
    Serial.println(" czujnik(ow)");
  }
  Wire.begin(); // Mega: SDA=D20 i SCL=D21; oba komplety gniazd I2C sa wspolne.
  hasLightSensor = lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, BH1750_ADDRESS);
  hasAirSensor = bme.begin(BME280_I2C_ADDRESS);
  Serial.println("Sterownik trzech doniczek uruchomiony");
  Serial.println(hasLightSensor ? "BH1750: OK" : "BH1750: BRAK ODPOWIEDZI");
  Serial.println(hasAirSensor ? "BME280: OK" : "BME280: BRAK ODPOWIEDZI");
}

void loop() {
  handleEspCommands();
  unsigned long now = millis();
  bool moistureUpdated = due(lastMoistureAt, soilMoistureIntervalMs, now);
  bool soilTemperatureUpdated = due(lastSoilTemperatureAt, soilTemperatureIntervalMs, now);
  bool lightUpdated = hasLightSensor && due(lastLightAt, lightIntervalMs, now);
  unsigned long airInterval = min(airTemperatureIntervalMs, min(airHumidityIntervalMs, pressureIntervalMs));
  bool airUpdated = hasAirSensor && due(lastAirAt, airInterval, now);

  if (moistureUpdated) { readMoisture(); lastMoistureAt = now; }
  if (soilTemperatureUpdated) { readSoilTemperatures(); lastSoilTemperatureAt = millis(); }
  if (lightUpdated) { lightLux = lightMeter.readLightLevel(); lastLightAt = now; }
  if (airUpdated) {
    airTemperature = bme.readTemperature(); airHumidity = bme.readHumidity();
    pressureHpa = bme.readPressure() / 100.0F; lastAirAt = now;
  }

  updateAutoDemand();
  updateIrrigation(now);
  if (assignmentReady && (moistureUpdated || soilTemperatureUpdated || lightUpdated || airUpdated || irrigationStateChanged)) {
    for (byte i = 0; i < CHANNEL_COUNT; i++) if (channels[i].potNumber > 0)
      queueMeasurement(i, moistureUpdated, soilTemperatureUpdated, lightUpdated, airUpdated);
    irrigationStateChanged = false;
  }
  flushMeasurementQueue(now);
  delay(25);
}

bool due(unsigned long lastAt, unsigned long interval, unsigned long now) {
  return interval > 0 && (lastAt == 0 || now - lastAt >= interval);
}

float soilWatchVwc(float voltage) {
  float value = 2.8432F * voltage * voltage * voltage - 9.1993F * voltage * voltage
              + 20.2553F * voltage - 4.1882F;
  return constrain(value, 0.0F, 100.0F);
}

void readMoisture() {
  for (byte channel = 0; channel < CHANNEL_COUNT; channel++) {
    unsigned long sum = 0;
    for (byte sample = 0; sample < 10; sample++) { sum += analogRead(SOIL_MOISTURE_PINS[channel]); delay(2); }
    float voltage = (sum / 10.0F) * ADC_REFERENCE_VOLTAGE / 1023.0F;
    channels[channel].moistureValid = voltage >= MIN_VALID_SOIL_VOLTAGE
      && voltage <= MAX_VALID_SOIL_VOLTAGE;
    Serial.print("SoilWatch "); Serial.print(channel + 1);
    Serial.print(" (A"); Serial.print(channel); Serial.print("): raw=");
    Serial.print(sum / 10.0F, 1); Serial.print(", napiecie=");
    Serial.print(voltage, 3); Serial.print(" V");
    if (channels[channel].moistureValid) {
      channels[channel].moisture = soilWatchVwc(voltage);
      Serial.print(", VWC="); Serial.print(channels[channel].moisture, 1); Serial.println(" %");
    } else {
      channels[channel].autoDemand = false;
      Serial.println(" -> NIEPRAWIDLOWY ODCZYT");
    }
  }
}

void readSoilTemperatures() {
  for (byte i = 0; i < CHANNEL_COUNT; i++) soilTemperatureSensors[i]->requestTemperatures();
  for (byte i = 0; i < CHANNEL_COUNT; i++) {
    float value = soilTemperatureSensors[i]->getTempCByIndex(0);
    channels[i].temperatureValid = value != DEVICE_DISCONNECTED_C && value > -55 && value < 125;
    if (channels[i].temperatureValid) channels[i].soilTemperature = value;
    Serial.print("DS18B20 "); Serial.print(i + 1);
    Serial.print(" (D"); Serial.print(SOIL_TEMPERATURE_PINS[i]); Serial.print("): ");
    if (channels[i].temperatureValid) {
      Serial.print(value, 2); Serial.println(" C");
    } else {
      Serial.print(value, 2); Serial.println(" C -> NIEPRAWIDLOWY ODCZYT");
    }
  }
}

void updateAutoDemand() {
  for (byte i = 0; i < CHANNEL_COUNT; i++) {
    if (channels[i].mode != MODE_AUTO || !channels[i].moistureValid || channels[i].potNumber < 1) {
      if (channels[i].mode == MODE_AUTO) channels[i].autoDemand = false;
      continue;
    }
    if (channels[i].moisture >= MOISTURE_STOP_PERCENT) {
      channels[i].autoDemand = false;
      channels[i].safetyLockout = false;
    } else if (channels[i].moisture <= MOISTURE_START_PERCENT && !channels[i].safetyLockout) {
      channels[i].autoDemand = true;
    }
  }
}

bool demandsWater(byte channel, unsigned long now) {
  ChannelState &state = channels[channel];
  if (state.potNumber < 1) return false;
  if (state.mode == MODE_TIMED && state.timedUntil != 0 && (long)(now - state.timedUntil) >= 0)
    state.mode = MODE_MANUAL_OFF;
  if (state.mode == MODE_MANUAL_ON || state.mode == MODE_TIMED) return true;
  return state.mode == MODE_AUTO && state.autoDemand && !state.safetyLockout;
}

void updateIrrigation(unsigned long now) {
  if (!assignmentReady) { stopIrrigation(); return; }
  if (activeChannel >= 0) {
    if (now - wateringStartedAt >= MAX_WATERING_TIME_MS) {
      channels[activeChannel].safetyLockout = true;
      channels[activeChannel].autoDemand = false;
      if (channels[activeChannel].mode != MODE_AUTO) channels[activeChannel].mode = MODE_MANUAL_OFF;
      Serial.println("STOP: przekroczono 1 minute podlewania");
      stopIrrigation();
    } else if (!demandsWater(activeChannel, now)) {
      int finished = activeChannel; stopIrrigation(); nextChannel = (finished + 1) % CHANNEL_COUNT;
    }
  }
  if (activeChannel < 0) {
    for (byte offset = 0; offset < CHANNEL_COUNT; offset++) {
      byte candidate = (nextChannel + offset) % CHANNEL_COUNT;
      if (demandsWater(candidate, now)) { startIrrigation(candidate); nextChannel = (candidate + 1) % CHANNEL_COUNT; break; }
    }
  }
}

void startIrrigation(byte channel) {
  stopIrrigation();
  digitalWrite(VALVE_RELAY_PINS[channel], RELAY_ON);
  delay(VALVE_SWITCH_DELAY_MS);
  digitalWrite(PUMP_RELAY_PIN, RELAY_ON);
  activeChannel = channel; wateringStartedAt = millis();
  irrigationStateChanged = true;
  if (channels[channel].mode == MODE_TIMED && channels[channel].timedUntil == 0)
    channels[channel].timedUntil = wateringStartedAt + channels[channel].timedDurationMs;
  Serial.print("Podlewanie P"); Serial.println(channels[channel].potNumber);
}

void stopIrrigation() {
  bool wasRunning = activeChannel >= 0;
  digitalWrite(PUMP_RELAY_PIN, RELAY_OFF);
  if (activeChannel >= 0) delay(VALVE_SWITCH_DELAY_MS);
  for (byte i = 0; i < CHANNEL_COUNT; i++) digitalWrite(VALVE_RELAY_PINS[i], RELAY_OFF);
  activeChannel = -1;
  if (wasRunning) irrigationStateChanged = true;
}

int channelForPot(int pot) {
  for (byte i = 0; i < CHANNEL_COUNT; i++) if (channels[i].potNumber == pot) return i;
  return -1;
}

void handleEspCommands() {
  while (EspSerial.available()) {
    String command = EspSerial.readStringUntil('\n'); command.trim();
    if (command.length() == 0) continue;
    Serial.print("ESP -> Mega: "); Serial.println(command);
    if (command.startsWith("CONFIG:")) applyConfig(command);
    else if (command == "UNASSIGNED") clearAssignments();
    else applyPumpCommand(command);
  }
}

void applyPumpCommand(String command) {
  int firstColon = command.indexOf(':');
  if (firstColon < 0) return;
  if (!assignmentReady) {
    Serial.println("Pominieto polecenie: Mega nie ma jeszcze konfiguracji doniczek");
    return;
  }
  String action = command.substring(0, firstColon);
  int secondColon = command.indexOf(':', firstColon + 1);
  int pot = command.substring(firstColon + 1, secondColon < 0 ? command.length() : secondColon).toInt();
  int channel = channelForPot(pot);
  if (channel < 0) {
    Serial.print("Pominieto polecenie: doniczka P"); Serial.print(pot);
    Serial.println(" nie jest przypisana do tego sterownika");
    return;
  }
  if (action == "PUMP_ON") {
    channels[channel].safetyLockout = false;
    if (secondColon > 0) {
      unsigned long seconds = command.substring(secondColon + 1).toInt();
      if (seconds < 1 || seconds > 60) return;
      channels[channel].mode = MODE_TIMED;
      channels[channel].timedDurationMs = seconds * 1000UL;
      channels[channel].timedUntil = 0; // Odliczanie zacznie sie dopiero po otwarciu tego zaworu.
    } else {
      channels[channel].mode = MODE_MANUAL_ON; channels[channel].timedUntil = 0;
    }
  } else if (action == "PUMP_OFF") {
    channels[channel].mode = MODE_MANUAL_OFF; channels[channel].timedUntil = 0;
  } else if (action == "PUMP_AUTO") {
    channels[channel].mode = MODE_AUTO; channels[channel].safetyLockout = false; channels[channel].timedUntil = 0;
  }
  Serial.print("Przyjeto polecenie "); Serial.print(action);
  Serial.print(" dla P"); Serial.print(pot);
  Serial.print(" (kanal "); Serial.print(channel + 1); Serial.println(")");
}

void applyConfig(String command) {
  int newExperimentId = configInt(command, "experiment_id");
  int newStationNumber = configInt(command, "station_number");
  int newPotNumbers[CHANNEL_COUNT];
  bool anyPot = false;
  for (byte i = 0; i < CHANNEL_COUNT; i++) {
    newPotNumbers[i] = configInt(command, "pot" + String(i + 1));
    anyPot = anyPot || newPotNumbers[i] > 0;
  }
  setInterval(command, "soil_moisture", soilMoistureIntervalMs);
  setInterval(command, "soil_temperature", soilTemperatureIntervalMs);
  setInterval(command, "light", lightIntervalMs); setInterval(command, "air_temperature", airTemperatureIntervalMs);
  setInterval(command, "air_humidity", airHumidityIntervalMs); setInterval(command, "pressure", pressureIntervalMs);
  bool configValid = newExperimentId > 0 && newStationNumber > 0 && anyPot;
  if (!configValid) {
    clearAssignments();
    return;
  }

  bool sameConfig = assignmentReady
    && experimentId == newExperimentId
    && stationNumber == newStationNumber;
  for (byte i = 0; i < CHANNEL_COUNT; i++) {
    sameConfig = sameConfig && channels[i].potNumber == newPotNumbers[i];
  }
  if (sameConfig) {
    Serial.println("Konfiguracja doniczek potwierdzona");
    return;
  }

  stopIrrigation();
  experimentId = newExperimentId;
  stationNumber = newStationNumber;
  assignmentReady = true;
  for (byte i = 0; i < CHANNEL_COUNT; i++) {
    channels[i].potNumber = newPotNumbers[i];
    channels[i].mode = MODE_AUTO; channels[i].autoDemand = false; channels[i].safetyLockout = false;
    channels[i].timedUntil = 0; channels[i].timedDurationMs = 0;
    measurementPending[i] = false;
    pendingMoisture[i] = false; pendingSoilTemperature[i] = false;
    pendingLight[i] = false; pendingAir[i] = false;
  }
  nextMeasurementChannel = 0;
  lastMeasurementSentAt = 0;
  // Po restarcie lub zmianie doświadczenia wykonaj pełny odczyt od razu,
  // zamiast czekać do końca interwału skonfigurowanego w backendzie.
  lastMoistureAt = 0;
  lastSoilTemperatureAt = 0;
  lastLightAt = 0;
  lastAirAt = 0;
  Serial.print("Konfiguracja: P"); Serial.print(channels[0].potNumber);
  Serial.print(", P"); Serial.print(channels[1].potNumber);
  Serial.print(", P"); Serial.println(channels[2].potNumber);
}

void clearAssignments() {
  stopIrrigation(); experimentId = 0; stationNumber = 0; assignmentReady = false;
  for (byte i = 0; i < CHANNEL_COUNT; i++) {
    channels[i].potNumber = 0; channels[i].mode = MODE_AUTO; channels[i].autoDemand = false;
    channels[i].timedUntil = 0; channels[i].timedDurationMs = 0;
    measurementPending[i] = false;
    pendingMoisture[i] = false; pendingSoilTemperature[i] = false;
    pendingLight[i] = false; pendingAir[i] = false;
  }
  Serial.println("Brak przypisania sprzetu");
}

int configInt(String command, String key) {
  int keyAt = command.indexOf(key + "="); if (keyAt < 0) return 0;
  int start = keyAt + key.length() + 1, end = command.indexOf(';', start);
  if (end < 0) end = command.length();
  return command.substring(start, end).toInt();
}

void setInterval(String command, String key, unsigned long &interval) {
  int seconds = configInt(command, key); if (seconds > 0) interval = (unsigned long)seconds * 1000UL;
}

void nullable(float value, bool valid) {
  if (valid && !isnan(value)) EspSerial.print(value, 2); else EspSerial.print("null");
}

void queueMeasurement(byte channel, bool moistureUpdated, bool temperatureUpdated, bool lightUpdated, bool airUpdated) {
  measurementPending[channel] = true;
  pendingMoisture[channel] = pendingMoisture[channel] || moistureUpdated;
  pendingSoilTemperature[channel] = pendingSoilTemperature[channel] || temperatureUpdated;
  pendingLight[channel] = pendingLight[channel] || lightUpdated;
  pendingAir[channel] = pendingAir[channel] || airUpdated;
}

void flushMeasurementQueue(unsigned long now) {
  if (!assignmentReady) return;
  if (lastMeasurementSentAt != 0 && now - lastMeasurementSentAt < MEASUREMENT_SEND_GAP_MS) return;

  for (byte offset = 0; offset < CHANNEL_COUNT; offset++) {
    byte channel = (nextMeasurementChannel + offset) % CHANNEL_COUNT;
    if (!measurementPending[channel]) continue;

    sendMeasurement(channel, pendingMoisture[channel], pendingSoilTemperature[channel], pendingLight[channel], pendingAir[channel]);
    measurementPending[channel] = false;
    pendingMoisture[channel] = false; pendingSoilTemperature[channel] = false;
    pendingLight[channel] = false; pendingAir[channel] = false;
    nextMeasurementChannel = (channel + 1) % CHANNEL_COUNT;
    lastMeasurementSentAt = millis();
    return;
  }
}

void sendMeasurement(byte channel, bool moistureUpdated, bool temperatureUpdated, bool lightUpdated, bool airUpdated) {
  ChannelState &state = channels[channel];
  EspSerial.print("{\"experiment_id\":"); EspSerial.print(experimentId);
  EspSerial.print(",\"station_number\":"); EspSerial.print(stationNumber);
  EspSerial.print(",\"pot_number\":"); EspSerial.print(state.potNumber);
  EspSerial.print(",\"moisture_percent\":"); nullable(state.moisture, moistureUpdated && state.moistureValid);
  EspSerial.print(",\"air_temperature\":"); nullable(airTemperature, airUpdated && hasAirSensor);
  EspSerial.print(",\"air_humidity\":"); nullable(airHumidity, airUpdated && hasAirSensor);
  EspSerial.print(",\"pressure_hpa\":"); nullable(pressureHpa, airUpdated && hasAirSensor);
  EspSerial.print(",\"soil_temperature\":"); nullable(state.soilTemperature, temperatureUpdated && state.temperatureValid);
  EspSerial.print(",\"light_lux\":"); nullable(lightLux, lightUpdated && hasLightSensor);
  EspSerial.print(",\"pump_on\":"); EspSerial.print(activeChannel == channel ? "true" : "false");
  EspSerial.println("}");
}
