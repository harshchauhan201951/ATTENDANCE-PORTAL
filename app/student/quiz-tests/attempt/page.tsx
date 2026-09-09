"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

type Question = {
  id: number;
  quiz_id: number;
  question_text?: string | null;
  question?: string | null;
  text?: string | null;
  question_number?: number | null;
  marks?: number | null;
  options?: Option[];
};

type Option = {
  id: number;
  question_id: number;
  option_text?: string | null;
  text?: string | null;
  option?: string | null;
  is_correct?: boolean | null;
  option_number?: number | null;
};

function getQuestionText(question: Question) {
  return (
    question.question_text ||
    question.question ||
    question.text ||
    "Question"
  );
}

function getOptionText(option: Option) {
  return (
    option.option_text ||
    option.text ||
    option.option ||
    "Option"
  );
}

function getScheduledStart(quiz: Quiz) {
  const time =
    quiz.scheduled_time?.length === 5
      ? `${quiz.scheduled_time}:00`
      : quiz.scheduled_time;

  return new Date(`${quiz.scheduled_date}T${time}`);
}

function formatTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}`;
}

function formatDateTime(date: Date) {
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function StudentQuizAttemptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const quizIdParam =
    searchParams.get("quizId") ||
    searchParams.get("id") ||
    searchParams.get("testId");

  const quizId = Number(quizIdParam);

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [currentIndex, setCurrentIndex] = useState(0);

  const [timeLeft, setTimeLeft] = useState(0);
  const [started, setStarted] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const currentQuestion = questions[currentIndex];

  const answeredCount = useMemo(() => {
    return Object.keys(answers).length;
  }, [answers]);

  const progressPercentage = useMemo(() => {
    if (questions.length === 0) return 0;

    return Math.round(
      ((currentIndex + 1) / questions.length) * 100
    );
  }, [currentIndex, questions.length]);

  /*
   * LOAD QUIZ
   *
   * Quiz must:
   * 1. Exist
   * 2. Be published
   * 3. Have reached its scheduled start time
   * 4. Still be inside its duration window
   */
  const loadQuiz = useCallback(async () => {
    if (!Number.isFinite(quizId) || quizId <= 0) {
      setErrorMessage(
        "Quiz ID nahi mila. Please Student Quiz page se START QUIZ button use karein."
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

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
          .eq("is_published", true)
          .maybeSingle();

      if (quizError) {
        throw new Error(
          `Quiz load nahi ho paya.\n\n${quizError.message}`
        );
      }

      if (!quizData) {
        throw new Error(
          "Ye quiz available nahi hai ya teacher ne ise publish nahi kiya hai."
        );
      }

      const loadedQuiz = quizData as Quiz;

      const scheduledStart = getScheduledStart(loadedQuiz);

      const durationMinutes = Math.max(
        1,
        Number(loadedQuiz.duration_minutes || 30)
      );

      const scheduledEnd = new Date(
        scheduledStart.getTime() +
          durationMinutes * 60 * 1000
      );

      const currentTime = new Date();

      /*
       * BEFORE START
       */
      if (currentTime < scheduledStart) {
        throw new Error(
          `Quiz abhi start nahi hua hai.\n\nScheduled Start: ${formatDateTime(
            scheduledStart
          )}`
        );
      }

      /*
       * AFTER END
       */
      if (currentTime >= scheduledEnd) {
        throw new Error(
          `Is quiz ka time khatam ho chuka hai.\n\nQuiz Ended: ${formatDateTime(
            scheduledEnd
          )}`
        );
      }

      /*
       * REMAINING TIME
       *
       * Student ko full duration nahi milega agar woh
       * scheduled start ke baad late enter karta hai.
       */
      const remainingSeconds = Math.max(
        0,
        Math.ceil(
          (scheduledEnd.getTime() - currentTime.getTime()) /
            1000
        )
      );

      setQuiz(loadedQuiz);

      const { data: questionData, error: questionError } =
        await supabase
          .from("quiz_questions")
          .select("*")
          .eq("quiz_id", quizId)
          .order("question_number", {
            ascending: true,
          });

      if (questionError) {
        throw new Error(
          `Questions load nahi ho pa rahe.\n\n${questionError.message}`
        );
      }

      const loadedQuestions = (questionData ||
        []) as Question[];

      if (loadedQuestions.length === 0) {
        setQuestions([]);
        setTimeLeft(remainingSeconds);
        setStarted(false);
        return;
      }

      const questionIds = loadedQuestions.map(
        (item) => item.id
      );

      const {
        data: optionData,
        error: optionError,
      } = await supabase
        .from("quiz_options")
        .select("*")
        .in("question_id", questionIds)
        .order("id", {
          ascending: true,
        });

      if (optionError) {
        throw new Error(
          `Quiz options load nahi ho pa rahe.\n\n${optionError.message}`
        );
      }

      const loadedOptions = (optionData ||
        []) as Option[];

      const questionsWithOptions =
        loadedQuestions.map((question) => ({
          ...question,
          options: loadedOptions.filter(
            (option) =>
              option.question_id === question.id
          ),
        }));

      setQuestions(questionsWithOptions);

      setTimeLeft(remainingSeconds);
      setStarted(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Quiz load karte waqt unexpected error aaya."
      );
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    document.title = "Quiz Attempt";
  }, []);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  /*
   * TIMER
   *
   * Actual duration_minutes ke according chalega.
   * Browser tab active hone par har second update hoga.
   */
  useEffect(() => {
    if (
      !started ||
      loading ||
      questions.length === 0 ||
      timeLeft <= 0
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((current) =>
        Math.max(0, current - 1)
      );
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    started,
    loading,
    questions.length,
    timeLeft,
  ]);

  /*
   * Browser refresh/close warning while quiz is running.
   */
  useEffect(() => {
    if (
      !started ||
      submitting ||
      timeLeft <= 0
    ) {
      return;
    }

    const handleBeforeUnload = (
      event: BeforeUnloadEvent
    ) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload
      );
    };
  }, [started, submitting, timeLeft]);

  function selectAnswer(
    questionId: number,
    optionId: number
  ) {
    if (timeLeft <= 0 || submitting) {
      return;
    }

    setAnswers((current) => ({
      ...current,
      [questionId]: optionId,
    }));
  }

  function goNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(
        (current) => current + 1
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }

  function goPrevious() {
    if (currentIndex > 0) {
      setCurrentIndex(
        (current) => current - 1
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }

  function goToQuestion(index: number) {
    setCurrentIndex(index);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function calculateResult() {
    let correctAnswers = 0;
    let wrongAnswers = 0;

    questions.forEach((question) => {
      const selectedOptionId =
        answers[question.id];

      if (!selectedOptionId) {
        return;
      }

      const selectedOption =
        question.options?.find(
          (option) =>
            option.id === selectedOptionId
        );

      if (selectedOption?.is_correct) {
        correctAnswers += 1;
      } else {
        wrongAnswers += 1;
      }
    });

    const unanswered =
      questions.length - answeredCount;

    const marksPerQuestion = Number(
      quiz?.marks_per_question ?? 1
    );

    const negativeMarks = Number(
      quiz?.negative_marks ?? 0
    );

    const score =
      correctAnswers * marksPerQuestion -
      wrongAnswers * negativeMarks;

    const totalMarks =
      questions.length * marksPerQuestion;

    const percentage =
      totalMarks > 0
        ? Math.max(
            0,
            (score / totalMarks) * 100
          )
        : 0;

    const passPercentage = Number(
      quiz?.pass_percentage ?? 40
    );

    const passed =
      percentage >= passPercentage;

    return {
      quizId,
      correctAnswers,
      wrongAnswers,
      unanswered,
      score,
      totalMarks,
      percentage,
      passed,
      answers,
    };
  }

  function saveResult(resultData: object) {
    try {
      sessionStorage.setItem(
        `quiz-result-${quizId}`,
        JSON.stringify(resultData)
      );
    } catch {
      // Ignore sessionStorage errors.
    }
  }

  async function submitQuiz(
    isAutomatic = false
  ) {
    if (submitting) return;

    if (!isAutomatic) {
      const unansweredCount =
        questions.length - answeredCount;

      const confirmation = window.confirm(
        unansweredCount > 0
          ? `Aapne ${unansweredCount} question attempt nahi kiye hain.\n\nKya aap quiz submit karna chahte hain?`
          : "Kya aap quiz submit karna chahte hain?"
      );

      if (!confirmation) {
        return;
      }
    }

    setSubmitting(true);

    const resultData = calculateResult();

    saveResult({
      ...resultData,
      autoSubmitted: isAutomatic,
    });

    setStarted(false);

    if (isAutomatic) {
      alert(
        `Time Up!\n\nQuiz automatically submit ho gaya.\n\nScore: ${resultData.score.toFixed(
          2
        )} / ${resultData.totalMarks.toFixed(
          2
        )}\nPercentage: ${resultData.percentage.toFixed(
          2
        )}%`
      );
    } else {
      alert(
        `Quiz Submitted!\n\nScore: ${resultData.score.toFixed(
          2
        )} / ${resultData.totalMarks.toFixed(
          2
        )}\nPercentage: ${resultData.percentage.toFixed(
          2
        )}%\n\n${
          resultData.passed
            ? "PASS"
            : "FAIL"
        }`
      );
    }

    setSubmitting(false);

    router.push(
      `/student/quiz-tests?quizId=${encodeURIComponent(
        String(quizId)
      )}`
    );
  }

  /*
   * AUTO SUBMIT WHEN TIMER REACHES ZERO
   */
  useEffect(() => {
    if (
      started &&
      timeLeft === 0 &&
      questions.length > 0 &&
      !submitting
    ) {
      submitQuiz(true);
    }
  }, [
    timeLeft,
    started,
    questions.length,
    submitting,
  ]);

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          padding: 20,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: 20,
            padding: 35,
            width: "100%",
            maxWidth: 500,
            textAlign: "center",
            boxShadow:
              "0 10px 30px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ fontSize: 45 }}>
            🧠
          </div>

          <h2
            style={{
              marginTop: 12,
              marginBottom: 8,
              color: "#0f172a",
            }}
          >
            Loading Quiz...
          </h2>

          <p
            style={{
              color: "#64748b",
              margin: 0,
            }}
          >
            Questions aur options load ho rahe
            hain.
          </p>
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: "40px 20px",
          background: "#f8fafc",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 700,
            margin: "0 auto",
            background: "#ffffff",
            borderRadius: 20,
            padding: 30,
            boxShadow:
              "0 10px 30px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              width: 65,
              height: 65,
              borderRadius: "50%",
              background: "#fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              marginBottom: 18,
            }}
          >
            ⚠️
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 28,
              color: "#991b1b",
            }}
          >
            Quiz Load Error
          </h1>

          <pre
            style={{
              whiteSpace: "pre-wrap",
              marginTop: 18,
              padding: 18,
              borderRadius: 12,
              background: "#fef2f2",
              color: "#7f1d1d",
              fontFamily:
                "Arial, sans-serif",
              lineHeight: 1.6,
            }}
          >
            {errorMessage}
          </pre>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 10,
            }}
          >
            <button
              onClick={() => router.back()}
              style={{
                border: "none",
                borderRadius: 12,
                padding: "13px 22px",
                background: "#0f172a",
                color: "#ffffff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ← Back
            </button>

            <button
              onClick={loadQuiz}
              style={{
                border: "none",
                borderRadius: 12,
                padding: "13px 22px",
                background: "#2563eb",
                color: "#ffffff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ↻ Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!quiz) {
    return null;
  }

  if (questions.length === 0) {
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: "40px 20px",
          background: "#f8fafc",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 700,
            margin: "0 auto",
            background: "#ffffff",
            borderRadius: 20,
            padding: 30,
            textAlign: "center",
            boxShadow:
              "0 10px 30px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ fontSize: 50 }}>
            📝
          </div>

          <h1
            style={{
              marginTop: 15,
              color: "#0f172a",
            }}
          >
            No Questions Found
          </h1>

          <p
            style={{
              color: "#64748b",
            }}
          >
            Is quiz mein abhi koi question
            available nahi hai.
          </p>

          <button
            onClick={() => router.back()}
            style={{
              marginTop: 15,
              border: "none",
              borderRadius: 12,
              padding: "13px 22px",
              background: "#2563eb",
              color: "#ffffff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ← Back to Quiz
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "20px",
        background:
          "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: 20,
            padding: "20px 22px",
            boxShadow:
              "0 8px 25px rgba(15,23,42,0.08)",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 15,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#6366f1",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                RACER ACADEMY • QUIZ
              </div>

              <h1
                style={{
                  margin: "5px 0 0",
                  fontSize:
                    "clamp(22px, 4vw, 32px)",
                  color: "#0f172a",
                }}
              >
                {quiz.title}
              </h1>
            </div>

            {/* TIMER */}
            <div
              style={{
                minWidth: 150,
                textAlign: "center",
                borderRadius: 16,
                padding: "12px 18px",
                background:
                  timeLeft <= 60
                    ? "#fee2e2"
                    : "#eef2ff",
                border:
                  timeLeft <= 60
                    ? "2px solid #fecaca"
                    : "2px solid #c7d2fe",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color:
                    timeLeft <= 60
                      ? "#dc2626"
                      : "#4f46e5",
                }}
              >
                TIME LEFT
              </div>

              <div
                style={{
                  fontSize: 27,
                  fontWeight: 900,
                  marginTop: 3,
                  color:
                    timeLeft <= 60
                      ? "#b91c1c"
                      : "#312e81",
                  fontVariantNumeric:
                    "tabular-nums",
                }}
              >
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>

          {/* PROGRESS */}
          <div style={{ marginTop: 18 }}>
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                marginBottom: 7,
                fontSize: 13,
                color: "#64748b",
                fontWeight: 700,
              }}
            >
              <span>
                Question {currentIndex + 1} of{" "}
                {questions.length}
              </span>

              <span>
                {answeredCount}/
                {questions.length} Answered
              </span>
            </div>

            <div
              style={{
                height: 9,
                background: "#e2e8f0",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progressPercentage}%`,
                  background:
                    "linear-gradient(90deg, #4f46e5, #7c3aed)",
                  borderRadius: 999,
                  transition:
                    "width 0.25s ease",
                }}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1fr) 280px",
            gap: 18,
            alignItems: "start",
          }}
        >
          {/* QUESTION */}
          <section
            style={{
              background: "#ffffff",
              borderRadius: 20,
              padding: "25px",
              boxShadow:
                "0 8px 25px rgba(15,23,42,0.08)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 12px",
                borderRadius: 999,
                background: "#eef2ff",
                color: "#4338ca",
                fontSize: 13,
                fontWeight: 800,
                marginBottom: 18,
              }}
            >
              Question {currentIndex + 1}
            </div>

            <h2
              style={{
                margin: "0 0 25px",
                fontSize:
                  "clamp(19px, 3vw, 25px)",
                lineHeight: 1.5,
                color: "#111827",
              }}
            >
              {getQuestionText(
                currentQuestion
              )}
            </h2>

            <div
              style={{
                display: "grid",
                gap: 13,
              }}
            >
              {(currentQuestion.options ||
                []).map(
                (option, optionIndex) => {
                  const selected =
                    answers[
                      currentQuestion.id
                    ] === option.id;

                  const optionLetter =
                    String.fromCharCode(
                      65 + optionIndex
                    );

                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={
                        timeLeft <= 0 ||
                        submitting
                      }
                      onClick={() =>
                        selectAnswer(
                          currentQuestion.id,
                          option.id
                        )
                      }
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: selected
                          ? "2px solid #4f46e5"
                          : "2px solid #e2e8f0",
                        background: selected
                          ? "#eef2ff"
                          : "#ffffff",
                        borderRadius: 15,
                        padding: "15px",
                        display: "flex",
                        alignItems:
                          "center",
                        gap: 13,
                        cursor:
                          timeLeft <= 0 ||
                          submitting
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          timeLeft <= 0
                            ? 0.65
                            : 1,
                        transition:
                          "all 0.2s ease",
                      }}
                    >
                      <span
                        style={{
                          width: 38,
                          height: 38,
                          minWidth: 38,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          background: selected
                            ? "#4f46e5"
                            : "#f1f5f9",
                          color: selected
                            ? "#ffffff"
                            : "#334155",
                          fontWeight: 900,
                        }}
                      >
                        {optionLetter}
                      </span>

                      <span
                        style={{
                          color: "#1e293b",
                          fontSize: 16,
                          lineHeight: 1.45,
                          fontWeight:
                            selected
                              ? 700
                              : 500,
                        }}
                      >
                        {getOptionText(
                          option
                        )}
                      </span>
                    </button>
                  );
                }
              )}
            </div>

            {(!currentQuestion.options ||
              currentQuestion.options
                .length === 0) && (
              <div
                style={{
                  marginTop: 20,
                  padding: 15,
                  borderRadius: 12,
                  background: "#fff7ed",
                  color: "#9a3412",
                  fontWeight: 700,
                }}
              >
                Is question ke options
                available nahi hain.
              </div>
            )}

            {/* NAVIGATION */}
            <div
              style={{
                marginTop: 28,
                paddingTop: 20,
                borderTop:
                  "1px solid #e2e8f0",
                display: "flex",
                justifyContent:
                  "space-between",
                gap: 12,
              }}
            >
              <button
                type="button"
                onClick={goPrevious}
                disabled={currentIndex === 0}
                style={{
                  border:
                    "1px solid #cbd5e1",
                  background:
                    currentIndex === 0
                      ? "#f8fafc"
                      : "#ffffff",
                  color: "#334155",
                  borderRadius: 12,
                  padding: "12px 18px",
                  fontWeight: 800,
                  cursor:
                    currentIndex === 0
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    currentIndex === 0
                      ? 0.5
                      : 1,
                }}
              >
                ← Previous
              </button>

              {currentIndex <
              questions.length - 1 ? (
                <button
                  type="button"
                  onClick={goNext}
                  style={{
                    border: "none",
                    background:
                      "linear-gradient(135deg, #4f46e5, #7c3aed)",
                    color: "#ffffff",
                    borderRadius: 12,
                    padding: "12px 22px",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Next →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    submitQuiz(false)
                  }
                  disabled={
                    submitting ||
                    timeLeft <= 0
                  }
                  style={{
                    border: "none",
                    background:
                      "linear-gradient(135deg, #059669, #047857)",
                    color: "#ffffff",
                    borderRadius: 12,
                    padding: "12px 22px",
                    fontWeight: 900,
                    cursor:
                      submitting ||
                      timeLeft <= 0
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      submitting ||
                      timeLeft <= 0
                        ? 0.6
                        : 1,
                  }}
                >
                  {submitting
                    ? "Submitting..."
                    : "✓ Submit Quiz"}
                </button>
              )}
            </div>
          </section>

          {/* QUESTION PALETTE */}
          <aside
            style={{
              background: "#ffffff",
              borderRadius: 20,
              padding: 20,
              boxShadow:
                "0 8px 25px rgba(15,23,42,0.08)",
              position: "sticky",
              top: 20,
            }}
          >
            <h3
              style={{
                margin: "0 0 5px",
                color: "#0f172a",
              }}
            >
              Questions
            </h3>

            <p
              style={{
                margin: "0 0 15px",
                color: "#64748b",
                fontSize: 13,
              }}
            >
              Question select karein
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(5, 1fr)",
                gap: 8,
              }}
            >
              {questions.map(
                (question, index) => {
                  const answered =
                    answers[
                      question.id
                    ] !== undefined;

                  const current =
                    index === currentIndex;

                  return (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() =>
                        goToQuestion(index)
                      }
                      style={{
                        height: 42,
                        borderRadius: 10,
                        border: current
                          ? "2px solid #4f46e5"
                          : "1px solid #cbd5e1",
                        background: current
                          ? "#4f46e5"
                          : answered
                          ? "#dcfce7"
                          : "#f8fafc",
                        color: current
                          ? "#ffffff"
                          : answered
                          ? "#166534"
                          : "#334155",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      {index + 1}
                    </button>
                  );
                }
              )}
            </div>

            <div
              style={{
                marginTop: 20,
                paddingTop: 15,
                borderTop:
                  "1px solid #e2e8f0",
                display: "grid",
                gap: 10,
                fontSize: 13,
                color: "#475569",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 13,
                    height: 13,
                    borderRadius: 4,
                    background: "#dcfce7",
                    border:
                      "1px solid #86efac",
                  }}
                />
                Answered
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 13,
                    height: 13,
                    borderRadius: 4,
                    background: "#f8fafc",
                    border:
                      "1px solid #cbd5e1",
                  }}
                />
                Not Answered
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 13,
                    height: 13,
                    borderRadius: 4,
                    background: "#4f46e5",
                  }}
                />
                Current
              </div>
            </div>

            <div
              style={{
                marginTop: 20,
                padding: 14,
                borderRadius: 13,
                background: "#f8fafc",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                Duration
              </div>

              <div
                style={{
                  marginTop: 3,
                  fontWeight: 900,
                  color: "#0f172a",
                }}
              >
                {quiz.duration_minutes}{" "}
                minutes
              </div>
            </div>

            <div
              style={{
                marginTop: 10,
                padding: 14,
                borderRadius: 13,
                background: "#f8fafc",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                Marks / Question
              </div>

              <div
                style={{
                  marginTop: 3,
                  fontWeight: 900,
                  color: "#0f172a",
                }}
              >
                {quiz.marks_per_question}
              </div>
            </div>

            {quiz.negative_marks > 0 && (
              <div
                style={{
                  marginTop: 10,
                  padding: 14,
                  borderRadius: 13,
                  background: "#fff7ed",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#9a3412",
                  }}
                >
                  Negative Marking
                </div>

                <div
                  style={{
                    marginTop: 3,
                    fontWeight: 900,
                    color: "#c2410c",
                  }}
                >
                  -{quiz.negative_marks}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* MOBILE RESPONSIVE */}
      <style jsx>{`
        @media (max-width: 850px) {
          main {
            padding: 12px !important;
          }

          aside {
            position: static !important;
          }

          section {
            padding: 18px !important;
          }

          main > div > div:nth-child(2) {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 600px) {
          button {
            -webkit-tap-highlight-color: transparent;
          }
        }
      `}</style>
    </main>
  );
}