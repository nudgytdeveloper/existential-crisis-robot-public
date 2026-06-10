# Complete Setup Guide: Existential Crisis Robot

## What You Need

| Item | Purpose |
|------|---------|
| Arduino Nano 33 BLE Sense Lite | Main board (BLE + mic + IMU) |
| Arduino ML Shield (Tiny ML Kit) | Camera mount + passthrough |
| OV7675 Camera Module | Person detection (comes with ML Kit) |
| USB Micro cable | Power + uploading sketch |
| Laptop (Windows) | Runs web app + Python bridge |
| Google API key | Gemini AI for agents |
| ElevenLabs API key | Text-to-speech (optional) |

No servos, no motors, no extra wiring needed.

---

## Step 1: Arduino IDE Setup

### 1.1 Install Arduino IDE
- Download from [arduino.cc/en/software](https://www.arduino.cc/en/software)
- Install and open it

### 1.2 Install Board Package
1. Go to **Tools → Board → Boards Manager**
2. Search: `Arduino Mbed OS Nano Boards`
3. Click **Install** (this takes a few minutes)
4. Once done, go to **Tools → Board** and select:
   ```
   Arduino Mbed OS Nano Boards → Arduino Nano 33 BLE
   ```

### 1.3 Install Required Libraries
Go to **Sketch → Include Library → Manage Libraries** and install these one by one:

| Library | Search term | Purpose |
|---------|-------------|---------|
| ArduinoBLE | `ArduinoBLE` | Bluetooth communication |
| Arduino_LSM9DS1 | `LSM9DS1` | IMU (accelerometer/gyro) |
| PDM | (pre-installed) | Microphone |

### 1.4 Connect the Board
1. Stack the ML Shield onto the Nano 33 BLE Sense Lite (if not already assembled)
2. Plug the OV7675 camera into the ML Shield's camera connector (ribbon cable, contacts facing down)
3. Connect USB cable from board to your laptop
4. In Arduino IDE: **Tools → Port** → select the COM port that appeared (e.g., COM5)

### 1.5 Upload the Sketch
1. Open `arduino/intuition_robot/intuition_robot.ino` in Arduino IDE
2. Click the **Upload** button (→ arrow)
3. Wait for "Done uploading"
4. Open **Tools → Serial Monitor**, set baud to **115200**
5. You should see: `CrisisRobot ready. Waiting for BLE connection...`

✅ **Arduino is ready.**

---

## Step 2: Python BLE Bridge Setup

### 2.1 Install Python (if not already)
- Download Python 3.10+ from [python.org](https://www.python.org/downloads/)
- During install, check "Add Python to PATH"

### 2.2 Install Dependencies
Open a terminal (Command Prompt or PowerShell):

```bash
cd existential-crisis-robot-public\bridge
pip install websockets bleak
```

### 2.3 Run the Bridge
```bash
python ble_bridge.py
```

You should see:
```
[BLE] Scanning for CrisisRobot...
[BLE] Found robot: CrisisRobot (XX:XX:XX:XX:XX:XX)
[BLE] Connected to robot at XX:XX:XX:XX:XX:XX
[WS] Starting server on ws://localhost:8765
[Bridge] Ready! Waiting for web app connection...
```

If it says "Robot not found":
- Make sure the Arduino is powered on and running the sketch
- Make sure Bluetooth is enabled on your laptop
- Make sure no other app (like nRF Connect) is already connected to the robot

✅ **Bridge is running.**

---

## Step 3: Web App Setup (Local Development)

### 3.1 Install Node.js
- Download from [nodejs.org](https://nodejs.org/) (LTS version)
- Verify: `node --version` and `npm --version`

### 3.2 Install Dependencies
```bash
cd existential-crisis-robot-public
npm install
```

### 3.3 Create Environment Variables
Create a file called `.env.local` in the project root:

```bash
GOOGLE_API_KEY=your-gemini-api-key-here
ELEVENLABS_API_KEY=your-elevenlabs-api-key-here
ELEVENLABS_VOICE_ID_AGENT1=pNInz6obpgDQGcFmaJgB
ELEVENLABS_VOICE_ID_AGENT2=JBFqnCBsd6RMkjVDRZzb
```

**Where to get the keys:**
- **Google API Key**: Go to [aistudio.google.com](https://aistudio.google.com) → click "Get API Key" → create key
- **ElevenLabs Key**: Go to [elevenlabs.io](https://elevenlabs.io) → Sign up → Profile → API Keys → Create key (make sure "Text to Speech" permission is enabled)
- **Voice IDs**: Go to ElevenLabs Voice Library → pick a voice → the ID is in the URL

### 3.4 Run the Dev Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

✅ **Web app is running.**

---

## Step 4: Connect Everything Together

### 4.1 Start Order
1. **First**: Arduino powered on (USB plugged in, sketch running)
2. **Second**: Python bridge (`python ble_bridge.py`)
3. **Third**: Web app (`npm run dev`, open in browser)

### 4.2 Link Hardware in the UI
1. In the web app, click the **"LINK HW"** button (top right area)
2. It should change to **"LINKED"** (green) — this means browser → WebSocket → Python bridge is connected
3. The bridge is already connected to the Arduino via BLE from step 2

### 4.3 Run a Demo Cycle
1. Click **"EXECUTE CYCLE"**
2. Watch Agent 1 answer → Agent 2 assess → Agent 3 strategize
3. The suspicion level is automatically sent to the Arduino
4. Check the Arduino Serial Monitor — you should see state changes like:
   ```
   Suspicion: 0.45
   State: watching
   ```
5. Make noise near the robot → microphone picks it up → state changes
6. Shake the board → "SHAKE DETECTED!" → state escalates
7. Click **"VOCALIZE"** on Agent 1 or Agent 2 to hear them speak

---

## Step 5: Deploy to Vercel (Production)

### 5.1 Push to GitHub
```bash
git add .
git commit -m "ready for deployment"
git push
```

### 5.2 Connect to Vercel
1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Add environment variables in Settings → Environment Variables:
   - `GOOGLE_API_KEY`
   - `ELEVENLABS_API_KEY`
   - `ELEVENLABS_VOICE_ID_AGENT1`
   - `ELEVENLABS_VOICE_ID_AGENT2`
4. Deploy

### 5.3 Using Hardware with Production URL
The BLE bridge runs locally on your laptop, so:
- Web app (Vercel) is at `https://your-app.vercel.app`
- Bridge still runs on `ws://localhost:8765`
- The "LINK HW" button in the deployed app connects to localhost — this works because WebSocket connections go from your browser (on the laptop) to localhost (also on the laptop)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "BLE init failed!" in Serial Monitor | Make sure you selected "Arduino Nano 33 BLE" as the board, not "Nano 33 IoT" |
| Bridge says "Robot not found" | Close any other BLE apps. Power cycle the Arduino. Make sure laptop Bluetooth is on. |
| "LINK HW" stays gray | Bridge isn't running, or port 8765 is blocked. Check `python ble_bridge.py` is active. |
| Gemini 403 error | API key missing or invalid. Check `.env.local` exists with correct key. |
| ElevenLabs falls back to browser speech | API key missing "text_to_speech" permission. Regenerate key with full permissions. |
| No sound from VOCALIZE | Check browser isn't muting the tab. Try clicking the page first (browser audio policy). |
| IMU/mic not working | Make sure you installed "Arduino Mbed OS Nano Boards" not the older "Arduino nRF528x" package. |

---

## What the Robot Does (Summary)

The robot is Agent 2's physical body. It doesn't move — it **senses**:

| Sensor | What It Reports | Effect on Dashboard |
|--------|----------------|-------------------|
| Microphone | Noise level (audience reactions) | Amplifies suspicion when crowd is loud |
| IMU | Shake detection (physical tampering) | Triggers "tampered" or "panic" state |
| Camera (future) | Person count | "N observers detected" |
| BLE | Receives suspicion from web app | Determines overall state |

States visible in Serial Monitor and sent to web app:
- `idle` → `aware` → `watching` → `locked_on` → `paranoid` → `existential_crisis`
