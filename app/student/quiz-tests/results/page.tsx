"use client";

import {
  Suspense,
  useEffect,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type Quiz = {
  id: number;
  title: string;
  description: string | null;
  class_name: string | null;
  target_classes: string[] | null;
  subject: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  duration_minutes: number | null;
  marks_per_question: number | null;
  negative_marks: number | null;
  pass_percentage: number | null;
};

type QuizResult = {
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
  created_at: string | null;
};

type ResultItem = QuizResult & {
  quiz: Quiz | null;
};

function normalizeClass(value: unknown): string {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .toUpperCase()
    .replace(/^CLASS\s+/i, "")
    .replace(/\s+/g, " ");
}

function matchesClass(
  quiz: Quiz,
  studentClass: string
): boolean {
  const currentClass =
    normalizeClass(studentClass);

  if (!currentClass) return false;

  const targets = Array.isArray(
    quiz.target_classes
  )
    ? quiz.target_classes
        .filter(
          (value): value is string =>
            typeof value === "string"
        )
        .map(normalizeClass)
        .filter(Boolean)
    : [];

  if (targets.length > 0) {
    return targets.includes(currentClass);
  }

  return (
    normalizeClass(quiz.class_name) ===
    currentClass
  );
}

function numberText(
  value: number | null | undefined
): string {
  const n = Number(value ?? 0);

  if (!Number.isFinite(n)) return "0";

  return Number.isInteger(n)
    ? String(n)
    : n.toFixed(2);
}

function dateTimeText(
  value: string | null
): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dateText(
  value: string | null
): string {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function timeText(
  value: string | null
): string {
  if (!value) return "—";

  const parts = value.split(":");
  let hour = Number(parts[0]);

  if (!Number.isFinite(hour)) {
    return value;
  }

  const minute = parts[1] || "00";
  const period = hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${minute} ${period}`;
}

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const quizIdParam =
    searchParams.get("quizId");

  const quizId = Number(quizIdParam);

  const isDetail =
    Number.isFinite(quizId) &&
    quizId > 0;

  const [studentId, setStudentId] =
    useState<number | null>(null);

  const [studentName, setStudentName] =
    useState("");

  const [studentClass, setStudentClass] =
    useState("");

  const [results, setResults] =
    useState<ResultItem[]>([]);

  const [selectedQuiz, setSelectedQuiz] =
    useState<Quiz | null>(null);

  const [selectedResult, setSelectedResult] =
    useState<QuizResult | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadPage();
  }, [quizIdParam]);

  async function getStudent() {
    const storedId =
      localStorage.getItem(
        "attendance_student_id"
      ) ||
      localStorage.getItem(
        "studentId"
      ) ||
      localStorage.getItem(
        "student_id"
      );

    const storedUsername =
      localStorage.getItem(
        "student_username"
      ) ||
      localStorage.getItem(
        "studentUsername"
      );

    let id: number | null = null;
    let name =
      localStorage.getItem(
        "attendance_student_name"
      ) ||
      localStorage.getItem(
        "studentName"
      ) ||
      localStorage.getItem(
        "student_name"
      ) ||
      "";

    let className = "";

    const parsed = Number(storedId);

    if (
      Number.isFinite(parsed) &&
      parsed > 0
    ) {
      id = parsed;
    }

    if (id) {
      const { data } =
        await supabase
          .from("students")
          .select(
            "id,student_name,student_username,class_name"
          )
          .eq("id", id)
          .maybeSingle();

      if (data) {
        id = Number(data.id);
        name =
          data.student_name || name;
        className =
          normalizeClass(data.class_name);
      }
    }

    if (
      (!id || !className) &&
      storedUsername
    ) {
      const { data } =
        await supabase
          .from("students")
          .select(
            "id,student_name,student_username,class_name"
          )
          .eq(
            "student_username",
            storedUsername
          )
          .maybeSingle();

      if (data) {
        id = Number(data.id);
        name =
          data.student_name || name;
        className =
          normalizeClass(data.class_name);
      }
    }

    if (!id) {
      throw new Error(
        "Student login information not found. Please login again."
      );
    }

    return {
      id,
      name,
      className,
    };
  }

  async function loadPage() {
    setLoading(true);
    setError("");

    try {
      const student =
        await getStudent();

      setStudentId(student.id);
      setStudentName(student.name);
      setStudentClass(student.className);

      if (isDetail) {
        await loadSingleResult(
          student.id,
          quizId
        );
      } else {
        await loadAllResults(
          student.id,
          student.className
        );
      }
    } catch (loadError) {
      console.error(
        "Results page error:",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load results."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadAllResults(
    id: number,
    className: string
  ) {
    const {
      data: resultData,
      error: resultError,
    } = await supabase
      .from("quiz_results")
      .select("*")
      .eq("student_id", id)
      .order("submitted_at", {
        ascending: false,
      });

    if (resultError) {
      throw new Error(
        resultError.message
      );
    }

    const rawResults =
      (resultData || []) as QuizResult[];

    if (rawResults.length === 0) {
      setResults([]);
      return;
    }

    const quizIds = Array.from(
      new Set(
        rawResults
          .map((item) =>
            Number(item.quiz_id)
          )
          .filter(
            (value) =>
              Number.isFinite(value) &&
              value > 0
          )
      )
    );

    const {
      data: quizData,
      error: quizError,
    } = await supabase
      .from("quiz_tests")
      .select(
        "id,title,description,class_name,target_classes,subject,scheduled_date,scheduled_time,duration_minutes,marks_per_question,negative_marks,pass_percentage"
      )
      .in("id", quizIds);

    if (quizError) {
      throw new Error(
        quizError.message
      );
    }

    const quizMap =
      new Map<number, Quiz>();

    ((quizData || []) as Quiz[]).forEach(
      (quiz) => {
        quizMap.set(
          Number(quiz.id),
          quiz
        );
      }
    );

    const combined =
      rawResults
        .map((item) => ({
          ...item,
          quiz:
            quizMap.get(
              Number(item.quiz_id)
            ) || null,
        }))
        .filter((item) => {
          if (
            item.quiz &&
            className
          ) {
            return matchesClass(
              item.quiz,
              className
            );
          }

          return true;
        });

    setResults(combined);
  }

  async function loadSingleResult(
    id: number,
    selectedId: number
  ) {
    const {
      data: quizData,
      error: quizError,
    } = await supabase
      .from("quiz_tests")
      .select(
        "id,title,description,class_name,target_classes,subject,scheduled_date,scheduled_time,duration_minutes,marks_per_question,negative_marks,pass_percentage"
      )
      .eq("id", selectedId)
      .maybeSingle();

    if (quizError) {
      throw new Error(
        quizError.message
      );
    }

    if (!quizData) {
      throw new Error(
        "Quiz not found."
      );
    }

    const quiz =
      quizData as Quiz;

    setSelectedQuiz(quiz);

    const {
      data: resultData,
      error: resultError,
    } = await supabase
      .from("quiz_results")
      .select("*")
      .eq("quiz_id", selectedId)
      .eq("student_id", id)
      .order("submitted_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (resultError) {
      throw new Error(
        resultError.message
      );
    }

    let result =
      (resultData ||
        null) as QuizResult | null;

    if (!result) {
      try {
        const stored =
          sessionStorage.getItem(
            `quiz-result-${selectedId}`
          );

        if (stored) {
          const parsed =
            JSON.parse(
              stored
            ) as QuizResult;

          if (
            Number(parsed.quiz_id) ===
              selectedId &&
            Number(parsed.student_id) ===
              id
          ) {
            result = parsed;
          }
        }
      } catch (storageError) {
        console.error(
          "Session result error:",
          storageError
        );
      }
    }

    if (!result) {
      throw new Error(
        "Result not found for this quiz."
      );
    }

    setSelectedResult(result);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-indigo-500" />

          <h1 className="text-xl font-black">
            Loading Results...
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Please wait.
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-2xl rounded-3xl border border-red-400/20 bg-red-500/10 p-8 text-center">

          <h1 className="text-2xl font-black">
            Unable to Load Result
          </h1>

          <p className="mt-3 text-sm leading-6 text-red-200">
            {error}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">

            <button
              onClick={() =>
                router.push(
                  "/student/quiz-tests/results"
                )
              }
              className="rounded-xl bg-indigo-600 px-6 py-3 font-black hover:bg-indigo-500"
            >
              VIEW ALL RESULTS
            </button>

            <button
              onClick={() =>
                router.push(
                  "/student/quiz-tests"
                )
              }
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-black hover:bg-white/10"
            >
              ← QUIZ TESTS
            </button>

          </div>
        </div>
      </main>
    );
  }

  if (!isDetail) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">

          <header className="border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">

              <div>
                <h1 className="text-lg font-black">
                  RACER ACADEMY
                </h1>

                <p className="text-xs text-slate-400">
                  QUIZ RESULTS
                  {studentClass
                    ? ` • CLASS ${studentClass}`
                    : ""}
                </p>
              </div>

              <button
                onClick={() =>
                  router.push(
                    "/student/quiz-tests"
                  )
                }
                className="rounded-xl bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10"
              >
                ← Quiz Tests
              </button>

            </div>
          </header>

          <div className="mx-auto max-w-6xl px-4 py-8">

            <div className="mb-7">
              <p className="text-xs font-black tracking-[0.25em] text-indigo-400">
                PERFORMANCE
              </p>

              <h2 className="mt-2 text-3xl font-black sm:text-4xl">
                My Quiz Results
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Results of all quizzes you have completed.
              </p>

              {studentName && (
                <p className="mt-2 text-sm text-slate-500">
                  Student:{" "}
                  <strong className="text-slate-300">
                    {studentName}
                  </strong>
                </p>
              )}
            </div>

            {results.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-12 text-center">

                <h3 className="text-xl font-black">
                  No Quiz Results Yet
                </h3>

                <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-400">
                  Your marks will appear here automatically
                  after you complete and submit a quiz.
                </p>

                <button
                  onClick={() =>
                    router.push(
                      "/student/quiz-tests/available"
                    )
                  }
                  className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-black hover:bg-indigo-500"
                >
                  VIEW AVAILABLE QUIZZES
                </button>

              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">

                {results.map(
                  (item, index) => {
                    const passed =
                      String(
                        item.result_status
                      ).toUpperCase() ===
                      "PASS";

                    return (
                      <div
                        key={
                          item.id ||
                          `${item.quiz_id}-${index}`
                        }
                        className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-xl"
                      >

                        <div
                          className={`p-5 ${
                            passed
                              ? "bg-emerald-500/10"
                              : "bg-red-500/10"
                          }`}
                        >

                          <div className="flex items-start justify-between gap-4">

                            <div>
                              <p className="text-[10px] font-black tracking-[0.2em] text-slate-500">
                                COMPLETED QUIZ
                              </p>

                              <h3 className="mt-2 text-xl font-black">
                                {item.quiz?.title ||
                                  `Quiz #${item.quiz_id}`}
                              </h3>

                              {item.quiz?.subject && (
                                <p className="mt-1 text-sm text-slate-400">
                                  {item.quiz.subject}
                                </p>
                              )}
                            </div>

                            <span
                              className={`rounded-full px-3 py-1 text-[10px] font-black ${
                                passed
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-red-500/20 text-red-300"
                              }`}
                            >
                              {passed
                                ? "PASS"
                                : "FAIL"}
                            </span>

                          </div>

                          <div className="mt-6 grid grid-cols-2 gap-3">

                            <div className="rounded-xl bg-white/5 p-4">
                              <p className="text-[9px] font-bold text-slate-500">
                                PERCENTAGE
                              </p>

                              <p className="mt-1 text-2xl font-black">
                                {numberText(
                                  item.percentage
                                )}
                                %
                              </p>
                            </div>

                            <div className="rounded-xl bg-white/5 p-4">
                              <p className="text-[9px] font-bold text-slate-500">
                                MARKS
                              </p>

                              <p className="mt-1 text-2xl font-black">
                                {numberText(
                                  item.obtained_marks
                                )}{" "}
                                /{" "}
                                {numberText(
                                  item.total_marks
                                )}
                              </p>
                            </div>

                          </div>

                        </div>

                        <div className="p-5">

                          <div className="grid grid-cols-3 gap-2">

                            <div className="rounded-xl bg-emerald-500/10 p-3 text-center">
                              <p className="text-lg font-black text-emerald-300">
                                {item.correct_answers}
                              </p>
                              <p className="text-[9px] font-bold text-emerald-200/60">
                                CORRECT
                              </p>
                            </div>

                            <div className="rounded-xl bg-red-500/10 p-3 text-center">
                              <p className="text-lg font-black text-red-300">
                                {item.wrong_answers}
                              </p>
                              <p className="text-[9px] font-bold text-red-200/60">
                                WRONG
                              </p>
                            </div>

                            <div className="rounded-xl bg-amber-500/10 p-3 text-center">
                              <p className="text-lg font-black text-amber-300">
                                {item.unanswered}
                              </p>
                              <p className="text-[9px] font-bold text-amber-200/60">
                                SKIPPED
                              </p>
                            </div>

                          </div>

                          <p className="mt-4 text-xs text-slate-500">
                            Submitted:{" "}
                            {dateTimeText(
                              item.submitted_at ||
                                item.created_at
                            )}
                          </p>

                          <button
                            onClick={() =>
                              router.push(
                                `/student/quiz-tests/results?quizId=${item.quiz_id}`
                              )
                            }
                            className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 font-black hover:bg-indigo-500"
                          >
                            VIEW FULL RESULT →
                          </button>

                        </div>
                      </div>
                    );
                  }
                )}

              </div>
            )}

            <div className="mt-6">
              <button
                onClick={() =>
                  router.push(
                    "/student/quiz-tests/history"
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-black hover:bg-white/10"
              >
                VIEW QUIZ HISTORY →
              </button>
            </div>

          </div>
        </div>
      </main>
    );
  }

  const result =
    selectedResult;

  const quiz =
    selectedQuiz;

  if (!result || !quiz) {
    return null;
  }

  const passed =
    String(
      result.result_status
    ).toUpperCase() ===
    "PASS";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">

        <header className="border-b border-white/10 bg-slate-950/90">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">

            <div>
              <h1 className="font-black">
                RACER ACADEMY
              </h1>

              <p className="text-xs text-slate-400">
                FULL QUIZ RESULT
              </p>
            </div>

            <button
              onClick={() =>
                router.push(
                  "/student/quiz-tests/results"
                )
              }
              className="rounded-xl bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10"
            >
              ← All Results
            </button>

          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-8">

          <section
            className={`rounded-3xl border p-7 text-center ${
              passed
                ? "border-emerald-400/20 bg-emerald-500/10"
                : "border-red-400/20 bg-red-500/10"
            }`}
          >

            <p className="text-xs font-black tracking-[0.25em] text-slate-400">
              QUIZ RESULT
            </p>

            <h2 className="mt-3 text-3xl font-black">
              {quiz.title}
            </h2>

            {quiz.subject && (
              <p className="mt-2 text-sm text-slate-400">
                {quiz.subject}
              </p>
            )}

            <div className="mx-auto mt-7 flex h-44 w-44 items-center justify-center rounded-full border-[12px] border-indigo-500/30 bg-slate-950/70">

              <div>
                <div className="text-4xl font-black">
                  {numberText(
                    result.percentage
                  )}
                  %
                </div>

                <p className="text-xs font-bold text-slate-500">
                  SCORE
                </p>
              </div>

            </div>

            <div className="mt-6">
              <span
                className={`rounded-full px-7 py-3 text-lg font-black ${
                  passed
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-red-500/20 text-red-300"
                }`}
              >
                {passed
                  ? "PASSED"
                  : "FAILED"}
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

          </section>

          <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
              <p className="text-3xl font-black">
                {numberText(
                  result.total_questions
                )}
              </p>
              <p className="mt-1 text-[10px] font-bold text-slate-500">
                QUESTIONS
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-500/10 p-5 text-center">
              <p className="text-3xl font-black text-emerald-300">
                {result.correct_answers}
              </p>
              <p className="mt-1 text-[10px] font-bold text-emerald-200/60">
                CORRECT
              </p>
            </div>

            <div className="rounded-2xl bg-red-500/10 p-5 text-center">
              <p className="text-3xl font-black text-red-300">
                {result.wrong_answers}
              </p>
              <p className="mt-1 text-[10px] font-bold text-red-200/60">
                WRONG
              </p>
            </div>

            <div className="rounded-2xl bg-amber-500/10 p-5 text-center">
              <p className="text-3xl font-black text-amber-300">
                {result.unanswered}
              </p>
              <p className="mt-1 text-[10px] font-bold text-amber-200/60">
                SKIPPED
              </p>
            </div>

          </section>

          <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">

            <h3 className="text-xl font-black">
              Marks Summary
            </h3>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">

              <div className="rounded-2xl bg-slate-900/70 p-5">
                <p className="text-xs font-bold text-slate-500">
                  TOTAL MARKS
                </p>

                <p className="mt-2 text-3xl font-black">
                  {numberText(
                    result.total_marks
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-indigo-500/10 p-5">
                <p className="text-xs font-bold text-indigo-300">
                  OBTAINED MARKS
                </p>

                <p className="mt-2 text-3xl font-black text-indigo-300">
                  {numberText(
                    result.obtained_marks
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-500/10 p-5">
                <p className="text-xs font-bold text-emerald-300">
                  PERCENTAGE
                </p>

                <p className="mt-2 text-3xl font-black text-emerald-300">
                  {numberText(
                    result.percentage
                  )}
                  %
                </p>
              </div>

            </div>

            <div className="mt-6 h-4 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full ${
                  passed
                    ? "bg-emerald-500"
                    : "bg-red-500"
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      Number(
                        result.percentage || 0
                      )
                    )
                  )}%`,
                }}
              />
            </div>

          </section>

          <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">

            <h3 className="text-xl font-black">
              Quiz Information
            </h3>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">

              <div className="rounded-xl bg-slate-900/70 p-4">
                <p className="text-[10px] font-bold text-slate-500">
                  CLASS
                </p>

                <p className="mt-1 font-black">
                  {quiz.class_name
                    ? `Class ${normalizeClass(
                        quiz.class_name
                      )}`
                    : studentClass
                      ? `Class ${studentClass}`
                      : "—"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-900/70 p-4">
                <p className="text-[10px] font-bold text-slate-500">
                  SUBJECT
                </p>

                <p className="mt-1 font-black">
                  {quiz.subject || "—"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-900/70 p-4">
                <p className="text-[10px] font-bold text-slate-500">
                  PASS PERCENTAGE
                </p>

                <p className="mt-1 font-black">
                  {numberText(
                    quiz.pass_percentage
                  )}
                  %
                </p>
              </div>

              <div className="rounded-xl bg-slate-900/70 p-4">
                <p className="text-[10px] font-bold text-slate-500">
                  DURATION
                </p>

                <p className="mt-1 font-black">
                  {quiz.duration_minutes ||
                    30}{" "}
                  Minutes
                </p>
              </div>

              <div className="rounded-xl bg-slate-900/70 p-4">
                <p className="text-[10px] font-bold text-slate-500">
                  QUIZ DATE
                </p>

                <p className="mt-1 font-black">
                  {dateText(
                    quiz.scheduled_date
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-900/70 p-4">
                <p className="text-[10px] font-bold text-slate-500">
                  START TIME
                </p>

                <p className="mt-1 font-black">
                  {timeText(
                    quiz.scheduled_time
                  )}
                </p>
              </div>

            </div>

          </section>

          <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">

            <h3 className="text-xl font-black">
              Submission Details
            </h3>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">

              <div className="rounded-xl bg-slate-900/70 p-4">
                <p className="text-[10px] font-bold text-slate-500">
                  STARTED AT
                </p>

                <p className="mt-1 text-sm font-bold">
                  {dateTimeText(
                    result.started_at
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-900/70 p-4">
                <p className="text-[10px] font-bold text-slate-500">
                  SUBMITTED AT
                </p>

                <p className="mt-1 text-sm font-bold">
                  {dateTimeText(
                    result.submitted_at
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-900/70 p-4 sm:col-span-2">
                <p className="text-[10px] font-bold text-slate-500">
                  SUBMISSION TYPE
                </p>

                <p className="mt-1 text-sm font-bold uppercase">
                  {result.submission_type ||
                    "MANUAL SUBMISSION"}
                </p>
              </div>

            </div>

          </section>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">

            <button
              onClick={() =>
                router.push(
                  "/student/quiz-tests/results"
                )
              }
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-black hover:bg-white/10"
            >
              ← ALL RESULTS
            </button>

            <button
              onClick={() =>
                router.push(
                  "/student/quiz-tests/history"
                )
              }
              className="rounded-2xl bg-indigo-600 px-5 py-4 font-black hover:bg-indigo-500"
            >
              QUIZ HISTORY →
            </button>

          </div>

          <div className="py-8 text-center text-xs text-slate-500">
            RACER ACADEMY • Quiz Result
          </div>

        </div>
      </div>
    </main>
  );
}

function dateText(
  value: string | null
): string {
  if (!value) return "—";

  const date = new Date(
    `${value}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function timeText(
  value: string | null
): string {
  if (!value) return "—";

  const parts = value.split(":");
  let hour = Number(parts[0]);

  if (!Number.isFinite(hour)) {
    return value;
  }

  const minute = parts[1] || "00";
  const period =
    hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${minute} ${period}`;
}

export default function StudentQuizResultsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-indigo-500" />
            <p className="font-bold">
              Loading Results...
            </p>
          </div>
        </main>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}