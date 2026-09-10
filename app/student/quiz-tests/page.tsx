"use client";

import { useEffect, useState } from "react";
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

  const [student, setStudent] = useState<Student | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  function normalizeClass(value: unknown): string {
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
          .map((item) => normalizeClass(item))
          .filter(Boolean)
      : [];

    /*
     * NEW QUIZZES:
     * target_classes is the main source of truth.
     */
    if (targetClasses.length > 0) {
      return targetClasses.includes(
        normalizedStudentClass
      );
    }

    /*
     * OLD QUIZZES:
     * If target_classes is empty, use class_name.
     */
    return (
      normalizeClass(quiz.class_name) ===
      normalizedStudentClass
    );
  }

  async function loadDashboard() {
    setLoading(true);
    setErrorMessage("");

    try {
      let currentStudentId: number | null =
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
        localStorage.getItem("studentId") ||
        localStorage.getItem(
          "student_id"
        ) ||
        localStorage.getItem(
          "attendance_student_id"
        ) ||
        "";

      /*
       * First try username because it is the
       * most reliable student login identifier.
       */
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
          currentStudentId = Number(
            data.id
          );

          setStudent(
            data as Student
          );

          localStorage.setItem(
            "studentId",
            String(currentStudentId)
          );
        }
      }

      /*
       * Fallback to stored student ID.
       */
      if (
        currentStudentId === null &&
        storedId
      ) {
        const numericId = Number(
          storedId
        );

        if (
          Number.isFinite(numericId) &&
          numericId > 0
        ) {
          const { data, error } =
            await supabase
              .from("students")
              .select(
                "id,student_name,student_username,class_name"
              )
              .eq("id", numericId)
              .maybeSingle();

          if (error) {
            console.error(
              "Student ID lookup error:",
              error
            );
          }

          if (data?.id) {
            currentStudentId = Number(
              data.id
            );

            setStudent(
              data as Student
            );
          }
        }
      }

      if (currentStudentId === null) {
        setErrorMessage(
          "Student login information not found. Please login again."
        );
        setLoading(false);
        return;
      }

      /*
       * Load published quizzes.
       *
       * target_classes is included so the dashboard
       * can filter quizzes according to student class.
       */
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
        .eq("is_published", true)
        .order("scheduled_date", {
          ascending: true,
        })
        .order("scheduled_time", {
          ascending: true,
        });

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

      /*
       * IMPORTANT:
       * Only quizzes matching the student's class
       * are kept.
       */
      const studentClass =
        dataClassName(
          student,
          quizData,
          currentStudentId
        );

      /*
       * student state may not yet be updated because
       * setStudent is asynchronous. Therefore fetch the
       * class directly if necessary.
       */
      let actualStudentClass =
        studentClass;

      if (!actualStudentClass) {
        const { data: freshStudent } =
          await supabase
            .from("students")
            .select(
              "id,student_name,student_username,class_name"
            )
            .eq(
              "id",
              currentStudentId
            )
            .maybeSingle();

        if (freshStudent) {
          actualStudentClass =
            freshStudent.class_name ||
            "";

          setStudent(
            freshStudent as Student
          );
        }
      }

      const filteredQuizzes =
        ((quizData || []) as Quiz[]).filter(
          (quiz) =>
            quizBelongsToStudent(
              quiz,
              actualStudentClass
            )
        );

      setQuizzes(
        filteredQuizzes
      );

      /*
       * Load student's results.
       */
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
        .order("quiz_id", {
          ascending: false,
        });

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

  function dataClassName(
    currentStudent: Student | null,
    _quizData: unknown,
    _studentId: number
  ): string {
    return currentStudent?.class_name || "";
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
      getStartTime(quiz).getTime() +
        quiz.duration_minutes *
          60 *
          1000
    );
  }

  function getStatus(
    quiz: Quiz
  ): "LIVE" | "UPCOMING" | "ENDED" {
    const now = new Date();
    const start =
      getStartTime(quiz);
    const end =
      getEndTime(quiz);

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
        Number(result.quiz_id) ===
        Number(quizId)
    );
  }

  function getResult(
    quizId: number
  ): QuizResult | undefined {
    return results.find(
      (result) =>
        Number(result.quiz_id) ===
        Number(quizId)
    );
  }

  function formatDate(
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

  function formatTime(
    time: string
  ): string {
    if (!time) {
      return "";
    }

    const parts =
      time.split(":");

    const hourText =
      parts[0] || "0";

    const minute =
      parts[1] || "00";

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

  function getClassDisplay(): string {
    if (!student?.class_name) {
      return "Class not available";
    }

    const normalized =
      normalizeClass(
        student.class_name
      );

    if (/^\d+$/.test(normalized)) {
      return `Class ${normalized}`;
    }

    return student.class_name;
  }

  const liveQuizzes =
    quizzes.filter(
      (quiz) =>
        getStatus(quiz) ===
        "LIVE"
    );

  const upcomingQuizzes =
    quizzes.filter(
      (quiz) =>
        getStatus(quiz) ===
        "UPCOMING"
    );

  const availableQuizzes =
    quizzes.filter(
      (quiz) => {
        const status =
          getStatus(quiz);

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
          (total, result) =>
            total +
            Number(
              result.percentage || 0
            ),
          0
        ) / results.length
      : 0;

  if (loading) {
    return (
      <main style={styles.page}>
        <div
          style={styles.loadingBox}
        >
          <div
            style={styles.loadingSpinner}
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
      <main style={styles.page}>
        <div
          style={styles.errorBox}
        >
          <div
            style={styles.errorIcon}
          >
            Q
          </div>

          <h1
            style={styles.errorTitle}
          >
            Quiz Dashboard
          </h1>

          <p
            style={styles.errorText}
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
    <main style={styles.page}>
      <div
        style={styles.container}
      >
        {/* HEADER */}

        <header
          style={styles.header}
        >
          <div>
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
          style={styles.statsGrid}
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
          style={styles.quickGrid}
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
          >
            <div
              style={
                styles.quickIcon
              }
            >
              GO
            </div>

            <div>
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
          >
            <div
              style={
                styles.quickIcon
              }
            >
              H
            </div>

            <div>
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
          >
            <div
              style={
                styles.quickIcon
              }
            >
              R
            </div>

            <div>
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
          style={styles.section}
        >
          <div
            style={
              styles.sectionHeader
            }
          >
            <div>
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
            >
              <div
                style={
                  styles.emptyIcon
                }
              >
                Q
              </div>

              <div>
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
          style={styles.section}
        >
          <div
            style={
              styles.sectionHeader
            }
          >
            <div>
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
            >
              <div
                style={
                  styles.emptyIcon
                }
              >
                C
              </div>

              <div>
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
          style={styles.section}
        >
          <div
            style={
              styles.sectionHeader
            }
          >
            <div>
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
            >
              View All →
            </button>
          </div>

          {/*
           * IMPORTANT:
           * availableQuizzes is already filtered by
           * quizBelongsToStudent().
           *
           * Therefore this section CANNOT show quizzes
           * belonging to other classes.
           */}

          {availableQuizzes.length ===
          0 ? (
            <div
              style={
                styles.emptyBox
              }
            >
              <div
                style={
                  styles.emptyIcon
                }
              >
                Q
              </div>

              <div>
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
          style={styles.section}
        >
          <div
            style={
              styles.sectionHeader
            }
          >
            <div>
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
            >
              <div
                style={
                  styles.emptyIcon
                }
              >
                R
              </div>

              <div>
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
          style={styles.footer}
        >
          RACER ACADEMY • Student Quiz Center
          <span>
            Quiz duration is fixed at 30 minutes.
          </span>
        </footer>
      </div>
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
      style={styles.statCard}
    >
      <div
        style={styles.statIcon}
      >
        {icon}
      </div>

      <div>
        <div
          style={styles.statLabel}
        >
          {label}
        </div>

        <div
          style={styles.statValue}
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
      style={styles.quizCard}
    >
      <div
        style={styles.quizCardTop}
      >
        <div
          style={styles.quizIcon}
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
        style={styles.quizTitle}
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
        style={styles.quizMeta}
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
            result.percentage || 0
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
  const [
    hourText,
    minute = "00",
  ] = time.split(":");

  let hour =
    Number(hourText);

  const period =
    hour >= 12 ? "PM" : "AM";

  hour =
    hour % 12 || 12;

  return `${hour}:${minute} ${period}`;
}

const styles: {
  [key: string]: React.CSSProperties;
} = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#f8fafc 0%,#eef2ff 50%,#f0f9ff 100%)",
    padding: "18px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#0f172a",
  },

  container: {
    width: "100%",
    maxWidth: "1250px",
    margin: "0 auto",
  },

  header: {
    background:
      "linear-gradient(135deg,#172554,#2563eb,#4f46e5)",
    borderRadius: "24px",
    padding: "28px",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "18px",
    boxShadow:
      "0 18px 45px rgba(37,99,235,0.22)",
    flexWrap: "wrap",
  },

  headerEyebrow: {
    fontSize: "10px",
    fontWeight: "1000",
    letterSpacing: "2px",
    color: "#bfdbfe",
    marginBottom: "6px",
  },

  headerTitle: {
    margin: 0,
    fontSize: "30px",
    fontWeight: "1000",
  },

  headerSubtitle: {
    margin: "8px 0 0",
    maxWidth: "650px",
    color: "#dbeafe",
    fontSize: "13px",
    lineHeight: 1.6,
    fontWeight: "600",
  },

  classBadge: {
    background:
      "rgba(255,255,255,0.12)",
    border:
      "1px solid rgba(255,255,255,0.22)",
    borderRadius: "16px",
    padding: "14px 18px",
    minWidth: "150px",
  },

  classBadgeSmall: {
    fontSize: "9px",
    letterSpacing: "1.5px",
    color: "#bfdbfe",
    fontWeight: "1000",
  },

  classBadgeValue: {
    marginTop: "5px",
    fontSize: "20px",
    fontWeight: "1000",
    color: "#ffffff",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(5,minmax(0,1fr))",
    gap: "12px",
    marginBottom: "18px",
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
  },

  statIcon: {
    width: "39px",
    height: "39px",
    borderRadius: "11px",
    background: "#eef2ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "1000",
  },

  statLabel: {
    color: "#64748b",
    fontSize: "9px",
    fontWeight: "900",
  },

  statValue: {
    marginTop: "2px",
    color: "#172554",
    fontSize: "20px",
    fontWeight: "1000",
  },

  quickGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3,minmax(0,1fr))",
    gap: "13px",
    marginBottom: "24px",
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
    fontWeight: "1000",
    flexShrink: 0,
  },

  quickTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "14px",
    fontWeight: "1000",
  },

  quickText: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "600",
  },

  quickArrow: {
    marginLeft: "auto",
    color: "#2563eb",
    fontSize: "18px",
    fontWeight: "1000",
  },

  section: {
    marginBottom: "24px",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "13px",
  },

  sectionEyebrow: {
    color: "#2563eb",
    fontSize: "9px",
    fontWeight: "1000",
    letterSpacing: "2px",
    marginBottom: "3px",
  },

  sectionTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "22px",
    fontWeight: "1000",
  },

  countBadge: {
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "7px 11px",
    borderRadius: "9px",
    fontSize: "10px",
    fontWeight: "1000",
  },

  viewAllButton: {
    border: "none",
    background: "transparent",
    color: "#2563eb",
    fontSize: "11px",
    fontWeight: "1000",
    cursor: "pointer",
  },

  quizGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: "14px",
  },

  quizCard: {
    background: "#ffffff",
    border:
      "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "17px",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.05)",
  },

  quizCardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
  },

  quizIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "11px",
    background:
      "linear-gradient(135deg,#fef9c3,#fde68a)",
    color: "#92400e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "1000",
  },

  liveBadge: {
    background: "#dcfce7",
    color: "#15803d",
    border:
      "1px solid #bbf7d0",
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "9px",
    fontWeight: "1000",
  },

  upcomingBadge: {
    background: "#fef3c7",
    color: "#b45309",
    border:
      "1px solid #fde68a",
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "9px",
    fontWeight: "1000",
  },

  quizTitle: {
    margin: "13px 0 0",
    color: "#172554",
    fontSize: "18px",
    fontWeight: "1000",
    wordBreak: "break-word",
  },

  quizDescription: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "11px",
    lineHeight: 1.6,
    fontWeight: "600",
  },

  quizMeta: {
    marginTop: "13px",
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: "7px",
    color: "#475569",
    fontSize: "9px",
    fontWeight: "700",
  },

  startButton: {
    width: "100%",
    marginTop: "15px",
    border: "none",
    background:
      "linear-gradient(135deg,#2563eb,#4f46e5)",
    color: "#ffffff",
    padding: "11px",
    borderRadius: "10px",
    fontSize: "11px",
    fontWeight: "1000",
    cursor: "pointer",
  },

  resultButton: {
    width: "100%",
    marginTop: "15px",
    border:
      "1px solid #bbf7d0",
    background: "#f0fdf4",
    color: "#15803d",
    padding: "11px",
    borderRadius: "10px",
    fontSize: "11px",
    fontWeight: "1000",
    cursor: "pointer",
  },

  waitingButton: {
    width: "100%",
    marginTop: "15px",
    boxSizing: "border-box",
    background: "#fffbeb",
    border:
      "1px solid #fde68a",
    color: "#b45309",
    padding: "10px",
    borderRadius: "10px",
    fontSize: "10px",
    fontWeight: "800",
    textAlign: "center",
  },

  resultMini: {
    marginTop: "8px",
    color: "#64748b",
    fontSize: "9px",
    fontWeight: "700",
    textAlign: "center",
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
  },

  emptyIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "1000",
    flexShrink: 0,
  },

  emptyTitle: {
    margin: 0,
    color: "#334155",
    fontSize: "14px",
    fontWeight: "1000",
  },

  emptyText: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "10px",
    lineHeight: 1.5,
    fontWeight: "600",
  },

  resultGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: "12px",
  },

  resultCard: {
    background: "#ffffff",
    border:
      "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "15px",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.05)",
  },

  resultTop: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
  },

  resultIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "11px",
    background: "#eef2ff",
    color: "#4338ca",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "1000",
  },

  resultInfo: {
    flex: 1,
  },

  resultQuizId: {
    color: "#64748b",
    fontSize: "8px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  resultPercentage: {
    marginTop: "3px",
    color: "#172554",
    fontSize: "19px",
    fontWeight: "1000",
  },

  resultBottom: {
    marginTop: "13px",
    paddingTop: "11px",
    borderTop:
      "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
  },

  passBadge: {
    background: "#dcfce7",
    color: "#15803d",
    padding: "5px 8px",
    borderRadius: "7px",
    fontSize: "8px",
    fontWeight: "1000",
  },

  failBadge: {
    background: "#fee2e2",
    color: "#b91c1c",
    padding: "5px 8px",
    borderRadius: "7px",
    fontSize: "8px",
    fontWeight: "1000",
  },

  smallButton: {
    border: "none",
    background: "#eff6ff",
    color: "#2563eb",
    padding: "7px 9px",
    borderRadius: "7px",
    fontSize: "9px",
    fontWeight: "1000",
    cursor: "pointer",
  },

  footer: {
    marginTop: "28px",
    padding:
      "17px 5px",
    borderTop:
      "1px solid #e2e8f0",
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "800",
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    flexWrap: "wrap",
  },

  loadingBox: {
    minHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
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
    fontWeight: "1000",
  },

  loadingText: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "600",
  },

  errorBox: {
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
    fontWeight: "1000",
  },

  errorTitle: {
    margin: "13px 0 0",
    color: "#172554",
    fontSize: "21px",
    fontWeight: "1000",
  },

  errorText: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: "11px",
    lineHeight: 1.6,
    fontWeight: "600",
  },

  primaryButton: {
    marginTop: "17px",
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "10px 16px",
    borderRadius: "9px",
    fontSize: "11px",
    fontWeight: "1000",
    cursor: "pointer",
  },
};     align-items: flex-start;
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