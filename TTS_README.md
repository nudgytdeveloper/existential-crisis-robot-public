# TTS + WebSocket Server for Agent 2

## Setup

```bash
pip install kokoro-onnx soundfile numpy flask flask-socketio huggingface-hub
```

## Download model (first time only)

```bash
python3 -c "
from huggingface_hub import hf_hub_download
hf_hub_download('hexgrad/Kokoro-82M-v1.0-ONNX', 'kokoro-v1.0.onnx', local_dir='.')
hf_hub_download('hexgrad/Kokoro-82M-v1.0-ONNX', 'voices-v1.0.bin', local_dir='.')
"
```

## Run the server

```bash
python3 tts_server.py
```

## Test

```bash
python3 test_tts.py
```

## API

### POST /tts

Send text, get WAV audio file back.
Also sends audio to connected Arduino via WebSocket.

Request: `{ "text": "...", "voice": "af_heart", "speed": 0.9 }`
Response: WAV audio file

### POST /tts/base64

Same but returns base64 encoded audio in JSON.

Request: `{ "text": "...", "voice": "af_heart", "speed": 0.9 }`
Response: `{ "audio_base64": "...", "duration": 3.5, "sample_rate": 24000 }`

### GET /health

Check server status and connected Arduino clients.

### WebSocket Events

- `connect`: Arduino connects
- `arduino_ready`: Arduino signals it's ready
- `play_audio`: Server sends audio to Arduino
  Data: `{ "audio_base64": "...", "text": "...", "duration": 3.5 }`

## Architecture

```
Vercel App → POST /tts → Kokoro generates audio → WebSocket → Arduino plays audio
```
