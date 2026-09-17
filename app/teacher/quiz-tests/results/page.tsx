"use client";

import {
  Suspense,
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
  created_at?: string | null;
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
  result_status: string;
  started_at: string | null;
  submitted_at: string | null;
  submission_type: string | null;
  created_at: string | null;
};

type Student = {
  id: number;
  student_name: string | null;
  student_username: string | null;
  password_hash?: string | null;
  created_at?: string | null;
  admission_date?: string | null;
  date_of_birth?: string | null;
  father_name?: string | null;
  mother_name?: string | null;
  father_phone?: string | null;
  mother_phone?: string | null;
  address?: string | null;
  city?: string | null;
  class_name: string | null;
  blood_group?: string | null;
  profile_image_url?: string | null;
  [key: string]: unknown;
};

type ResultRow = {
  student: Student;
  result: QuizResult | null;
  isAttempted: boolean;
};

function normalizeClass(value: unknown) {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .toUpperCase();
}

function getQuizClasses(quiz: Quiz | null) {
  if (!quiz) return [];

  const targets = Array.isArray(
    quiz.target_classes
  )
    ? quiz.target_classes
        .map(normalizeClass)
        .filter(Boolean)
    : [];

  if (targets.length > 0) {
    return Array.from(
      new Set(targets)
    );
  }

  const legacy = normalizeClass(
    quiz.class_name
  );

  return legacy ? [legacy] : [];
}

function formatDateTime(
  value: string | null
) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}

function formatDate(
  value: string | null | undefined
) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatNumber(
  value: number | null | undefined
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "0";
  }

  const numberValue =
    Number(value);

  if (!Number.isFinite(numberValue)) {
    return "0";
  }

  return Number.isInteger(
    numberValue
  )
    ? String(numberValue)
    : numberValue.toFixed(2);
}

function getLatestResult(
  results: QuizResult[]
) {
  if (results.length === 0) {
    return null;
  }

  const sorted = [...results].sort(
    (a, b) => {
      const aTime = new Date(
        a.submitted_at ||
          a.created_at ||
          a.started_at ||
          0
      ).getTime();

      const bTime = new Date(
        b.submitted_at ||
          b.created_at ||
          b.started_at ||
          0
      ).getTime();

      return bTime - aTime;
    }
  );

  return sorted[0];
}

/* ---------------- PDF HELPERS ---------------- */

function pdfEscape(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, " ");
}

function createSimplePdf(
  title: string,
  lines: string[]
) {
  const safeLines = [
    title,
    "",
    ...lines,
  ];

  const pageWidth = 595;
  const pageHeight = 842;

  const marginLeft = 42;
  const topY = 800;
  const lineHeight = 17;

  const maxLinesPerPage = 44;

  const pages: string[][] = [];

  for (
    let i = 0;
    i < safeLines.length;
    i += maxLinesPerPage
  ) {
    pages.push(
      safeLines.slice(
        i,
        i + maxLinesPerPage
      )
    );
  }

  if (pages.length === 0) {
    pages.push([]);
  }

  const objects: string[] = [];

  objects.push(
    "<< /Type /Catalog /Pages 2 0 R >>"
  );

  const pageObjectNumbers: number[] = [];

  const fontObjectNumber =
    3 + pages.length * 2;

  pages.forEach(
    (pageLines, pageIndex) => {
      const pageObjectNumber =
        3 + pageIndex * 2;

      const contentObjectNumber =
        pageObjectNumber + 1;

      pageObjectNumbers.push(
        pageObjectNumber
      );

      objects[
        pageObjectNumber - 1
      ] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`;

      let stream =
        "BT\n/F1 11 Tf\n";

      pageLines.forEach(
        (line, lineIndex) => {
          const y =
            topY -
            lineIndex *
              lineHeight;

          const fontSize =
            lineIndex === 0 &&
            pageIndex === 0
              ? 16
              : 11;

          const safeText =
            pdfEscape(
              String(line)
            );

          stream +=
            `/F1 ${fontSize} Tf\n${marginLeft} ${y} Td\n(${safeText}) Tj\n${-marginLeft} 0 Td\n`;
        }
      );

      stream +=
        "ET";

      objects[
        contentObjectNumber - 1
      ] =
        `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    }
  );

  objects[1] =
    `<< /Type /Pages /Kids [${pageObjectNumbers
      .map(
        (number) =>
          `${number} 0 R`
      )
      .join(
        " "
      )}] /Count ${pages.length} >>`;

  objects[
    fontObjectNumber - 1
  ] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  let pdf =
    "%PDF-1.4\n";

  const offsets: number[] = [
    0,
  ];

  objects.forEach(
    (object, index) => {
      offsets.push(
        pdf.length
      );

      pdf +=
        `${index + 1} 0 obj\n${object}\nendobj\n`;
    }
  );

  const xrefOffset =
    pdf.length;

  pdf +=
    `xref\n0 ${objects.length + 1}\n`;

  pdf +=
    "0000000000 65535 f \n";

  for (
    let i = 1;
    i <= objects.length;
    i++
  ) {
    pdf +=
      `${String(
        offsets[i]
      ).padStart(
        10,
        "0"
      )} 00000 n \n`;
  }

  pdf +=
    `trailer\n<< /Size ${
      objects.length + 1
    } /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob(
    [pdf],
    {
      type: "application/pdf",
    }
  );
}

function downloadPdf(
  filename: string,
  title: string,
  lines: string[]
) {
  const blob =
    createSimplePdf(
      title,
      lines
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const anchor =
    document.createElement(
      "a"
    );

  anchor.href = url;
  anchor.download =
    filename;

  document.body.appendChild(
    anchor
  );

  anchor.click();

  anchor.remove();

  setTimeout(() => {
    URL.revokeObjectURL(
      url
    );
  }, 1000);
}

function buildStudentPdfLines(
  row: ResultRow,
  quiz: Quiz,
  totalQuestions: number
) {
  const result =
    row.isAttempted &&
    row.result
      ? row.result
      : null;

  const questions =
    result &&
    Number(
      result.total_questions
    ) > 0
      ? Number(
          result.total_questions
        )
      : totalQuestions;

  const totalMarks =
    result
      ? Number(
          result.total_marks || 0
        )
      : questions *
        Number(
          quiz.marks_per_question ||
            0
        );

  const obtainedMarks =
    result
      ? Number(
          result.obtained_marks || 0
        )
      : 0;

  const percentage =
    result
      ? Number(
          result.percentage || 0
        )
      : 0;

  const status =
    result
      ? String(
          result.result_status ||
            ""
        ).toUpperCase()
      : "NOT ATTEMPTED";

  return [
    `Student Name: ${
      row.student.student_name ||
      `Student #${row.student.id}`
    }`,
    `Username: ${
      row.student.student_username ||
      "—"
    }`,
    `Student ID: ${row.student.id}`,
    `Class: ${
      normalizeClass(
        row.student.class_name
      ) || "—"
    }`,
    `Admission Date: ${formatDate(
      row.student.admission_date
    )}`,
    `Date of Birth: ${formatDate(
      row.student.date_of_birth
    )}`,
    "",
    `Quiz: ${quiz.title}`,
    `Subject: ${
      quiz.subject || "—"
    }`,
    `Quiz Date: ${formatDate(
      quiz.scheduled_date
    )}`,
    `Total Questions: ${questions}`,
    `Correct Answers: ${
      result
        ? Number(
            result.correct_answers ||
              0
          )
        : 0
    }`,
    `Wrong Answers: ${
      result
        ? Number(
            result.wrong_answers ||
              0
          )
        : 0
    }`,
    `Unanswered: ${
      result
        ? Number(
            result.unanswered ||
              0
          )
        : questions
    }`,
    `Obtained Marks: ${formatNumber(
      obtainedMarks
    )}`,
    `Total Marks: ${formatNumber(
      totalMarks
    )}`,
    `Percentage: ${formatNumber(
      percentage
    )}%`,
    `Result: ${status}`,
    `Submission: ${
      result
        ? result.submission_type ||
          "manual"
        : "not_attempted"
    }`,
    `Submitted: ${
      result
        ? formatDateTime(
            result.submitted_at
          )
        : "Not submitted"
    }`,
    "",
    "RACER ACADEMY",
    "Teacher Quiz Result",
  ];
}

function buildOverallPdfLines(
  rows: ResultRow[],
  quiz: Quiz,
  totalQuestions: number
) {
  const lines: string[] = [];

  lines.push(
    `Quiz: ${quiz.title}`
  );

  lines.push(
    `Subject: ${
      quiz.subject || "—"
    }`
  );

  lines.push(
    `Quiz Date: ${formatDate(
      quiz.scheduled_date
    )}`
  );

  lines.push(
    `Total Students: ${rows.length}`
  );

  lines.push("");

  rows.forEach(
    (row, index) => {
      const result =
        row.isAttempted &&
        row.result
          ? row.result
          : null;

      const questions =
        result &&
        Number(
          result.total_questions
        ) > 0
          ? Number(
              result.total_questions
            )
          : totalQuestions;

      const totalMarks =
        result
          ? Number(
              result.total_marks || 0
            )
          : questions *
            Number(
              quiz.marks_per_question ||
                0
            );

      const obtainedMarks =
        result
          ? Number(
              result.obtained_marks || 0
            )
          : 0;

      const percentage =
        result
          ? Number(
              result.percentage || 0
            )
          : 0;

      const status =
        result
          ? String(
              result.result_status ||
                ""
            ).toUpperCase()
          : "NOT ATTEMPTED";

      lines.push(
        `${index + 1}. ${
          row.student
            .student_name ||
          `Student #${row.student.id}`
        }`
      );

      lines.push(
        `   Username: ${
          row.student
            .student_username ||
          "—"
        }`
      );

      lines.push(
        `   Student ID: ${
          row.student.id
        }`
      );

      lines.push(
        `   Class: ${
          normalizeClass(
            row.student
              .class_name
          ) || "—"
        }`
      );

      lines.push(
        `   Marks: ${formatNumber(
          obtainedMarks
        )} / ${formatNumber(
          totalMarks
        )}`
      );

      lines.push(
        `   Percentage: ${formatNumber(
          percentage
        )}%`
      );

      lines.push(
        `   Status: ${status}`
      );

      lines.push("");
    }
  );

  lines.push(
    "RACER ACADEMY"
  );

  lines.push(
    "Teacher Quiz Results"
  );

  return lines;
}

/* ---------------- MAIN PAGE ---------------- */

function TeacherResultsContent() {
  const router = useRouter();

  const searchParams =
    useSearchParams();

  const quizIdParam =
    searchParams.get("quizId");

  const [quizzes, setQuizzes] =
    useState<Quiz[]>([]);

  const [quiz, setQuiz] =
    useState<Quiz | null>(null);

  const [results, setResults] =
    useState<ResultRow[]>([]);

  const [allStudents, setAllStudents] =
    useState<Student[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [selectedQuizId, setSelectedQuizId] =
    useState("");

  const [selectedClass, setSelectedClass] =
    useState("ALL");

  const [totalQuestions, setTotalQuestions] =
    useState(0);

  const [loadingQuizzes, setLoadingQuizzes] =
    useState(true);

  useEffect(() => {
    async function loadQuizzes() {
      setLoadingQuizzes(true);

      const {
        data,
        error: quizError,
      } = await supabase
        .from("quiz_tests")
        .select("*")
        .order("scheduled_date", {
          ascending: false,
        })
        .order("scheduled_time", {
          ascending: false,
        });

      if (quizError) {
        console.error(
          "Quiz list loading error:",
          quizError
        );

        setError(
          quizError.message
        );

        setLoadingQuizzes(false);
        return;
      }

      const loadedQuizzes =
        (data || []) as Quiz[];

      setQuizzes(
        loadedQuizzes
      );

      const requestedId =
        Number(quizIdParam);

      if (
        Number.isFinite(
          requestedId
        ) &&
        requestedId > 0 &&
        loadedQuizzes.some(
          (item) =>
            Number(item.id) ===
            requestedId
        )
      ) {
        setSelectedQuizId(
          String(requestedId)
        );
      } else if (
        loadedQuizzes.length > 0
      ) {
        setSelectedQuizId(
          String(
            loadedQuizzes[0].id
          )
        );
      }

      setLoadingQuizzes(false);
    }

    loadQuizzes();
  }, [quizIdParam]);

  useEffect(() => {
    if (!selectedQuizId) {
      return;
    }

    const currentId =
      searchParams.get("quizId");

    if (
      currentId ===
      selectedQuizId
    ) {
      return;
    }

    router.replace(
      `/teacher/quiz-tests/results?quizId=${selectedQuizId}`
    );
  }, [
    selectedQuizId,
    router,
    searchParams,
  ]);

  useEffect(() => {
    setSelectedClass("ALL");
    setSearch("");
  }, [selectedQuizId]);

  useEffect(() => {
    async function loadResults() {
      const quizId =
        Number(selectedQuizId);

      if (
        !Number.isFinite(quizId) ||
        quizId <= 0
      ) {
        setResults([]);
        setQuiz(null);
        setTotalQuestions(0);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const {
          data: quizData,
          error: quizError,
        } = await supabase
          .from("quiz_tests")
          .select("*")
          .eq("id", quizId)
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

        const selectedQuiz =
          quizData as Quiz;

        setQuiz(
          selectedQuiz
        );

        const {
          data: questionData,
          error: questionError,
        } = await supabase
          .from("quiz_questions")
          .select("id")
          .eq("quiz_id", quizId);

        if (questionError) {
          console.error(
            "Question count error:",
            questionError
          );

          setTotalQuestions(0);
        } else {
          setTotalQuestions(
            (questionData || [])
              .length
          );
        }

        const {
          data: studentData,
          error: studentError,
        } = await supabase
          .from("students")
          .select("*")
          .order("student_name", {
            ascending: true,
          });

        if (studentError) {
          throw new Error(
            studentError.message
          );
        }

        const fetchedStudents =
          (studentData ||
            []) as Student[];

        setAllStudents(
          fetchedStudents
        );

        const {
          data: resultData,
          error: resultError,
        } = await supabase
          .from("quiz_results")
          .select("*")
          .eq("quiz_id", quizId)
          .order("submitted_at", {
            ascending: false,
          });

        if (resultError) {
          throw new Error(
            resultError.message
          );
        }

        const rawResults =
          (resultData ||
            []) as QuizResult[];

        const resultMap =
          new Map<
            number,
            QuizResult[]
          >();

        rawResults.forEach(
          (result) => {
            const studentId =
              Number(
                result.student_id
              );

            if (
              !Number.isFinite(
                studentId
              )
            ) {
              return;
            }

            const existing =
              resultMap.get(
                studentId
              ) || [];

            existing.push(
              result
            );

            resultMap.set(
              studentId,
              existing
            );
          }
        );

        const rows: ResultRow[] =
          fetchedStudents.map(
            (student) => {
              const studentResults =
                resultMap.get(
                  Number(
                    student.id
                  )
                ) || [];

              const latestResult =
                getLatestResult(
                  studentResults
                );

              return {
                student,
                result:
                  latestResult,
                isAttempted:
                  Boolean(
                    latestResult
                  ),
              };
            }
          );

        rows.sort(
          (a, b) => {
            if (
              a.isAttempted !==
              b.isAttempted
            ) {
              return a.isAttempted
                ? -1
                : 1;
            }

            const aName =
              a.student
                .student_name ||
              "";

            const bName =
              b.student
                .student_name ||
              "";

            return aName.localeCompare(
              bName
            );
          }
        );

        setResults(rows);
      } catch (loadError) {
        console.error(
          "Teacher results error:",
          loadError
        );

        setResults([]);

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load quiz results."
        );
      } finally {
        setLoading(false);
      }
    }

    loadResults();
  }, [selectedQuizId]);

  const availableClasses =
    useMemo(() => {
      const classes =
        allStudents
          .map((student) =>
            normalizeClass(
              student.class_name
            )
          )
          .filter(Boolean);

      return Array.from(
        new Set(classes)
      ).sort((a, b) =>
        a.localeCompare(
          b,
          undefined,
          {
            numeric: true,
            sensitivity:
              "base",
          }
        )
      );
    }, [allStudents]);

  const classFilteredResults =
    useMemo(() => {
      if (
        selectedClass === "ALL"
      ) {
        return results;
      }

      return results.filter(
        (row) =>
          normalizeClass(
            row.student.class_name
          ) === selectedClass
      );
    }, [
      results,
      selectedClass,
    ]);

  const filteredResults =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return classFilteredResults;
      }

      return classFilteredResults.filter(
        (row) => {
          const student =
            row.student;

          const searchableValues = [
            student.student_name,
            student.student_username,
            student.class_name,
          ];

          return searchableValues.some(
            (value) =>
              String(
                value || ""
              )
                .toLowerCase()
                .includes(query)
          );
        }
      );
    }, [
      classFilteredResults,
      search,
    ]);

  const attemptedCount =
    classFilteredResults.filter(
      (row) =>
        row.isAttempted
    ).length;

  const notAttemptedCount =
    classFilteredResults.filter(
      (row) =>
        !row.isAttempted
    ).length;

  const passed =
    classFilteredResults.filter(
      (row) =>
        row.isAttempted &&
        String(
          row.result
            ?.result_status ||
            ""
        ).toUpperCase() ===
          "PASS"
    ).length;

  const failed =
    classFilteredResults.filter(
      (row) =>
        row.isAttempted &&
        String(
          row.result
            ?.result_status ||
            ""
        ).toUpperCase() ===
          "FAIL"
    ).length;

  const averagePercentage =
    attemptedCount > 0
      ? classFilteredResults
          .filter(
            (row) =>
              row.isAttempted
          )
          .reduce(
            (sum, row) =>
              sum +
              Number(
                row.result
                  ?.percentage ||
                  0
              ),
            0
          ) /
        attemptedCount
      : 0;

  const selectedQuizClasses =
    getQuizClasses(quiz);

  function getDisplayTotalQuestions(
    result: QuizResult | null
  ) {
    if (
      result &&
      Number(result.total_questions) >
        0
    ) {
      return Number(
        result.total_questions
      );
    }

    return totalQuestions;
  }

  function getZeroResult(
    row: ResultRow
  ): QuizResult {
    const questions =
      getDisplayTotalQuestions(
        row.result
      );

    const totalMarks =
      questions *
      Number(
        quiz?.marks_per_question ||
          0
      );

    return {
      id: 0,
      quiz_id:
        Number(
          quiz?.id || 0
        ),
      student_id:
        Number(
          row.student.id
        ),
      total_questions:
        questions,
      correct_answers: 0,
      wrong_answers: 0,
      unanswered: questions,
      total_marks:
        totalMarks,
      obtained_marks: 0,
      percentage: 0,
      result_status:
        "NOT ATTEMPTED",
      started_at: null,
      submitted_at: null,
      submission_type: null,
      created_at: null,
    };
  }

  function handleDownloadStudentPdf(
    row: ResultRow
  ) {
    if (!quiz) return;

    const studentName =
      row.student.student_name ||
      `Student-${row.student.id}`;

    const safeName =
      studentName
        .replace(
          /[^a-zA-Z0-9-_]+/g,
          "_"
        )
        .replace(
          /^_+|_+$/g,
          ""
        );

    const lines =
      buildStudentPdfLines(
        row,
        quiz,
        totalQuestions
      );

    downloadPdf(
      `RACER-ACADEMY-${safeName}-Quiz-Result.pdf`,
      `RACER ACADEMY - QUIZ RESULT`,
      lines
    );
  }

  function handleDownloadOverallPdf() {
    if (!quiz) return;

    if (
      filteredResults.length ===
      0
    ) {
      return;
    }

    const lines =
      buildOverallPdfLines(
        filteredResults,
        quiz,
        totalQuestions
      );

    const className =
      selectedClass === "ALL"
        ? "ALL-CLASSES"
        : `CLASS-${selectedClass}`;

    downloadPdf(
      `RACER-ACADEMY-${className}-Quiz-Results.pdf`,
      `RACER ACADEMY - OVERALL QUIZ RESULTS`,
      lines
    );
  }

  if (
    loadingQuizzes ||
    loading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-4 border-white/10 border-t-indigo-500" />

          <p className="font-bold">
            Loading Results...
          </p>
        </div>
      </main>
    );
  }

  if (
    error ||
    quizzes.length === 0 ||
    !quiz
  ) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-2xl rounded-3xl border border-red-400/20 bg-red-500/10 p-8 text-center">
          <h1 className="text-2xl font-black">
            Results Not Available
          </h1>

          <p className="mt-3 text-sm text-red-200">
            {error ||
              "No quizzes found."}
          </p>

          <button
            onClick={() =>
              router.push(
                "/teacher/quiz-tests/manage"
              )
            }
            className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-black"
          >
            ← Back to Manage
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        <header className="border-b border-white/10 bg-slate-950/90">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
            <div>
              <h1 className="text-xl font-black">
                QUIZ RESULTS
              </h1>

              <p className="text-xs text-slate-400">
                RACER ACADEMY • Teacher Panel
              </p>
            </div>

            <button
              onClick={() =>
                router.push(
                  "/teacher/quiz-tests/manage"
                )
              }
              className="rounded-xl bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10"
            >
              ← Manage
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-8">
          <section className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl">
            <div className="mb-3">
              <h2 className="text-lg font-black">
                All Quizzes
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Select any quiz to view submitted
                and not-attempted students.
              </p>
            </div>

            <select
              value={
                selectedQuizId
              }
              onChange={(e) => {
                const value =
                  e.target.value;

                setSelectedQuizId(
                  value
                );

                setSelectedClass(
                  "ALL"
                );

                setSearch("");
              }}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-4 text-sm font-bold text-white outline-none focus:border-indigo-400"
            >
              {quizzes.map(
                (item) => (
                  <option
                    key={item.id}
                    value={item.id}
                    className="bg-slate-900"
                  >
                    {item.title} —{" "}
                    {formatDate(
                      item.scheduled_date
                    )}{" "}
                    {item.scheduled_time ||
                      ""}
                  </option>
                )
              )}
            </select>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-black">
                  {quiz.title}
                </h2>

                {quiz.description && (
                  <p className="mt-2 max-w-3xl text-sm text-slate-400">
                    {quiz.description}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedQuizClasses.length >
                    0 ? (
                    selectedQuizClasses.map(
                      (className) => (
                        <span
                          key={
                            className
                          }
                          className="rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-black text-indigo-300"
                        >
                          CLASS{" "}
                          {
                            className
                          }
                        </span>
                      )
                    )
                  ) : (
                    <span className="rounded-full bg-purple-500/15 px-3 py-1 text-xs font-black text-purple-300">
                      ALL CLASSES
                    </span>
                  )}

                  {quiz.subject && (
                    <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-black text-blue-300">
                      {
                        quiz.subject
                      }
                    </span>
                  )}

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      quiz.is_published
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {quiz.is_published
                      ? "PUBLISHED"
                      : "DRAFT"}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
                  <span>
                    Scheduled:{" "}
                    <strong className="text-white">
                      {formatDate(
                        quiz.scheduled_date
                      )}{" "}
                      {quiz.scheduled_time ||
                        ""}
                    </strong>
                  </span>

                  <span>
                    Duration:{" "}
                    <strong className="text-white">
                      {
                        quiz.duration_minutes
                      }{" "}
                      min
                    </strong>
                  </span>

                  <span>
                    Marks/Q:{" "}
                    <strong className="text-white">
                      {
                        quiz.marks_per_question
                      }
                    </strong>
                  </span>

                  <span>
                    Negative:{" "}
                    <strong className="text-white">
                      {
                        quiz.negative_marks
                      }
                    </strong>
                  </span>

                  <span>
                    Pass:{" "}
                    <strong className="text-white">
                      {
                        quiz.pass_percentage
                      }
                      %
                    </strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div className="rounded-2xl bg-white/5 p-4 text-center">
                  <div className="text-2xl font-black">
                    {
                      classFilteredResults.length
                    }
                  </div>

                  <div className="text-[10px] font-bold text-slate-500">
                    STUDENTS
                  </div>
                </div>

                <div className="rounded-2xl bg-blue-500/10 p-4 text-center">
                  <div className="text-2xl font-black text-blue-300">
                    {
                      attemptedCount
                    }
                  </div>

                  <div className="text-[10px] font-bold text-blue-200/60">
                    SUBMITTED
                  </div>
                </div>

                <div className="rounded-2xl bg-amber-500/10 p-4 text-center">
                  <div className="text-2xl font-black text-amber-300">
                    {
                      notAttemptedCount
                    }
                  </div>

                  <div className="text-[10px] font-bold text-amber-200/60">
                    NOT ATTEMPTED
                  </div>
                </div>

                <div className="rounded-2xl bg-emerald-500/10 p-4 text-center">
                  <div className="text-2xl font-black text-emerald-300">
                    {passed}
                  </div>

                  <div className="text-[10px] font-bold text-emerald-200/60">
                    PASS
                  </div>
                </div>

                <div className="rounded-2xl bg-indigo-500/10 p-4 text-center">
                  <div className="text-2xl font-black text-indigo-300">
                    {formatNumber(
                      averagePercentage
                    )}
                    %
                  </div>

                  <div className="text-[10px] font-bold text-indigo-200/60">
                    AVERAGE
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl">
            <div className="mb-3">
              <h3 className="text-lg font-black">
                Class Wise Results
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                Select a class to view all students
                of that class.
              </p>
            </div>

            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(
                  e.target.value
                );
                setSearch("");
              }}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-4 text-sm font-bold text-white outline-none focus:border-indigo-400"
            >
              <option
                value="ALL"
                className="bg-slate-900"
              >
                ALL CLASSES
              </option>

              {availableClasses.map(
                (className) => (
                  <option
                    key={className}
                    value={className}
                    className="bg-slate-900"
                  >
                    CLASS {className}
                  </option>
                )
              )}
            </select>
          </section>

          <section className="mt-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-black">
                  Student Results
                  {selectedClass !==
                    "ALL" &&
                    ` • CLASS ${selectedClass}`}
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  Submitted students show their
                  actual result. Students who did
                  not attend show zero.
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <input
                  type="text"
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  placeholder="Search name, username, class..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-indigo-400 sm:w-[330px]"
                />

                <button
                  type="button"
                  onClick={
                    handleDownloadOverallPdf
                  }
                  disabled={
                    filteredResults.length ===
                    0
                  }
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-lg hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  DOWNLOAD ALL RESULTS PDF
                </button>
              </div>
            </div>

            {filteredResults.length ===
            0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
                <h4 className="font-black">
                  No students found
                </h4>

                <p className="mt-2 text-sm text-slate-400">
                  No student matches your
                  selected class/search.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredResults.map(
                  (row, index) => {
                    const displayResult =
                      row.isAttempted &&
                      row.result
                        ? row.result
                        : getZeroResult(
                            row
                          );

                    const status =
                      String(
                        displayResult.result_status ||
                          ""
                      ).toUpperCase();

                    const isPass =
                      status ===
                      "PASS";

                    const isNotAttempted =
                      !row.isAttempted;

                    const studentClass =
                      normalizeClass(
                        row.student
                          .class_name
                      );

                    return (
                      <div
                        key={
                          row.student
                            .id
                        }
                        className={`rounded-3xl border p-5 shadow-xl ${
                          isNotAttempted
                            ? "border-amber-400/10 bg-amber-500/[0.03]"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                          <div className="flex min-w-0 items-start gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 font-black text-indigo-300">
                              {index +
                                1}
                            </div>

                            <div className="min-w-0">
                              <h4 className="text-lg font-black">
                                {row
                                  .student
                                  .student_name ||
                                  `Student #${row.student.id}`}
                              </h4>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {row
                                  .student
                                  .student_username && (
                                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">
                                    USERNAME:{" "}
                                    {
                                      row
                                        .student
                                        .student_username
                                    }
                                  </span>
                                )}

                                {studentClass && (
                                  <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-300">
                                    CLASS{" "}
                                    {
                                      studentClass
                                    }
                                  </span>
                                )}

                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-black ${
                                    isNotAttempted
                                      ? "bg-amber-500/15 text-amber-300"
                                      : "bg-emerald-500/15 text-emerald-300"
                                  }`}
                                >
                                  {isNotAttempted
                                    ? "NOT ATTEMPTED"
                                    : "SUBMITTED"}
                                </span>
                              </div>

                              <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-xs text-slate-400 sm:grid-cols-2">
                                <div>
                                  <span className="text-slate-600">
                                    Student ID:
                                  </span>{" "}
                                  <strong className="text-slate-300">
                                    {
                                      row
                                        .student
                                        .id
                                    }
                                  </strong>
                                </div>

                                <div>
                                  <span className="text-slate-600">
                                    Admission:
                                  </span>{" "}
                                  <strong className="text-slate-300">
                                    {formatDate(
                                      row
                                        .student
                                        .admission_date
                                    )}
                                  </strong>
                                </div>

                                <div>
                                  <span className="text-slate-600">
                                    DOB:
                                  </span>{" "}
                                  <strong className="text-slate-300">
                                    {formatDate(
                                      row
                                        .student
                                        .date_of_birth
                                    )}
                                  </strong>
                                </div>
                              </div>

                              <p className="mt-3 text-xs text-slate-500">
                                {row.isAttempted
                                  ? `Submitted: ${formatDateTime(
                                      displayResult.submitted_at
                                    )}`
                                  : "This student did not submit this quiz."}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[560px]">
                            <div className="rounded-2xl bg-white/5 p-4 text-center">
                              <div className="text-xl font-black">
                                {
                                  displayResult.total_questions
                                }
                              </div>

                              <div className="text-[10px] font-bold text-slate-500">
                                QUESTIONS
                              </div>
                            </div>

                            <div className="rounded-2xl bg-emerald-500/10 p-4 text-center">
                              <div className="text-xl font-black text-emerald-300">
                                {
                                  displayResult.correct_answers
                                }
                              </div>

                              <div className="text-[10px] font-bold text-emerald-200/60">
                                CORRECT
                              </div>
                            </div>

                            <div className="rounded-2xl bg-red-500/10 p-4 text-center">
                              <div className="text-xl font-black text-red-300">
                                {
                                  displayResult.wrong_answers
                                }
                              </div>

                              <div className="text-[10px] font-bold text-red-200/60">
                                WRONG
                              </div>
                            </div>

                            <div className="rounded-2xl bg-indigo-500/10 p-4 text-center">
                              <div className="text-xl font-black text-indigo-300">
                                {formatNumber(
                                  displayResult.percentage
                                )}
                                %
                              </div>

                              <div className="text-[10px] font-bold text-indigo-200/60">
                                SCORE
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
                            <span>
                              Marks:{" "}
                              <strong className="text-white">
                                {formatNumber(
                                  displayResult.obtained_marks
                                )}
                              </strong>
                              {" / "}
                              <strong className="text-white">
                                {formatNumber(
                                  displayResult.total_marks
                                )}
                              </strong>
                            </span>

                            <span>
                              Unanswered:{" "}
                              <strong className="text-white">
                                {
                                  displayResult.unanswered
                                }
                              </strong>
                            </span>

                            <span>
                              Submission:{" "}
                              <strong className="text-white">
                                {row.isAttempted
                                  ? displayResult.submission_type ||
                                    "manual"
                                  : "not_attempted"}
                              </strong>
                            </span>

                            {row.isAttempted && (
                              <span>
                                Started:{" "}
                                <strong className="text-white">
                                  {formatDateTime(
                                    displayResult.started_at
                                  )}
                                </strong>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <button
                              type="button"
                              onClick={() =>
                                handleDownloadStudentPdf(
                                  row
                                )
                              }
                              className="rounded-full bg-indigo-600 px-5 py-2 text-center text-xs font-black text-white hover:bg-indigo-500"
                            >
                              DOWNLOAD PDF
                            </button>

                            <span
                              className={`rounded-full px-5 py-2 text-center text-xs font-black ${
                                isNotAttempted
                                  ? "bg-amber-500/15 text-amber-300"
                                  : isPass
                                  ? "bg-emerald-500/15 text-emerald-300"
                                  : "bg-red-500/15 text-red-300"
                              }`}
                            >
                              {isNotAttempted
                                ? "NOT ATTEMPTED • 0"
                                : isPass
                                ? "PASS"
                                : "FAIL"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </section>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={
                handleDownloadOverallPdf
              }
              disabled={
                filteredResults.length ===
                0
              }
              className="rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-black text-white shadow-xl hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              DOWNLOAD OVERALL RESULTS PDF
              {selectedClass !==
                "ALL" &&
                ` • CLASS ${selectedClass}`}
            </button>
          </div>

          <div className="py-8 text-center text-xs text-slate-500">
            RACER ACADEMY • Teacher Quiz Results
          </div>
        </div>
      </div>
    </main>
  );
}

export default function TeacherQuizResultsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-indigo-500" />

            <p className="font-bold">
              Loading Results...
            </p>
          </div>
        </main>
      }
    >
      <TeacherResultsContent />
    </Suspense>
  );
}