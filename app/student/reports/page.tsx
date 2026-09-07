```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { CSSProperties } from "react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase environment variables are missing. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

type AttendanceRow = {
  id: number;
  student_id: number;
  attendance_date: string;
  status: string;
};

type FeeRow = {
  id: number;
  student_id: number;
  month: number;
  year: number;
  amount: number;
  status: string;
  payment_date: string | null;
  payment_mode?: string | null;
  transaction_id?: string | null;
  remarks?: string | null;
  receipt_url?: string | null;
};

type Student = {
  id: number;
  student_name: string | null;
  student_username: string;
};

type AssessmentRow = {
  id: number;
  test_name: string;
  test_date: string;
  total_marks: number;
  student_id: number;
  obtained_marks: number;
  remarks: string | null;
  created_at: string;
  subject?: string | null;
  attendance_status?: string | null;
  test_images?: unknown;
};

type SectionName =
  | "attendance"
  | "tests"
  | "fees"
  | "overall";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const years = [2025, 2026, 2027, 2028, 2029, 2030];

function getPercentage(obtained: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  if (!Number.isFinite(obtained)) return 0;

  return Math.min(
    100,
    Math.max(0, (obtained / total) * 100)
  );
}

function getGrade(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
}

function isPass(percentage: number): boolean {
  return percentage >= 40;
}

function isPresentStatus(status: string): boolean {
  const normalized = String(status || "").toUpperCase();

  return (
    normalized === "PRESENT" ||
    normalized === "P"
  );
}

function isAbsentStatus(status: string): boolean {
  const normalized = String(status || "").toUpperCase();

  return (
    normalized === "ABSENT" ||
    normalized === "A"
  );
}

function getSubjectLabel(subject?: string | null): string {
  if (subject === "Mathematics") return "📐 Mathematics";
  if (subject === "English") return "📚 English";

  return "📖 Subject Not Specified";
}

function getImageUrls(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item): string => {
        if (typeof item === "string") return item;

        if (
          typeof item === "object" &&
          item !== null
        ) {
          if ("url" in item) {
            const url = (item as { url?: unknown }).url;

            if (typeof url === "string") {
              return url;
            }
          }

          if ("path" in item) {
            const path = (item as { path?: unknown }).path;

            if (typeof path === "string") {
              return path;
            }
          }
        }

        return "";
      })
      .filter((url): url is string => Boolean(url.trim()));
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) return [];

    try {
      const parsed: unknown = JSON.parse(trimmed);

      if (Array.isArray(parsed)) {
        return parsed
          .map((item): string => {
            if (typeof item === "string") {
              return item;
            }

            if (
              typeof item === "object" &&
              item !== null
            ) {
              if ("url" in item) {
                const url = (item as { url?: unknown }).url;

                return typeof url === "string"
                  ? url
                  : "";
              }

              if ("path" in item) {
                const path = (item as { path?: unknown }).path;

                return typeof path === "string"
                  ? path
                  : "";
              }
            }

            return "";
          })
          .filter(Boolean);
      }
    } catch {
      // Normal URL/string.
    }

    return [trimmed];
  }

  return [];
}

function parseLocalDate(
  dateString: string | null | undefined
): Date | null {
  if (!dateString) return null;

  const value = dateString.slice(0, 10);

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    );
  }

  const date = new Date(dateString);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function formatDate(
  dateString: string | null | undefined
): string {
  if (!dateString) return "—";

  const date = parseLocalDate(dateString);

  if (!date) return dateString;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getAttendanceKey(dateString: string): string {
  const date = parseLocalDate(dateString);

  if (!date) return "";

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function getMonthLabel(key: string): string {
  const [yearString, monthString] = key.split("-");

  const year = Number(yearString);
  const month = Number(monthString);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    return key;
  }

  return `${months[month - 1]} ${year}`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createPdfWindow(
  student: Student,
  assessments: AssessmentRow[],
  selectedSubject: string
): void {
  const printableAssessments =
    selectedSubject === "All"
      ? assessments
      : assessments.filter(
          (item) =>
            (item.subject || "Not Specified") ===
            selectedSubject
        );

  if (printableAssessments.length === 0) {
    window.alert("No test results available for PDF.");
    return;
  }

  const totalTests = printableAssessments.length;

  const passedTests = printableAssessments.filter((item) =>
    isPass(
      getPercentage(
        Number(item.obtained_marks),
        Number(item.total_marks)
      )
    )
  ).length;

  const failedTests = totalTests - passedTests;

  const average =
    totalTests > 0
      ? printableAssessments.reduce(
          (sum, item) =>
            sum +
            getPercentage(
              Number(item.obtained_marks),
              Number(item.total_marks)
            ),
          0
        ) / totalTests
      : 0;

  const studentName =
    student.student_name || student.student_username;

  const subjectLabel =
    selectedSubject === "All"
      ? "All Subjects"
      : selectedSubject;

  const testSections = printableAssessments
    .map((item, index) => {
      const percentage = getPercentage(
        Number(item.obtained_marks),
        Number(item.total_marks)
      );

      const grade = getGrade(percentage);
      const passed = isPass(percentage);
      const imageUrls = getImageUrls(item.test_images);

      const imagesHtml =
        imageUrls.length > 0
          ? `
            <div class="images-section">
              <div class="images-heading">
                📸 Checked Test Images
              </div>

              <div class="images-count">
                ${imageUrls.length}
                ${
                  imageUrls.length === 1
                    ? "image"
                    : "images"
                }
                uploaded by teacher
              </div>

              <div class="image-grid">
                ${imageUrls
                  .map(
                    (imageUrl, imageIndex) => `
                      <div class="image-card">
                        <div class="image-number">
                          Image ${imageIndex + 1}
                        </div>

                        <img
                          src="${escapeHtml(imageUrl)}"
                          alt="Checked Test Image ${
                            imageIndex + 1
                          }"
                          class="pdf-test-image"
                        />
                      </div>
                    `
                  )
                  .join("")}
              </div>
            </div>
          `
          : `
            <div class="no-images">
              📭 No test images uploaded for this test.
            </div>
          `;

      return `
        <section class="test-section">
          <div class="test-header">
            <div class="test-heading-content">
              <div class="test-number">
                TEST #${index + 1}
              </div>

              <h2 class="test-title">
                ${escapeHtml(
                  item.test_name || "Test"
                )}
              </h2>

              <div class="subject-badge">
                ${escapeHtml(
                  item.subject ||
                    "Subject Not Specified"
                )}
              </div>
            </div>

            <div class="result-badge ${
              passed
                ? "result-pass"
                : "result-fail"
            }">
              ${passed ? "PASS" : "FAIL"}
            </div>
          </div>

          <div class="test-details">
            <div class="detail-box">
              <span>Test Date</span>
              <strong>
                ${escapeHtml(
                  formatDate(item.test_date)
                )}
              </strong>
            </div>

            <div class="detail-box">
              <span>Total Marks</span>
              <strong>
                ${escapeHtml(item.total_marks)}
              </strong>
            </div>

            <div class="detail-box">
              <span>Obtained Marks</span>
              <strong>
                ${escapeHtml(item.obtained_marks)}
              </strong>
            </div>

            <div class="detail-box">
              <span>Percentage</span>
              <strong>
                ${percentage.toFixed(1)}%
              </strong>
            </div>

            <div class="detail-box">
              <span>Grade</span>
              <strong>${escapeHtml(grade)}</strong>
            </div>

            <div class="detail-box">
              <span>Result</span>
              <strong class="${
                passed
                  ? "pass-text"
                  : "fail-text"
              }">
                ${passed ? "PASS" : "FAIL"}
              </strong>
            </div>
          </div>

          <div class="remarks-box">
            <strong>📝 Remarks</strong>

            <p>
              ${escapeHtml(
                item.remarks ||
                  "No remarks added by teacher."
              )}
            </p>
          </div>

          ${imagesHtml}
        </section>
      `;
    })
    .join("");

  const popup = window.open("", "_blank");

  if (!popup) {
    window.alert(
      "Please allow pop-ups for downloading the Result PDF."
    );
    return;
  }

  popup.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />

        <title>
          RACER ACADEMY Result -
          ${escapeHtml(studentName)}
        </title>

        <style>
          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: white;
          }

          body {
            padding: 30px;
            font-family:
              Arial,
              Helvetica,
              sans-serif;
            color: #172554;
          }

          .header {
            text-align: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 18px;
            margin-bottom: 25px;
          }

          .brand {
            font-size: 13px;
            font-weight: 900;
            letter-spacing: 4px;
            color: #2563eb;
          }

          h1 {
            margin: 7px 0;
            font-size: 28px;
          }

          .student {
            margin-top: 8px;
            color: #475569;
            font-size: 14px;
            line-height: 1.7;
          }

          .summary {
            display: grid;
            grid-template-columns:
              repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 25px;
          }

          .summary-box {
            border: 1px solid #dbeafe;
            border-radius: 10px;
            padding: 14px;
            text-align: center;
            background: #f8fafc;
          }

          .summary-box span {
            display: block;
            font-size: 11px;
            color: #64748b;
            margin-bottom: 5px;
          }

          .summary-box strong {
            font-size: 20px;
          }

          .test-section {
            margin-top: 25px;
            border: 1px solid #cbd5e1;
            border-radius: 15px;
            padding: 18px;
            break-inside: auto;
          }

          .test-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 15px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 15px;
          }

          .test-heading-content {
            min-width: 0;
          }

          .test-number {
            color: #7c3aed;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 2px;
          }

          .test-title {
            margin: 5px 0 8px;
            font-size: 21px;
            color: #172554;
          }

          .subject-badge {
            display: inline-block;
            padding: 6px 10px;
            border-radius: 999px;
            background: #eff6ff;
            color: #1e3a8a;
            border: 1px solid #bfdbfe;
            font-size: 11px;
            font-weight: 800;
          }

          .result-badge {
            padding: 9px 13px;
            border-radius: 999px;
            font-weight: 900;
            font-size: 12px;
            white-space: nowrap;
          }

          .result-pass {
            background: #dcfce7;
            color: #166534;
          }

          .result-fail {
            background: #fee2e2;
            color: #991b1b;
          }

          .test-details {
            display: grid;
            grid-template-columns:
              repeat(6, 1fr);
            gap: 10px;
            margin-top: 15px;
          }

          .detail-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 10px;
          }

          .detail-box span {
            display: block;
            color: #64748b;
            font-size: 9px;
            margin-bottom: 5px;
          }

          .detail-box strong {
            font-size: 13px;
            color: #172554;
          }

          .pass-text {
            color: #166534 !important;
          }

          .fail-text {
            color: #991b1b !important;
          }

          .remarks-box {
            margin-top: 15px;
            padding: 14px;
            border-radius: 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
          }

          .remarks-box p {
            margin: 7px 0 0;
            color: #475569;
            font-size: 12px;
            line-height: 1.6;
          }

          .images-section {
            margin-top: 20px;
            padding: 15px;
            border-radius: 13px;
            background: #fff7ed;
            border: 1px solid #fed7aa;
          }

          .images-heading {
            font-size: 16px;
            font-weight: 900;
            color: #9a3412;
          }

          .images-count {
            margin-top: 4px;
            color: #64748b;
            font-size: 11px;
          }

          .image-grid {
            display: grid;
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 15px;
            margin-top: 15px;
          }

          .image-card {
            background: white;
            border: 1px solid #fed7aa;
            border-radius: 10px;
            padding: 8px;
            text-align: center;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .image-number {
            margin-bottom: 7px;
            font-size: 10px;
            font-weight: 800;
            color: #9a3412;
          }

          .pdf-test-image {
            width: 100%;
            max-width: 100%;
            max-height: 650px;
            height: auto;
            object-fit: contain;
            display: block;
            margin: 0 auto;
            border-radius: 7px;
            background: #f8fafc;
          }

          .no-images {
            margin-top: 15px;
            padding: 12px;
            border-radius: 10px;
            background: #f8fafc;
            color: #64748b;
            font-size: 12px;
          }

          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 11px;
            color: #64748b;
          }

          @media print {
            @page {
              size: A4;
              margin: 10mm;
            }

            body {
              padding: 0;
            }

            img {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }

            .image-card {
              page-break-inside: avoid;
              break-inside: avoid;
            }
          }
        </style>
      </head>

      <body>
        <div class="header">
          <div class="brand">
            RACER ACADEMY
          </div>

          <h1>
            🏆 Academy Test Result
          </h1>

          <div class="student">
            <strong>
              ${escapeHtml(studentName)}
            </strong>

            <br />

            Username:
            ${escapeHtml(
              student.student_username
            )}

            <br />

            Subject:
            ${escapeHtml(subjectLabel)}
          </div>
        </div>

        <div class="summary">
          <div class="summary-box">
            <span>Total Tests</span>
            <strong>${totalTests}</strong>
          </div>

          <div class="summary-box">
            <span>Passed</span>
            <strong>${passedTests}</strong>
          </div>

          <div class="summary-box">
            <span>Failed</span>
            <strong>${failedTests}</strong>
          </div>

          <div class="summary-box">
            <span>Average</span>
            <strong>
              ${average.toFixed(1)}%
            </strong>
          </div>
        </div>

        ${testSections}

        <div class="footer">
          RACER ACADEMY • Student Result Report
        </div>

        <script>
          (function () {
            function printWhenImagesReady() {
              var images =
                Array.prototype.slice.call(
                  document.images
                );

              if (images.length === 0) {
                setTimeout(function () {
                  window.print();
                }, 700);

                return;
              }

              var finished = 0;
              var printed = false;

              function finishOneImage() {
                finished++;

                if (
                  finished >= images.length &&
                  !printed
                ) {
                  printed = true;

                  setTimeout(function () {
                    window.print();
                  }, 700);
                }
              }

              images.forEach(function (image) {
                if (image.complete) {
                  finishOneImage();
                  return;
                }

                image.addEventListener(
                  "load",
                  finishOneImage,
                  { once: true }
                );

                image.addEventListener(
                  "error",
                  finishOneImage,
                  { once: true }
                );
              });

              setTimeout(function () {
                if (!printed) {
                  printed = true;
                  window.print();
                }
              }, 15000);
            }

            if (
              document.readyState ===
              "complete"
            ) {
              printWhenImagesReady();
            } else {
              window.addEventListener(
                "load",
                printWhenImagesReady,
                { once: true }
              );
            }
          })();
        </script>
      </body>
    </html>
  `);

  popup.document.close();
}

function CircularProgress({
  percentage,
  size = 150,
  stroke = 13,
}: {
  percentage: number;
  size?: number;
  stroke?: number;
}) {
  const safePercentage = Math.min(
    100,
    Math.max(0, percentage)
  );

  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset =
    circumference -
    (safePercentage / 100) * circumference;

  return (
    <div
      className="circular-progress"
      style={{
        width: size,
        height: size,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={stroke}
        />

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2563eb"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${
            size / 2
          } ${size / 2})`}
          style={{
            transition:
              "stroke-dashoffset 0.6s ease",
          }}
        />
      </svg>

      <div className="circular-content">
        <strong>
          {safePercentage.toFixed(1)}%
        </strong>

        <span>Overall</span>
      </div>
    </div>
  );
}

export default function StudentReportsPage() {
  const router = useRouter();

  const [student, setStudent] =
    useState<Student | null>(null);

  const [attendance, setAttendance] =
    useState<AttendanceRow[]>([]);

  const [fees, setFees] =
    useState<FeeRow[]>([]);

  const [assessments, setAssessments] =
    useState<AssessmentRow[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [selectedMonth, setSelectedMonth] =
    useState(
      String(new Date().getMonth() + 1)
    );

  const [selectedYear, setSelectedYear] =
    useState(
      String(new Date().getFullYear())
    );

  const [selectedSubject, setSelectedSubject] =
    useState("All");

  const [openSection, setOpenSection] =
    useState<SectionName | null>(
      "attendance"
    );

  const [expandedMonth, setExpandedMonth] =
    useState<string | null>(null);

  const [expandedTestId, setExpandedTestId] =
    useState<number | null>(null);

  const [expandedImages, setExpandedImages] =
    useState<number | null>(null);

  const [showFees, setShowFees] =
    useState(false);

  useEffect(() => {
    void loadReport();
  }, []);

  async function loadReport(): Promise<void> {
    setLoading(true);
    setError("");

    try {
      let username =
        localStorage.getItem(
          "student_username"
        ) ||
        localStorage.getItem(
          "studentUsername"
        ) ||
        localStorage.getItem("username");

      const storedStudent =
        localStorage.getItem("student");

      if (!username && storedStudent) {
        try {
          const parsed: unknown =
            JSON.parse(storedStudent);

          if (
            typeof parsed === "object" &&
            parsed !== null
          ) {
            const studentObject =
              parsed as {
                student_username?: unknown;
                username?: unknown;
              };

            if (
              typeof studentObject.student_username ===
              "string"
            ) {
              username =
                studentObject.student_username;
            } else if (
              typeof studentObject.username ===
              "string"
            ) {
              username =
                studentObject.username;
            }
          }
        } catch {
          // Invalid stored student.
        }
      }

      if (!username?.trim()) {
        setError(
          "Student login information not found."
        );
        setLoading(false);
        return;
      }

      const {
        data: studentData,
        error: studentError,
      } = await supabase
        .from("students")
        .select(
          "id, student_name, student_username"
        )
        .ilike(
          "student_username",
          username.trim()
        )
        .maybeSingle();

      if (studentError) {
        setError(studentError.message);
        setLoading(false);
        return;
      }

      if (!studentData) {
        setError(
          "Student record not found."
        );
        setLoading(false);
        return;
      }

      const currentStudent =
        studentData as Student;

      setStudent(currentStudent);

      const {
        data: attendanceData,
        error: attendanceError,
      } = await supabase
        .from("attendance")
        .select(
          "id, student_id, attendance_date, status"
        )
        .eq(
          "student_id",
          currentStudent.id
        )
        .order(
          "attendance_date",
          { ascending: false }
        );

      if (attendanceError) {
        setError(
          attendanceError.message
        );
        setLoading(false);
        return;
      }

      const {
        data: feesData,
        error: feesError,
      } = await supabase
        .from("fees")
        .select(
          [
            "id",
            "student_id",
            "month",
            "year",
            "amount",
            "status",
            "payment_date",
            "payment_mode",
            "transaction_id",
            "remarks",
            "receipt_url",
          ].join(", ")
        )
        .eq(
          "student_id",
          currentStudent.id
        )
        .order("year", {
          ascending: false,
        })
        .order("month", {
          ascending: false,
        });

      if (feesError) {
        setError(feesError.message);
        setLoading(false);
        return;
      }

      const {
        data: assessmentData,
        error: assessmentError,
      } = await supabase
        .from("academy_assessments")
        .select("*")
        .eq(
          "student_id",
          currentStudent.id
        )
        .order("test_date", {
          ascending: false,
        })
        .order("created_at", {
          ascending: false,
        });

      if (assessmentError) {
        setError(
          assessmentError.message
        );
        setLoading(false);
        return;
      }

      setAttendance(
        (attendanceData ||
          []) as AttendanceRow[]
      );

      setFees(
        (feesData || []) as FeeRow[]
      );

      setAssessments(
        (assessmentData ||
          []) as AssessmentRow[]
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  function logout(): void {
    localStorage.removeItem(
      "student_username"
    );

    localStorage.removeItem(
      "studentUsername"
    );

    localStorage.removeItem(
      "student_name"
    );

    localStorage.removeItem(
      "studentName"
    );

    localStorage.removeItem(
      "studentLoggedIn"
    );

    localStorage.removeItem("student");

    sessionStorage.clear();

    router.push("/");
  }

  function toggleSection(
    section: SectionName
  ): void {
    setOpenSection((current) =>
      current === section
        ? null
        : section
    );
  }

  const overallAttendanceStats =
    useMemo(() => {
      const present =
        attendance.filter((record) =>
          isPresentStatus(record.status)
        ).length;

      const absent =
        attendance.filter((record) =>
          isAbsentStatus(record.status)
        ).length;

      const total = present + absent;

      const percentage =
        total > 0
          ? (present / total) * 100
          : 0;

      return {
        present,
        absent,
        total,
        percentage,
      };
    }, [attendance]);

  const monthlyAttendance =
    useMemo(() => {
      const groups =
        new Map<
          string,
          AttendanceRow[]
        >();

      attendance.forEach((record) => {
        const key = getAttendanceKey(
          record.attendance_date
        );

        if (!key) return;

        const existing =
          groups.get(key) || [];

        existing.push(record);

        groups.set(key, existing);
      });

      return Array.from(groups.entries())
        .map(([key, records]) => {
          const present =
            records.filter((record) =>
              isPresentStatus(
                record.status
              )
            ).length;

          const absent =
            records.filter((record) =>
              isAbsentStatus(
                record.status
              )
            ).length;

          const total =
            present + absent;

          const percentage =
            total > 0
              ? (present / total) * 100
              : 0;

          const sortedRecords =
            [...records].sort((a, b) =>
              a.attendance_date.localeCompare(
                b.attendance_date
              )
            );

          return {
            key,
            label: getMonthLabel(key),
            records: sortedRecords,
            present,
            absent,
            total,
            percentage,
          };
        })
        .sort((a, b) =>
          b.key.localeCompare(a.key)
        );
    }, [attendance]);

  const selectedMonthAttendance =
    useMemo(() => {
      return attendance.filter((record) => {
        const date =
          parseLocalDate(
            record.attendance_date
          );

        if (!date) return false;

        return (
          date.getMonth() + 1 ===
            Number(selectedMonth) &&
          date.getFullYear() ===
            Number(selectedYear)
        );
      });
    }, [
      attendance,
      selectedMonth,
      selectedYear,
    ]);

  const selectedAttendanceStats =
    useMemo(() => {
      const present =
        selectedMonthAttendance.filter(
          (record) =>
            isPresentStatus(
              record.status
            )
        ).length;

      const absent =
        selectedMonthAttendance.filter(
          (record) =>
            isAbsentStatus(
              record.status
            )
        ).length;

      const total =
        present + absent;

      const percentage =
        total > 0
          ? (present / total) * 100
          : 0;

      return {
        present,
        absent,
        total,
        percentage,
      };
    }, [selectedMonthAttendance]);

  const filteredAssessments =
    useMemo(() => {
      if (selectedSubject === "All") {
        return assessments;
      }

      return assessments.filter(
        (item) =>
          item.subject ===
          selectedSubject
      );
    }, [
      assessments,
      selectedSubject,
    ]);

  const assessmentStats =
    useMemo(() => {
      const totalTests =
        filteredAssessments.length;

      const passedTests =
        filteredAssessments.filter(
          (item) =>
            isPass(
              getPercentage(
                Number(
                  item.obtained_marks
                ),
                Number(
                  item.total_marks
                )
              )
            )
        ).length;

      const failedTests =
        totalTests - passedTests;

      const averagePercentage =
        totalTests > 0
          ? filteredAssessments.reduce(
              (sum, item) =>
                sum +
                getPercentage(
                  Number(
                    item.obtained_marks
                  ),
                  Number(
                    item.total_marks
                  )
                ),
              0
            ) / totalTests
          : 0;

      return {
        totalTests,
        passedTests,
        failedTests,
        averagePercentage,
      };
    }, [filteredAssessments]);

  const availableSubjects =
    useMemo(() => {
      const subjects =
        assessments
          .map(
            (item) => item.subject
          )
          .filter(
            (
              subject
            ): subject is string =>
              Boolean(subject)
          );

      return Array.from(
        new Set(subjects)
      );
    }, [assessments]);

  const feeStats = useMemo(() => {
    const total = fees.reduce(
      (sum, fee) =>
        sum +
        Number(fee.amount || 0),
      0
    );

    const paid = fees
      .filter((fee) => {
        const status =
          String(
            fee.status || ""
          ).toUpperCase();

        return (
          status === "PAID" ||
          status === "SUBMITTED"
        );
      })
      .reduce(
        (sum, fee) =>
          sum +
          Number(fee.amount || 0),
        0
      );

    const pending = fees
      .filter(
        (fee) =>
          String(
            fee.status || ""
          ).toUpperCase() ===
          "PENDING"
      )
      .reduce(
        (sum, fee) =>
          sum +
          Number(fee.amount || 0),
        0
      );

    const refunded = fees
      .filter(
        (fee) =>
          String(
            fee.status || ""
          ).toUpperCase() ===
          "REFUNDED"
      )
      .reduce(
        (sum, fee) =>
          sum +
          Number(fee.amount || 0),
        0
      );

    return {
      total,
      paid,
      pending,
      refunded,
    };
  }, [fees]);

  const selectedFees = useMemo(() => {
    return fees.filter(
      (fee) =>
        Number(fee.month) ===
          Number(selectedMonth) &&
        Number(fee.year) ===
          Number(selectedYear)
    );
  }, [
    fees,
    selectedMonth,
    selectedYear,
  ]);

  const overallPerformance =
    useMemo(() => {
      const values: number[] = [];

      if (
        overallAttendanceStats.total >
        0
      ) {
        values.push(
          overallAttendanceStats.percentage
        );
      }

      if (
        assessmentStats.totalTests >
        0
      ) {
        values.push(
          assessmentStats.averagePercentage
        );
      }

      if (values.length === 0) {
        return 0;
      }

      return (
        values.reduce(
          (sum, value) =>
            sum + value,
          0
        ) / values.length
      );
    }, [
      overallAttendanceStats,
      assessmentStats,
    ]);

  function downloadAllResults(): void {
    if (!student) return;

    createPdfWindow(
      student,
      assessments,
      selectedSubject
    );
  }

  function downloadSingleResult(
    assessment: AssessmentRow
  ): void {
    if (!student) return;

    createPdfWindow(
      student,
      [assessment],
      assessment.subject || "All"
    );
  }

  if (loading) {
    return (
      <main
        className="reports-page"
        style={styles.page}
      >
        <div style={styles.loading}>
          <div className="loading-icon">
            📊
          </div>

          Loading Student Reports...
        </div>
      </main>
    );
  }

  return (
    <main
      className="reports-page"
      style={styles.page}
    >
      <div style={styles.container}>
        <header style={styles.header}>
          <div className="reports-header-content">
            <div style={styles.smallTitle}>
              RACER ACADEMY
            </div>

            <h1 style={styles.title}>
              📊 My Reports
            </h1>

            <p style={styles.subtitle}>
              Your complete academic,
              attendance & fee report
            </p>
          </div>

          <div style={styles.headerButtons}>
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/student/dashboard"
                )
              }
              style={styles.dashboardButton}
            >
              ← Dashboard
            </button>

            <button
              type="button"
              onClick={logout}
              style={styles.logoutButton}
            >
              🚪 Logout
            </button>
          </div>
        </header>

        <section style={styles.studentCard}>
          <div style={styles.studentIcon}>
            👨‍🎓
          </div>

          <div className="student-info-content">
            <p style={styles.infoLabel}>
              STUDENT PROFILE
            </p>

            <h2 style={styles.studentName}>
              {student?.student_name ||
                student?.student_username ||
                "Student"}
            </h2>

            <p style={styles.username}>
              Username:{" "}
              {student?.student_username}
            </p>
          </div>

          <div className="profile-status">
            <span>●</span> Active
          </div>
        </section>

        <section style={styles.filterCard}>
          <div>
            <h2 style={styles.sectionTitle}>
              📅 Report Period
            </h2>

            <p style={styles.sectionSubtitle}>
              Select a month to quickly view
              its attendance and fee details.
            </p>
          </div>

          <div style={styles.filterGrid}>
            <div className="filter-field">
              <label style={styles.label}>
                Month
              </label>

              <select
                value={selectedMonth}
                onChange={(e) =>
                  setSelectedMonth(
                    e.target.value
                  )
                }
                style={styles.input}
              >
                {months.map(
                  (month, index) => (
                    <option
                      key={month}
                      value={index + 1}
                    >
                      {month}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="filter-field">
              <label style={styles.label}>
                Year
              </label>

              <select
                value={selectedYear}
                onChange={(e) =>
                  setSelectedYear(
                    e.target.value
                  )
                }
                style={styles.input}
              >
                {years.map((year) => (
                  <option
                    key={year}
                    value={year}
                  >
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {error && (
          <div style={styles.error}>
            ❌ {error}
          </div>
        )}

        {/* =====================================================
            ATTENDANCE
        ===================================================== */}
        <section style={styles.accordionCard}>
          <button
            type="button"
            className="accordion-header"
            onClick={() =>
              toggleSection("attendance")
            }
          >
            <div className="accordion-left">
              <div className="accordion-icon attendance-icon">
                📅
              </div>

              <div>
                <h2>
                  Attendance
                </h2>

                <p>
                  Overall & month-wise
                  attendance
                </p>
              </div>
            </div>

            <div className="accordion-right">
              <span className="header-mini-value">
                {overallAttendanceStats.percentage.toFixed(
                  1
                )}
                %
              </span>

              <span className="accordion-arrow">
                {openSection ===
                "attendance"
                  ? "⌃"
                  : "⌄"}
              </span>
            </div>
          </button>

          {openSection ===
            "attendance" && (
            <div className="accordion-content">
              <div className="attendance-hero">
                <div className="attendance-circle-wrap">
                  <CircularProgress
                    percentage={
                      overallAttendanceStats.percentage
                    }
                    size={175}
                    stroke={14}
                  />
                </div>

                <div className="attendance-hero-info">
                  <span className="eyebrow">
                    OVERALL ATTENDANCE
                  </span>

                  <h3>
                    {overallAttendanceStats.percentage >=
                    75
                      ? "🎉 Excellent Attendance"
                      : overallAttendanceStats.percentage >=
                        60
                      ? "👍 Keep Improving"
                      : overallAttendanceStats.total >
                        0
                      ? "⚠️ Attendance Needs Attention"
                      : "📭 No Attendance Yet"}
                  </h3>

                  <p>
                    Your attendance percentage
                    is calculated from all
                    available attendance
                    records.
                  </p>

                  <div className="attendance-mini-grid">
                    <div className="attendance-mini present">
                      <span>✓</span>

                      <div>
                        <small>
                          Present
                        </small>

                        <strong>
                          {
                            overallAttendanceStats.present
                          }
                        </strong>
                      </div>
                    </div>

                    <div className="attendance-mini absent">
                      <span>×</span>

                      <div>
                        <small>
                          Absent
                        </small>

                        <strong>
                          {
                            overallAttendanceStats.absent
                          }
                        </strong>
                      </div>
                    </div>

                    <div className="attendance-mini total">
                      <span>📚</span>

                      <div>
                        <small>
                          Total
                        </small>

                        <strong>
                          {
                            overallAttendanceStats.total
                          }
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="selected-period-card">
                <div>
                  <span>
                    QUICK MONTH VIEW
                  </span>

                  <strong>
                    {
                      months[
                        Number(
                          selectedMonth
                        ) - 1
                      ]
                    }{" "}
                    {selectedYear}
                  </strong>
                </div>

                <div className="selected-period-percent">
                  {
                    selectedAttendanceStats.percentage.toFixed(
                      1
                    )
                  }
                  %
                </div>
              </div>

              <div className="month-section-heading">
                <div>
                  <h3>
                    📆 Monthly Attendance
                  </h3>

                  <p>
                    Every available month
                    appears automatically.
                    Tap a month to see
                    day-wise details.
                  </p>
                </div>

                <span>
                  {monthlyAttendance.length}{" "}
                  months
                </span>
              </div>

              {monthlyAttendance.length ===
              0 ? (
                <div style={styles.empty}>
                  <div style={styles.emptyIcon}>
                    📭
                  </div>

                  <strong>
                    No attendance records
                    available yet.
                  </strong>

                  <p style={styles.emptySmall}>
                    Attendance records will
                    automatically appear here
                    after your teacher marks
                    attendance.
                  </p>
                </div>
              ) : (
                <div className="monthly-list">
                  {monthlyAttendance.map(
                    (month) => {
                      const isOpen =
                        expandedMonth ===
                        month.key;

                      return (
                        <div
                          key={month.key}
                          className={`month-card ${
                            isOpen
                              ? "month-card-open"
                              : ""
                          }`}
                        >
                          <button
                            type="button"
                            className="month-card-header"
                            onClick={() =>
                              setExpandedMonth(
                                isOpen
                                  ? null
                                  : month.key
                              )
                            }
                          >
                            <div className="month-title-area">
                              <div className="month-icon">
                                📅
                              </div>

                              <div>
                                <strong>
                                  {month.label}
                                </strong>

                                <span>
                                  {month.total}{" "}
                                  classes
                                </span>
                              </div>
                            </div>

                            <div className="month-stat-area">
                              <div
                                className="mini-ring"
                                style={{
                                  background: `conic-gradient(#2563eb ${
                                    month.percentage *
                                    3.6
                                  }deg,#e2e8f0 0deg)`,
                                }}
                              >
                                <div>
                                  {month.percentage.toFixed(
                                    0
                                  )}
                                  %
                                </div>
                              </div>

                              <div className="month-stat-text">
                                <span>
                                  <b className="green-text">
                                    {month.present}
                                  </b>{" "}
                                  Present
                                </span>

                                <span>
                                  <b className="red-text">
                                    {month.absent}
                                  </b>{" "}
                                  Absent
                                </span>
                              </div>

                              <span className="month-arrow">
                                {isOpen
                                  ? "⌃"
                                  : "⌄"}
                              </span>
                            </div>
                          </button>

                          {isOpen && (
                            <div className="month-details">
                              <div className="month-detail-summary">
                                <div>
                                  <span>
                                    Attendance
                                  </span>

                                  <strong>
                                    {month.percentage.toFixed(
                                      1
                                    )}
                                    %
                                  </strong>
                                </div>

                                <div>
                                  <span>
                                    Present
                                  </span>

                                  <strong className="green-text">
                                    {
                                      month.present
                                    }
                                  </strong>
                                </div>

                                <div>
                                  <span>
                                    Absent
                                  </span>

                                  <strong className="red-text">
                                    {
                                      month.absent
                                    }
                                  </strong>
                                </div>

                                <div>
                                  <span>
                                    Total
                                  </span>

                                  <strong>
                                    {
                                      month.total
                                    }
                                  </strong>
                                </div>
                              </div>

                              <div className="day-list">
                                {month.records.map(
                                  (
                                    record
                                  ) => {
                                    const date =
                                      parseLocalDate(
                                        record.attendance_date
                                      );

                                    const present =
                                      isPresentStatus(
                                        record.status
                                      );

                                    return (
                                      <div
                                        key={
                                          record.id
                                        }
                                        className={`day-attendance ${
                                          present
                                            ? "day-present"
                                            : "day-absent"
                                        }`}
                                      >
                                        <div className="day-date">
                                          <strong>
                                            {date
                                              ? date.getDate()
                                              : "—"}
                                          </strong>

                                          <span>
                                            {date
                                              ? date.toLocaleDateString(
                                                  "en-IN",
                                                  {
                                                    weekday:
                                                      "short",
                                                  }
                                                )
                                              : "Day"}
                                          </span>
                                        </div>

                                        <div className="day-full-date">
                                          {formatDate(
                                            record.attendance_date
                                          )}
                                        </div>

                                        <span
                                          className={`day-status ${
                                            present
                                              ? "status-present"
                                              : "status-absent"
                                          }`}
                                        >
                                          {present
                                            ? "✓ PRESENT"
                                            : "✕ ABSENT"}
                                        </span>
                                      </div>
                                    );
                                  }
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
          )}
        </section>

        {/* =====================================================
            TEST ZONE
        ===================================================== */}
        <section style={styles.accordionCard}>
          <button
            type="button"
            className="accordion-header"
            onClick={() =>
              toggleSection("tests")
            }
          >
            <div className="accordion-left">
              <div className="accordion-icon test-icon">
                🏆
              </div>

              <div>
                <h2>
                  Test Zone
                </h2>

                <p>
                  Tests, marks, grades &
                  results
                </p>
              </div>
            </div>

            <div className="accordion-right">
              <span className="header-mini-value purple-value">
                {assessmentStats.averagePercentage.toFixed(
                  1
                )}
                %
              </span>

              <span className="accordion-arrow">
                {openSection === "tests"
                  ? "⌃"
                  : "⌄"}
              </span>
            </div>
          </button>

          {openSection === "tests" && (
            <div className="accordion-content">
              <div className="test-zone-hero">
                <div>
                  <span className="eyebrow purple-eyebrow">
                    RACER ACADEMY
                  </span>

                  <h2>
                    🏆 TEST ZONE
                  </h2>

                  <p>
                    Your complete academy
                    test performance.
                    Click any test to see
                    its full details.
                  </p>
                </div>

                {assessments.length >
                  0 && (
                  <button
                    type="button"
                    onClick={
                      downloadAllResults
                    }
                    className="all-pdf-button"
                  >
                    📄 Download All
                    Results PDF
                  </button>
                )}
              </div>

              <div className="test-filter-row">
                <div>
                  <label>
                    📚 Subject
                  </label>

                  <p>
                    Filter your tests by
                    subject.
                  </p>
                </div>

                <select
                  value={selectedSubject}
                  onChange={(e) =>
                    setSelectedSubject(
                      e.target.value
                    )
                  }
                  style={
                    styles.subjectSelect
                  }
                >
                  <option value="All">
                    All Subjects
                  </option>

                  {availableSubjects.map(
                    (subject) => (
                      <option
                        key={subject}
                        value={subject}
                      >
                        {getSubjectLabel(
                          subject
                        )}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="test-overview">
                <div className="test-overview-circle">
                  <CircularProgress
                    percentage={
                      assessmentStats.averagePercentage
                    }
                    size={130}
                    stroke={11}
                  />
                </div>

                <div className="test-overview-stats">
                  <div>
                    <span>
                      📝 Total
                    </span>

                    <strong>
                      {
                        assessmentStats.totalTests
                      }
                    </strong>
                  </div>

                  <div className="overview-pass">
                    <span>
                      ✓ Passed
                    </span>

                    <strong>
                      {
                        assessmentStats.passedTests
                      }
                    </strong>
                  </div>

                  <div className="overview-fail">
                    <span>
                      × Failed
                    </span>

                    <strong>
                      {
                        assessmentStats.failedTests
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      📈 Average
                    </span>

                    <strong>
                      {assessmentStats.averagePercentage.toFixed(
                        1
                      )}
                      %
                    </strong>
                  </div>
                </div>
              </div>

              {assessments.length ===
              0 ? (
                <div style={styles.empty}>
                  <div style={styles.emptyIcon}>
                    🏆
                  </div>

                  <strong>
                    No Academy Test
                    Results Yet
                  </strong>

                  <p style={styles.emptySmall}>
                    Your test results will
                    appear here after the
                    teacher enters your
                    marks.
                  </p>
                </div>
              ) : filteredAssessments.length ===
                0 ? (
                <div style={styles.empty}>
                  📭 No test results
                  available for{" "}
                  {selectedSubject}.
                </div>
              ) : (
                <div className="compact-test-list">
                  {filteredAssessments.map(
                    (item, index) => {
                      const percentage =
                        getPercentage(
                          Number(
                            item.obtained_marks
                          ),
                          Number(
                            item.total_marks
                          )
                        );

                      const grade =
                        getGrade(
                          percentage
                        );

                      const passed =
                        isPass(
                          percentage
                        );

                      const imageUrls =
                        getImageUrls(
                          item.test_images
                        );

                      const isOpen =
                        expandedTestId ===
                        item.id;

                      const imagesOpen =
                        expandedImages ===
                        item.id;

                      return (
                        <article
                          key={item.id}
                          className={`compact-test-card ${
                            isOpen
                              ? "test-open"
                              : ""
                          }`}
                        >
                          <button
                            type="button"
                            className="compact-test-header"
                            onClick={() =>
                              setExpandedTestId(
                                isOpen
                                  ? null
                                  : item.id
                              )
                            }
                          >
                            <div className="test-index">
                              #{index + 1}
                            </div>

                            <div className="compact-test-main">
                              <div className="compact-test-title-row">
                                <strong>
                                  {item.test_name ||
                                    "Test"}
                                </strong>

                                <span
                                  className={
                                    passed
                                      ? "pass-pill"
                                      : "fail-pill"
                                  }
                                >
                                  {passed
                                    ? "PASS"
                                    : "FAIL"}
                                </span>
                              </div>

                              <div className="compact-test-subtitle">
                                <span>
                                  {getSubjectLabel(
                                    item.subject
                                  )}
                                </span>

                                <span>
                                  📅{" "}
                                  {formatDate(
                                    item.test_date
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="compact-score">
                              <strong>
                                {
                                  item.obtained_marks
                                }
                                /
                                {
                                  item.total_marks
                                }
                              </strong>

                              <span>
                                {percentage.toFixed(
                                  1
                                )}
                                %
                              </span>
                            </div>

                            <span className="compact-arrow">
                              {isOpen
                                ? "⌃"
                                : "⌄"}
                            </span>
                          </button>

                          {isOpen && (
                            <div className="test-details-panel">
                              <div className="test-detail-grid">
                                <div>
                                  <span>
                                    Test Date
                                  </span>

                                  <strong>
                                    {formatDate(
                                      item.test_date
                                    )}
                                  </strong>
                                </div>

                                <div>
                                  <span>
                                    Total Marks
                                  </span>

                                  <strong>
                                    {
                                      item.total_marks
                                    }
                                  </strong>
                                </div>

                                <div>
                                  <span>
                                    Obtained Marks
                                  </span>

                                  <strong className="green-text">
                                    {
                                      item.obtained_marks
                                    }
                                  </strong>
                                </div>

                                <div>
                                  <span>
                                    Percentage
                                  </span>

                                  <strong>
                                    {percentage.toFixed(
                                      1
                                    )}
                                    %
                                  </strong>
                                </div>

                                <div>
                                  <span>
                                    Grade
                                  </span>

                                  <strong
                                    className={
                                      grade ===
                                      "F"
                                        ? "red-text"
                                        : "green-text"
                                    }
                                  >
                                    {grade}
                                  </strong>
                                </div>

                                <div>
                                  <span>
                                    Result
                                  </span>

                                  <strong
                                    className={
                                      passed
                                        ? "green-text"
                                        : "red-text"
                                    }
                                  >
                                    {passed
                                      ? "PASS"
                                      : "FAIL"}
                                  </strong>
                                </div>
                              </div>

                              <div className="remarks-panel">
                                <strong>
                                  📝 Teacher's
                                  Remarks
                                </strong>

                                <p>
                                  {item.remarks ||
                                    "No remarks added by teacher."}
                                </p>
                              </div>

                              <div className="test-action-row">
                                <button
                                  type="button"
                                  onClick={(
                                    e
                                  ) => {
                                    e.stopPropagation();

                                    downloadSingleResult(
                                      item
                                    );
                                  }}
                                  className="single-pdf-button"
                                >
                                  📄 Download
                                  Test PDF
                                </button>

                                {imageUrls.length >
                                  0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedImages(
                                        imagesOpen
                                          ? null
                                          : item.id
                                      )
                                    }
                                    className="image-toggle-button"
                                  >
                                    📸{" "}
                                    {imagesOpen
                                      ? "Hide Images"
                                      : `View Images (${imageUrls.length})`}
                                  </button>
                                )}
                              </div>

                              {imageUrls.length ===
                              0 ? (
                                <div className="no-test-images">
                                  📭 No test
                                  images uploaded
                                  by teacher.
                                </div>
                              ) : (
                                imagesOpen && (
                                  <div className="test-image-grid">
                                    {imageUrls.map(
                                      (
                                        url,
                                        imageIndex
                                      ) => (
                                        <a
                                          key={`${item.id}-${imageIndex}`}
                                          href={
                                            url
                                          }
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="test-image-card"
                                        >
                                          <img
                                            src={
                                              url
                                            }
                                            alt={`Checked test ${
                                              imageIndex +
                                              1
                                            }`}
                                          />

                                          <span>
                                            Image{" "}
                                            {imageIndex +
                                              1}
                                          </span>
                                        </a>
                                      )
                                    )}
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </article>
                      );
                    }
                  )}
                </div>
              )}

              <div className="grade-info-new">
                <h3>
                  🎓 Grade System
                </h3>

                <div className="grade-new-grid">
                  {[
                    ["90–100%", "A+"],
                    ["80–89%", "A"],
                    ["70–79%", "B+"],
                    ["60–69%", "B"],
                    ["50–59%", "C"],
                    ["40–49%", "D"],
                    ["Below 40%", "F"],
                  ].map(
                    ([range, grade]) => (
                      <div
                        key={grade}
                      >
                        <strong>
                          {grade}
                        </strong>

                        <span>
                          {range}
                        </span>

                        <small
                          className={
                            grade === "F"
                              ? "red-text"
                              : "green-text"
                          }
                        >
                          {grade === "F"
                            ? "FAIL"
                            : "PASS"}
                        </small>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* =====================================================
            FEES
        ===================================================== */}
        <section style={styles.accordionCard}>
          <button
            type="button"
            className="accordion-header"
            onClick={() =>
              toggleSection("fees")
            }
          >
            <div className="accordion-left">
              <div className="accordion-icon fee-icon-new">
                💰
              </div>

              <div>
                <h2>
                  Fee Report
                </h2>

                <p>
                  Payments, receipts &
                  transaction details
                </p>
              </div>
            </div>

            <div className="accordion-right">
              <span className="header-mini-value green-value">
                ₹
                {feeStats.paid.toLocaleString(
                  "en-IN"
                )}
              </span>

              <span className="accordion-arrow">
                {openSection === "fees"
                  ? "⌃"
                  : "⌄"}
              </span>
            </div>
          </button>

          {openSection === "fees" && (
            <div className="accordion-content">
              <div className="fee-overview">
                <div className="fee-overview-item total-fee">
                  <div>
                    <span>
                      TOTAL
                    </span>

                    <strong>
                      ₹
                      {feeStats.total.toLocaleString(
                        "en-IN"
                      )}
                    </strong>
                  </div>

                  <div className="fee-overview-icon">
                    💰
                  </div>
                </div>

                <div className="fee-overview-item paid-fee">
                  <div>
                    <span>
                      PAID
                    </span>

                    <strong>
                      ₹
                      {feeStats.paid.toLocaleString(
                        "en-IN"
                      )}
                    </strong>
                  </div>

                  <div className="fee-overview-icon">
                    ✓
                  </div>
                </div>

                <div className="fee-overview-item pending-fee">
                  <div>
                    <span>
                      PENDING
                    </span>

                    <strong>
                      ₹
                      {feeStats.pending.toLocaleString(
                        "en-IN"
                      )}
                    </strong>
                  </div>

                  <div className="fee-overview-icon">
                    ⏳
                  </div>
                </div>
              </div>

              <div className="selected-fee-banner">
                <div>
                  <span>
                    SELECTED PERIOD
                  </span>

                  <strong>
                    {
                      months[
                        Number(
                          selectedMonth
                        ) - 1
                      ]
                    }{" "}
                    {selectedYear}
                  </strong>
                </div>

                <div>
                  <span>
                    RECORDS
                  </span>

                  <strong>
                    {selectedFees.length}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowFees(
                    (current) => !current
                  )
                }
                className="view-fees-main-button"
              >
                {showFees
                  ? "▲ Hide All Fee Details"
                  : "▼ View All Fee Details"}
              </button>

              {showFees && (
                <div className="fee-card-list">
                  {fees.length === 0 ? (
                    <div
                      style={styles.empty}
                    >
                      📭 No fee records
                      available.
                    </div>
                  ) : (
                    fees.map((fee) => {
                      const status =
                        String(
                          fee.status || ""
                        ).toUpperCase();

                      const paid =
                        status ===
                          "PAID" ||
                        status ===
                          "SUBMITTED";

                      const refunded =
                        status ===
                        "REFUNDED";

                      return (
                        <article
                          key={fee.id}
                          className="mobile-fee-card"
                        >
                          <div className="fee-card-top">
                            <div>
                              <span className="fee-month-label">
                                PAYMENT PERIOD
                              </span>

                              <h3>
                                {months[
                                  Number(
                                    fee.month
                                  ) - 1
                                ] ||
                                  `Month ${fee.month}`}{" "}
                                {fee.year}
                              </h3>
                            </div>

                            <div className="fee-amount">
                              ₹
                              {Number(
                                fee.amount ||
                                  0
                              ).toLocaleString(
                                "en-IN"
                              )}
                            </div>
                          </div>

                          <div className="fee-status-row">
                            <span>
                              STATUS
                            </span>

                            <strong
                              className={`fee-status ${
                                paid
                                  ? "fee-paid"
                                  : refunded
                                  ? "fee-refunded"
                                  : "fee-pending"
                              }`}
                            >
                              {fee.status ||
                                "PENDING"}
                            </strong>
                          </div>

                          <div className="fee-details-grid">
                            <div>
                              <span>
                                💳 Payment
                                Mode
                              </span>

                              <strong>
                                {fee.payment_mode ||
                                  "—"}
                              </strong>
                            </div>

                            <div>
                              <span>
                                📅 Payment
                                Date
                              </span>

                              <strong>
                                {formatDate(
                                  fee.payment_date
                                )}
                              </strong>
                            </div>

                            <div>
                              <span>
                                🧾 Transaction
                                ID
                              </span>

                              <strong>
                                {fee.transaction_id ||
                                  "—"}
                              </strong>
                            </div>

                            <div>
                              <span>
                                📝 Remarks
                              </span>

                              <strong>
                                {fee.remarks ||
                                  "—"}
                              </strong>
                            </div>
                          </div>

                          {fee.receipt_url ? (
                            <a
                              href={
                                fee.receipt_url
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="receipt-button"
                            >
                              🧾 View Payment
                              Receipt
                            </a>
                          ) : (
                            <div className="receipt-unavailable">
                              📭 Payment receipt
                              not available
                            </div>
                          )}
                        </article>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* =====================================================
            OVERALL PERFORMANCE
        ===================================================== */}
        <section style={styles.accordionCard}>
          <button
            type="button"
            className="accordion-header"
            onClick={() =>
              toggleSection("overall")
            }
          >
            <div className="accordion-left">
              <div className="accordion-icon overall-icon">
                📊
              </div>

              <div>
                <h2>
                  Overall Performance
                </h2>

                <p>
                  Complete academic
                  performance summary
                </p>
              </div>
            </div>

            <div className="accordion-right">
              <span className="header-mini-value">
                {overallPerformance.toFixed(
                  1
                )}
                %
              </span>

              <span className="accordion-arrow">
                {openSection ===
                "overall"
                  ? "⌃"
                  : "⌄"}
              </span>
            </div>
          </button>

          {openSection ===
            "overall" && (
            <div className="accordion-content">
              <div className="overall-hero">
                <CircularProgress
                  percentage={
                    overallPerformance
                  }
                  size={180}
                  stroke={15}
                />

                <div>
                  <span className="eyebrow">
                    OVERALL PERFORMANCE
                  </span>

                  <h2>
                    {overallPerformance >=
                    80
                      ? "🌟 Excellent Performance"
                      : overallPerformance >=
                        60
                      ? "👍 Good Performance"
                      : overallPerformance >
                        0
                      ? "📈 Keep Improving"
                      : "📚 Performance Data Pending"}
                  </h2>

                  <p>
                    Overall performance
                    combines your available
                    attendance percentage
                    and academy test average.
                  </p>
                </div>
              </div>

              <div className="performance-cards">
                <div className="performance-card attendance-performance">
                  <div className="performance-card-icon">
                    📅
                  </div>

                  <div>
                    <span>
                      ATTENDANCE
                    </span>

                    <strong>
                      {overallAttendanceStats.percentage.toFixed(
                        1
                      )}
                      %
                    </strong>

                    <div className="performance-bar">
                      <div
                        style={{
                          width: `${Math.min(
                            100,
                            overallAttendanceStats.percentage
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="performance-card test-performance">
                  <div className="performance-card-icon">
                    🏆
                  </div>

                  <div>
                    <span>
                      TEST AVERAGE
                    </span>

                    <strong>
                      {assessmentStats.averagePercentage.toFixed(
                        1
                      )}
                      %
                    </strong>

                    <div className="performance-bar">
                      <div
                        style={{
                          width: `${Math.min(
                            100,
                            assessmentStats.averagePercentage
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="performance-card fee-performance">
                  <div className="performance-card-icon">
                    💰
                  </div>

                  <div>
                    <span>
                      FEE STATUS
                    </span>

                    <strong>
                      {feeStats.pending >
                      0
                        ? "PENDING"
                        : feeStats.paid >
                          0
                        ? "PAID"
                        : "NO RECORDS"}
                    </strong>

                    <small>
                      {feeStats.pending >
                      0
                        ? `₹${feeStats.pending.toLocaleString(
                            "en-IN"
                          )} pending`
                        : "Payment status"}
                    </small>
                  </div>
                </div>

                <div className="performance-card overall-performance">
                  <div className="performance-card-icon">
                    ⭐
                  </div>

                  <div>
                    <span>
                      OVERALL SCORE
                    </span>

                    <strong>
                      {overallPerformance.toFixed(
                        1
                      )}
                      %
                    </strong>

                    <div className="performance-bar">
                      <div
                        style={{
                          width: `${Math.min(
                            100,
                            overallPerformance
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="performance-summary-grid">
                <div>
                  <span>
                    Attendance Records
                  </span>

                  <strong>
                    {attendance.length}
                  </strong>
                </div>

                <div>
                  <span>
                    Total Tests
                  </span>

                  <strong>
                    {assessments.length}
                  </strong>
                </div>

                <div>
                  <span>
                    Fee Records
                  </span>

                  <strong>
                    {fees.length}
                  </strong>
                </div>

                <div>
                  <span>
                    Passed Tests
                  </span>

                  <strong className="green-text">
                    {
                      assessmentStats.passedTests
                    }
                  </strong>
                </div>
              </div>
            </div>
          )}
        </section>

        <footer style={styles.footer}>
          <strong>
            RACER ACADEMY
          </strong>

          <span>
            Student Reports •{" "}
            {new Date().getFullYear()}
          </span>
        </footer>
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          max-width: 100%;
          overflow-x: hidden;
        }

        .reports-page,
        .reports-page * {
          box-sizing: border-box;
        }

        .reports-page {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }

        .reports-page button,
        .reports-page select,
        .reports-page input {
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .reports-page button {
          -webkit-tap-highlight-color: transparent;
        }

        .reports-header-content {
          min-width: 0;
          flex: 1;
        }

        .student-info-content {
          min-width: 0;
          flex: 1;
        }

        .profile-status {
          align-self: flex-start;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(
            255,
            255,
            255,
            0.15
          );
          border: 1px solid rgba(
            255,
            255,
            255,
            0.2
          );
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .profile-status span {
          color: #86efac;
        }

        .loading-icon {
          font-size: 42px;
          margin-bottom: 10px;
        }

        .accordion-card {
          background: white;
          border-radius: 20px;
          margin-bottom: 18px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          box-shadow:
            0 8px 25px
              rgba(15, 23, 42, 0.07);
        }

        .accordion-header {
          width: 100%;
          border: none;
          background: white;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          cursor: pointer;
          text-align: left;
        }

        .accordion-header:hover {
          background: #f8fafc;
        }

        .accordion-left {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .accordion-left h2 {
          margin: 0;
          color: #172554;
          font-size: 19px;
          font-weight: 900;
        }

        .accordion-left p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 12px;
        }

        .accordion-icon {
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 23px;
        }

        .attendance-icon {
          background: #dbeafe;
        }

        .test-icon {
          background: #ede9fe;
        }

        .fee-icon-new {
          background: #dcfce7;
        }

        .overall-icon {
          background: #fef3c7;
        }

        .accordion-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .header-mini-value {
          min-width: 65px;
          text-align: center;
          padding: 7px 10px;
          border-radius: 999px;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 12px;
          font-weight: 900;
        }

        .purple-value {
          background: #f5f3ff;
          color: #7c3aed;
        }

        .green-value {
          background: #dcfce7;
          color: #166534;
        }

        .accordion-arrow {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: #f1f5f9;
          color: #334155;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 900;
        }

        .accordion-content {
          padding: 0 20px 22px;
          border-top: 1px solid #f1f5f9;
        }

        .attendance-hero {
          margin-top: 20px;
          padding: 25px;
          border-radius: 18px;
          background:
            linear-gradient(
              135deg,
              #eff6ff,
              #f5f3ff
            );
          border: 1px solid #dbeafe;
          display: flex;
          align-items: center;
          gap: 30px;
        }

        .attendance-circle-wrap {
          flex-shrink: 0;
          display: flex;
          justify-content: center;
        }

        .circular-progress {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .circular-progress svg {
          display: block;
        }

        .circular-content {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .circular-content strong {
          color: #172554;
          font-size: 25px;
          font-weight: 900;
        }

        .circular-content span {
          margin-top: 2px;
          color: #64748b;
          font-size: 10px;
          font-weight: 800;
        }

        .attendance-hero-info {
          flex: 1;
          min-width: 0;
        }

        .eyebrow {
          display: block;
          color: #2563eb;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .attendance-hero-info h3 {
          margin: 6px 0;
          color: #172554;
          font-size: 23px;
          font-weight: 900;
        }

        .attendance-hero-info > p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.6;
        }

        .attendance-mini-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 18px;
        }

        .attendance-mini {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 11px;
          border-radius: 12px;
          min-width: 0;
        }

        .attendance-mini > span {
          width: 31px;
          height: 31px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }

        .attendance-mini small {
          display: block;
          color: #64748b;
          font-size: 9px;
        }

        .attendance-mini strong {
          display: block;
          margin-top: 2px;
          color: #172554;
          font-size: 17px;
        }

        .attendance-mini.present {
          background: #f0fdf4;
        }

        .attendance-mini.present > span {
          background: #dcfce7;
          color: #166534;
        }

        .attendance-mini.absent {
          background: #fef2f2;
        }

        .attendance-mini.absent > span {
          background: #fee2e2;
          color: #991b1b;
        }

        .attendance-mini.total {
          background: #f8fafc;
        }

        .attendance-mini.total > span {
          background: #e2e8f0;
        }

        .selected-period-card {
          margin-top: 16px;
          padding: 14px 16px;
          border-radius: 13px;
          background: #172554;
          color: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .selected-period-card span {
          display: block;
          font-size: 9px;
          opacity: 0.7;
          letter-spacing: 1.5px;
          font-weight: 800;
        }

        .selected-period-card strong {
          display: block;
          margin-top: 3px;
          font-size: 14px;
        }

        .selected-period-percent {
          font-size: 22px;
          font-weight: 900;
        }

        .month-section-heading {
          margin-top: 23px;
          margin-bottom: 13px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .month-section-heading h3 {
          margin: 0;
          color: #172554;
          font-size: 17px;
          font-weight: 900;
        }

        .month-section-heading p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 11px;
        }

        .month-section-heading > span {
          padding: 6px 10px;
          background: #eff6ff;
          color: #1d4ed8;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .monthly-list {
          display: grid;
          gap: 10px;
        }

        .month-card {
          border: 1px solid #e2e8f0;
          border-radius: 15px;
          overflow: hidden;
          background: white;
        }

        .month-card-open {
          border-color: #bfdbfe;
          box-shadow:
            0 6px 18px
              rgba(37, 99, 235, 0.08);
        }

        .month-card-header {
          width: 100%;
          border: none;
          background: white;
          padding: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          cursor: pointer;
          text-align: left;
        }

        .month-card-header:hover {
          background: #f8fafc;
        }

        .month-title-area {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .month-icon {
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          border-radius: 12px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .month-title-area strong {
          display: block;
          color: #172554;
          font-size: 14px;
        }

        .month-title-area span {
          display: block;
          margin-top: 3px;
          color: #64748b;
          font-size: 10px;
        }

        .month-stat-area {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .mini-ring {
          width: 48px;
          height: 48px;
          padding: 5px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mini-ring > div {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #172554;
          font-size: 10px;
          font-weight: 900;
        }

        .month-stat-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 65px;
        }

        .month-stat-text span {
          color: #64748b;
          font-size: 9px;
        }

        .month-arrow {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          color: #475569;
        }

        .month-details {
          border-top: 1px solid #e2e8f0;
          padding: 14px;
          background: #f8fafc;
        }

        .month-detail-summary {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 12px;
        }

        .month-detail-summary > div {
          padding: 10px;
          background: white;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }

        .month-detail-summary span {
          display: block;
          color: #64748b;
          font-size: 9px;
        }

        .month-detail-summary strong {
          display: block;
          margin-top: 3px;
          color: #172554;
          font-size: 14px;
        }

        .day-list {
          display: grid;
          gap: 7px;
        }

        .day-attendance {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          border-radius: 11px;
          border: 1px solid #e2e8f0;
          background: white;
        }

        .day-present {
          border-left: 4px solid #22c55e;
        }

        .day-absent {
          border-left: 4px solid #ef4444;
        }

        .day-date {
          width: 45px;
          flex-shrink: 0;
          text-align: center;
        }

        .day-date strong {
          display: block;
          color: #172554;
          font-size: 18px;
        }

        .day-date span {
          display: block;
          color: #64748b;
          font-size: 8px;
          text-transform: uppercase;
        }

        .day-full-date {
          flex: 1;
          color: #475569;
          font-size: 11px;
        }

        .day-status {
          padding: 6px 9px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 900;
          white-space: nowrap;
        }

        .status-present {
          background: #dcfce7;
          color: #166534;
        }

        .status-absent {
          background: #fee2e2;
          color: #991b1b;
        }

        .green-text {
          color: #166534 !important;
        }

        .red-text {
          color: #991b1b !important;
        }

        .test-zone-hero {
          margin-top: 20px;
          padding: 21px;
          border-radius: 17px;
          background:
            linear-gradient(
              135deg,
              #f5f3ff,
              #eff6ff
            );
          border: 1px solid #ddd6fe;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
        }

        .purple-eyebrow {
          color: #7c3aed;
        }

        .test-zone-hero h2 {
          margin: 5px 0;
          color: #172554;
          font-size: 22px;
          font-weight: 900;
        }

        .test-zone-hero p {
          margin: 0;
          color: #64748b;
          font-size: 11px;
          line-height: 1.5;
        }

        .all-pdf-button,
        .single-pdf-button {
          border: none;
          background: #dc2626;
          color: white;
          padding: 11px 14px;
          border-radius: 10px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }

        .all-pdf-button:hover,
        .single-pdf-button:hover {
          background: #b91c1c;
        }

        .test-filter-row {
          margin-top: 15px;
          padding: 14px;
          border-radius: 13px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .test-filter-row label {
          display: block;
          color: #312e81;
          font-size: 13px;
          font-weight: 900;
        }

        .test-filter-row p {
          margin: 3px 0 0;
          color: #64748b;
          font-size: 10px;
        }

        .test-overview {
          margin-top: 15px;
          padding: 18px;
          border-radius: 15px;
          background: #172554;
          display: flex;
          align-items: center;
          gap: 25px;
          color: white;
        }

        .test-overview .circular-content strong {
          color: #172554;
        }

        .test-overview-stats {
          flex: 1;
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .test-overview-stats > div {
          padding: 12px;
          border-radius: 11px;
          background: rgba(
            255,
            255,
            255,
            0.08
          );
        }

        .test-overview-stats span {
          display: block;
          font-size: 9px;
          opacity: 0.75;
        }

        .test-overview-stats strong {
          display: block;
          margin-top: 4px;
          font-size: 19px;
        }

        .overview-pass strong {
          color: #86efac;
        }

        .overview-fail strong {
          color: #fca5a5;
        }

        .compact-test-list {
          display: grid;
          gap: 9px;
          margin-top: 17px;
        }

        .compact-test-card {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          background: white;
        }

        .test-open {
          border-color: #c4b5fd;
          box-shadow:
            0 5px 18px
              rgba(124, 58, 237, 0.08);
        }

        .compact-test-header {
          width: 100%;
          border: none;
          background: white;
          padding: 13px;
          display: flex;
          align-items: center;
          gap: 11px;
          cursor: pointer;
          text-align: left;
        }

        .compact-test-header:hover {
          background: #fafafa;
        }

        .test-index {
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          border-radius: 10px;
          background: #f5f3ff;
          color: #7c3aed;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 900;
        }

        .compact-test-main {
          flex: 1;
          min-width: 0;
        }

        .compact-test-title-row {
          display: flex;
          align-items: center;
          gap: 7px;
          min-width: 0;
        }

        .compact-test-title-row > strong {
          color: #172554;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .pass-pill,
        .fail-pill {
          padding: 4px 7px;
          border-radius: 999px;
          font-size: 8px;
          font-weight: 900;
          flex-shrink: 0;
        }

        .pass-pill {
          background: #dcfce7;
          color: #166534;
        }

        .fail-pill {
          background: #fee2e2;
          color: #991b1b;
        }

        .compact-test-subtitle {
          display: flex;
          gap: 10px;
          margin-top: 5px;
          color: #64748b;
          font-size: 9px;
          flex-wrap: wrap;
        }

        .compact-score {
          width: 72px;
          flex-shrink: 0;
          text-align: right;
        }

        .compact-score strong {
          display: block;
          color: #172554;
          font-size: 13px;
        }

        .compact-score span {
          display: block;
          margin-top: 2px;
          color: #2563eb;
          font-size: 9px;
          font-weight: 800;
        }

        .compact-arrow {
          width: 27px;
          height: 27px;
          flex-shrink: 0;
          border-radius: 8px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }

        .test-details-panel {
          border-top: 1px solid #e2e8f0;
          padding: 14px;
          background: #fafafa;
        }

        .test-detail-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .test-detail-grid > div {
          padding: 10px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
        }

        .test-detail-grid span {
          display: block;
          color: #64748b;
          font-size: 9px;
        }

        .test-detail-grid strong {
          display: block;
          margin-top: 3px;
          color: #172554;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .remarks-panel {
          margin-top: 9px;
          padding: 12px;
          border-radius: 11px;
          background: white;
          border: 1px solid #e2e8f0;
        }

        .remarks-panel strong {
          color: #172554;
          font-size: 11px;
        }

        .remarks-panel p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 10px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .test-action-row {
          display: flex;
          gap: 8px;
          margin-top: 10px;
          flex-wrap: wrap;
        }

        .image-toggle-button {
          border: none;
          background: #ea580c;
          color: white;
          padding: 10px 13px;
          border-radius: 9px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .no-test-images {
          margin-top: 10px;
          padding: 11px;
          border-radius: 10px;
          background: #f1f5f9;
          color: #64748b;
          font-size: 10px;
        }

        .test-image-grid {
          display: grid;
          grid-template-columns:
            repeat(auto-fill, minmax(150px, 1fr));
          gap: 10px;
          margin-top: 12px;
        }

        .test-image-card {
          display: block;
          text-decoration: none;
          color: #1e3a8a;
          font-size: 9px;
          font-weight: 800;
        }

        .test-image-card img {
          display: block;
          width: 100%;
          height: 150px;
          object-fit: cover;
          border-radius: 9px;
          border: 1px solid #cbd5e1;
          margin-bottom: 5px;
          background: #f1f5f9;
        }

        .grade-info-new {
          margin-top: 15px;
          padding: 15px;
          border-radius: 14px;
          background: #f5f3ff;
          border: 1px solid #ddd6fe;
        }

        .grade-info-new h3 {
          margin: 0;
          color: #312e81;
          font-size: 14px;
        }

        .grade-new-grid {
          display: grid;
          grid-template-columns:
            repeat(7, minmax(0, 1fr));
          gap: 7px;
          margin-top: 10px;
        }

        .grade-new-grid > div {
          padding: 9px 5px;
          border-radius: 9px;
          background: white;
          text-align: center;
          border: 1px solid #e2e8f0;
        }

        .grade-new-grid strong {
          display: block;
          color: #312e81;
          font-size: 14px;
        }

        .grade-new-grid span {
          display: block;
          margin-top: 3px;
          color: #64748b;
          font-size: 8px;
        }

        .grade-new-grid small {
          display: block;
          margin-top: 3px;
          font-size: 8px;
          font-weight: 900;
        }

        .fee-overview {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 20px;
        }

        .fee-overview-item {
          min-width: 0;
          padding: 15px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .fee-overview-item span {
          display: block;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .fee-overview-item strong {
          display: block;
          margin-top: 4px;
          font-size: 19px;
          overflow-wrap: anywhere;
        }

        .total-fee {
          background: #eff6ff;
          color: #1e3a8a;
        }

        .paid-fee {
          background: #f0fdf4;
          color: #166534;
        }

        .pending-fee {
          background: #fffbeb;
          color: #92400e;
        }

        .fee-overview-icon {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          border-radius: 11px;
          background: rgba(
            255,
            255,
            255,
            0.7
          );
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }

        .selected-fee-banner {
          margin-top: 12px;
          padding: 13px 15px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .selected-fee-banner span {
          display: block;
          color: #64748b;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .selected-fee-banner strong {
          display: block;
          margin-top: 3px;
          color: #172554;
          font-size: 13px;
        }

        .view-fees-main-button {
          width: 100%;
          margin-top: 12px;
          border: none;
          padding: 13px;
          border-radius: 11px;
          background: #2563eb;
          color: white;
          font-weight: 900;
          cursor: pointer;
        }

        .view-fees-main-button:hover {
          background: #1d4ed8;
        }

        .fee-card-list {
          display: grid;
          gap: 11px;
          margin-top: 12px;
        }

        .mobile-fee-card {
          padding: 15px;
          border-radius: 15px;
          border: 1px solid #e2e8f0;
          background: white;
          box-shadow:
            0 4px 14px
              rgba(15, 23, 42, 0.04);
        }

        .fee-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .fee-month-label {
          display: block;
          color: #64748b;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .fee-card-top h3 {
          margin: 3px 0 0;
          color: #172554;
          font-size: 15px;
        }

        .fee-amount {
          color: #172554;
          font-size: 19px;
          font-weight: 900;
          text-align: right;
        }

        .fee-status-row {
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .fee-status-row > span {
          color: #64748b;
          font-size: 8px;
          font-weight: 800;
        }

        .fee-status {
          padding: 6px 9px;
          border-radius: 999px;
          font-size: 8px;
          font-weight: 900;
        }

        .fee-paid {
          background: #dcfce7;
          color: #166534;
        }

        .fee-pending {
          background: #fef3c7;
          color: #92400e;
        }

        .fee-refunded {
          background: #ede9fe;
          color: #5b21b6;
        }

        .fee-details-grid {
          margin-top: 10px;
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .fee-details-grid > div {
          padding: 9px;
          border-radius: 9px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          min-width: 0;
        }

        .fee-details-grid span {
          display: block;
          color: #64748b;
          font-size: 8px;
        }

        .fee-details-grid strong {
          display: block;
          margin-top: 3px;
          color: #334155;
          font-size: 10px;
          overflow-wrap: anywhere;
        }

        .receipt-button {
          display: block;
          margin-top: 10px;
          padding: 10px;
          border-radius: 9px;
          background: #172554;
          color: white;
          text-align: center;
          text-decoration: none;
          font-size: 10px;
          font-weight: 900;
        }

        .receipt-unavailable {
          margin-top: 10px;
          padding: 10px;
          border-radius: 9px;
          background: #f1f5f9;
          color: #64748b;
          text-align: center;
          font-size: 9px;
        }

        .overall-hero {
          margin-top: 20px;
          padding: 25px;
          border-radius: 18px;
          background:
            linear-gradient(
              135deg,
              #eff6ff,
              #f5f3ff
            );
          border: 1px solid #dbeafe;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 30px;
          text-align: left;
        }

        .overall-hero h2 {
          margin: 6px 0;
          color: #172554;
          font-size: 22px;
        }

        .overall-hero p {
          max-width: 500px;
          margin: 0;
          color: #64748b;
          font-size: 11px;
          line-height: 1.6;
        }

        .performance-cards {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 15px;
        }

        .performance-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: white;
          min-width: 0;
        }

        .performance-card-icon {
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          font-size: 20px;
        }

        .performance-card > div:last-child {
          flex: 1;
          min-width: 0;
        }

        .performance-card span {
          display: block;
          color: #64748b;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .performance-card strong {
          display: block;
          margin-top: 3px;
          color: #172554;
          font-size: 18px;
          overflow-wrap: anywhere;
        }

        .performance-card small {
          display: block;
          margin-top: 3px;
          color: #64748b;
          font-size: 9px;
        }

        .performance-bar {
          width: 100%;
          height: 6px;
          margin-top: 6px;
          border-radius: 999px;
          background: #e2e8f0;
          overflow: hidden;
        }

        .performance-bar > div {
          height: 100%;
          border-radius: inherit;
          background:
            linear-gradient(
              90deg,
              #2563eb,
              #7c3aed
            );
        }

        .performance-summary-grid {
          margin-top: 12px;
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .performance-summary-grid > div {
          padding: 12px;
          border-radius: 11px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }

        .performance-summary-grid span {
          display: block;
          color: #64748b;
          font-size: 8px;
        }

        .performance-summary-grid strong {
          display: block;
          margin-top: 4px;
          color: #172554;
          font-size: 16px;
        }

        .reports-page h1,
        .reports-page h2,
        .reports-page h3,
        .reports-page p {
          overflow-wrap: anywhere;
        }

        .reports-page img {
          max-width: 100%;
        }

        @media (max-width: 768px) {
          .reports-page {
            padding: 10px 7px !important;
            max-width: 100vw !important;
          }

          .reports-page header {
            padding: 15px !important;
            border-radius: 15px !important;
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .reports-page header > div:last-child {
            width: 100%;
          }

          .reports-page header > div:last-child button {
            flex: 1;
          }

          .reports-page .studentCard {
            min-width: 0;
          }

          .profile-status {
            display: none;
          }

          .reports-page [style*="padding: 25px"] {
            padding: 17px !important;
          }

          .reports-page [style*="padding: 24px"] {
            padding: 17px !important;
          }

          .reports-page [style*="padding: 22px"] {
            padding: 16px !important;
          }

          .reports-page [style*="padding: 20px"] {
            padding: 15px !important;
          }

          .attendance-hero {
            flex-direction: column;
            text-align: center;
            padding: 17px;
            gap: 15px;
          }

          .attendance-hero-info {
            width: 100%;
          }

          .attendance-hero-info h3 {
            font-size: 19px;
          }

          .attendance-mini-grid {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }

          .month-detail-summary {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .day-attendance {
            gap: 8px;
          }

          .test-zone-hero {
            flex-direction: column;
            align-items: stretch;
          }

          .all-pdf-button {
            width: 100%;
          }

          .test-overview {
            flex-direction: column;
            text-align: center;
          }

          .test-overview-stats {
            width: 100%;
          }

          .test-detail-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .grade-new-grid {
            grid-template-columns:
              repeat(4, minmax(0, 1fr));
          }

          .fee-overview {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }

          .fee-overview-item {
            padding: 11px;
          }

          .fee-overview-icon {
            display: none;
          }

          .overall-hero {
            flex-direction: column;
            text-align: center;
            padding: 18px;
          }

          .performance-summary-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 520px) {
          .reports-page {
            padding: 7px 5px !important;
          }

          .reports-page header {
            padding: 13px !important;
          }

          .reports-page h1 {
            font-size: 23px !important;
          }

          .reports-page .studentCard {
            padding: 16px !important;
          }

          .reports-page [style*="width: 70px"] {
            width: 52px !important;
            height: 52px !important;
            font-size: 28px !important;
          }

          .accordion-header {
            padding: 14px 12px;
          }

          .accordion-icon {
            width: 41px;
            height: 41px;
            border-radius: 11px;
            font-size: 19px;
          }

          .accordion-left {
            gap: 9px;
          }

          .accordion-left h2 {
            font-size: 15px;
          }

          .accordion-left p {
            font-size: 9px;
          }

          .header-mini-value {
            display: none;
          }

          .accordion-content {
            padding: 0 11px 15px;
          }

          .attendance-mini-grid {
            gap: 6px;
          }

          .attendance-mini {
            padding: 8px 5px;
            gap: 5px;
            justify-content: center;
          }

          .attendance-mini > span {
            width: 25px;
            height: 25px;
          }

          .attendance-mini strong {
            font-size: 14px;
          }

          .attendance-mini small {
            font-size: 8px;
          }

          .month-card-header {
            padding: 10px;
          }

          .month-stat-text {
            display: none;
          }

          .month-stat-area {
            gap: 7px;
          }

          .mini-ring {
            width: 42px;
            height: 42px;
            padding: 4px;
          }

          .mini-ring > div {
            width: 34px;
            height: 34px;
            font-size: 9px;
          }

          .day-full-date {
            display: none;
          }

          .day-status {
            font-size: 8px;
            padding: 5px 6px;
          }

          .test-filter-row {
            flex-direction: column;
            align-items: stretch;
          }

          .test-filter-row select {
            width: 100%;
            min-width: 0 !important;
          }

          .test-overview {
            padding: 14px;
          }

          .test-overview-stats {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .compact-test-header {
            padding: 10px 8px;
            gap: 7px;
          }

          .test-index {
            width: 29px;
            height: 29px;
            font-size: 9px;
          }

          .compact-test-title-row {
            display: block;
          }

          .compact-test-title-row .pass-pill,
          .compact-test-title-row .fail-pill {
            display: inline-block;
            margin-top: 4px;
          }

          .compact-score {
            width: 53px;
          }

          .compact-score strong {
            font-size: 10px;
          }

          .compact-score span {
            font-size: 8px;
          }

          .compact-arrow {
            width: 23px;
            height: 23px;
          }

          .test-details-panel {
            padding: 10px;
          }

          .test-detail-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .test-action-row button {
            flex: 1;
            min-width: 130px;
          }

          .grade-new-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .fee-overview {
            grid-template-columns: 1fr;
          }

          .fee-overview-icon {
            display: flex;
          }

          .fee-details-grid {
            grid-template-columns: 1fr;
          }

          .overall-hero h2 {
            font-size: 18px;
          }

          .performance-cards {
            grid-template-columns: 1fr;
          }

          .performance-summary-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .selected-period-card,
          .selected-fee-banner {
            padding: 11px;
          }
        }

        @media (max-width: 360px) {
          .reports-page {
            padding: 5px 3px !important;
          }

          .reports-page h1 {
            font-size: 21px !important;
          }

          .accordion-left h2 {
            font-size: 14px;
          }

          .accordion-left p {
            display: none;
          }

          .attendance-mini-grid {
            grid-template-columns: 1fr;
          }

          .attendance-mini {
            justify-content: flex-start;
          }

          .month-detail-summary {
            grid-template-columns: 1fr 1fr;
          }

          .compact-test-subtitle {
            display: block;
          }

          .compact-test-subtitle span {
            display: block;
            margin-top: 2px;
          }

          .performance-summary-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </main>
  );
}

const styles: Record<
  string,
  CSSProperties
> = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#eef2ff,#f8fafc,#eff6ff)",
    padding: "20px 15px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    width: "100%",
    overflowX: "hidden",
  },

  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
    minWidth: 0,
  },

  header: {
    background: "white",
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
    flexWrap: "wrap",
  },

  smallTitle: {
    color: "#2563eb",
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "3px",
  },

  title: {
    margin: "5px 0 0",
    color: "#172554",
    fontSize: "30px",
    fontWeight: "800",
  },

  subtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  headerButtons: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  dashboardButton: {
    border: "none",
    background: "#1e3a8a",
    color: "white",
    padding: "11px 16px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },

  logoutButton: {
    border: "none",
    background: "#dc2626",
    color: "white",
    padding: "11px 16px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },

  studentCard: {
    background:
      "linear-gradient(135deg,#2563eb,#4f46e5,#7c3aed)",
    color: "white",
    borderRadius: "20px",
    padding: "25px",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    marginBottom: "20px",
    boxShadow:
      "0 15px 35px rgba(37,99,235,0.20)",
    minWidth: 0,
  },

  studentIcon: {
    width: "70px",
    height: "70px",
    borderRadius: "20px",
    background:
      "rgba(255,255,255,0.16)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "38px",
    flexShrink: 0,
  },

  infoLabel: {
    margin: 0,
    fontSize: "11px",
    letterSpacing: "2px",
    fontWeight: "800",
    opacity: 0.8,
  },

  studentName: {
    margin: "4px 0",
    fontSize: "25px",
    fontWeight: "800",
  },

  username: {
    margin: 0,
    fontSize: "13px",
    opacity: 0.85,
  },

  filterCard: {
    background: "white",
    borderRadius: "18px",
    padding: "22px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
    minWidth: 0,
  },

  sectionTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "21px",
    fontWeight: "800",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  filterGrid: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },

  label: {
    display: "block",
    marginBottom: "6px",
    color: "#334155",
    fontSize: "12px",
    fontWeight: "700",
  },

  input: {
    minWidth: "150px",
    padding: "11px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    background: "white",
    color: "#111827",
    fontSize: "14px",
  },

  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "14px",
    borderRadius: "12px",
    marginBottom: "20px",
    fontWeight: "600",
    overflowWrap: "anywhere",
  },

  accordionCard: {
    background: "white",
    borderRadius: "20px",
    marginBottom: "18px",
    minWidth: 0,
  },

  subjectSelect: {
    minWidth: "200px",
    padding: "11px 13px",
    border: "1px solid #c4b5fd",
    borderRadius: "10px",
    background: "white",
    color: "#172554",
    fontWeight: "800",
    fontSize: "13px",
    cursor: "pointer",
  },

  empty: {
    textAlign: "center",
    padding: "35px 15px",
    color: "#64748b",
    background: "#f8fafc",
    borderRadius: "12px",
    marginTop: "20px",
    overflowWrap: "anywhere",
  },

  emptyIcon: {
    fontSize: "40px",
    marginBottom: "8px",
  },

  emptySmall: {
    margin: "7px 0 0",
    fontSize: "12px",
    color: "#64748b",
  },

  loading: {
    background: "white",
    maxWidth: "450px",
    margin: "100px auto",
    padding: "40px",
    borderRadius: "18px",
    textAlign: "center",
    fontSize: "18px",
    fontWeight: "700",
    color: "#172554",
  },

  footer: {
    padding: "25px 10px 10px",
    textAlign: "center",
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    flexWrap: "wrap",
    color: "#64748b",
    fontSize: "12px",
  },
};
```
