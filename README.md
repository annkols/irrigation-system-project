# Backend

Backend aplikacji do zbierania danych z czujników (ESP8266 + Arduino Mega) i zapisywania ich w bazie danych - składa się z projektu Django (config) oraz aplikacji measurements, która odpowiada za odbiór i zapis danych z czujników.

---

## Technologie

* Python + Django
* PostgreSQL
* Docker + Docker Compose
* ESP8266 (wysyła dane przez HTTP)
* Arduino Mega (odczyt czujników)

---

## Wymagania

* Docker Desktop
* Docker Compose

---

## Plik `.env`

Utwórz plik `.env` w folderze `backend/`:

```
POSTGRES_DB=
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_HOST=
POSTGRES_PORT=

DJANGO_SECRET_KEY=
DEBUG=
```

---

## Uruchomienie backendu

### 1. Przejdź do folderu backend

```bash
cd backend
```

---

### 2. Uruchom kontenery

```bash
docker compose up --build
```

---

### 3. Wykonaj migracje

W nowym terminalu:

```bash
docker compose exec web python manage.py migrate
```

---

### 4. Utwórz superusera

```bash
docker compose exec web python manage.py createsuperuser
```

---

### 5. Backend dostępny pod:

* API:

```
http://localhost:8000/api/measurements/
```

* Panel admina:

```
http://localhost:8000/admin/
```

---

## API – wysyłanie danych

Endpoint:

```
POST /api/measurements/
```

### JSON:

```json
{
  "station_number": 1,
  "pot_number": 1,
  "moisture_percent": 64,
  "air_temperature": 22.50,
  "air_humidity": 51.20,
  "pressure_hpa": 1008.40,
  "soil_temperature": 19.80,
  "light_lux": 420.50,
  "pump_on": false
}
```

---

## API - sterowanie pompa

Frontend wysyla komende sterowania pompa do backendu:

```
POST /api/pump-control/
```

Przykladowy JSON:

```json
{
  "command": "ON"
}
```

Dostepne komendy:

* `ON` - wlacza pompe w trybie recznym
* `OFF` - wylacza pompe w trybie recznym
* `AUTO` - wraca do automatycznego sterowania wedlug wilgotnosci gleby

ESP8266 pobiera najnowsza komende z backendu:

```
GET /api/pump-control/latest/
```

Backend zwraca rowniez pole `arduino_command`, ktore ESP wysyla do Arduino Mega:

```json
{
  "command": "ON",
  "arduino_command": "PUMP_ON"
}
```

Komendy rozumiane przez Arduino Mega:

* `PUMP_ON`
* `PUMP_OFF`
* `PUMP_AUTO`

Przeplyw sterowania:

```
frontend -> backend -> ESP8266 -> Serial3 -> Arduino Mega -> przekaznik/pompa
```

---

## Połączenie z ESP8266

W kodzie ESP ustaw:

```cpp
const char* MEASUREMENTS_API_URL = "http://<IP_KOMPUTERA>:8000/api/measurements/";
const char* PUMP_COMMAND_API_URL = "http://<IP_KOMPUTERA>:8000/api/pump-control/latest/";
```

### Jak znaleźć IP:

Windows:

```bash
ipconfig
```

Szukaj:

```
IPv4 Address:
```

---

## WAŻNE

* NIE używaj `localhost` w ESP
* używaj lokalnego IP 
* komputer i ESP muszą być w tej samej sieci Wi-Fi

---

## Reset bazy danych

Jeśli coś się zepsuje:

```bash
docker compose down -v
docker compose up --build
```

---

## Jak działa system

```
CZUJNIK → Arduino Mega → ESP8266 → Wi-Fi → Django → PostgreSQL
```

---

## Debug

### Sprawdzenie logów:

```bash
docker compose logs -f
```



## KOMUNIKACJA CZĘŚCI SPRZĘTOWEJ Z BACKENDEM

czujnik -> Mega -> Serial3 -> ESP -> Wi-Fi -> backend

1. Wgranie kodu na Arduino Mega w trybie uploadu Mega

ustaw DIP:
3 ON
4 ON
reszta OFF
przełącznik na: TXD0 / RXD0

Arduino IDE:
Board: Arduino Mega 2560
kod: all_sensors_final.ino

kliknij: Upload

2. Wgranie kodu na ESP
ustaw DIP:
5 ON
6 ON
7 ON
reszta OFF
mały przełącznik: TXD0 / RXD0

Arduino IDE:
Board: Generic ESP8266 Module
kod: esp_wifi_backend.ino

kliknij: Upload

3. Tryb pracy

ustaw DIP:
1 ON
2 ON
reszta OFF
mały przełącznik: TXD3 / RXD3

Wykonaj RESET na płytce


## WCZYTANIE DANYCH Z CZUJNIKA - JSON

Po uruchomieniu projektu baza danych jest pusta.

Plik data.json zawiera przykładowe odczyty z czujnika.

Aby wczytać przykładowe dane pomiarowe (będąc w folderze backend), wykonaj:

docker compose exec web python manage.py loaddata data.json

# Frontend

Żeby uruchomić frontend, przejdź do folderu frontend i wykonaj:

```npm run dev```

frontend uruchomi się pod adresem ```http://localhost:5173```
