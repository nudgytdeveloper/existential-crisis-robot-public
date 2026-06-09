import { NextRequest, NextResponse } from "next/server";
import type { EmotionState, StudentPersona } from "@/lib/types";
import { DEFAULT_PERSONA } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  const emotion: EmotionState = await req.json();

  // Stub — real implementation would use LLM to adapt the persona
  const motivationBoost = emotion.trend === "improving" ? 0.15 : 0.05;
  const updatedPersona: StudentPersona = {
    ...DEFAULT_PERSONA,
    motivation: Math.min(1, DEFAULT_PERSONA.motivation + motivationBoost),
    confidence: Math.min(1, DEFAULT_PERSONA.confidence + 0.05),
  };

  return NextResponse.json({
    updated_persona: updatedPersona,
    message: `Motivation boosted to ${updatedPersona.motivation.toFixed(2)} based on ${emotion.emotion} state.`,
  });
}
