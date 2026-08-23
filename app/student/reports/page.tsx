"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
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

export default function StudentReportsPage() {
  const router = useRouter();

  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [fees, setFees] = useState<FeeRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedMonth, setSelectedMonth] = useState(
    String(new Date().getMonth() + 1)
  );

  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear())
  );

  useEffect(() => {
    loadReport();
  }, []);

  async function loadReport() {
    setLoading(true);
    setError("");

    try {
      const username =
        localStorage.getItem("student_username") ||
        localStorage.getItem("studentUsername") ||
        localStorage.getItem("username");

      if (!username) {
        setError("Student login information not found.");
        setLoading(false);
        return;
      }

      const { data: studentData, error: studentError } =
        await supabase
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
        setError("Student record not found.");
        setLoading(false);
        return;
      }

      setStudent(studentData);

      const { data: attendanceData, error: attendanceError } =
        await supabase
          .from("attendance")
          .select(
            "id, student_id, attendance_date, status"
          )
          .eq("student_id", studentData.id)
          .order("attendance_date", {
            ascending: false,
          });

      if (attendanceError) {
        setError(attendanceError.message);
        setLoading(false);
        return;
      }

      const { data: feesData, error: feesError } =
        await supabase
          .from("fees")
          .select(
            "id, student_id, month, year, amount, status, payment_date"
          )
          .eq("student_id", studentData.id)
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

      setAttendance(attendanceData || []);
      setFees(feesData || []);
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
    localStorage.removeItem("student_username");
    localStorage.removeItem("studentUsername");
    localStorage.removeItem("student_name");
    localStorage.removeItem("studentName");
    localStorage.removeItem("studentLoggedIn");

    sessionStorage.clear();

    router.push("/");
  }

  const filteredAttendance = useMemo(() => {
    return attendance.filter((record) => {
      const date = new Date(
        record.attendance_date
      );

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

  const presentCount = filteredAttendance.filter(
    (record) =>
      record.status.toUpperCase() === "PRESENT"
  ).length;

  const absentCount = filteredAttendance.filter(
    (record) =>
      record.status.toUpperCase() === "ABSENT"
  ).length;

  const totalClasses =
    presentCount + absentCount;

  const attendancePercentage =
    totalClasses > 0
      ? (presentCount / totalClasses) * 100
      : 0;

  const filteredFees = fees.filter(
    (fee) =>
      fee.month === Number(selectedMonth) &&
      fee.year === Number(selectedYear)
  );

  const totalFee = filteredFees.reduce(
    (sum, fee) =>
      sum + Number(fee.amount || 0),
    0
  );

  const paidFee = filteredFees
    .filter(
      (fee) =>
        fee.status.toUpperCase() ===
          "SUBMITTED" ||
        fee.status.toUpperCase() ===
          "PAID"
    )
    .reduce(
      (sum, fee) =>
        sum + Number(fee.amount || 0),
      0
    );

  const pendingFee = filteredFees
    .filter(
      (fee) =>
        fee.status.toUpperCase() ===
        "PENDING"
    )
    .reduce(
      (sum, fee) =>
        sum + Number(fee.amount || 0),
      0
    );

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
              STUDENT PORTAL
            </div>

            <h1 style={styles.title}>
              📊 My Reports
            </h1>

            <p style={styles.subtitle}>
              Attendance and fee reports
            </p>
          </div>

          <div style={styles.headerButtons}>
            <button
              onClick={() =>
                router.push("/student/dashboard")
              }
              style={styles.dashboardButton}
            >
              ← Dashboard
            </button>

            <button
              onClick={logout}
              style={styles.logoutButton}
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
              {student?.student_username}
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

            <div>
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
                {[
                  new Date().getFullYear() - 1,
                  new Date().getFullYear(),
                  new Date().getFullYear() + 1,
                ].map((year) => (
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

        {/* ATTENDANCE SUMMARY */}

        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                📝 Attendance Report
              </h2>

              <p style={styles.sectionSubtitle}>
                {months[
                  Number(selectedMonth) - 1
                ]}{" "}
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

          {/* PROGRESS */}

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

            <div style={styles.progressBackground}>
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
              {attendancePercentage >= 75
                ? "🎉 Good attendance! Keep it up."
                : attendancePercentage > 0
                ? "⚠️ Attendance is below 75%."
                : "No attendance records for this month."}
            </p>
          </div>

          {/* ATTENDANCE TABLE */}

          {filteredAttendance.length === 0 ? (
            <div style={styles.empty}>
              📭 No attendance records found
              for this month.
            </div>
          ) : (
            <div style={styles.tableWrapper}>
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
                      const date = new Date(
                        record.attendance_date
                      );

                      const status =
                        record.status.toUpperCase();

                      return (
                        <tr key={record.id}>
                          <td style={styles.td}>
                            {date.toLocaleDateString(
                              "en-IN"
                            )}
                          </td>

                          <td style={styles.td}>
                            {date.toLocaleDateString(
                              "en-IN",
                              {
                                weekday: "long",
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

        {/* FEES REPORT */}

        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                💰 Fee Report
              </h2>

              <p style={styles.sectionSubtitle}>
                {months[
                  Number(selectedMonth) - 1
                ]}{" "}
                {selectedYear}
              </p>
            </div>

            <button
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

          {filteredFees.length === 0 ? (
            <div style={styles.empty}>
              📭 No fee records found for this
              month.
            </div>
          ) : (
            <div style={styles.tableWrapper}>
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
                  {filteredFees.map((fee) => (
                    <tr key={fee.id}>
                      <td style={styles.td}>
                        {months[
                          fee.month - 1
                        ]}{" "}
                        {fee.year}
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
                          {fee.status}
                        </span>
                      </td>

                      <td style={styles.td}>
                        {fee.payment_date ||
                          "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* OVERALL REPORT */}

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>
            📊 Overall Performance
          </h2>

          <p style={styles.sectionSubtitle}>
            Your attendance performance
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
                Overall Present
              </span>

              <strong>
                {
                  attendance.filter(
                    (a) =>
                      a.status.toUpperCase() ===
                      "PRESENT"
                  ).length
                }
              </strong>
            </div>

            <div style={styles.overallItem}>
              <span>
                Overall Absent
              </span>

              <strong>
                {
                  attendance.filter(
                    (a) =>
                      a.status.toUpperCase() ===
                      "ABSENT"
                  ).length
                }
              </strong>
            </div>

          </div>
        </section>

        {/* FOOTER */}

        <footer style={styles.footer}>
          <strong>
            Attendance Portal
          </strong>

          <span>
            Student Reports • 2026
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
    letterSpacing: "2px",
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
    border: "1px solid #e2e8f0",
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
    border: "1px solid #e2e8f0",
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