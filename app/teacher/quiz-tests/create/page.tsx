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

  // MULTIPLE CLASSES
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [subject, setSubject] = useState("");

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

        setMessage(`Unable to load classes: ${error.message}`);
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

  function toggleClass(classItem: string) {
    setSelectedClasses((current) => {
      if (current.includes(classItem)) {
        return current.filter((item) => item !== classItem);
      }

      return [...current, classItem];
    });
  }

  function selectAllClasses() {
    setSelectedClasses(classes);
  }

  function clearAllClasses() {
    setSelectedClasses([]);
  }

  async function createQuiz(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    if (selectedClasses.length === 0) {
      setMessage("Please select at least one class.");
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
      setMessage("Pass percentage must be between 0 and 100.");
      return;
    }

    setSaving(true);

    /*
      class_name is kept for backward compatibility.
      target_classes contains ALL selected classes.
    */
    const { data, error } = await supabase
      .from("quiz_tests")
      .insert({
        title: title.trim(),
        description: description.trim() || null,

        // BACKWARD COMPATIBILITY
        class_name: selectedClasses[0],

        // MULTIPLE CLASS TARGETING
        target_classes: selectedClasses,

        subject,

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
                Select one or multiple classes and subject
                before creating the quiz.
              </p>
            </div>

            <div className="mt-6 space-y-5">
              {/* CLASS + SUBJECT */}
              <div className="grid gap-5 sm:grid-cols-2">
                {/* MULTIPLE CLASSES */}
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-bold">
                      Select Classes
                    </label>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllClasses}
                        disabled={
                          loadingClasses ||
                          classes.length === 0
                        }
                        className="rounded-lg bg-indigo-500/15 px-2.5 py-1 text-[11px] font-bold text-indigo-300 transition hover:bg-indigo-500/25 disabled:opacity-40"
                      >
                        Select All
                      </button>

                      <button
                        type="button"
                        onClick={clearAllClasses}
                        disabled={
                          selectedClasses.length === 0
                        }
                        className="rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 rounded-xl border border-white/10 bg-slate-900 p-3">
                    {loadingClasses ? (
                      <p className="py-3 text-center text-sm text-slate-400">
                        Loading classes...
                      </p>
                    ) : classes.length === 0 ? (
                      <p className="py-3 text-center text-xs text-amber-300">
                        No class found in students table.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {classes.map((classItem) => {
                          const selected =
                            selectedClasses.includes(
                              classItem
                            );

                          return (
                            <label
                              key={classItem}
                              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 transition ${
                                selected
                                  ? "border-indigo-400/50 bg-indigo-500/15 text-white"
                                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() =>
                                  toggleClass(classItem)
                                }
                                className="h-4 w-4 accent-indigo-500"
                              />

                              <span className="text-sm font-semibold">
                                Class {classItem}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="mt-2">
                    {selectedClasses.length > 0 ? (
                      <p className="text-xs text-indigo-300">
                        {selectedClasses.length} class
                        {selectedClasses.length !== 1
                          ? "es"
                          : ""}{" "}
                        selected:{" "}
                        {selectedClasses.join(", ")}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-300">
                        Select at least one class.
                      </p>
                    )}
                  </div>
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

              {/* TITLE */}
              <div>
                <label className="text-sm font-bold">
                  Quiz Title
                </label>

                <input
                  type="text"
                  value={title}
                  onChange={(e) =>
                    setTitle(e.target.value)
                  }
                  placeholder="Enter quiz title"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-indigo-400"
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
                  placeholder="Enter quiz description (optional)"
                  className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-indigo-400"
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
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-indigo-400"
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
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-indigo-400"
                  />
                </div>
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
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-indigo-400"
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
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-indigo-400"
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
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              {/* DURATION INFO */}
              <div className="rounded-2xl border border-cyan-400/10 bg-cyan-500/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">⏱️</div>

                  <div>
                    <p className="text-sm font-bold">
                      Quiz Duration
                    </p>

                    <p className="text-xs text-slate-400">
                      Fixed duration: 30 minutes
                    </p>
                  </div>
                </div>
              </div>

              {/* ERROR / MESSAGE */}
              {message && (
                <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                  {message}
                </div>
              )}

              {/* SELECTED CLASSES SUMMARY */}
              {selectedClasses.length > 0 && (
                <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                    Quiz will be assigned to
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedClasses.map((classItem) => (
                      <span
                        key={classItem}
                        className="rounded-full bg-indigo-500/20 px-3 py-1.5 text-xs font-bold text-indigo-200"
                      >
                        Class {classItem}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* CREATE BUTTON */}
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4 text-sm font-black transition hover:from-indigo-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Creating Quiz..."
                  : "Create Quiz & Add Questions →"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}