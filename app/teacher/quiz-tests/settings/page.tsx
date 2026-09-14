"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
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

const SUBJECTS = [
  "Hindi",
  "English",
  "Mathematics",
  "Science",
  "Social Science",
  "General Knowledge",
  "Others",
];

const CLASS_OPTIONS = [
  "Nursery",
  "LKG",
  "UKG",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
];

function normalizeClass(value: string) {
  return value.trim().toUpperCase();
}

function getClassLabel(value: string) {
  return value;
}

export default function QuizSettingsPage() {
  const router = useRouter();

  const [quizzes, setQuizzes] =
    useState<Quiz[]>([]);

  const [selectedQuizId, setSelectedQuizId] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [subject, setSubject] =
    useState("");

  const [targetClasses, setTargetClasses] =
    useState<string[]>([]);

  const [scheduledDate, setScheduledDate] =
    useState("");

  const [scheduledTime, setScheduledTime] =
    useState("");

  const [durationMinutes, setDurationMinutes] =
    useState("30");

  const [marksPerQuestion, setMarksPerQuestion] =
    useState("1");

  const [negativeMarks, setNegativeMarks] =
    useState("0");

  const [passPercentage, setPassPercentage] =
    useState("40");

  const [isPublished, setIsPublished] =
    useState(false);

  /*
   * LOAD ALL QUIZZES
   */
  useEffect(() => {
    async function loadQuizzes() {
      setLoading(true);
      setError("");

      const {
        data,
        error: quizError,
      } = await supabase
        .from("quiz_tests")
        .select("*")
        .order("scheduled_date", {
          ascending: false,
        })
        .order("scheduled_time", {
          ascending: false,
        });

      if (quizError) {
        console.error(
          "Quiz settings loading error:",
          quizError
        );

        setError(
          quizError.message
        );

        setLoading(false);
        return;
      }

      const loadedQuizzes =
        (data || []) as Quiz[];

      setQuizzes(
        loadedQuizzes
      );

      if (
        loadedQuizzes.length > 0
      ) {
        setSelectedQuizId(
          String(
            loadedQuizzes[0].id
          )
        );
      }

      setLoading(false);
    }

    loadQuizzes();
  }, []);

  /*
   * CURRENT SELECTED QUIZ
   */
  const selectedQuiz =
    useMemo(() => {
      return quizzes.find(
        (quiz) =>
          String(quiz.id) ===
          selectedQuizId
      ) || null;
    }, [
      quizzes,
      selectedQuizId,
    ]);

  /*
   * LOAD SELECTED QUIZ INTO FORM
   */
  useEffect(() => {
    if (!selectedQuiz) {
      return;
    }

    setTitle(
      selectedQuiz.title || ""
    );

    setDescription(
      selectedQuiz.description || ""
    );

    setSubject(
      selectedQuiz.subject || ""
    );

    let classes: string[] = [];

    if (
      Array.isArray(
        selectedQuiz.target_classes
      )
    ) {
      classes =
        selectedQuiz.target_classes
          .map((item) =>
            normalizeClass(
              String(item)
            )
          )
          .filter(Boolean);
    }

    /*
     * Legacy quiz support.
     */
    if (
      classes.length === 0 &&
      selectedQuiz.class_name
    ) {
      classes = [
        normalizeClass(
          selectedQuiz.class_name
        ),
      ];
    }

    setTargetClasses(
      Array.from(
        new Set(classes)
      )
    );

    setScheduledDate(
      selectedQuiz.scheduled_date ||
        ""
    );

    setScheduledTime(
      selectedQuiz.scheduled_time ||
        ""
    );

    setDurationMinutes(
      String(
        selectedQuiz.duration_minutes ||
          30
      )
    );

    setMarksPerQuestion(
      String(
        selectedQuiz.marks_per_question ??
          1
      )
    );

    setNegativeMarks(
      String(
        selectedQuiz.negative_marks ??
          0
      )
    );

    setPassPercentage(
      String(
        selectedQuiz.pass_percentage ??
          40
      )
    );

    setIsPublished(
      Boolean(
        selectedQuiz.is_published
      )
    );

    setMessage("");
    setError("");
  }, [selectedQuiz]);

  /*
   * CLASS SELECT / UNSELECT
   */
  function toggleClass(
    className: string
  ) {
    const normalized =
      normalizeClass(className);

    setTargetClasses(
      (current) => {
        if (
          current.includes(
            normalized
          )
        ) {
          return current.filter(
            (item) =>
              item !== normalized
          );
        }

        return [
          ...current,
          normalized,
        ];
      }
    );
  }

  /*
   * SELECT ALL CLASSES
   */
  function selectAllClasses() {
    setTargetClasses(
      CLASS_OPTIONS.map(
        normalizeClass
      )
    );
  }

  /*
   * CLEAR ALL CLASSES
   */
  function clearAllClasses() {
    setTargetClasses([]);
  }

  /*
   * SAVE SETTINGS
   */
  async function saveSettings() {
    if (!selectedQuiz) {
      setError(
        "Please select a quiz."
      );
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const cleanTitle =
        title.trim();

      if (!cleanTitle) {
        throw new Error(
          "Quiz title is required."
        );
      }

      if (!subject) {
        throw new Error(
          "Please select a subject."
        );
      }

      if (!scheduledDate) {
        throw new Error(
          "Scheduled date is required."
        );
      }

      if (!scheduledTime) {
        throw new Error(
          "Scheduled time is required."
        );
      }

      /*
       * At least one class is
       * recommended.
       */
      if (
        targetClasses.length === 0
      ) {
        throw new Error(
          "Please select at least one class."
        );
      }

      const duration =
        Number(
          durationMinutes
        );

      const marks =
        Number(
          marksPerQuestion
        );

      const negative =
        Number(
          negativeMarks
        );

      const pass =
        Number(
          passPercentage
        );

      if (
        !Number.isFinite(
          duration
        ) ||
        duration <= 0
      ) {
        throw new Error(
          "Duration must be greater than 0."
        );
      }

      if (
        !Number.isFinite(
          marks
        ) ||
        marks <= 0
      ) {
        throw new Error(
          "Marks per question must be greater than 0."
        );
      }

      if (
        !Number.isFinite(
          negative
        ) ||
        negative < 0
      ) {
        throw new Error(
          "Negative marks cannot be negative."
        );
      }

      if (
        !Number.isFinite(
          pass
        ) ||
        pass < 0 ||
        pass > 100
      ) {
        throw new Error(
          "Pass percentage must be between 0 and 100."
        );
      }

      /*
       * IMPORTANT:
       *
       * Only quiz settings are
       * updated.
       *
       * Questions/results are
       * NOT touched.
       */
      const {
        error: updateError,
      } = await supabase
        .from("quiz_tests")
        .update({
          title:
            cleanTitle,

          description:
            description.trim() ||
            null,

          subject,

          target_classes:
            targetClasses,

          /*
           * Keep the first class in
           * legacy class_name as well.
           */
          class_name:
            targetClasses.length > 0
              ? targetClasses[0]
              : null,

          scheduled_date:
            scheduledDate,

          scheduled_time:
            scheduledTime,

          duration_minutes:
            duration,

          marks_per_question:
            marks,

          negative_marks:
            negative,

          pass_percentage:
            pass,

          is_published:
            isPublished,
        })
        .eq(
          "id",
          selectedQuiz.id
        );

      if (updateError) {
        throw new Error(
          updateError.message
        );
      }

      /*
       * Update local quiz list
       * immediately.
       */
      setQuizzes(
        (current) =>
          current.map(
            (quizItem) =>
              quizItem.id ===
              selectedQuiz.id
                ? {
                    ...quizItem,
                    title:
                      cleanTitle,
                    description:
                      description.trim() ||
                      null,
                    subject,
                    target_classes:
                      targetClasses,
                    class_name:
                      targetClasses.length >
                      0
                        ? targetClasses[0]
                        : null,
                    scheduled_date:
                      scheduledDate,
                    scheduled_time:
                      scheduledTime,
                    duration_minutes:
                      duration,
                    marks_per_question:
                      marks,
                    negative_marks:
                      negative,
                    pass_percentage:
                      pass,
                    is_published:
                      isPublished,
                  }
                : quizItem
          )
      );

      setMessage(
        "Quiz settings saved successfully."
      );
    } catch (saveError) {
      console.error(
        "Quiz settings save error:",
        saveError
      );

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save quiz settings."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-4 border-white/10 border-t-indigo-500" />

          <p className="font-bold">
            Loading Quiz Settings...
          </p>
        </div>
      </main>
    );
  }

  if (
    quizzes.length === 0
  ) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
          <header className="border-b border-white/10 bg-slate-950/90">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
              <div>
                <h1 className="font-black">
                  QUIZ SETTINGS
                </h1>

                <p className="text-xs text-slate-400">
                  Teacher controls
                </p>
              </div>

              <button
                onClick={() =>
                  router.push(
                    "/teacher/quiz-tests"
                  )
                }
                className="rounded-xl bg-white/5 px-4 py-2 text-sm font-bold"
              >
                ← Back
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-5xl px-4 py-12">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
              <div className="text-5xl">
                📝
              </div>

              <h2 className="mt-5 text-2xl font-black">
                No Quizzes Found
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Create a quiz first, then
                its settings can be changed
                here.
              </p>

              <button
                onClick={() =>
                  router.push(
                    "/teacher/quiz-tests"
                  )
                }
                className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-black"
              >
                Go to Quiz Tests
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        {/* HEADER */}
        <header className="border-b border-white/10 bg-slate-950/90">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
            <div>
              <h1 className="font-black">
                QUIZ SETTINGS
              </h1>

              <p className="text-xs text-slate-400">
                Change quiz rules and settings
              </p>
            </div>

            <button
              onClick={() =>
                router.push(
                  "/teacher/quiz-tests"
                )
              }
              className="rounded-xl bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10"
            >
              ← Back
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-8">
          {/* QUIZ SELECTOR */}
          <section className="mb-6 rounded-3xl border border-indigo-400/20 bg-indigo-500/10 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-black">
                  Select Quiz
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Select the quiz whose settings
                  you want to change.
                </p>
              </div>

              <select
                value={
                  selectedQuizId
                }
                onChange={(e) => {
                  setSelectedQuizId(
                    e.target.value
                  );
                  setMessage("");
                  setError("");
                }}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-indigo-400 md:max-w-xl"
              >
                {quizzes.map(
                  (quizItem) => (
                    <option
                      key={
                        quizItem.id
                      }
                      value={
                        quizItem.id
                      }
                      className="bg-slate-950"
                    >
                      {
                        quizItem.title
                      }{" "}
                      —{" "}
                      {
                        quizItem.scheduled_date
                      }
                    </option>
                  )
                )}
              </select>
            </div>
          </section>

          {selectedQuiz && (
            <>
              {/* BASIC INFORMATION */}
              <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
                <div className="mb-6">
                  <h2 className="text-xl font-black">
                    Basic Information
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Edit the basic information
                    of this quiz.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-bold text-slate-300">
                      Quiz Title
                    </label>

                    <input
                      type="text"
                      value={title}
                      onChange={(e) =>
                        setTitle(
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-400"
                      placeholder="Enter quiz title"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-bold text-slate-300">
                      Description
                    </label>

                    <textarea
                      value={
                        description
                      }
                      onChange={(e) =>
                        setDescription(
                          e.target.value
                        )
                      }
                      rows={4}
                      className="w-full resize-none rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-400"
                      placeholder="Enter quiz description"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-300">
                      Subject
                    </label>

                    <select
                      value={subject}
                      onChange={(e) =>
                        setSubject(
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-400"
                    >
                      <option
                        value=""
                        className="bg-slate-950"
                      >
                        Select Subject
                      </option>

                      {SUBJECTS.map(
                        (
                          item
                        ) => (
                          <option
                            key={
                              item
                            }
                            value={
                              item
                            }
                            className="bg-slate-950"
                          >
                            {
                              item
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-300">
                      Current Status
                    </label>

                    <div
                      className={`rounded-xl p-3 text-center text-sm font-black ${
                        isPublished
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {isPublished
                        ? "PUBLISHED"
                        : "DRAFT"}
                    </div>
                  </div>
                </div>
              </section>

              {/* CLASSES */}
              <section className="mt-6 rounded-3xl border border-purple-400/20 bg-purple-500/10 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-black">
                      Quiz Classes
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                      Select all classes that
                      should be able to see this
                      quiz.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={
                        selectAllClasses
                      }
                      className="rounded-lg bg-white/10 px-3 py-2 text-xs font-black hover:bg-white/15"
                    >
                      Select All
                    </button>

                    <button
                      type="button"
                      onClick={
                        clearAllClasses
                      }
                      className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-black text-red-300 hover:bg-red-500/20"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                  {CLASS_OPTIONS.map(
                    (className) => {
                      const normalized =
                        normalizeClass(
                          className
                        );

                      const checked =
                        targetClasses.includes(
                          normalized
                        );

                      return (
                        <button
                          key={
                            className
                          }
                          type="button"
                          onClick={() =>
                            toggleClass(
                              className
                            )
                          }
                          className={`rounded-xl border p-3 text-sm font-black transition ${
                            checked
                              ? "border-indigo-400 bg-indigo-500/20 text-indigo-200"
                              : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                          }`}
                        >
                          {checked
                            ? "✓ "
                            : ""}
                          Class{" "}
                          {
                            getClassLabel(
                              className
                            )
                          }
                        </button>
                      );
                    }
                  )}
                </div>

                <div className="mt-4 rounded-xl bg-black/20 p-4">
                  <p className="text-xs font-bold text-slate-500">
                    SELECTED CLASSES
                  </p>

                  <p className="mt-2 text-sm font-black text-white">
                    {targetClasses.length >
                    0
                      ? targetClasses.join(
                          ", "
                        )
                      : "No class selected"}
                  </p>
                </div>
              </section>

              {/* SCHEDULE */}
              <section className="mt-6 rounded-3xl border border-blue-400/20 bg-blue-500/10 p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-black">
                    Schedule
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Change when the quiz becomes
                    available to students.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-300">
                      Scheduled Date
                    </label>

                    <input
                      type="date"
                      value={
                        scheduledDate
                      }
                      onChange={(e) =>
                        setScheduledDate(
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-300">
                      Scheduled Time
                    </label>

                    <input
                      type="time"
                      value={
                        scheduledTime
                      }
                      onChange={(e) =>
                        setScheduledTime(
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-300">
                      Duration (Minutes)
                    </label>

                    <input
                      type="number"
                      min="1"
                      value={
                        durationMinutes
                      }
                      onChange={(e) =>
                        setDurationMinutes(
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>
              </section>

              {/* MARKING */}
              <section className="mt-6 rounded-3xl border border-red-400/20 bg-red-500/10 p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-black">
                    Marking Settings
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Change marks and passing
                    rules for this quiz.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-300">
                      Marks Per Question
                    </label>

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={
                        marksPerQuestion
                      }
                      onChange={(e) =>
                        setMarksPerQuestion(
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-400"
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
                        negativeMarks
                      }
                      onChange={(e) =>
                        setNegativeMarks(
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-400"
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
                        passPercentage
                      }
                      onChange={(e) =>
                        setPassPercentage(
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>
              </section>

              {/* PUBLISH */}
              <section className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-6">
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-black">
                      Publish Status
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                      Published quizzes can be
                      shown to eligible students.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setIsPublished(
                        (value) =>
                          !value
                      )
                    }
                    className={`rounded-2xl px-6 py-4 font-black ${
                      isPublished
                        ? "bg-emerald-500 text-white"
                        : "bg-white/10 text-slate-300"
                    }`}
                  >
                    {isPublished
                      ? "✓ PUBLISHED"
                      : "DRAFT — CLICK TO PUBLISH"}
                  </button>
                </div>
              </section>

              {/* INFORMATION */}
              <section className="mt-6 rounded-3xl border border-amber-400/20 bg-amber-500/10 p-6">
                <div className="text-4xl">
                  🔒
                </div>

                <h2 className="mt-4 text-xl font-black">
                  Important
                </h2>

                <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                  <p>
                    ✓ Changing settings does not
                    delete questions.
                  </p>

                  <p>
                    ✓ Existing student results
                    remain saved.
                  </p>

                  <p>
                    ✓ Multiple classes can be
                    selected.
                  </p>

                  <p>
                    ✓ Teachers can change the
                    duration.
                  </p>

                  <p>
                    ✓ Teachers can change marks
                    and negative marking.
                  </p>

                  <p>
                    ✓ Teachers can publish or
                    unpublish the quiz.
                  </p>
                </div>
              </section>

              {/* MESSAGES */}
              {error && (
                <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm font-bold text-red-300">
                  {error}
                </div>
              )}

              {message && (
                <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">
                  ✓ {message}
                </div>
              )}

              {/* SAVE BUTTON */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/teacher/quiz-tests"
                    )
                  }
                  className="rounded-2xl bg-white/5 px-6 py-4 font-black hover:bg-white/10"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    saveSettings
                  }
                  disabled={saving}
                  className="rounded-2xl bg-indigo-600 px-8 py-4 font-black shadow-xl shadow-indigo-950/40 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : "Save Quiz Settings"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}