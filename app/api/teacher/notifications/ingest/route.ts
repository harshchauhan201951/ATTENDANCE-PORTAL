import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createTeacherNotifications } from "../../../../../lib/server/teacher-notifications";

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body?.eventType !== "student_login") return NextResponse.json({ success: false, error: "Unsupported notification event." }, { status: 400 });
    const studentId = Number(body?.studentId);
    if (!Number.isInteger(studentId) || studentId <= 0) return NextResponse.json({ success: false, error: "Valid studentId is required." }, { status: 400 });
    const { data: student, error } = await supabaseAdmin.from("students").select("id,student_name,student_username").eq("id", studentId).maybeSingle();
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    if (!student) return NextResponse.json({ success: false, error: "Student not found." }, { status: 404 });
    const name = String(student.student_name || student.student_username || `Student #${studentId}`).trim();
    const device = String(body?.deviceType || "browser").slice(0, 80);
    const loginAt = new Date().toISOString();
    await createTeacherNotifications({
      title: "Student Login",
      message: `${name} logged in from ${device}.`,
      category: "student_login",
      url: "/teacher/login-activity",
      metadata: { source: "student_login", studentId, studentName: name, deviceType: device, loginAt },
      notificationKey: `student-login:${studentId}:${Math.floor(Date.now() / 60000)}`,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Teacher login notification error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unable to create teacher notification." }, { status: 500 });
  }
}
