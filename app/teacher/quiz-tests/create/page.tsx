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
  const [accessMode, setAccessMode] = useState<
    "scheduled" | "any_time"
  >("scheduled");

  const [marks, setMarks] = useState("1");
  const [negative, setNegative] = useState("0");
  const [passPercentage, setPassPercentage] = useState("40");

  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [subject, setSubject] = useState("");

  const [classes, setClasses] = useState<string[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const rawId =
      localStorage.getItem("attendance_teacher_id") ||
      localStorage.getItem("teacherId") ||
      localStorage.getItem("teacher_id");

    const id = Number(rawId);

    if (Number.isFinite(id) && id > 0) {
      setTeacherId(id);
    }
  }, []);

  useEffect(() => {
    async function loadClasses() {
      setLoadingClasses(true);
      setMessage("");

      const { data, error } = await supabase
        .from("students")
        .select("class_name")
        .not("class_name", "is", null);

      if (error) {
        console.error("Class loading error:", error);
        setMessage(`Unable to load classes: ${error.message}`);
        setLoadingClasses(false);
        return;
      }

      const uniqueClasses = Array.from(
        new Set(
          (data || [])
            .map((student) =>
              typeof student.class_name === "string"
                ? student.class_name.trim().toUpperCase()
                : ""
            )
            .filter(Boolean)
        )
      );

      const classOrder: Record<string, number> = {
        NURSERY: 0,
        LKG: 0,
        UKG: 0,
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

  function toggleClass(className: string) {
    setSelectedClasses((current) => {
      if (current.includes(className)) {
        return current.filter((item) => item !== className);
      }

      return [...current, className];
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

    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setMessage("Please enter quiz title.");
      return;
    }

    if (selectedClasses.length === 0) {
      setMessage("Please select at least one class.");
      return;
    }

    if (!subject) {
      setMessage("Please select a subject.");
      return;
    }

    if (!date) {
      setMessage("Please select quiz date.");
      return;
    }

    if (accessMode === "scheduled" && !time) {
      setMessage("Please select scheduled start time.");
      return;
    }

    const marksNumber = Number(marks);
    const negativeNumber = Number(negative);
    const passNumber = Number(passPercentage);

    if (!Number.isFinite(marksNumber) || marksNumber < 0) {
      setMessage("Marks cannot be negative.");
      return;
    }

    if (!Number.isFinite(negativeNumber) || negativeNumber < 0) {
      setMessage("Negative marks cannot be negative.");
      return;
    }

    if (
      !Number.isFinite(passNumber) ||
      passNumber < 0 ||
      passNumber > 100
    ) {
      setMessage("Pass percentage must be between 0 and 100.");
      return;
    }

    setSaving(true);

    const normalizedClasses = Array.from(
      new Set(
        selectedClasses
          .map((item) => item.trim().toUpperCase())
          .filter(Boolean)
      )
    );

    const { data, error } = await supabase
      .from("quiz_tests")
      .insert({
        title: cleanTitle,
        description: description.trim() || null,

        class_name: normalizedClasses[0] || null,
        class_names: normalizedClasses,
        target_classes: normalizedClasses,

        subject,

        scheduled_date: date,
        scheduled_time:
          accessMode === "scheduled" ? time : null,

        access_mode: accessMode,

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
      console.error("Create quiz error:", error);

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
                Select the classes and subject for this quiz.
              </p>
            </div>

            <div className="mt-6 space-y-5">
              {/* CLASSES */}
              <div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                      className="rounded-lg bg-indigo-500/15 px-3 py-2 text-xs font-bold text-indigo-300 hover:bg-indigo-500/25 disabled:opacity-50"
                    >
                      Select All
                    </button>

                    <button
                      type="button"
                      onClick={clearAllClasses}
                      className="rounded-lg bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-white/10 bg-slate-900 p-4">
                  {loadingClasses ? (
                    <p className="text-sm text-slate-400">
                      Loading classes...
                    </p>
                  ) : classes.length === 0 ? (
                    <p className="text-sm text-amber-300">
                      No class found in students table.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                      {classes.map((classItem) => {
                        const selected =
                          selectedClasses.includes(
                            classItem
                          );

                        return (
                          <button
                            key={classItem}
                            type="button"
                            onClick={() =>
                              toggleClass(classItem)
                            }
                            className={`rounded-xl border px-3 py-3 text-sm font-black transition ${
                              selected
                                ? "border-indigo-400 bg-indigo-600 text-white"
                                : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                            }`}
                          >
                            {selected ? "✓ " : ""}
                            Class {classItem}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Selected:{" "}
                  {selectedClasses.length > 0
                    ? selectedClasses.join(", ")
                    : "None"}
                </p>
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
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-indigo-400"
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
                  placeholder="Quiz description"
                  className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-indigo-400"
                />
              </div>

              {/* DATE */}
              <div>
                <label className="text-sm font-bold">
                  Quiz Date
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

              {/* ACCESS MODE */}
              <div>
                <label className="text-sm font-bold">
                  Test Access
                </label>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      setAccessMode("scheduled")
                    }
                    className={`rounded-2xl border p-4 text-left transition ${
                      accessMode === "scheduled"
                        ? "border-indigo-400 bg-indigo-600 text-white"
                        : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    <div className="font-black">
                      Scheduled Time
                    </div>

                    <div className="mt-1 text-xs opacity-80">
                      Student can start the test only at
                      the scheduled time.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setAccessMode("any_time")
                    }
                    className={`rounded-2xl border p-4 text-left transition ${
                      accessMode === "any_time"
                        ? "border-emerald-400 bg-emerald-600 text-white"
                        : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    <div className="font-black">
                      Any Time
                    </div>

                    <div className="mt-1 text-xs opacity-80">
                      Student can start once anytime from
                      5:00 AM to 9:00 PM on the selected
                      date.
                    </div>
                  </button>
                </div>
              </div>

              {/* SCHEDULED TIME */}
              {accessMode === "scheduled" && (
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

                  <p className="mt-1 text-xs text-slate-500">
                    Student can start the quiz at this
                    scheduled time.
                  </p>
                </div>
              )}

              {/* ANY TIME INFO */}
              {accessMode === "any_time" && (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-4">
                  <p className="text-sm font-bold text-emerald-300">
                    Any Time Mode
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    Students can start this quiz once
                    anytime between{" "}
                    <span className="font-bold text-white">
                      5:00 AM and 9:00 PM
                    </span>{" "}
                    on the selected date.
                    <br />
                    The quiz duration remains fixed at{" "}
                    <span className="font-bold text-white">
                      30 minutes
                    </span>
                    .
                  </p>
                </div>
              )}

              {/* MARKS */}
              <div className="grid gap-5 sm:grid-cols-3">
                <div>
                  <label className="text-sm font-bold">
                    Duration
                  </label>

                  <input
                    type="number"
                    min="1"
                    value="30"
                    disabled
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none opacity-70"
                  />

                  <p className="mt-1 text-xs text-slate-500">
                    Fixed at 30 minutes
                  </p>
                </div>

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
              </div>

              {/* PASS */}
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

              {message && (
                <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-indigo-600 px-5 py-4 font-black shadow-xl shadow-indigo-950/30 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "CREATING QUIZ..."
                  : "CREATE QUIZ"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}