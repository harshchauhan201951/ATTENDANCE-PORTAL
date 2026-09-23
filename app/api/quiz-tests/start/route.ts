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
  if (!dateValue) {
    return null;
  }

  const date = String(dateValue).trim();

  if (!date) {
    return null;
  }

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

function getAttemptWindow(
  scheduledDate: unknown,
  endHour: number
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
    `${String(endHour).padStart(
      2,
      "0"
    )}:00:00`
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
          : Number(
              quiz?.marks_per_question
            ) || 0;

      return sum + marks;
    },
    0
  );

  return Number(
    total.toFixed(2)
  );
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

/*
 * ---------------------------------------------------------
 * FINALIZE EXPIRED ATTEMPT
 * ---------------------------------------------------------
 *
 * This is the server-side safety net.
 *
 * If the browser is closed before sendBeacon/fetch can reach
 * the submit API, the attempt can otherwise remain IN_PROGRESS.
 *
 * We therefore finalize an expired attempt whenever the start
 * API sees that its 30-minute window has already ended.
 *
 * Any quiz_answers already saved for the result are scored.
 * If there are no saved answers, the attempt becomes 0 marks.
 */
async function finalizeExpiredAttempt(
  result: any,
  questions: any[],
  options: any[],
  quiz: any,
  studentId: number
) {
  const resultId =
    Number(result?.id);

  if (
    !Number.isFinite(resultId) ||
    resultId <= 0
  ) {
    return null;
  }

  const {
    data: savedAnswers,
    error: savedAnswersError,
  } = await supabaseAdmin
    .from("quiz_answers")
    .select("*")
    .eq(
      "result_id",
      resultId
    );

  if (savedAnswersError) {
    console.error(
      "FINALIZE EXPIRED ANSWERS ERROR:",
      savedAnswersError
    );

    return null;
  }

  const answerRows =
    savedAnswers || [];

  let correctAnswers = 0;
  let wrongAnswers = 0;
  let unanswered = 0;
  let totalMarks = 0;
  let obtainedMarks = 0;

  for (
    const question of questions
  ) {
    const questionId =
      Number(question.id);

    const questionOptions =
      options.filter(
        (option) =>
          Number(
            option.question_id
          ) === questionId
      );

    const correctOption =
      questionOptions.find(
        (option) =>
          isCorrectOption(
            option.is_correct
          )
      );

    const questionMarks =
      Number(question?.marks) > 0
        ? Number(question.marks)
        : Number(
            quiz?.marks_per_question
          ) || 0;

    const negativeMarks =
      Number(
        question?.negative_marks
      ) >= 0
        ? Number(
            question.negative_marks
          )
        : Number(
            quiz?.negative_marks
          ) || 0;

    totalMarks +=
      questionMarks;

    const savedAnswer =
      answerRows.find(
        (answer: any) =>
          Number(
            answer.question_id
          ) === questionId
      );

    const selectedOptionId =
      savedAnswer &&
      savedAnswer.selected_option_id !==
        null &&
      savedAnswer.selected_option_id !==
        undefined &&
      savedAnswer.selected_option_id !==
        ""
        ? Number(
            savedAnswer.selected_option_id
          )
        : null;

    if (
      selectedOptionId === null ||
      !Number.isFinite(
        selectedOptionId
      )
    ) {
      unanswered += 1;
      continue;
    }

    const selectedOption =
      questionOptions.find(
        (option) =>
          Number(option.id) ===
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
  }

  obtainedMarks =
    Math.max(
      0,
      Number(
        obtainedMarks.toFixed(2)
      )
    );

  totalMarks =
    Number(
      totalMarks.toFixed(2)
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
      quiz?.pass_percentage
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

  const submittedAt =
    new Date().toISOString();

  const {
    data: updatedResult,
    error: updateError,
  } = await supabaseAdmin
    .from("quiz_results")
    .update({
      total_questions:
        questions.length,

      correct_answers:
        correctAnswers,

      wrong_answers:
        wrongAnswers,

      unanswered:
        unanswered,

      total_marks:
        totalMarks,

      obtained_marks:
        obtainedMarks,

      percentage:
        percentage,

      result_status:
        resultStatus,

      submitted_at:
        submittedAt,

      submission_type:
        "time_expired",

      updated_at:
        submittedAt,
    })
    .eq(
      "id",
      resultId
    )
    .eq(
      "quiz_id",
      Number(result.quiz_id)
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
      "FINALIZE EXPIRED RESULT ERROR:",
      updateError
    );

    return null;
  }

  return (
    updatedResult || null
  );
}

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

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
      .eq(
        "id",
        studentId
      )
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
          error:
            "Student not found.",
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
      .eq(
        "id",
        quizId
      )
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
          error:
            "Quiz not found.",
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

    const now =
      new Date();

    /*
     * ---------------------------------------------------------
     * QUIZ SCHEDULE
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

    /*
     * Normal attempt:
     * 5:00 AM -> 9:00 PM IST
     *
     * Re-attempt:
     * Controlled by an active teacher permission.
     * It is NOT restricted by the original quiz date/time.
     */

    const normalAttemptWindow =
      getAttemptWindow(
        quiz.scheduled_date,
        21
      );

    if (!normalAttemptWindow) {
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
     * LOAD QUESTIONS
     * ---------------------------------------------------------
     */

    const {
      data: questions,
      error: questionsError,
    } = await supabaseAdmin
      .from("quiz_questions")
      .select("*")
      .eq(
        "quiz_id",
        quizId
      )
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

    if (
      questionList.length === 0
    ) {
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
     * LOAD OPTIONS
     * ---------------------------------------------------------
     */

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

    const options =
      optionRows || [];

    /*
     * Never send correct-answer information to student.
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
      error:
        previousResultsError,
    } = await supabaseAdmin
      .from("quiz_results")
      .select("*")
      .eq(
        "quiz_id",
        quizId
      )
      .eq(
        "student_id",
        studentId
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

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

    const highestAttemptNumber =
      results.reduce(
        (
          highest: number,
          result: any
        ) => {
          const current =
            Math.max(
              1,
              safeNumber(
                result?.attempt_number,
                1
              )
            );

          return Math.max(
            highest,
            current
          );
        },
        0
      );

    /*
     * =========================================================
     * RE-ATTEMPT
     * =========================================================
     */

    if (isReattempt) {
      /*
       * -------------------------------------------------------
       * RESUME OR FINALIZE AN UNFINISHED RE-ATTEMPT
       * -------------------------------------------------------
       */

      const unfinishedReattempt =
        results
          .filter(
            (result) =>
              !result.submitted_at &&
              safeNumber(
                result.attempt_number,
                1
              ) > 1
          )
          .sort(
            (a, b) =>
              safeNumber(
                b.attempt_number,
                1
              ) -
              safeNumber(
                a.attempt_number,
                1
              )
          )[0] || null;

      if (
        unfinishedReattempt
      ) {
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

        const validExistingStartedAt =
          existingStartedAt &&
          !Number.isNaN(
            existingStartedAt.getTime()
          )
            ? existingStartedAt
            : null;

        startedAt =
          validExistingStartedAt ||
          now;

        const attemptEnd =
          new Date(
            startedAt.getTime() +
              durationMinutes *
                60 *
                1000
          );

        /*
         * IMPORTANT:
         * Never revive an already expired attempt.
         */
        if (
          now.getTime() >=
          attemptEnd.getTime()
        ) {
          const finalized =
            await finalizeExpiredAttempt(
              unfinishedReattempt,
              questionList,
              options,
              quiz,
              studentId
            );

          if (!finalized) {
            return NextResponse.json(
              {
                success: false,
                error:
                  "This re-attempt has expired and could not be finalized automatically.",
              },
              { status: 500 }
            );
          }

          return NextResponse.json({
            success: true,
            resultId:
              Number(
                finalized.id
              ),
            quizId,
            studentId,
            attemptNumber,
            isReattempt: true,
            reattemptPermissionId:
              null,
            startedAt:
              startedAt.toISOString(),
            scheduledStart:
              scheduledStart.toISOString(),
            attemptWindowStart:
              normalAttemptWindow.start.toISOString(),
            attemptWindowEnd:
              normalAttemptWindow.end.toISOString(),
            endAt:
              attemptEnd.toISOString(),
            remainingMilliseconds: 0,
            timeExpired: true,
            alreadyStarted: true,
            attemptFinalized: true,
            quiz: {
              ...quiz,
              duration_minutes:
                durationMinutes,
            },
            questions:
              questionsWithOptions,
          });
        }

        const {
          error: recoverError,
        } = await supabaseAdmin
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

        if (recoverError) {
          console.error(
            "START REATTEMPT RECOVERY ERROR:",
            recoverError
          );

          return NextResponse.json(
            {
              success: false,
              error:
                "Unable to resume the previous re-attempt.",
              details:
                recoverError.message,
            },
            { status: 500 }
          );
        }
      } else {
        /*
         * -------------------------------------------------------
         * IF A RE-ATTEMPT WAS ALREADY SUBMITTED
         * -------------------------------------------------------
         */


        /*
         * -------------------------------------------------------
         * CHECK ACTIVE TEACHER PERMISSION
         * -------------------------------------------------------
         */

        const {
          data: permission,
          error:
            permissionError,
        } = await supabaseAdmin
          .from(
            "quiz_reattempt_permissions"
          )
          .select(
            "id, quiz_id, student_id, allowed, created_at, used_at, created_by"
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
          .order(
            "created_at",
            {
              ascending: false,
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
         * Authorized re-attempt is not restricted by original
         * quiz date/time.
         */

        attemptNumber =
          highestAttemptNumber > 0
            ? highestAttemptNumber + 1
            : 1;

        startedAt =
          now;

        /*
         * -------------------------------------------------------
         * CREATE NEW RE-ATTEMPT RESULT
         * -------------------------------------------------------
         */

        const {
          data: newResult,
          error: insertError,
        } = await supabaseAdmin
          .from("quiz_results")
          .insert({
            quiz_id:
              quizId,
            student_id:
              studentId,
            attempt_number:
              attemptNumber,

            total_questions:
              questionCount,

            correct_answers:
              0,
            wrong_answers:
              0,
            unanswered:
              questionCount,

            total_marks:
              totalMarks,
            obtained_marks:
              0,
            percentage:
              0,

            result_status:
              "IN_PROGRESS",

            started_at:
              startedAt.toISOString(),

            submitted_at:
              null,

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
                "Unable to create re-attempt: " +
                insertError.message,
              details:
                insertError.message,
              code:
                insertError.code,
              hint:
                insertError.hint,
            },
            { status: 500 }
          );
        }

        resultId =
          Number(
            newResult.id
          );

        createdNewAttempt =
          true;

        reattemptPermissionId =
          Number(
            permission.id
          );

        /*
         * -------------------------------------------------------
         * CONSUME EXACT TEACHER PERMISSION
         * -------------------------------------------------------
         */

        const {
          data:
            consumedPermission,
          error:
            consumeError,
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
          .select(
            "id"
          )
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
            .from("quiz_answers")
            .delete()
            .eq(
              "result_id",
              resultId
            );

          await supabaseAdmin
            .from("quiz_results")
            .delete()
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

          return NextResponse.json(
            {
              success: false,
              error:
                "This re-attempt permission has already been used. A new re-attempt could not be created.",
            },
            { status: 409 }
          );
        }
      }
    } else {
      /*
       * =========================================================
       * NORMAL ORIGINAL ATTEMPT
       * =========================================================
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

      if (
        unfinishedNormalResult
      ) {
        resultId =
          Number(
            unfinishedNormalResult.id
          );

        attemptNumber =
          1;

        const existingStartedAt =
          unfinishedNormalResult.started_at
            ? new Date(
                unfinishedNormalResult.started_at
              )
            : null;

        const validExistingStartedAt =
          existingStartedAt &&
          !Number.isNaN(
            existingStartedAt.getTime()
          )
            ? existingStartedAt
            : null;

        startedAt =
          validExistingStartedAt ||
          now;

        const attemptEnd =
          new Date(
            startedAt.getTime() +
              durationMinutes *
                60 *
                1000
          );

        /*
         * IMPORTANT:
         * Never revive an already expired original attempt.
         */
        if (
          now.getTime() >=
          attemptEnd.getTime()
        ) {
          const finalized =
            await finalizeExpiredAttempt(
              unfinishedNormalResult,
              questionList,
              options,
              quiz,
              studentId
            );

          if (!finalized) {
            return NextResponse.json(
              {
                success: false,
                error:
                  "This quiz attempt has expired and could not be finalized automatically.",
              },
              { status: 500 }
            );
          }

          return NextResponse.json({
            success: true,
            resultId:
              Number(
                finalized.id
              ),
            quizId,
            studentId,
            attemptNumber,
            isReattempt: false,
            reattemptPermissionId:
              null,
            startedAt:
              startedAt.toISOString(),
            scheduledStart:
              scheduledStart.toISOString(),
            attemptWindowStart:
              normalAttemptWindow.start.toISOString(),
            attemptWindowEnd:
              normalAttemptWindow.end.toISOString(),
            endAt:
              attemptEnd.toISOString(),
            remainingMilliseconds: 0,
            timeExpired: true,
            alreadyStarted: true,
            attemptFinalized: true,
            quiz: {
              ...quiz,
              duration_minutes:
                durationMinutes,
            },
            questions:
              questionsWithOptions,
          });
        }

        const {
          error:
            repairError,
        } = await supabaseAdmin
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
              alreadySubmitted:
                true,
              error:
                "You have already submitted this quiz.",
            },
            { status: 409 }
          );
        }

        /*
         * Normal attempt timing:
         * 5 AM -> 9 PM IST.
         */

        if (
          now <
          normalAttemptWindow.start
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                "This quiz can be started only from 5:00 AM on the scheduled date.",
              attemptWindowStart:
                normalAttemptWindow.start.toISOString(),
              attemptWindowEnd:
                normalAttemptWindow.end.toISOString(),
            },
            { status: 403 }
          );
        }

        if (
          now >=
          normalAttemptWindow.end
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                "The quiz starting time has ended. New original attempts are allowed only until 9:00 PM on the scheduled date.",
              attemptWindowStart:
                normalAttemptWindow.start.toISOString(),
              attemptWindowEnd:
                normalAttemptWindow.end.toISOString(),
            },
            { status: 403 }
          );
        }

        attemptNumber =
          1;

        startedAt =
          now;

        const {
          data: newResult,
          error: insertError,
        } = await supabaseAdmin
          .from("quiz_results")
          .insert({
            quiz_id:
              quizId,
            student_id:
              studentId,
            attempt_number:
              attemptNumber,

            total_questions:
              questionCount,

            correct_answers:
              0,
            wrong_answers:
              0,
            unanswered:
              questionCount,

            total_marks:
              totalMarks,
            obtained_marks:
              0,
            percentage:
              0,

            result_status:
              "IN_PROGRESS",

            started_at:
              startedAt.toISOString(),

            submitted_at:
              null,

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

        createdNewAttempt =
          true;
      }
    }

    /*
     * ---------------------------------------------------------
     * ATTEMPT TIMER
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
     * FINAL EXPIRED SAFETY CHECK
     * ---------------------------------------------------------
     */

    if (
      remainingMilliseconds <= 0
    ) {
      const {
        data: currentResult,
        error: currentResultError,
      } = await supabaseAdmin
        .from("quiz_results")
        .select("*")
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
        .maybeSingle();

      if (currentResultError) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to verify expired attempt.",
            details:
              currentResultError.message,
          },
          { status: 500 }
        );
      }

      if (
        currentResult &&
        !currentResult.submitted_at
      ) {
        const finalized =
          await finalizeExpiredAttempt(
            currentResult,
            questionList,
            options,
            quiz,
            studentId
          );

        if (!finalized) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Expired quiz attempt could not be finalized.",
            },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          resultId:
            Number(
              finalized.id
            ),
          quizId,
          studentId,
          attemptNumber,
          isReattempt:
            isReattempt,
          reattemptPermissionId:
            reattemptPermissionId,
          startedAt:
            startedAt.toISOString(),
          scheduledStart:
            scheduledStart.toISOString(),
          attemptWindowStart:
            normalAttemptWindow.start.toISOString(),
          attemptWindowEnd:
            normalAttemptWindow.end.toISOString(),
          endAt:
            attemptEnd.toISOString(),
          remainingMilliseconds: 0,
          timeExpired: true,
          alreadyStarted:
            !createdNewAttempt,
          attemptFinalized:
            true,
          quiz: {
            ...quiz,
            duration_minutes:
              durationMinutes,
          },
          questions:
            questionsWithOptions,
        });
      }
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
        isReattempt,

      reattemptPermissionId,

      startedAt:
        startedAt.toISOString(),

      scheduledStart:
        scheduledStart.toISOString(),

      attemptWindowStart:
        normalAttemptWindow.start.toISOString(),

      attemptWindowEnd:
        normalAttemptWindow.end.toISOString(),

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
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}
