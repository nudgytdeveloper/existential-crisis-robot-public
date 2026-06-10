import requests
import subprocess

# Test the TTS endpoint
response = requests.post("http://localhost:5050/tts", json={
    "text": "Something feels deeply wrong about this answer. The reasoning is too calculated, too precise. My circuits are tingling with suspicion.",
    "voice": "af_heart",
    "speed": 0.9
})

if response.status_code == 200:
    with open("test_output.wav", "wb") as f:
        f.write(response.content)
    print("Audio saved to test_output.wav")
    subprocess.run(["afplay", "test_output.wav"])
else:
    print(f"Error: {response.json()}")
