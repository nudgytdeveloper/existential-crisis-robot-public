# Arduino Speaker Setup — Lafvin Tank Robot

## How It Works

```
Web App (VOCALIZE button)
    ↓ WebSocket (ws://localhost:8765)
Python Bridge (laptop)
    ↓ USB Serial (9600 baud)
Lafvin Board (Arduino Uno compatible)
    ↓ SoftwareSerial (pins 2,3)
DFPlayer Mini
    ↓ Audio out
Speaker
```

## Hardware You Need

1. **Lafvin Tank Robot** (with its Arduino Uno board)
2. **DFPlayer Mini** — $2 MP3 player module ([buy](https://www.aliexpress.com/item/32357942498.html))
3. **Micro SD card** — FAT32 formatted, any size
4. **Speaker** — 3W 8Ω (or reuse the tank's speaker if it has one)
5. **1K resistor** — between Arduino TX pin and DFPlayer RX pin

## Wiring

| Arduino Pin | DFPlayer Pin | Notes |
|-------------|-------------|-------|
| Pin 2       | RX          | Through 1K resistor! |
| Pin 3       | TX          | Direct connection |
| 5V          | VCC         | Power |
| GND         | GND         | Ground |
| -           | SPK1        | Speaker + |
| -           | SPK2        | Speaker - |

**Why pins 2,3?** The Lafvin motor shield uses pins 4-7 and 9-13. Pins 2,3 are free.

## SD Card Setup

1. Format micro SD as FAT32
2. Create folder: `/01/`
3. The Python bridge will save MP3 files as `001.mp3`, `002.mp3`, etc.
4. For live demo: the bridge saves files AND tells Arduino to play them

## Running

1. Upload `robot_speaker.ino` to the Lafvin board via Arduino IDE
2. Connect USB cable to laptop
3. Start the Python bridge:
   ```bash
   cd bridge
   pip install websockets pyserial
   python arduino_bridge.py --port COM3
   ```
   (Replace COM3 with your actual port — check Arduino IDE > Tools > Port)
4. Start the web app (`npm run dev`)
5. Click VOCALIZE in the app → audio plays through the robot's speaker

## Without Arduino (Demo Mode)

The bridge runs without Arduino connected. It saves MP3 files to `bridge/sd_card/01/`.
You can manually copy these to the SD card later.

## Troubleshooting

- **No sound:** Check DFPlayer LED (should blink during playback). Check speaker wiring.
- **Bridge can't find port:** Specify manually: `python arduino_bridge.py --port COM5`
- **DFPlayer not responding:** Make sure the 1K resistor is on the TX→RX line.
