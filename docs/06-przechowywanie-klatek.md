# Przechowywanie klatek kamery w PlantStalker

## Architektura produkcyjna

W środowisku produkcyjnym obrazy JPEG są zapisywane w trwałym katalogu na dysku serwera:

```text
/srv/plantstalker/media/
```

Docker montuje ten katalog w kontenerze backendu jako `/app/media`. Dzięki temu wymiana, przebudowanie lub ponowne uruchomienie kontenera nie usuwa zdjęć.

Pliki są uporządkowane według daty:

```text
/srv/plantstalker/media/camera_frames/RRRR/MM/DD/nazwa-pliku.jpg
```

PostgreSQL przechowuje wyłącznie rekord `CameraFrame`: powiązanie z eksperymentem, ścieżkę pliku, czas wykonania, autora i opcjonalną notatkę. Właściwy JPEG znajduje się na dysku serwera.

## Przygotowanie serwera

Na serwerze Linux należy jednokrotnie utworzyć katalog:

```bash
sudo mkdir -p /srv/plantstalker/media
sudo chown -R 1000:1000 /srv/plantstalker/media
```

W produkcyjnym pliku `.env` ustaw:

```env
MEDIA_DIR=/srv/plantstalker/media
```

Docker Compose wykorzystuje tę zmienną w montowaniu:

```yaml
- ${MEDIA_DIR:-camera_media}:/app/media
```

Jeżeli `MEDIA_DIR` nie jest ustawione, środowisko lokalne korzysta z nazwanego wolumenu Docker `camera_media`.

## Uruchomienie

Po wdrożeniu zmian wykonaj:

```bash
docker compose build web
docker compose up -d
docker compose exec web python manage.py migrate
```

## Udostępnianie obrazów

W środowisku developerskim pliki `/media/` udostępnia Django. Na finalnym serwerze, gdzie `DEBUG=False`, ścieżkę `/media/` powinien obsługiwać Nginx:

```nginx
location /media/ {
    alias /srv/plantstalker/media/;
    try_files $uri =404;
}
```

Jeżeli klatki mają być dostępne tylko dla zalogowanych użytkowników, nie należy udostępniać całego katalogu publicznie. Wtedy dostęp powinien być realizowany przez chroniony endpoint backendu albo mechanizm `X-Accel-Redirect` Nginx.

## Kopie zapasowe

Backup PlantStalker musi obejmować:

1. bazę PostgreSQL,
2. katalog `/srv/plantstalker/media`.

Przykładowa lokalna kopia katalogu:

```bash
rsync -a /srv/plantstalker/media/ /srv/backups/plantstalker-media/
```

Kopia na tym samym dysku nie chroni przed awarią dysku. Najbezpieczniej okresowo kopiować backup na drugi fizyczny dysk albo inny posiadany komputer.
