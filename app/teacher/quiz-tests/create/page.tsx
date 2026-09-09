"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

const SUBJECTS = [
  "Hindi",
  "English",
  "Mathematics",
  "Science",
  "Social Science",
  "General Knowledge",
  "Others",
];

export default function CreateQuizPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [marks, setMarks] = useState("1");
  const [negative, setNegative] = useState("0");
  const [passPercentage, setPassPercentage] = useState("40");

  const [className, setClassName] = useState("");
  const [subject, setSubject] = useState("");

  const [classes, setClasses] = useState<string[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const id = Number(
      localStorage.getItem("attendance_teacher_id") ||
        localStorage.getItem("teacherId") ||
        localStorage.getItem("teacher_id")
    );

    if (id) {
      setTeacherId(id);
    }
  }, []);

  useEffect(() => {
    async function loadClasses() {
      setLoadingClasses(true);

      const { data, error } = await supabase
        .from("students")
        .select("class_name")
        .not("class_name", "is", null)
        .order("class_name", { ascending: true });

      if (error) {
        console.error("Class loading error:", error);
        setMessage(
          `Unable to load classes: ${error.message}`
        );
        setLoadingClasses(false);
        return;
      }

      const uniqueClasses = Array.from(
        new Set(
          (data || [])
            .map((student) => student.class_name)
            .filter(
              (value): value is string =>
                typeof value === "string" &&
                value.trim().length > 0
            )
            .map((value) => value.trim().toUpperCase())
        )
      );

      const classOrder: Record<string, number> = {
        "1ST": 1,
        "2ND": 2,
        "3RD": 3,
        "4TH": 4,
        "5TH": 5,
        "6TH": 6,
        "7TH": 7,
        "8TH": 8,
        "9TH": 9,
        "10TH": 10,
        "11TH": 11,
        "12TH": 12,
      };

      uniqueClasses.sort((a, b) => {
        const orderA = classOrder[a] ?? 999;
        const orderB = classOrder[b] ?? 999;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        return a.localeCompare(b);
      });

      setClasses(uniqueClasses);
      setLoadingClasses(false);
    }

    loadClasses();
  }, []);

  async function createQuiz(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!className) {
      setMessage("Please select a class.");
      return;
    }

    if (!subject) {
      setMessage("Please select a subject.");
      return;
    }

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

    if (Number.isNaN(marksNumber) || marksNumber < 0) {
      setMessage("Marks cannot be negative.");
      return;
    }

    if (
      Number.isNaN(negativeNumber) ||
      negativeNumber < 0
    ) {
      setMessage("Negative marks cannot be negative.");
      return;
    }

    if (
      Number.isNaN(passNumber) ||
      passNumber < 0 ||
      passNumber > 100
    ) {
      setMessage(
        "Pass percentage must be between 0 and 100."
      );
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("quiz_tests")
      .insert({
        title: title.trim(),
        description: description.trim() || null,

        // CLASS + SUBJECT
        class_name: className,
        subject: subject,

        scheduled_date: date,
        scheduled_time: time,

        // Fixed duration
        duration_minutes: 30,

        marks_per_question: marksNumber,
        negative_marks: negativeNumber,
        pass_percentage: passNumber,

        // Quiz remains draft until teacher publishes it
        is_published: false,

        created_by: teacherId,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("Create quiz error:", error);

      setMessage(
        error?.message || "Unable to create quiz."
      );

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
              <h1 className="font-black">
                CREATE NEW QUIZ
              </h1>

              <p className="text-xs text-slate-400">
                RACER ACADEMY
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push("/teacher/quiz-tests")
              }
              className="rounded-xl bg-white/5 px-4 py-2 text-sm font-bold transition hover:bg-white/10"
            >
              ← Back
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-4xl px-4 py-8">
          <form
            onSubmit={createQuiz}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl sm:p-8"
          >
            <div>
              <h2 className="text-2xl font-black">
                Quiz Information
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Select class and subject before creating
                the quiz.
              </p>
            </div>

            <div className="mt-6 space-y-5">

              {/* CLASS + SUBJECT */}
              <div className="grid gap-5 sm:grid-cols-2">

                {/* CLASS */}
                <div>
                  <label className="text-sm font-bold">
                    Select Class
                  </label>

                  <select
                    value={className}
                    onChange={(e) =>
                      setClassName(e.target.value)
                    }
                    disabled={loadingClasses}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">
                      {loadingClasses
                        ? "Loading classes..."
                        : "Select Class"}
                    </option>

                    {classes.map((classItem) => (
                      <option
                        key={classItem}
                        value={classItem}
                      >
                        Class {classItem}
                      </option>
                    ))}
                  </select>

                  {!loadingClasses &&
                    classes.length === 0 && (
                      <p className="mt-2 text-xs text-amber-300">
                        No class found in students table.
                      </p>
                    )}
                </div>

                {/* SUBJECT */}
                <div>
                  <label className="text-sm font-bold">
                    Select Subject
                  </label>

                  <select
                    value={subject}
                    onChange={(e) =>
                      setSubject(e.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-indigo-400"
                  >
                    <option value="">
                      Select Subject
                    </option>

                    {SUBJECTS.map((subjectItem) => (
                      <option
                        key={subjectItem}
                        value={subjectItem}
                      >
                        {subjectItem}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* TARGET PREVIEW */}
              {className && subject && (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-indigo-500/20 px-4 py-2 text-sm font-black text-indigo-300">
                      CLASS {className}
                    </span>

                    <span className="text-slate-500">
                      +
                    </span>

                    <span className="rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-black text-emerald-300">
                      {subject}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-slate-300">
                    This quiz will be targeted to students
                    of Class {className}.
                  </p>
                </div>
              )}

              {/* TITLE */}
              <div>
                <label className="text-sm font-bold">
                  Quiz Title
                </label>

                <input
                  value={title}
                  onChange={(e) =>
                    setTitle(e.target.value)
                  }
                  placeholder="Example: Mathematics Unit Test"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-indigo-400"
                />
              </div>

              {/* DESCRIPTION */}
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

              {/* DATE + TIME */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-bold">
                    Scheduled Date
                  </label>

                  <input
                    type="date"
                    value={date}
                    onChange={(e) =>
                      setDate(e.target.value)
                    }
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
                    onChange={(e) =>
                      setTime(e.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3"
                  />
                </div>
              </div>

              {/* DURATION */}
              <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-bold">
                    ⏱️ Quiz Duration
                  </span>

                  <span className="rounded-full bg-indigo-500/20 px-4 py-2 font-black text-indigo-300">
                    30 MINUTES
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  Quiz duration is fixed to exactly 30
                  minutes.
                </p>
              </div>

              {/* MARKS */}
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
                    onChange={(e) =>
                      setMarks(e.target.value)
                    }
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

              {/* MESSAGE */}
              {message && (
                <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-300">
                  {message}
                </div>
              )}

              {/* SUBMIT */}
              <button
                disabled={
                  saving ||
                  loadingClasses ||
                  classes.length === 0
                }
                type="submit"
                className="w-full rounded-2xl bg-indigo-600 px-5 py-4 font-black transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
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