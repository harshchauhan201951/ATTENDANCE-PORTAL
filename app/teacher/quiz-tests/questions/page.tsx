"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

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

type QuizOption = {
  id?: number;
  question_id?: number;
  option_text: string;
  option_order: number;
  is_correct: boolean;
};

type QuestionItem = {
  id?: number;
  quiz_id?: number;
  question_text: string;
  question_order: number;
  options: QuizOption[];
  isNew?: boolean;
};

type ParsedQuestion = {
  question_text: string;
  options: string[];
  answerIndex: number | null;
};

function normalizeAnswer(value: string): number | null {
  const clean = value.trim().toUpperCase();

  if (clean === "A" || clean === "A.") || clean === "1") return 0;
  if (clean === "B" || clean === "B.") || clean === "2") return 1;
  if (clean === "C" || clean === "C.") || clean === "3") return 2;
  if (clean === "D" || clean === "D.") || clean === "4") return 3;

  const match = clean.match(/[ABCD]/);

  if (!match) return null;

  return ["A", "B", "C", "D"].indexOf(match[0]);
}

function parseBulkQuestions(text: string): ParsedQuestion[] {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  if (!normalized) {
    return [];
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const questions: ParsedQuestion[] = [];

  let currentQuestion: ParsedQuestion | null = null;
  let currentOptionIndex: number | null = null;

  function pushCurrent() {
    if (!currentQuestion) return;

    const cleanedQuestion = currentQuestion.question_text.trim();

    const cleanedOptions = currentQuestion.options.map((item) =>
      item.trim()
    );

    if (!cleanedQuestion) {
      currentQuestion = null;
      currentOptionIndex = null;
      return;
    }

    if (cleanedOptions.length === 4) {
      questions.push({
        question_text: cleanedQuestion,
        options: cleanedOptions,
        answerIndex: currentQuestion.answerIndex,
      });
    }

    currentQuestion = null;
    currentOptionIndex = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    const questionMatch = line.match(
      /^(?:Q(?:UESTION)?\s*)?(\d+)\s*[\.\):\-]\s*(.+)$/i
    );

    if (questionMatch) {
      pushCurrent();

      currentQuestion = {
        question_text: questionMatch[2].trim(),
        options: [],
        answerIndex: null,
      };

      currentOptionIndex = null;
      continue;
    }

    const answerMatch = line.match(
      /^(?:ANSWER|ANS|CORRECT\s*ANSWER|RIGHT\s*ANSWER)\s*[:\-]?\s*([ABCD1-4])\b/i
    );

    if (answerMatch && currentQuestion) {
      currentQuestion.answerIndex = normalizeAnswer(answerMatch[1]);
      continue;
    }

    const optionMatch = line.match(
      /^([ABCD])\s*[\.\):\-]\s*(.+)$/i
    );

    if (optionMatch && currentQuestion) {
      const letter = optionMatch[1].toUpperCase();
      const index = ["A", "B", "C", "D"].indexOf(letter);

      if (index !== -1) {
        while (currentQuestion.options.length < index) {
          currentQuestion.options.push("");
        }

        currentQuestion.options[index] = optionMatch[2].trim();
        currentOptionIndex = index;
        continue;
      }
    }

    const numberedOptionMatch = line.match(
      /^([1-4])\s*[\.\):\-]\s*(.+)$/i
    );

    if (numberedOptionMatch && currentQuestion) {
      const index = Number(numberedOptionMatch[1]) - 1;

      while (currentQuestion.options.length < index) {
        currentQuestion.options.push("");
      }

      currentQuestion.options[index] = numberedOptionMatch[2].trim();
      currentOptionIndex = index;
      continue;
    }

    if (currentQuestion && currentOptionIndex !== null) {
      currentQuestion.options[currentOptionIndex] =
        `${currentQuestion.options[currentOptionIndex]} ${line}`.trim();
    } else if (currentQuestion) {
      currentQuestion.question_text =
        `${currentQuestion.question_text} ${line}`.trim();
    }
  }

  pushCurrent();

  return questions.filter(
    (question) =>
      question.question_text.trim().length > 0 &&
      question.options.length === 4 &&
      question.options.every((option) => option.trim().length > 0)
  );
}

function TeacherQuizQuestionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const quizIdParam =
    searchParams.get("quizId") ||
    searchParams.get("id") ||
    searchParams.get("testId");

  const quizId = Number(quizIdParam);

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [pasteText, setPasteText] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showPasteBox, setShowPasteBox] = useState(true);

  const validQuizId = Number.isInteger(quizId) && quizId > 0;

  const loadQuizAndQuestions = useCallback(async () => {
    if (!validQuizId) {
      setError("Invalid quiz ID.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { data: quizData, error: quizError } = await supabase
        .from("quiz_tests")
        .select(
          "id,title,description,scheduled_date,scheduled_time,duration_minutes,marks_per_question,negative_marks,pass_percentage,is_published"
        )
        .eq("id", quizId)
        .maybeSingle();

      if (quizError) {
        throw new Error(
          `Unable to load quiz: ${quizError.message}`
        );
      }

      if (!quizData) {
        throw new Error("Quiz not found.");
      }

      setQuiz(quizData as Quiz);

      const {
        data: questionData,
        error: questionError,
      } = await supabase
        .from("quiz_questions")
        .select("id,quiz_id,question_text,question_order")
        .eq("quiz_id", quizId)
        .order("question_order", { ascending: true });

      if (questionError) {
        throw new Error(
          `Unable to load questions: ${questionError.message}`
        );
      }

      const questionRows = (questionData || []) as Array<{
        id: number;
        quiz_id: number;
        question_text: string;
        question_order: number;
      }>;

      if (questionRows.length === 0) {
        setQuestions([]);
        return;
      }

      const questionIds = questionRows.map((question) => question.id);

      const {
        data: optionData,
        error: optionError,
      } = await supabase
        .from("quiz_options")
        .select(
          "id,question_id,option_text,option_order,is_correct"
        )
        .in("question_id", questionIds)
        .order("option_order", { ascending: true });

      if (optionError) {
        throw new Error(
          `Unable to load options: ${optionError.message}`
        );
      }

      const optionRows = (optionData || []) as QuizOption[];

      const combined: QuestionItem[] = questionRows.map(
        (question) => {
          const questionOptions = optionRows
            .filter(
              (option) =>
                Number(option.question_id) === Number(question.id)
            )
            .sort(
              (a, b) =>
                Number(a.option_order) -
                Number(b.option_order)
            );

          const options: QuizOption[] = [0, 1, 2, 3].map(
            (index) => {
              const existing = questionOptions.find(
                (option) =>
                  Number(option.option_order) === index + 1
              );

              return (
                existing || {
                  question_id: question.id,
                  option_text: "",
                  option_order: index + 1,
                  is_correct: false,
                }
              );
            }
          );

          return {
            id: question.id,
            quiz_id: question.quiz_id,
            question_text: question.question_text || "",
            question_order: question.question_order,
            options,
          };
        }
      );

      setQuestions(combined);
    } catch (loadError) {
      console.error("Questions page loading error:", loadError);

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load quiz questions."
      );
    } finally {
      setLoading(false);
    }
  }, [quizId, validQuizId]);

  useEffect(() => {
    void loadQuizAndQuestions();
  }, [loadQuizAndQuestions]);

  const totalQuestions = questions.length;

  const completedQuestions = useMemo(() => {
    return questions.filter(
      (question) =>
        question.question_text.trim() &&
        question.options.length === 4 &&
        question.options.every(
          (option) => option.option_text.trim()
        ) &&
        question.options.some(
          (option) => option.is_correct
        )
    ).length;
  }, [questions]);

  function updateQuestionText(
    questionIndex: number,
    value: string
  ) {
    setQuestions((current) =>
      current.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              question_text: value,
            }
          : question
      )
    );
  }

  function updateOptionText(
    questionIndex: number,
    optionIndex: number,
    value: string
  ) {
    setQuestions((current) =>
      current.map((question, index) => {
        if (index !== questionIndex) {
          return question;
        }

        return {
          ...question,
          options: question.options.map(
            (option, currentOptionIndex) =>
              currentOptionIndex === optionIndex
                ? {
                    ...option,
                    option_text: value,
                  }
                : option
          ),
        };
      })
    );
  }

  function selectCorrectOption(
    questionIndex: number,
    optionIndex: number
  ) {
    setQuestions((current) =>
      current.map((question, index) => {
        if (index !== questionIndex) {
          return question;
        }

        return {
          ...question,
          options: question.options.map(
            (option, currentOptionIndex) => ({
              ...option,
              is_correct:
                currentOptionIndex === optionIndex,
            })
          ),
        };
      })
    );
  }

  function addManualQuestion() {
    setQuestions((current) => [
      ...current,
      {
        question_text: "",
        question_order: current.length + 1,
        options: [
          {
            option_text: "",
            option_order: 1,
            is_correct: false,
          },
          {
            option_text: "",
            option_order: 2,
            is_correct: false,
          },
          {
            option_text: "",
            option_order: 3,
            is_correct: false,
          },
          {
            option_text: "",
            option_order: 4,
            is_correct: false,
          },
        ],
        isNew: true,
      },
    ]);
  }

  function removeLocalQuestion(questionIndex: number) {
    setQuestions((current) =>
      current
        .filter((_, index) => index !== questionIndex)
        .map((question, index) => ({
          ...question,
          question_order: index + 1,
        }))
    );
  }

  async function deleteSavedQuestion(
    questionIndex: number,
    questionId: number
  ) {
    const confirmed = window.confirm(
      "Delete this question and its options?"
    );

    if (!confirmed) return;

    setDeletingId(questionId);
    setError("");

    try {
      const { error: optionDeleteError } = await supabase
        .from("quiz_options")
        .delete()
        .eq("question_id", questionId);

      if (optionDeleteError) {
        throw new Error(
          `Unable to delete options: ${optionDeleteError.message}`
        );
      }

      const { error: questionDeleteError } = await supabase
        .from("quiz_questions")
        .delete()
        .eq("id", questionId)
        .eq("quiz_id", quizId);

      if (questionDeleteError) {
        throw new Error(
          `Unable to delete question: ${questionDeleteError.message}`
        );
      }

      setQuestions((current) =>
        current
          .filter((_, index) => index !== questionIndex)
          .map((question, index) => ({
            ...question,
            question_order: index + 1,
          }))
      );

      setMessage("Question deleted successfully.");
    } catch (deleteError) {
      console.error("Delete question error:", deleteError);

      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete question."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function handleParsePaste() {
    setError("");
    setMessage("");

    const parsed = parseBulkQuestions(pasteText);

    if (parsed.length === 0) {
      setError(
        "No complete questions found. Use Question + A/B/C/D format."
      );
      return;
    }

    const newQuestions: QuestionItem[] = parsed.map(
      (item, index) => ({
        question_text: item.question_text,
        question_order: questions.length + index + 1,
        options: item.options.map(
          (optionText, optionIndex) => ({
            option_text: optionText,
            option_order: optionIndex + 1,
            is_correct:
              item.answerIndex === optionIndex,
          })
        ),
        isNew: true,
      })
    );

    setQuestions((current) => [
      ...current,
      ...newQuestions,
    ]);

    setPasteText("");
    setMessage(
      `${parsed.length} question${
        parsed.length === 1 ? "" : "s"
      } added. Select the correct answers and save.`
    );

    setShowPasteBox(false);
  }

  function moveQuestion(
    questionIndex: number,
    direction: "up" | "down"
  ) {
    setQuestions((current) => {
      const targetIndex =
        direction === "up"
          ? questionIndex - 1
          : questionIndex + 1;

      if (
        targetIndex < 0 ||
        targetIndex >= current.length
      ) {
        return current;
      }

      const copy = [...current];

      const temp = copy[questionIndex];
      copy[questionIndex] = copy[targetIndex];
      copy[targetIndex] = temp;

      return copy.map((question, index) => ({
        ...question,
        question_order: index + 1,
      }));
    });
  }

  async function saveAllQuestions() {
    if (!validQuizId) {
      setError("Invalid quiz ID.");
      return;
    }

    if (!quiz) {
      setError("Quiz information is not loaded.");
      return;
    }

    if (questions.length === 0) {
      setError("Please add at least one question.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      for (const question of questions) {
        const cleanQuestion =
          question.question_text.trim();

        if (!cleanQuestion) {
          throw new Error(
            `Question ${question.question_order} is empty.`
          );
        }

        if (question.options.length !== 4) {
          throw new Error(
            `Question ${question.question_order} must have exactly 4 options.`
          );
        }

        const cleanOptions = question.options.map(
          (option) => option.option_text.trim()
        );

        if (cleanOptions.some((option) => !option)) {
          throw new Error(
            `Please fill all 4 options for Question ${question.question_order}.`
          );
        }

        const correctCount = question.options.filter(
          (option) => option.is_correct
        ).length;

        if (correctCount !== 1) {
          throw new Error(
            `Question ${question.question_order} must have exactly one correct answer.`
          );
        }
      }

      /*
       * Temporarily move saved question orders high enough
       * to avoid unique-order conflicts during reordering.
       */
      const savedQuestions = questions.filter(
        (question) => question.id
      );

      if (savedQuestions.length > 0) {
        const temporaryOrderBase =
          100000 + Date.now() % 10000;

        for (
          let index = 0;
          index < savedQuestions.length;
          index++
        ) {
          const question = savedQuestions[index];

          const { error } = await supabase
            .from("quiz_questions")
            .update({
              question_order:
                temporaryOrderBase + index,
            })
            .eq("id", question.id)
            .eq("quiz_id", quizId);

          if (error) {
            throw new Error(
              `Unable to prepare question order: ${error.message}`
            );
          }
        }
      }

      const finalQuestions: QuestionItem[] = [];

      for (
        let index = 0;
        index < questions.length;
        index++
      ) {
        const question = questions[index];

        let questionId = question.id;

        if (questionId) {
          const { data, error } = await supabase
            .from("quiz_questions")
            .update({
              question_text:
                question.question_text.trim(),
              question_order: index + 1,
            })
            .eq("id", questionId)
            .eq("quiz_id", quizId)
            .select("id,quiz_id,question_text,question_order")
            .maybeSingle();

          if (error) {
            throw new Error(
              `Unable to save Question ${
                index + 1
              }: ${error.message}`
            );
          }

          if (!data) {
            throw new Error(
              `Question ${index + 1} could not be updated.`
            );
          }

          questionId = Number(data.id);
        } else {
          const { data, error } = await supabase
            .from("quiz_questions")
            .insert({
              quiz_id: quizId,
              question_text:
                question.question_text.trim(),
              question_order: index + 1,
            })
            .select(
              "id,quiz_id,question_text,question_order"
            )
            .single();

          if (error) {
            throw new Error(
              `Unable to create Question ${
                index + 1
              }: ${error.message}`
            );
          }

          if (!data) {
            throw new Error(
              `Question ${index + 1} was not created.`
            );
          }

          questionId = Number(data.id);
        }

        /*
         * Save exactly four options.
         * Updating existing rows first avoids depending on
         * delete/reinsert behavior.
         */
        const existingOptionIds =
          question.options
            .map((option) => option.id)
            .filter(
              (id): id is number =>
                typeof id === "number" && id > 0
            );

        if (existingOptionIds.length > 0) {
          const { error: deleteOldError } =
            await supabase
              .from("quiz_options")
              .delete()
              .eq("question_id", questionId);

          if (deleteOldError) {
            throw new Error(
              `Unable to replace options for Question ${
                index + 1
              }: ${deleteOldError.message}`
            );
          }
        }

        const optionRows = question.options.map(
          (option, optionIndex) => ({
            question_id: questionId,
            option_text:
              option.option_text.trim(),
            option_order: optionIndex + 1,
            is_correct: option.is_correct,
          })
        );

        const { data: insertedOptions, error: optionError } =
          await supabase
            .from("quiz_options")
            .insert(optionRows)
            .select(
              "id,question_id,option_text,option_order,is_correct"
            );

        if (optionError) {
          throw new Error(
            `Unable to save options for Question ${
              index + 1
            }: ${optionError.message}`
          );
        }

        finalQuestions.push({
          id: questionId,
          quiz_id: quizId,
          question_text:
            question.question_text.trim(),
          question_order: index + 1,
          options:
            (insertedOptions as QuizOption[]) ||
            optionRows,
        });
      }

      setQuestions(finalQuestions);
      setMessage(
        `${finalQuestions.length} question${
          finalQuestions.length === 1 ? "" : "s"
        } and all options saved successfully.`
      );
    } catch (saveError) {
      console.error("Save questions error:", saveError);

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save questions and options."
      );

      /*
       * Reload from DB so the page never keeps a misleading
       * local state after a failed database operation.
       */
      await loadQuizAndQuestions();
    } finally {
      setSaving(false);
    }
  }

  function formatDate(date: string) {
    if (!date) return "-";

    const parsed = new Date(
      `${date}T00:00:00+05:30`
    );

    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatTime(time: string) {
    if (!time) return "-";

    const parts = time.split(":");

    let hour = Number(parts[0]);
    const minute = parts[1] || "00";

    if (Number.isNaN(hour)) {
      return time;
    }

    const period = hour >= 12 ? "PM" : "AM";

    hour = hour % 12;

    if (hour === 0) {
      hour = 12;
    }

    return `${hour}:${minute} ${period}`;
  }

  if (!validQuizId) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-400/20 bg-red-500/10 p-8 text-center">
          <h1 className="text-2xl font-black">
            Invalid Quiz ID
          </h1>

          <p className="mt-3 text-sm text-slate-300">
            Open Questions from a specific quiz.
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/teacher/quiz-tests"
              )
            }
            className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold hover:bg-indigo-500"
          >
            Back to Quiz Tests
          </button>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />

          <p className="text-sm text-slate-400">
            Loading quiz questions...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        {/* HEADER */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Teacher Panel
              </p>

              <h1 className="truncate text-xl font-black sm:text-2xl">
                Quiz Questions
              </h1>

              {quiz && (
                <p className="mt-1 truncate text-sm text-slate-400">
                  {quiz.title}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/teacher/quiz-tests"
                )
              }
              className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
            >
              Back
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* QUIZ INFO */}
          {quiz && (
            <section className="mb-6 rounded-3xl border border-indigo-400/20 bg-gradient-to-r from-indigo-600/20 to-purple-600/10 p-5">
              <div className="flex flex-wrap gap-3 text-xs text-slate-300">
                <span className="rounded-full bg-white/10 px-3 py-1.5">
                  Date: {formatDate(quiz.scheduled_date)}
                </span>

                <span className="rounded-full bg-white/10 px-3 py-1.5">
                  Time: {formatTime(quiz.scheduled_time)}
                </span>

                <span className="rounded-full bg-white/10 px-3 py-1.5">
                  Duration: {quiz.duration_minutes} min
                </span>

                <span className="rounded-full bg-white/10 px-3 py-1.5">
                  Marks: {quiz.marks_per_question}
                </span>

                <span className="rounded-full bg-white/10 px-3 py-1.5">
                  Negative: {quiz.negative_marks}
                </span>

                <span className="rounded-full bg-white/10 px-3 py-1.5">
                  Pass: {quiz.pass_percentage}%
                </span>
              </div>
            </section>
          )}

          {/* MESSAGES */}
          {error && (
            <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
              {message}
            </div>
          )}

          {/* BULK PASTE */}
          <section className="mb-8 overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent">
            <button
              type="button"
              onClick={() =>
                setShowPasteBox((current) => !current)
              }
              className="flex w-full items-center justify-between gap-4 p-5 text-left"
            >
              <div>
                <h2 className="text-lg font-black">
                  Bulk Paste Questions
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Copy questions and A/B/C/D options directly from ChatGPT and
                  paste them here.
                </p>
              </div>

              <span className="text-xl text-cyan-300">
                {showPasteBox ? "−" : "+"}
              </span>
            </button>

            {showPasteBox && (
              <div className="border-t border-white/10 p-5">
                <textarea
                  value={pasteText}
                  onChange={(event) =>
                    setPasteText(event.target.value)
                  }
                  placeholder={`Paste like this:

1. What is the capital of India?
A. Mumbai
B. New Delhi
C. Kolkata
D. Chennai

2. Which planet is known as the Red Planet?
A. Earth
B. Venus
C. Mars
D. Jupiter`}
                  className="min-h-[260px] w-full rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40"
                />

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleParsePaste}
                    disabled={!pasteText.trim()}
                    className="rounded-xl bg-cyan-600 px-5 py-3 text-sm font-black transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Parse Questions
                  </button>

                  <button
                    type="button"
                    onClick={() => setPasteText("")}
                    className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-white/10"
                  >
                    Clear
                  </button>

                  <p className="text-xs text-slate-500">
                    Supports numbered questions, Q1 format, A/B/C/D and
                    optional Answer: B.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* TOP ACTIONS */}
          <section className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black">
                Questions ({totalQuestions})
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {completedQuestions} of {totalQuestions} questions are ready.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addManualQuestion}
                className="rounded-xl border border-purple-400/20 bg-purple-500/10 px-4 py-3 text-sm font-black text-purple-300 hover:bg-purple-500/20"
              >
                + Add Question
              </button>

              <button
                type="button"
                onClick={saveAllQuestions}
                disabled={saving || totalQuestions === 0}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving
                  ? "Saving..."
                  : "Save All Questions"}
              </button>
            </div>
          </section>

          {/* EMPTY STATE */}
          {questions.length === 0 && (
            <section className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-10 text-center">
              <div className="text-5xl">?</div>

              <h3 className="mt-4 text-xl font-black">
                No questions yet
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">
                Paste all your ChatGPT questions above or add questions
                manually.
              </p>

              <button
                type="button"
                onClick={addManualQuestion}
                className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black hover:bg-indigo-500"
              >
                + Add First Question
              </button>
            </section>
          )}

          {/* QUESTIONS */}
          <section className="space-y-5">
            {questions.map((question, questionIndex) => {
              const correctIndex =
                question.options.findIndex(
                  (option) => option.is_correct
                );

              const isReady =
                question.question_text.trim() &&
                question.options.length === 4 &&
                question.options.every(
                  (option) =>
                    option.option_text.trim()
                ) &&
                correctIndex !== -1;

              return (
                <article
                  key={
                    question.id ??
                    `new-${questionIndex}`
                  }
                  className={`rounded-3xl border bg-white/5 p-5 shadow-xl ${
                    isReady
                      ? "border-emerald-400/15"
                      : "border-amber-400/20"
                  }`}
                >
                  {/* QUESTION HEADER */}
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 font-black text-indigo-300">
                        {questionIndex + 1}
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Question {questionIndex + 1}
                        </p>

                        <p
                          className={`text-xs font-bold ${
                            isReady
                              ? "text-emerald-400"
                              : "text-amber-400"
                          }`}
                        >
                          {isReady
                            ? "Ready"
                            : "Needs attention"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={questionIndex === 0}
                        onClick={() =>
                          moveQuestion(
                            questionIndex,
                            "up"
                          )
                        }
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold disabled:opacity-30"
                      >
                        ↑ Up
                      </button>

                      <button
                        type="button"
                        disabled={
                          questionIndex ===
                          questions.length - 1
                        }
                        onClick={() =>
                          moveQuestion(
                            questionIndex,
                            "down"
                          )
                        }
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold disabled:opacity-30"
                      >
                        ↓ Down
                      </button>

                      {question.id ? (
                        <button
                          type="button"
                          disabled={
                            deletingId === question.id
                          }
                          onClick={() =>
                            deleteSavedQuestion(
                              questionIndex,
                              question.id as number
                            )
                          }
                          className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20 disabled:opacity-40"
                        >
                          {deletingId ===
                          question.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            removeLocalQuestion(
                              questionIndex
                            )
                          }
                          className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* QUESTION TEXT */}
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-300">
                      Question
                    </label>

                    <textarea
                      value={question.question_text}
                      onChange={(event) =>
                        updateQuestionText(
                          questionIndex,
                          event.target.value
                        )
                      }
                      placeholder="Enter question..."
                      className="min-h-[100px] w-full rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-indigo-400/40"
                    />
                  </div>

                  {/* OPTIONS */}
                  <div className="mt-6">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <label className="text-sm font-bold text-slate-300">
                        Options
                      </label>

                      <span className="text-xs text-slate-500">
                        Click an option to mark it as the correct answer.
                      </span>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {question.options.map(
                        (option, optionIndex) => {
                          const letter =
                            ["A", "B", "C", "D"][
                              optionIndex
                            ];

                          const selected =
                            option.is_correct;

                          return (
                            <button
                              type="button"
                              key={`${question.id ?? questionIndex}-${optionIndex}`}
                              onClick={() =>
                                selectCorrectOption(
                                  questionIndex,
                                  optionIndex
                                )
                              }
                              className={`rounded-2xl border p-3 text-left transition ${
                                selected
                                  ? "border-emerald-400/60 bg-emerald-500/10"
                                  : "border-white/10 bg-slate-950/50 hover:border-indigo-400/30"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                                    selected
                                      ? "bg-emerald-500 text-white"
                                      : "bg-white/10 text-slate-300"
                                  }`}
                                >
                                  {letter}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <input
                                    type="text"
                                    value={
                                      option.option_text
                                    }
                                    onChange={(event) =>
                                      updateOptionText(
                                        questionIndex,
                                        optionIndex,
                                        event.target.value
                                      )
                                    }
                                    onClick={(event) =>
                                      event.stopPropagation()
                                    }
                                    placeholder={`Option ${letter}`}
                                    className="w-full border-0 bg-transparent px-0 py-2 text-sm text-white outline-none placeholder:text-slate-600"
                                  />

                                  <div
                                    className={`text-[11px] font-black uppercase ${
                                      selected
                                        ? "text-emerald-400"
                                        : "text-slate-600"
                                    }`}
                                  >
                                    {selected
                                      ? "Correct Answer"
                                      : "Click to mark correct"}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          {/* BOTTOM SAVE */}
          {questions.length > 0 && (
            <section className="mt-8 rounded-3xl border border-emerald-400/20 bg-emerald-500/5 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-black">
                    Ready to save?
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    Make sure every question has 4 options and exactly one
                    correct answer.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={saveAllQuestions}
                  disabled={saving}
                  className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black hover:bg-emerald-500 disabled:opacity-40"
                >
                  {saving
                    ? "Saving Questions..."
                    : "Save All Questions"}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

export default function TeacherQuizQuestionsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
          <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
            Loading...
          </div>
        </main>
      }
    >
      <TeacherQuizQuestionsContent />
    </Suspense>
  );
}