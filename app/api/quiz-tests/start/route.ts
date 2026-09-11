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
 * Student START WINDOW
 *
 * The student can start the quiz only on the
 * scheduled date between:
 *
 * 05:00 AM IST
 * and
 * 09:00 PM IST
 *
 * The teacher's scheduled_time is NOT used
 * as the mandatory student start time anymore.
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
     *
     * We preserve this information.
     * It is still returned to the frontend.
     *
     * But scheduled_time is NO LONGER the mandatory
     * student start time.
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

    /*
     * ---------------------------------------------------------
     * NEW STUDENT START WINDOW
     * ---------------------------------------------------------
     *
     * Same scheduled date only.
     *
     * 05:00 AM <= start < 09:00 PM
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
     * CHECK EXISTING ATTEMPT
     * ---------------------------------------------------------
     *
     * Existing unfinished attempt:
     *     resume it.
     *
     * Existing submitted attempt:
     *     permanently blocked.
     */

    const {
      data: existingResult,
      error: existingError,
    } = await supabaseAdmin
      .from("quiz_results")
      .select("*")
      .eq("quiz_id", quizId)
      .eq("student_id", studentId)
      .maybeSingle();

    if (existingError) {
      console.error(
        "START EXISTING RESULT ERROR:",
        existingError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to check previous attempt.",
          details:
            existingError.message,
        },
        { status: 500 }
      );
    }

    /*
     * Student already submitted this quiz.
     * No second attempt.
     */

    if (existingResult?.submitted_at) {
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

    let resultId: number;
    let startedAt: Date;

    /*
     * ---------------------------------------------------------
     * RESUME EXISTING ATTEMPT
     * ---------------------------------------------------------
     */

    if (existingResult) {
      resultId = Number(
        existingResult.id
      );

      startedAt =
        existingResult.started_at
          ? new Date(
              existingResult.started_at
            )
          : now;

      if (
        Number.isNaN(
          startedAt.getTime()
        )
      ) {
        startedAt = now;
      }
    } else {
      /*
       * -------------------------------------------------------
       * NEW ATTEMPT
       * -------------------------------------------------------
       *
       * IMPORTANT:
       *
       * Teacher may schedule a quiz at 2 PM,
       * but student can still start at:
       *
       * 05:00 AM
       * 06:00 AM
       * 10:00 AM
       * 01:30 PM
       * 02:00 PM
       * 05:00 PM
       * 08:59 PM
       *
       * on that same scheduled date.
       */

      if (now < attemptWindow.start) {
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
       * At exactly 09:00 PM and after,
       * NEW attempts are blocked.
       */

      if (now >= attemptWindow.end) {
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
       * Actual student start time.
       */
      startedAt = now;

      /*
       * Create the student's single attempt.
       */

      const {
        data: newResult,
        error: insertError,
      } = await supabaseAdmin
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
    }

    /*
     * ---------------------------------------------------------
     * ACTUAL ATTEMPT TIMER
     * ---------------------------------------------------------
     *
     * IMPORTANT CHANGE:
     *
     * Timer starts from student's ACTUAL start time.
     *
     * Example:
     *
     * duration = 30 minutes
     *
     * student starts at 08:40 PM
     *
     * timer = 30 minutes
     *
     * student gets until 09:10 PM.
     *
     * 09:00 PM is ONLY the cutoff for STARTING
     * a new attempt.
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
     * Existing unfinished attempt has already
     * reached its timer.
     *
     * Existing submit endpoint will finalize it
     * as time_expired.
     */

    if (
      remainingMilliseconds <= 0
    ) {
      return NextResponse.json({
        success: true,
        resultId,
        quizId,
        studentId,
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

      startedAt:
        startedAt.toISOString(),

      /*
       * Original teacher schedule
       */
      scheduledStart:
        scheduledStart.toISOString(),

      /*
       * Student start window
       */
      attemptWindowStart:
        attemptWindow.start.toISOString(),

      attemptWindowEnd:
        attemptWindow.end.toISOString(),

      /*
       * Actual timer end
       */
      endAt:
        attemptEnd.toISOString(),

      remainingMilliseconds,

      timeExpired: false,

      alreadyStarted:
        Boolean(existingResult),

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