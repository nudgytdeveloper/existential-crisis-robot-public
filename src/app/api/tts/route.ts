import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text: string = body.text;
    const voice: string = body.voice || "af_heart";
    const speed: number = body.speed || 0.9;

    const response = await fetch("http://localhost:5050/tts/base64", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice, speed }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "TTS server not running", text },
        { status: 200 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "TTS server not available", text: "" },
      { status: 200 }
    );
  }
}
