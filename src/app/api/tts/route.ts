import { NextRequest, NextResponse } from "next/server";

/**
 * TTS endpoint using ElevenLabs API.
 * Returns base64-encoded audio or signals fallback to browser speech.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text: string = body.text || "";

    if (!text.trim()) {
      return NextResponse.json({ error: "No text provided", fallback: true });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.log("[TTS] No ELEVENLABS_API_KEY found in environment");
      return NextResponse.json({ text, fallback: true, reason: "no_api_key" });
    }

    // Default voice: "Rachel" — change via ELEVENLABS_VOICE_ID env var
    const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

    const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const response = await fetch(elevenLabsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.8,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`[TTS] ElevenLabs error (${response.status}): ${errorText}`);
      return NextResponse.json({
        text,
        fallback: true,
        reason: `elevenlabs_error_${response.status}`,
        detail: errorText.slice(0, 200),
      });
    }

    // Convert audio buffer to base64
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return NextResponse.json({ audio: base64, fallback: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.log(`[TTS] Exception: ${message}`);
    return NextResponse.json({ text: "", fallback: true, reason: "exception", detail: message });
  }
}
