# Hardware Setup: Physical Agent 2 (Intuition Robot)

## Concept
The robot physically embodies Agent 2 (the Intuition Agent). When suspicion is high, it turns toward whoever is watching. When low, it relaxes/looks away. The camera detects people, and the robot's physical behavior reflects its emotional state.

---

## Hardware Inventory

| Component | Purpose |
|-----------|---------|
| Arduino Nano 33 BLE Sense Lite | Main brain + BLE communication |
| OV7675 Camera Module (or similar) | Detects people in frame |
| Arduino ML Shield (Tiny ML) | Runs person detection model |
| Lafvin Tank Robot chassis + motors | Physical movement |
| Motor driver (L298N or existing shield) | Drives tank treads/wheels |
| Speaker + DFPlayer Mini (optional) | Audio output |

---

## Step 1: Camera Module Wiring

The OV7675 camera connects to the Nano 33 BLE Sense Lite via the Arduino ML Shield (Vision Shield).

**If using the Arduino Vision Shield (plug-and-play):**
- Just stack the Vision Shield on top of the Nano 33 BLE Sense Lite
- Camera is already wired via the shield's connector
- No extra wires needed

**If using a standalone OV7675 module:**

| Camera Pin | Nano 33 BLE Pin | Notes |
|-----------|-----------------|-------|
| SDA       | A4 (SDA)        | I2C data |
| SCL       | A5 (SCL)        | I2C clock |
| VS (VSYNC)| D8              | Vertical sync |
| HS (HREF) | A1              | Horizontal ref |
| PCLK      | A0              | Pixel clock |
| XCLK      | D9              | External clock (output from Nano) |
| D0-D7     | D0-D7           | Parallel data bus |
| RESET     | D10 (or 3.3V)   | Active low reset |
| PWDN      | GND             | Power down (active high, pull low) |
| 3.3V      | 3.3V            | Power (NOT 5V!) |
| GND       | GND             | Ground |

⚠️ **CRITICAL: The OV7675 is 3.3V only. Do NOT connect to 5V.**

---

## Step 2: Motor Control Wiring

To make the tank turn toward/away from people, connect motors to the Lafvin board:

**Option A: Use the Lafvin tank's existing motor driver**
- The Lafvin board drives the tank motors directly
- Connect Nano 33 BLE to Lafvin board via serial (TX/RX) to send movement commands
- Lafvin handles motor PWM

**Option B: Direct motor driver (L298N) from Nano 33 BLE**

| L298N Pin | Nano 33 BLE Pin | Notes |
|-----------|-----------------|-------|
| IN1       | D2              | Motor A direction |
| IN2       | D3              | Motor A direction |
| IN3       | D4              | Motor B direction |
| IN4       | D5              | Motor B direction |
| ENA       | D6 (PWM)        | Motor A speed |
| ENB       | D7 (PWM)        | Motor B speed |
| 12V       | Battery +       | Motor power (7-12V) |
| GND       | Common GND      | Shared ground with Nano |
| 5V        | —               | L298N's onboard regulator (don't connect to Nano) |

---

## Step 3: Install Arduino Libraries

In Arduino IDE, install these libraries:

1. **Arduino_OV767X** — Camera driver
   - Sketch → Include Library → Manage Libraries → search "OV767X"
   
2. **Arduino_LSM9DS1** — IMU sensor (onboard)
   - Already included with Nano 33 BLE board package

3. **ArduinoBLE** — Bluetooth Low Energy
   - Sketch → Include Library → Manage Libraries → search "ArduinoBLE"

4. **TensorFlowLite (Arduino)** — For ML inference
   - Sketch → Include Library → Manage Libraries → search "Arduino_TensorFlowLite"

---

## Step 4: Board Configuration in Arduino IDE

1. Go to **Tools → Board → Board Manager**
2. Search "Arduino Mbed OS Nano Boards"
3. Install it (this includes Nano 33 BLE support)
4. Select **Tools → Board → Arduino Mbed OS Nano Boards → Arduino Nano 33 BLE**
5. Select your port under **Tools → Port**

---

## Step 5: Deploy Person Detection Model

**Option A: Use the built-in TensorFlow person detection example**
1. File → Examples → Arduino_TensorFlowLite → person_detection
2. This includes a pre-trained model that detects whether a person is in frame
3. Output: confidence score 0-255 (person / no person)

**Option B: Train a custom model on Edge Impulse**
1. Go to [edgeimpulse.com](https://edgeimpulse.com)
2. Create project → Image Classification
3. Collect images: "person looking" vs "no person" vs "person far away"
4. Train model → Deploy → Arduino library
5. Import the .zip library into Arduino IDE

---

## Step 6: Communication Flow

```
Web App (suspicion_level changes)
    ↓ BLE characteristic write (from laptop)
Nano 33 BLE Sense Lite
    ↓ reads suspicion_level
    ↓ reads camera (person detected? where?)
    ↓ combines: high suspicion + person detected = TURN TOWARD
    ↓ low suspicion OR no person = IDLE/LOOK AWAY
Motor Driver
    ↓
Tank motors (turn left/right/stop)
```

---

## Step 7: BLE Service Design

The Nano 33 BLE exposes a BLE service that the Python bridge writes to:

```
Service UUID: 19B10000-E8F2-537E-4F6C-D104768A1214
Characteristics:
  - Suspicion Level (write): float 0.0 - 1.0
  - Emotion (write): string "suspicious", "trusting", etc.
  - Action (write): string "stare", "relax", "alert"
  - Person Detected (read/notify): bool
  - Robot State (read/notify): string "idle", "tracking", "staring"
```

---

## Step 8: Physical Behavior Map

| Suspicion Level | Person Detected | Robot Behavior |
|----------------|-----------------|----------------|
| 0.0 - 0.3     | No              | Idle, motors off |
| 0.0 - 0.3     | Yes             | Gentle pan, calm |
| 0.3 - 0.6     | No              | Slow scan left/right |
| 0.3 - 0.6     | Yes             | Track person, medium speed |
| 0.6 - 0.8     | No              | Aggressive scanning |
| 0.6 - 0.8     | Yes             | Lock on, move toward person |
| 0.8 - 1.0     | No              | Erratic movement (panicking) |
| 0.8 - 1.0     | Yes             | Full speed toward person, "stare down" |

---

## Step 9: Power

- Nano 33 BLE: powered via USB (from laptop) or battery pack (3.7V LiPo + regulator)
- Motors: separate battery (7-12V for tank motors via L298N)
- DFPlayer (if used): 5V from L298N's 5V output or separate supply

**IMPORTANT: Common GND** — all boards must share a ground connection.

---

## Assembly Order

1. Stack ML Shield / Vision Shield onto Nano 33 BLE Sense Lite
2. Connect camera module to shield
3. Wire motor driver (L298N or Lafvin's built-in)
4. Connect motors from tank chassis
5. Wire power (USB for Nano, battery for motors)
6. Upload sketch
7. Start Python bridge with BLE support
8. Test: run a round in the web app → watch robot react

---

## Quick Test (Before Full Integration)

Upload the person detection example first to verify camera works:
```
File → Examples → Arduino_TensorFlowLite → person_detection
```
Open Serial Monitor (115200 baud). Point camera at yourself. Should see confidence scores change.
