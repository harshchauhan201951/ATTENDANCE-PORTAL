"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type AttendanceRecord = {
  id?: number;
  student_id: number;
  attendance_date: string;
  status: string;
};

export default function StudentDashboard() {
  const router = useRouter();

  const [studentName, setStudentName] = useState("Student");
  const [studentUsername, setStudentUsername] = useState("");
  const [studentId, setStudentId] = useState<number | null>(null);

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initializeStudent() {
      try {
        /*
         * NEW LOGIN SYSTEM
         */
        const newUsername =
          localStorage.getItem("attendance_username");

        const newStudentId =
          localStorage.getItem("attendance_student_id");

        const newStudentName =
          localStorage.getItem("attendance_student_name");

        const newRole =
          localStorage.getItem("attendance_role");

        /*
         * OLD LOGIN SYSTEM
         * Kept for compatibility with existing pages.
         */
        const oldUsername =
          localStorage.getItem("studentUsername");

        const oldStudentId =
          localStorage.getItem("studentId");

        const oldStudentName =
          localStorage.getItem("studentName");

        const oldLoggedIn =
          localStorage.getItem("studentLoggedIn");

        /*
         * Use new system first.
         */
        let username =
          newUsername || oldUsername || "";

        let idValue =
          newStudentId || oldStudentId || "";

        let name =
          newStudentName || oldStudentName || "Student";

        /*
         * If role exists and is not Student,
         * don't allow access.
         */
        if (
          newRole &&
          newRole !== "Student"
        ) {
          router.replace("/");
          return;
        }

        /*
         * If old login exists, allow it.
         */
        if (
          !newUsername &&
          oldLoggedIn !== "true"
        ) {
          /*
           * No valid login information.
           */
          router.replace("/");
          return;
        }

        /*
         * If we have username but no ID,
         * find the student ID from Supabase.
         */
        let id =
          idValue
            ? Number(idValue)
            : null;

        if (
          (!id || Number.isNaN(id)) &&
          username
        ) {
          const { data, error } =
            await supabase
              .from("students")
              .select(
                "id, student_username, student_name"
              )
              .eq(
                "student_username",
                username
              )
              .maybeSingle();

          if (error) {
            console.error(
              "Student lookup error:",
              error
            );
          }

          if (data) {
            id = Number(data.id);

            if (data.student_name) {
              name =
                data.student_name;
            }

            /*
             * Save ID for all existing pages.
             */
            localStorage.setItem(
              "attendance_student_id",
              String(id)
            );

            localStorage.setItem(
              "studentId",
              String(id)
            );
          }
        }

        /*
         * Still no student ID?
         */
        if (!id || Number.isNaN(id)) {
          console.error(
            "Student ID not found."
          );

          router.replace("/");
          return;
        }

        /*
         * SAVE BOTH NEW AND OLD SESSION KEYS
         *
         * This makes all existing student pages
         * compatible with the new login system.
         */

        localStorage.setItem(
          "attendance_role",
          "Student"
        );

        localStorage.setItem(
          "attendance_username",
          username
        );

        localStorage.setItem(
          "attendance_student_id",
          String(id)
        );

        localStorage.setItem(
          "attendance_student_name",
          name
        );

        localStorage.setItem(
          "studentLoggedIn",
          "true"
        );

        localStorage.setItem(
          "studentUsername",
          username
        );

        localStorage.setItem(
          "studentName",
          name
        );

        localStorage.setItem(
          "studentId",
          String(id)
        );

        /*
         * Remove teacher session.
         */
        localStorage.removeItem(
          "teacherLoggedIn"
        );

        localStorage.removeItem(
          "teacher"
        );

        localStorage.removeItem(
          "teacherUsername"
        );

        localStorage.removeItem(
          "teacherName"
        );

        /*
         * Set state.
         */
        setStudentId(id);
        setStudentName(name);
        setStudentUsername(username);

        /*
         * Load attendance.
         */
        await loadAttendance(id);
      } catch (error) {
        console.error(
          "Student initialization error:",
          error
        );

        router.replace("/");
      }
    }

    initializeStudent();
  }, [router]);

  async function loadAttendance(id: number) {
    setLoading(true);

    try {
      const {
        data,
        error,
      } = await supabase
        .from("attendance")
        .select(
          "id, student_id, attendance_date, status"
        )
        .eq(
          "student_id",
          id
        )
        .order(
          "attendance_date",
          {
            ascending: false,
          }
        );

      if (error) {
        console.error(
          "Student attendance error:",
          error
        );

        setAttendance([]);
        setLoading(false);
        return;
      }

      setAttendance(
        (data || []) as AttendanceRecord[]
      );
    } catch (error) {
      console.error(
        "Attendance loading error:",
        error
      );

      setAttendance([]);
    }

    setLoading(false);
  }

  function logout() {
    /*
     * Remove new session.
     */
    localStorage.removeItem(
      "attendance_role"
    );

    localStorage.removeItem(
      "attendance_username"
    );

    localStorage.removeItem(
      "attendance_student_id"
    );

    localStorage.removeItem(
      "attendance_student_name"
    );

    /*
     * Remove old session.
     */
    localStorage.removeItem(
      "studentLoggedIn"
    );

    localStorage.removeItem(
      "studentUsername"
    );

    localStorage.removeItem(
      "studentName"
    );

    localStorage.removeItem(
      "studentId"
    );

    router.replace("/");
  }

  const present =
    attendance.filter(
      (item) =>
        String(item.status).toLowerCase() ===
        "present"
    ).length;

  const absent =
    attendance.filter(
      (item) =>
        String(item.status).toLowerCase() ===
        "absent"
    ).length;

  const total =
    attendance.length;

  const percentage =
    total > 0
      ? Math.round(
          (present / total) * 100
        )
      : 0;

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}

        <header style={styles.header}>
          <div style={styles.brand}>
            <div style={styles.logo}>
              🎓
            </div>

            <div>
              <h1 style={styles.brandTitle}>
                Attendance Portal
              </h1>

              <p style={styles.brandSubtitle}>
                Student Dashboard
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            style={styles.logout}
          >
            🚪 Logout
          </button>
        </header>

        {/* WELCOME */}

        <section style={styles.hero}>
          <div>
            <div style={styles.smallText}>
              STUDENT PORTAL
            </div>

            <h2 style={styles.heroTitle}>
              Welcome back, {studentName} 👋
            </h2>

            <p style={styles.heroText}>
              Username:{" "}
              <strong>
                {studentUsername}
              </strong>
            </p>
          </div>

          <div style={styles.heroIcon}>
            👨‍🎓
          </div>
        </section>

        {/* STATS */}

        <section style={styles.stats}>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              📚
            </div>

            <div>
              <p style={styles.statLabel}>
                Total Classes
              </p>

              <h3 style={styles.statValue}>
                {total}
              </h3>
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
              <p style={styles.statLabel}>
                Present
              </p>

              <h3
                style={{
                  ...styles.statValue,
                  color: "#15803d",
                }}
              >
                {present}
              </h3>
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
              <p style={styles.statLabel}>
                Absent
              </p>

              <h3
                style={{
                  ...styles.statValue,
                  color: "#dc2626",
                }}
              >
                {absent}
              </h3>
            </div>
          </div>

          <div style={styles.statCard}>
            <div
              style={{
                ...styles.statIcon,
                background: "#fef3c7",
              }}
            >
              📊
            </div>

            <div>
              <p style={styles.statLabel}>
                Attendance
              </p>

              <h3
                style={{
                  ...styles.statValue,
                  color: "#b45309",
                }}
              >
                {percentage}%
              </h3>
            </div>
          </div>

        </section>

        {/* QUICK MENU */}

        <section style={styles.menuSection}>
          <h2 style={styles.sectionTitle}>
            Student Control Center
          </h2>

          <p style={styles.sectionSubtitle}>
            View your attendance and student information
          </p>

          <div style={styles.menuGrid}>

            <button
              onClick={() =>
                router.push(
                  "/student/attendance"
                )
              }
              style={styles.menuCard}
            >
              <span style={styles.menuIcon}>
                📋
              </span>

              <span>
                <strong>
                  Attendance
                </strong>

                <small>
                  View your attendance
                </small>
              </span>

              <span style={styles.arrow}>
                →
              </span>
            </button>

            <button
              onClick={() =>
                router.push(
                  "/student/calendar"
                )
              }
              style={styles.menuCard}
            >
              <span style={styles.menuIcon}>
                📅
              </span>

              <span>
                <strong>
                  Calendar
                </strong>

                <small>
                  View important dates
                </small>
              </span>

              <span style={styles.arrow}>
                →
              </span>
            </button>

            <button
              onClick={() =>
                router.push(
                  "/student/fees"
                )
              }
              style={styles.menuCard}
            >
              <span style={styles.menuIcon}>
                💰
              </span>

              <span>
                <strong>
                  Fees
                </strong>

                <small>
                  View fee information
                </small>
              </span>

              <span style={styles.arrow}>
                →
              </span>
            </button>

            <button
              onClick={() =>
                router.push(
                  "/student/profile"
                )
              }
              style={styles.menuCard}
            >
              <span style={styles.menuIcon}>
                👤
              </span>

              <span>
                <strong>
                  Profile
                </strong>

                <small>
                  View your profile
                </small>
              </span>

              <span style={styles.arrow}>
                →
              </span>
            </button>

            <button
              onClick={() =>
                router.push(
                  "/student/settings"
                )
              }
              style={styles.menuCard}
            >
              <span style={styles.menuIcon}>
                ⚙️
              </span>

              <span>
                <strong>
                  Settings
                </strong>

                <small>
                  Manage account
                </small>
              </span>

              <span style={styles.arrow}>
                →
              </span>
            </button>

          </div>
        </section>

        {/* RECENT ATTENDANCE */}

        <section style={styles.attendanceSection}>

          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                📋 Recent Attendance
              </h2>

              <p style={styles.sectionSubtitle}>
                Your latest attendance records
              </p>
            </div>

            <button
              onClick={() => {
                if (studentId) {
                  loadAttendance(
                    studentId
                  );
                }
              }}
              style={styles.refresh}
            >
              🔄 Refresh
            </button>
          </div>

          {loading ? (
            <div style={styles.empty}>
              ⏳ Loading attendance...
            </div>
          ) : attendance.length === 0 ? (
            <div style={styles.empty}>
              📋 No attendance records found.
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
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {attendance
                    .slice(0, 10)
                    .map((record) => {
                      const isPresent =
                        String(
                          record.status
                        ).toLowerCase() ===
                        "present";

                      return (
                        <tr
                          key={
                            record.id ??
                            record.attendance_date
                          }
                        >
                          <td style={styles.td}>
                            {formatDate(
                              record.attendance_date
                            )}
                          </td>

                          <td style={styles.td}>
                            <span
                              style={
                                isPresent
                                  ? styles.present
                                  : styles.absent
                              }
                            >
                              {isPresent
                                ? "✓ Present"
                                : "✕ Absent"}
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

        <footer style={styles.footer}>
          Attendance Portal • Student Dashboard • 2026
        </footer>

      </div>
    </main>
  );
}

function formatDate(date: string) {
  if (!date) return "";

  return new Date(
    `${date}T00:00:00`
  ).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );
}

const styles: {
  [key: string]: React.CSSProperties;
} = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#eef2ff,#f8fafc,#eff6ff)",
    padding: "20px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#172554",
  },

  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
  },

  header: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
  },

  logo: {
    width: "52px",
    height: "52px",
    borderRadius: "15px",
    background:
      "linear-gradient(135deg,#2563eb,#7c3aed)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "27px",
  },

  brandTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "800",
  },

  brandSubtitle: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "600",
  },

  logout: {
    border: "none",
    background: "#dc2626",
    color: "#ffffff",
    padding: "11px 17px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },

  hero: {
    background:
      "linear-gradient(135deg,#2563eb,#4338ca,#7c3aed)",
    color: "#ffffff",
    borderRadius: "24px",
    padding: "35px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "20px",
    boxShadow:
      "0 15px 35px rgba(37,99,235,0.22)",
  },

  smallText: {
    fontSize: "12px",
    fontWeight: "800",
    letterSpacing: "2px",
    marginBottom: "8px",
  },

  heroTitle: {
    margin: 0,
    fontSize: "32px",
    fontWeight: "800",
  },

  heroText: {
    margin: "12px 0 0",
    fontSize: "15px",
  },

  heroIcon: {
    width: "100px",
    height: "100px",
    borderRadius: "28px",
    background:
      "rgba(255,255,255,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "55px",
    flexShrink: 0,
  },

  stats: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: "16px",
    marginBottom: "30px",
  },

  statCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
  },

  statIcon: {
    width: "55px",
    height: "55px",
    borderRadius: "15px",
    background: "#dbeafe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "27px",
    flexShrink: 0,
  },

  statLabel: {
    margin: 0,
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "700",
  },

  statValue: {
    margin: "3px 0 0",
    color: "#172554",
    fontSize: "23px",
    fontWeight: "800",
  },

  menuSection: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "25px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
  },

  sectionTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "23px",
    fontWeight: "800",
  },

  sectionSubtitle: {
    margin: "5px 0 18px",
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "600",
  },

  menuGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(280px,1fr))",
    gap: "15px",
  },

  menuCard: {
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    borderRadius: "16px",
    padding: "18px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    textAlign: "left",
    cursor: "pointer",
    color: "#172554",
  },

  menuIcon: {
    width: "52px",
    height: "52px",
    borderRadius: "14px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "25px",
    flexShrink: 0,
  },

  arrow: {
    marginLeft: "auto",
    color: "#2563eb",
    fontSize: "22px",
    fontWeight: "800",
  },

  attendanceSection: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "25px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "15px",
  },

  refresh: {
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    padding: "10px 14px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },

  empty: {
    padding: "35px",
    textAlign: "center",
    color: "#64748b",
    background: "#f8fafc",
    borderRadius: "12px",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",
    padding: "13px",
    background: "#f1f5f9",
    color: "#334155",
    fontSize: "13px",
  },

  td: {
    padding: "13px",
    borderBottom:
      "1px solid #e2e8f0",
    fontSize: "13px",
  },

  present: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "8px",
    background: "#dcfce7",
    color: "#15803d",
    fontWeight: "700",
  },

  absent: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "8px",
    background: "#fee2e2",
    color: "#dc2626",
    fontWeight: "700",
  },

  footer: {
    textAlign: "center",
    padding: "25px 10px",
    color: "#64748b",
    fontSize: "12px",
  },
};
