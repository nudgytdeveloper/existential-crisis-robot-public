import { NextRequest, NextResponse } from "next/server";

/**
 * TTS proxy endpoint.
 * Attempts to call local Kokoro TTS server. If unavailable, returns
 * the text back so the client can fall back to Web Speech API.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text: string = body.text || "";
    const voice: string = body.voice || "af_heart";
    const speed: number = body.speed || 0.9;

    if (!text.trim()) {
      return NextResponse.json({ error: "No text provided", fallback: true });
    }

    // Try local TTS server
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch("http://localhost:5050/tts/base64", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice, speed }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({ audio: data.audio || data, fallback: false });
      }
    } catch {
      clearTimeout(timeout);
    }

    // TTS server not available — signal client to use browser speech
    return NextResponse.json({ text, fallback: true });
  } catch {
    return NextResponse.json({ text: "", fallback: true });
  }
}
