#pragma once

// Ustaw numer zestawu zgodny z doświadczeniem w aplikacji.
const int SENSOR_SET_ID = 2;
const byte POT_CHANNEL_COUNT = 2;

// Identyfikatory wpisane przy doniczkach w konfiguracji doświadczenia.
const char* SOIL_MOISTURE_IDS[POT_CHANNEL_COUNT] = {"1", "2"};
const char* SOIL_TEMPERATURE_IDS[POT_CHANNEL_COUNT] = {"1", "2"};
const char* PUMP_IDS[POT_CHANNEL_COUNT] = {"", ""};
