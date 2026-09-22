"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../../../../lib/supabase";

type Quiz = {
  id: number;
  title: string;
  description: string | null;
  scheduled_date: string | null;
  class_name: string | null;
  target_classes: string[] | null;
  subject: string | null;
  duration_minutes: number | null;
  marks_per_question: number | null;
  negative_marks: number | null;
  pass_percentage: number | null;
  published: boolean | null;
  created_by: number | null;
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
  total_marks: number | null;
  obtained_marks: number | null;
  percentage: number | null;
  correct_answers: number | null;
  wrong_answers: number | null;
  unanswered: number | null;
  result_status: string | null;
  started_at: string | null;
  submitted_at: string | null;
  created_at: string | null;
};

type QuizAnswer = {
  id: number;
  result_id: number;
  question_id: number;
  selected_option_id: number | null;
  is_correct: boolean | null;
  marks_obtained: number | null;
  created_at: string | null;
};

type QuestionOption = {
  id: number;
  question_id: number;
  option_text: string | null;
  is_correct: boolean | null;
};

type QuizQuestion = {
  id: number;
  quiz_id: number;
  question_text: string | null;
  marks: number | null;
  negative_marks: number | null;
  question_order: number | null;
};

type AttemptView = {
  result: QuizResult;
  student: Student | null;
  answers: QuizAnswer[];
};

type PermissionMap = Record<string, boolean>;

function numberValue(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function displayNumber(value: unknown): string {
  const n = numberValue(value);
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/\.00$/, "");
}

function formatDate(date: string | null | undefined): string {
  if (!date) return "—";

  const d = new Date(`${date}T00:00:00+05:30`);

  if (Number.isNaN(d.getTime())) {
    return date;
  }

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return value;
  }

  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function normalizeClass(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function quizTargetsClass(quiz: Quiz, className: string | null): boolean {
  if (!className) return false;

  const target = normalizeClass(className);

  if (normalizeClass(quiz.class_name) === target) {
    return true;
  }

  return (
    Array.isArray(quiz.target_classes) &&
    quiz.target_classes.some(
      (item) => normalizeClass(item) === target
    )
  );
}

function permissionKey(quizId: number, studentId: number): string {
  return `${quizId}:${studentId}`;
}

export default function TeacherQuizResultsPage() {
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [teacherName, setTeacherName] = useState("");

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);

  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [selectedAttempt, setSelectedAttempt] =
    useState<AttemptView | null>(null);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [options, setOptions] = useState<QuestionOption[]>([]);

  const [permissions, setPermissions] = useState<PermissionMap>({});

  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [allowingKey, setAllowingKey] = useState<string | null>(null);
  const [allowingAll, setAllowingAll] = useState(false);

  const [search, setSearch] = useState("");
  const [attemptFilter, setAttemptFilter] = useState<
    "all" | "original" | "reattempt"
  >("all");

  const [error, setError] = useState("");

  const selectedQuiz = useMemo(
    () =>
      quizzes.find((quiz) => quiz.id === selectedQuizId) ?? null,
    [quizzes, selectedQuizId]
  );

  const quizResults = useMemo(() => {
    if (!selectedQuizId) return [];

    return results
      .filter((row) => row.quiz_id === selectedQuizId)
      .filter((row) => {
        const attempt = numberValue(row.attempt_number, 1);

        if (attemptFilter === "original") {
          return attempt <= 1;
        }

        if (attemptFilter === "reattempt") {
          return attempt > 1;
        }

        return true;
      })
      .filter((row) => {
        const student = students.find(
          (item) => item.id === row.student_id
        );

        const q = search.trim().toLowerCase();

        if (!q) return true;

        return (
          String(student?.student_name ?? "")
            .toLowerCase()
            .includes(q) ||
          String(student?.student_username ?? "")
            .toLowerCase()
            .includes(q) ||
          String(student?.class_name ?? "")
            .toLowerCase()
            .includes(q)
        );
      })
      .sort((a, b) => {
        const dateA = new Date(
          a.submitted_at ?? a.created_at ?? 0
        ).getTime();

        const dateB = new Date(
          b.submitted_at ?? b.created_at ?? 0
        ).getTime();

        return dateB - dateA;
      });
  }, [
    results,
    selectedQuizId,
    students,
    search,
    attemptFilter,
  ]);

  const relevantStudents = useMemo(() => {
    if (!selectedQuiz) return [];

    return students
      .filter((student) => quizTargetsClass(selectedQuiz, student.class_name))
      .sort((a, b) =>
        String(a.student_name ?? "").localeCompare(
          String(b.student_name ?? "")
        )
      );
  }, [selectedQuiz, students]);

  const submittedStudentIds = useMemo(() => {
    if (!selectedQuizId) return new Set<number>();

    return new Set(
      results
        .filter(
          (row) =>
            row.quiz_id === selectedQuizId &&
            String(row.result_status ?? "").toUpperCase() !==
              "IN_PROGRESS" &&
            !!row.submitted_at
        )
        .map((row) => row.student_id)
    );
  }, [results, selectedQuizId]);

  const latestResultByStudent = useMemo(() => {
    const map = new Map<number, QuizResult>();

    results
      .filter((row) => row.quiz_id === selectedQuizId)
      .sort(
        (a, b) =>
          numberValue(b.attempt_number, 1) -
          numberValue(a.attempt_number, 1)
      )
      .forEach((row) => {
        if (!map.has(row.student_id)) {
          map.set(row.student_id, row);
        }
      });

    return map;
  }, [results, selectedQuizId]);

  const hasCompletedReattemptByStudent = useMemo(() => {
    const map = new Map<number, boolean>();

    results
      .filter((row) => row.quiz_id === selectedQuizId)
      .forEach((row) => {
        if (
          numberValue(row.attempt_number, 1) > 1 &&
          !!row.submitted_at &&
          String(row.result_status ?? "").toUpperCase() !==
            "IN_PROGRESS"
        ) {
          map.set(row.student_id, true);
        }
      });

    return map;
  }, [results, selectedQuizId]);

  const loadTeacher = useCallback(async () => {
    let storedId =
      window.localStorage.getItem("attendance_teacher_id") ||
      window.localStorage.getItem("teacherId");

    const storedName =
      window.localStorage.getItem("attendance_username") ||
      window.localStorage.getItem("teacher_username") ||
      window.localStorage.getItem("teacherUsername") ||
      "";

    if (!storedId) {
      storedId = window.sessionStorage.getItem(
        "attendance_teacher_id"
      );
    }

    const id = Number(storedId);

    if (Number.isFinite(id) && id > 0) {
      setTeacherId(id);
    } else {
      setTeacherId(null);
    }

    setTeacherName(storedName);
  }, []);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const quizQuery = supabase
        .from("quiz_tests")
        .select(
          "id,title,description,scheduled_date,class_name,target_classes,subject,duration_minutes,marks_per_question,negative_marks,pass_percentage,published,created_by,created_at"
        )
        .order("scheduled_date", { ascending: false })
        .order("created_at", { ascending: false });

      const studentQuery = supabase
        .from("students")
        .select(
          "id,student_name,student_username,class_name"
        )
        .order("student_name", { ascending: true });

      const result = await Promise.all([
        quizQuery,
        studentQuery,
      ]);

      const quizResponse = result[0];
      const studentResponse = result[1];

      if (quizResponse.error) {
        throw quizResponse.error;
      }

      if (studentResponse.error) {
        throw studentResponse.error;
      }

      const quizRows = (quizResponse.data ?? []) as Quiz[];
      const studentRows = (studentResponse.data ?? []) as Student[];

      setQuizzes(quizRows);
      setStudents(studentRows);

      if (!selectedQuizId && quizRows.length > 0) {
        setSelectedQuizId(quizRows[0].id);
      }
    } catch (err: any) {
      setError(
        err?.message || "Unable to load teacher quiz results."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedQuizId]);

  const loadResults = useCallback(async () => {
    if (!selectedQuizId) {
      setResults([]);
      setPermissions({});
      return;
    }

    setResultsLoading(true);
    setError("");

    try {
      const { data, error: resultError } = await supabase
        .from("quiz_results")
        .select(
          "id,quiz_id,student_id,attempt_number,total_questions,total_marks,obtained_marks,percentage,correct_answers,wrong_answers,unanswered,result_status,started_at,submitted_at,created_at"
        )
        .eq("quiz_id", selectedQuizId)
        .order("submitted_at", { ascending: false });

      if (resultError) {
        throw resultError;
      }

      setResults((data ?? []) as QuizResult[]);

      const permissionResponse = await fetch(
        `/api/quiz-tests/reattempt?studentId=0`
      );

      /*
       * The existing reattempt GET endpoint is student-scoped.
       * Permissions are therefore loaded exactly for the students
       * shown in the selected quiz.
       */
      const permissionEntries: PermissionMap = {};

      const studentIds = Array.from(
        new Set(
          (data ?? [])
            .map((row: any) => Number(row.student_id))
            .filter((id: number) => Number.isFinite(id) && id > 0)
        )
      );

      if (studentIds.length > 0) {
        await Promise.all(
          studentIds.map(async (studentId) => {
            try {
              const response = await fetch(
                `/api/quiz-tests/reattempt?studentId=${studentId}`
              );

              const json = await response.json();

              if (!response.ok || !json?.success) {
                return;
              }

              const allowedQuizIds = Array.isArray(
                json.quizIds
              )
                ? json.quizIds.map(Number)
                : [];

              if (allowedQuizIds.includes(selectedQuizId)) {
                permissionEntries[
                  permissionKey(selectedQuizId, studentId)
                ] = true;
              }
            } catch {
              // Keep existing results usable even if permission lookup fails.
            }
          })
        );
      }

      setPermissions(permissionEntries);

      void permissionResponse;
    } catch (err: any) {
      setError(
        err?.message || "Unable to load quiz results."
      );
      setResults([]);
      setPermissions({});
    } finally {
      setResultsLoading(false);
    }
  }, [selectedQuizId]);

  const refresh = useCallback(async () => {
    await loadInitialData();
    await loadResults();
  }, [loadInitialData, loadResults]);

  useEffect(() => {
    void loadTeacher();
    void loadInitialData();
  }, [loadTeacher, loadInitialData]);

  useEffect(() => {
    void loadResults();
  }, [loadResults]);

  const openAttempt = useCallback(
    async (result: QuizResult) => {
      setDetailLoading(true);
      setSelectedAttempt(null);
      setError("");

      try {
        const [studentResponse, answerResponse, questionResponse] =
          await Promise.all([
            supabase
              .from("students")
              .select(
                "id,student_name,student_username,class_name"
              )
              .eq("id", result.student_id)
              .maybeSingle(),

            supabase
              .from("quiz_answers")
              .select(
                "id,result_id,question_id,selected_option_id,is_correct,marks_obtained,created_at"
              )
              .eq("result_id", result.id)
              .order("id", { ascending: true }),

            supabase
              .from("quiz_questions")
              .select(
                "id,quiz_id,question_text,marks,negative_marks,question_order"
              )
              .eq("quiz_id", result.quiz_id)
              .order("question_order", { ascending: true }),
          ]);

        if (studentResponse.error) {
          throw studentResponse.error;
        }

        if (answerResponse.error) {
          throw answerResponse.error;
        }

        if (questionResponse.error) {
          throw questionResponse.error;
        }

        setSelectedAttempt({
          result,
          student: (studentResponse.data ?? null) as Student | null,
          answers: (answerResponse.data ?? []) as QuizAnswer[],
        });

        setQuestions((questionResponse.data ?? []) as QuizQuestion[]);

        const questionIds = (questionResponse.data ?? []).map(
          (q: any) => Number(q.id)
        );

        if (questionIds.length > 0) {
          const { data: optionData, error: optionError } =
            await supabase
              .from("quiz_options")
              .select(
                "id,question_id,option_text,is_correct"
              )
              .in("question_id", questionIds)
              .order("id", { ascending: true });

          if (!optionError) {
            setOptions((optionData ?? []) as QuestionOption[]);
          } else {
            setOptions([]);
          }
        } else {
          setOptions([]);
        }
      } catch (err: any) {
        setError(
          err?.message ||
            "Unable to open this attempt."
        );
      } finally {
        setDetailLoading(false);
      }
    },
    []
  );

  const allowReattempt = useCallback(
    async (studentId: number) => {
      if (!selectedQuizId) return;

      const key = permissionKey(selectedQuizId, studentId);

      if (allowingKey) return;

      setAllowingKey(key);
      setError("");

      try {
        const response = await fetch(
          "/api/quiz-tests/reattempt",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "allow",
              quizId: selectedQuizId,
              studentId,
              teacherId,
            }),
          }
        );

        const json = await response.json();

        if (!response.ok || !json?.success) {
          throw new Error(
            json?.error || "Unable to allow reattempt."
          );
        }

        setPermissions((previous) => ({
          ...previous,
          [key]: true,
        }));
      } catch (err: any) {
        setError(
          err?.message ||
            "Unable to allow reattempt."
        );
      } finally {
        setAllowingKey(null);
      }
    },
    [selectedQuizId, teacherId, allowingKey]
  );

  const revokeReattempt = useCallback(
    async (studentId: number) => {
      if (!selectedQuizId) return;

      const key = permissionKey(selectedQuizId, studentId);

      setAllowingKey(key);
      setError("");

      try {
        const response = await fetch(
          "/api/quiz-tests/reattempt",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "revoke",
              quizId: selectedQuizId,
              studentId,
            }),
          }
        );

        const json = await response.json();

        if (!response.ok || !json?.success) {
          throw new Error(
            json?.error || "Unable to revoke permission."
          );
        }

        setPermissions((previous) => {
          const next = { ...previous };
          delete next[key];
          return next;
        });
      } catch (err: any) {
        setError(
          err?.message ||
            "Unable to revoke reattempt permission."
        );
      } finally {
        setAllowingKey(null);
      }
    },
    [selectedQuizId]
  );

  const allowAll = useCallback(async () => {
    if (!selectedQuizId || !teacherId) return;

    const candidateStudents = relevantStudents.filter(
      (student) =>
        submittedStudentIds.has(student.id) &&
        !hasCompletedReattemptByStudent.get(student.id)
    );

    if (candidateStudents.length === 0) {
      window.alert(
        "There are no eligible students for reattempt permission in this quiz."
      );
      return;
    }

    setAllowingAll(true);
    setError("");

    try {
      const responses = await Promise.all(
        candidateStudents.map(async (student) => {
          const response = await fetch(
            "/api/quiz-tests/reattempt",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                action: "allow",
                quizId: selectedQuizId,
                studentId: student.id,
                teacherId,
              }),
            }
          );

          const json = await response.json();

          return {
            studentId: student.id,
            ok: response.ok && !!json?.success,
            error: json?.error,
          };
        })
      );

      const nextPermissions: PermissionMap = {
        ...permissions,
      };

      let successCount = 0;
      let failedCount = 0;

      for (const row of responses) {
        const key = permissionKey(
          selectedQuizId,
          row.studentId
        );

        if (row.ok) {
          nextPermissions[key] = true;
          successCount += 1;
        } else {
          failedCount += 1;
        }
      }

      setPermissions(nextPermissions);

      if (failedCount > 0) {
        setError(
          `${successCount} reattempt permissions allowed. ${failedCount} could not be allowed.`
        );
      }
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to allow all reattempts."
      );
    } finally {
      setAllowingAll(false);
    }
  }, [
    selectedQuizId,
    teacherId,
    relevantStudents,
    submittedStudentIds,
    hasCompletedReattemptByStudent,
    permissions,
  ]);

  const selectedQuizResultsByStudent = useMemo(() => {
    if (!selectedQuizId) return new Map<number, QuizResult[]>();

    const map = new Map<number, QuizResult[]>();

    results
      .filter((row) => row.quiz_id === selectedQuizId)
      .forEach((row) => {
        const existing = map.get(row.student_id) ?? [];
        existing.push(row);
        map.set(row.student_id, existing);
      });

    map.forEach((rows, studentId) => {
      rows.sort(
        (a, b) =>
          numberValue(a.attempt_number, 1) -
          numberValue(b.attempt_number, 1)
      );

      map.set(studentId, rows);
    });

    return map;
  }, [results, selectedQuizId]);

  const printResult = useCallback(() => {
    if (!selectedAttempt || !selectedQuiz) return;

    const student = selectedAttempt.student;
    const result = selectedAttempt.result;

    const questionRows = questions.map((question) => {
      const answer = selectedAttempt.answers.find(
        (item) => item.question_id === question.id
      );

      const selectedOption =
        options.find(
          (option) =>
            option.id === answer?.selected_option_id
        ) ?? null;

      const correctOption =
        options.find(
          (option) =>
            option.question_id === question.id &&
            option.is_correct === true
        ) ?? null;

      return {
        question,
        answer,
        selectedOption,
        correctOption,
      };
    });

    const popup = window.open(
      "",
      "_blank",
      "width=1000,height=800"
    );

    if (!popup) {
      window.alert(
        "Please allow popups to print/download the result PDF."
      );
      return;
    }

    const rowsHtml = questionRows
      .map((row, index) => {
        const answerText =
          row.selectedOption?.option_text ??
          "Not answered";

        const correctText =
          row.correctOption?.option_text ??
          "—";

        const status = row.answer?.is_correct
          ? "Correct"
          : row.answer
              ? "Wrong"
              : "Unanswered";

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(
              row.question.question_text ?? ""
            )}</td>
            <td>${escapeHtml(answerText)}</td>
            <td>${escapeHtml(correctText)}</td>
            <td>${status}</td>
            <td>${displayNumber(
              row.answer?.marks_obtained ?? 0
            )}</td>
          </tr>
        `;
      })
      .join("");

    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(
            selectedQuiz.title
          )} - Result</title>
          <style>
            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, sans-serif;
              margin: 24px;
              color: #111827;
              background: white;
            }

            h1,
            h2,
            h3,
            p {
              margin-top: 0;
            }

            .header {
              border-bottom: 2px solid #111827;
              padding-bottom: 16px;
              margin-bottom: 20px;
            }

            .grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin: 20px 0;
            }

            .box {
              border: 1px solid #d1d5db;
              border-radius: 8px;
              padding: 10px;
            }

            .label {
              font-size: 11px;
              color: #6b7280;
            }

            .value {
              font-size: 18px;
              font-weight: 700;
              margin-top: 5px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 11px;
            }

            th,
            td {
              border: 1px solid #d1d5db;
              padding: 7px;
              vertical-align: top;
            }

            th {
              background: #f3f4f6;
            }

            .footer {
              margin-top: 24px;
              font-size: 11px;
              color: #6b7280;
            }

            @media print {
              body {
                margin: 10mm;
              }
            }
          </style>
        </head>

        <body>
          <div class="header">
            <h1>${escapeHtml(
              selectedQuiz.title
            )}</h1>
            <p>
              <strong>Student:</strong>
              ${escapeHtml(
                student?.student_name ?? "—"
              )}
            </p>
            <p>
              <strong>Username:</strong>
              ${escapeHtml(
                student?.student_username ?? "—"
              )}
            </p>
            <p>
              <strong>Class:</strong>
              ${escapeHtml(
                student?.class_name ?? "—"
              )}
            </p>
            <p>
              <strong>Subject:</strong>
              ${escapeHtml(
                selectedQuiz.subject ?? "—"
              )}
            </p>
            <p>
              <strong>Date:</strong>
              ${formatDate(
                selectedQuiz.scheduled_date
              )}
            </p>
            <p>
              <strong>Attempt:</strong>
              ${numberValue(
                result.attempt_number,
                1
              ) > 1
                ? "Reattempt"
                : "Original Attempt"}
            </p>
          </div>

          <div class="grid">
            <div class="box">
              <div class="label">Total Marks</div>
              <div class="value">
                ${displayNumber(result.total_marks)}
              </div>
            </div>

            <div class="box">
              <div class="label">Obtained Marks</div>
              <div class="value">
                ${displayNumber(result.obtained_marks)}
              </div>
            </div>

            <div class="box">
              <div class="label">Percentage</div>
              <div class="value">
                ${displayNumber(result.percentage)}%
              </div>
            </div>

            <div class="box">
              <div class="label">Result</div>
              <div class="value">
                ${escapeHtml(
                  String(
                    result.result_status ?? "—"
                  )
                )}
              </div>
            </div>
          </div>

          <div>
            <strong>Correct:</strong>
            ${numberValue(result.correct_answers)}
            &nbsp;&nbsp;&nbsp;

            <strong>Wrong:</strong>
            ${numberValue(result.wrong_answers)}
            &nbsp;&nbsp;&nbsp;

            <strong>Unanswered:</strong>
            ${numberValue(result.unanswered)}
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Question</th>
                <th>Student Answer</th>
                <th>Correct Answer</th>
                <th>Status</th>
                <th>Marks</th>
              </tr>
            </thead>

            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer">
            Submitted:
            ${formatDateTime(result.submitted_at)}
          </div>
        </body>
      </html>
    `);

    popup.document.close();

    setTimeout(() => {
      popup.focus();
      popup.print();
    }, 400);
  }, [
    selectedAttempt,
    selectedQuiz,
    questions,
    options,
  ]);

  function escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  const closeDetail = () => {
    setSelectedAttempt(null);
    setQuestions([]);
    setOptions([]);
  };

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={loadingStyle}>
          Loading quiz results...
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <header style={headerStyle}>
          <div>
            <div style={eyebrowStyle}>
              RACER ACADEMY
            </div>

            <h1 style={titleStyle}>
              Teacher Quiz Results
            </h1>

            <p style={subtitleStyle}>
              {teacherName
                ? `Teacher: ${teacherName}`
                : "Quiz result management"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void refresh()}
            style={buttonStyle}
          >
            Refresh
          </button>
        </header>

        {error ? (
          <div style={errorStyle}>
            <strong>Error:</strong> {error}
          </div>
        ) : null}

        <section style={panelStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>
                Select Quiz
              </h2>
              <p style={sectionHintStyle}>
                Results and reattempt permissions are scoped to
                the selected quiz/date.
              </p>
            </div>

            <div style={countBadgeStyle}>
              {quizzes.length} quizzes
            </div>
          </div>

          <div style={controlGridStyle}>
            <div>
              <label style={labelStyle}>
                Quiz
              </label>

              <select
                value={selectedQuizId ?? ""}
                onChange={(event) => {
                  const value = Number(event.target.value);

                  setSelectedQuizId(
                    Number.isFinite(value) && value > 0
                      ? value
                      : null
                  );

                  setSelectedAttempt(null);
                }}
                style={selectStyle}
              >
                {quizzes.length === 0 ? (
                  <option value="">
                    No quizzes found
                  </option>
                ) : (
                  quizzes.map((quiz) => (
                    <option
                      key={quiz.id}
                      value={quiz.id}
                    >
                      {quiz.title} —{" "}
                      {formatDate(
                        quiz.scheduled_date
                      )}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                Search Student
              </label>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Name, username or class"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Attempt
              </label>

              <select
                value={attemptFilter}
                onChange={(event) =>
                  setAttemptFilter(
                    event.target.value as
                      | "all"
                      | "original"
                      | "reattempt"
                  )
                }
                style={selectStyle}
              >
                <option value="all">
                  All Attempts
                </option>
                <option value="original">
                  Original Only
                </option>
                <option value="reattempt">
                  Reattempts Only
                </option>
              </select>
            </div>
          </div>
        </section>

        {selectedQuiz ? (
          <section style={panelStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <h2 style={sectionTitleStyle}>
                  {selectedQuiz.title}
                </h2>

                <p style={sectionHintStyle}>
                  Date:{" "}
                  {formatDate(
                    selectedQuiz.scheduled_date
                  )}{" "}
                  · Subject:{" "}
                  {selectedQuiz.subject || "—"}{" "}
                  · Duration:{" "}
                  {numberValue(
                    selectedQuiz.duration_minutes,
                    30
                  )}{" "}
                  min
                </p>
              </div>

              <button
                type="button"
                onClick={() => void allowAll()}
                disabled={
                  allowingAll ||
                  relevantStudents.every(
                    (student) =>
                      !submittedStudentIds.has(
                        student.id
                      ) ||
                      !!hasCompletedReattemptByStudent.get(
                        student.id
                      )
                  )
                }
                style={{
                  ...primaryButtonStyle,
                  opacity: allowingAll ? 0.6 : 1,
                }}
              >
                {allowingAll
                  ? "Allowing..."
                  : "Allow All"}
              </button>
            </div>

            <div style={statsGridStyle}>
              <div style={statCardStyle}>
                <div style={statLabelStyle}>
                  Target Students
                </div>
                <div style={statValueStyle}>
                  {relevantStudents.length}
                </div>
              </div>

              <div style={statCardStyle}>
                <div style={statLabelStyle}>
                  Submitted
                </div>
                <div style={statValueStyle}>
                  {submittedStudentIds.size}
                </div>
              </div>

              <div style={statCardStyle}>
                <div style={statLabelStyle}>
                  Reattempt Permissions
                </div>
                <div style={statValueStyle}>
                  {
                    Object.keys(permissions).filter(
                      (key) =>
                        key.startsWith(
                          `${selectedQuiz.id}:`
                        )
                    ).length
                  }
                </div>
              </div>

              <div style={statCardStyle}>
                <div style={statLabelStyle}>
                  Result Records
                </div>
                <div style={statValueStyle}>
                  {quizResults.length}
                </div>
              </div>
            </div>

            {resultsLoading ? (
              <div style={inlineLoadingStyle}>
                Loading results...
              </div>
            ) : null}

            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Student</th>
                    <th style={thStyle}>Class</th>
                    <th style={thStyle}>Attempt</th>
                    <th style={thStyle}>Marks</th>
                    <th style={thStyle}>%</th>
                    <th style={thStyle}>Correct</th>
                    <th style={thStyle}>Wrong</th>
                    <th style={thStyle}>Unanswered</th>
                    <th style={thStyle}>Result</th>
                    <th style={thStyle}>Submitted</th>
                    <th style={thStyle}>Reattempt</th>
                    <th style={thStyle}>View</th>
                  </tr>
                </thead>

                <tbody>
                  {quizResults.length === 0 ? (
                    <tr>
                      <td
                        colSpan={12}
                        style={emptyCellStyle}
                      >
                        No result records found for this
                        quiz.
                      </td>
                    </tr>
                  ) : (
                    quizResults.map((result) => {
                      const student =
                        students.find(
                          (item) =>
                            item.id ===
                            result.student_id
                        );

                      const attemptNumber =
                        numberValue(
                          result.attempt_number,
                          1
                        );

                      const isReattempt =
                        attemptNumber > 1;

                      const key = permissionKey(
                        selectedQuiz.id,
                        result.student_id
                      );

                      const permissionAllowed =
                        !!permissions[key];

                      const hasCompletedReattempt =
                        !!hasCompletedReattemptByStudent.get(
                          result.student_id
                        );

                      const latest =
                        latestResultByStudent.get(
                          result.student_id
                        );

                      const isLatest =
                        latest?.id === result.id;

                      return (
                        <tr
                          key={result.id}
                          style={{
                            background:
                              isReattempt
                                ? "#fffdf5"
                                : "white",
                          }}
                        >
                          <td style={tdStyle}>
                            <div
                              style={{
                                fontWeight: 700,
                              }}
                            >
                              {student?.student_name ||
                                "Unknown Student"}
                            </div>

                            <div
                              style={{
                                fontSize: 12,
                                color: "#6b7280",
                                marginTop: 3,
                              }}
                            >
                              {student?.student_username ||
                                "—"}
                            </div>
                          </td>

                          <td style={tdStyle}>
                            {student?.class_name ||
                              "—"}
                          </td>

                          <td style={tdStyle}>
                            <span
                              style={{
                                ...attemptBadgeStyle,
                                background:
                                  isReattempt
                                    ? "#fff7ed"
                                    : "#eff6ff",
                                color:
                                  isReattempt
                                    ? "#c2410c"
                                    : "#1d4ed8",
                                borderColor:
                                  isReattempt
                                    ? "#fed7aa"
                                    : "#bfdbfe",
                              }}
                            >
                              {isReattempt
                                ? `Reattempt #${attemptNumber - 1}`
                                : "Original"}
                            </span>

                            {isLatest ? (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#6b7280",
                                  marginTop: 4,
                                }}
                              >
                                Latest
                              </div>
                            ) : null}
                          </td>

                          <td style={tdStyle}>
                            <strong>
                              {displayNumber(
                                result.obtained_marks
                              )}
                            </strong>
                            {" / "}
                            {displayNumber(
                              result.total_marks
                            )}
                          </td>

                          <td style={tdStyle}>
                            {displayNumber(
                              result.percentage
                            )}
                            %
                          </td>

                          <td style={tdStyle}>
                            {numberValue(
                              result.correct_answers
                            )}
                          </td>

                          <td style={tdStyle}>
                            {numberValue(
                              result.wrong_answers
                            )}
                          </td>

                          <td style={tdStyle}>
                            {numberValue(
                              result.unanswered
                            )}
                          </td>

                          <td style={tdStyle}>
                            <span
                              style={{
                                ...statusBadgeStyle,
                                background:
                                  String(
                                    result.result_status ??
                                      ""
                                  ).toUpperCase() ===
                                  "PASS"
                                    ? "#ecfdf5"
                                    : "#fef2f2",
                                color:
                                  String(
                                    result.result_status ??
                                      ""
                                  ).toUpperCase() ===
                                  "PASS"
                                    ? "#047857"
                                    : "#b91c1c",
                              }}
                            >
                              {result.result_status ||
                                "—"}
                            </span>
                          </td>

                          <td style={tdStyle}>
                            {formatDateTime(
                              result.submitted_at
                            )}
                          </td>

                          <td style={tdStyle}>
                            {!isReattempt &&
                            submittedStudentIds.has(
                              result.student_id
                            ) &&
                            !hasCompletedReattempt ? (
                              permissionAllowed ? (
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection:
                                      "column",
                                    gap: 6,
                                  }}
                                >
                                  <span
                                    style={{
                                      ...permissionBadgeStyle,
                                    }}
                                  >
                                    Allowed
                                  </span>

                                  <button
                                    type="button"
                                    disabled={
                                      allowingKey === key
                                    }
                                    onClick={() =>
                                      void revokeReattempt(
                                        result.student_id
                                      )
                                    }
                                    style={
                                      smallDangerButtonStyle
                                    }
                                  >
                                    {allowingKey === key
                                      ? "..."
                                      : "Revoke"}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={
                                    allowingKey === key
                                  }
                                  onClick={() =>
                                    void allowReattempt(
                                      result.student_id
                                    )
                                  }
                                  style={
                                    smallPrimaryButtonStyle
                                  }
                                >
                                  {allowingKey === key
                                    ? "Allowing..."
                                    : "Allow Reattempt"}
                                </button>
                              )
                            ) : hasCompletedReattempt ? (
                              <span
                                style={{
                                  ...usedBadgeStyle,
                                }}
                              >
                                Used
                              </span>
                            ) : isReattempt ? (
                              <span
                                style={{
                                  fontSize: 12,
                                  color: "#6b7280",
                                }}
                              >
                                One reattempt used
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: 12,
                                  color: "#6b7280",
                                }}
                              >
                                Not eligible
                              </span>
                            )}
                          </td>

                          <td style={tdStyle}>
                            <button
                              type="button"
                              onClick={() =>
                                void openAttempt(
                                  result
                                )
                              }
                              style={
                                viewButtonStyle
                              }
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div style={noteStyle}>
              <strong>Reattempt rule:</strong>{" "}
              Permission is stored for this exact student
              and this exact quiz record/date. A completed
              reattempt remains a separate result record.
              The student cannot receive a second completed
              reattempt for the same quiz.
            </div>
          </section>
        ) : null}

        {selectedQuiz ? (
          <section style={panelStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <h2 style={sectionTitleStyle}>
                  Student Attempt Summary
                </h2>
                <p style={sectionHintStyle}>
                  All stored attempts remain separate.
                </p>
              </div>
            </div>

            <div style={summaryGridStyle}>
              {relevantStudents.map((student) => {
                const studentResults =
                  selectedQuizResultsByStudent.get(
                    student.id
                  ) ?? [];

                const latestResult =
                  studentResults[
                    studentResults.length - 1
                  ];

                const hasSubmitted =
                  submittedStudentIds.has(
                    student.id
                  );

                const permission =
                  permissions[
                    permissionKey(
                      selectedQuiz.id,
                      student.id
                    )
                  ];

                const used =
                  !!hasCompletedReattemptByStudent.get(
                    student.id
                  );

                return (
                  <div
                    key={student.id}
                    style={studentCardStyle}
                  >
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 16,
                      }}
                    >
                      {student.student_name ||
                        "Unnamed Student"}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        marginTop: 3,
                      }}
                    >
                      {student.student_username ||
                        "—"}{" "}
                      ·{" "}
                      {student.class_name || "—"}
                    </div>

                    <div
                      style={{
                        marginTop: 14,
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(2, minmax(0, 1fr))",
                        gap: 8,
                      }}
                    >
                      <div style={miniStatStyle}>
                        <span>Attempts</span>
                        <strong>
                          {studentResults.length}
                        </strong>
                      </div>

                      <div style={miniStatStyle}>
                        <span>Status</span>
                        <strong>
                          {hasSubmitted
                            ? "Submitted"
                            : "Pending"}
                        </strong>
                      </div>
                    </div>

                    {latestResult ? (
                      <div
                        style={{
                          marginTop: 10,
                          fontSize: 12,
                          color: "#374151",
                        }}
                      >
                        Latest:{" "}
                        {displayNumber(
                          latestResult.obtained_marks
                        )}
                        /
                        {displayNumber(
                          latestResult.total_marks
                        )}{" "}
                        ·{" "}
                        {displayNumber(
                          latestResult.percentage
                        )}
                        %
                      </div>
                    ) : null}

                    <div
                      style={{
                        marginTop: 12,
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      {permission ? (
                        <span
                          style={
                            permissionBadgeStyle
                          }
                        >
                          Reattempt Allowed
                        </span>
                      ) : null}

                      {used ? (
                        <span
                          style={usedBadgeStyle}
                        >
                          Reattempt Used
                        </span>
                      ) : null}
                    </div>

                    {studentResults.length > 0 ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          marginTop: 12,
                        }}
                      >
                        {studentResults.map(
                          (attempt) => (
                            <button
                              key={attempt.id}
                              type="button"
                              onClick={() =>
                                void openAttempt(
                                  attempt
                                )
                              }
                              style={
                                attemptRowButtonStyle
                              }
                            >
                              <span>
                                Attempt{" "}
                                {numberValue(
                                  attempt.attempt_number,
                                  1
                                ) >
                                1
                                  ? `Reattempt #${
                                      numberValue(
                                        attempt.attempt_number,
                                        1
                                      ) - 1
                                    }`
                                  : "Original"}
                              </span>

                              <span>
                                {displayNumber(
                                  attempt.percentage
                                )}
                                %
                              </span>
                            </button>
                          )
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>

      {selectedAttempt ? (
        <div style={modalBackdropStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <div>
                <div style={eyebrowStyle}>
                  RESULT DETAILS
                </div>

                <h2 style={modalTitleStyle}>
                  {selectedQuiz?.title ||
                    "Quiz Result"}
                </h2>

                <p style={sectionHintStyle}>
                  {selectedAttempt.student
                    ?.student_name || "Student"}{" "}
                  · Attempt{" "}
                  {numberValue(
                    selectedAttempt.result
                      .attempt_number,
                    1
                  )}
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={printResult}
                  style={primaryButtonStyle}
                >
                  PDF / Print
                </button>

                <button
                  type="button"
                  onClick={closeDetail}
                  style={buttonStyle}
                >
                  Close
                </button>
              </div>
            </div>

            {detailLoading ? (
              <div style={inlineLoadingStyle}>
                Loading full result...
              </div>
            ) : (
              <>
                <div style={resultHeaderGridStyle}>
                  <div style={resultBoxStyle}>
                    <span>Total Marks</span>
                    <strong>
                      {displayNumber(
                        selectedAttempt.result
                          .total_marks
                      )}
                    </strong>
                  </div>

                  <div style={resultBoxStyle}>
                    <span>Obtained</span>
                    <strong>
                      {displayNumber(
                        selectedAttempt.result
                          .obtained_marks
                      )}
                    </strong>
                  </div>

                  <div style={resultBoxStyle}>
                    <span>Percentage</span>
                    <strong>
                      {displayNumber(
                        selectedAttempt.result
                          .percentage
                      )}
                      %
                    </strong>
                  </div>

                  <div style={resultBoxStyle}>
                    <span>Result</span>
                    <strong>
                      {selectedAttempt.result
                        .result_status || "—"}
                    </strong>
                  </div>

                  <div style={resultBoxStyle}>
                    <span>Correct</span>
                    <strong>
                      {numberValue(
                        selectedAttempt.result
                          .correct_answers
                      )}
                    </strong>
                  </div>

                  <div style={resultBoxStyle}>
                    <span>Wrong</span>
                    <strong>
                      {numberValue(
                        selectedAttempt.result
                          .wrong_answers
                      )}
                    </strong>
                  </div>

                  <div style={resultBoxStyle}>
                    <span>Unanswered</span>
                    <strong>
                      {numberValue(
                        selectedAttempt.result
                          .unanswered
                      )}
                    </strong>
                  </div>

                  <div style={resultBoxStyle}>
                    <span>Submitted</span>
                    <strong
                      style={{
                        fontSize: 12,
                        lineHeight: 1.35,
                      }}
                    >
                      {formatDateTime(
                        selectedAttempt.result
                          .submitted_at
                      )}
                    </strong>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 20,
                    fontWeight: 800,
                    fontSize: 17,
                  }}
                >
                  Question Performance
                </div>

                <div style={tableWrapStyle}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>
                          #
                        </th>
                        <th style={thStyle}>
                          Question
                        </th>
                        <th style={thStyle}>
                          Student Answer
                        </th>
                        <th style={thStyle}>
                          Correct Answer
                        </th>
                        <th style={thStyle}>
                          Status
                        </th>
                        <th style={thStyle}>
                          Marks
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {questions.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            style={
                              emptyCellStyle
                            }
                          >
                            No question data found.
                          </td>
                        </tr>
                      ) : (
                        questions.map(
                          (question, index) => {
                            const answer =
                              selectedAttempt.answers.find(
                                (item) =>
                                  item.question_id ===
                                  question.id
                              );

                            const selectedOption =
                              options.find(
                                (option) =>
                                  option.id ===
                                  answer?.selected_option_id
                              );

                            const correctOption =
                              options.find(
                                (option) =>
                                  option.question_id ===
                                    question.id &&
                                  option.is_correct ===
                                    true
                              );

                            const status =
                              answer?.is_correct ===
                              true
                                ? "Correct"
                                : answer
                                      ? "Wrong"
                                      : "Unanswered";

                            return (
                              <tr
                                key={
                                  question.id
                                }
                              >
                                <td style={tdStyle}>
                                  {index + 1}
                                </td>

                                <td
                                  style={
                                    questionCellStyle
                                  }
                                >
                                  {
                                    question.question_text
                                  }
                                </td>

                                <td
                                  style={
                                    questionCellStyle
                                  }
                                >
                                  {selectedOption
                                    ?.option_text ||
                                    "Not answered"}
                                </td>

                                <td
                                  style={
                                    questionCellStyle
                                  }
                                >
                                  {correctOption
                                    ?.option_text ||
                                    "—"}
                                </td>

                                <td
                                  style={
                                    tdStyle
                                  }
                                >
                                  <span
                                    style={{
                                      ...statusBadgeStyle,
                                      background:
                                        status ===
                                        "Correct"
                                          ? "#ecfdf5"
                                          : status ===
                                              "Wrong"
                                            ? "#fef2f2"
                                            : "#f9fafb",
                                      color:
                                        status ===
                                        "Correct"
                                          ? "#047857"
                                          : status ===
                                              "Wrong"
                                            ? "#b91c1c"
                                            : "#374151",
                                    }}
                                  >
                                    {status}
                                  </span>
                                </td>

                                <td
                                  style={
                                    tdStyle
                                  }
                                >
                                  {displayNumber(
                                    answer?.marks_obtained ??
                                      0
                                  )}
                                </td>
                              </tr>
                            );
                          }
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={detailInfoStyle}>
                  <div>
                    <strong>
                      Quiz Date:
                    </strong>{" "}
                    {formatDate(
                      selectedQuiz?.scheduled_date
                    )}
                  </div>

                  <div>
                    <strong>
                      Attempt:
                    </strong>{" "}
                    {numberValue(
                      selectedAttempt.result
                        .attempt_number,
                      1
                    ) > 1
                      ? `Reattempt #${
                          numberValue(
                            selectedAttempt
                              .result
                              .attempt_number,
                            1
                          ) - 1
                        }`
                      : "Original Attempt"}
                  </div>

                  <div>
                    <strong>
                      Started:
                    </strong>{" "}
                    {formatDateTime(
                      selectedAttempt.result
                        .started_at
                    )}
                  </div>

                  <div>
                    <strong>
                      Submitted:
                    </strong>{" "}
                    {formatDateTime(
                      selectedAttempt.result
                        .submitted_at
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
  padding: "20px",
  color: "#111827",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 1600,
  margin: "0 auto",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 18,
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 1.2,
  color: "#6b7280",
  marginBottom: 6,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 28,
  lineHeight: 1.15,
};

const modalTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  lineHeight: 1.2,
};

const subtitleStyle: React.CSSProperties = {
  margin: "7px 0 0",
  color: "#6b7280",
  fontSize: 14,
};

const panelStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 18,
  marginBottom: 18,
  boxShadow:
    "0 10px 30px rgba(15, 23, 42, 0.05)",
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 16,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 19,
};

const sectionHintStyle: React.CSSProperties = {
  margin: "5px 0 0",
  color: "#6b7280",
  fontSize: 13,
  lineHeight: 1.45,
};

const countBadgeStyle: React.CSSProperties = {
  background: "#f3f4f6",
  color: "#374151",
  borderRadius: 999,
  padding: "7px 11px",
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const controlGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "minmax(240px, 1.5fr) minmax(200px, 1fr) minmax(180px, .8fr)",
  gap: 12,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: "#374151",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 42,
  border: "1px solid #d1d5db",
  borderRadius: 9,
  padding: "0 12px",
  fontSize: 14,
  outline: "none",
  background: "white",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 42,
  border: "1px solid #d1d5db",
  borderRadius: 9,
  padding: "0 12px",
  fontSize: 14,
  background: "white",
};

const buttonStyle: React.CSSProperties = {
  minHeight: 40,
  padding: "0 14px",
  border: "1px solid #d1d5db",
  borderRadius: 9,
  background: "#ffffff",
  color: "#111827",
  fontWeight: 700,
  cursor: "pointer",
};

const primaryButtonStyle: React.CSSProperties = {
  minHeight: 40,
  padding: "0 14px",
  border: "1px solid #111827",
  borderRadius: 9,
  background: "#111827",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer",
};

const smallPrimaryButtonStyle: React.CSSProperties = {
  border: "1px solid #2563eb",
  borderRadius: 7,
  background: "#eff6ff",
  color: "#1d4ed8",
  padding: "6px 8px",
  fontSize: 11,
  fontWeight: 800,
  cursor: "pointer",
};

const smallDangerButtonStyle: React.CSSProperties = {
  border: "1px solid #fecaca",
  borderRadius: 7,
  background: "#fef2f2",
  color: "#b91c1c",
  padding: "5px 8px",
  fontSize: 11,
  fontWeight: 800,
  cursor: "pointer",
};

const viewButtonStyle: React.CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: 7,
  background: "#f9fafb",
  color: "#111827",
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(140px, 1fr))",
  gap: 10,
  marginBottom: 16,
};

const statCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 13,
  background: "#fafafa",
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#6b7280",
  fontWeight: 700,
};

const statValueStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  marginTop: 3,
};

const tableWrapStyle: React.CSSProperties = {
  width: "100%",
  overflowX: "auto",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 1250,
};

const thStyle: React.CSSProperties = {
  background: "#f8fafc",
  borderBottom: "1px solid #e5e7eb",
  padding: "11px 9px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 800,
  color: "#475569",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  borderBottom: "1px solid #eef2f7",
  padding: "10px 9px",
  fontSize: 12,
  verticalAlign: "top",
};

const questionCellStyle: React.CSSProperties = {
  ...tdStyle,
  minWidth: 220,
  maxWidth: 360,
  whiteSpace: "normal",
  lineHeight: 1.45,
};

const emptyCellStyle: React.CSSProperties = {
  padding: 28,
  textAlign: "center",
  color: "#6b7280",
  fontSize: 13,
};

const statusBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "5px 8px",
  fontSize: 11,
  fontWeight: 800,
};

const attemptBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  border: "1px solid",
  borderRadius: 999,
  padding: "5px 8px",
  fontSize: 11,
  fontWeight: 800,
};

const permissionBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  borderRadius: 999,
  background: "#ecfdf5",
  color: "#047857",
  border: "1px solid #a7f3d0",
  padding: "5px 8px",
  fontSize: 11,
  fontWeight: 800,
};

const usedBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  borderRadius: 999,
  background: "#f3f4f6",
  color: "#374151",
  border: "1px solid #d1d5db",
  padding: "5px 8px",
  fontSize: 11,
  fontWeight: 800,
};

const noteStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 12,
  borderRadius: 10,
  border: "1px solid #dbeafe",
  background: "#eff6ff",
  color: "#1e3a8a",
  fontSize: 12,
  lineHeight: 1.5,
};

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(250px, 1fr))",
  gap: 12,
};

const studentCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 13,
  padding: 14,
  background: "#ffffff",
};

const miniStatStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  border: "1px solid #f1f5f9",
  background: "#f8fafc",
  borderRadius: 8,
  padding: "7px 9px",
  fontSize: 11,
  color: "#64748b",
};

const attemptRowButtonStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  background: "#fafafa",
  padding: "8px 10px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const loadingStyle: React.CSSProperties = {
  minHeight: "70vh",
  display: "grid",
  placeItems: "center",
  fontSize: 16,
  color: "#4b5563",
};

const inlineLoadingStyle: React.CSSProperties = {
  padding: 14,
  textAlign: "center",
  color: "#6b7280",
  fontSize: 13,
};

const errorStyle: React.CSSProperties = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
  borderRadius: 12,
  padding: 12,
  marginBottom: 16,
  fontSize: 13,
  lineHeight: 1.5,
};

const modalBackdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.58)",
  zIndex: 9999,
  padding: 16,
  overflowY: "auto",
};

const modalStyle: React.CSSProperties = {
  width: "min(1400px, 100%)",
  margin: "0 auto",
  background: "#ffffff",
  borderRadius: 16,
  minHeight: "calc(100vh - 32px)",
  padding: 18,
  boxShadow:
    "0 25px 60px rgba(15, 23, 42, .25)",
};

const modalHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  paddingBottom: 14,
  borderBottom: "1px solid #e5e7eb",
};

const resultHeaderGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(140px, 1fr))",
  gap: 10,
  marginTop: 16,
};

const resultBoxStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 11,
  background: "#fafafa",
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const detailInfoStyle: React.CSSProperties = {
  marginTop: 16,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 8,
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 12,
  fontSize: 12,
  color: "#374151",
};