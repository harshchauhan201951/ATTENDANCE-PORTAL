"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type QuizTest = {
  id: number;
  title: string;
  description: string | null;
  class_name: string | null;
  subject: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  duration_minutes: number | null;
  marks_per_question: number | null;
  negative_marks: number | null;
  pass_percentage: number | null;
};

type QuizResult = {
  id?: number;
  quiz_id: number;
  student_id: number;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  unanswered: number;
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  result_status: "PASS" | "FAIL" | string;
  started_at: string | null;
  submitted_at: string | null;
  submission_type: string | null;
  created_at?: string | null;
};

function StudentResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const quizIdParam = searchParams.get("quizId");

  const [quiz, setQuiz] = useState<QuizTest | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);

  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const quizId = useMemo(() => {
    const id = Number(quizIdParam);
    return Number.isFinite(id) && id > 0 ? id : null;
  }, [quizIdParam]);

  useEffect(() => {
    const storedName =
      localStorage.getItem("attendance_student_name") ||
      localStorage.getItem("studentName") ||
      localStorage.getItem("student_name") ||
      "";

    const storedIdRaw =
      localStorage.getItem("attendance_student_id") ||
      localStorage.getItem("studentId") ||
      localStorage.getItem("student_id");

    const parsedId = Number(storedIdRaw);

    setStudentName(storedName);

    if (Number.isFinite(parsedId) && parsedId > 0) {
      setStudentId(parsedId);
    }
  }, []);

  useEffect(() => {
    async function loadResult() {
      if (!quizId) {
        setError("Quiz ID is missing.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        /*
         * ---------------------------------------------------------
         * 1. LOAD QUIZ DETAILS
         * ---------------------------------------------------------
         */

        const { data: quizData, error: quizError } =
          await supabase
            .from("quiz_tests")
            .select("*")
            .eq("id", quizId)
            .maybeSingle();

        if (quizError) {
          console.error("Quiz loading error:", quizError);
          throw new Error(quizError.message);
        }

        if (!quizData) {
          throw new Error("Quiz not found.");
        }

        setQuiz(quizData as QuizTest);

        /*
         * ---------------------------------------------------------
         * 2. FIND STUDENT ID
         * ---------------------------------------------------------
         */

        let currentStudentId = studentId;

        if (!currentStudentId) {
          const storedIdRaw =
            localStorage.getItem("attendance_student_id") ||
            localStorage.getItem("studentId") ||
            localStorage.getItem("student_id");

          const parsedId = Number(storedIdRaw);

          if (Number.isFinite(parsedId) && parsedId > 0) {
            currentStudentId = parsedId;
            setStudentId(parsedId);
          }
        }

        /*
         * ---------------------------------------------------------
         * 3. LOAD RESULT
         * ---------------------------------------------------------
         */

        let resultData: QuizResult | null = null;

        if (currentStudentId) {
          const { data, error: resultError } =
            await supabase
              .from("quiz_results")
              .select("*")
              .eq("quiz_id", quizId)
              .eq("student_id", currentStudentId)
              .order("created_at", {
                ascending: false,
              })
              .limit(1)
              .maybeSingle();

          if (resultError) {
            console.error(
              "Result loading error:",
              resultError
            );

            /*
             * Do not immediately fail because of a possible
             * database/RLS issue. We will try sessionStorage below.
             */
          } else if (data) {
            resultData = data as QuizResult;
          }
        }

        /*
         * ---------------------------------------------------------
         * 4. SESSION STORAGE FALLBACK
         * ---------------------------------------------------------
         *
         * The quiz attempt page also stores the latest result
         * locally. This keeps the result visible even if the
         * database result has not yet been returned.
         */

        if (!resultData) {
          try {
            const localResult = sessionStorage.getItem(
              `quiz-result-${quizId}`
            );

            if (localResult) {
              const parsedLocalResult =
                JSON.parse(localResult) as QuizResult;

              if (
                parsedLocalResult &&
                Number(parsedLocalResult.quiz_id) === quizId
              ) {
                resultData = parsedLocalResult;
              }
            }
          } catch (storageError) {
            console.error(
              "Session result error:",
              storageError
            );
          }
        }

        if (!resultData) {
          throw new Error(
            "Result not found. Please make sure the quiz was submitted successfully."
          );
        }

        setResult(resultData);
      } catch (err) {
        console.error("Result page error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load quiz result."
        );
      } finally {
        setLoading(false);
      }
    }

    loadResult();
  }, [quizId, studentId]);

  function formatDateTime(value: string | null) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function formatNumber(value: number | null | undefined) {
    if (value === null || value === undefined) {
      return "0";
    }

    return Number.isInteger(value)
      ? String(value)
      : value.toFixed(2);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="flex min-h-screen items-center justify-center px-5">
          <div className="text-center">
            <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-indigo-500" />

            <h1 className="text-xl font-black">
              Loading Result...
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Please wait while we load your quiz result.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !result) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4 py-10">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-7 text-center shadow-2xl">
              <div className="text-5xl">⚠️</div>

              <h1 className="mt-4 text-2xl font-black">
                Result Not Available
              </h1>

              <p className="mt-3 text-sm leading-6 text-red-200">
                {error || "Unable to load your result."}
              </p>

              {quizId && (
                <p className="mt-3 text-xs text-slate-400">
                  Quiz ID:{" "}
                  <strong className="text-white">
                    {quizId}
                  </strong>
                </p>
              )}

              <button
                onClick={() =>
                  router.push("/student/quiz-tests")
                }
                className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-black transition hover:bg-indigo-500"
              >
                ← Back to Quiz Tests
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const isPassed =
    String(result.result_status).toUpperCase() === "PASS";

  const percentage = Number(result.percentage || 0);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        {/* HEADER */}
        <header className="border-b border-white/10 bg-slate-950/90">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
            <div>
              <h1 className="text-lg font-black sm:text-xl">
                RACER ACADEMY
              </h1>

              <p className="text-xs text-slate-400">
                QUIZ RESULT
              </p>
            </div>

            <button
              onClick={() =>
                router.push("/student/quiz-tests")
              }
              className="rounded-xl bg-white/5 px-4 py-2 text-sm font-bold transition hover:bg-white/10"
            >
              ← Quiz Tests
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-7 sm:py-10">

          {/* RESULT HERO */}
          <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl">
            <div
              className={`p-6 text-center sm:p-10 ${
                isPassed
                  ? "bg-emerald-500/10"
                  : "bg-red-500/10"
              }`}
            >
              <div className="text-6xl">
                {isPassed ? "🏆" : "📚"}
              </div>

              <p className="mt-4 text-xs font-black tracking-[0.25em] text-slate-400">
                QUIZ COMPLETED
              </p>

              <h2 className="mt-2 text-2xl font-black sm:text-4xl">
                {quiz?.title || "Quiz Result"}
              </h2>

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {quiz?.class_name && (
                  <span className="rounded-full bg-indigo-500/20 px-4 py-2 text-xs font-black text-indigo-300">
                    CLASS {quiz.class_name}
                  </span>
                )}

                {quiz?.subject && (
                  <span className="rounded-full bg-blue-500/20 px-4 py-2 text-xs font-black text-blue-300">
                    {quiz.subject}
                  </span>
                )}
              </div>

              {/* PERCENTAGE */}
              <div className="mx-auto mt-8 flex h-44 w-44 items-center justify-center rounded-full border-[12px] border-indigo-500/30 bg-slate-950/60 shadow-xl sm:h-52 sm:w-52">
                <div>
                  <div className="text-4xl font-black sm:text-5xl">
                    {formatNumber(percentage)}%
                  </div>

                  <div className="mt-1 text-xs font-bold text-slate-400">
                    SCORE
                  </div>
                </div>
              </div>

              {/* PASS / FAIL */}
              <div className="mt-7">
                <span
                  className={`inline-flex rounded-full px-7 py-3 text-lg font-black ${
                    isPassed
                      ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30"
                      : "bg-red-500/20 text-red-300 ring-1 ring-red-400/30"
                  }`}
                >
                  {isPassed ? "✓ PASSED" : "✕ FAILED"}
                </span>
              </div>

              {studentName && (
                <p className="mt-5 text-sm text-slate-400">
                  Student:{" "}
                  <strong className="text-white">
                    {studentName}
                  </strong>
                </p>
              )}
            </div>
          </section>

          {/* SCORE CARDS */}
          <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
              <div className="text-3xl font-black">
                {formatNumber(result.total_questions)}
              </div>

              <div className="mt-1 text-xs font-bold text-slate-400">
                TOTAL QUESTIONS
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5 text-center">
              <div className="text-3xl font-black text-emerald-300">
                {formatNumber(result.correct_answers)}
              </div>

              <div className="mt-1 text-xs font-bold text-emerald-200/70">
                CORRECT
              </div>
            </div>

            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-5 text-center">
              <div className="text-3xl font-black text-red-300">
                {formatNumber(result.wrong_answers)}
              </div>

              <div className="mt-1 text-xs font-bold text-red-200/70">
                WRONG
              </div>
            </div>

            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-5 text-center">
              <div className="text-3xl font-black text-amber-300">
                {formatNumber(result.unanswered)}
              </div>

              <div className="mt-1 text-xs font-bold text-amber-200/70">
                UNANSWERED
              </div>
            </div>
          </section>

          {/* MARKS */}
          <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-7">
            <h3 className="text-xl font-black">
              📊 Marks Summary
            </h3>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-900/80 p-5">
                <p className="text-xs font-bold text-slate-400">
                  TOTAL MARKS
                </p>

                <p className="mt-2 text-3xl font-black">
                  {formatNumber(result.total_marks)}
                </p>
              </div>

              <div className="rounded-2xl bg-indigo-500/10 p-5">
                <p className="text-xs font-bold text-indigo-300">
                  OBTAINED MARKS
                </p>

                <p className="mt-2 text-3xl font-black text-indigo-300">
                  {formatNumber(result.obtained_marks)}
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-500/10 p-5">
                <p className="text-xs font-bold text-emerald-300">
                  PERCENTAGE
                </p>

                <p className="mt-2 text-3xl font-black text-emerald-300">
                  {formatNumber(percentage)}%
                </p>
              </div>
            </div>

            {/* PROGRESS */}
            <div className="mt-6">
              <div className="mb-2 flex justify-between text-xs font-bold">
                <span className="text-slate-400">
                  Performance
                </span>

                <span className="text-white">
                  {formatNumber(percentage)}%
                </span>
              </div>

              <div className="h-4 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all ${
                    isPassed
                      ? "bg-emerald-500"
                      : "bg-red-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, percentage)
                    )}%`,
                  }}
                />
              </div>
            </div>
          </section>

          {/* QUESTION PERFORMANCE */}
          <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-7">
            <h3 className="text-xl font-black">
              📝 Question Performance
            </h3>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-emerald-500/10 p-4">
                <div>
                  <p className="font-bold text-emerald-300">
                    Correct Answers
                  </p>

                  <p className="text-xs text-slate-400">
                    Questions answered correctly
                  </p>
                </div>

                <strong className="text-2xl text-emerald-300">
                  {result.correct_answers}
                </strong>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-red-500/10 p-4">
                <div>
                  <p className="font-bold text-red-300">
                    Wrong Answers
                  </p>

                  <p className="text-xs text-slate-400">
                    Questions answered incorrectly
                  </p>
                </div>

                <strong className="text-2xl text-red-300">
                  {result.wrong_answers}
                </strong>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-amber-500/10 p-4">
                <div>
                  <p className="font-bold text-amber-300">
                    Unanswered
                  </p>

                  <p className="text-xs text-slate-400">
                    Questions left unanswered
                  </p>
                </div>

                <strong className="text-2xl text-amber-300">
                  {result.unanswered}
                </strong>
              </div>
            </div>
          </section>

          {/* QUIZ INFORMATION */}
          <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-7">
            <h3 className="text-xl font-black">
              ℹ️ Quiz Information
            </h3>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-900/70 p-4">
                <p className="text-xs font-bold text-slate-500">
                  SUBJECT
                </p>

                <p className="mt-1 font-black">
                  {quiz?.subject || "—"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900/70 p-4">
                <p className="text-xs font-bold text-slate-500">
                  CLASS
                </p>

                <p className="mt-1 font-black">
                  {quiz?.class_name
                    ? `Class ${quiz.class_name}`
                    : "—"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900/70 p-4">
                <p className="text-xs font-bold text-slate-500">
                  PASS PERCENTAGE
                </p>

                <p className="mt-1 font-black">
                  {formatNumber(
                    quiz?.pass_percentage
                  )}
                  %
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900/70 p-4">
                <p className="text-xs font-bold text-slate-500">
                  DURATION
                </p>

                <p className="mt-1 font-black">
                  {quiz?.duration_minutes || 30} Minutes
                </p>
              </div>
            </div>
          </section>

          {/* SUBMISSION INFORMATION */}
          <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-7">
            <h3 className="text-xl font-black">
              ⏱️ Submission Details
            </h3>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-900/70 p-4">
                <p className="text-xs font-bold text-slate-500">
                  STARTED AT
                </p>

                <p className="mt-1 text-sm font-bold">
                  {formatDateTime(result.started_at)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900/70 p-4">
                <p className="text-xs font-bold text-slate-500">
                  SUBMITTED AT
                </p>

                <p className="mt-1 text-sm font-bold">
                  {formatDateTime(result.submitted_at)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900/70 p-4 sm:col-span-2">
                <p className="text-xs font-bold text-slate-500">
                  SUBMISSION TYPE
                </p>

                <p className="mt-1 text-sm font-bold uppercase">
                  {result.submission_type ||
                    "MANUAL SUBMISSION"}
                </p>
              </div>
            </div>
          </section>

          {/* ACTIONS */}
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() =>
                router.push("/student/quiz-tests")
              }
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-black transition hover:bg-white/10"
            >
              ← Back to Quiz Tests
            </button>

            <button
              onClick={() =>
                router.push("/student/quiz-tests/history")
              }
              className="rounded-2xl bg-indigo-600 px-5 py-4 font-black transition hover:bg-indigo-500"
            >
              View Quiz History →
            </button>
          </div>

          {/* FOOTER */}
          <div className="py-8 text-center text-xs text-slate-500">
            RACER ACADEMY • Quiz Result
          </div>
        </div>
      </div>
    </main>
  );
}

export default function StudentQuizResultsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-indigo-500" />

            <p className="font-bold">
              Loading Result...
            </p>
          </div>
        </main>
      }
    >
      <StudentResultsContent />
    </Suspense>
  );
}