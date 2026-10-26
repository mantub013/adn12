
/* Agentic PQC smart door lock: ESP8266 keypad, servo actuator and REST client. */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <Keypad.h>
#include <Servo.h>
#include <bearssl/bearssl_hash.h>

#define DEVICE_ID "DOOR-001"
#define FIRMWARE_VERSION "1.0.0"

// Keypad wiring (NodeMCU GPIO numbers).
#define PIN_KEYPAD_R1 5
#define PIN_KEYPAD_R2 4
#define PIN_KEYPAD_R3 14
#define PIN_KEYPAD_R4 12
#define PIN_KEYPAD_C1 13
#define PIN_KEYPAD_C2 0
#define PIN_KEYPAD_C3 2
#define PIN_KEYPAD_C4 15
#define PIN_BUZZER 16
#define PIN_SERVO 1

const unsigned long UNLOCK_DURATION_MS = 10000;
const unsigned long STATUS_REPORT_INTERVAL_MS = 15000;
const unsigned long COMMAND_POLL_INTERVAL_MS = 3000;
const unsigned long HTTP_TIMEOUT_MS = 8000;
const unsigned long LOCKOUT_DURATION_MS = 60000;

const char* WIFI_SSID = "KALI";
const char* WIFI_PASSWORD = "12345678";
const char* DEVICE_API_BASE_URL = "http://172.22.203.12:5000";
const char* DEVICE_TOKEN = "DOOR_PQC_SECURE_TOKEN_2026";

const int SERVO_CLOSED_ANGLE = 90;
const int SERVO_OPEN_ANGLE = 0;

const byte ROWS = 4;
const byte COLS = 4;

char keys[ROWS][COLS] = {
  {'1', '2', '3', 'A'},
  {'4', '5', '6', 'B'},
  {'7', '8', '9', 'C'},
  {'*', '0', '#', 'D'}
};

byte rowPins[ROWS] = {
  PIN_KEYPAD_R1, PIN_KEYPAD_R2, PIN_KEYPAD_R3, PIN_KEYPAD_R4
};

byte colPins[COLS] = {
  PIN_KEYPAD_C1, PIN_KEYPAD_C2, PIN_KEYPAD_C3, PIN_KEYPAD_C4
};

Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);
Servo doorServo;

enum DoorState {
  STATE_LOCKED,
  STATE_PASSWORD_ENTRY,
  STATE_RESET_WAITING_OTP,
  STATE_RESET_NEW_PIN,
  STATE_RESET_CONFIRM_PIN,
  STATE_LOCKOUT
};

DoorState currentState = STATE_LOCKED;

String pinBuffer;
String newPinBuffer;
String confirmPinBuffer;

bool servoDoorOpen = false;
unsigned long servoOpenedAt = 0;
unsigned long lastHeartbeatTime = 0;
unsigned long lastCommandPollTime = 0;
unsigned long lockoutStartTime = 0;

// ---------------- API HELPERS ----------------

String apiUrl(const String& path) {
  return String(DEVICE_API_BASE_URL) + path;
}

String computeSha256(const String& value) {
  br_sha256_context ctx;
  br_sha256_init(&ctx);
  br_sha256_update(&ctx, value.c_str(), value.length());

  unsigned char digest[32];
  br_sha256_out(&ctx, digest);

  char hex[65];

  for (int i = 0; i < 32; ++i) {
    sprintf(hex + i * 2, "%02x", digest[i]);
  }

  hex[64] = '\0';
  return String(hex);
}

String postJson(const String& path, const String& payload) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WIFI] Not connected.");
    return "";
  }

  WiFiClient client;
  client.setTimeout(HTTP_TIMEOUT_MS);

  HTTPClient http;

  if (!http.begin(client, apiUrl(path))) {
    Serial.println("[API] Could not initialize connection.");
    return "";
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", DEVICE_TOKEN);

  int code = http.POST(payload);
  String response = code > 0 ? http.getString() : "";

  Serial.printf("[API] POST %s -> %d\n", path.c_str(), code);

  http.end();
  return response;
}

String getJson(const String& path) {
  if (WiFi.status() != WL_CONNECTED) {
    return "";
  }

  WiFiClient client;
  client.setTimeout(HTTP_TIMEOUT_MS);

  HTTPClient http;

  if (!http.begin(client, apiUrl(path))) {
    return "";
  }

  http.addHeader("X-Device-Token", DEVICE_TOKEN);

  int code = http.GET();
  String response = code > 0 ? http.getString() : "";

  http.end();
  return response;
}

// ---------------- BUZZER AND SERVO ----------------

void beepShort() {
  digitalWrite(PIN_BUZZER, HIGH);
  delay(40);
  digitalWrite(PIN_BUZZER, LOW);
}

// SUCCESS: open the door and start the 10-second timer.
// Repeated success signals restart the 10-second timer.
void beepSuccess() {
  doorServo.write(SERVO_OPEN_ANGLE);
  servoDoorOpen = true;
  servoOpenedAt = millis();

  Serial.println("[SERVO] OPEN - will close after 10 seconds.");

  for (int i = 0; i < 2; ++i) {
    digitalWrite(PIN_BUZZER, HIGH);
    delay(100);
    digitalWrite(PIN_BUZZER, LOW);

    if (i == 0) {
      delay(100);
    }
  }
}

// ERROR: close the door immediately.
void beepFailure() {
  doorServo.write(SERVO_CLOSED_ANGLE);
  servoDoorOpen = false;

  Serial.println("[SERVO] CLOSED - error tone.");

  for (int i = 0; i < 3; ++i) {
    digitalWrite(PIN_BUZZER, HIGH);
    delay(120);
    digitalWrite(PIN_BUZZER, LOW);

    if (i < 2) {
      delay(80);
    }
  }
}

void beepWarning() {
  for (int i = 0; i < 2; ++i) {
    digitalWrite(PIN_BUZZER, HIGH);
    delay(200);
    digitalWrite(PIN_BUZZER, LOW);
    delay(100);
  }
}

// ---------------- DEVICE STATUS ----------------

void reportHeartbeat() {
  String payload =
    "{\"device_id\":\"" + String(DEVICE_ID) +
    "\",\"firmware_version\":\"" + String(FIRMWARE_VERSION) +
    "\",\"ip_address\":\"" + WiFi.localIP().toString() +
    "\",\"rssi\":" + String(WiFi.RSSI()) +
    ",\"wifi_status\":\"CONNECTED\",\"device_state\":\"" +
    String(currentState == STATE_LOCKOUT ? "LOCKOUT" : "LOCKED") +
    "\"}";

  postJson("/api/device/heartbeat", payload);
}

void reportKeypadActivity(int length, const char* action) {
  String payload =
    "{\"device_id\":\"" + String(DEVICE_ID) +
    "\",\"ip_address\":\"" + WiFi.localIP().toString() +
    "\",\"rssi\":" + String(WiFi.RSSI()) +
    ",\"wifi_status\":\"CONNECTED\",\"device_state\":\"LOCKED\"" +
    ",\"input_length\":" + String(length) +
    ",\"keypad_state\":\"" + String(action) + "\"}";

  postJson("/api/device/keypad-activity", payload);
}

// ---------------- BACKEND COMMANDS ----------------

void acknowledgeCommand(const String& id) {
  if (id.length() == 0) {
    return;
  }

  String payload =
    "{\"device_id\":\"" + String(DEVICE_ID) +
    "\",\"command_id\":\"" + id + "\"}";

  postJson("/api/device/commands/" + id + "/ack", payload);
}

String jsonField(const String& json, const String& field) {
  String marker = "\"" + field + "\":\"";
  int start = json.indexOf(marker);

  if (start < 0) {
    return "";
  }

  start += marker.length();
  int end = json.indexOf('"', start);

  return end > start ? json.substring(start, end) : "";
}

void checkPendingCommands() {
  String response =
    getJson("/api/device/commands?device_id=" + String(DEVICE_ID));

  if (response.length() == 0 ||
      response.indexOf("\"count\":0") >= 0 ||
      response.indexOf("\"count\": 0") >= 0) {
    return;
  }

  String id = jsonField(response, "command_id");
  String command = jsonField(response, "command");

  if (command == "AUTHENTICATION_SUCCESS") {
    Serial.println("[COMMAND] Auth success notification acknowledged.");
    currentState = STATE_LOCKED;

  } else if (command == "UNLOCK") {
    beepSuccess();
    currentState = STATE_LOCKED;

  } else if (command == "LOCKOUT" ||
             command == "LOCK_AUTHENTICATION") {
    currentState = STATE_LOCKOUT;
    lockoutStartTime = millis();
    beepFailure();

  } else if (command == "AUTHENTICATION_FAILURE" ||
             command == "DENY") {
    beepFailure();

  } else if (command == "RESET_WAITING_OTP") {
    currentState = STATE_RESET_WAITING_OTP;
    pinBuffer = "";

  } else if (command == "OTP_VALID") {
    currentState = STATE_RESET_NEW_PIN;
    pinBuffer = "";
    beepSuccess();

  } else if (command == "OTP_INVALID") {
    currentState = STATE_RESET_WAITING_OTP;
    pinBuffer = "";
    beepFailure();

  } else if (command == "PASSWORD_UPDATED") {
    currentState = STATE_LOCKED;
    pinBuffer = "";
    beepSuccess();
  }

  acknowledgeCommand(id);
}

// ---------------- PIN AUTHENTICATION ----------------

void processAuthentication(const String& pin) {
  String payload =
    "{\"device_id\":\"" + String(DEVICE_ID) +
    "\",\"pin_hash\":\"" + computeSha256(pin) +
    "\",\"ip_address\":\"" + WiFi.localIP().toString() +
    "\",\"rssi\":" + String(WiFi.RSSI()) + "}";

  String response = postJson("/api/device/authenticate", payload);

  if (response.indexOf("\"authenticated\":true") >= 0 ||
      response.indexOf("\"authenticated\": true") >= 0) {
    Serial.println("[AUTH] Correct PIN.");
    beepSuccess();
  } else {
    Serial.println("[AUTH] PIN rejected or backend unavailable.");
    beepFailure();
  }

  currentState = STATE_LOCKED;
}

// ---------------- OTP PASSWORD RESET ----------------

void requestPasswordReset() {
  String payload =
    "{\"device_id\":\"" + String(DEVICE_ID) + "\"}";

  postJson("/api/device/reset/request", payload);

  currentState = STATE_RESET_WAITING_OTP;
  pinBuffer = "";

  Serial.println("[RESET] Enter owner OTP, then #.");
  beepWarning();
}

void verifyOtp() {
  String payload =
    "{\"device_id\":\"" + String(DEVICE_ID) +
    "\",\"otp\":\"" + pinBuffer + "\"}";

  String response =
    postJson("/api/device/reset/verify-otp", payload);

  if (response.indexOf("\"success\":true") >= 0 ||
      response.indexOf("\"success\": true") >= 0) {
    currentState = STATE_RESET_NEW_PIN;
    pinBuffer = "";

    beepSuccess();

    Serial.println("[RESET] Enter new PIN (4-8 digits), then #.");
  } else {
    pinBuffer = "";
    beepFailure();

    Serial.println("[RESET] OTP invalid or expired.");
  }
}

void setNewPin() {
  String payload =
    "{\"device_id\":\"" + String(DEVICE_ID) +
    "\",\"new_pin_hash\":\"" + computeSha256(newPinBuffer) +
    "\",\"confirm_pin_hash\":\"" + computeSha256(confirmPinBuffer) +
    "\"}";

  String response =
    postJson("/api/device/reset/set-password", payload);

  if (response.indexOf("\"success\":true") >= 0 ||
      response.indexOf("\"success\": true") >= 0) {
    beepSuccess();
  } else {
    beepFailure();
  }

  currentState = STATE_LOCKED;

  pinBuffer = "";
  newPinBuffer = "";
  confirmPinBuffer = "";
}

// ---------------- SETUP ----------------

void setup() {
  // Serial.begin(115200);

  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);

  doorServo.attach(PIN_SERVO);
  doorServo.write(SERVO_CLOSED_ANGLE);
  servoDoorOpen = false;

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.printf("[WIFI] Connecting to %s", WIFI_SSID);

  int tries = 0;

  while (WiFi.status() != WL_CONNECTED && tries++ < 30) {
    delay(500);
    Serial.print('.');
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf(
      "[WIFI] Connected, IP %s\n",
      WiFi.localIP().toString().c_str()
    );

    reportHeartbeat();
  } else {
    Serial.println("[WIFI] Failed to connect.");
  }

  currentState = STATE_LOCKED;
}

// ---------------- MAIN LOOP ----------------

void loop() {
  unsigned long now = millis();

  // Automatically close 10 seconds after a successful opening.
  // This check runs on every loop iteration.
  if (servoDoorOpen &&
      now - servoOpenedAt >= UNLOCK_DURATION_MS) {
    doorServo.write(SERVO_CLOSED_ANGLE);
    servoDoorOpen = false;

    Serial.println("[SERVO] CLOSED after 10 seconds.");
  }

  // End lockout after 60 seconds.
  if (currentState == STATE_LOCKOUT &&
      now - lockoutStartTime >= LOCKOUT_DURATION_MS) {
    currentState = STATE_LOCKED;
  }

  // Periodic heartbeat.
  if (now - lastHeartbeatTime >= STATUS_REPORT_INTERVAL_MS) {
    lastHeartbeatTime = now;
    reportHeartbeat();
  }

  // Poll backend commands.
  if (now - lastCommandPollTime >= COMMAND_POLL_INTERVAL_MS) {
    lastCommandPollTime = now;
    checkPendingCommands();
  }

  char key = keypad.getKey();

  if (!key) {
    delay(20);
    return;
  }

  beepShort();

  // AABB starts the owner-authorized PIN reset flow.
  if ((currentState == STATE_LOCKED ||
       currentState == STATE_PASSWORD_ENTRY) &&
      (key == 'A' || key == 'B')) {
    pinBuffer += key;

    if (pinBuffer.endsWith("AABB")) {
      requestPasswordReset();
      return;
    }
  }

  // Normal PIN entry.
  if (currentState == STATE_LOCKED ||
      currentState == STATE_PASSWORD_ENTRY) {
    if (key == '*') {
      pinBuffer = "";
      currentState = STATE_LOCKED;
      reportKeypadActivity(0, "CLEAR");

    } else if (key == '#') {
      if (pinBuffer.length() > 0) {
        reportKeypadActivity(0, "SUBMIT");
        processAuthentication(pinBuffer);
        pinBuffer = "";
      }

    } else if (key >= '0' && key <= '9' &&
               pinBuffer.length() < 8) {
      pinBuffer += key;
      currentState = STATE_PASSWORD_ENTRY;

      reportKeypadActivity(pinBuffer.length(), "INPUT");
      Serial.print('*');
    }

  // OTP entry.
  } else if (currentState == STATE_RESET_WAITING_OTP) {
    if (key == '*') {
      pinBuffer = "";
      reportKeypadActivity(0, "CLEAR");

    } else if (key == '#' && pinBuffer.length() == 6) {
      reportKeypadActivity(0, "SUBMIT");
      verifyOtp();

    } else if (key >= '0' && key <= '9' &&
               pinBuffer.length() < 6) {
      pinBuffer += key;
    }

  // Enter a new PIN.
  } else if (currentState == STATE_RESET_NEW_PIN) {
    if (key == '*') {
      pinBuffer = "";

    } else if (key == '#' && pinBuffer.length() >= 4) {
      newPinBuffer = pinBuffer;
      pinBuffer = "";

      currentState = STATE_RESET_CONFIRM_PIN;

      Serial.println("[RESET] Confirm new PIN, then #.");

    } else if (key >= '0' && key <= '9' &&
               pinBuffer.length() < 8) {
      pinBuffer += key;
    }

  // Confirm the new PIN.
  } else if (currentState == STATE_RESET_CONFIRM_PIN) {
    if (key == '*') {
      pinBuffer = "";

    } else if (key == '#' && pinBuffer.length() >= 4) {
      confirmPinBuffer = pinBuffer;
      pinBuffer = "";

      if (newPinBuffer == confirmPinBuffer) {
        setNewPin();
      } else {
        Serial.println("[RESET] PINs did not match.");

        beepFailure();
        currentState = STATE_LOCKED;
      }

    } else if (key >= '0' && key <= '9' &&
               pinBuffer.length() < 8) {
      pinBuffer += key;
    }
  }

  delay(20);
}
