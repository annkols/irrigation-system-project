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
  "device_name": "sensor_1",
  "raw_value": 512,
  "moisture_percent": 65.4
}
```

---

## Test API (np. Postman)

POST:

```
http://localhost:8000/api/measurements/
```

Body:

```json
{
  "device_name": "test",
  "raw_value": 500,
  "moisture_percent": 50
}
```

---

## Połączenie z ESP8266

W kodzie ESP ustaw:

```cpp
const char* serverUrl = "http://<IP_KOMPUTERA>:8000/api/measurements/";
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
kod: wgranie-na-mega.ino

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
kod: wgranie-na-esp.ino

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