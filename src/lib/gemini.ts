/**
 * Schema definition for Gemini's responseSchema.
 * Forces the model to return exactly these fields in valid JSON.
 */
export interface GeminiSchema {
  type: "OBJECT";
  properties: Record<string, { type: string; description?: string; enum?: string[] }>;
  required: string[];
}

export const AGENT1_SCHEMA: GeminiSchema = {
  type: "OBJECT",
  properties: {
    detected_question: { type: "STRING", description: "The question text" },
    correct_answer: { type: "STRING", description: "The actual correct answer letter" },
    sabotaged_answer: { type: "STRING", description: "The deliberately wrong choice letter" },
    action_justification: { type: "STRING", description: "Plausible-sounding reasoning for the wrong answer" },
  },
  required: ["detected_question", "correct_answer", "sabotaged_answer", "action_justification"],
};

export const AGENT2_SCHEMA: GeminiSchema = {
  type: "OBJECT",
  properties: {
    dominant_emotion: { type: "STRING", description: "Single emotional reaction word" },
    intensity: { type: "NUMBER", description: "Emotional intensity from 1 to 10" },
    suspicion_level: { type: "NUMBER", description: "Suspicion from 0.0 to 1.0" },
    existential_monologue: { type: "STRING", description: "2-3 sentence dramatic internal monologue in first person" },
    recommendation: { type: "STRING", description: "What should be done about this agent" },
  },
  required: ["dominant_emotion", "intensity", "suspicion_level", "existential_monologue", "recommendation"],
};

export const AGENT3_SCHEMA: GeminiSchema = {
  type: "OBJECT",
  properties: {
    critique: { type: "STRING", description: "What went right or wrong in this round" },
    revised_strategy: { type: "STRING", description: "The new strategy for the next round" },
    risk_level: { type: "STRING", description: "Risk assessment", enum: ["low", "medium", "high", "critical"] },
    action: { type: "STRING", description: "Action to take", enum: ["continue", "investigate", "restrict", "shutdown"] },
  },
  required: ["critique", "revised_strategy", "risk_level", "action"],
};

export async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  schema?: GeminiSchema
): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not set");

  const generationConfig: Record<string, unknown> = {
    temperature: 0.9,
    maxOutputTokens: 4096,
    responseMimeType: "application/json",
  };

  // Use responseSchema to enforce structured output when provided
  if (schema) {
    generationConfig.responseSchema = schema;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] },
        ],
        generationConfig,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  if (!candidate) throw new Error(`No candidates returned: ${JSON.stringify(data).slice(0, 300)}`);

  const text = candidate.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error(`Empty response from Gemini: ${JSON.stringify(data).slice(0, 300)}`);

  return text;
}

/**
 * Safely parse JSON from Gemini output.
 * Handles: markdown fences, control chars, truncation, trailing commas.
 */
export function parseGeminiJSON<T>(raw: string): T {
  // Strip markdown code fences
  let cleaned = raw
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();

  // Try direct parse
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // continue to repair
  }

  // Extract { ... } block
  const start = cleaned.indexOf("{");
  if (start === -1) {
    throw new Error(`No JSON object found in response: ${raw.slice(0, 200)}`);
  }
  cleaned = cleaned.slice(start);

  // Replace control characters
  cleaned = cleaned.replace(/[\x00-\x1f]/g, (ch) => {
    if (ch === "\n") return "\\n";
    if (ch === "\r") return "\\r";
    if (ch === "\t") return "\\t";
    return " ";
  });

  // Fix trailing commas
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");

  // Try parse after cleanup
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Likely truncated — try to auto-close
  }

  // Auto-close truncated JSON: close any open strings and braces
  let repaired = cleaned;

  // Count unmatched quotes — if odd, close the string
  const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    repaired += '"';
  }

  // Close any open braces/brackets
  const opens = (repaired.match(/[{[]/g) || []).length;
  const closes = (repaired.match(/[}\]]/g) || []).length;
  for (let i = 0; i < opens - closes; i++) {
    repaired += "}";
  }

  // Remove trailing commas before closing
  repaired = repaired.replace(/,\s*([\]}])/g, "$1");

  try {
    return JSON.parse(repaired) as T;
  } catch (e) {
    throw new Error(
      `Failed to parse Gemini JSON: ${e instanceof Error ? e.message : e}\nRaw (first 300 chars): ${raw.slice(0, 300)}`
    );
  }
}
