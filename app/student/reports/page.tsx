"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

function getPercentage(obtained: number, total: number) {
  if (!total || total <= 0) return 0;
  return (obtained / total) * 100;
}

function getGrade(percentage: number) {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
}

function isPass(percentage: number) {
  return percentage >= 40;
}

function getSubjectLabel(subject?: string | null) {
  if (subject === "Mathematics") return "📐 Mathematics";
  if (subject === "English") return "📚 English";
  return "📖 Subject Not Specified";
}

function getImageUrls(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;

        if (
          typeof item === "object" &&
          item !== null &&
          "url" in item
        ) {
          const url = (item as { url?: unknown }).url;
          return typeof url === "string" ? url : "";
        }

        if (
          typeof item === "object" &&
          item !== null &&
          "path" in item
        ) {
          const path = (item as { path?: unknown }).path;
          return typeof path === "string" ? path : "";
        }

        return "";
      })
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is string =>
            typeof item === "string"
        );
      }
    } catch {
      // Not JSON. Continue below.
    }

    return [trimmed];
  }

  return [];
}

function formatDate(dateString: string) {
  if (!dateString) return "—";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function createPdfWindow(
  student: Student,
  assessments: AssessmentRow[],
  selectedSubject: string
) {
  const printableAssessments =
    selectedSubject === "All"
      ? assessments
      : assessments.filter(
          (item) =>
            (item.subject || "Not Specified") ===
            selectedSubject
        );

  if (printableAssessments.length === 0) {
    alert("No test results available for PDF.");
    return;
  }

  const rows = printableAssessments
    .map((item, index) => {
      const percentage = getPercentage(
        Number(item.obtained_marks),
        Number(item.total_marks)
      );

      const grade = getGrade(percentage);
      const passed = isPass(percentage);

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${item.subject || "—"}</td>
          <td>${item.test_name || "—"}</td>
          <td>${formatDate(item.test_date)}</td>
          <td>${item.total_marks}</td>
          <td>${item.obtained_marks}</td>
          <td>${percentage.toFixed(1)}%</td>
          <td>${grade}</td>
          <td>${passed ? "PASS" : "FAIL"}</td>
          <td>${item.remarks || "—"}</td>
        </tr>
      `;
    })
    .join("");

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

  const popup = window.open("", "_blank");

  if (!popup) {
    alert(
      "Please allow pop-ups for downloading the Result PDF."
    );
    return;
  }

  popup.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>RACER ACADEMY Result - ${
          student.student_name || student.student_username
        }</title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 30px;
            font-family: Arial, Helvetica, sans-serif;
            color: #172554;
            background: white;
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

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }

          th {
            background: #eff6ff;
            color: #1e3a8a;
            padding: 9px;
            border: 1px solid #cbd5e1;
            text-align: left;
          }

          td {
            padding: 9px;
            border: 1px solid #cbd5e1;
            color: #334155;
          }

          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 11px;
            color: #64748b;
          }

          @media print {
            body {
              padding: 10px;
            }

            .no-print {
              display: none;
            }
          }
        </style>
      </head>

      <body>
        <div class="header">
          <div class="brand">RACER ACADEMY</div>

          <h1>🏆 Academy Test Result</h1>

          <div class="student">
            <strong>
              ${student.student_name || "Student"}
            </strong>
            <br />
            Username: ${student.student_username}
            <br />
            Subject: ${
              selectedSubject === "All"
                ? "All Subjects"
                : selectedSubject
            }
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

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Subject</th>
              <th>Test</th>
              <th>Date</th>
              <th>Total</th>
              <th>Obtained</th>
              <th>%</th>
              <th>Grade</th>
              <th>Result</th>
              <th>Remarks</th>
            </tr>
          </thead>

          <tbody>
            ${rows}
          </tbody>
        </table>

        <div class="footer">
          RACER ACADEMY • Student Result Report
        </div>

        <script>
          window.onload = function () {
            setTimeout(function () {
              window.print();
            }, 500);
          };
        </script>
      </body>
    </html>
  `);

  popup.document.close();
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

  const [expandedImages, setExpandedImages] =
    useState<number | null>(null);

  useEffect(() => {
    loadReport();
  }, []);

  async function loadReport() {
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
          const parsed =
            JSON.parse(storedStudent);

          username =
            parsed.student_username ||
            parsed.username ||
            "";
        } catch {
          // Ignore invalid stored data.
        }
      }

      if (!username) {
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

      setStudent(studentData);

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
          studentData.id
        )
        .order("attendance_date", {
          ascending: false,
        });

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
          "id, student_id, month, year, amount, status, payment_date"
        )
        .eq(
          "student_id",
          studentData.id
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
          studentData.id
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
        attendanceData || []
      );

      setFees(
        feesData || []
      );

      setAssessments(
        (assessmentData || []) as AssessmentRow[]
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    }

    setLoading(false);
  }

  function logout() {
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

    localStorage.removeItem(
      "student"
    );

    sessionStorage.clear();

    router.push("/");
  }

  const filteredAttendance =
    useMemo(() => {
      return attendance.filter(
        (record) => {
          const date = new Date(
            record.attendance_date
          );

          return (
            date.getMonth() + 1 ===
              Number(selectedMonth) &&
            date.getFullYear() ===
              Number(selectedYear)
          );
        }
      );
    }, [
      attendance,
      selectedMonth,
      selectedYear,
    ]);

  const presentCount =
    filteredAttendance.filter(
      (record) => {
        const status =
          record.status.toUpperCase();

        return (
          status === "PRESENT" ||
          status === "P"
        );
      }
    ).length;

  const absentCount =
    filteredAttendance.filter(
      (record) => {
        const status =
          record.status.toUpperCase();

        return (
          status === "ABSENT" ||
          status === "A"
        );
      }
    ).length;

  const totalClasses =
    presentCount + absentCount;

  const attendancePercentage =
    totalClasses > 0
      ? (presentCount /
          totalClasses) *
        100
      : 0;

  const filteredFees =
    fees.filter(
      (fee) =>
        fee.month ===
          Number(selectedMonth) &&
        fee.year ===
          Number(selectedYear)
    );

  const totalFee =
    filteredFees.reduce(
      (sum, fee) =>
        sum +
        Number(fee.amount || 0),
      0
    );

  const paidFee =
    filteredFees
      .filter((fee) => {
        const status =
          fee.status.toUpperCase();

        return (
          status === "SUBMITTED" ||
          status === "PAID"
        );
      })
      .reduce(
        (sum, fee) =>
          sum +
          Number(fee.amount || 0),
        0
      );

  const pendingFee =
    filteredFees
      .filter(
        (fee) =>
          fee.status.toUpperCase() ===
          "PENDING"
      )
      .reduce(
        (sum, fee) =>
          sum +
          Number(fee.amount || 0),
        0
      );

  const availableSubjects =
    useMemo(() => {
      const subjects =
        assessments
          .map(
            (item) =>
              item.subject
          )
          .filter(
            (
              subject
            ): subject is string =>
              subject ===
                "English" ||
              subject ===
                "Mathematics"
          );

      return Array.from(
        new Set(subjects)
      );
    }, [assessments]);

  const filteredAssessments =
    useMemo(() => {
      if (
        selectedSubject ===
        "All"
      ) {
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
        totalTests -
        passedTests;

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

  function downloadAllResults() {
    if (!student) return;

    createPdfWindow(
      student,
      assessments,
      selectedSubject
    );
  }

  function downloadSingleResult(
    assessment: AssessmentRow
  ) {
    if (!student) return;

    createPdfWindow(
      student,
      [assessment],
      assessment.subject ||
        "All"
    );
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          📊 Loading Student Reports...
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}

        <header style={styles.header}>
          <div>
            <div style={styles.smallTitle}>
              RACER ACADEMY
            </div>

            <h1 style={styles.title}>
              📊 My Reports
            </h1>

            <p style={styles.subtitle}>
              Attendance, fees and academy
              assessment reports
            </p>
          </div>

          <div style={styles.headerButtons}>
            <button
              onClick={() =>
                router.push(
                  "/student/dashboard"
                )
              }
              style={
                styles.dashboardButton
              }
            >
              ← Dashboard
            </button>

            <button
              onClick={logout}
              style={
                styles.logoutButton
              }
            >
              🚪 Logout
            </button>
          </div>
        </header>

        {/* STUDENT INFO */}

        <section style={styles.studentCard}>
          <div style={styles.studentIcon}>
            👨‍🎓
          </div>

          <div>
            <p style={styles.infoLabel}>
              STUDENT
            </p>

            <h2 style={styles.studentName}>
              {student?.student_name ||
                student?.student_username ||
                "Student"}
            </h2>

            <p style={styles.username}>
              Username:{" "}
              {
                student?.student_username
              }
            </p>
          </div>
        </section>

        {/* FILTER */}

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
            <div>
              <label style={styles.label}>
                Month
              </label>

              <select
                value={
                  selectedMonth
                }
                onChange={(e) =>
                  setSelectedMonth(
                    e.target.value
                  )
                }
                style={styles.input}
              >
                {months.map(
                  (
                    month,
                    index
                  ) => (
                    <option
                      key={month}
                      value={
                        index + 1
                      }
                    >
                      {month}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label style={styles.label}>
                Year
              </label>

              <select
                value={
                  selectedYear
                }
                onChange={(e) =>
                  setSelectedYear(
                    e.target.value
                  )
                }
                style={styles.input}
              >
                {[
                  2025,
                  2026,
                  2027,
                ].map(
                  (year) => (
                    <option
                      key={year}
                      value={year}
                    >
                      {year}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        </section>

        {error && (
          <div style={styles.error}>
            ❌ {error}
          </div>
        )}

        {/* ATTENDANCE */}

        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h2
                style={
                  styles.sectionTitle
                }
              >
                📝 Attendance Report
              </h2>

              <p
                style={
                  styles.sectionSubtitle
                }
              >
                {
                  months[
                    Number(
                      selectedMonth
                    ) - 1
                  ]
                }{" "}
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
                  {attendancePercentage.toFixed(
                    1
                  )}
                  %
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
                {attendancePercentage.toFixed(
                  1
                )}
                %
              </strong>
            </div>

            <div
              style={
                styles.progressBackground
              }
            >
              <div
                style={{
                  ...styles.progressBar,
                  width: `${Math.min(
                    attendancePercentage,
                    100
                  )}%`,
                }}
              />
            </div>

            <p style={styles.progressText}>
              {attendancePercentage >=
              75
                ? "🎉 Good attendance! Keep it up."
                : attendancePercentage >
                  0
                ? "⚠️ Attendance is below 75%."
                : "No attendance records for this month."}
            </p>
          </div>

          {filteredAttendance.length ===
          0 ? (
            <div style={styles.empty}>
              📭 No attendance records
              found for this month.
            </div>
          ) : (
            <div
              style={
                styles.tableWrapper
              }
            >
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
                  {filteredAttendance.map(
                    (record) => {
                      const date =
                        new Date(
                          record.attendance_date
                        );

                      const status =
                        record.status.toUpperCase();

                      return (
                        <tr
                          key={
                            record.id
                          }
                        >
                          <td style={styles.td}>
                            {date.toLocaleDateString(
                              "en-IN"
                            )}
                          </td>

                          <td style={styles.td}>
                            {date.toLocaleDateString(
                              "en-IN",
                              {
                                weekday:
                                  "long",
                              }
                            )}
                          </td>

                          <td style={styles.td}>
                            <span
                              style={{
                                ...styles.badge,
                                ...(status ===
                                "PRESENT"
                                  ? styles.presentBadge
                                  : styles.absentBadge),
                              }}
                            >
                              {status ===
                              "PRESENT"
                                ? "✓ PRESENT"
                                : "✕ ABSENT"}
                            </span>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* RACER ACADEMY TESTS ZONE */}

        <section
          style={
            styles.assessmentCard
          }
        >
          <div
            style={
              styles.assessmentHeader
            }
          >
            <div>
              <div
                style={
                  styles.assessmentBrand
                }
              >
                RACER ACADEMY
              </div>

              <h2
                style={
                  styles.assessmentTitle
                }
              >
                🏆 RACER ACADEMY TESTS ZONE
              </h2>

              <p
                style={
                  styles.assessmentSubtitle
                }
              >
                Your English & Mathematics
                test results
              </p>
            </div>

            {assessments.length > 0 && (
              <button
                onClick={
                  downloadAllResults
                }
                style={
                  styles.pdfButton
                }
              >
                📄 Download Result PDF
              </button>
            )}
          </div>

          {/* SUBJECT SELECTOR */}

          <div style={styles.subjectArea}>
            <div>
              <label
                style={
                  styles.subjectLabel
                }
              >
                📚 Select Subject
              </label>

              <p
                style={
                  styles.subjectHint
                }
              >
                See the tests given in each
                subject.
              </p>
            </div>

            <select
              value={
                selectedSubject
              }
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

              <option value="English">
                📚 English
              </option>

              <option value="Mathematics">
                📐 Mathematics
              </option>
            </select>
          </div>

          {/* SUBJECT SUMMARY */}

          <div
            style={
              styles.subjectSummaryGrid
            }
          >
            <div
              style={
                styles.subjectSummary
              }
            >
              <span>📚 English</span>

              <strong>
                {
                  assessments.filter(
                    (item) =>
                      item.subject ===
                      "English"
                  ).length
                }
              </strong>

              <small>
                Tests
              </small>
            </div>

            <div
              style={
                styles.subjectSummary
              }
            >
              <span>📐 Mathematics</span>

              <strong>
                {
                  assessments.filter(
                    (item) =>
                      item.subject ===
                      "Mathematics"
                  ).length
                }
              </strong>

              <small>
                Tests
              </small>
            </div>
          </div>

          {/* TEST STATS */}

          <div
            style={
              styles.assessmentStatsGrid
            }
          >
            <div
              style={
                styles.assessmentStat
              }
            >
              <span>📝</span>

              <div>
                <small>
                  Total Tests
                </small>

                <strong>
                  {
                    assessmentStats.totalTests
                  }
                </strong>
              </div>
            </div>

            <div
              style={
                styles.assessmentStat
              }
            >
              <span>✅</span>

              <div>
                <small>
                  Passed
                </small>

                <strong
                  style={{
                    color:
                      "#166534",
                  }}
                >
                  {
                    assessmentStats.passedTests
                  }
                </strong>
              </div>
            </div>

            <div
              style={
                styles.assessmentStat
              }
            >
              <span>❌</span>

              <div>
                <small>
                  Failed
                </small>

                <strong
                  style={{
                    color:
                      "#991b1b",
                  }}
                >
                  {
                    assessmentStats.failedTests
                  }
                </strong>
              </div>
            </div>

            <div
              style={
                styles.assessmentStat
              }
            >
              <span>📈</span>

              <div>
                <small>
                  Average
                </small>

                <strong>
                  {assessmentStats.averagePercentage.toFixed(
                    1
                  )}
                  %
                </strong>
              </div>
            </div>
          </div>

          {/* RESULTS */}

          {assessments.length ===
          0 ? (
            <div style={styles.empty}>
              <div
                style={
                  styles.emptyIcon
                }
              >
                🏆
              </div>

              <strong>
                No Academy Test Results Yet
              </strong>

              <p
                style={
                  styles.emptySmall
                }
              >
                Your test results will appear
                here after the teacher enters
                your marks.
              </p>
            </div>
          ) : filteredAssessments.length ===
            0 ? (
            <div style={styles.empty}>
              📭 No{" "}
              {selectedSubject} test results
              available.
            </div>
          ) : (
            <div
              style={
                styles.testCards
              }
            >
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

                  const imagesOpen =
                    expandedImages ===
                    item.id;

                  return (
                    <article
                      key={
                        item.id
                      }
                      style={
                        styles.testCard
                      }
                    >
                      <div
                        style={
                          styles.testTop
                        }
                      >
                        <div>
                          <span
                            style={
                              styles.testNumber
                            }
                          >
                            TEST #{index + 1}
                          </span>

                          <h3
                            style={
                              styles.testName
                            }
                          >
                            {
                              item.test_name
                            }
                          </h3>

                          <div
                            style={
                              styles.subjectBadge
                            }
                          >
                            {getSubjectLabel(
                              item.subject
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            downloadSingleResult(
                              item
                            )
                          }
                          style={
                            styles.smallPdfButton
                          }
                        >
                          📄 PDF
                        </button>
                      </div>

                      <div
                        style={
                          styles.testMeta
                        }
                      >
                        <div>
                          <small>
                            Test Date
                          </small>

                          <strong>
                            {formatDate(
                              item.test_date
                            )}
                          </strong>
                        </div>

                        <div>
                          <small>
                            Total Marks
                          </small>

                          <strong>
                            {
                              item.total_marks
                            }
                          </strong>
                        </div>

                        <div>
                          <small>
                            Obtained
                          </small>

                          <strong
                            style={{
                              color:
                                "#166534",
                            }}
                          >
                            {
                              item.obtained_marks
                            }
                          </strong>
                        </div>

                        <div>
                          <small>
                            Percentage
                          </small>

                          <strong>
                            {percentage.toFixed(
                              1
                            )}
                            %
                          </strong>
                        </div>

                        <div>
                          <small>
                            Grade
                          </small>

                          <span
                            style={{
                              ...styles.gradeBadge,
                              background:
                                grade ===
                                "F"
                                  ? "#fee2e2"
                                  : "#dcfce7",
                              color:
                                grade ===
                                "F"
                                  ? "#991b1b"
                                  : "#166534",
                            }}
                          >
                            {grade}
                          </span>
                        </div>

                        <div>
                          <small>
                            Result
                          </small>

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
                            {passed
                              ? "PASS"
                              : "FAIL"}
                          </span>
                        </div>
                      </div>

                      <div
                        style={
                          styles.remarksBox
                        }
                      >
                        <strong>
                          📝 Remarks
                        </strong>

                        <p>
                          {item.remarks ||
                            "No remarks added by teacher."}
                        </p>
                      </div>

                      {/* OPTIONAL UPLOADED TEST IMAGES */}

                      <div
                        style={
                          styles.imagesSection
                        }
                      >
                        <div
                          style={
                            styles.imagesHeader
                          }
                        >
                          <div>
                            <strong>
                              📸 Uploaded Test
                              Images & Photos
                            </strong>

                            <p
                              style={
                                styles.imageHint
                              }
                            >
                              Checked test
                              images uploaded
                              by teacher
                            </p>
                          </div>

                          {imageUrls.length >
                            0 && (
                            <button
                              onClick={() =>
                                setExpandedImages(
                                  imagesOpen
                                    ? null
                                    : item.id
                                )
                              }
                              style={
                                styles.imageButton
                              }
                            >
                              {imagesOpen
                                ? "Hide Images"
                                : `View Images (${imageUrls.length})`}
                            </button>
                          )}
                        </div>

                        {imageUrls.length ===
                        0 ? (
                          <div
                            style={
                              styles.noImages
                            }
                          >
                            📭 No test images
                            uploaded.
                            <span>
                              Teacher may
                              upload them
                              optionally.
                            </span>
                          </div>
                        ) : (
                          imagesOpen && (
                            <div
                              style={
                                styles.imageGrid
                              }
                            >
                              {imageUrls.map(
                                (
                                  url,
                                  imageIndex
                                ) => (
                                  <a
                                    key={`${item.id}-${imageIndex}`}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={
                                      styles.imageLink
                                    }
                                  >
                                    <img
                                      src={url}
                                      alt={`Checked test ${
                                        imageIndex +
                                        1
                                      }`}
                                      style={
                                        styles.testImage
                                      }
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
                    </article>
                  );
                }
              )}
            </div>
          )}

          {/* GRADE SYSTEM */}

          <div
            style={
              styles.gradeInfo
            }
          >
            <h3
              style={
                styles.gradeInfoTitle
              }
            >
              🎓 Grade System
            </h3>

            <div
              style={
                styles.gradeGrid
              }
            >
              {[
                ["90–100%", "A+"],
                ["80–89%", "A"],
                ["70–79%", "B+"],
                ["60–69%", "B"],
                ["50–59%", "C"],
                ["40–49%", "D"],
                ["Below 40%", "F"],
              ].map(
                (item) => (
                  <div
                    key={
                      item[1]
                    }
                    style={
                      styles.gradeInfoItem
                    }
                  >
                    <strong>
                      {item[0]}
                    </strong>

                    <span>
                      Grade{" "}
                      {item[1]}
                    </span>

                    <small
                      style={{
                        color:
                          item[1] ===
                          "F"
                            ? "#991b1b"
                            : "#166534",
                        fontWeight:
                          800,
                      }}
                    >
                      {item[1] ===
                      "F"
                        ? "FAIL"
                        : "PASS"}
                    </small>
                  </div>
                )
              )}
            </div>
          </div>
        </section>

        {/* FEES */}

        <section style={styles.card}>
          <div
            style={
              styles.sectionHeader
            }
          >
            <div>
              <h2
                style={
                  styles.sectionTitle
                }
              >
                💰 Fee Report
              </h2>

              <p
                style={
                  styles.sectionSubtitle
                }
              >
                {
                  months[
                    Number(
                      selectedMonth
                    ) - 1
                  ]
                }{" "}
                {selectedYear}
              </p>
            </div>

            <button
              onClick={() =>
                router.push(
                  "/student/fees"
                )
              }
              style={
                styles.viewButton
              }
            >
              View Fees →
            </button>
          </div>

          <div style={styles.feeGrid}>
            <div style={styles.feeCard}>
              <div style={styles.feeIcon}>
                💰
              </div>

              <div>
                <p style={styles.feeLabel}>
                  Total
                </p>

                <h3 style={styles.feeValue}>
                  ₹
                  {totalFee.toLocaleString(
                    "en-IN"
                  )}
                </h3>
              </div>
            </div>

            <div style={styles.feeCard}>
              <div style={styles.feeIcon}>
                ✅
              </div>

              <div>
                <p style={styles.feeLabel}>
                  Paid
                </p>

                <h3 style={styles.feeValue}>
                  ₹
                  {paidFee.toLocaleString(
                    "en-IN"
                  )}
                </h3>
              </div>
            </div>

            <div style={styles.feeCard}>
              <div style={styles.feeIcon}>
                ⏳
              </div>

              <div>
                <p style={styles.feeLabel}>
                  Pending
                </p>

                <h3 style={styles.feeValue}>
                  ₹
                  {pendingFee.toLocaleString(
                    "en-IN"
                  )}
                </h3>
              </div>
            </div>
          </div>

          {filteredFees.length ===
          0 ? (
            <div style={styles.empty}>
              📭 No fee records found
              for this month.
            </div>
          ) : (
            <div
              style={
                styles.tableWrapper
              }
            >
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>
                      Month
                    </th>

                    <th style={styles.th}>
                      Amount
                    </th>

                    <th style={styles.th}>
                      Status
                    </th>

                    <th style={styles.th}>
                      Payment Date
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredFees.map(
                    (fee) => (
                      <tr
                        key={
                          fee.id
                        }
                      >
                        <td style={styles.td}>
                          {
                            months[
                              fee.month -
                                1
                            ]
                          }{" "}
                          {
                            fee.year
                          }
                        </td>

                        <td style={styles.td}>
                          ₹
                          {Number(
                            fee.amount
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </td>

                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.badge,
                              ...(fee.status.toUpperCase() ===
                                "SUBMITTED" ||
                              fee.status.toUpperCase() ===
                                "PAID"
                                ? styles.presentBadge
                                : fee.status.toUpperCase() ===
                                  "REFUNDED"
                                ? styles.refundedBadge
                                : styles.pendingBadge),
                            }}
                          >
                            {
                              fee.status
                            }
                          </span>
                        </td>

                        <td style={styles.td}>
                          {fee.payment_date ||
                            "—"}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* OVERALL */}

        <section style={styles.card}>
          <h2
            style={
              styles.sectionTitle
            }
          >
            📊 Overall Performance
          </h2>

          <p
            style={
              styles.sectionSubtitle
            }
          >
            Your overall portal performance
          </p>

          <div
            style={
              styles.overallGrid
            }
          >
            <div
              style={
                styles.overallItem
              }
            >
              <span>
                Total Attendance Records
              </span>

              <strong>
                {
                  attendance.length
                }
              </strong>
            </div>

            <div
              style={
                styles.overallItem
              }
            >
              <span>
                Total Fee Records
              </span>

              <strong>
                {fees.length}
              </strong>
            </div>

            <div
              style={
                styles.overallItem
              }
            >
              <span>
                Academy Tests
              </span>

              <strong>
                {
                  assessments.length
                }
              </strong>
            </div>

            <div
              style={
                styles.overallItem
              }
            >
              <span>
                Test Average
              </span>

              <strong>
                {assessmentStats.averagePercentage.toFixed(
                  1
                )}
                %
              </strong>
            </div>
          </div>
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
    </main>
  );
}

const styles: {
  [key: string]: React.CSSProperties;
} = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#eef2ff,#f8fafc,#eff6ff)",
    padding: "20px 15px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
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
  },

  card: {
    background: "white",
    borderRadius: "20px",
    padding: "24px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "20px",
    flexWrap: "wrap",
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
  },

  statIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "14px",
    background:
      "rgba(255,255,255,0.16)",
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
    border:
      "1px solid #e2e8f0",
  },

  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    color: "#334155",
    fontSize: "14px",
    marginBottom: "10px",
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
    transition:
      "width 0.4s ease",
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
    borderBottom:
      "2px solid #dbeafe",
    fontSize: "13px",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "13px",
    borderBottom:
      "1px solid #e2e8f0",
    color: "#334155",
    fontSize: "14px",
  },

  badge: {
    display: "inline-block",
    padding: "7px 11px",
    borderRadius: "999px",
    fontWeight: "800",
    fontSize: "11px",
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

  /* RACER ACADEMY TESTS */

  assessmentCard: {
    background: "white",
    borderRadius: "22px",
    padding: "24px",
    marginBottom: "20px",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.10)",
    border:
      "1px solid #ddd6fe",
  },

  assessmentHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
    paddingBottom: "20px",
    borderBottom:
      "1px solid #e2e8f0",
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
    border:
      "1px solid #ddd6fe",
    borderRadius: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    flexWrap: "wrap",
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
    border:
      "1px solid #c4b5fd",
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
    border:
      "1px solid #e2e8f0",
    borderRadius: "13px",
    padding: "15px",
    display: "grid",
    gridTemplateColumns:
      "1fr auto",
    alignItems: "center",
    gap: "4px 10px",
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
    border:
      "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  testCards: {
    display: "grid",
    gap: "18px",
    marginTop: "20px",
  },

  testCard: {
    border:
      "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "20px",
    background: "#ffffff",
    boxShadow:
      "0 5px 18px rgba(15,23,42,0.05)",
  },

  testTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
    flexWrap: "wrap",
    paddingBottom: "15px",
    borderBottom:
      "1px solid #e2e8f0",
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
  },

  subjectBadge: {
    display: "inline-block",
    background: "#eff6ff",
    color: "#1e3a8a",
    border:
      "1px solid #bfdbfe",
    padding: "7px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "800",
  },

  testMeta: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(130px,1fr))",
    gap: "10px",
    marginTop: "15px",
  },

  remarksBox: {
    marginTop: "15px",
    padding: "14px",
    borderRadius: "12px",
    background: "#f8fafc",
    border:
      "1px solid #e2e8f0",
  },

  imagesSection: {
    marginTop: "15px",
    padding: "15px",
    borderRadius: "13px",
    background:
      "linear-gradient(135deg,#fff7ed,#f8fafc)",
    border:
      "1px solid #fed7aa",
  },

  imagesHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
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
  },

  imageGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fill,minmax(180px,1fr))",
    gap: "12px",
    marginTop: "15px",
  },

  imageLink: {
    display: "block",
    textDecoration: "none",
    color: "#1e3a8a",
    fontSize: "11px",
    fontWeight: "800",
  },

  testImage: {
    width: "100%",
    height: "180px",
    objectFit: "cover",
    borderRadius: "10px",
    border:
      "1px solid #cbd5e1",
    display: "block",
    marginBottom: "6px",
    background: "#f1f5f9",
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
    border:
      "1px solid #ddd6fe",
    borderRadius: "15px",
    padding: "18px",
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

  feeGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(200px,1fr))",
    gap: "15px",
    marginBottom: "10px",
  },

  feeCard: {
    background: "#f8fafc",
    border:
      "1px solid #e2e8f0",
    borderRadius: "15px",
    padding: "18px",
    display: "flex",
    alignItems: "center",
    gap: "13px",
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
    border:
      "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    color: "#475569",
    fontSize: "13px",
  },

  empty: {
    textAlign: "center",
    padding: "35px 15px",
    color: "#64748b",
    background: "#f8fafc",
    borderRadius: "12px",
    marginTop: "20px",
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