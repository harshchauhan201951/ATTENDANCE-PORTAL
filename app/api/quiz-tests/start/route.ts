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

function calculateTotalMarks(
  questions: any[],
  quiz: any
): number {
  const total = questions.reduce(
    (sum, question) => {
      const marks =
        Number(question?.marks) > 0
          ? Number(question.marks)
          : Number(quiz?.marks_per_question) || 0;

      return sum + marks;
    },
    0
  );

  return Number(total.toFixed(2));
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

    const scheduledStart =
      parseIST(
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

    const durationMinutes =
      Math.max(
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
     * LOAD QUESTIONS FIRST
     * ---------------------------------------------------------
     *
     * IMPORTANT:
     * Never create a quiz_results row with 0 questions.
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

    const questionList =
      questions || [];

    if (questionList.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This quiz has no questions. Please add the quiz questions before starting the quiz.",
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
     * LOAD ALL OPTIONS
     * ---------------------------------------------------------
     */

    let options: any[] = [];

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

    /*
     * Never send correct answers to the student.
     */
    const questionsWithOptions =
      questionList.map(
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

    const questionCount =
      questionList.length;

    const totalMarks =
      calculateTotalMarks(
        questionList,
        quiz
      );

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
     * ---------------------------------------------------------
     * ATTEMPT VARIABLES
     * ---------------------------------------------------------
     */

    let resultId: number;
    let startedAt: Date;
    let attemptNumber: number;
    let createdNewAttempt = false;
    let reattemptPermissionId:
      number | null = null;

    /*
     * =========================================================
     * RE-ATTEMPT
     * =========================================================
     */

    if (isReattempt) {
      /*
       * IMPORTANT:
       * If an older reattempt row already exists but was never
       * submitted, RESUME THAT EXACT ROW.
       *
       * This recovers old/orphaned reattempt records instead of
       * creating Attempt #3 and losing the old Attempt #2.
       */
      const unfinishedReattempt =
        results.find(
          (result) =>
            !result.submitted_at &&
            safeNumber(
              result.attempt_number,
              1
            ) > 1
        );

      if (unfinishedReattempt) {
        resultId =
          Number(
            unfinishedReattempt.id
          );

        attemptNumber =
          Math.max(
            2,
            safeNumber(
              unfinishedReattempt.attempt_number,
              2
            )
          );

        const existingStartedAt =
          unfinishedReattempt.started_at
            ? new Date(
                unfinishedReattempt.started_at
              )
            : null;

        /*
         * The previously created empty/orphaned attempt
         * has no question count. Recover it as a fresh attempt.
         */
        const shouldRecoverEmptyAttempt =
          safeNumber(
            unfinishedReattempt.total_questions
          ) <= 0;

        if (
          shouldRecoverEmptyAttempt
        ) {
          startedAt = now;
        } else if (
          existingStartedAt &&
          !Number.isNaN(
            existingStartedAt.getTime()
          )
        ) {
          startedAt =
            existingStartedAt;
        } else {
          startedAt = now;
        }

        const { error: recoverError } =
          await supabaseAdmin
            .from("quiz_results")
            .update({
              total_questions:
                questionCount,
              unanswered:
                questionCount,
              total_marks:
                totalMarks,
              correct_answers: 0,
              wrong_answers: 0,
              obtained_marks:
                safeNumber(
                  unfinishedReattempt.obtained_marks
                ),
              percentage:
                safeNumber(
                  unfinishedReattempt.percentage
                ),
              result_status:
                "IN_PROGRESS",
              started_at:
                startedAt.toISOString(),
            })
            .eq(
              "id",
              resultId
            )
            .eq(
              "quiz_id",
              quizId
            )
            .eq(
              "student_id",
              studentId
            )
            .is(
              "submitted_at",
              null
            );

        if (recoverError) {
          console.error(
            "START REATTEMPT RECOVERY ERROR:",
            recoverError
          );

          return NextResponse.json(
            {
              success: false,
              error:
                "Unable to recover the previous re-attempt.",
              details:
                recoverError.message,
            },
            { status: 500 }
          );
        }
      } else {
        const submittedResults =
          results.filter(
            (result) =>
              Boolean(
                result.submitted_at
              )
          );

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
         * -----------------------------------------------------
         * FIND UNUSED TEACHER PERMISSION
         * -----------------------------------------------------
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

        startedAt = now;

        /*
         * CREATE NEW SEPARATE ATTEMPT
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

            total_marks:
              totalMarks,
            obtained_marks: 0,
            percentage: 0,

            result_status:
              "IN_PROGRESS",

            started_at:
              startedAt.toISOString(),

            submitted_at: null,

            submission_type:
              "manual",
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

        resultId =
          Number(
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
      }
    } else {
      /*
       * =======================================================
       * NORMAL ATTEMPT
       * =======================================================
       */

      /*
       * Only Attempt #1 may be resumed by the normal flow.
       */
      const unfinishedNormalResult =
        results.find(
          (result) =>
            !result.submitted_at &&
            safeNumber(
              result.attempt_number,
              1
            ) <= 1
        );

      if (unfinishedNormalResult) {
        resultId =
          Number(
            unfinishedNormalResult.id
          );

        attemptNumber = 1;

        const existingStartedAt =
          unfinishedNormalResult.started_at
            ? new Date(
                unfinishedNormalResult.started_at
              )
            : null;

        startedAt =
          existingStartedAt &&
          !Number.isNaN(
            existingStartedAt.getTime()
          )
            ? existingStartedAt
            : now;

        /*
         * Repair any incomplete normal-attempt metadata.
         */
        const { error: repairError } =
          await supabaseAdmin
            .from("quiz_results")
            .update({
              total_questions:
                questionCount,
              unanswered:
                questionCount,
              total_marks:
                totalMarks,
              result_status:
                "IN_PROGRESS",
              started_at:
                startedAt.toISOString(),
            })
            .eq(
              "id",
              resultId
            )
            .eq(
              "quiz_id",
              quizId
            )
            .eq(
              "student_id",
              studentId
            )
            .is(
              "submitted_at",
              null
            );

        if (repairError) {
          console.error(
            "START NORMAL ATTEMPT REPAIR ERROR:",
            repairError
          );

          return NextResponse.json(
            {
              success: false,
              error:
                "Unable to resume the quiz attempt.",
              details:
                repairError.message,
            },
            { status: 500 }
          );
        }
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

            total_marks:
              totalMarks,
            obtained_marks: 0,
            percentage: 0,

            result_status:
              "IN_PROGRESS",

            started_at:
              startedAt.toISOString(),

            submitted_at: null,

            submission_type:
              "manual",
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

        resultId =
          Number(
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