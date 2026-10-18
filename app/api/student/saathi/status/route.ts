import { NextResponse } from "next/server";
import { readStudentSession } from "../../../../../lib/server/student-session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!readStudentSession(request)) return NextResponse.json({ success: false, error: "Please sign in again to use RACER साथी." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const configured = Boolean(process.env.OPENAI_API_KEY);
  return NextResponse.json({ success: true, aiAvailable: configured, voiceAvailable: configured }, { headers: { "Cache-Control": "no-store" } });
}
