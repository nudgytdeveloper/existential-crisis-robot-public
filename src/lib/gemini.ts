export async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not set");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] },
        ],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 2000,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

/**
 * Safely parse JSON from Gemini output.
 * Handles: markdown fences, unescaped newlines in strings, trailing commas.
 */
export function parseGeminiJSON<T>(raw: string): T {
  // Strip markdown code fences if present
  let cleaned = raw
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // continue to repair
  }

  // Extract the first { ... } block
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error(`No JSON object found in: ${raw.slice(0, 200)}`);
  }
  cleaned = cleaned.slice(start, end + 1);

  // Replace literal newlines/tabs inside the string (common Gemini issue)
  cleaned = cleaned.replace(/[\x00-\x1f]/g, (ch) => {
    if (ch === "\n") return "\\n";
    if (ch === "\r") return "\\r";
    if (ch === "\t") return "\\t";
    return " ";
  });

  // Fix trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");

  try {
    return JSON.parse(cleaned) as T;
  } catch (e) {
    throw new Error(
      `Failed to parse Gemini JSON after repair: ${e instanceof Error ? e.message : e}\nRaw: ${raw.slice(0, 300)}`
    );
  }
}
