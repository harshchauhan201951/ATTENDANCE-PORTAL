"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

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
};

export default function ManageQuizzesPage() {
  const router = useRouter();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuizzes();
  }, []);

  async function loadQuizzes() {
    setLoading(true);

    const { data, error } = await supabase
      .from("quiz_tests")
      .select("*")
      .order("scheduled_date", { ascending: false })
      .order("scheduled_time", { ascending: false });

    if (error) {
      console.error(error);
      setQuizzes([]);
    } else {
      setQuizzes((data || []) as Quiz[]);
    }

    setLoading(false);
  }

  async function togglePublish(
    quiz: Quiz
  ) {
    const { error } = await supabase
      .from("quiz_tests")
      .update({
        is_published: !quiz.is_published,
      })
      .eq("id", quiz.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadQuizzes();
  }

  async function deleteQuiz(id: number) {
    const ok = window.confirm(
      "Delete this quiz? All questions, options and results will also be deleted."
    );

    if (!ok) return;

    const { error } = await supabase
      .from("quiz_tests")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadQuizzes();
  }

  function formatDate(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  function formatTime(time: string) {
    const [h, m] = time.split(":");
    let hour = Number(h);

    const period = hour >= 12 ? "PM" : "AM";

    hour = hour % 12 || 12;

    return `${hour}:${m} ${period}`;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        <header className="border-b border-white/10 bg-slate-950/90">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <div>
              <h1 className="font-black">MANAGE QUIZZES</h1>
              <p className="text-xs text-slate-400">
                Create, edit, publish and manage
              </p>
            </div>

            <button
              onClick={() =>
                router.push("/teacher/quiz-tests")
              }
              className="rounded-xl bg-white/5 px-4 py-2 text-sm font-bold"
            >
              ← Quiz Tests
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-8">
          <button
            onClick={() =>
              router.push("/teacher/quiz-tests/create")
            }
            className="mb-6 w-full rounded-2xl bg-indigo-600 px-5 py-4 font-black hover:bg-indigo-500"
          >
            + CREATE NEW QUIZ
          </button>

          {loading ? (
            <div className="rounded-3xl bg-white/5 p-10 text-center">
              Loading quizzes...
            </div>
          ) : quizzes.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
              No quizzes created yet.
            </div>
          ) : (
            <div className="space-y-5">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-black">
                          {quiz.title}
                        </h2>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            quiz.is_published
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-amber-500/20 text-amber-400"
                          }`}
                        >
                          {quiz.is_published
                            ? "PUBLISHED"
                            : "DRAFT"}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-400">
                        {quiz.description || "No description"}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
                        <span>
                          📅 {formatDate(quiz.scheduled_date)}
                        </span>

                        <span>
                          ⏰ {formatTime(quiz.scheduled_time)}
                        </span>

                        <span>⏱️ 30 minutes</span>

                        <span>
                          🎯 {quiz.marks_per_question} / question
                        </span>

                        <span>
                          ➖ {quiz.negative_marks} negative
                        </span>

                        <span>
                          🏆 Pass {quiz.pass_percentage}%
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      <button
                        onClick={() =>
                          router.push(
                            `/teacher/quiz-tests/questions?quizId=${quiz.id}`
                          )
                        }
                        className="rounded-xl bg-purple-600/20 px-4 py-3 text-sm font-bold text-purple-300"
                      >
                        ❓ Questions
                      </button>

                      <button
                        onClick={() => togglePublish(quiz)}
                        className={`rounded-xl px-4 py-3 text-sm font-bold ${
                          quiz.is_published
                            ? "bg-amber-500/15 text-amber-300"
                            : "bg-emerald-500/15 text-emerald-300"
                        }`}
                      >
                        {quiz.is_published
                          ? "Unpublish"
                          : "Publish"}
                      </button>

                      <button
                        onClick={() =>
                          router.push(
                            `/teacher/quiz-tests/results?quizId=${quiz.id}`
                          )
                        }
                        className="rounded-xl bg-cyan-500/15 px-4 py-3 text-sm font-bold text-cyan-300"
                      >
                        📊 Results
                      </button>

                      <button
                        onClick={() => deleteQuiz(quiz.id)}
                        className="rounded-xl bg-red-500/15 px-4 py-3 text-sm font-bold text-red-300"
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}