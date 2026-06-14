# Dokumentacja projektu Cultiva

Ten katalog zawiera dokumentacje projektu systemu do prowadzenia eksperymentow szklarniowych Cultiva.

## Spis dokumentow

- [01. Opis projektu](01-opis-projektu.md) - cel systemu, problem, zakres funkcjonalny i aktorzy.
- [02. Architektura systemu](02-architektura-systemu.md) - podzial na frontend, backend, baze danych, Arduino i ESP8266.
- [03. Backend i API](03-backend-api.md) - aplikacje Django, modele danych, endpointy i walidacje.
- [04. Frontend](04-frontend.md) - ekrany aplikacji React, routing, komunikacja z API i ograniczenia.
- [05. Arduino i ESP8266](05-arduino-esp8266.md) - czujniki, piny, format danych, sterowanie pompa i przeplyw komunikacji.
- [06. Uruchomienie i konfiguracja](06-uruchomienie-konfiguracja.md) - wymagania, zmienne srodowiskowe, Docker, frontend i dane testowe.
- [07. Testowanie i CI/CD](07-testowanie-cicd.md) - testy backendu, GitHub Actions, strategia pracy z repozytorium.

## Najkrotszy opis systemu

Cultiva to aplikacja webowa wspierajaca prowadzenie eksperymentow roslinnych w szklarni. System zbiera pomiary z czujnikow podlaczonych do Arduino Mega, przekazuje je przez ESP8266 do backendu Django, zapisuje w bazie PostgreSQL i prezentuje uzytkownikowi w panelu React. Aplikacja pozwala tez tworzyc eksperymenty, definiowac liczbe stolow i doniczek, wybierac wariant pakietu odczytow czujnikow, ustawiac czestotliwosci odczytow, eksportowac dane oraz sterowac pompa podlewajaca.

## Glowne technologie

- Frontend: React, Vite, React Router, Recharts.
- Backend: Python, Django, Django REST Framework.
- Baza danych: PostgreSQL.
- Konteneryzacja: Docker, Docker Compose.
- Sprzet: Arduino Mega, ESP8266, czujniki wilgotnosci gleby, BME280, BH1750, DS18B20, przekaznik i pompa.
- CI: GitHub Actions dla testow backendu.
