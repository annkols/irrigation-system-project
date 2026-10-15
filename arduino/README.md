# Firmware zestawu na trzy doniczki

Jeden zestaw Arduino Mega + ESP8266 obsługuje trzy doniczki, jedną wspólną pompę
i trzy elektrozawory. Do procesorów wgrywa się dwa osobne szkice.

## Arduino Mega

Szkic: `all_sensors_without_wifi/all_sensors_final/all_sensors_final.ino`

| Element | Pin |
|---|---|
| SoilWatch kanał 1/2/3 | A0 / A1 / A2 |
| DS18B20 kanał 1/2/3 | D35 / D36 / D38 |
| przekaźnik pompy | D22 |
| zawór kanału 1/2/3 | D23 / D24 / D25 |
| BH1750 i BME280 SDA | D20 / SDA |
| BH1750 i BME280 SCL | D21 / SCL |

Podwójne złącza SDA i SCL na Arduino Mega nie są dwiema magistralami. Są połączone
z tymi samymi liniami D20 i D21, dlatego BME280 może być wpięty w jedno złącze,
a BH1750 w drugie. Oba moduły mają różne adresy I2C (BME280 `0x76`, BH1750 `0x23`).

SoilWatch 10: przewód brązowy to zasilanie, zielony to GND, biały to wyjście
analogowe. Firmware uśrednia 10 próbek i używa wielomianu VWC producenta zamiast
liniowego `map()`. Automatyczne podlewanie startuje przy wilgotności nie większej
niż 16% i kończy się po osiągnięciu co najmniej 25%.
Odczyt poniżej 0,15 V lub powyżej 3,15 V jest traktowany jako nieprawidłowy i nie
może uruchomić automatycznego podlewania.

Pompa jest wspólna, więc w danej chwili podlewana jest najwyżej jedna doniczka.
Sterownik najpierw wyłącza pompę i zamyka zawory, następnie otwiera wybrany zawór,
czeka 200 ms i dopiero uruchamia pompę. Przy zatrzymaniu najpierw wyłącza pompę.
Ciągłe podlewanie ma twardy limit 1 minuty. Nieprawidłowy odczyt SoilWatch blokuje
automatyczne podlewanie danego kanału.

Kod zakłada przekaźniki aktywowane stanem LOW (typowe ustawienie modułu HW-281).
Przed podłączeniem wody trzeba sprawdzić na sucho, czy po resecie pompa i wszystkie
zawory pozostają wyłączone. Jeśli moduł działa odwrotnie, należy zamienić wartości
`RELAY_ON` i `RELAY_OFF`.

## ESP8266

Szkic: `esp_wifi_backend/esp_wifi_backend.ino`

Skopiuj `device_config.example.h` jako `device_config.h` i ustaw identyfikatory
trzech par czujników. Przykład:

```cpp
const int SENSOR_SET_ID = 1;
const byte POT_CHANNEL_COUNT = 3;
const char* SOIL_MOISTURE_IDS[POT_CHANNEL_COUNT] = {"1", "2", "3"};
const char* SOIL_TEMPERATURE_IDS[POT_CHANNEL_COUNT] = {"1", "2", "3"};
```

ESP pyta backend osobno o przypisanie każdego kanału. Kanał może pozostać
nieprzypisany; pozostałe nadal działają. Następnie przesyła Mega jedną konfigurację
z polami `pot1`, `pot2`, `pot3`. Polecenia pompy pobierane są osobno dla każdej
przypisanej doniczki i przekazywane z numerem doniczki, np. `PUMP_ON:7:30`.
Kilka poleceń czasowych może oczekiwać jednocześnie. Sterownik uruchamia je kolejno,
a czas każdej doniczki zaczyna odliczać dopiero po otwarciu jej zaworu.

## ESP32-CAM

Szkic `CAMERA/CAMERA.ino` pozostaje niezależny. Każda z trzech kamer musi mieć
osobny rekord `CameraDevice`, token i adres IP. Wszystkie mogą należeć do tego
samego `sensor_set_id`; przypisanie kamera–doniczka przechowuje backend. Ten sam
szkic wgrywa się trzy razy, zmieniając przed każdym wgraniem token i lokalny IP.
