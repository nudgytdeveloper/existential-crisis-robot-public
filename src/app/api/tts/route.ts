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
      // No API key — tell client to use browser speech
      return NextResponse.json({ text, fallback: true });
    }

    // Default voice: "Rachel" (21m00Tcm4TlvDq8ikWAM)
    // You can change this to any ElevenLabs voice ID
    const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.8,
            style: 0.5,
          },
        }),
      }
    );

    if (!response.ok) {
      // ElevenLabs failed — fallback to browser speech
      return NextResponse.json({ text, fallback: true });
    }

    // Convert audio buffer to base64
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return NextResponse.json({ audio: base64, fallback: false });
  } catch {
    return NextResponse.json({ text: "", fallback: true });
  }
}
