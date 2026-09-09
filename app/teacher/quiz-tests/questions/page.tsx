"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

type QuizOption = {
  id?: number;
  option_text: string;
  option_order: number;
  is_correct: boolean;
};

type QuizQuestion = {
  id?: number;
  question_text: string;
  question_order: number;
  marks: number;
};

type QuizQuestionWithOptions = QuizQuestion & {
  options: QuizOption[];
};

function QuestionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const quizIdParam = searchParams.get("quizId");
  const quizId = Number(quizIdParam);

  const [quiz, setQuiz] = useState<Quiz | null>(null);

  const [questions, setQuestions] = useState<
    QuizQuestionWithOptions[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadQuizAndQuestions = useCallback(async () => {
    if (!Number.isInteger(quizId) || quizId <= 0) {
      setError("Invalid quiz ID.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { data: quizData, error: quizError } =
        await supabase
          .from("quiz_tests")
          .select(
            `
            id,
            title,
            description,
            scheduled_date,
            scheduled_time,
            duration_minutes,
            marks_per_question,
            negative_marks,
            pass_percentage,
            is_published
            `
          )
          .eq("id", quizId)
          .maybeSingle();

      if (quizError) {
        throw new Error(quizError.message);
      }

      if (!quizData) {
        throw new Error("Quiz was not found.");
      }

      setQuiz(quizData as Quiz);

      const {
        data: questionData,
        error: questionError,
      } = await supabase
        .from("quiz_questions")
        .select(
          `
          id,
          quiz_id,
          question_text,
          question_order,
          marks
          `
        )
        .eq("quiz_id", quizId)
        .order("question_order", {
          ascending: true,
        });

      if (questionError) {
        throw new Error(questionError.message);
      }

      const loadedQuestions = questionData || [];

      const questionIds = loadedQuestions.map(
        (question) => question.id
      );

      let optionData: Array<{
        id: number;
        question_id: number;
        option_text: string;
        option_order: number;
        is_correct: boolean;
      }> = [];

      if (questionIds.length > 0) {
        const {
          data: options,
          error: optionError,
        } = await supabase
          .from("quiz_options")
          .select(
            `
            id,
            question_id,
            option_text,
            option_order,
            is_correct
            `
          )
          .in("question_id", questionIds)
          .order("option_order", {
            ascending: true,
          });

        if (optionError) {
          throw new Error(optionError.message);
        }

        optionData = options || [];
      }

      const formattedQuestions: QuizQuestionWithOptions[] =
        loadedQuestions.map((question) => ({
          id: question.id,
          question_text: question.question_text,
          question_order: question.question_order,
          marks:
            question.marks !== null
              ? Number(question.marks)
              : Number(quizData.marks_per_question),
          options: optionData
            .filter(
              (option) =>
                option.question_id === question.id
            )
            .sort(
              (a, b) =>
                a.option_order - b.option_order
            )
            .map((option) => ({
              id: option.id,
              option_text: option.option_text,
              option_order: option.option_order,
              is_correct: option.is_correct,
            })),
        }));

      setQuestions(formattedQuestions);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load quiz."
      );
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    void loadQuizAndQuestions();
  }, [loadQuizAndQuestions]);

  const totalMarks = useMemo(
    () =>
      questions.reduce(
        (sum, question) =>
          sum + Number(question.marks || 0),
        0
      ),
    [questions]
  );

  function addQuestion() {
    const defaultMarks =
      Number(quiz?.marks_per_question) || 1;

    setQuestions((current) => [
      ...current,
      {
        question_text: "",
        question_order: current.length + 1,
        marks: defaultMarks,
        options: [
          {
            option_text: "",
            option_order: 1,
            is_correct: true,
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
      },
    ]);
  }

  function removeQuestion(questionIndex: number) {
    setQuestions((current) =>
      current
        .filter(
          (_, index) => index !== questionIndex
        )
        .map((question, index) => ({
          ...question,
          question_order: index + 1,
          options: question.options.map(
            (option, optionIndex) => ({
              ...option,
              option_order: optionIndex + 1,
            })
          ),
        }))
    );
  }

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

  function updateQuestionMarks(
    questionIndex: number,
    value: string
  ) {
    const marks = Number(value);

    setQuestions((current) =>
      current.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              marks:
                Number.isFinite(marks) && marks >= 0
                  ? marks
                  : 0,
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
      current.map((question, qIndex) =>
        qIndex === questionIndex
          ? {
              ...question,
              options: question.options.map(
                (option, oIndex) =>
                  oIndex === optionIndex
                    ? {
                        ...option,
                        option_text: value,
                      }
                    : option
              ),
            }
          : question
      )
    );
  }

  function setCorrectOption(
    questionIndex: number,
    optionIndex: number
  ) {
    setQuestions((current) =>
      current.map((question, qIndex) =>
        qIndex === questionIndex
          ? {
              ...question,
              options: question.options.map(
                (option, oIndex) => ({
                  ...option,
                  is_correct:
                    oIndex === optionIndex,
                })
              ),
            }
          : question
      )
    );
  }

  function addOption(questionIndex: number) {
    setQuestions((current) =>
      current.map((question, qIndex) => {
        if (qIndex !== questionIndex) {
          return question;
        }

        return {
          ...question,
          options: [
            ...question.options,
            {
              option_text: "",
              option_order:
                question.options.length + 1,
              is_correct: false,
            },
          ],
        };
      })
    );
  }

  function removeOption(
    questionIndex: number,
    optionIndex: number
  ) {
    setQuestions((current) =>
      current.map((question, qIndex) => {
        if (qIndex !== questionIndex) {
          return question;
        }

        if (question.options.length <= 2) {
          return question;
        }

        const wasCorrect =
          question.options[optionIndex]?.is_correct;

        let updatedOptions = question.options
          .filter(
            (_, index) => index !== optionIndex
          )
          .map((option, index) => ({
            ...option,
            option_order: index + 1,
          }));

        if (
          wasCorrect &&
          updatedOptions.length > 0
        ) {
          updatedOptions = updatedOptions.map(
            (option, index) => ({
              ...option,
              is_correct: index === 0,
            })
          );
        }

        return {
          ...question,
          options: updatedOptions,
        };
      })
    );
  }

  function validateQuestions() {
    if (questions.length === 0) {
      return "Please add at least one question.";
    }

    for (
      let qIndex = 0;
      qIndex < questions.length;
      qIndex++
    ) {
      const question = questions[qIndex];

      if (!question.question_text.trim()) {
        return `Question ${
          qIndex + 1
        } cannot be empty.`;
      }

      if (
        !Number.isFinite(Number(question.marks)) ||
        Number(question.marks) < 0
      ) {
        return `Invalid marks in Question ${
          qIndex + 1
        }.`;
      }

      if (question.options.length < 2) {
        return `Question ${
          qIndex + 1
        } must have at least 2 options.`;
      }

      const validOptions =
        question.options.filter((option) =>
          option.option_text.trim()
        );

      if (validOptions.length < 2) {
        return `Question ${
          qIndex + 1
        } must have at least 2 filled options.`;
      }

      const correctOptions =
        question.options.filter(
          (option) =>
            option.option_text.trim() &&
            option.is_correct
        );

      if (correctOptions.length !== 1) {
        return `Question ${
          qIndex + 1
        } must have exactly one correct answer.`;
      }
    }

    return "";
  }

  async function saveQuestions(): Promise<boolean> {
    setError("");
    setMessage("");

    const validationError =
      validateQuestions();

    if (validationError) {
      setError(validationError);
      return false;
    }

    if (!quiz) {
      setError("Quiz information is missing.");
      return false;
    }

    setSaving(true);

    try {
      /*
       * Get ALL questions currently stored for this quiz.
       */
      const {
        data: existingQuestions,
        error: existingError,
      } = await supabase
        .from("quiz_questions")
        .select("id, question_order")
        .eq("quiz_id", quiz.id)
        .order("question_order", {
          ascending: true,
        });

      if (existingError) {
        throw new Error(existingError.message);
      }

      /*
       * IDs that are still present in the editor.
       */
      const currentQuestionIds = questions
        .map((question) => question.id)
        .filter(
          (id): id is number =>
            typeof id === "number"
        );

      /*
       * Temporarily move ALL existing questions to
       * unique high order numbers.
       *
       * This prevents duplicate question_order
       * constraint errors while reordering questions.
       */
      if (
        existingQuestions &&
        existingQuestions.length > 0
      ) {
        for (
          let index = 0;
          index < existingQuestions.length;
          index++
        ) {
          const existingQuestion =
            existingQuestions[index];

          const temporaryOrder =
            1000000 + index + 1;

          const {
            error: temporaryOrderError,
          } = await supabase
            .from("quiz_questions")
            .update({
              question_order: temporaryOrder,
            })
            .eq("id", existingQuestion.id)
            .eq("quiz_id", quiz.id);

          if (temporaryOrderError) {
            throw new Error(
              temporaryOrderError.message
            );
          }
        }
      }

      /*
       * Delete questions removed from the editor.
       */
      const idsToDelete = (
        existingQuestions || []
      )
        .map((question) => question.id)
        .filter(
          (id) =>
            !currentQuestionIds.includes(id)
        );

      if (idsToDelete.length > 0) {
        const {
          error: deleteError,
        } = await supabase
          .from("quiz_questions")
          .delete()
          .in("id", idsToDelete);

        if (deleteError) {
          throw new Error(
            deleteError.message
          );
        }
      }

      const savedQuestions: QuizQuestionWithOptions[] =
        [];

      /*
       * Save every question.
       */
      for (
        let index = 0;
        index < questions.length;
        index++
      ) {
        const question = questions[index];

        let questionId = question.id;

        const finalQuestionOrder = index + 1;

        if (questionId) {
          /*
           * IMPORTANT FIX:
           *
           * Do NOT use .single().
           *
           * maybeSingle() safely handles an empty
           * response without throwing:
           * "Cannot coerce the result to a single JSON object"
           */
          const {
            data,
            error,
          } = await supabase
            .from("quiz_questions")
            .update({
              question_text:
                question.question_text.trim(),
              question_order:
                finalQuestionOrder,
              marks: Number(question.marks),
            })
            .eq("id", questionId)
            .eq("quiz_id", quiz.id)
            .select(
              `
              id,
              question_text,
              question_order,
              marks
              `
            )
            .maybeSingle();

          if (error) {
            throw new Error(
              error.message
            );
          }

          if (!data) {
            throw new Error(
              `Question ID ${questionId} could not be updated.`
            );
          }

          questionId = data.id;
        } else {
          /*
           * IMPORTANT FIX:
           *
           * Use maybeSingle() instead of single()
           * for the insert response.
           */
          const {
            data,
            error,
          } = await supabase
            .from("quiz_questions")
            .insert({
              quiz_id: quiz.id,
              question_text:
                question.question_text.trim(),
              question_order:
                finalQuestionOrder,
              marks: Number(question.marks),
            })
            .select(
              `
              id,
              question_text,
              question_order,
              marks
              `
            )
            .maybeSingle();

          if (error) {
            throw new Error(
              error.message
            );
          }

          if (!data) {
            throw new Error(
              "Question was inserted but Supabase did not return the new question."
            );
          }

          questionId = data.id;
        }

        /*
         * Synchronize options for this question.
         */
        const {
          data: existingOptions,
          error: existingOptionsError,
        } = await supabase
          .from("quiz_options")
          .select("id")
          .eq("question_id", questionId);

        if (existingOptionsError) {
          throw new Error(
            existingOptionsError.message
          );
        }

        const currentOptionIds =
          question.options
            .map((option) => option.id)
            .filter(
              (id): id is number =>
                typeof id === "number"
            );

        const optionIdsToDelete =
          (existingOptions || [])
            .map((option) => option.id)
            .filter(
              (id) =>
                !currentOptionIds.includes(id)
            );

        if (optionIdsToDelete.length > 0) {
          const {
            error: deleteOptionsError,
          } = await supabase
            .from("quiz_options")
            .delete()
            .in(
              "id",
              optionIdsToDelete
            );

          if (deleteOptionsError) {
            throw new Error(
              deleteOptionsError.message
            );
          }
        }

        /*
         * Save options.
         */
        for (
          let optionIndex = 0;
          optionIndex < question.options.length;
          optionIndex++
        ) {
          const option =
            question.options[optionIndex];

          if (!option.option_text.trim()) {
            continue;
          }

          if (option.id) {
            const {
              error: optionUpdateError,
            } = await supabase
              .from("quiz_options")
              .update({
                option_text:
                  option.option_text.trim(),
                option_order:
                  optionIndex + 1,
                is_correct:
                  option.is_correct,
              })
              .eq("id", option.id)
              .eq(
                "question_id",
                questionId
              );

            if (optionUpdateError) {
              throw new Error(
                optionUpdateError.message
              );
            }
          } else {
            const {
              error: optionInsertError,
            } = await supabase
              .from("quiz_options")
              .insert({
                question_id: questionId,
                option_text:
                  option.option_text.trim(),
                option_order:
                  optionIndex + 1,
                is_correct:
                  option.is_correct,
              });

            if (optionInsertError) {
              throw new Error(
                optionInsertError.message
              );
            }
          }
        }

        savedQuestions.push({
          ...question,
          id: questionId,
          question_order:
            finalQuestionOrder,
        });
      }

      setQuestions(savedQuestions);

      setMessage(
        "Questions and options saved successfully."
      );

      return true;
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save questions."
      );

      return false;
    } finally {
      setSaving(false);
    }
  }

  async function publishQuiz() {
    setError("");
    setMessage("");

    const validationError =
      validateQuestions();

    if (validationError) {
      setError(
        `Save valid questions before publishing. ${validationError}`
      );
      return;
    }

    setPublishing(true);

    try {
      const saveSuccessful =
        await saveQuestions();

      if (!saveSuccessful) {
        return;
      }

      const {
        data: latestQuestions,
        error: latestError,
      } = await supabase
        .from("quiz_questions")
        .select("id")
        .eq("quiz_id", quizId);

      if (latestError) {
        throw new Error(
          latestError.message
        );
      }

      if (
        !latestQuestions ||
        latestQuestions.length === 0
      ) {
        throw new Error(
          "At least one question is required."
        );
      }

      const { error: publishError } =
        await supabase
          .from("quiz_tests")
          .update({
            is_published: true,
          })
          .eq("id", quizId);

      if (publishError) {
        throw new Error(
          publishError.message
        );
      }

      setQuiz((current) =>
        current
          ? {
              ...current,
              is_published: true,
            }
          : current
      );

      setMessage(
        "Quiz published successfully. Students can attempt it at the scheduled time."
      );
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Unable to publish quiz."
      );
    } finally {
      setPublishing(false);
    }
  }

  function formatDateTime() {
    if (!quiz) {
      return "";
    }

    const date = new Date(
      `${quiz.scheduled_date}T${quiz.scheduled_time.slice(
        0,
        8
      )}`
    );

    return date.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={containerStyle}>
          <div style={loadingStyle}>
            Loading Quiz Questions...
          </div>
        </div>
      </main>
    );
  }

  if (error && !quiz) {
    return (
      <main style={pageStyle}>
        <div style={containerStyle}>
          <div style={cardStyle}>
            <h1 style={headingStyle}>
              📝 Quiz Questions
            </h1>

            <div style={errorBoxStyle}>
              {error}
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/teacher/quiz-tests"
                )
              }
              style={secondaryButtonStyle}
            >
              ← Back to Quiz Tests
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={wideContainerStyle}>
        <header style={headerStyle}>
          <div>
            <div style={badgeStyle}>
              TEACHER • QUESTION BUILDER
            </div>

            <h1 style={mainHeadingStyle}>
              🧠 {quiz?.title}
            </h1>

            <p style={subTextStyle}>
              Build MCQ questions, select correct
              answers and set marks.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/teacher/quiz-tests"
              )
            }
            style={secondaryButtonStyle}
          >
            ← Quiz Dashboard
          </button>
        </header>

        {quiz && (
          <section style={quizInfoStyle}>
            <div>
              <span style={infoLabel}>
                SCHEDULE
              </span>
              <strong>
                {formatDateTime()}
              </strong>
            </div>

            <div>
              <span style={infoLabel}>
                DURATION
              </span>
              <strong>
                {quiz.duration_minutes} minutes
              </strong>
            </div>

            <div>
              <span style={infoLabel}>
                DEFAULT MARKS
              </span>
              <strong>
                {quiz.marks_per_question}
              </strong>
            </div>

            <div>
              <span style={infoLabel}>
                NEGATIVE
              </span>
              <strong>
                {quiz.negative_marks}
              </strong>
            </div>

            <div>
              <span style={infoLabel}>
                PASS
              </span>
              <strong>
                {quiz.pass_percentage}%
              </strong>
            </div>

            <div>
              <span style={infoLabel}>
                TOTAL MARKS
              </span>
              <strong>{totalMarks}</strong>
            </div>
          </section>
        )}

        {error && (
          <div style={errorBoxStyle}>
            {error}
          </div>
        )}

        {message && (
          <div style={successBoxStyle}>
            {message}
          </div>
        )}

        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 15,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                color: "#0f172a",
                fontSize: 24,
                fontWeight: 900,
              }}
            >
              Questions
            </h2>

            <p
              style={{
                margin: "5px 0 0",
                color: "#64748b",
                fontSize: 14,
              }}
            >
              {questions.length} question
              {questions.length === 1
                ? ""
                : "s"}{" "}
              added
            </p>
          </div>

          <button
            type="button"
            onClick={addQuestion}
            style={addQuestionButtonStyle}
          >
            ＋ Add Question
          </button>
        </section>

        {questions.length === 0 ? (
          <section style={emptyStyle}>
            <div
              style={{
                fontSize: 50,
                marginBottom: 12,
              }}
            >
              📝
            </div>

            <h2
              style={{
                margin: 0,
                color: "#0f172a",
              }}
            >
              No questions yet
            </h2>

            <p
              style={{
                color: "#64748b",
                margin: "8px 0 20px",
              }}
            >
              Add your first MCQ question to start
              building this quiz.
            </p>

            <button
              type="button"
              onClick={addQuestion}
              style={addQuestionButtonStyle}
            >
              ＋ Add First Question
            </button>
          </section>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 20,
            }}
          >
            {questions.map(
              (question, questionIndex) => (
                <article
                  key={
                    question.id ??
                    `new-${questionIndex}`
                  }
                  style={questionCardStyle}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "flex-start",
                      gap: 15,
                      marginBottom: 18,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div
                        style={
                          questionNumberStyle
                        }
                      >
                        {questionIndex + 1}
                      </div>

                      <div>
                        <h3
                          style={{
                            margin: 0,
                            color: "#0f172a",
                            fontSize: 18,
                            fontWeight: 900,
                          }}
                        >
                          Question{" "}
                          {questionIndex + 1}
                        </h3>

                        <p
                          style={{
                            margin: "4px 0 0",
                            color: "#94a3b8",
                            fontSize: 12,
                          }}
                        >
                          Select exactly one
                          correct answer
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeQuestion(
                          questionIndex
                        )
                      }
                      style={
                        deleteButtonStyle
                      }
                    >
                      Delete
                    </button>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(0, 1fr) 140px",
                      gap: 14,
                      marginBottom: 18,
                    }}
                  >
                    <div>
                      <label
                        style={labelStyle}
                      >
                        Question
                      </label>

                      <textarea
                        value={
                          question.question_text
                        }
                        onChange={(event) =>
                          updateQuestionText(
                            questionIndex,
                            event.target.value
                          )
                        }
                        placeholder="Enter question here..."
                        rows={3}
                        style={
                          textareaStyle
                        }
                      />
                    </div>

                    <div>
                      <label
                        style={labelStyle}
                      >
                        Marks
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={question.marks}
                        onChange={(event) =>
                          updateQuestionMarks(
                            questionIndex,
                            event.target.value
                          )
                        }
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop:
                        "1px solid #e2e8f0",
                      paddingTop: 18,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        <h4
                          style={{
                            margin: 0,
                            color: "#334155",
                            fontSize: 15,
                            fontWeight: 900,
                          }}
                        >
                          Answer Options
                        </h4>

                        <p
                          style={{
                            margin: "4px 0 0",
                            color: "#94a3b8",
                            fontSize: 12,
                          }}
                        >
                          Click the radio
                          button to mark the
                          correct answer.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          addOption(
                            questionIndex
                          )
                        }
                        style={
                          smallButtonStyle
                        }
                      >
                        ＋ Option
                      </button>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      {question.options.map(
                        (
                          option,
                          optionIndex
                        ) => (
                          <div
                            key={
                              option.id ??
                              `option-${questionIndex}-${optionIndex}`
                            }
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: 10,
                              background:
                                option.is_correct
                                  ? "#f0fdf4"
                                  : "#f8fafc",
                              border:
                                option.is_correct
                                  ? "1px solid #86efac"
                                  : "1px solid #e2e8f0",
                              borderRadius: 12,
                              padding:
                                "10px 12px",
                            }}
                          >
                            <input
                              type="radio"
                              name={`correct-${questionIndex}`}
                              checked={
                                option.is_correct
                              }
                              onChange={() =>
                                setCorrectOption(
                                  questionIndex,
                                  optionIndex
                                )
                              }
                              style={{
                                width: 18,
                                height: 18,
                                cursor:
                                  "pointer",
                              }}
                            />

                            <span
                              style={{
                                width: 30,
                                height: 30,
                                minWidth: 30,
                                borderRadius:
                                  "50%",
                                background:
                                  option.is_correct
                                    ? "#dcfce7"
                                    : "#e2e8f0",
                                color:
                                  option.is_correct
                                    ? "#15803d"
                                    : "#475569",
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                justifyContent:
                                  "center",
                                fontWeight: 900,
                                fontSize: 12,
                              }}
                            >
                              {String.fromCharCode(
                                65 +
                                  optionIndex
                              )}
                            </span>

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
                              placeholder={`Option ${String.fromCharCode(
                                65 +
                                  optionIndex
                              )}`}
                              style={{
                                ...inputStyle,
                                flex: 1,
                              }}
                            />

                            <button
                              type="button"
                              onClick={() =>
                                removeOption(
                                  questionIndex,
                                  optionIndex
                                )
                              }
                              disabled={
                                question
                                  .options
                                  .length <=
                                2
                              }
                              style={{
                                ...smallDeleteStyle,
                                opacity:
                                  question
                                    .options
                                    .length <=
                                  2
                                    ? 0.4
                                    : 1,
                                cursor:
                                  question
                                    .options
                                    .length <=
                                  2
                                    ? "not-allowed"
                                    : "pointer",
                              }}
                            >
                              ×
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </article>
              )
            )}
          </div>
        )}

        <div style={bottomActionsStyle}>
          <button
            type="button"
            onClick={() =>
              void saveQuestions()
            }
            disabled={saving || publishing}
            style={{
              ...saveButtonStyle,
              opacity:
                saving || publishing
                  ? 0.6
                  : 1,
            }}
          >
            {saving
              ? "Saving..."
              : "💾 Save Questions"}
          </button>

          <button
            type="button"
            onClick={() =>
              void publishQuiz()
            }
            disabled={
              publishing ||
              saving ||
              questions.length === 0
            }
            style={{
              ...publishButtonStyle,
              opacity:
                publishing ||
                saving ||
                questions.length === 0
                  ? 0.6
                  : 1,
            }}
          >
            {publishing
              ? "Publishing..."
              : quiz?.is_published
              ? "✓ Published"
              : "🚀 Publish Quiz"}
          </button>
        </div>

        <footer style={footerStyle}>
          RACER ACADEMY • Quiz Question Builder
        </footer>
      </div>
    </main>
  );
}

export default function TeacherQuizQuestionsPage() {
  return (
    <Suspense
      fallback={
        <main style={pageStyle}>
          <div style={containerStyle}>
            <div style={loadingStyle}>
              Loading Questions...
            </div>
          </div>
        </main>
      }
    >
      <QuestionsContent />
    </Suspense>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: "24px 16px 40px",
  background:
    "linear-gradient(135deg,#f8fafc 0%,#eef2ff 50%,#f8fafc 100%)",
  fontFamily: "Arial, Helvetica, sans-serif",
  boxSizing: "border-box",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 900,
  margin: "0 auto",
};

const wideContainerStyle: React.CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
};

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 22,
  padding: 30,
  boxShadow:
    "0 15px 45px rgba(15,23,42,0.08)",
};

const loadingStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 22,
  padding: 50,
  textAlign: "center",
  color: "#475569",
  fontWeight: 800,
};

const headerStyle: React.CSSProperties = {
  background: "#0f172a",
  color: "#ffffff",
  borderRadius: 24,
  padding: 28,
  marginBottom: 18,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
  flexWrap: "wrap",
  boxShadow:
    "0 18px 50px rgba(15,23,42,0.16)",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-block",
  background: "rgba(255,255,255,0.1)",
  color: "#c7d2fe",
  padding: "7px 11px",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: 1,
  marginBottom: 10,
};

const mainHeadingStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 30,
  fontWeight: 900,
};

const headingStyle: React.CSSProperties = {
  marginTop: 0,
  color: "#0f172a",
  fontSize: 28,
  fontWeight: 900,
};

const subTextStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#cbd5e1",
  fontSize: 14,
  fontWeight: 600,
};

const quizInfoStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(150px,1fr))",
  gap: 10,
  background: "#ffffff",
  borderRadius: 18,
  padding: 16,
  marginBottom: 18,
  boxShadow:
    "0 8px 25px rgba(15,23,42,0.06)",
};

const infoLabel: React.CSSProperties = {
  display: "block",
  color: "#94a3b8",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: 1,
  marginBottom: 5,
};

const questionCardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  padding: 22,
  boxShadow:
    "0 10px 30px rgba(15,23,42,0.07)",
  border: "1px solid #e2e8f0",
};

const questionNumberStyle: React.CSSProperties = {
  width: 42,
  height: 42,
  minWidth: 42,
  borderRadius: 14,
  background:
    "linear-gradient(135deg,#e0e7ff,#c7d2fe)",
  color: "#4338ca",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
  fontSize: 17,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 7,
  color: "#334155",
  fontSize: 12,
  fontWeight: 900,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "11px 12px",
  outline: "none",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: 14,
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: 80,
};

const addQuestionButtonStyle: React.CSSProperties = {
  border: "none",
  background:
    "linear-gradient(135deg,#4f46e5,#7c3aed)",
  color: "#ffffff",
  padding: "12px 17px",
  borderRadius: 11,
  fontWeight: 900,
  cursor: "pointer",
};

const smallButtonStyle: React.CSSProperties = {
  border: "1px solid #c7d2fe",
  background: "#eef2ff",
  color: "#4338ca",
  padding: "8px 12px",
  borderRadius: 9,
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 12,
};

const deleteButtonStyle: React.CSSProperties = {
  border: "none",
  background: "#fee2e2",
  color: "#dc2626",
  padding: "8px 12px",
  borderRadius: 9,
  fontWeight: 900,
  cursor: "pointer",
};

const smallDeleteStyle: React.CSSProperties = {
  border: "none",
  background: "#fee2e2",
  color: "#dc2626",
  width: 30,
  height: 30,
  borderRadius: 8,
  fontWeight: 900,
  fontSize: 18,
};

const saveButtonStyle: React.CSSProperties = {
  border: "none",
  background: "#2563eb",
  color: "#ffffff",
  padding: "14px 22px",
  borderRadius: 12,
  fontWeight: 900,
  cursor: "pointer",
};

const publishButtonStyle: React.CSSProperties = {
  border: "none",
  background:
    "linear-gradient(135deg,#16a34a,#15803d)",
  color: "#ffffff",
  padding: "14px 22px",
  borderRadius: 12,
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#334155",
  padding: "11px 16px",
  borderRadius: 10,
  fontWeight: 900,
  cursor: "pointer",
};

const errorBoxStyle: React.CSSProperties = {
  background: "#fef2f2",
  color: "#b91c1c",
  border: "1px solid #fecaca",
  borderRadius: 12,
  padding: "12px 14px",
  marginBottom: 16,
  fontWeight: 700,
  fontSize: 13,
};

const successBoxStyle: React.CSSProperties = {
  background: "#f0fdf4",
  color: "#166534",
  border: "1px solid #bbf7d0",
  borderRadius: 12,
  padding: "12px 14px",
  marginBottom: 16,
  fontWeight: 700,
  fontSize: 13,
};

const emptyStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  padding: "60px 25px",
  textAlign: "center",
  boxShadow:
    "0 10px 30px rgba(15,23,42,0.07)",
};

const bottomActionsStyle: React.CSSProperties = {
  marginTop: 22,
  background: "#ffffff",
  borderRadius: 18,
  padding: 16,
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  flexWrap: "wrap",
  boxShadow:
    "0 10px 30px rgba(15,23,42,0.07)",
};

const footerStyle: React.CSSProperties = {
  textAlign: "center",
  marginTop: 30,
  color: "#94a3b8",
  fontSize: 12,
  fontWeight: 700,
};