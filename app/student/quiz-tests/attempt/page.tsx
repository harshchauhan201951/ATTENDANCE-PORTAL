"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type QuizTest = {
  id: number;
  title: string;
  description: string | null;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  marks_per_question: number;
  negative_marks: number;
  pass_percentage: number;
  is_published: boolean;
};

type QuizOption = {
  id: number;
  option_text: string;
  option_order: number;
};

type QuizQuestion = {
  id: number;
  question_text: string;
  question_order: number;
  marks: number;
  options: QuizOption[];
};

type AnswerMap = Record<
  string,
  number | null
>;

type StudentData = {
  id: number;
  student_name: string | null;
  student_username: string | null;
  class_name: string | null;
};

type StartResponse = {
  success: boolean;
  resultId?: number;
  resumed?: boolean;
  message?: string;
  quiz?: QuizTest & {
    startTime: string;
    scheduledEnd: string;
    attemptEnd: string;
  };
  startedAt?: string;
  remainingMilliseconds?: number;
  questions?: QuizQuestion[];
  alreadySubmitted?: boolean;
};

type SubmitResponse = {
  success: boolean;
  message?: string;
  alreadySubmitted?: boolean;
  resultId?: number;
  result?: {
    id: number;
    quiz_id: number;
    student_id: number;
    total_questions: number;
    correct_answers: number;
    wrong_answers: number;
    unanswered: number;
    total_marks: number;
    obtained_marks: number;
    percentage: number;
    result_status: string;
    started_at: string | null;
    submitted_at: string | null;
    submission_type: string | null;
  };
};

function formatTime(totalSeconds: number) {
  const safeSeconds = Math.max(
    0,
    totalSeconds
  );

  const hours = Math.floor(
    safeSeconds / 3600
  );

  const minutes = Math.floor(
    (safeSeconds % 3600) / 60
  );

  const seconds =
    safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(
      2,
      "0"
    )}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  }

  return `${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

function readStudent(): StudentData | null {
  if (typeof window === "undefined") {
    return null;
  }

  const possibleKeys = [
    "student",
    "studentData",
    "loggedInStudent",
  ];

  for (const key of possibleKeys) {
    try {
      const raw =
        window.localStorage.getItem(
          key
        );

      if (!raw) continue;

      const parsed = JSON.parse(
        raw
      );

      const id = Number(
        parsed?.id
      );

      if (
        Number.isInteger(id) &&
        id > 0
      ) {
        return {
          id,
          student_name:
            parsed?.student_name ||
            null,
          student_username:
            parsed?.student_username ||
            null,
          class_name:
            parsed?.class_name ||
            null,
        };
      }
    } catch {
      // Continue with the next key.
    }
  }

  const storedIdKeys = [
    "attendance_student_id",
    "studentId",
    "student_id",
  ];

  for (const key of storedIdKeys) {
    const raw =
      window.localStorage.getItem(
        key
      );

    const id = Number(raw);

    if (
      Number.isInteger(id) &&
      id > 0
    ) {
      return {
        id,
        student_name: null,
        student_username:
          window.localStorage.getItem(
            "student_username"
          ),
        class_name: null,
      };
    }
  }

  return null;
}

function saveStudentSession(
  student: StudentData
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  const id = String(
    student.id
  );

  window.localStorage.setItem(
    "attendance_student_id",
    id
  );

  window.localStorage.setItem(
    "studentId",
    id
  );

  window.localStorage.setItem(
    "student_id",
    id
  );

  if (student.student_username) {
    window.localStorage.setItem(
      "student_username",
      student.student_username
    );

    window.sessionStorage.setItem(
      "student_username",
      student.student_username
    );
  }

  window.sessionStorage.setItem(
    "attendance_student_id",
    id
  );

  window.sessionStorage.setItem(
    "studentId",
    id
  );

  window.sessionStorage.setItem(
    "student_id",
    id
  );

  if (student.student_name) {
    window.sessionStorage.setItem(
      "attendance_student_name",
      student.student_name
    );
  }
}

function StudentQuizAttemptContent() {
  const router = useRouter();

  const searchParams =
    useSearchParams();

  const quizIdParam =
    searchParams.get("quizId") ||
    searchParams.get("id") ||
    searchParams.get("testId");

  const quizId = Number(
    quizIdParam
  );

  const [student, setStudent] =
    useState<StudentData | null>(
      null
    );

  const [quiz, setQuiz] =
    useState<
      (QuizTest & {
        startTime: string;
        scheduledEnd: string;
        attemptEnd: string;
      }) | null
    >(null);

  const [resultId, setResultId] =
    useState<number | null>(
      null
    );

  const [questions, setQuestions] =
    useState<QuizQuestion[]>(
      []
    );

  const [answers, setAnswers] =
    useState<AnswerMap>({});

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [timeLeft, setTimeLeft] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [showExitModal, setShowExitModal] =
    useState(false);

  const [autoSubmitTriggered, setAutoSubmitTriggered] =
    useState(false);

  const initializedRef =
    useRef(false);

  const submittingRef =
    useRef(false);

  const latestAnswersRef =
    useRef<AnswerMap>({});

  const currentIndexRef =
    useRef(0);

  useEffect(() => {
    latestAnswersRef.current =
      answers;
  }, [answers]);

  useEffect(() => {
    currentIndexRef.current =
      currentIndex;
  }, [currentIndex]);

  const currentQuestion =
    questions[currentIndex] ||
    null;

  const answeredCount = useMemo(
    () =>
      questions.reduce(
        (count, question) =>
          answers[String(question.id)] !==
          null &&
          answers[
            String(question.id)
          ] !== undefined
            ? count + 1
            : count,
        0
      ),
    [answers, questions]
  );

  const saveLocalAnswers = useCallback(
    (nextAnswers: AnswerMap) => {
      if (
        typeof window ===
        "undefined" ||
        !Number.isInteger(quizId) ||
        quizId <= 0
      ) {
        return;
      }

      window.localStorage.setItem(
        `quiz-answers-${quizId}`,
        JSON.stringify(
          nextAnswers
        )
      );
    },
    [quizId]
  );

  const submitQuiz = useCallback(
    async (
      submissionType:
        | "manual"
        | "time_expired"
        | "left_quiz"
        | "auto_submit"
    ) => {
      if (
        submittingRef.current
      ) {
        return;
      }

      if (
        !student ||
        !resultId
      ) {
        setError(
          "Quiz attempt information is missing."
        );
        return;
      }

      submittingRef.current =
        true;

      setSubmitting(true);
      setError("");

      try {
        const currentAnswers =
          latestAnswersRef.current;

        saveLocalAnswers(
          currentAnswers
        );

        const answerPayload =
          questions.map(
            (question) => ({
              questionId:
                question.id,
              selectedOptionId:
                currentAnswers[
                  String(
                    question.id
                  )
                ] ??
                null,
            })
          );

        const response =
          await fetch(
            "/api/quiz-tests/submit",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                resultId,
                studentId:
                  student.id,
                answers:
                  answerPayload,
                submissionType,
              }),
            }
          );

        const data =
          (await response.json()) as SubmitResponse;

        if (
          !response.ok ||
          !data.success
        ) {
          if (
            data.alreadySubmitted
          ) {
            router.replace(
              `/student/quiz-tests/results?quizId=${quizId}`
            );
            return;
          }

          throw new Error(
            data.message ||
              "Unable to submit quiz."
          );
        }

        if (
          typeof window !==
          "undefined"
        ) {
          window.localStorage.removeItem(
            `quiz-attempt-started-${quizId}-${student.id}`
          );

          if (data.result) {
            window.localStorage.setItem(
              `quiz-result-${quizId}`,
              JSON.stringify(
                data.result
              )
            );
          }

          window.localStorage.setItem(
            `quiz-submission-${quizId}`,
            submissionType
          );
        }

        router.replace(
          `/student/quiz-tests/results?quizId=${quizId}`
        );
      } catch (submitError) {
        console.error(
          "Quiz submission error:",
          submitError
        );

        submittingRef.current =
          false;

        setSubmitting(false);

        setError(
          submitError instanceof
            Error
            ? submitError.message
            : "Unable to submit quiz. Please try again."
        );
      }
    },
    [
      quizId,
      questions,
      resultId,
      router,
      saveLocalAnswers,
      student,
    ]
  );

  /*
   * Load student + start/resume attempt.
   */
  useEffect(() => {
    if (
      initializedRef.current
    ) {
      return;
    }

    initializedRef.current =
      true;

    async function initialize() {
      if (
        !Number.isInteger(
          quizId
        ) ||
        quizId <= 0
      ) {
        setError(
          "Quiz ID is missing."
        );
        setLoading(false);
        return;
      }

      try {
        let currentStudent =
          readStudent();

        /*
         * If only an ID/username is available, resolve
         * the complete student record from Supabase.
         */
        if (
          currentStudent &&
          (!currentStudent.student_name ||
            !currentStudent.class_name)
        ) {
          const query =
            currentStudent.student_username
              ? supabase
                  .from("students")
                  .select(
                    "id,student_name,student_username,class_name"
                  )
                  .eq(
                    "student_username",
                    currentStudent.student_username
                  )
                  .maybeSingle()
              : supabase
                  .from("students")
                  .select(
                    "id,student_name,student_username,class_name"
                  )
                  .eq(
                    "id",
                    currentStudent.id
                  )
                  .maybeSingle();

          const {
            data,
            error:
              studentLookupError,
          } = await query;

          if (
            studentLookupError
          ) {
            throw new Error(
              studentLookupError.message
            );
          }

          if (data) {
            currentStudent =
              data as StudentData;
          }
        }

        if (!currentStudent) {
          /*
           * Final fallback using username.
           */
          const username =
            typeof window !==
            "undefined"
              ? window.localStorage.getItem(
                  "student_username"
                )
              : null;

          if (username) {
            const {
              data,
              error:
                usernameError,
            } = await supabase
              .from("students")
              .select(
                "id,student_name,student_username,class_name"
              )
              .eq(
                "student_username",
                username
              )
              .maybeSingle();

            if (usernameError) {
              throw new Error(
                usernameError.message
              );
            }

            if (data) {
              currentStudent =
                data as StudentData;
            }
          }
        }

        if (!currentStudent) {
          throw new Error(
            "Student login information not found."
          );
        }

        setStudent(
          currentStudent
        );

        saveStudentSession(
          currentStudent
        );

        /*
         * The API is the authority for one-attempt creation,
         * schedule and timer.
         */
        const response =
          await fetch(
            "/api/quiz-tests/start",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                quizId,
                studentId:
                  currentStudent.id,
              }),
            }
          );

        const data =
          (await response.json()) as StartResponse;

        if (
          !response.ok ||
          !data.success
        ) {
          if (
            data.alreadySubmitted
          ) {
            router.replace(
              `/student/quiz-tests/results?quizId=${quizId}`
            );
            return;
          }

          throw new Error(
            data.message ||
              "Unable to start quiz."
          );
        }

        if (
          !data.quiz ||
          !data.questions ||
          !data.resultId
        ) {
          throw new Error(
            "Quiz attempt data is incomplete."
          );
        }

        setQuiz(data.quiz);

        setQuestions(
          data.questions
        );

        setResultId(
          Number(data.resultId)
        );

        const savedAnswers =
          typeof window !==
          "undefined"
            ? window.localStorage.getItem(
                `quiz-answers-${quizId}`
              )
            : null;

        let initialAnswers: AnswerMap =
          {};

        if (savedAnswers) {
          try {
            const parsed =
              JSON.parse(
                savedAnswers
              );

            if (
              parsed &&
              typeof parsed ===
                "object"
            ) {
              initialAnswers =
                parsed as AnswerMap;
            }
          } catch {
            initialAnswers =
              {};
          }
        }

        /*
         * Ensure every question has a key.
         */
        for (const question of data.questions) {
          const key = String(
            question.id
          );

          if (
            !Object.prototype.hasOwnProperty.call(
              initialAnswers,
              key
            )
          ) {
            initialAnswers[key] =
              null;
          }
        }

        setAnswers(
          initialAnswers
        );

        latestAnswersRef.current =
          initialAnswers;

        const remainingSeconds =
          Math.ceil(
            Number(
              data.remainingMilliseconds ||
                0
            ) / 1000
          );

        setTimeLeft(
          Math.max(
            0,
            remainingSeconds
          )
        );

        if (
          typeof window !==
          "undefined"
        ) {
          window.localStorage.setItem(
            `quiz-attempt-started-${quizId}-${currentStudent.id}`,
            "true"
          );
        }

        /*
         * If the server says the attempt already expired,
         * immediately submit current answers.
         */
        if (
          remainingSeconds <=
          0
        ) {
          setAutoSubmitTriggered(
            true
          );
        }
      } catch (loadError) {
        console.error(
          "Quiz attempt loading error:",
          loadError
        );

        setError(
          loadError instanceof
            Error
            ? loadError.message
            : "Unable to load quiz."
        );
      } finally {
        setLoading(false);
      }
    }

    initialize();
  }, [
    quizId,
    router,
  ]);

  /*
   * Countdown.
   */
  useEffect(() => {
    if (
      loading ||
      submitting ||
      timeLeft <= 0
    ) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          setTimeLeft(
            (previous) =>
              Math.max(
                0,
                previous - 1
              )
          );
        },
        1000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, [
    loading,
    submitting,
    timeLeft,
  ]);

  /*
   * Time expiry.
   */
  useEffect(() => {
    if (
      timeLeft > 0 ||
      loading ||
      !resultId ||
      submitting ||
      autoSubmitTriggered
    ) {
      return;
    }

    setAutoSubmitTriggered(
      true
    );

    submitQuiz(
      "time_expired"
    );
  }, [
    timeLeft,
    loading,
    resultId,
    submitting,
    autoSubmitTriggered,
    submitQuiz,
  ]);

  /*
   * Answer selection.
   */
  const selectAnswer = useCallback(
    (
      questionId: number,
      optionId: number
    ) => {
      if (
        submittingRef.current
      ) {
        return;
      }

      setAnswers(
        (previous) => {
          const next = {
            ...previous,
            [String(
              questionId
            )]: optionId,
          };

          latestAnswersRef.current =
            next;

          saveLocalAnswers(
            next
          );

          return next;
        }
      );
    },
    [saveLocalAnswers]
  );

  /*
   * Browser back button:
   * replace history entry so the user sees our confirmation.
   */
  useEffect(() => {
    if (
      loading ||
      submitting
    ) {
      return;
    }

    const guardState = {
      quizGuard: true,
      quizId,
    };

    window.history.pushState(
      guardState,
      "",
      window.location.href
    );

    const handlePopState =
      () => {
        window.history.pushState(
          guardState,
          "",
          window.location.href
        );

        setShowExitModal(
          true
        );
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
    };
  }, [
    loading,
    submitting,
    quizId,
  ]);

  /*
   * Refresh / close warning.
   *
   * Browsers intentionally do not allow a custom
   * confirmation message here. The actual submit happens
   * only when the user confirms through our modal/back flow.
   */
  useEffect(() => {
    if (
      loading ||
      submitting
    ) {
      return;
    }

    const handleBeforeUnload =
      (event: BeforeUnloadEvent) => {
        event.preventDefault();
        event.returnValue = "";
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
    submitting,
  ]);

  const confirmExit =
    useCallback(() => {
      setShowExitModal(
        false
      );

      submitQuiz(
        "left_quiz"
      );
    }, [submitQuiz]);

  const cancelExit =
    useCallback(() => {
      setShowExitModal(
        false
      );
    }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-indigo-500" />

          <p className="font-black">
            Loading Quiz...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="w-full max-w-lg rounded-3xl border border-red-400/20 bg-red-500/10 p-8 text-center">
          <h1 className="text-2xl font-black">
            Quiz Not Available
          </h1>

          <p className="mt-3 text-sm text-red-200">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/student/quiz-tests/available"
              )
            }
            className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-black"
          >
            Back to Quizzes
          </button>
        </div>
      </main>
    );
  }

  if (
    !quiz ||
    !currentQuestion
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="text-center">
          <h1 className="text-xl font-black">
            Quiz data unavailable.
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/95 backdrop-blur">
          <div className="mx-auto max-w-6xl px-3 py-3 sm:px-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-base font-black sm:text-xl">
                  {quiz.title}
                </h1>

                <p className="text-[10px] text-slate-400 sm:text-xs">
                  RACER ACADEMY
                </p>
              </div>

              <div
                className={`shrink-0 rounded-xl px-3 py-2 text-center ${
                  timeLeft <= 60
                    ? "bg-red-500/20 text-red-300"
                    : "bg-indigo-500/20 text-indigo-300"
                }`}
              >
                <div className="text-[9px] font-bold">
                  TIME LEFT
                </div>

                <div className="text-lg font-black tabular-nums sm:text-2xl">
                  {formatTime(
                    timeLeft
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{
                  width: `${
                    questions.length
                      ? ((currentIndex +
                          1) /
                          questions.length) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-slate-500 sm:text-xs">
              <span>
                Question{" "}
                {currentIndex +
                  1}{" "}
                of{" "}
                {questions.length}
              </span>

              <span>
                Answered{" "}
                {answeredCount}/
                {questions.length}
              </span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-3 py-4 pb-28 sm:px-4 sm:py-8">
          <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-black text-indigo-300">
                  Q{" "}
                  {currentIndex +
                    1}
                </span>

                <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-slate-400">
                  {currentQuestion.marks}{" "}
                  mark
                </span>
              </div>

              <h2 className="mt-5 text-lg font-black leading-relaxed sm:text-2xl">
                {
                  currentQuestion.question_text
                }
              </h2>

              <div className="mt-6 space-y-3">
                {currentQuestion.options.map(
                  (
                    option,
                    optionIndex
                  ) => {
                    const selected =
                      answers[
                        String(
                          currentQuestion.id
                        )
                      ] ===
                      option.id;

                    return (
                      <button
                        type="button"
                        key={
                          option.id
                        }
                        disabled={
                          submitting
                        }
                        onClick={() =>
                          selectAnswer(
                            currentQuestion.id,
                            option.id
                          )
                        }
                        className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
                          selected
                            ? "border-indigo-400 bg-indigo-500/15"
                            : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                            selected
                              ? "bg-indigo-500 text-white"
                              : "bg-white/10 text-slate-400"
                          }`}
                        >
                          {String.fromCharCode(
                            65 +
                              optionIndex
                          )}
                        </span>

                        <span className="pt-1 text-sm font-semibold leading-relaxed sm:text-base">
                          {
                            option.option_text
                          }
                        </span>
                      </button>
                    );
                  }
                )}
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  disabled={
                    currentIndex ===
                      0 ||
                    submitting
                  }
                  onClick={() =>
                    setCurrentIndex(
                      (value) =>
                        Math.max(
                          0,
                          value - 1
                        )
                    )
                  }
                  className="rounded-xl bg-white/10 px-5 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Previous
                </button>

                {currentIndex <
                questions.length -
                  1 ? (
                  <button
                    type="button"
                    disabled={
                      submitting
                    }
                    onClick={() =>
                      setCurrentIndex(
                        (value) =>
                          Math.min(
                            questions.length -
                              1,
                            value + 1
                          )
                      )
                    }
                    className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={
                      submitting
                    }
                    onClick={() =>
                      submitQuiz(
                        "manual"
                      )
                    }
                    className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black"
                  >
                    {submitting
                      ? "Submitting..."
                      : "Submit Quiz"}
                  </button>
                )}
              </div>
            </section>

            <aside className="hidden lg:block">
              <div className="sticky top-24 rounded-3xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-sm font-black">
                  QUESTION PALETTE
                </h3>

                <div className="mt-4 grid grid-cols-5 gap-2">
                  {questions.map(
                    (
                      question,
                      index
                    ) => {
                      const answered =
                        answers[
                          String(
                            question.id
                          )
                        ] !==
                        null &&
                        answers[
                          String(
                            question.id
                          )
                        ] !==
                          undefined;

                      return (
                        <button
                          type="button"
                          key={
                            question.id
                          }
                          onClick={() =>
                            setCurrentIndex(
                              index
                            )
                          }
                          className={`h-9 rounded-lg text-xs font-black ${
                            index ===
                            currentIndex
                              ? "bg-indigo-600 text-white"
                              : answered
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-white/10 text-slate-400"
                          }`}
                        >
                          {index +
                            1}
                        </button>
                      );
                    }
                  )}
                </div>

                <div className="mt-5 space-y-2 text-[10px] font-bold text-slate-500">
                  <div>
                    Total:{" "}
                    {questions.length}
                  </div>

                  <div>
                    Answered:{" "}
                    {answeredCount}
                  </div>

                  <div>
                    Unanswered:{" "}
                    {questions.length -
                      answeredCount}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-slate-950/95 p-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl gap-2">
            <button
              type="button"
              disabled={
                currentIndex ===
                  0 ||
                submitting
              }
              onClick={() =>
                setCurrentIndex(
                  (value) =>
                    Math.max(
                      0,
                      value - 1
                    )
                )
              }
              className="flex-1 rounded-xl bg-white/10 py-3 text-xs font-black disabled:opacity-30"
            >
              Previous
            </button>

            {currentIndex <
            questions.length -
              1 ? (
              <button
                type="button"
                disabled={
                  submitting
                }
                onClick={() =>
                  setCurrentIndex(
                    (value) =>
                      Math.min(
                        questions.length -
                          1,
                        value + 1
                      )
                  )
                }
                className="flex-1 rounded-xl bg-indigo-600 py-3 text-xs font-black"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                disabled={
                  submitting
                }
                onClick={() =>
                  submitQuiz(
                    "manual"
                  )
                }
                className="flex-1 rounded-xl bg-emerald-600 py-3 text-xs font-black"
              >
                {submitting
                  ? "Submitting..."
                  : "Submit"}
              </button>
            )}
          </div>
        </div>

        {showExitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
              <h2 className="text-xl font-black">
                Are you sure you want to exit?
              </h2>

              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                If you select YES, the quiz will be
                submitted immediately at your current
                stopping point. Your selected answers
                will be saved. Unanswered questions will
                remain unanswered.
              </p>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={
                    cancelExit
                  }
                  disabled={
                    submitting
                  }
                  className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm font-black"
                >
                  NO
                </button>

                <button
                  type="button"
                  onClick={
                    confirmExit
                  }
                  disabled={
                    submitting
                  }
                  className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-black"
                >
                  YES
                </button>
              </div>
            </div>
          </div>
        )}

        {submitting && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
            <div className="rounded-2xl bg-slate-900 px-6 py-5 text-center shadow-2xl">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-white/10 border-t-indigo-500" />

              <p className="text-sm font-black">
                Saving your result...
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function StudentQuizAttemptPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-indigo-500" />

            <p className="font-black">
              Loading Quiz...
            </p>
          </div>
        </main>
      }
    >
      <StudentQuizAttemptContent />
    </Suspense>
  );
}