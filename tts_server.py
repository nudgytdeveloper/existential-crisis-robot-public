import os
import io
import base64
import json
import time
from flask import Flask, request, jsonify, send_file
from flask_socketio import SocketIO, emit
from kokoro_onnx import Kokoro
import soundfile as sf
import numpy as np

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Load Kokoro TTS model once at startup
print("Loading Kokoro TTS model...")
kokoro = Kokoro("kokoro-v1.0.onnx", "voices-v1.0.bin")
print("Kokoro loaded!")

# Track connected Arduino clients
connected_clients = set()


# ============ TTS ENDPOINT ============

@app.route("/tts", methods=["POST"])
def generate_speech():
    """Agent 2 sends its existential monologue text here.
    Returns audio file AND sends it to Arduino via WebSocket.

    Input JSON:
    {
        "text": "Something feels deeply wrong about this answer...",
        "voice": "af_heart",  (optional, default af_heart)
        "speed": 0.9           (optional, default 0.9)
    }

    Returns: WAV audio file
    """
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "Missing 'text' field"}), 400

    text = data["text"]
    voice = data.get("voice", "af_heart")
    speed = data.get("speed", 0.9)

    print(f"[TTS] Generating speech: '{text[:50]}...'")
    start = time.time()

    # Generate audio with Kokoro
    audio, sample_rate = kokoro.create(text, voice=voice, speed=speed)

    elapsed = time.time() - start
    print(f"[TTS] Generated in {elapsed:.2f}s")

    # Save to buffer
    audio_buffer = io.BytesIO()
    sf.write(audio_buffer, audio, sample_rate, format="WAV")
    audio_buffer.seek(0)

    # Also save to file for debugging
    sf.write("latest_agent2_speech.wav", audio, sample_rate)

    # Send audio to Arduino via WebSocket
    audio_buffer_copy = io.BytesIO()
    sf.write(audio_buffer_copy, audio, sample_rate, format="WAV")
    audio_base64 = base64.b64encode(audio_buffer_copy.getvalue()).decode("utf-8")

    socketio.emit("play_audio", {
        "audio_base64": audio_base64,
        "text": text,
        "sample_rate": sample_rate,
        "duration": len(audio) / sample_rate
    })

    print(f"[WebSocket] Sent audio to {len(connected_clients)} connected clients")

    # Return audio file
    audio_buffer.seek(0)
    return send_file(audio_buffer, mimetype="audio/wav", download_name="agent2_speech.wav")


@app.route("/tts/base64", methods=["POST"])
def generate_speech_base64():
    """Same as /tts but returns base64 encoded audio instead of file.
    Easier for Vercel frontend to handle."""
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "Missing 'text' field"}), 400

    text = data["text"]
    voice = data.get("voice", "af_heart")
    speed = data.get("speed", 0.9)

    audio, sample_rate = kokoro.create(text, voice=voice, speed=speed)

    audio_buffer = io.BytesIO()
    sf.write(audio_buffer, audio, sample_rate, format="WAV")
    audio_base64 = base64.b64encode(audio_buffer.getvalue()).decode("utf-8")

    # Also send to Arduino
    socketio.emit("play_audio", {
        "audio_base64": audio_base64,
        "text": text,
        "sample_rate": sample_rate,
        "duration": len(audio) / sample_rate
    })

    return jsonify({
        "audio_base64": audio_base64,
        "text": text,
        "duration": len(audio) / sample_rate,
        "sample_rate": sample_rate
    })


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "tts_model": "kokoro-v1.0",
        "connected_arduino_clients": len(connected_clients)
    })


# ============ WEBSOCKET FOR ARDUINO ============

@socketio.on("connect")
def handle_connect():
    connected_clients.add(request.sid)
    print(f"[WebSocket] Client connected: {request.sid} (total: {len(connected_clients)})")
    emit("server_message", {"message": "Connected to TTS server"})


@socketio.on("disconnect")
def handle_disconnect():
    connected_clients.discard(request.sid)
    print(f"[WebSocket] Client disconnected: {request.sid} (total: {len(connected_clients)})")


@socketio.on("arduino_ready")
def handle_arduino_ready(data):
    print(f"[Arduino] Device ready: {data}")
    emit("server_message", {"message": "Arduino registered with TTS server"})


# ============ RUN SERVER ============

if __name__ == "__main__":
    print("=" * 50)
    print("TTS + WebSocket Server for Agent 2")
    print("TTS endpoint: http://localhost:5050/tts")
    print("WebSocket: ws://localhost:5050")
    print("Health: http://localhost:5050/health")
    print("=" * 50)
    socketio.run(app, host="0.0.0.0", port=5050, debug=False)
