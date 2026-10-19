import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { allowSaathiRequest, isSameOriginRequest, readStudentSession } from "../../../../../lib/server/student-session";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  const session = readStudentSession(request);
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (!allowSaathiRequest(`support:${session.studentId}`, 4, 60_000)) return NextResponse.json({ error: "Please wait before sending another support request." }, { status: 429 });
  if (!supabaseAdmin) return NextResponse.json({ error: "Teacher support is not configured yet." }, { status: 503 });
  try {
    const body = await request.json() as { message?: unknown; teacherName?: unknown; teacherContact?: unknown; audioUrl?: unknown };
    const message = String(body.message || "").trim().slice(0, 4_000);
    if (!message) return NextResponse.json({ error: "Please describe the problem first." }, { status: 400 });
    const { data: student } = await supabaseAdmin.from("students").select("id,student_name,student_username,class_name").eq("id", session.studentId).eq("student_username", session.username).maybeSingle();
    if (!student) return NextResponse.json({ error: "Student session could not be verified." }, { status: 403 });
    const requestRow = { student_id: student.id, student_name: student.student_name, student_username: student.student_username, class_name: student.class_name, teacher_name: String(body.teacherName || "").trim().slice(0, 120) || null, teacher_contact: String(body.teacherContact || "").trim().slice(0, 80) || null, message, audio_url: String(body.audioUrl || "").trim().slice(0, 500) || null, status: "open", created_at: new Date().toISOString() };
    const { error } = await supabaseAdmin.from("student_support_requests").insert(requestRow);
    if (error) return NextResponse.json({ error: "Support folder is not available yet. Please contact the academy office." }, { status: 503 });
    return NextResponse.json({ success: true, message: "आपकी समस्या teacher support folder में दर्ज हो गई है। Teacher app पर notification जाएगा।" });
  } catch {
    return NextResponse.json({ error: "Could not save the support request." }, { status: 500 });
  }
}
