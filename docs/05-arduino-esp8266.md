# 05. Arduino i ESP8266

## Rola czesci sprzetowej

Czesc sprzetowa odpowiada za:

- odczyt danych z czujnikow,
- lokalne sterowanie pompa,
- przekazanie danych pomiarowych do ESP8266,
- odbior komend pompy z ESP8266,
- odbior konfiguracji czestotliwosci czujnikow.

ESP8266 odpowiada za:

- polaczenie z Wi-Fi,
- wyslanie danych pomiarowych do backendu,
- pobranie najnowszej komendy pompy z backendu,
- pobranie aktywnej konfiguracji czujnikow z backendu,
- przekazanie komend do Arduino.

## Glowne pliki

| Plik | Rola |
| --- | --- |
| `arduino/all_sensors_without_wifi/all_sensors_final/all_sensors_final.ino` | Glowny szkic Arduino Mega do odczytu wszystkich czujnikow i sterowania pompa. |
| `arduino/esp_wifi_backend/esp_wifi_backend.ino` | Szkic ESP8266 do komunikacji Wi-Fi z backendem. |
| `arduino/esp_wifi_backend/arduino_secrets.example.h` | Przykladowy plik konfiguracji Wi-Fi i adresow API. |
| `arduino/humidity+temp+pressure/hum_temp_press/hum_temp_press.ino` | Test BME280. |
| `arduino/light_sensor/bh1750_lux_reader/bh1750_lux_reader.ino` | Test BH1750. |
| `arduino/moisture_sensor_led/moisture_sensor_led.ino` | Test czujnika wilgotnosci gleby z LED. |
| `arduino/pump_control/pump_control/pump_control.ino` | Test pompy i czujnika wilgotnosci gleby. |
| `arduino/irrigation_control/irrigation_control.ino` | Prototyp sterowania podlewaniem. |

## Czujniki i elementy wykonawcze

| Element | Mierzona/sterowana wartosc | Kod / biblioteka |
| --- | --- | --- |
| Analogowy czujnik wilgotnosci gleby | `moisture_percent` | `analogRead(A0)` |
| BME280 | temperatura powietrza, wilgotnosc powietrza, cisnienie | `Adafruit_BME280` |
| BH1750 | natezenie swiatla | `BH1750` |
| DS18B20 | temperatura gleby | `OneWire`, `DallasTemperature` |
| Przekaznik/pompa | podlewanie | pin cyfrowy `8` |

## Piny w glownym szkicu Arduino

Na podstawie `all_sensors_final.ino`:

| Stala | Pin | Znaczenie |
| --- | --- | --- |
| `SOIL_MOISTURE_PIN` | `A0` | Analogowy czujnik wilgotnosci gleby. |
| `DS18B20_PIN` | `22` | Czujnik temperatury gleby DS18B20. |
| `RELAY_PIN` | `8` | Przekaznik pompy. |
| `BH1750_ADDRESS` | `0x23` | Adres I2C czujnika BH1750. |
| `BME280_I2C_ADDRESS` | `0x76` | Adres I2C BME280. |

Arduino Mega uzywa magistrali I2C:

| Linia | Pin Arduino Mega |
| --- | --- |
| SDA | `20` |
| SCL | `21` |

Zasilanie BME280 z plytka opisana `VIN, GND, SCL, SDA`:

- `VIN` czujnika do `5V` Arduino, jesli modul jest wersja 5V z regulatorem,
- `GND` do `GND`,
- `SDA` do `20`,
- `SCL` do `21`.

Nie nalezy mylic `VIN` na module czujnika z pinem `Vin` na Arduino. Pin `Vin` Arduino sluzy do zasilania plytki Arduino z zewnetrznego zrodla, a nie jako typowe wyjscie 5V dla czujnika.

## Komunikacja Arduino - ESP8266

Arduino Mega komunikuje sie z ESP8266 przez port szeregowy.

W glownym szkicu:

```cpp
#if defined(UBRR3H)
#define EspSerial Serial3
#else
#define EspSerial Serial1
#endif
```

Dla Arduino Mega uzywany jest `Serial3`. Predkosc:

```cpp
EspSerial.begin(9600);
```

Arduino wysyla do ESP8266 tekst w formacie JSON zakonczony znakiem nowej linii.

## Format JSON wysylany z Arduino

Przykladowy payload:

```json
{
  "station_number": 1,
  "pot_number": 1,
  "moisture_percent": 45,
  "air_temperature": 24.10,
  "air_humidity": 51.20,
  "pressure_hpa": 1004.36,
  "soil_temperature": 20.50,
  "light_lux": 420.00,
  "pump_on": false
}
```

Jesli dany czujnik nie byl odczytywany w danym cyklu, Arduino wysyla dla niego:

```json
null
```

Dzieki temu rozne czujniki moga miec rozne czestotliwosci odczytu.

## Automatyczne sterowanie pompa

W glownym szkicu:

```cpp
int moistureLimit = 20;
```

Jesli tryb manualny jest wylaczony, Arduino steruje pompa wedlug wilgotnosci gleby:

- gdy `cachedSoilMoisture > moistureLimit`, pompa jest wylaczana,
- gdy `cachedSoilMoisture <= moistureLimit`, pompa jest wlaczana.

## Tryby komend pompy

Arduino obsluguje komendy:

| Komenda | Dzialanie |
| --- | --- |
| `PUMP_ON` | Wlacza tryb manualny i wlacza pompe. |
| `PUMP_OFF` | Wlacza tryb manualny i wylacza pompe. |
| `PUMP_AUTO` | Wylacza tryb manualny i wraca do automatyki. |

## Konfiguracja czestotliwosci czujnikow

Arduino obsluguje komende:

```text
CONFIG:soil_moisture=30;light=60;soil_temperature=120;air_temperature=60;air_humidity=60;pressure=180
```

Wartosci sa w sekundach. Arduino zamienia je na milisekundy:

```cpp
intervalMs = seconds * 1000UL;
```

Jesli wartosc wynosi `0`, dany czujnik nie jest odczytywany przez warunek:

```cpp
return intervalMs > 0 && ...
```

## ESP8266

Plik `esp_wifi_backend.ino`:

- laczy sie z Wi-Fi,
- odbiera JSON z Arduino przez `Serial`,
- wysyla JSON do backendu przez `POST /api/measurements/`,
- co 5 sekund pobiera najnowsza komende pompy,
- co 30 sekund pobiera konfiguracje aktywnego eksperymentu.

Interwaly:

| Zmienna | Wartosc | Znaczenie |
| --- | --- | --- |
| `commandCheckIntervalMs` | `5000` | Co ile ESP pobiera komende pompy. |
| `configCheckIntervalMs` | `30000` | Co ile ESP pobiera konfiguracje czujnikow. |

## Konfiguracja ESP8266

Nalezy utworzyc plik:

```text
arduino/esp_wifi_backend/arduino_secrets.h
```

na podstawie:

```text
arduino/esp_wifi_backend/arduino_secrets.example.h
```

Przykladowa zawartosc:

```cpp
#pragma once

const char* WIFI_SSID = "nazwaWifi";
const char* WIFI_PASSWORD = "hasloDoWifi";

const char* MEASUREMENTS_API_URL = "http://<IP_KOMPUTERA>:8000/api/measurements/";
const char* PUMP_COMMAND_API_URL = "http://<IP_KOMPUTERA>:8000/api/pump-control/latest/";
const char* ACTIVE_SENSOR_CONFIG_API_URL = "http://<IP_KOMPUTERA>:8000/api/experiments/active-sensor-config/?sensor_set_id=1";
```

Wazne: dla ESP8266 nie nalezy wpisywac `localhost`, bo `localhost` oznacza samo ESP8266, a nie komputer z backendem.

## Tryby DIP wedlug README

README opisuje sposob pracy z plytka Arduino Mega + ESP8266.

### Wgrywanie kodu na Arduino Mega

- DIP: `3 ON`, `4 ON`, reszta `OFF`,
- przelacznik: `TXD0 / RXD0`,
- Board: `Arduino Mega 2560`,
- szkic: `all_sensors_final.ino`.

### Wgrywanie kodu na ESP8266

- DIP: `5 ON`, `6 ON`, `7 ON`, reszta `OFF`,
- maly przelacznik: `TXD0 / RXD0`,
- Board: `Generic ESP8266 Module`,
- szkic: `esp_wifi_backend.ino`.

### Tryb pracy

- DIP: `1 ON`, `2 ON`, reszta `OFF`,
- maly przelacznik: `TXD3 / RXD3`,
- wykonac reset plytki.
