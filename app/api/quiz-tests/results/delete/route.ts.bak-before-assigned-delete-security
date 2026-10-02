import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

function positiveInt(value: unknown): number | null {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    return null;
  }

  return numberValue;
}

async function verifyTeacher(teacherIdValue: unknown) {
  const teacherId = positiveInt(teacherIdValue);

  if (!teacherId || !supabaseAdmin) {
    return false;
  }

  const { data, error } = await supabaseAdmin
    .from("teachers")
    .select("id")
    .eq("id", teacherId)
    .maybeSingle();

  return !error && Boolean(data);
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Supabase service configuration is missing. Please check SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const resultId = positiveInt(body?.resultId);
    const teacherId = positiveInt(body?.teacherId);

    if (!resultId || !teacherId) {
      return NextResponse.json(
        {
          success: false,
          error: "Result ID and teacher ID are required.",
        },
        { status: 400 }
      );
    }

    const teacherValid = await verifyTeacher(teacherId);

    if (!teacherValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Teacher account was not found.",
        },
        { status: 403 }
      );
    }

    const { data: result, error: resultError } = await supabaseAdmin
      .from("quiz_results")
      .select("id,quiz_id,student_id,attempt_number")
      .eq("id", resultId)
      .maybeSingle();

    if (resultError) {
      return NextResponse.json(
        {
          success: false,
          error: `Unable to read quiz result: ${resultError.message}`,
        },
        { status: 500 }
      );
    }

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: "Quiz result entry was not found.",
        },
        { status: 404 }
      );
    }

    const quizId = Number(result.quiz_id);
    const studentId = Number(result.student_id);

    if (
      !Number.isInteger(quizId) ||
      quizId <= 0 ||
      !Number.isInteger(studentId) ||
      studentId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Quiz result contains invalid quiz or student information.",
        },
        { status: 400 }
      );
    }

    /*
     * Delete only answer rows belonging to this exact result.
     * Other students, quizzes, questions, and result entries are untouched.
     */
    const { error: answerDeleteError } = await supabaseAdmin
      .from("quiz_answers")
      .delete()
      .eq("result_id", resultId);

    if (answerDeleteError) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Unable to delete answer records: ${answerDeleteError.message}`,
        },
        { status: 500 }
      );
    }

    /*
     * Delete only this exact quiz result entry.
     * Other attempts are preserved exactly as they are.
     */
    const { error: resultDeleteError } = await supabaseAdmin
      .from("quiz_results")
      .delete()
      .eq("id", resultId)
      .eq("quiz_id", quizId)
      .eq("student_id", studentId);

    if (resultDeleteError) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Unable to delete quiz result: ${resultDeleteError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedResultId: resultId,
      quizId,
      studentId,
      deletedAttemptNumber: Number(result.attempt_number || 1),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete quiz result entry.",
      },
      { status: 500 }
    );
  }
}