# 04. Frontend

## Lokalizacja

Frontend znajduje sie w katalogu:

```text
frontend/
```

Najwazniejsze pliki:

| Plik | Znaczenie |
| --- | --- |
| `frontend/src/App.jsx` | Routing aplikacji. |
| `frontend/src/pages/Start.jsx` | Strona startowa. |
| `frontend/src/pages/Dashboard.jsx` | Glowny panel aplikacji. |
| `frontend/src/pages/New_experiment.jsx` | Formularz tworzenia eksperymentu. |
| `frontend/src/pages/Experiment_details.jsx` | Szczegoly eksperymentu, pomiary, eksport, pompa. |
| `frontend/src/pages/Experiment_edit.jsx` | Edycja eksperymentu. |
| `frontend/src/pages/ExperimentChart.jsx` | Wykresy pomiarow. |
| `frontend/src/App.css` | Glowne style. |
| `frontend/.env` | Adres API. |

## Technologie

- React.
- Vite.
- React Router DOM.
- Recharts.
- Fetch API do komunikacji z backendem.

## Konfiguracja API

Frontend pobiera adres backendu ze zmiennej:

```text
VITE_API_URL=http://localhost:8000/api
```

W kodzie jest uzywane:

```js
const API_BASE_URL = import.meta.env.VITE_API_URL;
```

Dzieki temu wiekszosc zapytan jest budowana jako:

```js
fetch(`${API_BASE_URL}/experiments/`)
```

## Routing

Routing jest zdefiniowany w `frontend/src/App.jsx`.

| Sciezka | Komponent | Opis |
| --- | --- | --- |
| `/` | `Start` | Ekran startowy z przyciskami Sign in / Sign up. |
| `/dashboard` | `Dashboard` | Panel eksperymentow i najnowszych pomiarow. |
| `/new-experiment` | `New_experiment` | Formularz dodania eksperymentu. |
| `/experiment/:id` | `Experiment_details` | Szczegoly konkretnego eksperymentu. |
| `/experiment/:id/edit` | `Experiment_edit` | Edycja konkretnego eksperymentu. |

## Ekran startowy

Komponent `Start.jsx` prezentuje:

- logo Cultiva,
- tytul systemu,
- przycisk `Sign in`, ktory prowadzi do dashboardu,
- przycisk `Sign up`, aktualnie bez logiki rejestracji,
- sekcje `About us`.

Autoryzacja nie jest obecnie wdrozona, dlatego wejscie do dashboardu nie wymaga logowania.

## Dashboard

Komponent `Dashboard.jsx`:

- cyklicznie pobiera pomiary z `/api/measurements/`,
- cyklicznie pobiera eksperymenty z `/api/experiments/`,
- odswieza dane co 10 sekund,
- pokazuje liste eksperymentow,
- pozwala filtrowac eksperymenty po statusie,
- pokazuje najnowsze odczyty dla wybranego eksperymentu,
- pozwala wyslac komende pompy `ON`, `OFF` albo `AUTO`,
- pozwala przejsc do tworzenia nowego eksperymentu,
- pozwala przejsc do szczegolow eksperymentu.

### Statusy w dashboardzie

Frontend mapuje statusy na etykiety:

| Status z backendu | Etykieta w UI |
| --- | --- |
| `in progress` / `in-progress` | `IN PROGRESS` |
| `not started` | `NOT STARTED` |
| `completed` | `COMPLETED` |
| `soon` | `SOON ENDING` |

### Widoczne czujniki wedlug zestawu

Dashboard pokazuje rozne wiersze pomiarow w zaleznosci od `sensor_set_id`.

| Zestaw | Czujniki |
| --- | --- |
| `1` | wilgotnosc gleby, temperatura powietrza, wilgotnosc powietrza |
| `2` | zestaw 1 + swiatlo |
| `3` | zestaw 2 + cisnienie + temperatura gleby |

## Tworzenie eksperymentu

Komponent `New_experiment.jsx` wyswietla formularz:

- nazwa eksperymentu,
- typ rosliny,
- opis,
- daty,
- wybor zestawu czujnikow,
- czestotliwosc odczytu dla kazdego czujnika,
- checkbox publicznosci eksperymentu widoczny w UI.

### Walidacja lokalna

Frontend przed wyslaniem sprawdza:

- nazwa jest wymagana,
- nazwa ma maksymalnie 100 znakow,
- typ rosliny jest wymagany,
- opis ma maksymalnie 2000 znakow,
- zestaw czujnikow musi byc wybrany,
- czestotliwosci musza byc liczbami calkowitymi z zakresu `1-300`,
- data rozpoczecia jest wymagana,
- data planowanego zakonczenia jest wymagana,
- data konca nie moze byc wczesniejsza niz data startu.

### Dane wysylane do backendu

Frontend wysyla:

```json
{
  "name": "Nazwa",
  "description": "Opis",
  "plant_name": "Soy",
  "sensor_set_id": 1,
  "measurement_frequency_seconds": 30,
  "sensor_frequencies": {
    "soil_moisture": 30,
    "air_temperature": 60,
    "air_humidity": 60
  },
  "started_at": "2026-06-01",
  "planned_end_at": "2026-06-10",
  "finished_at": null,
  "owner": null,
  "collaborators": []
}
```

Endpoint:

```text
POST /api/experiments/
```

## Edycja eksperymentu

Komponent `Experiment_edit.jsx`:

- pobiera dane eksperymentu z `/api/experiments/:id/`,
- uzupelnia formularz,
- pozwala zmienic nazwe, typ rosliny, opis, daty, czestotliwosci i publicznosc,
- nie pozwala zmienic zestawu czujnikow,
- zapisuje zmiany przez `PATCH /api/experiments/:id/edit/`.

Wazne: backend dodatkowo blokuje zmiane `sensor_set_id`, `owner`, `created_at` i `finished_at`.

## Szczegoly eksperymentu

Komponent `Experiment_details.jsx`:

- pobiera szczegoly eksperymentu,
- pobiera pomiary,
- odswieza pomiary co 10 sekund,
- pokazuje status i pasek postepu,
- pokazuje daty eksperymentu,
- pozwala zakonczyc eksperyment przez `POST /api/experiments/:id/end/`,
- pozwala sterowac pompa,
- pozwala eksportowac dane,
- wyswietla wykres.

## Eksport danych

W szczegolach eksperymentu dostepny jest eksport:

- CSV,
- Excel.

Uzytkownik moze wybrac kolumny pomiarowe:

- `moisture_percent`,
- `air_temperature`,
- `air_humidity`,
- `soil_temperature`,
- `pressure_hpa`,
- `light_lux`,
- `pump_on`.

Frontend otwiera adres eksportu w nowej karcie:

```text
/api/experiments/<id>/export-csv/?export_format=<format>&columns=<kolumny>
```

## Wykresy

Komponent `ExperimentChart.jsx` uzywa biblioteki Recharts. Pozwala wybrac dwa sygnaly:

- lewa os,
- prawa os.

Obecnie komponent importuje dane z lokalnego pliku:

```js
import measurements from "./measurements.json";
```

To oznacza, ze wykres nie korzysta jeszcze bezposrednio z danych z backendu. Jest to wazne ograniczenie aktualnej implementacji.

## Komunikacja z pompa

Dashboard i ekran szczegolow wysylaja komende:

```http
POST /api/pump-control/
```

Przyklad:

```json
{
  "command": "AUTO"
}
```

Po stronie backendu komenda jest zapisywana, a ESP8266 pobiera najnowsza komende osobnym endpointem.
