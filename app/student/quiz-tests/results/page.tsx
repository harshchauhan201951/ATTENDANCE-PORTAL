"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

function normalizeClass(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase();
}

function matchesClass(
  quiz: Quiz,
  studentClass: string
) {
  const studentClassNormalized =
    normalizeClass(studentClass);

  if (!studentClassNormalized) return false;

  const targets = Array.isArray(quiz.target_classes)
    ? quiz.target_classes
        .map(normalizeClass)
        .filter(Boolean)
    : [];

  if (targets.length > 0) {
    return targets.includes(studentClassNormalized);
  }

  return (
    normalizeClass(quiz.class_name) ===
    studentClassNormalized
  );
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
 * Simple PDF generator.
 *
 * It intentionally uses absolute PDF text positioning
 * instead of table cells so the generated PDF does not
 * become blank.
 */
function escapePdfText(value: string) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, "")
    .replace(/\n/g, " ");
}

function wrapPdfText(
  value: string,
  maxCharacters = 90
) {
  const text = String(value || "-")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return ["-"];

  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }

    if (
      `${current} ${word}`.length <=
      maxCharacters
    ) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function createPdfBlob(
  pages: string[][]
) {
  const objects: string[] = [];

  objects.push(
    "<< /Type /Catalog /Pages 2 0 R >>"
  );

  objects.push(
    "<< /Type /Pages /Kids [" +
      pages
        .map(
          (_, index) =>
            `${3 + index * 2} 0 R`
        )
        .join(" ") +
      "] /Count " +
      pages.length +
      " >>"
  );

  pages.forEach((commands, index) => {
    const pageObjectNumber =
      3 + index * 2;

    const contentObjectNumber =
      4 + index * 2;

    objects[pageObjectNumber - 1] =
      "<< /Type /Page /Parent 2 0 R " +
      "/MediaBox [0 0 595 842] " +
      "/Resources << /Font << /F1 " +
      "1 0 R >> >> " +
      `/Contents ${contentObjectNumber} 0 R >>`;

    const content =
      commands.join("\n");

    objects[contentObjectNumber - 1] =
      `<< /Length ${content.length} >>\nstream\n` +
      content +
      "\nendstream";
  });

  /*
   * Font object must be first.
   * Page objects start from object 3.
   */
  objects[0] =
    "<< /Type /Font /Subtype /Type1 " +
    "/BaseFont /Helvetica >>";

  let pdf =
    "%PDF-1.4\n%\xFF\xFF\xFF\xFF\n";

  const offsets: number[] = [0];

  for (let i = 0; i < objects.length; i++) {
    offsets[i + 1] = pdf.length;

    pdf +=
      `${i + 1} 0 obj\n` +
      objects[i] +
      "\nendobj\n";
  }

  const xrefOffset = pdf.length;

  pdf +=
    `xref\n0 ${objects.length + 1}\n`;

  pdf +=
    "0000000000 65535 f \n";

  for (let i = 1; i <= objects.length; i++) {
    pdf +=
      `${String(offsets[i]).padStart(
        10,
        "0"
      )} 00000 n \n`;
  }

  pdf +=
    "trailer\n" +
    `<< /Size ${objects.length + 1} /Root 1 0 R >>\n` +
    "startxref\n" +
    `${xrefOffset}\n` +
    "%%EOF";

  return new Blob(
    [pdf],
    { type: "application/pdf" }
  );
}

function buildPdfPages(
  result: QuizResult,
  quiz: Quiz,
  reviews: QuestionReview[],
  studentName: string,
  studentClass: string
) {
  const pages: string[][] = [];
  let commands: string[] = [];
  let y = 810;

  function newPage() {
    if (commands.length > 0) {
      pages.push(commands);
    }

    commands = [];
    y = 810;
  }

  function ensureSpace(
    required = 30
  ) {
    if (y < required) {
      newPage();
    }
  }

  function text(
    value: string,
    size = 10,
    bold = false,
    x = 40
  ) {
    ensureSpace(size + 10);

    commands.push(
      "BT",
      `/F1 ${size} Tf`,
      `1 0 0 1 ${x} ${y} Tm`,
      `(${escapePdfText(value)}) Tj`,
      "ET"
    );

    y -= size + 6;

    void bold;
  }

  function lineGap(size = 8) {
    y -= size;
  }

  text(
    "RACER ACADEMY",
    20,
    true
  );

  text(
    "STUDENT QUIZ RESULT",
    14,
    true
  );

  lineGap(5);

  text(
    `Student Name: ${studentName || "-"}`,
    10,
    true
  );

  text(
    `Class: ${studentClass || "-"}`,
    10
  );

  text(
    `Quiz: ${quiz.title || "-"}`,
    10,
    true
  );

  text(
    `Subject: ${quiz.subject || "-"}`,
    10
  );

  lineGap(6);

  text(
    `Result: ${result.result_status || "-"}`,
    11,
    true
  );

  text(
    `Percentage: ${numberText(result.percentage)}%`,
    10,
    true
  );

  text(
    `Obtained Marks: ${numberText(
      result.obtained_marks
    )} / ${numberText(result.total_marks)}`,
    10
  );

  text(
    `Total Questions: ${numberText(
      result.total_questions
    )}`,
    10
  );

  text(
    `Correct: ${numberText(
      result.correct_answers
    )}`,
    10
  );

  text(
    `Wrong: ${numberText(
      result.wrong_answers
    )}`,
    10
  );

  text(
    `Not Answered: ${numberText(
      result.unanswered
    )}`,
    10
  );

  text(
    `Pass Percentage: ${numberText(
      quiz.pass_percentage
    )}%`,
    10
  );

  text(
    `Duration: ${numberText(
      quiz.duration_minutes || 30
    )} minutes`,
    10
  );

  text(
    `Quiz Date: ${dateText(
      quiz.scheduled_date
    )}`,
    10
  );

  text(
    `Scheduled Time: ${timeText(
      quiz.scheduled_time
    )}`,
    10
  );

  text(
    `Started At: ${dateTimeText(
      result.started_at
    )}`,
    10
  );

  text(
    `Submitted At: ${dateTimeText(
      result.submitted_at
    )}`,
    10
  );

  text(
    `Submission Type: ${
      result.submission_type || "-"
    }`,
    10
  );

  lineGap(10);

  text(
    "QUESTION-WISE ANSWER REVIEW",
    13,
    true
  );

  lineGap(4);

  reviews.forEach(
    (review, index) => {
      ensureSpace(150);

      const questionNumber =
        index + 1;

      text(
        `Q${questionNumber}. ${review.question.question_text}`,
        10,
        true
      );

      const selectedText =
        review.selectedOption?.option_text ||
        "Not Answered";

      const correctText =
        review.correctOption?.option_text ||
        "Not Available";

      const status =
        !review.answer ||
        review.answer.selected_option_id ===
          null
          ? "NOT ANSWERED"
          : review.answer.is_correct
          ? "CORRECT"
          : "WRONG";

      wrapPdfText(
        `Student Answer: ${selectedText}`
      ).forEach((line) => {
        text(line, 9);
      });

      wrapPdfText(
        `Correct Answer: ${correctText}`
      ).forEach((line) => {
        text(line, 9);
      });

      text(
        `Status: ${status}`,
        9,
        true
      );

      text(
        `Marks Awarded: ${numberText(
          review.answer?.marks_awarded ?? 0
        )}`,
        9
      );

      lineGap(8);
    }
  );

  if (commands.length > 0) {
    pages.push(commands);
  }

  return pages;
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
      .eq("result_id", resultId),

    supabase
      .from("quiz_questions")
      .select(
        "id,quiz_id,question_text,question_order,marks,negative_marks"
      )
      .eq("quiz_id", quizId)
      .order("question_order", {
        ascending: true,
      }),

    supabase
      .from("quiz_options")
      .select(
        "id,question_id,option_text,option_order,is_correct"
      )
      .order("option_order", {
        ascending: true,
      }),
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
    (answersResponse.data || []) as QuizAnswer[];

  const questions =
    (questionsResponse.data ||
      []) as QuizQuestion[];

  const options =
    (optionsResponse.data ||
      []) as QuizOption[];

  return questions.map((question) => {
    const answer =
      answers.find(
        (item) =>
          Number(item.question_id) ===
          Number(question.id)
      ) || null;

    const questionOptions =
      options.filter(
        (option) =>
          Number(option.question_id) ===
          Number(question.id)
      );

    const selectedOption =
      answer?.selected_option_id != null
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
        (option) => option.is_correct
      ) || null;

    return {
      question,
      options: questionOptions,
      answer,
      selectedOption,
      correctOption,
    };
  });
}

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const quizIdParam =
    searchParams.get("quizId");

  const isDetail = Boolean(
    quizIdParam
  );

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
  ] = useState<QuizResult | null>(null);

  const [
    questionReviews,
    setQuestionReviews,
  ] = useState<QuestionReview[]>([]);

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
  ] = useState<number | null>(null);

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
      localStorage.getItem("studentId") ||
      localStorage.getItem("student_id");

    let currentStudent: Student | null =
      null;

    if (storedUsername?.trim()) {
      const { data, error } =
        await supabase
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

    if (!currentStudent && storedId) {
      const numericId = Number(storedId);

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
      String(currentStudent.id)
    );

    localStorage.setItem(
      "studentId",
      String(currentStudent.id)
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

    if (currentStudent.student_name) {
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
      currentStudent.student_name || ""
    );

    setStudentClass(
      normalizeClass(
        currentStudent.class_name
      )
    );

    return currentStudent;
  }

  async function loadPage() {
    setLoading(true);
    setError("");
    setResults([]);
    setSelectedQuiz(null);
    setSelectedResult(null);
    setQuestionReviews([]);

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
      .eq("student_id", studentId)
      .order("created_at", {
        ascending: false,
      });

    if (resultError) {
      throw new Error(
        resultError.message
      );
    }

    const rawResults =
      (resultData || []) as QuizResult[];

    if (rawResults.length === 0) {
      setResults([]);
      return;
    }

    const quizIds = [
      ...new Set(
        rawResults.map(
          (item) => Number(item.quiz_id)
        )
      ),
    ];

    const {
      data: quizData,
      error: quizError,
    } = await supabase
      .from("quiz_tests")
      .select(
        "id,title,description,class_name,target_classes,subject,scheduled_date,scheduled_time,duration_minutes,marks_per_question,negative_marks,pass_percentage"
      )
      .in("id", quizIds);

    if (quizError) {
      throw new Error(
        quizError.message
      );
    }

    const quizzes =
      (quizData || []) as Quiz[];

    const quizMap = new Map<
      number,
      Quiz
    >();

    quizzes.forEach((quiz) => {
      quizMap.set(Number(quiz.id), quiz);
    });

    const filteredResults =
      rawResults
        .map((result) => ({
          ...result,
          quiz:
            quizMap.get(
              Number(result.quiz_id)
            ) || null,
        }))
        .filter((item) => {
          if (!item.quiz) return false;

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
      !Number.isFinite(quizId) ||
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
        "id,title,description,class_name,target_classes,subject,scheduled_date,scheduled_time,duration_minutes,marks_per_question,negative_marks,pass_percentage"
      )
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

    const quiz = quizData as Quiz;

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
      .eq("quiz_id", quizId)
      .eq("student_id", studentId)
      .order("created_at", {
        ascending: false,
      })
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

      setQuestionReviews(reviews);
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

  async function downloadResultPdf(
    item?: ResultItem
  ) {
    setPdfLoadingId(
      item?.id ??
        selectedResult?.id ??
        null
    );

    try {
      let result: QuizResult | null =
        item || selectedResult;

      let quiz: Quiz | null =
        item?.quiz || selectedQuiz;

      if (!result || !quiz) {
        throw new Error(
          "Result details are not available."
        );
      }

      let reviews =
        item?.id === selectedResult?.id
          ? questionReviews
          : [];

      if (reviews.length === 0) {
        reviews =
          await fetchQuestionReviews(
            result.id,
            result.quiz_id
          );
      }

      const pages =
        buildPdfPages(
          result,
          quiz,
          reviews,
          studentName,
          studentClass
        );

      const blob =
        createPdfBlob(pages);

      const url =
        URL.createObjectURL(blob);

      const anchor =
        document.createElement("a");

      const safeQuizTitle =
        (quiz.title || "Quiz")
          .replace(
            /[^a-z0-9]+/gi,
            "-"
          )
          .replace(
            /^-+|-+$/g,
            ""
          );

      anchor.href = url;

      anchor.download =
        `RACER-ACADEMY-${safeQuizTitle}-Result.pdf`;

      document.body.appendChild(
        anchor
      );

      anchor.click();

      anchor.remove();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
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
      setPdfLoadingId(null);
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

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        <header className="border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
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

            <button
              onClick={() =>
                router.push(
                  "/student/quiz-tests"
                )
              }
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
            >
              ← Quiz Tests
            </button>
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

              <button
                onClick={loadPage}
                className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black hover:bg-indigo-500"
              >
                TRY AGAIN
              </button>
            </div>
          ) : !isDetail ? (
            <>
              {results.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
                  <div className="text-5xl">
                    RESULTS
                  </div>

                  <h2 className="mt-4 text-xl font-black">
                    No quiz results yet
                  </h2>

                  <p className="mt-2 text-sm text-slate-400">
                    Your completed quiz results
                    will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  {results.map(
                    (item) => (
                      <div
                        key={item.id}
                        className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-xl"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h2 className="text-xl font-black">
                              {item.quiz
                                ?.title ||
                                "Quiz"}
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                              {item.quiz
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
                              review.question
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
                The requested quiz result could
                not be found.
              </p>

              <button
                onClick={() =>
                  router.push(
                    "/student/quiz-tests/results"
                  )
                }
                className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black hover:bg-indigo-500"
              >
                VIEW ALL RESULTS
              </button>
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