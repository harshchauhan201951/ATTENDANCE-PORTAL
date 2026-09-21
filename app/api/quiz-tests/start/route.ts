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

function parseIST(
  dateValue: unknown,
  timeValue: unknown
): Date | null {
  if (!dateValue) return null;

  const date = String(dateValue).trim();

  if (!date) return null;

  let time = timeValue
    ? String(timeValue).trim()
    : "00:00:00";

  if (/^\d{2}:\d{2}$/.test(time)) {
    time += ":00";
  }

  if (!/^\d{2}:\d{2}:\d{2}$/.test(time)) {
    time = "00:00:00";
  }

  const parsed = new Date(
    `${date}T${time}+05:30`
  );

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
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

function getStudentAttemptWindow(
  scheduledDate: unknown
) {
  if (!scheduledDate) {
    return null;
  }

  const date = String(
    scheduledDate
  ).trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    return null;
  }

  const start = parseIST(
    date,
    "05:00:00"
  );

  const end = parseIST(
    date,
    "21:00:00"
  );

  if (!start || !end) {
    return null;
  }

  return {
    start,
    end,
  };
}

export async function POST(
  request: Request
) {
  try {
    const body = await request.json();

    const quizId = safeNumber(
      body?.quizId
    );

    const studentId = safeNumber(
      body?.studentId
    );

    const isReattempt =
      body?.reattempt === true;

    if (!quizId || !studentId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Quiz ID and Student ID are required.",
        },
        { status: 400 }
      );
    }

    /*
     * ---------------------------------------------------------
     * LOAD STUDENT
     * ---------------------------------------------------------
     */

    const {
      data: student,
      error: studentError,
    } = await supabaseAdmin
      .from("students")
      .select("*")
      .eq("id", studentId)
      .maybeSingle();

    if (studentError) {
      console.error(
        "START STUDENT ERROR:",
        studentError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load student.",
          details:
            studentError.message,
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
      .select("*")
      .eq("id", quizId)
      .maybeSingle();

    if (quizError) {
      console.error(
        "START QUIZ ERROR:",
        quizError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load quiz.",
          details:
            quizError.message,
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
          error:
            "This quiz is not published.",
        },
        { status: 403 }
      );
    }

    const now = new Date();

    /*
     * ---------------------------------------------------------
     * ORIGINAL QUIZ SCHEDULE
     * ---------------------------------------------------------
     */

    const scheduledStart = parseIST(
      quiz.scheduled_date,
      quiz.scheduled_time
    );

    if (!scheduledStart) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Quiz schedule is invalid.",
        },
        { status: 400 }
      );
    }

    const durationMinutes = Math.max(
      1,
      safeNumber(
        quiz.duration_minutes,
        30
      )
    );

    const attemptWindow =
      getStudentAttemptWindow(
        quiz.scheduled_date
      );

    if (!attemptWindow) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Quiz schedule date is invalid.",
        },
        { status: 400 }
      );
    }

    /*
     * ---------------------------------------------------------
     * LOAD ALL PREVIOUS ATTEMPTS
     * ---------------------------------------------------------
     */

    const {
      data: previousResults,
      error: previousResultsError,
    } = await supabaseAdmin
      .from("quiz_results")
      .select("*")
      .eq("quiz_id", quizId)
      .eq("student_id", studentId)
      .order("created_at", {
        ascending: false,
      });

    if (previousResultsError) {
      console.error(
        "START PREVIOUS RESULTS ERROR:",
        previousResultsError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to check previous attempts.",
          details:
            previousResultsError.message,
        },
        { status: 500 }
      );
    }

    const results =
      previousResults || [];

    /*
     * =========================================================
     * IMPORTANT RE-ATTEMPT FIX
     * =========================================================
     *
     * A RE-ATTEMPT must NEVER resume an old unfinished result.
     *
     * If reattempt=true:
     *
     *   - ignore old unfinished attempts
     *   - check teacher permission
     *   - create a NEW result row
     *   - assign next attempt number
     *   - give it a fresh timer
     *
     * This prevents a previous blank/zero result from being
     * accidentally reused by the re-attempt.
     */

    let resultId: number;
    let startedAt: Date;
    let attemptNumber: number;
    let createdNewAttempt = false;
    let reattemptPermissionId:
      number | null = null;

    /*
     * =========================================================
     * AUTHORIZED RE-ATTEMPT
     * =========================================================
     */

    if (isReattempt) {
      const submittedResults =
        results.filter(
          (result) =>
            Boolean(
              result.submitted_at
            )
        );

      /*
       * A re-attempt requires at least one
       * previous submitted attempt.
       */
      if (
        submittedResults.length === 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "A re-attempt is available only after a previous quiz attempt has been submitted.",
          },
          { status: 409 }
        );
      }

      /*
       * Find unused teacher permission.
       */
      const {
        data: permission,
        error: permissionError,
      } = await supabaseAdmin
        .from(
          "quiz_reattempt_permissions"
        )
        .select("*")
        .eq(
          "quiz_id",
          quizId
        )
        .eq(
          "student_id",
          studentId
        )
        .eq(
          "allowed",
          true
        )
        .is(
          "used_at",
          null
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        )
        .limit(1)
        .maybeSingle();

      if (permissionError) {
        console.error(
          "START REATTEMPT PERMISSION ERROR:",
          permissionError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to check re-attempt permission.",
            details:
              permissionError.message,
          },
          { status: 500 }
        );
      }

      if (!permission) {
        return NextResponse.json(
          {
            success: false,
            reattemptNotAuthorized:
              true,
            error:
              "Your teacher has not authorized a re-attempt for this quiz.",
          },
          { status: 403 }
        );
      }

      /*
       * Find next attempt number.
       */
      const highestAttemptNumber =
        results.reduce(
          (
            highest: number,
            result: any
          ) => {
            const number =
              safeNumber(
                result.attempt_number,
                1
              );

            return Math.max(
              highest,
              number
            );
          },
          0
        );

      attemptNumber =
        highestAttemptNumber + 1;

      /*
       * New re-attempt starts NOW.
       */
      startedAt = now;

      /*
       * Load actual question count now.
       * This means even before submission the new
       * attempt knows how many questions it contains.
       */
      const {
        data: questionRows,
        error: questionCountError,
      } = await supabaseAdmin
        .from("quiz_questions")
        .select("id")
        .eq(
          "quiz_id",
          quizId
        );

      if (questionCountError) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to load quiz questions.",
            details:
              questionCountError.message,
          },
          { status: 500 }
        );
      }

      const questionCount =
        (questionRows || []).length;

      /*
       * CREATE COMPLETELY NEW RESULT
       */
      const {
        data: newResult,
        error: insertError,
      } = await supabaseAdmin
        .from("quiz_results")
        .insert({
          quiz_id: quizId,
          student_id: studentId,
          attempt_number:
            attemptNumber,

          total_questions:
            questionCount,

          correct_answers: 0,
          wrong_answers: 0,
          unanswered:
            questionCount,

          total_marks: 0,
          obtained_marks: 0,
          percentage: 0,

          result_status: "FAIL",

          started_at:
            startedAt.toISOString(),

          submitted_at: null,

          submission_type: "manual",
        })
        .select("*")
        .single();

      if (insertError) {
        console.error(
          "START REATTEMPT RESULT INSERT ERROR:",
          insertError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to create re-attempt.",
            details:
              insertError.message,
          },
          { status: 500 }
        );
      }

      resultId = Number(
        newResult.id
      );

      createdNewAttempt = true;

      reattemptPermissionId =
        Number(permission.id);

      /*
       * Consume EXACT permission.
       */
      const {
        data: consumedPermission,
        error: consumeError,
      } = await supabaseAdmin
        .from(
          "quiz_reattempt_permissions"
        )
        .update({
          used_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          permission.id
        )
        .eq(
          "quiz_id",
          quizId
        )
        .eq(
          "student_id",
          studentId
        )
        .eq(
          "allowed",
          true
        )
        .is(
          "used_at",
          null
        )
        .select("id")
        .maybeSingle();

      if (
        consumeError ||
        !consumedPermission
      ) {
        console.error(
          "START REATTEMPT PERMISSION CONSUME ERROR:",
          consumeError
        );

        await supabaseAdmin
          .from("quiz_results")
          .delete()
          .eq(
            "id",
            resultId
          )
          .eq(
            "student_id",
            studentId
          )
          .is(
            "submitted_at",
            null
          );

        return NextResponse.json(
          {
            success: false,
            error:
              "This re-attempt permission has already been used. Please refresh and try again.",
          },
          { status: 409 }
        );
      }
    } else {
      /*
       * =======================================================
       * NORMAL ATTEMPT
       * =======================================================
       */

      /*
       * Only NORMAL attempts can resume an unfinished result.
       */
      const unfinishedResult =
        results.find(
          (result) =>
            !result.submitted_at
        );

      if (unfinishedResult) {
        resultId = Number(
          unfinishedResult.id
        );

        startedAt =
          unfinishedResult.started_at
            ? new Date(
                unfinishedResult.started_at
              )
            : now;

        if (
          Number.isNaN(
            startedAt.getTime()
          )
        ) {
          startedAt = now;
        }

        attemptNumber =
          Math.max(
            1,
            safeNumber(
              unfinishedResult.attempt_number,
              1
            )
          );
      } else {
        const submittedResults =
          results.filter(
            (result) =>
              Boolean(
                result.submitted_at
              )
          );

        if (
          submittedResults.length > 0
        ) {
          return NextResponse.json(
            {
              success: false,
              alreadySubmitted: true,
              error:
                "You have already submitted this quiz.",
            },
            { status: 409 }
          );
        }

        /*
         * Normal new attempt timing.
         */
        if (
          now <
          attemptWindow.start
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                "This quiz can be started only from 5:00 AM on the scheduled date.",
              attemptWindowStart:
                attemptWindow.start.toISOString(),
              attemptWindowEnd:
                attemptWindow.end.toISOString(),
            },
            { status: 403 }
          );
        }

        if (
          now >=
          attemptWindow.end
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                "The quiz starting time has ended. New attempts are allowed only until 9:00 PM on the scheduled date.",
              attemptWindowStart:
                attemptWindow.start.toISOString(),
              attemptWindowEnd:
                attemptWindow.end.toISOString(),
            },
            { status: 403 }
          );
        }

        attemptNumber = 1;
        startedAt = now;

        const {
          data: questionRows,
          error: questionCountError,
        } = await supabaseAdmin
          .from("quiz_questions")
          .select("id")
          .eq(
            "quiz_id",
            quizId
          );

        if (questionCountError) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Unable to load quiz questions.",
              details:
                questionCountError.message,
            },
            { status: 500 }
          );
        }

        const questionCount =
          (questionRows || []).length;

        const {
          data: newResult,
          error: insertError,
        } = await supabaseAdmin
          .from("quiz_results")
          .insert({
            quiz_id: quizId,
            student_id: studentId,
            attempt_number:
              attemptNumber,

            total_questions:
              questionCount,

            correct_answers: 0,
            wrong_answers: 0,
            unanswered:
              questionCount,

            total_marks: 0,
            obtained_marks: 0,
            percentage: 0,

            result_status: "FAIL",

            started_at:
              startedAt.toISOString(),

            submitted_at: null,

            submission_type: "manual",
          })
          .select("*")
          .single();

        if (insertError) {
          console.error(
            "START RESULT INSERT ERROR:",
            insertError
          );

          return NextResponse.json(
            {
              success: false,
              error:
                "Unable to create quiz attempt.",
              details:
                insertError.message,
            },
            { status: 500 }
          );
        }

        resultId = Number(
          newResult.id
        );

        createdNewAttempt = true;
      }
    }

    /*
     * ---------------------------------------------------------
     * ACTUAL ATTEMPT TIMER
     * ---------------------------------------------------------
     */

    const attemptEnd =
      new Date(
        startedAt.getTime() +
          durationMinutes *
            60 *
            1000
      );

    const remainingMilliseconds =
      Math.max(
        0,
        attemptEnd.getTime() -
          now.getTime()
      );

    /*
     * ---------------------------------------------------------
     * LOAD QUESTIONS
     * ---------------------------------------------------------
     */

    const {
      data: questions,
      error: questionsError,
    } = await supabaseAdmin
      .from("quiz_questions")
      .select("*")
      .eq("quiz_id", quizId)
      .order(
        "question_order",
        {
          ascending: true,
        }
      );

    if (questionsError) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load quiz questions.",
          details:
            questionsError.message,
        },
        { status: 500 }
      );
    }

    const questionIds =
      (questions || []).map(
        (question) =>
          Number(question.id)
      );

    let options: any[] = [];

    if (
      questionIds.length > 0
    ) {
      const {
        data: optionRows,
        error: optionsError,
      } = await supabaseAdmin
        .from("quiz_options")
        .select("*")
        .in(
          "question_id",
          questionIds
        )
        .order(
          "option_order",
          {
            ascending: true,
          }
        );

      if (optionsError) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to load quiz options.",
            details:
              optionsError.message,
          },
          { status: 500 }
        );
      }

      options =
        optionRows || [];
    }

    /*
     * Never send correct answers to student.
     */
    const questionsWithOptions =
      (questions || []).map(
        (question) => ({
          ...question,

          options: options
            .filter(
              (option) =>
                Number(
                  option.question_id
                ) ===
                Number(
                  question.id
                )
            )
            .map((option) => {
              const {
                is_correct,
                ...safeOption
              } = option;

              return safeOption;
            }),
        })
      );

    /*
     * ---------------------------------------------------------
     * EXPIRED ATTEMPT
     * ---------------------------------------------------------
     */

    if (
      remainingMilliseconds <= 0
    ) {
      return NextResponse.json({
        success: true,

        resultId,

        quizId,

        studentId,

        attemptNumber,

        isReattempt:
          attemptNumber > 1,

        reattemptPermissionId,

        startedAt:
          startedAt.toISOString(),

        scheduledStart:
          scheduledStart.toISOString(),

        attemptWindowStart:
          attemptWindow.start.toISOString(),

        attemptWindowEnd:
          attemptWindow.end.toISOString(),

        endAt:
          attemptEnd.toISOString(),

        remainingMilliseconds: 0,

        timeExpired: true,

        alreadyStarted:
          !createdNewAttempt,

        quiz: {
          ...quiz,
          duration_minutes:
            durationMinutes,
        },

        questions:
          questionsWithOptions,
      });
    }

    /*
     * ---------------------------------------------------------
     * FINAL RESPONSE
     * ---------------------------------------------------------
     */

    return NextResponse.json({
      success: true,

      resultId,

      quizId,

      studentId,

      attemptNumber,

      isReattempt:
        attemptNumber > 1,

      reattemptPermissionId,

      startedAt:
        startedAt.toISOString(),

      scheduledStart:
        scheduledStart.toISOString(),

      attemptWindowStart:
        attemptWindow.start.toISOString(),

      attemptWindowEnd:
        attemptWindow.end.toISOString(),

      endAt:
        attemptEnd.toISOString(),

      remainingMilliseconds,

      timeExpired: false,

      alreadyStarted:
        !createdNewAttempt,

      quiz: {
        ...quiz,
        duration_minutes:
          durationMinutes,
      },

      questions:
        questionsWithOptions,
    });
  } catch (error) {
    console.error(
      "START QUIZ UNEXPECTED ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to start quiz.",
        details:
          error instanceof Error
            ? error.message
            : "Unknown server error",
      },
      { status: 500 }
    );
  }
}