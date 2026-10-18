"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_RULES = [
  "Quiz starts at the scheduled date and time.",
  "Each quiz uses multiple-choice questions with one correct answer.",
  "Students may submit their answers before the timer ends.",
  "A quiz is submitted automatically when its timer ends.",
  "Results are calculated and saved after submission.",
  "Each student gets one completed attempt per quiz.",
];
const RULES_KEY = "racer_teacher_quiz_rules_v1";

export default function QuizSettingsPage() {
  const router = useRouter();
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RULES_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.every((rule) => typeof rule === "string")) setRules(parsed);
      }
    } catch { /* Keep the built-in rules if browser storage is unavailable. */ }
  }, []);

  function saveRules() {
    try {
      localStorage.setItem(RULES_KEY, JSON.stringify(rules.map((rule) => rule.trim()).filter(Boolean)));
      setRules((current) => current.map((rule) => rule.trim()).filter(Boolean));
      setEditing(false);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaved(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white racer-module-page racer-quiz-subpage">
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        <header className="border-b border-white/10 bg-slate-950/90">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <div><p className="text-xs font-black uppercase tracking-[.18em] text-indigo-300">Quiz studio</p><h1 className="mt-1 text-xl font-black sm:text-2xl">Quiz settings</h1><p className="mt-1 text-xs text-slate-400">One place to review and edit quiz rules</p></div>
            <button onClick={() => router.push("/teacher/quiz-tests")} className="min-h-11 shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold">← Back</button>
          </div>
        </header>
        <div className="mx-auto max-w-5xl space-y-5 px-4 py-5 sm:px-6 sm:py-8">
          <section className="rounded-3xl border border-indigo-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-700">Teacher guidance</span><h2 className="mt-3 text-xl font-black text-slate-900 sm:text-2xl">Quiz Rules</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Edit the rules shown here for teachers and students. Quiz timing, marks and pass percentage are set separately for each quiz in Create or Manage.</p></div>
              {!editing ? <button onClick={() => setEditing(true)} className="min-h-11 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-700">Edit rules</button> : <div className="flex w-full gap-2 sm:w-auto"><button onClick={() => { setRules(DEFAULT_RULES); }} className="min-h-11 flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 sm:flex-none">Reset</button><button onClick={saveRules} className="min-h-11 flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white sm:flex-none">Save rules</button></div>}
            </div>
            <div className="mt-5 space-y-3">
              {rules.map((rule, index) => <div key={index} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4"><span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-indigo-100 text-xs font-black text-indigo-700">{index + 1}</span>{editing ? <textarea aria-label={`Quiz rule ${index + 1}`} value={rule} onChange={(event) => setRules((current) => current.map((item, i) => i === index ? event.target.value : item))} rows={2} className="min-h-12 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-indigo-400" /> : <p className="pt-1 text-sm font-semibold leading-5 text-slate-700">{rule}</p>}{editing && <button aria-label={`Remove rule ${index + 1}`} onClick={() => setRules((current) => current.filter((_, i) => i !== index))} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg font-bold text-rose-600 hover:bg-rose-50">×</button>}</div>)}
              {editing && <button onClick={() => setRules((current) => [...current, ""])} className="min-h-11 w-full rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 px-4 py-2 text-sm font-bold text-indigo-700 sm:w-auto">+ Add a rule</button>}
            </div>
            {saved && <p role="status" className="mt-4 text-sm font-bold text-emerald-700">Rules saved on this device.</p>}
          </section>
          <section className="grid gap-3 sm:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Question format</p><h3 className="mt-1 font-black text-slate-900">Multiple choice</h3><p className="mt-1 text-xs leading-5 text-slate-500">Question text and answer options can be edited on the Questions page.</p></article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Per-quiz controls</p><h3 className="mt-1 font-black text-slate-900">Timing and scoring</h3><p className="mt-1 text-xs leading-5 text-slate-500">Edit the quiz duration, marks, negative marks and pass percentage in Create or Manage Quiz.</p></article>
          </section>
        </div>
      </div>
    </main>
  );
}
