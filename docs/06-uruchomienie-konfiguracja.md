# 06. Uruchomienie i konfiguracja

## Wymagania lokalne

- Docker Desktop.
- Docker Compose.
- Node.js i npm.
- Arduino IDE do wgrywania szkicow.
- Dostep do plytki Arduino Mega + ESP8266, jesli testowana jest czesc sprzetowa.

## Backend

### Plik `.env`

W katalogu `backend/` powinien znajdowac sie plik:

```text
backend/.env
```

Przykladowa zawartosc:

```env
POSTGRES_DB=greenhouse_db
POSTGRES_USER=greenhouse_user
POSTGRES_PASSWORD=mocne_haslo
POSTGRES_HOST=db
POSTGRES_PORT=5432

DJANGO_SECRET_KEY=dev-secret-key
DEBUG=true
```

### Uruchomienie kontenerow

```bash
cd backend
docker compose up --build
```

Uruchamiane uslugi:

| Usluga | Kontener | Port |
| --- | --- | --- |
| PostgreSQL | `greenhouse_db` | `5432` |
| Django | `greenhouse_web` | `8000` |

### Migracje

W drugim terminalu:

```bash
cd backend
docker compose exec web python manage.py migrate
```

### Superuser

```bash
cd backend
docker compose exec web python manage.py createsuperuser
```

### Panel admina

```text
http://localhost:8000/admin/
```

### API

```text
http://localhost:8000/api/
```

Samo wejscie na `http://localhost:8000/` albo na glowny adres backendu moze zwrocic `404 Not Found`, bo projekt nie definiuje widoku dla `/`. Nalezy sprawdzac konkretne endpointy API, np. `/api/experiments/`.

## Frontend

### Instalacja zaleznosci

```bash
cd frontend
npm install
```

### Plik `.env`

```env
VITE_API_URL=http://localhost:8000/api
```

### Start aplikacji

```bash
cd frontend
npm run dev
```

Domyslny adres:

```text
http://localhost:5173
```

### Build produkcyjny

```bash
cd frontend
npm run build
```

### Podglad buildu

```bash
cd frontend
npm run preview
```

## Dane testowe

Plik:

```text
backend/app/data.json
```

zawiera przykladowe eksperymenty i pomiary.

Wczytanie danych:

```bash
cd backend
docker compose exec web python manage.py loaddata data.json
```

## Reset bazy danych

Reset usuwa wolumen PostgreSQL i wszystkie dane lokalne:

```bash
cd backend
docker compose down -v
docker compose up --build
```

Po resecie trzeba ponownie wykonac migracje.

## Przydatne komendy diagnostyczne

### Status kontenerow

```bash
cd backend
docker compose ps
```

### Logi

```bash
cd backend
docker compose logs -f
```

### Shell Django

```bash
cd backend
docker compose exec web python manage.py shell
```

### Testy backendu

```bash
cd backend
docker compose run --rm web python manage.py test
```

### Sprawdzenie endpointu w przegladarce

```text
http://localhost:8000/api/experiments/
http://localhost:8000/api/measurements/
http://localhost:8000/api/pump-control/latest/
```

## Konfiguracja produkcyjna

W aktualnym kodzie lokalny frontend korzysta z:

```text
VITE_API_URL=http://localhost:8000/api
```

Dla wdrozenia produkcyjnego nalezy ustawic adres produkcyjnego backendu, np.:

```env
VITE_API_URL=https://backend.cultiva-greenhouse.pl/api
```

Po stronie Django trzeba tez dopisac adres produkcyjnego frontendu do CORS, np.:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "https://cultiva-greenhouse.pl",
]
```

Dla produkcji nalezy rowniez ustawic:

- bezpieczny `DJANGO_SECRET_KEY`,
- `DEBUG=false`,
- konkretne `ALLOWED_HOSTS`,
- HTTPS,
- autoryzacje endpointow zapisujacych dane.

## Konfiguracja ESP8266 w sieci lokalnej

ESP8266 musi laczyc sie z adresem IP komputera, na ktorym dziala backend.

Niepoprawnie:

```cpp
const char* MEASUREMENTS_API_URL = "http://localhost:8000/api/measurements/";
```

Poprawnie:

```cpp
const char* MEASUREMENTS_API_URL = "http://xxx.xxx.x.xxx:8000/api/measurements/";
```

Komputer z backendem i ESP8266 musza byc w tej samej sieci Wi-Fi.

