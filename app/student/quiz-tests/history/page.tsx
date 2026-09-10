"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type Quiz = {
  id: string;
  title: string;
  subject: string | null;
  class_name: string | null;
  target_classes: string[] | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  duration_minutes: number | null;
  marks_per_question: number | null;
  negative_marks: number | null;
  pass_percentage: number | null;
};

type QuizResult = {
  id: string;
  quiz_id: string;
  student_id: string;
  total_questions: number | null;
  correct_answers: number | null;
  wrong_answers: number | null;
  unanswered: number | null;
  total_marks: number | null;
  obtained_marks: number | null;
  percentage: number | null;
  result_status: string | null;
  started_at: string | null;
  submitted_at: string | null;
  submission_type: string | null;
  created_at: string | null;
};

type HistoryItem = {
  result: QuizResult;
  quiz: Quiz;
};

function normalizeClass(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .toUpperCase()
    .replace(/^CLASS\s+/i, "")
    .replace(/\s+/g, " ");
}

function quizBelongsToStudent(
  quiz: Quiz,
  studentClass: string
): boolean {
  const normalizedStudentClass =
    normalizeClass(studentClass);

  if (!normalizedStudentClass) {
    return false;
  }

  const targetClasses = Array.isArray(
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

  if (targetClasses.length > 0) {
    return targetClasses.includes(
      normalizedStudentClass
    );
  }

  return (
    normalizeClass(quiz.class_name) ===
    normalizedStudentClass
  );
}

function numberText(
  value: number | null | undefined
): string {
  if (
    typeof value !== "number" ||
    Number.isNaN(value)
  ) {
    return "0";
  }

  return Number.isInteger(value)
    ? String(value)
    : value
        .toFixed(2)
        .replace(/\.00$/, "");
}

function dateText(
  value: string | null | undefined
): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function timeText(
  value: string | null | undefined
): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dateTimeText(
  value: string | null | undefined
): string {
  const date = dateText(value);
  const time = timeText(value);

  if (date === "Not available") {
    return date;
  }

  return time ? `${date} at ${time}` : date;
}

function scheduledDateText(
  dateValue: string | null,
  timeValue: string | null
): string {
  if (!dateValue) {
    return "Not scheduled";
  }

  const date = new Date(
    `${dateValue}T${
      timeValue || "00:00:00"
    }+05:30`
  );

  if (Number.isNaN(date.getTime())) {
    return dateText(dateValue);
  }

  const formattedDate =
    date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  if (!timeValue) {
    return formattedDate;
  }

  const formattedTime =
    date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return `${formattedDate} at ${formattedTime}`;
}

function getResultStatus(
  result: QuizResult
): "PASS" | "FAIL" {
  const status =
    typeof result.result_status === "string"
      ? result.result_status
          .trim()
          .toUpperCase()
      : "";

  if (
    status === "PASS" ||
    status === "PASSED"
  ) {
    return "PASS";
  }

  if (
    status === "FAIL" ||
    status === "FAILED"
  ) {
    return "FAIL";
  }

  const percentage =
    typeof result.percentage === "number"
      ? result.percentage
      : 0;

  return percentage >= 40 ? "PASS" : "FAIL";
}

function getStudentIdentity(): {
  studentId: string;
  username: string;
} {
  if (typeof window === "undefined") {
    return {
      studentId: "",
      username: "",
    };
  }

  const studentId =
    sessionStorage.getItem(
      "attendance_student_id"
    ) ||
    sessionStorage.getItem("studentId") ||
    sessionStorage.getItem("student_id") ||
    localStorage.getItem(
      "attendance_student_id"
    ) ||
    localStorage.getItem("studentId") ||
    localStorage.getItem("student_id") ||
    "";

  const username =
    sessionStorage.getItem(
      "student_username"
    ) ||
    sessionStorage.getItem(
      "studentUsername"
    ) ||
    localStorage.getItem(
      "student_username"
    ) ||
    localStorage.getItem(
      "studentUsername"
    ) ||
    "";

  return {
    studentId,
    username,
  };
}

export default function StudentQuizHistoryPage() {
  const router = useRouter();

  const [history, setHistory] =
    useState<HistoryItem[]>([]);

  const [studentClass, setStudentClass] =
    useState("");

  const [studentName, setStudentName] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [refreshing, setRefreshing] =
    useState(false);

  const loadHistory = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const {
          studentId: storedStudentId,
          username,
        } = getStudentIdentity();

        let studentId = storedStudentId;

        let studentRecord:
          | {
              id: string;
              student_username: string | null;
              student_name: string | null;
              class_name: string | null;
            }
          | null = null;

        if (studentId) {
          const { data, error: studentError } =
            await supabase
              .from("students")
              .select(
                "id, student_username, student_name, class_name"
              )
              .eq("id", studentId)
              .maybeSingle();

          if (studentError) {
            console.error(
              "Student lookup by ID error:",
              studentError
            );
          } else if (data) {
            studentRecord = data;
          }
        }

        if (!studentRecord && username) {
          const { data, error: usernameError } =
            await supabase
              .from("students")
              .select(
                "id, student_username, student_name, class_name"
              )
              .eq(
                "student_username",
                username
              )
              .maybeSingle();

          if (usernameError) {
            console.error(
              "Student lookup by username error:",
              usernameError
            );
          } else if (data) {
            studentRecord = data;
          }
        }

        if (!studentRecord) {
          const fallbackUsername =
            username ||
            sessionStorage.getItem(
              "attendance_username"
            ) ||
            localStorage.getItem(
              "attendance_username"
            ) ||
            "";

          if (fallbackUsername) {
            const {
              data,
              error: fallbackError,
            } = await supabase
              .from("students")
              .select(
                "id, student_username, student_name, class_name"
              )
              .eq(
                "student_username",
                fallbackUsername
              )
              .maybeSingle();

            if (fallbackError) {
              console.error(
                "Fallback student lookup error:",
                fallbackError
              );
            } else if (data) {
              studentRecord = data;
            }
          }
        }

        if (!studentRecord) {
          throw new Error(
            "Student login information not found. Please log in again."
          );
        }

        studentId = String(
          studentRecord.id
        );

        const resolvedClass =
          studentRecord.class_name || "";

        setStudentClass(resolvedClass);

        setStudentName(
          studentRecord.student_name || ""
        );

        sessionStorage.setItem(
          "attendance_student_id",
          studentId
        );

        localStorage.setItem(
          "attendance_student_id",
          studentId
        );

        if (
          studentRecord.student_username
        ) {
          sessionStorage.setItem(
            "student_username",
            studentRecord.student_username
          );

          localStorage.setItem(
            "student_username",
            studentRecord.student_username
          );
        }

        const {
          data: resultRows,
          error: resultError,
        } = await supabase
          .from("quiz_results")
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
          .eq("student_id", studentId)
          .not("submitted_at", "is", null)
          .order("submitted_at", {
            ascending: false,
            nullsFirst: false,
          });

        if (resultError) {
          throw new Error(
            resultError.message ||
              "Unable to load quiz results."
          );
        }

        const results =
          (resultRows || []) as QuizResult[];

        if (results.length === 0) {
          setHistory([]);
          return;
        }

        const quizIds = Array.from(
          new Set(
            results
              .map((result) =>
                String(result.quiz_id)
              )
              .filter(Boolean)
          )
        );

        if (quizIds.length === 0) {
          setHistory([]);
          return;
        }

        /*
         * IMPORTANT:
         * quiz_tests uses marks_per_question
         * and pass_percentage.
         * Do NOT request total_marks or
         * passing_percentage here.
         */
        const {
          data: quizRows,
          error: quizError,
        } = await supabase
          .from("quiz_tests")
          .select(
            `
              id,
              title,
              subject,
              class_name,
              target_classes,
              scheduled_date,
              scheduled_time,
              duration_minutes,
              marks_per_question,
              negative_marks,
              pass_percentage
            `
          )
          .in("id", quizIds);

        if (quizError) {
          throw new Error(
            quizError.message ||
              "Unable to load quiz information."
          );
        }

        const quizzes =
          (quizRows || []) as Quiz[];

        const quizMap = new Map<
          string,
          Quiz
        >();

        for (const quiz of quizzes) {
          quizMap.set(
            String(quiz.id),
            quiz
          );
        }

        const items: HistoryItem[] = [];

        for (const result of results) {
          const quiz = quizMap.get(
            String(result.quiz_id)
          );

          if (!quiz) {
            continue;
          }

          if (
            resolvedClass &&
            !quizBelongsToStudent(
              quiz,
              resolvedClass
            )
          ) {
            continue;
          }

          items.push({
            result,
            quiz,
          });
        }

        items.sort((a, b) => {
          const aDate = new Date(
            a.result.submitted_at ||
              a.result.created_at ||
              a.result.started_at ||
              0
          ).getTime();

          const bDate = new Date(
            b.result.submitted_at ||
              b.result.created_at ||
              b.result.started_at ||
              0
          ).getTime();

          return bDate - aDate;
        });

        setHistory(items);
      } catch (err) {
        console.error(
          "Quiz history loading error:",
          err
        );

        setHistory([]);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load quiz history."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    document.title = "Quiz History";
    void loadHistory();
  }, [loadHistory]);

  const statistics = useMemo(() => {
    const total = history.length;

    const passed = history.filter(
      ({ result }) =>
        getResultStatus(result) === "PASS"
    ).length;

    const failed = total - passed;

    const average =
      total > 0
        ? history.reduce(
            (sum, { result }) =>
              sum +
              (typeof result.percentage ===
              "number"
                ? result.percentage
                : 0),
            0
          ) / total
        : 0;

    return {
      total,
      passed,
      failed,
      average,
    };
  }, [history]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-indigo-500" />

            <h1 className="text-xl font-black">
              Loading Quiz History...
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Please wait while your completed
              quizzes are loaded.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-3 py-5 text-white sm:px-5 sm:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-5 shadow-2xl sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/student/quiz-tests"
                  )
                }
                className="mb-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                Back to Quiz Tests
              </button>

              <h1 className="text-2xl font-black tracking-tight sm:text-4xl">
                Quiz History
              </h1>

              <p className="mt-2 text-sm text-slate-400 sm:text-base">
                {studentName
                  ? `${studentName}'s completed quiz history`
                  : "Your completed quiz history"}
              </p>

              {studentClass && (
                <div className="mt-3 inline-flex rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-bold text-indigo-300">
                  Class {studentClass}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/student/quiz-tests/results"
                  )
                }
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white transition hover:bg-white/10"
              >
                View Results
              </button>

              <button
                type="button"
                disabled={refreshing}
                onClick={() =>
                  void loadHistory(true)
                }
                className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing
                  ? "Refreshing..."
                  : "Refresh"}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-red-200">
            <div className="font-black">
              Unable to load quiz history
            </div>

            <p className="mt-1 text-sm text-red-300">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadHistory(true)
              }
              className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-500"
            >
              Try Again
            </button>
          </div>
        )}

        {history.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Completed
              </p>

              <p className="mt-2 text-2xl font-black text-white">
                {statistics.total}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-300">
                Passed
              </p>

              <p className="mt-2 text-2xl font-black text-emerald-300">
                {statistics.passed}
              </p>
            </div>

            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-red-300">
                Failed
              </p>

              <p className="mt-2 text-2xl font-black text-red-300">
                {statistics.failed}
              </p>
            </div>

            <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-300">
                Average
              </p>

              <p className="mt-2 text-2xl font-black text-indigo-300">
                {numberText(
                  statistics.average
                )}
                %
              </p>
            </div>
          </div>
        )}

        {history.length === 0 && !error && (
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-8 text-center shadow-xl sm:p-14">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/10 text-3xl">
              Q
            </div>

            <h2 className="text-2xl font-black text-white">
              No Quiz History Yet
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
              Your completed quizzes will appear
              here automatically after you submit
              a quiz.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/student/quiz-tests/available"
                )
              }
              className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-500"
            >
              View Available Quizzes
            </button>
          </div>
        )}

        {history.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-xl font-black text-white">
                  Completed Quizzes
                </h2>

                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  Newest submissions are shown first.
                </p>
              </div>

              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300">
                {history.length}{" "}
                {history.length === 1
                  ? "Quiz"
                  : "Quizzes"}
              </div>
            </div>

            {history.map(
              ({ result, quiz }, index) => {
                const status =
                  getResultStatus(result);

                const percentage =
                  typeof result.percentage ===
                  "number"
                    ? result.percentage
                    : 0;

                const totalMarks =
                  typeof result.total_marks ===
                  "number"
                    ? result.total_marks
                    : (typeof quiz.marks_per_question ===
                        "number"
                        ? quiz.marks_per_question *
                          (result.total_questions || 0)
                        : 0);

                const obtainedMarks =
                  typeof result.obtained_marks ===
                  "number"
                    ? result.obtained_marks
                    : 0;

                return (
                  <article
                    key={`${result.id}-${quiz.id}-${index}`}
                    className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-xl transition hover:border-indigo-400/30"
                  >
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                status === "PASS"
                                  ? "bg-emerald-500/15 text-emerald-300"
                                  : "bg-red-500/15 text-red-300"
                              }`}
                            >
                              {status}
                            </span>

                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-400">
                              Completed
                            </span>

                            {quiz.subject && (
                              <span className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-300">
                                {quiz.subject}
                              </span>
                            )}
                          </div>

                          <h3 className="break-words text-xl font-black text-white sm:text-2xl">
                            {quiz.title ||
                              "Untitled Quiz"}
                          </h3>

                          <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                            <div className="rounded-xl bg-white/[0.03] p-3">
                              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                Quiz Date
                              </p>

                              <p className="mt-1 font-bold text-slate-200">
                                {scheduledDateText(
                                  quiz.scheduled_date,
                                  quiz.scheduled_time
                                )}
                              </p>
                            </div>

                            <div className="rounded-xl bg-white/[0.03] p-3">
                              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                Submitted
                              </p>

                              <p className="mt-1 font-bold text-slate-200">
                                {dateTimeText(
                                  result.submitted_at ||
                                    result.created_at
                                )}
                              </p>
                            </div>

                            <div className="rounded-xl bg-white/[0.03] p-3">
                              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                Duration
                              </p>

                              <p className="mt-1 font-bold text-slate-200">
                                {quiz.duration_minutes
                                  ? `${quiz.duration_minutes} min`
                                  : "Not specified"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-5 xl:min-w-[190px] xl:justify-center">
                          <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border-4 border-indigo-500/30 bg-indigo-500/10">
                            <span className="text-2xl font-black text-white">
                              {numberText(
                                percentage
                              )}
                              %
                            </span>

                            <span className="text-[10px] font-bold uppercase text-slate-500">
                              Score
                            </span>
                          </div>

                          <div className="xl:hidden">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                              Marks
                            </p>

                            <p className="mt-1 text-lg font-black text-white">
                              {numberText(
                                obtainedMarks
                              )}{" "}
                              /{" "}
                              {numberText(
                                totalMarks
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                            Marks
                          </p>

                          <p className="mt-1 text-lg font-black text-white">
                            {numberText(
                              obtainedMarks
                            )}{" "}
                            /{" "}
                            {numberText(
                              totalMarks
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl border border-emerald-400/10 bg-emerald-500/5 p-3">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-400">
                            Correct
                          </p>

                          <p className="mt-1 text-lg font-black text-emerald-300">
                            {numberText(
                              result.correct_answers
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl border border-red-400/10 bg-red-500/5 p-3">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-red-400">
                            Wrong
                          </p>

                          <p className="mt-1 text-lg font-black text-red-300">
                            {numberText(
                              result.wrong_answers
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl border border-amber-400/10 bg-amber-500/5 p-3">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-400">
                            Skipped
                          </p>

                          <p className="mt-1 text-lg font-black text-amber-300">
                            {numberText(
                              result.unanswered
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs text-slate-500">
                          Submitted{" "}
                          {dateTimeText(
                            result.submitted_at ||
                              result.created_at
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/student/quiz-tests/results?quizId=${encodeURIComponent(
                                quiz.id
                              )}`
                            )
                          }
                          className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-500 sm:w-auto"
                        >
                          View Full Result
                        </button>
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </div>
    </main>
  );
}