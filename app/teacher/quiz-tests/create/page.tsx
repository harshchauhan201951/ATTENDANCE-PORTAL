"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

export default function CreateQuizPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [marks, setMarks] = useState("1");
  const [negative, setNegative] = useState("0");
  const [passPercentage, setPassPercentage] = useState("40");

  const [teacherId, setTeacherId] = useState<number | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const id = Number(
      localStorage.getItem("attendance_teacher_id") ||
        localStorage.getItem("teacherId") ||
        localStorage.getItem("teacher_id")
    );

    if (id) setTeacherId(id);
  }, []);

  async function createQuiz(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!title.trim()) {
      setMessage("Please enter quiz title.");
      return;
    }

    if (!date || !time) {
      setMessage("Please select date and start time.");
      return;
    }

    const marksNumber = Number(marks);
    const negativeNumber = Number(negative);
    const passNumber = Number(passPercentage);

    if (marksNumber < 0) {
      setMessage("Marks cannot be negative.");
      return;
    }

    if (negativeNumber < 0) {
      setMessage("Negative marks cannot be negative.");
      return;
    }

    if (passNumber < 0 || passNumber > 100) {
      setMessage("Pass percentage must be between 0 and 100.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("quiz_tests")
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        scheduled_date: date,
        scheduled_time: time,
        duration_minutes: 30,
        marks_per_question: marksNumber,
        negative_marks: negativeNumber,
        pass_percentage: passNumber,
        is_published: false,
        created_by: teacherId,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error(error);
      setMessage(error?.message || "Unable to create quiz.");
      setSaving(false);
      return;
    }

    router.push(
      `/teacher/quiz-tests/questions?quizId=${data.id}`
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        <header className="border-b border-white/10 bg-slate-950/90">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
            <div>
              <h1 className="font-black">CREATE NEW QUIZ</h1>
              <p className="text-xs text-slate-400">
                RACER ACADEMY
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

        <div className="mx-auto max-w-4xl px-4 py-8">
          <form
            onSubmit={createQuiz}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8"
          >
            <h2 className="text-2xl font-black">
              Quiz Information
            </h2>

            <div className="mt-6 space-y-5">
              <div>
                <label className="text-sm font-bold">
                  Quiz Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Example: Mathematics Unit Test"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="text-sm font-bold">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  rows={4}
                  placeholder="Enter quiz instructions..."
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-indigo-400"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-bold">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-5">
                <div className="flex items-center justify-between">
                  <span className="font-bold">
                    ⏱️ Quiz Duration
                  </span>

                  <span className="rounded-full bg-indigo-500/20 px-4 py-2 font-black text-indigo-300">
                    30 MINUTES
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  Quiz duration is fixed to exactly 30 minutes.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-3">
                <div>
                  <label className="text-sm font-bold">
                    Marks / Question
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={marks}
                    onChange={(e) => setMarks(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">
                    Negative Marks
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={negative}
                    onChange={(e) =>
                      setNegative(e.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">
                    Pass Percentage
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={passPercentage}
                    onChange={(e) =>
                      setPassPercentage(e.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3"
                  />
                </div>
              </div>

              {message && (
                <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-300">
                  {message}
                </div>
              )}

              <button
                disabled={saving}
                type="submit"
                className="w-full rounded-2xl bg-indigo-600 px-5 py-4 font-black hover:bg-indigo-500 disabled:opacity-50"
              >
                {saving
                  ? "CREATING..."
                  : "CREATE QUIZ & ADD QUESTIONS →"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}