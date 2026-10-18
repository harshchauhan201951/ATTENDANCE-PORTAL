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

type QuizIconName = "overview" | "live" | "draft" | "calendar" | "create" | "manage" | "questions" | "results" | "settings";

function QuizIcon({ name, className = "h-5 w-5" }: { name: QuizIconName; className?: string }) {
  const paths: Record<QuizIconName, string> = {
    overview: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
    live: "m5 12 4 4L19 6",
    draft: "M8 3h8l4 4v14H4V3h4zm0 0v5h8V3M8 13h8m-8 4h8",
    calendar: "M8 2v4m8-4v4M3 9h18M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2z",
    create: "M12 5v14m-7-7h14",
    manage: "M4 6h16M4 12h16M4 18h16M8 4v4m8 2v4m-5 2v4",
    questions: "M9.1 9a3 3 0 1 1 5.8 1c-.9 1.2-2.9 1.6-2.9 3.5M12 17h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z",
    results: "M4 19V5m0 14h17M8 15l4-4 3 2 5-6",
    settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0-5v2m0 14v2m9-9h-2M5 12H3m15.36-6.36-1.42 1.42M7.06 16.94l-1.42 1.42m12.72 0-1.42-1.42M7.06 7.06 5.64 5.64",
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={paths[name]} />
    </svg>
  );
}

export default function TeacherQuizTestsPage() {
  const router = useRouter();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
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
    <main data-racer-vip-module="quiz-tests" className="min-h-screen bg-[#f5f7fc] text-slate-900 racer-module-page racer-quiz-tests-page">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.10),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.08),_transparent_30%)]">
        {/* HEADER */}
        <header data-racer-vip-header="1"  className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200">
                <QuizIcon name="questions" className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-lg font-black tracking-wide text-slate-900 sm:text-xl">RACER ACADEMY</h1>

                <p className="truncate text-xs font-medium text-slate-500">TEACHER CONTROL CENTER</p>
              </div>
            </div>

            <button
              onClick={() => router.push("/teacher")}
              className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            >
              ← Dashboard
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          {/* WELCOME */}
          <section className="relative mb-5 overflow-hidden rounded-[24px] bg-gradient-to-br from-[#172554] via-indigo-800 to-violet-700 p-4 text-white shadow-[0_18px_42px_rgba(49,46,129,0.18)] sm:p-5">
            <div className="absolute -right-14 -top-24 h-64 w-64 rounded-full border-[34px] border-white/[0.07]" />
            <div className="absolute right-40 top-24 h-20 w-20 rounded-full bg-cyan-300/20 blur-2xl" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-indigo-100">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.9)]" />
                  Quiz studio · Teacher workspace
                </div>
                <p className="text-sm font-semibold text-indigo-200">Welcome back</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{teacherName}</h2>
                <p className="mt-2 max-w-xl text-sm leading-5 text-indigo-100/90">
                  Build engaging quizzes, manage questions and follow student performance—all in one place.
                </p>
              </div>
              <button
                onClick={() => router.push("/teacher/quiz-tests/create")}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-indigo-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-cyan-50"
              >
                <QuizIcon name="create" className="h-5 w-5" /> Create a quiz
              </button>
            </div>
          </section>

          {/* STATS */}
          <section className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total quizzes", value: totalQuizzes, note: "In your workspace", icon: "overview" as const, color: "indigo" },
              { label: "Published", value: publishedQuizzes, note: "Visible to students", icon: "live" as const, color: "emerald" },
              { label: "Drafts", value: draftQuizzes, note: "Need a final review", icon: "draft" as const, color: "amber" },
              { label: "Upcoming", value: scheduledQuizzes, note: "Scheduled to start", icon: "calendar" as const, color: "sky" },
            ].map((stat) => {
              const tones: Record<string, string> = {
                indigo: "from-indigo-500 to-violet-500 text-indigo-700 bg-indigo-50",
                emerald: "from-emerald-500 to-teal-500 text-emerald-700 bg-emerald-50",
                amber: "from-amber-400 to-orange-500 text-amber-700 bg-amber-50",
                sky: "from-sky-500 to-cyan-500 text-sky-700 bg-sky-50",
              };
              return (
                <div key={stat.label} className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-[0_6px_18px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-md sm:p-4">
                    <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${tones[stat.color].split(" ").slice(0, 2).join(" ")}`} />
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 sm:text-[11px]">{stat.label}</p>
                      <p className={`mt-1 text-2xl font-black tracking-tight ${tones[stat.color].split(" ")[2]}`}>{stat.value}</p>
                    </div>
                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tones[stat.color].split(" ")[3]}`}>
                      <QuizIcon name={stat.icon} className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-1.5 text-[10px] font-medium text-slate-400 sm:text-[11px]">{stat.note}</p>
                </div>
              );
            })}
          </section>

          {/* MAIN ACTIONS */}
          <section className="mb-7">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
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

              <div className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500 shadow-sm">
                5 management tools
              </div>
            </div>

            <div className="racer-quiz-tools grid grid-cols-2 gap-3 lg:grid-cols-3">
              {/* CREATE */}
              <button
                onClick={() =>
                  router.push("/teacher/quiz-tests/create")
                }
                className="group relative overflow-hidden rounded-2xl border border-indigo-100 bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
              >
                <div className="absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-indigo-50" />

                <div className="relative mb-3 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                    <QuizIcon name="create" className="h-6 w-6" />
                  </div>

                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-indigo-100 bg-white text-indigo-500 transition group-hover:translate-x-1">
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
                  </span>
                </div>

                <h4 className="text-base font-black text-slate-950">
                  Create New Quiz
                </h4>

                <p className="mt-1.5 text-xs leading-5 text-slate-600">
                  Create a quiz title, schedule, marks, negative marking and
                  pass percentage.
                </p>

                <div className="mt-3 text-[10px] font-black uppercase tracking-wider text-indigo-600">
                  Start creating
                </div>
              </button>

              {/* MANAGE */}
              <button
                onClick={() =>
                  router.push("/teacher/quiz-tests/manage")
                }
                className="group relative overflow-hidden rounded-2xl border border-blue-100 bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <div className="absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-blue-50" />

                <div className="relative mb-3 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600">
                    <QuizIcon name="manage" className="h-6 w-6" />
                  </div>

                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-100 bg-white text-blue-500 transition group-hover:translate-x-1">
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
                  </span>
                </div>

                <h4 className="text-base font-black text-slate-950">
                  Manage Quizzes
                </h4>

                <p className="mt-1.5 text-xs leading-5 text-slate-600">
                  View, edit, publish, unpublish and manage all created
                  quizzes.
                </p>

                <div className="mt-3 text-[10px] font-black uppercase tracking-wider text-blue-600">
                  Open quiz manager
                </div>
              </button>

              {/* QUESTIONS */}
              <button
                onClick={() =>
                  router.push("/teacher/quiz-tests/questions")
                }
                className="group relative overflow-hidden rounded-2xl border border-violet-100 bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
              >
                <div className="absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-violet-50" />

                <div className="relative mb-3 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-100 bg-violet-50 text-violet-600">
                    <QuizIcon name="questions" className="h-6 w-6" />
                  </div>

                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-violet-100 bg-white text-violet-500 transition group-hover:translate-x-1">
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
                  </span>
                </div>

                <h4 className="text-base font-black text-slate-950">
                  Questions
                </h4>

                <p className="mt-1.5 text-xs leading-5 text-slate-600">
                  Add questions, multiple options and select the correct
                  answer.
                </p>

                <div className="mt-3 text-[10px] font-black uppercase tracking-wider text-violet-600">
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
                className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
              >
                <div className="absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-emerald-50" />

                <div className="relative mb-3 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600">
                    <QuizIcon name="results" className="h-6 w-6" />
                  </div>

                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-100 bg-white text-emerald-500 transition group-hover:translate-x-1">
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
                  </span>
                </div>

                <h4 className="text-base font-black text-slate-950">
                  Results
                </h4>

                <p className="mt-1.5 text-xs leading-5 text-slate-600">
                  View student-wise scores, correct/wrong answers,
                  percentages and PASS/FAIL results.
                </p>

                <div className="mt-3 text-[10px] font-black uppercase tracking-wider text-emerald-600">
                  View latest results
                </div>
              </button>

              {/* SETTINGS */}
              <button
                onClick={() =>
                  router.push("/teacher/quiz-tests/settings")
                }
                className="group relative overflow-hidden rounded-2xl border border-orange-100 bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
              >
                <div className="absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-orange-50" />

                <div className="relative mb-3 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-100 bg-orange-50 text-orange-600">
                    <QuizIcon name="settings" className="h-6 w-6" />
                  </div>

                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-orange-100 bg-white text-orange-500 transition group-hover:translate-x-1">
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
                  </span>
                </div>

                <h4 className="text-base font-black text-slate-950">
                  Quiz Settings
                </h4>

                <p className="mt-1.5 text-xs leading-5 text-slate-600">
                  Configure quiz defaults and review quiz rules.
                </p>

                <div className="mt-3 text-[10px] font-black uppercase tracking-wider text-orange-600">
                  Configure system
                </div>
              </button>

            </div>
          </section>

          <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Quiz library</p>
              <h3 className="mt-1 text-lg font-black text-slate-900">Manage your quizzes</h3>
              <p className="mt-1 text-sm text-slate-500">Open the full list to edit, publish, add questions, or review results.</p>
            </div>
            <button onClick={() => router.push("/teacher/quiz-tests/manage")} className="mt-4 min-h-11 w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 sm:mt-0 sm:w-auto">View all quizzes</button>
          </section>
        </div>
      </div>
    </main>
  );
}
