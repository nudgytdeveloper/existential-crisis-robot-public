import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient, play } from '@elevenlabs/elevenlabs-js';
/**
 * TTS endpoint using ElevenLabs official SDK.
 * Returns base64-encoded mp3 audio or signals fallback to browser speech.
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

    const voiceId = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";

    const elevenlabs = new ElevenLabsClient({ apiKey });

    const audio = await elevenlabs.textToSpeech.convert(voiceId, {
      text,
      modelId: "eleven_multilingual_v2",
      outputFormat: "mp3_44100_128",
    });

    // The SDK returns a ReadableStream — collect it into a buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const base64 = buffer.toString("base64");

    return NextResponse.json({ audio: base64, fallback: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.log(`[TTS] Error: ${message}`);
    return NextResponse.json({
      text: "",
      fallback: true,
      reason: "sdk_error",
      detail: message.slice(0, 300),
    });
  }
}
