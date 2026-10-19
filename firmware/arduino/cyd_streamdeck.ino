/**
 * ============================================================================
 * CYD-Deck Studio — Version Arduino IDE (.ino)
 * ============================================================================
 * 
 * INSTRUCTIONS POUR ARDUINO IDE :
 * 1. Installez les bibliothèques suivantes via le Gestionnaire de Bibliothèques :
 *    - TFT_eSPI (par Bodmer)
 *    - XPT2046_Touchscreen (par Paul Stoffregen)
 *    - ArduinoJson (par Benoît Blanchon)
 * 2. Dans votre dossier Documents/Arduino/libraries/TFT_eSPI/User_Setup.h :
 *    Remplacez le contenu par le fichier "User_Setup.h" fourni dans le dossier firmware/ !
 * 3. Sélectionnez la carte "ESP32 Dev Module" et le port COM de votre CYD.
 * 4. Cliquez sur Téléverser !
 */

#include <Arduino.h>
#include <SPI.h>
#include <TFT_eSPI.h>
#include <XPT2046_Touchscreen.h>
#include <ArduinoJson.h>

// Option Wi-Fi sans fil (décommentez pour activer) :
// #define ENABLE_WIFI
#ifdef ENABLE_WIFI
  #include <WiFi.h>
  #include <WebSocketsClient.h>
  const char* WIFI_SSID     = "VOTRE_BOX_WIFI";
  const char* WIFI_PASSWORD = "MOT_DE_PASSE";
  const char* WS_HOST       = "192.168.10.136"; // IP affichée dans CYD-Deck Studio
  const int   WS_PORT       = 8765;
  WebSocketsClient webSocket;
#endif

#define XPT2046_IRQ   36
#define XPT2046_MOSI  32
#define XPT2046_MISO  39
#define XPT2046_CLK   25
#define XPT2046_CS    33

#define LCD_BACKLIGHT 21
#define RGB_LED_RED   4
#define RGB_LED_GREEN 16
#define RGB_LED_BLUE  17
#define BUZZER_PIN    26

#define SCREEN_WIDTH  320
#define SCREEN_HEIGHT 240
#define NUM_BUTTONS   6

#define TOUCH_MIN_X 300
#define TOUCH_MAX_X 3800
#define TOUCH_MIN_Y 250
#define TOUCH_MAX_Y 3750

TFT_eSPI tft = TFT_eSPI();
SPIClass touchSPI = SPIClass(VSPI);
XPT2046_Touchscreen touch(XPT2046_CS, XPT2046_IRQ);

struct DeckButton {
  int id;
  String label;
  String sub;
  String icon;
  uint16_t color;
  uint16_t textColor;
  int x, y, w, h;
};

DeckButton buttons[NUM_BUTTONS];
String currentPageName = "🔴 Studio";
int currentCpuUsage = 0;
int currentRamUsage = 0;
bool isConnectedToPC = false;
unsigned long lastTouchTime = 0;

uint16_t hexToRGB565(const String& hex) {
  String clean = hex;
  if (clean.startsWith("#")) clean = clean.substring(1);
  long num = strtol(clean.c_str(), NULL, 16);
  return tft.color565((num >> 16) & 0xFF, (num >> 8) & 0xFF, num & 0xFF);
}

void drawStatusBar() {
  tft.fillRect(0, 0, SCREEN_WIDTH, 22, tft.color565(11, 15, 26));
  tft.drawFastHLine(0, 22, SCREEN_WIDTH, tft.color565(30, 41, 59));
  tft.fillCircle(10, 11, 4, isConnectedToPC ? TFT_GREEN : TFT_RED);
  tft.setTextColor(TFT_WHITE, tft.color565(11, 15, 26));
  tft.setTextSize(1);
  tft.drawString("CYD-DECK | " + currentPageName, 22, 7);

  if (isConnectedToPC) {
    String statsStr = "CPU:" + String(currentCpuUsage) + "% RAM:" + String(currentRamUsage) + "%";
    tft.setTextColor(tft.color565(96, 165, 250), tft.color565(11, 15, 26));
    tft.drawRightString(statsStr, SCREEN_WIDTH - 8, 7, 1);
  } else {
    tft.setTextColor(TFT_DARKGREY, tft.color565(11, 15, 26));
    tft.drawRightString("EN ATTENTE USB", SCREEN_WIDTH - 8, 7, 1);
  }
}

void drawButton(int idx, bool pressed = false) {
  if (idx < 0 || idx >= NUM_BUTTONS) return;
  DeckButton& b = buttons[idx];

  uint16_t bg = pressed ? TFT_WHITE : b.color;
  uint16_t border = pressed ? TFT_CYAN : tft.color565(51, 65, 85);
  uint16_t fg = pressed ? TFT_BLACK : b.textColor;

  tft.fillRoundRect(b.x, b.y, b.w, b.h, 8, bg);
  tft.drawRoundRect(b.x, b.y, b.w, b.h, 8, border);

  int cx = b.x + b.w / 2;
  int cy = b.y + 28;

  if (b.icon == "record") {
    tft.fillCircle(cx, cy, 14, TFT_RED);
    tft.drawCircle(cx, cy, 14, TFT_WHITE);
  } else if (b.icon == "play") {
    tft.fillTriangle(cx - 10, cy - 12, cx - 10, cy + 12, cx + 12, cy, fg);
  } else if (b.icon == "mic" || b.icon == "mic-off") {
    tft.fillRoundRect(cx - 6, cy - 12, 12, 18, 6, fg);
    tft.drawFastHLine(cx - 10, cy + 12, 20, fg);
    tft.drawFastVLine(cx, cy + 6, 6, fg);
  } else {
    tft.drawRect(cx - 12, cy - 12, 24, 24, fg);
  }

  tft.setTextColor(fg, bg);
  tft.setTextDatum(MC_DATUM);
  tft.drawString(b.label, cx, b.y + b.h - 30, 2);

  if (b.sub.length() > 0) {
    tft.setTextColor(pressed ? TFT_DARKGREY : tft.color565(203, 213, 225), bg);
    tft.drawString(b.sub, cx, b.y + b.h - 14, 1);
  }
}

void renderFullDeck() {
  drawStatusBar();
  for (int i = 0; i < NUM_BUTTONS; i++) {
    drawButton(i, false);
  }
}

void initLayout() {
  int startY = 28, btnW = 98, btnH = 98, gapX = 6, gapY = 6;
  for (int r = 0; r < 2; r++) {
    for (int c = 0; c < 3; c++) {
      int idx = r * 3 + c;
      buttons[idx].id = idx;
      buttons[idx].x = 6 + c * (btnW + gapX);
      buttons[idx].y = startY + r * (btnH + gapY);
      buttons[idx].w = btnW;
      buttons[idx].h = btnH;
      buttons[idx].label = "TOUCHE " + String(idx + 1);
      buttons[idx].sub = "";
      buttons[idx].icon = "square";
      buttons[idx].color = hexToRGB565("#1e293b");
      buttons[idx].textColor = TFT_WHITE;
    }
  }
}

void processSerialCommand(const String& jsonStr) {
  JsonDocument doc;
  if (deserializeJson(doc, jsonStr)) return;

  const char* cmd = doc["cmd"] | "";
  if (strcmp(cmd, "PAGE_SYNC") == 0) {
    isConnectedToPC = true;
    currentPageName = doc["pageName"] | "Page";
    JsonArray btns = doc["buttons"].as<JsonArray>();
    for (JsonObject b : btns) {
      int id = b["id"] | 0;
      if (id >= 0 && id < NUM_BUTTONS) {
        buttons[id].label = b["label"] | "";
        buttons[id].sub = b["sub"] | "";
        buttons[id].icon = b["icon"] | "square";
        buttons[id].color = hexToRGB565(b["color"] | "#1e293b");
        buttons[id].textColor = hexToRGB565(b["textColor"] | "#ffffff");
      }
    }
    renderFullDeck();
  } else if (strcmp(cmd, "STATS") == 0) {
    isConnectedToPC = true;
    currentCpuUsage = doc["cpu"] | 0;
    currentRamUsage = doc["ram"] | 0;
    drawStatusBar();
  } else if (strcmp(cmd, "SLEEP") == 0) {
    analogWrite(LCD_BACKLIGHT, doc["state"] | false ? 0 : 255);
  } else if (strcmp(cmd, "BRIGHTNESS") == 0) {
    analogWrite(LCD_BACKLIGHT, map(constrain(doc["val"] | 100, 0, 100), 0, 100, 0, 255));
  }
}

void sendTouchEvent(int buttonIndex) {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(15);
  digitalWrite(BUZZER_PIN, LOW);

  drawButton(buttonIndex, true);

  JsonDocument out;
  out["event"] = "TOUCH";
  out["idx"] = buttonIndex;
  out["type"] = "click";
  serializeJson(out, Serial);
  Serial.println();

  delay(120);
  drawButton(buttonIndex, false);
}

void checkTouch() {
  if (touch.touched()) {
    TS_Point p = touch.getPoint();
    if (millis() - lastTouchTime < 300) return;
    lastTouchTime = millis();

    int screenX = map(p.y, TOUCH_MIN_Y, TOUCH_MAX_Y, 0, SCREEN_WIDTH);
    int screenY = map(p.x, TOUCH_MAX_X, TOUCH_MIN_X, 0, SCREEN_HEIGHT);
    screenX = constrain(screenX, 0, SCREEN_WIDTH);
    screenY = constrain(screenY, 0, SCREEN_HEIGHT);

    for (int i = 0; i < NUM_BUTTONS; i++) {
      DeckButton& b = buttons[i];
      if (screenX >= b.x && screenX <= (b.x + b.w) &&
          screenY >= b.y && screenY <= (b.y + b.h)) {
        sendTouchEvent(i);
        break;
      }
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  pinMode(LCD_BACKLIGHT, OUTPUT);
  analogWrite(LCD_BACKLIGHT, 255);

  tft.init();
  tft.setRotation(1);
  tft.fillScreen(tft.color565(7, 10, 18));

  touchSPI.begin(XPT2046_CLK, XPT2046_MISO, XPT2046_MOSI, XPT2046_CS);
  touch.begin(touchSPI);
  touch.setRotation(1);

  initLayout();
  renderFullDeck();
  Serial.println("{\"event\":\"READY\",\"device\":\"ESP32-2432S028R\"}");
}

void loop() {
  if (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    line.trim();
    if (line.length() > 0) processSerialCommand(line);
  }
  checkTouch();
}
