"use client";

import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type Quiz = {
  id: number;
  title: string;
  description: string | null;
  class_name: string | null;
  target_classes: string[] | null;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  marks_per_question: number;
  negative_marks: number;
  pass_percentage: number;
  is_published: boolean;
};

function normalizeClass(
  value: unknown
) {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .trim()
    .toUpperCase()
    .replace(
      /^CLASS\s+/i,
      ""
    )
    .replace(
      /\s+/g,
      " "
    );
}

function quizBelongsToStudent(
  quiz: Quiz,
  studentClass: string
) {
  const normalizedStudentClass =
    normalizeClass(
      studentClass
    );

  if (
    !normalizedStudentClass
  ) {
    return false;
  }

  const targetClasses =
    Array.isArray(
      quiz.target_classes
    )
      ? quiz.target_classes
          .filter(
            (
              value
            ): value is string =>
              typeof value ===
              "string"
          )
          .map(
            normalizeClass
          )
          .filter(Boolean)
      : [];

  if (
    targetClasses.length > 0
  ) {
    return targetClasses.includes(
      normalizedStudentClass
    );
  }

  return (
    normalizeClass(
      quiz.class_name
    ) ===
    normalizedStudentClass
  );
}

function getStartTime(
  quiz: Quiz
) {
  return new Date(
    `${quiz.scheduled_date}T${quiz.scheduled_time.slice(
      0,
      8
    )}`
  );
}

function getQuizStatus(
  quiz: Quiz
) {
  const start =
    getStartTime(quiz);

  const end = new Date(
    start.getTime() +
      Number(
        quiz.duration_minutes
      ) *
        60 *
        1000
  );

  const now = new Date();

  if (now < start) {
    return "UPCOMING";
  }

  if (now >= end) {
    return "ENDED";
  }

  return "LIVE";
}

function formatDate(
  value: string
) {
  const date = new Date(
    `${value}T00:00:00`
  );

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatTime(
  value: string
) {
  const [hour, minute] =
    value.split(":");

  const date = new Date();

  date.setHours(
    Number(hour),
    Number(minute),
    0,
    0
  );

  return date.toLocaleTimeString(
    "en-IN",
    {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }
  );
}

export default function StudentAvailableQuizzesPage() {
  const router =
    useRouter();

  const [quizzes, setQuizzes] =
    useState<Quiz[]>([]);

  const [
    attemptedQuizIds,
    setAttemptedQuizIds,
  ] = useState<
    Set<number>
  >(new Set());

  const [
    studentClass,
    setStudentClass,
  ] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function load() {
      try {
        let studentId: number | null =
          null;

        const storedIdKeys = [
          "attendance_student_id",
          "studentId",
          "student_id",
        ];

        for (const key of storedIdKeys) {
          const raw =
            localStorage.getItem(
              key
            );

          const id = Number(raw);

          if (
            Number.isInteger(id) &&
            id > 0
          ) {
            studentId = id;
            break;
          }
        }

        const username =
          localStorage.getItem(
            "student_username"
          );

        let student:
          | {
              id: number;
              class_name: string | null;
            }
          | null = null;

        if (username) {
          const {
            data,
            error:
              usernameError,
          } = await supabase
            .from("students")
            .select(
              "id,class_name"
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
            student = data;
            studentId = Number(
              data.id
            );
          }
        }

        if (
          !student &&
          studentId
        ) {
          const {
            data,
            error:
              studentError,
          } = await supabase
            .from("students")
            .select(
              "id,class_name"
            )
            .eq(
              "id",
              studentId
            )
            .maybeSingle();

          if (studentError) {
            throw new Error(
              studentError.message
            );
          }

          student = data;
        }

        if (!student) {
          throw new Error(
            "Student login information not found."
          );
        }

        setStudentClass(
          student.class_name || ""
        );

        const {
          data: quizData,
          error: quizError,
        } = await supabase
          .from("quiz_tests")
          .select("*")
          .eq(
            "is_published",
            true
          )
          .order(
            "scheduled_date",
            {
              ascending: true,
            }
          )
          .order(
            "scheduled_time",
            {
              ascending: true,
            }
          );

        if (quizError) {
          throw new Error(
            quizError.message
          );
        }

        const matchingQuizzes =
          (
            (quizData ||
              []) as Quiz[]
          ).filter(
            (quiz) =>
              quizBelongsToStudent(
                quiz,
                student.class_name ||
                  ""
              )
          );

        setQuizzes(
          matchingQuizzes
        );

        if (studentId) {
          const {
            data: results,
            error:
              resultsError,
          } = await supabase
            .from("quiz_results")
            .select(
              "quiz_id"
            )
            .eq(
              "student_id",
              studentId
            );

          if (resultsError) {
            throw new Error(
              resultsError.message
            );
          }

          setAttemptedQuizIds(
            new Set(
              (
                results ||
                []
              ).map(
                (row) =>
                  Number(
                    row.quiz_id
                  )
              )
            )
          );
        }
      } catch (loadError) {
        console.error(
          loadError
        );

        setError(
          loadError instanceof
            Error
            ? loadError.message
            : "Unable to load quizzes."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-indigo-500" />
          <p className="font-black">
            Loading Quizzes...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-lg rounded-3xl border border-red-400/20 bg-red-500/10 p-8 text-center">
          <h1 className="text-2xl font-black">
            Unable to Load Quizzes
          </h1>

          <p className="mt-3 text-sm text-red-200">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/student/quiz-tests"
              )
            }
            className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-black"
          >
            Back
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        <header className="border-b border-white/10 bg-slate-950/90">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
            <div>
              <h1 className="text-xl font-black">
                AVAILABLE QUIZZES
              </h1>

              <p className="text-xs text-slate-400">
                RACER ACADEMY
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/student/quiz-tests"
                )
              }
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black"
            >
              Back
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-7">
          <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-bold text-slate-500">
              YOUR CLASS
            </p>

            <p className="mt-1 text-xl font-black text-indigo-300">
              CLASS{" "}
              {normalizeClass(
                studentClass
              )}
            </p>
          </div>

          {quizzes.length ===
          0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
              <h2 className="text-xl font-black">
                No Quizzes Available
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                There are currently no published quizzes for your class.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {quizzes.map(
                (quiz) => {
                  const attempted =
                    attemptedQuizIds.has(
                      quiz.id
                    );

                  const status =
                    getQuizStatus(
                      quiz
                    );

                  return (
                    <article
                      key={
                        quiz.id
                      }
                      className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-black">
                            {
                              quiz.title
                            }
                          </h2>

                          {quiz.description && (
                            <p className="mt-2 text-sm leading-relaxed text-slate-400">
                              {
                                quiz.description
                              }
                            </p>
                          )}
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black ${
                            attempted
                              ? "bg-emerald-500/15 text-emerald-300"
                              : status ===
                                "LIVE"
                              ? "bg-indigo-500/15 text-indigo-300"
                              : status ===
                                "UPCOMING"
                              ? "bg-amber-500/15 text-amber-300"
                              : "bg-red-500/15 text-red-300"
                          }`}
                        >
                          {attempted
                            ? "COMPLETED"
                            : status}
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-2xl bg-white/5 p-3">
                          <p className="text-slate-500">
                            DATE
                          </p>
                          <p className="mt-1 font-black">
                            {formatDate(
                              quiz.scheduled_date
                            )}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white/5 p-3">
                          <p className="text-slate-500">
                            TIME
                          </p>
                          <p className="mt-1 font-black">
                            {formatTime(
                              quiz.scheduled_time
                            )}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white/5 p-3">
                          <p className="text-slate-500">
                            DURATION
                          </p>
                          <p className="mt-1 font-black">
                            {
                              quiz.duration_minutes
                            }{" "}
                            min
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white/5 p-3">
                          <p className="text-slate-500">
                            PASS
                          </p>
                          <p className="mt-1 font-black">
                            {
                              quiz.pass_percentage
                            }
                            %
                          </p>
                        </div>
                      </div>

                      <div className="mt-5">
                        {attempted ? (
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/student/quiz-tests/results?quizId=${quiz.id}`
                              )
                            }
                            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black"
                          >
                            View Result
                          </button>
                        ) : status ===
                          "LIVE" ? (
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/student/quiz-tests/attempt?quizId=${quiz.id}`
                              )
                            }
                            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black"
                          >
                            Start Quiz
                          </button>
                        ) : status ===
                          "UPCOMING" ? (
                          <div className="rounded-xl bg-amber-500/10 px-4 py-3 text-center text-xs font-bold text-amber-300">
                            Quiz is not live yet.
                          </div>
                        ) : (
                          <div className="rounded-xl bg-red-500/10 px-4 py-3 text-center text-xs font-bold text-red-300">
                            Quiz time has ended.
                          </div>
                        )}
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}