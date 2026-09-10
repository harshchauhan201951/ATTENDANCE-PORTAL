"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type QuizTest = {
  id: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number | null;
  marks_per_question: number | null;
  negative_marks: number | null;
  pass_percentage: number | null;
  is_published: boolean;
};

type QuizQuestion = {
  id: string;
  quiz_id: string;
  question_text: string;
  marks?: number | null;
};

type QuizOption = {
  id: string;
  question_id: string;
  option_text: string;
  option_label?: string | null;
  is_correct?: boolean | null;
};

type QuestionWithOptions = QuizQuestion & {
  options: QuizOption[];
};

type AnswerMap = Record<string, string | null>;

type StudentData = {
  id: string;
  name: string;
  username: string;
};

type SubmissionType = "MANUAL" | "AUTO" | "EXIT";

type QuizResult = {
  id?: string;
  quiz_id: string;
  student_id: string;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  unanswered: number;
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  result_status: "PASS" | "FAIL";
  started_at: string;
  submitted_at: string;
  submission_type: SubmissionType;
  created_at?: string;
};

function getScheduledStart(quiz: QuizTest): Date {
  const time =
    quiz.scheduled_time?.length === 5
      ? `${quiz.scheduled_time}:00`
      : quiz.scheduled_time || "00:00:00";

  return new Date(`${quiz.scheduled_date}T${time}`);
}

function getScheduledEnd(quiz: QuizTest): Date {
  const start = getScheduledStart(quiz);
  const duration = Number(quiz.duration_minutes ?? 30);

  return new Date(start.getTime() + duration * 60 * 1000);
}

function formatTimer(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

function StudentQuizAttemptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const quizId =
    searchParams.get("quizId") ||
    searchParams.get("id") ||
    searchParams.get("testId");

  const [student, setStudent] = useState<StudentData | null>(null);

  const [quiz, setQuiz] = useState<QuizTest | null>(null);
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([]);

  const [answers, setAnswers] = useState<AnswerMap>({});

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);

  const [startedAt, setStartedAt] = useState<string | null>(null);

  /*
   * EXIT CONFIRMATION MODAL
   */
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitActionRunning, setExitActionRunning] = useState(false);

  /*
   * Refs
   */
  const submittedRef = useRef(false);
  const submittingRef = useRef(false);

  /*
   * Prevent browser back from immediately leaving the quiz.
   */
  const historyGuardAddedRef = useRef(false);

  /*
   * ---------------------------------------------------------
   * LOAD STUDENT
   * ---------------------------------------------------------
   */

  const loadStudent = useCallback(() => {
    try {
      const raw =
        localStorage.getItem("student") ||
        localStorage.getItem("studentData") ||
        localStorage.getItem("loggedInStudent");

      if (!raw) {
        setError("Student login session not found. Please login again.");
        return null;
      }

      const parsed = JSON.parse(raw);

      const studentData: StudentData = {
        id: String(parsed.id ?? parsed.student_id ?? ""),
        name: String(
          parsed.name ??
            parsed.full_name ??
            parsed.student_name ??
            parsed.username ??
            "Student"
        ),
        username: String(parsed.username ?? ""),
      };

      if (!studentData.id) {
        setError("Student information is missing. Please login again.");
        return null;
      }

      setStudent(studentData);

      /*
       * Keep all common student session keys synchronized.
       * This also helps Results / History pages find the same student.
       */
      try {
        sessionStorage.setItem(
          "attendance_student_id",
          studentData.id
        );

        sessionStorage.setItem(
          "studentId",
          studentData.id
        );

        sessionStorage.setItem(
          "student_id",
          studentData.id
        );

        if (studentData.username) {
          sessionStorage.setItem(
            "student_username",
            studentData.username
          );
        }

        sessionStorage.setItem(
          "attendance_student_name",
          studentData.name
        );
      } catch {
        console.warn("Unable to synchronize student session.");
      }

      return studentData;
    } catch {
      setError("Unable to read student login information.");
      return null;
    }
  }, []);

  /*
   * ---------------------------------------------------------
   * LOAD QUIZ
   * ---------------------------------------------------------
   */

  const loadQuiz = useCallback(async () => {
    if (!quizId) {
      setError("Quiz ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const studentData = loadStudent();

      if (!studentData) {
        setLoading(false);
        return;
      }

      /*
       * Get quiz
       */
      const { data: quizData, error: quizError } = await supabase
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
        .maybeSingle();

      if (quizError) {
        throw new Error(quizError.message);
      }

      if (!quizData) {
        throw new Error("Quiz not found.");
      }

      const loadedQuiz = quizData as QuizTest;

      /*
       * Published check
       */
      if (!loadedQuiz.is_published) {
        throw new Error("This quiz is not published.");
      }

      /*
       * Schedule check
       */
      const now = new Date();
      const start = getScheduledStart(loadedQuiz);
      const end = getScheduledEnd(loadedQuiz);

      if (now < start) {
        throw new Error(
          `This quiz has not started yet. It will start at ${start.toLocaleString(
            "en-IN"
          )}.`
        );
      }

      if (now >= end) {
        throw new Error("This quiz has already ended.");
      }

      /*
       * -------------------------------------------------------
       * ONE ATTEMPT CHECK
       * -------------------------------------------------------
       *
       * First check Supabase.
       *
       * If a completed result exists, student can never start
       * the same quiz again.
       */
      const { data: existingResult, error: existingResultError } =
        await supabase
          .from("quiz_results")
          .select("id, submitted_at, submission_type")
          .eq("quiz_id", quizId)
          .eq("student_id", studentData.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (existingResultError) {
        /*
         * Do not silently ignore a database error anymore.
         *
         * If the database cannot be checked, we stop the quiz.
         * This prevents students from bypassing one-attempt
         * protection because of an RLS/database problem.
         */
        throw new Error(
          `Unable to verify previous quiz attempt: ${existingResultError.message}`
        );
      }

      if (existingResult) {
        throw new Error(
          "You have already attempted this quiz. This quiz can be attempted only once."
        );
      }

      /*
       * -------------------------------------------------------
       * LOCAL ONE-ATTEMPT LOCK
       * -------------------------------------------------------
       *
       * This protects against accidental duplicate opening in
       * the same browser before the database result is visible.
       */
      try {
        const localAttemptKey = `quiz-attempt-started-${quizId}-${studentData.id}`;

        const localAttemptStarted =
          localStorage.getItem(localAttemptKey);

        if (localAttemptStarted === "1") {
          /*
           * Check database one more time before refusing.
           *
           * This allows a legitimate browser reload after a
           * completed submission to show the completed message.
           */
          const { data: confirmedResult, error: confirmedError } =
            await supabase
              .from("quiz_results")
              .select("id, submitted_at")
              .eq("quiz_id", quizId)
              .eq("student_id", studentData.id)
              .limit(1)
              .maybeSingle();

          if (confirmedError) {
            throw new Error(
              `Unable to verify quiz attempt status: ${confirmedError.message}`
            );
          }

          if (confirmedResult) {
            throw new Error(
              "You have already attempted this quiz. This quiz can be attempted only once."
            );
          }

          /*
           * If there is a local lock but no database result,
           * remove the stale lock and allow the student to
           * continue.
           */
          localStorage.removeItem(localAttemptKey);
        }

        localStorage.setItem(localAttemptKey, "1");
      } catch (localError) {
        if (localError instanceof Error) {
          throw localError;
        }

        console.warn("Unable to create local quiz attempt lock.");
      }

      /*
       * -------------------------------------------------------
       * GET QUESTIONS
       * -------------------------------------------------------
       *
       * There is NO question_number column.
       */
      const { data: questionData, error: questionError } =
        await supabase
          .from("quiz_questions")
          .select("*")
          .eq("quiz_id", quizId);

      if (questionError) {
        throw new Error(questionError.message);
      }

      if (!questionData || questionData.length === 0) {
        throw new Error("No questions have been added to this quiz yet.");
      }

      const questionRows = questionData as QuizQuestion[];

      const questionIds = questionRows.map(
        (question) => question.id
      );

      /*
       * -------------------------------------------------------
       * GET OPTIONS
       * -------------------------------------------------------
       */

      const { data: optionData, error: optionError } =
        await supabase
          .from("quiz_options")
          .select("*")
          .in("question_id", questionIds)
          .order("id", { ascending: true });

      if (optionError) {
        throw new Error(optionError.message);
      }

      const optionRows = (optionData ?? []) as QuizOption[];

      /*
       * Combine questions and options
       */
      const combinedQuestions: QuestionWithOptions[] =
        questionRows.map((question) => {
          const questionOptions = optionRows.filter(
            (option) => option.question_id === question.id
          );

          return {
            ...question,
            options: questionOptions,
          };
        });

      /*
       * Empty answer map
       */
      const initialAnswers: AnswerMap = {};

      combinedQuestions.forEach((question) => {
        initialAnswers[question.id] = null;
      });

      setQuiz(loadedQuiz);
      setQuestions(combinedQuestions);
      setAnswers(initialAnswers);

      /*
       * Start timer.
       */
      const actualStart = new Date();

      setStartedAt(actualStart.toISOString());

      const remainingSeconds = Math.max(
        0,
        Math.ceil((end.getTime() - actualStart.getTime()) / 1000)
      );

      setTimeLeft(remainingSeconds);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load quiz.";

      setError(message);

      /*
       * If quiz never successfully loaded, remove local lock.
       */
      try {
        if (quizId) {
          const studentData = loadStudent();

          if (studentData) {
            localStorage.removeItem(
              `quiz-attempt-started-${quizId}-${studentData.id}`
            );
          }
        }
      } catch {
        // Ignore cleanup errors.
      }
    } finally {
      setLoading(false);
    }
  }, [loadStudent, quizId]);

  useEffect(() => {
    void loadQuiz();
  }, [loadQuiz]);

  /*
   * ---------------------------------------------------------
   * TIMER
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (
      loading ||
      !quiz ||
      questions.length === 0 ||
      submittedRef.current ||
      submittingRef.current
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(interval);
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loading, quiz, questions.length]);

  /*
   * ---------------------------------------------------------
   * SELECT ANSWER
   * ---------------------------------------------------------
   */

  const selectAnswer = useCallback(
    (questionId: string, optionId: string) => {
      if (
        submittedRef.current ||
        submittingRef.current
      ) {
        return;
      }

      setAnswers((previous) => ({
        ...previous,
        [questionId]: optionId,
      }));
    },
    []
  );

  /*
   * ---------------------------------------------------------
   * QUESTION NAVIGATION
   * ---------------------------------------------------------
   */

  const goToQuestion = useCallback(
    (index: number) => {
      if (
        index < 0 ||
        index >= questions.length ||
        submittedRef.current ||
        submittingRef.current
      ) {
        return;
      }

      setCurrentQuestionIndex(index);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    },
    [questions.length]
  );

  /*
   * ---------------------------------------------------------
   * CALCULATE RESULT
   * ---------------------------------------------------------
   */

  const calculateResult = useCallback(
    (
      submissionType: SubmissionType
    ): QuizResult | null => {
      if (
        !quiz ||
        !student ||
        questions.length === 0
      ) {
        return null;
      }

      let correctAnswers = 0;
      let wrongAnswers = 0;
      let unanswered = 0;

      const marksPerQuestion = Number(
        quiz.marks_per_question ?? 1
      );

      const negativeMarks = Number(
        quiz.negative_marks ?? 0
      );

      questions.forEach((question) => {
        const selectedOptionId =
          answers[question.id];

        if (!selectedOptionId) {
          unanswered += 1;
          return;
        }

        const selectedOption =
          question.options.find(
            (option) =>
              option.id === selectedOptionId
          );

        if (
          selectedOption?.is_correct === true
        ) {
          correctAnswers += 1;
        } else {
          wrongAnswers += 1;
        }
      });

      const totalQuestions = questions.length;

      const totalMarks =
        totalQuestions * marksPerQuestion;

      const obtainedMarks =
        correctAnswers * marksPerQuestion -
        wrongAnswers * negativeMarks;

      const safeObtainedMarks = Math.max(
        0,
        Math.min(totalMarks, obtainedMarks)
      );

      const percentage =
        totalMarks > 0
          ? Number(
              (
                (safeObtainedMarks / totalMarks) *
                100
              ).toFixed(2)
            )
          : 0;

      const passPercentage = Number(
        quiz.pass_percentage ?? 40
      );

      const resultStatus: "PASS" | "FAIL" =
        percentage >= passPercentage
          ? "PASS"
          : "FAIL";

      return {
        quiz_id: quiz.id,
        student_id: student.id,
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        wrong_answers: wrongAnswers,
        unanswered,
        total_marks: totalMarks,
        obtained_marks: safeObtainedMarks,
        percentage,
        result_status: resultStatus,
        started_at:
          startedAt ??
          new Date().toISOString(),
        submitted_at:
          new Date().toISOString(),
        submission_type: submissionType,
      };
    },
    [
      answers,
      quiz,
      questions,
      startedAt,
      student,
    ]
  );

  /*
   * ---------------------------------------------------------
   * SAVE RESULT
   * ---------------------------------------------------------
   */

  const saveResult = useCallback(
    async (
      result: QuizResult,
      submissionType: SubmissionType
    ): Promise<QuizResult> => {
      const finalResult: QuizResult = {
        ...result,
        submission_type: submissionType,
        submitted_at:
          new Date().toISOString(),
      };

      /*
       * -----------------------------------------------------
       * SAVE COMPLETE RESULT LOCALLY
       * -----------------------------------------------------
       *
       * This allows Result page to show immediately.
       */
      try {
        sessionStorage.setItem(
          `quiz-result-${finalResult.quiz_id}`,
          JSON.stringify(finalResult)
        );

        sessionStorage.setItem(
          `quiz-answers-${finalResult.quiz_id}`,
          JSON.stringify(answers)
        );

        sessionStorage.setItem(
          `quiz-submission-${finalResult.quiz_id}`,
          "1"
        );
      } catch {
        console.warn(
          "Unable to save quiz result locally."
        );
      }

      /*
       * -----------------------------------------------------
       * SAVE TO SUPABASE
       * -----------------------------------------------------
       *
       * IMPORTANT:
       * We DO NOT swallow database errors anymore.
       *
       * If this fails, submitQuiz will NOT redirect to the
       * result page as if everything was successful.
       */
      const { data: savedResult, error: resultError } =
        await supabase
          .from("quiz_results")
          .upsert(
            {
              quiz_id: finalResult.quiz_id,
              student_id: finalResult.student_id,
              total_questions:
                finalResult.total_questions,
              correct_answers:
                finalResult.correct_answers,
              wrong_answers:
                finalResult.wrong_answers,
              unanswered:
                finalResult.unanswered,
              total_marks:
                finalResult.total_marks,
              obtained_marks:
                finalResult.obtained_marks,
              percentage:
                finalResult.percentage,
              result_status:
                finalResult.result_status,
              started_at:
                finalResult.started_at,
              submitted_at:
                finalResult.submitted_at,
              submission_type:
                finalResult.submission_type,
            },
            {
              onConflict:
                "quiz_id,student_id",
            }
          )
          .select(
            `
            id,
            quiz_id,
            student_id,
            total_questions,
            correct_answers,
            wrong_answers,
            unanswered,
            total_marks,
            obtained_marks,
            percentage,
            result_status,
            started_at,
            submitted_at,
            submission_type,
            created_at
          `
          )
          .single();

      if (resultError) {
        throw new Error(
          `Quiz result could not be saved: ${resultError.message}`
        );
      }

      if (!savedResult) {
        throw new Error(
          "Quiz result was not returned by the database."
        );
      }

      const databaseResult =
        savedResult as QuizResult;

      /*
       * Update local result with actual database ID.
       */
      try {
        sessionStorage.setItem(
          `quiz-result-${finalResult.quiz_id}`,
          JSON.stringify(databaseResult)
        );
      } catch {
        console.warn(
          "Unable to update local result."
        );
      }

      return databaseResult;
    },
    [answers]
  );

  /*
   * ---------------------------------------------------------
   * SUBMIT QUIZ
   * ---------------------------------------------------------
   */

  const submitQuiz = useCallback(
    async (
      submissionType: SubmissionType = "MANUAL"
    ) => {
      if (
        submittedRef.current ||
        submittingRef.current ||
        !quiz ||
        !student ||
        questions.length === 0
      ) {
        return;
      }

      submittingRef.current = true;
      setSubmitting(true);
      setError("");

      try {
        const result =
          calculateResult(submissionType);

        if (!result) {
          throw new Error(
            "Unable to calculate quiz result."
          );
        }

        /*
         * Save database result FIRST.
         */
        const finalResult =
          await saveResult(
            result,
            submissionType
          );

        /*
         * Mark as submitted only after successful
         * database save.
         */
        submittedRef.current = true;

        /*
         * Remove temporary local start lock.
         * Database result is now the permanent attempt lock.
         */
        try {
          localStorage.removeItem(
            `quiz-attempt-started-${quiz.id}-${student.id}`
          );

          sessionStorage.setItem(
            `quiz-result-${quiz.id}`,
            JSON.stringify(finalResult)
          );

          sessionStorage.setItem(
            `quiz-answers-${quiz.id}`,
            JSON.stringify(answers)
          );

          sessionStorage.setItem(
            `quiz-submission-${quiz.id}`,
            "1"
          );
        } catch {
          console.warn(
            "Unable to save final local quiz attempt."
          );
        }

        /*
         * Go directly to detailed result.
         */
        router.replace(
          `/student/quiz-tests/results?quizId=${encodeURIComponent(
            quiz.id
          )}`
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to submit the quiz.";

        setError(message);

        /*
         * The quiz is NOT marked submitted if database
         * save failed.
         */
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [
      answers,
      calculateResult,
      quiz,
      questions.length,
      router,
      saveResult,
      student,
    ]
  );

  /*
   * ---------------------------------------------------------
   * TIMER AUTO SUBMIT
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (
      timeLeft !== 0 ||
      loading ||
      !quiz ||
      questions.length === 0 ||
      submittedRef.current ||
      submittingRef.current
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (
        !submittedRef.current &&
        !submittingRef.current
      ) {
        void submitQuiz("AUTO");
      }
    }, 150);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    timeLeft,
    loading,
    quiz,
    questions.length,
    submitQuiz,
  ]);

  /*
   * ---------------------------------------------------------
   * EXIT MODAL
   * ---------------------------------------------------------
   */

  const openExitConfirmation = useCallback(() => {
    if (
      submittedRef.current ||
      submittingRef.current ||
      !quiz ||
      questions.length === 0
    ) {
      return;
    }

    setShowExitModal(true);
  }, [quiz, questions.length]);

  const closeExitConfirmation = useCallback(() => {
    if (exitActionRunning) {
      return;
    }

    setShowExitModal(false);
  }, [exitActionRunning]);

  const confirmExitAndSubmit = useCallback(async () => {
    if (
      submittedRef.current ||
      submittingRef.current
    ) {
      return;
    }

    setExitActionRunning(true);
    setShowExitModal(false);

    /*
     * EXIT means:
     * Whatever student has answered so far will be submitted.
     * Unanswered questions remain unanswered.
     */
    await submitQuiz("EXIT");

    setExitActionRunning(false);
  }, [submitQuiz]);

  /*
   * ---------------------------------------------------------
   * BROWSER BACK BUTTON PROTECTION
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (
      loading ||
      !quiz ||
      questions.length === 0
    ) {
      return;
    }

    /*
     * Add one extra history state so browser Back triggers
     * popstate instead of immediately leaving the quiz.
     */
    try {
      window.history.pushState(
        {
          ...window.history.state,
          racerQuizGuard: true,
          quizId: quiz.id,
        },
        "",
        window.location.href
      );

      historyGuardAddedRef.current = true;
    } catch {
      console.warn(
        "Unable to create browser back protection."
      );
    }

    const handlePopState = () => {
      if (submittedRef.current) {
        return;
      }

      if (submittingRef.current) {
        /*
         * Prevent leaving while database submission is running.
         */
        try {
          window.history.pushState(
            {
              ...window.history.state,
              racerQuizGuard: true,
              quizId: quiz.id,
            },
            "",
            window.location.href
          );
        } catch {
          // Ignore.
        }

        return;
      }

      /*
       * Immediately restore the current history state.
       */
      try {
        window.history.pushState(
          {
            ...window.history.state,
            racerQuizGuard: true,
            quizId: quiz.id,
          },
          "",
          window.location.href
        );
      } catch {
        // Ignore.
      }

      setShowExitModal(true);
    };

    window.addEventListener(
      "popstate",
      handlePopState
    );

    return () => {
      window.removeEventListener(
        "popstate",
        handlePopState
      );

      historyGuardAddedRef.current = false;
    };
  }, [
    loading,
    quiz,
    questions.length,
  ]);

  /*
   * ---------------------------------------------------------
   * BEFORE PAGE EXIT / REFRESH
   * ---------------------------------------------------------
   *
   * Browser security does not allow custom YES/NO text for
   * refresh/close tabs. Browser will show its own native
   * confirmation dialog.
   */
  useEffect(() => {
    if (
      loading ||
      !quiz ||
      questions.length === 0
    ) {
      return;
    }

    const handleBeforeUnload = (
      event: BeforeUnloadEvent
    ) => {
      if (!submittedRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload
      );
    };
  }, [
    loading,
    quiz,
    questions.length,
  ]);

  /*
   * ---------------------------------------------------------
   * DERIVED DATA
   * ---------------------------------------------------------
   */

  const answeredCount = useMemo(() => {
    return questions.reduce(
      (count, question) => {
        return (
          count +
          (answers[question.id] ? 1 : 0)
        );
      },
      0
    );
  }, [answers, questions]);

  const unansweredCount =
    questions.length - answeredCount;

  const timerIsCritical =
    timeLeft <= 60;

  const timerIsWarning =
    timeLeft <= 300;

  const currentQuestion =
    questions[currentQuestionIndex];

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <>
        <div className="quiz-loading-page">
          <div className="loading-card">
            <div className="loading-spinner" />

            <h2>Loading Quiz...</h2>

            <p>
              Please wait while your test is being prepared.
            </p>
          </div>
        </div>

        <style jsx>{`
          .quiz-loading-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background:
              radial-gradient(
                circle at top left,
                rgba(99, 102, 241, 0.16),
                transparent 35%
              ),
              linear-gradient(135deg, #f8fafc, #eef2ff);
          }

          .loading-card {
            width: 100%;
            max-width: 430px;
            padding: 40px 28px;
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.94);
            border: 1px solid rgba(148, 163, 184, 0.2);
            box-shadow: 0 25px 70px rgba(15, 23, 42, 0.12);
            text-align: center;
          }

          .loading-spinner {
            width: 52px;
            height: 52px;
            margin: 0 auto 22px;
            border-radius: 50%;
            border: 5px solid #e2e8f0;
            border-top-color: #4f46e5;
            animation: spin 0.8s linear infinite;
          }

          h2 {
            margin: 0;
            color: #0f172a;
            font-size: 24px;
            font-weight: 800;
          }

          p {
            margin: 10px 0 0;
            color: #64748b;
            font-size: 14px;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </>
    );
  }

  /*
   * ---------------------------------------------------------
   * ERROR
   * ---------------------------------------------------------
   */

  if (
    error ||
    !quiz ||
    !currentQuestion
  ) {
    return (
      <>
        <div className="error-page">
          <div className="error-card">
            <div className="error-icon">
              ⚠️
            </div>

            <h1>Quiz Not Available</h1>

            <p>
              {error ||
                "Unable to load this quiz."}
            </p>

            <div className="error-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setError("");
                  submittedRef.current = false;
                  submittingRef.current = false;
                  void loadQuiz();
                }}
              >
                Try Again
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  router.push(
                    "/student/quiz-tests"
                  )
                }
              >
                Back to Quiz Tests
              </button>
            </div>
          </div>
        </div>

        <style jsx>{`
          .error-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background:
              radial-gradient(
                circle at top right,
                rgba(239, 68, 68, 0.1),
                transparent 32%
              ),
              linear-gradient(135deg, #f8fafc, #eef2ff);
          }

          .error-card {
            width: 100%;
            max-width: 520px;
            padding: 38px 28px;
            border-radius: 26px;
            background: #ffffff;
            box-shadow: 0 25px 80px rgba(15, 23, 42, 0.12);
            text-align: center;
          }

          .error-icon {
            width: 72px;
            height: 72px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            border-radius: 50%;
            background: #fef2f2;
            font-size: 34px;
          }

          h1 {
            margin: 0;
            color: #0f172a;
            font-size: 26px;
            font-weight: 900;
          }

          p {
            margin: 12px auto 0;
            max-width: 430px;
            color: #64748b;
            line-height: 1.65;
            font-size: 15px;
          }

          .error-actions {
            display: flex;
            gap: 12px;
            justify-content: center;
            flex-wrap: wrap;
            margin-top: 26px;
          }

          button {
            border: 0;
            cursor: pointer;
            border-radius: 12px;
            padding: 12px 18px;
            font-size: 14px;
            font-weight: 800;
          }

          .primary-button {
            color: white;
            background: #4f46e5;
          }

          .secondary-button {
            color: #334155;
            background: #e2e8f0;
          }
        `}</style>
      </>
    );
  }

  /*
   * ---------------------------------------------------------
   * MAIN UI
   * ---------------------------------------------------------
   */

  return (
    <>
      <div className="quiz-page">
        {/* HEADER */}
        <header className="quiz-header">
          <div className="header-left">
            <button
              type="button"
              className="back-button"
              onClick={
                openExitConfirmation
              }
              disabled={
                submitting ||
                exitActionRunning
              }
            >
              ←
            </button>

            <div>
              <div className="brand">
                RACER ACADEMY
              </div>

              <div className="quiz-name">
                {quiz.title}
              </div>
            </div>
          </div>

          <div
            className={`timer ${
              timerIsCritical
                ? "timer-critical"
                : timerIsWarning
                  ? "timer-warning"
                  : ""
            }`}
          >
            <span>⏱</span>

            <span>
              {formatTimer(timeLeft)}
            </span>
          </div>
        </header>

        {/* QUIZ INFO */}
        <section className="quiz-info">
          <div className="info-main">
            <div className="quiz-badge">
              LIVE QUIZ
            </div>

            <h1>{quiz.title}</h1>

            {quiz.description && (
              <p>{quiz.description}</p>
            )}
          </div>

          <div className="info-stats">
            <div className="info-stat">
              <strong>
                {questions.length}
              </strong>

              <span>Questions</span>
            </div>

            <div className="info-stat">
              <strong>
                {Number(
                  quiz.marks_per_question ?? 1
                )}
              </strong>

              <span>Marks/Q</span>
            </div>

            <div className="info-stat">
              <strong>
                {Number(
                  quiz.duration_minutes ?? 30
                )}
              </strong>

              <span>Minutes</span>
            </div>
          </div>
        </section>

        {/* PROGRESS */}
        <section className="progress-card">
          <div className="progress-top">
            <span>
              Question{" "}
              {currentQuestionIndex + 1} of{" "}
              {questions.length}
            </span>

            <span>
              {answeredCount}/
              {questions.length} answered
            </span>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${
                  questions.length > 0
                    ? ((currentQuestionIndex + 1) /
                        questions.length) *
                      100
                    : 0
                }%`,
              }}
            />
          </div>
        </section>

        {/* MAIN */}
        <main className="quiz-layout">
          {/* QUESTION */}
          <section className="question-card">
            <div className="question-number">
              QUESTION{" "}
              {currentQuestionIndex + 1}
            </div>

            <h2>
              {currentQuestion.question_text}
            </h2>

            <div className="options-list">
              {currentQuestion.options.map(
                (option, index) => {
                  const selected =
                    answers[
                      currentQuestion.id
                    ] === option.id;

                  const label =
                    option.option_label ||
                    String.fromCharCode(
                      65 + index
                    );

                  return (
                    <button
                      type="button"
                      key={option.id}
                      className={`option ${
                        selected
                          ? "option-selected"
                          : ""
                      }`}
                      onClick={() =>
                        selectAnswer(
                          currentQuestion.id,
                          option.id
                        )
                      }
                      disabled={
                        submitting ||
                        exitActionRunning
                      }
                    >
                      <span className="option-label">
                        {label}
                      </span>

                      <span className="option-text">
                        {option.option_text}
                      </span>

                      <span
                        className={`option-check ${
                          selected
                            ? "checked"
                            : ""
                        }`}
                      >
                        {selected ? "✓" : ""}
                      </span>
                    </button>
                  );
                }
              )}
            </div>

            {currentQuestion.options.length ===
              0 && (
              <div className="no-options">
                No options are available for this
                question.
              </div>
            )}

            {/* NAVIGATION */}
            <div className="question-navigation">
              <button
                type="button"
                className="nav-button secondary"
                disabled={
                  currentQuestionIndex === 0 ||
                  submitting ||
                  exitActionRunning
                }
                onClick={() =>
                  goToQuestion(
                    currentQuestionIndex - 1
                  )
                }
              >
                ← Previous
              </button>

              {currentQuestionIndex <
              questions.length - 1 ? (
                <button
                  type="button"
                  className="nav-button primary"
                  disabled={
                    submitting ||
                    exitActionRunning
                  }
                  onClick={() =>
                    goToQuestion(
                      currentQuestionIndex + 1
                    )
                  }
                >
                  Next →
                </button>
              ) : (
                <button
                  type="button"
                  className="nav-button submit"
                  disabled={
                    submitting ||
                    exitActionRunning
                  }
                  onClick={() => {
                    const remaining =
                      questions.filter(
                        (question) =>
                          !answers[
                            question.id
                          ]
                      ).length;

                    if (
                      remaining > 0 &&
                      !window.confirm(
                        `You have ${remaining} unanswered question${
                          remaining === 1
                            ? ""
                            : "s"
                        }. Are you sure you want to submit?`
                      )
                    ) {
                      return;
                    }

                    void submitQuiz(
                      "MANUAL"
                    );
                  }}
                >
                  {submitting
                    ? "Submitting..."
                    : "✓ Submit Quiz"}
                </button>
              )}
            </div>
          </section>

          {/* PALETTE */}
          <aside className="palette-card">
            <div className="palette-header">
              <h3>Question Palette</h3>

              <span>
                {answeredCount}/
                {questions.length}
              </span>
            </div>

            <div className="palette-grid">
              {questions.map(
                (question, index) => {
                  const answered =
                    Boolean(
                      answers[question.id]
                    );

                  const active =
                    index ===
                    currentQuestionIndex;

                  return (
                    <button
                      type="button"
                      key={question.id}
                      className={`palette-button ${
                        active ? "active" : ""
                      } ${
                        answered
                          ? "answered"
                          : ""
                      }`}
                      disabled={
                        submitting ||
                        exitActionRunning
                      }
                      onClick={() =>
                        goToQuestion(index)
                      }
                    >
                      {index + 1}
                    </button>
                  );
                }
              )}
            </div>

            <div className="palette-legend">
              <div>
                <span className="legend-box answered-box" />
                <span>Answered</span>
              </div>

              <div>
                <span className="legend-box current-box" />
                <span>Current</span>
              </div>

              <div>
                <span className="legend-box unanswered-box" />
                <span>Unanswered</span>
              </div>
            </div>

            <div className="palette-summary">
              <div>
                <span>Answered</span>

                <strong>
                  {answeredCount}
                </strong>
              </div>

              <div>
                <span>Unanswered</span>

                <strong>
                  {unansweredCount}
                </strong>
              </div>
            </div>

            <div className="negative-marking">
              <strong>
                Test Instructions
              </strong>

              <ul>
                <li>
                  Choose one option for each
                  question.
                </li>

                <li>
                  Each question carries{" "}
                  {Number(
                    quiz.marks_per_question ?? 1
                  )}{" "}
                  mark
                  {Number(
                    quiz.marks_per_question ?? 1
                  ) !== 1
                    ? "s"
                    : ""}.
                </li>

                {Number(
                  quiz.negative_marks ?? 0
                ) > 0 && (
                  <li>
                    Wrong answer: -
                    {Number(
                      quiz.negative_marks
                    )}{" "}
                    mark
                    {Number(
                      quiz.negative_marks
                    ) !== 1
                      ? "s"
                      : ""}.
                  </li>
                )}

                <li>
                  The quiz will automatically
                  submit when the timer reaches
                  zero.
                </li>

                <li>
                  This quiz can be attempted only
                  once.
                </li>
              </ul>
            </div>
          </aside>
        </main>

        {/* MOBILE SUBMIT */}
        <div className="mobile-submit-bar">
          <div>
            <strong>
              {answeredCount}
            </strong>

            <span> answered</span>
          </div>

          <button
            type="button"
            disabled={
              submitting ||
              exitActionRunning
            }
            onClick={() => {
              const remaining =
                questions.filter(
                  (question) =>
                    !answers[question.id]
                ).length;

              if (
                remaining > 0 &&
                !window.confirm(
                  `You have ${remaining} unanswered question${
                    remaining === 1
                      ? ""
                      : "s"
                  }. Submit anyway?`
                )
              ) {
                return;
              }

              void submitQuiz("MANUAL");
            }}
          >
            {submitting
              ? "Submitting..."
              : "Submit Quiz"}
          </button>
        </div>
      </div>

      {/* -----------------------------------------------------
          EXIT CONFIRMATION MODAL
      ----------------------------------------------------- */}
      {showExitModal && (
        <div
          className="exit-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-title"
        >
          <div className="exit-modal">
            <div className="exit-icon">
              !
            </div>

            <h2 id="exit-title">
              Do you want to leave this quiz?
            </h2>

            <p>
              If you leave now, your quiz will be
              submitted automatically with the answers
              you have selected so far.
            </p>

            <div className="exit-progress">
              <div>
                <span>Answered</span>
                <strong>
                  {answeredCount}
                </strong>
              </div>

              <div>
                <span>Unanswered</span>
                <strong>
                  {unansweredCount}
                </strong>
              </div>

              <div>
                <span>Remaining</span>
                <strong>
                  {formatTimer(timeLeft)}
                </strong>
              </div>
            </div>

            <div className="exit-actions">
              <button
                type="button"
                className="exit-no"
                disabled={exitActionRunning}
                onClick={
                  closeExitConfirmation
                }
              >
                NO, CONTINUE QUIZ
              </button>

              <button
                type="button"
                className="exit-yes"
                disabled={exitActionRunning}
                onClick={
                  confirmExitAndSubmit
                }
              >
                {exitActionRunning
                  ? "SUBMITTING..."
                  : "YES, EXIT & SUBMIT"}
              </button>
            </div>

            <small>
              Your current answers will be included in
              the submission.
            </small>
          </div>
        </div>
      )}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .quiz-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 10% 0%,
              rgba(99, 102, 241, 0.09),
              transparent 28%
            ),
            radial-gradient(
              circle at 90% 20%,
              rgba(14, 165, 233, 0.08),
              transparent 28%
            ),
            #f8fafc;
          color: #0f172a;
          padding-bottom: 40px;
        }

        .quiz-header {
          position: sticky;
          top: 0;
          z-index: 50;
          min-height: 76px;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(18px);
          border-bottom: 1px solid #e2e8f0;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .back-button {
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #ffffff;
          color: #334155;
          font-size: 22px;
          font-weight: 700;
          cursor: pointer;
        }

        .back-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .brand {
          color: #4f46e5;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1.4px;
        }

        .quiz-name {
          max-width: 600px;
          margin-top: 2px;
          overflow: hidden;
          color: #0f172a;
          font-size: 15px;
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .timer {
          min-width: 145px;
          padding: 11px 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid #c7d2fe;
          border-radius: 14px;
          background: #eef2ff;
          color: #3730a3;
          font-size: 21px;
          font-weight: 900;
          font-variant-numeric: tabular-nums;
        }

        .timer-warning {
          border-color: #fbbf24;
          background: #fffbeb;
          color: #92400e;
        }

        .timer-critical {
          border-color: #fca5a5;
          background: #fef2f2;
          color: #b91c1c;
          animation: timerPulse 1s infinite;
        }

        @keyframes timerPulse {
          50% {
            transform: scale(1.025);
          }
        }

        .quiz-info {
          width: min(1180px, calc(100% - 32px));
          margin: 26px auto 0;
          padding: 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
          border-radius: 24px;
          background: linear-gradient(
            135deg,
            #312e81,
            #4f46e5
          );
          color: white;
          box-shadow: 0 20px 50px
            rgba(79, 70, 229, 0.2);
        }

        .info-main {
          min-width: 0;
        }

        .quiz-badge {
          width: fit-content;
          margin-bottom: 10px;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .info-main h1 {
          margin: 0;
          font-size: clamp(24px, 4vw, 36px);
          line-height: 1.15;
          font-weight: 900;
        }

        .info-main p {
          max-width: 700px;
          margin: 10px 0 0;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.6;
          font-size: 14px;
        }

        .info-stats {
          display: flex;
          flex-shrink: 0;
          gap: 10px;
        }

        .info-stat {
          min-width: 90px;
          padding: 13px 14px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.11);
          text-align: center;
        }

        .info-stat strong {
          display: block;
          font-size: 20px;
          font-weight: 900;
        }

        .info-stat span {
          display: block;
          margin-top: 3px;
          color: rgba(255, 255, 255, 0.72);
          font-size: 10px;
          font-weight: 700;
        }

        .progress-card {
          width: min(1180px, calc(100% - 32px));
          margin: 14px auto 0;
          padding: 16px 20px;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          background: white;
        }

        .progress-top {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          color: #475569;
          font-size: 12px;
          font-weight: 800;
        }

        .progress-track {
          height: 8px;
          margin-top: 10px;
          overflow: hidden;
          border-radius: 999px;
          background: #e2e8f0;
        }

        .progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #6366f1,
            #4f46e5
          );
          transition: width 0.25s ease;
        }

        .quiz-layout {
          width: min(1180px, calc(100% - 32px));
          margin: 14px auto 0;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 330px;
          align-items: start;
          gap: 14px;
        }

        .question-card,
        .palette-card {
          border: 1px solid #e2e8f0;
          border-radius: 22px;
          background: white;
          box-shadow: 0 12px 35px
            rgba(15, 23, 42, 0.05);
        }

        .question-card {
          padding: 30px;
        }

        .question-number {
          width: fit-content;
          padding: 7px 11px;
          border-radius: 999px;
          background: #eef2ff;
          color: #4338ca;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .question-card h2 {
          margin: 20px 0 26px;
          color: #0f172a;
          font-size: clamp(20px, 3vw, 28px);
          line-height: 1.45;
          font-weight: 850;
        }

        .options-list {
          display: grid;
          gap: 12px;
        }

        .option {
          width: 100%;
          padding: 15px;
          display: flex;
          align-items: center;
          gap: 13px;
          border: 2px solid #e2e8f0;
          border-radius: 15px;
          background: #ffffff;
          color: #334155;
          text-align: left;
          cursor: pointer;
          transition:
            border-color 0.2s ease,
            background 0.2s ease,
            transform 0.2s ease;
        }

        .option:hover:not(:disabled) {
          border-color: #a5b4fc;
          transform: translateY(-1px);
        }

        .option:disabled {
          cursor: not-allowed;
        }

        .option-selected {
          border-color: #6366f1;
          background: #eef2ff;
          color: #312e81;
        }

        .option-label {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: #f1f5f9;
          color: #475569;
          font-size: 14px;
          font-weight: 900;
        }

        .option-selected .option-label {
          background: #4f46e5;
          color: white;
        }

        .option-text {
          flex: 1;
          font-size: 15px;
          line-height: 1.5;
          font-weight: 650;
        }

        .option-check {
          width: 24px;
          height: 24px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #cbd5e1;
          border-radius: 50%;
          color: white;
          font-size: 12px;
          font-weight: 900;
        }

        .option-check.checked {
          border-color: #4f46e5;
          background: #4f46e5;
        }

        .no-options {
          padding: 18px;
          border-radius: 12px;
          background: #fff7ed;
          color: #9a3412;
          font-size: 14px;
          font-weight: 700;
        }

        .question-navigation {
          margin-top: 30px;
          padding-top: 22px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          border-top: 1px solid #e2e8f0;
        }

        .nav-button {
          min-height: 46px;
          padding: 11px 18px;
          border: 0;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .nav-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .nav-button.secondary {
          background: #f1f5f9;
          color: #334155;
        }

        .nav-button.primary {
          background: #4f46e5;
          color: white;
        }

        .nav-button.submit {
          background: #059669;
          color: white;
        }

        .palette-card {
          padding: 20px;
          position: sticky;
          top: 90px;
        }

        .palette-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .palette-header h3 {
          margin: 0;
          color: #0f172a;
          font-size: 16px;
          font-weight: 900;
        }

        .palette-header span {
          padding: 5px 9px;
          border-radius: 999px;
          background: #f1f5f9;
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
        }

        .palette-grid {
          margin-top: 18px;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
        }

        .palette-button {
          aspect-ratio: 1;
          border: 1px solid #e2e8f0;
          border-radius: 9px;
          background: #f8fafc;
          color: #475569;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .palette-button.answered {
          border-color: #a7f3d0;
          background: #d1fae5;
          color: #047857;
        }

        .palette-button.active {
          border: 2px solid #4f46e5;
          background: #eef2ff;
          color: #3730a3;
        }

        .palette-button.active.answered {
          background: #c7d2fe;
        }

        .palette-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .palette-legend {
          margin-top: 18px;
          display: grid;
          gap: 8px;
        }

        .palette-legend > div {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
        }

        .legend-box {
          width: 14px;
          height: 14px;
          display: inline-block;
          border-radius: 4px;
        }

        .answered-box {
          background: #d1fae5;
          border: 1px solid #a7f3d0;
        }

        .current-box {
          background: #eef2ff;
          border: 2px solid #4f46e5;
        }

        .unanswered-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }

        .palette-summary {
          margin-top: 18px;
          padding-top: 16px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          border-top: 1px solid #e2e8f0;
        }

        .palette-summary > div {
          padding: 11px;
          border-radius: 12px;
          background: #f8fafc;
        }

        .palette-summary span {
          display: block;
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
        }

        .palette-summary strong {
          display: block;
          margin-top: 3px;
          color: #0f172a;
          font-size: 18px;
          font-weight: 900;
        }

        .negative-marking {
          margin-top: 16px;
          padding: 14px;
          border-radius: 14px;
          background: #fff7ed;
          color: #9a3412;
        }

        .negative-marking strong {
          font-size: 12px;
        }

        .negative-marking ul {
          margin: 8px 0 0;
          padding-left: 17px;
        }

        .negative-marking li {
          margin: 5px 0;
          font-size: 10px;
          line-height: 1.5;
        }

        .mobile-submit-bar {
          display: none;
        }

        /* EXIT MODAL */

        .exit-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(15, 23, 42, 0.62);
          backdrop-filter: blur(8px);
        }

        .exit-modal {
          width: min(100%, 500px);
          padding: 30px;
          border-radius: 26px;
          background: #ffffff;
          box-shadow:
            0 30px 90px rgba(15, 23, 42, 0.3),
            0 8px 30px rgba(15, 23, 42, 0.12);
          text-align: center;
          animation: exitModalIn 0.18s ease-out;
        }

        @keyframes exitModalIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .exit-icon {
          width: 62px;
          height: 62px;
          margin: 0 auto 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #fff7ed;
          color: #c2410c;
          font-size: 32px;
          font-weight: 900;
        }

        .exit-modal h2 {
          margin: 0;
          color: #0f172a;
          font-size: 24px;
          line-height: 1.3;
          font-weight: 900;
        }

        .exit-modal p {
          margin: 12px auto 0;
          max-width: 420px;
          color: #64748b;
          font-size: 14px;
          line-height: 1.65;
        }

        .exit-progress {
          margin-top: 22px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .exit-progress > div {
          padding: 12px 8px;
          border-radius: 13px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }

        .exit-progress span {
          display: block;
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
        }

        .exit-progress strong {
          display: block;
          margin-top: 4px;
          color: #0f172a;
          font-size: 18px;
          font-weight: 900;
        }

        .exit-actions {
          margin-top: 22px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .exit-actions button {
          min-height: 48px;
          border: 0;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .exit-actions button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .exit-no {
          background: #e2e8f0;
          color: #334155;
        }

        .exit-yes {
          background: #dc2626;
          color: #ffffff;
        }

        .exit-modal small {
          display: block;
          margin-top: 14px;
          color: #94a3b8;
          font-size: 10px;
          line-height: 1.5;
        }

        @media (max-width: 900px) {
          .quiz-info {
            align-items: flex-start;
            flex-direction: column;
          }

          .info-stats {
            width: 100%;
          }

          .info-stat {
            flex: 1;
          }

          .quiz-layout {
            grid-template-columns: 1fr;
          }

          .palette-card {
            position: static;
          }
        }

        @media (max-width: 640px) {
          .quiz-page {
            padding-bottom: 80px;
          }

          .quiz-header {
            min-height: 66px;
            padding: 10px 12px;
          }

          .back-button {
            width: 38px;
            height: 38px;
          }

          .brand {
            font-size: 9px;
          }

          .quiz-name {
            max-width: 170px;
            font-size: 12px;
          }

          .timer {
            min-width: 108px;
            padding: 9px 10px;
            font-size: 16px;
          }

          .quiz-info,
          .progress-card,
          .quiz-layout {
            width: calc(100% - 20px);
          }

          .quiz-info {
            margin-top: 12px;
            padding: 20px;
            border-radius: 19px;
          }

          .info-main h1 {
            font-size: 23px;
          }

          .info-stats {
            gap: 6px;
          }

          .info-stat {
            min-width: 0;
            padding: 10px 7px;
          }

          .info-stat strong {
            font-size: 16px;
          }

          .progress-card {
            padding: 13px;
          }

          .question-card {
            padding: 18px 14px;
            border-radius: 18px;
          }

          .question-card h2 {
            margin: 16px 0 20px;
            font-size: 19px;
          }

          .option {
            padding: 11px;
            gap: 9px;
            border-radius: 12px;
          }

          .option-label {
            width: 34px;
            height: 34px;
          }

          .option-text {
            font-size: 13px;
          }

          .option-check {
            width: 21px;
            height: 21px;
          }

          .question-navigation {
            margin-top: 22px;
            padding-top: 17px;
          }

          .nav-button {
            min-height: 42px;
            padding: 9px 12px;
            font-size: 11px;
          }

          .palette-card {
            padding: 16px;
            border-radius: 18px;
          }

          .mobile-submit-bar {
            position: fixed;
            z-index: 60;
            left: 0;
            right: 0;
            bottom: 0;
            min-height: 62px;
            padding: 10px 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            background: rgba(255, 255, 255, 0.97);
            backdrop-filter: blur(15px);
            border-top: 1px solid #e2e8f0;
            box-shadow: 0 -8px 25px
              rgba(15, 23, 42, 0.08);
          }

          .mobile-submit-bar div {
            color: #64748b;
            font-size: 12px;
          }

          .mobile-submit-bar strong {
            color: #0f172a;
            font-size: 18px;
          }

          .mobile-submit-bar button {
            min-height: 40px;
            padding: 9px 16px;
            border: 0;
            border-radius: 11px;
            background: #059669;
            color: white;
            font-size: 12px;
            font-weight: 900;
          }

          .mobile-submit-bar button:disabled {
            opacity: 0.6;
          }

          .exit-overlay {
            padding: 12px;
          }

          .exit-modal {
            padding: 24px 18px;
            border-radius: 21px;
          }

          .exit-modal h2 {
            font-size: 21px;
          }

          .exit-modal p {
            font-size: 13px;
          }

          .exit-progress {
            gap: 6px;
          }

          .exit-progress > div {
            padding: 10px 5px;
          }

          .exit-progress strong {
            font-size: 16px;
          }

          .exit-actions {
            grid-template-columns: 1fr;
          }

          .exit-actions button {
            min-height: 46px;
          }
        }
      `}</style>
    </>
  );
}

/*
 * Next.js 16:
 * useSearchParams() must be rendered under Suspense.
 */

export default function StudentQuizAttemptPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "#f8fafc",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              border: "5px solid #e2e8f0",
              borderTopColor: "#4f46e5",
              borderRadius: "50%",
              animation:
                "quizPageSpin 0.8s linear infinite",
            }}
          />

          <style>{`
            @keyframes quizPageSpin {
              to {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </div>
      }
    >
      <StudentQuizAttemptContent />
    </Suspense>
  );
}