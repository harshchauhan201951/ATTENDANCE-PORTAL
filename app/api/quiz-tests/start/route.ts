import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type QuizRow = {
  id: number;
  title: string;
  description: string | null;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  marks_per_question: number;
  negative_marks: number;
  pass_percentage: number;
  is_published: boolean;
};

type QuestionRow = {
  id: number;
  quiz_id: number;
  question_text: string;
  question_order: number;
  marks: number | null;
};

type OptionRow = {
  id: number;
  question_id: number;
  option_text: string;
  option_order: number;
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function parseScheduledDateTime(
  scheduledDate: string,
  scheduledTime: string
) {
  const cleanTime = scheduledTime.slice(0, 8);

  return new Date(`${scheduledDate}T${cleanTime}`);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const quizId = Number(body?.quizId);
    const studentId = Number(body?.studentId);

    if (!Number.isInteger(quizId) || !Number.isInteger(studentId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid quizId or studentId.",
        },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("*")
      .eq("id", studentId)
      .maybeSingle();

    if (studentError) {
      return NextResponse.json(
        {
          success: false,
          message: studentError.message,
        },
        { status: 500 }
      );
    }

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          message: "Student account was not found.",
        },
        { status: 404 }
      );
    }

    const { data: quiz, error: quizError } = await supabase
      .from("quiz_tests")
      .select(
        `
        id,
        title,
        description,
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
      .maybeSingle<QuizRow>();

    if (quizError) {
      return NextResponse.json(
        {
          success: false,
          message: quizError.message,
        },
        { status: 500 }
      );
    }

    if (!quiz) {
      return NextResponse.json(
        {
          success: false,
          message: "Quiz not found.",
        },
        { status: 404 }
      );
    }

    if (!quiz.is_published) {
      return NextResponse.json(
        {
          success: false,
          message: "This quiz has not been published yet.",
        },
        { status: 403 }
      );
    }

    if (quiz.duration_minutes !== 30) {
      return NextResponse.json(
        {
          success: false,
          message: "Quiz duration must be exactly 30 minutes.",
        },
        { status: 400 }
      );
    }

    const startTime = parseScheduledDateTime(
      quiz.scheduled_date,
      quiz.scheduled_time
    );

    const endTime = new Date(
      startTime.getTime() + 30 * 60 * 1000
    );

    const now = new Date();

    if (now < startTime) {
      return NextResponse.json(
        {
          success: false,
          message: `Quiz will start at ${startTime.toLocaleString(
            "en-IN"
          )}.`,
          status: "UPCOMING",
        },
        { status: 403 }
      );
    }

    if (now >= endTime) {
      return NextResponse.json(
        {
          success: false,
          message: "The quiz time has already ended.",
          status: "ENDED",
        },
        { status: 403 }
      );
    }

    const { data: existingResult, error: existingError } =
      await supabase
        .from("quiz_results")
        .select("*")
        .eq("quiz_id", quizId)
        .eq("student_id", studentId)
        .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        {
          success: false,
          message: existingError.message,
        },
        { status: 500 }
      );
    }

    let resultId: number;
    let startedAt: string;

    if (existingResult) {
      if (existingResult.submitted_at) {
        return NextResponse.json(
          {
            success: false,
            alreadySubmitted: true,
            resultId: existingResult.id,
            message: "You have already submitted this quiz.",
          },
          { status: 409 }
        );
      }

      resultId = existingResult.id;
      startedAt = existingResult.started_at || now.toISOString();

      if (!existingResult.started_at) {
        const { error: updateStartError } = await supabase
          .from("quiz_results")
          .update({
            started_at: now.toISOString(),
          })
          .eq("id", resultId);

        if (updateStartError) {
          return NextResponse.json(
            {
              success: false,
              message: updateStartError.message,
            },
            { status: 500 }
          );
        }

        startedAt = now.toISOString();
      }
    } else {
      const { data: createdResult, error: createResultError } =
        await supabase
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

      if (createResultError || !createdResult) {
        return NextResponse.json(
          {
            success: false,
            message:
              createResultError?.message ||
              "Unable to create quiz attempt.",
          },
          { status: 500 }
        );
      }

      resultId = createdResult.id;
      startedAt = createdResult.started_at;
    }

    const { data: questions, error: questionsError } =
      await supabase
        .from("quiz_questions")
        .select(
          `
          id,
          quiz_id,
          question_text,
          question_order,
          marks
          `
        )
        .eq("quiz_id", quizId)
        .order("question_order", {
          ascending: true,
        });

    if (questionsError) {
      return NextResponse.json(
        {
          success: false,
          message: questionsError.message,
        },
        { status: 500 }
      );
    }

    const questionRows =
      (questions || []) as QuestionRow[];

    const questionIds = questionRows.map(
      (question) => question.id
    );

    let optionRows: OptionRow[] = [];

    if (questionIds.length > 0) {
      const { data: options, error: optionsError } =
        await supabase
          .from("quiz_options")
          .select(
            `
            id,
            question_id,
            option_text,
            option_order
            `
          )
          .in("question_id", questionIds)
          .order("option_order", {
            ascending: true,
          });

      if (optionsError) {
        return NextResponse.json(
          {
            success: false,
            message: optionsError.message,
          },
          { status: 500 }
        );
      }

      optionRows = (options || []) as OptionRow[];
    }

    const questionsForStudent = questionRows.map(
      (question) => ({
        id: question.id,
        question_text: question.question_text,
        question_order: question.question_order,
        marks:
          question.marks !== null
            ? Number(question.marks)
            : Number(quiz.marks_per_question),
        options: optionRows
          .filter(
            (option) =>
              option.question_id === question.id
          )
          .map((option) => ({
            id: option.id,
            option_text: option.option_text,
            option_order: option.option_order,
          })),
      })
    );

    const serverStartedAt = new Date(startedAt);

    const remainingMilliseconds = Math.max(
      0,
      endTime.getTime() - now.getTime()
    );

    return NextResponse.json({
      success: true,
      resultId,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        scheduled_date: quiz.scheduled_date,
        scheduled_time: quiz.scheduled_time,
        duration_minutes: 30,
        marks_per_question: Number(
          quiz.marks_per_question
        ),
        negative_marks: Number(quiz.negative_marks),
        pass_percentage: Number(
          quiz.pass_percentage
        ),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      },
      startedAt: serverStartedAt.toISOString(),
      remainingMilliseconds,
      questions: questionsForStudent,
    });
  } catch (error) {
    console.error("Quiz start API error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to start quiz.",
      },
      { status: 500 }
    );
  }
}