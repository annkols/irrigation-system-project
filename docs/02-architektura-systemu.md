# 02. Architektura systemu

## Widok ogolny

System sklada sie z pieciu glownych warstw:

1. Warstwa sprzetowa: czujniki, pompa, przekaznik, Arduino Mega.
2. Warstwa komunikacji Wi-Fi: ESP8266.
3. Backend: Django REST API.
4. Baza danych: PostgreSQL.
5. Frontend: aplikacja React uruchamiana przez Vite.

```mermaid
flowchart LR
    S["Czujniki i pompa"] --> A["Arduino Mega"]
    A -->|"Serial / JSON"| E["ESP8266"]
    E -->|"HTTP POST / GET"| B["Django REST API"]
    B --> P["PostgreSQL"]
    F["React + Vite"] -->|"HTTP / fetch"| B
    B -->|"JSON"| F
```

## Przeplyw danych pomiarowych

```mermaid
sequenceDiagram
    participant Sensors as Czujniki
    participant Arduino as Arduino Mega
    participant ESP as ESP8266
    participant API as Django API
    participant DB as PostgreSQL
    participant UI as React

    Sensors->>Arduino: odczyt wilgotnosci, temperatury, swiatla, cisnienia
    Arduino->>Arduino: obliczenie wartosci i stanu pompy
    Arduino->>ESP: JSON przez port szeregowy
    ESP->>API: POST /api/measurements/
    API->>DB: zapis Measurement
    UI->>API: GET /api/experiments/
    API->>UI: konfiguracja eksperymentu
    UI->>API: GET /api/measurements/?table_number_max=...&pot_number_max=...&limit=...
    API->>UI: ograniczona lista pomiarow dla zakresu eksperymentu
```

## Model logiczny eksperymentu i pomiarow

Eksperyment okresla zakres doswiadczenia:

```text
table_count = liczba stolow / stanowisk pomiarowych
table_configs = lista stolow i liczba doniczek na kazdym stole
```

Przyklad `table_configs`:

```json
[
  { "table_number": 1, "pot_count": 15 },
  { "table_number": 2, "pot_count": 8 },
  { "table_number": 3, "pot_count": 20 }
]
```

Pomiar z Arduino ma:

```text
table_number = numer stolu
pot_number = numer doniczki na stole
```

Dzieki temu backend i frontend moga pobrac tylko te pomiary, ktore mieszcza sie w zakresie eksperymentu, np. stol `1` z doniczkami `1-15`, stol `2` z doniczkami `1-8` i stol `3` z doniczkami `1-20`.

## Przeplyw sterowania pompa

```mermaid
sequenceDiagram
    participant UI as React
    participant API as Django API
    participant DB as PostgreSQL
    participant ESP as ESP8266
    participant Arduino as Arduino Mega
    participant Pump as Pompa

    UI->>API: POST /api/pump-control/ { command }
    API->>DB: zapis PumpCommand
    ESP->>API: GET /api/pump-control/latest/
    API->>ESP: arduino_command
    ESP->>Arduino: PUMP_ON / PUMP_OFF / PUMP_AUTO
    Arduino->>Pump: sterowanie przekaznikiem
```

## Przeplyw konfiguracji czujnikow

Uzytkownik podczas tworzenia eksperymentu podaje czestotliwosci odczytu dla czujnikow. Backend zapisuje je w polu `sensor_frequencies`. ESP8266 cyklicznie pobiera aktywna konfiguracje endpointem:

```text
GET /api/experiments/active-sensor-config/?sensor_package_variant=1
```

Nastepnie ESP8266 buduje komende tekstowa:

```text
CONFIG:soil_moisture=30;light=60;soil_temperature=120;air_temperature=60;air_humidity=60;pressure=180
```

Arduino odbiera komende przez port szeregowy i aktualizuje interwaly odczytu.

## Podzial katalogow

| Sciezka | Znaczenie |
| --- | --- |
| `backend/` | Backend Django, Dockerfile, docker-compose, requirements. |
| `backend/app/config/` | Konfiguracja projektu Django: settings, glowne URL-e. |
| `backend/app/measurements/` | Model i API pomiarow z czujnikow. |
| `backend/app/experiments/` | Model i API eksperymentow. |
| `backend/app/sensors/` | Model i API definicji czujnikow. |
| `backend/app/users/` | API uzytkownikow i profil uzytkownika. |
| `backend/app/pump_control/` | API komend sterowania pompa. |
| `frontend/` | Aplikacja React + Vite. |
| `frontend/src/pages/` | Ekrany aplikacji. |
| `arduino/` | Szkice Arduino i ESP8266. |
| `.github/workflows/` | Konfiguracja GitHub Actions. |
| `docs/` | Dokumentacja projektu. |

## Technologie

### Backend

- Python 3.12 w obrazie `python:3.12-slim`.
- Django 5
- Django REST Framework.
- django-cors-headers.
- psycopg2-binary do polaczenia z PostgreSQL.
- openpyxl do eksportu plikow Excel.

### Frontend

- React 19.
- Vite 8.
- React Router.
- Recharts.
- CSS w `frontend/src/App.css` i `frontend/src/index.css`.

### Baza danych

- PostgreSQL 16 uruchamiany w Docker Compose.
- Wolumen `postgres_data` przechowuje dane poza cyklem zycia kontenera.

### Sprzet

- Arduino Mega.
- ESP8266.
- BME280.
- BH1750.
- DS18B20.
- Analogowy czujnik wilgotnosci gleby.
- Przekaznik i pompa.

## Porty

| Port | Usluga |
| --- | --- |
| `8000` | Backend Django REST API. |
| `5432` | PostgreSQL. |
| `5173` | Frontend Vite w trybie developerskim. |
| `9600` | Predkosc komunikacji Serial w szkicach Arduino/ESP. |


