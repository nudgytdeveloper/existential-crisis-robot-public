import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  // TODO: accept a PDF, extract text with pdf-parse, return structured content
  return new Response(JSON.stringify({ message: "parse-pdf route" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
