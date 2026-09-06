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

type PdfAssessment = AssessmentRow;

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
  return (obtained / total) * 100;
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

        if (typeof item === "object" && item !== null) {
          if ("url" in item) {
            const url = (item as { url?: unknown }).url;
            if (typeof url === "string") return url;
          }

          if ("path" in item) {
            const path = (item as { path?: unknown }).path;
            if (typeof path === "string") return path;
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
            if (typeof item === "string") return item;

            if (typeof item === "object" && item !== null) {
              if ("url" in item) {
                const url = (item as { url?: unknown }).url;
                return typeof url === "string" ? url : "";
              }

              if ("path" in item) {
                const path = (item as { path?: unknown }).path;
                return typeof path === "string" ? path : "";
              }
            }

            return "";
          })
          .filter(Boolean);
      }
    } catch {
      // Not JSON.
    }

    return [trimmed];
  }

  return [];
}

function formatDate(
  dateString: string | null | undefined
): string {
  if (!dateString) return "—";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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
  assessments: PdfAssessment[],
  selectedSubject: string
): void {
  const printableAssessments =
    selectedSubject === "All"
      ? assessments
      : assessments.filter(
          (item) =>
            (item.subject || "Not Specified") === selectedSubject
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
    selectedSubject === "All" ? "All Subjects" : selectedSubject;

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
              <div class="images-heading">📸 Checked Test Images</div>
              <div class="images-count">
                ${imageUrls.length}
                ${imageUrls.length === 1 ? "image" : "images"}
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
                          alt="Checked Test Image ${imageIndex + 1}"
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
              <div class="test-number">TEST #${index + 1}</div>
              <h2 class="test-title">
                ${escapeHtml(item.test_name || "Test")}
              </h2>
              <div class="subject-badge">
                ${escapeHtml(
                  item.subject || "Subject Not Specified"
                )}
              </div>
            </div>

            <div class="result-badge ${
              passed ? "result-pass" : "result-fail"
            }">
              ${passed ? "PASS" : "FAIL"}
            </div>
          </div>

          <div class="test-details">
            <div class="detail-box">
              <span>Test Date</span>
              <strong>${escapeHtml(
                formatDate(item.test_date)
              )}</strong>
            </div>

            <div class="detail-box">
              <span>Total Marks</span>
              <strong>${escapeHtml(item.total_marks)}</strong>
            </div>

            <div class="detail-box">
              <span>Obtained Marks</span>
              <strong>${escapeHtml(item.obtained_marks)}</strong>
            </div>

            <div class="detail-box">
              <span>Percentage</span>
              <strong>${percentage.toFixed(1)}%</strong>
            </div>

            <div class="detail-box">
              <span>Grade</span>
              <strong>${escapeHtml(grade)}</strong>
            </div>

            <div class="detail-box">
              <span>Result</span>
              <strong class="${
                passed ? "pass-text" : "fail-text"
              }">
                ${passed ? "PASS" : "FAIL"}
              </strong>
            </div>
          </div>

          <div class="remarks-box">
            <strong>📝 Remarks</strong>
            <p>
              ${escapeHtml(
                item.remarks || "No remarks added by teacher."
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
          RACER ACADEMY Result - ${escapeHtml(studentName)}
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
            font-family: Arial, Helvetica, sans-serif;
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
            grid-template-columns: repeat(4, 1fr);
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
            page-break-inside: auto;
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
            grid-template-columns: repeat(6, 1fr);
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
            grid-template-columns: repeat(2, minmax(0, 1fr));
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

            .test-section {
              page-break-inside: auto;
              break-inside: auto;
            }

            .image-card {
              page-break-inside: avoid;
              break-inside: avoid;
            }

            .images-section {
              page-break-inside: auto;
              break-inside: auto;
            }

            img {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        </style>
      </head>

      <body>
        <div class="header">
          <div class="brand">RACER ACADEMY</div>

          <h1>🏆 Academy Test Result</h1>

          <div class="student">
            <strong>${escapeHtml(studentName)}</strong>
            <br />
            Username: ${escapeHtml(student.student_username)}
            <br />
            Subject: ${escapeHtml(subjectLabel)}
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
            <strong>${average.toFixed(1)}%</strong>
          </div>
        </div>

        ${testSections}

        <div class="footer">
          RACER ACADEMY • Student Result Report
        </div>

        <script>
          (function () {
            function printWhenImagesReady() {
              var images = Array.prototype.slice.call(
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

            if (document.readyState === "complete") {
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

export default function StudentReportsPage() {
  const router = useRouter();

  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedMonth, setSelectedMonth] = useState(
    String(new Date().getMonth() + 1)
  );

  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear())
  );

  const [selectedSubject, setSelectedSubject] = useState("All");
  const [expandedImages, setExpandedImages] = useState<number | null>(null);

  useEffect(() => {
    void loadReport();
  }, []);

  async function loadReport(): Promise<void> {
    setLoading(true);
    setError("");

    try {
      let username =
        localStorage.getItem("student_username") ||
        localStorage.getItem("studentUsername") ||
        localStorage.getItem("username");

      const storedStudent = localStorage.getItem("student");

      if (!username && storedStudent) {
        try {
          const parsed: unknown = JSON.parse(storedStudent);

          if (typeof parsed === "object" && parsed !== null) {
            const studentObject = parsed as {
              student_username?: unknown;
              username?: unknown;
            };

            if (
              typeof studentObject.student_username === "string"
            ) {
              username = studentObject.student_username;
            } else if (
              typeof studentObject.username === "string"
            ) {
              username = studentObject.username;
            }
          }
        } catch {
          // Invalid localStorage JSON.
        }
      }

      if (!username?.trim()) {
        setError("Student login information not found.");
        setLoading(false);
        return;
      }

      const { data: studentData, error: studentError } =
        await supabase
          .from("students")
          .select("id, student_name, student_username")
          .ilike("student_username", username.trim())
          .maybeSingle();

      if (studentError) {
        setError(studentError.message);
        setLoading(false);
        return;
      }

      if (!studentData) {
        setError("Student record not found.");
        setLoading(false);
        return;
      }

      const currentStudent = studentData as Student;
      setStudent(currentStudent);

      const {
        data: attendanceData,
        error: attendanceError,
      } = await supabase
        .from("attendance")
        .select(
          "id, student_id, attendance_date, status"
        )
        .eq("student_id", currentStudent.id)
        .order("attendance_date", { ascending: false });

      if (attendanceError) {
        setError(attendanceError.message);
        setLoading(false);
        return;
      }

      const { data: feesData, error: feesError } = await supabase
        .from("fees")
        .select(
          "id, student_id, month, year, amount, status, payment_date"
        )
        .eq("student_id", currentStudent.id)
        .order("year", { ascending: false })
        .order("month", { ascending: false });

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
        .eq("student_id", currentStudent.id)
        .order("test_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (assessmentError) {
        setError(assessmentError.message);
        setLoading(false);
        return;
      }

      setAttendance(
        (attendanceData || []) as AttendanceRow[]
      );

      setFees((feesData || []) as FeeRow[]);

      setAssessments(
        (assessmentData || []) as AssessmentRow[]
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
    localStorage.removeItem("student_username");
    localStorage.removeItem("studentUsername");
    localStorage.removeItem("student_name");
    localStorage.removeItem("studentName");
    localStorage.removeItem("studentLoggedIn");
    localStorage.removeItem("student");
    sessionStorage.clear();
    router.push("/");
  }

  const filteredAttendance = useMemo<AttendanceRow[]>(
    () =>
      attendance.filter((record) => {
        const date = new Date(record.attendance_date);

        return (
          date.getMonth() + 1 === Number(selectedMonth) &&
          date.getFullYear() === Number(selectedYear)
        );
      }),
    [attendance, selectedMonth, selectedYear]
  );

  const presentCount = filteredAttendance.filter((record) => {
    const status = String(record.status || "").toUpperCase();
    return status === "PRESENT" || status === "P";
  }).length;

  const absentCount = filteredAttendance.filter((record) => {
    const status = String(record.status || "").toUpperCase();
    return status === "ABSENT" || status === "A";
  }).length;

  const totalClasses = presentCount + absentCount;

  const attendancePercentage =
    totalClasses > 0
      ? (presentCount / totalClasses) * 100
      : 0;

  const filteredFees = useMemo<FeeRow[]>(
    () =>
      fees.filter(
        (fee) =>
          Number(fee.month) === Number(selectedMonth) &&
          Number(fee.year) === Number(selectedYear)
      ),
    [fees, selectedMonth, selectedYear]
  );

  const totalFee = filteredFees.reduce(
    (sum, fee) => sum + Number(fee.amount || 0),
    0
  );

  const paidFee = filteredFees
    .filter((fee) => {
      const status = String(fee.status || "").toUpperCase();
      return status === "SUBMITTED" || status === "PAID";
    })
    .reduce(
      (sum, fee) => sum + Number(fee.amount || 0),
      0
    );

  const pendingFee = filteredFees
    .filter(
      (fee) =>
        String(fee.status || "").toUpperCase() === "PENDING"
    )
    .reduce(
      (sum, fee) => sum + Number(fee.amount || 0),
      0
    );

  const availableSubjects = useMemo<string[]>(
    () =>
      Array.from(
        new Set(
          assessments
            .map((item) => item.subject)
            .filter(
              (subject): subject is string =>
                subject === "English" ||
                subject === "Mathematics"
            )
        )
      ),
    [assessments]
  );

  void availableSubjects;

  const filteredAssessments = useMemo<AssessmentRow[]>(
    () =>
      selectedSubject === "All"
        ? assessments
        : assessments.filter(
            (item) => item.subject === selectedSubject
          ),
    [assessments, selectedSubject]
  );

  const assessmentStats = useMemo(
    () => {
      const totalTests = filteredAssessments.length;

      const passedTests = filteredAssessments.filter((item) =>
        isPass(
          getPercentage(
            Number(item.obtained_marks),
            Number(item.total_marks)
          )
        )
      ).length;

      const failedTests = totalTests - passedTests;

      const averagePercentage =
        totalTests > 0
          ? filteredAssessments.reduce(
              (sum, item) =>
                sum +
                getPercentage(
                  Number(item.obtained_marks),
                  Number(item.total_marks)
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
    },
    [filteredAssessments]
  );

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
          📊 Loading Student Reports...
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
              Attendance, fees and academy assessment reports
            </p>
          </div>

          <div style={styles.headerButtons}>
            <button
              type="button"
              onClick={() =>
                router.push("/student/dashboard")
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
              STUDENT
            </p>

            <h2 style={styles.studentName}>
              {student?.student_name ||
                student?.student_username ||
                "Student"}
            </h2>

            <p style={styles.username}>
              Username: {student?.student_username}
            </p>
          </div>
        </section>

        <section style={styles.filterCard}>
          <div>
            <h2 style={styles.sectionTitle}>
              📅 Report Period
            </h2>

            <p style={styles.sectionSubtitle}>
              Select month and year
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
                  setSelectedMonth(e.target.value)
                }
                style={styles.input}
              >
                {months.map((month, index) => (
                  <option
                    key={month}
                    value={index + 1}
                  >
                    {month}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-field">
              <label style={styles.label}>
                Year
              </label>

              <select
                value={selectedYear}
                onChange={(e) =>
                  setSelectedYear(e.target.value)
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

        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                📝 Attendance Report
              </h2>

              <p style={styles.sectionSubtitle}>
                {months[Number(selectedMonth) - 1]}{" "}
                {selectedYear}
              </p>
            </div>
          </div>

          <div style={styles.statsGrid}>
            <div
              style={{
                ...styles.statCard,
                background:
                  "linear-gradient(135deg,#2563eb,#4f46e5)",
              }}
            >
              <div style={styles.statIcon}>
                📚
              </div>

              <div>
                <p style={styles.statLabel}>
                  Total Classes
                </p>

                <h3 style={styles.statValue}>
                  {totalClasses}
                </h3>
              </div>
            </div>

            <div
              style={{
                ...styles.statCard,
                background:
                  "linear-gradient(135deg,#16a34a,#22c55e)",
              }}
            >
              <div style={styles.statIcon}>
                ✅
              </div>

              <div>
                <p style={styles.statLabel}>
                  Present
                </p>

                <h3 style={styles.statValue}>
                  {presentCount}
                </h3>
              </div>
            </div>

            <div
              style={{
                ...styles.statCard,
                background:
                  "linear-gradient(135deg,#dc2626,#ef4444)",
              }}
            >
              <div style={styles.statIcon}>
                ❌
              </div>

              <div>
                <p style={styles.statLabel}>
                  Absent
                </p>

                <h3 style={styles.statValue}>
                  {absentCount}
                </h3>
              </div>
            </div>

            <div
              style={{
                ...styles.statCard,
                background:
                  "linear-gradient(135deg,#7c3aed,#9333ea)",
              }}
            >
              <div style={styles.statIcon}>
                📈
              </div>

              <div>
                <p style={styles.statLabel}>
                  Attendance
                </p>

                <h3 style={styles.statValue}>
                  {attendancePercentage.toFixed(1)}%
                </h3>
              </div>
            </div>
          </div>

          <div style={styles.progressBox}>
            <div style={styles.progressHeader}>
              <strong>
                Attendance Percentage
              </strong>

              <strong>
                {attendancePercentage.toFixed(1)}%
              </strong>
            </div>

            <div style={styles.progressBackground}>
              <div
                style={{
                  ...styles.progressBar,
                  width: `${Math.min(
                    Math.max(attendancePercentage, 0),
                    100
                  )}%`,
                }}
              />
            </div>

            <p style={styles.progressText}>
              {attendancePercentage >= 75
                ? "🎉 Good attendance! Keep it up."
                : attendancePercentage > 0
                ? "⚠️ Attendance is below 75%."
                : "No attendance records for this month."}
            </p>
          </div>

          {filteredAttendance.length === 0 ? (
            <div style={styles.empty}>
              📭 No attendance records found for this month.
            </div>
          ) : (
            <div className="reports-table-wrapper" style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>
                      Date
                    </th>

                    <th style={styles.th}>
                      Day
                    </th>

                    <th style={styles.th}>
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAttendance.map((record) => {
                    const date = new Date(
                      record.attendance_date
                    );

                    const status = String(
                      record.status || ""
                    ).toUpperCase();

                    const isPresent =
                      status === "PRESENT" ||
                      status === "P";

                    return (
                      <tr key={record.id}>
                        <td style={styles.td}>
                          {date.toLocaleDateString("en-IN")}
                        </td>

                        <td style={styles.td}>
                          {date.toLocaleDateString(
                            "en-IN",
                            { weekday: "long" }
                          )}
                        </td>

                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.badge,
                              ...(isPresent
                                ? styles.presentBadge
                                : styles.absentBadge),
                            }}
                          >
                            {isPresent
                              ? "✓ PRESENT"
                              : "✕ ABSENT"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section style={styles.assessmentCard}>
          <div style={styles.assessmentHeader}>
            <div className="assessment-heading-content">
              <div style={styles.assessmentBrand}>
                RACER ACADEMY
              </div>

              <h2 style={styles.assessmentTitle}>
                🏆 RACER ACADEMY TESTS ZONE
              </h2>

              <p style={styles.assessmentSubtitle}>
                Your English & Mathematics test results
              </p>
            </div>

            {assessments.length > 0 && (
              <button
                type="button"
                onClick={downloadAllResults}
                style={styles.pdfButton}
              >
                📄 Download Result PDF
              </button>
            )}
          </div>

          <div style={styles.subjectArea}>
            <div className="subject-description">
              <label style={styles.subjectLabel}>
                📚 Select Subject
              </label>

              <p style={styles.subjectHint}>
                See the tests given in each subject.
              </p>
            </div>

            <select
              value={selectedSubject}
              onChange={(e) =>
                setSelectedSubject(e.target.value)
              }
              style={styles.subjectSelect}
            >
              <option value="All">
                All Subjects
              </option>

              <option value="English">
                📚 English
              </option>

              <option value="Mathematics">
                📐 Mathematics
              </option>
            </select>
          </div>

          <div style={styles.subjectSummaryGrid}>
            <div style={styles.subjectSummary}>
              <span>
                📚 English
              </span>

              <strong>
                {
                  assessments.filter(
                    (item) =>
                      item.subject === "English"
                  ).length
                }
              </strong>

              <small>
                Tests
              </small>
            </div>

            <div style={styles.subjectSummary}>
              <span>
                📐 Mathematics
              </span>

              <strong>
                {
                  assessments.filter(
                    (item) =>
                      item.subject === "Mathematics"
                  ).length
                }
              </strong>

              <small>
                Tests
              </small>
            </div>
          </div>

          <div style={styles.assessmentStatsGrid}>
            <div style={styles.assessmentStat}>
              <span>📝</span>

              <div>
                <small>Total Tests</small>

                <strong>
                  {assessmentStats.totalTests}
                </strong>
              </div>
            </div>

            <div style={styles.assessmentStat}>
              <span>✅</span>

              <div>
                <small>Passed</small>

                <strong style={{ color: "#166534" }}>
                  {assessmentStats.passedTests}
                </strong>
              </div>
            </div>

            <div style={styles.assessmentStat}>
              <span>❌</span>

              <div>
                <small>Failed</small>

                <strong style={{ color: "#991b1b" }}>
                  {assessmentStats.failedTests}
                </strong>
              </div>
            </div>

            <div style={styles.assessmentStat}>
              <span>📈</span>

              <div>
                <small>Average</small>

                <strong>
                  {assessmentStats.averagePercentage.toFixed(1)}%
                </strong>
              </div>
            </div>
          </div>

          {assessments.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>
                🏆
              </div>

              <strong>
                No Academy Test Results Yet
              </strong>

              <p style={styles.emptySmall}>
                Your test results will appear here
                after the teacher enters your marks.
              </p>
            </div>
          ) : filteredAssessments.length === 0 ? (
            <div style={styles.empty}>
              📭 No {selectedSubject} test results available.
            </div>
          ) : (
            <div style={styles.testCards}>
              {filteredAssessments.map((item, index) => {
                const percentage = getPercentage(
                  Number(item.obtained_marks),
                  Number(item.total_marks)
                );

                const grade = getGrade(percentage);
                const passed = isPass(percentage);
                const imageUrls = getImageUrls(
                  item.test_images
                );

                const imagesOpen =
                  expandedImages === item.id;

                return (
                  <article
                    key={item.id}
                    style={styles.testCard}
                  >
                    <div style={styles.testTop}>
                      <div className="test-heading-content">
                        <span style={styles.testNumber}>
                          TEST #{index + 1}
                        </span>

                        <h3 style={styles.testName}>
                          {item.test_name}
                        </h3>

                        <div style={styles.subjectBadge}>
                          {getSubjectLabel(item.subject)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          downloadSingleResult(item)
                        }
                        style={styles.smallPdfButton}
                      >
                        📄 PDF
                      </button>
                    </div>

                    <div style={styles.testMeta}>
                      <div>
                        <small>Test Date</small>
                        <strong>
                          {formatDate(item.test_date)}
                        </strong>
                      </div>

                      <div>
                        <small>Total Marks</small>
                        <strong>
                          {item.total_marks}
                        </strong>
                      </div>

                      <div>
                        <small>Obtained</small>
                        <strong style={{ color: "#166534" }}>
                          {item.obtained_marks}
                        </strong>
                      </div>

                      <div>
                        <small>Percentage</small>
                        <strong>
                          {percentage.toFixed(1)}%
                        </strong>
                      </div>

                      <div>
                        <small>Grade</small>

                        <span
                          style={{
                            ...styles.gradeBadge,
                            background:
                              grade === "F"
                                ? "#fee2e2"
                                : "#dcfce7",
                            color:
                              grade === "F"
                                ? "#991b1b"
                                : "#166534",
                          }}
                        >
                          {grade}
                        </span>
                      </div>

                      <div>
                        <small>Result</small>

                        <span
                          style={{
                            ...styles.resultBadge,
                            background:
                              passed
                                ? "#dcfce7"
                                : "#fee2e2",
                            color:
                              passed
                                ? "#166534"
                                : "#991b1b",
                          }}
                        >
                          {passed ? "PASS" : "FAIL"}
                        </span>
                      </div>
                    </div>

                    <div style={styles.remarksBox}>
                      <strong>
                        📝 Remarks
                      </strong>

                      <p>
                        {item.remarks ||
                          "No remarks added by teacher."}
                      </p>
                    </div>

                    <div style={styles.imagesSection}>
                      <div style={styles.imagesHeader}>
                        <div className="image-heading-content">
                          <strong>
                            📸 Uploaded Test Images & Photos
                          </strong>

                          <p style={styles.imageHint}>
                            Checked test images uploaded by teacher
                          </p>
                        </div>

                        {imageUrls.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedImages(
                                imagesOpen
                                  ? null
                                  : item.id
                              )
                            }
                            style={styles.imageButton}
                          >
                            {imagesOpen
                              ? "Hide Images"
                              : `View Images (${imageUrls.length})`}
                          </button>
                        )}
                      </div>

                      {imageUrls.length === 0 ? (
                        <div style={styles.noImages}>
                          📭 No test images uploaded.

                          <span>
                            Teacher may upload them optionally.
                          </span>
                        </div>
                      ) : (
                        imagesOpen && (
                          <div style={styles.imageGrid}>
                            {imageUrls.map(
                              (url, imageIndex) => (
                                <a
                                  key={`${item.id}-${imageIndex}`}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={styles.imageLink}
                                >
                                  <img
                                    src={url}
                                    alt={`Checked test ${
                                      imageIndex + 1
                                    }`}
                                    style={styles.testImage}
                                  />

                                  <span>
                                    Image {imageIndex + 1}
                                  </span>
                                </a>
                              )
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div style={styles.gradeInfo}>
            <h3 style={styles.gradeInfoTitle}>
              🎓 Grade System
            </h3>

            <div style={styles.gradeGrid}>
              {[
                ["90–100%", "A+"],
                ["80–89%", "A"],
                ["70–79%", "B+"],
                ["60–69%", "B"],
                ["50–59%", "C"],
                ["40–49%", "D"],
                ["Below 40%", "F"],
              ].map(([range, grade]) => (
                <div
                  key={grade}
                  style={styles.gradeInfoItem}
                >
                  <strong>{range}</strong>

                  <span>
                    Grade {grade}
                  </span>

                  <small
                    style={{
                      color:
                        grade === "F"
                          ? "#991b1b"
                          : "#166534",
                      fontWeight: 800,
                    }}
                  >
                    {grade === "F" ? "FAIL" : "PASS"}
                  </small>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                💰 Fee Report
              </h2>

              <p style={styles.sectionSubtitle}>
                {months[Number(selectedMonth) - 1]}{" "}
                {selectedYear}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push("/student/fees")
              }
              style={styles.viewButton}
            >
              View Fees →
            </button>
          </div>

          <div style={styles.feeGrid}>
            <div style={styles.feeCard}>
              <div style={styles.feeIcon}>💰</div>

              <div>
                <p style={styles.feeLabel}>
                  Total
                </p>

                <h3 style={styles.feeValue}>
                  ₹{totalFee.toLocaleString("en-IN")}
                </h3>
              </div>
            </div>

            <div style={styles.feeCard}>
              <div style={styles.feeIcon}>✅</div>

              <div>
                <p style={styles.feeLabel}>
                  Paid
                </p>

                <h3 style={styles.feeValue}>
                  ₹{paidFee.toLocaleString("en-IN")}
                </h3>
              </div>
            </div>

            <div style={styles.feeCard}>
              <div style={styles.feeIcon}>⏳</div>

              <div>
                <p style={styles.feeLabel}>
                  Pending
                </p>

                <h3 style={styles.feeValue}>
                  ₹{pendingFee.toLocaleString("en-IN")}
                </h3>
              </div>
            </div>
          </div>

          {filteredFees.length === 0 ? (
            <div style={styles.empty}>
              📭 No fee records found for this month.
            </div>
          ) : (
            <div className="reports-table-wrapper" style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Month</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Payment Date</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredFees.map((fee) => {
                    const status = String(
                      fee.status || ""
                    ).toUpperCase();

                    const isPaid =
                      status === "SUBMITTED" ||
                      status === "PAID";

                    const isRefunded =
                      status === "REFUNDED";

                    return (
                      <tr key={fee.id}>
                        <td style={styles.td}>
                          {months[Number(fee.month) - 1]}{" "}
                          {fee.year}
                        </td>

                        <td style={styles.td}>
                          ₹
                          {Number(
                            fee.amount || 0
                          ).toLocaleString("en-IN")}
                        </td>

                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.badge,
                              ...(isPaid
                                ? styles.presentBadge
                                : isRefunded
                                ? styles.refundedBadge
                                : styles.pendingBadge),
                            }}
                          >
                            {fee.status}
                          </span>
                        </td>

                        <td style={styles.td}>
                          {formatDate(fee.payment_date)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>
            📊 Overall Performance
          </h2>

          <p style={styles.sectionSubtitle}>
            Your overall portal performance
          </p>

          <div style={styles.overallGrid}>
            <div style={styles.overallItem}>
              <span>
                Total Attendance Records
              </span>

              <strong>
                {attendance.length}
              </strong>
            </div>

            <div style={styles.overallItem}>
              <span>
                Total Fee Records
              </span>

              <strong>
                {fees.length}
              </strong>
            </div>

            <div style={styles.overallItem}>
              <span>
                Academy Tests
              </span>

              <strong>
                {assessments.length}
              </strong>
            </div>

            <div style={styles.overallItem}>
              <span>
                Test Average
              </span>

              <strong>
                {assessmentStats.averagePercentage.toFixed(1)}%
              </strong>
            </div>
          </div>
        </section>

        <footer style={styles.footer}>
          <strong>RACER ACADEMY</strong>

          <span>
            Student Reports • {new Date().getFullYear()}
          </span>
        </footer>
      </div>

      {/* =====================================================
          MOBILE RESPONSIVE CSS
          Only affects this Reports page.
      ===================================================== */}
      <style jsx global>{`
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
          max-width: 100%;
        }

        .reports-page table {
          max-width: 100%;
        }

        .reports-page img {
          max-width: 100%;
        }

        @media (max-width: 768px) {
          .reports-page {
            width: 100% !important;
            max-width: 100vw !important;
            overflow-x: hidden !important;
            padding: 12px 8px !important;
          }

          .reports-page > div {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
          }

          .reports-page header {
            width: 100% !important;
            padding: 16px !important;
            border-radius: 15px !important;
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .reports-header-content {
            width: 100% !important;
            min-width: 0 !important;
          }

          .reports-page h1 {
            font-size: 25px !important;
            line-height: 1.2 !important;
            overflow-wrap: anywhere !important;
          }

          .reports-page h2 {
            overflow-wrap: anywhere !important;
          }

          .reports-page p,
          .reports-page span,
          .reports-page strong,
          .reports-page small {
            overflow-wrap: anywhere;
          }

          .reports-page header > div:last-child {
            width: 100% !important;
          }

          .reports-page header > div:last-child button {
            flex: 1 1 0 !important;
            min-width: 0 !important;
          }

          .reports-page section {
            max-width: 100% !important;
            min-width: 0 !important;
          }

          .reports-page [style*="padding: 24px"] {
            padding: 16px !important;
          }

          .reports-page [style*="padding: 25px"] {
            padding: 18px !important;
          }

          .reports-page [style*="padding: 22px"] {
            padding: 16px !important;
          }

          .reports-page [style*="padding: 20px"] {
            padding: 16px !important;
          }

          .reports-page .student-info-content {
            min-width: 0 !important;
            flex: 1 1 auto !important;
          }

          .reports-page .student-info-content h2 {
            font-size: 21px !important;
            line-height: 1.25 !important;
          }

          .reports-page [style*="width: 70px"] {
            width: 55px !important;
            height: 55px !important;
            font-size: 29px !important;
          }

          .reports-page [style*="grid-template-columns: repeat(auto-fit,minmax(190px,1fr))"] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .reports-page [style*="grid-template-columns: repeat(auto-fit,minmax(200px,1fr))"] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .reports-page [style*="grid-template-columns: repeat(auto-fit,minmax(180px,1fr))"] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .reports-page [style*="grid-template-columns: repeat(auto-fit,minmax(220px,1fr))"] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .reports-page .filter-field {
            flex: 1 1 0 !important;
            min-width: 0 !important;
          }

          .reports-page .filter-field select {
            width: 100% !important;
            min-width: 0 !important;
          }

          .reports-page [style*="min-width: 150px"] {
            min-width: 0 !important;
          }

          .reports-page [style*="min-width: 200px"] {
            min-width: 0 !important;
          }

          .reports-page .reports-table-wrapper {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            overflow: hidden !important;
          }

          .reports-page .reports-table-wrapper table {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            table-layout: fixed !important;
          }

          .reports-page .reports-table-wrapper th,
          .reports-page .reports-table-wrapper td {
            min-width: 0 !important;
            width: auto !important;
            padding: 9px 6px !important;
            font-size: 11px !important;
            white-space: normal !important;
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
          }

          .reports-page .reports-table-wrapper th:nth-child(1),
          .reports-page .reports-table-wrapper td:nth-child(1) {
            width: 27% !important;
          }

          .reports-page .reports-table-wrapper th:nth-child(2),
          .reports-page .reports-table-wrapper td:nth-child(2) {
            width: 35% !important;
          }

          .reports-page .reports-table-wrapper th:nth-child(3),
          .reports-page .reports-table-wrapper td:nth-child(3) {
            width: 38% !important;
          }

          .reports-page .reports-table-wrapper th:nth-child(4),
          .reports-page .reports-table-wrapper td:nth-child(4) {
            width: 25% !important;
          }

          .reports-page .reports-table-wrapper td span {
            font-size: 9px !important;
            padding: 5px 6px !important;
          }

          .reports-page [style*="grid-template-columns: repeat(auto-fit,minmax(130px,1fr))"] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .reports-page .assessment-heading-content,
          .reports-page .subject-description,
          .reports-page .test-heading-content,
          .reports-page .image-heading-content {
            min-width: 0 !important;
            width: 100% !important;
          }

          .reports-page .assessment-heading-content h2 {
            font-size: 20px !important;
            line-height: 1.25 !important;
          }

          .reports-page .assessmentHeader,
          .reports-page [style*="justify-content: space-between"] {
            min-width: 0 !important;
          }

          .reports-page [style*="min-width: 200px"] {
            width: 100% !important;
          }

          .reports-page .subjectArea select,
          .reports-page select[style*="min-width: 200px"] {
            width: 100% !important;
            min-width: 0 !important;
          }

          .reports-page [style*="grid-template-columns: repeat(6, 1fr)"] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .reports-page [style*="grid-template-columns: repeat(4, 1fr)"] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .reports-page [style*="grid-template-columns: 1fr auto"] {
            grid-template-columns: minmax(0, 1fr) auto !important;
          }

          .reports-page [style*="height: 180px"] {
            height: 145px !important;
          }

          .reports-page .imageGrid {
            width: 100% !important;
          }

          .reports-page a {
            min-width: 0 !important;
            max-width: 100% !important;
          }

          .reports-page a img {
            width: 100% !important;
            max-width: 100% !important;
          }

          .reports-page .pdfButton,
          .reports-page button {
            max-width: 100% !important;
            overflow-wrap: anywhere !important;
          }

          .reports-page footer {
            width: 100% !important;
            padding-bottom: 15px !important;
          }
        }

        @media (max-width: 480px) {
          .reports-page {
            padding: 8px 6px !important;
          }

          .reports-page header {
            padding: 13px !important;
          }

          .reports-page section {
            border-radius: 15px !important;
          }

          .reports-page .student-info-content h2 {
            font-size: 18px !important;
          }

          .reports-page .student-info-content p {
            font-size: 11px !important;
          }

          .reports-page [style*="width: 70px"] {
            width: 48px !important;
            height: 48px !important;
            border-radius: 14px !important;
            font-size: 25px !important;
          }

          .reports-page [style*="grid-template-columns: repeat(auto-fit,minmax(190px,1fr))"],
          .reports-page [style*="grid-template-columns: repeat(auto-fit,minmax(200px,1fr))"],
          .reports-page [style*="grid-template-columns: repeat(auto-fit,minmax(180px,1fr))"],
          .reports-page [style*="grid-template-columns: repeat(auto-fit,minmax(220px,1fr))"] {
            grid-template-columns: 1fr !important;
          }

          .reports-page [style*="grid-template-columns: repeat(auto-fit,minmax(130px,1fr))"] {
            grid-template-columns: 1fr 1fr !important;
          }

          .reports-page .filterGrid {
            width: 100% !important;
          }

          .reports-page .filter-field {
            width: 100% !important;
            flex: 1 1 100% !important;
          }

          .reports-page .reports-table-wrapper th,
          .reports-page .reports-table-wrapper td {
            padding: 8px 4px !important;
            font-size: 10px !important;
          }

          .reports-page .reports-table-wrapper td span {
            font-size: 8px !important;
            padding: 4px 5px !important;
          }

          .reports-page [style*="grid-template-columns: repeat(6, 1fr)"] {
            grid-template-columns: 1fr 1fr !important;
          }

          .reports-page .testTop {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .reports-page .testTop button {
            width: 100% !important;
          }

          .reports-page .imagesHeader {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .reports-page .imagesHeader button {
            width: 100% !important;
          }

          .reports-page [style*="grid-template-columns: repeat(auto-fit,minmax(130px,1fr))"] {
            gap: 7px !important;
          }

          .reports-page .gradeInfoItem {
            padding: 9px !important;
            font-size: 10px !important;
          }

          .reports-page .overallItem {
            font-size: 11px !important;
            padding: 12px !important;
          }

          .reports-page .overallItem strong {
            font-size: 15px !important;
          }

          .reports-page footer {
            font-size: 10px !important;
          }
        }

        @media (max-width: 360px) {
          .reports-page {
            padding: 6px 4px !important;
          }

          .reports-page header {
            padding: 11px !important;
          }

          .reports-page h1 {
            font-size: 22px !important;
          }

          .reports-page .reports-table-wrapper th,
          .reports-page .reports-table-wrapper td {
            font-size: 9px !important;
            padding: 6px 3px !important;
          }

          .reports-page .reports-table-wrapper td span {
            font-size: 7px !important;
          }

          .reports-page .student-info-content h2 {
            font-size: 16px !important;
          }

          .reports-page [style*="width: 70px"] {
            width: 42px !important;
            height: 42px !important;
            font-size: 22px !important;
          }
        }
      `}</style>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#eef2ff,#f8fafc,#eff6ff)",
    padding: "20px 15px",
    boxSizing: "border-box",
    fontFamily: "Arial, Helvetica, sans-serif",
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
    boxShadow: "0 8px 25px rgba(15,23,42,0.08)",
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
    background: "rgba(255,255,255,0.16)",
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
    boxShadow: "0 8px 25px rgba(15,23,42,0.07)",
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

  card: {
    background: "white",
    borderRadius: "20px",
    padding: "24px",
    marginBottom: "20px",
    boxShadow: "0 8px 25px rgba(15,23,42,0.07)",
    minWidth: 0,
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "20px",
    flexWrap: "wrap",
    minWidth: 0,
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(190px,1fr))",
    gap: "15px",
  },

  statCard: {
    color: "white",
    borderRadius: "17px",
    padding: "18px",
    display: "flex",
    alignItems: "center",
    gap: "13px",
    minWidth: 0,
  },

  statIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "14px",
    background: "rgba(255,255,255,0.16)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
    flexShrink: 0,
  },

  statLabel: {
    margin: 0,
    fontSize: "12px",
    opacity: 0.85,
  },

  statValue: {
    margin: "4px 0 0",
    fontSize: "24px",
    fontWeight: "800",
  },

  progressBox: {
    marginTop: "22px",
    padding: "18px",
    background: "#f8fafc",
    borderRadius: "15px",
    border: "1px solid #e2e8f0",
    minWidth: 0,
  },

  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    color: "#334155",
    fontSize: "14px",
    marginBottom: "10px",
    flexWrap: "wrap",
  },

  progressBackground: {
    width: "100%",
    height: "14px",
    background: "#e2e8f0",
    borderRadius: "999px",
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    background:
      "linear-gradient(90deg,#2563eb,#7c3aed)",
    borderRadius: "999px",
    transition: "width 0.4s ease",
  },

  progressText: {
    margin: "10px 0 0",
    color: "#64748b",
    fontSize: "12px",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
    marginTop: "20px",
    minWidth: 0,
  },

  table: {
    width: "100%",
    minWidth: "600px",
    borderCollapse: "collapse",
  },

  th: {
    background: "#eff6ff",
    color: "#1e3a8a",
    padding: "13px",
    textAlign: "left",
    borderBottom: "2px solid #dbeafe",
    fontSize: "13px",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "13px",
    borderBottom: "1px solid #e2e8f0",
    color: "#334155",
    fontSize: "14px",
  },

  badge: {
    display: "inline-block",
    padding: "7px 11px",
    borderRadius: "999px",
    fontWeight: "800",
    fontSize: "11px",
    maxWidth: "100%",
  },

  presentBadge: {
    background: "#dcfce7",
    color: "#166534",
  },

  absentBadge: {
    background: "#fee2e2",
    color: "#991b1b",
  },

  pendingBadge: {
    background: "#fef3c7",
    color: "#92400e",
  },

  refundedBadge: {
    background: "#ede9fe",
    color: "#5b21b6",
  },

  assessmentCard: {
    background: "white",
    borderRadius: "22px",
    padding: "24px",
    marginBottom: "20px",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.10)",
    border: "1px solid #ddd6fe",
    minWidth: 0,
  },

  assessmentHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
    paddingBottom: "20px",
    borderBottom: "1px solid #e2e8f0",
    minWidth: 0,
  },

  assessmentBrand: {
    color: "#7c3aed",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "3px",
  },

  assessmentTitle: {
    margin: "5px 0 0",
    color: "#172554",
    fontSize: "24px",
    fontWeight: "900",
  },

  assessmentSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  pdfButton: {
    border: "none",
    background:
      "linear-gradient(135deg,#dc2626,#ef4444)",
    color: "white",
    padding: "12px 17px",
    borderRadius: "11px",
    fontWeight: "800",
    cursor: "pointer",
    boxShadow:
      "0 7px 18px rgba(220,38,38,0.18)",
  },

  smallPdfButton: {
    border: "none",
    background: "#1e3a8a",
    color: "white",
    padding: "9px 13px",
    borderRadius: "9px",
    fontWeight: "800",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  subjectArea: {
    marginTop: "20px",
    padding: "18px",
    background:
      "linear-gradient(135deg,#f5f3ff,#eff6ff)",
    border: "1px solid #ddd6fe",
    borderRadius: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    flexWrap: "wrap",
    minWidth: 0,
  },

  subjectLabel: {
    display: "block",
    color: "#312e81",
    fontSize: "15px",
    fontWeight: "900",
  },

  subjectHint: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "12px",
  },

  subjectSelect: {
    minWidth: "200px",
    padding: "12px 14px",
    border: "1px solid #c4b5fd",
    borderRadius: "10px",
    background: "white",
    color: "#172554",
    fontWeight: "800",
    fontSize: "14px",
    cursor: "pointer",
  },

  subjectSummaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(200px,1fr))",
    gap: "12px",
    marginTop: "15px",
  },

  subjectSummary: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "13px",
    padding: "15px",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "center",
    gap: "4px 10px",
    minWidth: 0,
  },

  assessmentStatsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(180px,1fr))",
    gap: "12px",
    marginTop: "15px",
  },

  assessmentStat: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minWidth: 0,
  },

  testCards: {
    display: "grid",
    gap: "18px",
    marginTop: "20px",
    minWidth: 0,
  },

  testCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "20px",
    background: "#ffffff",
    boxShadow:
      "0 5px 18px rgba(15,23,42,0.05)",
    minWidth: 0,
  },

  testTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
    flexWrap: "wrap",
    paddingBottom: "15px",
    borderBottom: "1px solid #e2e8f0",
    minWidth: 0,
  },

  testNumber: {
    display: "inline-block",
    color: "#7c3aed",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "2px",
  },

  testName: {
    margin: "5px 0 8px",
    color: "#172554",
    fontSize: "20px",
    fontWeight: "900",
    overflowWrap: "anywhere",
  },

  subjectBadge: {
    display: "inline-block",
    background: "#eff6ff",
    color: "#1e3a8a",
    border: "1px solid #bfdbfe",
    padding: "7px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "800",
    maxWidth: "100%",
  },

  testMeta: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(130px,1fr))",
    gap: "10px",
    marginTop: "15px",
    minWidth: 0,
  },

  remarksBox: {
    marginTop: "15px",
    padding: "14px",
    borderRadius: "12px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    overflowWrap: "anywhere",
  },

  imagesSection: {
    marginTop: "15px",
    padding: "15px",
    borderRadius: "13px",
    background:
      "linear-gradient(135deg,#fff7ed,#f8fafc)",
    border: "1px solid #fed7aa",
    minWidth: 0,
  },

  imagesHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    minWidth: 0,
  },

  imageHint: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "11px",
  },

  imageButton: {
    border: "none",
    background: "#ea580c",
    color: "white",
    padding: "9px 13px",
    borderRadius: "9px",
    fontWeight: "800",
    cursor: "pointer",
  },

  noImages: {
    marginTop: "12px",
    padding: "12px",
    borderRadius: "10px",
    background: "white",
    color: "#64748b",
    fontSize: "12px",
    overflowWrap: "anywhere",
  },

  imageGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fill,minmax(180px,1fr))",
    gap: "12px",
    marginTop: "15px",
    minWidth: 0,
  },

  imageLink: {
    display: "block",
    textDecoration: "none",
    color: "#1e3a8a",
    fontSize: "11px",
    fontWeight: "800",
    minWidth: 0,
    maxWidth: "100%",
  },

  testImage: {
    width: "100%",
    height: "180px",
    objectFit: "cover",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    display: "block",
    marginBottom: "6px",
    background: "#f1f5f9",
    maxWidth: "100%",
  },

  gradeBadge: {
    display: "inline-block",
    minWidth: "38px",
    textAlign: "center",
    padding: "7px 9px",
    borderRadius: "8px",
    fontWeight: "900",
    fontSize: "12px",
  },

  resultBadge: {
    display: "inline-block",
    padding: "7px 10px",
    borderRadius: "999px",
    fontWeight: "900",
    fontSize: "11px",
  },

  gradeInfo: {
    marginTop: "20px",
    background:
      "linear-gradient(135deg,#f5f3ff,#eff6ff)",
    border: "1px solid #ddd6fe",
    borderRadius: "15px",
    padding: "18px",
    minWidth: 0,
  },

  gradeInfoTitle: {
    margin: 0,
    color: "#312e81",
    fontSize: "17px",
    fontWeight: "800",
  },

  gradeGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(130px,1fr))",
    gap: "10px",
    marginTop: "14px",
  },

  gradeInfoItem: {
    background: "white",
    borderRadius: "10px",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontSize: "12px",
    color: "#475569",
    minWidth: 0,
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

  empty: {
    textAlign: "center",
    padding: "35px 15px",
    color: "#64748b",
    background: "#f8fafc",
    borderRadius: "12px",
    marginTop: "20px",
    overflowWrap: "anywhere",
  },

  feeGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(200px,1fr))",
    gap: "15px",
    marginBottom: "10px",
  },

  feeCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "15px",
    padding: "18px",
    display: "flex",
    alignItems: "center",
    gap: "13px",
    minWidth: 0,
  },

  feeIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "14px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
    flexShrink: 0,
  },

  feeLabel: {
    margin: 0,
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "700",
  },

  feeValue: {
    margin: "4px 0 0",
    color: "#172554",
    fontSize: "22px",
    overflowWrap: "anywhere",
  },

  viewButton: {
    border: "none",
    background: "#2563eb",
    color: "white",
    padding: "10px 15px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },

  overallGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: "12px",
    marginTop: "20px",
  },

  overallItem: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    color: "#475569",
    fontSize: "13px",
    minWidth: 0,
    overflowWrap: "anywhere",
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