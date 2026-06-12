# 01. Opis projektu

## Cel systemu

Celem projektu Cultiva jest stworzenie systemu wspierajacego prowadzenie eksperymentow roslinnych w warunkach szklarniowych. System automatyzuje odczyt parametrow srodowiskowych, zapisuje dane pomiarowe, prezentuje wyniki w aplikacji webowej oraz umozliwia zdalne lub automatyczne sterowanie podlewaniem.

## Rozpoznany problem

W prowadzeniu doswiadczen szklarniowych problemem jest brak ciaglego monitorowania warunkow eksperymentu oraz brak wygodnego mechanizmu automatycznego zapisu danych. Bez takiego systemu pomiary musza byc zbierane recznie albo polautomatycznie, co utrudnia analize przebiegu doswiadczenia i zwieksza ryzyko utraty danych.

Drugim problemem jest podlewanie roslin. Reczne podlewanie wymaga fizycznej obecnosci w szklarni, a zbyt pozna reakcja na niski poziom wilgotnosci gleby moze zaburzyc wyniki eksperymentu.

## Zakres systemu

System obejmuje:

- zbieranie danych z czujnikow,
- przesylanie danych do backendu przez siec Wi-Fi,
- zapis pomiarow w bazie PostgreSQL,
- tworzenie i edycje eksperymentow,
- przypisywanie eksperymentow do zestawow czujnikow,
- okreslanie dat rozpoczecia i planowanego zakonczenia eksperymentu,
- ustawianie czestotliwosci odczytu osobno dla czujnikow,
- podglad aktualnych odczytow,
- wyswietlanie wykresow,
- eksport danych pomiarowych,
- sterowanie pompa w trybach `ON`, `OFF` i `AUTO`,
- pobieranie przez ESP8266 konfiguracji aktywnego eksperymentu.

## Aktorzy systemu

| Aktor | Rola |
| --- | --- |
| Uzytkownik aplikacji | Tworzy eksperymenty, oglada pomiary, eksportuje dane, steruje pompa. |
| Arduino Mega | Odczytuje czujniki i steruje przekaznikiem pompy. |
| ESP8266 | Laczy czesc sprzetowa z backendem przez Wi-Fi i HTTP. |
| Backend Django | Udostepnia API, waliduje dane, zapisuje informacje w PostgreSQL. |
| Baza PostgreSQL | Przechowuje eksperymenty, pomiary, czujniki, uzytkownikow i komendy pompy. |

## Glowne przypadki uzycia

### Utworzenie eksperymentu

Uzytkownik podaje nazwe, gatunek rosliny, opis, date rozpoczecia, planowana date zakonczenia, zestaw czujnikow i czestotliwosci odczytu. Frontend wysyla dane do backendu. Backend sprawdza walidacje, w tym konflikt terminow dla wybranego zestawu czujnikow.

### Zbieranie pomiarow

Arduino odczytuje wartosci z czujnikow. Dane sa skladane do formatu JSON i wysylane portem szeregowym do ESP8266. ESP8266 przesyla JSON metoda HTTP `POST` do endpointu backendu. Backend zapisuje pomiar w tabeli `Measurement`.

### Sterowanie podlewaniem

Uzytkownik moze wyslac komende pompy z aplikacji webowej. Backend zapisuje ja jako `PumpCommand`. ESP8266 cyklicznie pobiera najnowsza komende i przekazuje ja do Arduino. Arduino wlacza pompe, wylacza pompe albo wraca do trybu automatycznego.

### Eksport danych

Uzytkownik moze pobrac dane pomiarowe dla eksperymentu w formacie CSV albo Excel. Backend filtruje pomiary wedlug zestawu czujnikow i zakresu dat eksperymentu.

## Status funkcjonalnosci

| Obszar | Status |
| --- | --- |
| API pomiarow | Zrealizowane. |
| API eksperymentow | Zrealizowane z walidacja terminow i zestawow czujnikow. |
| Konczenie eksperymentu | Zrealizowane przez ustawienie `finished_at`. |
| Sterowanie pompa | Zrealizowane po stronie backendu, frontendu i Arduino/ESP. |
| Konfiguracja czestotliwosci czujnikow | Zrealizowana przez `sensor_frequencies` i endpoint aktywnej konfiguracji. |
| Uzytkownicy i wspolpracownicy | Modelowo przygotowane, ale bez pelnego logowania i autoryzacji. |
| Tagi eksperymentow | Widoczne w UI jako miejsce na funkcje, ale brak modelu tagow w backendzie. |
