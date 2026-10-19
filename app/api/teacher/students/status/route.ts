import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabaseAdmin = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

function positiveInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ success: false, error: "Supabase service configuration is missing." }, { status: 500 });
    const body = await request.json();
    const teacherId = positiveInt(body?.teacherId);
    const studentId = positiveInt(body?.studentId);
    const isActive = typeof body?.isActive === "boolean" ? body.isActive : null;
    if (!teacherId || !studentId || isActive === null) return NextResponse.json({ success: false, error: "Teacher ID, student ID and account status are required." }, { status: 400 });
    const { data: teacher, error: teacherError } = await supabaseAdmin.from("teachers").select("id").eq("id", teacherId).maybeSingle();
    if (teacherError) return NextResponse.json({ success: false, error: teacherError.message }, { status: 500 });
    if (!teacher) return NextResponse.json({ success: false, error: "Teacher account was not found." }, { status: 403 });
    if (teacherId !== 1) {
      const { data: assignedData, error: assignedError } = await supabaseAdmin.rpc("get_teacher_assigned_student_ids", { p_teacher_id: teacherId });
      if (assignedError) return NextResponse.json({ success: false, error: assignedError.message }, { status: 500 });
      const isAssigned = (assignedData || []).some((row: { student_id: number }) => Number(row.student_id) === studentId);
      if (!isAssigned) return NextResponse.json({ success: false, error: "You can only change account status for students assigned to you." }, { status: 403 });
    }
    const { data: currentStudent, error: currentStudentError } = await supabaseAdmin
      .from("students")
      .select("id,student_name,is_active,admission_date,admission_history")
      .eq("id", studentId)
      .maybeSingle();
    if (currentStudentError) {
      const missingHistoryColumn = /admission_history/i.test(currentStudentError.message);
      if (missingHistoryColumn && !isActive) {
        const { data: deactivatedStudent, error: deactivateError } = await supabaseAdmin
          .from("students")
          .update({ is_active: false })
          .eq("id", studentId)
          .select("id,student_name,is_active,admission_date")
          .maybeSingle();
        if (deactivateError) return NextResponse.json({ success: false, error: deactivateError.message }, { status: 500 });
        if (!deactivatedStudent) return NextResponse.json({ success: false, error: "Student was not found." }, { status: 404 });
        return NextResponse.json({ success: true, student: { ...deactivatedStudent, admission_history: [] } });
      }
      return NextResponse.json({ success: false, error: missingHistoryColumn ? "Apply the student admission history database migration before changing student account status." : currentStudentError.message }, { status: 500 });
    }
    if (!currentStudent) return NextResponse.json({ success: false, error: "Student was not found." }, { status: 404 });

    const history = Array.isArray(currentStudent.admission_history)
      ? currentStudent.admission_history.filter((entry: unknown): entry is { date: string; type: string; recordedAt?: string } => Boolean(entry && typeof entry === "object" && typeof (entry as { date?: unknown }).date === "string"))
      : [];
    const updateData: { is_active: boolean; admission_date?: string; admission_history?: typeof history } = { is_active: isActive };
    const isReadmission = isActive && !currentStudent.is_active;
    if (!isActive && currentStudent.is_active) {
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      if (!history.some((entry) => entry.date.slice(0, 10) === today && entry.type === "Deactivation")) {
        history.push({ date: today, type: "Deactivation", recordedAt: new Date().toISOString() });
      }
      updateData.admission_history = history;
    }
    if (isReadmission) {
      const admissionDate = currentStudent.admission_date ? String(currentStudent.admission_date).slice(0, 10) : null;
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      const nextHistory = [...history];
      if (admissionDate && !nextHistory.some((entry) => entry.date.slice(0, 10) === admissionDate)) {
        nextHistory.push({ date: admissionDate, type: "Initial admission" });
      }
      nextHistory.push({ date: today, type: "Re-admission", recordedAt: new Date().toISOString() });
      updateData.admission_date = today;
      updateData.admission_history = nextHistory;
    }

    const { data: student, error: updateError } = await supabaseAdmin
      .from("students")
      .update(updateData)
      .eq("id", studentId)
      .select("id,student_name,is_active,admission_date,admission_history")
      .maybeSingle();
    if (updateError) return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    if (!student) return NextResponse.json({ success: false, error: "Student was not found." }, { status: 404 });
    return NextResponse.json({ success: true, student });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unable to update account status." }, { status: 500 });
  }
}
