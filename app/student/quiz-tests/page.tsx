"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type QuizTest = {
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
  created_at: string;
};

type QuizResult = {
  id: number;
  quiz_id: number;
  student_id: number;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  unanswered: number;
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  result_status: "PASS" | "FAIL";
  started_at: string | null;
  submitted_at: string | null;
  submission_type:
    | "manual"
    | "time_expired"
    | "left_quiz"
    | "auto_submit";
  created_at: string;
};

type QuizWithResult = QuizTest & {
  result?: QuizResult | null;
};

function getQuizStartDate(quiz: QuizTest) {
  return new Date(`${quiz.scheduled_date}T${quiz.scheduled_time}`);
}

function formatDate(dateString: string) {
  if (!dateString) return "-";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(timeString: string) {
  if (!timeString) return "-";

  const [hourString, minuteString] = timeString.split(":");

  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return timeString;
  }

  const date = new Date();

  date.setHours(hour, minute, 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatNumber(value: number | null | undefined) {
  const number = Number(value ?? 0);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return Number.isInteger(number)
    ? String(number)
    : number.toFixed(2).replace(/\.00$/, "");
}

function getQuizStatus(
  quiz: QuizTest,
  result?: QuizResult | null,
) {
  if (result) {
    return result.result_status === "PASS"
      ? "Passed"
      : "Attempted";
  }

  const start = getQuizStartDate(quiz);
  const now = new Date();

  if (now < start) {
    return "Upcoming";
  }

  const end = new Date(
    start.getTime() + Number(quiz.duration_minutes || 30) * 60 * 1000,
  );

  if (now >= start && now <= end) {
    return "Live Now";
  }

  return "Available";
}

export default function StudentQuizDashboardPage() {
  const router = useRouter();

  const [studentId, setStudentId] = useState<string>("");
  const [studentName, setStudentName] = useState<string>("");
  const [studentUsername, setStudentUsername] = useState<string>("");

  const [quizzes, setQuizzes] = useState<QuizTest[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const loggedIn =
      localStorage.getItem("studentLoggedIn") === "true";

    const storedId =
      localStorage.getItem("studentId") ||
      localStorage.getItem("student_id") ||
      "";

    const storedName =
      localStorage.getItem("studentName") ||
      localStorage.getItem("student_name") ||
      "";

    const storedUsername =
      localStorage.getItem("studentUsername") ||
      localStorage.getItem("student_username") ||
      "";

    if (!loggedIn || !storedId) {
      router.replace("/student");
      return;
    }

    setStudentId(storedId);
    setStudentName(storedName);
    setStudentUsername(storedUsername);
  }, [router]);

  const loadQuizData = useCallback(
    async (showRefreshLoader = false) => {
      if (!studentId) {
        return;
      }

      try {
        if (showRefreshLoader) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const numericStudentId = Number(studentId);

        if (!Number.isFinite(numericStudentId)) {
          throw new Error("Invalid student ID.");
        }

        const [quizResponse, resultResponse] =
          await Promise.all([
            supabase
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
                is_published,
                created_at
              `,
              )
              .eq("is_published", true)
              .order("scheduled_date", {
                ascending: true,
              })
              .order("scheduled_time", {
                ascending: true,
              }),

            supabase
              .from("quiz_results")
              .select(
                `
                id,
                quiz_id,
                student_id,
                total_questions,
                correct_answers,
                wrong_answers,
                unanswered,
                total_marks,
                obtained_marks,
                percentage,
                result_status,
                started_at,
                submitted_at,
                submission_type,
                created_at
              `,
              )
              .eq("student_id", numericStudentId)
              .order("created_at", {
                ascending: false,
              }),
          ]);

        if (quizResponse.error) {
          throw new Error(
            quizResponse.error.message ||
              "Unable to load quizzes.",
          );
        }

        if (resultResponse.error) {
          throw new Error(
            resultResponse.error.message ||
              "Unable to load quiz results.",
          );
        }

        setQuizzes(
          (quizResponse.data || []) as QuizTest[],
        );

        setResults(
          (resultResponse.data || []) as QuizResult[],
        );
      } catch (err) {
        console.error("Quiz dashboard error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load quiz dashboard.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [studentId],
  );

  useEffect(() => {
    if (!studentId) {
      return;
    }

    loadQuizData();
  }, [studentId, loadQuizData]);

  const resultMap = useMemo(() => {
    const map = new Map<number, QuizResult>();

    results.forEach((result) => {
      if (!map.has(Number(result.quiz_id))) {
        map.set(Number(result.quiz_id), result);
      }
    });

    return map;
  }, [results]);

  const quizzesWithResults = useMemo<QuizWithResult[]>(() => {
    return quizzes.map((quiz) => ({
      ...quiz,
      result: resultMap.get(Number(quiz.id)) || null,
    }));
  }, [quizzes, resultMap]);

  const upcomingQuizzes = useMemo(() => {
    return quizzesWithResults
      .filter((quiz) => {
        if (quiz.result) {
          return false;
        }

        const start = getQuizStartDate(quiz);

        return start.getTime() > now.getTime();
      })
      .sort(
        (a, b) =>
          getQuizStartDate(a).getTime() -
          getQuizStartDate(b).getTime(),
      )
      .slice(0, 4);
  }, [quizzesWithResults, now]);

  const liveQuizzes = useMemo(() => {
    return quizzesWithResults.filter((quiz) => {
      if (quiz.result) {
        return false;
      }

      const start = getQuizStartDate(quiz);

      const end = new Date(
        start.getTime() +
          Number(quiz.duration_minutes || 30) * 60 * 1000,
      );

      return (
        now.getTime() >= start.getTime() &&
        now.getTime() <= end.getTime()
      );
    });
  }, [quizzesWithResults, now]);

  const availableQuizzes = useMemo(() => {
    return quizzesWithResults
      .filter((quiz) => {
        if (quiz.result) {
          return false;
        }

        const start = getQuizStartDate(quiz);

        return start.getTime() <= now.getTime();
      })
      .sort(
        (a, b) =>
          getQuizStartDate(a).getTime() -
          getQuizStartDate(b).getTime(),
      )
      .slice(0, 6);
  }, [quizzesWithResults, now]);

  const passedCount = useMemo(() => {
    return results.filter(
      (result) => result.result_status === "PASS",
    ).length;
  }, [results]);

  const failedCount = useMemo(() => {
    return results.filter(
      (result) => result.result_status === "FAIL",
    ).length;
  }, [results]);

  const averagePercentage = useMemo(() => {
    if (!results.length) {
      return 0;
    }

    const total = results.reduce(
      (sum, result) =>
        sum + Number(result.percentage || 0),
      0,
    );

    return total / results.length;
  }, [results]);

  const getTimeUntilQuiz = (quiz: QuizTest) => {
    const start = getQuizStartDate(quiz);
    const difference = start.getTime() - now.getTime();

    if (difference <= 0) {
      return "Starting now";
    }

    const totalMinutes = Math.floor(
      difference / (1000 * 60),
    );

    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor(
      (totalMinutes % 1440) / 60,
    );
    const minutes = totalMinutes % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
  };

  const handleStartQuiz = (quizId: number) => {
    router.push(
      `/student/quiz-tests/attempt?quizId=${encodeURIComponent(
        String(quizId),
      )}`,
    );
  };

  const handleViewResult = (quizId: number) => {
    router.push(
      `/student/quiz-tests/results?quizId=${encodeURIComponent(
        String(quizId),
      )}`,
    );
  };

  const handleLogout = () => {
    localStorage.removeItem("studentLoggedIn");
    localStorage.removeItem("studentId");
    localStorage.removeItem("student_id");
    localStorage.removeItem("studentUsername");
    localStorage.removeItem("student_username");
    localStorage.removeItem("studentName");
    localStorage.removeItem("student_name");

    router.replace("/student");
  };

  return (
    <main className="quiz-page">
      <div className="background-glow glow-one" />
      <div className="background-glow glow-two" />

      <div className="quiz-container">
        <header className="topbar">
          <div className="brand-section">
            <button
              type="button"
              className="back-button"
              onClick={() => router.push("/student")}
              aria-label="Back to student dashboard"
            >
              ←
            </button>

            <div>
              <div className="brand-title">
                RACER ACADEMY
              </div>
              <div className="brand-subtitle">
                Student Quiz Center
              </div>
            </div>
          </div>

          <div className="top-actions">
            <button
              type="button"
              className="refresh-button"
              onClick={() => loadQuizData(true)}
              disabled={refreshing}
            >
              {refreshing ? "⟳ Refreshing..." : "↻ Refresh"}
            </button>

            <button
              type="button"
              className="logout-button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </header>

        <section className="welcome-card">
          <div>
            <div className="small-label">
              WELCOME BACK
            </div>

            <h1>
              {studentName ||
                studentUsername ||
                "Student"}
            </h1>

            <p>
              Your complete quiz dashboard is here.
              Check scheduled tests, attempt live quizzes
              and track your results.
            </p>
          </div>

          <div className="brain-box">🧠</div>
        </section>

        {error && (
          <section className="error-card">
            <div>
              <strong>Unable to load quiz data</strong>
              <p>{error}</p>
            </div>

            <button
              type="button"
              onClick={() => loadQuizData(true)}
            >
              Try Again
            </button>
          </section>
        )}

        <section className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-icon">🧠</div>
            <div>
              <span>Total Quizzes</span>
              <strong>{quizzes.length}</strong>
            </div>
          </div>

          <div className="stat-card purple">
            <div className="stat-icon">📝</div>
            <div>
              <span>Attempted</span>
              <strong>{results.length}</strong>
            </div>
          </div>

          <div className="stat-card green">
            <div className="stat-icon">🏆</div>
            <div>
              <span>Passed</span>
              <strong>{passedCount}</strong>
            </div>
          </div>

          <div className="stat-card red">
            <div className="stat-icon">❌</div>
            <div>
              <span>Failed</span>
              <strong>{failedCount}</strong>
            </div>
          </div>

          <div className="stat-card orange">
            <div className="stat-icon">📈</div>
            <div>
              <span>Average</span>
              <strong>
                {averagePercentage.toFixed(1)}%
              </strong>
            </div>
          </div>
        </section>

        <section className="quick-grid">
          <button
            type="button"
            className="quick-card"
            onClick={() =>
              router.push(
                "/student/quiz-tests/available",
              )
            }
          >
            <span>🚀</span>
            <div>
              <strong>Available Quizzes</strong>
              <small>
                View quizzes available to attempt
              </small>
            </div>
            <b>→</b>
          </button>

          <button
            type="button"
            className="quick-card"
            onClick={() =>
              router.push(
                "/student/quiz-tests/history",
              )
            }
          >
            <span>📚</span>
            <div>
              <strong>Quiz History</strong>
              <small>
                View all your previous attempts
              </small>
            </div>
            <b>→</b>
          </button>

          <button
            type="button"
            className="quick-card"
            onClick={() =>
              router.push(
                "/student/quiz-tests/results",
              )
            }
          >
            <span>🏆</span>
            <div>
              <strong>My Results</strong>
              <small>
                Check scores and performance
              </small>
            </div>
            <b>→</b>
          </button>
        </section>

        {liveQuizzes.length > 0 && (
          <section className="section-card live-section">
            <div className="section-header">
              <div>
                <span className="section-kicker">
                  LIVE NOW
                </span>
                <h2>🔥 Quizzes You Can Attempt</h2>
              </div>

              <span className="live-badge">
                LIVE
              </span>
            </div>

            <div className="quiz-list">
              {liveQuizzes.map((quiz) => (
                <article
                  className="quiz-item live-item"
                  key={quiz.id}
                >
                  <div className="quiz-main">
                    <div className="quiz-number live-number">
                      🧠
                    </div>

                    <div>
                      <h3>{quiz.title}</h3>

                      <p>
                        {quiz.description ||
                          "Scheduled quiz is currently live."}
                      </p>

                      <div className="quiz-meta">
                        <span>
                          ⏱️{" "}
                          {quiz.duration_minutes ||
                            30}{" "}
                          minutes
                        </span>

                        <span>
                          ⭐{" "}
                          {formatNumber(
                            quiz.marks_per_question,
                          )}{" "}
                          marks/question
                        </span>

                        <span>
                          ❌{" "}
                          {formatNumber(
                            quiz.negative_marks,
                          )}{" "}
                          negative
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="start-button"
                    onClick={() =>
                      handleStartQuiz(quiz.id)
                    }
                  >
                    Start Quiz →
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="section-card">
          <div className="section-header">
            <div>
              <span className="section-kicker">
                UPCOMING
              </span>
              <h2>⏰ Upcoming Quizzes</h2>
            </div>

            <button
              type="button"
              className="view-all"
              onClick={() =>
                router.push(
                  "/student/quiz-tests/available",
                )
              }
            >
              View All →
            </button>
          </div>

          {loading ? (
            <div className="empty-state">
              <div className="loader" />
              <p>Loading quizzes...</p>
            </div>
          ) : upcomingQuizzes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <h3>No Upcoming Quizzes</h3>
              <p>
                There are currently no scheduled quizzes
                waiting for you.
              </p>
            </div>
          ) : (
            <div className="quiz-list">
              {upcomingQuizzes.map((quiz) => (
                <article
                  className="quiz-item"
                  key={quiz.id}
                >
                  <div className="quiz-main">
                    <div className="quiz-number">
                      🧠
                    </div>

                    <div className="quiz-details">
                      <h3>{quiz.title}</h3>

                      <p>
                        {quiz.description ||
                          "Get ready for your upcoming quiz."}
                      </p>

                      <div className="quiz-meta">
                        <span>
                          📅{" "}
                          {formatDate(
                            quiz.scheduled_date,
                          )}
                        </span>

                        <span>
                          ⏰{" "}
                          {formatTime(
                            quiz.scheduled_time,
                          )}
                        </span>

                        <span>
                          ⏱️{" "}
                          {quiz.duration_minutes ||
                            30}{" "}
                          min
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="upcoming-side">
                    <span className="countdown">
                      {getTimeUntilQuiz(quiz)}
                    </span>

                    <span className="status-pill upcoming">
                      Upcoming
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="section-card">
          <div className="section-header">
            <div>
              <span className="section-kicker">
                AVAILABLE
              </span>
              <h2>🚀 Available Quizzes</h2>
            </div>

            <button
              type="button"
              className="view-all"
              onClick={() =>
                router.push(
                  "/student/quiz-tests/available",
                )
              }
            >
              View All →
            </button>
          </div>

          {loading ? (
            <div className="empty-state">
              <div className="loader" />
              <p>Checking available quizzes...</p>
            </div>
          ) : availableQuizzes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎯</div>
              <h3>No Quiz Available</h3>
              <p>
                When a published quiz reaches its
                scheduled time, it will appear here.
              </p>
            </div>
          ) : (
            <div className="quiz-list">
              {availableQuizzes.map((quiz) => {
                const status = getQuizStatus(
                  quiz,
                  quiz.result,
                );

                return (
                  <article
                    className="quiz-item"
                    key={quiz.id}
                  >
                    <div className="quiz-main">
                      <div className="quiz-number">
                        📝
                      </div>

                      <div className="quiz-details">
                        <h3>{quiz.title}</h3>

                        <p>
                          {quiz.description ||
                            "You can attempt this quiz now."}
                        </p>

                        <div className="quiz-meta">
                          <span>
                            📅{" "}
                            {formatDate(
                              quiz.scheduled_date,
                            )}
                          </span>

                          <span>
                            ⏰{" "}
                            {formatTime(
                              quiz.scheduled_time,
                            )}
                          </span>

                          <span>
                            ⏱️{" "}
                            {quiz.duration_minutes ||
                              30}{" "}
                            min
                          </span>

                          <span>
                            🎯 Pass{" "}
                            {formatNumber(
                              quiz.pass_percentage,
                            )}
                            %
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="quiz-action">
                      {quiz.result ? (
                        <button
                          type="button"
                          className="result-button"
                          onClick={() =>
                            handleViewResult(
                              quiz.id,
                            )
                          }
                        >
                          View Result
                        </button>
                      ) : status === "Live Now" ||
                        status === "Available" ? (
                        <button
                          type="button"
                          className="start-button"
                          onClick={() =>
                            handleStartQuiz(
                              quiz.id,
                            )
                          }
                        >
                          Start Quiz →
                        </button>
                      ) : (
                        <span className="status-pill">
                          {status}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="section-card results-section">
          <div className="section-header">
            <div>
              <span className="section-kicker">
                PERFORMANCE
              </span>
              <h2>🏆 Recent Results</h2>
            </div>

            <button
              type="button"
              className="view-all"
              onClick={() =>
                router.push(
                  "/student/quiz-tests/results",
                )
              }
            >
              All Results →
            </button>
          </div>

          {loading ? (
            <div className="empty-state">
              <div className="loader" />
              <p>Loading results...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏆</div>
              <h3>No Results Yet</h3>
              <p>
                Your quiz results will appear here after
                you complete a quiz.
              </p>
            </div>
          ) : (
            <div className="results-list">
              {results.slice(0, 5).map((result) => {
                const quiz = quizzes.find(
                  (item) =>
                    Number(item.id) ===
                    Number(result.quiz_id),
                );

                return (
                  <button
                    type="button"
                    className="result-row"
                    key={result.id}
                    onClick={() =>
                      handleViewResult(
                        result.quiz_id,
                      )
                    }
                  >
                    <div className="result-left">
                      <div className="result-icon">
                        {result.result_status ===
                        "PASS"
                          ? "🏆"
                          : "📊"}
                      </div>

                      <div>
                        <strong>
                          {quiz?.title ||
                            `Quiz #${result.quiz_id}`}
                        </strong>

                        <span>
                          {result.submitted_at
                            ? formatDate(
                                result.submitted_at,
                              )
                            : formatDate(
                                result.created_at,
                              )}
                        </span>
                      </div>
                    </div>

                    <div className="result-middle">
                      <span>
                        {formatNumber(
                          result.correct_answers,
                        )}{" "}
                        Correct
                      </span>

                      <span>
                        {formatNumber(
                          result.wrong_answers,
                        )}{" "}
                        Wrong
                      </span>

                      <span>
                        {formatNumber(
                          result.unanswered,
                        )}{" "}
                        Unanswered
                      </span>
                    </div>

                    <div className="result-score">
                      <strong>
                        {formatNumber(
                          result.obtained_marks,
                        )}
                        /
                        {formatNumber(
                          result.total_marks,
                        )}
                      </strong>

                      <span
                        className={
                          result.result_status ===
                          "PASS"
                            ? "pass"
                            : "fail"
                        }
                      >
                        {formatNumber(
                          result.percentage,
                        )}
                        % • {result.result_status}
                      </span>
                    </div>

                    <div className="result-arrow">
                      →
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <footer className="footer">
          <div>
            <strong>RACER ACADEMY</strong>
            <span>
              Student Quiz Center
            </span>
          </div>

          <span>
            Quiz duration is fixed at 30 minutes.
          </span>
        </footer>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .quiz-page {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          padding: 24px;
          background:
            radial-gradient(
              circle at top left,
              rgba(59, 130, 246, 0.14),
              transparent 34%
            ),
            radial-gradient(
              circle at bottom right,
              rgba(168, 85, 247, 0.12),
              transparent 34%
            ),
            #f6f8fc;
          color: #0f172a;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .background-glow {
          position: fixed;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          opacity: 0.35;
          z-index: 0;
        }

        .glow-one {
          top: -120px;
          left: -100px;
          background: #60a5fa;
        }

        .glow-two {
          right: -100px;
          bottom: -100px;
          background: #c084fc;
        }

        .quiz-container {
          width: min(1180px, 100%);
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 20px;
          padding: 14px 16px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          background: rgba(255, 255, 255, 0.86);
          backdrop-filter: blur(18px);
          border-radius: 20px;
          box-shadow: 0 10px 35px rgba(15, 23, 42, 0.07);
        }

        .brand-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .back-button {
          width: 44px;
          height: 44px;
          border: 0;
          border-radius: 14px;
          background: #eef2ff;
          color: #3730a3;
          font-size: 23px;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .back-button:hover {
          transform: translateX(-2px);
          background: #e0e7ff;
        }

        .brand-title {
          font-size: 16px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .brand-subtitle {
          color: #64748b;
          font-size: 12px;
          margin-top: 2px;
        }

        .top-actions {
          display: flex;
          gap: 10px;
        }

        .refresh-button,
        .logout-button {
          border: 0;
          border-radius: 12px;
          padding: 11px 15px;
          font-weight: 800;
          cursor: pointer;
        }

        .refresh-button {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .refresh-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .logout-button {
          background: #fee2e2;
          color: #b91c1c;
        }

        .welcome-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 30px;
          margin-bottom: 20px;
          border-radius: 26px;
          color: white;
          background:
            linear-gradient(
              135deg,
              #111827 0%,
              #1e293b 52%,
              #312e81 100%
            );
          box-shadow:
            0 20px 45px rgba(15, 23, 42, 0.18);
          overflow: hidden;
          position: relative;
        }

        .welcome-card::after {
          content: "";
          position: absolute;
          width: 230px;
          height: 230px;
          border-radius: 50%;
          right: -70px;
          top: -100px;
          background: rgba(255, 255, 255, 0.08);
        }

        .small-label {
          color: #93c5fd;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .welcome-card h1 {
          margin: 7px 0;
          font-size: clamp(28px, 5vw, 44px);
          line-height: 1.05;
        }

        .welcome-card p {
          margin: 0;
          max-width: 720px;
          color: #cbd5e1;
          line-height: 1.6;
          font-size: 14px;
        }

        .brain-box {
          width: 90px;
          height: 90px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 26px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.15);
          font-size: 45px;
          z-index: 2;
        }

        .error-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 17px 20px;
          margin-bottom: 20px;
          border: 1px solid #fecaca;
          border-radius: 18px;
          background: #fff1f2;
          color: #991b1b;
        }

        .error-card p {
          margin: 5px 0 0;
          font-size: 13px;
        }

        .error-card button {
          border: 0;
          border-radius: 10px;
          padding: 9px 14px;
          background: #991b1b;
          color: white;
          font-weight: 800;
          cursor: pointer;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 13px;
          min-height: 110px;
          padding: 18px;
          border-radius: 20px;
          background: white;
          border: 1px solid #e2e8f0;
          box-shadow: 0 8px 25px rgba(15, 23, 42, 0.05);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          font-size: 23px;
        }

        .stat-card.blue .stat-icon {
          background: #dbeafe;
        }

        .stat-card.purple .stat-icon {
          background: #ede9fe;
        }

        .stat-card.green .stat-icon {
          background: #dcfce7;
        }

        .stat-card.red .stat-icon {
          background: #fee2e2;
        }

        .stat-card.orange .stat-icon {
          background: #ffedd5;
        }

        .stat-card span {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .stat-card strong {
          display: block;
          margin-top: 5px;
          font-size: 25px;
        }

        .quick-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }

        .quick-card {
          display: grid;
          grid-template-columns: 48px 1fr 20px;
          align-items: center;
          gap: 12px;
          text-align: left;
          padding: 18px;
          border: 1px solid #e2e8f0;
          border-radius: 19px;
          background: white;
          cursor: pointer;
          box-shadow: 0 8px 25px rgba(15, 23, 42, 0.05);
          transition: 0.2s ease;
        }

        .quick-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 32px rgba(15, 23, 42, 0.09);
        }

        .quick-card > span {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: #f1f5f9;
          font-size: 23px;
        }

        .quick-card strong {
          display: block;
          font-size: 14px;
        }

        .quick-card small {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 11px;
          line-height: 1.4;
        }

        .quick-card b {
          color: #94a3b8;
          font-size: 20px;
        }

        .section-card {
          margin-bottom: 20px;
          padding: 22px;
          border-radius: 23px;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid #e2e8f0;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.055);
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 17px;
        }

        .section-kicker {
          display: block;
          color: #6366f1;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.8px;
        }

        .section-header h2 {
          margin: 5px 0 0;
          font-size: 22px;
        }

        .view-all {
          border: 0;
          background: transparent;
          color: #4f46e5;
          font-weight: 900;
          cursor: pointer;
          white-space: nowrap;
        }

        .quiz-list {
          display: grid;
          gap: 12px;
        }

        .quiz-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 17px;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          background: #f8fafc;
          transition: 0.2s ease;
        }

        .quiz-item:hover {
          background: white;
          border-color: #cbd5e1;
          transform: translateY(-1px);
        }

        .live-item {
          border-color: #86efac;
          background: #f0fdf4;
        }

        .quiz-main {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          min-width: 0;
        }

        .quiz-number {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 15px;
          background: #e0e7ff;
          font-size: 23px;
        }

        .live-number {
          background: #dcfce7;
        }

        .quiz-details,
        .quiz-main > div:last-child {
          min-width: 0;
        }

        .quiz-item h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 900;
        }

        .quiz-item p {
          margin: 5px 0 9px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
        }

        .quiz-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .quiz-meta span {
          padding: 5px 8px;
          border-radius: 8px;
          background: white;
          color: #475569;
          font-size: 10px;
          font-weight: 800;
          border: 1px solid #e2e8f0;
        }

        .quiz-action,
        .upcoming-side {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 0 0 auto;
        }

        .start-button,
        .result-button {
          border: 0;
          border-radius: 12px;
          padding: 11px 15px;
          color: white;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          white-space: nowrap;
          transition: 0.2s ease;
        }

        .start-button {
          background: linear-gradient(
            135deg,
            #4f46e5,
            #7c3aed
          );
          box-shadow: 0 7px 18px rgba(79, 70, 229, 0.22);
        }

        .start-button:hover,
        .result-button:hover {
          transform: translateY(-2px);
        }

        .result-button {
          background: #0f766e;
        }

        .countdown {
          padding: 8px 11px;
          border-radius: 10px;
          background: #fff7ed;
          color: #c2410c;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 11px;
          border-radius: 999px;
          background: #e2e8f0;
          color: #475569;
          font-size: 10px;
          font-weight: 900;
          white-space: nowrap;
        }

        .status-pill.upcoming {
          background: #fef3c7;
          color: #92400e;
        }

        .live-badge {
          padding: 7px 11px;
          border-radius: 999px;
          background: #dcfce7;
          color: #166534;
          font-size: 10px;
          font-weight: 900;
          animation: pulse 1.7s infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }

          50% {
            opacity: 0.55;
          }
        }

        .empty-state {
          padding: 45px 20px;
          text-align: center;
          border: 1px dashed #cbd5e1;
          border-radius: 17px;
          background: #f8fafc;
        }

        .empty-icon {
          font-size: 38px;
          margin-bottom: 8px;
        }

        .empty-state h3 {
          margin: 0;
          font-size: 16px;
        }

        .empty-state p {
          margin: 7px 0 0;
          color: #64748b;
          font-size: 12px;
        }

        .loader {
          width: 30px;
          height: 30px;
          margin: 0 auto 10px;
          border-radius: 50%;
          border: 3px solid #e2e8f0;
          border-top-color: #4f46e5;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .results-list {
          display: grid;
          gap: 9px;
        }

        .result-row {
          width: 100%;
          display: grid;
          grid-template-columns: 1.3fr 1fr auto 25px;
          align-items: center;
          gap: 15px;
          text-align: left;
          padding: 14px;
          border: 1px solid #e2e8f0;
          border-radius: 15px;
          background: #f8fafc;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .result-row:hover {
          background: white;
          transform: translateX(2px);
        }

        .result-left {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .result-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 12px;
          background: #eef2ff;
          font-size: 19px;
        }

        .result-left strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .result-left span {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 10px;
        }

        .result-middle {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        .result-middle span {
          padding: 5px 7px;
          border-radius: 7px;
          background: white;
          border: 1px solid #e2e8f0;
          color: #475569;
          font-size: 9px;
          font-weight: 800;
        }

        .result-score {
          text-align: right;
        }

        .result-score strong {
          display: block;
          font-size: 16px;
        }

        .result-score span {
          display: block;
          margin-top: 4px;
          font-size: 10px;
          font-weight: 900;
        }

        .result-score .pass {
          color: #15803d;
        }

        .result-score .fail {
          color: #dc2626;
        }

        .result-arrow {
          color: #94a3b8;
          font-size: 20px;
        }

        .footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 8px 5px 20px;
          color: #64748b;
          font-size: 10px;
        }

        .footer div {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .footer strong {
          color: #334155;
          font-size: 11px;
        }

        @media (max-width: 1000px) {
          .stats-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .result-row {
            grid-template-columns: 1fr auto 25px;
          }

          .result-middle {
            display: none;
          }
        }

        @media (max-width: 760px) {
          .quiz-page {
            padding: 12px;
          }

          .topbar {
            padding: 11px;
            border-radius: 17px;
          }

          .top-actions {
            gap: 6px;
          }

          .refresh-button,
          .logout-button {
            padding: 9px 10px;
            font-size: 10px;
          }

          .brand-title {
            font-size: 13px;
          }

          .brand-subtitle {
            font-size: 10px;
          }

          .back-button {
            width: 39px;
            height: 39px;
          }

          .welcome-card {
            padding: 23px;
            border-radius: 21px;
          }

          .brain-box {
            width: 62px;
            height: 62px;
            font-size: 30px;
            border-radius: 19px;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .stat-card {
            min-height: 95px;
            padding: 13px;
          }

          .stat-icon {
            width: 40px;
            height: 40px;
            font-size: 19px;
          }

          .stat-card strong {
            font-size: 21px;
          }

          .quick-grid {
            grid-template-columns: 1fr;
          }

          .section-card {
            padding: 15px;
            border-radius: 19px;
          }

          .section-header h2 {
            font-size: 18px;
          }

          .quiz-item {
            align-items: flex-start;
            flex-direction: column;
            gap: 13px;
          }

          .quiz-action,
          .upcoming-side {
            width: 100%;
          }

          .quiz-action .start-button,
          .quiz-action .result-button {
            width: 100%;
          }

          .upcoming-side {
            justify-content: space-between;
          }

          .result-row {
            grid-template-columns: 1fr auto;
          }

          .result-score {
            text-align: left;
          }

          .result-arrow {
            display: none;
          }

          .footer {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (max-width: 480px) {
          .topbar {
            align-items: flex-start;
          }

          .top-actions {
            flex-direction: column;
          }

          .welcome-card {
            align-items: flex-start;
          }

          .brain-box {
            display: none;
          }

          .stats-grid {
            gap: 9px;
          }

          .stat-card {
            gap: 8px;
          }

          .stat-card span {
            font-size: 9px;
          }

          .stat-card strong {
            font-size: 19px;
          }

          .quiz-main {
            width: 100%;
          }

          .quiz-meta span {
            font-size: 9px;
          }
        }
      `}</style>
    </main>
  );
}