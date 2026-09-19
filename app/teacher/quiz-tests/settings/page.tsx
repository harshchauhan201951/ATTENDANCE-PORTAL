"use client";

import { useRouter } from "next/navigation";

export default function QuizSettingsPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        <header className="border-b border-white/10 bg-slate-950/90">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <div>
              <h1 className="font-black">QUIZ SETTINGS</h1>
              <p className="text-xs text-slate-400">
                Quiz rules and system settings
              </p>
            </div>

            <button
              onClick={() =>
                router.push("/teacher/quiz-tests")
              }
              className="rounded-xl bg-white/5 px-4 py-2 text-sm font-bold"
            >
              ← Back
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-indigo-400/20 bg-indigo-500/10 p-6">
              <div className="text-4xl">⏱️</div>
              <h2 className="mt-4 text-xl font-black">
                Fixed Duration
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Every quiz has a fixed duration of exactly 30
                minutes.
              </p>

              <div className="mt-5 rounded-xl bg-black/20 p-4 text-center text-2xl font-black">
                30 MINUTES
              </div>
            </div>

            <div className="rounded-3xl border border-purple-400/20 bg-purple-500/10 p-6">
              <div className="text-4xl">📝</div>
              <h2 className="mt-4 text-xl font-black">
                Question Type
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Multiple-choice questions with one correct answer.
              </p>

              <div className="mt-5 rounded-xl bg-black/20 p-4 text-center font-black">
                MCQ
              </div>
            </div>

            <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-6">
              <div className="text-4xl">➖</div>
              <h2 className="mt-4 text-xl font-black">
                Negative Marking
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Negative marks can be configured separately for
                each quiz.
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-6">
              <div className="text-4xl">🏆</div>
              <h2 className="mt-4 text-xl font-black">
                Pass Percentage
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Pass percentage is configured when creating a quiz.
              </p>
            </div>

            <div className="md:col-span-2 rounded-3xl border border-amber-400/20 bg-amber-500/10 p-6">
              <div className="text-4xl">🔒</div>

              <h2 className="mt-4 text-xl font-black">
                Quiz Rules
              </h2>

              <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                <p>✓ Quiz starts at scheduled date/time.</p>
                <p>✓ Duration is exactly 30 minutes.</p>
                <p>✓ Student can submit manually.</p>
                <p>✓ Quiz auto-submits after timeout.</p>
                <p>✓ Results are saved permanently.</p>
                <p>✓ One completed attempt per student.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}