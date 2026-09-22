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

/*
 * Student's normal quiz start window.
 *
 * New normal attempt:
 * 05:00 AM IST <= start < 09:00 PM IST
 *
 * IMPORTANT:
 * This restriction does NOT apply to an authorized
 * re-attempt.
 */
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

    /*
     * The frontend sends reattempt=true only when
     * the student has clicked the RE-ATTEMPT button.
     *
     * Normal Start Quiz:
     *     reattempt = false
     *
     * Authorized Re-attempt:
     *     reattempt = true
     */
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

    /*
     * Only published quizzes can be started.
     */
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
     * ORIGINAL TEACHER SCHEDULE
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

    /*
     * Existing quiz duration is retained.
     * RACER quizzes currently use 30 minutes.
     */
    const durationMinutes = Math.max(
      1,
      safeNumber(
        quiz.duration_minutes,
        30
      )
    );

    /*
     * ---------------------------------------------------------
     * NORMAL STUDENT START WINDOW
     * ---------------------------------------------------------
     */

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
     *
     * IMPORTANT:
     * We cannot use maybeSingle() anymore because a student
     * can now have multiple attempts for the same quiz.
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
     * ---------------------------------------------------------
     * FIND UNFINISHED ATTEMPT
     * ---------------------------------------------------------
     *
     * If the student refreshes the page or comes back to an
     * unfinished attempt, resume that exact result.
     *
     * This is important for re-attempts too.
     */
    const unfinishedResult =
      results.find(
        (result) =>
          !result.submitted_at
      );

    /*
     * ---------------------------------------------------------
     * RESUME EXISTING ATTEMPT
     * ---------------------------------------------------------
     *
     * This happens before checking re-attempt permission.
     *
     * Therefore refreshing the re-attempt page will NOT consume
     * another teacher permission or create another result.
     */

    let resultId: number;
    let startedAt: Date;
    let attemptNumber: number;
    let createdNewAttempt = false;
    let reattemptPermissionId:
      number | null = null;

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
      /*
       * -------------------------------------------------------
       * NO UNFINISHED ATTEMPT
       * -------------------------------------------------------
       */

      const submittedResults =
        results.filter(
          (result) =>
            Boolean(
              result.submitted_at
            )
        );

      /*
       * =======================================================
       * AUTHORIZED RE-ATTEMPT
       * =======================================================
       *
       * This branch runs ONLY after the student clicks the
       * RE-ATTEMPT button.
       */
      if (isReattempt) {
        /*
         * A re-attempt is only valid after an existing attempt
         * has been submitted.
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
         * Find an unused teacher permission.
         */
        const {
          data: permission,
          error: permissionError,
        } = await supabaseAdmin
          .from(
            "quiz_reattempt_permissions"
          )
          .select("*")
          .eq("quiz_id", quizId)
          .eq("student_id", studentId)
          .eq("allowed", true)
          .is("used_at", null)
          .order("created_at", {
            ascending: true,
          })
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
         * Find the next attempt number.
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
         * -----------------------------------------------------
         * CREATE NEW RE-ATTEMPT
         * -----------------------------------------------------
         *
         * Timer starts RIGHT NOW.
         *
         * There is NO 9 PM check here.
         */
        startedAt = now;

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
            total_questions: 0,
            correct_answers: 0,
            wrong_answers: 0,
            unanswered: 0,
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
         * -----------------------------------------------------
         * CONSUME THE TEACHER PERMISSION
         * -----------------------------------------------------
         *
         * Only this permission is consumed.
         *
         * If another request already consumed it, remove the
         * newly-created result so the permission cannot be
         * double-used.
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

          /*
           * Remove the result created by this request.
           */
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
         * =====================================================
         * NORMAL ATTEMPT
         * =====================================================
         *
         * If there is already a submitted result and the
         * request is NOT a re-attempt, block it.
         */

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
         * -----------------------------------------------------
         * NORMAL NEW ATTEMPT TIME CHECK
         * -----------------------------------------------------
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

        /*
         * At exactly 09:00 PM and after, a NORMAL new attempt
         * cannot be started.
         *
         * This does NOT affect authorized re-attempts.
         */
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

        /*
         * Original attempt number.
         */
        attemptNumber = 1;

        startedAt = now;

        /*
         * -----------------------------------------------------
         * CREATE ORIGINAL ATTEMPT
         * -----------------------------------------------------
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
            total_questions: 0,
            correct_answers: 0,
            wrong_answers: 0,
            unanswered: 0,
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
     *
     * Timer begins from the student's actual start time.
     *
     * Normal attempt:
     *     30 minutes from actual start.
     *
     * Re-attempt:
     *     30 minutes from the moment Re-attempt was clicked.
     *
     * A normal attempt may continue beyond 9 PM if it started
     * before 9 PM.
     */
    const attemptEnd = new Date(
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
     * If an old unfinished attempt has already expired,
     * return timeExpired so the existing frontend can submit
     * it as time_expired.
     *
     * Newly-created attempts should never normally reach here.
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
        isReattempt:
          attemptNumber > 1,
        reattemptPermissionId,
        quiz: {
          ...quiz,
          duration_minutes:
            durationMinutes,
        },
        questions: [],
      });
    }

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
      console.error(
        "START QUESTIONS ERROR:",
        questionsError
      );

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

    /*
     * ---------------------------------------------------------
     * LOAD OPTIONS
     * ---------------------------------------------------------
     */

    if (questionIds.length > 0) {
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
        console.error(
          "START OPTIONS ERROR:",
          optionsError
        );

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
     * ---------------------------------------------------------
     * REMOVE CORRECT ANSWER FROM STUDENT RESPONSE
     * ---------------------------------------------------------
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
                Number(question.id)
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

      /*
       * Original teacher schedule.
       */
      scheduledStart:
        scheduledStart.toISOString(),

      /*
       * Normal student start window.
       *
       * This is informational for re-attempts.
       * Re-attempt itself is NOT restricted by it.
       */
      attemptWindowStart:
        attemptWindow.start.toISOString(),

      attemptWindowEnd:
        attemptWindow.end.toISOString(),

      /*
       * Actual timer end.
       */
      endAt:
        attemptEnd.toISOString(),

      remainingMilliseconds,

      timeExpired: false,

      /*
       * true when an existing unfinished attempt was resumed.
       */
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