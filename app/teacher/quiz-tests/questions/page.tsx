"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Quiz = {
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
  created_at: string;
};

export default function TeacherQuizTestsPage() {
  const router = useRouter();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [teacherName, setTeacherName] = useState("Teacher");

  useEffect(() => {
    const storedName =
      localStorage.getItem("teacherName") ||
      localStorage.getItem("teacher_name") ||
      localStorage.getItem("teacherProfileUsername") ||
      localStorage.getItem("teacherUsername") ||
      localStorage.getItem("teacher_username");

    if (storedName) {
      setTeacherName(storedName);
    }

    void loadQuizzes();
  }, []);

  async function loadQuizzes() {
    setLoading(true);

    const { data, error } = await supabase
      .from("quiz_tests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Quiz loading error:", error);
      setQuizzes([]);
    } else {
      setQuizzes((data || []) as Quiz[]);
    }

    setLoading(false);
  }

  function formatDate(date: string) {
    if (!date) return "-";

    const d = new Date(`${date}T00:00:00+05:30`);

    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatTime(time: string) {
    if (!time) return "-";

    const [hourString, minuteString] = time.split(":");

    let hour = Number(hourString);
    const minute = minuteString || "00";

    const period = hour >= 12 ? "PM" : "AM";

    hour = hour % 12;

    if (hour === 0) {
      hour = 12;
    }

    return `${hour}:${minute} ${period}`;
  }

  function openQuestions(quizId: number) {
    if (!quizId || !Number.isInteger(Number(quizId))) {
      return;
    }

    router.push(
      `/teacher/quiz-tests/questions?quizId=${quizId}`
    );
  }

  function openResults(quizId: number) {
    if (!quizId || !Number.isInteger(Number(quizId))) {
      return;
    }

    router.push(
      `/teacher/quiz-tests/results?quizId=${quizId}`
    );
  }

  const totalQuizzes = quizzes.length;

  const publishedQuizzes = quizzes.filter(
    (quiz) => quiz.is_published
  ).length;

  const draftQuizzes = quizzes.filter(
    (quiz) => !quiz.is_published
  ).length;

  const today = new Date();

  const scheduledQuizzes = quizzes.filter((quiz) => {
    if (!quiz.is_published) {
      return false;
    }

    const cleanTime = String(
      quiz.scheduled_time || ""
    ).trim();

    const normalizedTime =
      cleanTime.length === 5
        ? `${cleanTime}:00`
        : cleanTime.slice(0, 8);

    const quizDateTime = new Date(
      `${quiz.scheduled_date}T${normalizedTime}+05:30`
    );

    return quizDateTime > today;
  }).length;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        {/* HEADER */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl shadow-lg shadow-indigo-500/20">
                  🧠
                </div>

                <div>
                  <h1 className="text-lg font-black tracking-wide sm:text-xl">
                    QUIZ TESTS
                  </h1>

                  <p className="text-xs text-slate-400">
                    RACER ACADEMY • Teacher Panel
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push("/teacher")}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              ← Dashboard
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* WELCOME */}
          <section className="mb-8 overflow-hidden rounded-3xl border border-indigo-400/20 bg-gradient-to-r from-indigo-600/20 via-purple-600/10 to-transparent p-6 shadow-2xl shadow-indigo-950/30">
            <p className="mb-1 text-sm font-medium text-indigo-300">
              Welcome back
            </p>

            <h2 className="text-2xl font-black sm:text-3xl">
              {teacherName}
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Create, schedule, publish and manage your student quizzes from
              one place.
            </p>
          </section>

          {/* STATS */}
          <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <div className="mb-3 text-2xl">🧠</div>

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total Quizzes
              </p>

              <p className="mt-1 text-3xl font-black">
                {totalQuizzes}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-400/10 bg-emerald-500/5 p-5 backdrop-blur-xl">
              <div className="mb-3 text-2xl">🚀</div>

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Published
              </p>

              <p className="mt-1 text-3xl font-black text-emerald-400">
                {publishedQuizzes}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-400/10 bg-amber-500/5 p-5 backdrop-blur-xl">
              <div className="mb-3 text-2xl">📝</div>

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Drafts
              </p>

              <p className="mt-1 text-3xl font-black text-amber-400">
                {draftQuizzes}
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-400/10 bg-cyan-500/5 p-5 backdrop-blur-xl">
              <div className="mb-3 text-2xl">⏰</div>

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Upcoming
              </p>

              <p className="mt-1 text-3xl font-black text-cyan-400">
                {scheduledQuizzes}
              </p>
            </div>
          </section>

          {/* MAIN ACTIONS */}
          <section className="mb-10">
            <div className="mb-4">
              <h3 className="text-xl font-black">
                Quiz Control Center
              </h3>

              <p className="mt-1 text-sm text-slate-400">
                Manage every part of your quiz system.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* CREATE */}
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/teacher/quiz-tests/create"
                  )
                }
                className="group rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-600/20 to-purple-600/10 p-6 text-left transition hover:-translate-y-1 hover:border-indigo-400/40 hover:bg-indigo-500/20"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 text-3xl">
                    ➕
                  </div>

                  <span className="text-xl text-indigo-300 transition group-hover:translate-x-1">
                    →
                  </span>
                </div>

                <h4 className="text-lg font-black">
                  Create New Quiz
                </h4>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Create a quiz title, schedule, marks, negative marking and
                  pass percentage.
                </p>
              </button>

              {/* MANAGE */}
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/teacher/quiz-tests/manage"
                  )
                }
                className="group rounded-3xl border border-blue-400/20 bg-gradient-to-br from-blue-600/20 to-cyan-600/10 p-6 text-left transition hover:-translate-y-1 hover:border-blue-400/40 hover:bg-blue-500/20"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/20 text-3xl">
                    📋
                  </div>

                  <span className="text-xl text-blue-300 transition group-hover:translate-x-1">
                    →
                  </span>
                </div>

                <h4 className="text-lg font-black">
                  Manage Quizzes
                </h4>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  View, edit, publish, unpublish and manage all created
                  quizzes.
                </p>
              </button>

              {/* QUESTIONS */}
              <button
                type="button"
                onClick={() => {
                  if (quizzes.length > 0) {
                    openQuestions(quizzes[0].id);
                  } else {
                    router.push(
                      "/teacher/quiz-tests/manage"
                    );
                  }
                }}
                className="group rounded-3xl border border-purple-400/20 bg-gradient-to-br from-purple-600/20 to-pink-600/10 p-6 text-left transition hover:-translate-y-1 hover:border-purple-400/40 hover:bg-purple-500/20"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/20 text-3xl">
                    ❓
                  </div>

                  <span className="text-xl text-purple-300 transition group-hover:translate-x-1">
                    →
                  </span>
                </div>

                <h4 className="text-lg font-black">
                  Questions
                </h4>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Add questions, multiple options and select the correct
                  answer.
                </p>
              </button>

              {/* RESULTS */}
              <button
                type="button"
                onClick={() => {
                  if (quizzes.length > 0) {
                    openResults(quizzes[0].id);
                  } else {
                    router.push(
                      "/teacher/quiz-tests/manage"
                    );
                  }
                }}
                className="group rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-600/20 to-teal-600/10 p-6 text-left transition hover:-translate-y-1 hover:border-emerald-400/40 hover:bg-emerald-500/20"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-3xl">
                    📊
                  </div>

                  <span className="text-xl text-emerald-300 transition group-hover:translate-x-1">
                    →
                  </span>
                </div>

                <h4 className="text-lg font-black">
                  Results
                </h4>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  View student-wise scores, correct/wrong answers,
                  percentages and PASS/FAIL results.
                </p>
              </button>

              {/* SETTINGS */}
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/teacher/quiz-tests/settings"
                  )
                }
                className="group rounded-3xl border border-orange-400/20 bg-gradient-to-br from-orange-600/20 to-amber-600/10 p-6 text-left transition hover:-translate-y-1 hover:border-orange-400/40 hover:bg-orange-500/20"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/20 text-3xl">
                    ⚙️
                  </div>

                  <span className="text-xl text-orange-300 transition group-hover:translate-x-1">
                    →
                  </span>
                </div>

                <h4 className="text-lg font-black">
                  Quiz Settings
                </h4>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Configure quiz defaults and review quiz rules.
                </p>
              </button>

              {/* RULES */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-3xl">
                  ⏱️
                </div>

                <h4 className="text-lg font-black">
                  Quiz Rules
                </h4>

                <div className="mt-4 space-y-2 text-sm text-slate-400">
                  <p>• Fixed duration: 30 minutes</p>
                  <p>• Multiple-choice questions</p>
                  <p>• Negative marking supported</p>
                  <p>• Scheduled start time</p>
                  <p>• Automatic result calculation</p>
                </div>
              </div>
            </div>
          </section>

          {/* RECENT QUIZZES */}
          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h3 className="text-xl font-black">
                  Recent Quizzes
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  Your latest created quizzes.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/teacher/quiz-tests/manage"
                  )
                }
                className="text-sm font-bold text-indigo-300 hover:text-indigo-200"
              >
                View All →
              </button>
            </div>

            {loading ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />

                <p className="text-sm text-slate-400">
                  Loading quizzes...
                </p>
              </div>
            ) : quizzes.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-10 text-center">
                <div className="mb-3 text-5xl">
                  🧠
                </div>

                <h4 className="text-lg font-black">
                  No quizzes created yet
                </h4>

                <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                  Create your first quiz and add questions for your students.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/teacher/quiz-tests/create"
                    )
                  }
                  className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold transition hover:bg-indigo-500"
                >
                  + Create First Quiz
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {quizzes.slice(0, 5).map((quiz) => (
                  <div
                    key={quiz.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/[0.07]"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate font-bold">
                            {quiz.title}
                          </h4>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                              quiz.is_published
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "bg-amber-500/15 text-amber-400"
                            }`}
                          >
                            {quiz.is_published
                              ? "Published"
                              : "Draft"}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                          <span>
                            📅{" "}
                            {formatDate(
                              quiz.scheduled_date
                            )}
                          </span>

                          <span>
                            ⏰{" "}
                            {formatTime(
                              quiz.scheduled_time
                            )}
                          </span>

                          <span>
                            ⏱️{" "}
                            {quiz.duration_minutes} min
                          </span>

                          <span>
                            🎯{" "}
                            {quiz.marks_per_question} marks
                          </span>

                          <span>
                            ➖{" "}
                            {quiz.negative_marks} negative
                          </span>
                        </div>
                      </div>

                      {/* QUIZ ACTIONS */}
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openQuestions(
                              quiz.id
                            )
                          }
                          className="rounded-xl border border-purple-400/20 bg-purple-500/10 px-4 py-2 text-sm font-bold text-purple-300 transition hover:bg-purple-500/20"
                        >
                          Questions
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openResults(
                              quiz.id
                            )
                          }
                          className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/20"
                        >
                          Results
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              "/teacher/quiz-tests/manage"
                            )
                          }
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}