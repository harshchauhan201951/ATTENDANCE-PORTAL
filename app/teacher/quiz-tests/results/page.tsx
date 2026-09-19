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
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  marks_per_question: number;
  negative_marks: number;
  pass_percentage: number;
  is_published: boolean;
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

type Student = {
  id: number;
  student_name: string | null;
  student_username: string | null;
  class_name: string | null;
};

type ResultRow = QuizResult & {
  student: Student | null;
};

function normalizeClass(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase();
}

function getQuizClasses(quiz: Quiz | null) {
  if (!quiz) return [];

  const targets = Array.isArray(
    quiz.target_classes
  )
    ? quiz.target_classes
        .map(normalizeClass)
        .filter(Boolean)
    : [];

  if (targets.length > 0) {
    return Array.from(
      new Set(targets)
    );
  }

  const legacy =
    normalizeClass(quiz.class_name);

  return legacy ? [legacy] : [];
}

function formatDateTime(
  value: string | null
) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}

function formatNumber(
  value: number | null | undefined
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "0";
  }

  const numberValue =
    Number(value);

  if (!Number.isFinite(numberValue)) {
    return "0";
  }

  return Number.isInteger(
    numberValue
  )
    ? String(numberValue)
    : numberValue.toFixed(2);
}

function TeacherResultsContent() {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const quizIdParam =
    searchParams.get("quizId");

  const [quiz, setQuiz] =
    useState<Quiz | null>(null);

  const [results, setResults] =
    useState<ResultRow[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  useEffect(() => {
    async function loadResults() {
      const quizId =
        Number(quizIdParam);

      if (
        !Number.isFinite(quizId) ||
        quizId <= 0
      ) {
        setError(
          "Quiz ID is missing."
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const { data: quizData, error: quizError } =
          await supabase
            .from("quiz_tests")
            .select("*")
            .eq("id", quizId)
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

        setQuiz(
          quizData as Quiz
        );

        const { data: resultData, error: resultError } =
          await supabase
            .from("quiz_results")
            .select("*")
            .eq("quiz_id", quizId)
            .order("submitted_at", {
              ascending: false,
            });

        if (resultError) {
          throw new Error(
            resultError.message
          );
        }

        const rawResults =
          (resultData ||
            []) as QuizResult[];

        if (rawResults.length === 0) {
          setResults([]);
          return;
        }

        const studentIds =
          Array.from(
            new Set(
              rawResults.map(
                (item) =>
                  Number(
                    item.student_id
                  )
              )
            )
          ).filter(
            (id) =>
              Number.isFinite(id) &&
              id > 0
          );

        let students: Student[] =
          [];

        if (
          studentIds.length > 0
        ) {
          const {
            data: studentData,
            error: studentError,
          } = await supabase
            .from("students")
            .select(
              "id,student_name,student_username,class_name"
            )
            .in(
              "id",
              studentIds
            );

          if (studentError) {
            console.error(
              "Student loading error:",
              studentError
            );
          } else {
            students =
              (studentData ||
                []) as Student[];
          }
        }

        const studentMap =
          new Map<
            number,
            Student
          >();

        students.forEach(
          (student) => {
            studentMap.set(
              Number(student.id),
              student
            );
          }
        );

        const rows: ResultRow[] =
          rawResults.map(
            (result) => ({
              ...result,
              student:
                studentMap.get(
                  Number(
                    result.student_id
                  )
                ) || null,
            })
          );

        setResults(rows);
      } catch (loadError) {
        console.error(
          "Teacher results error:",
          loadError
        );

        setResults([]);

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load quiz results."
        );
      } finally {
        setLoading(false);
      }
    }

    loadResults();
  }, [quizIdParam]);

  const filteredResults =
    results.filter((row) => {
      const query =
        search.trim().toLowerCase();

      if (!query) return true;

      const name =
        row.student?.student_name ||
        "";

      const username =
        row.student?.student_username ||
        "";

      const className =
        row.student?.class_name ||
        "";

      return (
        name.toLowerCase().includes(query) ||
        username.toLowerCase().includes(query) ||
        className.toLowerCase().includes(query)
      );
    });

  const totalStudents =
    results.length;

  const passed =
    results.filter(
      (row) =>
        String(
          row.result_status
        ).toUpperCase() ===
        "PASS"
    ).length;

  const failed =
    results.filter(
      (row) =>
        String(
          row.result_status
        ).toUpperCase() ===
        "FAIL"
    ).length;

  const averagePercentage =
    results.length > 0
      ? results.reduce(
          (sum, row) =>
            sum +
            Number(
              row.percentage || 0
            ),
          0
        ) / results.length
      : 0;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-4 border-white/10 border-t-indigo-500" />

          <p className="font-bold">
            Loading Results...
          </p>
        </div>
      </main>
    );
  }

  if (error || !quiz) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-2xl rounded-3xl border border-red-400/20 bg-red-500/10 p-8 text-center">
          <h1 className="text-2xl font-black">
            Results Not Available
          </h1>

          <p className="mt-3 text-sm text-red-200">
            {error ||
              "Unable to load quiz results."}
          </p>

          <button
            onClick={() =>
              router.push(
                "/teacher/quiz-tests/manage"
              )
            }
            className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-black"
          >
            ← Back to Manage
          </button>
        </div>
      </main>
    );
  }

  const quizClasses =
    getQuizClasses(quiz);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        <header className="border-b border-white/10 bg-slate-950/90">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
            <div>
              <h1 className="text-xl font-black">
                QUIZ RESULTS
              </h1>

              <p className="text-xs text-slate-400">
                RACER ACADEMY • Teacher Panel
              </p>
            </div>

            <button
              onClick={() =>
                router.push(
                  "/teacher/quiz-tests/manage"
                )
              }
              className="rounded-xl bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10"
            >
              ← Manage
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-8">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-black">
                  {quiz.title}
                </h2>

                {quiz.description && (
                  <p className="mt-2 max-w-3xl text-sm text-slate-400">
                    {quiz.description}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {quizClasses.map(
                    (className) => (
                      <span
                        key={className}
                        className="rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-black text-indigo-300"
                      >
                        CLASS {className}
                      </span>
                    )
                  )}

                  {quiz.subject && (
                    <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-black text-blue-300">
                      {quiz.subject}
                    </span>
                  )}

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      quiz.is_published
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {quiz.is_published
                      ? "PUBLIC"
                      : "DRAFT"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-white/5 p-4 text-center">
                  <div className="text-2xl font-black">
                    {totalStudents}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500">
                    ATTEMPTS
                  </div>
                </div>

                <div className="rounded-2xl bg-emerald-500/10 p-4 text-center">
                  <div className="text-2xl font-black text-emerald-300">
                    {passed}
                  </div>
                  <div className="text-[10px] font-bold text-emerald-200/60">
                    PASS
                  </div>
                </div>

                <div className="rounded-2xl bg-red-500/10 p-4 text-center">
                  <div className="text-2xl font-black text-red-300">
                    {failed}
                  </div>
                  <div className="text-[10px] font-bold text-red-200/60">
                    FAIL
                  </div>
                </div>

                <div className="rounded-2xl bg-indigo-500/10 p-4 text-center">
                  <div className="text-2xl font-black text-indigo-300">
                    {formatNumber(
                      averagePercentage
                    )}
                    %
                  </div>
                  <div className="text-[10px] font-bold text-indigo-200/60">
                    AVERAGE
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-black">
                  Student Results
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  All submitted attempts for this quiz.
                </p>
              </div>

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search student..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-indigo-400 sm:max-w-xs"
              />
            </div>

            {filteredResults.length ===
            0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
                <h4 className="font-black">
                  No results found
                </h4>

                <p className="mt-2 text-sm text-slate-400">
                  {results.length ===
                  0
                    ? "No student has submitted this quiz yet."
                    : "No result matches your search."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredResults.map(
                  (row, index) => {
                    const isPass =
                      String(
                        row.result_status
                      ).toUpperCase() ===
                      "PASS";

                    const studentClass =
                      normalizeClass(
                        row.student
                          ?.class_name
                      );

                    return (
                      <div
                        key={
                          row.id
                        }
                        className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl"
                      >
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex min-w-0 items-start gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 font-black text-indigo-300">
                              {index +
                                1}
                            </div>

                            <div className="min-w-0">
                              <h4 className="truncate text-lg font-black">
                                {row
                                  .student
                                  ?.student_name ||
                                  `Student #${row.student_id}`}
                              </h4>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {row
                                  .student
                                  ?.student_username && (
                                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">
                                    {row
                                      .student
                                      .student_username}
                                  </span>
                                )}

                                {studentClass && (
                                  <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-300">
                                    CLASS{" "}
                                    {
                                      studentClass
                                    }
                                  </span>
                                )}
                              </div>

                              <p className="mt-2 text-xs text-slate-500">
                                Submitted:{" "}
                                {formatDateTime(
                                  row.submitted_at
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
                            <div className="rounded-2xl bg-white/5 p-4 text-center">
                              <div className="text-xl font-black">
                                {
                                  row.total_questions
                                }
                              </div>
                              <div className="text-[10px] font-bold text-slate-500">
                                QUESTIONS
                              </div>
                            </div>

                            <div className="rounded-2xl bg-emerald-500/10 p-4 text-center">
                              <div className="text-xl font-black text-emerald-300">
                                {
                                  row.correct_answers
                                }
                              </div>
                              <div className="text-[10px] font-bold text-emerald-200/60">
                                CORRECT
                              </div>
                            </div>

                            <div className="rounded-2xl bg-red-500/10 p-4 text-center">
                              <div className="text-xl font-black text-red-300">
                                {
                                  row.wrong_answers
                                }
                              </div>
                              <div className="text-[10px] font-bold text-red-200/60">
                                WRONG
                              </div>
                            </div>

                            <div className="rounded-2xl bg-indigo-500/10 p-4 text-center">
                              <div className="text-xl font-black text-indigo-300">
                                {formatNumber(
                                  row.percentage
                                )}
                                %
                              </div>
                              <div className="text-[10px] font-bold text-indigo-200/60">
                                SCORE
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                            <span>
                              Marks:{" "}
                              <strong className="text-white">
                                {
                                  row.obtained_marks
                                }
                              </strong>
                                {" / "}
                              {
                                row.total_marks
                              }
                            </span>

                            <span>
                              Unanswered:{" "}
                              {
                                row.unanswered
                              }
                            </span>

                            <span>
                              Submission:{" "}
                              {row.submission_type ||
                                "manual"}
                            </span>
                          </div>

                          <span
                            className={`rounded-full px-5 py-2 text-xs font-black ${
                              isPass
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-red-500/15 text-red-300"
                            }`}
                          >
                            {isPass
                              ? "PASS"
                              : "FAIL"}
                          </span>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </section>

          <div className="py-8 text-center text-xs text-slate-500">
            RACER ACADEMY • Teacher Quiz Results
          </div>
        </div>
      </div>
    </main>
  );
}

export default function TeacherQuizResultsPage() {
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
      <TeacherResultsContent />
    </Suspense>
  );
}