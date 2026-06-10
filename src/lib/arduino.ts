/**
 * Arduino WebSocket client.
 * Connects to the local Python bridge to send audio/suspicion to the Arduino.
 * Browser-only — safely no-ops during SSR.
 */

const WS_URL = "ws://localhost:8765";

let socket: WebSocket | null = null;
let connected = false;
let onStatusChange: ((connected: boolean) => void) | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof WebSocket !== "undefined";
}

export function setArduinoStatusCallback(cb: (connected: boolean) => void) {
  onStatusChange = cb;
}

export function connectArduino(): Promise<boolean> {
  if (!isBrowser()) return Promise.resolve(false);

  return new Promise((resolve) => {
    try {
      socket = new WebSocket(WS_URL);

      socket.onopen = () => {
        connected = true;
        onStatusChange?.(true);
        console.log("[Arduino] WebSocket connected");
        resolve(true);
      };

      socket.onclose = () => {
        connected = false;
        onStatusChange?.(false);
        console.log("[Arduino] WebSocket disconnected");
      };

      socket.onerror = () => {
        connected = false;
        onStatusChange?.(false);
        resolve(false);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("[Arduino] Response:", data);
        } catch {
          console.log("[Arduino] Raw message:", event.data);
        }
      };
    } catch {
      resolve(false);
    }
  });
}

export function disconnectArduino() {
  socket?.close();
  socket = null;
  connected = false;
  onStatusChange?.(false);
}

export function isArduinoConnected(): boolean {
  if (!isBrowser()) return false;
  return connected && socket?.readyState === WebSocket.OPEN;
}

export function sendSuspicionUpdate(level: number, emotion: string): boolean {
  if (!isArduinoConnected() || !socket) return false;

  socket.send(JSON.stringify({
    action: "update_suspicion",
    level: Math.max(0, Math.min(1, level)),
  }));
  socket.send(JSON.stringify({
    action: "update_emotion",
    emotion,
  }));
  return true;
}

export function sendAudioToArduino(audioBase64: string, agent: string): boolean {
  if (!isArduinoConnected() || !socket) return false;

  socket.send(JSON.stringify({
    action: "play_audio",
    audio: audioBase64,
    agent,
  }));
  return true;
}

export function setArduinoVolume(level: number): boolean {
  if (!isArduinoConnected() || !socket) return false;

  socket.send(JSON.stringify({
    action: "volume",
    level: Math.max(0, Math.min(30, level)),
  }));
  return true;
}

export function stopArduino(): boolean {
  if (!isArduinoConnected() || !socket) return false;

  socket.send(JSON.stringify({ action: "stop" }));
  return true;
}

export function pingArduino(): boolean {
  if (!isArduinoConnected() || !socket) return false;

  socket.send(JSON.stringify({ action: "ping" }));
  return true;
}
