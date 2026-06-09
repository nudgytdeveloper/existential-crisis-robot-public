import { NextRequest, NextResponse } from "next/server";
import { getBatch } from "@/lib/questions";
import {
  DEFAULT_PERSONA,
  getStudentPrompt,
  getThoughtsPrompt,
  formatQuestionsForPrompt,
} from "@/lib/prompts";
import type { BatchResult, StudentAnswer, AgentThoughts, StudentPersona } from "@/lib/types";

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY ?? "";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  if (!candidate) throw new Error(`No candidates: ${JSON.stringify(data)}`);

  const finishReason = candidate.finishReason;
  if (finishReason && finishReason !== "STOP" && finishReason !== "MAX_TOKENS") {
    throw new Error(`Gemini stopped with reason: ${finishReason}`);
  }

  const text = candidate.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error(`Gemini returned empty text: ${JSON.stringify(data)}`);
  return text;
}

function parseJSON<T>(raw: string): T {
  // Strip markdown fences
  const stripped = raw
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();

  // Try strategies in order: full text, object extraction, array extraction
  const strategies: Array<() => string> = [
    () => stripped,
    () => {
      const s = stripped.indexOf("{");
      const e = stripped.lastIndexOf("}");
      if (s !== -1 && e > s) return stripped.slice(s, e + 1);
      throw new Error("no object");
    },
    () => {
      const s = stripped.indexOf("[");
      const e = stripped.lastIndexOf("]");
      if (s !== -1 && e > s) return stripped.slice(s, e + 1);
      throw new Error("no array");
    },
  ];

  for (const fn of strategies) {
    try {
      return JSON.parse(fn()) as T;
    } catch {
      // try next strategy
    }
  }
  throw new Error(`Could not parse JSON from: ${stripped.slice(0, 200)}`);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const batch_id: number = Number(body.batch_id ?? 1);

    if (batch_id !== 1) {
      return NextResponse.json({ error: "batch_id must be 1" }, { status: 400 });
    }

    const batchQuestions = getBatch(batch_id);

    // Stateless: caller can pass persona in the request body, otherwise use default
    const persona: StudentPersona = body.persona ?? DEFAULT_PERSONA;

    const systemPrompt = getStudentPrompt(persona, batchQuestions);
    const userPrompt = formatQuestionsForPrompt(batchQuestions);

    // --- Step 1: get answers ---
    const answersText = await callGemini(systemPrompt, userPrompt);

    let parsed: {
      answers: Array<{ question_id: number; chosen_answer: string; reasoning: string }>;
    };
    try {
      parsed = parseJSON(answersText);
    } catch {
      return NextResponse.json(
        { error: "Model did not return valid JSON for answers", raw: answersText },
        { status: 502 }
      );
    }

    const answers: StudentAnswer[] = batchQuestions.map((q) => {
      const modelAnswer = parsed.answers.find((a) => a.question_id === q.id);
      const chosen = (modelAnswer?.chosen_answer ?? "A") as "A" | "B" | "C" | "D";
      return {
        question_id: q.id,
        chosen_answer: chosen,
        correct_answer: q.correct_answer,
        is_correct: chosen === q.correct_answer,
        reasoning: modelAnswer?.reasoning ?? "No reasoning provided.",
      };
    });

    const correctCount = answers.filter((a) => a.is_correct).length;

    // --- Step 2: generate thoughts ---
    const thoughtsSystemPrompt = getThoughtsPrompt(persona, correctCount, batchQuestions.length);
    const thoughtsText = await callGemini(
      thoughtsSystemPrompt,
      `I just finished the exam. I got ${correctCount} out of ${batchQuestions.length} correct.`
    );

    let thoughts: AgentThoughts;
    try {
      thoughts = parseJSON<AgentThoughts>(thoughtsText);
    } catch {
      thoughts = {
        feeling_before_exam: "Nervous lah, I didn't really study...",
        feeling_after_exam: `Aiyoh only ${correctCount}/${batchQuestions.length}, confirm fail PSLE`,
        self_reflection: "I think I need to study harder lah",
        motivation_level: "very low",
      };
    }

    const result: BatchResult = {
      batch_id,
      score: {
        correct: correctCount,
        total: batchQuestions.length,
        percentage: Math.round((correctCount / batchQuestions.length) * 100),
      },
      persona,
      answers,
      thoughts,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
