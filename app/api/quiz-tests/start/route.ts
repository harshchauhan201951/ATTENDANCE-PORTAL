import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

function parseIST(dateValue: unknown, timeValue: unknown): Date | null {
  if (!dateValue) return null;

  const date = String(dateValue).trim();
  if (!date) return null;

  let time = timeValue ? String(timeValue).trim() : "00:00:00";

  if (/^\d{2}:\d{2}$/.test(time)) {
    time += ":00";
  }

  if (!/^\d{2}:\d{2}:\d{2}$/.test(time)) {
    time = "00:00:00";
  }

  const parsed = new Date(`${date}T${time}+05:30`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function safeNumber(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const quizId = safeNumber(body?.quizId);
    const studentId = safeNumber(body?.studentId);

    if (!quizId || !studentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Quiz ID and Student ID are required.",
        },
        { status: 400 }
      );
    }

    const { data: student, error: studentError } = await supabaseAdmin
      .from("students")
      .select("*")
      .eq("id", studentId)
      .maybeSingle();

    if (studentError) {
      console.error("START STUDENT ERROR:", studentError);

      return NextResponse.json(
        {
          success: false,
          error: "Unable to load student.",
          details: studentError.message,
        },
        { status: 500 }
      );
    }

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          error: "Student not found.",
        },
        { status: 404 }
      );
    }

    const { data: quiz, error: quizError } = await supabaseAdmin
      .from("quiz_tests")
      .select("*")
      .eq("id", quizId)
      .maybeSingle();

    if (quizError) {
      console.error("START QUIZ ERROR:", quizError);

      return NextResponse.json(
        {
          success: false,
          error: "Unable to load quiz.",
          details: quizError.message,
        },
        { status: 500 }
      );
    }

    if (!quiz) {
      return NextResponse.json(
        {
          success: false,
          error: "Quiz not found.",
        },
        { status: 404 }
      );
    }

    if (!quiz.is_published) {
      return NextResponse.json(
        {
          success: false,
          error: "This quiz is not published.",
        },
        { status: 403 }
      );
    }

    const now = new Date();

    const scheduledStart = parseIST(
      quiz.scheduled_date,
      quiz.scheduled_time
    );

    if (!scheduledStart) {
      return NextResponse.json(
        {
          success: false,
          error: "Quiz schedule is invalid.",
        },
        { status: 400 }
      );
    }

    const durationMinutes = Math.max(
      1,
      safeNumber(quiz.duration_minutes, 30)
    );

    const scheduledEnd = new Date(
      scheduledStart.getTime() + durationMinutes * 60 * 1000
    );

    /*
     * First check whether this student already has a result.
     * submitted_at = completed permanently.
     * submitted_at = null = unfinished attempt, so resume it.
     */
    const { data: existingResult, error: existingError } =
      await supabaseAdmin
        .from("quiz_results")
        .select("*")
        .eq("quiz_id", quizId)
        .eq("student_id", studentId)
        .maybeSingle();

    if (existingError) {
      console.error("START EXISTING RESULT ERROR:", existingError);

      return NextResponse.json(
        {
          success: false,
          error: "Unable to check previous attempt.",
          details: existingError.message,
        },
        { status: 500 }
      );
    }

    if (existingResult?.submitted_at) {
      return NextResponse.json(
        {
          success: false,
          alreadySubmitted: true,
          error: "You have already submitted this quiz.",
        },
        { status: 409 }
      );
    }

    let resultId: number;
    let startedAt: Date;

    if (existingResult) {
      resultId = Number(existingResult.id);

      startedAt = existingResult.started_at
        ? new Date(existingResult.started_at)
        : now;

      if (Number.isNaN(startedAt.getTime())) {
        startedAt = now;
      }
    } else {
      startedAt = now;

      /*
       * Do not allow an attempt before the scheduled start.
       */
      if (now < scheduledStart) {
        return NextResponse.json(
          {
            success: false,
            error: "Quiz has not started yet.",
            scheduledStart: scheduledStart.toISOString(),
          },
          { status: 403 }
        );
      }

      /*
       * Do not allow a completely new attempt after the quiz window.
       */
      if (now >= scheduledEnd) {
        return NextResponse.json(
          {
            success: false,
            error: "Quiz time has ended.",
          },
          { status: 403 }
        );
      }

      const { data: newResult, error: insertError } =
        await supabaseAdmin
          .from("quiz_results")
          .insert({
            quiz_id: quizId,
            student_id: studentId,
            total_questions: 0,
            correct_answers: 0,
            wrong_answers: 0,
            unanswered: 0,
            total_marks: 0,
            obtained_marks: 0,
            percentage: 0,
            result_status: "FAIL",
            started_at: startedAt.toISOString(),
            submitted_at: null,
            submission_type: "manual",
          })
          .select("*")
          .single();

      if (insertError) {
        console.error("START RESULT INSERT ERROR:", insertError);

        return NextResponse.json(
          {
            success: false,
            error: "Unable to create quiz attempt.",
            details: insertError.message,
          },
          { status: 500 }
        );
      }

      resultId = Number(newResult.id);
    }

    const attemptEnd = new Date(
      Math.min(
        scheduledEnd.getTime(),
        startedAt.getTime() + durationMinutes * 60 * 1000
      )
    );

    const remainingMilliseconds = Math.max(
      0,
      attemptEnd.getTime() - now.getTime()
    );

    /*
     * If an old unfinished attempt has already expired,
     * let the submit endpoint finalize it as time_expired.
     */
    if (remainingMilliseconds <= 0) {
      return NextResponse.json({
        success: true,
        resultId,
        quizId,
        startedAt: startedAt.toISOString(),
        endAt: attemptEnd.toISOString(),
        remainingMilliseconds: 0,
        timeExpired: true,
        quiz: {
          ...quiz,
          duration_minutes: durationMinutes,
        },
        questions: [],
      });
    }

    const { data: questions, error: questionsError } =
      await supabaseAdmin
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("question_order", { ascending: true });

    if (questionsError) {
      console.error("START QUESTIONS ERROR:", questionsError);

      return NextResponse.json(
        {
          success: false,
          error: "Unable to load quiz questions.",
          details: questionsError.message,
        },
        { status: 500 }
      );
    }

    const questionIds = (questions || []).map((question) =>
      Number(question.id)
    );

    let options: any[] = [];

    if (questionIds.length > 0) {
      const { data: optionRows, error: optionsError } =
        await supabaseAdmin
          .from("quiz_options")
          .select("*")
          .in("question_id", questionIds)
          .order("option_order", { ascending: true });

      if (optionsError) {
        console.error("START OPTIONS ERROR:", optionsError);

        return NextResponse.json(
          {
            success: false,
            error: "Unable to load quiz options.",
            details: optionsError.message,
          },
          { status: 500 }
        );
      }

      options = optionRows || [];
    }

    const questionsWithOptions = (questions || []).map((question) => ({
      ...question,
      options: options
        .filter(
          (option) => Number(option.question_id) === Number(question.id)
        )
        .map((option) => {
          const { is_correct, ...safeOption } = option;
          return safeOption;
        }),
    }));

    return NextResponse.json({
      success: true,
      resultId,
      quizId,
      studentId,
      startedAt: startedAt.toISOString(),
      scheduledStart: scheduledStart.toISOString(),
      scheduledEnd: scheduledEnd.toISOString(),
      endAt: attemptEnd.toISOString(),
      remainingMilliseconds,
      timeExpired: false,
      alreadyStarted: Boolean(existingResult),
      quiz: {
        ...quiz,
        duration_minutes: durationMinutes,
      },
      questions: questionsWithOptions,
    });
  } catch (error) {
    console.error("START QUIZ UNEXPECTED ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to start quiz.",
        details:
          error instanceof Error ? error.message : "Unknown server error",
      },
      { status: 500 }
    );
  }
}