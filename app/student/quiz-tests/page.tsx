"use client";

import {
  CSSProperties,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

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

type QuizResult = {
  quiz_id: number;
  obtained_marks: number | null;
  percentage: number | null;
  result_status: string | null;
};

type Student = {
  id: number;
  student_name: string | null;
  student_username: string | null;
  class_name: string | null;
};

export default function StudentQuizTestsPage() {
  const router = useRouter();

  const [student, setStudent] =
    useState<Student | null>(null);

  const [quizzes, setQuizzes] =
    useState<Quiz[]>([]);

  const [results, setResults] =
    useState<QuizResult[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  function normalizeClass(
    value: unknown
  ): string {
    if (typeof value !== "string") {
      return "";
    }

    return value
      .trim()
      .toUpperCase()
      .replace(/^CLASS\s+/i, "")
      .replace(/\s+/g, " ");
  }

  function quizBelongsToStudent(
    quiz: Quiz,
    studentClass: string
  ): boolean {
    const normalizedStudentClass =
      normalizeClass(studentClass);

    if (!normalizedStudentClass) {
      return false;
    }

    const targetClasses = Array.isArray(
      quiz.target_classes
    )
      ? quiz.target_classes
          .filter(
            (
              item
            ): item is string =>
              typeof item === "string"
          )
          .map((item) =>
            normalizeClass(item)
          )
          .filter(Boolean)
      : [];

    if (targetClasses.length > 0) {
      return targetClasses.includes(
        normalizedStudentClass
      );
    }

    return (
      normalizeClass(
        quiz.class_name
      ) === normalizedStudentClass
    );
  }

  async function loadDashboard() {
    setLoading(true);
    setErrorMessage("");

    try {
      let currentStudentId:
        | number
        | null = null;

      let actualStudent: Student | null =
        null;

      const username =
        localStorage.getItem(
          "student_username"
        ) ||
        localStorage.getItem(
          "studentUsername"
        ) ||
        "";

      const storedId =
        localStorage.getItem(
          "studentId"
        ) ||
        localStorage.getItem(
          "student_id"
        ) ||
        localStorage.getItem(
          "attendance_student_id"
        ) ||
        "";

      if (username) {
        const { data, error } =
          await supabase
            .from("students")
            .select(
              "id,student_name,student_username,class_name"
            )
            .eq(
              "student_username",
              username
            )
            .maybeSingle();

        if (error) {
          console.error(
            "Student username lookup error:",
            error
          );
        }

        if (data?.id) {
          currentStudentId =
            Number(data.id);

          actualStudent =
            data as Student;

          setStudent(
            actualStudent
          );

          localStorage.setItem(
            "studentId",
            String(currentStudentId)
          );
        }
      }

      if (
        currentStudentId === null &&
        storedId
      ) {
        const numericId =
          Number(storedId);

        if (
          Number.isFinite(
            numericId
          ) &&
          numericId > 0
        ) {
          const { data, error } =
            await supabase
              .from("students")
              .select(
                "id,student_name,student_username,class_name"
              )
              .eq(
                "id",
                numericId
              )
              .maybeSingle();

          if (error) {
            console.error(
              "Student ID lookup error:",
              error
            );
          }

          if (data?.id) {
            currentStudentId =
              Number(data.id);

            actualStudent =
              data as Student;

            setStudent(
              actualStudent
            );
          }
        }
      }

      if (
        currentStudentId === null ||
        !actualStudent
      ) {
        setErrorMessage(
          "Student login information not found. Please login again."
        );

        setLoading(false);
        return;
      }

      const {
        data: quizData,
        error: quizError,
      } = await supabase
        .from("quiz_tests")
        .select(
          `
          id,
          title,
          description,
          class_name,
          target_classes,
          subject,
          scheduled_date,
          scheduled_time,
          duration_minutes,
          marks_per_question,
          negative_marks,
          pass_percentage,
          is_published
          `
        )
        .eq(
          "is_published",
          true
        )
        .order(
          "scheduled_date",
          {
            ascending: true,
          }
        )
        .order(
          "scheduled_time",
          {
            ascending: true,
          }
        );

      if (quizError) {
        console.error(
          "Quiz loading error:",
          quizError
        );

        setErrorMessage(
          `Could not load quizzes: ${quizError.message}`
        );

        setLoading(false);
        return;
      }

      const actualStudentClass =
        actualStudent.class_name ||
        "";

      const filteredQuizzes =
        ((quizData ||
          []) as Quiz[]).filter(
          (quiz) =>
            quizBelongsToStudent(
              quiz,
              actualStudentClass
            )
        );

      setQuizzes(
        filteredQuizzes
      );

      const {
        data: resultData,
        error: resultError,
      } = await supabase
        .from("quiz_results")
        .select(
          "quiz_id,obtained_marks,percentage,result_status"
        )
        .eq(
          "student_id",
          currentStudentId
        )
        .order(
          "quiz_id",
          {
            ascending: false,
          }
        );

      if (resultError) {
        console.error(
          "Quiz results loading error:",
          resultError
        );

        setResults([]);
      } else {
        setResults(
          (resultData ||
            []) as QuizResult[]
        );
      }
    } catch (error) {
      console.error(
        "Unexpected quiz dashboard error:",
        error
      );

      setErrorMessage(
        "Something went wrong while loading your quiz dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  function getStartTime(
    quiz: Quiz
  ): Date {
    return new Date(
      `${quiz.scheduled_date}T${quiz.scheduled_time}`
    );
  }

  function getEndTime(
    quiz: Quiz
  ): Date {
    return new Date(
      getStartTime(
        quiz
      ).getTime() +
        quiz.duration_minutes *
          60 *
          1000
    );
  }

  function getStatus(
    quiz: Quiz
  ):
    | "LIVE"
    | "UPCOMING"
    | "ENDED" {
    const now =
      new Date();

    const start =
      getStartTime(
        quiz
      );

    const end =
      getEndTime(
        quiz
      );

    if (now < start) {
      return "UPCOMING";
    }

    if (
      now >= start &&
      now <= end
    ) {
      return "LIVE";
    }

    return "ENDED";
  }

  function hasAttempted(
    quizId: number
  ): boolean {
    return results.some(
      (result) =>
        Number(
          result.quiz_id
        ) ===
        Number(quizId)
    );
  }

  function getResult(
    quizId: number
  ):
    | QuizResult
    | undefined {
    return results.find(
      (result) =>
        Number(
          result.quiz_id
        ) ===
        Number(quizId)
    );
  }

  function getClassDisplay(): string {
    if (
      !student?.class_name
    ) {
      return "Class not available";
    }

    const normalized =
      normalizeClass(
        student.class_name
      );

    if (
      /^\d+$/.test(
        normalized
      )
    ) {
      return `Class ${normalized}`;
    }

    return student.class_name;
  }

  const liveQuizzes =
    quizzes.filter(
      (quiz) =>
        getStatus(
          quiz
        ) === "LIVE"
    );

  const upcomingQuizzes =
    quizzes.filter(
      (quiz) =>
        getStatus(
          quiz
        ) === "UPCOMING"
    );

  const availableQuizzes =
    quizzes.filter(
      (quiz) => {
        const status =
          getStatus(
            quiz
          );

        return (
          status === "LIVE" ||
          status === "UPCOMING"
        );
      }
    );

  const passedResults =
    results.filter(
      (result) =>
        String(
          result.result_status
        ).toUpperCase() ===
        "PASS"
    );

  const failedResults =
    results.filter(
      (result) =>
        String(
          result.result_status
        ).toUpperCase() ===
        "FAIL"
    );

  const averagePercentage =
    results.length > 0
      ? results.reduce(
          (
            total,
            result
          ) =>
            total +
            Number(
              result.percentage ||
                0
            ),
          0
        ) /
        results.length
      : 0;

  if (loading) {
    return (
      <main
        style={styles.page}
      >
        <div
          style={
            styles.loadingBox
          }
        >
          <div
            style={
              styles.loadingSpinner
            }
          />

          <h2
            style={
              styles.loadingTitle
            }
          >
            Loading Quiz Dashboard...
          </h2>

          <p
            style={
              styles.loadingText
            }
          >
            Checking your class and available quizzes.
          </p>
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main
        style={styles.page}
      >
        <div
          style={
            styles.errorBox
          }
        >
          <div
            style={
              styles.errorIcon
            }
          >
            Q
          </div>

          <h1
            style={
              styles.errorTitle
            }
          >
            Quiz Dashboard
          </h1>

          <p
            style={
              styles.errorText
            }
          >
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() =>
              router.push("/")
            }
            style={
              styles.primaryButton
            }
          >
            Login Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      style={styles.page}
      className="student-quiz-page"
    >
      <div
        style={
          styles.container
        }
        className="student-quiz-container"
      >
        {/* HEADER */}

        <header
          style={
            styles.header
          }
          className="quiz-dashboard-header"
        >
          <div
            className="quiz-header-content"
          >
            <div
              style={
                styles.headerEyebrow
              }
            >
              RACER ACADEMY
            </div>

            <h1
              style={
                styles.headerTitle
              }
            >
              Quiz Dashboard
            </h1>

            <p
              style={
                styles.headerSubtitle
              }
            >
              Welcome back,{" "}
              <strong>
                {student?.student_name ||
                  "Student"}
              </strong>
              . Check scheduled tests, attempt live quizzes and track your results.
            </p>
          </div>

          <div
            style={
              styles.classBadge
            }
            className="quiz-class-badge"
          >
            <div
              style={
                styles.classBadgeSmall
              }
            >
              YOUR CLASS
            </div>

            <div
              style={
                styles.classBadgeValue
              }
            >
              {getClassDisplay()}
            </div>
          </div>
        </header>

        {/* STATS */}

        <section
          style={
            styles.statsGrid
          }
          className="quiz-stats-grid"
        >
          <StatCard
            icon="Q"
            label="Total Quizzes"
            value={String(
              quizzes.length
            )}
          />

          <StatCard
            icon="A"
            label="Attempted"
            value={String(
              results.length
            )}
          />

          <StatCard
            icon="P"
            label="Passed"
            value={String(
              passedResults.length
            )}
          />

          <StatCard
            icon="F"
            label="Failed"
            value={String(
              failedResults.length
            )}
          />

          <StatCard
            icon="%"
            label="Average"
            value={`${averagePercentage.toFixed(
              1
            )}%`}
          />
        </section>

        {/* QUICK ACTIONS */}

        <section
          style={
            styles.quickGrid
          }
          className="quiz-quick-grid"
        >
          <button
            type="button"
            onClick={() =>
              router.push(
                "/student/quiz-tests/available"
              )
            }
            style={
              styles.quickCard
            }
            className="quiz-quick-card"
          >
            <div
              style={
                styles.quickIcon
              }
            >
              GO
            </div>

            <div
              className="quiz-quick-content"
            >
              <h2
                style={
                  styles.quickTitle
                }
              >
                Available Quizzes
              </h2>

              <p
                style={
                  styles.quickText
                }
              >
                View quizzes available to attempt
              </p>
            </div>

            <span
              style={
                styles.quickArrow
              }
            >
              →
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/student/quiz-tests/history"
              )
            }
            style={
              styles.quickCard
            }
            className="quiz-quick-card"
          >
            <div
              style={
                styles.quickIcon
              }
            >
              H
            </div>

            <div
              className="quiz-quick-content"
            >
              <h2
                style={
                  styles.quickTitle
                }
              >
                Quiz History
              </h2>

              <p
                style={
                  styles.quickText
                }
              >
                View all your previous attempts
              </p>
            </div>

            <span
              style={
                styles.quickArrow
              }
            >
              →
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/student/quiz-tests/results"
              )
            }
            style={
              styles.quickCard
            }
            className="quiz-quick-card"
          >
            <div
              style={
                styles.quickIcon
              }
            >
              R
            </div>

            <div
              className="quiz-quick-content"
            >
              <h2
                style={
                  styles.quickTitle
                }
              >
                My Results
              </h2>

              <p
                style={
                  styles.quickText
                }
              >
                Check scores and performance
              </p>
            </div>

            <span
              style={
                styles.quickArrow
              }
            >
              →
            </span>
          </button>
        </section>

        {/* LIVE NOW */}

        <section
          style={
            styles.section
          }
          className="quiz-section"
        >
          <div
            style={
              styles.sectionHeader
            }
            className="quiz-section-header"
          >
            <div
              className="quiz-section-heading"
            >
              <div
                style={
                  styles.sectionEyebrow
                }
              >
                LIVE NOW
              </div>

              <h2
                style={
                  styles.sectionTitle
                }
              >
                Quizzes You Can Attempt
              </h2>
            </div>

            <div
              style={
                styles.countBadge
              }
              className="quiz-count-badge"
            >
              {liveQuizzes.length}
            </div>
          </div>

          {liveQuizzes.length ===
          0 ? (
            <div
              style={
                styles.emptyBox
              }
              className="quiz-empty-box"
            >
              <div
                style={
                  styles.emptyIcon
                }
              >
                Q
              </div>

              <div
                className="quiz-empty-content"
              >
                <h3
                  style={
                    styles.emptyTitle
                  }
                >
                  No Live Quiz
                </h3>

                <p
                  style={
                    styles.emptyText
                  }
                >
                  There are currently no live quizzes for {getClassDisplay()}.
                </p>
              </div>
            </div>
          ) : (
            <div
              style={
                styles.quizGrid
              }
              className="quiz-grid"
            >
              {liveQuizzes.map(
                (quiz) => (
                  <QuizCard
                    key={quiz.id}
                    quiz={quiz}
                    status="LIVE"
                    attempted={hasAttempted(
                      quiz.id
                    )}
                    result={getResult(
                      quiz.id
                    )}
                    onStart={() =>
                      router.push(
                        `/student/quiz-tests/attempt?quizId=${quiz.id}`
                      )
                    }
                    onResult={() =>
                      router.push(
                        `/student/quiz-tests/results?quizId=${quiz.id}`
                      )
                    }
                  />
                )
              )}
            </div>
          )}
        </section>

        {/* UPCOMING */}

        <section
          style={
            styles.section
          }
          className="quiz-section"
        >
          <div
            style={
              styles.sectionHeader
            }
            className="quiz-section-header"
          >
            <div
              className="quiz-section-heading"
            >
              <div
                style={
                  styles.sectionEyebrow
                }
              >
                CALENDAR
              </div>

              <h2
                style={
                  styles.sectionTitle
                }
              >
                Upcoming Quizzes
              </h2>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/student/quiz-tests/available"
                )
              }
              style={
                styles.viewAllButton
              }
              className="quiz-view-all-button"
            >
              View All →
            </button>
          </div>

          {upcomingQuizzes.length ===
          0 ? (
            <div
              style={
                styles.emptyBox
              }
              className="quiz-empty-box"
            >
              <div
                style={
                  styles.emptyIcon
                }
              >
                C
              </div>

              <div
                className="quiz-empty-content"
              >
                <h3
                  style={
                    styles.emptyTitle
                  }
                >
                  No Upcoming Quizzes
                </h3>

                <p
                  style={
                    styles.emptyText
                  }
                >
                  There are currently no scheduled quizzes waiting for you.
                </p>
              </div>
            </div>
          ) : (
            <div
              style={
                styles.quizGrid
              }
              className="quiz-grid"
            >
              {upcomingQuizzes
                .slice(0, 4)
                .map(
                  (quiz) => (
                    <QuizCard
                      key={quiz.id}
                      quiz={quiz}
                      status="UPCOMING"
                      attempted={hasAttempted(
                        quiz.id
                      )}
                      result={getResult(
                        quiz.id
                      )}
                      onStart={() =>
                        router.push(
                          `/student/quiz-tests/attempt?quizId=${quiz.id}`
                        )
                      }
                      onResult={() =>
                        router.push(
                          `/student/quiz-tests/results?quizId=${quiz.id}`
                        )
                      }
                    />
                  )
                )}
            </div>
          )}
        </section>

        {/* AVAILABLE */}

        <section
          style={
            styles.section
          }
          className="quiz-section"
        >
          <div
            style={
              styles.sectionHeader
            }
            className="quiz-section-header"
          >
            <div
              className="quiz-section-heading"
            >
              <div
                style={
                  styles.sectionEyebrow
                }
              >
                AVAILABLE
              </div>

              <h2
                style={
                  styles.sectionTitle
                }
              >
                Available Quizzes
              </h2>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/student/quiz-tests/available"
                )
              }
              style={
                styles.viewAllButton
              }
              className="quiz-view-all-button"
            >
              View All →
            </button>
          </div>

          {availableQuizzes.length ===
          0 ? (
            <div
              style={
                styles.emptyBox
              }
              className="quiz-empty-box"
            >
              <div
                style={
                  styles.emptyIcon
                }
              >
                Q
              </div>

              <div
                className="quiz-empty-content"
              >
                <h3
                  style={
                    styles.emptyTitle
                  }
                >
                  No Available Quizzes
                </h3>

                <p
                  style={
                    styles.emptyText
                  }
                >
                  There are currently no available quizzes for {getClassDisplay()}.
                </p>
              </div>
            </div>
          ) : (
            <div
              style={
                styles.quizGrid
              }
              className="quiz-grid"
            >
              {availableQuizzes
                .slice(0, 6)
                .map(
                  (quiz) => (
                    <QuizCard
                      key={quiz.id}
                      quiz={quiz}
                      status={getStatus(
                        quiz
                      )}
                      attempted={hasAttempted(
                        quiz.id
                      )}
                      result={getResult(
                        quiz.id
                      )}
                      onStart={() =>
                        router.push(
                          `/student/quiz-tests/attempt?quizId=${quiz.id}`
                        )
                      }
                      onResult={() =>
                        router.push(
                          `/student/quiz-tests/results?quizId=${quiz.id}`
                        )
                      }
                    />
                  )
                )}
            </div>
          )}
        </section>

        {/* RECENT RESULTS */}

        <section
          style={
            styles.section
          }
          className="quiz-section"
        >
          <div
            style={
              styles.sectionHeader
            }
            className="quiz-section-header"
          >
            <div
              className="quiz-section-heading"
            >
              <div
                style={
                  styles.sectionEyebrow
                }
              >
                PERFORMANCE
              </div>

              <h2
                style={
                  styles.sectionTitle
                }
              >
                Recent Results
              </h2>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/student/quiz-tests/results"
                )
              }
              style={
                styles.viewAllButton
              }
              className="quiz-view-all-button"
            >
              All Results →
            </button>
          </div>

          {results.length ===
          0 ? (
            <div
              style={
                styles.emptyBox
              }
              className="quiz-empty-box"
            >
              <div
                style={
                  styles.emptyIcon
                }
              >
                R
              </div>

              <div
                className="quiz-empty-content"
              >
                <h3
                  style={
                    styles.emptyTitle
                  }
                >
                  No Results Yet
                </h3>

                <p
                  style={
                    styles.emptyText
                  }
                >
                  Your quiz results will appear here after you complete a quiz.
                </p>
              </div>
            </div>
          ) : (
            <div
              style={
                styles.resultGrid
              }
              className="quiz-result-grid"
            >
              {results
                .slice(0, 4)
                .map(
                  (
                    result,
                    index
                  ) => (
                    <div
                      key={`${result.quiz_id}-${index}`}
                      style={
                        styles.resultCard
                      }
                      className="quiz-result-card"
                    >
                      <div
                        style={
                          styles.resultTop
                        }
                      >
                        <div
                          style={
                            styles.resultIcon
                          }
                        >
                          R
                        </div>

                        <div
                          style={
                            styles.resultInfo
                          }
                        >
                          <div
                            style={
                              styles.resultQuizId
                            }
                          >
                            QUIZ #{result.quiz_id}
                          </div>

                          <div
                            style={
                              styles.resultPercentage
                            }
                          >
                            {Number(
                              result.percentage ||
                                0
                            ).toFixed(
                              1
                            )}
                            %
                          </div>
                        </div>
                      </div>

                      <div
                        style={
                          styles.resultBottom
                        }
                      >
                        <span
                          style={
                            String(
                              result.result_status
                            ).toUpperCase() ===
                            "PASS"
                              ? styles.passBadge
                              : styles.failBadge
                          }
                        >
                          {String(
                            result.result_status ||
                              "RESULT"
                          ).toUpperCase()}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/student/quiz-tests/results?quizId=${result.quiz_id}`
                            )
                          }
                          style={
                            styles.smallButton
                          }
                        >
                          View →
                        </button>
                      </div>
                    </div>
                  )
                )}
            </div>
          )}
        </section>

        {/* FOOTER */}

        <footer
          style={
            styles.footer
          }
          className="quiz-footer"
        >
          <span>
            RACER ACADEMY • Student Quiz Center
          </span>

          <span>
            Quiz duration is fixed at 30 minutes.
          </span>
        </footer>
      </div>

      <style jsx global>{`
        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }

        html,
        body {
          width: 100%;
          max-width: 100%;
          margin: 0;
          padding: 0;
          overflow-x: hidden !important;
        }

        body {
          min-width: 0 !important;
        }

        button {
          max-width: 100%;
        }

        .student-quiz-page {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          overflow-x: hidden !important;
        }

        .student-quiz-container {
          width: 100% !important;
          max-width: 1250px !important;
          min-width: 0 !important;
        }

        .quiz-dashboard-header,
        .quiz-section,
        .quiz-stats-grid,
        .quiz-quick-grid,
        .quiz-grid,
        .quiz-result-grid {
          min-width: 0 !important;
          max-width: 100% !important;
        }

        .quiz-header-content,
        .quiz-section-heading,
        .quiz-quick-content,
        .quiz-empty-content {
          min-width: 0 !important;
          max-width: 100% !important;
        }

        .quiz-dashboard-header h1,
        .quiz-dashboard-header p,
        .quiz-section h2,
        .quiz-section h3,
        .quiz-section p,
        .quiz-quick-card h2,
        .quiz-quick-card p {
          max-width: 100%;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .quiz-quick-card {
          min-width: 0 !important;
          max-width: 100% !important;
        }

        .quiz-quick-card > div {
          min-width: 0;
          max-width: 100%;
        }

        .quiz-quick-card .quiz-quick-content {
          flex: 1 1 auto;
        }

        .quiz-quick-card .quiz-quick-content h2,
        .quiz-quick-card .quiz-quick-content p {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .quiz-grid > *,
        .quiz-result-grid > *,
        .quiz-stats-grid > * {
          min-width: 0 !important;
          max-width: 100% !important;
        }

        .quiz-grid .quiz-card-inner,
        .quiz-grid > div {
          min-width: 0;
          max-width: 100%;
        }

        @media (max-width: 900px) {
          .student-quiz-page {
            padding: 14px !important;
          }

          .quiz-dashboard-header {
            padding: 22px !important;
            border-radius: 20px !important;
            align-items: stretch !important;
          }

          .quiz-header-content {
            width: 100% !important;
            flex: 1 1 100% !important;
          }

          .quiz-class-badge {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
          }

          .quiz-stats-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
            gap: 10px !important;
          }

          .quiz-stats-grid > * {
            width: 100% !important;
          }

          .quiz-quick-grid {
            grid-template-columns:
              1fr !important;
            gap: 10px !important;
          }

          .quiz-quick-card {
            width: 100% !important;
          }

          .quiz-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
            gap: 12px !important;
          }

          .quiz-result-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }

          .quiz-section-header {
            min-width: 0 !important;
          }

          .quiz-section-title,
          .quiz-section-header h2 {
            min-width: 0 !important;
            overflow-wrap: anywhere !important;
          }

          .quiz-title,
          .quiz-description,
          .quiz-meta {
            min-width: 0 !important;
            max-width: 100% !important;
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
          }
        }

        @media (max-width: 600px) {
          .student-quiz-page {
            padding: 10px !important;
          }

          .student-quiz-container {
            width: 100% !important;
            max-width: 100% !important;
          }

          .quiz-dashboard-header {
            padding: 18px !important;
            margin-bottom: 14px !important;
            gap: 14px !important;
            border-radius: 18px !important;
          }

          .quiz-dashboard-header .quiz-header-content {
            width: 100% !important;
          }

          .quiz-dashboard-header h1 {
            font-size: 25px !important;
            line-height: 1.15 !important;
          }

          .quiz-dashboard-header p {
            font-size: 11px !important;
            line-height: 1.55 !important;
          }

          .quiz-class-badge {
            width: 100% !important;
            padding: 12px 14px !important;
            border-radius: 13px !important;
          }

          .quiz-class-badge .quiz-class-badge-value {
            font-size: 17px !important;
          }

          .quiz-stats-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
            gap: 8px !important;
            margin-bottom: 14px !important;
          }

          .quiz-stats-grid > * {
            padding: 11px !important;
            gap: 8px !important;
            border-radius: 13px !important;
            min-width: 0 !important;
          }

          .quiz-stats-grid > * > div:first-child {
            width: 34px !important;
            height: 34px !important;
            min-width: 34px !important;
            border-radius: 9px !important;
            font-size: 11px !important;
          }

          .quiz-stats-grid > * > div:last-child {
            min-width: 0 !important;
            flex: 1 1 auto !important;
          }

          .quiz-stats-grid > * > div:last-child > div:first-child {
            font-size: 8px !important;
            line-height: 1.25 !important;
            overflow-wrap: anywhere !important;
          }

          .quiz-stats-grid > * > div:last-child > div:last-child {
            font-size: 17px !important;
          }

          .quiz-quick-grid {
            grid-template-columns:
              1fr !important;
            gap: 8px !important;
            margin-bottom: 18px !important;
          }

          .quiz-quick-card {
            width: 100% !important;
            padding: 12px !important;
            gap: 10px !important;
            border-radius: 14px !important;
          }

          .quiz-quick-card .quiz-quick-content {
            min-width: 0 !important;
            flex: 1 1 auto !important;
          }

          .quiz-quick-card .quiz-quick-content h2 {
            font-size: 13px !important;
            line-height: 1.25 !important;
          }

          .quiz-quick-card .quiz-quick-content p {
            font-size: 9px !important;
            line-height: 1.4 !important;
          }

          .quiz-quick-card > div:first-child {
            width: 37px !important;
            height: 37px !important;
            min-width: 37px !important;
            border-radius: 10px !important;
          }

          .quiz-quick-card > span:last-child {
            flex: 0 0 auto !important;
            margin-left: auto !important;
            font-size: 16px !important;
          }

          .quiz-section {
            width: 100% !important;
            margin-bottom: 19px !important;
          }

          .quiz-section-header {
            width: 100% !important;
            align-items: flex-start !important;
            gap: 9px !important;
            margin-bottom: 10px !important;
          }

          .quiz-section-heading {
            flex: 1 1 auto !important;
            min-width: 0 !important;
          }

          .quiz-section-heading h2 {
            font-size: 18px !important;
            line-height: 1.25 !important;
          }

          .quiz-section-heading > div:first-child {
            font-size: 8px !important;
            letter-spacing: 1.5px !important;
          }

          .quiz-count-badge {
            flex: 0 0 auto !important;
            padding: 6px 9px !important;
            font-size: 9px !important;
          }

          .quiz-view-all-button {
            flex: 0 0 auto !important;
            max-width: 100px !important;
            font-size: 9px !important;
            white-space: normal !important;
            text-align: right !important;
          }

          .quiz-grid {
            width: 100% !important;
            grid-template-columns:
              1fr !important;
            gap: 10px !important;
          }

          .quiz-grid > div {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
          }

          .quiz-result-grid {
            width: 100% !important;
            grid-template-columns:
              1fr !important;
            gap: 9px !important;
          }

          .quiz-result-card {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            padding: 13px !important;
          }

          .quiz-empty-box {
            width: 100% !important;
            min-width: 0 !important;
            padding: 15px !important;
            gap: 10px !important;
            align-items: flex-start !important;
          }

          .quiz-empty-box > div:first-child {
            flex: 0 0 auto !important;
          }

          .quiz-empty-content {
            flex: 1 1 auto !important;
            min-width: 0 !important;
          }

          .quiz-empty-content h3 {
            font-size: 13px !important;
          }

          .quiz-empty-content p {
            font-size: 9px !important;
            line-height: 1.5 !important;
          }

          .quiz-footer {
            width: 100% !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            line-height: 1.5 !important;
          }
        }

        @media (max-width: 430px) {
          .student-quiz-page {
            padding: 8px !important;
          }

          .quiz-dashboard-header {
            padding: 15px !important;
            border-radius: 16px !important;
          }

          .quiz-dashboard-header h1 {
            font-size: 22px !important;
          }

          .quiz-dashboard-header p {
            font-size: 10px !important;
          }

          .quiz-stats-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
            gap: 7px !important;
          }

          .quiz-stats-grid > * {
            padding: 9px !important;
            gap: 7px !important;
          }

          .quiz-stats-grid > * > div:first-child {
            width: 30px !important;
            height: 30px !important;
            min-width: 30px !important;
            font-size: 10px !important;
          }

          .quiz-stats-grid > * > div:last-child > div:first-child {
            font-size: 7px !important;
          }

          .quiz-stats-grid > * > div:last-child > div:last-child {
            font-size: 15px !important;
          }

          .quiz-section-heading h2 {
            font-size: 17px !important;
          }

          .quiz-grid {
            grid-template-columns:
              1fr !important;
          }

          .quiz-result-grid {
            grid-template-columns:
              1fr !important;
          }
        }

        @media (max-width: 375px) {
          .student-quiz-page {
            padding: 6px !important;
          }

          .quiz-dashboard-header {
            padding: 13px !important;
          }

          .quiz-dashboard-header h1 {
            font-size: 20px !important;
          }

          .quiz-stats-grid {
            gap: 6px !important;
          }

          .quiz-stats-grid > * {
            padding: 8px !important;
            gap: 6px !important;
          }

          .quiz-stats-grid > * > div:first-child {
            width: 28px !important;
            height: 28px !important;
            min-width: 28px !important;
            font-size: 9px !important;
          }

          .quiz-stats-grid > * > div:last-child > div:first-child {
            font-size: 6.8px !important;
          }

          .quiz-stats-grid > * > div:last-child > div:last-child {
            font-size: 14px !important;
          }

          .quiz-quick-card {
            padding: 10px !important;
          }

          .quiz-quick-card .quiz-quick-content h2 {
            font-size: 12px !important;
          }

          .quiz-quick-card .quiz-quick-content p {
            font-size: 8px !important;
          }

          .quiz-section-heading h2 {
            font-size: 16px !important;
          }
        }

        @media (max-width: 360px) {
          .student-quiz-page {
            padding: 5px !important;
          }

          .quiz-stats-grid {
            gap: 5px !important;
          }

          .quiz-stats-grid > * {
            padding: 7px !important;
          }

          .quiz-stats-grid > * > div:first-child {
            width: 26px !important;
            height: 26px !important;
            min-width: 26px !important;
          }

          .quiz-dashboard-header h1 {
            font-size: 19px !important;
          }

          .quiz-section-heading h2 {
            font-size: 15px !important;
          }

          .quiz-view-all-button {
            max-width: 85px !important;
            font-size: 8px !important;
          }
        }
      `}</style>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div
      style={
        styles.statCard
      }
    >
      <div
        style={
          styles.statIcon
        }
      >
        {icon}
      </div>

      <div
        style={{
          minWidth: 0,
          flex: 1,
        }}
      >
        <div
          style={
            styles.statLabel
          }
        >
          {label}
        </div>

        <div
          style={
            styles.statValue
          }
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function QuizCard({
  quiz,
  status,
  attempted,
  result,
  onStart,
  onResult,
}: {
  quiz: Quiz;
  status:
    | "LIVE"
    | "UPCOMING"
    | "ENDED";
  attempted: boolean;
  result?: QuizResult;
  onStart: () => void;
  onResult: () => void;
}) {
  return (
    <div
      style={
        styles.quizCard
      }
      className="quiz-card-inner"
    >
      <div
        style={
          styles.quizCardTop
        }
      >
        <div
          style={
            styles.quizIcon
          }
        >
          Q
        </div>

        <span
          style={
            status === "LIVE"
              ? styles.liveBadge
              : styles.upcomingBadge
          }
        >
          {status}
        </span>
      </div>

      <h3
        style={
          styles.quizTitle
        }
      >
        {quiz.title}
      </h3>

      {quiz.description && (
        <p
          style={
            styles.quizDescription
          }
        >
          {quiz.description}
        </p>
      )}

      <div
        style={
          styles.quizMeta
        }
      >
        <span>
          Date:{" "}
          {formatQuizDate(
            quiz.scheduled_date
          )}
        </span>

        <span>
          Time:{" "}
          {formatQuizTime(
            quiz.scheduled_time
          )}
        </span>

        <span>
          Duration:{" "}
          {quiz.duration_minutes} min
        </span>

        <span>
          Marks/question:{" "}
          {quiz.marks_per_question}
        </span>

        <span>
          Negative:{" "}
          {quiz.negative_marks}
        </span>

        <span>
          Pass:{" "}
          {quiz.pass_percentage}%
        </span>
      </div>

      {attempted ? (
        <button
          type="button"
          onClick={onResult}
          style={
            styles.resultButton
          }
        >
          View Result →
        </button>
      ) : status === "LIVE" ? (
        <button
          type="button"
          onClick={onStart}
          style={
            styles.startButton
          }
        >
          Start Quiz →
        </button>
      ) : (
        <div
          style={
            styles.waitingButton
          }
        >
          Quiz will open at the scheduled time.
        </div>
      )}

      {result && (
        <div
          style={
            styles.resultMini
          }
        >
          Previous Result:{" "}
          {Number(
            result.percentage ||
              0
          ).toFixed(1)}
          %
        </div>
      )}
    </div>
  );
}

function formatQuizDate(
  date: string
): string {
  if (!date) {
    return "";
  }

  return new Date(
    `${date}T00:00:00`
  ).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatQuizTime(
  time: string
): string {
  if (!time) {
    return "";
  }

  const [
    hourText,
    minute = "00",
  ] = time.split(":");

  let hour =
    Number(hourText);

  const period =
    hour >= 12
      ? "PM"
      : "AM";

  hour =
    hour % 12 || 12;

  return `${hour}:${minute} ${period}`;
}

const styles: Record<
  string,
  CSSProperties
> = {
  page: {
    minHeight: "100vh",
    width: "100%",
    maxWidth: "100%",
    background:
      "linear-gradient(135deg,#f8fafc 0%,#eef2ff 50%,#f0f9ff 100%)",
    padding: "18px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#0f172a",
    overflowX: "hidden",
  },

  container: {
    width: "100%",
    maxWidth: "1250px",
    margin: "0 auto",
    minWidth: 0,
  },

  header: {
    background:
      "linear-gradient(135deg,#172554,#2563eb,#4f46e5)",
    borderRadius: "24px",
    padding: "28px",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: "20px",
    marginBottom: "18px",
    boxShadow:
      "0 18px 45px rgba(37,99,235,0.22)",
    flexWrap: "wrap",
    minWidth: 0,
  },

  headerEyebrow: {
    fontSize: "10px",
    fontWeight: 1000,
    letterSpacing: "2px",
    color: "#bfdbfe",
    marginBottom: "6px",
  },

  headerTitle: {
    margin: 0,
    fontSize: "30px",
    fontWeight: 1000,
    overflowWrap: "anywhere",
  },

  headerSubtitle: {
    margin: "8px 0 0",
    maxWidth: "650px",
    color: "#dbeafe",
    fontSize: "13px",
    lineHeight: 1.6,
    fontWeight: 600,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  classBadge: {
    background:
      "rgba(255,255,255,0.12)",
    border:
      "1px solid rgba(255,255,255,0.22)",
    borderRadius: "16px",
    padding: "14px 18px",
    minWidth: "150px",
    maxWidth: "100%",
    boxSizing: "border-box",
  },

  classBadgeSmall: {
    fontSize: "9px",
    letterSpacing: "1.5px",
    color: "#bfdbfe",
    fontWeight: 1000,
  },

  classBadgeValue: {
    marginTop: "5px",
    fontSize: "20px",
    fontWeight: 1000,
    color: "#ffffff",
    overflowWrap: "anywhere",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(5,minmax(0,1fr))",
    gap: "12px",
    marginBottom: "18px",
    minWidth: 0,
  },

  statCard: {
    background: "#ffffff",
    border:
      "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "15px",
    display: "flex",
    alignItems: "center",
    gap: "11px",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.05)",
    minWidth: 0,
    maxWidth: "100%",
  },

  statIcon: {
    width: "39px",
    height: "39px",
    minWidth: "39px",
    borderRadius: "11px",
    background: "#eef2ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: 1000,
    flexShrink: 0,
  },

  statLabel: {
    color: "#64748b",
    fontSize: "9px",
    fontWeight: 900,
    overflowWrap: "anywhere",
  },

  statValue: {
    marginTop: "2px",
    color: "#172554",
    fontSize: "20px",
    fontWeight: 1000,
  },

  quickGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3,minmax(0,1fr))",
    gap: "13px",
    marginBottom: "24px",
    minWidth: 0,
  },

  quickCard: {
    border:
      "1px solid #e2e8f0",
    background: "#ffffff",
    borderRadius: "17px",
    padding: "15px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    textAlign: "left",
    cursor: "pointer",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.05)",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
  },

  quickIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    background:
      "linear-gradient(135deg,#dbeafe,#ede9fe)",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: 1000,
    flexShrink: 0,
  },

  quickTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "14px",
    fontWeight: 1000,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  quickText: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "10px",
    fontWeight: 600,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  quickArrow: {
    marginLeft: "auto",
    color: "#2563eb",
    fontSize: "18px",
    fontWeight: 1000,
    flexShrink: 0,
  },

  section: {
    marginBottom: "24px",
    minWidth: 0,
    maxWidth: "100%",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent:
      "space-between",
    gap: "15px",
    marginBottom: "13px",
    minWidth: 0,
  },

  sectionEyebrow: {
    color: "#2563eb",
    fontSize: "9px",
    fontWeight: 1000,
    letterSpacing: "2px",
    marginBottom: "3px",
  },

  sectionTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "22px",
    fontWeight: 1000,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  countBadge: {
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "7px 11px",
    borderRadius: "9px",
    fontSize: "10px",
    fontWeight: 1000,
    flexShrink: 0,
  },

  viewAllButton: {
    border: "none",
    background: "transparent",
    color: "#2563eb",
    fontSize: "11px",
    fontWeight: 1000,
    cursor: "pointer",
    flexShrink: 0,
    maxWidth: "100%",
  },

  quizGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: "14px",
    minWidth: 0,
  },

  quizCard: {
    background: "#ffffff",
    border:
      "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "17px",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.05)",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
  },

  quizCardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: "10px",
    minWidth: 0,
  },

  quizIcon: {
    width: "40px",
    height: "40px",
    minWidth: "40px",
    borderRadius: "11px",
    background:
      "linear-gradient(135deg,#fef9c3,#fde68a)",
    color: "#92400e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: 1000,
    flexShrink: 0,
  },

  liveBadge: {
    background: "#dcfce7",
    color: "#15803d",
    border:
      "1px solid #bbf7d0",
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "9px",
    fontWeight: 1000,
    flexShrink: 0,
    maxWidth: "100%",
    overflowWrap: "anywhere",
  },

  upcomingBadge: {
    background: "#fef3c7",
    color: "#b45309",
    border:
      "1px solid #fde68a",
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "9px",
    fontWeight: 1000,
    flexShrink: 0,
    maxWidth: "100%",
    overflowWrap: "anywhere",
  },

  quizTitle: {
    margin: "13px 0 0",
    color: "#172554",
    fontSize: "18px",
    fontWeight: 1000,
    wordBreak: "break-word",
    overflowWrap: "anywhere",
    minWidth: 0,
  },

  quizDescription: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "11px",
    lineHeight: 1.6,
    fontWeight: 600,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    minWidth: 0,
  },

  quizMeta: {
    marginTop: "13px",
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: "7px",
    color: "#475569",
    fontSize: "9px",
    fontWeight: 700,
    minWidth: 0,
  },

  startButton: {
    width: "100%",
    maxWidth: "100%",
    marginTop: "15px",
    border: "none",
    background:
      "linear-gradient(135deg,#2563eb,#4f46e5)",
    color: "#ffffff",
    padding: "11px",
    borderRadius: "10px",
    fontSize: "11px",
    fontWeight: 1000,
    cursor: "pointer",
    boxSizing: "border-box",
  },

  resultButton: {
    width: "100%",
    maxWidth: "100%",
    marginTop: "15px",
    border:
      "1px solid #bbf7d0",
    background: "#f0fdf4",
    color: "#15803d",
    padding: "11px",
    borderRadius: "10px",
    fontSize: "11px",
    fontWeight: 1000,
    cursor: "pointer",
    boxSizing: "border-box",
  },

  waitingButton: {
    width: "100%",
    maxWidth: "100%",
    marginTop: "15px",
    boxSizing: "border-box",
    background: "#fffbeb",
    border:
      "1px solid #fde68a",
    color: "#b45309",
    padding: "10px",
    borderRadius: "10px",
    fontSize: "10px",
    fontWeight: 800,
    textAlign: "center",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  resultMini: {
    marginTop: "8px",
    color: "#64748b",
    fontSize: "9px",
    fontWeight: 700,
    textAlign: "center",
    overflowWrap: "anywhere",
  },

  emptyBox: {
    background: "#ffffff",
    border:
      "1px dashed #cbd5e1",
    borderRadius: "17px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "13px",
    minWidth: 0,
    maxWidth: "100%",
  },

  emptyIcon: {
    width: "44px",
    height: "44px",
    minWidth: "44px",
    borderRadius: "12px",
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: 1000,
    flexShrink: 0,
  },

  emptyTitle: {
    margin: 0,
    color: "#334155",
    fontSize: "14px",
    fontWeight: 1000,
    overflowWrap: "anywhere",
  },

  emptyText: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "10px",
    lineHeight: 1.5,
    fontWeight: 600,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  resultGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: "12px",
    minWidth: 0,
  },

  resultCard: {
    background: "#ffffff",
    border:
      "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "15px",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.05)",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
  },

  resultTop: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    minWidth: 0,
  },

  resultIcon: {
    width: "40px",
    height: "40px",
    minWidth: "40px",
    borderRadius: "11px",
    background: "#eef2ff",
    color: "#4338ca",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: 1000,
    flexShrink: 0,
  },

  resultInfo: {
    flex: 1,
    minWidth: 0,
  },

  resultQuizId: {
    color: "#64748b",
    fontSize: "8px",
    fontWeight: 900,
    letterSpacing: "1px",
    overflowWrap: "anywhere",
  },

  resultPercentage: {
    marginTop: "3px",
    color: "#172554",
    fontSize: "19px",
    fontWeight: 1000,
  },

  resultBottom: {
    marginTop: "13px",
    paddingTop: "11px",
    borderTop:
      "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: "10px",
    minWidth: 0,
  },

  passBadge: {
    background: "#dcfce7",
    color: "#15803d",
    padding: "5px 8px",
    borderRadius: "7px",
    fontSize: "8px",
    fontWeight: 1000,
    maxWidth: "100%",
    overflowWrap: "anywhere",
  },

  failBadge: {
    background: "#fee2e2",
    color: "#b91c1c",
    padding: "5px 8px",
    borderRadius: "7px",
    fontSize: "8px",
    fontWeight: 1000,
    maxWidth: "100%",
    overflowWrap: "anywhere",
  },

  smallButton: {
    border: "none",
    background: "#eff6ff",
    color: "#2563eb",
    padding: "7px 9px",
    borderRadius: "7px",
    fontSize: "9px",
    fontWeight: 1000,
    cursor: "pointer",
    flexShrink: 0,
  },

  footer: {
    marginTop: "28px",
    padding:
      "17px 5px",
    borderTop:
      "1px solid #e2e8f0",
    color: "#64748b",
    fontSize: "10px",
    fontWeight: 800,
    display: "flex",
    justifyContent:
      "space-between",
    gap: "10px",
    flexWrap: "wrap",
    minWidth: 0,
    maxWidth: "100%",
  },

  loadingBox: {
    minHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "20px",
  },

  loadingSpinner: {
    width: "36px",
    height: "36px",
    border:
      "3px solid #dbeafe",
    borderTop:
      "3px solid #2563eb",
    borderRadius: "50%",
    animation:
      "spin 1s linear infinite",
  },

  loadingTitle: {
    margin: "15px 0 0",
    color: "#172554",
    fontSize: "18px",
    fontWeight: 1000,
    overflowWrap: "anywhere",
  },

  loadingText: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: 600,
    overflowWrap: "anywhere",
  },

  errorBox: {
    width: "100%",
    maxWidth: "520px",
    margin: "15vh auto 0",
    background: "#ffffff",
    border:
      "1px solid #fecaca",
    borderRadius: "20px",
    padding: "28px",
    textAlign: "center",
    boxShadow:
      "0 15px 40px rgba(15,23,42,0.08)",
    boxSizing: "border-box",
  },

  errorIcon: {
    width: "50px",
    height: "50px",
    margin: "0 auto",
    borderRadius: "15px",
    background: "#fee2e2",
    color: "#b91c1c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "15px",
    fontWeight: 1000,
  },

  errorTitle: {
    margin: "13px 0 0",
    color: "#172554",
    fontSize: "21px",
    fontWeight: 1000,
    overflowWrap: "anywhere",
  },

  errorText: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: "11px",
    lineHeight: 1.6,
    fontWeight: 600,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  primaryButton: {
    marginTop: "17px",
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "10px 16px",
    borderRadius: "9px",
    fontSize: "11px",
    fontWeight: 1000,
    cursor: "pointer",
    maxWidth: "100%",
  },
};