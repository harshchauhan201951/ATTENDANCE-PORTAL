import { NextResponse } from "next/server";
import { allowSaathiRequest, isSameOriginRequest, readStudentSession } from "../../../../../lib/server/student-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ success: false, error: "Request origin could not be verified." }, { status: 403 });
  const session = readStudentSession(request);
  if (!session) return NextResponse.json({ success: false, error: "Sign in again to use voice input." }, { status: 401 });
  if (!allowSaathiRequest(`transcribe:${session.studentId}`, 6)) return NextResponse.json({ success: false, error: "Please wait before recording again." }, { status: 429 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ success: false, error: "AI voice is not configured yet. The academy administrator must add OPENAI_API_KEY." }, { status: 503 });

  try {
    const form = await request.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File) || !audio.size || audio.size > 10 * 1024 * 1024 || !audio.type.startsWith("audio/")) {
      return NextResponse.json({ success: false, error: "Record a short audio question (up to 10 MB) and try again." }, { status: 400 });
    }
    const upstreamForm = new FormData();
    upstreamForm.set("file", audio, audio.name || "saathi-question.webm");
    upstreamForm.set("model", process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe");
    upstreamForm.set("prompt", "RACER Academy school question in Hindi, Hinglish, or English. Keep the student's original language.");
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: upstreamForm,
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return NextResponse.json({ success: false, error: "Voice could not be transcribed. Please type the question or record again." }, { status: response.status === 429 ? 429 : 502 });
    const result = await response.json() as { text?: unknown };
    const text = typeof result.text === "string" ? result.text.trim().slice(0, 1_500) : "";
    if (!text) return NextResponse.json({ success: false, error: "I could not hear a question. Please try again." }, { status: 422 });
    return NextResponse.json({ success: true, text, audioSaved: false }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: "Voice input failed. Please type your question or try again." }, { status: 502 });
  }
}
