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
| `CORS_ALLOWED_ORIGINS` | Lista dozwolonych adresow frontendu pobierana ze zmiennej srodowiskowej. |
| `ALLOWED_HOSTS` | Lista hostow backendu pobierana ze zmiennej srodowiskowej. |

Glowne URL-e sa laczone w `backend/app/config/urls.py` pod prefiksem `/api/`.

## Aplikacja `measurements`

### Model `Measurement`

Model przechowuje pojedynczy odczyt z zestawu czujnikow.

| Pole | Typ | Znaczenie |
| --- | --- | --- |
| `table_number` | integer | Numer stolu / stanowiska pomiarowego, z ktorego przychodzi pomiar. |
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

Model ma indeksy po `table_number`, `pot_number`, `created_at` oraz po samym `created_at`.

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
| `table_number` | Filtr po jednym stole. |
| `table_number_max` | Filtr po zakresie stolow od `1` do podanej wartosci. |
| `pot_number` | Filtr po doniczce. |
| `pot_number_max` | Filtr po zakresie doniczek od `1` do podanej wartosci. |
| `date_from` | Pomiary od wskazanej daty. |
| `date_to` | Pomiary do wskazanej daty. |
| `limit` | Maksymalna liczba zwracanych pomiarow, ograniczana przez backend do `1-1000`. |

Przyklad:

```text
GET /api/measurements/?table_number=1&pot_number=1
```

Przyklad pobrania ograniczonej paczki pomiarow dla eksperymentu z 2 stolami i 10 doniczkami na stole:

```text
GET /api/measurements/?table_number_max=2&pot_number_max=10&limit=300
```

### Dodanie pomiaru

```http
POST /api/measurements/
Content-Type: application/json
```

```json
{
  "table_number": 1,
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

- `table_number` i `pot_number` musza pasowac do `experiment.table_configs`,
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
| `sensor_package_variant` | small int | Wariant pakietu odczytow: 1, 2 albo 3. |
| `table_count` | integer | Liczba stolow / stanowisk pomiarowych w eksperymencie, zakres `1-20`. |
| `table_configs` | JSON | Lista stolow i liczba doniczek na kazdym stole. |
| `pots_per_table` | integer | Pole techniczne utrzymywane jako najwieksza liczba doniczek na stole, dla zgodnosci starszych zapytan. |
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

### Warianty pakietu odczytow

Frontend i backend operuja na trzech wariantach pakietu odczytow:

| ID | Nazwa w UI | Czujniki |
| --- | --- | --- |
| `1` | `BASIC` | wilgotnosc gleby, temperatura powietrza, wilgotnosc powietrza |
| `2` | `EXTENDED` | BASIC + swiatlo |
| `3` | `FULL` | EXTENDED + cisnienie + temperatura gleby |

W kazdym wariancie zakladana jest obecnosc pompy. `sensor_package_variant` okresla tylko wariant pakietu odczytow czujnikow: BASIC, EXTENDED albo FULL. Nie jest to fizyczny zestaw Arduino i nie jest uzywany do blokowania terminow eksperymentow.

### Stoly i doniczki

Eksperyment opisuje zakres fizyczny doswiadczenia przez:

```text
table_count
table_configs
```

Przyklad:

```json
{
  "table_count": 2,
  "table_configs": [
    { "table_number": 1, "pot_count": 15 },
    { "table_number": 2, "pot_count": 8 }
  ]
}
```

Oznacza to, ze eksperyment obejmuje dwa stoly: na stole `1` jest 15 doniczek, a na stole `2` jest 8 doniczek. Pomiary z Arduino musza miec `table_number` i `pot_number`, zeby backend mogl dopasowac je do zakresu eksperymentu.

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
- `sensor_package_variant` musi byc wieksze od 0,
- `table_count` musi byc liczba calkowita w zakresie `1-20`,
- `table_configs` musi zawierac od 1 do 20 stolow,
- `pot_count` dla kazdego stolu musi byc liczba calkowita w zakresie `1-40`,
- `measurement_frequency_seconds` musi byc wieksze od 0,
- `started_at` jest wymagane,
- `planned_end_at` jest wymagane,
- `finished_at` nie moze byc wczesniejsze niz `started_at`,
- `planned_end_at` nie moze byc wczesniejsze niz `started_at`,
- jezeli w bazie sa zarejestrowane fizyczne urzadzenia `SensorDevice`, backend musi znalezc wystarczajaca liczbe wolnych urzadzen dla zakresu stolow i doniczek eksperymentu.

### Przydzial fizycznych urzadzen

Fizyczne plytki Arduino / zestawy czujnikow sa reprezentowane przez model `SensorDevice`. Przy tworzeniu eksperymentu backend oblicza zapotrzebowanie:

```text
suma pot_count ze wszystkich elementow table_configs
```

Nastepnie szuka wolnych aktywnych urzadzen, ktore nie maja nachodzacego przypisania w terminie eksperymentu. Jesli urzadzenia sa skonfigurowane w bazie i nie ma wystarczajacej liczby wolnych urzadzen, backend odrzuca utworzenie eksperymentu.

Przydzial jest zapisywany w modelu `SensorDeviceAssignment`:

```text
experiment
device
table_number
pot_number
assigned_from
assigned_to
```

Jezeli w bazie nie ma jeszcze zadnych rekordow `SensorDevice`, aplikacja nie blokuje tworzenia eksperymentow i dziala w trybie bez automatycznego przydzialu urzadzen.

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
  "sensor_package_variant": 1,
  "table_count": 2,
  "table_configs": [
    { "table_number": 1, "pot_count": 15 },
    { "table_number": 2, "pot_count": 8 }
  ],
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

- `sensor_package_variant`,
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
GET /api/experiments/active-sensor-config/?sensor_package_variant=1
```

Przykladowa odpowiedz:

```json
{
  "experiment_id": 1,
  "sensor_package_variant": 1,
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

Model opisuje typy czujnikow i ich przynaleznosc do wariantow pakietu odczytow.

| Pole | Znaczenie |
| --- | --- |
| `code` | Unikalny kod czujnika uzywany do identyfikacji. |
| `name` | Nazwa czujnika. |
| `sensor_package_variant` | Numer wariantu pakietu odczytow. |
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

### Model `SensorDevice`

Model opisuje fizyczna plytke Arduino / fizyczny zestaw czujnikow, ktory mozna przydzielic do doniczki.

| Pole | Znaczenie |
| --- | --- |
| `code` | Unikalny kod urzadzenia, np. `DEVICE-001`. |
| `name` | Opcjonalna nazwa opisowa. |
| `max_sensor_package_variant` | Najwyzszy wariant pakietu odczytow obslugiwany przez urzadzenie. |
| `is_active` | Czy urzadzenie moze byc przydzielane. |
| `notes` | Notatki techniczne. |
| `created_at`, `updated_at` | Daty techniczne. |

### Model `SensorDeviceAssignment`

Model zapisuje przydzial fizycznego urzadzenia do konkretnej doniczki w eksperymencie.

| Pole | Znaczenie |
| --- | --- |
| `experiment` | Eksperyment, do ktorego przydzielono urzadzenie. |
| `device` | Fizyczne urzadzenie `SensorDevice`. |
| `table_number` | Numer stolu. |
| `pot_number` | Numer doniczki na stole. |
| `assigned_from` | Poczatek rezerwacji urzadzenia. |
| `assigned_to` | Koniec rezerwacji urzadzenia. |

Endpointy urzadzen:

| Metoda | Endpoint | Opis |
| --- | --- | --- |
| `GET` | `/api/sensor-devices/` | Lista fizycznych urzadzen. |
| `POST` | `/api/sensor-devices/` | Dodanie fizycznego urzadzenia. |
| `GET` | `/api/sensor-devices/<id>/` | Szczegoly urzadzenia. |
| `PUT/PATCH` | `/api/sensor-devices/<id>/` | Edycja urzadzenia. |
| `DELETE` | `/api/sensor-devices/<id>/` | Usuniecie urzadzenia. |
| `GET` | `/api/sensor-device-assignments/` | Lista przydzialow urzadzen do eksperymentow. |

## Aplikacja `users`

Backend korzysta z domyslnego modelu uzytkownika Django oraz modelu `UserProfile`.

Endpointy:

| Metoda | Endpoint | Opis |
| --- | --- | --- |
| `GET` | `/api/users/` | Lista uzytkownikow. |
| `GET` | `/api/users/<id>/` | Szczegoly uzytkownika. |

Profil uzytkownika zawiera pole `department`, czyli jednostke organizacyjna lub naukowa uzytkownika.

## Uprawnienia i autoryzacja

W aktualnym stanie widoki API maja:

```python
permission_classes = [AllowAny]
authentication_classes = []
```

Oznacza to, ze API jest otwarte i nie wymaga logowania. Dla wersji produkcyjnej nalezy dodac autoryzacje, ograniczenia uprawnien i ochrone endpointow zapisujacych dane.


