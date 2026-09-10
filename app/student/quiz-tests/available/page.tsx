"use client";

import { useEffect, useState } from "react";
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
};

type Result = {
  quiz_id: number;
};

function normalizeClass(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase();
}

function quizMatchesStudentClass(
  quiz: Quiz,
  studentClass: string
) {
  const studentClassNormalized =
    normalizeClass(studentClass);

  if (!studentClassNormalized) return false;

  const targets = Array.isArray(quiz.target_classes)
    ? quiz.target_classes
        .map(normalizeClass)
        .filter(Boolean)
    : [];

  if (targets.length > 0) {
    return targets.includes(studentClassNormalized);
  }

  const legacyClass = normalizeClass(quiz.class_name);

  return legacyClass === studentClassNormalized;
}

export default function AvailableQuizzesPage() {
  const router = useRouter();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempted, setAttempted] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [studentClass, setStudentClass] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const id =
      localStorage.getItem("attendance_student_id") ||
      localStorage.getItem("studentId") ||
      localStorage.getItem("student_id");

    if (!id) {
      setLoading(false);
      return;
    }

    const numericId = Number(id);

    if (!Number.isFinite(numericId) || numericId <= 0) {
      setLoading(false);
      return;
    }

    setStudentId(numericId);
    loadQuizzes(numericId);
  }, []);

  async function loadQuizzes(id: number) {
    setLoading(true);
    setError("");

    try {
      const { data: studentData, error: studentError } =
        await supabase
          .from("students")
          .select("class_name")
          .eq("id", id)
          .maybeSingle();

      if (studentError) {
        throw new Error(studentError.message);
      }

      const currentClass =
        normalizeClass(studentData?.class_name);

      if (!currentClass) {
        setStudentClass("");
        setQuizzes([]);
        setAttempted([]);
        setError(
          "Your class is not assigned in your student profile."
        );
        return;
      }

      setStudentClass(currentClass);

      const { data: quizData, error: quizError } =
        await supabase
          .from("quiz_tests")
          .select(
            "id,title,description,class_name,target_classes,scheduled_date,scheduled_time,duration_minutes"
          )
          .eq("is_published", true)
          .order("scheduled_date", {
            ascending: true,
          })
          .order("scheduled_time", {
            ascending: true,
          });

      if (quizError) {
        throw new Error(quizError.message);
      }

      const classQuizzes = ((quizData || []) as Quiz[]).filter(
        (quiz) =>
          quizMatchesStudentClass(
            quiz,
            currentClass
          )
      );

      const { data: resultData, error: resultError } =
        await supabase
          .from("quiz_results")
          .select("quiz_id")
          .eq("student_id", id);

      if (resultError) {
        console.error(
          "Attempt loading error:",
          resultError
        );
      }

      setQuizzes(classQuizzes);

      setAttempted(
        ((resultData || []) as Result[]).map(
          (item) => Number(item.quiz_id)
        )
      );
    } catch (loadError) {
      console.error("Quiz loading error:", loadError);

      setQuizzes([]);
      setAttempted([]);

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load quizzes."
      );
    } finally {
      setLoading(false);
    }
  }

  function getStartTime(quiz: Quiz) {
    return new Date(
      `${quiz.scheduled_date}T${quiz.scheduled_time}`
    );
  }

  function getEndTime(quiz: Quiz) {
    return new Date(
      getStartTime(quiz).getTime() +
        (quiz.duration_minutes || 30) *
          60 *
          1000
    );
  }

  function getStatus(quiz: Quiz) {
    const now = new Date();
    const start = getStartTime(quiz);
    const end = getEndTime(quiz);

    if (now < start) return "UPCOMING";
    if (now >= start && now <= end) return "LIVE";

    return "ENDED";
  }

  function formatDate(date: string) {
    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatTime(time: string) {
    const [hourText, minute] = time.split(":");

    let hour = Number(hourText);

    if (!Number.isFinite(hour)) {
      return time;
    }

    const period = hour >= 12 ? "PM" : "AM";

    hour = hour % 12 || 12;

    return `${hour}:${minute || "00"} ${period}`;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        <header className="border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-2xl">
                QUIZ
              </div>

              <div>
                <h1 className="font-black">
                  AVAILABLE QUIZZES
                </h1>

                <p className="text-xs text-slate-400">
                  RACER ACADEMY
                  {studentClass
                    ? ` • CLASS ${studentClass}`
                    : ""}
                </p>
              </div>
            </div>

            <button
              onClick={() =>
                router.push(
                  "/student/quiz-tests"
                )
              }
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
            >
              ← Quiz Tests
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-8">
          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
              <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />

              <p className="text-sm text-slate-400">
                Loading available quizzes...
              </p>
            </div>
          ) : !studentId ? (
            <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-8 text-center">
              <div className="text-4xl">LOGIN</div>

              <h2 className="mt-3 font-black">
                Student login required
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Please login again to access quizzes.
              </p>
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-8 text-center">
              <h2 className="font-black">
                Unable to load quizzes
              </h2>

              <p className="mt-2 text-sm text-red-200">
                {error}
              </p>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
              <div className="text-5xl">QUIZ</div>

              <h2 className="mt-4 text-xl font-black">
                No quizzes found for your class
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                No published quiz is currently assigned to
                Class {studentClass}.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {quizzes.map((quiz) => {
                const status = getStatus(quiz);
                const hasAttempted =
                  attempted.includes(quiz.id);

                return (
                  <div
                    key={quiz.id}
                    className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-xl"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-black">
                          {quiz.title}
                        </h2>

                        {quiz.description && (
                          <p className="mt-2 text-sm leading-6 text-slate-400">
                            {quiz.description}
                          </p>
                        )}
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black ${
                          status === "LIVE"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : status === "UPCOMING"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-slate-500/20 text-slate-400"
                        }`}
                      >
                        {status}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-white/5 p-3">
                        <p className="text-[10px] font-bold text-slate-500">
                          CLASS
                        </p>

                        <p className="mt-1 text-sm font-bold">
                          {studentClass}
                        </p>
                      </div>

                      <div className="rounded-xl bg-white/5 p-3">
                        <p className="text-[10px] font-bold text-slate-500">
                          DATE
                        </p>

                        <p className="mt-1 text-sm font-bold">
                          {formatDate(
                            quiz.scheduled_date
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-white/5 p-3">
                        <p className="text-[10px] font-bold text-slate-500">
                          START TIME
                        </p>

                        <p className="mt-1 text-sm font-bold">
                          {formatTime(
                            quiz.scheduled_time
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-white/5 p-3">
                        <p className="text-[10px] font-bold text-slate-500">
                          DURATION
                        </p>

                        <p className="mt-1 text-sm font-bold">
                          {quiz.duration_minutes || 30} minutes
                        </p>
                      </div>

                      <div className="rounded-xl bg-white/5 p-3 col-span-2">
                        <p className="text-[10px] font-bold text-slate-500">
                          ATTEMPT
                        </p>

                        <p className="mt-1 text-sm font-bold">
                          {hasAttempted
                            ? "Completed"
                            : "Not Attempted"}
                        </p>
                      </div>
                    </div>

                    {hasAttempted ? (
                      <button
                        onClick={() =>
                          router.push(
                            `/student/quiz-tests/results?quizId=${quiz.id}`
                          )
                        }
                        className="mt-5 w-full rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-400 hover:bg-emerald-500/20"
                      >
                        VIEW RESULT
                      </button>
                    ) : status === "LIVE" ? (
                      <button
                        onClick={() =>
                          router.push(
                            `/student/quiz-tests/attempt?quizId=${quiz.id}`
                          )
                        }
                        className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-3 font-black shadow-lg shadow-indigo-900/30 transition hover:bg-indigo-500"
                      >
                        START QUIZ
                      </button>
                    ) : status === "UPCOMING" ? (
                      <div className="mt-5 rounded-xl bg-amber-500/10 px-4 py-3 text-center text-sm font-semibold text-amber-300">
                        Quiz will open at the scheduled time.
                      </div>
                    ) : (
                      <div className="mt-5 rounded-xl bg-slate-500/10 px-4 py-3 text-center text-sm font-semibold text-slate-400">
                        Quiz time has ended.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}