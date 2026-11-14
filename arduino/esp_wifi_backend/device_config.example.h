#pragma once

// Liczba lokalnych kanałów zależy od wariantu sprzętowego Mega.
// Skopiuj ten plik jako device_config.h i wpisz identyfikatory skonfigurowane w backendzie.
const int SENSOR_SET_ID = 1;
const byte POT_CHANNEL_COUNT = 3;

// Dla niepodłączonego elementu wpisz pusty tekst "".
const char* SOIL_MOISTURE_IDS[POT_CHANNEL_COUNT] = {"1", "2", "3"};
const char* SOIL_TEMPERATURE_IDS[POT_CHANNEL_COUNT] = {"1", "2", "3"};
const char* PUMP_IDS[POT_CHANNEL_COUNT] = {"", "", ""};
