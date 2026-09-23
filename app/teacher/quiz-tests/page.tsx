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

    loadQuizzes();
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

    const d = new Date(`${date}T00:00:00`);

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

  function openQuizResults(quizId: number) {
    router.push(`/teacher/quiz-tests/results?quizId=${quizId}`);
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
    const quizDateTime = new Date(
      `${quiz.scheduled_date}T${quiz.scheduled_time}`
    );

    return quizDateTime > today && quiz.is_published;
  }).length;

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.08),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.06),_transparent_30%)]">
        {/* HEADER */}
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-lg font-black text-indigo-600 shadow-sm">
                QT
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-lg font-black tracking-wide text-slate-900 sm:text-xl">
                  QUIZ TESTS
                </h1>

                <p className="truncate text-xs font-medium text-slate-500">
                  RACER ACADEMY • Teacher Panel
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push("/teacher")}
              className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            >
              ← Dashboard
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-8 lg:px-8">
          {/* WELCOME */}
          <section className="relative mb-8 overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-r from-white via-indigo-50/60 to-blue-50/80 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] sm:p-8">
            <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-indigo-200/20 blur-2xl" />
            <div className="absolute bottom-0 left-1/3 h-24 w-24 rounded-full bg-sky-200/20 blur-2xl" />

            <div className="relative">
              <div className="mb-3 inline-flex items-center rounded-full border border-indigo-100 bg-white px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-600 shadow-sm">
                Teacher Quiz Workspace
              </div>

              <p className="text-sm font-semibold text-slate-500">
                Welcome back
              </p>

              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                {teacherName}
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Create, schedule, publish and manage your student quizzes from
                one clean workspace.
              </p>
            </div>
          </section>

          {/* STATS */}
          <section className="mb-9 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="absolute left-0 top-0 h-1 w-full bg-indigo-500" />

              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-sm font-black text-indigo-600">
                  ALL
                </div>

                <span className="text-xs font-semibold text-slate-400">
                  Overview
                </span>
              </div>

              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Quizzes
              </p>

              <p className="mt-1 text-3xl font-black text-slate-950">
                {totalQuizzes}
              </p>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="absolute left-0 top-0 h-1 w-full bg-emerald-500" />

              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-sm font-black text-emerald-600">
                  PUB
                </div>

                <span className="text-xs font-semibold text-slate-400">
                  Live
                </span>
              </div>

              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Published
              </p>

              <p className="mt-1 text-3xl font-black text-emerald-600">
                {publishedQuizzes}
              </p>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="absolute left-0 top-0 h-1 w-full bg-amber-500" />

              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-sm font-black text-amber-600">
                  DFT
                </div>

                <span className="text-xs font-semibold text-slate-400">
                  Pending
                </span>
              </div>

              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Drafts
              </p>

              <p className="mt-1 text-3xl font-black text-amber-600">
                {draftQuizzes}
              </p>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="absolute left-0 top-0 h-1 w-full bg-sky-500" />

              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sm font-black text-sky-600">
                  UPC
                </div>

                <span className="text-xs font-semibold text-slate-400">
                  Scheduled
                </span>
              </div>

              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Upcoming
              </p>

              <p className="mt-1 text-3xl font-black text-sky-600">
                {scheduledQuizzes}
              </p>
            </div>
          </section>

          {/* MAIN ACTIONS */}
          <section className="mb-10">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-indigo-600">
                  Control Center
                </div>

                <h3 className="text-2xl font-black tracking-tight text-slate-950">
                  Quiz Management
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Manage every part of your quiz system from one place.
                </p>
              </div>

              <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 shadow-sm">
                5 management tools
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* CREATE */}
              <button
                onClick={() =>
                  router.push("/teacher/quiz-tests/create")
                }
                className="group relative overflow-hidden rounded-3xl border border-indigo-100 bg-white p-6 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_16px_35px_rgba(79,70,229,0.10)]"
              >
                <div className="absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-indigo-50" />

                <div className="relative mb-6 flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-xl font-black text-indigo-600">
                    +
                  </div>

                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-indigo-100 bg-white text-lg font-bold text-indigo-500 transition group-hover:translate-x-1">
                    →
                  </span>
                </div>

                <h4 className="text-lg font-black text-slate-950">
                  Create New Quiz
                </h4>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Create a quiz title, schedule, marks, negative marking and
                  pass percentage.
                </p>

                <div className="mt-5 text-xs font-black uppercase tracking-wider text-indigo-600">
                  Start creating
                </div>
              </button>

              {/* MANAGE */}
              <button
                onClick={() =>
                  router.push("/teacher/quiz-tests/manage")
                }
                className="group relative overflow-hidden rounded-3xl border border-blue-100 bg-white p-6 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_16px_35px_rgba(37,99,235,0.10)]"
              >
                <div className="absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-blue-50" />

                <div className="relative mb-6 flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-sm font-black text-blue-600">
                    M
                  </div>

                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-100 bg-white text-lg font-bold text-blue-500 transition group-hover:translate-x-1">
                    →
                  </span>
                </div>

                <h4 className="text-lg font-black text-slate-950">
                  Manage Quizzes
                </h4>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  View, edit, publish, unpublish and manage all created
                  quizzes.
                </p>

                <div className="mt-5 text-xs font-black uppercase tracking-wider text-blue-600">
                  Open quiz manager
                </div>
              </button>

              {/* QUESTIONS */}
              <button
                onClick={() =>
                  router.push("/teacher/quiz-tests/questions")
                }
                className="group relative overflow-hidden rounded-3xl border border-violet-100 bg-white p-6 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_16px_35px_rgba(124,58,237,0.10)]"
              >
                <div className="absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-violet-50" />

                <div className="relative mb-6 flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50 text-lg font-black text-violet-600">
                    Q
                  </div>

                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-violet-100 bg-white text-lg font-bold text-violet-500 transition group-hover:translate-x-1">
                    →
                  </span>
                </div>

                <h4 className="text-lg font-black text-slate-950">
                  Questions
                </h4>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Add questions, multiple options and select the correct
                  answer.
                </p>

                <div className="mt-5 text-xs font-black uppercase tracking-wider text-violet-600">
                  Build questions
                </div>
              </button>

              {/* RESULTS */}
              <button
                onClick={() => {
                  if (quizzes.length > 0) {
                    openQuizResults(quizzes[0].id);
                  } else {
                    router.push("/teacher/quiz-tests/manage");
                  }
                }}
                className="group relative overflow-hidden rounded-3xl border border-emerald-100 bg-white p-6 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_16px_35px_rgba(16,185,129,0.10)]"
              >
                <div className="absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-emerald-50" />

                <div className="relative mb-6 flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-sm font-black text-emerald-600">
                    R
                  </div>

                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-100 bg-white text-lg font-bold text-emerald-500 transition group-hover:translate-x-1">
                    →
                  </span>
                </div>

                <h4 className="text-lg font-black text-slate-950">
                  Results
                </h4>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  View student-wise scores, correct/wrong answers,
                  percentages and PASS/FAIL results.
                </p>

                <div className="mt-5 text-xs font-black uppercase tracking-wider text-emerald-600">
                  View latest results
                </div>
              </button>

              {/* SETTINGS */}
              <button
                onClick={() =>
                  router.push("/teacher/quiz-tests/settings")
                }
                className="group relative overflow-hidden rounded-3xl border border-orange-100 bg-white p-6 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_16px_35px_rgba(249,115,22,0.10)]"
              >
                <div className="absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-orange-50" />

                <div className="relative mb-6 flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-sm font-black text-orange-600">
                    S
                  </div>

                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-orange-100 bg-white text-lg font-bold text-orange-500 transition group-hover:translate-x-1">
                    →
                  </span>
                </div>

                <h4 className="text-lg font-black text-slate-950">
                  Quiz Settings
                </h4>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Configure quiz defaults and review quiz rules.
                </p>

                <div className="mt-5 text-xs font-black uppercase tracking-wider text-orange-600">
                  Configure system
                </div>
              </button>

              {/* RULES */}
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <div className="absolute right-0 top-0 h-24 w-24 translate-x-10 -translate-y-10 rounded-full bg-slate-200/70" />

                <div className="relative mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-700 shadow-sm">
                  RULE
                </div>

                <h4 className="text-lg font-black text-slate-950">
                  Quiz Rules
                </h4>

                <div className="mt-4 space-y-2.5 text-sm text-slate-600">
                  <p className="flex items-start gap-2">
                    <span className="mt-0.5 font-black text-indigo-500">
                      •
                    </span>
                    Fixed duration: 30 minutes
                  </p>

                  <p className="flex items-start gap-2">
                    <span className="mt-0.5 font-black text-indigo-500">
                      •
                    </span>
                    Multiple-choice questions
                  </p>

                  <p className="flex items-start gap-2">
                    <span className="mt-0.5 font-black text-indigo-500">
                      •
                    </span>
                    Negative marking supported
                  </p>

                  <p className="flex items-start gap-2">
                    <span className="mt-0.5 font-black text-indigo-500">
                      •
                    </span>
                    Scheduled start time
                  </p>

                  <p className="flex items-start gap-2">
                    <span className="mt-0.5 font-black text-indigo-500">
                      •
                    </span>
                    Automatic result calculation
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* RECENT QUIZZES */}
          <section>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                  Activity
                </div>

                <h3 className="text-2xl font-black tracking-tight text-slate-950">
                  Recent Quizzes
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Your latest created quizzes.
                </p>
              </div>

              <button
                onClick={() =>
                  router.push("/teacher/quiz-tests/manage")
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-indigo-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50"
              >
                View All →
              </button>
            </div>

            {loading ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />

                <p className="text-sm font-medium text-slate-500">
                  Loading quizzes...
                </p>
              </div>
            ) : quizzes.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-lg font-black text-indigo-600">
                  QT
                </div>

                <h4 className="text-lg font-black text-slate-950">
                  No quizzes created yet
                </h4>

                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                  Create your first quiz and add questions for your students.
                </p>

                <button
                  onClick={() =>
                    router.push("/teacher/quiz-tests/create")
                  }
                  className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
                >
                  + Create First Quiz
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {quizzes.slice(0, 5).map((quiz) => (
                  <div
                    key={quiz.id}
                    className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-100 hover:shadow-md sm:p-5"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="min-w-0 truncate font-black text-slate-950">
                            {quiz.title}
                          </h4>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                              quiz.is_published
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-amber-200 bg-amber-50 text-amber-700"
                            }`}
                          >
                            {quiz.is_published
                              ? "Published"
                              : "Draft"}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-500">
                          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                            Date: {formatDate(quiz.scheduled_date)}
                          </span>

                          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                            Time: {formatTime(quiz.scheduled_time)}
                          </span>

                          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                            {quiz.duration_minutes} min
                          </span>

                          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                            {quiz.marks_per_question} marks
                          </span>

                          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                            {quiz.negative_marks} negative
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        {/* RESULTS */}
                        <button
                          onClick={() =>
                            openQuizResults(quiz.id)
                          }
                          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          Results
                        </button>

                        {/* MANAGE */}
                        <button
                          onClick={() =>
                            router.push("/teacher/quiz-tests/manage")
                          }
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
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