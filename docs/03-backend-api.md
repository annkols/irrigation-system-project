# 03. Backend i API

## Lokalizacja

Backend znajduje sie w katalogu:

```text
backend/app/
```

Glowny projekt Django:

```text
backend/app/config/
```

Aplikacje domenowe:

- `measurements`
- `experiments`
- `sensors`
- `users`
- `pump_control`

## Konfiguracja Django

Najwazniejsze ustawienia sa w `backend/app/config/settings.py`.

| Ustawienie | Znaczenie |
| --- | --- |
| `INSTALLED_APPS` | Rejestruje aplikacje Django, DRF i CORS. |
| `DATABASES` | Laczy backend z PostgreSQL przez zmienne srodowiskowe. |
| `TIME_ZONE` | `Europe/Warsaw`. |
| `USE_TZ` | `True`, daty sa przechowywane jako timezone-aware. |
| `CORS_ALLOWED_ORIGINS` | Lokalnie dopuszcza `http://localhost:5173`. |
| `ALLOWED_HOSTS` | Obecnie `["*"]`. |

Glowne URL-e sa laczone w `backend/app/config/urls.py` pod prefiksem `/api/`.

## Aplikacja `measurements`

### Model `Measurement`

Model przechowuje pojedynczy odczyt z zestawu czujnikow.

| Pole | Typ | Znaczenie |
| --- | --- | --- |
| `station_number` | integer | Numer stanowiska. W praktyce odpowiada `sensor_set_id` eksperymentu. |
| `pot_number` | integer | Numer doniczki. |
| `raw_value` | integer/null | Surowy odczyt analogowy, obecnie nie jest wystawiany w serializerze. |
| `moisture_percent` | float/null | Wilgotnosc gleby w procentach. |
| `air_temperature` | float/null | Temperatura powietrza. |
| `air_humidity` | float/null | Wilgotnosc powietrza. |
| `pressure_hpa` | float/null | Cisnienie w hPa. |
| `soil_temperature` | float/null | Temperatura gleby. |
| `light_lux` | float/null | Natezenie swiatla w luksach. |
| `pump_on` | boolean | Informacja, czy pompa byla wlaczona przy pomiarze. |
| `created_at` | datetime | Data utworzenia rekordu. |

Model ma indeksy po `station_number`, `pot_number`, `created_at` oraz po samym `created_at`.

### Walidacje pomiarow

Serializer sprawdza:

- `moisture_percent` musi byc w zakresie `0-100`,
- `air_humidity` musi byc w zakresie `0-100`,
- `light_lux` nie moze byc ujemne,
- `pressure_hpa` musi byc dodatnie.

### Endpointy pomiarow

| Metoda | Endpoint | Opis |
| --- | --- | --- |
| `GET` | `/api/measurements/` | Lista pomiarow. |
| `POST` | `/api/measurements/` | Dodanie pomiaru z ESP8266. |
| `GET` | `/api/measurements/latest/` | Najnowszy pomiar, opcjonalnie filtrowany. |
| `GET` | `/api/measurements/<id>/` | Szczegoly pomiaru. |
| `PUT/PATCH` | `/api/measurements/<id>/` | Aktualizacja pomiaru. |
| `DELETE` | `/api/measurements/<id>/` | Usuniecie pomiaru. |
| `GET` | `/api/experiments/<experiment_id>/export-csv/` | Eksport pomiarow dla eksperymentu. |

### Filtrowanie pomiarow

Endpoint `/api/measurements/` obsluguje parametry:

| Parametr | Znaczenie |
| --- | --- |
| `station_number` | Filtr po zestawie/stacji. |
| `pot_number` | Filtr po doniczce. |
| `date_from` | Pomiary od wskazanej daty. |
| `date_to` | Pomiary do wskazanej daty. |

Przyklad:

```text
GET /api/measurements/?station_number=1&pot_number=1
```

### Dodanie pomiaru

```http
POST /api/measurements/
Content-Type: application/json
```

```json
{
  "station_number": 1,
  "pot_number": 1,
  "moisture_percent": 64,
  "air_temperature": 22.5,
  "air_humidity": 51.2,
  "pressure_hpa": 1008.4,
  "soil_temperature": 19.8,
  "light_lux": 420.5,
  "pump_on": false
}
```

### Eksport danych

Endpoint:

```text
GET /api/experiments/<experiment_id>/export-csv/
```

Parametry:

| Parametr | Wartosci | Znaczenie |
| --- | --- | --- |
| `export_format` | `csv`, `excel` | Format eksportu. Domyslnie `csv`. |
| `columns` | lista kluczy po przecinku | Wybor kolumn do eksportu. |

Przyklad:

```text
GET /api/experiments/1/export-csv/?export_format=excel&columns=moisture_percent,air_temperature,pump_on
```

Eksport filtruje pomiary wedlug:

- `station_number = experiment.sensor_set_id`,
- `created_at >= experiment.started_at`, jesli eksperyment ma date startu,
- `created_at <= experiment.planned_end_at`, jesli eksperyment ma planowana date zakonczenia.

## Aplikacja `experiments`

### Model `Experiment`

| Pole | Typ | Znaczenie |
| --- | --- | --- |
| `name` | char | Nazwa eksperymentu, maks. 100 znakow. |
| `description` | text | Opis eksperymentu. |
| `plant_name` | char | Nazwa/typ rosliny, maks. 100 znakow. |
| `owner` | FK User/null | Wlasciciel eksperymentu. |
| `collaborators` | M2M User | Wspolpracownicy. |
| `sensor_set_id` | small int | Zestaw czujnikow: 1, 2 albo 3. |
| `started_at` | datetime/null | Data rozpoczecia. |
| `planned_end_at` | datetime/null | Planowana data zakonczenia. |
| `finished_at` | datetime/null | Rzeczywista data zakonczenia. |
| `created_at` | datetime | Data utworzenia. |
| `measurement_frequency_seconds` | integer | Domyslna czestotliwosc pomiaru. |
| `sensor_frequencies` | JSON | Czestotliwosci pomiaru per czujnik. |
| `is_public` | boolean | Czy eksperyment jest publiczny. |

### Status eksperymentu

Status jest liczony jako property:

| Warunek | Status |
| --- | --- |
| `finished_at` nie jest puste | `completed` |
| `started_at` istnieje i jest w przeszlosci | `in progress` |
| pozostale przypadki | `not started` |

Wazne: samo przekroczenie `planned_end_at` nie ustawia automatycznie `completed`. Eksperyment konczy sie dopiero przez ustawienie `finished_at`.

### Zestawy czujnikow

Frontend i backend operuja na trzech zestawach:

| ID | Nazwa w UI | Czujniki |
| --- | --- | --- |
| `1` | `BASIC` | wilgotnosc gleby, temperatura powietrza, wilgotnosc powietrza |
| `2` | `EXTENDED` | BASIC + swiatlo |
| `3` | `FULL` | EXTENDED + cisnienie + temperatura gleby |

W kazdym zestawie zakladana jest obecnosc pompy.

### Klucze czestotliwosci czujnikow

Dozwolone klucze pola `sensor_frequencies`:

```text
soil_moisture
light
soil_temperature
air_temperature
air_humidity
pressure
```

Wartosci musza byc liczbami calkowitymi wiekszymi od 0.

### Walidacje eksperymentow

Backend sprawdza:

- wlasciciel nie moze byc jednoczesnie wspolpracownikiem,
- nazwa eksperymentu nie moze byc pusta,
- nazwa rosliny nie moze byc pusta,
- `sensor_set_id` musi byc wieksze od 0,
- `measurement_frequency_seconds` musi byc wieksze od 0,
- `started_at` jest wymagane,
- `planned_end_at` jest wymagane,
- `finished_at` nie moze byc wczesniejsze niz `started_at`,
- `planned_end_at` nie moze byc wczesniejsze niz `started_at`,
- aktywne/niedokonczone eksperymenty nie moga nachodzic terminami na ten sam `sensor_set_id`.

### Walidacja konfliktu terminow

Konflikt jest sprawdzany dla eksperymentow:

```text
sensor_set_id = wybrany zestaw
finished_at IS NULL
```

Podczas edycji aktualnie edytowany eksperyment jest wykluczany z porownania.

Eksperyment z ustawionym `finished_at` nie blokuje ponownego uzycia zestawu czujnikow, nawet jesli jego daty nachodza na nowy termin.

### Endpointy eksperymentow

| Metoda | Endpoint | Opis |
| --- | --- | --- |
| `GET` | `/api/experiments/` | Lista eksperymentow. |
| `POST` | `/api/experiments/` | Utworzenie eksperymentu. |
| `GET` | `/api/experiments/<id>/` | Szczegoly eksperymentu. |
| `PATCH/PUT` | `/api/experiments/<id>/edit/` | Edycja eksperymentu. |
| `DELETE` | `/api/experiments/<id>/delete/` | Usuniecie eksperymentu. |
| `POST` | `/api/experiments/<id>/end/` | Zakonczenie eksperymentu. |
| `GET` | `/api/experiments/status/<status>/` | Lista wedlug statusu. |
| `GET` | `/api/experiments/with-measurements/` | Lista eksperymentow z pomiarami. |
| `GET` | `/api/experiments/<id>/with-measurements/` | Szczegoly eksperymentu z pomiarami. |
| `GET` | `/api/experiments/active-sensor-config/` | Aktywna konfiguracja czujnikow dla ESP8266. |

### Utworzenie eksperymentu

```http
POST /api/experiments/
Content-Type: application/json
```

```json
{
  "name": "Soy basic irrigation test",
  "description": "Test podlewania soi.",
  "plant_name": "Soy",
  "sensor_set_id": 1,
  "measurement_frequency_seconds": 60,
  "sensor_frequencies": {
    "soil_moisture": 60,
    "air_temperature": 120,
    "air_humidity": 120
  },
  "started_at": "2026-06-01T08:00:00+02:00",
  "planned_end_at": "2026-06-10T08:00:00+02:00",
  "finished_at": null,
  "owner": null,
  "collaborators": []
}
```

### Edycja eksperymentu

Endpoint edycji uzywa `ExperimentUpdateSerializer`. Nie pozwala zmieniac:

- `sensor_set_id`,
- `owner`,
- `created_at`,
- `finished_at`.

Przyklad:

```http
PATCH /api/experiments/1/edit/
Content-Type: application/json
```

```json
{
  "name": "Nowa nazwa",
  "description": "Zaktualizowany opis",
  "plant_name": "Soy",
  "started_at": "2026-06-01",
  "planned_end_at": "2026-06-20",
  "sensor_frequencies": {
    "soil_moisture": 30,
    "air_temperature": 60,
    "air_humidity": 60
  },
  "measurement_frequency_seconds": 30,
  "is_public": true
}
```

### Usuniecie eksperymentu

```http
DELETE /api/experiments/1/delete/
```

Poprawna odpowiedz:

```text
204 No Content
```

Backend nic nie zwraca w body odpowiedzi, dlatego frontend nie powinien parsowac tej odpowiedzi jako JSON.

### Zakonczenie eksperymentu

```http
POST /api/experiments/1/end/
```

Backend ustawia `finished_at` na aktualny czas serwera.

### Aktywna konfiguracja czujnikow

```text
GET /api/experiments/active-sensor-config/?sensor_set_id=1
```

Przykladowa odpowiedz:

```json
{
  "experiment_id": 1,
  "sensor_set_id": 1,
  "sensor_frequencies": {
    "soil_moisture": 30,
    "light": 0,
    "soil_temperature": 0,
    "air_temperature": 60,
    "air_humidity": 60,
    "pressure": 0
  }
}
```

Jesli nie ma aktywnego eksperymentu:

```text
404 Not Found
```

## Aplikacja `pump_control`

### Model `PumpCommand`

| Pole | Typ | Znaczenie |
| --- | --- | --- |
| `command` | choice | `ON`, `OFF` albo `AUTO`. |
| `created_at` | datetime | Data utworzenia komendy. |

Domyslne sortowanie: od najnowszej komendy.

### Endpointy pompy

| Metoda | Endpoint | Opis |
| --- | --- | --- |
| `GET` | `/api/pump-control/` | Lista komend. |
| `POST` | `/api/pump-control/` | Dodanie komendy. |
| `GET` | `/api/pump-control/latest/` | Najnowsza komenda dla ESP8266. |

Przyklad:

```http
POST /api/pump-control/
Content-Type: application/json
```

```json
{
  "command": "ON"
}
```

Odpowiedz:

```json
{
  "id": 1,
  "command": "ON",
  "arduino_command": "PUMP_ON",
  "created_at": "2026-06-01T10:00:00+02:00"
}
```

Mapowanie komend:

| Komenda z UI | Komenda dla Arduino |
| --- | --- |
| `ON` | `PUMP_ON` |
| `OFF` | `PUMP_OFF` |
| `AUTO` | `PUMP_AUTO` |

## Aplikacja `sensors`

### Model `Sensor`

Model opisuje czujniki i ich przynaleznosc do zestawow.

| Pole | Znaczenie |
| --- | --- |
| `code` | Unikalny kod czujnika uzywany do identyfikacji. |
| `name` | Nazwa czujnika. |
| `sensor_set_id` | Numer zestawu czujnikow. |
| `sensor_type` | Typ czujnika. |
| `unit` | Jednostka pomiaru. |
| `is_active` | Czy czujnik jest aktywny. |
| `created_at`, `updated_at` | Daty techniczne. |

Endpointy:

| Metoda | Endpoint | Opis |
| --- | --- | --- |
| `GET` | `/api/sensors/` | Lista czujnikow. |
| `POST` | `/api/sensors/` | Dodanie czujnika. |
| `GET` | `/api/sensors/<id>/` | Szczegoly czujnika. |
| `PUT/PATCH` | `/api/sensors/<id>/` | Edycja czujnika. |
| `DELETE` | `/api/sensors/<id>/` | Usuniecie czujnika. |

## Aplikacja `users`

Backend korzysta z domyslnego modelu uzytkownika Django oraz modelu `UserProfile`.

Endpointy:

| Metoda | Endpoint | Opis |
| --- | --- | --- |
| `GET` | `/api/users/` | Lista uzytkownikow. |
| `GET` | `/api/users/<id>/` | Szczegoly uzytkownika. |

Uwaga techniczna: model `UserProfile` ma pole `department`, natomiast serializer profilu wskazuje pole `scientific_unit`. To jest niespojnosc, ktora nalezy poprawic przed pelnym wykorzystaniem profili uzytkownikow.

## Uprawnienia i autoryzacja

W aktualnym stanie widoki API maja:

```python
permission_classes = [AllowAny]
authentication_classes = []
```

Oznacza to, ze API jest otwarte i nie wymaga logowania. Dla wersji produkcyjnej nalezy dodac autoryzacje, ograniczenia uprawnien i ochrone endpointow zapisujacych dane.

