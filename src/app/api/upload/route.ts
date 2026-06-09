import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  // TODO: upload PDF to Vercel Blob and return the URL
  return new Response(JSON.stringify({ message: "upload route" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
