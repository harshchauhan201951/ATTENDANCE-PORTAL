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
import jsPDF from "jspdf";

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

type QuizStudentRow = {
  quiz: QuizTest;
  student: Student;
  results: QuizResult[];
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

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatDate(date: string | null): string {
  if (!date) return "Not available";

  try {
    const d = new Date(`${date}T00:00:00+05:30`);

    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return date;
  }
}

function formatDateLong(date: string | null): string {
  if (!date) return "Not available";

  try {
    const d = new Date(`${date}T00:00:00+05:30`);

    return d.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return date;
  }
}

function formatDateTime(date: string | null): string {
  if (!date) return "Not available";

  try {
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return date;
  }
}

function formatTime(time: string | null): string {
  if (!time) return "Not available";

  const parts = time.split(":");

  if (parts.length < 2) return time;

  const hour = Number(parts[0]);
  const minute = Number(parts[1]);

  if (!Number.isFinite(hour)) return time;

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function normalizeClassName(value: string | null): string {
  return String(value || "").trim() || "Unknown Class";
}

function normalizeSubject(value: string | null): string {
  return String(value || "").trim() || "Other";
}

function resultStatus(result: QuizResult): string {
  const status = String(result.result_status || "").trim();

  if (status) return status.toUpperCase();

  const percentage = safeNumber(result.percentage);

  return percentage >= 40 ? "PASS" : "FAIL";
}

function statusClass(result: QuizResult): string {
  const status = resultStatus(result);

  if (status.includes("PASS")) return "pass";
  if (status.includes("FAIL")) return "fail";

  return "neutral";
}

function getAttemptLabel(result: QuizResult, index: number): string {
  const attempt = safeNumber(result.attempt_number);

  return `Attempt #${attempt > 0 ? attempt : index + 1}`;
}

function sortClasses(classes: string[]): string[] {
  return [...classes].sort((a, b) => {
    const na = Number(a.replace(/[^0-9]/g, ""));
    const nb = Number(b.replace(/[^0-9]/g, ""));

    if (
      Number.isFinite(na) &&
      Number.isFinite(nb) &&
      na !== nb
    ) {
      return na - nb;
    }

    return a.localeCompare(b, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });
}

function getQuizClasses(quiz: QuizTest): string[] {
  const classes = new Set<string>();

  if (quiz.class_name) {
    classes.add(normalizeClassName(quiz.class_name));
  }

  if (Array.isArray(quiz.target_classes)) {
    quiz.target_classes.forEach((value) => {
      if (value) {
        classes.add(normalizeClassName(value));
      }
    });
  }

  return sortClasses([...classes]);
}

function TeacherQuizResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const quizIdParam = searchParams.get("quizId");
  const quizId = Number(quizIdParam);

  const [currentQuiz, setCurrentQuiz] =
    useState<QuizTest | null>(null);

  const [currentStudents, setCurrentStudents] = useState<
    Student[]
  >([]);

  const [currentResults, setCurrentResults] = useState<
    QuizResult[]
  >([]);

  const [allQuizzes, setAllQuizzes] = useState<QuizTest[]>([]);
  const [allResults, setAllResults] = useState<QuizResult[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);

  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedDate, setSelectedDate] = useState("ALL");
  const [selectedSubject, setSelectedSubject] = useState("ALL");
  const [selectedClass, setSelectedClass] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const [expandedDates, setExpandedDates] =
    useState<Set<string>>(new Set());

  const [expandedClasses, setExpandedClasses] =
    useState<Set<string>>(new Set());

  const [expandedStudents, setExpandedStudents] =
    useState<Set<string>>(new Set());

  const [reattemptQuizIds, setReattemptQuizIds] =
    useState<Set<string>>(new Set());

  const [reattemptLoading, setReattemptLoading] =
    useState<string | null>(null);

  const [reattemptMessage, setReattemptMessage] =
    useState("");

  const [dateReattemptLoading, setDateReattemptLoading] =
    useState<string | null>(null);

  const [dateReattemptMessage, setDateReattemptMessage] =
    useState("");

  const goBack = () => {
    router.back();
  };

  const goDashboard = () => {
    router.push("/teacher");
  };

  const logout = () => {
    try {
      localStorage.removeItem("teacher_username");
      localStorage.removeItem("teacherUsername");
      localStorage.removeItem("teacherLoggedIn");
      localStorage.removeItem("attendance_role");
      localStorage.removeItem("attendance_username");
      localStorage.removeItem("attendance_teacher_id");
      localStorage.removeItem("teacher_id");
    } catch {
      // ignore
    }

    router.replace("/");
  };

  const loadReattemptPermissions = useCallback(
    async (quizRows: QuizTest[], studentRows: Student[]) => {
      try {
        const pairs: Array<{
          quiz: QuizTest;
          student: Student;
        }> = [];

        for (const quiz of quizRows) {
          for (const student of studentRows) {
            pairs.push({
              quiz,
              student,
            });
          }
        }

        const allowed = new Set<string>();
        const batchSize = 12;

        for (
          let index = 0;
          index < pairs.length;
          index += batchSize
        ) {
          const batch = pairs.slice(
            index,
            index + batchSize
          );

          const responses = await Promise.all(
            batch.map(
              async ({ quiz, student }) => {
                try {
                  const response = await fetch(
                    `/api/quiz-tests/reattempt?studentId=${encodeURIComponent(
                      String(student.id)
                    )}&quizId=${encodeURIComponent(
                      String(quiz.id)
                    )}`,
                    {
                      method: "GET",
                      cache: "no-store",
                    }
                  );

                  if (!response.ok) {
                    return null;
                  }

                  const data = await response.json();

                  if (
                    data?.allowed === true ||
                    (Array.isArray(data?.quizIds) &&
                      data.quizIds.some(
                        (id: unknown) =>
                          Number(id) === Number(quiz.id)
                      ))
                  ) {
                    return `${quiz.id}__${student.id}`;
                  }
                } catch {
                  return null;
                }

                return null;
              }
            )
          );

          responses.forEach((key) => {
            if (key) {
              allowed.add(key);
            }
          });
        }

        setReattemptQuizIds(allowed);
      } catch {
        setReattemptQuizIds(new Set());
      }
    },
    []
  );

  const loadData = useCallback(async () => {
    if (!Number.isFinite(quizId) || quizId <= 0) {
      setError("Quiz ID is missing or invalid.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [
        currentQuizResponse,
        currentResultsResponse,
        studentsResponse,
      ] = await Promise.all([
        supabase
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
              is_published,
              created_at
            `
          )
          .eq("id", quizId)
          .single(),

        supabase
          .from("quiz_results")
          .select(
            `
              id,
              quiz_id,
              student_id,
              attempt_number,
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
            `
          )
          .eq("quiz_id", quizId)
          .order("created_at", {
            ascending: true,
          }),

        supabase
          .from("students")
          .select(
            `
              id,
              student_name,
              student_username,
              class_name
            `
          )
          .order("class_name", {
            ascending: true,
          })
          .order("student_name", {
            ascending: true,
          }),
      ]);

      if (currentQuizResponse.error) {
        throw currentQuizResponse.error;
      }

      if (currentResultsResponse.error) {
        throw currentResultsResponse.error;
      }

      if (studentsResponse.error) {
        throw studentsResponse.error;
      }

      const quiz = currentQuizResponse.data as QuizTest;

      const normalizedCurrentResults = (
        (currentResultsResponse.data || []) as QuizResult[]
      ).map((row) => ({
        ...row,
        id: Number(row.id),
        quiz_id: Number(row.quiz_id),
        student_id: Number(row.student_id),
        attempt_number: Math.max(
          1,
          safeNumber(row.attempt_number)
        ),
      }));

      const normalizedStudents = (
        (studentsResponse.data || []) as Student[]
      ).map((student) => ({
        ...student,
        id: Number(student.id),
      }));

      setCurrentQuiz(quiz);
      setCurrentResults(normalizedCurrentResults);
      setCurrentStudents(normalizedStudents);

      setAllQuizzes([quiz]);
      setAllResults(normalizedCurrentResults);
      setAllStudents(normalizedStudents);

      setSelectedDate("ALL");
      setSelectedSubject("ALL");
      setSelectedClass("ALL");
      setSelectedStatus("ALL");

      setExpandedDates(
        new Set(
          quiz.scheduled_date
            ? [quiz.scheduled_date]
            : []
        )
      );

      setExpandedClasses(new Set());
      setExpandedStudents(new Set());

      setLoading(false);

      void (async () => {
        try {
          const [
            quizzesResponse,
            resultsResponse,
          ] = await Promise.all([
            supabase
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
                  is_published,
                  created_at
                `
              )
              .order("scheduled_date", {
                ascending: false,
                nullsFirst: false,
              }),

            supabase
              .from("quiz_results")
              .select(
                `
                  id,
                  quiz_id,
                  student_id,
                  attempt_number,
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
                `
              )
              .order("created_at", {
                ascending: true,
              }),
          ]);

          if (
            !quizzesResponse.error &&
            !resultsResponse.error
          ) {
            const normalizedQuizzes =
              (quizzesResponse.data || []) as QuizTest[];

            const normalizedAllResults = (
              (resultsResponse.data || []) as QuizResult[]
            ).map((row) => ({
              ...row,
              id: Number(row.id),
              quiz_id: Number(row.quiz_id),
              student_id: Number(row.student_id),
              attempt_number: Math.max(
                1,
                safeNumber(row.attempt_number)
              ),
            }));

            setAllQuizzes(normalizedQuizzes);
            setAllResults(normalizedAllResults);

            setExpandedDates(
              new Set(
                normalizedQuizzes
                  .filter((q) => q.scheduled_date)
                  .map(
                    (q) => q.scheduled_date as string
                  )
              )
            );

            void loadReattemptPermissions(
              normalizedQuizzes,
              normalizedStudents
            );
          } else {
            void loadReattemptPermissions(
              [quiz],
              normalizedStudents
            );
          }
        } catch {
          void loadReattemptPermissions(
            [quiz],
            normalizedStudents
          );
        }
      })();
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to load quiz results."
      );
      setLoading(false);
    }
  }, [
    quizId,
    loadReattemptPermissions,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const availableDates = useMemo(() => {
    const dates = new Set<string>();

    allQuizzes.forEach((quiz) => {
      if (quiz.scheduled_date) {
        dates.add(quiz.scheduled_date);
      }
    });

    return [...dates].sort((a, b) =>
      b.localeCompare(a)
    );
  }, [allQuizzes]);

  const availableSubjects = useMemo(() => {
    const subjects = new Set<string>();

    allQuizzes.forEach((quiz) => {
      subjects.add(
        normalizeSubject(quiz.subject)
      );
    });

    SUBJECTS.forEach((subject) =>
      subjects.add(subject)
    );

    return [...subjects].sort((a, b) =>
      a.localeCompare(b, undefined, {
        sensitivity: "base",
      })
    );
  }, [allQuizzes]);

  const availableClasses = useMemo(() => {
    const classes = new Set<string>();

    allStudents.forEach((student) => {
      if (student.class_name) {
        classes.add(
          normalizeClassName(
            student.class_name
          )
        );
      }
    });

    allQuizzes.forEach((quiz) => {
      getQuizClasses(quiz).forEach(
        (className) => classes.add(className)
      );
    });

    return sortClasses([...classes]);
  }, [allStudents, allQuizzes]);

  const filteredQuizzes = useMemo(() => {
    return allQuizzes.filter((quiz) => {
      const dateMatch =
        selectedDate === "ALL" ||
        String(
          quiz.scheduled_date || ""
        ) === selectedDate;

      const subjectMatch =
        selectedSubject === "ALL" ||
        normalizeSubject(
          quiz.subject
        ) === selectedSubject;

      const classMatch =
        selectedClass === "ALL" ||
        getQuizClasses(quiz).includes(
          selectedClass
        );

      return (
        dateMatch &&
        subjectMatch &&
        classMatch
      );
    });
  }, [
    allQuizzes,
    selectedDate,
    selectedSubject,
    selectedClass,
  ]);

  const filteredQuizIds = useMemo(
    () =>
      new Set(
        filteredQuizzes.map((quiz) =>
          Number(quiz.id)
        )
      ),
    [filteredQuizzes]
  );

  const filteredResultRows = useMemo(() => {
    return allResults.filter((result) =>
      filteredQuizIds.has(
        Number(result.quiz_id)
      )
    );
  }, [
    allResults,
    filteredQuizIds,
  ]);

  const resultByQuizStudent = useMemo(() => {
    const map = new Map<string, QuizResult[]>();

    filteredResultRows.forEach((result) => {
      const key = `${result.quiz_id}__${result.student_id}`;

      const existing = map.get(key) || [];
      existing.push(result);
      map.set(key, existing);
    });

    map.forEach((rows) => {
      rows.sort((a, b) => {
        const attemptDiff =
          safeNumber(a.attempt_number) -
          safeNumber(b.attempt_number);

        if (attemptDiff !== 0) {
          return attemptDiff;
        }

        return String(a.created_at || "").localeCompare(
          String(b.created_at || "")
        );
      });
    });

    return map;
  }, [filteredResultRows]);

  const filteredStudentRows = useMemo(() => {
    return allStudents.filter((student) => {
      if (
        selectedClass !== "ALL" &&
        normalizeClassName(student.class_name) !== selectedClass
      ) {
        return false;
      }

      return true;
    });
  }, [allStudents, selectedClass]);

  const allStudentQuizRows = useMemo<QuizStudentRow[]>(() => {
    const rows: QuizStudentRow[] = [];

    filteredQuizzes.forEach((quiz) => {
      const quizClasses = getQuizClasses(quiz);

      const studentsForQuiz = filteredStudentRows.filter((student) => {
        const studentClass = normalizeClassName(student.class_name);

        return (
          quizClasses.length === 0 ||
          quizClasses.includes(studentClass)
        );
      });

      studentsForQuiz.forEach((student) => {
        const results =
          resultByQuizStudent.get(
            `${quiz.id}__${student.id}`
          ) || [];

        rows.push({
          quiz,
          student,
          results,
        });
      });
    });

    return rows;
  }, [
    filteredQuizzes,
    filteredStudentRows,
    resultByQuizStudent,
  ]);

  const studentLatestRows = useMemo(() => {
    const map = new Map<number, QuizStudentRow[]>();

    allStudentQuizRows.forEach((row) => {
      const existing = map.get(row.student.id) || [];

      existing.push(row);

      map.set(row.student.id, existing);
    });

    return map;
  }, [allStudentQuizRows]);

  const filteredStatusRows = useMemo(() => {
    if (selectedStatus === "ALL") {
      return allStudentQuizRows;
    }

    return allStudentQuizRows.filter((row) => {
      if (row.results.length === 0) {
        return selectedStatus === "NOT_SUBMITTED";
      }

      const latest =
        row.results[row.results.length - 1];

      const status = resultStatus(latest);

      if (selectedStatus === "SUBMITTED") {
        return true;
      }

      if (selectedStatus === "PASS") {
        return status.includes("PASS");
      }

      if (selectedStatus === "FAIL") {
        return status.includes("FAIL");
      }

      if (selectedStatus === "NOT_SUBMITTED") {
        return false;
      }

      return true;
    });
  }, [allStudentQuizRows, selectedStatus]);

  const stats = useMemo(() => {
    const quizCount = filteredQuizzes.length;

    const totalAssigned = allStudentQuizRows.length;

    const submitted = allStudentQuizRows.filter(
      (row) => row.results.length > 0
    ).length;

    const notSubmitted = Math.max(
      0,
      totalAssigned - submitted
    );

    const latestRows = allStudentQuizRows
      .filter((row) => row.results.length > 0)
      .map(
        (row) => row.results[row.results.length - 1]
      );

    const pass = latestRows.filter((result) =>
      resultStatus(result).includes("PASS")
    ).length;

    const fail = latestRows.filter((result) =>
      resultStatus(result).includes("FAIL")
    ).length;

    const attempts = filteredResultRows.length;

    const totalMarks = latestRows.reduce(
      (sum, result) =>
        sum + safeNumber(result.total_marks),
      0
    );

    const obtainedMarks = latestRows.reduce(
      (sum, result) =>
        sum + safeNumber(result.obtained_marks),
      0
    );

    const averagePercentage =
      latestRows.length > 0
        ? latestRows.reduce(
            (sum, result) =>
              sum + safeNumber(result.percentage),
            0
          ) / latestRows.length
        : 0;

    return {
      quizCount,
      totalAssigned,
      submitted,
      notSubmitted,
      pass,
      fail,
      attempts,
      totalMarks,
      obtainedMarks,
      averagePercentage,
    };
  }, [
    filteredQuizzes,
    allStudentQuizRows,
    filteredResultRows,
  ]);

  const groupedRows = useMemo(() => {
    const dateMap = new Map<
      string,
      Map<string, QuizStudentRow[]>
    >();

    filteredStatusRows.forEach((row) => {
      const date =
        row.quiz.scheduled_date || "unknown";

      const className = normalizeClassName(
        row.student.class_name
      );

      if (!dateMap.has(date)) {
        dateMap.set(date, new Map());
      }

      const classMap = dateMap.get(date)!;

      if (!classMap.has(className)) {
        classMap.set(className, []);
      }

      classMap.get(className)!.push(row);
    });

    const dates = [...dateMap.keys()].sort((a, b) => {
      if (a === "unknown") return 1;
      if (b === "unknown") return -1;

      return b.localeCompare(a);
    });

    return dates.map((date) => {
      const classMap = dateMap.get(date)!;

      const classes = [...classMap.keys()]
        .sort((a, b) =>
          a.localeCompare(
            b,
            undefined,
            {
              numeric: true,
              sensitivity: "base",
            }
          )
        )
        .map((className) => ({
          className,
          rows: classMap.get(className)!.sort((a, b) =>
            String(
              a.student.student_name || ""
            ).localeCompare(
              String(
                b.student.student_name || ""
              ),
              undefined,
              {
                sensitivity: "base",
              }
            )
          ),
        }));

      return {
        date,
        classes,
      };
    });
  }, [filteredStatusRows]);

  const currentQuizClasses = useMemo(() => {
    if (!currentQuiz) {
      return [];
    }

    return getQuizClasses(currentQuiz);
  }, [currentQuiz]);

  const currentQuizStudents = useMemo(() => {
    if (!currentQuiz) {
      return [];
    }

    return currentStudents
      .filter((student) => {
        const classes = currentQuizClasses;

        if (classes.length === 0) {
          return true;
        }

        return classes.includes(
          normalizeClassName(student.class_name)
        );
      })
      .sort((a, b) =>
        String(a.student_name || "").localeCompare(
          String(b.student_name || ""),
          undefined,
          {
            sensitivity: "base",
          }
        )
      );
  }, [
    currentQuiz,
    currentStudents,
    currentQuizClasses,
  ]);

  const currentQuizResultsByStudent = useMemo(() => {
    const map = new Map<number, QuizResult[]>();

    currentResults.forEach((result) => {
      const rows =
        map.get(result.student_id) || [];

      rows.push(result);

      map.set(result.student_id, rows);
    });

    map.forEach((rows) => {
      rows.sort((a, b) => {
        const attemptDiff =
          safeNumber(a.attempt_number) -
          safeNumber(b.attempt_number);

        if (attemptDiff !== 0) {
          return attemptDiff;
        }

        return String(a.created_at || "").localeCompare(
          String(b.created_at || "")
        );
      });
    });

    return map;
  }, [currentResults]);

  const currentQuizStats = useMemo(() => {
    const total = currentQuizStudents.length;

    let submitted = 0;
    let pass = 0;
    let fail = 0;
    let attempts = 0;

    currentQuizStudents.forEach((student) => {
      const results =
        currentQuizResultsByStudent.get(
          student.id
        ) || [];

      attempts += results.length;

      if (results.length > 0) {
        submitted += 1;

        const latest =
          results[results.length - 1];

        if (
          resultStatus(latest).includes("PASS")
        ) {
          pass += 1;
        }

        if (resultStatus(latest).includes("FAIL")) {
          fail += 1;
        }
      }
    });

    return {
      total,
      submitted,
      notSubmitted: Math.max(0, total - submitted),
      pass,
      fail,
      attempts,
    };
  }, [currentQuizStudents, currentQuizResultsByStudent]);

  const toggleDate = (date: string) => {
    setExpandedDates((previous) => {
      const next = new Set(previous);

      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }

      return next;
    });
  };

  const toggleClass = (key: string) => {
    setExpandedClasses((previous) => {
      const next = new Set(previous);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  };

  const toggleStudent = (key: string) => {
    setExpandedStudents((previous) => {
      const next = new Set(previous);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  };

  const allowReattempt = async (
    targetQuizId: number,
    studentId: number
  ) => {
    const actionKey = `${targetQuizId}__${studentId}`;

    setReattemptLoading(actionKey);
    setReattemptMessage("");

    try {
      let teacherId: number | null = null;

      try {
        const storedTeacherId =
          localStorage.getItem("attendance_teacher_id") ||
          localStorage.getItem("teacher_id");

        if (storedTeacherId) {
          const parsedTeacherId = Number(
            storedTeacherId
          );

          if (
            Number.isInteger(parsedTeacherId) &&
            parsedTeacherId > 0
          ) {
            teacherId = parsedTeacherId;
          }
        }
      } catch {
        teacherId = null;
      }

      if (!teacherId) {
        throw new Error(
          "Teacher ID was not found. Please login again as a teacher."
        );
      }

      const response = await fetch(
        "/api/quiz-tests/reattempt",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            action: "allow",
            quizId: Number(targetQuizId),
            studentId: Number(studentId),
            teacherId,
          }),
        }
      );

      let data: any = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Unable to allow re-attempt."
        );
      }

      setReattemptQuizIds((previous) => {
        const next = new Set(previous);
        next.add(actionKey);
        return next;
      });

      setReattemptMessage(
        data?.alreadyAllowed
          ? "Re-attempt access is already allowed for this student."
          : "Re-attempt access allowed successfully."
      );
    } catch (err: any) {
      setReattemptMessage(
        err?.message ||
          "Unable to allow re-attempt. Please try again."
      );
    } finally {
      setReattemptLoading(null);
    }
  };

  const allowAllReattemptForDate = async (
    date: string
  ) => {
    if (!date || date === "unknown") {
      setReattemptMessage(
        "Re-attempt cannot be allowed because the quiz date is not available."
      );
      return;
    }

    setDateReattemptLoading(date);
    setReattemptMessage("");
    setDateReattemptMessage("");

    try {
      let teacherId: number | null = null;

      try {
        const storedTeacherId =
          localStorage.getItem("attendance_teacher_id") ||
          localStorage.getItem("teacher_id");

        if (storedTeacherId) {
          const parsedTeacherId = Number(
            storedTeacherId
          );

          if (
            Number.isInteger(parsedTeacherId) &&
            parsedTeacherId > 0
          ) {
            teacherId = parsedTeacherId;
          }
        }
      } catch {
        teacherId = null;
      }

      if (!teacherId) {
        throw new Error(
          "Teacher ID was not found. Please login again as a teacher."
        );
      }

      const dateQuizzes = allQuizzes.filter(
        (quiz) =>
          String(quiz.scheduled_date || "") ===
          String(date)
      );

      if (dateQuizzes.length === 0) {
        setReattemptMessage(
          "No quizzes were found for this date."
        );
        return;
      }

      const allowedPairs: Array<{
        quizId: number;
        studentId: number;
        key: string;
      }> = [];

      const pairMap = new Map<
        string,
        {
          quizId: number;
          studentId: number;
          key: string;
        }
      >();

      dateQuizzes.forEach((quiz) => {
        const quizClasses = getQuizClasses(quiz);

        const studentsForQuiz =
          allStudents.filter((student) => {
            const studentClass =
              normalizeClassName(
                student.class_name
              );

            return (
              quizClasses.length === 0 ||
              quizClasses.includes(
                studentClass
              )
            );
          });

        studentsForQuiz.forEach((student) => {
          const numericQuizId = Number(quiz.id);
          const numericStudentId = Number(student.id);

          if (
            !Number.isInteger(numericQuizId) ||
            numericQuizId <= 0 ||
            !Number.isInteger(numericStudentId) ||
            numericStudentId <= 0
          ) {
            return;
          }

          const key = `${numericQuizId}__${numericStudentId}`;

          /*
           * Skip only permissions already known to be active.
           * A student DOES NOT need a previous attempt.
           *
           * Previously used permissions are intentionally not
           * known here as "allowed", so the API itself decides
           * whether used_at prevents a reset.
           */
          if (reattemptQuizIds.has(key)) {
            return;
          }

          if (!pairMap.has(key)) {
            pairMap.set(key, {
              quizId: numericQuizId,
              studentId: numericStudentId,
              key,
            });
          }
        });
      });

      pairMap.forEach((pair) => {
        allowedPairs.push(pair);
      });

      if (allowedPairs.length === 0) {
        setReattemptMessage(
          "No students need re-attempt access for this date. Students already authorized are skipped."
        );
        return;
      }

      /*
       * IMPORTANT:
       *
       * Use the dedicated bulk API endpoint instead of sending
       * many individual requests. This allows students who have
       * never attempted the quiz as well.
       */
      const response = await fetch(
        "/api/quiz-tests/reattempt",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            action: "allow_all",
            items: allowedPairs.map((pair) => ({
              quizId: pair.quizId,
              studentId: pair.studentId,
            })),
            teacherId,
          }),
        }
      );

      let data: any = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (
        !response.ok ||
        data?.success === false
      ) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Bulk re-attempt request failed with status ${response.status}.`
        );
      }

      const allowedPairKeys = Array.isArray(
        data?.allowedPairs
      )
        ? data.allowedPairs.filter(
            (value: unknown): value is string =>
              typeof value === "string"
          )
        : [];

      const alreadyAllowedPairKeys =
        Array.isArray(
          data?.alreadyAllowedPairs
        )
          ? data.alreadyAllowedPairs.filter(
              (value: unknown): value is string =>
                typeof value === "string"
            )
          : [];

      const skippedUsedPairKeys =
        Array.isArray(
          data?.skippedUsedPairs
        )
          ? data.skippedUsedPairs.filter(
              (value: unknown): value is string =>
                typeof value === "string"
            )
          : [];

      const successfulKeys = [
        ...new Set([
          ...allowedPairKeys,
          ...alreadyAllowedPairKeys,
        ]),
      ];

      if (successfulKeys.length > 0) {
        setReattemptQuizIds((previous) => {
          const next = new Set(previous);

          successfulKeys.forEach((key) => {
            next.add(key);
          });

          return next;
        });
      }

      /*
       * Route currently returns allowedCount as the total number
       * of allowed pairs, including alreadyAllowedPairs.
       *
       * Therefore:
       * newlyAuthorized = allowedCount - alreadyAllowedCount
       * totalProcessed = allowedCount
       */
      const routeAllowedCount = Math.max(
        0,
        Number(data?.allowedCount || 0)
      );

      const alreadyAllowedCount = Math.max(
        0,
        Number(data?.alreadyAllowedCount || 0)
      );

      const skippedUsedCount = Math.max(
        0,
        Number(
          data?.skippedUsedCount ||
            skippedUsedPairKeys.length ||
            0
        )
      );

      const newlyAuthorizedCount = Math.max(
        0,
        routeAllowedCount -
          alreadyAllowedCount
      );

      const totalProcessed = Math.max(
        0,
        routeAllowedCount
      );

      if (totalProcessed > 0) {
        let message =
          `Re-attempt access allowed for ${totalProcessed} student${
            totalProcessed !== 1 ? "s" : ""
          } across all quizzes on ${formatDate(date)}.`;

        if (newlyAuthorizedCount > 0) {
          message +=
            ` ${newlyAuthorizedCount} newly authorized.`;
        }

        if (alreadyAllowedCount > 0) {
          message +=
            ` ${alreadyAllowedCount} already authorized.`;
        }

        if (skippedUsedCount > 0) {
          message +=
            ` ${skippedUsedCount} already-used re-attempt${
              skippedUsedCount !== 1
                ? "s were"
                : " was"
            } not reset.`;
        }

        setReattemptMessage(message);
      } else if (skippedUsedCount > 0) {
        setReattemptMessage(
          `No new re-attempt access was added. ${skippedUsedCount} already-used re-attempt${
            skippedUsedCount !== 1
              ? "s were"
              : " was"
          } not reset.`
        );
      } else {
        setReattemptMessage(
          "No new re-attempt access was required."
        );
      }

      setDateReattemptMessage(
        "Bulk re-attempt authorization completed."
      );
    } catch (err: any) {
      console.error(
        "Allow all re-attempt error:",
        err
      );

      setReattemptMessage(
        err?.message ||
          "Unable to allow all re-attempts for this date."
      );

      setDateReattemptMessage("");
    } finally {
      setDateReattemptLoading(null);
    }
  };

  const drawAcademyHeader = (
    pdf: jsPDF,
    title: string,
    subtitle?: string
  ) => {
    const pageWidth =
      pdf.internal.pageSize.getWidth();

    pdf.setFillColor(235,242,250);
    pdf.rect(0, 0, pageWidth, 34, "F");

    pdf.setFillColor(235,242,250);
    pdf.rect(0, 34, pageWidth, pdf.internal.pageSize.getHeight() - 34, "F");

    pdf.setTextColor(25,35,50);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.text("RACER ACADEMY", pageWidth / 2, 13, {
      align: "center",
    });

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      "Student Quiz Performance & Academic Record",
      pageWidth / 2,
      20,
      {
        align: "center",
      }
    );

    pdf.setTextColor(25,35,50);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.text(title, 14, 46);

    if (subtitle) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text(subtitle, 14, 53);
    }
  };

  const drawSignatureAndStamp = (
    pdf: jsPDF,
    submissionDate: string | null
  ) => {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.setTextColor(25,35,50);

    pdf.setFont("times", "italic");
    pdf.setFontSize(17);
    pdf.text("Racer Academy", pageWidth - 62, pageHeight - 27, {
      align: "center",
      angle: -7,
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text(
      "Authorized Academic Record",
      pageWidth - 62,
      pageHeight - 21,
      {
        align: "center",
      }
    );

    const stampX = pageWidth - 29;
    const stampY = pageHeight - 31;

    pdf.setDrawColor(90, 90, 90);
    pdf.setLineWidth(0.8);
    pdf.circle(stampX, stampY, 12);
    pdf.setLineWidth(0.4);
    pdf.circle(stampX, stampY, 9);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(5.5);
    pdf.text("RACER ACADEMY", stampX, stampY - 4, {
      align: "center",
    });

    pdf.setFontSize(5);
    pdf.text("OFFICIAL", stampX, stampY + 1, {
      align: "center",
    });

    pdf.setFont("helvetica", "normal");
    pdf.text(
      submissionDate ? formatDate(submissionDate) : "QUIZ DATE",
      stampX,
      stampY + 5,
      {
        align: "center",
      }
    );

    pdf.setFontSize(7);
    pdf.text(
      `Generated: ${new Date().toLocaleDateString("en-IN")}`,
      14,
      pageHeight - 10
    );
  };

  const addTableHeader = (
    pdf: jsPDF,
    headers: string[],
    widths: number[],
    startX: number,
    startY: number
  ) => {
    let x = startX;

    pdf.setFillColor(235,242,250);
    pdf.setDrawColor(148, 163, 184);

    headers.forEach((header, index) => {
      pdf.rect(x, startY, widths[index], 9, "FD");

      pdf.setTextColor(25,35,50);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);

      pdf.text(header, x + widths[index] / 2, startY + 6, {
        align: "center",
      });

      x += widths[index];
    });
  };

  const addTableRow = (
    pdf: jsPDF,
    values: string[],
    widths: number[],
    startX: number,
    startY: number,
    height = 9
  ) => {
    let x = startX;

    pdf.setDrawColor(203, 213, 225);

    values.forEach((value, index) => {
      pdf.setFillColor(235,242,250);
      pdf.rect(x, startY, widths[index], height, "FD");

      pdf.setTextColor(25,35,50);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);

      const maxChars = Math.max(
        8,
        Math.floor(widths[index] / 2)
      );

      let display = String(value ?? "");

      if (display.length > maxChars) {
        display = `${display.slice(0, maxChars - 3)}...`;
      }

      pdf.text(display, x + widths[index] / 2, startY + 6, {
        align: "center",
      });

      x += widths[index];
    });
  };

  const createStudentPdf = async (
    quiz: QuizTest,
    student: Student,
    results: QuizResult[]
  ) => {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    drawAcademyHeader(
      pdf,
      "INDIVIDUAL QUIZ RESULT",
      `${quiz.title}  ${formatDateLong(quiz.scheduled_date)}`
    );

    let y = 64;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text("STUDENT DETAILS", 14, y);

    y += 7;

    const details = [
      ["Name", student.student_name || "Not available"],
      ["Username", student.student_username || "Not available"],
      ["Class", normalizeClassName(student.class_name)],
      ["Subject", normalizeSubject(quiz.subject)],
      ["Quiz Date", formatDate(quiz.scheduled_date)],
      ["Quiz Time", formatTime(quiz.scheduled_time)],
    ];

    pdf.setFillColor(235,242,250);
    pdf.setDrawColor(191, 219, 254);
    pdf.roundedRect(13, y - 5, pdf.internal.pageSize.getWidth() - 26, 44, 3, 3, "FD");

    details.forEach(([label, value]) => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(25,35,50);
      pdf.text(`${label}:`, 16, y);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.5);
      pdf.setTextColor(25,35,50);
      pdf.text(String(value), 53, y);

      y += 6;
    });

    y += 4;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text("ATTEMPT DETAILS", 14, y);

    y += 6;

    const widths = [20, 25, 24, 22, 22, 25, 34];

    addTableHeader(
      pdf,
      [
        "Attempt",
        "Questions",
        "Correct",
        "Wrong",
        "Unanswered",
        "Marks",
        "Status",
      ],
      widths,
      14,
      y
    );

    y += 9;

    results.forEach((result, index) => {
      if (y > 255) {
        drawSignatureAndStamp(
          pdf,
          result.submitted_at
            ? result.submitted_at.slice(0, 10)
            : quiz.scheduled_date
        );

        pdf.addPage();

        drawAcademyHeader(
          pdf,
          "INDIVIDUAL QUIZ RESULT",
          `${quiz.title}  Continued`
        );

        y = 64;

        addTableHeader(
          pdf,
          [
            "Attempt",
            "Questions",
            "Correct",
            "Wrong",
            "Unanswered",
            "Marks",
            "Status",
          ],
          widths,
          14,
          y
        );

        y += 9;
      }

      const status = resultStatus(result);

      addTableRow(
        pdf,
        [
          getAttemptLabel(result, index),
          String(safeNumber(result.total_questions)),
          String(safeNumber(result.correct_answers)),
          String(safeNumber(result.wrong_answers)),
          String(safeNumber(result.unanswered)),
          `${safeNumber(result.obtained_marks)}/${safeNumber(
            result.total_marks
          )}`,
          status,
        ],
        widths,
        14,
        y
      );

      y += 9;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(25,35,50);

      pdf.text(
        `Percentage: ${safeNumber(result.percentage).toFixed(
          2
        )}%   |   Submission: ${
          result.submission_type || "Normal"
        }   |   Submitted: ${formatDateTime(result.submitted_at)}`,
        16,
        y + 4
      );

      y += 10;
    });

    if (results.length === 0) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("NO ATTEMPT SUBMITTED", 16, y + 5);
      y += 15;
    }

    const latest =
      results.length > 0
        ? results[results.length - 1]
        : null;

    y += 4;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text("FINAL SUMMARY", 14, y);

    y += 8;

    if (latest) {
      const summary = [
        `Final Percentage: ${safeNumber(
          latest.percentage
        ).toFixed(2)}%`,
        `Final Status: ${resultStatus(latest)}`,
        `Obtained Marks: ${safeNumber(
          latest.obtained_marks
        )}/${safeNumber(latest.total_marks)}`,
        `Attempts: ${results.length}`,
        `Submitted On: ${formatDateTime(latest.submitted_at)}`,
      ];

      summary.forEach((line) => {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.text(line, 18, y);
        y += 6;
      });
    } else {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text(
        "No submitted result is available.",
        18,
        y
      );
    }

    drawSignatureAndStamp(
      pdf,
      latest?.submitted_at
        ? latest.submitted_at.slice(0, 10)
        : quiz.scheduled_date
    );

    const safeStudentName =
      (student.student_name || "student")
        .replace(/[^a-z0-9]+/gi, "_")
        .replace(/^_+|_+$/g, "");

    const safeQuizTitle =
      (quiz.title || "quiz")
        .replace(/[^a-z0-9]+/gi, "_")
        .replace(/^_+|_+$/g, "");

    pdf.save(
      `RACER_ACADEMY_${safeStudentName}_${safeQuizTitle}_RESULT.pdf`
    );
  };

  const downloadOverallPdf = async () => {
    setFilterLoading(true);

    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();

      drawAcademyHeader(
        pdf,
        "OVERALL QUIZ RESULT REPORT",
        `Filters: ${
          selectedDate === "ALL"
            ? "All Dates"
            : formatDate(selectedDate)
        }  ${
          selectedSubject === "ALL"
            ? "All Subjects"
            : selectedSubject
        }  ${
          selectedClass === "ALL"
            ? "All Classes"
            : selectedClass
        }`
      );

      let y = 64;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text(
        `Quizzes: ${stats.quizCount}   |   Students: ${stats.totalAssigned}   |   Submitted: ${stats.submitted}   |   Not Submitted: ${stats.notSubmitted}   |   Pass: ${stats.pass}   |   Fail: ${stats.fail}   |   Attempts: ${stats.attempts}`,
        14,
        y
      );

      y += 8;

      const widths = [
        32,
        24,
        35,
        26,
        29,
        23,
        23,
        25,
        25,
        28,
      ];

      addTableHeader(
        pdf,
        [
          "Student",
          "Class",
          "Quiz",
          "Date",
          "Subject",
          "Attempt",
          "Obtained",
          "Total",
          "%",
          "Status",
        ],
        widths,
        14,
        y
      );

      y += 9;

      const rows = [...filteredStatusRows].sort(
        (a, b) => {
          const dateDiff = String(
            b.quiz.scheduled_date || ""
          ).localeCompare(
            String(a.quiz.scheduled_date || "")
          );

          if (dateDiff !== 0) return dateDiff;

          const classDiff = normalizeClassName(
            a.student.class_name
          ).localeCompare(
            normalizeClassName(b.student.class_name),
            undefined,
            {
              numeric: true,
            }
          );

          if (classDiff !== 0) return classDiff;

          return String(
            a.student.student_name || ""
          ).localeCompare(
            String(b.student.student_name || "")
          );
        }
      );

      rows.forEach((row) => {
        if (y > 175) {
          drawSignatureAndStamp(
            pdf,
            row.quiz.scheduled_date
          );

          pdf.addPage();

          drawAcademyHeader(
            pdf,
            "OVERALL QUIZ RESULT REPORT",
            "Continued"
          );

          y = 64;

          addTableHeader(
            pdf,
            [
              "Student",
              "Class",
              "Quiz",
              "Date",
              "Subject",
              "Attempt",
              "Obtained",
              "Total",
              "%",
              "Status",
            ],
            widths,
            14,
            y
          );

          y += 9;
        }

        const latest =
          row.results.length > 0
            ? row.results[row.results.length - 1]
            : null;

        addTableRow(
          pdf,
          [
            row.student.student_name || "Unnamed",
            normalizeClassName(
              row.student.class_name
            ),
            row.quiz.title,
            formatDate(row.quiz.scheduled_date),
            normalizeSubject(row.quiz.subject),
            latest
              ? String(
                  safeNumber(
                    latest.attempt_number
                  ) || 1
                )
              : "-",
            latest
              ? String(
                  safeNumber(
                    latest.obtained_marks
                  )
                )
              : "0",
            latest
              ? String(
                  safeNumber(
                    latest.total_marks
                  )
                )
              : "0",
            latest
              ? `${safeNumber(
                  latest.percentage
                ).toFixed(2)}%`
              : "0%",
            latest
              ? resultStatus(latest)
              : "NOT SUBMITTED",
          ],
          widths,
          14,
          y
        );

        y += 9;
      });

      if (rows.length === 0) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.text(
          "No students/results match the selected filters.",
          pageWidth / 2,
          y + 10,
          {
            align: "center",
          }
        );
      }

      drawSignatureAndStamp(
        pdf,
        selectedDate !== "ALL"
          ? selectedDate
          : currentQuiz?.scheduled_date || null
      );

      pdf.save(
        "RACER_ACADEMY_OVERALL_QUIZ_RESULTS.pdf"
      );
    } finally {
      setFilterLoading(false);
    }
  };

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loadingCard}>
          <div style={styles.loaderCircle}>RA</div>

          <h2 style={styles.loadingTitle}>
            Loading Quiz Results...
          </h2>

          <p style={styles.loadingText}>
            Please wait while RACER ACADEMY loads all student
            results.
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main style={styles.page}>
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>!</div>

          <h2 style={styles.errorTitle}>
            Unable to Load Results
          </h2>

          <p style={styles.errorText}>{error}</p>

          <div style={styles.actionRow}>
            <button
              style={styles.secondaryButton}
              onClick={goBack}
            >
              Back
            </button>

            <button
              style={styles.primaryButton}
              onClick={loadData}
            >
              Refresh
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.topHeader}>
          <div style={styles.brandBlock}>
            <div style={styles.brandBadge}>RA</div>

            <div>
              <div style={styles.brandName}>
                RACER ACADEMY
              </div>

              <div style={styles.brandSub}>
                Teacher Quiz Results
              </div>
            </div>
          </div>

          <div style={styles.topActions}>
            <button
              style={styles.headerButton}
              onClick={goBack}
            >
              Back
            </button>

            <button
              style={styles.headerButton}
              onClick={goDashboard}
            >
              Dashboard
            </button>

            <button
              style={styles.logoutButton}
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </header>

        <section style={styles.heroCard}>
          <div style={styles.heroLeft}>
            <span style={styles.heroEyebrow}>
              QUIZ PERFORMANCE CENTER
            </span>

            <h1 style={styles.heroTitle}>
              All Student Results
            </h1>

            <p style={styles.heroText}>
              View quiz performance date-wise, class-wise and
              student-wise with complete attempt details.
            </p>
          </div>
          <div style={styles.heroQuizBox}>
            <div style={{fontSize:"11px",fontWeight:900,letterSpacing:"1.5px",color:"#2563eb",textAlign:"center"}}>OVERALL PERFORMANCE</div>
            <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",alignItems:"stretch",gap:"6px",marginTop:"8px"}}>
              {(() => { const submitted=allResults.filter((r:any)=>r.submitted_at || r.submittedAt).length; const notSubmitted=Math.max(0,allResults.length-submitted); const passed=allResults.filter((r:any)=>r.result_status==="PASS").length; const failed=allResults.filter((r:any)=>r.result_status==="FAIL").length; const attempts=allResults.length; const avg=attempts?Math.round((allResults.reduce((sum:number,r:any)=>sum+Number(r.percentage||0),0)/attempts)*10)/10:0; const stats=[["STUDENTS",allResults.length,"#2563eb"],["SUBMITTED",submitted,"#059669"],["PENDING",notSubmitted,"#d97706"],["PASS",passed,"#16a34a"],["FAIL",failed,"#dc2626"],["ATTEMPTS",attempts,"#7c3aed"],["AVERAGE",avg+"%","#0891b2"]]; return stats.map(([label,value,color]:any)=><div key={label} style={{minWidth:"54px",padding:"5px 7px",borderRadius:"9px",background:"#ffffff",border:"1px solid #e2e8f0",boxShadow:"0 2px 6px rgba(15,23,42,.06)",textAlign:"center"}}><div style={{fontSize:"14px",fontWeight:900,color}}>{value}</div><div style={{fontSize:"7px",fontWeight:800,letterSpacing:".3px",color:"#475569",marginTop:"1px"}}>{label}</div></div>); })()}
            </div>
            <div style={{marginTop:"8px",paddingTop:"7px",borderTop:"1px solid #e2e8f0"}}>
              <div style={{fontSize:"8px",fontWeight:900,letterSpacing:"1px",color:"#475569",textAlign:"center",marginBottom:"4px"}}>CLASS PERFORMANCE</div>
              <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",alignItems:"center",gap:"7px"}}>
                {(() => { const classMap:any={}; allResults.forEach((r:any)=>{ const cls=r.class_name||r.className||r.student?.class_name||r.student?.className; if(!cls)return; if(!classMap[cls])classMap[cls]={total:0,score:0}; classMap[cls].total+=1; classMap[cls].score+=Number(r.percentage||0); }); return Object.entries(classMap).sort(([a],[b])=>String(a).localeCompare(String(b),undefined,{numeric:true})).map(([cls,data]:any)=>{ const percentage=data.total?Math.round((data.score/data.total)*10)/10:0; const radius=18; const circumference=2*Math.PI*radius; const dash=(Math.min(100,Math.max(0,percentage))/100)*circumference; return <div key={cls} style={{width:"48px",textAlign:"center"}}><div style={{width:"42px",height:"42px",margin:"0 auto",position:"relative"}}><svg width="42" height="42" viewBox="0 0 42 42" style={{transform:"rotate(-90deg)"}}><circle cx="21" cy="21" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="4"/><circle cx="21" cy="21" r={radius} fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${dash} ${circumference}`}/></svg><div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"8px",fontWeight:900,color:"#0f172a"}}>{percentage}%</div></div><div style={{fontSize:"8px",fontWeight:800,color:"#334155",marginTop:"1px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{cls}</div></div>; }); })()}
              </div>
            </div>
          </div>

        </section>

        <section style={styles.downloadBar}>
          <div>
            <div style={styles.downloadTitle}>
              Result Reports
            </div>

            <div style={styles.downloadSub}>
              Download complete filtered results or an
              individual student's detailed PDF.
            </div>
          </div>

          <button
            style={styles.pdfButton}
            onClick={downloadOverallPdf}
            disabled={filterLoading}
          >
            {filterLoading
              ? "Preparing PDF..."
              : "Download Overall PDF"}
          </button>
        </section>

        {reattemptMessage ? (
          <div style={styles.messageBox}>
            {reattemptMessage}
          </div>
        ) : null}

        <section style={styles.resultsSection}>
          <div style={styles.resultsHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                Datewise  Classwise  Studentwise
              </h2>

              <p style={styles.sectionSub}>
                All selected quiz results are organized below.
              </p>
            </div>
          </div>

          {groupedRows.length === 0 ? (
            <div style={styles.emptyCard}>
              <div style={styles.emptyIcon}>R</div>

              <h3 style={styles.emptyTitle}>
                No Results Found
              </h3>

              <p style={styles.emptyText}>
                No quiz/student entries match the selected
                filters.
              </p>
            </div>
          ) : (
            <div style={styles.dateList}>
              {groupedRows.map((dateGroup) => {
                const dateOpen =
                  expandedDates.has(
                    dateGroup.date
                  );

                const dateRows =
                  dateGroup.classes.flatMap(
                    (group) => group.rows
                  );

                const dateSubmitted =
                  dateRows.filter(
                    (row) =>
                      row.results.length > 0
                  ).length;

                return (
                  <div
                    key={dateGroup.date}
                    style={styles.dateCard}
                  >
                    <div style={styles.dateHeader}>
                      <button
                        type="button"
                        style={styles.dateButton}
                        onClick={() =>
                          toggleDate(
                            dateGroup.date
                          )
                        }
                      >
                        <div
                          style={
                            styles.dateButtonLeft
                          }
                        >
                          <div
                            style={styles.dateIcon}
                          >
                            {dateGroup.date ===
                            "unknown"
                              ? "?"
                              : "D"}
                          </div>

                          <div>
                            <div
                              style={
                                styles.dateLabel
                              }
                            >
                              QUIZ DATE
                            </div>

                            <div
                              style={
                                styles.dateTitle
                              }
                            >
                              {dateGroup.date ===
                              "unknown"
                                ? "Date Not Available"
                                : formatDateLong(
                                    dateGroup.date
                                  )}
                            </div>

                            <div
                              style={
                                styles.dateMeta
                              }
                            >
                              {dateRows.length}{" "}
                              student entries
                              {"  "}
                              {dateSubmitted}{" "}
                              submitted
                            </div>
                          </div>
                        </div>

                        <div
                          style={styles.chevron}
                        >
                          {dateOpen
                            ? ""
                            : "+"}
                        </div>
                      </button>

                      {dateGroup.date !==
                      "unknown" ? (
                        <button
                          type="button"
                          style={
                            styles.dateBulkButton
                          }
                          disabled={
                            dateReattemptLoading ===
                            dateGroup.date
                          }
                          onClick={() =>
                            allowAllReattemptForDate(
                              dateGroup.date
                            )
                          }
                        >
                          {dateReattemptLoading ===
                          dateGroup.date
                            ? "ALLOWING..."
                            : "ALLOW ALL RE-ATTEMPT"}
                        </button>
                      ) : null}
                    </div>

                    {dateOpen ? (
                      <div
                        style={styles.classList}
                      >
                        {dateGroup.classes.map(
                          (classGroup) => {
                            const classKey = `${dateGroup.date}__${classGroup.className}`;

                            const classOpen =
                              expandedClasses.has(
                                classKey
                              );

                            const submittedCount =
                              classGroup.rows.filter(
                                (row) =>
                                  row.results.length >
                                  0
                              ).length;

                            const passCount =
                              classGroup.rows.filter(
                                (row) =>
                                  row.results.length >
                                    0 &&
                                  resultStatus(
                                    row.results[
                                      row.results.length -
                                        1
                                    ]
                                  ).includes("PASS")
                              ).length;

                            const failCount =
                              classGroup.rows.filter(
                                (row) =>
                                  row.results.length >
                                    0 &&
                                  resultStatus(
                                    row.results[
                                      row.results.length -
                                        1
                                    ]
                                  ).includes("FAIL")
                              ).length;

                            return (
                              <div
                                key={classKey}
                                style={
                                  styles.classCard
                                }
                              >
                                <button
                                  type="button"
                                  style={
                                    styles.classButton
                                  }
                                  onClick={() =>
                                    toggleClass(
                                      classKey
                                    )
                                  }
                                >
                                  <div
                                    style={
                                      styles.classButtonLeft
                                    }
                                  >
                                    <div
                                      style={
                                        styles.classBadge
                                      }
                                    >
                                      {
                                        classGroup.className
                                      }
                                    </div>

                                    <div>
                                      <div
                                        style={
                                          styles.classTitle
                                        }
                                      >
                                        Class{" "}
                                        {
                                          classGroup.className
                                        }
                                      </div>

                                      <div
                                        style={
                                          styles.classMeta
                                        }
                                      >
                                        {
                                          classGroup
                                            .rows
                                            .length
                                        }{" "}
                                        students
                                        {"  "}
                                        {
                                          submittedCount
                                        }{" "}
                                        submitted
                                        {"  "}
                                        {passCount} pass
                                        {"  "}
                                        {failCount} fail
                                      </div>
                                    </div>
                                  </div>

                                  <div
                                    style={
                                      styles.chevron
                                    }
                                  >
                                    {classOpen
                                      ? ""
                                      : "+"}
                                  </div>
                                </button>

                                {classOpen ? (
                                  <div
                                    style={
                                      styles.studentList
                                    }
                                  >
                                    {classGroup.rows.map(
                                      (row) => {
                                        const studentKey = `${row.quiz.id}__${row.student.id}`;

                                        const studentOpen =
                                          expandedStudents.has(
                                            studentKey
                                          );

                                        const latest =
                                          row.results
                                            .length > 0
                                            ? row
                                                .results[
                                                row
                                                  .results
                                                  .length -
                                                  1
                                              ]
                                            : null;

                                        const allowedKey = `${row.quiz.id}__${row.student.id}`;

                                        const reattemptAllowed =
                                          reattemptQuizIds.has(
                                            allowedKey
                                          );

                                        return (
                                          <div
                                            key={
                                              studentKey
                                            }
                                            style={
                                              styles.studentCard
                                            }
                                          >
                                            <div
                                              style={
                                                styles.studentTop
                                              }
                                            >
                                              <button
                                                type="button"
                                                style={
                                                  styles.studentMainButton
                                                }
                                                onClick={() =>
                                                  toggleStudent(
                                                    studentKey
                                                  )
                                                }
                                              >
                                                <div
                                                  style={
                                                    styles.avatar
                                                  }
                                                >
                                                  {String(
                                                    row
                                                      .student
                                                      .student_name ||
                                                      "S"
                                                  )
                                                    .trim()
                                                    .charAt(
                                                      0
                                                    )
                                                    .toUpperCase()}
                                                </div>

                                                <div
                                                  style={
                                                    styles.studentIdentity
                                                  }
                                                >
                                                  <div
                                                    style={
                                                      styles.studentName
                                                    }
                                                  >
                                                    {row
                                                      .student
                                                      .student_name ||
                                                      "Unnamed Student"}
                                                  </div>

                                                  <div
                                                    style={
                                                      styles.studentUsername
                                                    }
                                                  >
                                                    {row
                                                      .student
                                                      .student_username ||
                                                      "Username not available"}
                                                    {"  "}
                                                    {normalizeSubject(
                                                      row
                                                        .quiz
                                                        .subject
                                                    )}
                                                  </div>
                                                </div>
                                              </button>

                                              <div
                                                style={
                                                  styles.studentActions
                                                }
                                              >
                                                <div
                                                  style={
                                                    styles.studentSummary
                                                  }
                                                >
                                                  {latest ? (
                                                    <>
                                                      <strong
                                                        style={{
                                                          color:
                                                            statusClass(
                                                              latest
                                                            ) ===
                                                            "pass"
                                                              ? "#15803d"
                                                              : statusClass(
                                                                  latest
                                                                ) ===
                                                                "fail"
                                                              ? "#dc2626"
                                                              : "#334155",
                                                        }}
                                                      >
                                                        {safeNumber(
                                                          latest.percentage
                                                        ).toFixed(
                                                          1
                                                        )}
                                                        %
                                                      </strong>

                                                      <span
                                                        style={
                                                          styles.summaryStatus
                                                        }
                                                      >
                                                        {resultStatus(
                                                          latest
                                                        )}
                                                      </span>
                                                    </>
                                                  ) : (
                                                    <span
                                                      style={
                                                        styles.noAttempt
                                                      }
                                                    >
                                                      NO ATTEMPT
                                                    </span>
                                                  )}
                                                </div>

                                                <button
                                                  type="button"
                                                  style={
                                                    styles.pdfSmallButton
                                                  }
                                                  onClick={() =>
                                                    latest &&
                                                    createStudentPdf(
                                                      row.quiz,
                                                      row.student,
                                                      row.results
                                                    )
                                                  }
                                                  disabled={!latest}
                                                >
                                                  PDF
                                                </button>

                                                <button
                                                  type="button"
                                                  style={
                                                    styles.expandButton
                                                  }
                                                  onClick={() =>
                                                    toggleStudent(
                                                      studentKey
                                                    )
                                                  }
                                                >
                                                  {studentOpen
                                                    ? ""
                                                    : "+"}
                                                </button>
                                              </div>
                                            </div>

                                            {studentOpen ? (
                                              <div
                                                style={
                                                  styles.studentDetails
                                                }
                                              >
                                                <div
                                                  style={
                                                    styles.detailGrid
                                                  }
                                                >
                                                  <div
                                                    style={
                                                      styles.detailBox
                                                    }
                                                  >
                                                    <span>
                                                      Quiz
                                                    </span>

                                                    <strong>
                                                      {
                                                        row
                                                          .quiz
                                                          .title
                                                      }
                                                    </strong>
                                                  </div>

                                                  <div
                                                    style={
                                                      styles.detailBox
                                                    }
                                                  >
                                                    <span>
                                                      Date
                                                    </span>

                                                    <strong>
                                                      {formatDate(
                                                        row
                                                          .quiz
                                                          .scheduled_date
                                                      )}
                                                    </strong>
                                                  </div>

                                                  <div
                                                    style={
                                                      styles.detailBox
                                                    }
                                                  >
                                                    <span>
                                                      Subject
                                                    </span>

                                                    <strong>
                                                      {normalizeSubject(
                                                        row
                                                          .quiz
                                                          .subject
                                                      )}
                                                    </strong>
                                                  </div>

                                                  <div
                                                    style={
                                                      styles.detailBox
                                                    }
                                                  >
                                                    <span>
                                                      Attempts
                                                    </span>

                                                    <strong>
                                                      {
                                                        row
                                                          .results
                                                          .length
                                                      }
                                                    </strong>
                                                  </div>
                                                </div>

                                                {row.results.length === 0 ? (
                                                  <div
                                                    style={
                                                      styles.noResultBox
                                                    }
                                                  >
                                                    <div>
                                                      <strong>
                                                        No quiz
                                                        result
                                                        submitted
                                                      </strong>

                                                      <span>
                                                        This
                                                        student
                                                        has no
                                                        submitted
                                                        attempt
                                                        for this
                                                        quiz.
                                                      </span>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <div
                                                    style={
                                                      styles.attemptList
                                                    }
                                                  >
                                                    {row.results.map(
                                                      (
                                                        result,
                                                        index
                                                      ) => (
                                                        <div
                                                          key={
                                                            result.id
                                                          }
                                                          style={
                                                            styles.attemptCard
                                                          }
                                                        >
                                                          <div
                                                            style={
                                                              styles.attemptHeader
                                                            }
                                                          >
                                                            <div>
                                                              <div
                                                                style={
                                                                  styles.attemptNumber
                                                                }
                                                              >
                                                                {getAttemptLabel(
                                                                  result,
                                                                  index
                                                                )}
                                                              </div>

                                                              <div
                                                                style={
                                                                  styles.attemptTime
                                                                }
                                                              >
                                                                Submitted:{" "}
                                                                {formatDateTime(
                                                                  result.submitted_at
                                                                )}
                                                              </div>
                                                            </div>

                                                            <div
                                                              style={{
                                                                ...styles.statusPill,
                                                                ...(statusClass(
                                                                  result
                                                                ) ===
                                                                "pass"
                                                                  ? styles.passPill
                                                                  : statusClass(
                                                                      result
                                                                    ) ===
                                                                    "fail"
                                                                  ? styles.failPill
                                                                  : styles.neutralPill),
                                                              }}
                                                            >
                                                              {resultStatus(
                                                                result
                                                              )}
                                                            </div>
                                                          </div>

                                                          <div
                                                            style={
                                                              styles.metricsGrid
                                                            }
                                                          >
                                                            <div
                                                              style={
                                                                styles.metric
                                                              }
                                                            >
                                                              <span>
                                                                Questions
                                                              </span>

                                                              <strong>
                                                                {safeNumber(
                                                                  result.total_questions
                                                                )}
                                                              </strong>
                                                            </div>

                                                            <div
                                                              style={
                                                                styles.metric
                                                              }
                                                            >
                                                              <span>
                                                                Correct
                                                              </span>

                                                              <strong>
                                                                {safeNumber(
                                                                  result.correct_answers
                                                                )}
                                                              </strong>
                                                            </div>

                                                            <div
                                                              style={
                                                                styles.metric
                                                              }
                                                            >
                                                              <span>
                                                                Wrong
                                                              </span>

                                                              <strong>
                                                                {safeNumber(
                                                                  result.wrong_answers
                                                                )}
                                                              </strong>
                                                            </div>

                                                            <div
                                                              style={
                                                                styles.metric
                                                              }
                                                            >
                                                              <span>
                                                                Unanswered
                                                              </span>

                                                              <strong>
                                                                {safeNumber(
                                                                  result.unanswered
                                                                )}
                                                              </strong>
                                                            </div>

                                                            <div
                                                              style={
                                                                styles.metric
                                                              }
                                                            >
                                                              <span>
                                                                Marks
                                                              </span>

                                                              <strong>
                                                                {safeNumber(
                                                                  result.obtained_marks
                                                                )}
                                                                /
                                                                {safeNumber(
                                                                  result.total_marks
                                                                )}
                                                              </strong>
                                                            </div>

                                                            <div
                                                              style={
                                                                styles.metric
                                                              }
                                                            >
                                                              <span>
                                                                Percentage
                                                              </span>

                                                              <strong>
                                                                {safeNumber(
                                                                  result.percentage
                                                                ).toFixed(
                                                                  2
                                                                )}
                                                                %
                                                              </strong>
                                                            </div>
                                                          </div>

                                                          <div
                                                            style={
                                                              styles.submissionInfo
                                                            }
                                                          >
                                                            Submission:{" "}
                                                            <strong>
                                                              {result.submission_type ||
                                                                "Normal"}
                                                            </strong>
                                                            {"  "}
                                                            Started:{" "}
                                                            {formatDateTime(
                                                              result.started_at
                                                            )}
                                                            {"  "}
                                                            Created:{" "}
                                                            {formatDateTime(
                                                              result.created_at
                                                            )}
                                                          </div>
                                                        </div>
                                                      )
                                                    )}
                                                  </div>
                                                )}

                                                <div
                                                  style={
                                                    styles.reattemptPanel
                                                  }
                                                >
                                                  <div>
                                                    <strong>
                                                      {latest
                                                        ? "Need another attempt?"
                                                        : "Allow this student to attempt the quiz"}
                                                    </strong>

                                                    <span>
                                                      {latest
                                                        ? "Teacher can allow a re-attempt without removing the previous result."
                                                        : "This student has not submitted an attempt yet. Teacher can still authorize one re-attempt access for this quiz."}
                                                    </span>
                                                  </div>

                                                  {reattemptAllowed ? (
                                                    <button
                                                      type="button"
                                                      disabled
                                                      style={
                                                        styles.allowedButton
                                                      }
                                                    >
                                                      RE-ATTEMPT
                                                      ALLOWED
                                                    </button>
                                                  ) : (
                                                    <button
                                                      type="button"
                                                      style={
                                                        styles.reattemptButton
                                                      }
                                                      disabled={
                                                        reattemptLoading ===
                                                        allowedKey
                                                      }
                                                      onClick={() =>
                                                        allowReattempt(
                                                          row
                                                            .quiz
                                                            .id,
                                                          row
                                                            .student
                                                            .id
                                                        )
                                                      }
                                                    >
                                                      {reattemptLoading ===
                                                      allowedKey
                                                        ? "ALLOWING..."
                                                        : "ALLOW RE-ATTEMPT"}
                                                    </button>
                                                  )}
                                                </div>
                                              </div>
                                            ) : null}
                                          </div>
                                        );
                                      }
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            );
                          }
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section
          style={styles.currentQuizSection}
        >
          <div
            style={styles.currentQuizHeader}
          >
            <div>
              <h2 style={styles.sectionTitle}>
                Current Quiz Snapshot
              </h2>

              <p style={styles.sectionSub}>
                Quick view of the quiz opened from the
                quiz results page.
              </p>
            </div>

            <button
              type="button"
              style={styles.pdfButton}
              onClick={() =>
                currentQuiz &&
                downloadOverallPdf()
              }
            >
              Download Report
            </button>
          </div>

          {currentQuiz ? (
            <div
              style={styles.currentQuizGrid}
            >
              <div style={styles.currentQuizInfo}>
                <span>Quiz</span>

                <strong>
                  {currentQuiz.title}
                </strong>
              </div>

              <div style={styles.currentQuizInfo}>
                <span>Subject</span>

                <strong>
                  {normalizeSubject(
                    currentQuiz.subject
                  )}
                </strong>
              </div>

              <div style={styles.currentQuizInfo}>
                <span>Date</span>

                <strong>
                  {formatDate(
                    currentQuiz.scheduled_date
                  )}
                </strong>
              </div>

              <div style={styles.currentQuizInfo}>
                <span>Classes</span>

                <strong>
                  {currentQuizClasses.join(", ") ||
                    "All"}
                </strong>
              </div>

              <div style={styles.currentQuizInfo}>
                <span>Submitted</span>

                <strong>
                  {currentQuizStats.submitted}
                </strong>
              </div>

              <div style={styles.currentQuizInfo}>
                <span>Not Submitted</span>

                <strong>
                  {currentQuizStats.notSubmitted}
                </strong>
              </div>

              <div style={styles.currentQuizInfo}>
                <span>Pass</span>

                <strong>
                  {currentQuizStats.pass}
                </strong>
              </div>

              <div style={styles.currentQuizInfo}>
                <span>Fail</span>

                <strong>
                  {currentQuizStats.fail}
                </strong>
              </div>
            </div>
          ) : null}
        </section>

        <footer style={styles.footer}>
          <div style={styles.footerBrand}>
            RACER ACADEMY
          </div>

          <div style={styles.footerText}>
            Official Student Quiz Performance Record
          </div>

          <div style={styles.footerSignature}>
            Racer Academy
          </div>
        </footer>
      </div>
    </main>
  );
}

export default function TeacherQuizResultsPage() {
  return (
    <Suspense
      fallback={
        <main style={styles.page}>
          <div style={styles.loadingCard}>
            <div style={styles.loaderCircle}>
              RA
            </div>

            <h2 style={styles.loadingTitle}>
              Loading Quiz Results...
            </h2>

            <p style={styles.loadingText}>
              RACER ACADEMY
            </p>
          </div>
        </main>
      }
    >
      <TeacherQuizResultsContent />
    </Suspense>
  );
}

const styles: Record<
  string,
  React.CSSProperties
> = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #f8fafc 0%, #eef2ff 48%, #f8fafc 100%)",
    padding: "20px",
    color: "#0f172a",
  },

  container: {
    width: "100%",
    maxWidth: "1500px",
    margin: "0 auto",
  },

  topHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "18px",
    marginBottom: "18px",
    flexWrap: "wrap",
  },

  brandBlock: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  brandBadge: {
    width: "48px",
    height: "48px",
    borderRadius: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #0f172a, #334155)",
    color: "#ffffff",
    fontWeight: 900,
    fontSize: "16px",
    boxShadow:
      "0 10px 24px rgba(15,23,42,0.18)",
  },

  brandName: {
    fontSize: "17px",
    fontWeight: 950,
    letterSpacing: "0.7px",
  },

  brandSub: {
    marginTop: "3px",
    fontSize: "12px",
    color: "#64748b",
    fontWeight: 700,
  },

  topActions: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },

  headerButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    padding: "10px 15px",
    borderRadius: "11px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow:
      "0 5px 14px rgba(15,23,42,0.06)",
  },

  logoutButton: {
    border: "1px solid #fecaca",
    background: "#fff1f2",
    color: "#be123c",
    padding: "10px 15px",
    borderRadius: "11px",
    fontWeight: 900,
    cursor: "pointer",
  },

  heroCard: {
    background:
      "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #312e81 100%)",
    borderRadius: "25px",
    padding: "28px",
    color: "#ffffff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "stretch",
    gap: "24px",
    marginBottom: "18px",
    boxShadow:
      "0 22px 55px rgba(15,23,42,0.18)",
    flexWrap: "wrap",
  },

  heroLeft: {
    flex: "1 1 450px",
    minWidth: 0,
  },

  heroEyebrow: {
    fontSize: "11px",
    fontWeight: 900,
    letterSpacing: "1.5px",
    opacity: 0.72,
  },

  heroTitle: {
    margin: "8px 0 8px",
    fontSize: "34px",
    lineHeight: 1.08,
    fontWeight: 950,
  },

  heroText: {
    margin: 0,
    maxWidth: "680px",
    color: "#cbd5e1",
    fontSize: "14px",
    lineHeight: 1.65,
  },

  heroQuizBox: {
    minWidth: "290px",
    maxWidth: "420px",
    flex: "0 1 420px",
    border:
      "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.08)",
    borderRadius: "20px",
    padding: "20px",
    alignSelf: "stretch",
  },

  heroQuizLabel: {
    fontSize: "10px",
    fontWeight: 900,
    letterSpacing: "1.2px",
    color: "#cbd5e1",
  },

  heroQuizTitle: {
    marginTop: "9px",
    fontSize: "21px",
    lineHeight: 1.25,
    fontWeight: 900,
  },

  heroQuizMeta: {
    marginTop: "9px",
    fontSize: "12px",
    color: "#cbd5e1",
  },

  filtersCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "22px",
    padding: "22px",
    marginBottom: "18px",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.06)",
  },

  filterHeadingRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "18px",
    flexWrap: "wrap",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "21px",
    fontWeight: 950,
    color: "#0f172a",
  },

  sectionSub: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "12px",
    lineHeight: 1.5,
  },

  refreshButton: {
    border: "1px solid #c7d2fe",
    background: "#eef2ff",
    color: "#3730a3",
    padding: "10px 15px",
    borderRadius: "11px",
    fontWeight: 900,
    cursor: "pointer",
  },

  filtersGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "13px",
  },

  filterLabel: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    fontSize: "11px",
    color: "#475569",
    fontWeight: 900,
  },

  select: {
    width: "100%",
    height: "44px",
    border: "1px solid #cbd5e1",
    borderRadius: "11px",
    padding: "0 12px",
    background: "#ffffff",
    color: "#0f172a",
    fontWeight: 700,
    outline: "none",
  },

  filterSummary: {
    marginTop: "16px",
    paddingTop: "14px",
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    gap: "20px",
    flexWrap: "wrap",
    color: "#64748b",
    fontSize: "12px",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "11px",
    marginBottom: "18px",
  },

  statCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "17px",
    padding: "15px",
    display: "flex",
    alignItems: "center",
    gap: "11px",
    boxShadow:
      "0 8px 22px rgba(15,23,42,0.045)",
  },

  statIcon: {
    width: "39px",
    height: "39px",
    borderRadius: "12px",
    background: "#f1f5f9",
    color: "#334155",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 950,
    fontSize: "14px",
  },

  statNumber: {
    fontSize: "22px",
    fontWeight: 950,
    lineHeight: 1,
  },

  statLabel: {
    marginTop: "4px",
    color: "#64748b",
    fontSize: "10px",
    fontWeight: 800,
  },

  downloadBar: {
    background:
      "linear-gradient(135deg, #ffffff, #f8fafc)",
    border: "1px solid #cbd5e1",
    borderRadius: "19px",
    padding: "17px 19px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "18px",
    flexWrap: "wrap",
  },

  downloadTitle: {
    fontSize: "16px",
    fontWeight: 950,
  },

  downloadSub: {
    marginTop: "4px",
    color: "#64748b",
    fontSize: "11px",
  },

  pdfButton: {
    border: "none",
    background:
      "linear-gradient(135deg, #0f172a, #312e81)",
    color: "#ffffff",
    padding: "12px 17px",
    borderRadius: "11px",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow:
      "0 9px 22px rgba(49,46,129,0.18)",
  },

  messageBox: {
    marginBottom: "18px",
    background: "#ecfdf5",
    border: "1px solid #a7f3d0",
    color: "#047857",
    padding: "12px 15px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: 800,
  },

  resultsSection: {
    marginBottom: "18px",
  },

  resultsHeader: {
    marginBottom: "12px",
  },

  dateList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  dateCard: {
    background: "#ffffff",
    border: "1px solid #dbe3ef",
    borderRadius: "19px",
    overflow: "hidden",
    boxShadow:
      "0 9px 25px rgba(15,23,42,0.05)",
  },

  dateHeader: {
    display: "flex",
    alignItems: "stretch",
    justifyContent: "space-between",
    gap: "10px",
    flexWrap: "wrap",
    padding: "0",
  },

  dateButton: {
    flex: "1 1 430px",
    minWidth: 0,
    border: "none",
    background: "#ffffff",
    padding: "17px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    cursor: "pointer",
    textAlign: "left",
  },

  dateButtonLeft: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    minWidth: 0,
  },

  dateIcon: {
    width: "47px",
    height: "47px",
    borderRadius: "14px",
    background:
      "linear-gradient(135deg, #0f172a, #4338ca)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 950,
    flexShrink: 0,
  },

  dateLabel: {
    fontSize: "9px",
    color: "#64748b",
    fontWeight: 950,
    letterSpacing: "1px",
  },

  dateTitle: {
    marginTop: "3px",
    fontSize: "17px",
    fontWeight: 950,
    color: "#0f172a",
  },

  dateMeta: {
    marginTop: "4px",
    fontSize: "11px",
    color: "#64748b",
    fontWeight: 700,
  },

  dateBulkButton: {
    alignSelf: "center",
    flex: "0 1 auto",
    border: "none",
    background:
      "linear-gradient(135deg, #4338ca, #312e81)",
    color: "#ffffff",
    padding: "11px 14px",
    borderRadius: "10px",
    fontSize: "9px",
    fontWeight: 950,
    cursor: "pointer",
    whiteSpace: "nowrap",
    boxShadow:
      "0 7px 18px rgba(49,46,129,0.18)",
    marginRight: "12px",
  },

  classList: {
    padding: "0 12px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "9px",
  },

  classCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "15px",
    overflow: "hidden",
    background: "#f8fafc",
  },

  classButton: {
    width: "100%",
    border: "none",
    background: "#f8fafc",
    padding: "13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    cursor: "pointer",
    textAlign: "left",
  },

  classButtonLeft: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    minWidth: 0,
  },

  classBadge: {
    minWidth: "50px",
    height: "36px",
    padding: "0 10px",
    borderRadius: "10px",
    background: "#e0e7ff",
    color: "#3730a3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 950,
    fontSize: "12px",
  },

  classTitle: {
    fontWeight: 900,
    fontSize: "14px",
    color: "#0f172a",
  },

  classMeta: {
    marginTop: "3px",
    fontSize: "10px",
    color: "#64748b",
    fontWeight: 700,
  },

  studentList: {
    padding: "0 10px 10px",
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  studentCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "13px",
    overflow: "hidden",
  },

  studentTop: {
    padding: "11px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },

  studentMainButton: {
    flex: "1 1 auto",
    minWidth: 0,
    border: "none",
    background: "transparent",
    padding: 0,
    display: "flex",
    alignItems: "center",
    gap: "11px",
    cursor: "pointer",
    textAlign: "left",
  },

  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    background: "#f1f5f9",
    color: "#334155",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 950,
    flexShrink: 0,
  },

  studentIdentity: {
    minWidth: 0,
  },

  studentName: {
    fontSize: "14px",
    fontWeight: 900,
    color: "#0f172a",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  studentUsername: {
    marginTop: "3px",
    fontSize: "10px",
    color: "#64748b",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  studentActions: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    flexShrink: 0,
  },

  studentSummary: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    minWidth: "65px",
  },

  summaryStatus: {
    fontSize: "8px",
    color: "#64748b",
    fontWeight: 900,
    marginTop: "2px",
  },

  noAttempt: {
    fontSize: "8px",
    color: "#dc2626",
    fontWeight: 950,
  },

  pdfSmallButton: {
    border: "1px solid #c7d2fe",
    background: "#eef2ff",
    color: "#3730a3",
    padding: "8px 9px",
    borderRadius: "9px",
    fontSize: "9px",
    fontWeight: 950,
    cursor: "pointer",
  },

  expandButton: {
    width: "31px",
    height: "31px",
    border: "none",
    borderRadius: "9px",
    background: "#f1f5f9",
    color: "#334155",
    fontSize: "18px",
    fontWeight: 900,
    cursor: "pointer",
  },

  studentDetails: {
    borderTop: "1px solid #e2e8f0",
    padding: "13px",
    background: "#f8fafc",
  },

  detailGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "8px",
    marginBottom: "11px",
  },

  detailBox: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "9px",
  },

  detailBoxSpan: {
    fontSize: "9px",
    color: "#64748b",
  },

  attemptList: {
    display: "flex",
    flexDirection: "column",
    gap: "9px",
  },

  attemptCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "13px",
    padding: "12px",
  },

  attemptHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
  },

  attemptNumber: {
    fontSize: "13px",
    fontWeight: 950,
    color: "#0f172a",
  },

  attemptTime: {
    marginTop: "3px",
    fontSize: "9px",
    color: "#64748b",
  },

  statusPill: {
    padding: "5px 9px",
    borderRadius: "999px",
    fontSize: "8px",
    fontWeight: 950,
  },

  passPill: {
    background: "#dcfce7",
    color: "#15803d",
  },

  failPill: {
    background: "#fee2e2",
    color: "#b91c1c",
  },

  neutralPill: {
    background: "#e2e8f0",
    color: "#475569",
  },

  metricsGrid: {
    marginTop: "11px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(90px, 1fr))",
    gap: "7px",
  },

  metric: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "9px",
    padding: "8px",
  },

  submissionInfo: {
    marginTop: "9px",
    fontSize: "9px",
    color: "#64748b",
    lineHeight: 1.55,
  },

  noResultBox: {
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: "12px",
    padding: "13px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },

  reattemptPanel: {
    marginTop: "10px",
    background: "#eef2ff",
    border: "1px solid #c7d2fe",
    borderRadius: "12px",
    padding: "12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },

  reattemptButton: {
    border: "none",
    background: "#4338ca",
    color: "#ffffff",
    padding: "9px 12px",
    borderRadius: "9px",
    fontSize: "9px",
    fontWeight: 950,
    cursor: "pointer",
  },

  allowedButton: {
    border: "1px solid #86efac",
    background: "#dcfce7",
    color: "#15803d",
    padding: "9px 12px",
    borderRadius: "9px",
    fontSize: "9px",
    fontWeight: 950,
  },

  firstAttemptRequiredButton: {
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    padding: "8px 12px",
    background: "#f3f4f6",
    color: "#6b7280",
    fontSize: "11px",
    fontWeight: 800,
    cursor: "not-allowed",
  },

  currentQuizSection: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    padding: "20px",
    marginBottom: "20px",
  },

  currentQuizHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "15px",
    flexWrap: "wrap",
  },

  currentQuizGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "9px",
  },

  currentQuizInfo: {
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    borderRadius: "11px",
    padding: "11px",
  },

  footer: {
    background: "#0f172a",
    color: "#ffffff",
    borderRadius: "18px",
    padding: "18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
  },

  footerBrand: {
    fontWeight: 950,
    letterSpacing: "1px",
    fontSize: "13px",
  },

  footerText: {
    fontSize: "10px",
    color: "#cbd5e1",
  },

  footerSignature: {
    fontFamily: "cursive",
    fontStyle: "italic",
    fontSize: "17px",
    transform: "rotate(-5deg)",
  },

  loadingCard: {
    maxWidth: "500px",
    margin: "12vh auto",
    background: "#ffffff",
    borderRadius: "24px",
    padding: "38px",
    textAlign: "center",
    boxShadow:
      "0 25px 60px rgba(15,23,42,0.12)",
    border: "1px solid #e2e8f0",
  },

  loaderCircle: {
    width: "65px",
    height: "65px",
    borderRadius: "20px",
    margin: "0 auto 18px",
    background:
      "linear-gradient(135deg, #0f172a, #4338ca)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 950,
    fontSize: "20px",
  },

  loadingTitle: {
    margin: 0,
    fontSize: "21px",
    fontWeight: 950,
  },

  loadingText: {
    color: "#64748b",
    fontSize: "12px",
    marginTop: "8px",
  },

  errorCard: {
    maxWidth: "600px",
    margin: "12vh auto",
    background: "#ffffff",
    borderRadius: "24px",
    padding: "35px",
    textAlign: "center",
    boxShadow:
      "0 25px 60px rgba(15,23,42,0.12)",
    border: "1px solid #fecaca",
  },

  errorIcon: {
    width: "55px",
    height: "55px",
    margin: "0 auto 15px",
    borderRadius: "50%",
    background: "#fee2e2",
    color: "#dc2626",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "25px",
    fontWeight: 950,
  },

  errorTitle: {
    margin: 0,
    fontSize: "21px",
    fontWeight: 950,
  },

  errorText: {
    color: "#64748b",
    fontSize: "12px",
    lineHeight: 1.6,
    margin: "10px 0 20px",
  },

  actionRow: {
    display: "flex",
    justifyContent: "center",
    gap: "9px",
    flexWrap: "wrap",
  },

  primaryButton: {
    border: "none",
    background: "#0f172a",
    color: "#ffffff",
    padding: "11px 16px",
    borderRadius: "10px",
    fontWeight: 900,
    cursor: "pointer",
  },

  secondaryButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    padding: "11px 16px",
    borderRadius: "10px",
    fontWeight: 900,
    cursor: "pointer",
  },

  emptyCard: {
    background: "#ffffff",
    border: "1px dashed #cbd5e1",
    borderRadius: "20px",
    padding: "45px 20px",
    textAlign: "center",
  },

  emptyIcon: {
    width: "52px",
    height: "52px",
    borderRadius: "16px",
    background: "#f1f5f9",
    color: "#475569",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 13px",
    fontWeight: 950,
  },

  emptyTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 950,
  },

  emptyText: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "12px",
  },
};






