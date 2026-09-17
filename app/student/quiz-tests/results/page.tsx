"use client";

import {
  Suspense,
  useEffect,
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
  scheduled_date: string | null;
  scheduled_time: string | null;
  duration_minutes: number | null;
  marks_per_question: number | null;
  negative_marks: number | null;
  pass_percentage: number | null;
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

type ResultItem = QuizResult & {
  quiz: Quiz | null;
};

type QuizOption = {
  id: number;
  question_id: number;
  option_text: string;
  option_order: number;
  is_correct: boolean;
};

type QuizQuestion = {
  id: number;
  quiz_id: number;
  question_text: string;
  question_order: number;
  marks: number | null;
  negative_marks: number | null;
};

type QuizAnswer = {
  id?: number;
  result_id: number;
  question_id: number;
  selected_option_id: number | null;
  is_correct: boolean;
  marks_awarded: number;
  answered_at: string | null;
};

type QuestionReview = {
  question: QuizQuestion;
  options: QuizOption[];
  answer: QuizAnswer | null;
  selectedOption: QuizOption | null;
  correctOption: QuizOption | null;
};

type Student = {
  id: number;
  student_name: string | null;
  student_username: string | null;
  class_name: string | null;
};

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

function matchesClass(
  quiz: Quiz,
  studentClass: string
): boolean {
  const currentClass =
    normalizeClass(studentClass);

  if (!currentClass) {
    return false;
  }

  const targets = Array.isArray(
    quiz.target_classes
  )
    ? quiz.target_classes
        .filter(
          (value): value is string =>
            typeof value === "string"
        )
        .map(normalizeClass)
        .filter(Boolean)
    : [];

  if (targets.length > 0) {
    return targets.includes(currentClass);
  }

  return (
    normalizeClass(quiz.class_name) ===
    currentClass
  );
}

function numberText(
  value: number | null | undefined
): string {
  const n = Number(value ?? 0);

  if (!Number.isFinite(n)) {
    return "0";
  }

  return Number.isInteger(n)
    ? String(n)
    : n.toFixed(2);
}

function dateTimeText(
  value: string | null
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dateText(
  value: string | null
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(
    `${value}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function timeText(
  value: string | null
): string {
  if (!value) {
    return "—";
  }

  const parts = value.split(":");

  let hour = Number(parts[0]);

  if (!Number.isFinite(hour)) {
    return value;
  }

  const minute = parts[1] || "00";

  const period =
    hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${minute} ${period}`;
}

/*
 * PDF helpers
 *
 * The PDF generator intentionally uses absolute Tm
 * positioning for every line. This prevents the
 * blank-PDF / text-position issue caused by Td.
 */

function pdfEscape(value: string): string {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ");
}

function pdfSafeText(value: unknown): string {
  const text = String(value ?? "—");

  /*
   * Standard PDF Helvetica does not contain Hindi/
   * Devanagari glyphs. Keep printable Latin characters
   * and replace unsupported characters safely instead
   * of corrupting the PDF structure.
   */
  return text
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);

      if (
        code >= 32 &&
        code <= 126
      ) {
        return char;
      }

      if (
        code >= 160 &&
        code <= 255
      ) {
        return char;
      }

      return "?";
    })
    .join("");
}

function wrapPdfText(
  text: string,
  maxChars = 88
): string[] {
  const safe =
    pdfSafeText(text);

  if (!safe) {
    return [""];
  }

  const words =
    safe.split(/\s+/);

  const lines: string[] = [];

  let current = "";

  words.forEach((word) => {
    if (!word) {
      return;
    }

    if (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = "";
      }

      let remaining = word;

      while (
        remaining.length >
        maxChars
      ) {
        lines.push(
          remaining.slice(
            0,
            maxChars
          )
        );

        remaining =
          remaining.slice(
            maxChars
          );
      }

      current = remaining;
      return;
    }

    const candidate =
      current
        ? `${current} ${word}`
        : word;

    if (
      candidate.length >
      maxChars
    ) {
      if (current) {
        lines.push(current);
      }

      current = word;
    } else {
      current = candidate;
    }
  });

  if (current) {
    lines.push(current);
  }

  return lines.length
    ? lines
    : [""];
}

function createPdfDocument(
  lines: Array<{
    text: string;
    size?: number;
    bold?: boolean;
    gapBefore?: number;
  }>
): Blob {
  const pageWidth = 595;
  const pageHeight = 842;

  const marginLeft = 42;
  const marginTop = 800;
  const bottomLimit = 45;

  const pages: string[][] = [];
  let currentPage: string[] = [];

  let y = marginTop;

  function newPage() {
    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    currentPage = [];
    y = marginTop;
  }

  function addText(
    text: string,
    size: number,
    bold: boolean,
    gapBefore: number
  ) {
    y -= gapBefore;

    const wrapped =
      wrapPdfText(
        text,
        size >= 14
          ? 75
          : 88
      );

    const lineHeight =
      size >= 16
        ? 22
        : size >= 12
          ? 18
          : 15;

    wrapped.forEach(
      (line) => {
        if (
          y <
          bottomLimit
        ) {
          newPage();
        }

        const font =
          bold
            ? "/F2"
            : "/F1";

        currentPage.push(
          `${font} ${size} Tf\n` +
            `1 0 0 1 ${marginLeft} ${y} Tm\n` +
            `(${pdfEscape(
              line
            )}) Tj\n`
        );

        y -= lineHeight;
      }
    );
  }

  lines.forEach(
    (item) => {
      addText(
        item.text,
        item.size || 10,
        Boolean(
          item.bold
        ),
        item.gapBefore || 0
      );
    }
  );

  if (
    currentPage.length > 0
  ) {
    pages.push(
      currentPage
    );
  }

  const objects: string[] = [];

  objects.push(
    "<< /Type /Catalog /Pages 2 0 R >>"
  );

  const pageObjectNumbers: number[] =
    [];

  /*
   * Objects:
   * 1 catalog
   * 2 pages
   * then page/content pairs
   * then fonts
   */

  let objectNumber = 3;

  pages.forEach(() => {
    pageObjectNumbers.push(
      objectNumber
    );

    objectNumber += 2;
  });

  const fontRegularObject =
    objectNumber++;

  const fontBoldObject =
    objectNumber++;

  const pagesKids =
    pageObjectNumbers
      .map(
        (num) =>
          `${num} 0 R`
      )
      .join(" ");

  objects.push(
    `<< /Type /Pages /Kids [${pagesKids}] /Count ${pages.length} >>`
  );

  let pageIndex = 0;

  pages.forEach(
    (pageLines) => {
      const pageObject =
        pageObjectNumbers[
          pageIndex
        ];

      const contentObject =
        pageObject + 1;

      const content =
        pageLines.join("");

      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontRegularObject} 0 R /F2 ${fontBoldObject} 0 R >> >> /Contents ${contentObject} 0 R >>`
      );

      objects.push(
        `<< /Length ${content.length} >>\nstream\n${content}endstream`
      );

      pageIndex++;
    }
  );

  objects.push(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
  );

  objects.push(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
  );

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
        `${index + 1} 0 obj\n` +
        `${object}\n` +
        "endobj\n";
    }
  );

  const xrefOffset =
    pdf.length;

  pdf +=
    `xref\n0 ${objects.length + 1}\n` +
    "0000000000 65535 f \n";

  for (
    let i = 1;
    i < offsets.length;
    i++
  ) {
    pdf += `${String(
      offsets[i]
    ).padStart(
      10,
      "0"
    )} 00000 n \n`;
  }

  pdf +=
    `trailer\n<< /Size ${
      objects.length + 1
    } /Root 1 0 R >>\n` +
    `startxref\n${xrefOffset}\n` +
    "%%EOF";

  return new Blob(
    [pdf],
    {
      type: "application/pdf",
    }
  );
}

function downloadPdfBlob(
  blob: Blob,
  fileName: string
) {
  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement(
      "a"
    );

  anchor.href = url;
  anchor.download =
    fileName;

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

function buildPdfLines(
  studentName: string,
  studentClass: string,
  quiz: Quiz,
  result: QuizResult,
  questionReviews: QuestionReview[]
): Array<{
  text: string;
  size?: number;
  bold?: boolean;
  gapBefore?: number;
}> {
  const passed =
    String(
      result.result_status
    ).toUpperCase() ===
    "PASS";

  const lines: Array<{
    text: string;
    size?: number;
    bold?: boolean;
    gapBefore?: number;
  }> = [];

  lines.push({
    text: "RACER ACADEMY",
    size: 18,
    bold: true,
  });

  lines.push({
    text: "STUDENT QUIZ RESULT",
    size: 14,
    bold: true,
    gapBefore: 5,
  });

  lines.push({
    text: "==============================================",
    size: 9,
    gapBefore: 5,
  });

  lines.push({
    text: `Student Name: ${studentName || "—"}`,
    size: 11,
    bold: true,
    gapBefore: 10,
  });

  lines.push({
    text: `Class: ${studentClass || "—"}`,
    size: 11,
  });

  lines.push({
    text: `Quiz: ${quiz.title || `Quiz #${quiz.id}`}`,
    size: 11,
    bold: true,
    gapBefore: 8,
  });

  lines.push({
    text: `Subject: ${quiz.subject || "—"}`,
    size: 10,
  });

  lines.push({
    text: `Quiz Date: ${dateText(
      quiz.scheduled_date
    )}`,
    size: 10,
  });

  lines.push({
    text: `Start Time: ${timeText(
      quiz.scheduled_time
    )}`,
    size: 10,
  });

  lines.push({
    text: `Duration: ${
      quiz.duration_minutes || 30
    } Minutes`,
    size: 10,
  });

  lines.push({
    text: "----------------------------------------------",
    size: 9,
    gapBefore: 8,
  });

  lines.push({
    text: `Result: ${
      passed
        ? "PASSED"
        : "FAILED"
    }`,
    size: 13,
    bold: true,
    gapBefore: 8,
  });

  lines.push({
    text: `Percentage: ${numberText(
      result.percentage
    )}%`,
    size: 11,
    bold: true,
  });

  lines.push({
    text: `Obtained Marks: ${numberText(
      result.obtained_marks
    )} / ${numberText(
      result.total_marks
    )}`,
    size: 11,
    bold: true,
  });

  lines.push({
    text: `Total Questions: ${numberText(
      result.total_questions
    )}`,
    size: 10,
  });

  lines.push({
    text: `Correct Answers: ${numberText(
      result.correct_answers
    )}`,
    size: 10,
  });

  lines.push({
    text: `Wrong Answers: ${numberText(
      result.wrong_answers
    )}`,
    size: 10,
  });

  lines.push({
    text: `Unanswered: ${numberText(
      result.unanswered
    )}`,
    size: 10,
  });

  lines.push({
    text: `Pass Percentage: ${numberText(
      quiz.pass_percentage
    )}%`,
    size: 10,
  });

  lines.push({
    text: "----------------------------------------------",
    size: 9,
    gapBefore: 8,
  });

  lines.push({
    text: "SUBMISSION DETAILS",
    size: 13,
    bold: true,
    gapBefore: 8,
  });

  lines.push({
    text: `Started At: ${dateTimeText(
      result.started_at
    )}`,
    size: 10,
  });

  lines.push({
    text: `Submitted At: ${dateTimeText(
      result.submitted_at
    )}`,
    size: 10,
  });

  lines.push({
    text: `Submission Type: ${
      result.submission_type ||
      "MANUAL SUBMISSION"
    }`,
    size: 10,
  });

  lines.push({
    text: "----------------------------------------------",
    size: 9,
    gapBefore: 8,
  });

  lines.push({
    text: "QUESTION-WISE ANSWER REPORT",
    size: 13,
    bold: true,
    gapBefore: 8,
  });

  if (
    questionReviews.length === 0
  ) {
    lines.push({
      text: "Question-wise answer review is not available.",
      size: 10,
      gapBefore: 8,
    });
  } else {
    questionReviews.forEach(
      (
        review,
        index
      ) => {
        const answer =
          review.answer;

        const unanswered =
          !answer ||
          answer.selected_option_id ===
            null ||
          !review.selectedOption;

        const correct =
          Boolean(
            answer?.is_correct
          ) &&
          !unanswered;

        const status =
          correct
            ? "CORRECT"
            : unanswered
              ? "NOT ANSWERED"
              : "WRONG";

        lines.push({
          text: `Question ${
            index + 1
          }: ${status}`,
          size: 11,
          bold: true,
          gapBefore: 12,
        });

        lines.push({
          text: `Q: ${review.question.question_text}`,
          size: 10,
          gapBefore: 4,
        });

        lines.push({
          text: `Your Answer: ${
            review.selectedOption
              ?.option_text ||
            "Not Answered"
          }`,
          size: 10,
          gapBefore: 4,
        });

        lines.push({
          text: `Correct Answer: ${
            review.correctOption
              ?.option_text ||
            "Unavailable"
          }`,
          size: 10,
        });

        lines.push({
          text: `Marks Obtained: ${numberText(
            answer?.marks_awarded ||
              0
          )}`,
          size: 10,
        });

        if (
          review.options.length >
          0
        ) {
          review.options.forEach(
            (option) => {
              const letter =
                String.fromCharCode(
                  65 +
                    Math.max(
                      0,
                      Number(
                        option.option_order
                      ) - 1
                    )
                );

              let marker = "";

              if (
                option.is_correct
              ) {
                marker =
                  " [CORRECT]";
              } else if (
                Number(
                  answer
                    ?.selected_option_id
                ) ===
                Number(
                  option.id
                )
              ) {
                marker =
                  " [YOUR ANSWER]";
              }

              lines.push({
                text: `Option ${letter}: ${option.option_text}${marker}`,
                size: 9,
                gapBefore: 2,
              });
            }
          );
        }
      }
    );
  }

  lines.push({
    text: "----------------------------------------------",
    size: 9,
    gapBefore: 12,
  });

  lines.push({
    text: "RACER ACADEMY • Quiz Result",
    size: 9,
    gapBefore: 8,
  });

  return lines;
}

function downloadResultPdf(
  studentName: string,
  studentClass: string,
  quiz: Quiz,
  result: QuizResult,
  questionReviews: QuestionReview[] = []
) {
  const lines =
    buildPdfLines(
      studentName,
      studentClass,
      quiz,
      result,
      questionReviews
    );

  const blob =
    createPdfDocument(
      lines
    );

  const safeTitle =
    pdfSafeText(
      quiz.title ||
        `Quiz-${quiz.id}`
    )
      .replace(
        /[^a-zA-Z0-9-_]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );

  const safeName =
    pdfSafeText(
      studentName ||
        "Student"
    )
      .replace(
        /[^a-zA-Z0-9-_]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );

  downloadPdfBlob(
    blob,
    `RACER-ACADEMY-${safeName}-${safeTitle}-RESULT.pdf`
  );
}

function ResultsContent() {
  const router = useRouter();

  const searchParams =
    useSearchParams();

  const quizIdParam =
    searchParams.get("quizId");

  const parsedQuizId =
    Number(quizIdParam);

  const isDetail =
    Number.isFinite(parsedQuizId) &&
    parsedQuizId > 0;

  const [studentName, setStudentName] =
    useState("");

  const [studentClass, setStudentClass] =
    useState("");

  const [results, setResults] =
    useState<ResultItem[]>([]);

  const [selectedQuiz, setSelectedQuiz] =
    useState<Quiz | null>(null);

  const [selectedResult, setSelectedResult] =
    useState<QuizResult | null>(null);

  const [questionReviews, setQuestionReviews] =
    useState<QuestionReview[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [reviewLoading, setReviewLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadPage();
  }, [quizIdParam]);

  async function getStudent() {
    const storedUsername =
      (
        localStorage.getItem(
          "student_username"
        ) ||
        localStorage.getItem(
          "studentUsername"
        ) ||
        localStorage.getItem(
          "student_username_login"
        ) ||
        ""
      ).trim();

    const storedId =
      localStorage.getItem(
        "attendance_student_id"
      ) ||
      localStorage.getItem(
        "studentId"
      ) ||
      localStorage.getItem(
        "student_id"
      );

    let currentStudent:
      | Student
      | null = null;

    if (storedUsername) {
      const {
        data,
        error: usernameError,
      } = await supabase
        .from("students")
        .select(
          "id,student_name,student_username,class_name"
        )
        .eq(
          "student_username",
          storedUsername
        )
        .maybeSingle();

      if (usernameError) {
        console.error(
          "Student username lookup error:",
          usernameError
        );
      }

      if (data) {
        currentStudent =
          data as Student;
      }
    }

    if (
      !currentStudent &&
      !storedUsername &&
      storedId
    ) {
      const numericId =
        Number(storedId);

      if (
        Number.isFinite(numericId) &&
        numericId > 0
      ) {
        const {
          data,
          error: idError,
        } = await supabase
          .from("students")
          .select(
            "id,student_name,student_username,class_name"
          )
          .eq(
            "id",
            numericId
          )
          .maybeSingle();

        if (idError) {
          console.error(
            "Student ID lookup error:",
            idError
          );
        }

        if (data) {
          currentStudent =
            data as Student;
        }
      }
    }

    if (!currentStudent) {
      throw new Error(
        "Student login information not found. Please login again."
      );
    }

    const actualStudentId =
      Number(currentStudent.id);

    if (
      !Number.isFinite(
        actualStudentId
      ) ||
      actualStudentId <= 0
    ) {
      throw new Error(
        "Invalid student account. Please login again."
      );
    }

    const actualStudentUsername =
      (
        currentStudent.student_username ||
        storedUsername
      ).trim();

    const actualStudentName =
      currentStudent.student_name ||
      localStorage.getItem(
        "attendance_student_name"
      ) ||
      localStorage.getItem(
        "studentName"
      ) ||
      localStorage.getItem(
        "student_name"
      ) ||
      "";

    const actualStudentClass =
      normalizeClass(
        currentStudent.class_name
      );

    localStorage.setItem(
      "attendance_student_id",
      String(actualStudentId)
    );

    localStorage.setItem(
      "studentId",
      String(actualStudentId)
    );

    localStorage.setItem(
      "student_id",
      String(actualStudentId)
    );

    if (actualStudentUsername) {
      localStorage.setItem(
        "student_username",
        actualStudentUsername
      );

      localStorage.setItem(
        "studentUsername",
        actualStudentUsername
      );

      localStorage.setItem(
        "student_username_login",
        actualStudentUsername
      );
    }

    if (actualStudentName) {
      localStorage.setItem(
        "attendance_student_name",
        actualStudentName
      );

      localStorage.setItem(
        "studentName",
        actualStudentName
      );

      localStorage.setItem(
        "student_name",
        actualStudentName
      );
    }

    return {
      id: actualStudentId,
      name: actualStudentName,
      className: actualStudentClass,
      username:
        actualStudentUsername,
    };
  }

  async function loadPage() {
    setLoading(true);
    setError("");

    setQuestionReviews([]);
    setSelectedResult(null);
    setSelectedQuiz(null);
    setResults([]);

    try {
      const student =
        await getStudent();

      setStudentName(
        student.name
      );

      setStudentClass(
        student.className
      );

      if (isDetail) {
        await loadSingleResult(
          student.id,
          student.className,
          parsedQuizId
        );
      } else {
        await loadAllResults(
          student.id,
          student.className
        );
      }
    } catch (loadError) {
      console.error(
        "Results page error:",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load results."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadAllResults(
    studentId: number,
    currentClass: string
  ) {
    const {
      data: resultData,
      error: resultError,
    } = await supabase
      .from("quiz_results")
      .select("*")
      .eq(
        "student_id",
        studentId
      )
      .order(
        "submitted_at",
        {
          ascending: false,
        }
      );

    if (resultError) {
      throw new Error(
        resultError.message
      );
    }

    const rawResults =
      (resultData ||
        []) as QuizResult[];

    if (rawResults.length === 0) {
      setResults([]);
      return;
    }

    const quizIds =
      Array.from(
        new Set(
          rawResults
            .map((item) =>
              Number(item.quiz_id)
            )
            .filter(
              (id) =>
                Number.isFinite(id) &&
                id > 0
            )
        )
      );

    if (quizIds.length === 0) {
      setResults([]);
      return;
    }

    const {
      data: quizData,
      error: quizError,
    } = await supabase
      .from("quiz_tests")
      .select(
        "id,title,description,class_name,target_classes,subject,scheduled_date,scheduled_time,duration_minutes,marks_per_question,negative_marks,pass_percentage"
      )
      .in(
        "id",
        quizIds
      );

    if (quizError) {
      throw new Error(
        quizError.message
      );
    }

    const quizMap =
      new Map<number, Quiz>();

    (
      (quizData ||
        []) as Quiz[]
    ).forEach((quiz) => {
      quizMap.set(
        Number(quiz.id),
        quiz
      );
    });

    const combined =
      rawResults
        .map((result) => ({
          ...result,
          quiz:
            quizMap.get(
              Number(result.quiz_id)
            ) || null,
        }))
        .filter((item) => {
          if (
            item.quiz &&
            currentClass
          ) {
            return matchesClass(
              item.quiz,
              currentClass
            );
          }

          return true;
        });

    setResults(combined);
  }

  async function loadSingleResult(
    studentId: number,
    currentClass: string,
    quizId: number
  ) {
    const {
      data: quizData,
      error: quizError,
    } = await supabase
      .from("quiz_tests")
      .select(
        "id,title,description,class_name,target_classes,subject,scheduled_date,scheduled_time,duration_minutes,marks_per_question,negative_marks,pass_percentage"
      )
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

    const quiz =
      quizData as Quiz;

    if (
      currentClass &&
      !matchesClass(
        quiz,
        currentClass
      )
    ) {
      throw new Error(
        "This quiz result does not belong to your assigned class."
      );
    }

    setSelectedQuiz(quiz);

    const {
      data: resultData,
      error: resultError,
    } = await supabase
      .from("quiz_results")
      .select("*")
      .eq(
        "quiz_id",
        Number(quizId)
      )
      .eq(
        "student_id",
        Number(studentId)
      )
      .order(
        "submitted_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

    if (resultError) {
      throw new Error(
        resultError.message
      );
    }

    const result =
      (resultData ||
        null) as QuizResult | null;

    if (!result) {
      throw new Error(
        "Result not found for this student."
      );
    }

    if (
      Number(result.student_id) !==
      Number(studentId)
    ) {
      throw new Error(
        "This result does not belong to the logged-in student."
      );
    }

    setSelectedResult(
      result
    );

    await loadQuestionReview(
      Number(result.id),
      Number(result.quiz_id)
    );
  }

  async function loadQuestionReview(
    resultId: number,
    quizId: number
  ) {
    setReviewLoading(true);

    try {
      const {
        data: answerData,
        error: answerError,
      } = await supabase
        .from("quiz_answers")
        .select(
          "id,result_id,question_id,selected_option_id,is_correct,marks_awarded,answered_at"
        )
        .eq(
          "result_id",
          resultId
        );

      if (answerError) {
        console.error(
          "Quiz answers load error:",
          answerError
        );

        setQuestionReviews([]);
        return;
      }

      const answers =
        (answerData ||
          []) as QuizAnswer[];

      const {
        data: questionData,
        error: questionError,
      } = await supabase
        .from("quiz_questions")
        .select(
          "id,quiz_id,question_text,question_order,marks,negative_marks"
        )
        .eq(
          "quiz_id",
          quizId
        )
        .order(
          "question_order",
          {
            ascending: true,
          }
        );

      if (questionError) {
        console.error(
          "Quiz questions load error:",
          questionError
        );

        setQuestionReviews([]);
        return;
      }

      const questions =
        (questionData ||
          []) as QuizQuestion[];

      if (questions.length === 0) {
        setQuestionReviews([]);
        return;
      }

      const questionIds =
        questions.map(
          (question) =>
            Number(question.id)
        );

      const {
        data: optionData,
        error: optionError,
      } = await supabase
        .from("quiz_options")
        .select(
          "id,question_id,option_text,option_order,is_correct"
        )
        .in(
          "question_id",
          questionIds
        )
        .order(
          "option_order",
          {
            ascending: true,
          }
        );

      if (optionError) {
        console.error(
          "Quiz options load error:",
          optionError
        );

        setQuestionReviews([]);
        return;
      }

      const options =
        (optionData ||
          []) as QuizOption[];

      const answerMap =
        new Map<
          number,
          QuizAnswer
        >();

      answers.forEach(
        (answer) => {
          answerMap.set(
            Number(
              answer.question_id
            ),
            answer
          );
        }
      );

      const optionMap =
        new Map<
          number,
          QuizOption[]
        >();

      options.forEach(
        (option) => {
          const questionId =
            Number(
              option.question_id
            );

          const existing =
            optionMap.get(
              questionId
            ) || [];

          existing.push(
            option
          );

          optionMap.set(
            questionId,
            existing
          );
        }
      );

      const review =
        questions.map(
          (question) => {
            const questionId =
              Number(
                question.id
              );

            const questionOptions =
              optionMap.get(
                questionId
              ) || [];

            const answer =
              answerMap.get(
                questionId
              ) || null;

            const selectedOption =
              answer &&
              answer.selected_option_id !==
                null
                ? questionOptions.find(
                    (option) =>
                      Number(
                        option.id
                      ) ===
                      Number(
                        answer.selected_option_id
                      )
                  ) || null
                : null;

            const correctOption =
              questionOptions.find(
                (option) =>
                  option.is_correct ===
                  true
              ) || null;

            return {
              question,
              options:
                questionOptions,
              answer,
              selectedOption,
              correctOption,
            };
          }
        );

      setQuestionReviews(
        review
      );
    } catch (reviewError) {
      console.error(
        "Question review error:",
        reviewError
      );

      setQuestionReviews([]);
    } finally {
      setReviewLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-indigo-500" />

          <h1 className="text-xl font-black">
            Loading Results...
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Please wait.
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-2xl rounded-3xl border border-red-400/20 bg-red-500/10 p-8 text-center">

          <h1 className="text-2xl font-black">
            Unable to Load Result
          </h1>

          <p className="mt-3 text-sm leading-6 text-red-200">
            {error}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">

            <button
              onClick={() =>
                router.push(
                  "/student/quiz-tests/results"
                )
              }
              className="rounded-xl bg-indigo-600 px-6 py-3 font-black hover:bg-indigo-500"
            >
              VIEW ALL RESULTS
            </button>

            <button
              onClick={() =>
                router.push(
                  "/student/quiz-tests"
                )
              }
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-black hover:bg-white/10"
            >
              ← QUIZ TESTS
            </button>

          </div>

        </div>
      </main>
    );
  }

  if (!isDetail) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">

          <header className="border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">

              <div>
                <h1 className="text-lg font-black sm:text-xl">
                  RACER ACADEMY
                </h1>

                <p className="text-xs text-slate-400">
                  QUIZ RESULTS
                  {studentClass
                    ? ` • CLASS ${studentClass}`
                    : ""}
                </p>
              </div>

              <div className="flex flex-wrap justify-end gap-2">

                <button
                  onClick={() =>
                    router.back()
                  }
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10"
                >
                  ← Back
                </button>

                <button
                  onClick={() =>
                    router.push(
                      "/student/dashboard"
                    )
                  }
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black hover:bg-indigo-500"
                >
                  Dashboard
                </button>

                <button
                  onClick={() =>
                    router.push(
                      "/student/quiz-tests"
                    )
                  }
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10"
                >
                  ← Quiz Tests
                </button>

              </div>

            </div>
          </header>

          <div className="mx-auto max-w-6xl px-4 py-8">

            <div className="mb-7">
              <p className="text-xs font-black tracking-[0.25em] text-indigo-400">
                PERFORMANCE
              </p>

              <h2 className="mt-2 text-3xl font-black sm:text-4xl">
                My Quiz Results
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Results of all quizzes you have completed.
              </p>

              {studentName && (
                <p className="mt-2 text-sm text-slate-500">
                  Student:{" "}
                  <strong className="text-slate-300">
                    {studentName}
                  </strong>
                </p>
              )}
            </div>

            {results.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-12 text-center">

                <div className="text-5xl">
                  RESULTS
                </div>

                <h3 className="mt-5 text-xl font-black">
                  No Quiz Results Yet
                </h3>

                <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-400">
                  Your marks will appear here automatically
                  after you complete and submit a quiz.
                </p>

                <button
                  onClick={() =>
                    router.push(
                      "/student/quiz-tests/available"
                    )
                  }
                  className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-black hover:bg-indigo-500"
                >
                  VIEW AVAILABLE QUIZZES
                </button>

              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">

                {results.map(
                  (
                    item,
                    index
                  ) => {
                    const passed =
                      String(
                        item.result_status
                      ).toUpperCase() ===
                      "PASS";

                    return (
                      <div
                        key={
                          item.id ||
                          `${item.quiz_id}-${index}`
                        }
                        className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-xl backdrop-blur-xl"
                      >

                        <div
                          className={`p-5 ${
                            passed
                              ? "bg-emerald-500/10"
                              : "bg-red-500/10"
                          }`}
                        >

                          <div className="flex items-start justify-between gap-4">

                            <div className="min-w-0">
                              <p className="text-[10px] font-black tracking-[0.2em] text-slate-500">
                                COMPLETED QUIZ
                              </p>

                              <h3 className="mt-2 text-xl font-black">
                                {item.quiz?.title ||
                                  `Quiz #${item.quiz_id}`}
                              </h3>

                              {item.quiz?.subject && (
                                <p className="mt-1 text-sm text-slate-400">
                                  {item.quiz.subject}
                                </p>
                              )}
                            </div>

                            <span
                              className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black ${
                                passed
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-red-500/20 text-red-300"
                              }`}
                            >
                              {passed
                                ? "PASS"
                                : "FAIL"}
                            </span>

                          </div>

                          <div className="mt-6 grid grid-cols-2 gap-3">

                            <div className="rounded-xl bg-white/5 p-4">
                              <p className="text-[9px] font-bold text-slate-500">
                                PERCENTAGE
                              </p>

                              <p className="mt-1 text-2xl font-black">
                                {numberText(
                                  item.percentage
                                )}
                                %
                              </p>
                            </div>

                            <div className="rounded-xl bg-white/5 p-4">
                              <p className="text-[9px] font-bold text-slate-500">
                                MARKS
                              </p>

                              <p className="mt-1 text-2xl font-black">
                                {numberText(
                                  item.obtained_marks
                                )}{" "}
                                /{" "}
                                {numberText(
                                  item.total_marks
                                )}
                              </p>
                            </div>

                          </div>

                        </div>

                        <div className="p-5">

                          <div className="grid grid-cols-3 gap-2">

                            <div className="rounded-xl bg-emerald-500/10 p-3 text-center">
                              <p className="text-lg font-black text-emerald-300">
                                {item.correct_answers}
                              </p>

                              <p className="text-[9px] font-bold text-emerald-200/60">
                                CORRECT
                              </p>
                           
</div>

                            <div className="rounded-xl bg-red-500/10 p-3 text-center">
                              <p className="text-lg font-black text-red-300">
                                {item.wrong_answers}
                              </p>

                              <p className="text-[9px] font-bold text-red-200/60">
                                WRONG
                              </p>
                            </div>

                            <div className="rounded-xl bg-amber-500/10 p-3 text-center">
                              <p className="text-lg font-black text-amber-300">
                                {item.unanswered}
                              </p>

                              <p className="text-[9px] font-bold text-amber-200/60">
                                SKIPPED
                              </p>
                            </div>

                          </div>

                          <div className="mt-4 rounded-xl bg-white/5 p-3">
                            <p className="text-[9px] font-bold text-slate-500">
                              SUBMITTED
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-300">
                              {dateTimeText(
                                item.submitted_at ||
                                  item.created_at
                              )}
                            </p>
                          </div>

                          <button
                            onClick={() =>
                              router.push(
                                `/student/quiz-tests/results?quizId=${item.quiz_id}`
                              )
                            }
                            className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 font-black hover:bg-indigo-500"
                          >
                            VIEW FULL RESULT →
                          </button>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>
            )}

            <div className="mt-6">
              <button
                onClick={() =>
                  router.push(
                    "/student/quiz-tests/history"
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-black hover:bg-white/10"
              >
                VIEW QUIZ HISTORY →
              </button>
            </div>

          </div>
        </div>
      </main>
    );
  }

  const result =
    selectedResult;

  const quiz =
    selectedQuiz;

  if (!result || !quiz) {
    return null;
  }

  const passed =
    String(
      result.result_status
    ).toUpperCase() ===
    "PASS";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">

        <header className="border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">

            <div>
              <h1 className="text-lg font-black">
                RACER ACADEMY
              </h1>

              <p className="text-xs text-slate-400">
                FULL QUIZ RESULT
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2">

              <button
                onClick={() =>
                  router.back()
                }
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10"
              >
                ← Back
              </button>

              <button
                onClick={() =>
                  router.push(
                    "/student/dashboard"
                  )
                }
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black hover:bg-indigo-500"
              >
                Dashboard
              </button>

              <button
                onClick={() =>
                  router.push(
                    "/student/quiz-tests/results"
                  )
                }
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10"
              >
                ← All Results
              </button>

            </div>

          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-8">

          <section
            className={`rounded-3xl border p-7 text-center ${
              passed
                ? "border-emerald-400/20 bg-emerald-500/10"
                : "border-red-400/20 bg-red-500/10"
            }`}
          >

            <p className="text-xs font-black tracking-[0.25em] text-slate-400">
              QUIZ RESULT
            </p>

            <h2 className="mt-3 text-3xl font-black">
              {quiz.title}
            </h2>

            {quiz.subject && (
              <p className="mt-2 text-sm text-slate-400">
                {quiz.subject}
              </p>
            )}

            <div className="mx-auto mt-7 flex h-44 w-44 items-center justify-center rounded-full border-[12px] border-indigo-500/30 bg-slate-950/70">

              <div>
                <div className="text-4xl font-black">
                  {numberText(
                    result.percentage
                  )}
                  %
                </div>

                <p className="text-xs font-bold text-slate-500">
                  SCORE
                </p>
              </div>

            </div>

            <div className="mt-6">
              <span
                className={`inline-block rounded-full px-7 py-3 text-lg font-black ${
                  passed
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-red-500/20 text-red-300"
                }`}
              >
                {passed
                  ? "PASSED"
                  : "FAILED"}
              </span>
            </div>

            {studentName && (
              <p className="mt-5 text-sm text-slate-400">
                Student:{" "}
                <strong className="text-white">
                  {studentName}
                </strong>
              </p>
            )}

          </section>

          <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
              <p className="text-3xl font-black">
                {numberText(
                  result.total_questions
                )}
              </p>

              <p className="mt-1 text-[10px] font-bold text-slate-500">
                QUESTIONS
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-500/10 p-5 text-center">
              <p className="text-3xl font-black text-emerald-300">
                {result.correct_answers}
              </p>

              <p className="mt-1 text-[10px] font-bold text-emerald-200/60">
                CORRECT
              </p>
            </div>

            <div className="rounded-2xl bg-red-500/10 p-5 text-center">
              <p className="text-3xl font-black text-red-300">
                {result.wrong_answers}
              </p>

              <p className="mt-1 text-[10px] font-bold text-red-200/60">
                WRONG
              </p>
            </div>

            <div className="rounded-2xl bg-amber-500/10 p-5 text-center">
              <p className="text-3xl font-black text-amber-300">
                {result.unanswered}
              </p>

              <p className="mt-1 text-[10px] font-bold text-amber-200/60">
                SKIPPED
              </p>
            </div>

          </section>

          <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">

            <h3 className="text-xl font-black">
              Marks Summary
            </h3>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">

              <div className="rounded-2xl bg-slate-900/70 p-5">
                <p className="text-xs font-bold text-slate-500">
                  TOTAL MARKS
                </p>

                <p className="mt-2 text-3xl font-black">
                  {numberText(
                    result.total_marks
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-indigo-500/10 p-5">
                <p className="text-xs font-bold text-indigo-300">
                  OBTAINED MARKS
                </p>

                <p className="mt-2 text-3xl font-black text-indigo-300">
                  {numberText(
                    result.obtained_marks
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-500/10 p-5">
                <p className="text-xs font-bold text-emerald-300">
                  PERCENTAGE
                </p>

                <p className="mt-2 text-3xl font-black text-emerald-300">
                  {numberText(
                    result.percentage
                  )}
                  %
                </p>
              </div>

            </div>

            <div className="mt-6 h-4 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full ${
                  passed
                    ? "bg-emerald-500"
                    : "bg-red-500"
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      Number(
                        result.percentage ||
                          0
                      )
                    )
                  )}%`,
                }}
              />
            </div>

          </section>

          <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <p className="text-xs font-black tracking-[0.2em] text-indigo-400">
                  ANSWER REVIEW
                </p>

                <h3 className="mt-1 text-2xl font-black">
                  Question-wise Answer Report
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Your complete submitted answer history is
                  shown below. Every question shows your answer,
                  the correct answer and the marks obtained.
                </p>
              </div>

              <div className="rounded-xl bg-indigo-500/10 px-4 py-3 text-center">
                <p className="text-[10px] font-bold text-indigo-300">
                  TOTAL QUESTIONS
                </p>

                <p className="text-xl font-black">
                  {questionReviews.length ||
                    result.total_questions}
                </p>
              </div>

            </div>

            {reviewLoading ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center">

                <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-indigo-500" />

                <p className="font-bold">
                  Loading Answer Review...
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  Preparing your complete question-wise report.
                </p>

              </div>
            ) : questionReviews.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-slate-900/60 p-8 text-center">

                <p className="font-black">
                  Answer review is not available.
                </p>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Your score is available above.
                </p>

              </div>
            ) : (
              <div className="mt-6 space-y-5">

                {questionReviews.map(
                  (
                    review,
                    index
                  ) => {

                    const answer =
                      review.answer;

                    const isUnanswered =
                      !answer ||
                      answer.selected_option_id ===
                        null ||
                      !review.selectedOption;

                    const isCorrect =
                      Boolean(
                        answer?.is_correct
                      ) &&
                      !isUnanswered;

                    const isWrong =
                      !isUnanswered &&
                      !isCorrect;

                    const statusText =
                      isCorrect
                        ? "CORRECT"
                        : isWrong
                          ? "WRONG"
                          : "NOT ANSWERED";

                    const statusClass =
                      isCorrect
                        ? "border-emerald-400/20 bg-emerald-500/10"
                        : isWrong
                          ? "border-red-400/20 bg-red-500/10"
                          : "border-amber-400/20 bg-amber-500/10";

                    const badgeClass =
                      isCorrect
                        ? "bg-emerald-500/20 text-emerald-300"
                        : isWrong
                          ? "bg-red-500/20 text-red-300"
                          : "bg-amber-500/20 text-amber-300";

                    return (
                      <article
                        key={
                          review.question.id
                        }
                        className={`overflow-hidden rounded-2xl border ${statusClass}`}
                      >

                        <div className="border-b border-white/10 p-5">

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                            <div className="flex gap-3">

                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-black">
                                {index + 1}
                              </div>

                              <div>
                                <p className="text-[10px] font-black tracking-[0.15em] text-slate-500">
                                  QUESTION {index + 1}
                                </p>

                                <h4 className="mt-2 text-base font-black leading-7 sm:text-lg">
                                  {review.question.question_text}
                                </h4>
                              </div>

                            </div>

                            <span
                              className={`shrink-0 self-start rounded-full px-3 py-1.5 text-[10px] font-black ${badgeClass}`}
                            >
                              {statusText}
                            </span>

                          </div>

                        </div>

                        <div className="grid gap-4 p-5 md:grid-cols-2">

                          <div
                            className={`rounded-2xl p-4 ${
                              isCorrect
                                ? "bg-emerald-500/10"
                                : isWrong
                                  ? "bg-red-500/10"
                                  : "bg-amber-500/10"
                            }`}
                          >

                            <p
                              className={`text-[10px] font-black tracking-[0.15em] ${
                                isCorrect
                                  ? "text-emerald-300"
                                  : isWrong
                                    ? "text-red-300"
                                    : "text-amber-300"
                              }`}
                            >
                              YOUR ANSWER
                            </p>

                            {review.selectedOption ? (
                              <div className="mt-3 flex items-start gap-3">

                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-black">
                                  {String.fromCharCode(
                                    65 +
                                      Math.max(
                                        0,
                                        Number(
                                          review.selectedOption.option_order
                                        ) - 1
                                      )
                                  )}
                                </div>

                                <p className="text-sm font-bold leading-6">
                                  {
                                    review
                                      .selectedOption
                                      .option_text
                                  }
                                </p>

                              </div>
                            ) : (
                              <p className="mt-3 text-sm font-bold text-amber-200">
                                Not Answered
                              </p>
                            )}

                          </div>

                          <div className="rounded-2xl bg-emerald-500/10 p-4">

                            <p className="text-[10px] font-black tracking-[0.15em] text-emerald-300">
                              CORRECT ANSWER
                            </p>

                            {review.correctOption ? (
                              <div className="mt-3 flex items-start gap-3">

                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-black text-emerald-300">
                                  {String.fromCharCode(
                                    65 +
                                      Math.max(
                                        0,
                                        Number(
                                          review.correctOption.option_order
                                        ) - 1
                                      )
                                  )}
                                </div>

                                <p className="text-sm font-bold leading-6 text-emerald-100">
                                  {
                                    review
                                      .correctOption
                                      .option_text
                                  }
                                </p>

                              </div>
                            ) : (
                              <p className="mt-3 text-sm font-bold text-slate-500">
                                Correct answer unavailable
                              </p>
                            )}

                          </div>

                        </div>

                        <div className="border-t border-white/10 px-5 py-4">

                          <div className="flex flex-wrap items-center justify-between gap-3">

                            <div className="flex flex-wrap gap-2">

                              {review.options.map(
                                (
                                  option
                                ) => {

                                  const selected =
                                    Number(
                                      review
                                        .answer
                                        ?.selected_option_id
                                    ) ===
                                    Number(
                                      option.id
                                    );

                                  const correct =
                                    option.is_correct ===
                                    true;

                                  return (
                                    <span
                                      key={
                                        option.id
                                      }
                                      className={`rounded-lg border px-3 py-1.5 text-[10px] font-bold ${
                                        correct
                                          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                                          : selected
                                            ? "border-red-400/30 bg-red-500/10 text-red-300"
                                            : "border-white/10 bg-white/5 text-slate-500"
                                      }`}
                                    >
                                      {String.fromCharCode(
                                        65 +
                                          Math.max(
                                            0,
                                            Number(
                                              option.option_order
                                            ) - 1
                                          )
                                      )}

                                      {correct
                                        ? " • Correct"
                                        : selected
                                          ? " • Your Answer"
                                          : ""}
                                    </span>
                                  );
                                }
                              )}

                            </div>

                            <div className="rounded-xl bg-slate-950/60 px-4 py-2">

                              <span className="text-[10px] font-bold text-slate-500">
                                MARKS
                              </span>

                              <strong
                                className={`ml-2 text-sm ${
                                  Number(
                                    answer?.marks_awarded ||
                                      0
                                  ) > 0
                                    ? "text-emerald-300"
                                    : Number(
                                          answer?.marks_awarded ||
                                            0
                                        ) < 0
                                      ? "text-red-300"
                                      : "text-slate-300"
                                }`}
                              >
                                {numberText(
                                  answer?.marks_awarded ||
                                    0
                                )}
                              </strong>

                            </div>

                          </div>

                        </div>

                      </article>
                    );
                  }
                )}

              </div>
            )}

          </section>

          <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">

            <h3 className="text-xl font-black">
              Quiz Information
            </h3>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">

              <div className="rounded-xl bg-slate-900/70 p-4">
                <p className="text-[10px] font-bold text-slate-500">
                  CLASS
                </p>

                <p className="mt-1 font-black">
                  {quiz.class_name
                    ? `Class ${normalizeClass(
                        quiz.class_name
                      )}`
                    : studentClass
                      ? `Class ${studentClass}`
                      : "—"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-900/70 p-4">
                <p className="text-[10px] font-bold text-slate-500">
                  SUBJECT
                </p>

                <p className="mt-1 font-black">
                  {quiz.subject || "—"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-900/70 p-4">
                <p className="text-[10px] font-bold text-slate-500">
                  PASS PERCENTAGE
                </p>

                <p className="mt-1 font-black">
                  {numberText(
                    quiz.pass_percentage
                  )}
                  %
                </p>
              </div>

              <div className="rounded-xl bg-slate-900/70 p-4">
                <p className="text-[10px] font-bold text-slate-500">
                  DURATION
                </p>

                <p className="mt-1 font-black">
                  {quiz.duration_minutes ||
                    30}{" "}
                  Minutes
                </p>
              </div>

              <div className="rounded-xl bg-slate-900/70 p-4">
                <p className="text-[10px] font-bold text-slate-500">
                  QUIZ DATE
                </p>

                <p className="mt-1 font-black">
                  {dateText(
                    quiz.scheduled_date
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-900/70 p-4">
                <p className="text-[10px] font-bold text-slate-500">
                  START TIME
                </p>

                <p className="mt-1 font-black">
                  {timeText(
                    quiz.scheduled_time
                  )}
                </p>
              </div>

            </div>

          </section>

          <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">

            <h3 className="text-xl font-black">
              Submission Details
            </h3>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">

              <div className="rounded-xl bg-slate-900/70 p-4">
                <p className="text-[10px] font-bold text-slate-500">
                  STARTED AT
                </p>

                <p className="mt-1 text-sm font-bold">
                  {dateTimeText(
                    result.started_at
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-900/70 p-4">
                <p className="text-[10px] font-bold text-slate-500">
                  SUBMITTED AT
                </p>

                <p className="mt-1 text-sm font-bold">
                  {dateTimeText(
                    result.submitted_at
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-900/70 p-4 sm:col-span-2">
                <p className="text-[10px] font-bold text-slate-500">
                  SUBMISSION TYPE
                </p>

                <p className="mt-1 text-sm font-bold uppercase">
                  {result.submission_type ||
                    "MANUAL SUBMISSION"}
                </p>
              </div>

            </div>

          </section>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">

            <button
              onClick={() =>
                router.push(
                  "/student/quiz-tests/results"
                )
              }
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-black hover:bg-white/10"
            >
              ← ALL RESULTS
            </button>

            <button
              onClick={() =>
                router.push(
                  "/student/quiz-tests/history"
                )
              }
              className="rounded-2xl bg-indigo-600 px-5 py-4 font-black hover:bg-indigo-500"
            >
              QUIZ HISTORY →
            </button>

          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">

            <button
              onClick={() =>
                router.back()
              }
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-black hover:bg-white/10"
            >
              ← BACK
            </button>

            <button
              onClick={() =>
                router.push(
                  "/student/dashboard"
                )
              }
              className="rounded-2xl bg-indigo-600 px-5 py-4 font-black hover:bg-indigo-500"
            >
              GO TO DASHBOARD
            </button>

          </div>

          <div className="py-8 text-center text-xs text-slate-500">
            RACER ACADEMY • Quiz Result
          </div>

        </div>
      </div>
    </main>
  );
}

export default function StudentQuizResultsPage() {
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
      <ResultsContent />
    </Suspense>
  );
}