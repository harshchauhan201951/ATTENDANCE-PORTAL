"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

type AttendanceRecord = {
  id: number;
  student_id: number;
  attendance_date: string;
  status: string;
};

type Student = {
  id: number;
  student_name: string | null;
  student_username: string;
};

export default function StudentAttendanceHistoryPage() {
  const router = useRouter();

  const [student, setStudent] = useState<Student | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedMonth, setSelectedMonth] = useState(
    String(new Date().getMonth() + 1)
  );

  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear())
  );

  useEffect(() => {
    loadStudentAndAttendance();
  }, []);

  async function loadStudentAndAttendance() {
    setLoading(true);
    setError("");

    try {
      const username =
        localStorage.getItem("student_username") ||
        localStorage.getItem("studentUsername") ||
        localStorage.getItem("username");

      if (!username) {
        setError(
          "Student login information not found. Please login again."
        );
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
        setError("Student account not found.");
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

      setRecords(attendanceData || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    }

    setLoading(false);
  }

  function goBack() {
    router.push("/student/dashboard");
  }

  function formatDate(dateString: string) {
    const date = new Date(
      `${dateString}T00:00:00`
    );

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getStatus(status: string) {
    const normalized = status
      .toUpperCase()
      .trim();

    if (
      normalized === "PRESENT" ||
      normalized === "P"
    ) {
      return "PRESENT";
    }

    if (
      normalized === "ABSENT" ||
      normalized === "A"
    ) {
      return "ABSENT";
    }

    if (
      normalized === "LATE" ||
      normalized === "L"
    ) {
      return "LATE";
    }

    return normalized;
  }

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const date = new Date(
        `${record.attendance_date}T00:00:00`
      );

      return (
        date.getMonth() + 1 ===
          Number(selectedMonth) &&
        date.getFullYear() ===
          Number(selectedYear)
      );
    });
  }, [
    records,
    selectedMonth,
    selectedYear,
  ]);

  const totalClasses = filteredRecords.length;

  const presentCount = filteredRecords.filter(
    (record) =>
      getStatus(record.status) === "PRESENT"
  ).length;

  const absentCount = filteredRecords.filter(
    (record) =>
      getStatus(record.status) === "ABSENT"
  ).length;

  const lateCount = filteredRecords.filter(
    (record) =>
      getStatus(record.status) === "LATE"
  ).length;

  const attendancePercentage =
    totalClasses > 0
      ? ((presentCount / totalClasses) * 100).toFixed(
          1
        )
      : "0.0";

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingIcon}>
            📚
          </div>

          <h2 style={styles.loadingTitle}>
            Loading Attendance History...
          </h2>

          <p style={styles.loadingText}>
            Please wait while we load your records.
          </p>
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
            <div style={styles.smallLabel}>
              STUDENT PORTAL
            </div>

            <h1 style={styles.title}>
              📅 Attendance History
            </h1>

            <p style={styles.subtitle}>
              View your previous attendance records
            </p>
          </div>

          <button
            onClick={goBack}
            style={styles.backButton}
          >
            ← Dashboard
          </button>
        </header>

        {/* STUDENT INFO */}

        <section style={styles.studentCard}>
          <div style={styles.studentAvatar}>
            👨‍🎓
          </div>

          <div style={styles.studentInfo}>
            <h2 style={styles.studentName}>
              {student?.student_name ||
                "Student"}
            </h2>

            <p style={styles.studentUsername}>
              Username:{" "}
              {student?.student_username}
            </p>
          </div>

          <button
            onClick={loadStudentAndAttendance}
            style={styles.refreshButton}
          >
            🔄 Refresh
          </button>
        </section>

        {/* ERROR */}

        {error && (
          <div style={styles.error}>
            ❌ {error}
          </div>
        )}

        {/* FILTER */}

        <section style={styles.filterCard}>
          <div>
            <h2 style={styles.sectionTitle}>
              🔎 Filter Attendance
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
                <option value="1">
                  January
                </option>
                <option value="2">
                  February
                </option>
                <option value="3">
                  March
                </option>
                <option value="4">
                  April
                </option>
                <option value="5">
                  May
                </option>
                <option value="6">
                  June
                </option>
                <option value="7">
                  July
                </option>
                <option value="8">
                  August
                </option>
                <option value="9">
                  September
                </option>
                <option value="10">
                  October
                </option>
                <option value="11">
                  November
                </option>
                <option value="12">
                  December
                </option>
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

        {/* SUMMARY */}

        <section style={styles.statsGrid}>
          <StatCard
            icon="📚"
            title="Total Classes"
            value={String(totalClasses)}
            background="#2563eb"
          />

          <StatCard
            icon="✅"
            title="Present"
            value={String(presentCount)}
            background="#16a34a"
          />

          <StatCard
            icon="❌"
            title="Absent"
            value={String(absentCount)}
            background="#dc2626"
          />

          <StatCard
            icon="⏰"
            title="Late"
            value={String(lateCount)}
            background="#f59e0b"
          />

          <StatCard
            icon="📊"
            title="Attendance"
            value={`${attendancePercentage}%`}
            background="#7c3aed"
          />
        </section>

        {/* ATTENDANCE TABLE */}

        <section style={styles.card}>
          <div style={styles.historyHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                📋 Attendance Records
              </h2>

              <p style={styles.sectionSubtitle}>
                {filteredRecords.length} record
                {filteredRecords.length !== 1
                  ? "s"
                  : ""}{" "}
                found
              </p>
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>
                📭
              </div>

              <h3 style={styles.emptyTitle}>
                No Attendance Records
              </h3>

              <p style={styles.emptyText}>
                No attendance records were found
                for the selected month and year.
              </p>
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
                  {filteredRecords.map(
                    (record, index) => {
                      const date = new Date(
                        `${record.attendance_date}T00:00:00`
                      );

                      const status = getStatus(
                        record.status
                      );

                      return (
                        <tr key={record.id}>
                          <td style={styles.td}>
                            {index + 1}
                          </td>

                          <td style={styles.td}>
                            <strong>
                              {formatDate(
                                record.attendance_date
                              )}
                            </strong>
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
                            <StatusBadge
                              status={status}
                            />
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

        {/* ATTENDANCE MESSAGE */}

        <section style={styles.infoCard}>
          <div style={styles.infoIcon}>
            💡
          </div>

          <div>
            <h3 style={styles.infoTitle}>
              Attendance Summary
            </h3>

            <p style={styles.infoText}>
              You attended{" "}
              <strong>
                {presentCount}
              </strong>{" "}
              out of{" "}
              <strong>
                {totalClasses}
              </strong>{" "}
              classes during the selected
              month.
            </p>

            <p style={styles.infoText}>
              Current attendance percentage:{" "}
              <strong>
                {attendancePercentage}%
              </strong>
            </p>
          </div>
        </section>

        {/* FOOTER */}

        <footer style={styles.footer}>
          <strong>
            Attendance Portal
          </strong>

          <span>
            Student Attendance History • 2026
          </span>
        </footer>

      </div>
    </main>
  );
}

function StatCard({
  icon,
  title,
  value,
  background,
}: {
  icon: string;
  title: string;
  value: string;
  background: string;
}) {
  return (
    <div
      style={{
        ...styles.statCard,
        background,
      }}
    >
      <div style={styles.statIcon}>
        {icon}
      </div>

      <div>
        <p style={styles.statTitle}>
          {title}
        </p>

        <h3 style={styles.statValue}>
          {value}
        </h3>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  let background = "#f1f5f9";
  let color = "#475569";
  let icon = "•";

  if (status === "PRESENT") {
    background = "#dcfce7";
    color = "#166534";
    icon = "✓";
  }

  if (status === "ABSENT") {
    background = "#fee2e2";
    color = "#991b1b";
    icon = "✕";
  }

  if (status === "LATE") {
    background = "#fef3c7";
    color = "#92400e";
    icon = "⏰";
  }

  return (
    <span
      style={{
        ...styles.badge,
        background,
        color,
      }}
    >
      {icon} {status}
    </span>
  );
}

const styles: {
  [key: string]: React.CSSProperties;
} = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#eff6ff,#f8fafc,#eef2ff)",
    padding: "25px 15px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "1150px",
    margin: "0 auto",
  },

  loadingCard: {
    background: "white",
    maxWidth: "450px",
    margin: "100px auto",
    padding: "40px",
    borderRadius: "22px",
    textAlign: "center",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.08)",
  },

  loadingIcon: {
    fontSize: "48px",
  },

  loadingTitle: {
    color: "#172554",
    margin: "15px 0 5px",
  },

  loadingText: {
    color: "#64748b",
    margin: 0,
  },

  header: {
    background: "white",
    borderRadius: "20px",
    padding: "24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
  },

  smallLabel: {
    color: "#2563eb",
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "2px",
    marginBottom: "7px",
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
    border: "none",
    background:
      "linear-gradient(135deg,#2563eb,#4f46e5)",
    color: "white",
    padding: "12px 18px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },

  studentCard: {
    background:
      "linear-gradient(135deg,#1d4ed8,#4338ca)",
    color: "white",
    borderRadius: "20px",
    padding: "22px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    marginBottom: "20px",
    boxShadow:
      "0 12px 30px rgba(37,99,235,0.18)",
  },

  studentAvatar: {
    width: "60px",
    height: "60px",
    borderRadius: "17px",
    background:
      "rgba(255,255,255,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "30px",
    flexShrink: 0,
  },

  studentInfo: {
    flex: 1,
  },

  studentName: {
    margin: 0,
    fontSize: "22px",
    fontWeight: "800",
  },

  studentUsername: {
    margin: "5px 0 0",
    opacity: 0.85,
    fontSize: "13px",
  },

  refreshButton: {
    border: "1px solid rgba(255,255,255,0.3)",
    background:
      "rgba(255,255,255,0.14)",
    color: "white",
    padding: "10px 15px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },

  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "14px 17px",
    borderRadius: "12px",
    marginBottom: "20px",
    fontWeight: "600",
  },

  filterCard: {
    background: "white",
    borderRadius: "20px",
    padding: "24px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
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
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: "15px",
    marginTop: "18px",
  },

  label: {
    display: "block",
    color: "#334155",
    fontSize: "13px",
    fontWeight: "700",
    marginBottom: "7px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "12px",
    fontSize: "14px",
    color: "#111827",
    background: "white",
    outline: "none",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(170px,1fr))",
    gap: "14px",
    marginBottom: "20px",
  },

  statCard: {
    color: "white",
    borderRadius: "17px",
    padding: "18px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    boxShadow:
      "0 8px 20px rgba(15,23,42,0.1)",
  },

  statIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "13px",
    background:
      "rgba(255,255,255,0.16)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
    flexShrink: 0,
  },

  statTitle: {
    margin: 0,
    fontSize: "12px",
    opacity: 0.85,
    fontWeight: "700",
  },

  statValue: {
    margin: "3px 0 0",
    fontSize: "23px",
    fontWeight: "800",
  },

  card: {
    background: "white",
    borderRadius: "20px",
    padding: "24px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
  },

  historyHeader: {
    marginBottom: "18px",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    minWidth: "650px",
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
    padding: "14px 13px",
    borderBottom:
      "1px solid #e2e8f0",
    color: "#334155",
    fontSize: "14px",
  },

  badge: {
    display: "inline-block",
    padding: "7px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "800",
  },

  empty: {
    textAlign: "center",
    padding: "50px 20px",
  },

  emptyIcon: {
    fontSize: "45px",
  },

  emptyTitle: {
    color: "#172554",
    margin: "12px 0 5px",
  },

  emptyText: {
    color: "#64748b",
    fontSize: "13px",
    margin: 0,
  },

  infoCard: {
    background:
      "linear-gradient(135deg,#eff6ff,#eef2ff)",
    border:
      "1px solid #dbeafe",
    borderRadius: "18px",
    padding: "22px",
    display: "flex",
    gap: "14px",
    alignItems: "flex-start",
    marginBottom: "20px",
  },

  infoIcon: {
    fontSize: "28px",
  },

  infoTitle: {
    margin: 0,
    color: "#1e3a8a",
    fontSize: "17px",
  },

  infoText: {
    margin: "7px 0 0",
    color: "#475569",
    fontSize: "13px",
    lineHeight: 1.6,
  },

  footer: {
    textAlign: "center",
    padding: "20px 10px",
    color: "#64748b",
    fontSize: "12px",
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
};