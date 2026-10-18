import { NextResponse } from "next/server";
import { allowSaathiRequest, isSameOriginRequest, readStudentSession } from "../../../../../lib/server/student-session";

export const runtime = "nodejs";

const supportedVoices = new Set(["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse", "marin", "cedar"]);

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ success: false, error: "Request origin could not be verified." }, { status: 403 });
  const session = readStudentSession(request);
  if (!session) return NextResponse.json({ success: false, error: "Sign in again to play voice replies." }, { status: 401 });
  if (!allowSaathiRequest(`speech:${session.studentId}`, 12)) return NextResponse.json({ success: false, error: "Please wait before replaying another answer." }, { status: 429 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ success: false, error: "AI voice is not configured yet. The academy administrator must add OPENAI_API_KEY." }, { status: 503 });

  try {
    const body = await request.json() as { text?: unknown; voice?: unknown; speed?: unknown };
    const text = typeof body.text === "string" ? body.text.trim().slice(0, 3_500) : "";
    if (!text) return NextResponse.json({ success: false, error: "There is no answer to play." }, { status: 400 });
    const requestedVoice = typeof body.voice === "string" ? body.voice : process.env.OPENAI_TTS_VOICE || "shimmer";
    const configuredVoice = requestedVoice;
    const voice = supportedVoices.has(configuredVoice) ? configuredVoice : "shimmer";
    const requestedSpeed = Number(body.speed ?? 1);
    const speed = Number.isFinite(requestedSpeed) ? Math.max(0.75, Math.min(1.25, requestedSpeed)) : 1;
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
        voice,
        input: text,
        speed,
        instructions: "Speak warmly and clearly to a school-age student. Aim for a gentle feminine-sounding Indian English accent; pronounce Hindi and Hinglish naturally where possible. Keep the pace calm and encouraging.",
        response_format: "mp3",
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok || !response.body) return NextResponse.json({ success: false, error: "Voice playback is unavailable right now." }, { status: response.status === 429 ? 429 : 502 });
    return new Response(response.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-RACER-Voice": voice } });
  } catch {
    return NextResponse.json({ success: false, error: "Voice playback failed. Please try again." }, { status: 502 });
  }
}
