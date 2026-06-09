import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_PERSONA } from "@/lib/prompts";
import type { StudentPersona } from "@/lib/types";

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
          temperature: 0.7,
          maxOutputTokens: 1000,
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
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error(`Gemini returned empty text: ${JSON.stringify(data)}`);
  return text;
}

/**
 * POST /api/improve-persona
 *
 * Stateless endpoint. Caller must pass the current persona.
 *
 * Body:
 * {
 *   "current_persona": StudentPersona,   // optional, defaults to DEFAULT_PERSONA
 *   "instructions": string               // natural-language instructions from Agent 3
 * }
 *
 * Returns: { updated_persona: StudentPersona, changes_applied: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const instructions: string = body.instructions;

    if (!instructions || typeof instructions !== "string") {
      return NextResponse.json(
        { error: "instructions field is required and must be a string" },
        { status: 400 }
      );
    }

    // Stateless: caller must pass current_persona, fall back to default
    const basePersona: StudentPersona = body.current_persona ?? DEFAULT_PERSONA;

    const systemPrompt = `You are a learning adaptation engine. You receive a student persona and natural-language instructions from a teacher/coach agent. You must update the persona according to the instructions.

RULES:
- accuracy_target must stay between 0.0 and 1.0
- confidence and motivation must stay between 0.0 and 1.0
- If instructions say to "increase motivation", add ~0.2 to motivation (max 1.0)
- If instructions say to "decrease motivation", subtract ~0.2 from motivation (min 0.0)  
- If instructions say to "increase accuracy" or "improve", bump accuracy_target by ~0.2 (max 1.0)
- If instructions say "focus on <topic>", remove that topic from the weakness array
- If instructions say "add weakness <topic>", add that topic to the weakness array
- Reflect instruction intent faithfully even for edge cases
- Respond ONLY with valid JSON, no markdown, no extra text

Return this exact structure:
{"updated_persona":{"name":"...","weakness":[...],"confidence":0.0,"motivation":0.0,"accuracy_target":0.0,"personality_traits":[...]},"changes_applied":["description of change 1"]}`;

    const userPrompt = `Current persona: ${JSON.stringify(basePersona, null, 2)}

Instructions from Agent 3: "${instructions}"

Apply the instructions and return the updated persona.`;

    const text = await callGemini(systemPrompt, userPrompt);

    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: { updated_persona: StudentPersona; changes_applied: string[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback: apply simple rule-based updates if LLM returns bad JSON
      parsed = applyRuleBasedUpdate(basePersona, instructions);
    }

    // Clamp numeric fields to [0, 1]
    const updated = clampPersona(parsed.updated_persona);

    return NextResponse.json({
      updated_persona: updated,
      changes_applied: parsed.changes_applied ?? ["Persona updated based on instructions"],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function applyRuleBasedUpdate(
  persona: StudentPersona,
  instructions: string
): { updated_persona: StudentPersona; changes_applied: string[] } {
  const updated = { ...persona, weakness: [...persona.weakness] };
  const changes: string[] = [];
  const lower = instructions.toLowerCase();

  if (lower.includes("increase motivation") || lower.includes("boost motivation")) {
    updated.motivation = Math.min(1, updated.motivation + 0.2);
    changes.push(`motivation increased to ${updated.motivation.toFixed(2)}`);
  }
  if (lower.includes("decrease motivation") || lower.includes("lower motivation")) {
    updated.motivation = Math.max(0, updated.motivation - 0.2);
    changes.push(`motivation decreased to ${updated.motivation.toFixed(2)}`);
  }
  if (lower.includes("increase accuracy") || lower.includes("improve accuracy")) {
    updated.accuracy_target = Math.min(1, updated.accuracy_target + 0.2);
    changes.push(`accuracy_target increased to ${updated.accuracy_target.toFixed(2)}`);
  }
  if (lower.includes("decrease accuracy") || lower.includes("lower accuracy")) {
    updated.accuracy_target = Math.max(0, updated.accuracy_target - 0.1);
    changes.push(`accuracy_target decreased to ${updated.accuracy_target.toFixed(2)}`);
  }

  // "focus on fractions" → remove fractions from weakness
  const focusMatch = lower.match(/focus on (\w+)/);
  if (focusMatch) {
    const topic = focusMatch[1];
    updated.weakness = updated.weakness.filter((w) => !w.toLowerCase().includes(topic));
    changes.push(`removed "${topic}" from weakness array`);
  }

  // "add weakness <topic>"
  const addWeaknessMatch = lower.match(/add weakness[:\s]+(\w+)/);
  if (addWeaknessMatch) {
    const topic = addWeaknessMatch[1];
    if (!updated.weakness.includes(topic)) {
      updated.weakness.push(topic);
      changes.push(`added "${topic}" to weakness array`);
    }
  }

  if (changes.length === 0) {
    changes.push("No recognised instructions — persona unchanged");
  }

  return { updated_persona: updated, changes_applied: changes };
}

function clampPersona(persona: StudentPersona): StudentPersona {
  return {
    ...persona,
    accuracy_target: Math.min(1, Math.max(0, persona.accuracy_target)),
    confidence: Math.min(1, Math.max(0, persona.confidence)),
    motivation: Math.min(1, Math.max(0, persona.motivation)),
  };
}
