import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type QuizRow = {
  id: number;
  title: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  marks_per_question: number;
  negative_marks: number;
  pass_percentage: number;
};

type QuestionRow = {
  id: number;
  question_text: string;
  question_order: number;
  marks: number | null;
};

type OptionRow = {
  id: number;
  question_id: number;
  option_text: string;
  is_correct: boolean;
};

type SubmittedAnswer = {
  questionId: number;
  selectedOptionId: number | null;
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
  return new Date(
    `${scheduledDate}T${scheduledTime.slice(0, 8)}`
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const resultId = Number(body?.resultId);
    const studentId = Number(body?.studentId);

    const rawAnswers = Array.isArray(body?.answers)
      ? body.answers
      : [];

    const requestedSubmissionType =
      body?.submissionType || "manual";

    if (
      !Number.isInteger(resultId) ||
      !Number.isInteger(studentId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid resultId or studentId.",
        },
        { status: 400 }
      );
    }

    const allowedSubmissionTypes = [
      "manual",
      "time_expired",
      "left_quiz",
      "auto_submit",
    ];

    const submissionType =
      allowedSubmissionTypes.includes(
        requestedSubmissionType
      )
        ? requestedSubmissionType
        : "manual";

    const answers: SubmittedAnswer[] = rawAnswers
      .map((answer: unknown) => {
        const item = answer as {
          questionId?: unknown;
          selectedOptionId?: unknown;
        };

        const questionId = Number(
          item.questionId
        );

        const selectedOptionId =
          item.selectedOptionId === null ||
          item.selectedOptionId === undefined ||
          item.selectedOptionId === ""
            ? null
            : Number(item.selectedOptionId);

        if (!Number.isInteger(questionId)) {
          return null;
        }

        if (
          selectedOptionId !== null &&
          !Number.isInteger(selectedOptionId)
        ) {
          return null;
        }

        return {
          questionId,
          selectedOptionId,
        };
      })
      .filter(
        (
          answer: SubmittedAnswer | null
        ): answer is SubmittedAnswer =>
          answer !== null
      );

    const supabase = getAdminClient();

    const { data: result, error: resultError } =
      await supabase
        .from("quiz_results")
        .select("*")
        .eq("id", resultId)
        .eq("student_id", studentId)
        .maybeSingle();

    if (resultError) {
      return NextResponse.json(
        {
          success: false,
          message: resultError.message,
        },
        { status: 500 }
      );
    }

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          message: "Quiz attempt was not found.",
        },
        { status: 404 }
      );
    }

    if (result.submitted_at) {
      return NextResponse.json(
        {
          success: false,
          alreadySubmitted: true,
          resultId,
          message: "This quiz has already been submitted.",
        },
        { status: 409 }
      );
    }

    const quizId = Number(result.quiz_id);

    const { data: quiz, error: quizError } =
      await supabase
        .from("quiz_tests")
        .select(
          `
          id,
          title,
          scheduled_date,
          scheduled_time,
          duration_minutes,
          marks_per_question,
          negative_marks,
          pass_percentage
          `
        )
        .eq("id", quizId)
        .single<QuizRow>();

    if (quizError || !quiz) {
      return NextResponse.json(
        {
          success: false,
          message:
            quizError?.message ||
            "Quiz information was not found.",
        },
        { status: 404 }
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

    const now = new Date();

    const scheduledStart = parseScheduledDateTime(
      quiz.scheduled_date,
      quiz.scheduled_time
    );

    const scheduledEnd = new Date(
      scheduledStart.getTime() + 30 * 60 * 1000
    );

    const storedStartedAt = result.started_at
      ? new Date(result.started_at)
      : scheduledStart;

    const attemptEnd = new Date(
      storedStartedAt.getTime() + 30 * 60 * 1000
    );

    const actualEnd =
      attemptEnd.getTime() < scheduledEnd.getTime()
        ? attemptEnd
        : scheduledEnd;

    const wasTimeExpired =
      now.getTime() >= actualEnd.getTime();

    const finalSubmissionType = wasTimeExpired
      ? "time_expired"
      : submissionType;

    const { data: questions, error: questionsError } =
      await supabase
        .from("quiz_questions")
        .select(
          `
          id,
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
            is_correct
            `
          )
          .in("question_id", questionIds);

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

    const answerMap = new Map<
      number,
      number | null
    >();

    for (const answer of answers) {
      if (!answerMap.has(answer.questionId)) {
        answerMap.set(
          answer.questionId,
          answer.selectedOptionId
        );
      }
    }

    let correctAnswers = 0;
    let wrongAnswers = 0;
    let unanswered = 0;
    let obtainedMarks = 0;
    let totalMarks = 0;

    const calculatedAnswers = questionRows.map(
      (question) => {
        const questionMarks =
          question.marks !== null
            ? Number(question.marks)
            : Number(quiz.marks_per_question);

        totalMarks += questionMarks;

        const hasAnswer =
          answerMap.has(question.id);

        const selectedOptionId = hasAnswer
          ? answerMap.get(question.id) ?? null
          : null;

        if (
          selectedOptionId === null ||
          selectedOptionId === undefined
        ) {
          unanswered += 1;

          return {
            question_id: question.id,
            selected_option_id: null,
            is_correct: false,
            marks_awarded: 0,
          };
        }

        const selectedOption =
          optionRows.find(
            (option) =>
              option.id === selectedOptionId &&
              option.question_id === question.id
          );

        if (!selectedOption) {
          wrongAnswers += 1;
          obtainedMarks -= Number(
            quiz.negative_marks
          );

          return {
            question_id: question.id,
            selected_option_id: null,
            is_correct: false,
            marks_awarded: -Number(
              quiz.negative_marks
            ),
          };
        }

        if (selectedOption.is_correct) {
          correctAnswers += 1;
          obtainedMarks += questionMarks;

          return {
            question_id: question.id,
            selected_option_id: selectedOption.id,
            is_correct: true,
            marks_awarded: questionMarks,
          };
        }

        wrongAnswers += 1;
        obtainedMarks -= Number(
          quiz.negative_marks
        );

        return {
          question_id: question.id,
          selected_option_id: selectedOption.id,
          is_correct: false,
          marks_awarded: -Number(
            quiz.negative_marks
          ),
        };
      }
    );

    if (obtainedMarks < 0) {
      obtainedMarks = 0;
    }

    const percentage =
      totalMarks > 0
        ? (obtainedMarks / totalMarks) * 100
        : 0;

    const roundedPercentage =
      Math.round(percentage * 100) / 100;

    const resultStatus =
      roundedPercentage >=
      Number(quiz.pass_percentage)
        ? "PASS"
        : "FAIL";

    const submittedAt = now.toISOString();

    /*
     * Remove any previously saved answers for this result.
     * The result itself can only be submitted once.
     */
    const { error: deleteAnswersError } =
      await supabase
        .from("quiz_answers")
        .delete()
        .eq("result_id", resultId);

    if (deleteAnswersError) {
      return NextResponse.json(
        {
          success: false,
          message: deleteAnswersError.message,
        },
        { status: 500 }
      );
    }

    const answerInsertRows =
      calculatedAnswers.map((answer) => ({
        result_id: resultId,
        question_id: answer.question_id,
        selected_option_id:
          answer.selected_option_id,
        is_correct: answer.is_correct,
        marks_awarded: answer.marks_awarded,
        answered_at: submittedAt,
      }));

    if (answerInsertRows.length > 0) {
      const { error: answersInsertError } =
        await supabase
          .from("quiz_answers")
          .insert(answerInsertRows);

      if (answersInsertError) {
        return NextResponse.json(
          {
            success: false,
            message:
              answersInsertError.message,
          },
          { status: 500 }
        );
      }
    }

    /*
     * Update only if the attempt is still unsubmitted.
     * This prevents a second normal submission.
     */
    const { data: updatedResult, error: updateError } =
      await supabase
        .from("quiz_results")
        .update({
          total_questions: questionRows.length,
          correct_answers: correctAnswers,
          wrong_answers: wrongAnswers,
          unanswered,
          total_marks: Number(
            totalMarks.toFixed(2)
          ),
          obtained_marks: Number(
            obtainedMarks.toFixed(2)
          ),
          percentage: Number(
            roundedPercentage.toFixed(2)
          ),
          result_status: resultStatus,
          submitted_at: submittedAt,
          submission_type: finalSubmissionType,
        })
        .eq("id", resultId)
        .eq("student_id", studentId)
        .is("submitted_at", null)
        .select("*")
        .maybeSingle();

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          message: updateError.message,
        },
        { status: 500 }
      );
    }

    if (!updatedResult) {
      return NextResponse.json(
        {
          success: false,
          alreadySubmitted: true,
          resultId,
          message:
            "This quiz was submitted already.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      result: {
        id: updatedResult.id,
        quiz_id: updatedResult.quiz_id,
        student_id: updatedResult.student_id,
        total_questions:
          updatedResult.total_questions,
        correct_answers:
          updatedResult.correct_answers,
        wrong_answers:
          updatedResult.wrong_answers,
        unanswered: updatedResult.unanswered,
        total_marks:
          Number(updatedResult.total_marks),
        obtained_marks:
          Number(updatedResult.obtained_marks),
        percentage:
          Number(updatedResult.percentage),
        result_status:
          updatedResult.result_status,
        started_at:
          updatedResult.started_at,
        submitted_at:
          updatedResult.submitted_at,
        submission_type:
          updatedResult.submission_type,
      },
    });
  } catch (error) {
    console.error("Quiz submit API error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to submit quiz.",
      },
      { status: 500 }
    );
  }
}