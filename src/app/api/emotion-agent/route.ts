import { NextRequest, NextResponse } from "next/server";
import type { EmotionState, BatchResult } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body: BatchResult = await req.json();
  const score = body.score.percentage;

  let emotion: EmotionState;

  if (score <= 20) {
    emotion = { emotion: "devastated", intensity: 0.95, reasoning: "Failed almost every question", trend: "declining" };
  } else if (score <= 40) {
    emotion = { emotion: "sad", intensity: 0.7, reasoning: "Score is very low", trend: "stable" };
  } else if (score <= 60) {
    emotion = { emotion: "anxious", intensity: 0.5, reasoning: "Average performance, worried about PSLE", trend: "stable" };
  } else {
    emotion = { emotion: "hopeful", intensity: 0.4, reasoning: "Did better than expected", trend: "improving" };
  }

  // Stub — real implementation would call an LLM
  return NextResponse.json(emotion);
}
