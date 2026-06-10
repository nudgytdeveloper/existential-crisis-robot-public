"""
BLE Bridge — Connects web app to Arduino Nano 33 BLE Sense Lite

Bridges WebSocket (from web app) to BLE (to robot).
Sends suspicion_level and emotion state to the robot.
Reads person-detected status back.

Usage:
    pip install websockets bleak
    python ble_bridge.py

Web app connects to: ws://localhost:8765
Robot advertises as: "CrisisRobot"
"""

import asyncio
import json
import struct
from pathlib import Path

import websockets
from bleak import BleakClient, BleakScanner

# BLE UUIDs (must match Arduino sketch)
SERVICE_UUID = "19B10000-E8F2-537E-4F6C-D104768A1214"
SUSPICION_CHAR = "19B10001-E8F2-537E-4F6C-D104768A1214"
EMOTION_CHAR = "19B10002-E8F2-537E-4F6C-D104768A1214"
PERSON_CHAR = "19B10003-E8F2-537E-4F6C-D104768A1214"
STATE_CHAR = "19B10004-E8F2-537E-4F6C-D104768A1214"

# Audio save directory (for DFPlayer if used)
AUDIO_DIR = Path(__file__).parent / "sd_card" / "01"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# Global state
ble_client = None
robot_connected = False
robot_state = "idle"
person_detected = False


async def find_robot():
    """Scan for the CrisisRobot BLE device."""
    print("[BLE] Scanning for CrisisRobot...")
    devices = await BleakScanner.discover(timeout=10.0)
    for device in devices:
        if device.name and "CrisisRobot" in device.name:
            print(f"[BLE] Found robot: {device.name} ({device.address})")
            return device.address
    return None


async def connect_robot():
    """Connect to the robot over BLE."""
    global ble_client, robot_connected

    address = await find_robot()
    if not address:
        print("[BLE] Robot not found. Running in demo mode.")
        return False

    try:
        ble_client = BleakClient(address)
        await ble_client.connect()
        robot_connected = True
        print(f"[BLE] Connected to robot at {address}")

        # Subscribe to notifications
        await ble_client.start_notify(PERSON_CHAR, on_person_notify)
        await ble_client.start_notify(STATE_CHAR, on_state_notify)

        return True
    except Exception as e:
        print(f"[BLE] Connection failed: {e}")
        return False


def on_person_notify(sender, data):
    """Callback when person detection status changes."""
    global person_detected
    person_detected = bool(data[0])
    print(f"[BLE] Person detected: {person_detected}")


def on_state_notify(sender, data):
    """Callback when robot state changes."""
    global robot_state
    robot_state = data.decode("utf-8").rstrip("\x00")
    print(f"[BLE] Robot state: {robot_state}")


async def send_suspicion(level: float):
    """Send suspicion level to robot."""
    if not ble_client or not robot_connected:
        return False
    try:
        data = struct.pack("<f", level)
        await ble_client.write_gatt_char(SUSPICION_CHAR, data)
        return True
    except Exception as e:
        print(f"[BLE] Write error: {e}")
        return False


async def send_emotion(emotion: str):
    """Send emotion string to robot."""
    if not ble_client or not robot_connected:
        return False
    try:
        await ble_client.write_gatt_char(EMOTION_CHAR, emotion.encode()[:32])
        return True
    except Exception as e:
        print(f"[BLE] Write error: {e}")
        return False


async def handle_websocket(websocket):
    """Handle WebSocket messages from the web app."""
    print("[WS] Web app connected")

    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                action = data.get("action", "")

                if action == "update_suspicion":
                    level = float(data.get("level", 0.0))
                    success = await send_suspicion(level)
                    await websocket.send(json.dumps({
                        "status": "ok" if success else "not_connected",
                        "suspicion": level,
                        "robot_connected": robot_connected,
                    }))

                elif action == "update_emotion":
                    emotion = data.get("emotion", "idle")
                    success = await send_emotion(emotion)
                    await websocket.send(json.dumps({
                        "status": "ok" if success else "not_connected",
                        "emotion": emotion,
                    }))

                elif action == "play_audio":
                    # Save audio file for DFPlayer (if robot has one)
                    import base64
                    audio_b64 = data.get("audio", "")
                    if audio_b64:
                        track_num = len(list(AUDIO_DIR.glob("*.mp3"))) + 1
                        filepath = AUDIO_DIR / f"{track_num:03d}.mp3"
                        filepath.write_bytes(base64.b64decode(audio_b64))
                        print(f"[Audio] Saved: {filepath}")

                    await websocket.send(json.dumps({
                        "status": "audio_saved",
                        "robot_connected": robot_connected,
                    }))

                elif action == "get_status":
                    await websocket.send(json.dumps({
                        "status": "ok",
                        "robot_connected": robot_connected,
                        "robot_state": robot_state,
                        "person_detected": person_detected,
                    }))

                elif action == "ping":
                    await websocket.send(json.dumps({
                        "status": "pong",
                        "robot_connected": robot_connected,
                    }))

                else:
                    await websocket.send(json.dumps({
                        "status": "error",
                        "message": f"Unknown action: {action}",
                    }))

            except json.JSONDecodeError:
                await websocket.send(json.dumps({
                    "status": "error",
                    "message": "Invalid JSON",
                }))

    except websockets.exceptions.ConnectionClosed:
        print("[WS] Web app disconnected")


async def main():
    # Try to connect to robot
    await connect_robot()

    # Start WebSocket server
    print("[WS] Starting server on ws://localhost:8765")
    async with websockets.serve(handle_websocket, "localhost", 8765):
        print("[Bridge] Ready! Waiting for web app connection...")
        await asyncio.Future()  # Run forever


if __name__ == "__main__":
    asyncio.run(main())
