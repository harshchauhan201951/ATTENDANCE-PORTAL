import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function positiveId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeClass(value: unknown): string {
  return String(value || "").trim().toUpperCase();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const teacherId = positiveId(body.teacherId);
    const quizId = positiveId(body.quizId);
    const studentId = positiveId(body.studentId);
    const obtainedMarks = Number(body.obtainedMarks);
    const totalMarks = Number(body.totalMarks);

    if (!teacherId || !quizId || !studentId) {
      return NextResponse.json({ success: false, error: "Teacher, quiz and student are required." }, { status: 400 });
    }
    if (!Number.isFinite(obtainedMarks) || !Number.isFinite(totalMarks) || totalMarks <= 0 || obtainedMarks < 0 || obtainedMarks > totalMarks) {
      return NextResponse.json({ success: false, error: "Enter valid marks. Obtained marks must be between 0 and total marks." }, { status: 400 });
    }

    const [{ data: teacher, error: teacherError }, { data: quiz, error: quizError }, { data: student, error: studentError }] = await Promise.all([
      supabaseAdmin.from("teachers").select("id").eq("id", teacherId).maybeSingle(),
      supabaseAdmin.from("quiz_tests").select("id,title,class_name,target_classes,pass_percentage").eq("id", quizId).maybeSingle(),
      supabaseAdmin.from("students").select("id,class_name,is_active").eq("id", studentId).maybeSingle(),
    ]);

    if (teacherError) throw teacherError;
    if (quizError) throw quizError;
    if (studentError) throw studentError;
    if (!teacher) return NextResponse.json({ success: false, error: "Teacher account was not found." }, { status: 404 });
    if (!quiz) return NextResponse.json({ success: false, error: "Quiz was not found." }, { status: 404 });
    if (!student || student.is_active === false) return NextResponse.json({ success: false, error: "Active student was not found." }, { status: 404 });

    if (teacherId !== 1) {
      const { data: assignedRows, error: assignedError } = await supabaseAdmin.rpc("get_teacher_assigned_student_ids", { p_teacher_id: teacherId });
      if (assignedError) throw assignedError;
      const assignedIds = new Set((assignedRows || []).map((row: { student_id: number }) => Number(row.student_id)));
      if (!assignedIds.has(studentId)) return NextResponse.json({ success: false, error: "You can only grade assignments for students assigned to you." }, { status: 403 });
    }

    const quizClasses = Array.isArray(quiz.target_classes)
      ? quiz.target_classes.map(normalizeClass).filter(Boolean)
      : [];
    const legacyClass = normalizeClass(quiz.class_name);
    const allowedClasses = quizClasses.length ? quizClasses : legacyClass ? [legacyClass] : [];
    if (allowedClasses.length && !allowedClasses.includes(normalizeClass(student.class_name))) {
      return NextResponse.json({ success: false, error: "This student is not included in the quiz classes." }, { status: 403 });
    }

    const { data: existingResults, error: existingError } = await supabaseAdmin
      .from("quiz_results")
      .select("id,attempt_number,total_questions,submitted_at,submission_type")
      .eq("quiz_id", quizId)
      .eq("student_id", studentId)
      .order("attempt_number", { ascending: true });
    if (existingError) throw existingError;

    const rows = existingResults || [];
    const isAssignmentResult = (row: any) => String(row.submission_type || "").toLowerCase() === "manual" && Number(row.total_questions) === 0;
    const assignmentResult = rows.find(isAssignmentResult);
    const submittedAttempt = rows.find((row: any) => Boolean(row.submitted_at) && !isAssignmentResult(row));
    if (submittedAttempt) {
      return NextResponse.json({ success: false, error: "This student already submitted the quiz, so assignment marks cannot replace that attempt." }, { status: 409 });
    }

    // Starting a quiz can create an unsubmitted placeholder result row. Reuse
    // that row for assignment marks instead of rejecting the save as a duplicate.
    const targetResult = assignmentResult || rows.find((row: any) => !row.submitted_at);

    const percentage = Math.round((obtainedMarks / totalMarks) * 10000) / 100;
    const configuredPassThreshold = quiz.pass_percentage == null ? 40 : Number(quiz.pass_percentage);
    const passThreshold = Number.isFinite(configuredPassThreshold) ? configuredPassThreshold : 40;
    const submittedAt = new Date().toISOString();
    const resultValues = {
        quiz_id: quizId,
        student_id: studentId,
        attempt_number: targetResult?.attempt_number || 1,
        total_questions: 0,
        correct_answers: 0,
        wrong_answers: 0,
        unanswered: 0,
        total_marks: Math.round(totalMarks * 100) / 100,
        obtained_marks: Math.round(obtainedMarks * 100) / 100,
        percentage,
        result_status: percentage >= passThreshold ? "PASS" : "FAIL",
        started_at: submittedAt,
        submitted_at: submittedAt,
        // "manual" is an allowed database submission type. Zero questions is
        // the durable marker for a teacher-entered assignment grade.
        submission_type: "manual",
      };
    const saveQuery = targetResult
      ? supabaseAdmin.from("quiz_results").update(resultValues).eq("id", targetResult.id)
      : supabaseAdmin.from("quiz_results").insert(resultValues);
    const { data: savedResult, error: saveError } = await saveQuery
      .select("id,quiz_id,student_id,obtained_marks,total_marks,percentage,result_status,submitted_at,submission_type")
      .single();

    if (saveError) throw saveError;
    return NextResponse.json({ success: true, result: savedResult });
  } catch (error) {
    console.error("Quiz assignment grading error:", error);
    const message = error instanceof Error
      ? error.message
      : error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message || "Could not save assignment marks.")
        : "Could not save assignment marks.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
