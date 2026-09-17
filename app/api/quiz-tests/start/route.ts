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
    /*
     * ---------------------------------------------------------
     * READ REQUEST
     * ---------------------------------------------------------
     */

    const body = await request.json();

    const quizId = safeNumber(
      body?.quizId
    );

    const studentId = safeNumber(
      body?.studentId
    );

    const studentUsername =
      typeof body?.studentUsername === "string"
        ? body.studentUsername.trim()
        : "";

    console.log(
      "START QUIZ REQUEST:",
      {
        quizId,
        studentId,
        studentUsername,
      }
    );

    if (!quizId || (!studentId && !studentUsername)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Quiz ID and student information are required.",
        },
        { status: 400 }
      );
    }

    /*
     * ---------------------------------------------------------
     * LOAD STUDENT
     * ---------------------------------------------------------
     *
     * Student ID comes from the logged-in student session.
     *
     * We use the exact numeric ID and explicitly handle:
     *
     * 1. Database error
     * 2. Student not found
     * 3. Invalid student ID
     *
     */

    let student: any = null;
    let studentError: any = null;

    if (studentUsername) {
      const result = await supabaseAdmin
        .from("students")
        .select(
          "id, student_name, student_username, class_name"
        )
        .eq("student_username", studentUsername)
        .limit(1)
        .maybeSingle();

      student = result.data;
      studentError = result.error;
    }

    if (!student && !studentError && studentId) {
      const result = await supabaseAdmin
        .from("students")
        .select(
          "id, student_name, student_username, class_name"
        )
        .eq("id", studentId)
        .limit(1)
        .maybeSingle();

      student = result.data;
      studentError = result.error;
    }

    if (studentError) {
      console.error(
        "START STUDENT ERROR:",
        {
          message: studentError.message,
          details: studentError.details,
          hint: studentError.hint,
          code: studentError.code,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to load student.",
          details: studentError.message,
          code: studentError.code,
        },
        { status: 500 }
      );
    }

    if (!student) {
      console.error(
        "START STUDENT NOT FOUND:",
        {
          studentId,
          studentUsername,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error: studentUsername
            ? `Student not found for username: ${studentUsername}`
            : "Student not found.",
          details: studentUsername
            ? `No student was found with username ${studentUsername}.`
            : `No student was found with ID ${studentId}.`,
        },
        { status: 404 }
      );
    }

    const canonicalStudentId = Number(student.id);

    if (
      !Number.isInteger(canonicalStudentId) ||
      canonicalStudentId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid student record.",
        },
        { status: 500 }
      );
    }

    console.log(
      "START STUDENT FOUND:",
      {
        id: canonicalStudentId,
        student_name: student.student_name,
        student_username: student.student_username,
        class_name: student.class_name,
      }
    );

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
        {
          message: quizError.message,
          details: quizError.details,
          hint: quizError.hint,
          code: quizError.code,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load quiz.",
          details:
            quizError.message,
          code:
            quizError.code,
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
     * PUBLISHED CHECK
     * ---------------------------------------------------------
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
     * scheduled_time is preserved and returned.
     *
     * It is NOT used as the mandatory student start time.
     */

    const scheduledStart = parseIST(
      quiz.scheduled_date,
      quiz.scheduled_time
    );

    /*
     * scheduled_time may be unavailable for an Any Time quiz.
     *
     * Therefore, do not block the student if only the
     * teacher scheduled_time is missing/invalid.
     *
     * The actual student window is based on scheduled_date.
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
          details:
            `Invalid scheduled date: ${String(
              quiz.scheduled_date ?? ""
            )}`,
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
     * CHECK EXISTING ATTEMPT
     * ---------------------------------------------------------
     */

    const {
      data: existingResult,
      error: existingError,
    } = await supabaseAdmin
      .from("quiz_results")
      .select("*")
      .eq("quiz_id", quizId)
      .eq("student_id", canonicalStudentId)
      .order(
        "id",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error(
        "START EXISTING RESULT ERROR:",
        {
          message:
            existingError.message,
          details:
            existingError.details,
          hint:
            existingError.hint,
          code:
            existingError.code,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to check previous attempt.",
          details:
            existingError.message,
          code:
            existingError.code,
        },
        { status: 500 }
      );
    }

    /*
     * ---------------------------------------------------------
     * ALREADY SUBMITTED
     * ---------------------------------------------------------
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
       * Student can start on the scheduled date:
       *
       * 05:00 AM IST
       *
       * until before:
       *
       * 09:00 PM IST
       *
       * Teacher scheduled_time does not control starting.
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
       * At exactly 09:00 PM or later,
       * new attempts are blocked.
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
       * -------------------------------------------------------
       * CREATE QUIZ RESULT
       * -------------------------------------------------------
       */

      const {
        data: newResult,
        error: insertError,
      } = await supabaseAdmin
        .from("quiz_results")
        .insert({
          quiz_id: quizId,
          student_id: canonicalStudentId,
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
          {
            message:
              insertError.message,
            details:
              insertError.details,
            hint:
              insertError.hint,
            code:
              insertError.code,
          }
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to create quiz attempt.",
            details:
              insertError.message,
            code:
              insertError.code,
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
     * Timer starts when the student actually starts.
     *
     * Example:
     *
     * Student starts at 08:40 PM
     * Duration = 30 minutes
     * End = 09:10 PM
     *
     * The 09:00 PM time is only the NEW ATTEMPT START cutoff.
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
     * ---------------------------------------------------------
     * TIMER EXPIRED
     * ---------------------------------------------------------
     */

    if (
      remainingMilliseconds <= 0
    ) {
      return NextResponse.json({
        success: true,
        resultId,
        quizId,
        studentId: canonicalStudentId,

        startedAt:
          startedAt.toISOString(),

        scheduledStart:
          scheduledStart
            ? scheduledStart.toISOString()
            : null,

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
        {
          message:
            questionsError.message,
          details:
            questionsError.details,
          hint:
            questionsError.hint,
          code:
            questionsError.code,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load quiz questions.",
          details:
            questionsError.message,
          code:
            questionsError.code,
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
          {
            message:
              optionsError.message,
            details:
              optionsError.details,
            hint:
              optionsError.hint,
            code:
              optionsError.code,
          }
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to load quiz options.",
            details:
              optionsError.message,
            code:
              optionsError.code,
          },
          { status: 500 }
        );
      }

      options =
        optionRows || [];
    }

    /*
     * ---------------------------------------------------------
     * REMOVE CORRECT ANSWER
     * ---------------------------------------------------------
     *
     * Student must never receive is_correct.
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

      studentId: canonicalStudentId,

      startedAt:
        startedAt.toISOString(),

      /*
       * Original teacher schedule.
       *
       * Can be null for an Any Time quiz if
       * scheduled_time is not available.
       */
      scheduledStart:
        scheduledStart
          ? scheduledStart.toISOString()
          : null,

      /*
       * Student start window.
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

      alreadyStarted:
        Boolean(existingResult),

      /*
       * Student information.
       */
      student: {
        id: student.id,
        student_name:
          student.student_name ??
          null,
        student_username:
          student.student_username ??
          null,
        class_name:
          student.class_name ??
          null,
      },

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
}         code:
              optionsError.code,
          },
          { status: 500 }
        );
      }

      options =
        optionRows || [];
    }

    /*
     * ---------------------------------------------------------
     * REMOVE CORRECT ANSWER
     * ---------------------------------------------------------
     *
     * Student must never receive is_correct.
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
       * Original teacher schedule.
       *
       * Can be null for an Any Time quiz if
       * scheduled_time is not available.
       */
      scheduledStart:
        scheduledStart
          ? scheduledStart.toISOString()
          : null,

      /*
       * Student start window.
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

      alreadyStarted:
        Boolean(existingResult),

      /*
       * Student information.
       */
      student: {
        id: student.id,
        student_name:
          student.student_name ??
          null,
        student_username:
          student.student_username ??
          null,
        class_name:
          student.class_name ??
          null,
      },

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