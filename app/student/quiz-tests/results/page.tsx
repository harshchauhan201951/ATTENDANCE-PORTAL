"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import jsPDF from "jspdf";
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
  created_by: number | null;
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

type Teacher = {
  id: number;
  teacher_name: string | null;
  name?: string | null;
};

function normalizeClass(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase();
}

function matchesClass(quiz: Quiz, studentClass: string) {
  const studentClassNormalized = normalizeClass(studentClass);

  if (!studentClassNormalized) return false;

  const targets = Array.isArray(quiz.target_classes)
    ? quiz.target_classes.map(normalizeClass).filter(Boolean)
    : [];

  if (targets.length > 0) {
    return targets.includes(studentClassNormalized);
  }

  return normalizeClass(quiz.class_name) === studentClassNormalized;
}

function numberText(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return Number.isInteger(number)
    ? String(number)
    : number.toFixed(2);
}

function dateTimeText(value: string | null) {
  if (!value) return "-";

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
    hour12: true,
  });
}

function dateText(value: string | null) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function timeText(value: string | null) {
  if (!value) return "-";

  const [hourText, minute] = value.split(":");
  let hour = Number(hourText);

  if (!Number.isFinite(hour)) {
    return value;
  }

  const period = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;

  return `${hour}:${minute || "00"} ${period}`;
}

/*
 * Unicode PDF font loader.
 *
 * NotoSansDevanagari supports:
 * - Hindi / Devanagari
 * - English / Latin
 * - Numbers
 * - Common punctuation
 */
async function loadPdfUnicodeFont(doc: jsPDF) {
  const response = await fetch(
    "/fonts/NotoSansDevanagari-Regular.ttf"
  );

  if (!response.ok) {
    throw new Error(
      "PDF Unicode font could not be loaded. Please check public/fonts/NotoSansDevanagari-Regular.ttf."
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  let binary = "";
  const chunkSize = 0x8000;

  for (
    let index = 0;
    index < bytes.length;
    index += chunkSize
  ) {
    const chunk = bytes.subarray(
      index,
      Math.min(index + chunkSize, bytes.length)
    );

    binary += String.fromCharCode(...chunk);
  }

  const base64 = btoa(binary);

  doc.addFileToVFS(
    "NotoSansDevanagari-Regular.ttf",
    base64
  );

  doc.addFont(
    "NotoSansDevanagari-Regular.ttf",
    "NotoSansDevanagari",
    "normal"
  );

  doc.setFont(
    "NotoSansDevanagari",
    "normal"
  );
}

/*
 * Keep Unicode exactly as Unicode.
 *
 * IMPORTANT:
 * Do NOT convert Hindi characters to ?.
 */
function cleanPdfText(value: unknown) {
  const text = String(value ?? "-")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text || "-";
}

function splitPdfText(
  doc: jsPDF,
  value: unknown,
  width: number
) {
  const text = cleanPdfText(value);

  const lines = doc.splitTextToSize(
    text,
    width
  );

  return Array.isArray(lines)
    ? lines
    : [String(lines)];
}

function buildSafeFilePart(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[^\x00-\x7F]/g, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "") ||
    "Student"
  );
}

async function buildResultPdf(
  result: QuizResult,
  quiz: Quiz,
  reviews: QuestionReview[],
  studentName: string,
  studentClass: string,
  teacherName: string
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  await loadPdfUnicodeFont(doc);

  const pageWidth =
    doc.internal.pageSize.getWidth();

  const pageHeight =
    doc.internal.pageSize.getHeight();

  const margin = 14;
  const contentWidth =
    pageWidth - margin * 2;

  let y = 18;

  function setPdfFont(
    size = 10
  ) {
    doc.setFont(
      "NotoSansDevanagari",
      "normal"
    );

    doc.setFontSize(size);

    doc.setTextColor(20, 24, 35);
  }

  function ensureSpace(
    requiredHeight = 10
  ) {
    if (
      y + requiredHeight >
      pageHeight - 20
    ) {
      doc.addPage();
      y = 18;
      setPdfFont(10);
    }
  }

  function addWrappedText(
    value: unknown,
    size = 10,
    gapAfter = 4
  ) {
    setPdfFont(size);

    const lines = splitPdfText(
      doc,
      value,
      contentWidth
    );

    const lineHeight =
      size <= 9 ? 4.8 : 5.6;

    for (const line of lines) {
      if (
        y + lineHeight >
        pageHeight - 20
      ) {
        doc.addPage();
        y = 18;
        setPdfFont(size);
      }

      doc.text(
        String(line),
        margin,
        y
      );

      y += lineHeight;
    }

    y += gapAfter;
  }

  function addSectionTitle(
    title: string
  ) {
    ensureSpace(16);

    setPdfFont(12);

    doc.text(
      cleanPdfText(title),
      margin,
      y
    );

    y += 5;

    doc.setLineWidth(0.35);

    doc.setDrawColor(
      80,
      80,
      90
    );

    doc.line(
      margin,
      y,
      pageWidth - margin,
      y
    );

    y += 7;
  }

  function addInfoBox(
    label: string,
    value: unknown,
    boxX: number,
    boxY: number,
    boxWidth: number,
    boxHeight: number
  ) {
    doc.setFillColor(
      248,
      249,
      252
    );

    doc.setDrawColor(
      220,
      223,
      230
    );

    doc.setLineWidth(0.25);

    doc.roundedRect(
      boxX,
      boxY,
      boxWidth,
      boxHeight,
      2,
      2,
      "FD"
    );

    setPdfFont(7.5);

    doc.setTextColor(
      100,
      105,
      115
    );

    doc.text(
      cleanPdfText(label).toUpperCase(),
      boxX + 4,
      boxY + 5
    );

    setPdfFont(10);

    doc.setTextColor(
      20,
      24,
      35
    );

    const lines =
      splitPdfText(
        doc,
        value,
        boxWidth - 8
      );

    doc.text(
      lines.slice(0, 2),
      boxX + 4,
      boxY + 11
    );
  }

  /*
   * ================================
   * PDF HEADER
   * ================================
   */

  setPdfFont(20);

  doc.text(
    "RACER ACADEMY",
    margin,
    y
  );

  y += 8;

  setPdfFont(13);

  doc.text(
    "STUDENT QUIZ RESULT",
    margin,
    y
  );

  y += 5;

  setPdfFont(8);

  doc.setTextColor(
    100,
    105,
    115
  );

  doc.text(
    "Official Academic Assessment Record",
    margin,
    y + 5
  );

  y += 12;

  doc.setLineWidth(0.6);

  doc.setDrawColor(
    35,
    45,
    80
  );

  doc.line(
    margin,
    y,
    pageWidth - margin,
    y
  );

  y += 9;

  /*
   * ================================
   * STUDENT / QUIZ DETAILS
   * ================================
   */

  addSectionTitle(
    "STUDENT & QUIZ DETAILS"
  );

  const boxGap = 4;
  const boxWidth =
    (contentWidth - boxGap) / 2;
  const boxHeight = 22;

  addInfoBox(
    "Student Name",
    studentName || "-",
    margin,
    y,
    boxWidth,
    boxHeight
  );

  addInfoBox(
    "Class",
    studentClass || "-",
    margin + boxWidth + boxGap,
    y,
    boxWidth,
    boxHeight
  );

  y += boxHeight + boxGap;

  addInfoBox(
    "Quiz",
    quiz.title || "-",
    margin,
    y,
    boxWidth,
    boxHeight
  );

  addInfoBox(
    "Subject",
    quiz.subject || "-",
    margin + boxWidth + boxGap,
    y,
    boxWidth,
    boxHeight
  );

  y += boxHeight + boxGap;

  addInfoBox(
    "Conducted By",
    teacherName || "RACER ACADEMY",
    margin,
    y,
    boxWidth,
    boxHeight
  );

  addInfoBox(
    "Quiz Date",
    dateText(quiz.scheduled_date),
    margin + boxWidth + boxGap,
    y,
    boxWidth,
    boxHeight
  );

  y += boxHeight + boxGap;

  addInfoBox(
    "Total Marks",
    numberText(result.total_marks),
    margin,
    y,
    boxWidth,
    boxHeight
  );

  addInfoBox(
    "Marks Obtained",
    `${numberText(
      result.obtained_marks
    )} / ${numberText(
      result.total_marks
    )}`,
    margin + boxWidth + boxGap,
    y,
    boxWidth,
    boxHeight
  );

  y += boxHeight + 9;

  /*
   * ================================
   * RESULT SUMMARY
   * ================================
   */

  addSectionTitle(
    "RESULT SUMMARY"
  );

  addWrappedText(
    `Result Status: ${
      result.result_status || "-"
    }`,
    11,
    3
  );

  addWrappedText(
    `Percentage: ${numberText(
      result.percentage
    )}%`,
    10,
    3
  );

  addWrappedText(
    `Total Questions: ${numberText(
      result.total_questions
    )}`,
    10,
    3
  );

  addWrappedText(
    `Correct Answers: ${numberText(
      result.correct_answers
    )}`,
    10,
    3
  );

  addWrappedText(
    `Wrong Answers: ${numberText(
      result.wrong_answers
    )}`,
    10,
    3
  );

  addWrappedText(
    `Not Answered: ${numberText(
      result.unanswered
    )}`,
    10,
    3
  );

  addWrappedText(
    `Pass Percentage: ${numberText(
      quiz.pass_percentage
    )}%`,
    10,
    3
  );

  addWrappedText(
    `Duration: ${numberText(
      quiz.duration_minutes || 30
    )} minutes`,
    10,
    3
  );

  addWrappedText(
    `Scheduled Time: ${timeText(
      quiz.scheduled_time
    )}`,
    10,
    3
  );

  addWrappedText(
    `Started At: ${dateTimeText(
      result.started_at
    )}`,
    10,
    3
  );

  addWrappedText(
    `Submitted At: ${dateTimeText(
      result.submitted_at
    )}`,
    10,
    3
  );

  addWrappedText(
    `Submission Type: ${
      result.submission_type || "-"
    }`,
    10,
    8
  );

  /*
   * ================================
   * QUESTION REVIEW
   * ================================
   */

  addSectionTitle(
    "QUESTION-WISE ANSWER REVIEW"
  );

  if (reviews.length === 0) {
    addWrappedText(
      "Question review is not available.",
      10,
      5
    );
  } else {
    reviews.forEach(
      (review, index) => {
        ensureSpace(28);

        setPdfFont(10);

        const questionText =
          `Q${index + 1}. ${
            review.question.question_text
          }`;

        addWrappedText(
          questionText,
          10,
          4
        );

        const selectedText =
          review.selectedOption
            ?.option_text ||
          "Not Answered";

        const correctText =
          review.correctOption
            ?.option_text ||
          "Not Available";

        const status =
          !review.answer ||
          review.answer.selected_option_id ===
            null
            ? "NOT ANSWERED"
            : review.answer.is_correct
            ? "CORRECT"
            : "WRONG";

        addWrappedText(
          `Student Answer: ${selectedText}`,
          9,
          3
        );

        addWrappedText(
          `Correct Answer: ${correctText}`,
          9,
          3
        );

        addWrappedText(
          `Status: ${status}`,
          9,
          3
        );

        addWrappedText(
          `Marks Awarded: ${numberText(
            review.answer?.marks_awarded ?? 0
          )}`,
          9,
          6
        );

        if (
          index <
          reviews.length - 1
        ) {
          ensureSpace(5);

          doc.setDrawColor(
            215,
            218,
            225
          );

          doc.setLineWidth(0.2);

          doc.line(
            margin,
            y,
            pageWidth - margin,
            y
          );

          y += 7;
        }
      }
    );
  }

  /*
   * ================================
   * OFFICIAL ACADEMY SIGNATURE
   * ================================
   */

  ensureSpace(48);

  y += 6;

  doc.setDrawColor(
    40,
    45,
    55
  );

  doc.setLineWidth(0.25);

  doc.line(
    margin,
    y,
    pageWidth - margin,
    y
  );

  y += 15;

  const signatureX =
    pageWidth - margin - 60;

  /*
   * Pen-style signature.
   *
   * This is a fictional RACER ACADEMY
   * academy signature mark, not a real
   * person's signature.
   */
  doc.setFont(
    "times",
    "italic"
  );

  doc.setFontSize(20);

  doc.setTextColor(
    25,
    35,
    70
  );

  doc.text(
    "Racer Academy",
    signatureX,
    y
  );

  /*
   * Handwritten-style underline/flourish.
   */
  doc.setLineWidth(0.55);

  doc.setDrawColor(
    25,
    35,
    70
  );

  const flourishY =
    y + 3;

  doc.lines(
    [
      [
        8,
        1.2,
      ],
      [
        10,
        -1.4,
      ],
      [
        12,
        0.8,
      ],
      [
        9,
        1.1,
      ],
      [
        7,
        -0.7,
      ],
    ],
    signatureX - 1,
    flourishY,
    [1, 1],
    "S",
    false
  );

  y += 9;

  setPdfFont(8);

  doc.setTextColor(
    85,
    90,
    100
  );

  doc.text(
    "Authorized Academic Record",
    signatureX,
    y
  );

  y += 4;

  doc.text(
    "RACER ACADEMY",
    signatureX,
    y
  );

  /*
   * ================================
   * FOOTER
   * ================================
   */

  const totalPages =
    doc.getNumberOfPages();

  for (
    let page = 1;
    page <= totalPages;
    page++
  ) {
    doc.setPage(page);

    setPdfFont(7.5);

    doc.setTextColor(
      105,
      110,
      120
    );

    doc.text(
      "RACER ACADEMY",
      margin,
      pageHeight - 8
    );

    doc.text(
      `Page ${page} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 8,
      {
        align: "right",
      }
    );
  }

  /*
   * Reset font before returning.
   */
  doc.setTextColor(
    20,
    24,
    35
  );

  doc.setFont(
    "NotoSansDevanagari",
    "normal"
  );

  return doc;
}

async function fetchQuestionReviews(
  resultId: number,
  quizId: number
) {
  const [
    answersResponse,
    questionsResponse,
    optionsResponse,
  ] = await Promise.all([
    supabase
      .from("quiz_answers")
      .select(
        "id,result_id,question_id,selected_option_id,is_correct,marks_awarded,answered_at"
      )
      .eq(
        "result_id",
        resultId
      ),

    supabase
      .from("quiz_questions")
      .select(
        "id,quiz_id,question_text,question_order,marks"
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
      ),

    supabase
      .from("quiz_options")
      .select(
        "id,question_id,option_text,option_order,is_correct"
      )
      .order(
        "option_order",
        {
          ascending: true,
        }
      ),
  ]);

  if (answersResponse.error) {
    throw new Error(
      answersResponse.error.message
    );
  }

  if (questionsResponse.error) {
    throw new Error(
      questionsResponse.error.message
    );
  }

  if (optionsResponse.error) {
    throw new Error(
      optionsResponse.error.message
    );
  }

  const answers =
    (answersResponse.data ||
      []) as QuizAnswer[];

  const questions =
    (questionsResponse.data ||
      []) as QuizQuestion[];

  const options =
    (optionsResponse.data ||
      []) as QuizOption[];

  return questions.map(
    (question) => {
      const answer =
        answers.find(
          (item) =>
            Number(
              item.question_id
            ) ===
            Number(question.id)
        ) || null;

      const questionOptions =
        options.filter(
          (option) =>
            Number(
              option.question_id
            ) ===
            Number(question.id)
        );

      const selectedOption =
        answer?.selected_option_id !=
        null
          ? questionOptions.find(
              (option) =>
                Number(option.id) ===
                Number(
                  answer.selected_option_id
                )
            ) || null
          : null;

      const correctOption =
        questionOptions.find(
          (option) =>
            option.is_correct
        ) || null;

      return {
        question,
        options: questionOptions,
        answer,
        selectedOption,
        correctOption,
      };
    }
  );
}

function ResultsContent() {
  const router = useRouter();

  const searchParams =
    useSearchParams();

  const quizIdParam =
    searchParams.get("quizId");

  const isDetail =
    Boolean(quizIdParam);

  const [
    studentName,
    setStudentName,
  ] = useState("");

  const [
    studentClass,
    setStudentClass,
  ] = useState("");

  const [
    results,
    setResults,
  ] = useState<ResultItem[]>([]);

  const [
    selectedQuiz,
    setSelectedQuiz,
  ] = useState<Quiz | null>(null);

  const [
    selectedResult,
    setSelectedResult,
  ] = useState<QuizResult | null>(
    null
  );

  const [
    questionReviews,
    setQuestionReviews,
  ] = useState<QuestionReview[]>(
    []
  );

  const [
    teacherName,
    setTeacherName,
  ] = useState(
    "RACER ACADEMY"
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    reviewLoading,
    setReviewLoading,
  ] = useState(false);

  const [
    pdfLoadingId,
    setPdfLoadingId,
  ] = useState<number | null>(
    null
  );

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    loadPage();
  }, [quizIdParam]);

  async function getStudent() {
    const storedUsername =
      localStorage.getItem(
        "student_username"
      ) ||
      localStorage.getItem(
        "studentUsername"
      ) ||
      localStorage.getItem(
        "student_username_login"
      );

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

    if (
      storedUsername?.trim()
    ) {
      const {
        data,
        error,
      } = await supabase
        .from("students")
        .select(
          "id,student_name,student_username,class_name"
        )
        .eq(
          "student_username",
          storedUsername.trim()
        )
        .maybeSingle();

      if (error) {
        console.error(
          "Student username lookup error:",
          error
        );
      }

      if (data) {
        currentStudent =
          data as Student;
      }
    }

    if (
      !currentStudent &&
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
        const {
          data,
          error,
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

        if (error) {
          console.error(
            "Student ID lookup error:",
            error
          );
        }

        if (data) {
          currentStudent =
            data as Student;
        }
      }
    }

    if (!currentStudent) {
      return null;
    }

    localStorage.setItem(
      "attendance_student_id",
      String(
        currentStudent.id
      )
    );

    localStorage.setItem(
      "studentId",
      String(
        currentStudent.id
      )
    );

    if (
      currentStudent.student_username
    ) {
      localStorage.setItem(
        "student_username",
        currentStudent.student_username
      );

      localStorage.setItem(
        "studentUsername",
        currentStudent.student_username
      );
    }

    if (
      currentStudent.student_name
    ) {
      localStorage.setItem(
        "attendance_student_name",
        currentStudent.student_name
      );

      localStorage.setItem(
        "studentName",
        currentStudent.student_name
      );
    }

    setStudentName(
      currentStudent.student_name ||
        ""
    );

    setStudentClass(
      normalizeClass(
        currentStudent.class_name
      )
    );

    return currentStudent;
  }

  async function fetchTeacherName(
    createdBy: number | null
  ) {
    if (
      !createdBy ||
      !Number.isFinite(
        Number(createdBy)
      )
    ) {
      return "RACER ACADEMY";
    }

    try {
      const {
        data,
        error,
      } = await supabase
        .from("teachers")
        .select(
          "id,teacher_name,name"
        )
        .eq(
          "id",
          Number(createdBy)
        )
        .maybeSingle();

      if (error) {
        console.error(
          "Teacher lookup error:",
          error
        );

        return "RACER ACADEMY";
      }

      if (data) {
        const teacher =
          data as Teacher;

        return (
          teacher.teacher_name ||
          teacher.name ||
          "RACER ACADEMY"
        );
      }
    } catch (teacherError) {
      console.error(
        "Teacher lookup failed:",
        teacherError
      );
    }

    return "RACER ACADEMY";
  }

  async function loadPage() {
    setLoading(true);
    setError("");
    setResults([]);
    setSelectedQuiz(null);
    setSelectedResult(null);
    setQuestionReviews([]);
    setTeacherName(
      "RACER ACADEMY"
    );

    try {
      const student =
        await getStudent();

      if (!student) {
        setError(
          "Student login could not be verified. Please login again."
        );
        return;
      }

      if (isDetail) {
        await loadSingleResult(
          Number(quizIdParam),
          Number(student.id),
          normalizeClass(
            student.class_name
          )
        );
      } else {
        await loadAllResults(
          Number(student.id),
          normalizeClass(
            student.class_name
          )
        );
      }
    } catch (loadError) {
      console.error(
        "Result loading error:",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load quiz results."
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
      .select(
        "id,quiz_id,student_id,total_questions,correct_answers,wrong_answers,unanswered,total_marks,obtained_marks,percentage,result_status,started_at,submitted_at,submission_type,created_at"
      )
      .eq(
        "student_id",
        studentId
      )
      .order(
        "created_at",
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

    if (
      rawResults.length === 0
    ) {
      setResults([]);
      return;
    }

    const quizIds = [
      ...new Set(
        rawResults.map(
          (item) =>
            Number(
              item.quiz_id
            )
        )
      ),
    ];

    const {
      data: quizData,
      error: quizError,
    } = await supabase
      .from("quiz_tests")
      .select(
        "id,title,description,class_name,target_classes,subject,scheduled_date,scheduled_time,duration_minutes,marks_per_question,negative_marks,pass_percentage,created_by"
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

    const quizzes =
      (quizData ||
        []) as Quiz[];

    const quizMap =
      new Map<number, Quiz>();

    quizzes.forEach(
      (quiz) => {
        quizMap.set(
          Number(quiz.id),
          quiz
        );
      }
    );

    const filteredResults =
      rawResults
        .map((result) => ({
          ...result,
          quiz:
            quizMap.get(
              Number(
                result.quiz_id
              )
            ) || null,
        }))
        .filter((item) => {
          if (!item.quiz)
            return false;

          return matchesClass(
            item.quiz,
            currentClass
          );
        });

    setResults(
      filteredResults as ResultItem[]
    );
  }

  async function loadSingleResult(
    quizId: number,
    studentId: number,
    currentClass: string
  ) {
    if (
      !Number.isFinite(
        quizId
      ) ||
      quizId <= 0
    ) {
      throw new Error(
        "Invalid quiz result."
      );
    }

    const {
      data: quizData,
      error: quizError,
    } = await supabase
      .from("quiz_tests")
      .select(
        "id,title,description,class_name,target_classes,subject,scheduled_date,scheduled_time,duration_minutes,marks_per_question,negative_marks,pass_percentage,created_by"
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
      !matchesClass(
        quiz,
        currentClass
      )
    ) {
      throw new Error(
        "This quiz is not assigned to your class."
      );
    }

    const {
      data: resultData,
      error: resultError,
    } = await supabase
      .from("quiz_results")
      .select(
        "id,quiz_id,student_id,total_questions,correct_answers,wrong_answers,unanswered,total_marks,obtained_marks,percentage,result_status,started_at,submitted_at,submission_type,created_at"
      )
      .eq(
        "quiz_id",
        quizId
      )
      .eq(
        "student_id",
        studentId
      )
      .order(
        "created_at",
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

    if (!resultData) {
      throw new Error(
        "No result found for this quiz."
      );
    }

    const result =
      resultData as QuizResult;

    setSelectedQuiz(quiz);
    setSelectedResult(result);

    const loadedTeacherName =
      await fetchTeacherName(
        quiz.created_by
      );

    setTeacherName(
      loadedTeacherName
    );

    await loadQuestionReview(
      result.id,
      result.quiz_id
    );
  }

  async function loadQuestionReview(
    resultId: number,
    quizId: number
  ) {
    setReviewLoading(true);

    try {
      const reviews =
        await fetchQuestionReviews(
          resultId,
          quizId
        );

      setQuestionReviews(
        reviews
      );
    } catch (reviewError) {
      console.error(
        "Question review error:",
        reviewError
      );

      setQuestionReviews([]);

      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Unable to load question review."
      );
    } finally {
      setReviewLoading(false);
    }
  }

  async function getTeacherNameForQuiz(
    quiz: Quiz
  ) {
    if (
      quiz.id ===
      selectedQuiz?.id &&
      teacherName
    ) {
      return teacherName;
    }

    return fetchTeacherName(
      quiz.created_by
    );
  }

  async function downloadResultPdf(
    item?: ResultItem
  ) {
    const loadingId =
      item?.id ??
      selectedResult?.id ??
      null;

    setPdfLoadingId(
      loadingId
    );

    try {
      let result:
        | QuizResult
        | null =
        item ||
        selectedResult;

      let quiz:
        | Quiz
        | null =
        item?.quiz ||
        selectedQuiz;

      if (
        !result ||
        !quiz
      ) {
        throw new Error(
          "Result details are not available."
        );
      }

      let reviews =
        item?.id ===
        selectedResult?.id
          ? questionReviews
          : [];

      if (
        reviews.length === 0
      ) {
        reviews =
          await fetchQuestionReviews(
            result.id,
            result.quiz_id
          );
      }

      const currentTeacherName =
        await getTeacherNameForQuiz(
          quiz
        );

      const doc =
        await buildResultPdf(
          result,
          quiz,
          reviews,
          studentName,
          studentClass,
          currentTeacherName
        );

      const safeQuizTitle =
        buildSafeFilePart(
          quiz.title ||
            "Quiz"
        );

      const safeStudentName =
        buildSafeFilePart(
          studentName ||
            "Student"
        );

      const fileName =
        `RACER-ACADEMY-${safeStudentName}-${safeQuizTitle}-Result.pdf`;

      doc.save(
        fileName
      );
    } catch (pdfError) {
      console.error(
        "PDF generation error:",
        pdfError
      );

      setError(
        pdfError instanceof Error
          ? pdfError.message
          : "Unable to generate PDF."
      );
    } finally {
      setPdfLoadingId(
        null
      );
    }
  }

  function resultStatusClass(
    status: string
  ) {
    return status
      ?.toUpperCase()
      .includes("PASS")
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-400/20"
      : "text-red-400 bg-red-500/10 border-red-400/20";
  }

  function handleRefresh() {
    loadPage();
  }

  function handleBack() {
    router.back();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        <header className="border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-xl font-black">
                  {isDetail
                    ? "QUIZ RESULT"
                    : "MY QUIZ RESULTS"}
                </h1>

                <p className="text-xs text-slate-400">
                  RACER ACADEMY
                  {studentClass
                    ? ` • CLASS ${studentClass}`
                    : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleBack}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
                >
                  ← Back
                </button>

                <button
                  onClick={() =>
                    router.push(
                      "/student"
                    )
                  }
                  className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-300 transition hover:bg-indigo-500/20"
                >
                  Dashboard
                </button>

                <button
                  onClick={
                    handleRefresh
                  }
                  disabled={loading}
                  className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Refreshing..."
                    : "Refresh"}
                </button>

                <button
                  onClick={() =>
                    router.push(
                      "/student/quiz-tests"
                    )
                  }
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
                >
                  ← Quiz Tests
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-8">
          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
              <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />

              <p className="text-sm text-slate-400">
                Loading quiz results...
              </p>
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-8 text-center">
              <h2 className="font-black">
                Unable to load result
              </h2>

              <p className="mt-2 text-sm text-red-200">
                {error}
              </p>

              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  onClick={
                    loadPage
                  }
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black hover:bg-indigo-500"
                >
                  TRY AGAIN
                </button>

                <button
                  onClick={() =>
                    router.push(
                      "/student"
                    )
                  }
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black hover:bg-white/10"
                >
                  DASHBOARD
                </button>

                <button
                  onClick={handleBack}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black hover:bg-white/10"
                >
                  ← BACK
                </button>
              </div>
            </div>
          ) : !isDetail ? (
            <>
              {results.length ===
              0 ? (
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
                  <div className="text-5xl">
                    RESULTS
                  </div>

                  <h2 className="mt-4 text-xl font-black">
                    No quiz results yet
                  </h2>

                  <p className="mt-2 text-sm text-slate-400">
                    Your completed
                    quiz results
                    will appear
                    here.
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  {results.map(
                    (item) => (
                      <div
                        key={
                          item.id
                        }
                        className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-xl"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h2 className="text-xl font-black">
                              {item
                                .quiz
                                ?.title ||
                                "Quiz"}
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                              {item
                                .quiz
                                ?.subject ||
                                "Quiz"}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black ${resultStatusClass(
                              item.result_status
                            )}`}
                          >
                            {item.result_status ||
                              "-"}
                          </span>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-white/5 p-3">
                            <p className="text-[10px] font-bold text-slate-500">
                              PERCENTAGE
                            </p>

                            <p className="mt-1 text-lg font-black">
                              {numberText(
                                item.percentage
                              )}
                              %
                            </p>
                          </div>

                          <div className="rounded-xl bg-white/5 p-3">
                            <p className="text-[10px] font-bold text-slate-500">
                              MARKS
                            </p>

                            <p className="mt-1 text-lg font-black">
                              {numberText(
                                item.obtained_marks
                              )}{" "}
                              /{" "}
                              {numberText(
                                item.total_marks
                              )}
                            </p>
                          </div>

                          <div className="rounded-xl bg-white/5 p-3">
                            <p className="text-[10px] font-bold text-slate-500">
                              CORRECT
                            </p>

                            <p className="mt-1 font-bold text-emerald-400">
                              {
                                item.correct_answers
                              }
                            </p>
                          </div>

                          <div className="rounded-xl bg-white/5 p-3">
                            <p className="text-[10px] font-bold text-slate-500">
                              WRONG
                            </p>

                            <p className="mt-1 font-bold text-red-400">
                              {
                                item.wrong_answers
                              }
                            </p>
                          </div>

                          <div className="col-span-2 rounded-xl bg-white/5 p-3">
                            <p className="text-[10px] font-bold text-slate-500">
                              NOT ANSWERED
                            </p>

                            <p className="mt-1 font-bold text-slate-300">
                              {
                                item.unanswered
                              }
                            </p>
                          </div>
                        </div>

                        <p className="mt-4 text-xs text-slate-500">
                          Submitted:{" "}
                          {dateTimeText(
                            item.submitted_at
                          )}
                        </p>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <button
                            onClick={() =>
                              router.push(
                                `/student/quiz-tests/results?quizId=${item.quiz_id}`
                              )
                            }
                            className="w-full rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-400 hover:bg-emerald-500/20"
                          >
                            VIEW FULL RESULT
                          </button>

                          <button
                            onClick={() =>
                              downloadResultPdf(
                                item
                              )
                            }
                            disabled={
                              pdfLoadingId ===
                              item.id
                            }
                            className="w-full rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-3 text-sm font-black text-indigo-300 hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {pdfLoadingId ===
                            item.id
                              ? "GENERATING PDF..."
                              : "DOWNLOAD PDF"}
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </>
          ) : selectedQuiz &&
            selectedResult ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  onClick={() =>
                    router.push(
                      "/student/quiz-tests/results"
                    )
                  }
                  className="w-fit rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
                >
                  ← All Results
                </button>

                <button
                  onClick={() =>
                    downloadResultPdf()
                  }
                  disabled={
                    pdfLoadingId ===
                      selectedResult.id ||
                    reviewLoading
                  }
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black shadow-lg shadow-indigo-900/30 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pdfLoadingId ===
                  selectedResult.id
                    ? "GENERATING PDF..."
                    : "DOWNLOAD PDF"}
                </button>
              </div>

              <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                      {selectedQuiz.subject ||
                        "QUIZ"}
                    </p>

                    <h2 className="mt-1 text-2xl font-black">
                      {selectedQuiz.title}
                    </h2>

                    {selectedQuiz.description && (
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                        {
                          selectedQuiz.description
                        }
                      </p>
                    )}
                  </div>

                  <span
                    className={`rounded-full border px-4 py-2 text-xs font-black ${resultStatusClass(
                      selectedResult.result_status
                    )}`}
                  >
                    {
                      selectedResult.result_status
                    }
                  </span>
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-black">
                  STUDENT DETAILS
                </h3>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-white/5 p-4">
                    <p className="text-[10px] font-bold text-slate-500">
                      STUDENT NAME
                    </p>

                    <p className="mt-1 font-bold">
                      {studentName ||
                        "-"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/5 p-4">
                    <p className="text-[10px] font-bold text-slate-500">
                      CLASS
                    </p>

                    <p className="mt-1 font-bold">
                      {studentClass ||
                        "-"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-black">
                  RESULT SUMMARY
                </h3>

                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-[10px] font-bold text-slate-500">
                      TOTAL QUESTIONS
                    </p>

                    <p className="mt-1 text-2xl font-black">
                      {
                        selectedResult.total_questions
                      }
                    </p>
                  </div>

                  <div className="rounded-2xl bg-emerald-500/10 p-4">
                    <p className="text-[10px] font-bold text-emerald-300/70">
                      CORRECT
                    </p>

                    <p className="mt-1 text-2xl font-black text-emerald-400">
                      {
                        selectedResult.correct_answers
                      }
                    </p>
                  </div>

                  <div className="rounded-2xl bg-red-500/10 p-4">
                    <p className="text-[10px] font-bold text-red-300/70">
                      WRONG
                    </p>

                    <p className="mt-1 text-2xl font-black text-red-400">
                      {
                        selectedResult.wrong_answers
                      }
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-[10px] font-bold text-slate-500">
                      NOT ANSWERED
                    </p>

                    <p className="mt-1 text-2xl font-black">
                      {
                        selectedResult.unanswered
                      }
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-indigo-500/10 p-4">
                    <p className="text-[10px] font-bold text-indigo-300/70">
                      OBTAINED MARKS
                    </p>

                    <p className="mt-1 text-2xl font-black text-indigo-300">
                      {numberText(
                        selectedResult.obtained_marks
                      )}{" "}
                      /{" "}
                      {numberText(
                        selectedResult.total_marks
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-indigo-500/10 p-4">
                    <p className="text-[10px] font-bold text-indigo-300/70">
                      PERCENTAGE
                    </p>

                    <p className="mt-1 text-2xl font-black text-indigo-300">
                      {numberText(
                        selectedResult.percentage
                      )}
                      %
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-[10px] font-bold text-slate-500">
                      PASS PERCENTAGE
                    </p>

                    <p className="mt-1 text-2xl font-black">
                      {numberText(
                        selectedQuiz.pass_percentage
                      )}
                      %
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-black">
                  QUESTION-WISE ANSWER REVIEW
                </h3>

                {reviewLoading ? (
                  <div className="py-10 text-center">
                    <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />

                    <p className="text-sm text-slate-400">
                      Loading answer review...
                    </p>
                  </div>
                ) : questionReviews.length ===
                  0 ? (
                  <div className="mt-5 rounded-2xl bg-white/5 p-6 text-center text-sm text-slate-400">
                    Question review is not
                    available.
                  </div>
                ) : (
                  <div className="mt-5 space-y-4">
                    {questionReviews.map(
                      (
                        review,
                        index
                      ) => {
                        const isUnanswered =
                          !review.answer ||
                          review.answer
                            .selected_option_id ===
                            null;

                        const isCorrect =
                          !isUnanswered &&
                          review.answer
                            ?.is_correct;

                        return (
                          <div
                            key={
                              review
                                .question
                                .id
                            }
                            className="rounded-2xl border border-white/10 bg-slate-950/50 p-5"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <h4 className="font-black leading-6">
                                Q{index + 1}.{" "}
                                {
                                  review
                                    .question
                                    .question_text
                                }
                              </h4>

                              <span
                                className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black ${
                                  isUnanswered
                                    ? "bg-slate-500/20 text-slate-400"
                                    : isCorrect
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-red-500/20 text-red-400"
                                }`}
                              >
                                {isUnanswered
                                  ? "NOT ANSWERED"
                                  : isCorrect
                                  ? "CORRECT"
                                  : "WRONG"}
                              </span>
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              <div className="rounded-xl bg-white/5 p-4">
                                <p className="text-[10px] font-bold text-slate-500">
                                  YOUR ANSWER
                                </p>

                                <p className="mt-1 text-sm font-semibold">
                                  {review
                                    .selectedOption
                                    ?.option_text ||
                                    "Not Answered"}
                                </p>
                              </div>

                              <div className="rounded-xl bg-emerald-500/5 p-4">
                                <p className="text-[10px] font-bold text-emerald-400/70">
                                  CORRECT ANSWER
                                </p>

                                <p className="mt-1 text-sm font-semibold text-emerald-300">
                                  {review
                                    .correctOption
                                    ?.option_text ||
                                    "Not Available"}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 text-xs text-slate-500">
                              Marks Awarded:{" "}
                              {numberText(
                                review
                                  .answer
                                  ?.marks_awarded ??
                                  0
                              )}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-black">
                  QUIZ INFORMATION
                </h3>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <div className="rounded-xl bg-white/5 p-4">
                    <p className="text-[10px] font-bold text-slate-500">
                      QUIZ DATE
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      {dateText(
                        selectedQuiz.scheduled_date
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/5 p-4">
                    <p className="text-[10px] font-bold text-slate-500">
                      SCHEDULED TIME
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      {timeText(
                        selectedQuiz.scheduled_time
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/5 p-4">
                    <p className="text-[10px] font-bold text-slate-500">
                      DURATION
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      {numberText(
                        selectedQuiz.duration_minutes ||
                          30
                      )}{" "}
                      minutes
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/5 p-4 sm:col-span-2 md:col-span-3">
                    <p className="text-[10px] font-bold text-slate-500">
                      CONDUCTED BY
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      {teacherName ||
                        "RACER ACADEMY"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-black">
                  SUBMISSION DETAILS
                </h3>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-white/5 p-4">
                    <p className="text-[10px] font-bold text-slate-500">
                      STARTED AT
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      {dateTimeText(
                        selectedResult.started_at
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/5 p-4">
                    <p className="text-[10px] font-bold text-slate-500">
                      SUBMITTED AT
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      {dateTimeText(
                        selectedResult.submitted_at
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/5 p-4 sm:col-span-2">
                    <p className="text-[10px] font-bold text-slate-500">
                      SUBMISSION TYPE
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      {selectedResult.submission_type ||
                        "-"}
                    </p>
                  </div>
                </div>
              </section>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() =>
                    router.push(
                      "/student/quiz-tests/results"
                    )
                  }
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black hover:bg-white/10"
                >
                  ← BACK TO RESULTS
                </button>

                <button
                  onClick={() =>
                    downloadResultPdf()
                  }
                  disabled={
                    pdfLoadingId ===
                      selectedResult.id ||
                    reviewLoading
                  }
                  className="flex-1 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black shadow-lg shadow-indigo-900/30 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pdfLoadingId ===
                  selectedResult.id
                    ? "GENERATING PDF..."
                    : "DOWNLOAD RESULT PDF"}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
              <h2 className="text-xl font-black">
                Result not found
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                The requested quiz result
                could not be found.
              </p>

              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  onClick={() =>
                    router.push(
                      "/student/quiz-tests/results"
                    )
                  }
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black hover:bg-indigo-500"
                >
                  VIEW ALL RESULTS
                </button>

                <button
                  onClick={() =>
                    router.push(
                      "/student"
                    )
                  }
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black hover:bg-white/10"
                >
                  DASHBOARD
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function StudentQuizResultsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 text-white">
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />

              <p className="text-sm text-slate-400">
                Loading results...
              </p>
            </div>
          </div>
        </main>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}