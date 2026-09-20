"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
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

type StudentResultRow = {
  student: Student;
  quiz: QuizTest;
  result: QuizResult | null;
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

function cleanText(
  value: unknown,
  fallback = "—"
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  const text = String(value).trim();

  return text || fallback;
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
      hour12: true,
      timeZone: "Asia/Kolkata",
    }
  );
}

function statusText(
  result: QuizResult | null
): string {
  if (!result) {
    return "NOT ATTEMPTED";
  }

  const status =
    cleanText(
      result.result_status,
      ""
    );

  return status
    ? status.toUpperCase()
    : "SUBMITTED";
}

function isPass(
  result: QuizResult | null
): boolean {
  if (!result) {
    return false;
  }

  const status =
    statusText(result);

  if (
    status === "PASS" ||
    status === "PASSED"
  ) {
    return true;
  }

  if (
    status === "FAIL" ||
    status === "FAILED"
  ) {
    return false;
  }

  return (
    safeNumber(
      result.percentage
    ) >= 0
  );
}

function getLatestResult(
  results: QuizResult[],
  studentId: number,
  quizId: number
): QuizResult | null {
  const rows = results
    .filter(
      (result) =>
        Number(
          result.student_id
        ) ===
          Number(studentId) &&
        Number(
          result.quiz_id
        ) ===
          Number(quizId)
    )
    .sort(
      (a, b) => {
        const attemptA =
          safeNumber(
            a.attempt_number,
            1
          );

        const attemptB =
          safeNumber(
            b.attempt_number,
            1
          );

        if (
          attemptA !==
          attemptB
        ) {
          return (
            attemptA -
            attemptB
          );
        }

        return (
          new Date(
            a.created_at || 0
          ).getTime() -
          new Date(
            b.created_at || 0
          ).getTime()
        );
      }
    );

  return rows.length
    ? rows[
        rows.length - 1
      ]
    : null;
}

function getAllQuizClasses(
  quizzes: QuizTest[],
  students: Student[]
): string[] {
  const set =
    new Set<string>();

  quizzes.forEach(
    (quiz) => {
      if (
        quiz.class_name?.trim()
      ) {
        set.add(
          quiz.class_name.trim()
        );
      }

      if (
        Array.isArray(
          quiz.target_classes
        )
      ) {
        quiz.target_classes.forEach(
          (className) => {
            if (
              typeof className ===
                "string" &&
              className.trim()
            ) {
              set.add(
                className.trim()
              );
            }
          }
        );
      }
    }
  );

  students.forEach(
    (student) => {
      if (
        student.class_name?.trim()
      ) {
        set.add(
          student.class_name.trim()
        );
      }
    }
  );

  return Array.from(
    set
  ).sort(
    (a, b) =>
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
}

function getQuizTargetClasses(
  quiz: QuizTest
): string[] {
  const set =
    new Set<string>();

  if (
    quiz.class_name?.trim()
  ) {
    set.add(
      quiz.class_name.trim()
    );
  }

  if (
    Array.isArray(
      quiz.target_classes
    )
  ) {
    quiz.target_classes.forEach(
      (className) => {
        if (
          typeof className ===
            "string" &&
          className.trim()
        ) {
          set.add(
            className.trim()
          );
        }
      }
    );
  }

  return Array.from(
    set
  );
}

function studentBelongsToQuiz(
  student: Student,
  quiz: QuizTest
): boolean {
  const targets =
    getQuizTargetClasses(
      quiz
    );

  if (
    targets.length === 0
  ) {
    return true;
  }

  return targets.includes(
    cleanText(
      student.class_name,
      ""
    )
  );
}

function drawSignature(
  doc: jsPDF,
  x: number,
  y: number
) {
  doc.setFont(
    "times",
    "italic"
  );

  doc.setFontSize(17);

  doc.text(
    "RACER Academy",
    x,
    y
  );

  doc.setFontSize(8);

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.text(
    "Authorized Signature",
    x + 7,
    y + 6
  );

  doc.setLineWidth(
    0.5
  );

  doc.line(
    x,
    y + 2,
    x + 45,
    y + 2
  );
}

function drawStamp(
  doc: jsPDF,
  x: number,
  y: number
) {
  doc.setDrawColor(
    80,
    80,
    80
  );

  doc.setLineWidth(
    0.8
  );

  doc.circle(
    x,
    y,
    17
  );

  doc.setLineWidth(
    0.35
  );

  doc.circle(
    x,
    y,
    13
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(7);

  doc.text(
    "RACER ACADEMY",
    x,
    y - 7,
    {
      align:
        "center",
    }
  );

  doc.setFontSize(6);

  doc.text(
    "OFFICIAL RESULT",
    x,
    y + 1,
    {
      align:
        "center",
    }
  );

  doc.setFontSize(5);

  doc.text(
    "VERIFIED",
    x,
    y + 7,
    {
      align:
        "center",
    }
  );
}

function createPdfHeader(
  doc: jsPDF,
  title: string,
  dateText: string
) {
  const pageWidth =
    doc.internal.pageSize
      .getWidth();

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(20);

  doc.text(
    "RACER ACADEMY",
    pageWidth / 2,
    20,
    {
      align:
        "center",
    }
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(10);

  doc.text(
    "Student & Teacher Quiz Results",
    pageWidth / 2,
    27,
    {
      align:
        "center",
    }
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(14);

  doc.text(
    title,
    pageWidth / 2,
    39,
    {
      align:
        "center",
    }
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(9);

  doc.text(
    `Result Date: ${dateText}`,
    pageWidth / 2,
    46,
    {
      align:
        "center",
    }
  );

  doc.setLineWidth(
    0.6
  );

  doc.line(
    15,
    51,
    pageWidth - 15,
    51
  );
}

function addPdfFooter(
  doc: jsPDF,
  dateText: string
) {
  const pageWidth =
    doc.internal.pageSize
      .getWidth();

  const pageHeight =
    doc.internal.pageSize
      .getHeight();

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(7);

  doc.text(
    `RACER ACADEMY • Result Date: ${dateText}`,
    15,
    pageHeight - 10
  );

  doc.text(
    `Page ${doc.getNumberOfPages()}`,
    pageWidth - 15,
    pageHeight - 10,
    {
      align:
        "right",
    }
  );
}

function addStudentPdf(
  doc: jsPDF,
  row: StudentResultRow,
  dateText: string
) {
  const pageWidth =
    doc.internal.pageSize
      .getWidth();

  const result =
    row.result;

  const student =
    row.student;

  const quiz =
    row.quiz;

  createPdfHeader(
    doc,
    "INDIVIDUAL QUIZ RESULT",
    dateText
  );

  let y = 62;

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(11);

  doc.text(
    "STUDENT DETAILS",
    15,
    y
  );

  y += 8;

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(9);

  const details = [
    [
      "Student Name",
      cleanText(
        student.student_name
      ),
    ],
    [
      "Username",
      cleanText(
        student.student_username
      ),
    ],
    [
      "Class",
      cleanText(
        student.class_name
      ),
    ],
    [
      "Student ID",
      String(
        student.id
      ),
    ],
  ];

  details.forEach(
    ([label, value]) => {
      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.text(
        `${label}:`,
        18,
        y
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.text(
        value,
        60,
        y
      );

      y += 7;
    }
  );

  y += 5;

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(11);

  doc.text(
    "QUIZ DETAILS",
    15,
    y
  );

  y += 8;

  doc.setFontSize(9);

  const quizDetails = [
    [
      "Quiz",
      cleanText(
        quiz.title
      ),
    ],
    [
      "Subject",
      cleanText(
        quiz.subject
      ),
    ],
    [
      "Date",
      formatDate(
        quiz.scheduled_date
      ),
    ],
    [
      "Time",
      formatTime(
        quiz.scheduled_time
      ),
    ],
    [
      "Duration",
      `${safeNumber(
        quiz.duration_minutes,
        30
      )} minutes`,
    ],
  ];

  quizDetails.forEach(
    ([label, value]) => {
      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.text(
        `${label}:`,
        18,
        y
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.text(
        value,
        60,
        y
      );

      y += 7;
    }
  );

  y += 5;

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(11);

  doc.text(
    "RESULT DETAILS",
    15,
    y
  );

  y += 9;

  const resultRows = [
    [
      "Total Questions",
      result
        ? String(
            safeNumber(
              result.total_questions
            )
          )
        : "0",
    ],
    [
      "Correct Answers",
      result
        ? String(
            safeNumber(
              result.correct_answers
            )
          )
        : "0",
    ],
    [
      "Wrong Answers",
      result
        ? String(
            safeNumber(
              result.wrong_answers
            )
          )
        : "0",
    ],
    [
      "Unanswered",
      result
        ? String(
            safeNumber(
              result.unanswered
            )
          )
        : "0",
    ],
    [
      "Total Marks",
      result
        ? safeNumber(
            result.total_marks
          ).toFixed(2)
        : "0.00",
    ],
    [
      "Obtained Marks",
      result
        ? safeNumber(
            result.obtained_marks
          ).toFixed(2)
        : "0.00",
    ],
    [
      "Percentage",
      result
        ? `${safeNumber(
            result.percentage
          ).toFixed(2)}%`
        : "0.00%",
    ],
    [
      "Status",
      statusText(
        result
      ),
    ],
    [
      "Submission",
      result
        ? cleanText(
            result.submission_type
          )
        : "—",
    ],
    [
      "Attempt",
      result
        ? String(
            Math.max(
              1,
              safeNumber(
                result.attempt_number,
                1
              )
            )
          )
        : "0",
    ],
  ];

  const tableX = 15;
  const tableWidth =
    pageWidth - 30;
  const rowHeight = 8;
  const col1 =
    75;

  resultRows.forEach(
    ([label, value]) => {
      doc.setDrawColor(
        210,
        210,
        210
      );

      doc.rect(
        tableX,
        y,
        tableWidth,
        rowHeight
      );

      doc.line(
        tableX + col1,
        y,
        tableX + col1,
        y + rowHeight
      );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.text(
        label,
        tableX + 3,
        y + 5.5
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.text(
        value,
        tableX + col1 + 3,
        y + 5.5
      );

      y += rowHeight;
    }
  );

  y += 8;

  if (result) {
    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(8);

    doc.text(
      `Started: ${formatDateTime(
        result.started_at
      )}`,
      15,
      y
    );

    y += 6;

    doc.text(
      `Submitted: ${formatDateTime(
        result.submitted_at
      )}`,
      15,
      y
    );
  }

  const bottomY =
    doc.internal.pageSize
      .getHeight() - 35;

  drawSignature(
    doc,
    pageWidth - 65,
    bottomY
  );

  drawStamp(
    doc,
    pageWidth - 25,
    bottomY - 3
  );

  addPdfFooter(
    doc,
    dateText
  );
}

function addOverallPdfPage(
  doc: jsPDF,
  rows: StudentResultRow[],
  dateText: string,
  subjectText: string,
  classText: string
) {
  const pageWidth =
    doc.internal.pageSize
      .getWidth();

  createPdfHeader(
    doc,
    "OVERALL QUIZ RESULT REPORT",
    dateText
  );

  let y = 59;

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(9);

  doc.text(
    `Subject: ${subjectText}`,
    15,
    y
  );

  doc.text(
    `Class: ${classText}`,
    pageWidth - 15,
    y,
    {
      align:
        "right",
    }
  );

  y += 8;

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(8);

  const headers = [
    "Student",
    "Class",
    "Quiz",
    "Subject",
    "Marks",
    "%",
    "Status",
  ];

  const widths = [
    34,
    20,
    42,
    25,
    20,
    17,
    27,
  ];

  const startX = 10;
  const rowHeight = 8;

  let x = startX;

  doc.setFont(
    "helvetica",
    "bold"
  );

  headers.forEach(
    (
      header,
      index
    ) => {
      doc.rect(
        x,
        y,
        widths[index],
        rowHeight
      );

      doc.text(
        header,
        x + 2,
        y + 5.5
      );

      x += widths[index];
    }
  );

  y += rowHeight;

  doc.setFont(
    "helvetica",
    "normal"
  );

  rows.forEach(
    (row) => {
      if (
        y >
        doc.internal.pageSize
          .getHeight() -
          25
      ) {
        addPdfFooter(
          doc,
          dateText
        );

        doc.addPage();

        createPdfHeader(
          doc,
          "OVERALL QUIZ RESULT REPORT",
          dateText
        );

        y = 59;

        x = startX;

        doc.setFont(
          "helvetica",
          "bold"
        );

        headers.forEach(
          (
            header,
            index
          ) => {
            doc.rect(
              x,
              y,
              widths[index],
              rowHeight
            );

            doc.text(
              header,
              x + 2,
              y + 5.5
            );

            x += widths[index];
          }
        );

        y += rowHeight;

        doc.setFont(
          "helvetica",
          "normal"
        );
      }

      const result =
        row.result;

      const values = [
        cleanText(
          row.student.student_name
        ),
        cleanText(
          row.student.class_name
        ),
        cleanText(
          row.quiz.title
        ),
        cleanText(
          row.quiz.subject
        ),
        result
          ? `${safeNumber(
              result.obtained_marks
            ).toFixed(1)}/${safeNumber(
              result.total_marks
            ).toFixed(1)}`
          : "0/0",
        result
          ? `${safeNumber(
              result.percentage
            ).toFixed(1)}%`
          : "0%",
        statusText(
          result
        ),
      ];

      x = startX;

      values.forEach(
        (
          value,
          index
        ) => {
          doc.rect(
            x,
            y,
            widths[index],
            rowHeight
          );

          let displayValue =
            value;

          if (
            displayValue.length >
            22
          ) {
            displayValue =
              displayValue.substring(
                0,
                20
              ) + "…";
          }

          doc.text(
            displayValue,
            x + 2,
            y + 5.5
          );

          x +=
            widths[index];
        }
      );

      y += rowHeight;
    }
  );

  y += 8;

  if (
    y >
    doc.internal.pageSize
      .getHeight() -
      45
  ) {
    addPdfFooter(
      doc,
      dateText
    );

    doc.addPage();

    createPdfHeader(
      doc,
      "OVERALL QUIZ RESULT REPORT",
      dateText
    );

    y = 62;
  }

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(9);

  doc.text(
    `Total Records: ${rows.length}`,
    15,
    y
  );

  y += 6;

  const submitted =
    rows.filter(
      (row) =>
        Boolean(
          row.result
        )
    ).length;

  const pass =
    rows.filter(
      (row) =>
        row.result &&
        isPass(
          row.result
        )
    ).length;

  const fail =
    rows.filter(
      (row) =>
        row.result &&
        !isPass(
          row.result
        )
    ).length;

  const notAttempted =
    rows.filter(
      (row) =>
        !row.result
    ).length;

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.text(
    `Submitted: ${submitted}    Not Attempted: ${notAttempted}    Pass: ${pass}    Fail: ${fail}`,
    15,
    y
  );

  const signatureY =
    doc.internal.pageSize
      .getHeight() - 33;

  drawSignature(
    doc,
    pageWidth - 65,
    signatureY
  );

  drawStamp(
    doc,
    pageWidth - 25,
    signatureY - 3
  );

  addPdfFooter(
    doc,
    dateText
  );
}

function TeacherQuizResultsContent() {
  const searchParams =
    useSearchParams();

  const initialQuizId =
    Number(
      searchParams.get(
        "quizId"
      )
    );

  const [
    quizzes,
    setQuizzes,
  ] =
    useState<QuizTest[]>([]);

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
    selectedDate,
    setSelectedDate,
  ] =
    useState("ALL");

  const [
    selectedSubject,
    setSelectedSubject,
  ] =
    useState("ALL");

  const [
    selectedClass,
    setSelectedClass,
  ] =
    useState("ALL");

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
    useState<Set<string>>(
      new Set()
    );

  const [
    reattemptQuizIds,
    setReattemptQuizIds,
  ] =
    useState<Set<string>>(
      new Set()
    );

  const [
    reattemptLoadingKey,
    setReattemptLoadingKey,
  ] =
    useState("");

  const [
    message,
    setMessage,
  ] =
    useState("");

  const loadData =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const {
            data: quizRows,
            error:
              quizError,
          } =
            await supabase
              .from(
                "quiz_tests"
              )
              .select("*")
              .order(
                "scheduled_date",
                {
                  ascending:
                    false,
                }
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              );

          if (quizError) {
            throw new Error(
              quizError.message
            );
          }

          const {
            data: studentRows,
            error:
              studentError,
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

          if (studentError) {
            throw new Error(
              studentError.message
            );
          }

          const quizIds =
            (
              quizRows || []
            ).map(
              (quiz) =>
                Number(
                  quiz.id
                )
            );

          let resultRows:
            QuizResult[] = [];

          if (
            quizIds.length >
            0
          ) {
            const {
              data:
                resultData,
              error:
                resultError,
            } =
              await supabase
                .from(
                  "quiz_results"
                )
                .select("*")
                .in(
                  "quiz_id",
                  quizIds
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      true,
                  }
                );

            if (resultError) {
              throw new Error(
                resultError.message
              );
            }

            resultRows =
              (
                resultData ||
                []
              ).map(
                (result) => ({
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
          }

          const cleanQuizzes =
            (
              quizRows || []
            ).map(
              (quiz) => ({
                ...quiz,
                id: Number(
                  quiz.id
                ),
              })
            );

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

          setQuizzes(
            cleanQuizzes
          );

          setStudents(
            cleanStudents
          );

          setResults(
            resultRows
          );

          if (
            initialQuizId &&
            cleanQuizzes.some(
              (quiz) =>
                quiz.id ===
                initialQuizId
            )
          ) {
            const initialQuiz =
              cleanQuizzes.find(
                (quiz) =>
                  quiz.id ===
                  initialQuizId
              );

            if (
              initialQuiz?.scheduled_date
            ) {
              setSelectedDate(
                initialQuiz.scheduled_date
              );
            }
          }

          setExpandedDates(
            new Set()
          );

          setExpandedClasses(
            new Set()
          );

          setExpandedStudents(
            new Set()
          );
        } catch (
          loadError
        ) {
          console.error(
            "TEACHER RESULTS LOAD ERROR:",
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
      [initialQuizId]
    );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const availableDates =
    useMemo(() => {
      return Array.from(
        new Set(
          quizzes
            .map(
              (quiz) =>
                quiz.scheduled_date
            )
            .filter(
              (
                date
              ): date is string =>
                Boolean(date)
            )
        )
      ).sort(
        (a, b) =>
          new Date(
            b
          ).getTime() -
          new Date(
            a
          ).getTime()
      );
    }, [quizzes]);

  const availableSubjects =
    useMemo(() => {
      return Array.from(
        new Set(
          quizzes
            .map(
              (quiz) =>
                quiz.subject?.trim()
            )
            .filter(
              (
                subject
              ): subject is string =>
                Boolean(subject)
            )
        )
      ).sort(
        (a, b) =>
          a.localeCompare(
            b,
            undefined,
            {
              sensitivity:
                "base",
            }
          )
      );
    }, [quizzes]);

  const availableClasses =
    useMemo(
      () =>
        getAllQuizClasses(
          quizzes,
          students
        ),
      [
        quizzes,
        students,
      ]
    );

  const filteredQuizzes =
    useMemo(() => {
      return quizzes.filter(
        (quiz) => {
          if (
            selectedDate !==
              "ALL" &&
            quiz.scheduled_date !==
              selectedDate
          ) {
            return false;
          }

          if (
            selectedSubject !==
              "ALL" &&
            cleanText(
              quiz.subject,
              ""
            ) !==
              selectedSubject
          ) {
            return false;
          }

          if (
            selectedClass !==
              "ALL"
          ) {
            const targets =
              getQuizTargetClasses(
                quiz
              );

            if (
              targets.length >
                0 &&
              !targets.includes(
                selectedClass
              )
            ) {
              return false;
            }
          }

          return true;
        }
      );
    }, [
      quizzes,
      selectedDate,
      selectedSubject,
      selectedClass,
    ]);

  const resultRows =
    useMemo(() => {
      const rows: StudentResultRow[] =
        [];

      filteredQuizzes.forEach(
        (quiz) => {
          students.forEach(
            (student) => {
              if (
                !studentBelongsToQuiz(
                  student,
                  quiz
                )
              ) {
                return;
              }

              if (
                selectedClass !==
                  "ALL" &&
                cleanText(
                  student.class_name,
                  ""
                ) !==
                  selectedClass
              ) {
                return;
              }

              rows.push({
                student,
                quiz,
                result:
                  getLatestResult(
                    results,
                    student.id,
                    quiz.id
                  ),
              });
            }
          );
        }
      );

      return rows.sort(
        (a, b) => {
          const dateA =
            a.quiz
              .scheduled_date ||
            "";

          const dateB =
            b.quiz
              .scheduled_date ||
            "";

          if (
            dateA !==
            dateB
          ) {
            return dateB.localeCompare(
              dateA
            );
          }

          const classCompare =
            cleanText(
              a.student
                .class_name,
              ""
            ).localeCompare(
              cleanText(
                b.student
                  .class_name,
                ""
              ),
              undefined,
              {
                numeric:
                  true,
              }
            );

          if (
            classCompare !==
            0
          ) {
            return classCompare;
          }

          return cleanText(
            a.student
              .student_name,
            ""
          ).localeCompare(
            cleanText(
              b.student
                .student_name,
                ""
              ),
              undefined,
              {
                sensitivity:
                  "base",
              }
            );
        }
      );
    }, [
      filteredQuizzes,
      students,
      results,
      selectedClass,
    ]);

  const groupedData =
    useMemo(() => {
      const map =
        new Map<
          string,
          Map<
            string,
            StudentResultRow[]
          >
        >();

      resultRows.forEach(
        (row) => {
          const date =
            row.quiz
              .scheduled_date ||
            "unknown";

          const className =
            cleanText(
              row.student
                .class_name,
              "Unknown Class"
            );

          if (
            !map.has(date)
          ) {
            map.set(
              date,
              new Map()
            );
          }

          const classMap =
            map.get(date)!;

          if (
            !classMap.has(
              className
            )
          ) {
            classMap.set(
              className,
              []
            );
          }

          classMap
            .get(
              className
            )!
            .push(row);
        }
      );

      return Array.from(
        map.entries()
      ).sort(
        ([dateA], [dateB]) =>
          dateB.localeCompare(
            dateA
          )
      );
    }, [resultRows]);

  const totalRecords =
    resultRows.length;

  const submitted =
    resultRows.filter(
      (row) =>
        Boolean(
          row.result
        )
    ).length;

  const notAttempted =
    totalRecords -
    submitted;

  const passCount =
    resultRows.filter(
      (row) =>
        row.result &&
        isPass(
          row.result
        )
    ).length;

  const failCount =
    resultRows.filter(
      (row) =>
        row.result &&
        !isPass(
          row.result
        )
    ).length;

  const attemptCount =
    results.filter(
      (result) =>
        filteredQuizzes.some(
          (quiz) =>
            quiz.id ===
            result.quiz_id
        ) &&
        (
          selectedClass ===
            "ALL" ||
          students.some(
            (student) =>
              student.id ===
                result.student_id &&
              cleanText(
                student.class_name,
                ""
              ) ===
                selectedClass
          )
        )
    ).length;

  const averagePercentage =
    submitted > 0
      ? resultRows
          .filter(
            (row) =>
              row.result
          )
          .reduce(
            (
              total,
              row
            ) =>
              total +
              safeNumber(
                row.result
                  ?.percentage
              ),
            0
          ) /
        submitted
      : 0;

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
    key: string
  ) {
    setExpandedStudents(
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

  async function allowReattempt(
    row: StudentResultRow
  ) {
    const key =
      `${row.quiz.id}_${row.student.id}`;

    setReattemptLoadingKey(
      key
    );

    setMessage("");

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
        throw new Error(
          "Teacher ID not found. Please login again."
        );
      }

      const response =
        await fetch(
          "/api/quiz-tests/reattempt",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              {
                action:
                  "allow",
                quizId:
                  row.quiz.id,
                studentId:
                  row.student.id,
                teacherId,
              }
            ),
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

          next.add(key);

          return next;
        }
      );

      setMessage(
        `Re-attempt allowed for ${cleanText(
          row.student.student_name,
          "student"
        )}.`
      );
    } catch (
      allowError
    ) {
      console.error(
        "ALLOW REATTEMPT ERROR:",
        allowError
      );

      setMessage(
        allowError instanceof
          Error
          ? allowError.message
          : "Unable to allow re-attempt."
      );
    } finally {
      setReattemptLoadingKey(
        ""
      );
    }
  }

  function downloadOverallPdf() {
    if (
      resultRows.length ===
      0
    ) {
      setMessage(
        "There are no results to download for the selected filters."
      );
      return;
    }

    const doc =
      new jsPDF({
        orientation:
          "landscape",
        unit:
          "mm",
        format:
          "a4",
      });

    const dateText =
      selectedDate ===
      "ALL"
        ? "All Quiz Dates"
        : formatDate(
            selectedDate
          );

    const subjectText =
      selectedSubject ===
      "ALL"
        ? "All Subjects"
        : selectedSubject;

    const classText =
      selectedClass ===
      "ALL"
        ? "All Classes"
        : selectedClass;

    addOverallPdfPage(
      doc,
      resultRows,
      dateText,
      subjectText,
      classText
    );

    doc.save(
      `RACER-Academy-Overall-Results-${new Date()
        .toISOString()
        .slice(
          0,
          10
        )}.pdf`
    );
  }

  function downloadStudentPdf(
    row: StudentResultRow
  ) {
    const doc =
      new jsPDF({
        orientation:
          "portrait",
        unit:
          "mm",
        format:
          "a4",
      });

    const dateText =
      row.quiz
        .scheduled_date
        ? formatDate(
            row.quiz
              .scheduled_date
          )
        : "Result Date";

    addStudentPdf(
      doc,
      row,
      dateText
    );

    const studentName =
      cleanText(
        row.student
          .student_name,
        "Student"
      )
        .replace(
          /[^a-zA-Z0-9]+/g,
          "-"
        )
        .replace(
          /^-+|-+$/g,
          ""
        );

    doc.save(
      `RACER-Academy-${studentName}-Result-${row.quiz.id}.pdf`
    );
  }

  function resetFilters() {
    setSelectedDate(
      "ALL"
    );

    setSelectedSubject(
      "ALL"
    );

    setSelectedClass(
      "ALL"
    );

    setExpandedDates(
      new Set()
    );

    setExpandedClasses(
      new Set()
    );

    setExpandedStudents(
      new Set()
    );
  }

  function goBack() {
    window.history.back();
  }

  function goDashboard() {
    window.location.href =
      "/teacher";
  }

  function logout() {
    const keys = [
      "teacher_username",
      "teacherUsername",
      "teacherLoggedIn",
      "attendance_role",
      "attendance_username",
      "attendance_teacher_id",
      "teacher_id",
    ];

    keys.forEach(
      (key) =>
        localStorage.removeItem(
          key
        )
    );

    window.location.href =
      "/";
  }

  if (loading) {
    return (
      <main
        style={
          styles.page
        }
      >
        <div
          style={
            styles.loadingCard
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
            Loading All Quiz Results...
          </h2>

          <p
            style={
              styles.loadingText
            }
          >
            Loading quizzes, students
            and result records.
          </p>
        </div>
      </main>
    );
  }

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
        <header
          style={
            styles.header
          }
        >
          <div>
            <div
              style={
                styles.brand
              }
            >
              RACER ACADEMY
            </div>

            <h1
              style={
                styles.heading
              }
            >
              Teacher Quiz Results
            </h1>

            <p
              style={
                styles.subtitle
              }
            >
              Complete quiz-result management
              • Datewise • Classwise •
              Studentwise
            </p>
          </div>

          <div
            style={
              styles.headerActions
            }
          >
            <button
              type="button"
              onClick={
                goBack
              }
              style={
                styles.actionButton
              }
            >
              ← Back
            </button>

            <button
              type="button"
              onClick={
                goDashboard
              }
              style={
                styles.actionButton
              }
            >
              Dashboard
            </button>

            <button
              type="button"
              onClick={
                loadData
              }
              style={
                styles.actionButton
              }
            >
              Refresh
            </button>

            <button
              type="button"
              onClick={
                logout
              }
              style={
                styles.logoutButton
              }
            >
              Logout
            </button>
          </div>
        </header>

        <section
          style={
            styles.filtersCard
          }
        >
          <div
            style={
              styles.filterHeading
            }
          >
            <div>
              <h2
                style={
                  styles.filterTitle
                }
              >
                Result Filters
              </h2>

              <p
                style={
                  styles.filterSubtitle
                }
              >
                Select any date, subject or
                class to view the required
                results.
              </p>
            </div>

            <button
              type="button"
              onClick={
                resetFilters
              }
              style={
                styles.resetButton
              }
            >
              Reset Filters
            </button>
          </div>

          <div
            style={
              styles.filterGrid
            }
          >
            <label
              style={
                styles.filterLabel
              }
            >
              <span>
                Quiz Date
              </span>

              <select
                value={
                  selectedDate
                }
                onChange={(event) =>
                  setSelectedDate(
                    event.target
                      .value
                  )
                }
                style={
                  styles.select
                }
              >
                <option value="ALL">
                  All Dates
                </option>

                {availableDates.map(
                  (date) => (
                    <option
                      key={
                        date
                      }
                      value={
                        date
                      }
                    >
                      {formatDate(
                        date
                      )}
                    </option>
                  )
                )}
              </select>
            </label>

            <label
              style={
                styles.filterLabel
              }
            >
              <span>
                Subject
              </span>

              <select
                value={
                  selectedSubject
                }
                onChange={(event) =>
                  setSelectedSubject(
                    event.target
                      .value
                  )
                }
                style={
                  styles.select
                }
              >
                <option value="ALL">
                  All Subjects
                </option>

                {availableSubjects.map(
                  (subject) => (
                    <option
                      key={
                        subject
                      }
                      value={
                        subject
                      }
                    >
                      {subject}
                    </option>
                  )
                )}
              </select>
            </label>

            <label
              style={
                styles.filterLabel
              }
            >
              <span>
                Class
              </span>

              <select
                value={
                  selectedClass
                }
                onChange={(event) =>
                  setSelectedClass(
                    event.target
                      .value
                  )
                }
                style={
                  styles.select
                }
              >
                <option value="ALL">
                  All Classes
                </option>

                {availableClasses.map(
                  (className) => (
                    <option
                      key={
                        className
                      }
                      value={
                        className
                      }
                    >
                      {className}
                    </option>
                  )
                )}
              </select>
            </label>
          </div>

          <div
            style={
              styles.filterInfo
            }
          >
            Showing{" "}
            <strong>
              {
                filteredQuizzes.length
              }
            </strong>{" "}
            quiz
            {filteredQuizzes.length ===
            1
              ? ""
              : "zes"}{" "}
            and{" "}
            <strong>
              {
                resultRows.length
              }
            </strong>{" "}
            student result records.
          </div>
        </section>

        <section
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
              Total Records
            </span>

            <strong
              style={
                styles.statValue
              }
            >
              {totalRecords}
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
              {submitted}
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
              Not Attempted
            </span>

            <strong
              style={
                styles.statValue
              }
            >
              {notAttempted}
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
              Pass
            </span>

            <strong
              style={
                styles.statValue
              }
            >
              {passCount}
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
              Fail
            </span>

            <strong
              style={
                styles.statValue
              }
            >
              {failCount}
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
              Total Attempts
            </span>

            <strong
              style={
                styles.statValue
              }
            >
              {attemptCount}
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
              Average %
            </span>

            <strong
              style={
                styles.statValue
              }
            >
              {averagePercentage.toFixed(
                2
              )}
              %
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
              Quizzes
            </span>

            <strong
              style={
                styles.statValue
              }
            >
              {
                filteredQuizzes.length
              }
            </strong>
          </div>
        </section>

        <section
          style={
            styles.downloadCard
          }
        >
          <div>
            <div
              style={
                styles.downloadTitle
              }
            >
              Result Reports
            </div>

            <div
              style={
                styles.downloadText
              }
            >
              Download the complete filtered
              report or an individual student's
              detailed result PDF.
            </div>
          </div>

          <button
            type="button"
            onClick={
              downloadOverallPdf
            }
            disabled={
              resultRows.length ===
              0
            }
            style={
              resultRows.length ===
              0
                ? styles.disabledDownload
                : styles.downloadButton
            }
          >
            Download Overall PDF
          </button>
        </section>

        {message && (
          <div
            style={
              styles.message
            }
          >
            {message}
          </div>
        )}

        <section
          style={
            styles.resultsCard
          }
        >
          <div
            style={
              styles.resultsHeader
            }
          >
            <div>
              <h2
                style={
                  styles.resultsTitle
                }
              >
                All Quiz Results
              </h2>

              <p
                style={
                  styles.resultsSubtitle
                }
              >
                Date → Class → Student →
                Quiz Details
              </p>
            </div>
          </div>

          {groupedData.length ===
          0 ? (
            <div
              style={
                styles.emptyCard
              }
            >
              <strong>
                No results found
              </strong>

              <p>
                Try changing the selected
                date, subject or class.
              </p>
            </div>
          ) : (
            groupedData.map(
              (
                [
                  date,
                  classMap,
                ]
              ) => {
                const dateOpen =
                  expandedDates.has(
                    date
                  );

                return (
                  <div
                    key={
                      date
                    }
                    style={
                      styles.dateGroup
                    }
                  >
                    <button
                      type="button"
                      onClick={() =>
                        toggleDate(
                          date
                        )
                      }
                      style={
                        styles.dateButton
                      }
                    >
                      <div>
                        <span
                          style={
                            styles.smallLabel
                          }
                        >
                          QUIZ DATE
                        </span>

                        <strong
                          style={
                            styles.dateTitle
                          }
                        >
                          {formatDate(
                            date
                          )}
                        </strong>
                      </div>

                      <div
                        style={
                          styles.dateRight
                        }
                      >
                        <span
                          style={
                            styles.countBadge
                          }
                        >
                          {Array.from(
                            classMap.values()
                          ).reduce(
                            (
                              total,
                              rows
                            ) =>
                              total +
                              rows.length,
                            0
                          )}{" "}
                          records
                        </span>

                        <span
                          style={
                            styles.arrow
                          }
                        >
                          {dateOpen
                            ? "−"
                            : "+"}
                        </span>
                      </div>
                    </button>

                    {dateOpen && (
                      <div
                        style={
                          styles.dateContent
                        }
                      >
                        {Array.from(
                          classMap.entries()
                        ).map(
                          (
                            [
                              className,
                              rows,
                            ]
                          ) => {
                            const classKey =
                              `${date}_${className}`;

                            const classOpen =
                              expandedClasses.has(
                                classKey
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
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleClass(
                                      classKey
                                    )
                                  }
                                  style={
                                    styles.classButton
                                  }
                                >
                                  <div>
                                    <span
                                      style={
                                        styles.classBadge
                                      }
                                    >
                                      CLASS
                                    </span>

                                    <strong
                                      style={
                                        styles.className
                                      }
                                    >
                                      {
                                        className
                                      }
                                    </strong>
                                  </div>

                                  <div
                                    style={
                                      styles.dateRight
                                    }
                                  >
                                    <span
                                      style={
                                        styles.countBadge
                                      }
                                    >
                                      {
                                        rows.length
                                      }{" "}
                                      students
                                    </span>

                                    <span
                                      style={
                                        styles.arrow
                                      }
                                    >
                                      {classOpen
                                        ? "−"
                                        : "+"}
                                    </span>
                                  </div>
                                </button>

                                {classOpen && (
                                  <div
                                    style={
                                      styles.classContent
                                    }
                                  >
                                    {rows.map(
                                      (
                                        row
                                      ) => {
                                        const studentKey =
                                          `${row.quiz.id}_${row.student.id}`;

                                        const studentOpen =
                                          expandedStudents.has(
                                            studentKey
                                          );

                                        const result =
                                          row.result;

                                        return (
                                          <div
                                            key={
                                              studentKey
                                            }
                                            style={
                                              styles.studentCard
                                            }
                                          >
                                            <button
                                              type="button"
                                              onClick={() =>
                                                toggleStudent(
                                                  studentKey
                                                )
                                              }
                                              style={
                                                styles.studentButton
                                              }
                                            >
                                              <div
                                                style={
                                                  styles.studentLeft
                                                }
                                              >
                                                <div
                                                  style={
                                                    styles.avatar
                                                  }
                                                >
                                                  {cleanText(
                                                    row.student
                                                      .student_name,
                                                    "S"
                                                  )
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
                                                    {cleanText(
                                                      row.student
                                                        .student_name,
                                                      "Unnamed Student"
                                                    )}
                                                  </strong>

                                                  <div
                                                    style={
                                                      styles.studentMeta
                                                    }
                                                  >
                                                    {cleanText(
                                                      row.student
                                                        .student_username
                                                    )}{" "}
                                                    •{" "}
                                                    {cleanText(
                                                      row.quiz.subject
                                                    )}{" "}
                                                    •{" "}
                                                    {cleanText(
                                                      row.quiz.title
                                                    )}
                                                  </div>
                                                </div>
                                              </div>

                                              <div
                                                style={
                                                  styles.studentRight
                                                }
                                              >
                                                <div
                                                  style={
                                                    styles.resultMini
                                                  }
                                                >
                                                  <strong>
                                                    {result
                                                      ? `${safeNumber(
                                                          result.percentage
                                                        ).toFixed(
                                                          2
                                                        )}%`
                                                      : "0.00%"}
                                                  </strong>

                                                  <span
                                                    style={
                                                      result
                                                        ? isPass(
                                                            result
                                                          )
                                                          ? styles.passBadge
                                                          : styles.failBadge
                                                        : styles.pendingBadge
                                                    }
                                                  >
                                                    {statusText(
                                                      result
                                                    )}
                                                  </span>
                                                </div>

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
                                                  styles.studentDetails
                                                }
                                              >
                                                <div
                                                  style={
                                                    styles.quizDetailHeader
                                                  }
                                                >
                                                  <div>
                                                    <strong
                                                      style={
                                                        styles.quizDetailTitle
                                                      }
                                                    >
                                                      {
                                                        row.quiz.title
                                                      }
                                                    </strong>

                                                    <div
                                                      style={
                                                        styles.quizDetailMeta
                                                      }
                                                    >
                                                      Subject:{" "}
                                                      {cleanText(
                                                        row.quiz.subject
                                                      )}{" "}
                                                      • Date:{" "}
                                                      {formatDate(
                                                        row.quiz
                                                          .scheduled_date
                                                      )}{" "}
                                                      • Time:{" "}
                                                      {formatTime(
                                                        row.quiz
                                                          .scheduled_time
                                                      )}
                                                    </div>
                                                  </div>

                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      downloadStudentPdf(
                                                        row
                                                      )
                                                    }
                                                    style={
                                                      styles.studentPdfButton
                                                    }
                                                  >
                                                    Download PDF
                                                  </button>
                                                </div>

                                                <div
                                                  style={
                                                    styles.detailsGrid
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
                                                      Total Questions
                                                    </span>

                                                    <strong>
                                                      {result
                                                        ? safeNumber(
                                                            result.total_questions
                                                          )
                                                        : 0}
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

                                                    <strong>
                                                      {result
                                                        ? safeNumber(
                                                            result.correct_answers
                                                          )
                                                        : 0}
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

                                                    <strong>
                                                      {result
                                                        ? safeNumber(
                                                            result.wrong_answers
                                                          )
                                                        : 0}
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

                                                    <strong>
                                                      {result
                                                        ? safeNumber(
                                                            result.unanswered
                                                          )
                                                        : 0}
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
                                                      Total Marks
                                                    </span>

                                                    <strong>
                                                      {result
                                                        ? safeNumber(
                                                            result.total_marks
                                                          ).toFixed(
                                                            2
                                                          )
                                                        : "0.00"}
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
                                                    </span>

                                                    <strong>
                                                      {result
                                                        ? safeNumber(
                                                            result.obtained_marks
                                                          ).toFixed(
                                                            2
                                                          )
                                                        : "0.00"}
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

                                                    <strong>
                                                      {result
                                                        ? `${safeNumber(
                                                            result.percentage
                                                          ).toFixed(
                                                            2
                                                          )}%`
                                                        : "0.00%"}
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
                                                      Attempt
                                                    </span>

                                                    <strong>
                                                      {result
                                                        ? Math.max(
                                                            1,
                                                            safeNumber(
                                                              result.attempt_number,
                                                              1
                                                            )
                                                          )
                                                        : 0}
                                                    </strong>
                                                  </div>
                                                </div>

                                                <div
                                                  style={
                                                    styles.bottomDetails
                                                  }
                                                >
                                                  <div>
                                                    <span
                                                      style={
                                                        styles.detailLabel
                                                      }
                                                    >
                                                      Submission
                                                    </span>

                                                    <strong>
                                                      {result
                                                        ? cleanText(
                                                            result.submission_type
                                                          )
                                                        : "No submission"}
                                                    </strong>
                                                  </div>

                                                  <div>
                                                    <span
                                                      style={
                                                        styles.detailLabel
                                                      }
                                                    >
                                                      Started
                                                    </span>

                                                    <strong>
                                                      {result
                                                        ? formatDateTime(
                                                            result.started_at
                                                          )
                                                        : "—"}
                                                    </strong>
                                                  </div>

                                                  <div>
                                                    <span
                                                      style={
                                                        styles.detailLabel
                                                      }
                                                    >
                                                      Submitted
                                                    </span>

                                                    <strong>
                                                      {result
                                                        ? formatDateTime(
                                                            result.submitted_at
                                                          )
                                                        : "—"}
                                                    </strong>
                                                  </div>
                                                </div>

                                                <div
                                                  style={
                                                    styles.reattemptPanel
                                                  }
                                                >
                                                  <div>
                                                    <strong>
                                                      Re-attempt Access
                                                    </strong>

                                                    <p>
                                                      Allow this student
                                                      to attempt this
                                                      quiz again.
                                                    </p>
                                                  </div>

                                                  {reattemptQuizIds.has(
                                                    studentKey
                                                  ) ? (
                                                    <span
                                                      style={
                                                        styles.allowedBadge
                                                      }
                                                    >
                                                      RE-ATTEMPT ALLOWED
                                                    </span>
                                                  ) : (
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        allowReattempt(
                                                          row
                                                        )
                                                      }
                                                      disabled={
                                                        reattemptLoadingKey ===
                                                        studentKey
                                                      }
                                                      style={
                                                        styles.allowButton
                                                      }
                                                    >
                                                      {reattemptLoadingKey ===
                                                      studentKey
                                                        ? "PLEASE WAIT..."
                                                        : "ALLOW RE-ATTEMPT"}
                                                    </button>
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      }
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )
          )}
        </section>
      </div>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 850px) {
          .header-actions {
            flex-wrap: wrap;
          }
        }

        @media (max-width: 700px) {
          .student-button {
            align-items: flex-start !important;
          }

          .student-right {
            flex-direction: column !important;
            align-items: flex-end !important;
          }
        }

        @media (max-width: 600px) {
          .filter-grid {
            grid-template-columns: 1fr !important;
          }

          .stats-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            ) !important;
          }

          .header-actions {
            width: 100%;
          }

          .header-actions button {
            flex: 1;
          }

          .student-button {
            flex-direction: column !important;
          }

          .student-right {
            width: 100%;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
          }

          .quiz-detail-header {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .reattempt-panel {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
        }
      `}</style>
    </main>
  );
}

export default function TeacherQuizResultsPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight:
              "100vh",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding:
              "20px",
            background:
              "linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #f8fafc 100%)",
          }}
        >
          <div
            style={{
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
            }}
          >
            <strong
              style={{
                fontSize:
                  "20px",
                fontWeight:
                  900,
                color:
                  "#0f172a",
              }}
            >
              Loading Quiz Results...
            </strong>
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
    minHeight:
      "100vh",
    padding:
      "18px",
    background:
      "linear-gradient(135deg,#f8fafc 0%,#eef2ff 50%,#f8fafc 100%)",
    color:
      "#0f172a",
  },

  container: {
    width:
      "100%",
    maxWidth:
      "1250px",
    margin:
      "0 auto",
  },

  header: {
    background:
      "#ffffff",
    border:
      "1px solid #e2e8f0",
    borderRadius:
      "24px",
    padding:
      "22px",
    boxShadow:
      "0 15px 40px rgba(15,23,42,0.08)",
    display:
      "flex",
    alignItems:
      "flex-start",
    justifyContent:
      "space-between",
    gap:
      "18px",
    marginBottom:
      "15px",
  },

  brand: {
    color:
      "#4f46e5",
    fontSize:
      "12px",
    fontWeight:
      900,
    letterSpacing:
      "0.12em",
    marginBottom:
      "6px",
  },

  heading: {
    margin:
      0,
    fontSize:
      "30px",
    fontWeight:
      900,
    lineHeight:
      1.15,
  },

  subtitle: {
    margin:
      "7px 0 0",
    color:
      "#64748b",
    fontSize:
      "13px",
    lineHeight:
      1.5,
  },

  headerActions: {
    display:
      "flex",
    alignItems:
      "center",
    justifyContent:
      "flex-end",
    gap:
      "8px",
  },

  actionButton: {
    border:
      "1px solid #cbd5e1",
    background:
      "#ffffff",
    color:
      "#0f172a",
    borderRadius:
      "11px",
    padding:
      "10px 13px",
    fontSize:
      "12px",
    fontWeight:
      800,
    cursor:
      "pointer",
    whiteSpace:
      "nowrap",
  },

  logoutButton: {
    border:
      "none",
    background:
      "#dc2626",
    color:
      "#ffffff",
    borderRadius:
      "11px",
    padding:
      "10px 13px",
    fontSize:
      "12px",
    fontWeight:
      900,
    cursor:
      "pointer",
  },

  filtersCard: {
    background:
      "#ffffff",
    border:
      "1px solid #e2e8f0",
    borderRadius:
      "22px",
    padding:
      "18px",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.06)",
    marginBottom:
      "15px",
  },

  filterHeading: {
    display:
      "flex",
    alignItems:
      "center",
    justifyContent:
      "space-between",
    gap:
      "15px",
    marginBottom:
      "15px",
  },

  filterTitle: {
    margin:
      0,
    fontSize:
      "18px",
    fontWeight:
      900,
  },

  filterSubtitle: {
    margin:
      "4px 0 0",
    color:
      "#64748b",
    fontSize:
      "12px",
  },

  resetButton: {
    border:
      "1px solid #cbd5e1",
    background:
      "#f8fafc",
    color:
      "#334155",
    borderRadius:
      "10px",
    padding:
      "9px 13px",
    fontWeight:
      800,
    cursor:
      "pointer",
  },

  filterGrid: {
    display:
      "grid",
    gridTemplateColumns:
      "repeat(3,minmax(0,1fr))",
    gap:
      "12px",
  },

  filterLabel: {
    display:
      "flex",
    flexDirection:
      "column",
    gap:
      "6px",
    fontSize:
      "11px",
    fontWeight:
      900,
    color:
      "#475569",
  },

  select: {
    width:
      "100%",
    border:
      "1px solid #cbd5e1",
    borderRadius:
      "11px",
    background:
      "#ffffff",
    padding:
      "11px 12px",
    fontSize:
      "13px",
    color:
      "#0f172a",
    outline:
      "none",
  },

  filterInfo: {
    marginTop:
      "12px",
    padding:
      "10px 12px",
    background:
      "#f8fafc",
    borderRadius:
      "10px",
    color:
      "#475569",
    fontSize:
      "12px",
  },

  statsGrid: {
    display:
      "grid",
    gridTemplateColumns:
      "repeat(4,minmax(0,1fr))",
    gap:
      "10px",
    marginBottom:
      "15px",
  },

  statCard: {
    background:
      "#ffffff",
    border:
      "1px solid #e2e8f0",
    borderRadius:
      "17px",
    padding:
      "15px",
    boxShadow:
      "0 8px 22px rgba(15,23,42,0.05)",
  },

  statLabel: {
    display:
      "block",
    fontSize:
      "10px",
    fontWeight:
      900,
    color:
      "#64748b",
    textTransform:
      "uppercase",
    letterSpacing:
      "0.05em",
    marginBottom:
      "6px",
  },

  statValue: {
    display:
      "block",
    fontSize:
      "24px",
    fontWeight:
      900,
  },

  downloadCard: {
    background:
      "linear-gradient(135deg,#eef2ff,#faf5ff)",
    border:
      "1px solid #ddd6fe",
    borderRadius:
      "20px",
    padding:
      "16px 18px",
    display:
      "flex",
    alignItems:
      "center",
    justifyContent:
      "space-between",
    gap:
      "15px",
    marginBottom:
      "15px",
  },

  downloadTitle: {
    fontSize:
      "17px",
    fontWeight:
      900,
    color:
      "#312e81",
  },

  downloadText: {
    marginTop:
      "4px",
    fontSize:
      "12px",
    color:
      "#64748b",
  },

  downloadButton: {
    border:
      "none",
    background:
      "#4f46e5",
    color:
      "#ffffff",
    borderRadius:
      "12px",
    padding:
      "12px 16px",
    fontWeight:
      900,
    cursor:
      "pointer",
    whiteSpace:
      "nowrap",
  },

  disabledDownload: {
    border:
      "none",
    background:
      "#cbd5e1",
    color:
      "#64748b",
    borderRadius:
      "12px",
    padding:
      "12px 16px",
    fontWeight:
      900,
    cursor:
      "not-allowed",
    whiteSpace:
      "nowrap",
  },

  message: {
    background:
      "#eff6ff",
    border:
      "1px solid #bfdbfe",
    color:
      "#1e40af",
    padding:
      "11px 14px",
    borderRadius:
      "12px",
    marginBottom:
      "15px",
    fontSize:
      "12px",
    fontWeight:
      800,
  },

  resultsCard: {
    background:
      "#ffffff",
    border:
      "1px solid #e2e8f0",
    borderRadius:
      "22px",
    padding:
      "15px",
    boxShadow:
      "0 12px 35px rgba(15,23,42,0.06)",
  },

  resultsHeader: {
    padding:
      "4px 4px 14px",
  },

  resultsTitle: {
    margin:
      0,
    fontSize:
      "21px",
    fontWeight:
      900,
  },

  resultsSubtitle: {
    margin:
      "5px 0 0",
    color:
      "#64748b",
    fontSize:
      "12px",
  },

  dateGroup: {
    border:
      "1px solid #c7d2fe",
    borderRadius:
      "17px",
    overflow:
      "hidden",
    marginBottom:
      "11px",
  },

  dateButton: {
    width:
      "100%",
    border:
      "none",
    background:
      "#eef2ff",
    padding:
      "15px",
    display:
      "flex",
    alignItems:
      "center",
    justifyContent:
      "space-between",
    gap:
      "10px",
    textAlign:
      "left",
    cursor:
      "pointer",
  },

  smallLabel: {
    display:
      "block",
    fontSize:
      "9px",
    fontWeight:
      900,
    color:
      "#4f46e5",
    letterSpacing:
      "0.08em",
    marginBottom:
      "3px",
  },

  dateTitle: {
    fontSize:
      "18px",
    fontWeight:
      900,
    color:
      "#1e1b4b",
  },

  dateRight: {
    display:
      "flex",
    alignItems:
      "center",
    gap:
      "8px",
  },

  countBadge: {
    background:
      "#ffffff",
    border:
      "1px solid #cbd5e1",
    color:
      "#475569",
    borderRadius:
      "8px",
    padding:
      "5px 8px",
    fontSize:
      "10px",
    fontWeight:
      800,
  },

  arrow: {
    fontSize:
      "23px",
    lineHeight:
      1,
    color:
      "#475569",
    fontWeight:
      700,
  },

  dateContent: {
    background:
      "#f8fafc",
    padding:
      "10px",
  },

  classGroup: {
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

  classButton: {
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
      "10px",
    cursor:
      "pointer",
    textAlign:
      "left",
  },

  classBadge: {
    display:
      "inline-block",
    background:
      "#e0e7ff",
    color:
      "#3730a3",
    borderRadius:
      "6px",
    padding:
      "4px 6px",
    fontSize:
      "9px",
    fontWeight:
      900,
    marginRight:
      "7px",
  },

  className: {
    fontSize:
      "16px",
    fontWeight:
      900,
  },

  classContent: {
    padding:
      "9px",
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
      "13px",
    overflow:
      "hidden",
    marginBottom:
      "8px",
  },

  studentButton: {
    width:
      "100%",
    border:
      "none",
    background:
      "#ffffff",
    padding:
      "12px",
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

  studentLeft: {
    display:
      "flex",
    alignItems:
      "center",
    gap:
      "10px",
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
      "11px",
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
    fontSize:
      "16px",
    fontWeight:
      900,
  },

  studentName: {
    display:
      "block",
    fontSize:
      "14px",
    fontWeight:
      900,
  },

  studentMeta: {
    marginTop:
      "4px",
    fontSize:
      "10px",
    color:
      "#64748b",
  },

  studentRight: {
    display:
      "flex",
    alignItems:
      "center",
    gap:
      "9px",
    flexShrink:
      0,
  },

  resultMini: {
    display:
      "flex",
    alignItems:
      "center",
    gap:
      "6px",
  },

  passBadge: {
    background:
      "#dcfce7",
    color:
      "#166534",
    borderRadius:
      "7px",
    padding:
      "5px 7px",
    fontSize:
      "9px",
    fontWeight:
      900,
  },

  failBadge: {
    background:
      "#fee2e2",
    color:
      "#991b1b",
    borderRadius:
      "7px",
    padding:
      "5px 7px",
    fontSize:
      "9px",
    fontWeight:
      900,
  },

  pendingBadge: {
    background:
      "#fef3c7",
    color:
      "#92400e",
    borderRadius:
      "7px",
    padding:
      "5px 7px",
    fontSize:
      "9px",
    fontWeight:
      900,
  },

  studentDetails: {
    background:
      "#f8fafc",
    borderTop:
      "1px solid #e2e8f0",
    padding:
      "13px",
  },

  quizDetailHeader: {
    display:
      "flex",
    alignItems:
      "center",
    justifyContent:
      "space-between",
    gap:
      "12px",
    marginBottom:
      "12px",
  },

  quizDetailTitle: {
    fontSize:
      "15px",
    fontWeight:
      900,
  },

  quizDetailMeta: {
    marginTop:
      "4px",
    fontSize:
      "10px",
    color:
      "#64748b",
  },

  studentPdfButton: {
    border:
      "none",
    background:
      "#0f172a",
    color:
      "#ffffff",
    borderRadius:
      "9px",
    padding:
      "9px 11px",
    fontSize:
      "10px",
    fontWeight:
      900,
    cursor:
      "pointer",
    whiteSpace:
      "nowrap",
  },

  detailsGrid: {
    display:
      "grid",
    gridTemplateColumns:
      "repeat(4,minmax(0,1fr))",
    gap:
      "8px",
  },

  detailBox: {
    background:
      "#ffffff",
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
      "9px",
    fontWeight:
      900,
    color:
      "#64748b",
    textTransform:
      "uppercase",
    marginBottom:
      "4px",
  },

  bottomDetails: {
    display:
      "grid",
    gridTemplateColumns:
      "repeat(3,minmax(0,1fr))",
    gap:
      "10px",
    marginTop:
      "10px",
    paddingTop:
      "10px",
    borderTop:
      "1px solid #e2e8f0",
    fontSize:
      "11px",
  },

  reattemptPanel: {
    marginTop:
      "12px",
    padding:
      "12px",
    background:
      "#faf5ff",
    border:
      "1px dashed #c4b5fd",
    borderRadius:
      "11px",
    display:
      "flex",
    alignItems:
      "center",
    justifyContent:
      "space-between",
    gap:
      "10px",
  },

  reattemptPanelText: {
    color:
      "#581c87",
  },

  allowButton: {
    border:
      "none",
    background:
      "#7c3aed",
    color:
      "#ffffff",
    borderRadius:
      "9px",
    padding:
      "9px 11px",
    fontSize:
      "10px",
    fontWeight:
      900,
    cursor:
      "pointer",
    whiteSpace:
      "nowrap",
  },

  allowedBadge: {
    background:
      "#dcfce7",
    color:
      "#166534",
    borderRadius:
      "8px",
    padding:
      "8px 10px",
    fontSize:
      "9px",
    fontWeight:
      900,
    whiteSpace:
      "nowrap",
  },

  emptyCard: {
    textAlign:
      "center",
    padding:
      "40px 20px",
    color:
      "#64748b",
  },

  loadingCard: {
    width:
      "min(500px, calc(100% - 30px))",
    margin:
      "80px auto",
    padding:
      "40px",
    background:
      "#ffffff",
    borderRadius:
      "22px",
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
      "0 0 7px",
    fontSize:
      "21px",
    fontWeight:
      900,
  },

  loadingText: {
    margin:
      0,
    color:
      "#64748b",
    fontSize:
      "13px",
  },

  errorCard: {
    width:
      "min(600px, calc(100% - 30px))",
    margin:
      "70px auto",
    padding:
      "35px",
    background:
      "#ffffff",
    borderRadius:
      "22px",
    textAlign:
      "center",
    boxShadow:
      "0 20px 50px rgba(15,23,42,0.10)",
  },

  errorTitle: {
    margin:
      "0 0 8px",
    color:
      "#991b1b",
    fontSize:
      "22px",
    fontWeight:
      900,
  },

  errorText: {
    margin:
      "0 0 18px",
    color:
      "#64748b",
  },

  primaryButton: {
    border:
      "none",
    background:
      "#4f46e5",
    color:
      "#ffffff",
    borderRadius:
      "10px",
    padding:
      "11px 16px",
    fontWeight:
      900,
    cursor:
      "pointer",
  },
};