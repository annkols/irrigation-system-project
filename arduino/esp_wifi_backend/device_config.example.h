#pragma once

// Jeden zestaw Mega+ESP obsluguje trzy lokalne kanaly doniczek.
// Skopiuj ten plik jako device_config.h i wpisz identyfikatory skonfigurowane w backendzie.
const int SENSOR_SET_ID = 1;
const byte POT_CHANNEL_COUNT = 3;

const char* SOIL_MOISTURE_IDS[POT_CHANNEL_COUNT] = {"1", "2", "3"};
const char* SOIL_TEMPERATURE_IDS[POT_CHANNEL_COUNT] = {"1", "2", "3"};
