"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type TimetableRow = {
  id: number;
  teacher_id: string;
  teacher_name: string;
  class_names: string[] | null;
  day_of_week: string;
  subject: string;
  start_time: string;
  end_time: string;
};

type StudentInfo = {
  id: number;
  student_username: string | null;
  class_name: string | null;
  student_name?: string | null;
};

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DAY_ORDER: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

function formatTime(time: string) {
  if (!time) return "-";

  const parts = time.split(":");
  const hour = Number(parts[0]);
  const minute = Number(parts[1] || 0);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return time;
  }

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export default function StudentTimetablePage() {
  const router = useRouter();

  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [timetables, setTimetables] = useState<TimetableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadTimetable = async () => {
    try {
      setError("");

      if (typeof window === "undefined") return;

      const loggedIn = localStorage.getItem("studentLoggedIn");

      if (loggedIn !== "true") {
        router.replace("/");
        return;
      }

      const username =
        localStorage.getItem("student_username") ||
        localStorage.getItem("studentUsername") ||
        "";

      const savedStudentId = localStorage.getItem("studentId") || "";

      if (!username && !savedStudentId) {
        router.replace("/");
        return;
      }

      let studentData: StudentInfo | null = null;

      if (savedStudentId) {
        const numericId = Number(savedStudentId);

        if (!Number.isNaN(numericId)) {
          const { data } = await supabase
            .from("students")
            .select("id, student_username, class_name, student_name")
            .eq("id", numericId)
            .maybeSingle();

          if (data) {
            studentData = data as StudentInfo;
          }
        }
      }

      if (!studentData && username) {
        const { data } = await supabase
          .from("students")
          .select("id, student_username, class_name, student_name")
          .eq("student_username", username)
          .maybeSingle();

        if (data) {
          studentData = data as StudentInfo;
        }
      }

      if (!studentData) {
        setError("Student details could not be found.");
        setTimetables([]);
        return;
      }

      setStudent(studentData);

      const studentClass = studentData.class_name?.trim();

      if (!studentClass) {
        setError("Your class is not assigned yet.");
        setTimetables([]);
        return;
      }

      const { data, error: timetableError } = await supabase
        .from("timetables")
        .select(
          "id, teacher_id, teacher_name, class_names, day_of_week, subject, start_time, end_time"
        )
        .contains("class_names", [studentClass]);

      if (timetableError) {
        throw timetableError;
      }

      const rows = ((data || []) as TimetableRow[]).sort((a, b) => {
        const dayDifference =
          (DAY_ORDER[a.day_of_week] || 99) -
          (DAY_ORDER[b.day_of_week] || 99);

        if (dayDifference !== 0) {
          return dayDifference;
        }

        return (a.start_time || "").localeCompare(b.start_time || "");
      });

      setTimetables(rows);
    } catch (err: any) {
      console.error("Student timetable error:", err);
      setError(err?.message || "Unable to load timetable.");
      setTimetables([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTimetable();
  }, []);

  const timetableByDay = useMemo(() => {
    const grouped: Record<string, TimetableRow[]> = {};

    DAYS.forEach((day) => {
      grouped[day] = [];
    });

    timetables.forEach((item) => {
      if (grouped[item.day_of_week]) {
        grouped[item.day_of_week].push(item);
      }
    });

    return grouped;
  }, [timetables]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTimetable();
  };

  const handleLogout = () => {
    const keysToRemove = [
      "studentLoggedIn",
      "student_username",
      "studentUsername",
      "studentName",
      "student_name",
      "studentId",
    ];

    keysToRemove.forEach((key) => localStorage.removeItem(key));

    sessionStorage.clear();

    router.replace("/");
  };

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingIcon}>🗓️</div>
          <h2 style={styles.loadingTitle}>Loading Timetable...</h2>
          <p style={styles.loadingText}>
            Please wait while we load your class timetable.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <div style={styles.badge}>RACER ACADEMY</div>

            <h1 style={styles.title}>🗓️ My Timetable</h1>

            <p style={styles.subtitle}>
              View your class-wise daily timetable and teacher schedule.
            </p>
          </div>

          <div style={styles.headerButtons}>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              style={styles.refreshButton}
            >
              {refreshing ? "Refreshing..." : "↻ Refresh"}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              style={styles.secondaryButton}
            >
              ← Back
            </button>

            <button
              type="button"
              onClick={() => router.push("/student/dashboard")}
              style={styles.dashboardButton}
            >
              Dashboard
            </button>

            <button
              type="button"
              onClick={handleLogout}
              style={styles.logoutButton}
            >
              Logout
            </button>
          </div>
        </header>

        <section style={styles.studentCard}>
          <div style={styles.studentIcon}>👨‍🎓</div>

          <div style={styles.studentInfo}>
            <div style={styles.studentLabel}>STUDENT</div>

            <div style={styles.studentName}>
              {student?.student_name ||
                localStorage.getItem("studentName") ||
                "Student"}
            </div>

            <div style={styles.classText}>
              Class:{" "}
              <strong>{student?.class_name || "Class not assigned"}</strong>
            </div>
          </div>
        </section>

        {error && (
          <div style={styles.errorBox}>
            <strong>Unable to load timetable</strong>
            <div style={styles.errorText}>{error}</div>
          </div>
        )}

        {!error && (
          <section style={styles.scheduleSection}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Weekly Schedule</h2>
                <p style={styles.sectionSubtitle}>
                  Monday to Saturday timetable
                </p>
              </div>

              <div style={styles.classBadge}>
                {student?.class_name || "Class"}
              </div>
            </div>

            <div style={styles.daysGrid}>
              {DAYS.map((day) => {
                const classes = timetableByDay[day] || [];

                return (
                  <div key={day} style={styles.dayCard}>
                    <div style={styles.dayHeader}>
                      <h3 style={styles.dayTitle}>{day}</h3>

                      <span style={styles.classCount}>
                        {classes.length}{" "}
                        {classes.length === 1 ? "Class" : "Classes"}
                      </span>
                    </div>

                    <div style={styles.dayContent}>
                      {classes.length === 0 ? (
                        <div style={styles.emptyDay}>
                          <div style={styles.emptyIcon}>📭</div>
                          <div style={styles.emptyTitle}>
                            No classes scheduled
                          </div>
                          <div style={styles.emptyText}>
                            No timetable entry for this day.
                          </div>
                        </div>
                      ) : (
                        classes.map((item) => (
                          <div key={item.id} style={styles.classItem}>
                            <div style={styles.timeBox}>
                              <div style={styles.timeLabel}>TIME</div>

                              <div style={styles.timeText}>
                                {formatTime(item.start_time)}
                              </div>

                              <div style={styles.toText}>to</div>

                              <div style={styles.timeText}>
                                {formatTime(item.end_time)}
                              </div>
                            </div>

                            <div style={styles.classDetails}>
                              <div style={styles.subjectLabel}>SUBJECT</div>

                              <div style={styles.subject}>
                                {item.subject}
                              </div>

                              <div style={styles.teacherRow}>
                                <span style={styles.teacherIcon}>👨‍🏫</span>

                                <div>
                                  <div style={styles.teacherLabel}>
                                    TEACHER
                                  </div>

                                  <div style={styles.teacherName}>
                                    {item.teacher_name || "Teacher"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {timetables.length === 0 && (
              <div style={styles.noTimetableBox}>
                <div style={styles.noTimetableIcon}>🗓️</div>

                <h3 style={styles.noTimetableTitle}>
                  No Timetable Available
                </h3>

                <p style={styles.noTimetableText}>
                  No timetable has been created for your class yet.
                </p>
              </div>
            )}
          </section>
        )}

        <footer style={styles.footer}>
          <div>RACER ACADEMY</div>
          <div style={styles.footerText}>
            Student Timetable • Monday to Saturday
          </div>
        </footer>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #eff6ff 100%)",
    padding: "24px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#0f172a",
  },

  container: {
    maxWidth: "1400px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "22px",
    flexWrap: "wrap",
  },

  badge: {
    display: "inline-block",
    background: "#1d4ed8",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "1px",
    padding: "7px 12px",
    borderRadius: "999px",
    marginBottom: "10px",
  },

  title: {
    margin: 0,
    fontSize: "32px",
    fontWeight: 800,
    lineHeight: 1.2,
  },

  subtitle: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: "15px",
  },

  headerButtons: {
    display: "flex",
    gap: "9px",
    flexWrap: "wrap",
  },

  refreshButton: {
    border: "none",
    borderRadius: "10px",
    padding: "11px 15px",
    background: "#2563eb",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  },

  secondaryButton: {
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "11px 15px",
    background: "#ffffff",
    color: "#0f172a",
    fontWeight: 700,
    cursor: "pointer",
  },

  dashboardButton: {
    border: "none",
    borderRadius: "10px",
    padding: "11px 15px",
    background: "#0f172a",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  },

  logoutButton: {
    border: "none",
    borderRadius: "10px",
    padding: "11px 15px",
    background: "#dc2626",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  },

  studentCard: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    background: "#ffffff",
    border: "1px solid #dbeafe",
    borderRadius: "18px",
    padding: "20px",
    marginBottom: "22px",
    boxShadow: "0 8px 25px rgba(15, 23, 42, 0.06)",
  },

  studentIcon: {
    width: "58px",
    height: "58px",
    borderRadius: "16px",
    background: "#dbeafe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "29px",
    flexShrink: 0,
  },

  studentInfo: {
    minWidth: 0,
  },

  studentLabel: {
    color: "#64748b",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "1px",
  },

  studentName: {
    marginTop: "3px",
    fontSize: "21px",
    fontWeight: 800,
  },

  classText: {
    marginTop: "5px",
    color: "#475569",
    fontSize: "14px",
  },

  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#991b1b",
    borderRadius: "14px",
    padding: "18px",
    marginBottom: "22px",
  },

  errorText: {
    marginTop: "6px",
    fontSize: "14px",
  },

  scheduleSection: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    padding: "22px",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 800,
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  classBadge: {
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    padding: "8px 13px",
    borderRadius: "999px",
    fontWeight: 800,
    fontSize: "13px",
  },

  daysGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "16px",
  },

  dayCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    overflow: "hidden",
    background: "#f8fafc",
  },

  dayHeader: {
    background: "#eff6ff",
    borderBottom: "1px solid #dbeafe",
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
  },

  dayTitle: {
    margin: 0,
    fontSize: "17px",
    fontWeight: 800,
  },

  classCount: {
    background: "#ffffff",
    color: "#475569",
    border: "1px solid #dbeafe",
    borderRadius: "999px",
    padding: "5px 9px",
    fontSize: "11px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  dayContent: {
    padding: "12px",
  },

  classItem: {
    display: "grid",
    gridTemplateColumns: "125px minmax(0, 1fr)",
    gap: "12px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "13px",
    padding: "13px",
    marginBottom: "10px",
  },

  timeBox: {
    background: "#f1f5f9",
    borderRadius: "10px",
    padding: "10px",
    textAlign: "center",
  },

  timeLabel: {
    color: "#64748b",
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "0.8px",
    marginBottom: "4px",
  },

  timeText: {
    fontSize: "14px",
    fontWeight: 800,
    color: "#0f172a",
  },

  toText: {
    color: "#94a3b8",
    fontSize: "10px",
    margin: "2px 0",
  },

  classDetails: {
    minWidth: 0,
  },

  subjectLabel: {
    color: "#64748b",
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "0.8px",
  },

  subject: {
    fontSize: "18px",
    fontWeight: 800,
    marginTop: "3px",
    wordBreak: "break-word",
  },

  teacherRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "10px",
  },

  teacherIcon: {
    fontSize: "20px",
  },

  teacherLabel: {
    color: "#64748b",
    fontSize: "8px",
    fontWeight: 800,
    letterSpacing: "0.7px",
  },

  teacherName: {
    color: "#334155",
    fontSize: "13px",
    fontWeight: 700,
    marginTop: "2px",
    wordBreak: "break-word",
  },

  emptyDay: {
    textAlign: "center",
    padding: "28px 12px",
  },

  emptyIcon: {
    fontSize: "27px",
    marginBottom: "7px",
  },

  emptyTitle: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#475569",
  },

  emptyText: {
    marginTop: "4px",
    color: "#94a3b8",
    fontSize: "11px",
  },

  noTimetableBox: {
    marginTop: "18px",
    textAlign: "center",
    border: "1px dashed #cbd5e1",
    borderRadius: "14px",
    padding: "30px 15px",
    background: "#f8fafc",
  },

  noTimetableIcon: {
    fontSize: "35px",
  },

  noTimetableTitle: {
    margin: "8px 0 4px",
    fontSize: "18px",
  },

  noTimetableText: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
  },

  loadingCard: {
    maxWidth: "500px",
    margin: "15vh auto",
    textAlign: "center",
    background: "#ffffff",
    borderRadius: "20px",
    padding: "40px 25px",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
  },

  loadingIcon: {
    fontSize: "45px",
  },

  loadingTitle: {
    margin: "12px 0 5px",
    fontSize: "22px",
  },

  loadingText: {
    margin: 0,
    color: "#64748b",
    fontSize: "14px",
  },

  footer: {
    textAlign: "center",
    marginTop: "25px",
    color: "#475569",
    fontWeight: 800,
    fontSize: "13px",
  },

  footerText: {
    marginTop: "4px",
    color: "#94a3b8",
    fontWeight: 500,
    fontSize: "11px",
  },
};