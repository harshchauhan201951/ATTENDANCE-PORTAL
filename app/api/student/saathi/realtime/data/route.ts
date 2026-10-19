import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { allowSaathiRequest, isSameOriginRequest, readStudentSession } from "../../../../../../lib/server/student-session";
import { loadSaathiStudentContext } from "../../../../../../lib/server/saathi-context";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  const student = readStudentSession(request);
  if (!student) return NextResponse.json({ error: "Your secure student session expired. Sign in again." }, { status: 401 });
  if (!allowSaathiRequest(`realtime-data:${student.studentId}`, 12)) return NextResponse.json({ error: "Please wait before checking another school record." }, { status: 429 });
  if (!supabaseAdmin) return NextResponse.json({ error: "Student data services are unavailable right now." }, { status: 503 });

  try {
    const body = await request.json() as { question?: unknown };
    const question = typeof body.question === "string" ? body.question.trim().slice(0, 1_000) : "";
    if (!question) return NextResponse.json({ error: "A school-data question is required." }, { status: 400 });
    const result = await loadSaathiStudentContext(supabaseAdmin, student.studentId, student.username, question);
    if (!result.authorized) return NextResponse.json({ error: "Your student session is no longer active. Sign in again." }, { status: 401 });
    return NextResponse.json({ context: result.context || { available: false, reason: "This question does not match a supported school-data topic." } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not read the signed-in student's school data." }, { status: 500 });
  }
}
