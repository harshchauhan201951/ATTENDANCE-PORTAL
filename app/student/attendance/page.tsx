"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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

export default function StudentAttendancePage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAttendance();
  }, []);

  async function loadAttendance() {
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
          .select("id, student_name, student_username")
          .ilike("student_username", username)
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
          .select("*")
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

  const totalClasses = records.length;

  const present = records.filter(
    (record) =>
      record.status.toUpperCase() === "PRESENT"
  ).length;

  const absent = records.filter(
    (record) =>
      record.status.toUpperCase() === "ABSENT"
  ).length;

  const percentage =
    totalClasses > 0
      ? Math.round((present / totalClasses) * 100)
      : 0;

  function getStatusStyle(status: string) {
    const value = status.toUpperCase();

    if (value === "PRESENT") {
      return {
        background: "#dcfce7",
        color: "#166534",
      };
    }

    if (value === "ABSENT") {
      return {
        background: "#fee2e2",
        color: "#991b1b",
      };
    }

    return {
      background: "#fef3c7",
      color: "#92400e",
    };
  }

  function formatDate(date: string) {
    const d = new Date(date + "T00:00:00");

    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          📚 Loading Attendance...
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
              📅 Attendance
            </h1>

            <p style={styles.subtitle}>
              View your complete attendance record
            </p>
          </div>

          <Link
            href="/student/dashboard"
            style={styles.backButton}
          >
            ← Dashboard
          </Link>
        </header>

        {/* STUDENT INFO */}

        <section style={styles.studentCard}>
          <div style={styles.avatar}>
            👨‍🎓
          </div>

          <div>
            <p style={styles.infoLabel}>
              Student
            </p>

            <h2 style={styles.studentName}>
              {student?.student_name ||
                student?.student_username}
            </h2>

            <p style={styles.username}>
              Username: {student?.student_username}
            </p>
          </div>
        </section>

        {/* ERROR */}

        {error && (
          <div style={styles.error}>
            ❌ {error}
          </div>
        )}

        {/* SUMMARY */}

        <section style={styles.statsGrid}>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              📚
            </div>

            <div>
              <p style={styles.statLabel}>
                Total Classes
              </p>

              <h2 style={styles.statValue}>
                {totalClasses}
              </h2>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              ✅
            </div>

            <div>
              <p style={styles.statLabel}>
                Present
              </p>

              <h2
                style={{
                  ...styles.statValue,
                  color: "#16a34a",
                }}
              >
                {present}
              </h2>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              ❌
            </div>

            <div>
              <p style={styles.statLabel}>
                Absent
              </p>

              <h2
                style={{
                  ...styles.statValue,
                  color: "#dc2626",
                }}
              >
                {absent}
              </h2>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              📊
            </div>

            <div>
              <p style={styles.statLabel}>
                Attendance %
              </p>

              <h2
                style={{
                  ...styles.statValue,
                  color:
                    percentage >= 75
                      ? "#16a34a"
                      : "#dc2626",
                }}
              >
                {percentage}%
              </h2>
            </div>
          </div>

        </section>

        {/* ATTENDANCE PROGRESS */}

        <section style={styles.card}>

          <div style={styles.progressHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                📊 Attendance Overview
              </h2>

              <p style={styles.sectionSubtitle}>
                Your current attendance percentage
              </p>
            </div>

            <strong
              style={{
                color:
                  percentage >= 75
                    ? "#16a34a"
                    : "#dc2626",
                fontSize: "22px",
              }}
            >
              {percentage}%
            </strong>
          </div>

          <div style={styles.progressBackground}>
            <div
              style={{
                ...styles.progressBar,
                width: `${Math.min(
                  percentage,
                  100
                )}%`,
                background:
                  percentage >= 75
                    ? "#16a34a"
                    : "#dc2626",
              }}
            />
          </div>

          <div style={styles.progressMessage}>
            {percentage >= 75
              ? "✅ Your attendance is good."
              : "⚠️ Your attendance is below 75%. Try to attend more classes."}
          </div>

        </section>

        {/* HISTORY */}

        <section style={styles.card}>

          <div style={styles.historyHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                📋 Attendance History
              </h2>

              <p style={styles.sectionSubtitle}>
                Your previous attendance records
              </p>
            </div>

            <button
              onClick={loadAttendance}
              style={styles.refreshButton}
            >
              🔄 Refresh
            </button>
          </div>

          {records.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>
                📭
              </div>

              <h3 style={styles.emptyTitle}>
                No Attendance Records
              </h3>

              <p style={styles.emptyText}>
                Your attendance records will
                appear here once your teacher
                marks attendance.
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

                  {records.map(
                    (record, index) => {

                      const date = new Date(
                        record.attendance_date +
                          "T00:00:00"
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

                            <span
                              style={{
                                ...styles.badge,
                                ...getStatusStyle(
                                  record.status
                                ),
                              }}
                            >
                              {record.status
                                .toUpperCase() ===
                                "PRESENT" &&
                                "✓ "}

                              {record.status
                                .toUpperCase() ===
                                "ABSENT" &&
                                "✕ "}

                              {record.status}
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

        {/* FOOTER */}

        <footer style={styles.footer}>
          <strong>
            Attendance Portal
          </strong>

          <span>
            Student Attendance • 2026
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
      "linear-gradient(135deg,#eff6ff,#f8fafc,#eef2ff)",
    padding: "20px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "1100px",
    margin: "0 auto",
  },

  header: {
    background: "white",
    borderRadius: "20px",
    padding: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    flexWrap: "wrap",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
  },

  smallTitle: {
    color: "#2563eb",
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "2px",
    marginBottom: "5px",
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

  studentCard: {
    background:
      "linear-gradient(135deg,#1d4ed8,#4f46e5)",
    color: "white",
    borderRadius: "20px",
    padding: "25px",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    marginBottom: "20px",
    boxShadow:
      "0 12px 30px rgba(37,99,235,0.20)",
  },

  avatar: {
    width: "70px",
    height: "70px",
    borderRadius: "20px",
    background: "rgba(255,255,255,0.16)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "38px",
  },

  infoLabel: {
    margin: 0,
    fontSize: "12px",
    opacity: 0.8,
    fontWeight: "700",
  },

  studentName: {
    margin: "4px 0",
    fontSize: "25px",
  },

  username: {
    margin: 0,
    fontSize: "13px",
    opacity: 0.85,
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(200px,1fr))",
    gap: "15px",
    marginBottom: "20px",
  },

  statCard: {
    background: "white",
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
  },

  statIcon: {
    width: "52px",
    height: "52px",
    borderRadius: "15px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "25px",
    flexShrink: 0,
  },

  statLabel: {
    margin: 0,
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "700",
  },

  statValue: {
    margin: "4px 0 0",
    color: "#172554",
    fontSize: "25px",
    fontWeight: "800",
  },

  card: {
    background: "white",
    borderRadius: "20px",
    padding: "25px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
  },

  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "18px",
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

  progressBackground: {
    width: "100%",
    height: "15px",
    background: "#e2e8f0",
    borderRadius: "999px",
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    borderRadius: "999px",
    transition: "width 0.4s ease",
  },

  progressMessage: {
    marginTop: "13px",
    color: "#475569",
    fontSize: "13px",
    fontWeight: "600",
  },

  historyHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "20px",
  },

  refreshButton: {
    border: "none",
    background: "#2563eb",
    color: "white",
    padding: "10px 15px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
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
    borderBottom: "2px solid #dbeafe",
    fontSize: "13px",
  },

  td: {
    padding: "14px 13px",
    borderBottom: "1px solid #e2e8f0",
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
    padding: "45px 20px",
  },

  emptyIcon: {
    fontSize: "45px",
  },

  emptyTitle: {
    margin: "10px 0 5px",
    color: "#172554",
    fontSize: "19px",
  },

  emptyText: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
  },

  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "13px 16px",
    borderRadius: "12px",
    marginBottom: "20px",
    fontWeight: "600",
  },

  loading: {
    background: "white",
    maxWidth: "400px",
    margin: "100px auto",
    padding: "40px",
    borderRadius: "20px",
    textAlign: "center",
    fontSize: "18px",
    fontWeight: "700",
  },

  footer: {
    padding: "20px 10px",
    textAlign: "center",
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    flexWrap: "wrap",
    color: "#64748b",
    fontSize: "12px",
  },
};