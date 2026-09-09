# Firmware zestawu nr 1

Każda płytka Mega+ESP8266 ma dwa procesory, dlatego wymaga wgrania dwóch szkiców.

## ATmega2560

Do każdej z trzech części Mega wgrywany jest ten sam szkic:

`all_sensors_without_wifi/all_sensors_final/all_sensors_final.ino`

Szkic używa:

- D7 — sterowanie przekaźnikiem,
- A0 — pojemnościowy czujnik wilgotności gleby,
- D22 — DS18B20,
- SDA/D20 i SCL/D21 — magistrala I2C.

BME280 i BH1750 są wykrywane automatycznie. BME280 znajduje się na kontrolerze 1,
BH1750 na kontrolerze 3, a kontroler 2 nie ma wspólnego czujnika I2C.

## ESP8266

Szkic `esp_wifi_backend/esp_wifi_backend.ino` pobiera z backendu aktualne przypisanie
fizycznego sprzętu do doniczki. Numer doniczki nie jest zapisany na stałe w firmware.

Najpierw należy skopiować `esp_wifi_backend/device_config.example.h` jako
`esp_wifi_backend/device_config.h`. Plik docelowy jest lokalny i ignorowany przez Git.

Przed każdym wgraniem należy w `device_config.h` ustawić:

```cpp
#define CONTROLLER_NUMBER 1
```

Następnie wgrać szkic do ESP8266 pierwszej płytki. Dla kolejnych płytek powtórzyć
operację z wartościami `2` i `3`.

Identyfikatory wpisywane przez użytkownika w formularzu muszą odpowiadać fizycznej
płytce:

| Kontroler | Wilgotność gleby | Temperatura gleby | Pompa |
|---|---|---|---|
| 1 | 1 | 1 | 1 |
| 2 | 2 | 2 | 2 |
| 3 | 3 | 3 | 3 |

Numery doniczek mogą być dowolne. Backend odnajduje monitorowaną doniczkę, której
przypisano komplet identyfikatorów danej płytki, i zwraca jej aktualny numer.

Jeśli nie ma aktywnego doświadczenia albo identyfikatory nie wskazują jednej
monitorowanej doniczki, ESP8266 wysyła do Mega komunikat `UNASSIGNED`. Mega wyłącza
pompę i nie wysyła pomiarów do czasu uzyskania prawidłowej konfiguracji.

## ESP32-CAM

Do obu kamer wgrywany jest szkic `CAMERA/CAMERA.ino`. Przed wgraniem należy
skopiować `CAMERA/arduino_secrets.example.h` jako `CAMERA/arduino_secrets.h`.

Każda kamera musi mieć osobny rekord `CameraDevice` utworzony w panelu Django
Admin. Pole `sensor_set_id` powinno mieć wartość `1`. Po utworzeniu rekordu panel
wyświetla jednorazowy token; należy go wpisać jako `CAMERA_UPLOAD_TOKEN`.

Dla pierwszej i drugiej kamery trzeba użyć różnych tokenów oraz różnych lokalnych
adresów IP. `CAMERA_SENSOR_SET_ID` pozostaje równy `1` w obu szkicach.

W formularzu doświadczenia pole `Camera device ID` oznacza ID rekordu
`CameraDevice` widoczne w panelu admina, a nie numer doniczki. Użytkownik może
przypisać kamerę do dowolnej doniczki wygenerowanej w planie. Kamera wysyła tylko
swój token i numer zestawu; backend rozpoznaje ją po tokenie i łączy zdjęcie z
aktywnym doświadczeniem. Przy wyświetlaniu zdjęcia dla doniczki backend korzysta
z zapisanego przypisania kamera–doniczka.
