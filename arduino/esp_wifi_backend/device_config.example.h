#pragma once

// Przed wgraniem szkicu do ESP8266 wybierz numer fizycznej płytki: 1, 2 albo 3.
// Skopiuj ten plik jako device_config.h. Plik lokalny jest ignorowany przez Git.
#define CONTROLLER_NUMBER 1

// Wszystkie trzy płytki należą do fizycznego zestawu czujników nr 1.
const int SENSOR_SET_ID = 1;

#if CONTROLLER_NUMBER == 1
const char* SOIL_MOISTURE_ID = "1";
const char* SOIL_TEMPERATURE_ID = "1";
const char* PUMP_ID = "1";
#elif CONTROLLER_NUMBER == 2
const char* SOIL_MOISTURE_ID = "2";
const char* SOIL_TEMPERATURE_ID = "2";
const char* PUMP_ID = "2";
#elif CONTROLLER_NUMBER == 3
const char* SOIL_MOISTURE_ID = "3";
const char* SOIL_TEMPERATURE_ID = "3";
const char* PUMP_ID = "3";
#else
#error "CONTROLLER_NUMBER musi miec wartosc 1, 2 albo 3"
#endif
