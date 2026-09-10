import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type StartBody = {
  quizId: number | string;
  studentId: number | string;
};

function getQuizStart(
  scheduledDate: string,
  scheduledTime: string
) {
  return new Date(`${scheduledDate}T${scheduledTime}`);
}

function getQuizEnd(
  scheduledDate: string,
  scheduledTime: string,
  durationMinutes: number
) {
  return new Date(
    getQuizStart(scheduledDate, scheduledTime).getTime() +
      durationMinutes * 60 * 1000
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as StartBody;

    const quizId = Number(body.quizId);
    const studentId = Number(body.studentId);

    if (
      !Number.isFinite(quizId) ||
      quizId <= 0 ||
      !Number.isFinite(studentId) ||
      studentId <= 0
    ) {
      return NextResponse.json(
        {
          error: "Invalid quiz or student.",
        },
        { status: 400 }
      );
    }

    const { data: student, error: studentError } =
      await supabaseAdmin
        .from("students")
        .select(
          "id,student_name,student_username,class_name"
        )
        .eq("id", studentId)
        .maybeSingle();

    if (studentError) {
      return NextResponse.json(
        { error: studentError.message },
        { status: 500 }
      );
    }

    if (!student) {
      return NextResponse.json(
        { error: "Student not found." },
        { status: 404 }
      );
    }

    const { data: quiz, error: quizError } =
      await supabaseAdmin
        .from("quiz_tests")
        .select(
          `
          id,
          title,
          description,
          class_name,
          target_classes,
          subject,
          scheduled_date,
          scheduled_time,
          duration_minutes,
          marks_per_question,
          negative_marks,
          pass_percentage,
          is_published
          `
        )
        .eq("id", quizId)
        .maybeSingle();

    if (quizError) {
      return NextResponse.json(
        { error: quizError.message },
        { status: 500 }
      );
    }

    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz not found." },
        { status: 404 }
      );
    }

    if (!quiz.is_published) {
      return NextResponse.json(
        { error: "This quiz is not published." },
        { status: 403 }
      );
    }

    const durationMinutes =
      Number(quiz.duration_minutes) > 0
        ? Number(quiz.duration_minutes)
        : 30;

    const scheduledStart = getQuizStart(
      quiz.scheduled_date,
      quiz.scheduled_time
    );

    const scheduledEnd = getQuizEnd(
      quiz.scheduled_date,
      quiz.scheduled_time,
      durationMinutes
    );

    const now = new Date();

    if (now < scheduledStart) {
      return NextResponse.json(
        {
          error: "This quiz has not started yet.",
          scheduledStart: scheduledStart.toISOString(),
        },
        { status: 409 }
      );
    }

    if (now >= scheduledEnd) {
      return NextResponse.json(
        {
          error: "Quiz time has ended.",
        },
        { status: 409 }
      );
    }

    const { data: existing, error: existingError } =
      await supabaseAdmin
        .from("quiz_results")
        .select("*")
        .eq("quiz_id", quizId)
        .eq("student_id", studentId)
        .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message },
        { status: 500 }
      );
    }

    if (existing?.submitted_at) {
      return NextResponse.json(
        {
          error: "You have already submitted this quiz.",
          alreadySubmitted: true,
          resultId: existing.id,
        },
        { status: 409 }
      );
    }

    let result = existing;

    if (!result) {
      const { data: created, error: createError } =
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
            started_at: now.toISOString(),
            submitted_at: null,
            submission_type: "manual",
          })
          .select("*")
          .single();

      if (createError) {
        if (createError.code === "23505") {
          const { data: retry } =
            await supabaseAdmin
              .from("quiz_results")
              .select("*")
              .eq("quiz_id", quizId)
              .eq("student_id", studentId)
              .maybeSingle();

          if (!retry) {
            return NextResponse.json(
              { error: "Unable to create quiz attempt." },
              { status: 500 }
            );
          }

          if (retry.submitted_at) {
            return NextResponse.json(
              {
                error:
                  "You have already submitted this quiz.",
                alreadySubmitted: true,
                resultId: retry.id,
              },
              { status: 409 }
            );
          }

          result = retry;
        } else {
          return NextResponse.json(
            { error: createError.message },
            { status: 500 }
          );
        }
      } else {
        result = created;
      }
    }

    if (!result) {
      return NextResponse.json(
        { error: "Unable to start quiz." },
        { status: 500 }
      );
    }

    const startedAt = result.started_at
      ? new Date(result.started_at)
      : now;

    const attemptEnd = new Date(
      startedAt.getTime() +
        durationMinutes * 60 * 1000
    );

    const effectiveEnd =
      attemptEnd < scheduledEnd
        ? attemptEnd
        : scheduledEnd;

    const remainingMilliseconds = Math.max(
      0,
      effectiveEnd.getTime() - now.getTime()
    );

    const { data: questions, error: questionError } =
      await supabaseAdmin
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("question_order", {
          ascending: true,
        });

    if (questionError) {
      return NextResponse.json(
        { error: questionError.message },
        { status: 500 }
      );
    }

    const questionIds = (questions || []).map(
      (question) => question.id
    );

    let options: any[] = [];

    if (questionIds.length > 0) {
      const { data: optionData, error: optionError } =
        await supabaseAdmin
          .from("quiz_options")
          .select("*")
          .in("question_id", questionIds)
          .order("option_order", {
            ascending: true,
          });

      if (optionError) {
        return NextResponse.json(
          { error: optionError.message },
          { status: 500 }
        );
      }

      options = optionData || [];
    }

    const questionsWithOptions = (questions || []).map(
      (question) => ({
        ...question,
        options: options
          .filter(
            (option) =>
              Number(option.question_id) ===
              Number(question.id)
          )
          .map((option) => ({
            id: option.id,
            question_id: option.question_id,
            option_text: option.option_text,
          })),
      })
    );

    return NextResponse.json({
      success: true,
      resultId: result.id,
      studentId,
      quiz,
      questions: questionsWithOptions,
      startedAt: startedAt.toISOString(),
      scheduledStart: scheduledStart.toISOString(),
      scheduledEnd: scheduledEnd.toISOString(),
      attemptEnd: effectiveEnd.toISOString(),
      remainingMilliseconds,
      alreadyStarted: Boolean(existing),
    });
  } catch (error) {
    console.error("Quiz start API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to start quiz.",
      },
      { status: 500 }
    );
  }
}