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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function checkScreenSize() {
      setIsMobile(window.innerWidth <= 700);
    }

    checkScreenSize();

    window.addEventListener("resize", checkScreenSize);

    return () => {
      window.removeEventListener("resize", checkScreenSize);
    };
  }, []);

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
        setErrorMessage("Logged-in student account nahi mila.");
        setLoading(false);
        return;
      }

      setStudentName(student.student_name || savedName);

      const {
        data: attendance,
        error: attendanceError,
      } = await supabase
        .from("attendance")
        .select("student_id, attendance_date, status")
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
    return new Date(`${date}T00:00:00`).toLocaleDateString(
      "en-IN",
      {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
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
      ? Math.round((presentCount / totalCount) * 100)
      : 0;

  return (
    <main
      style={{
        ...styles.page,
        padding: isMobile ? "8px" : "16px",
      }}
    >
      <div style={styles.container}>

        {/* HEADER */}

        <header
          style={{
            ...styles.header,
            padding: isMobile ? "15px" : "22px",
            borderRadius: isMobile ? "16px" : "20px",
          }}
        >
          <div
            style={{
              ...styles.headerContent,
              flexDirection: isMobile ? "column" : "row",
              alignItems: isMobile ? "stretch" : "center",
            }}
          >
            <div
              style={{
                minWidth: 0,
                width: isMobile ? "100%" : "auto",
              }}
            >
              <div style={styles.badge}>
                STUDENT PORTAL
              </div>

              <h1
                style={{
                  ...styles.title,
                  fontSize: isMobile ? "21px" : "28px",
                }}
              >
                My Attendance History
              </h1>

              <p
                style={{
                  ...styles.subtitle,
                  fontSize: isMobile ? "11px" : "13px",
                }}
              >
                Your personal attendance records
              </p>
            </div>

            <button
              onClick={() =>
                router.push("/student/dashboard")
              }
              style={{
                ...styles.backButton,
                width: isMobile ? "100%" : "auto",
                padding: isMobile
                  ? "12px"
                  : "11px 16px",
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </header>

        {/* STUDENT INFORMATION */}

        <section
          style={{
            ...styles.studentCard,
            padding: isMobile ? "14px" : "22px",
            borderRadius: isMobile ? "16px" : "20px",
            gap: isMobile ? "11px" : "15px",
          }}
        >
          <div
            style={{
              ...styles.avatar,
              width: isMobile ? "50px" : "62px",
              height: isMobile ? "50px" : "62px",
              minWidth: isMobile ? "50px" : "62px",
              borderRadius: isMobile ? "14px" : "18px",
              fontSize: isMobile ? "22px" : "27px",
            }}
          >
            {studentName.charAt(0).toUpperCase()}
          </div>

          <div style={styles.studentInfo}>
            <div
              style={{
                ...styles.studentLabel,
                fontSize: isMobile ? "8px" : "9px",
              }}
            >
              LOGGED-IN STUDENT
            </div>

            <div
              style={{
                ...styles.studentName,
                fontSize: isMobile ? "16px" : "22px",
              }}
            >
              {studentName}
            </div>

            <div
              style={{
                ...styles.username,
                fontSize: isMobile ? "10px" : "11px",
              }}
            >
              @{username || "student"}
            </div>
          </div>
        </section>

        {/* ERROR */}

        {errorMessage && (
          <div style={styles.errorBox}>
            Error: {errorMessage}
          </div>
        )}

        {/* ATTENDANCE SUMMARY */}

        <section
          style={{
            ...styles.statsGrid,
            gridTemplateColumns: isMobile
              ? "repeat(2, minmax(0, 1fr))"
              : "repeat(4, minmax(0, 1fr))",
            gap: isMobile ? "8px" : "13px",
          }}
        >
          {/* TOTAL */}

          <div
            style={{
              ...styles.statCard,
              padding: isMobile
                ? "11px 9px"
                : "17px",
              gap: isMobile ? "7px" : "12px",
            }}
          >
            <div
              style={{
                ...styles.statIcon,
                width: isMobile ? "34px" : "48px",
                height: isMobile ? "34px" : "48px",
                minWidth: isMobile ? "34px" : "48px",
                borderRadius: isMobile ? "10px" : "13px",
                fontSize: isMobile ? "8px" : "11px",
                background: "#dbeafe",
              }}
            >
              TOTAL
            </div>

            <div style={styles.statContent}>
              <div
                style={{
                  ...styles.statLabel,
                  fontSize: isMobile ? "8px" : "9px",
                }}
              >
                TOTAL
              </div>

              <div
                style={{
                  ...styles.statValue,
                  fontSize: isMobile ? "18px" : "22px",
                }}
              >
                {totalCount}
              </div>

              <div
                style={{
                  ...styles.statText,
                  fontSize: isMobile ? "7px" : "9px",
                }}
              >
                Attendance records
              </div>
            </div>
          </div>

          {/* PRESENT */}

          <div
            style={{
              ...styles.statCard,
              padding: isMobile
                ? "11px 9px"
                : "17px",
              gap: isMobile ? "7px" : "12px",
            }}
          >
            <div
              style={{
                ...styles.statIcon,
                width: isMobile ? "34px" : "48px",
                height: isMobile ? "34px" : "48px",
                minWidth: isMobile ? "34px" : "48px",
                borderRadius: isMobile ? "10px" : "13px",
                fontSize: isMobile ? "8px" : "11px",
                background: "#dcfce7",
              }}
            >
              P
            </div>

            <div style={styles.statContent}>
              <div
                style={{
                  ...styles.statLabel,
                  fontSize: isMobile ? "8px" : "9px",
                }}
              >
                PRESENT
              </div>

              <div
                style={{
                  ...styles.statValue,
                  fontSize: isMobile ? "18px" : "22px",
                  color: "#15803d",
                }}
              >
                {presentCount}
              </div>

              <div
                style={{
                  ...styles.statText,
                  fontSize: isMobile ? "7px" : "9px",
                }}
              >
                Classes attended
              </div>
            </div>
          </div>

          {/* ABSENT */}

          <div
            style={{
              ...styles.statCard,
              padding: isMobile
                ? "11px 9px"
                : "17px",
              gap: isMobile ? "7px" : "12px",
            }}
          >
            <div
              style={{
                ...styles.statIcon,
                width: isMobile ? "34px" : "48px",
                height: isMobile ? "34px" : "48px",
                minWidth: isMobile ? "34px" : "48px",
                borderRadius: isMobile ? "10px" : "13px",
                fontSize: isMobile ? "8px" : "11px",
                background: "#fee2e2",
              }}
            >
              A
            </div>

            <div style={styles.statContent}>
              <div
                style={{
                  ...styles.statLabel,
                  fontSize: isMobile ? "8px" : "9px",
                }}
              >
                ABSENT
              </div>

              <div
                style={{
                  ...styles.statValue,
                  fontSize: isMobile ? "18px" : "22px",
                  color: "#dc2626",
                }}
              >
                {absentCount}
              </div>

              <div
                style={{
                  ...styles.statText,
                  fontSize: isMobile ? "7px" : "9px",
                }}
              >
                Classes missed
              </div>
            </div>
          </div>

          {/* ATTENDANCE */}

          <div
            style={{
              ...styles.statCard,
              padding: isMobile
                ? "11px 9px"
                : "17px",
              gap: isMobile ? "7px" : "12px",
            }}
          >
            <div
              style={{
                ...styles.statIcon,
                width: isMobile ? "34px" : "48px",
                height: isMobile ? "34px" : "48px",
                minWidth: isMobile ? "34px" : "48px",
                borderRadius: isMobile ? "10px" : "13px",
                fontSize: isMobile ? "12px" : "15px",
                background: "#fef3c7",
              }}
            >
              %
            </div>

            <div style={styles.statContent}>
              <div
                style={{
                  ...styles.statLabel,
                  fontSize: isMobile ? "8px" : "9px",
                }}
              >
                ATTENDANCE
              </div>

              <div
                style={{
                  ...styles.statValue,
                  fontSize: isMobile ? "18px" : "22px",
                  color: "#b45309",
                }}
              >
                {percentage}%
              </div>

              <div
                style={{
                  ...styles.statText,
                  fontSize: isMobile ? "7px" : "9px",
                }}
              >
                Overall attendance
              </div>
            </div>
          </div>
        </section>

        {/* HISTORY */}

        <section
          style={{
            ...styles.historyCard,
            padding: isMobile ? "12px" : "20px",
            borderRadius: isMobile ? "16px" : "20px",
          }}
        >
          <div style={styles.historyHeader}>
            <div style={styles.historyHeaderContent}>
              <h2
                style={{
                  ...styles.historyTitle,
                  fontSize: isMobile ? "17px" : "20px",
                }}
              >
                My Attendance Records
              </h2>

              <p
                style={{
                  ...styles.historySubtitle,
                  fontSize: isMobile ? "10px" : "11px",
                }}
              >
                Only your attendance records are shown here.
              </p>
            </div>
          </div>

          {loading ? (
            <div
              style={{
                ...styles.loadingBox,
                padding: isMobile
                  ? "40px 15px"
                  : "55px 20px",
              }}
            >
              <div style={styles.loadingIcon}>
                Loading...
              </div>

              <h3
                style={{
                  ...styles.loadingTitle,
                  fontSize: isMobile ? "15px" : "17px",
                }}
              >
                Loading your attendance...
              </h3>

              <p style={styles.loadingText}>
                Please wait.
              </p>
            </div>
          ) : records.length === 0 ? (
            <div
              style={{
                ...styles.emptyBox,
                padding: isMobile
                  ? "40px 15px"
                  : "50px 20px",
              }}
            >
              <div style={styles.emptyIcon}>
                No Records
              </div>

              <h3
                style={{
                  ...styles.emptyTitle,
                  fontSize: isMobile ? "16px" : "18px",
                }}
              >
                No Attendance Records
              </h3>

              <p style={styles.emptyText}>
                Abhi aapki koi attendance record
                available nahi hai.
              </p>
            </div>
          ) : isMobile ? (
            /* MOBILE ATTENDANCE CARDS */

            <div style={styles.mobileRecords}>
              {records.map((record, index) => {
                const isPresent =
                  record.status.toLowerCase() ===
                  "present";

                return (
                  <div
                    key={`${record.student_id}-${record.attendance_date}`}
                    style={styles.mobileRecordCard}
                  >
                    <div
                      style={
                        styles.mobileRecordNumber
                      }
                    >
                      #{index + 1}
                    </div>

                    <div
                      style={
                        styles.mobileRecordInfo
                      }
                    >
                      <div
                        style={
                          styles.mobileRecordLabel
                        }
                      >
                        DATE
                      </div>

                      <div
                        style={
                          styles.mobileRecordDate
                        }
                      >
                        {formatDate(
                          record.attendance_date
                        )}
                      </div>
                    </div>

                    <div
                      style={
                        styles.mobileRecordStatus
                      }
                    >
                      {isPresent ? (
                        <span
                          style={
                            styles.presentBadge
                          }
                        >
                          Present
                        </span>
                      ) : (
                        <span
                          style={
                            styles.absentBadge
                          }
                        >
                          Absent
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* DESKTOP TABLE */

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
                                Present
                              </span>
                            ) : (
                              <span
                                style={
                                  styles.absentBadge
                                }
                              >
                                Absent
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

        <footer
          style={{
            ...styles.footer,
            padding: isMobile
              ? "18px 8px"
              : "22px 10px",
          }}
        >
          Attendance Portal - My Attendance - 2026
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
    width: "100%",
    background:
      "linear-gradient(135deg,#eef2ff,#f8fafc,#eff6ff)",
    padding: "16px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#0f172a",
    overflowX: "hidden",
  },

  container: {
    width: "100%",
    maxWidth: "1100px",
    margin: "0 auto",
    boxSizing: "border-box",
  },

  header: {
    width: "100%",
    background: "#ffffff",
    borderRadius: "20px",
    padding: "22px",
    boxSizing: "border-box",
    marginBottom: "18px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
  },

  headerContent: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
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
    lineHeight: 1.2,
    fontWeight: "900",
    color: "#0f172a",
    wordBreak: "break-word",
  },

  subtitle: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "600",
    lineHeight: 1.4,
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
    whiteSpace: "nowrap",
    flexShrink: 0,
    boxSizing: "border-box",
  },

  studentCard: {
    width: "100%",
    background:
      "linear-gradient(135deg,#172554,#2563eb,#4f46e5)",
    borderRadius: "20px",
    padding: "22px",
    boxSizing: "border-box",
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
    flexShrink: 0,
  },

  studentInfo: {
    minWidth: 0,
    flex: 1,
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
    overflowWrap: "anywhere",
  },

  username: {
    color: "#dbeafe",
    fontSize: "11px",
    fontWeight: "700",
    marginTop: "3px",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  },

  errorBox: {
    width: "100%",
    boxSizing: "border-box",
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    borderRadius: "12px",
    padding: "14px",
    marginBottom: "18px",
    fontWeight: "700",
    fontSize: "13px",
    overflowWrap: "anywhere",
    lineHeight: 1.5,
  },

  statsGrid: {
    width: "100%",
    display: "grid",
    gridTemplateColumns:
      "repeat(4,minmax(0,1fr))",
    gap: "13px",
    marginBottom: "18px",
  },

  statCard: {
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    background: "#ffffff",
    borderRadius: "17px",
    padding: "17px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.06)",
  },

  statIcon: {
    width: "48px",
    height: "48px",
    minWidth: "48px",
    borderRadius: "13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: "900",
    color: "#1e3a8a",
    flexShrink: 0,
    boxSizing: "border-box",
  },

  statContent: {
    minWidth: 0,
    flex: 1,
  },

  statLabel: {
    color: "#64748b",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "1px",
    overflowWrap: "anywhere",
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
    lineHeight: 1.3,
    overflowWrap: "anywhere",
  },

  historyCard: {
    width: "100%",
    background: "#ffffff",
    borderRadius: "20px",
    padding: "20px",
    boxSizing: "border-box",
    boxShadow:
      "0 9px 28px rgba(15,23,42,0.07)",
    overflow: "hidden",
  },

  historyHeader: {
    width: "100%",
    marginBottom: "17px",
  },

  historyHeaderContent: {
    minWidth: 0,
    width: "100%",
  },

  historyTitle: {
    margin: 0,
    fontSize: "20px",
    lineHeight: 1.3,
    color: "#172554",
    fontWeight: "900",
    wordBreak: "break-word",
  },

  historySubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "600",
    lineHeight: 1.5,
    overflowWrap: "anywhere",
  },

  tableWrapper: {
    width: "100%",
    maxWidth: "100%",
    overflow: "hidden",
    border: "1px solid #e2e8f0",
    borderRadius: "13px",
    boxSizing: "border-box",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "#ffffff",
    tableLayout: "fixed",
  },

  th: {
    background: "#172554",
    color: "#ffffff",
    padding: "13px 12px",
    textAlign: "left",
    fontSize: "11px",
    fontWeight: "900",
  },

  td: {
    padding: "13px 12px",
    borderBottom:
      "1px solid #e2e8f0",
    color: "#334155",
    fontSize: "12px",
    fontWeight: "600",
    overflowWrap: "anywhere",
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
    whiteSpace: "nowrap",
  },

  absentBadge: {
    display: "inline-block",
    background: "#fee2e2",
    color: "#991b1b",
    padding: "7px 11px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: "900",
    whiteSpace: "nowrap",
  },

  mobileRecords: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "9px",
  },

  mobileRecordCard: {
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    gap: "9px",
    padding: "11px",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    background: "#f8fafc",
  },

  mobileRecordNumber: {
    width: "32px",
    minWidth: "32px",
    height: "32px",
    borderRadius: "9px",
    background: "#dbeafe",
    color: "#1d4ed8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "9px",
    fontWeight: "900",
    flexShrink: 0,
  },

  mobileRecordInfo: {
    minWidth: 0,
    flex: 1,
  },

  mobileRecordLabel: {
    color: "#94a3b8",
    fontSize: "7px",
    fontWeight: "900",
    letterSpacing: "1px",
    marginBottom: "2px",
  },

  mobileRecordDate: {
    color: "#172554",
    fontSize: "11px",
    fontWeight: "800",
    lineHeight: 1.35,
    overflowWrap: "anywhere",
  },

  mobileRecordStatus: {
    flexShrink: 0,
  },

  loadingBox: {
    width: "100%",
    boxSizing: "border-box",
    textAlign: "center",
    padding: "55px 20px",
    background: "#f8fafc",
    borderRadius: "13px",
  },

  loadingIcon: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#2563eb",
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
    width: "100%",
    boxSizing: "border-box",
    textAlign: "center",
    padding: "50px 20px",
    background: "#f8fafc",
    borderRadius: "13px",
  },

  emptyIcon: {
    fontSize: "18px",
    fontWeight: "900",
    color: "#64748b",
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
    overflowWrap: "anywhere",
  },

  footer: {
    textAlign: "center",
    padding: "22px 10px",
    color: "#94a3b8",
    fontSize: "10px",
    fontWeight: "700",
    overflowWrap: "anywhere",
    lineHeight: 1.5,
  },
};