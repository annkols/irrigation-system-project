#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include "FS.h"
#include "SD_MMC.h"
#include "esp_http_server.h"
#include "arduino_secrets.h"

// Piny dla typowego ESP32-CAM / ESP32S z kamerą OV2640, układ AI Thinker
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5

#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

httpd_handle_t camera_httpd = NULL;
httpd_handle_t stream_httpd = NULL;
unsigned long lastUploadAt = 0;
bool sdReady = false;

static const char* STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=frame";
static const char* STREAM_BOUNDARY = "\r\n--frame\r\n";
static const char* STREAM_PART = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

static esp_err_t index_handler(httpd_req_t *req) {
  const char* html =
    "<!doctype html><html><head><meta charset='utf-8'>"
    "<meta name='viewport' content='width=device-width,initial-scale=1'>"
    "<title>ESP32-CAM</title></head>"
    "<body style='font-family:Arial;text-align:center;background:#111;color:white;'>"
    "<h2>ESP32-CAM działa</h2>"
    "<p><a style='color:#8ee' href='/jpg'>Zdjęcie</a></p>"
    "<p><img src='http://%s:81/stream' style='max-width:100%%;height:auto;'></p>"
    "</body></html>";

  char response[700];
  IPAddress ip = WiFi.localIP();
  snprintf(response, sizeof(response), html, ip.toString().c_str());

  httpd_resp_set_type(req, "text/html");
  return httpd_resp_send(req, response, strlen(response));
}

static esp_err_t jpg_handler(httpd_req_t *req) {
  camera_fb_t *fb = esp_camera_fb_get();

  if (!fb) {
    httpd_resp_send_500(req);
    return ESP_FAIL;
  }

  httpd_resp_set_type(req, "image/jpeg");
  httpd_resp_set_hdr(req, "Content-Disposition", "inline; filename=camera.jpg");

  esp_err_t res = httpd_resp_send(req, (const char *)fb->buf, fb->len);
  esp_camera_fb_return(fb);

  return res;
}

static esp_err_t stream_handler(httpd_req_t *req) {
  camera_fb_t *fb = NULL;
  esp_err_t res = ESP_OK;
  char part_buf[64];

  res = httpd_resp_set_type(req, STREAM_CONTENT_TYPE);
  if (res != ESP_OK) return res;

  while (true) {
    fb = esp_camera_fb_get();

    if (!fb) {
      Serial.println("Camera capture failed");
      res = ESP_FAIL;
      break;
    }

    size_t hlen = snprintf(part_buf, sizeof(part_buf), STREAM_PART, fb->len);

    res = httpd_resp_send_chunk(req, STREAM_BOUNDARY, strlen(STREAM_BOUNDARY));
    if (res == ESP_OK) {
      res = httpd_resp_send_chunk(req, part_buf, hlen);
    }
    if (res == ESP_OK) {
      res = httpd_resp_send_chunk(req, (const char *)fb->buf, fb->len);
    }

    esp_camera_fb_return(fb);
    fb = NULL;

    if (res != ESP_OK) {
      break;
    }
  }

  return res;
}

void startCameraServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;

  httpd_uri_t index_uri = {
    .uri = "/",
    .method = HTTP_GET,
    .handler = index_handler,
    .user_ctx = NULL
  };

  httpd_uri_t jpg_uri = {
    .uri = "/jpg",
    .method = HTTP_GET,
    .handler = jpg_handler,
    .user_ctx = NULL
  };

  if (httpd_start(&camera_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(camera_httpd, &index_uri);
    httpd_register_uri_handler(camera_httpd, &jpg_uri);
  }

  httpd_config_t stream_config = HTTPD_DEFAULT_CONFIG();
  stream_config.server_port = 81;
  stream_config.ctrl_port = 32769;

  httpd_uri_t stream_uri = {
    .uri = "/stream",
    .method = HTTP_GET,
    .handler = stream_handler,
    .user_ctx = NULL
  };

  if (httpd_start(&stream_httpd, &stream_config) == ESP_OK) {
    httpd_register_uri_handler(stream_httpd, &stream_uri);
  }
}

void addUploadHeaders(HTTPClient &http) {
  http.addHeader("Content-Type", "image/jpeg");
  http.addHeader("X-Sensor-Set-ID", String(CAMERA_SENSOR_SET_ID));
  http.addHeader("X-Camera-Token", CAMERA_UPLOAD_TOKEN);
}

int sendFrameBuffer(uint8_t *data, size_t length) {
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  if (!http.begin(client, CAMERA_UPLOAD_URL)) {
    Serial.println("Nie udalo sie polaczyc z adresem backendu");
    return -1;
  }

  addUploadHeaders(http);
  int statusCode = http.POST(data, length);

  if (statusCode > 0) {
    Serial.println(http.getString());
  }

  http.end();
  return statusCode;
}

bool saveFrameToSd(const uint8_t *data, size_t length) {
  if (!sdReady) {
    Serial.println("Karta SD jest niedostepna - nie zapisano klatki");
    return false;
  }

  char path[48];
  snprintf(path, sizeof(path), "/pending/frame_%08lx.jpg", (unsigned long)esp_random());
  File file = SD_MMC.open(path, FILE_WRITE);
  if (!file) {
    Serial.println("Nie udalo sie utworzyc pliku na karcie SD");
    return false;
  }

  size_t written = file.write(data, length);
  file.close();

  if (written != length) {
    SD_MMC.remove(path);
    Serial.println("Nie udalo sie zapisac calej klatki na karcie SD");
    return false;
  }

  Serial.print("Zapisano klatke awaryjnie: ");
  Serial.println(path);
  return true;
}

int sendStoredFrame(File &file) {
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  if (!http.begin(client, CAMERA_UPLOAD_URL)) {
    return -1;
  }

  addUploadHeaders(http);
  int statusCode = http.sendRequest("POST", &file, file.size());
  http.end();
  return statusCode;
}

void retryPendingFrames() {
  if (!sdReady || WiFi.status() != WL_CONNECTED) return;

  File directory = SD_MMC.open("/pending");
  if (!directory || !directory.isDirectory()) return;

  int sentCount = 0;
  File file = directory.openNextFile();
  while (file && sentCount < 3) {
    if (!file.isDirectory()) {
      String path = file.path();
      int statusCode = sendStoredFrame(file);
      file.close();

      if (statusCode == HTTP_CODE_CREATED) {
        SD_MMC.remove(path);
        Serial.print("Wyslano zalegla klatke: ");
        Serial.println(path);
        sentCount++;
      } else {
        Serial.print("Nie wyslano zaleglej klatki, status: ");
        Serial.println(statusCode);
        break;
      }
    } else {
      file.close();
    }
    file = directory.openNextFile();
  }

  directory.close();
}

void uploadFrameToBackend() {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Nie udalo sie pobrac klatki do wyslania");
    return;
  }

  int statusCode = -1;
  if (WiFi.status() == WL_CONNECTED) {
    statusCode = sendFrameBuffer(fb->buf, fb->len);
  } else {
    Serial.println("Brak Wi-Fi - zapisuje klatke na karcie SD");
    WiFi.reconnect();
  }

  Serial.print("Wysylanie klatki - status HTTP: ");
  Serial.println(statusCode);

  if (statusCode <= 0 || statusCode >= 500) {
    saveFrameToSd(fb->buf, fb->len);
  }

  esp_camera_fb_return(fb);

  if (statusCode == HTTP_CODE_CREATED) {
    retryPendingFrames();
  }
}

void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(false);
  Serial.println();

  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;

  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;

  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;

  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;

  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;

  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  if (psramFound()) {
    config.frame_size = FRAMESIZE_VGA;
    config.jpeg_quality = 10;
    config.fb_count = 2;
    config.fb_location = CAMERA_FB_IN_PSRAM;
  } else {
    config.frame_size = FRAMESIZE_QVGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
    config.fb_location = CAMERA_FB_IN_DRAM;
  }

  config.grab_mode = CAMERA_GRAB_LATEST;

  esp_err_t err = esp_camera_init(&config);

  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x\n", err);
    Serial.println("Sprawdz tasme kamery albo sproboj innego modelu pinow.");
    return;
  }

  sensor_t *s = esp_camera_sensor_get();

  if (s) {
    s->set_vflip(s, 1);
    s->set_hmirror(s, 1);
  }

  sdReady = SD_MMC.begin("/sdcard", true);
  if (sdReady && SD_MMC.cardType() != CARD_NONE) {
    SD_MMC.mkdir("/pending");
    Serial.print("Karta SD gotowa, pojemnosc MB: ");
    Serial.println(SD_MMC.cardSize() / (1024 * 1024));
  } else {
    sdReady = false;
    Serial.println("Nie wykryto karty SD - kamera bedzie dzialac bez bufora");
  }

  if (!WiFi.config(CAMERA_LOCAL_IP, CAMERA_GATEWAY, CAMERA_SUBNET, CAMERA_PRIMARY_DNS, CAMERA_SECONDARY_DNS)) {
    Serial.println("Nie udalo sie ustawic stalego IP");
  }

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Laczenie z Wi-Fi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("Wi-Fi polaczone");
  Serial.print("Adres strony: http://");
  Serial.println(WiFi.localIP());

  Serial.print("Adres streamu: http://");
  Serial.print(WiFi.localIP());
  Serial.println(":81/stream");

  startCameraServer();
}

void loop() {
  if (lastUploadAt == 0 || millis() - lastUploadAt >= CAMERA_UPLOAD_INTERVAL_MS) {
    lastUploadAt = millis();
    uploadFrameToBackend();
  }

  delay(1000);
}
