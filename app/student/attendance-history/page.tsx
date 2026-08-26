"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type AttendanceRecord = {
  student_id: number;
  attendance_date: string;
  status: string;
};

export default function StudentAttendanceHistoryPage() {
  const router = useRouter();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [studentName, setStudentName] = useState("Student");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadStudentAttendance();
  }, []);

  async function loadStudentAttendance() {
    setLoading(true);
    setErrorMessage("");

    try {
      const savedUsername =
        localStorage.getItem("student_username") ||
        localStorage.getItem("studentUsername") ||
        "";

      const savedName =
        localStorage.getItem("studentName") ||
        localStorage.getItem("student_name") ||
        "Student";

      setUsername(savedUsername);
      setStudentName(savedName);

      if (!savedUsername) {
        setErrorMessage(
          "Student login information nahi mili. Please dobara login karein."
        );
        setLoading(false);
        return;
      }

      /*
       * IMPORTANT:
       * Pehle logged-in username se student ID nikali ja rahi hai.
       * Iske baad attendance sirf usi student_id ki load hogi.
       */

      const { data: student, error: studentError } =
        await supabase
          .from("students")
          .select("id, student_name, student_username")
          .eq("student_username", savedUsername)
          .maybeSingle();

      if (studentError) {
        throw new Error(
          "Student information load nahi ho paayi: " +
            studentError.message
        );
      }

      if (!student) {
        setErrorMessage(
          "Logged-in student account nahi mila."
        );
        setLoading(false);
        return;
      }

      setStudentName(
        student.student_name || savedName
      );

      /*
       * ONLY THIS STUDENT'S ATTENDANCE
       *
       * No search.
       * No other students.
       * No delete.
       */

      const {
        data: attendance,
        error: attendanceError,
      } = await supabase
        .from("attendance")
        .select(
          "student_id, attendance_date, status"
        )
        .eq("student_id", student.id)
        .order("attendance_date", {
          ascending: false,
        });

      if (attendanceError) {
        throw new Error(
          "Attendance load nahi ho paayi: " +
            attendanceError.message
        );
      }

      setRecords(
        (attendance || []) as AttendanceRecord[]
      );
    } catch (error) {
      console.error(
        "Student attendance history error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Attendance history load nahi ho paayi."
      );
    } finally {
      setLoading(false);
    }
  }

  function formatDate(date: string) {
    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const presentCount = records.filter(
    (record) =>
      record.status.toLowerCase() === "present"
  ).length;

  const absentCount = records.filter(
    (record) =>
      record.status.toLowerCase() === "absent"
  ).length;

  const totalCount = records.length;

  const percentage =
    totalCount > 0
      ? Math.round(
          (presentCount / totalCount) * 100
        )
      : 0;

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}

        <header style={styles.header}>
          <div>
            <div style={styles.badge}>
              STUDENT PORTAL
            </div>

            <h1 style={styles.title}>
              📋 My Attendance History
            </h1>

            <p style={styles.subtitle}>
              Your personal attendance records
            </p>
          </div>

          <button
            onClick={() =>
              router.push("/student/dashboard")
            }
            style={styles.backButton}
          >
            ← Dashboard
          </button>
        </header>

        {/* STUDENT INFORMATION */}

        <section style={styles.studentCard}>
          <div style={styles.avatar}>
            {studentName
              .charAt(0)
              .toUpperCase()}
          </div>

          <div style={styles.studentInfo}>
            <div style={styles.studentLabel}>
              LOGGED-IN STUDENT
            </div>

            <div style={styles.studentName}>
              {studentName}
            </div>

            <div style={styles.username}>
              @{username || "student"}
            </div>
          </div>
        </section>

        {/* ERROR */}

        {errorMessage && (
          <div style={styles.errorBox}>
            ⚠️ {errorMessage}
          </div>
        )}

        {/* ATTENDANCE SUMMARY */}

        <section style={styles.statsGrid}>

          <div style={styles.statCard}>
            <div
              style={{
                ...styles.statIcon,
                background: "#dbeafe",
              }}
            >
              📋
            </div>

            <div>
              <div style={styles.statLabel}>
                TOTAL
              </div>

              <div style={styles.statValue}>
                {totalCount}
              </div>

              <div style={styles.statText}>
                Attendance records
              </div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div
              style={{
                ...styles.statIcon,
                background: "#dcfce7",
              }}
            >
              ✓
            </div>

            <div>
              <div style={styles.statLabel}>
                PRESENT
              </div>

              <div
                style={{
                  ...styles.statValue,
                  color: "#15803d",
                }}
              >
                {presentCount}
              </div>

              <div style={styles.statText}>
                Classes attended
              </div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div
              style={{
                ...styles.statIcon,
                background: "#fee2e2",
              }}
            >
              ✕
            </div>

            <div>
              <div style={styles.statLabel}>
                ABSENT
              </div>

              <div
                style={{
                  ...styles.statValue,
                  color: "#dc2626",
                }}
              >
                {absentCount}
              </div>

              <div style={styles.statText}>
                Classes missed
              </div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div
              style={{
                ...styles.statIcon,
                background: "#fef3c7",
              }}
            >
              %
            </div>

            <div>
              <div style={styles.statLabel}>
                ATTENDANCE
              </div>

              <div
                style={{
                  ...styles.statValue,
                  color: "#b45309",
                }}
              >
                {percentage}%
              </div>

              <div style={styles.statText}>
                Overall attendance
              </div>
            </div>
          </div>

        </section>

        {/* HISTORY */}

        <section style={styles.historyCard}>

          <div style={styles.historyHeader}>
            <div>
              <h2 style={styles.historyTitle}>
                📅 My Attendance Records
              </h2>

              <p style={styles.historySubtitle}>
                Only your attendance records are shown here.
              </p>
            </div>
          </div>

          {loading ? (
            <div style={styles.loadingBox}>
              <div style={styles.loadingIcon}>
                ⏳
              </div>

              <h3 style={styles.loadingTitle}>
                Loading your attendance...
              </h3>

              <p style={styles.loadingText}>
                Please wait.
              </p>
            </div>
          ) : records.length === 0 ? (
            <div style={styles.emptyBox}>
              <div style={styles.emptyIcon}>
                📭
              </div>

              <h3 style={styles.emptyTitle}>
                No Attendance Records
              </h3>

              <p style={styles.emptyText}>
                Abhi aapki koi attendance record
                available nahi hai.
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
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {records.map(
                    (record, index) => {
                      const isPresent =
                        record.status
                          .toLowerCase() ===
                        "present";

                      return (
                        <tr
                          key={`${record.student_id}-${record.attendance_date}`}
                        >
                          <td style={styles.td}>
                            {index + 1}
                          </td>

                          <td style={styles.td}>
                            <strong
                              style={
                                styles.dateText
                              }
                            >
                              {formatDate(
                                record.attendance_date
                              )}
                            </strong>
                          </td>

                          <td style={styles.td}>
                            {isPresent ? (
                              <span
                                style={
                                  styles.presentBadge
                                }
                              >
                                ✓ Present
                              </span>
                            ) : (
                              <span
                                style={
                                  styles.absentBadge
                                }
                              >
                                ✕ Absent
                              </span>
                            )}
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
          Attendance Portal • My Attendance • 2026
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
    padding: "22px 14px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#0f172a",
  },

  container: {
    width: "100%",
    maxWidth: "1100px",
    margin: "0 auto",
  },

  header: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "18px",
    marginBottom: "18px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
    flexWrap: "wrap",
  },

  badge: {
    display: "inline-block",
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "6px 11px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "1.5px",
    marginBottom: "8px",
  },

  title: {
    margin: 0,
    fontSize: "28px",
    fontWeight: "900",
    color: "#0f172a",
  },

  subtitle: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "600",
  },

  backButton: {
    border: "none",
    background: "#1d4ed8",
    color: "#ffffff",
    padding: "11px 16px",
    borderRadius: "10px",
    fontWeight: "800",
    cursor: "pointer",
    fontSize: "13px",
  },

  studentCard: {
    background:
      "linear-gradient(135deg,#172554,#2563eb,#4f46e5)",
    borderRadius: "20px",
    padding: "22px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    marginBottom: "18px",
    boxShadow:
      "0 12px 30px rgba(37,99,235,0.18)",
  },

  avatar: {
    width: "62px",
    height: "62px",
    minWidth: "62px",
    borderRadius: "18px",
    background: "#ffffff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "27px",
    fontWeight: "900",
  },

  studentInfo: {
    minWidth: 0,
  },

  studentLabel: {
    color: "#bfdbfe",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "1.5px",
  },

  studentName: {
    color: "#ffffff",
    fontSize: "22px",
    fontWeight: "900",
    marginTop: "4px",
    wordBreak: "break-word",
  },

  username: {
    color: "#dbeafe",
    fontSize: "11px",
    fontWeight: "700",
    marginTop: "3px",
  },

  errorBox: {
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    borderRadius: "12px",
    padding: "14px",
    marginBottom: "18px",
    fontWeight: "700",
    fontSize: "13px",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4,minmax(0,1fr))",
    gap: "13px",
    marginBottom: "18px",
  },

  statCard: {
    background: "#ffffff",
    borderRadius: "17px",
    padding: "17px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.06)",
    minWidth: 0,
  },

  statIcon: {
    width: "48px",
    height: "48px",
    minWidth: "48px",
    borderRadius: "13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "21px",
    fontWeight: "900",
  },

  statLabel: {
    color: "#64748b",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  statValue: {
    color: "#172554",
    fontSize: "22px",
    fontWeight: "900",
    marginTop: "2px",
  },

  statText: {
    color: "#94a3b8",
    fontSize: "9px",
    marginTop: "2px",
    fontWeight: "600",
  },

  historyCard: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "20px",
    boxShadow:
      "0 9px 28px rgba(15,23,42,0.07)",
    overflow: "hidden",
  },

  historyHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "17px",
    flexWrap: "wrap",
  },

  historyTitle: {
    margin: 0,
    fontSize: "20px",
    color: "#172554",
    fontWeight: "900",
  },

  historySubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "600",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
    border: "1px solid #e2e8f0",
    borderRadius: "13px",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "#ffffff",
  },

  th: {
    background: "#172554",
    color: "#ffffff",
    padding: "13px 12px",
    textAlign: "left",
    fontSize: "11px",
    fontWeight: "900",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "13px 12px",
    borderBottom:
      "1px solid #e2e8f0",
    color: "#334155",
    fontSize: "12px",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },

  dateText: {
    color: "#172554",
    fontSize: "13px",
  },

  presentBadge: {
    display: "inline-block",
    background: "#dcfce7",
    color: "#166534",
    padding: "7px 11px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: "900",
  },

  absentBadge: {
    display: "inline-block",
    background: "#fee2e2",
    color: "#991b1b",
    padding: "7px 11px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: "900",
  },

  loadingBox: {
    textAlign: "center",
    padding: "55px 20px",
    background: "#f8fafc",
    borderRadius: "13px",
  },

  loadingIcon: {
    fontSize: "35px",
  },

  loadingTitle: {
    margin: "10px 0 5px",
    color: "#172554",
    fontSize: "17px",
    fontWeight: "900",
  },

  loadingText: {
    margin: 0,
    color: "#64748b",
    fontSize: "12px",
  },

  emptyBox: {
    textAlign: "center",
    padding: "50px 20px",
    background: "#f8fafc",
    borderRadius: "13px",
  },

  emptyIcon: {
    fontSize: "42px",
  },

  emptyTitle: {
    margin: "10px 0 5px",
    color: "#172554",
    fontSize: "18px",
    fontWeight: "900",
  },

  emptyText: {
    margin: 0,
    color: "#64748b",
    fontSize: "12px",
    lineHeight: 1.6,
  },

  footer: {
    textAlign: "center",
    padding: "22px 10px",
    color: "#94a3b8",
    fontSize: "10px",
    fontWeight: "700",
  },
};