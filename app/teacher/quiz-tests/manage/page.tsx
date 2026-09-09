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

export default function ManageQuizzesPage() {
  const router = useRouter();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  const [editForm, setEditForm] = useState<EditForm>({
    title: "",
    description: "",
    scheduled_date: "",
    scheduled_time: "",
    duration_minutes: "30",
    marks_per_question: "1",
    negative_marks: "0",
    pass_percentage: "40",
  });

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
      console.error("Load quizzes error:", error);
      alert(`Unable to load quizzes:\n${error.message}`);
      setQuizzes([]);
    } else {
      setQuizzes((data || []) as Quiz[]);
    }

    setLoading(false);
  }

  async function togglePublish(quiz: Quiz) {
    if (publishingId !== null) return;

    const newPublishedStatus = !quiz.is_published;

    setPublishingId(quiz.id);

    try {
      const { data, error } = await supabase
        .from("quiz_tests")
        .update({
          is_published: newPublishedStatus,
        })
        .eq("id", quiz.id)
        .select("id, is_published")
        .single();

      if (error) {
        console.error("Publish update error:", error);

        alert(
          `Quiz ${newPublishedStatus ? "publish" : "unpublish"} nahi ho paya.\n\n` +
            `${error.message}`
        );

        return;
      }

      if (!data) {
        alert(
          "Quiz update nahi hua.\n\n" +
            "Supabase RLS policy update ko block kar rahi ho sakti hai."
        );

        return;
      }

      setQuizzes((current) =>
        current.map((item) =>
          item.id === quiz.id
            ? {
                ...item,
                is_published: data.is_published,
              }
            : item
        )
      );

      alert(
        data.is_published
          ? "Quiz successfully PUBLIC ho gaya."
          : "Quiz successfully DRAFT mein aa gaya."
      );
    } catch (error) {
      console.error("Unexpected publish error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Quiz publish karte waqt unexpected error aaya."
      );
    } finally {
      setPublishingId(null);
    }
  }

  async function deleteQuiz(id: number) {
    const ok = window.confirm(
      "Delete this quiz? All questions, options and results will also be deleted."
    );

    if (!ok) return;

    setDeletingId(id);

    try {
      const { error } = await supabase
        .from("quiz_tests")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Delete quiz error:", error);
        alert(error.message);
        return;
      }

      setQuizzes((current) =>
        current.filter((quiz) => quiz.id !== id)
      );
    } catch (error) {
      console.error("Unexpected delete error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Quiz delete karte waqt error aaya."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function openQuickEdit(quiz: Quiz) {
    setEditingQuiz(quiz);

    setEditForm({
      title: quiz.title || "",
      description: quiz.description || "",
      scheduled_date: quiz.scheduled_date || "",
      scheduled_time: quiz.scheduled_time
        ? quiz.scheduled_time.slice(0, 5)
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

  function closeQuickEdit() {
    if (savingEdit) return;

    setEditingQuiz(null);

    setEditForm({
      title: "",
      description: "",
      scheduled_date: "",
      scheduled_time: "",
      duration_minutes: "30",
      marks_per_question: "1",
      negative_marks: "0",
      pass_percentage: "40",
    });
  }

  async function saveQuickEdit() {
    if (!editingQuiz) return;

    if (!editForm.title.trim()) {
      alert("Quiz title required hai.");
      return;
    }

    if (!editForm.scheduled_date) {
      alert("Scheduled date select karein.");
      return;
    }

    if (!editForm.scheduled_time) {
      alert("Scheduled time select karein.");
      return;
    }

    const duration = Number(editForm.duration_minutes);
    const marksPerQuestion = Number(
      editForm.marks_per_question
    );
    const negativeMarks = Number(
      editForm.negative_marks
    );
    const passPercentage = Number(
      editForm.pass_percentage
    );

    if (!Number.isFinite(duration) || duration <= 0) {
      alert("Duration valid number hona chahiye.");
      return;
    }

    if (
      !Number.isFinite(marksPerQuestion) ||
      marksPerQuestion < 0
    ) {
      alert("Marks per question valid hona chahiye.");
      return;
    }

    if (
      !Number.isFinite(negativeMarks) ||
      negativeMarks < 0
    ) {
      alert("Negative marks valid hona chahiye.");
      return;
    }

    if (
      !Number.isFinite(passPercentage) ||
      passPercentage < 0 ||
      passPercentage > 100
    ) {
      alert("Pass percentage 0 se 100 ke beech hona chahiye.");
      return;
    }

    setSavingEdit(true);

    try {
      const { data, error } = await supabase
        .from("quiz_tests")
        .update({
          title: editForm.title.trim(),
          description: editForm.description.trim() || null,
          scheduled_date: editForm.scheduled_date,
          scheduled_time: editForm.scheduled_time,
          duration_minutes: duration,
          marks_per_question: marksPerQuestion,
          negative_marks: negativeMarks,
          pass_percentage: passPercentage,
        })
        .eq("id", editingQuiz.id)
        .select("*")
        .single();

      if (error) {
        console.error("Quick edit error:", error);

        alert(
          `Quiz update nahi ho paya.\n\n${error.message}`
        );

        return;
      }

      if (!data) {
        alert(
          "Quiz update nahi hua.\n\n" +
            "Supabase RLS policy update ko block kar rahi ho sakti hai."
        );

        return;
      }

      setQuizzes((current) =>
        current.map((quiz) =>
          quiz.id === editingQuiz.id
            ? (data as Quiz)
            : quiz
        )
      );

      setEditingQuiz(null);

      alert("Quiz successfully update ho gaya.");
    } catch (error) {
      console.error("Unexpected quick edit error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Quiz update karte waqt unexpected error aaya."
      );
    } finally {
      setSavingEdit(false);
    }
  }

  function formatDate(date: string) {
    if (!date) return "Not set";

    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatTime(time: string) {
    if (!time) return "Not set";

    const [h, m] = time.split(":");
    let hour = Number(h);

    if (!Number.isFinite(hour)) {
      return time;
    }

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
              <h1 className="font-black">
                MANAGE QUIZZES
              </h1>

              <p className="text-xs text-slate-400">
                Create, edit, publish and manage
              </p>
            </div>

            <button
              onClick={() =>
                router.push("/teacher/quiz-tests")
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
                  className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
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
                        {quiz.description ||
                          "No description"}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
                        <span>
                          📅{" "}
                          {formatDate(
                            quiz.scheduled_date
                          )}
                        </span>

                        <span>
                          ⏰{" "}
                          {formatTime(
                            quiz.scheduled_time
                          )}
                        </span>

                        <span>
                          ⏱️{" "}
                          {quiz.duration_minutes ??
                            30}{" "}
                          minutes
                        </span>

                        <span>
                          🎯{" "}
                          {quiz.marks_per_question}{" "}
                          / question
                        </span>

                        <span>
                          ➖ {quiz.negative_marks}{" "}
                          negative
                        </span>

                        <span>
                          🏆 Pass{" "}
                          {quiz.pass_percentage}%
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap">
                      <button
                        onClick={() =>
                          router.push(
                            `/teacher/quiz-tests/questions?quizId=${quiz.id}`
                          )
                        }
                        className="rounded-xl bg-purple-600/20 px-4 py-3 text-sm font-bold text-purple-300 transition hover:bg-purple-600/30"
                      >
                        ❓ Questions
                      </button>

                      <button
                        onClick={() =>
                          openQuickEdit(quiz)
                        }
                        className="rounded-xl bg-blue-500/15 px-4 py-3 text-sm font-bold text-blue-300 transition hover:bg-blue-500/25"
                      >
                        ✏️ EDIT QUICK
                      </button>

                      <button
                        onClick={() =>
                          togglePublish(quiz)
                        }
                        disabled={
                          publishingId === quiz.id
                        }
                        className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                          quiz.is_published
                            ? "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                            : "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                        } ${
                          publishingId === quiz.id
                            ? "cursor-not-allowed opacity-50"
                            : ""
                        }`}
                      >
                        {publishingId === quiz.id
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
                        📊 Results
                      </button>

                      <button
                        onClick={() =>
                          deleteQuiz(quiz.id)
                        }
                        disabled={
                          deletingId === quiz.id
                        }
                        className={`rounded-xl bg-red-500/15 px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500/25 ${
                          deletingId === quiz.id
                            ? "cursor-not-allowed opacity-50"
                            : ""
                        }`}
                      >
                        {deletingId === quiz.id
                          ? "Deleting..."
                          : "🗑 Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {editingQuiz && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-900/95 px-5 py-4 backdrop-blur">
                <div>
                  <h2 className="text-xl font-black">
                    EDIT QUICK
                  </h2>

                  <p className="text-xs text-slate-400">
                    Quickly update quiz details
                  </p>
                </div>

                <button
                  onClick={closeQuickEdit}
                  disabled={savingEdit}
                  className="rounded-xl bg-white/5 px-4 py-2 text-xl font-bold text-slate-300 hover:bg-white/10"
                >
                  ×
                </button>
              </div>

              <div className="space-y-5 p-5">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-300">
                    Quiz Title
                  </label>

                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
                    placeholder="Enter quiz title"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-300">
                    Description
                  </label>

                  <textarea
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        description:
                          e.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full resize-none rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
                    placeholder="Quiz description"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-300">
                      Scheduled Date
                    </label>

                    <input
                      type="date"
                      value={
                        editForm.scheduled_date
                      }
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          scheduled_date:
                            e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-300">
                      Scheduled Time
                    </label>

                    <input
                      type="time"
                      value={
                        editForm.scheduled_time
                      }
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          scheduled_time:
                            e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-300">
                      Duration (minutes)
                    </label>

                    <input
                      type="number"
                      min="1"
                      value={
                        editForm.duration_minutes
                      }
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          duration_minutes:
                            e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-300">
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
                        setEditForm((prev) => ({
                          ...prev,
                          marks_per_question:
                            e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-300">
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
                        setEditForm((prev) => ({
                          ...prev,
                          negative_marks:
                            e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-300">
                      Pass Percentage
                    </label>

                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={
                        editForm.pass_percentage
                      }
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          pass_percentage:
                            e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <button
                    onClick={closeQuickEdit}
                    disabled={savingEdit}
                    className="flex-1 rounded-xl bg-white/5 px-5 py-3 font-bold text-slate-300 transition hover:bg-white/10"
                  >
                    CANCEL
                  </button>

                  <button
                    onClick={saveQuickEdit}
                    disabled={savingEdit}
                    className="flex-1 rounded-xl bg-indigo-600 px-5 py-3 font-black transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
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