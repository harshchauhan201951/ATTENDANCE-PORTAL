"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
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

type StudentResultGroup = {
  student: Student;
  results: QuizResult[];
};

function normalizeClass(value: unknown) {
  if (typeof value !== "string") return "";

  return value.trim().toUpperCase();
}

function formatDate(
  value: string | null | undefined
) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(
  value: string | null | undefined
) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
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

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return "0";
  }

  return Number.isInteger(numberValue)
    ? String(numberValue)
    : numberValue.toFixed(2);
}

function getLatestResult(
  results: QuizResult[]
) {
  if (results.length === 0) {
    return null;
  }

  return [...results].sort((a, b) => {
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
  })[0];
}

/* =========================================================
   PDF GENERATOR
========================================================= */

function pdfEscape(value: string) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, " ");
}

function createPdf(
  title: string,
  lines: string[]
) {
  const pageWidth = 595;
  const pageHeight = 842;

  const marginLeft = 42;
  const topY = 800;
  const lineHeight = 15;

  const maxChars = 92;

  const wrappedLines: string[] = [];

  const wrapText = (text: string) => {
    if (!text) {
      wrappedLines.push("");
      return;
    }

    let remaining = String(text);

    while (remaining.length > maxChars) {
      let breakAt = remaining.lastIndexOf(
        " ",
        maxChars
      );

      if (breakAt <= 0) {
        breakAt = maxChars;
      }

      wrappedLines.push(
        remaining.slice(0, breakAt)
      );

      remaining =
        remaining
          .slice(breakAt)
          .trimStart();
    }

    wrappedLines.push(remaining);
  };

  wrapText(title);
  wrappedLines.push("");

  lines.forEach((line) => {
    wrapText(line);
  });

  const maxLinesPerPage = 50;

  const pages: string[][] = [];

  for (
    let i = 0;
    i < wrappedLines.length;
    i += maxLinesPerPage
  ) {
    pages.push(
      wrappedLines.slice(
        i,
        i + maxLinesPerPage
      )
    );
  }

  if (pages.length === 0) {
    pages.push([]);
  }

  const objects: string[] = [];

  // Object 1 - Catalog
  objects.push(
    "<< /Type /Catalog /Pages 2 0 R >>"
  );

  // Object 2 - Pages
  objects.push("");

  const pageObjectNumbers: number[] = [];

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
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 FONT_OBJECT >> >> /Contents ${contentObjectNumber} 0 R >>`;

      let stream = "BT\n";

      pageLines.forEach(
        (line, lineIndex) => {
          const y =
            topY -
            lineIndex * lineHeight;

          const fontSize =
            pageIndex === 0 &&
            lineIndex === 0
              ? 16
              : 10;

          /*
           * IMPORTANT:
           * Tm sets an ABSOLUTE text position.
           * This fixes the old Td positioning bug.
           */
          stream +=
            `/F1 ${fontSize} Tf\n` +
            `1 0 0 1 ${marginLeft} ${y} Tm\n` +
            `(${pdfEscape(line)}) Tj\n`;
        }
      );

      stream += "ET";

      objects[
        contentObjectNumber - 1
      ] =
        `<< /Length ${stream.length} >>\n` +
        `stream\n` +
        `${stream}\n` +
        `endstream`;
    }
  );

  // Font object
  const fontObjectNumber =
    3 + pages.length * 2;

  objects[
    fontObjectNumber - 1
  ] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  // Replace FONT_OBJECT placeholder
  objects.forEach(
    (object, index) => {
      objects[index] =
        object.replace(
          /FONT_OBJECT/g,
          `${fontObjectNumber} 0 R`
        );
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

  let pdf = "%PDF-1.4\n";

  const offsets: number[] = [0];

  objects.forEach(
    (object, index) => {
      offsets.push(pdf.length);

      pdf +=
        `${index + 1} 0 obj\n` +
        `${object}\n` +
        `endobj\n`;
    }
  );

  const xrefOffset =
    pdf.length;

  pdf +=
    `xref\n0 ${
      objects.length + 1
    }\n`;

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
    `trailer\n` +
    `<< /Size ${
      objects.length + 1
    } /Root 1 0 R >>\n` +
    `startxref\n` +
    `${xrefOffset}\n` +
    `%%EOF`;

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
  const blob = createPdf(
    title,
    lines
  );

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);

  anchor.click();

  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/* =========================================================
   PDF DATA
========================================================= */

function addStudentPersonalDetails(
  lines: string[],
  student: Student
) {
  lines.push(
    `Student Name: ${
      student.student_name ||
      `Student #${student.id}`
    }`
  );

  lines.push(
    `Student ID: ${student.id}`
  );

  lines.push(
    `Username: ${
      student.student_username ||
      "—"
    }`
  );

  lines.push(
    `Class: ${
      normalizeClass(
        student.class_name
      ) || "—"
    }`
  );

  lines.push(
    `Admission Date: ${formatDate(
      student.admission_date
    )}`
  );

  lines.push(
    `Date of Birth: ${formatDate(
      student.date_of_birth
    )}`
  );

  lines.push("");
}

function addQuizResultToPdf(
  lines: string[],
  quiz: Quiz | undefined,
  result: QuizResult
) {
  lines.push(
    `QUIZ: ${
      quiz?.title || `Quiz #${result.quiz_id}`
    }`
  );

  lines.push(
    `Subject: ${
      quiz?.subject || "—"
    }`
  );

  lines.push(
    `Quiz Date: ${
      quiz
        ? formatDate(
            quiz.scheduled_date
          )
        : "—"
    }`
  );

  lines.push(
    `Total Questions: ${
      result.total_questions || 0
    }`
  );

  lines.push(
    `Correct Answers: ${
      result.correct_answers || 0
    }`
  );

  lines.push(
    `Wrong Answers: ${
      result.wrong_answers || 0
    }`
  );

  lines.push(
    `Unanswered: ${
      result.unanswered || 0
    }`
  );

  lines.push(
    `Obtained Marks: ${formatNumber(
      result.obtained_marks
    )}`
  );

  lines.push(
    `Total Marks: ${formatNumber(
      result.total_marks
    )}`
  );

  lines.push(
    `Percentage: ${formatNumber(
      result.percentage
    )}%`
  );

  lines.push(
    `Result: ${
      String(
        result.result_status ||
          ""
      ).toUpperCase() || "—"
    }`
  );

  lines.push(
    `Submission: ${
      result.submission_type ||
      "manual"
    }`
  );

  lines.push(
    `Started: ${formatDateTime(
      result.started_at
    )}`
  );

  lines.push(
    `Submitted: ${formatDateTime(
      result.submitted_at
    )}`
  );

  lines.push("");
  lines.push(
    "----------------------------------------"
  );
  lines.push("");
}

function buildStudentPdf(
  student: Student,
  results: QuizResult[],
  quizzes: Quiz[]
) {
  const lines: string[] = [];

  lines.push(
    "RACER ACADEMY"
  );

  lines.push(
    "STUDENT QUIZ RESULT REPORT"
  );

  lines.push("");

  addStudentPersonalDetails(
    lines,
    student
  );

  lines.push(
    `Total Submitted Quizzes: ${results.length}`
  );

  lines.push("");

  results.forEach((result) => {
    const quiz = quizzes.find(
      (item) =>
        Number(item.id) ===
        Number(result.quiz_id)
    );

    addQuizResultToPdf(
      lines,
      quiz,
      result
    );
  });

  lines.push(
    "End of Student Report"
  );

  lines.push(
    "RACER ACADEMY"
  );

  return lines;
}

function buildClassPdf(
  className: string,
  students: Student[],
  results: QuizResult[],
  quizzes: Quiz[]
) {
  const lines: string[] = [];

  lines.push(
    `CLASS: ${className}`
  );

  lines.push(
    "RACER ACADEMY - CLASS QUIZ REPORT"
  );

  lines.push("");

  lines.push(
    `Total Students: ${students.length}`
  );

  lines.push(
    `Total Submitted Results: ${results.length}`
  );

  lines.push("");

  students.forEach(
    (student, index) => {
      lines.push(
        `${index + 1}. ${
          student.student_name ||
          `Student #${student.id}`
        }`
      );

      lines.push(
        `   Student ID: ${student.id}`
      );

      lines.push(
        `   Username: ${
          student.student_username ||
          "—"
        }`
      );

      lines.push(
        `   DOB: ${formatDate(
          student.date_of_birth
        )}`
      );

      lines.push("");

      const studentResults =
        results.filter(
          (result) =>
            Number(
              result.student_id
            ) ===
            Number(student.id)
        );

      if (
        studentResults.length === 0
      ) {
        lines.push(
          "   No submitted quiz."
        );

        lines.push("");
        return;
      }

      studentResults.forEach(
        (result) => {
          const quiz =
            quizzes.find(
              (item) =>
                Number(item.id) ===
                Number(
                  result.quiz_id
                )
            );

          lines.push(
            `   Quiz: ${
              quiz?.title ||
              `Quiz #${result.quiz_id}`
            }`
          );

          lines.push(
            `   Questions: ${
              result.total_questions
            }`
          );

          lines.push(
            `   Correct: ${
              result.correct_answers
            }`
          );

          lines.push(
            `   Wrong: ${
              result.wrong_answers
            }`
          );

          lines.push(
            `   Unanswered: ${
              result.unanswered
            }`
          );

          lines.push(
            `   Marks: ${formatNumber(
              result.obtained_marks
            )} / ${formatNumber(
              result.total_marks
            )}`
          );

          lines.push(
            `   Percentage: ${formatNumber(
              result.percentage
            )}%`
          );

          lines.push(
            `   Result: ${
              String(
                result.result_status ||
                  ""
              ).toUpperCase()
            }`
          );

          lines.push("");
        }
      );

      lines.push(
        "----------------------------------------"
      );

      lines.push("");
    }
  );

  lines.push(
    "RACER ACADEMY"
  );

  return lines;
}

function buildOverallPdf(
  students: Student[],
  results: QuizResult[],
  quizzes: Quiz[]
) {
  const lines: string[] = [];

  lines.push(
    "RACER ACADEMY"
  );

  lines.push(
    "OVERALL STUDENT QUIZ REPORT"
  );

  lines.push("");

  lines.push(
    `Total Students: ${students.length}`
  );

  lines.push(
    `Total Submitted Results: ${results.length}`
  );

  lines.push("");

  students.forEach(
    (student, index) => {
      lines.push(
        `${index + 1}. ${
          student.student_name ||
          `Student #${student.id}`
        }`
      );

      lines.push(
        `Class: ${
          normalizeClass(
            student.class_name
          ) || "—"
        }`
      );

      lines.push(
        `Student ID: ${student.id}`
      );

      const studentResults =
        results.filter(
          (result) =>
            Number(
              result.student_id
            ) ===
            Number(student.id)
        );

      if (
        studentResults.length === 0
      ) {
        lines.push(
          "No submitted quizzes."
        );
      } else {
        studentResults.forEach(
          (result) => {
            const quiz =
              quizzes.find(
                (item) =>
                  Number(item.id) ===
                  Number(
                    result.quiz_id
                  )
              );

            lines.push(
              `Quiz: ${
                quiz?.title ||
                `Quiz #${result.quiz_id}`
              }`
            );

            lines.push(
              `Correct: ${
                result.correct_answers
              } | Wrong: ${
                result.wrong_answers
              } | Unanswered: ${
                result.unanswered
              }`
            );

            lines.push(
              `Marks: ${formatNumber(
                result.obtained_marks
              )} / ${formatNumber(
                result.total_marks
              )}`
            );

            lines.push(
              `Percentage: ${formatNumber(
                result.percentage
              )}% | Result: ${
                String(
                  result.result_status ||
                    ""
                ).toUpperCase()
              }`
            );

            lines.push("");
          }
        );
      }

      lines.push(
        "----------------------------------------"
      );

      lines.push("");
    }
  );

  lines.push(
    "RACER ACADEMY"
  );

  return lines;
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function TeacherQuizResultsPage() {
  const [students, setStudents] =
    useState<Student[]>([]);

  const [results, setResults] =
    useState<QuizResult[]>([]);

  const [quizzes, setQuizzes] =
    useState<Quiz[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [selectedClass, setSelectedClass] =
    useState("");

  const [selectedStudentId, setSelectedStudentId] =
    useState<number | null>(null);

  const [search, setSearch] =
    useState("");

  const [showStudentResults, setShowStudentResults] =
    useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [
          studentResponse,
          resultResponse,
          quizResponse,
        ] = await Promise.all([
          supabase
            .from("students")
            .select("*")
            .order(
              "student_name",
              {
                ascending: true,
              }
            ),

          supabase
            .from("quiz_results")
            .select("*")
            .order(
              "submitted_at",
              {
                ascending: false,
              }
            ),

          supabase
            .from("quiz_tests")
            .select("*")
            .order(
              "scheduled_date",
              {
                ascending: false,
              }
            ),
        ]);

        if (studentResponse.error) {
          throw new Error(
            studentResponse.error.message
          );
        }

        if (resultResponse.error) {
          throw new Error(
            resultResponse.error.message
          );
        }

        if (quizResponse.error) {
          throw new Error(
            quizResponse.error.message
          );
        }

        setStudents(
          (studentResponse.data ||
            []) as Student[]
        );

        setResults(
          (resultResponse.data ||
            []) as QuizResult[]
        );

        setQuizzes(
          (quizResponse.data ||
            []) as Quiz[]
        );
      } catch (err) {
        console.error(
          "Results loading error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load results."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const availableClasses =
    useMemo(() => {
      const classes =
        students
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
    }, [students]);

  const classStudents =
    useMemo(() => {
      if (!selectedClass) {
        return [];
      }

      const query =
        search.trim().toLowerCase();

      return students
        .filter(
          (student) =>
            normalizeClass(
              student.class_name
            ) === selectedClass
        )
        .filter((student) => {
          if (!query) return true;

          return [
            student.student_name,
            student.student_username,
            student.class_name,
          ].some((value) =>
            String(
              value || ""
            )
              .toLowerCase()
              .includes(query)
          );
        });
    }, [
      students,
      selectedClass,
      search,
    ]);

  const selectedStudent =
    useMemo(() => {
      if (!selectedStudentId) {
        return null;
      }

      return (
        students.find(
          (student) =>
            Number(student.id) ===
            Number(
              selectedStudentId
            )
        ) || null
      );
    }, [
      students,
      selectedStudentId,
    ]);

  const selectedStudentResults =
    useMemo(() => {
      if (!selectedStudentId) {
        return [];
      }

      const studentResults =
        results.filter(
          (result) =>
            Number(
              result.student_id
            ) ===
            Number(
              selectedStudentId
            )
        );

      const latestByQuiz =
        new Map<
          number,
          QuizResult
        >();

      studentResults.forEach(
        (result) => {
          const quizId =
            Number(
              result.quiz_id
            );

          const existing =
            latestByQuiz.get(
              quizId
            );

          if (!existing) {
            latestByQuiz.set(
              quizId,
              result
            );
            return;
          }

          const currentTime =
            new Date(
              result.submitted_at ||
                result.created_at ||
                result.started_at ||
                0
            ).getTime();

          const existingTime =
            new Date(
              existing.submitted_at ||
                existing.created_at ||
                existing.started_at ||
                0
            ).getTime();

          if (
            currentTime >
            existingTime
          ) {
            latestByQuiz.set(
              quizId,
              result
            );
          }
        }
      );

      return Array.from(
        latestByQuiz.values()
      ).sort((a, b) => {
        const aTime =
          new Date(
            a.submitted_at ||
              a.created_at ||
              a.started_at ||
              0
          ).getTime();

        const bTime =
          new Date(
            b.submitted_at ||
              b.created_at ||
              b.started_at ||
              0
          ).getTime();

        return bTime - aTime;
      });
    }, [
      results,
      selectedStudentId,
    ]);

  const classResultCount =
    useMemo(() => {
      if (!selectedClass) {
        return 0;
      }

      const ids = new Set(
        students
          .filter(
            (student) =>
              normalizeClass(
                student.class_name
              ) === selectedClass
          )
          .map((student) =>
            Number(student.id)
          )
      );

      return results.filter(
        (result) =>
          ids.has(
            Number(
              result.student_id
            )
          )
      ).length;
    }, [
      students,
      results,
      selectedClass,
    ]);

  const selectedStudentStats =
    useMemo(() => {
      const attempted =
        selectedStudentResults.length;

      const passed =
        selectedStudentResults.filter(
          (result) =>
            String(
              result.result_status ||
                ""
            ).toUpperCase() ===
            "PASS"
        ).length;

      const failed =
        selectedStudentResults.filter(
          (result) =>
            String(
              result.result_status ||
                ""
            ).toUpperCase() ===
            "FAIL"
        ).length;

      const average =
        attempted > 0
          ? selectedStudentResults.reduce(
              (sum, result) =>
                sum +
                Number(
                  result.percentage ||
                    0
                ),
              0
            ) / attempted
          : 0;

      return {
        attempted,
        passed,
        failed,
        average,
      };
    }, [
      selectedStudentResults,
    ]);

  function openClass(
    className: string
  ) {
    setSelectedClass(
      className
    );

    setSelectedStudentId(
      null
    );

    setShowStudentResults(
      false
    );

    setSearch("");
  }

  function openStudent(
    studentId: number
  ) {
    setSelectedStudentId(
      studentId
    );

    setShowStudentResults(
      true
    );
  }

  function goBackToClasses() {
    setSelectedClass("");
    setSelectedStudentId(
      null
    );
    setShowStudentResults(
      false
    );
    setSearch("");
  }

  function goBackToStudents() {
    setSelectedStudentId(
      null
    );
    setShowStudentResults(
      false
    );
  }

  function downloadStudentPdf(
    student: Student
  ) {
    const studentResults =
      results.filter(
        (result) =>
          Number(
            result.student_id
          ) ===
          Number(student.id)
      );

    const lines =
      buildStudentPdf(
        student,
        studentResults,
        quizzes
      );

    const safeName =
      (
        student.student_name ||
        `Student-${student.id}`
      )
        .replace(
          /[^a-zA-Z0-9-_]+/g,
          "_"
        )
        .replace(
          /^_+|_+$/g,
          ""
        );

    downloadPdf(
      `RACER-ACADEMY-${safeName}-RESULTS.pdf`,
      "RACER ACADEMY - STUDENT RESULT",
      lines
    );
  }

  function downloadClassPdf() {
    if (!selectedClass) {
      return;
    }

    const classStudentsForPdf =
      students.filter(
        (student) =>
          normalizeClass(
            student.class_name
          ) === selectedClass
      );

    const studentIds =
      new Set(
        classStudentsForPdf.map(
          (student) =>
            Number(student.id)
        )
      );

    const classResults =
      results.filter(
        (result) =>
          studentIds.has(
            Number(
              result.student_id
            )
          )
      );

    const lines =
      buildClassPdf(
        selectedClass,
        classStudentsForPdf,
        classResults,
        quizzes
      );

    downloadPdf(
      `RACER-ACADEMY-CLASS-${selectedClass}-RESULTS.pdf`,
      `RACER ACADEMY - CLASS ${selectedClass} RESULTS`,
      lines
    );
  }

  function downloadOverallPdf() {
    const lines =
      buildOverallPdf(
        students,
        results,
        quizzes
      );

    downloadPdf(
      "RACER-ACADEMY-OVERALL-RESULTS.pdf",
      "RACER ACADEMY - OVERALL RESULTS",
      lines
    );
  }

  if (loading) {
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

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="w-full max-w-xl rounded-3xl border border-red-400/20 bg-red-500/10 p-8 text-center">
          <h1 className="text-2xl font-black">
            Results Not Available
          </h1>

          <p className="mt-3 text-sm text-red-200">
            {error}
          </p>

          <button
            onClick={() =>
              window.location.reload()
            }
            className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-black hover:bg-indigo-500"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  /* =======================================================
     CLASS SCREEN
  ======================================================= */

  if (!selectedClass) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
          <header className="border-b border-white/10 bg-slate-950/90">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
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
                  window.location.href =
                    "/teacher"
                }
                className="rounded-xl bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10"
              >
                ← Dashboard
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-4 py-8">
            <section className="mb-8 rounded-3xl border border-indigo-400/20 bg-gradient-to-r from-indigo-600/20 to-purple-600/10 p-7">
              <p className="text-sm font-bold text-indigo-300">
                RACER ACADEMY
              </p>

              <h2 className="mt-2 text-3xl font-black">
                Student Results
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Select a class first to view students
                and their quiz performance.
              </p>
            </section>

            <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-black">
                  Select Class
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  Choose a class to open its students.
                </p>
              </div>

              <button
                onClick={
                  downloadOverallPdf
                }
                disabled={
                  students.length === 0
                }
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black hover:bg-indigo-500 disabled:opacity-40"
              >
                DOWNLOAD ALL RESULTS PDF
              </button>
            </section>

            {availableClasses.length ===
            0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
                <p className="font-black">
                  No classes found
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  No student class data is available.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {availableClasses.map(
                  (className) => {
                    const count =
                      students.filter(
                        (student) =>
                          normalizeClass(
                            student.class_name
                          ) ===
                          className
                      ).length;

                    const classIds =
                      new Set(
                        students
                          .filter(
                            (student) =>
                              normalizeClass(
                                student.class_name
                              ) ===
                              className
                          )
                          .map(
                            (student) =>
                              Number(
                                student.id
                              )
                          )
                      );

                    const submitted =
                      results.filter(
                        (result) =>
                          classIds.has(
                            Number(
                              result.student_id
                            )
                          )
                      ).length;

                    return (
                      <button
                        key={className}
                        onClick={() =>
                          openClass(
                            className
                          )
                        }
                        className="group rounded-3xl border border-white/10 bg-white/5 p-6 text-left shadow-xl transition hover:-translate-y-1 hover:border-indigo-400/40 hover:bg-indigo-500/10"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-xl font-black text-indigo-300">
                            {className}
                          </div>

                          <span className="text-xl text-indigo-300 transition group-hover:translate-x-1">
                            →
                          </span>
                        </div>

                        <h4 className="mt-5 text-xl font-black">
                          CLASS {className}
                        </h4>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <div className="rounded-xl bg-white/5 p-3">
                            <p className="text-[10px] font-bold text-slate-500">
                              STUDENTS
                            </p>

                            <p className="mt-1 text-lg font-black">
                              {count}
                            </p>
                          </div>

                          <div className="rounded-xl bg-emerald-500/10 p-3">
                            <p className="text-[10px] font-bold text-emerald-200/60">
                              SUBMISSIONS
                            </p>

                            <p className="mt-1 text-lg font-black text-emerald-300">
                              {submitted}
                            </p>
                          </div>
                        </div>

                        <p className="mt-4 text-xs font-bold text-indigo-300">
                          VIEW STUDENTS →
                        </p>
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  /* =======================================================
     STUDENT LIST SCREEN
  ======================================================= */

  if (
    selectedClass &&
    !showStudentResults
  ) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
          <header className="border-b border-white/10 bg-slate-950/90">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
              <div>
                <h1 className="text-xl font-black">
                  CLASS {selectedClass}
                </h1>

                <p className="text-xs text-slate-400">
                  Student Quiz Results
                </p>
              </div>

              <button
                onClick={
                  goBackToClasses
                }
                className="rounded-xl bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10"
              >
                ← Classes
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-4 py-8">
            <section className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                    Selected Class
                  </p>

                  <h2 className="mt-1 text-3xl font-black">
                    CLASS {selectedClass}
                  </h2>

                  <p className="mt-2 text-sm text-slate-400">
                    {classStudents.length} students
                    displayed
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={search}
                    onChange={(e) =>
                      setSearch(
                        e.target.value
                      )
                    }
                    placeholder="Search student..."
                    className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-indigo-400 sm:w-72"
                  />

                  <button
                    onClick={
                      downloadClassPdf
                    }
                    className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black hover:bg-indigo-500"
                  >
                    CLASS PDF
                  </button>
                </div>
              </div>
            </section>

            {classStudents.length ===
            0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
                <h3 className="font-black">
                  No Students Found
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  No student matches your search.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {classStudents.map(
                  (student) => {
                    const studentResults =
                      results.filter(
                        (result) =>
                          Number(
                            result.student_id
                          ) ===
                          Number(
                            student.id
                          )
                      );

                    const latestResults =
                      new Map<
                        number,
                        QuizResult
                      >();

                    studentResults.forEach(
                      (result) => {
                        const quizId =
                          Number(
                            result.quiz_id
                          );

                        const current =
                          latestResults.get(
                            quizId
                          );

                        if (!current) {
                          latestResults.set(
                            quizId,
                            result
                          );
                          return;
                        }

                        const a =
                          new Date(
                            result.submitted_at ||
                              result.created_at ||
                              result.started_at ||
                              0
                          ).getTime();

                        const b =
                          new Date(
                            current.submitted_at ||
                              current.created_at ||
                              current.started_at ||
                              0
                          ).getTime();

                        if (a > b) {
                          latestResults.set(
                            quizId,
                            result
                          );
                        }
                      }
                    );

                    const average =
                      latestResults.size >
                      0
                        ? Array.from(
                            latestResults.values()
                          ).reduce(
                            (
                              sum,
                              result
                            ) =>
                              sum +
                              Number(
                                result.percentage ||
                                  0
                              ),
                            0
                          ) /
                          latestResults.size
                        : 0;

                    return (
                      <div
                        key={
                          student.id
                        }
                        className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl"
                      >
                        <button
                          onClick={() =>
                            openStudent(
                              student.id
                            )
                          }
                          className="w-full text-left"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 font-black text-indigo-300">
                                {(
                                  student.student_name ||
                                  "S"
                                )
                                  .charAt(
                                    0
                                  )
                                  .toUpperCase()}
                              </div>

                              <div className="min-w-0">
                                <h3 className="truncate text-lg font-black">
                                  {student.student_name ||
                                    `Student #${student.id}`}
                                </h3>

                                <p className="mt-1 text-xs text-slate-500">
                                  ID:{" "}
                                  {
                                    student.id
                                  }
                                </p>
                              </div>
                            </div>

                            <span className="text-indigo-300">
                              →
                            </span>
                          </div>

                          <div className="mt-5 grid grid-cols-2 gap-2">
                            <div className="rounded-xl bg-white/5 p-3">
                              <p className="text-[10px] font-bold text-slate-500">
                                QUIZZES
                              </p>

                              <p className="mt-1 text-lg font-black">
                                {
                                  latestResults.size
                                }
                              </p>
                            </div>

                            <div className="rounded-xl bg-indigo-500/10 p-3">
                              <p className="text-[10px] font-bold text-indigo-200/60">
                                AVERAGE
                              </p>

                              <p className="mt-1 text-lg font-black text-indigo-300">
                                {formatNumber(
                                  average
                                )}
                                %
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 space-y-1 text-xs text-slate-400">
                            <p>
                              Username:{" "}
                              <strong className="text-slate-300">
                                {student.student_username ||
                                  "—"}
                              </strong>
                            </p>

                            <p>
                              Admission:{" "}
                              <strong className="text-slate-300">
                                {formatDate(
                                  student.admission_date
                                )}
                              </strong>
                            </p>
                          </div>
                        </button>

                        <div className="mt-5 flex gap-2 border-t border-white/10 pt-4">
                          <button
                            onClick={() =>
                              openStudent(
                                student.id
                              )
                            }
                            className="flex-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black hover:bg-indigo-500"
                          >
                            VIEW RESULTS
                          </button>

                          <button
                            onClick={() =>
                              downloadStudentPdf(
                                student
                              )
                            }
                            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-black hover:bg-white/10"
                          >
                            PDF
                          </button>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  /* =======================================================
     STUDENT RESULT SCREEN
  ======================================================= */

  if (
    selectedStudent &&
    showStudentResults
  ) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
          <header className="border-b border-white/10 bg-slate-950/90">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
              <div>
                <h1 className="text-xl font-black">
                  STUDENT RESULTS
                </h1>

                <p className="text-xs text-slate-400">
                  CLASS {selectedClass}
                </p>
              </div>

              <button
                onClick={
                  goBackToStudents
                }
                className="rounded-xl bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10"
              >
                ← Students
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-4 py-8">
            <section className="mb-6 overflow-hidden rounded-3xl border border-indigo-400/20 bg-gradient-to-r from-indigo-600/20 via-purple-600/10 to-transparent p-6 shadow-2xl">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                    Student Profile
                  </p>

                  <h2 className="mt-2 text-3xl font-black">
                    {selectedStudent.student_name ||
                      `Student #${selectedStudent.id}`}
                  </h2>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-bold text-indigo-300">
                      CLASS{" "}
                      {normalizeClass(
                        selectedStudent.class_name
                      )}
                    </span>

                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">
                      ID:{" "}
                      {
                        selectedStudent.id
                      }
                    </span>

                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">
                      USERNAME:{" "}
                      {selectedStudent.student_username ||
                        "—"}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-2 text-sm text-slate-400 sm:grid-cols-2">
                    <p>
                      Admission Date:{" "}
                      <strong className="text-white">
                        {formatDate(
                          selectedStudent.admission_date
                        )}
                      </strong>
                    </p>

                    <p>
                      Date of Birth:{" "}
                      <strong className="text-white">
                        {formatDate(
                          selectedStudent.date_of_birth
                        )}
                      </strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() =>
                    downloadStudentPdf(
                      selectedStudent
                    )
                  }
                  className="rounded-2xl bg-indigo-600 px-6 py-4 text-sm font-black shadow-xl hover:bg-indigo-500"
                >
                  DOWNLOAD STUDENT PDF
                </button>
              </div>
            </section>

            <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-[10px] font-bold text-slate-500">
                  QUIZZES
                </p>

                <p className="mt-2 text-3xl font-black">
                  {
                    selectedStudentStats.attempted
                  }
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-400/10 bg-emerald-500/5 p-5">
                <p className="text-[10px] font-bold text-emerald-200/60">
                  PASS
                </p>

                <p className="mt-2 text-3xl font-black text-emerald-300">
                  {
                    selectedStudentStats.passed
                  }
                </p>
              </div>

              <div className="rounded-2xl border border-red-400/10 bg-red-500/5 p-5">
                <p className="text-[10px] font-bold text-red-200/60">
                  FAIL
                </p>

                <p className="mt-2 text-3xl font-black text-red-300">
                  {
                    selectedStudentStats.failed
                  }
                </p>
              </div>

              <div className="rounded-2xl border border-indigo-400/10 bg-indigo-500/5 p-5">
                <p className="text-[10px] font-bold text-indigo-200/60">
                  AVERAGE
                </p>

                <p className="mt-2 text-3xl font-black text-indigo-300">
                  {formatNumber(
                    selectedStudentStats.average
                  )}
                  %
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-black">
                    Quiz Results
                  </h3>

                  <p className="mt-1 text-sm text-slate-400">
                    All submitted quizzes by this student.
                  </p>
                </div>

                <span className="rounded-full bg-indigo-500/10 px-4 py-2 text-xs font-black text-indigo-300">
                  {
                    selectedStudentResults.length
                  } RESULTS
                </span>
              </div>

              {selectedStudentResults.length ===
              0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
                  <h4 className="font-black">
                    No Submitted Quiz
                  </h4>

                  <p className="mt-2 text-sm text-slate-400">
                    This student has not submitted any quiz yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedStudentResults.map(
                    (result) => {
                      const quiz =
                        quizzes.find(
                          (item) =>
                            Number(
                              item.id
                            ) ===
                            Number(
                              result.quiz_id
                            )
                        );

                      const status =
                        String(
                          result.result_status ||
                            ""
                        ).toUpperCase();

                      const pass =
                        status ===
                        "PASS";

                      return (
                        <div
                          key={
                            result.id
                          }
                          className="rounded-3xl border border-white/10 bg-slate-900/60 p-5"
                        >
                          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-lg font-black">
                                  {quiz?.title ||
                                    `Quiz #${result.quiz_id}`}
                                </h4>

                                <span
                                  className={`rounded-full px-3 py-1 text-[10px] font-black ${
                                    pass
                                      ? "bg-emerald-500/15 text-emerald-300"
                                      : "bg-red-500/15 text-red-300"
                                  }`}
                                >
                                  {status ||
                                    "RESULT"}
                                </span>
                              </div>

                              <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-400">
                                <span>
                                  Subject:{" "}
                                  {
                                    quiz?.subject ||
                                    "—"
                                  }
                                </span>

                                <span>
                                  Date:{" "}
                                  {formatDate(
                                    quiz?.scheduled_date
                                  )}
                                </span>

                                <span>
                                  Submitted:{" "}
                                  {formatDateTime(
                                    result.submitted_at
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="rounded-2xl bg-indigo-500/10 px-5 py-4 text-center">
                              <p className="text-2xl font-black text-indigo-300">
                                {formatNumber(
                                  result.percentage
                                )}
                                %
                              </p>

                              <p className="text-[10px] font-bold text-indigo-200/60">
                                SCORE
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
                            <div className="rounded-2xl bg-white/5 p-4 text-center">
                              <p className="text-xl font-black">
                                {
                                  result.total_questions
                                }
                              </p>

                              <p className="text-[10px] font-bold text-slate-500">
                                QUESTIONS
                              </p>
                            </div>

                            <div className="rounded-2xl bg-emerald-500/10 p-4 text-center">
                              <p className="text-xl font-black text-emerald-300">
                                {
                                  result.correct_answers
                                }
                              </p>

                              <p className="text-[10px] font-bold text-emerald-200/60">
                                CORRECT
                              </p>
                            </div>

                            <div className="rounded-2xl bg-red-500/10 p-4 text-center">
                              <p className="text-xl font-black text-red-300">
                                {
                                  result.wrong_answers
                                }
                              </p>

                              <p className="text-[10px] font-bold text-red-200/60">
                                WRONG
                              </p>
                            </div>

                            <div className="rounded-2xl bg-amber-500/10 p-4 text-center">
                              <p className="text-xl font-black text-amber-300">
                                {
                                  result.unanswered
                                }
                              </p>

                              <p className="text-[10px] font-bold text-amber-200/60">
                                UNANSWERED
                              </p>
                            </div>

                            <div className="rounded-2xl bg-indigo-500/10 p-4 text-center">
                              <p className="text-xl font-black text-indigo-300">
                                {formatNumber(
                                  result.obtained_marks
                                )}{" "}
                                /{" "}
                                {formatNumber(
                                  result.total_marks
                                )}
                              </p>

                              <p className="text-[10px] font-bold text-indigo-200/60">
                                MARKS
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                            <div className="text-xs text-slate-400">
                              Submission:{" "}
                              <strong className="text-white">
                                {result.submission_type ||
                                  "manual"}
                              </strong>
                            </div>

                            <span
                              className={`rounded-full px-5 py-2 text-xs font-black ${
                                pass
                                  ? "bg-emerald-500/15 text-emerald-300"
                                  : "bg-red-500/15 text-red-300"
                              }`}
                            >
                              {status}
                            </span>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    );
  }

  return null;
}