"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Student = {
  id: number;
  student_name: string | null;
  student_username: string;
};

type Attendance = {
  id: number;
  student_id: number;
  attendance_date: string;
  status: string;
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

export default function TeacherReportsPage() {
  const currentDate = new Date();

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  const [month, setMonth] = useState(
    String(currentDate.getMonth() + 1)
  );

  const [year, setYear] = useState(
    String(currentDate.getFullYear())
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadReport();
  }, []);

  async function loadReport() {
    setLoading(true);
    setError("");

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;

    const lastDay = new Date(
      Number(year),
      Number(month),
      0
    ).getDate();

    const endDate = `${year}-${String(month).padStart(
      2,
      "0"
    )}-${String(lastDay).padStart(2, "0")}`;

    const { data: studentsData, error: studentsError } =
      await supabase
        .from("students")
        .select(
          "id, student_name, student_username"
        )
        .order("student_name", {
          ascending: true,
        });

    if (studentsError) {
      setError(studentsError.message);
      setLoading(false);
      return;
    }

    const { data: attendanceData, error: attendanceError } =
      await supabase
        .from("attendance")
        .select("*")
        .gte("attendance_date", startDate)
        .lte("attendance_date", endDate)
        .order("attendance_date", {
          ascending: true,
        });

    if (attendanceError) {
      setError(attendanceError.message);
      setLoading(false);
      return;
    }

    setStudents(studentsData || []);
    setAttendance(attendanceData || []);
    setLoading(false);
  }

  function getStudentName(studentId: number) {
    const student = students.find(
      (s) => s.id === studentId
    );

    if (!student) return "Unknown Student";

    return (
      student.student_name ||
      student.student_username
    );
  }

  function isPresent(status: string) {
    return (
      status.toLowerCase() === "present" ||
      status.toLowerCase() === "p"
    );
  }

  function isAbsent(status: string) {
    return (
      status.toLowerCase() === "absent" ||
      status.toLowerCase() === "a"
    );
  }

  const reportData = useMemo(() => {
    return students.map((student) => {
      const records = attendance.filter(
        (record) =>
          record.student_id === student.id
      );

      const present = records.filter((record) =>
        isPresent(record.status)
      ).length;

      const absent = records.filter((record) =>
        isAbsent(record.status)
      ).length;

      const total = records.length;

      const percentage =
        total > 0
          ? (present / total) * 100
          : 0;

      return {
        student,
        total,
        present,
        absent,
        percentage,
      };
    });
  }, [students, attendance]);

  const totalPresent = attendance.filter((record) =>
    isPresent(record.status)
  ).length;

  const totalAbsent = attendance.filter((record) =>
    isAbsent(record.status)
  ).length;

  const totalRecords = attendance.length;

  const overallPercentage =
    totalRecords > 0
      ? (totalPresent / totalRecords) * 100
      : 0;

  function getPercentageColor(
    percentage: number
  ) {
    if (percentage >= 75) {
      return "#166534";
    }

    if (percentage >= 50) {
      return "#92400e";
    }

    return "#991b1b";
  }

  function exportCSV() {
    const headers = [
      "Student Name",
      "Username",
      "Total Classes",
      "Present",
      "Absent",
      "Attendance %",
    ];

    const rows = reportData.map((item) => [
      item.student.student_name ||
        item.student.student_username,
      item.student.student_username,
      item.total,
      item.present,
      item.absent,
      `${item.percentage.toFixed(1)}%`,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((value) =>
            `"${String(value).replace(
              /"/g,
              '""'
            )}"`
          )
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob(
      [csvContent],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `attendance-report-${year}-${String(
        month
      ).padStart(2, "0")}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          📊 Loading Reports...
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
            <h1 style={styles.title}>
              📊 Attendance Reports
            </h1>

            <p style={styles.subtitle}>
              View monthly student attendance
              reports and statistics
            </p>
          </div>

          <a
            href="/teacher"
            style={styles.backButton}
          >
            ← Teacher Dashboard
          </a>
        </header>

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
                value={month}
                onChange={(e) =>
                  setMonth(e.target.value)
                }
                style={styles.input}
              >
                {months.map(
                  (monthName, index) => (
                    <option
                      key={monthName}
                      value={index + 1}
                    >
                      {monthName}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label style={styles.label}>
                Year
              </label>

              <input
                type="number"
                value={year}
                onChange={(e) =>
                  setYear(e.target.value)
                }
                style={styles.input}
              />
            </div>

            <div style={styles.filterAction}>
              <button
                onClick={loadReport}
                style={styles.generateButton}
              >
                🔍 Generate Report
              </button>

              <button
                onClick={exportCSV}
                style={styles.exportButton}
              >
                📥 Export CSV
              </button>
            </div>

          </div>

          {error && (
            <div style={styles.error}>
              ❌ {error}
            </div>
          )}
        </section>

        {/* SUMMARY */}

        <section style={styles.summaryGrid}>

          <div
            style={{
              ...styles.summaryCard,
              background:
                "linear-gradient(135deg,#2563eb,#1d4ed8)",
            }}
          >
            <div style={styles.summaryIcon}>
              👨‍🎓
            </div>

            <div style={styles.summaryLabel}>
              Total Students
            </div>

            <div style={styles.summaryValue}>
              {students.length}
            </div>
          </div>

          <div
            style={{
              ...styles.summaryCard,
              background:
                "linear-gradient(135deg,#16a34a,#15803d)",
            }}
          >
            <div style={styles.summaryIcon}>
              ✅
            </div>

            <div style={styles.summaryLabel}>
              Present
            </div>

            <div style={styles.summaryValue}>
              {totalPresent}
            </div>
          </div>

          <div
            style={{
              ...styles.summaryCard,
              background:
                "linear-gradient(135deg,#dc2626,#b91c1c)",
            }}
          >
            <div style={styles.summaryIcon}>
              ❌
            </div>

            <div style={styles.summaryLabel}>
              Absent
            </div>

            <div style={styles.summaryValue}>
              {totalAbsent}
            </div>
          </div>

          <div
            style={{
              ...styles.summaryCard,
              background:
                "linear-gradient(135deg,#7c3aed,#6d28d9)",
            }}
          >
            <div style={styles.summaryIcon}>
              📈
            </div>

            <div style={styles.summaryLabel}>
              Overall Attendance
            </div>

            <div style={styles.summaryValue}>
              {overallPercentage.toFixed(1)}%
            </div>
          </div>

        </section>

        {/* STUDENT REPORT */}

        <section style={styles.card}>

          <div style={styles.tableHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                👨‍🎓 Student-wise Report
              </h2>

              <p style={styles.sectionSubtitle}>
                {months[Number(month) - 1]}{" "}
                {year}
              </p>
            </div>

            <div style={styles.recordCount}>
              {reportData.length} Students
            </div>
          </div>

          {reportData.length === 0 ? (
            <div style={styles.empty}>
              No students found.
            </div>
          ) : (
            <div style={styles.tableWrapper}>

              <table style={styles.table}>

                <thead>
                  <tr>

                    <th style={styles.th}>
                      #
                    </th>

                    <th style={styles.th}>
                      Student
                    </th>

                    <th style={styles.th}>
                      Username
                    </th>

                    <th style={styles.th}>
                      Total Classes
                    </th>

                    <th style={styles.th}>
                      Present
                    </th>

                    <th style={styles.th}>
                      Absent
                    </th>

                    <th style={styles.th}>
                      Attendance %
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {reportData.map(
                    (item, index) => (
                      <tr
                        key={
                          item.student.id
                        }
                      >

                        <td style={styles.td}>
                          {index + 1}
                        </td>

                        <td style={styles.td}>
                          <strong>
                            {item.student
                              .student_name ||
                              item.student
                                .student_username}
                          </strong>
                        </td>

                        <td style={styles.td}>
                          {
                            item.student
                              .student_username
                          }
                        </td>

                        <td style={styles.td}>
                          {item.total}
                        </td>

                        <td style={styles.present}>
                          {item.present}
                        </td>

                        <td style={styles.absent}>
                          {item.absent}
                        </td>

                        <td style={styles.td}>

                          <div
                            style={
                              styles.percentageWrapper
                            }
                          >
                            <div
                              style={
                                styles.progressBackground
                              }
                            >
                              <div
                                style={{
                                  ...styles.progressBar,
                                  width: `${Math.min(
                                    item.percentage,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>

                            <strong
                              style={{
                                color:
                                  getPercentageColor(
                                    item.percentage
                                  ),
                              }}
                            >
                              {item.percentage.toFixed(
                                1
                              )}
                              %
                            </strong>
                          </div>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>

        {/* ATTENDANCE RECORDS */}

        <section style={styles.card}>

          <h2 style={styles.sectionTitle}>
            📚 Attendance Records
          </h2>

          <p style={styles.sectionSubtitle}>
            All attendance entries for the
            selected month
          </p>

          {attendance.length === 0 ? (
            <div style={styles.empty}>
              No attendance records found
              for this month.
            </div>
          ) : (
            <div style={styles.recordGrid}>

              {attendance.map((record) => (
                <div
                  key={record.id}
                  style={styles.recordCard}
                >

                  <div>
                    <strong
                      style={styles.recordName}
                    >
                      {getStudentName(
                        record.student_id
                      )}
                    </strong>

                    <p
                      style={
                        styles.recordDate
                      }
                    >
                      📅{" "}
                      {record.attendance_date}
                    </p>
                  </div>

                  <span
                    style={{
                      ...styles.statusBadge,
                      background:
                        isPresent(
                          record.status
                        )
                          ? "#dcfce7"
                          : "#fee2e2",
                      color:
                        isPresent(
                          record.status
                        )
                          ? "#166534"
                          : "#991b1b",
                    }}
                  >
                    {isPresent(
                      record.status
                    )
                      ? "✓ PRESENT"
                      : "✕ ABSENT"}
                  </span>

                </div>
              ))}

            </div>
          )}

        </section>

        {/* FOOTER */}

        <footer style={styles.footer}>
          Attendance Portal • Teacher Reports •
          {year}
        </footer>

      </div>
    </main>
  );
}

function isPresentStatus(status: string) {
  return (
    status.toLowerCase() === "present" ||
    status.toLowerCase() === "p"
  );
}

function getStudentName(
  studentId: number,
  students: Student[]
) {
  const student = students.find(
    (s) => s.id === studentId
  );

  if (!student) return "Unknown Student";

  return (
    student.student_name ||
    student.student_username
  );
}

const styles: {
  [key: string]: React.CSSProperties;
} = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#eef2ff,#f8fafc,#eff6ff)",
    padding: "25px 15px",
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
    padding: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    flexWrap: "wrap",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
  },

  title: {
    margin: 0,
    color: "#172554",
    fontSize: "30px",
    fontWeight: "800",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  backButton: {
    textDecoration: "none",
    background: "#1e3a8a",
    color: "white",
    padding: "12px 18px",
    borderRadius: "10px",
    fontWeight: "700",
  },

  filterCard: {
    background: "white",
    borderRadius: "18px",
    padding: "24px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
  },

  sectionTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "22px",
    fontWeight: "800",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  filterGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(200px,1fr))",
    gap: "16px",
    marginTop: "20px",
    alignItems: "end",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    color: "#334155",
    fontSize: "13px",
    fontWeight: "700",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    background: "white",
    color: "#111827",
    fontSize: "14px",
  },

  filterAction: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  generateButton: {
    border: "none",
    background:
      "linear-gradient(135deg,#2563eb,#4f46e5)",
    color: "white",
    padding: "12px 18px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },

  exportButton: {
    border: "none",
    background: "#16a34a",
    color: "white",
    padding: "12px 18px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },

  error: {
    marginTop: "15px",
    background: "#fee2e2",
    color: "#991b1b",
    padding: "12px",
    borderRadius: "10px",
    fontWeight: "600",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(210px,1fr))",
    gap: "16px",
    marginBottom: "20px",
  },

  summaryCard: {
    color: "white",
    padding: "22px",
    borderRadius: "18px",
    boxShadow:
      "0 8px 22px rgba(15,23,42,0.12)",
  },

  summaryIcon: {
    fontSize: "28px",
  },

  summaryLabel: {
    marginTop: "9px",
    fontSize: "13px",
    opacity: 0.9,
  },

  summaryValue: {
    marginTop: "4px",
    fontSize: "28px",
    fontWeight: "800",
  },

  card: {
    background: "white",
    borderRadius: "18px",
    padding: "24px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
  },

  tableHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },

  recordCount: {
    background: "#eff6ff",
    color: "#1e3a8a",
    padding: "9px 13px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "700",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    minWidth: "850px",
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
  },

  td: {
    padding: "13px",
    borderBottom:
      "1px solid #e2e8f0",
    color: "#334155",
    fontSize: "14px",
  },

  present: {
    padding: "13px",
    borderBottom:
      "1px solid #e2e8f0",
    color: "#166534",
    fontWeight: "800",
  },

  absent: {
    padding: "13px",
    borderBottom:
      "1px solid #e2e8f0",
    color: "#991b1b",
    fontWeight: "800",
  },

  percentageWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: "150px",
  },

  progressBackground: {
    width: "90px",
    height: "8px",
    background: "#e2e8f0",
    borderRadius: "999px",
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    background:
      "linear-gradient(90deg,#2563eb,#4f46e5)",
    borderRadius: "999px",
  },

  recordGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(280px,1fr))",
    gap: "12px",
    marginTop: "20px",
  },

  recordCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    background: "#f8fafc",
  },

  recordName: {
    color: "#172554",
    fontSize: "14px",
  },

  recordDate: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "12px",
  },

  statusBadge: {
    padding: "7px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "800",
    whiteSpace: "nowrap",
  },

  empty: {
    textAlign: "center",
    padding: "40px 20px",
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
  },

  footer: {
    textAlign: "center",
    color: "#64748b",
    fontSize: "12px",
    padding: "10px",
  },
};