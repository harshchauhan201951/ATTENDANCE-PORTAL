"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type Quiz = {
  id: number;
  title: string;
  description: string | null;
  class_name: string | null;
  target_classes: string[] | null;
  subject: string | null;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  marks_per_question: number;
  negative_marks: number;
  pass_percentage: number;
  is_published: boolean;
};

type EditForm = {
  title: string;
  description: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: string;
  marks_per_question: string;
  negative_marks: string;
  pass_percentage: string;
};

const emptyEditForm: EditForm = {
  title: "",
  description: "",
  scheduled_date: "",
  scheduled_time: "",
  duration_minutes: "30",
  marks_per_question: "1",
  negative_marks: "0",
  pass_percentage: "40",
};

function normalizeClass(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase();
}

function getQuizClasses(quiz: Quiz) {
  const targets = Array.isArray(quiz.target_classes)
    ? quiz.target_classes
        .map(normalizeClass)
        .filter(Boolean)
    : [];

  if (targets.length > 0) {
    return Array.from(new Set(targets));
  }

  const legacy = normalizeClass(quiz.class_name);

  return legacy ? [legacy] : [];
}

export default function ManageQuizzesPage() {
  const router = useRouter();

  const [quizzes, setQuizzes] =
    useState<Quiz[]>([]);

  const [classes, setClasses] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [publishingId, setPublishingId] =
    useState<number | null>(null);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [savingEdit, setSavingEdit] =
    useState(false);

  const [editingQuiz, setEditingQuiz] =
    useState<Quiz | null>(null);

  const [editForm, setEditForm] =
    useState<EditForm>(emptyEditForm);

  const [editClasses, setEditClasses] =
    useState<string[]>([]);

  useEffect(() => {
    loadQuizzes();
    loadClasses();
  }, []);

  async function loadClasses() {
    const { data, error } =
      await supabase
        .from("students")
        .select("class_name")
        .not("class_name", "is", null);

    if (error) {
      console.error(
        "Load classes error:",
        error
      );
      return;
    }

    const unique = Array.from(
      new Set(
        (data || [])
          .map((item) =>
            normalizeClass(item.class_name)
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

    unique.sort((a, b) => {
      const orderA =
        classOrder[a] ?? 999;
      const orderB =
        classOrder[b] ?? 999;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return a.localeCompare(b);
    });

    setClasses(unique);
  }

  async function loadQuizzes() {
    setLoading(true);

    try {
      const { data, error } =
        await supabase
          .from("quiz_tests")
          .select("*")
          .order("scheduled_date", {
            ascending: false,
          })
          .order("scheduled_time", {
            ascending: false,
          });

      if (error) {
        console.error(
          "Load quizzes error:",
          error
        );

        alert(
          `Quizzes load nahi ho pa rahe.\n\n${error.message}`
        );

        setQuizzes([]);
        return;
      }

      setQuizzes(
        (data || []) as Quiz[]
      );
    } catch (error) {
      console.error(
        "Unexpected load quizzes error:",
        error
      );

      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  }

  async function togglePublish(
    quiz: Quiz
  ) {
    if (publishingId !== null) return;

    const newStatus =
      !quiz.is_published;

    setPublishingId(quiz.id);

    try {
      const { data, error } =
        await supabase
          .from("quiz_tests")
          .update({
            is_published: newStatus,
          })
          .eq("id", quiz.id)
          .select("id,is_published");

      if (error) {
        alert(
          `Quiz ${
            newStatus
              ? "PUBLIC"
              : "DRAFT"
          } nahi ho paya.\n\n${error.message}`
        );
        return;
      }

      if (!data || data.length === 0) {
        alert(
          "Database ne koi updated row return nahi ki. Supabase UPDATE/RLS policy check karein."
        );
        return;
      }

      await loadQuizzes();

      alert(
        newStatus
          ? "Quiz successfully PUBLIC ho gaya."
          : "Quiz successfully DRAFT mein aa gaya."
      );
    } finally {
      setPublishingId(null);
    }
  }

  async function deleteQuiz(id: number) {
    const ok = window.confirm(
      "Delete this quiz?\n\nAll questions and related quiz data may also be deleted if CASCADE is configured.\n\nAre you sure?"
    );

    if (!ok) return;

    setDeletingId(id);

    try {
      const { data, error } =
        await supabase
          .from("quiz_tests")
          .delete()
          .eq("id", id)
          .select("id");

      if (error) {
        alert(
          `Quiz delete nahi ho paya.\n\n${error.message}`
        );
        return;
      }

      if (!data || data.length === 0) {
        alert(
          "Quiz delete nahi hua. Supabase DELETE/RLS policy check karein."
        );
        return;
      }

      setQuizzes((current) =>
        current.filter(
          (quiz) => quiz.id !== id
        )
      );

      alert(
        "Quiz successfully deleted."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function openEditQuiz(quiz: Quiz) {
    setEditingQuiz(quiz);

    setEditClasses(
      getQuizClasses(quiz)
    );

    setEditForm({
      title: quiz.title || "",
      description:
        quiz.description || "",
      scheduled_date:
        quiz.scheduled_date || "",
      scheduled_time:
        quiz.scheduled_time
          ? quiz.scheduled_time.slice(
              0,
              5
            )
          : "",
      duration_minutes: String(
        quiz.duration_minutes ?? 30
      ),
      marks_per_question: String(
        quiz.marks_per_question ?? 1
      ),
      negative_marks: String(
        quiz.negative_marks ?? 0
      ),
      pass_percentage: String(
        quiz.pass_percentage ?? 40
      ),
    });
  }

  function closeEditQuiz() {
    if (savingEdit) return;

    setEditingQuiz(null);
    setEditForm(emptyEditForm);
    setEditClasses([]);
  }

  function updateEditField(
    field: keyof EditForm,
    value: string
  ) {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function toggleEditClass(
    className: string
  ) {
    setEditClasses((current) => {
      if (current.includes(className)) {
        return current.filter(
          (item) =>
            item !== className
        );
      }

      return [...current, className];
    });
  }

  function selectAllEditClasses() {
    setEditClasses(classes);
  }

  function clearEditClasses() {
    setEditClasses([]);
  }

  async function saveEditQuiz() {
    if (!editingQuiz) return;

    const title =
      editForm.title.trim();

    if (!title) {
      alert(
        "Quiz title required hai."
      );
      return;
    }

    if (editClasses.length === 0) {
      alert(
        "At least one class select karein."
      );
      return;
    }

    if (!editForm.scheduled_date) {
      alert(
        "Scheduled date select karein."
      );
      return;
    }

    if (!editForm.scheduled_time) {
      alert(
        "Scheduled time select karein."
      );
      return;
    }

    const duration = Number(
      editForm.duration_minutes
    );

    const marksPerQuestion =
      Number(
        editForm.marks_per_question
      );

    const negativeMarks =
      Number(
        editForm.negative_marks
      );

    const passPercentage =
      Number(
        editForm.pass_percentage
      );

    if (
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      alert(
        "Duration 0 se greater hona chahiye."
      );
      return;
    }

    if (
      !Number.isFinite(
        marksPerQuestion
      ) ||
      marksPerQuestion < 0
    ) {
      alert(
        "Marks per question valid hona chahiye."
      );
      return;
    }

    if (
      !Number.isFinite(
        negativeMarks
      ) ||
      negativeMarks < 0
    ) {
      alert(
        "Negative marks valid hona chahiye."
      );
      return;
    }

    if (
      !Number.isFinite(
        passPercentage
      ) ||
      passPercentage < 0 ||
      passPercentage > 100
    ) {
      alert(
        "Pass percentage 0 se 100 ke beech hona chahiye."
      );
      return;
    }

    setSavingEdit(true);

    try {
      const normalizedClasses =
        Array.from(
          new Set(
            editClasses
              .map(normalizeClass)
              .filter(Boolean)
          )
        );

      const { data, error } =
        await supabase
          .from("quiz_tests")
          .update({
            title,
            description:
              editForm.description.trim() ||
              null,

            class_name:
              normalizedClasses[0] ||
              null,

            target_classes:
              normalizedClasses,

            scheduled_date:
              editForm.scheduled_date,

            scheduled_time:
              editForm.scheduled_time,

            duration_minutes:
              duration,

            marks_per_question:
              marksPerQuestion,

            negative_marks:
              negativeMarks,

            pass_percentage:
              passPercentage,
          })
          .eq(
            "id",
            editingQuiz.id
          )
          .select("*");

      if (error) {
        alert(
          `Quiz update nahi ho paya.\n\n${error.message}`
        );
        return;
      }

      if (!data || data.length === 0) {
        alert(
          "Quiz update nahi hua. Supabase UPDATE/RLS policy check karein."
        );
        return;
      }

      setQuizzes((current) =>
        current.map((item) =>
          item.id ===
          editingQuiz.id
            ? (data[0] as Quiz)
            : item
        )
      );

      closeEditQuiz();

      await loadQuizzes();

      alert(
        "Quiz successfully update ho gaya."
      );
    } finally {
      setSavingEdit(false);
    }
  }

  function formatDate(date: string) {
    if (!date) return "Not set";

    const parsedDate =
      new Date(
        `${date}T00:00:00`
      );

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return date;
    }

    return parsedDate.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  function formatTime(time: string) {
    if (!time) return "Not set";

    const [h, m] =
      time.split(":");

    const hourNumber =
      Number(h);

    if (
      !Number.isFinite(
        hourNumber
      )
    ) {
      return time;
    }

    const period =
      hourNumber >= 12
        ? "PM"
        : "AM";

    const hour =
      hourNumber % 12 || 12;

    return `${hour}:${m || "00"} ${period}`;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        <header className="border-b border-white/10 bg-slate-950/90">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
            <div>
              <h1 className="font-black">
                MANAGE QUIZZES
              </h1>

              <p className="text-xs text-slate-400">
                Create, edit, publish and manage
              </p>
            </div>

            <button
              onClick={() =>
                router.push(
                  "/teacher/quiz-tests"
                )
              }
              className="rounded-xl bg-white/5 px-4 py-2 text-sm font-bold transition hover:bg-white/10"
            >
              ← Quiz Tests
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-8">
          <button
            onClick={() =>
              router.push(
                "/teacher/quiz-tests/create"
              )
            }
            className="mb-6 w-full rounded-2xl bg-indigo-600 px-5 py-4 font-black transition hover:bg-indigo-500"
          >
            + CREATE NEW QUIZ
          </button>

          {loading ? (
            <div className="rounded-3xl bg-white/5 p-10 text-center">
              <div className="text-lg font-bold">
                Loading quizzes...
              </div>

              <div className="mt-2 text-sm text-slate-400">
                Please wait
              </div>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
              <div className="text-4xl">
                QUIZ
              </div>

              <h2 className="mt-3 text-lg font-black">
                No quizzes created yet
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Create your first quiz to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {quizzes.map((quiz) => {
                const quizClasses =
                  getQuizClasses(quiz);

                return (
                  <div
                    key={quiz.id}
                    className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="break-words text-xl font-black">
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
                              ? "PUBLIC"
                              : "DRAFT"}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-slate-400">
                          {quiz.description ||
                            "No description"}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {quizClasses.length >
                          0 ? (
                            quizClasses.map(
                              (className) => (
                                <span
                                  key={
                                    className
                                  }
                                  className="rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-black text-indigo-300"
                                >
                                  CLASS{" "}
                                  {
                                    className
                                  }
                                </span>
                              )
                            )
                          ) : (
                            <span className="text-xs text-red-300">
                              No class assigned
                            </span>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
                          {quiz.subject && (
                            <span>
                              Subject:{" "}
                              {quiz.subject}
                            </span>
                          )}

                          <span>
                            Date:{" "}
                            {formatDate(
                              quiz.scheduled_date
                            )}
                          </span>

                          <span>
                            Time:{" "}
                            {formatTime(
                              quiz.scheduled_time
                            )}
                          </span>

                          <span>
                            {quiz.duration_minutes ??
                              30}{" "}
                            minutes
                          </span>

                          <span>
                            {quiz.marks_per_question}{" "}
                            / question
                          </span>

                          <span>
                            {quiz.negative_marks}{" "}
                            negative
                          </span>

                          <span>
                            Pass{" "}
                            {quiz.pass_percentage}%
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:max-w-3xl lg:flex-wrap lg:justify-end">
                        <button
                          onClick={() =>
                            router.push(
                              `/teacher/quiz-tests/questions?quizId=${quiz.id}`
                            )
                          }
                          className="rounded-xl bg-purple-600/20 px-4 py-3 text-sm font-bold text-purple-300 transition hover:bg-purple-600/30"
                        >
                          Questions
                        </button>

                        <button
                          onClick={() =>
                            openEditQuiz(
                              quiz
                            )
                          }
                          className="rounded-xl bg-blue-500/15 px-4 py-3 text-sm font-bold text-blue-300 transition hover:bg-blue-500/25"
                        >
                          EDIT QUIZ
                        </button>

                        <button
                          onClick={() =>
                            togglePublish(
                              quiz
                            )
                          }
                          disabled={
                            publishingId ===
                            quiz.id
                          }
                          className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                            quiz.is_published
                              ? "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                              : "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                          }`}
                        >
                          {publishingId ===
                          quiz.id
                            ? "Updating..."
                            : quiz.is_published
                            ? "Unpublish"
                            : "PUBLIC"}
                        </button>

                        <button
                          onClick={() =>
                            router.push(
                              `/teacher/quiz-tests/results?quizId=${quiz.id}`
                            )
                          }
                          className="rounded-xl bg-cyan-500/15 px-4 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-500/25"
                        >
                          Results
                        </button>

                        <button
                          onClick={() =>
                            deleteQuiz(
                              quiz.id
                            )
                          }
                          disabled={
                            deletingId ===
                            quiz.id
                          }
                          className="rounded-xl bg-red-500/15 px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500/25"
                        >
                          {deletingId ===
                          quiz.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {editingQuiz && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <h2 className="text-xl font-black">
                    EDIT QUIZ
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    Update quiz details and assigned classes
                  </p>
                </div>

                <button
                  onClick={
                    closeEditQuiz
                  }
                  disabled={
                    savingEdit
                  }
                  className="rounded-xl bg-white/5 px-4 py-2 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <div className="overflow-y-auto p-5">
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-bold">
                      Quiz Title
                    </label>

                    <input
                      type="text"
                      value={
                        editForm.title
                      }
                      onChange={(e) =>
                        updateEditField(
                          "title",
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold">
                      Description
                    </label>

                    <textarea
                      value={
                        editForm.description
                      }
                      onChange={(e) =>
                        updateEditField(
                          "description",
                          e.target.value
                        )
                      }
                      rows={3}
                      className="w-full resize-none rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold">
                        Assigned Classes
                      </label>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={
                            selectAllEditClasses
                          }
                          className="rounded-lg bg-indigo-500/15 px-3 py-2 text-xs font-bold text-indigo-300"
                        >
                          All
                        </button>

                        <button
                          type="button"
                          onClick={
                            clearEditClasses
                          }
                          className="rounded-lg bg-white/5 px-3 py-2 text-xs font-bold"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {classes.map(
                        (className) => {
                          const selected =
                            editClasses.includes(
                              className
                            );

                          return (
                            <button
                              key={
                                className
                              }
                              type="button"
                              onClick={() =>
                                toggleEditClass(
                                  className
                                )
                              }
                              className={`rounded-xl border px-3 py-3 text-sm font-black ${
                                selected
                                  ? "border-indigo-400 bg-indigo-600"
                                  : "border-white/10 bg-white/5 text-slate-300"
                              }`}
                            >
                              {selected
                                ? "✓ "
                                : ""}
                              {className}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-bold">
                        Scheduled Date
                      </label>

                      <input
                        type="date"
                        value={
                          editForm.scheduled_date
                        }
                        onChange={(e) =>
                          updateEditField(
                            "scheduled_date",
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold">
                        Scheduled Time
                      </label>

                      <input
                        type="time"
                        value={
                          editForm.scheduled_time
                        }
                        onChange={(e) =>
                          updateEditField(
                            "scheduled_time",
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-bold">
                        Duration
                      </label>

                      <input
                        type="number"
                        min="1"
                        value={
                          editForm.duration_minutes
                        }
                        onChange={(e) =>
                          updateEditField(
                            "duration_minutes",
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold">
                        Marks / Question
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          editForm.marks_per_question
                        }
                        onChange={(e) =>
                          updateEditField(
                            "marks_per_question",
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-bold">
                        Negative Marks
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          editForm.negative_marks
                        }
                        onChange={(e) =>
                          updateEditField(
                            "negative_marks",
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold">
                        Pass Percentage
                      </label>

                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={
                          editForm.pass_percentage
                        }
                        onChange={(e) =>
                          updateEditField(
                            "pass_percentage",
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 p-5">
                <div className="flex gap-3">
                  <button
                    onClick={
                      closeEditQuiz
                    }
                    disabled={
                      savingEdit
                    }
                    className="flex-1 rounded-xl bg-white/5 px-5 py-3 font-bold"
                  >
                    CANCEL
                  </button>

                  <button
                    onClick={
                      saveEditQuiz
                    }
                    disabled={
                      savingEdit
                    }
                    className="flex-1 rounded-xl bg-indigo-600 px-5 py-3 font-black disabled:opacity-50"
                  >
                    {savingEdit
                      ? "SAVING..."
                      : "SAVE CHANGES"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}