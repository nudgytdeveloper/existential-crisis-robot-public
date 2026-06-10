/**
 * Existential Crisis Robot — Physical Agent 2 (Intuition Embodiment)
 * 
 * Board: Arduino Nano 33 BLE Sense Lite + ML Shield
 * 
 * Uses ONLY built-in sensors (no servo, no motors):
 * - Camera (OV7675 via ML Shield): person detection
 * - Microphone (PDM): ambient noise level / audience reaction
 * - IMU (LSM9DS1): shake/tilt detection
 * - BLE: communicates with web app via Python bridge
 * 
 * Behavior:
 * - Receives suspicion_level over BLE from the web app
 * - Detects people via camera
 * - Listens for loud audience reactions via microphone
 * - Detects physical interaction (shake/tilt) via IMU
 * - Reports all sensor data back to the web app for display
 * 
 * BLE Service: "19B10000-E8F2-537E-4F6C-D104768A1214"
 */

#include <ArduinoBLE.h>
#include <PDM.h>
#include <Arduino_LSM9DS1.h>

// BLE UUIDs
#define SERVICE_UUID        "19B10000-E8F2-537E-4F6C-D104768A1214"
#define SUSPICION_CHAR_UUID "19B10001-E8F2-537E-4F6C-D104768A1214"
#define EMOTION_CHAR_UUID   "19B10002-E8F2-537E-4F6C-D104768A1214"
#define PERSON_CHAR_UUID    "19B10003-E8F2-537E-4F6C-D104768A1214"
#define STATE_CHAR_UUID     "19B10004-E8F2-537E-4F6C-D104768A1214"
#define NOISE_CHAR_UUID     "19B10005-E8F2-537E-4F6C-D104768A1214"
#define SHAKE_CHAR_UUID     "19B10006-E8F2-537E-4F6C-D104768A1214"

// BLE service and characteristics
BLEService agentService(SERVICE_UUID);
BLEFloatCharacteristic suspicionChar(SUSPICION_CHAR_UUID, BLERead | BLEWrite);
BLEStringCharacteristic emotionChar(EMOTION_CHAR_UUID, BLERead | BLEWrite, 32);
BLEBoolCharacteristic personChar(PERSON_CHAR_UUID, BLERead | BLENotify);
BLEStringCharacteristic stateChar(STATE_CHAR_UUID, BLERead | BLENotify, 20);
BLEFloatCharacteristic noiseChar(NOISE_CHAR_UUID, BLERead | BLENotify);
BLEBoolCharacteristic shakeChar(SHAKE_CHAR_UUID, BLERead | BLENotify);

// State
float suspicionLevel = 0.0;
bool personDetected = false;
String currentState = "idle";
float noiseLevel = 0.0;
bool shakeDetected = false;

// Microphone
static const int MIC_BUFFER_SIZE = 256;
short micBuffer[MIC_BUFFER_SIZE];
volatile bool micDataReady = false;

// Timing
unsigned long lastPersonCheck = 0;
unsigned long lastNoiseCheck = 0;
unsigned long lastShakeCheck = 0;
unsigned long lastStateUpdate = 0;

// Shake detection thresholds
const float SHAKE_THRESHOLD = 2.5;  // g-force threshold
const float NOISE_THRESHOLD = 500.0; // Amplitude threshold for "loud"

void setup() {
  Serial.begin(115200);
  
  // Initialize IMU
  if (!IMU.begin()) {
    Serial.println("IMU init failed!");
  } else {
    Serial.println("IMU ready");
  }
  
  // Initialize microphone (PDM)
  PDM.onReceive(onPDMdata);
  if (!PDM.begin(1, 16000)) {  // Mono, 16kHz
    Serial.println("PDM init failed!");
  } else {
    Serial.println("Microphone ready");
  }
  
  // Initialize BLE
  if (!BLE.begin()) {
    Serial.println("BLE init failed!");
    while (1);
  }
  
  BLE.setLocalName("CrisisRobot");
  BLE.setAdvertisedService(agentService);
  
  agentService.addCharacteristic(suspicionChar);
  agentService.addCharacteristic(emotionChar);
  agentService.addCharacteristic(personChar);
  agentService.addCharacteristic(stateChar);
  agentService.addCharacteristic(noiseChar);
  agentService.addCharacteristic(shakeChar);
  
  BLE.addService(agentService);
  
  // Initial values
  suspicionChar.writeValue(0.0);
  emotionChar.writeValue("idle");
  personChar.writeValue(false);
  stateChar.writeValue("idle");
  noiseChar.writeValue(0.0);
  shakeChar.writeValue(false);
  
  BLE.advertise();
  
  Serial.println("CrisisRobot ready. Waiting for BLE connection...");
}

void loop() {
  BLEDevice central = BLE.central();
  
  if (central) {
    Serial.print("Connected to: ");
    Serial.println(central.address());
    
    while (central.connected()) {
      // Read suspicion from web app
      if (suspicionChar.written()) {
        suspicionLevel = suspicionChar.value();
        Serial.print("Suspicion: ");
        Serial.println(suspicionLevel);
      }
      
      // Check microphone (every 100ms)
      if (millis() - lastNoiseCheck > 100) {
        lastNoiseCheck = millis();
        updateNoiseLevel();
      }
      
      // Check IMU for shake (every 100ms)
      if (millis() - lastShakeCheck > 100) {
        lastShakeCheck = millis();
        checkForShake();
      }
      
      // Check for person (simulated — replace with TFLite when camera active)
      if (millis() - lastPersonCheck > 1000) {
        lastPersonCheck = millis();
        updatePersonDetection();
      }
      
      // Update overall state (every 500ms)
      if (millis() - lastStateUpdate > 500) {
        lastStateUpdate = millis();
        updateState();
      }
      
      delay(10);
    }
    
    Serial.println("Disconnected");
    currentState = "idle";
    stateChar.writeValue("idle");
  }
}

// === Microphone ===

void onPDMdata() {
  int bytesAvailable = PDM.available();
  PDM.read(micBuffer, bytesAvailable);
  micDataReady = true;
}

void updateNoiseLevel() {
  if (!micDataReady) return;
  micDataReady = false;
  
  // Calculate RMS amplitude
  long sum = 0;
  for (int i = 0; i < MIC_BUFFER_SIZE; i++) {
    sum += abs(micBuffer[i]);
  }
  float avg = (float)sum / MIC_BUFFER_SIZE;
  
  // Smooth the noise level
  noiseLevel = noiseLevel * 0.7 + avg * 0.3;
  
  // Notify if significant change
  noiseChar.writeValue(noiseLevel);
  
  if (noiseLevel > NOISE_THRESHOLD) {
    Serial.print("LOUD: ");
    Serial.println(noiseLevel);
  }
}

// === IMU (Shake Detection) ===

void checkForShake() {
  float ax, ay, az;
  
  if (IMU.accelerationAvailable()) {
    IMU.readAcceleration(ax, ay, az);
    
    // Calculate total acceleration magnitude
    float magnitude = sqrt(ax * ax + ay * ay + az * az);
    
    // Detect shake (acceleration significantly above 1g)
    bool isShaking = magnitude > SHAKE_THRESHOLD;
    
    if (isShaking != shakeDetected) {
      shakeDetected = isShaking;
      shakeChar.writeValue(shakeDetected);
      if (shakeDetected) {
        Serial.println("SHAKE DETECTED!");
      }
    }
  }
}

// === Person Detection (Simulated) ===

void updatePersonDetection() {
  // TODO: Replace with actual TFLite person_detect model when camera is configured
  // For now, use a combination of noise + shake as a proxy for "someone is nearby"
  
  // Heuristic: if noise is above threshold, someone is probably there
  bool detected = noiseLevel > (NOISE_THRESHOLD * 0.5);
  
  if (detected != personDetected) {
    personDetected = detected;
    personChar.writeValue(personDetected);
    Serial.print("Person: ");
    Serial.println(personDetected ? "YES" : "NO");
  }
}

// === State Machine ===

void updateState() {
  String newState;
  bool audienceReacting = noiseLevel > NOISE_THRESHOLD;
  
  if (suspicionLevel < 0.3) {
    if (personDetected && audienceReacting) {
      newState = "aware";         // Knows someone is watching
    } else if (personDetected) {
      newState = "calm_observe";  // Person there, nothing alarming
    } else {
      newState = "idle";          // Alone, relaxed
    }
  }
  else if (suspicionLevel < 0.6) {
    if (audienceReacting) {
      newState = "alert_crowd";   // Crowd reacting + medium suspicion
    } else if (personDetected) {
      newState = "watching";      // Quietly observing
    } else {
      newState = "uneasy";        // Suspicious but nothing to look at
    }
  }
  else if (suspicionLevel < 0.8) {
    if (shakeDetected) {
      newState = "tampered";      // Someone touching/shaking it!
    } else if (audienceReacting) {
      newState = "crowd_alarm";   // Loud crowd + high suspicion
    } else if (personDetected) {
      newState = "locked_on";     // Staring (conceptually)
    } else {
      newState = "paranoid";      // High suspicion, can't see anyone
    }
  }
  else {  // Critical: 0.8-1.0
    if (shakeDetected) {
      newState = "panic_tamper";  // Physical interference at critical!
    } else if (audienceReacting) {
      newState = "meltdown";     // Everything is alarming
    } else {
      newState = "existential_crisis"; // Peak crisis state
    }
  }
  
  if (newState != currentState) {
    currentState = newState;
    stateChar.writeValue(currentState);
    Serial.print("State: ");
    Serial.println(currentState);
  }
}
