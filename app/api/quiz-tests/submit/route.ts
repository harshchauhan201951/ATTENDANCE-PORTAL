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

type SubmitBody = {
  resultId: number | string;
  studentId: number | string;
  answers?: Record<
    string,
    number | string | null
  >;
  submissionType?: string;
};

function cleanSubmissionType(
  value: unknown
): "manual" | "time_expired" {
  if (
    value === "time_expired"
  ) {
    return "time_expired";
  }

  return "manual";
}

function safeNumber(
  value: unknown,
  fallback = 0
): number {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function isCorrectOption(
  value: unknown
): boolean {
  if (value === true) {
    return true;
  }

  if (
    typeof value === "string" &&
    value.trim().toLowerCase() ===
      "true"
  ) {
    return true;
  }

  if (Number(value) === 1) {
    return true;
  }

  return false;
}

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as SubmitBody;

    const resultId =
      Number(body.resultId);

    const studentId =
      Number(body.studentId);

    if (
      !Number.isFinite(resultId) ||
      resultId <= 0 ||
      !Number.isFinite(studentId) ||
      studentId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid result or student.",
        },
        { status: 400 }
      );
    }

    const answers =
      body.answers &&
      typeof body.answers === "object"
        ? body.answers
        : {};

    const requestedType =
      cleanSubmissionType(
        body.submissionType
      );

    /*
     * ---------------------------------------------------------
     * LOAD EXACT ATTEMPT
     * ---------------------------------------------------------
     *
     * IMPORTANT:
     * Result ID identifies exactly one attempt.
     *
     * Original attempt:
     *   resultId = one quiz_results row
     *
     * Re-attempt:
     *   resultId = different quiz_results row
     *
     * Therefore their answers and scores can never be mixed.
     */

    const {
      data: result,
      error: resultError,
    } = await supabaseAdmin
      .from("quiz_results")
      .select("*")
      .eq("id", resultId)
      .eq(
        "student_id",
        studentId
      )
      .maybeSingle();

    if (resultError) {
      return NextResponse.json(
        {
          success: false,
          error:
            resultError.message,
        },
        { status: 500 }
      );
    }

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Quiz attempt not found for this student.",
        },
        { status: 404 }
      );
    }

    /*
     * Already submitted:
     * return the exact stored result.
     */
    if (result.submitted_at) {
      return NextResponse.json(
        {
          success: true,
          alreadySubmitted: true,
          result,
          resultId:
            Number(result.id),
        },
        { status: 200 }
      );
    }

    /*
     * ---------------------------------------------------------
     * LOAD QUIZ
     * ---------------------------------------------------------
     */

    const {
      data: quiz,
      error: quizError,
    } = await supabaseAdmin
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
      .eq(
        "id",
        result.quiz_id
      )
      .maybeSingle();

    if (quizError) {
      return NextResponse.json(
        {
          success: false,
          error:
            quizError.message,
        },
        { status: 500 }
      );
    }

    if (!quiz) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Quiz not found.",
        },
        { status: 404 }
      );
    }

    /*
     * ---------------------------------------------------------
     * LOAD QUESTIONS
     * ---------------------------------------------------------
     */

    const {
      data: questions,
      error: questionError,
    } = await supabaseAdmin
      .from("quiz_questions")
      .select("*")
      .eq(
        "quiz_id",
        quiz.id
      )
      .order(
        "question_order",
        {
          ascending: true,
        }
      );

    if (questionError) {
      return NextResponse.json(
        {
          success: false,
          error:
            questionError.message,
        },
        { status: 500 }
      );
    }

    const questionList =
      questions || [];

    /*
     * Never save a fake zero-question result.
     */
    if (
      questionList.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This quiz has no questions available for submission. Please contact the teacher.",
        },
        { status: 422 }
      );
    }

    const questionIds =
      questionList.map(
        (question) =>
          Number(question.id)
      );

    /*
     * ---------------------------------------------------------
     * LOAD OPTIONS IN ONE QUERY
     * ---------------------------------------------------------
     */

    const {
      data: options,
      error: optionError,
    } = await supabaseAdmin
      .from("quiz_options")
      .select("*")
      .in(
        "question_id",
        questionIds
      );

    if (optionError) {
      return NextResponse.json(
        {
          success: false,
          error:
            optionError.message,
        },
        { status: 500 }
      );
    }

    const optionList =
      options || [];

    /*
     * ---------------------------------------------------------
     * SCORE EXACT ATTEMPT
     * ---------------------------------------------------------
     *
     * Marks are calculated from the exact quiz settings and
     * exact question settings for this exact resultId.
     */

    const now =
      new Date();

    const startedAt =
      result.started_at
        ? new Date(
            result.started_at
          )
        : now;

    const durationMinutes =
      Number(
        quiz.duration_minutes
      ) > 0
        ? Number(
            quiz.duration_minutes
          )
        : 30;

    const attemptEnd =
      new Date(
        startedAt.getTime() +
          durationMinutes *
            60 *
            1000
      );

    const submissionIsLate =
      now.getTime() >=
      attemptEnd.getTime();

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
      selected_option_id:
        number | null;
      is_correct: boolean;
      marks_awarded: number;
      answered_at:
        string | null;
    }> = [];

    for (
      const question of questionList
    ) {
      const questionOptions =
        optionList.filter(
          (option) =>
            Number(
              option.question_id
            ) ===
            Number(
              question.id
            )
        );

      const correctOption =
        questionOptions.find(
          (option) =>
            isCorrectOption(
              option.is_correct
            )
        );

      const questionMarks =
        Number(
          question.marks
        ) > 0
          ? Number(
              question.marks
            )
          : Number(
              quiz.marks_per_question
            ) || 0;

      const negativeMarks =
        Number(
          question.negative_marks
        ) >= 0
          ? Number(
              question.negative_marks
            )
          : Number(
              quiz.negative_marks
            ) || 0;

      totalMarks +=
        questionMarks;

      const rawSelected =
        answers[
          String(
            question.id
          )
        ] ??
        answers[
          question.id as any
        ] ??
        null;

      const selectedOptionId =
        rawSelected === null ||
        rawSelected === undefined ||
        rawSelected === ""
          ? null
          : Number(
              rawSelected
            );

      /*
       * -------------------------------------------------------
       * UNANSWERED
       * -------------------------------------------------------
       */

      if (
        selectedOptionId ===
          null ||
        !Number.isFinite(
          selectedOptionId
        )
      ) {
        unanswered += 1;

        answerRows.push({
          result_id:
            result.id,
          question_id:
            Number(
              question.id
            ),
          selected_option_id:
            null,
          is_correct:
            false,
          marks_awarded:
            0,
          answered_at:
            null,
        });

        continue;
      }

      /*
       * -------------------------------------------------------
       * SELECTED OPTION
       * -------------------------------------------------------
       */

      const selectedOption =
        questionOptions.find(
          (option) =>
            Number(
              option.id
            ) ===
            selectedOptionId
        );

      const isCorrect =
        Boolean(
          selectedOption
        ) &&
        Boolean(
          correctOption
        ) &&
        Number(
          selectedOption.id
        ) ===
          Number(
            correctOption.id
          );

      if (isCorrect) {
        correctAnswers += 1;

        obtainedMarks +=
          questionMarks;
      } else {
        wrongAnswers += 1;

        obtainedMarks -=
          negativeMarks;
      }

      answerRows.push({
        result_id:
          result.id,

        question_id:
          Number(
            question.id
          ),

        selected_option_id:
          selectedOption
            ? selectedOptionId
            : null,

        is_correct:
          isCorrect,

        marks_awarded:
          isCorrect
            ? questionMarks
            : -negativeMarks,

        answered_at:
          now.toISOString(),
      });
    }

    /*
     * Never allow negative final marks.
     */
    obtainedMarks =
      Math.max(
        0,
        Number(
          obtainedMarks.toFixed(
            2
          )
        )
      );

    totalMarks =
      Number(
        totalMarks.toFixed(
          2
        )
      );

    const percentage =
      totalMarks > 0
        ? Number(
            (
              (obtainedMarks /
                totalMarks) *
              100
            ).toFixed(2)
          )
        : 0;

    const passPercentage =
      Number(
        quiz.pass_percentage
      ) >= 0
        ? Number(
            quiz.pass_percentage
          )
        : 40;

    const resultStatus =
      percentage >=
      passPercentage
        ? "PASS"
        : "FAIL";

    /*
     * ---------------------------------------------------------
     * SAVE QUESTION-WISE ANSWERS FIRST
     * ---------------------------------------------------------
     *
     * IMPORTANT:
     *
     * Attempt #1:
     *   quiz_answers.result_id = Attempt #1 result ID
     *
     * Re-attempt:
     *   quiz_answers.result_id = Re-attempt result ID
     *
     * Old attempt answers are never attached to the new result.
     */

    const {
      error: deleteAnswersError,
    } = await supabaseAdmin
      .from("quiz_answers")
      .delete()
      .eq(
        "result_id",
        result.id
      );

    if (deleteAnswersError) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to prepare quiz answers for submission.",
          details:
            deleteAnswersError.message,
        },
        { status: 500 }
      );
    }

    if (
      answerRows.length > 0
    ) {
      const {
        error:
          answerInsertError,
      } = await supabaseAdmin
        .from("quiz_answers")
        .insert(
          answerRows
        );

      if (answerInsertError) {
        console.error(
          "Quiz answers insert error:",
          answerInsertError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Quiz answers could not be saved. Your result was not finalized.",
            details:
              answerInsertError.message,
          },
          { status: 500 }
        );
      }
    }

    /*
     * ---------------------------------------------------------
     * UPDATE EXACT RESULT
     * ---------------------------------------------------------
     */

    const submittedAt =
      now.toISOString();

    const {
      data: updatedResult,
      error: updateError,
    } = await supabaseAdmin
      .from("quiz_results")
      .update({
        total_questions:
          questionList.length,

        correct_answers:
          correctAnswers,

        wrong_answers:
          wrongAnswers,

        unanswered,

        total_marks:
          totalMarks,

        obtained_marks:
          obtainedMarks,

        percentage,

        result_status:
          resultStatus,

        submitted_at:
          submittedAt,

        submission_type:
          finalSubmissionType,

        updated_at:
          submittedAt,
      })
      .eq(
        "id",
        result.id
      )
      .eq(
        "student_id",
        studentId
      )
      .is(
        "submitted_at",
        null
      )
      .select("*")
      .maybeSingle();

    if (updateError) {
      console.error(
        "Quiz result update error:",
        updateError
      );

      /*
       * Roll back only this exact attempt's answers.
       */
      await supabaseAdmin
        .from("quiz_answers")
        .delete()
        .eq(
          "result_id",
          result.id
        );

      return NextResponse.json(
        {
          success: false,
          error:
            updateError.message,
        },
        { status: 500 }
      );
    }

    /*
     * ---------------------------------------------------------
     * CONCURRENT SUBMISSION PROTECTION
     * ---------------------------------------------------------
     */

    if (!updatedResult) {
      const {
        data: alreadySaved,
      } = await supabaseAdmin
        .from("quiz_results")
        .select("*")
        .eq(
          "id",
          result.id
        )
        .eq(
          "student_id",
          studentId
        )
        .maybeSingle();

      return NextResponse.json(
        {
          success: true,
          alreadySubmitted: true,
          result:
            alreadySaved,
          resultId:
            result.id,
        },
        { status: 200 }
      );
    }

    /*
     * ---------------------------------------------------------
     * RETURN EXACT FRESH RESULT
     * ---------------------------------------------------------
     */

    return NextResponse.json({
      success: true,
      alreadySubmitted:
        false,
      resultId:
        Number(
          updatedResult.id
        ),
      result:
        updatedResult,
    });
  } catch (error) {
    console.error(
      "Quiz submit API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to submit quiz.",
      },
      { status: 500 }
    );
  }
}