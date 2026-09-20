"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type QuizTest = {
  id: number;
  title: string;
  description: string | null;
  class_name: string | null;
  target_classes: string[] | null;
  subject: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  duration_minutes: number | null;
  marks_per_question: number | null;
  negative_marks: number | null;
  pass_percentage: number | null;
  is_published: boolean;
  created_at: string | null;
};

type Student = {
  id: number;
  student_name: string | null;
  student_username: string | null;
  class_name: string | null;
};

type QuizResult = {
  id: number;
  quiz_id: number;
  student_id: number;

  attempt_number: number | null;

  total_questions: number | null;
  correct_answers: number | null;
  wrong_answers: number | null;
  unanswered: number | null;

  total_marks: number | null;
  obtained_marks: number | null;
  percentage: number | null;

  result_status: string | null;

  started_at: string | null;
  submitted_at: string | null;
  submission_type: string | null;

  created_at: string | null;
};

type StudentResultGroup = {
  student: Student;
  results: QuizResult[];
};

function safeNumber(
  value: unknown,
  fallback = 0
): number {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function formatDate(
  value: string | null
): string {
  if (!value) {
    return "Date not available";
  }

  const date = new Date(
    `${value}T00:00:00+05:30`
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }
  );
}

function formatDateTime(
  value: string | null
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }
  );
}

function formatTime(
  value: string | null
): string {
  if (!value) {
    return "—";
  }

  const parts = value.split(":");

  if (parts.length < 2) {
    return value;
  }

  const hour = Number(parts[0]);
  const minute = Number(parts[1]);

  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return value;
  }

  const date = new Date();

  date.setHours(
    hour,
    minute,
    0,
    0
  );

  return date.toLocaleTimeString(
    "en-IN",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }
  );
}

function getClassNames(
  quiz: QuizTest | null,
  students: Student[]
): string[] {
  const classSet = new Set<string>();

  if (quiz?.class_name) {
    classSet.add(
      quiz.class_name.trim()
    );
  }

  if (Array.isArray(quiz?.target_classes)) {
    quiz.target_classes.forEach(
      (className) => {
        if (
          typeof className ===
            "string" &&
          className.trim()
        ) {
          classSet.add(
            className.trim()
          );
        }
      }
    );
  }

  students.forEach((student) => {
    if (
      student.class_name &&
      student.class_name.trim()
    ) {
      classSet.add(
        student.class_name.trim()
      );
    }
  });

  return Array.from(
    classSet
  ).sort((a, b) =>
    a.localeCompare(
      b,
      undefined,
      {
        numeric: true,
        sensitivity: "base",
      }
    )
  );
}

function resultStatus(
  result: QuizResult
): string {
  if (
    result.result_status
  ) {
    return result.result_status;
  }

  return "—";
}

function statusClass(
  result: QuizResult
): string {
  const status =
    resultStatus(
      result
    ).toUpperCase();

  if (
    status === "PASS" ||
    status === "PASSED"
  ) {
    return "status-pass";
  }

  if (
    status === "FAIL" ||
    status === "FAILED"
  ) {
    return "status-fail";
  }

  return "status-neutral";
}

function getAttemptLabel(
  result: QuizResult
): string {
  const attempt =
    Math.max(
      1,
      safeNumber(
        result.attempt_number,
        1
      )
    );

  return attempt === 1
    ? "Original Attempt"
    : `Re-attempt #${attempt}`;
}

export default function TeacherQuizResultsPage() {
  const searchParams =
    useSearchParams();

  const quizIdParam =
    searchParams.get(
      "quizId"
    );

  const quizId =
    Number(quizIdParam);

  const [
    quiz,
    setQuiz,
  ] =
    useState<QuizTest | null>(
      null
    );

  const [
    students,
    setStudents,
  ] =
    useState<Student[]>([]);

  const [
    results,
    setResults,
  ] =
    useState<QuizResult[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    expandedDates,
    setExpandedDates,
  ] =
    useState<Set<string>>(
      new Set()
    );

  const [
    expandedClasses,
    setExpandedClasses,
  ] =
    useState<Set<string>>(
      new Set()
    );

  const [
    expandedStudents,
    setExpandedStudents,
  ] =
    useState<Set<number>>(
      new Set()
    );

  const [
    reattemptQuizIds,
    setReattemptQuizIds,
  ] =
    useState<Set<number>>(
      new Set()
    );

  const [
    reattemptLoading,
    setReattemptLoading,
  ] =
    useState(false);

  const [
    reattemptMessage,
    setReattemptMessage,
  ] =
    useState("");

  const loadReattemptPermissions =
    useCallback(
      async (
        currentQuizId: number,
        studentRows: Student[]
      ) => {
        if (
          !currentQuizId ||
          studentRows.length === 0
        ) {
          setReattemptQuizIds(
            new Set()
          );
          return;
        }

        setReattemptLoading(
          true
        );

        try {
          const allowedIds =
            new Set<number>();

          await Promise.all(
            studentRows.map(
              async (student) => {
                try {
                  const response =
                    await fetch(
                      `/api/quiz-tests/reattempt?studentId=${encodeURIComponent(
                        String(
                          student.id
                        )
                      )}`,
                      {
                        method:
                          "GET",
                        cache:
                          "no-store",
                      }
                    );

                  if (
                    !response.ok
                  ) {
                    return;
                  }

                  const data =
                    await response.json();

                  const quizIds =
                    Array.isArray(
                      data?.quizIds
                    )
                      ? data.quizIds
                      : [];

                  if (
                    quizIds.some(
                      (id: unknown) =>
                        Number(id) ===
                        currentQuizId
                    )
                  ) {
                    allowedIds.add(
                      student.id
                    );
                  }
                } catch {
                  return;
                }
              }
            )
          );

          setReattemptQuizIds(
            allowedIds
          );
        } finally {
          setReattemptLoading(
            false
          );
        }
      },
      []
    );

  const loadData =
    useCallback(
      async () => {
        if (
          !quizId ||
          !Number.isFinite(
            quizId
          )
        ) {
          setError(
            "Quiz ID is missing."
          );
          setLoading(false);
          return;
        }

        setLoading(true);
        setError("");

        try {
          /*
           * ---------------------------------------------------
           * LOAD QUIZ
           * ---------------------------------------------------
           */

          const {
            data: quizData,
            error: quizError,
          } =
            await supabase
              .from(
                "quiz_tests"
              )
              .select("*")
              .eq(
                "id",
                quizId
              )
              .maybeSingle();

          if (quizError) {
            throw new Error(
              quizError.message
            );
          }

          if (!quizData) {
            throw new Error(
              "Quiz not found."
            );
          }

          /*
           * ---------------------------------------------------
           * LOAD RESULTS
           * ---------------------------------------------------
           *
           * IMPORTANT:
           * Do NOT use maybeSingle().
           *
           * One student can now have:
           * Attempt #1
           * Re-attempt #2
           * Re-attempt #3
           * etc.
           */

          const {
            data: resultRows,
            error:
              resultsError,
          } =
            await supabase
              .from(
                "quiz_results"
              )
              .select("*")
              .eq(
                "quiz_id",
                quizId
              )
              .order(
                "created_at",
                {
                  ascending:
                    true,
                }
              );

          if (resultsError) {
            throw new Error(
              resultsError.message
            );
          }

          const cleanResults =
            (
              resultRows || []
            ).map(
              (
                result
              ) => ({
                ...result,
                id: Number(
                  result.id
                ),
                quiz_id:
                  Number(
                    result.quiz_id
                  ),
                student_id:
                  Number(
                    result.student_id
                  ),
                attempt_number:
                  Math.max(
                    1,
                    safeNumber(
                      result.attempt_number,
                      1
                    )
                  ),
              })
            );

          /*
           * ---------------------------------------------------
           * LOAD STUDENTS
           * ---------------------------------------------------
           *
           * We load all students who are relevant to this quiz,
           * including students who have no result.
           *
           * This allows the teacher to see ALL children datewise
           * and classwise, not only students who submitted.
           */

          const {
            data: studentRows,
            error:
              studentsError,
          } =
            await supabase
              .from(
                "students"
              )
              .select(
                "id,student_name,student_username,class_name"
              )
              .order(
                "class_name",
                {
                  ascending:
                    true,
                }
              )
              .order(
                "student_name",
                {
                  ascending:
                    true,
                }
              );

          if (studentsError) {
            throw new Error(
              studentsError.message
            );
          }

          const cleanStudents =
            (
              studentRows || []
            ).map(
              (student) => ({
                id: Number(
                  student.id
                ),
                student_name:
                  student.student_name,
                student_username:
                  student.student_username,
                class_name:
                  student.class_name,
              })
            );

          setQuiz(
            quizData
          );

          setResults(
            cleanResults
          );

          setStudents(
            cleanStudents
          );

          /*
           * Default expansion:
           * quiz date + all classes.
           */
          const quizDate =
            quizData
              .scheduled_date ||
            "unknown";

          setExpandedDates(
            new Set([
              quizDate,
            ])
          );

          setExpandedClasses(
            new Set(
              getClassNames(
                quizData,
                cleanStudents
              ).map(
                (className) =>
                  `${quizDate}__${className}`
              )
            )
          );

          /*
           * Student cards remain collapsed by default.
           */
          setExpandedStudents(
            new Set()
          );

          await loadReattemptPermissions(
            quizId,
            cleanStudents
          );
        } catch (
          loadError
        ) {
          console.error(
            "TEACHER QUIZ RESULTS LOAD ERROR:",
            loadError
          );

          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Unable to load quiz results."
          );
        } finally {
          setLoading(false);
        }
      },
      [
        quizId,
        loadReattemptPermissions,
      ]
    );

  useEffect(() => {
    loadData();
  }, [loadData]);

  /*
   * -----------------------------------------------------------
   * DATE GROUPS
   * -----------------------------------------------------------
   *
   * For this page the quiz itself is one scheduled date.
   *
   * The structure intentionally supports date grouping so that
   * the teacher sees:
   *
   * DATE
   *   CLASS
   *     STUDENT
   *       RESULT
   */

  const dateGroups =
    useMemo(() => {
      if (!quiz) {
        return [];
      }

      const date =
        quiz.scheduled_date ||
        "unknown";

      return [
        {
          date,
          classes:
            getClassNames(
              quiz,
              students
            ),
        },
      ];
    }, [
      quiz,
      students,
    ]);

  /*
   * -----------------------------------------------------------
   * CLASS STUDENTS
   * -----------------------------------------------------------
   */

  const getStudentsForClass =
    useCallback(
      (
        className: string
      ) => {
        return students
          .filter(
            (student) =>
              (
                student.class_name ||
                ""
              ).trim() ===
              className
          )
          .sort(
            (a, b) =>
              (
                a.student_name ||
                ""
              ).localeCompare(
                b.student_name ||
                  "",
                undefined,
                {
                  sensitivity:
                    "base",
                }
              )
          );
      },
      [students]
    );

  /*
   * -----------------------------------------------------------
   * RESULTS FOR STUDENT
   * -----------------------------------------------------------
   */

  const getStudentResults =
    useCallback(
      (
        studentId: number
      ) => {
        return results
          .filter(
            (result) =>
              Number(
                result.student_id
              ) ===
              Number(
                studentId
              )
          )
          .sort(
            (a, b) => {
              const aAttempt =
                safeNumber(
                  a.attempt_number,
                  1
                );

              const bAttempt =
                safeNumber(
                  b.attempt_number,
                  1
                );

              if (
                aAttempt !==
                bAttempt
              ) {
                return (
                  aAttempt -
                  bAttempt
                );
              }

              return (
                new Date(
                  a.created_at ||
                    0
                ).getTime() -
                new Date(
                  b.created_at ||
                    0
                ).getTime()
              );
            }
          );
      },
      [results]
    );

  /*
   * -----------------------------------------------------------
   * STATISTICS
   * -----------------------------------------------------------
   */

  const totalResultRows =
    results.length;

  const uniqueStudentsWithResults =
    new Set(
      results.map(
        (result) =>
          result.student_id
      )
    ).size;

  const submittedCount =
    results.filter(
      (result) =>
        Boolean(
          result.submitted_at
        )
    ).length;

  const passCount =
    results.filter(
      (result) => {
        const status =
          resultStatus(
            result
          ).toUpperCase();

        return (
          status === "PASS" ||
          status === "PASSED"
        );
      }
    ).length;

  const failCount =
    results.filter(
      (result) => {
        const status =
          resultStatus(
            result
          ).toUpperCase();

        return (
          status === "FAIL" ||
          status === "FAILED"
        );
      }
    ).length;

  /*
   * -----------------------------------------------------------
   * TOGGLE FUNCTIONS
   * -----------------------------------------------------------
   */

  function toggleDate(
    date: string
  ) {
    setExpandedDates(
      (previous) => {
        const next =
          new Set(
            previous
          );

        if (
          next.has(date)
        ) {
          next.delete(date);
        } else {
          next.add(date);
        }

        return next;
      }
    );
  }

  function toggleClass(
    key: string
  ) {
    setExpandedClasses(
      (previous) => {
        const next =
          new Set(
            previous
          );

        if (
          next.has(key)
        ) {
          next.delete(key);
        } else {
          next.add(key);
        }

        return next;
      }
    );
  }

  function toggleStudent(
    studentId: number
  ) {
    setExpandedStudents(
      (previous) => {
        const next =
          new Set(
            previous
          );

        if (
          next.has(studentId)
        ) {
          next.delete(
            studentId
          );
        } else {
          next.add(
            studentId
          );
        }

        return next;
      }
    );
  }

  /*
   * -----------------------------------------------------------
   * ALLOW RE-ATTEMPT
   * -----------------------------------------------------------
   */

  async function allowReattempt(
    studentId: number
  ) {
    if (!quizId) {
      return;
    }

    setReattemptMessage("");

    try {
      const teacherId =
        Number(
          localStorage.getItem(
            "attendance_teacher_id"
          ) ||
            localStorage.getItem(
              "teacher_id"
            )
        );

      if (
        !teacherId ||
        !Number.isFinite(
          teacherId
        )
      ) {
        setReattemptMessage(
          "Teacher ID not found. Please login again."
        );
        return;
      }

      const response =
        await fetch(
          "/api/quiz-tests/reattempt",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action:
                "allow",
              quizId,
              studentId,
              teacherId,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.error ||
            "Unable to allow re-attempt."
        );
      }

      setReattemptQuizIds(
        (previous) => {
          const next =
            new Set(
              previous
            );

          next.add(
            studentId
          );

          return next;
        }
      );

      setReattemptMessage(
        "Re-attempt access allowed successfully."
      );
    } catch (
      reattemptError
    ) {
      console.error(
        "ALLOW REATTEMPT ERROR:",
        reattemptError
      );

      setReattemptMessage(
        reattemptError instanceof
          Error
          ? reattemptError.message
          : "Unable to allow re-attempt."
      );
    }
  }

  /*
   * -----------------------------------------------------------
   * LOADING
   * -----------------------------------------------------------
   */

  if (loading) {
    return (
      <main
        style={
          styles.page
        }
      >
        <div
          style={
            styles.centerCard
          }
        >
          <div
            style={
              styles.spinner
            }
          />
          <h2
            style={
              styles.loadingTitle
            }
          >
            Loading Quiz Results
          </h2>
          <p
            style={
              styles.loadingText
            }
          >
            Please wait while the
            teacher results are
            being loaded.
          </p>
        </div>
      </main>
    );
  }

  /*
   * -----------------------------------------------------------
   * ERROR
   * -----------------------------------------------------------
   */

  if (error) {
    return (
      <main
        style={
          styles.page
        }
      >
        <div
          style={
            styles.errorCard
          }
        >
          <h2
            style={
              styles.errorTitle
            }
          >
            Unable to Load Results
          </h2>

          <p
            style={
              styles.errorText
            }
          >
            {error}
          </p>

          <button
            type="button"
            onClick={
              loadData
            }
            style={
              styles.primaryButton
            }
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (!quiz) {
    return (
      <main
        style={
          styles.page
        }
      >
        <div
          style={
            styles.errorCard
          }
        >
          <h2
            style={
              styles.errorTitle
            }
          >
            Quiz Not Found
          </h2>
        </div>
      </main>
    );
  }

  /*
   * -----------------------------------------------------------
   * MAIN UI
   * -----------------------------------------------------------
   */

  return (
    <main
      style={
        styles.page
      }
    >
      <div
        style={
          styles.container
        }
      >
        {/* HEADER */}

        <div
          style={
            styles.headerCard
          }
        >
          <div
            style={
              styles.headerTop
            }
          >
            <div>
              <div
                style={
                  styles.eyebrow
                }
              >
                RACER ACADEMY
              </div>

              <h1
                style={
                  styles.heading
                }
              >
                Quiz Results
              </h1>

              <p
                style={
                  styles.quizTitle
                }
              >
                {quiz.title}
              </p>
            </div>

            <button
              type="button"
              onClick={
                loadData
              }
              style={
                styles.refreshButton
              }
            >
              Refresh
            </button>
          </div>

          <div
            style={
              styles.quizInfoGrid
            }
          >
            <div
              style={
                styles.infoBox
              }
            >
              <span
                style={
                  styles.infoLabel
                }
              >
                Subject
              </span>
              <strong
                style={
                  styles.infoValue
                }
              >
                {quiz.subject ||
                  "—"}
              </strong>
            </div>

            <div
              style={
                styles.infoBox
              }
            >
              <span
                style={
                  styles.infoLabel
                }
              >
                Date
              </span>
              <strong
                style={
                  styles.infoValue
                }
              >
                {formatDate(
                  quiz.scheduled_date
                )}
              </strong>
            </div>

            <div
              style={
                styles.infoBox
              }
            >
              <span
                style={
                  styles.infoLabel
                }
              >
                Time
              </span>
              <strong
                style={
                  styles.infoValue
                }
              >
                {formatTime(
                  quiz.scheduled_time
                )}
              </strong>
            </div>

            <div
              style={
                styles.infoBox
              }
            >
              <span
                style={
                  styles.infoLabel
                }
              >
                Duration
              </span>
              <strong
                style={
                  styles.infoValue
                }
              >
                {safeNumber(
                  quiz.duration_minutes,
                  30
                )}{" "}
                minutes
              </strong>
            </div>
          </div>
        </div>

        {/* STATISTICS */}

        <div
          style={
            styles.statsGrid
          }
        >
          <div
            style={
              styles.statCard
            }
          >
            <span
              style={
                styles.statLabel
              }
            >
              Result Records
            </span>

            <strong
              style={
                styles.statValue
              }
            >
              {totalResultRows}
            </strong>
          </div>

          <div
            style={
              styles.statCard
            }
          >
            <span
              style={
                styles.statLabel
              }
            >
              Students Attempted
            </span>

            <strong
              style={
                styles.statValue
              }
            >
              {
                uniqueStudentsWithResults
              }
            </strong>
          </div>

          <div
            style={
              styles.statCard
            }
          >
            <span
              style={
                styles.statLabel
              }
            >
              Submitted
            </span>

            <strong
              style={
                styles.statValue
              }
            >
              {submittedCount}
            </strong>
          </div>

          <div
            style={
              styles.statCard
            }
          >
            <span
              style={
                styles.statLabel
              }
            >
              Pass / Fail
            </span>

            <strong
              style={
                styles.statValue
              }
            >
              {passCount} /{" "}
              {failCount}
            </strong>
          </div>
        </div>

        {/* RE-ATTEMPT MESSAGE */}

        {reattemptMessage && (
          <div
            style={
              styles.message
            }
          >
            {reattemptMessage}
          </div>
        )}

        {/* DATE → CLASS → STUDENT → RESULTS */}

        <div
          style={
            styles.resultsSection
          }
        >
          <div
            style={
              styles.sectionHeader
            }
          >
            <div>
              <h2
                style={
                  styles.sectionTitle
                }
              >
                Students & Quiz Results
              </h2>

              <p
                style={
                  styles.sectionSubtitle
                }
              >
                Datewise → Classwise →
                Studentwise
              </p>
            </div>
          </div>

          {dateGroups.length ===
          0 ? (
            <div
              style={
                styles.emptyCard
              }
            >
              No quiz date available.
            </div>
          ) : (
            dateGroups.map(
              (dateGroup) => {
                const dateOpen =
                  expandedDates.has(
                    dateGroup.date
                  );

                return (
                  <div
                    key={
                      dateGroup.date
                    }
                    style={
                      styles.dateGroup
                    }
                  >
                    {/* DATE */}

                    <button
                      type="button"
                      onClick={() =>
                        toggleDate(
                          dateGroup.date
                        )
                      }
                      style={
                        styles.dateHeader
                      }
                    >
                      <div>
                        <span
                          style={
                            styles.levelLabel
                          }
                        >
                          DATE
                        </span>

                        <strong
                          style={
                            styles.dateTitle
                          }
                        >
                          {formatDate(
                            dateGroup.date
                          )}
                        </strong>
                      </div>

                      <span
                        style={
                          styles.arrow
                        }
                      >
                        {dateOpen
                          ? "−"
                          : "+"}
                      </span>
                    </button>

                    {dateOpen && (
                      <div
                        style={
                          styles.dateContent
                        }
                      >
                        {dateGroup
                          .classes
                          .length ===
                        0 ? (
                          <div
                            style={
                              styles.emptyInner
                            }
                          >
                            No classes
                            found.
                          </div>
                        ) : (
                          dateGroup.classes.map(
                            (
                              className
                            ) => {
                              const classKey =
                                `${dateGroup.date}__${className}`;

                              const classOpen =
                                expandedClasses.has(
                                  classKey
                                );

                              const classStudents =
                                getStudentsForClass(
                                  className
                                );

                              return (
                                <div
                                  key={
                                    classKey
                                  }
                                  style={
                                    styles.classGroup
                                  }
                                >
                                  {/* CLASS */}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleClass(
                                        classKey
                                      )
                                    }
                                    style={
                                      styles.classHeader
                                    }
                                  >
                                    <div
                                      style={
                                        styles.classHeaderLeft
                                      }
                                    >
                                      <span
                                        style={
                                          styles.classBadge
                                        }
                                      >
                                        CLASS
                                      </span>

                                      <strong
                                        style={
                                          styles.classTitle
                                        }
                                      >
                                        {className}
                                      </strong>

                                      <span
                                        style={
                                          styles.studentCount
                                        }
                                      >
                                        {
                                          classStudents.length
                                        }{" "}
                                        students
                                      </span>
                                    </div>

                                    <span
                                      style={
                                        styles.arrow
                                      }
                                    >
                                      {classOpen
                                        ? "−"
                                        : "+"}
                                    </span>
                                  </button>

                                  {classOpen && (
                                    <div
                                      style={
                                        styles.classContent
                                      }
                                    >
                                      {classStudents.length ===
                                      0 ? (
                                        <div
                                          style={
                                            styles.emptyInner
                                          }
                                        >
                                          No students
                                          found in
                                          this class.
                                        </div>
                                      ) : (
                                        classStudents.map(
                                          (
                                            student
                                          ) => {
                                            const studentResults =
                                              getStudentResults(
                                                student.id
                                              );

                                            const studentOpen =
                                              expandedStudents.has(
                                                student.id
                                              );

                                            const latestResult =
                                              studentResults.length >
                                              0
                                                ? studentResults[
                                                    studentResults.length -
                                                      1
                                                  ]
                                                : null;

                                            return (
                                              <div
                                                key={
                                                  student.id
                                                }
                                                style={
                                                  styles.studentCard
                                                }
                                              >
                                                {/* STUDENT */}

                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    toggleStudent(
                                                      student.id
                                                    )
                                                  }
                                                  style={
                                                    styles.studentHeader
                                                  }
                                                >
                                                  <div
                                                    style={
                                                      styles.studentHeaderLeft
                                                    }
                                                  >
                                                    <div
                                                      style={
                                                        styles.avatar
                                                      }
                                                    >
                                                      {(
                                                        student.student_name ||
                                                        "S"
                                                      )
                                                        .trim()
                                                        .charAt(
                                                          0
                                                        )
                                                        .toUpperCase()}
                                                    </div>

                                                    <div>
                                                      <strong
                                                        style={
                                                          styles.studentName
                                                        }
                                                      >
                                                        {student.student_name ||
                                                          "Unnamed Student"}
                                                      </strong>

                                                      <div
                                                        style={
                                                          styles.studentMeta
                                                        }
                                                      >
                                                        Username:{" "}
                                                        {student.student_username ||
                                                          "—"}
                                                        {" • "}
                                                        {studentResults.length >
                                                        0
                                                          ? `${studentResults.length} result${
                                                              studentResults.length ===
                                                              1
                                                                ? ""
                                                                : "s"
                                                            }`
                                                          : "No attempt"}
                                                      </div>
                                                    </div>
                                                  </div>

                                                  <div
                                                    style={
                                                      styles.studentSummary
                                                    }
                                                  >
                                                    {latestResult ? (
                                                      <>
                                                        <span
                                                          style={{
                                                            ...styles.percentageBadge,
                                                            ...(latestResult.percentage !==
                                                            null
                                                              ? {}
                                                              : {}),
                                                          }}
                                                        >
                                                          {safeNumber(
                                                            latestResult.percentage,
                                                            0
                                                          ).toFixed(
                                                            2
                                                          )}
                                                          %
                                                        </span>

                                                        <span
                                                          className={
                                                            statusClass(
                                                              latestResult
                                                            )
                                                          }
                                                          style={
                                                            styles.statusBadge
                                                          }
                                                        >
                                                          {resultStatus(
                                                            latestResult
                                                          )}
                                                        </span>
                                                      </>
                                                    ) : (
                                                      <span
                                                        style={
                                                          styles.noAttemptBadge
                                                        }
                                                      >
                                                        NO ATTEMPT
                                                      </span>
                                                    )}

                                                    <span
                                                      style={
                                                        styles.arrow
                                                      }
                                                    >
                                                      {studentOpen
                                                        ? "−"
                                                        : "+"}
                                                    </span>
                                                  </div>
                                                </button>

                                                {studentOpen && (
                                                  <div
                                                    style={
                                                      styles.studentContent
                                                    }
                                                  >
                                                    {/* NO RESULT */}

                                                    {studentResults.length ===
                                                    0 ? (
                                                      <div
                                                        style={
                                                          styles.noResultPanel
                                                        }
                                                      >
                                                        <div>
                                                          <strong>
                                                            No quiz result
                                                            submitted
                                                          </strong>

                                                          <p>
                                                            This student
                                                            has no
                                                            quiz-result
                                                            record for
                                                            this quiz.
                                                          </p>
                                                        </div>

                                                        {reattemptQuizIds.has(
                                                          student.id
                                                        ) && (
                                                          <span
                                                            style={
                                                              styles.allowedBadge
                                                            }
                                                          >
                                                            RE-ATTEMPT
                                                            ALLOWED
                                                          </span>
                                                        )}
                                                      </div>
                                                    ) : (
                                                      <>
                                                        {/* RESULT ATTEMPTS */}

                                                        <div
                                                          style={
                                                            styles.resultList
                                                          }
                                                        >
                                                          {studentResults.map(
                                                            (
                                                              result
                                                            ) => {
                                                              const attempt =
                                                                Math.max(
                                                                  1,
                                                                  safeNumber(
                                                                    result.attempt_number,
                                                                    1
                                                                  )
                                                                );

                                                              return (
                                                                <div
                                                                  key={
                                                                    result.id
                                                                  }
                                                                  style={
                                                                    styles.resultCard
                                                                  }
                                                                >
                                                                  <div
                                                                    style={
                                                                      styles.resultTop
                                                                    }
                                                                  >
                                                                    <div>
                                                                      <span
                                                                        style={
                                                                          styles.attemptBadge
                                                                        }
                                                                      >
                                                                        {getAttemptLabel(
                                                                          result
                                                                        )}
                                                                      </span>

                                                                      <h3
                                                                        style={
                                                                          styles.resultTitle
                                                                        }
                                                                      >
                                                                        Quiz Result
                                                                        {attempt >
                                                                        1
                                                                          ? ` • Attempt #${attempt}`
                                                                          : " • Attempt #1"}
                                                                      </h3>
                                                                    </div>

                                                                    <span
                                                                      className={
                                                                        statusClass(
                                                                          result
                                                                        )
                                                                      }
                                                                      style={
                                                                        styles.statusBadgeLarge
                                                                      }
                                                                    >
                                                                      {resultStatus(
                                                                        result
                                                                      )}
                                                                    </span>
                                                                  </div>

                                                                  <div
                                                                    style={
                                                                      styles.resultGrid
                                                                    }
                                                                  >
                                                                    <div
                                                                      style={
                                                                        styles.detailBox
                                                                      }
                                                                    >
                                                                      <span
                                                                        style={
                                                                          styles.detailLabel
                                                                        }
                                                                      >
                                                                        Total
                                                                        Questions
                                                                      </span>

                                                                      <strong
                                                                        style={
                                                                          styles.detailValue
                                                                        }
                                                                      >
                                                                        {safeNumber(
                                                                          result.total_questions
                                                                        )}
                                                                      </strong>
                                                                    </div>

                                                                    <div
                                                                      style={
                                                                        styles.detailBox
                                                                      }
                                                                    >
                                                                      <span
                                                                        style={
                                                                          styles.detailLabel
                                                                        }
                                                                      >
                                                                        Correct
                                                                      </span>

                                                                      <strong
                                                                        style={
                                                                          styles.detailValue
                                                                        }
                                                                      >
                                                                        {safeNumber(
                                                                          result.correct_answers
                                                                        )}
                                                                      </strong>
                                                                    </div>

                                                                    <div
                                                                      style={
                                                                        styles.detailBox
                                                                      }
                                                                    >
                                                                      <span
                                                                        style={
                                                                          styles.detailLabel
                                                                        }
                                                                      >
                                                                        Wrong
                                                                      </span>

                                                                      <strong
                                                                        style={
                                                                          styles.detailValue
                                                                        }
                                                                      >
                                                                        {safeNumber(
                                                                          result.wrong_answers
                                                                        )}
                                                                      </strong>
                                                                    </div>

                                                                    <div
                                                                      style={
                                                                        styles.detailBox
                                                                      }
                                                                    >
                                                                      <span
                                                                        style={
                                                                          styles.detailLabel
                                                                        }
                                                                      >
                                                                        Unanswered
                                                                      </span>

                                                                      <strong
                                                                        style={
                                                                          styles.detailValue
                                                                        }
                                                                      >
                                                                        {safeNumber(
                                                                          result.unanswered
                                                                        )}
                                                                      </strong>
                                                                    </div>

                                                                    <div
                                                                      style={
                                                                        styles.detailBox
                                                                      }
                                                                    >
                                                                      <span
                                                                        style={
                                                                          styles.detailLabel
                                                                        }
                                                                      >
                                                                        Total
                                                                        Marks
                                                                      </span>

                                                                      <strong
                                                                        style={
                                                                          styles.detailValue
                                                                        }
                                                                      >
                                                                        {safeNumber(
                                                                          result.total_marks
                                                                        ).toFixed(
                                                                          2
                                                                        )}
                                                                      </strong>
                                                                    </div>

                                                                    <div
                                                                      style={
                                                                        styles.detailBox
                                                                      }
                                                                    >
                                                                      <span
                                                                        style={
                                                                          styles.detailLabel
                                                                        }
                                                                      >
                                                                        Obtained
                                                                        Marks
                                                                      </span>

                                                                      <strong
                                                                        style={
                                                                          styles.detailValue
                                                                        }
                                                                      >
                                                                        {safeNumber(
                                                                          result.obtained_marks
                                                                        ).toFixed(
                                                                          2
                                                                        )}
                                                                      </strong>
                                                                    </div>

                                                                    <div
                                                                      style={
                                                                        styles.detailBox
                                                                      }
                                                                    >
                                                                      <span
                                                                        style={
                                                                          styles.detailLabel
                                                                        }
                                                                      >
                                                                        Percentage
                                                                      </span>

                                                                      <strong
                                                                        style={
                                                                          styles.detailValue
                                                                        }
                                                                      >
                                                                        {safeNumber(
                                                                          result.percentage
                                                                        ).toFixed(
                                                                          2
                                                                        )}
                                                                        %
                                                                      </strong>
                                                                    </div>

                                                                    <div
                                                                      style={
                                                                        styles.detailBox
                                                                      }
                                                                    >
                                                                      <span
                                                                        style={
                                                                          styles.detailLabel
                                                                        }
                                                                      >
                                                                        Submission
                                                                      </span>

                                                                      <strong
                                                                        style={
                                                                          styles.detailValue
                                                                        }
                                                                      >
                                                                        {result.submission_type ||
                                                                          "—"}
                                                                      </strong>
                                                                    </div>
                                                                  </div>

                                                                  <div
                                                                    style={
                                                                      styles.timeGrid
                                                                    }
                                                                  >
                                                                    <div>
                                                                      <span
                                                                        style={
                                                                          styles.detailLabel
                                                                        }
                                                                      >
                                                                        Started
                                                                      </span>

                                                                      <div
                                                                        style={
                                                                          styles.timeValue
                                                                        }
                                                                      >
                                                                        {formatDateTime(
                                                                          result.started_at
                                                                        )}
                                                                      </div>
                                                                    </div>

                                                                    <div>
                                                                      <span
                                                                        style={
                                                                          styles.detailLabel
                                                                        }
                                                                      >
                                                                        Submitted
                                                                      </span>

                                                                      <div
                                                                        style={
                                                                          styles.timeValue
                                                                        }
                                                                      >
                                                                        {formatDateTime(
                                                                          result.submitted_at
                                                                        )}
                                                                      </div>
                                                                    </div>

                                                                    <div>
                                                                      <span
                                                                        style={
                                                                          styles.detailLabel
                                                                        }
                                                                      >
                                                                        Created
                                                                      </span>

                                                                      <div
                                                                        style={
                                                                          styles.timeValue
                                                                        }
                                                                      >
                                                                        {formatDateTime(
                                                                          result.created_at
                                                                        )}
                                                                      </div>
                                                                    </div>
                                                                  </div>
                                                                </div>
                                                              );
                                                            }
                                                          )}
                                                        </div>

                                                        {/* REATTEMPT */}

                                                        <div
                                                          style={
                                                            styles.reattemptPanel
                                                          }
                                                        >
                                                          <div>
                                                            <strong
                                                              style={
                                                                styles.reattemptTitle
                                                              }
                                                            >
                                                              Re-attempt
                                                              Access
                                                            </strong>

                                                            <p
                                                              style={
                                                                styles.reattemptText
                                                              }
                                                            >
                                                              Allow this
                                                              student to
                                                              take the
                                                              quiz again.
                                                              The new
                                                              30-minute
                                                              timer starts
                                                              only when
                                                              the student
                                                              clicks
                                                              Re-attempt.
                                                            </p>
                                                          </div>

                                                          {reattemptQuizIds.has(
                                                            student.id
                                                          ) ? (
                                                            <span
                                                              style={
                                                                styles.allowedBadge
                                                              }
                                                            >
                                                              RE-ATTEMPT
                                                              ALLOWED
                                                            </span>
                                                          ) : (
                                                            <button
                                                              type="button"
                                                              onClick={() =>
                                                                allowReattempt(
                                                                  student.id
                                                                )
                                                              }
                                                              disabled={
                                                                reattemptLoading
                                                              }
                                                              style={
                                                                styles.allowButton
                                                              }
                                                            >
                                                              {reattemptLoading
                                                                ? "PLEASE WAIT..."
                                                                : "ALLOW RE-ATTEMPT"}
                                                            </button>
                                                          )}
                                                        </div>
                                                      </>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          }
                                        )
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )
          )}
        </div>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .status-pass {
          color: #166534 !important;
          background: #dcfce7 !important;
        }

        .status-fail {
          color: #991b1b !important;
          background: #fee2e2 !important;
        }

        .status-neutral {
          color: #334155 !important;
          background: #e2e8f0 !important;
        }

        @media (max-width: 700px) {
          .result-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </main>
  );
}

const styles: Record<
  string,
  React.CSSProperties
> = {
  page: {
    minHeight:
      "100vh",
    background:
      "linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #f8fafc 100%)",
    padding:
      "20px",
    color:
      "#0f172a",
  },

  container: {
    width:
      "100%",
    maxWidth:
      "1200px",
    margin:
      "0 auto",
  },

  centerCard: {
    maxWidth:
      "500px",
    margin:
      "80px auto",
    background:
      "#ffffff",
    borderRadius:
      "22px",
    padding:
      "40px 25px",
    textAlign:
      "center",
    boxShadow:
      "0 20px 50px rgba(15,23,42,0.10)",
  },

  spinner: {
    width:
      "42px",
    height:
      "42px",
    border:
      "4px solid #e2e8f0",
    borderTop:
      "4px solid #4f46e5",
    borderRadius:
      "50%",
    margin:
      "0 auto 18px",
    animation:
      "spin 0.8s linear infinite",
  },

  loadingTitle: {
    margin:
      "0 0 8px",
    fontSize:
      "22px",
    fontWeight:
      800,
  },

  loadingText: {
    margin:
      0,
    color:
      "#64748b",
  },

  errorCard: {
    maxWidth:
      "600px",
    margin:
      "60px auto",
    background:
      "#ffffff",
    borderRadius:
      "22px",
    padding:
      "35px",
    textAlign:
      "center",
    boxShadow:
      "0 20px 50px rgba(15,23,42,0.10)",
  },

  errorTitle: {
    margin:
      "0 0 10px",
    fontSize:
      "24px",
    fontWeight:
      800,
    color:
      "#991b1b",
  },

  errorText: {
    color:
      "#475569",
    margin:
      "0 0 20px",
  },

  primaryButton: {
    border:
      "none",
    borderRadius:
      "12px",
    padding:
      "12px 20px",
    background:
      "#4f46e5",
    color:
      "#ffffff",
    fontWeight:
      800,
    cursor:
      "pointer",
  },

  headerCard: {
    background:
      "#ffffff",
    borderRadius:
      "24px",
    padding:
      "24px",
    boxShadow:
      "0 15px 40px rgba(15,23,42,0.08)",
    marginBottom:
      "18px",
  },

  headerTop: {
    display:
      "flex",
    alignItems:
      "flex-start",
    justifyContent:
      "space-between",
    gap:
      "16px",
  },

  eyebrow: {
    fontSize:
      "12px",
    fontWeight:
      900,
    letterSpacing:
      "0.12em",
    color:
      "#4f46e5",
    marginBottom:
      "6px",
  },

  heading: {
    margin:
      0,
    fontSize:
      "30px",
    lineHeight:
      1.15,
    fontWeight:
      900,
  },

  quizTitle: {
    margin:
      "8px 0 0",
    fontSize:
      "17px",
    fontWeight:
      700,
    color:
      "#475569",
  },

  refreshButton: {
    border:
      "1px solid #cbd5e1",
    background:
      "#ffffff",
    color:
      "#0f172a",
    borderRadius:
      "12px",
    padding:
      "10px 16px",
    fontWeight:
      800,
    cursor:
      "pointer",
    whiteSpace:
      "nowrap",
  },

  quizInfoGrid: {
    display:
      "grid",
    gridTemplateColumns:
      "repeat(4, minmax(0, 1fr))",
    gap:
      "10px",
    marginTop:
      "20px",
  },

  infoBox: {
    background:
      "#f8fafc",
    border:
      "1px solid #e2e8f0",
    borderRadius:
      "14px",
    padding:
      "13px",
  },

  infoLabel: {
    display:
      "block",
    fontSize:
      "11px",
    textTransform:
      "uppercase",
    letterSpacing:
      "0.06em",
    color:
      "#64748b",
    fontWeight:
      800,
    marginBottom:
      "5px",
  },

  infoValue: {
    display:
      "block",
    fontSize:
      "14px",
    fontWeight:
      800,
  },

  statsGrid: {
    display:
      "grid",
    gridTemplateColumns:
      "repeat(4, minmax(0, 1fr))",
    gap:
      "12px",
    marginBottom:
      "18px",
  },

  statCard: {
    background:
      "#ffffff",
    borderRadius:
      "18px",
    padding:
      "18px",
    boxShadow:
      "0 10px 25px rgba(15,23,42,0.06)",
    border:
      "1px solid #e2e8f0",
  },

  statLabel: {
    display:
      "block",
    color:
      "#64748b",
    fontSize:
      "12px",
    fontWeight:
      800,
    marginBottom:
      "7px",
  },

  statValue: {
    fontSize:
      "24px",
    fontWeight:
      900,
    color:
      "#0f172a",
  },

  message: {
    background:
      "#eff6ff",
    border:
      "1px solid #bfdbfe",
    color:
      "#1e40af",
    padding:
      "12px 15px",
    borderRadius:
      "12px",
    marginBottom:
      "18px",
    fontWeight:
      700,
  },

  resultsSection: {
    background:
      "#ffffff",
    borderRadius:
      "24px",
    padding:
      "18px",
    boxShadow:
      "0 15px 40px rgba(15,23,42,0.07)",
  },

  sectionHeader: {
    padding:
      "4px 4px 15px",
  },

  sectionTitle: {
    margin:
      0,
    fontSize:
      "22px",
    fontWeight:
      900,
  },

  sectionSubtitle: {
    margin:
      "5px 0 0",
    color:
      "#64748b",
    fontSize:
      "13px",
  },

  dateGroup: {
    border:
      "1px solid #dbeafe",
    borderRadius:
      "18px",
    overflow:
      "hidden",
    marginBottom:
      "14px",
  },

  dateHeader: {
    width:
      "100%",
    border:
      "none",
    background:
      "#eef2ff",
    padding:
      "16px 18px",
    display:
      "flex",
    alignItems:
      "center",
    justifyContent:
      "space-between",
    cursor:
      "pointer",
    textAlign:
      "left",
  },

  levelLabel: {
    display:
      "block",
    fontSize:
      "10px",
    fontWeight:
      900,
    letterSpacing:
      "0.1em",
    color:
      "#4f46e5",
    marginBottom:
      "3px",
  },

  dateTitle: {
    display:
      "block",
    fontSize:
      "19px",
    fontWeight:
      900,
    color:
      "#1e1b4b",
  },

  arrow: {
    fontSize:
      "24px",
    lineHeight:
      1,
    fontWeight:
      700,
    color:
      "#475569",
    flexShrink:
      0,
  },

  dateContent: {
    padding:
      "12px",
    background:
      "#f8fafc",
  },

  classGroup: {
    border:
      "1px solid #e2e8f0",
    borderRadius:
      "15px",
    overflow:
      "hidden",
    marginBottom:
      "10px",
    background:
      "#ffffff",
  },

  classHeader: {
    width:
      "100%",
    border:
      "none",
    background:
      "#ffffff",
    padding:
      "14px 15px",
    display:
      "flex",
    alignItems:
      "center",
    justifyContent:
      "space-between",
    cursor:
      "pointer",
    textAlign:
      "left",
  },

  classHeaderLeft: {
    display:
      "flex",
    alignItems:
      "center",
    gap:
      "9px",
    minWidth:
      0,
    flexWrap:
      "wrap",
  },

  classBadge: {
    fontSize:
      "10px",
    fontWeight:
      900,
    background:
      "#e0e7ff",
    color:
      "#3730a3",
    borderRadius:
      "7px",
    padding:
      "4px 7px",
  },

  classTitle: {
    fontSize:
      "17px",
    fontWeight:
      900,
  },

  studentCount: {
    fontSize:
      "12px",
    color:
      "#64748b",
    fontWeight:
      700,
  },

  classContent: {
    padding:
      "10px",
    background:
      "#f8fafc",
    borderTop:
      "1px solid #e2e8f0",
  },

  studentCard: {
    background:
      "#ffffff",
    border:
      "1px solid #e2e8f0",
    borderRadius:
      "14px",
    overflow:
      "hidden",
    marginBottom:
      "9px",
  },

  studentHeader: {
    width:
      "100%",
    border:
      "none",
    background:
      "#ffffff",
    padding:
      "13px",
    display:
      "flex",
    alignItems:
      "center",
    justifyContent:
      "space-between",
    gap:
      "12px",
    cursor:
      "pointer",
    textAlign:
      "left",
  },

  studentHeaderLeft: {
    display:
      "flex",
    alignItems:
      "center",
    gap:
      "11px",
    minWidth:
      0,
  },

  avatar: {
    width:
      "40px",
    height:
      "40px",
    minWidth:
      "40px",
    borderRadius:
      "12px",
    background:
      "#e0e7ff",
    color:
      "#3730a3",
    display:
      "flex",
    alignItems:
      "center",
    justifyContent:
      "center",
    fontWeight:
      900,
    fontSize:
      "17px",
  },

  studentName: {
    display:
      "block",
    fontSize:
      "15px",
    fontWeight:
      900,
  },

  studentMeta: {
    marginTop:
      "4px",
    color:
      "#64748b",
    fontSize:
      "11px",
  },

  studentSummary: {
    display:
      "flex",
    alignItems:
      "center",
    gap:
      "7px",
    flexShrink:
      0,
  },

  percentageBadge: {
    background:
      "#f1f5f9",
    color:
      "#0f172a",
    padding:
      "6px 8px",
    borderRadius:
      "8px",
    fontSize:
      "12px",
    fontWeight:
      900,
  },

  statusBadge: {
    padding:
      "6px 8px",
    borderRadius:
      "8px",
    fontSize:
      "10px",
    fontWeight:
      900,
  },

  noAttemptBadge: {
    padding:
      "6px 8px",
    borderRadius:
      "8px",
    fontSize:
      "10px",
    fontWeight:
      900,
    color:
      "#92400e",
    background:
      "#fef3c7",
  },

  studentContent: {
    padding:
      "13px",
    background:
      "#f8fafc",
    borderTop:
      "1px solid #e2e8f0",
  },

  resultList: {
    display:
      "flex",
    flexDirection:
      "column",
    gap:
      "10px",
  },

  resultCard: {
    background:
      "#ffffff",
    border:
      "1px solid #dbeafe",
    borderRadius:
      "15px",
    padding:
      "14px",
  },

  resultTop: {
    display:
      "flex",
    alignItems:
      "flex-start",
    justifyContent:
      "space-between",
    gap:
      "10px",
    marginBottom:
      "13px",
  },

  attemptBadge: {
    display:
      "inline-block",
    background:
      "#ede9fe",
    color:
      "#5b21b6",
    borderRadius:
      "8px",
    padding:
      "5px 8px",
    fontSize:
      "10px",
    fontWeight:
      900,
    textTransform:
      "uppercase",
  },

  resultTitle: {
    margin:
      "7px 0 0",
    fontSize:
      "15px",
    fontWeight:
      900,
  },

  statusBadgeLarge: {
    padding:
      "7px 10px",
    borderRadius:
      "9px",
    fontSize:
      "11px",
    fontWeight:
      900,
    whiteSpace:
      "nowrap",
  },

  resultGrid: {
    display:
      "grid",
    gridTemplateColumns:
      "repeat(4, minmax(0, 1fr))",
    gap:
      "8px",
  },

  detailBox: {
    background:
      "#f8fafc",
    border:
      "1px solid #e2e8f0",
    borderRadius:
      "10px",
    padding:
      "10px",
  },

  detailLabel: {
    display:
      "block",
    fontSize:
      "10px",
    color:
      "#64748b",
    fontWeight:
      800,
    textTransform:
      "uppercase",
    letterSpacing:
      "0.04em",
    marginBottom:
      "4px",
  },

  detailValue: {
    fontSize:
      "14px",
    fontWeight:
      900,
    color:
      "#0f172a",
    wordBreak:
      "break-word",
  },

  timeGrid: {
    display:
      "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap:
      "10px",
    marginTop:
      "12px",
    paddingTop:
      "12px",
    borderTop:
      "1px solid #e2e8f0",
  },

  timeValue: {
    fontSize:
      "12px",
    fontWeight:
      700,
    color:
      "#334155",
    lineHeight:
      1.4,
  },

  reattemptPanel: {
    marginTop:
      "12px",
    padding:
      "13px",
    border:
      "1px dashed #c4b5fd",
    background:
      "#faf5ff",
    borderRadius:
      "13px",
    display:
      "flex",
    alignItems:
      "center",
    justifyContent:
      "space-between",
    gap:
      "14px",
  },

  reattemptTitle: {
    display:
      "block",
    fontSize:
      "14px",
    fontWeight:
      900,
    color:
      "#581c87",
  },

  reattemptText: {
    margin:
      "4px 0 0",
    fontSize:
      "11px",
    color:
      "#6b21a8",
    lineHeight:
      1.4,
  },

  allowButton: {
    border:
      "none",
    borderRadius:
      "10px",
    background:
      "#7c3aed",
    color:
      "#ffffff",
    padding:
      "10px 13px",
    fontSize:
      "11px",
    fontWeight:
      900,
    cursor:
      "pointer",
    whiteSpace:
      "nowrap",
  },

  allowedBadge: {
    display:
      "inline-block",
    borderRadius:
      "9px",
    background:
      "#dcfce7",
    color:
      "#166534",
    padding:
      "8px 10px",
    fontSize:
      "10px",
    fontWeight:
      900,
    whiteSpace:
      "nowrap",
  },

  noResultPanel: {
    display:
      "flex",
    alignItems:
      "center",
    justifyContent:
      "space-between",
    gap:
      "12px",
    background:
      "#fff7ed",
    border:
      "1px solid #fed7aa",
    borderRadius:
      "12px",
    padding:
      "13px",
    color:
      "#9a3412",
  },

  emptyCard: {
    padding:
      "30px",
    textAlign:
      "center",
    color:
      "#64748b",
  },

  emptyInner: {
    padding:
      "20px",
    textAlign:
      "center",
    color:
      "#64748b",
    fontSize:
      "13px",
  },
};