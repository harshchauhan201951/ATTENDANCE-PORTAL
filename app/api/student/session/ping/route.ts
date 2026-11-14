import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createStudentSessionToken, isSameOriginRequest, readStudentSession, STUDENT_SESSION_COOKIE, STUDENT_SESSION_MAX_AGE_SECONDS } from "../../../../../lib/server/student-session";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ success: false }, { status: 403 });
  const session = readStudentSession(request);
  if (!session?.sessionId || !supabaseAdmin) return NextResponse.json({ success: false }, { status: 401 });

  const { error } = await supabaseAdmin
    .from("student_login_activity")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("session_id", session.sessionId)
    .eq("event_type", "login");

  if (error) {
    console.error("Student login heartbeat could not be recorded:", error.message);
    return NextResponse.json({ success: false }, { status: 503 });
  }

  const response = NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  // Refresh the durable cookie while the student is actively using the portal.
  response.cookies.set(STUDENT_SESSION_COOKIE, createStudentSessionToken(session.studentId, session.username, session.sessionId, session.deviceType), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STUDENT_SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
