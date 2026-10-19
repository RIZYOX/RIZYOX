/**
 * ============================================================================
 * CYD-Deck Studio — ESP32 CYD (Cheap Yellow Display) Stream Deck Firmware
 * Target: ESP32-2432S028R (2.8" TFT 320x240 + Touch XPT2046)
 * ============================================================================
 */

#include <Arduino.h>
#include <SPI.h>
#include <TFT_eSPI.h>
#include <XPT2046_Touchscreen.h>
#include <ArduinoJson.h>

// ----------------------------------------------------------------------------
// PIN DEFINITIONS & HARDWARE SPECIFICATIONS
// ----------------------------------------------------------------------------
#define XPT2046_IRQ   36
#define XPT2046_MOSI  32
#define XPT2046_MISO  39
#define XPT2046_CLK   25
#define XPT2046_CS    33

#define LCD_BACKLIGHT 21  // PWM Backlight control pin
#define RGB_LED_RED   4
#define RGB_LED_GREEN 16
#define RGB_LED_BLUE  17
#define BUZZER_PIN    26

#define SCREEN_WIDTH  320
#define SCREEN_HEIGHT 240
#define NUM_BUTTONS   6

// ----------------------------------------------------------------------------
// TOUCH CALIBRATION VALUES (Adjust if needed for your specific CYD panel)
// ----------------------------------------------------------------------------
#define TOUCH_MIN_X 300
#define TOUCH_MAX_X 3800
#define TOUCH_MIN_Y 250
#define TOUCH_MAX_Y 3750

// Hardware instances
TFT_eSPI tft = TFT_eSPI();
SPIClass touchSPI = SPIClass(VSPI);
XPT2046_Touchscreen touch(XPT2046_CS, XPT2046_IRQ);

// Button structure
struct DeckButton {
  int id;
  String label;
  String sub;
  String icon;
  uint16_t color;
  uint16_t textColor;
  int x;
  int y;
  int w;
  int h;
};

DeckButton buttons[NUM_BUTTONS];
String currentPageName = "🔴 Studio";
int currentCpuUsage = 0;
int currentRamUsage = 0;
bool isConnectedToPC = false;
unsigned long lastTouchTime = 0;
unsigned long lastPingTime = 0;

// Helper: Convert HEX color string (e.g. "#1e3a8a") to 16-bit RGB565 for TFT
uint16_t hexToRGB565(const String& hex) {
  String cleanHex = hex;
  if (cleanHex.startsWith("#")) cleanHex = cleanHex.substring(1);
  long num = strtol(cleanHex.c_str(), NULL, 16);
  uint8_t r = (num >> 16) & 0xFF;
  uint8_t g = (num >> 8) & 0xFF;
  uint8_t b = num & 0xFF;
  return tft.color565(r, g, b);
}

// Draw Status Bar at top (Height = 22px)
void drawStatusBar() {
  tft.fillRect(0, 0, SCREEN_WIDTH, 22, tft.color565(11, 15, 26));
  tft.drawFastHLine(0, 22, SCREEN_WIDTH, tft.color565(30, 41, 59));

  // Connection dot
  tft.fillCircle(10, 11, 4, isConnectedToPC ? TFT_GREEN : TFT_RED);

  // App & Page Title
  tft.setTextColor(TFT_WHITE, tft.color565(11, 15, 26));
  tft.setTextSize(1);
  tft.drawString("CYD-DECK | " + currentPageName, 22, 7);

  // PC System Stats
  if (isConnectedToPC) {
    String statsStr = "CPU:" + String(currentCpuUsage) + "% RAM:" + String(currentRamUsage) + "%";
    tft.setTextColor(tft.color565(96, 165, 250), tft.color565(11, 15, 26));
    tft.drawRightString(statsStr, SCREEN_WIDTH - 8, 7, 1);
  } else {
    tft.setTextColor(TFT_DARKGREY, tft.color565(11, 15, 26));
    tft.drawRightString("USB ATTENTE", SCREEN_WIDTH - 8, 7, 1);
  }
}

// Draw a single button
void drawButton(int idx, bool pressed = false) {
  if (idx < 0 || idx >= NUM_BUTTONS) return;
  DeckButton& b = buttons[idx];

  uint16_t bg = pressed ? TFT_WHITE : b.color;
  uint16_t border = pressed ? TFT_CYAN : tft.color565(51, 65, 85);
  uint16_t fg = pressed ? TFT_BLACK : b.textColor;

  // Button background with rounded corners
  tft.fillRoundRect(b.x, b.y, b.w, b.h, 8, bg);
  tft.drawRoundRect(b.x, b.y, b.w, b.h, 8, border);

  // Draw simple geometric icon based on b.icon
  int cx = b.x + b.w / 2;
  int cy = b.y + 28;

  if (b.icon == "record") {
    tft.fillCircle(cx, cy, 14, pressed ? TFT_RED : TFT_RED);
    tft.drawCircle(cx, cy, 14, TFT_WHITE);
  } else if (b.icon == "play") {
    tft.fillTriangle(cx - 10, cy - 12, cx - 10, cy + 12, cx + 12, cy, fg);
  } else if (b.icon == "pause") {
    tft.fillRect(cx - 10, cy - 12, 6, 24, fg);
    tft.fillRect(cx + 4, cy - 12, 6, 24, fg);
  } else if (b.icon == "mic" || b.icon == "mic-off") {
    tft.fillRoundRect(cx - 6, cy - 12, 12, 18, 6, fg);
    tft.drawFastHLine(cx - 10, cy + 12, 20, fg);
    tft.drawFastVLine(cx, cy + 6, 6, fg);
    if (b.icon == "mic-off") {
      tft.drawLine(cx - 12, cy - 12, cx + 12, cy + 12, TFT_RED);
    }
  } else if (b.icon == "radio") {
    tft.drawCircle(cx, cy, 6, fg);
    tft.drawCircle(cx, cy, 12, fg);
    tft.fillCircle(cx, cy, 3, fg);
  } else if (b.icon == "arrow-right") {
    tft.fillTriangle(cx - 8, cy - 10, cx - 8, cy + 10, cx + 10, cy, fg);
  } else if (b.icon == "arrow-left") {
    tft.fillTriangle(cx + 8, cy - 10, cy + 8, cx - 10, cx - 8, cy, fg);
  } else {
    // Default square icon
    tft.drawRect(cx - 12, cy - 12, 24, 24, fg);
  }

  // Draw Label (Centered)
  tft.setTextColor(fg, bg);
  tft.setTextDatum(MC_DATUM);
  tft.drawString(b.label, cx, b.y + b.h - 30, 2);

  // Draw Subtitle (Centered, smaller)
  if (b.sub.length() > 0) {
    tft.setTextColor(pressed ? TFT_DARKGREY : tft.color565(203, 213, 225), bg);
    tft.drawString(b.sub, cx, b.y + b.h - 14, 1);
  }
}

// Redraw entire screen
void renderFullDeck() {
  drawStatusBar();
  for (int i = 0; i < NUM_BUTTONS; i++) {
    drawButton(i, false);
  }
}

// Initialize layout geometry (3 columns x 2 rows on 320x240 screen)
void initLayout() {
  int startY = 28;
  int btnW = 98;
  int btnH = 98;
  int gapX = 6;
  int gapY = 6;

  for (int r = 0; r < 2; r++) {
    for (int c = 0; c < 3; c++) {
      int idx = r * 3 + c;
      buttons[idx].id = idx;
      buttons[idx].x = 6 + c * (btnW + gapX);
      buttons[idx].y = startY + r * (btnH + gapY);
      buttons[idx].w = btnW;
      buttons[idx].h = btnH;
      buttons[idx].label = "BTN " + String(idx + 1);
      buttons[idx].sub = "CYD";
      buttons[idx].icon = "square";
      buttons[idx].color = hexToRGB565("#1e293b");
      buttons[idx].textColor = TFT_WHITE;
    }
  }
}

// Process JSON incoming command from PC via USB Serial
void processSerialCommand(const String& jsonStr) {
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, jsonStr);
  if (error) return;

  const char* cmd = doc["cmd"] | "";

  // 1. PAGE_SYNC — Synchronize buttons layout and names
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
  }
  // 2. STATS — Update CPU and RAM usage live
  else if (strcmp(cmd, "STATS") == 0) {
    isConnectedToPC = true;
    currentCpuUsage = doc["cpu"] | 0;
    currentRamUsage = doc["ram"] | 0;
    drawStatusBar();
  }
  // 3. SLEEP — Screen power management (Screen lock / PC Sleep)
  else if (strcmp(cmd, "SLEEP") == 0) {
    bool sleepState = doc["state"] | false;
    analogWrite(LCD_BACKLIGHT, sleepState ? 0 : 255);
  }
  // 4. BRIGHTNESS — Backlight PWM control (0 - 100%)
  else if (strcmp(cmd, "BRIGHTNESS") == 0) {
    int val = doc["val"] | 100;
    int pwm = map(constrain(val, 0, 100), 0, 100, 0, 255);
    analogWrite(LCD_BACKLIGHT, pwm);
  }
}

// Send Touch Event to PC over Serial
void sendTouchEvent(int buttonIndex) {
  // Beep feedback
  digitalWrite(BUZZER_PIN, HIGH);
  delay(15);
  digitalWrite(BUZZER_PIN, LOW);

  // Visual press feedback
  drawButton(buttonIndex, true);

  // Send JSON frame over Serial
  JsonDocument out;
  out["event"] = "TOUCH";
  out["idx"] = buttonIndex;
  out["type"] = "click";
  serializeJson(out, Serial);
  Serial.println();

  delay(120);
  drawButton(buttonIndex, false);
}

// Check touch input
void checkTouch() {
  if (touch.touched()) {
    TS_Point p = touch.getPoint();

    // Debounce
    if (millis() - lastTouchTime < 300) return;
    lastTouchTime = millis();

    // Map raw touch coordinates to screen 320x240 (Landscape)
    int screenX = map(p.y, TOUCH_MIN_Y, TOUCH_MAX_Y, 0, SCREEN_WIDTH);
    int screenY = map(p.x, TOUCH_MAX_X, TOUCH_MIN_X, 0, SCREEN_HEIGHT);
    screenX = constrain(screenX, 0, SCREEN_WIDTH);
    screenY = constrain(screenY, 0, SCREEN_HEIGHT);

    // Identify which button was clicked
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

// ----------------------------------------------------------------------------
// SETUP & MAIN LOOP
// ----------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  Serial.setTimeout(100);

  // Onboard RGB LED (Turn off active-low)
  pinMode(RGB_LED_RED, OUTPUT);
  pinMode(RGB_LED_GREEN, OUTPUT);
  pinMode(RGB_LED_BLUE, OUTPUT);
  digitalWrite(RGB_LED_RED, HIGH);
  digitalWrite(RGB_LED_GREEN, HIGH);
  digitalWrite(RGB_LED_BLUE, HIGH);

  // Buzzer
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // Backlight PWM (Full brightness on boot)
  pinMode(LCD_BACKLIGHT, OUTPUT);
  analogWrite(LCD_BACKLIGHT, 255);

  // Initialize TFT LCD
  tft.init();
  tft.setRotation(1); // Landscape 320x240
  tft.fillScreen(tft.color565(7, 10, 18));

  // Initialize Touchscreen SPI
  touchSPI.begin(XPT2046_CLK, XPT2046_MISO, XPT2046_MOSI, XPT2046_CS);
  touch.begin(touchSPI);
  touch.setRotation(1);

  // Splash Screen on CYD
  tft.setTextColor(tft.color565(96, 165, 250));
  tft.setTextDatum(MC_DATUM);
  tft.drawString("CYD-DECK STUDIO", SCREEN_WIDTH / 2, 90, 4);
  tft.setTextColor(TFT_WHITE);
  tft.drawString("Connexion USB...", SCREEN_WIDTH / 2, 130, 2);

  delay(600);

  initLayout();
  renderFullDeck();

  // Send handshake to PC
  Serial.println("{\"event\":\"READY\",\"device\":\"ESP32-2432S028R\"}");
}

void loop() {
  // Read Serial commands from PC
  if (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    line.trim();
    if (line.length() > 0) {
      processSerialCommand(line);
    }
  }

  // Handle Touch input
  checkTouch();
}
