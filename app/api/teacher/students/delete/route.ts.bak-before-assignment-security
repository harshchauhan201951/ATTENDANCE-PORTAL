import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

function positiveInt(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function verifyTeacher(teacherIdValue: unknown) {
  const teacherId = positiveInt(teacherIdValue);
  if (!teacherId) return { ok: false, error: "Teacher ID is missing or invalid." } as const;
  if (!supabaseAdmin) return { ok: false, error: "Supabase service configuration is missing." } as const;
  const { data, error } = await supabaseAdmin.from("teachers").select("id").eq("id", teacherId).maybeSingle();
  if (error) return { ok: false, error: error.message } as const;
  if (!data) return { ok: false, error: "Teacher account was not found." } as const;
  return { ok: true, teacherId } as const;
}

async function deleteRows(table: string, column: string, value: number) {
  if (!supabaseAdmin) throw new Error("Supabase service configuration is missing.");
  const { error } = await supabaseAdmin.from(table).delete().eq(column, value);
  if (error) throw new Error(`${table}: ${error.message}`);
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: "Supabase service configuration is missing." }, { status: 500 });
    }
    const body = await request.json();
    const teacherCheck = await verifyTeacher(body?.teacherId);
    if (!teacherCheck.ok) {
      return NextResponse.json({ success: false, error: teacherCheck.error }, { status: 403 });
    }

    const studentId = positiveInt(body?.studentId);
    if (!studentId) {
      return NextResponse.json({ success: false, error: "Student ID is missing or invalid." }, { status: 400 });
    }

    const { data: student, error: studentLookupError } = await supabaseAdmin
      .from("students")
      .select("id,student_name,student_username")
      .eq("id", studentId)
      .maybeSingle();

    if (studentLookupError) {
      return NextResponse.json({ success: false, error: studentLookupError.message }, { status: 500 });
    }
    if (!student) {
      return NextResponse.json({ success: false, error: "Student was not found." }, { status: 404 });
    }

    const { data: quizResults, error: quizResultsLookupError } = await supabaseAdmin
      .from("quiz_results")
      .select("id")
      .eq("student_id", studentId);

    if (quizResultsLookupError) {
      return NextResponse.json({ success: false, error: quizResultsLookupError.message }, { status: 500 });
    }

    const resultIds = (quizResults || [])
      .map((row) => Number(row.id))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (resultIds.length > 0) {
      const { error } = await supabaseAdmin
        .from("quiz_answers")
        .delete()
        .in("result_id", resultIds);

      if (error) {
        return NextResponse.json({ success: false, error: `quiz_answers: ${error.message}` }, { status: 500 });
      }
    }

    await deleteRows("quiz_reattempt_permissions", "student_id", studentId);
    await deleteRows("quiz_results", "student_id", studentId);
    await deleteRows("attendance", "student_id", studentId);
    await deleteRows("extra_class_attendance", "student_id", studentId);
    await deleteRows("fees", "student_id", studentId);
    await deleteRows("push_subscriptions", "student_id", studentId);
    await deleteRows("student_login_activity", "student_id", studentId);
    await deleteRows("announcement_likes", "student_id", studentId);

    const { error: deleteStudentError } = await supabaseAdmin
      .from("students")
      .delete()
      .eq("id", studentId);

    if (deleteStudentError) {
      return NextResponse.json({ success: false, error: `students: ${deleteStudentError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      studentId,
      message: `${student.student_name || student.student_username || "Student"} and all linked records were deleted successfully.`,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unable to delete student.",
    }, { status: 500 });
  }
}
