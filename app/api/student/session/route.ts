import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createStudentSessionToken, isSameOriginRequest, readStudentSession, STUDENT_SESSION_COOKIE, STUDENT_SESSION_MAX_AGE_SECONDS } from "../../../../lib/server/student-session";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ success: false, error: "Request origin could not be verified." }, { status: 403 });
  if (!supabaseAdmin) return NextResponse.json({ success: false, error: "Secure student sign-in is temporarily unavailable." }, { status: 503 });
  try {
    const rawBody = await request.text();
    if (rawBody.length > 4_096) return NextResponse.json({ success: false, error: "Sign-in request is too large." }, { status: 413 });
    const body = JSON.parse(rawBody) as { username?: unknown; password?: unknown };
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!username || username.length > 120 || !password || password.length > 256) return NextResponse.json({ success: false, error: "Valid student login details are required." }, { status: 400 });

    const { data, error } = await supabaseAdmin.rpc("student_login", { p_username: username, p_password: password });
    const student = Array.isArray(data) ? data[0] : data;
    const studentId = Number(student?.id);
    const verifiedUsername = String(student?.student_username || username).trim();
    if (error || !Number.isInteger(studentId) || studentId <= 0 || !verifiedUsername) return NextResponse.json({ success: false, error: "Student sign-in could not be verified. Please sign in again." }, { status: 401 });
    if (student?.is_active === false) return NextResponse.json({ success: false, error: "This student account is inactive." }, { status: 403 });

    const userAgent = request.headers.get("user-agent") || "";
    const deviceType = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(userAgent) ? "Mobile" : "Desktop";
    const sessionId = randomUUID();
    const loggedInAt = new Date().toISOString();
    const { error: activityError } = await supabaseAdmin.from("student_login_activity").insert({
      student_id: studentId,
      login_at: loggedInAt,
      device_type: deviceType,
      event_type: "login",
      session_id: sessionId,
      last_seen_at: loggedInAt,
    });
    if (activityError) console.error("Student login activity session could not be recorded:", activityError.message);

    const response = NextResponse.json({ success: true, activityRecorded: !activityError });
    response.cookies.set(STUDENT_SESSION_COOKIE, createStudentSessionToken(studentId, verifiedUsername, sessionId, deviceType), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: STUDENT_SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch {
    return NextResponse.json({ success: false, error: "Secure student sign-in failed. Please try again." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ success: false, error: "Request origin could not be verified." }, { status: 403 });
  const session = readStudentSession(request);
  if (session?.sessionId && supabaseAdmin) {
    const loggedOutAt = new Date().toISOString();
    const { error } = await supabaseAdmin.from("student_login_activity").insert({
      student_id: session.studentId,
      login_at: loggedOutAt,
      device_type: session.deviceType || "Desktop",
      event_type: "logout",
      session_id: session.sessionId,
      last_seen_at: loggedOutAt,
    });
    if (error) console.error("Student logout activity could not be recorded:", error.message);
  }
  const response = NextResponse.json({ success: true });
  response.cookies.set(STUDENT_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
