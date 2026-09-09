"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type Quiz = {
  id: number;
  title: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  marks_per_question: number;
  negative_marks: number;
  pass_percentage: number;
  is_published: boolean;
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
};

type Student = {
  id: number;
  [key: string]: unknown;
};

type ResultRow = QuizResult & {
  student?: Student;
};

function getStudentName(
  student: Student | undefined
) {
  if (!student) {
    return "Student";
  }

  const possibleFields = [
    "student_name",
    "name",
    "full_name",
    "studentName",
  ];

  for (const field of possibleFields) {
    const value = student[field];

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return `Student #${student.id}`;
}

function getStudentUsername(
  student: Student | undefined
) {
  if (!student) {
    return "";
  }

  const possibleFields = [
    "student_username",
    "username",
    "studentUsername",
  ];

  for (const field of possibleFields) {
    const value = student[field];

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return "";
}

function formatDateTime(
  value: string | null
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatScheduledTime(
  quiz: Quiz
) {
  const date = new Date(
    `${quiz.scheduled_date}T${quiz.scheduled_time.slice(
      0,
      8
    )}`
  );

  if (Number.isNaN(date.getTime())) {
    return `${quiz.scheduled_date} ${quiz.scheduled_time}`;
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function TeacherQuizResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const quizIdParam = searchParams.get("quizId");

  const selectedQuizId =
    quizIdParam &&
    Number.isInteger(Number(quizIdParam))
      ? Number(quizIdParam)
      : null;

  const [quizzes, setQuizzes] = useState<
    Quiz[]
  >([]);

  const [results, setResults] = useState<
    ResultRow[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] =
    useState<number | "all">(
      selectedQuizId ?? "all"
    );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"ALL" | "PASS" | "FAIL">(
      "ALL"
    );

  const [error, setError] = useState("");

  const loadResults = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const {
          data: quizData,
          error: quizError,
        } = await supabase
          .from("quiz_tests")
          .select(
            `
            id,
            title,
            scheduled_date,
            scheduled_time,
            duration_minutes,
            marks_per_question,
            negative_marks,
            pass_percentage,
            is_published
            `
          )
          .order("scheduled_date", {
            ascending: false,
          });

        if (quizError) {
          throw new Error(
            quizError.message
          );
        }

        const loadedQuizzes =
          (quizData || []) as Quiz[];

        setQuizzes(loadedQuizzes);

        const {
          data: resultData,
          error: resultError,
        } = await supabase
          .from("quiz_results")
          .select("*")
          .order("submitted_at", {
            ascending: false,
            nullsFirst: false,
          });

        if (resultError) {
          throw new Error(
            resultError.message
          );
        }

        const loadedResults =
          (resultData || []) as QuizResult[];

        const studentIds = Array.from(
          new Set(
            loadedResults.map(
              (result) =>
                result.student_id
            )
          )
        );

        const studentsById =
          new Map<number, Student>();

        if (studentIds.length > 0) {
          const {
            data: studentData,
            error: studentError,
          } = await supabase
            .from("students")
            .select("*")
            .in("id", studentIds);

          if (studentError) {
            throw new Error(
              studentError.message
            );
          }

          (
            (studentData || []) as Student[]
          ).forEach((student) => {
            studentsById.set(
              student.id,
              student
            );
          });
        }

        const joinedResults: ResultRow[] =
          loadedResults.map(
            (result) => ({
              ...result,
              student:
                studentsById.get(
                  result.student_id
                ),
            })
          );

        setResults(joinedResults);

        if (
          selectedQuizId !== null
        ) {
          setSelectedQuiz(
            selectedQuizId
          );
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load results."
        );
      } finally {
        setLoading(false);
      }
    },
    [selectedQuizId]
  );

  useEffect(() => {
    void loadResults();
  }, [loadResults]);

  const filteredResults = useMemo(() => {
    const searchText =
      search.trim().toLowerCase();

    return results.filter((result) => {
      if (
        selectedQuiz !== "all" &&
        result.quiz_id !== selectedQuiz
      ) {
        return false;
      }

      if (
        statusFilter !== "ALL" &&
        result.result_status !==
          statusFilter
      ) {
        return false;
      }

      if (!searchText) {
        return true;
      }

      const quizTitle =
        quizzes.find(
          (quiz) =>
            quiz.id === result.quiz_id
        )?.title || "";

      const studentName =
        getStudentName(
          result.student
        );

      const username =
        getStudentUsername(
          result.student
        );

      const searchable =
        `${studentName} ${username} ${result.student_id} ${quizTitle}`.toLowerCase();

      return searchable.includes(
        searchText
      );
    });
  }, [
    results,
    quizzes,
    search,
    selectedQuiz,
    statusFilter,
  ]);

  const statistics = useMemo(() => {
    const total =
      filteredResults.length;

    const passed =
      filteredResults.filter(
        (result) =>
          result.result_status ===
          "PASS"
      ).length;

    const failed =
      filteredResults.filter(
        (result) =>
          result.result_status ===
          "FAIL"
      ).length;

    const attempted =
      filteredResults.filter(
        (result) =>
          Boolean(result.submitted_at)
      ).length;

    const average =
      total > 0
        ? filteredResults.reduce(
            (sum, result) =>
              sum +
              Number(
                result.percentage || 0
              ),
            0
          ) / total
        : 0;

    return {
      total,
      passed,
      failed,
      attempted,
      average:
        Math.round(average * 100) /
        100,
    };
  }, [filteredResults]);

  function getQuizTitle(
    quizId: number
  ) {
    return (
      quizzes.find(
        (quiz) => quiz.id === quizId
      )?.title ||
      `Quiz #${quizId}`
    );
  }

  function goToQuiz(
    quizId: number
  ) {
    router.push(
      `/teacher/quiz-tests/results?quizId=${quizId}`
    );
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={containerStyle}>
          <div style={loadingStyle}>
            Loading Quiz Results...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <header style={headerStyle}>
          <div>
            <div style={badgeStyle}>
              TEACHER • PERFORMANCE CENTER
            </div>

            <h1 style={mainHeadingStyle}>
              🏆 Quiz Results
            </h1>

            <p style={headerTextStyle}>
              View student-wise performance,
              marks, percentage and submission
              details.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/teacher/quiz-tests"
              )
            }
            style={headerButtonStyle}
          >
            ← Quiz Dashboard
          </button>
        </header>

        {error && (
          <div style={errorBoxStyle}>
            {error}
          </div>
        )}

        <section
          style={statsGridStyle}
        >
          <StatCard
            label="TOTAL RESULTS"
            value={statistics.total}
            icon="📊"
          />

          <StatCard
            label="PASSED"
            value={statistics.passed}
            icon="✅"
          />

          <StatCard
            label="FAILED"
            value={statistics.failed}
            icon="❌"
          />

          <StatCard
            label="AVERAGE"
            value={`${statistics.average}%`}
            icon="📈"
          />
        </section>

        <section style={controlCardStyle}>
          <div>
            <label style={filterLabelStyle}>
              QUIZ
            </label>

            <select
              value={selectedQuiz}
              onChange={(event) => {
                const value =
                  event.target.value;

                if (value === "all") {
                  setSelectedQuiz(
                    "all"
                  );

                  router.push(
                    "/teacher/quiz-tests/results"
                  );
                } else {
                  const id = Number(
                    value
                  );

                  setSelectedQuiz(id);
                  goToQuiz(id);
                }
              }}
              style={selectStyle}
            >
              <option value="all">
                All Quizzes
              </option>

              {quizzes.map((quiz) => (
                <option
                  key={quiz.id}
                  value={quiz.id}
                >
                  {quiz.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={filterLabelStyle}>
              STATUS
            </label>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as
                    | "ALL"
                    | "PASS"
                    | "FAIL"
                )
              }
              style={selectStyle}
            >
              <option value="ALL">
                All Results
              </option>
              <option value="PASS">
                PASS
              </option>
              <option value="FAIL">
                FAIL
              </option>
            </select>
          </div>

          <div
            style={{
              flex: 1,
              minWidth: 220,
            }}
          >
            <label style={filterLabelStyle}>
              SEARCH
            </label>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search student name, ID or quiz..."
              style={inputStyle}
            />
          </div>

          <button
            type="button"
            onClick={() =>
              void loadResults()
            }
            style={refreshButtonStyle}
          >
            ↻ Refresh
          </button>
        </section>

        {selectedQuiz !== "all" &&
          (() => {
            const quiz =
              quizzes.find(
                (item) =>
                  item.id ===
                  selectedQuiz
              );

            if (!quiz) {
              return null;
            }

            return (
              <section
                style={selectedQuizCardStyle}
              >
                <div>
                  <div
                    style={selectedQuizBadge}
                  >
                    SELECTED QUIZ
                  </div>

                  <h2
                    style={{
                      margin:
                        "5px 0 0",
                      color:
                        "#0f172a",
                      fontSize: 20,
                      fontWeight: 900,
                    }}
                  >
                    {quiz.title}
                  </h2>

                  <p
                    style={{
                      margin:
                        "5px 0 0",
                      color:
                        "#64748b",
                      fontSize: 13,
                    }}
                  >
                    Scheduled:{" "}
                    {formatScheduledTime(
                      quiz
                    )}
                  </p>
                </div>

                <div
                  style={{
                    textAlign:
                      "right",
                  }}
                >
                  <span
                    style={{
                      color:
                        "#94a3b8",
                      fontSize: 10,
                      fontWeight: 900,
                      display:
                        "block",
                    }}
                  >
                    PASS MARK
                  </span>

                  <strong
                    style={{
                      color:
                        "#16a34a",
                      fontSize: 20,
                    }}
                  >
                    {
                      quiz.pass_percentage
                    }
                    %
                  </strong>
                </div>
              </section>
            );
          })()}

        <section
          style={{
            marginTop: 20,
          }}
        >
          {filteredResults.length ===
          0 ? (
            <div style={emptyStyle}>
              <div
                style={{
                  fontSize: 48,
                  marginBottom: 10,
                }}
              >
                📭
              </div>

              <h2
                style={{
                  margin: 0,
                  color:
                    "#0f172a",
                }}
              >
                No results found
              </h2>

              <p
                style={{
                  margin:
                    "8px 0 0",
                  color:
                    "#64748b",
                }}
              >
                Student quiz results
                will appear here after
                submissions.
              </p>
            </div>
          ) : (
            <>
              <div
                style={{
                  marginBottom:
                    12,
                  color:
                    "#64748b",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Showing{" "}
                {filteredResults.length}{" "}
                result
                {filteredResults.length ===
                1
                  ? ""
                  : "s"}
              </div>

              <div
                style={{
                  display:
                    "grid",
                  gap: 14,
                }}
              >
                {filteredResults.map(
                  (result) => (
                    <article
                      key={
                        result.id
                      }
                      style={
                        resultCardStyle
                      }
                    >
                      <div
                        style={
                          resultTopStyle
                        }
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: 12,
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={
                              avatarStyle
                            }
                          >
                            {getStudentName(
                              result.student
                            )
                              .charAt(
                                0
                              )
                              .toUpperCase()}
                          </div>

                          <div
                            style={{
                              minWidth:
                                0,
                            }}
                          >
                            <h3
                              style={{
                                margin:
                                  0,
                                color:
                                  "#0f172a",
                                fontSize:
                                  17,
                                fontWeight:
                                  900,
                                overflowWrap:
                                  "anywhere",
                              }}
                            >
                              {getStudentName(
                                result.student
                              )}
                            </h3>

                            <p
                              style={{
                                margin:
                                  "4px 0 0",
                                color:
                                  "#64748b",
                                fontSize:
                                  12,
                              }}
                            >
                              ID:{" "}
                              <strong>
                                {
                                  result.student_id
                                }
                              </strong>

                              {getStudentUsername(
                                result.student
                              ) && (
                                <>
                                  {" "}
                                  •{" "}
                                  {
                                    getStudentUsername(
                                      result.student
                                    )
                                  }
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: 10,
                            flexWrap:
                              "wrap",
                            justifyContent:
                              "flex-end",
                          }}
                        >
                          <span
                            style={
                              result.result_status ===
                              "PASS"
                                ? passBadgeStyle
                                : failBadgeStyle
                            }
                          >
                            {
                              result.result_status
                            }
                          </span>

                          <div
                            style={
                              scoreStyle
                            }
                          >
                            {
                              result.percentage
                            }
                            %
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop:
                            15,
                          paddingTop:
                            15,
                          borderTop:
                            "1px solid #e2e8f0",
                        }}
                      >
                        <div
                          style={
                            metricsGridStyle
                          }
                        >
                          <Metric
                            label="QUIZ"
                            value={getQuizTitle(
                              result.quiz_id
                            )}
                          />

                          <Metric
                            label="SCORE"
                            value={`${result.obtained_marks} / ${result.total_marks}`}
                          />

                          <Metric
                            label="CORRECT"
                            value={
                              result.correct_answers
                            }
                          />

                          <Metric
                            label="WRONG"
                            value={
                              result.wrong_answers
                            }
                          />

                          <Metric
                            label="UNANSWERED"
                            value={
                              result.unanswered
                            }
                          />

                          <Metric
                            label="SUBMITTED"
                            value={formatDateTime(
                              result.submitted_at
                            )}
                          />
                        </div>

                        <div
                          style={{
                            marginTop:
                              12,
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            alignItems:
                              "center",
                            gap: 10,
                            flexWrap:
                              "wrap",
                          }}
                        >
                          <span
                            style={{
                              color:
                                "#94a3b8",
                              fontSize:
                                11,
                              fontWeight:
                                700,
                            }}
                          >
                            Submission:{" "}
                            {
                              result.submission_type
                            }
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/teacher/quiz-tests/results?quizId=${result.quiz_id}`
                              )
                            }
                            style={
                              viewQuizButtonStyle
                            }
                          >
                            View Quiz Results →
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                )}
              </div>
            </>
          )}
        </section>

        <footer
          style={{
            textAlign: "center",
            marginTop: 32,
            color: "#94a3b8",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          RACER ACADEMY • Quiz Performance
          Center
        </footer>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: string;
}) {
  return (
    <div style={statCardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            color: "#64748b",
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: 0.8,
          }}
        >
          {label}
        </span>

        <span
          style={{
            fontSize: 22,
          }}
        >
          {icon}
        </span>
      </div>

      <strong
        style={{
          display: "block",
          marginTop: 8,
          color: "#0f172a",
          fontSize: 27,
          fontWeight: 900,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <span
        style={{
          display: "block",
          color: "#94a3b8",
          fontSize: 9,
          fontWeight: 900,
          letterSpacing: 0.7,
          marginBottom: 4,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          color: "#334155",
          fontSize: 13,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

export default function TeacherQuizResultsPage() {
  return (
    <Suspense
      fallback={
        <main style={pageStyle}>
          <div style={containerStyle}>
            <div style={loadingStyle}>
              Loading Quiz Results...
            </div>
          </div>
        </main>
      }
    >
      <TeacherQuizResultsContent />
    </Suspense>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: "24px 16px 40px",
  background:
    "linear-gradient(135deg,#f8fafc 0%,#eef2ff 50%,#f8fafc 100%)",
  fontFamily:
    "Arial, Helvetica, sans-serif",
  boxSizing: "border-box",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
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

const headerTextStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#cbd5e1",
  fontSize: 14,
  fontWeight: 600,
};

const headerButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.08)",
  color: "#ffffff",
  padding: "11px 16px",
  borderRadius: 10,
  fontWeight: 900,
  cursor: "pointer",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(190px,1fr))",
  gap: 14,
  marginTop: 18,
};

const statCardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 18,
  padding: 18,
  boxShadow:
    "0 8px 28px rgba(15,23,42,0.07)",
};

const controlCardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 18,
  padding: 16,
  marginTop: 18,
  display: "flex",
  alignItems: "flex-end",
  gap: 12,
  flexWrap: "wrap",
  boxShadow:
    "0 8px 28px rgba(15,23,42,0.07)",
};

const filterLabelStyle: React.CSSProperties = {
  display: "block",
  color: "#64748b",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: 0.8,
  marginBottom: 6,
};

const selectStyle: React.CSSProperties = {
  minWidth: 190,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  borderRadius: 10,
  padding: "11px 12px",
  fontSize: 13,
  fontWeight: 700,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 200,
  boxSizing: "border-box",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  borderRadius: 10,
  padding: "11px 12px",
  fontSize: 13,
  outline: "none",
};

const refreshButtonStyle: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#334155",
  padding: "11px 15px",
  borderRadius: 10,
  fontWeight: 900,
  cursor: "pointer",
};

const selectedQuizCardStyle: React.CSSProperties = {
  marginTop: 14,
  background:
    "linear-gradient(135deg,#eef2ff,#f5f3ff)",
  border: "1px solid #c7d2fe",
  borderRadius: 18,
  padding: 18,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
  flexWrap: "wrap",
};

const selectedQuizBadge: React.CSSProperties = {
  color: "#4f46e5",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: 1,
};

const resultCardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 18,
  padding: 18,
  boxShadow:
    "0 8px 28px rgba(15,23,42,0.07)",
  border: "1px solid #e2e8f0",
};

const resultTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
  flexWrap: "wrap",
};

const avatarStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  minWidth: 48,
  borderRadius: 14,
  background:
    "linear-gradient(135deg,#dbeafe,#e0e7ff)",
  color: "#4338ca",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 18,
  fontWeight: 900,
};

const passBadgeStyle: React.CSSProperties = {
  background: "#dcfce7",
  color: "#15803d",
  padding: "7px 10px",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 900,
};

const failBadgeStyle: React.CSSProperties = {
  background: "#fee2e2",
  color: "#dc2626",
  padding: "7px 10px",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 900,
};

const scoreStyle: React.CSSProperties = {
  color: "#4f46e5",
  fontSize: 25,
  fontWeight: 900,
};

const metricsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(130px,1fr))",
  gap: 15,
};

const viewQuizButtonStyle: React.CSSProperties = {
  border: "none",
  background: "#eef2ff",
  color: "#4338ca",
  padding: "9px 12px",
  borderRadius: 9,
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 11,
};

const emptyStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  padding: "60px 25px",
  textAlign: "center",
  boxShadow:
    "0 10px 30px rgba(15,23,42,0.07)",
};

const errorBoxStyle: React.CSSProperties = {
  background: "#fef2f2",
  color: "#b91c1c",
  border: "1px solid #fecaca",
  borderRadius: 12,
  padding: "12px 14px",
  marginTop: 16,
  fontWeight: 700,
  fontSize: 13,
};
