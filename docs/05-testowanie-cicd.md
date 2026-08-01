# 07. Testowanie i CI

## Testowanie backendu

Backend ma testy oparte o:

- `django.test`,
- `rest_framework.test.APITestCase`.

Testy znajduja sie w:

| Plik | Zakres |
| --- | --- |
| `backend/app/measurements/tests.py` | API pomiarow i eksport. |
| `backend/app/experiments/tests.py` | API eksperymentow, walidacje, konflikty terminow, usuwanie. |
| `backend/app/pump_control/tests.py` | API komend pompy. |
| `backend/app/sensors/tests.py` | Plik istnieje, ale nie zawiera testow. |
| `backend/app/users/tests.py` | Plik istnieje, ale nie zawiera testow. |

## Uruchomienie testow

```bash
cd backend
docker compose run --rm web python manage.py test
```

## Zakres testow jednostkowych i API

### Pomiary

Testy sprawdzaja:

- utworzenie pomiaru z pelnym payloadem czujnikow,
- odrzucenie `moisture_percent > 100`,
- pobranie najnowszego pomiaru,
- odpowiedz `404`, gdy brak pomiarow,
- eksport pomiarow dla eksperymentu z filtrowaniem po zestawie czujnikow i czasie.

### Eksperymenty

Testy sprawdzaja:

- tworzenie eksperymentu,
- tworzenie eksperymentu z `sensor_frequencies`,
- walidacje czestotliwosci,
- aktywna konfiguracje czujnikow dla ESP8266,
- wymagalnosc wilgotnosci gleby w konfiguracji,
- pusta nazwe eksperymentu,
- za dluga nazwe eksperymentu,
- pusta nazwe rosliny,
- niepoprawne daty,
- wymagane daty startu i planowanego konca,
- blokowanie konfliktu terminow dla tego samego zestawu czujnikow,
- dopuszczenie braku konfliktu przy nienachodzacych datach,
- dopuszczenie ponownego uzycia zestawu po zakonczeniu eksperymentu,
- usuwanie eksperymentu,
- pobieranie eksperymentu razem z pomiarami,
- filtrowanie pomiarow wedlug daty startu eksperymentu.

## CI

W projekcie istnieje workflow GitHub Actions:

```text
.github/workflows/backend-tests.yml
```

Nazwa workflow:

```text
Backend tests
```

### Kiedy sie uruchamia

Workflow uruchamia sie przy:

- `push`,
- `pull_request`,

ale tylko gdy zmienia sie:

- `backend/**`,
- `.github/workflows/backend-tests.yml`.

### Co robi workflow

Job `test`:

1. Pobiera repozytorium.
2. Tworzy testowy plik `backend/.env`.
3. Uruchamia baze danych przez Docker Compose.
4. Czeka, az PostgreSQL bedzie gotowy przez `pg_isready`.
5. Uruchamia testy backendu:

```bash
docker compose run --rm web python manage.py test
```

## Strategia repozytorium

Aktualny stan repozytorium wskazuje na prace w jednym repozytorium zawierajacym:

- backend,
- frontend,
- kod Arduino,
- dokumentacje,
- workflow CI.

Rekomendowana strategia pracy:

- `main` jako glowna stabilna galaz,
- osobne galezie robocze dla zadan,
- nazwy galezi zgodne z numerem/nazwa taska,
- pull request przed scaleniem do `main`,
- code review co najmniej jednej osoby,
- testy backendu musza przejsc przed mergem.
