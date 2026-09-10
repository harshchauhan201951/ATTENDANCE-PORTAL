import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type SubmitBody = {
  resultId: number | string;
  studentId: number | string;
  answers?: Record<string, number | string | null>;
  submissionType?: string;
};

function cleanSubmissionType(value: unknown): "manual" | "time_expired" {
  if (value === "time_expired") {
    return "time_expired";
  }

  return "manual";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SubmitBody;

    const resultId = Number(body.resultId);
    const studentId = Number(body.studentId);

    if (
      !Number.isFinite(resultId) ||
      resultId <= 0 ||
      !Number.isFinite(studentId) ||
      studentId <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid result or student." },
        { status: 400 }
      );
    }

    const answers =
      body.answers && typeof body.answers === "object"
        ? body.answers
        : {};

    const requestedType =
      cleanSubmissionType(body.submissionType);

    const { data: result, error: resultError } =
      await supabaseAdmin
        .from("quiz_results")
        .select("*")
        .eq("id", resultId)
        .eq("student_id", studentId)
        .maybeSingle();

    if (resultError) {
      return NextResponse.json(
        { error: resultError.message },
        { status: 500 }
      );
    }

    if (!result) {
      return NextResponse.json(
        { error: "Quiz attempt not found." },
        { status: 404 }
      );
    }

    if (result.submitted_at) {
      return NextResponse.json(
        {
          success: true,
          alreadySubmitted: true,
          result,
        },
        { status: 200 }
      );
    }

    const { data: quiz, error: quizError } =
      await supabaseAdmin
        .from("quiz_tests")
        .select(
          `
          id,
          title,
          duration_minutes,
          marks_per_question,
          negative_marks,
          pass_percentage
          `
        )
        .eq("id", result.quiz_id)
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

    const { data: questions, error: questionError } =
      await supabaseAdmin
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quiz.id)
        .order("question_order", {
          ascending: true,
        });

    if (questionError) {
      return NextResponse.json(
        { error: questionError.message },
        { status: 500 }
      );
    }

    const questionList = questions || [];

    const questionIds = questionList.map(
      (question) => question.id
    );

    let optionList: any[] = [];

    if (questionIds.length > 0) {
      const { data: options, error: optionError } =
        await supabaseAdmin
          .from("quiz_options")
          .select("*")
          .in("question_id", questionIds);

      if (optionError) {
        return NextResponse.json(
          { error: optionError.message },
          { status: 500 }
        );
      }

      optionList = options || [];
    }

    const now = new Date();

    const startedAt = result.started_at
      ? new Date(result.started_at)
      : now;

    const durationMinutes =
      Number(quiz.duration_minutes) > 0
        ? Number(quiz.duration_minutes)
        : 30;

    const attemptEnd = new Date(
      startedAt.getTime() +
        durationMinutes * 60 * 1000
    );

    const submissionIsLate =
      now.getTime() >= attemptEnd.getTime();

    const finalSubmissionType =
      submissionIsLate
        ? "time_expired"
        : requestedType;

    let correctAnswers = 0;
    let wrongAnswers = 0;
    let unanswered = 0;
    let totalMarks = 0;
    let obtainedMarks = 0;

    const answerRows: Array<{
      result_id: number;
      question_id: number;
      selected_option_id: number | null;
      is_correct: boolean;
      marks_awarded: number;
      answered_at: string | null;
    }> = [];

    for (const question of questionList) {
      const questionOptions = optionList.filter(
        (option) =>
          Number(option.question_id) ===
          Number(question.id)
      );

      const correctOption = questionOptions.find(
        (option) =>
          option.is_correct === true
      );

      const questionMarks =
        Number(question.marks) > 0
          ? Number(question.marks)
          : Number(quiz.marks_per_question) || 0;

      const negativeMarks =
        Number(question.negative_marks) >= 0
          ? Number(question.negative_marks)
          : Number(quiz.negative_marks) || 0;

      totalMarks += questionMarks;

      const rawSelected =
        answers[String(question.id)] ??
        answers[question.id] ??
        null;

      const selectedOptionId =
        rawSelected === null ||
        rawSelected === undefined ||
        rawSelected === ""
          ? null
          : Number(rawSelected);

      if (
        selectedOptionId === null ||
        !Number.isFinite(selectedOptionId)
      ) {
        unanswered += 1;

        answerRows.push({
          result_id: result.id,
          question_id: question.id,
          selected_option_id: null,
          is_correct: false,
          marks_awarded: 0,
          answered_at: null,
        });

        continue;
      }

      const selectedOption =
        questionOptions.find(
          (option) =>
            Number(option.id) ===
            selectedOptionId
        );

      const isCorrect =
        Boolean(selectedOption) &&
        Boolean(correctOption) &&
        Number(selectedOption.id) ===
          Number(correctOption.id);

      if (isCorrect) {
        correctAnswers += 1;
        obtainedMarks += questionMarks;
      } else {
        wrongAnswers += 1;
        obtainedMarks -= negativeMarks;
      }

      answerRows.push({
        result_id: result.id,
        question_id: question.id,
        selected_option_id: selectedOption
          ? selectedOptionId
          : null,
        is_correct: isCorrect,
        marks_awarded: isCorrect
          ? questionMarks
          : -negativeMarks,
        answered_at: now.toISOString(),
      });
    }

    obtainedMarks = Math.max(
      0,
      Number(obtainedMarks.toFixed(2))
    );

    totalMarks = Number(
      totalMarks.toFixed(2)
    );

    const percentage =
      totalMarks > 0
        ? Number(
            (
              (obtainedMarks / totalMarks) *
              100
            ).toFixed(2)
          )
        : 0;

    const passPercentage =
      Number(quiz.pass_percentage) >= 0
        ? Number(quiz.pass_percentage)
        : 40;

    const resultStatus =
      percentage >= passPercentage
        ? "PASS"
        : "FAIL";

    /*
     * Save the final aggregate result first.
     * This prevents a second request from treating
     * an already-submitted attempt as still open.
     */
    const submittedAt =
      now.toISOString();

    const { data: updatedResult, error: updateError } =
      await supabaseAdmin
        .from("quiz_results")
        .update({
          total_questions: questionList.length,
          correct_answers: correctAnswers,
          wrong_answers: wrongAnswers,
          unanswered,
          total_marks: totalMarks,
          obtained_marks: obtainedMarks,
          percentage,
          result_status: resultStatus,
          submitted_at: submittedAt,
          submission_type: finalSubmissionType,
          updated_at: submittedAt,
        })
        .eq("id", result.id)
        .eq("student_id", studentId)
        .is("submitted_at", null)
        .select("*")
        .maybeSingle();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    /*
     * If another request submitted first, return the
     * already-saved result instead of overwriting it.
     */
    if (!updatedResult) {
      const { data: alreadySaved } =
        await supabaseAdmin
          .from("quiz_results")
          .select("*")
          .eq("id", result.id)
          .eq("student_id", studentId)
          .maybeSingle();

      return NextResponse.json(
        {
          success: true,
          alreadySubmitted: true,
          result: alreadySaved,
        },
        { status: 200 }
      );
    }

    /*
     * Save question-wise answers.
     */
    const { error: deleteAnswersError } =
      await supabaseAdmin
        .from("quiz_answers")
        .delete()
        .eq("result_id", result.id);

    if (deleteAnswersError) {
      console.error(
        "Old quiz answers delete error:",
        deleteAnswersError
      );
    }

    if (answerRows.length > 0) {
      const { error: answerInsertError } =
        await supabaseAdmin
          .from("quiz_answers")
          .insert(answerRows);

      if (answerInsertError) {
        console.error(
          "Quiz answers insert error:",
          answerInsertError
        );
      }
    }

    return NextResponse.json({
      success: true,
      alreadySubmitted: false,
      result: updatedResult,
    });
  } catch (error) {
    console.error(
      "Quiz submit API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to submit quiz.",
      },
      { status: 500 }
    );
  }
}