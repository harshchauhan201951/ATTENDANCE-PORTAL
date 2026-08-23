"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

type AttendanceRecord = {
  id: number;
  attendance_date: string;
  status: string;
};

export default function StudentDashboard() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadStudent();
  }, []);

  async function loadStudent() {
    setLoading(true);
    setError("");

    try {
      const savedUsername =
        localStorage.getItem("student_username") ||
        sessionStorage.getItem("student_username") ||
        "";

      const savedName =
        localStorage.getItem("student_name") ||
        sessionStorage.getItem("student_name") ||
        "";

      if (!savedUsername) {
        router.push("/student");
        return;
      }

      setUsername(savedUsername);
      setName(savedName);

      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id, student_name, student_username")
        .ilike("student_username", savedUsername.trim())
        .maybeSingle();

      if (studentError) {
        throw new Error(studentError.message);
      }

      if (!student) {
        setError("Student account not found.");
        setLoading(false);
        return;
      }

      setName(student.student_name || savedName || savedUsername);

      const { data: attendance, error: attendanceError } = await supabase
        .from("attendance")
        .select("id, attendance_date, status")
        .eq("student_id", student.id)
        .order("attendance_date", { ascending: false });

      if (attendanceError) {
        throw new Error(attendanceError.message);
      }

      setRecords(attendance || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load attendance."
      );
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("student_username");
    localStorage.removeItem("student_name");

    sessionStorage.removeItem("student_username");
    sessionStorage.removeItem("student_name");

    router.push("/student");
  }

  const presentCount = records.filter(
    (r) => r.status?.toLowerCase() === "present"
  ).length;

  const absentCount = records.filter(
    (r) => r.status?.toLowerCase() === "absent"
  ).length;

  const totalCount = records.length;

  const percentage =
    totalCount > 0
      ? Math.round((presentCount / totalCount) * 100)
      : 0;

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loadingCard}>
          <div style={styles.spinner}></div>
          <h2>Loading Attendance...</h2>
          <p>Please wait.</p>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Student Dashboard</h1>

            <p style={styles.subtitle}>
              Attendance Management System
            </p>
          </div>

          <button
            onClick={logout}
            style={styles.logoutButton}
          >
            Logout
          </button>
        </header>

        <section style={styles.profileCard}>
          <div style={styles.avatar}>
            {name
              ? name.charAt(0).toUpperCase()
              : "S"}
          </div>

          <div>
            <h2 style={styles.studentName}>
              {name || "Student"}
            </h2>

            <p style={styles.username}>
              Username: <strong>{username}</strong>
            </p>
          </div>
        </section>

        {error && (
          <div style={styles.error}>
            ❌ {error}
          </div>
        )}

        <section style={styles.statsGrid}>

          <StatCard
            icon="📚"
            title="Total Classes"
            value={String(totalCount)}
            text="Attendance records"
            background="linear-gradient(135deg,#2563eb,#1d4ed8)"
          />

          <StatCard
            icon="✅"
            title="Present"
            value={String(presentCount)}
            text="Classes attended"
            background="linear-gradient(135deg,#16a34a,#15803d)"
          />

          <StatCard
            icon="❌"
            title="Absent"
            value={String(absentCount)}
            text="Classes missed"
            background="linear-gradient(135deg,#dc2626,#b91c1c)"
          />

          <StatCard
            icon="📊"
            title="Attendance"
            value={`${percentage}%`}
            text="Overall attendance"
            background="linear-gradient(135deg,#7c3aed,#6d28d9)"
          />

        </section>

        <section style={styles.attendanceCard}>

          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                Attendance History
              </h2>

              <p style={styles.sectionSubtitle}>
                Your attendance records from Supabase
              </p>
            </div>

            <button
              onClick={loadStudent}
              style={styles.refreshButton}
            >
              🔄 Refresh
            </button>
          </div>

          {records.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>📅</div>

              <h3>No Attendance Found</h3>

              <p>
                Your teacher has not marked any attendance yet.
              </p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>#</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {records.map((record, index) => {
                    const isPresent =
                      record.status?.toLowerCase() ===
                      "present";

                    return (
                      <tr key={record.id || index}>

                        <td style={styles.td}>
                          {index + 1}
                        </td>

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
                              : "✗ Absent"}
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
          Student Attendance Management System © 2026
        </footer>

      </div>
    </main>
  );
}

function StatCard({
  icon,
  title,
  value,
  text,
  background,
}: {
  icon: string;
  title: string;
  value: string;
  text: string;
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

      <p style={styles.statTitle}>
        {title}
      </p>

      <h2 style={styles.statValue}>
        {value}
      </h2>

      <p style={styles.statText}>
        {text}
      </p>
    </div>
  );
}

function formatDate(dateString: string) {
  if (!dateString) return "-";

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

const styles: {
  [key: string]: React.CSSProperties;
} = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#eff6ff,#f8fafc)",
    padding: "25px 15px",
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
    borderRadius: "18px",
    padding: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
    marginBottom: "20px",
  },

  title: {
    margin: 0,
    color: "#1e3a8a",
    fontSize: "30px",
    fontWeight: "800",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  logoutButton: {
    border: "none",
    background: "#dc2626",
    color: "white",
    padding: "12px 20px",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
  },

  profileCard: {
    background: "white",
    borderRadius: "18px",
    padding: "25px",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
    marginBottom: "20px",
  },

  avatar: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    background:
      "linear-gradient(135deg,#2563eb,#4f46e5)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "30px",
    fontWeight: "800",
    flexShrink: 0,
  },

  studentName: {
    margin: 0,
    color: "#172554",
    fontSize: "24px",
  },

  username: {
    margin: "7px 0 0",
    color: "#64748b",
  },

  error: {
    background: "#fee2e2",
    border: "2px solid #fca5a5",
    color: "#991b1b",
    padding: "14px",
    borderRadius: "12px",
    marginBottom: "20px",
    fontWeight: "600",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(210px,1fr))",
    gap: "18px",
    marginBottom: "20px",
  },

  statCard: {
    color: "white",
    padding: "24px",
    borderRadius: "18px",
    boxShadow:
      "0 10px 25px rgba(15,23,42,0.12)",
  },

  statIcon: {
    fontSize: "30px",
  },

  statTitle: {
    margin: "12px 0 5px",
    opacity: 0.9,
    fontSize: "14px",
  },

  statValue: {
    fontSize: "32px",
    margin: 0,
  },

  statText: {
    fontSize: "13px",
    opacity: 0.85,
    marginBottom: 0,
  },

  attendanceCard: {
    background: "white",
    borderRadius: "18px",
    padding: "25px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "20px",
  },

  sectionTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "22px",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  refreshButton: {
    border: "none",
    background: "#2563eb",
    color: "white",
    padding: "11px 17px",
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
    borderCollapse: "collapse",
    minWidth: "500px",
  },

  th: {
    padding: "14px",
    textAlign: "left",
    color: "#1e3a8a",
    background: "#eff6ff",
    fontSize: "14px",
    borderBottom:
      "2px solid #dbeafe",
  },

  td: {
    padding: "14px",
    color: "#334155",
    fontSize: "14px",
    borderBottom:
      "1px solid #e2e8f0",
  },

  present: {
    display: "inline-block",
    background: "#dcfce7",
    color: "#166534",
    padding: "7px 12px",
    borderRadius: "999px",
    fontWeight: "700",
  },

  absent: {
    display: "inline-block",
    background: "#fee2e2",
    color: "#991b1b",
    padding: "7px 12px",
    borderRadius: "999px",
    fontWeight: "700",
  },

  empty: {
    textAlign: "center",
    padding: "50px 20px",
    color: "#64748b",
  },

  emptyIcon: {
    fontSize: "50px",
    marginBottom: "10px",
  },

  loadingCard: {
    maxWidth: "450px",
    margin: "100px auto",
    background: "white",
    padding: "40px",
    borderRadius: "20px",
    textAlign: "center",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.1)",
  },

  spinner: {
    width: "45px",
    height: "45px",
    border:
      "5px solid #dbeafe",
    borderTop:
      "5px solid #2563eb",
    borderRadius: "50%",
    margin: "0 auto 20px",
    animation:
      "spin 1s linear infinite",
  },

  footer: {
    textAlign: "center",
    color: "#64748b",
    padding: "25px 10px",
    fontSize: "13px",
  },
};