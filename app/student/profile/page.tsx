"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type Student = {
  id: number;
  student_name: string | null;
  student_username: string;
  admission_date: string | null;
};

export default function StudentProfilePage() {
  const router = useRouter();

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadStudent();
  }, []);

  async function loadStudent() {
    setLoading(true);
    setError("");

    try {
      const username =
        localStorage.getItem("student_username") ||
        localStorage.getItem("studentUsername");

      if (!username) {
        setError("Student login information not found.");
        setLoading(false);
        return;
      }

      const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL;

      const supabaseAnonKey =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
          "Supabase environment variables are missing."
        );
      }

      const supabase = createClient(
        supabaseUrl,
        supabaseAnonKey
      );

      const { data, error: studentError } =
        await supabase
          .from("students")
          .select(
            "id, student_name, student_username, admission_date"
          )
          .eq("student_username", username)
          .maybeSingle();

      if (studentError) {
        throw new Error(studentError.message);
      }

      if (!data) {
        setError("Student profile not found.");
        setLoading(false);
        return;
      }

      setStudent(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load student profile."
      );
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("studentLoggedIn");
    localStorage.removeItem("student_username");
    localStorage.removeItem("studentUsername");
    localStorage.removeItem("studentName");
    localStorage.removeItem("student_name");

    sessionStorage.clear();

    router.push("/");
  }

  function formatDate(date: string | null) {
    if (!date) return "Not available";

    const formatted = new Date(date);

    if (Number.isNaN(formatted.getTime())) {
      return date;
    }

    return formatted.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          <div style={styles.loadingIcon}>👨‍🎓</div>
          <h2 style={styles.loadingTitle}>
            Loading Profile...
          </h2>
          <p style={styles.loadingText}>
            Please wait while we load your information.
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main style={styles.page}>
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>⚠️</div>

          <h2 style={styles.errorTitle}>
            Unable to Load Profile
          </h2>

          <p style={styles.errorText}>
            {error}
          </p>

          <div style={styles.errorActions}>
            <button
              onClick={loadStudent}
              style={styles.primaryButton}
            >
              🔄 Try Again
            </button>

            <button
              onClick={() =>
                router.push("/student/dashboard")
              }
              style={styles.secondaryButton}
            >
              ← Dashboard
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}

        <header style={styles.header}>

          <div style={styles.headerLeft}>

            <div style={styles.logo}>
              👨‍🎓
            </div>

            <div>
              <h1 style={styles.title}>
                My Profile
              </h1>

              <p style={styles.subtitle}>
                View your student information
              </p>
            </div>

          </div>

          <button
            onClick={() =>
              router.push("/student/dashboard")
            }
            style={styles.dashboardButton}
          >
            ← Student Dashboard
          </button>

        </header>

        {/* PROFILE HERO */}

        <section style={styles.profileHero}>

          <div style={styles.avatar}>
            {student?.student_name
              ? student.student_name
                  .charAt(0)
                  .toUpperCase()
              : "S"}
          </div>

          <div style={styles.profileHeroContent}>

            <p style={styles.profileSmall}>
              STUDENT PROFILE
            </p>

            <h2 style={styles.profileName}>
              {student?.student_name ||
                "Student"}
            </h2>

            <p style={styles.profileUsername}>
              @{student?.student_username}
            </p>

          </div>

          <div style={styles.profileBadge}>
            ✓ Active Student
          </div>

        </section>

        {/* INFORMATION */}

        <section style={styles.card}>

          <div style={styles.cardHeader}>

            <div style={styles.cardIcon}>
              📋
            </div>

            <div>
              <h2 style={styles.cardTitle}>
                Personal Information
              </h2>

              <p style={styles.cardSubtitle}>
                Your registered student details
              </p>
            </div>

          </div>

          <div style={styles.infoGrid}>

            <InfoBox
              icon="👤"
              label="Student Name"
              value={
                student?.student_name ||
                "Not available"
              }
            />

            <InfoBox
              icon="🔑"
              label="Username"
              value={
                student?.student_username ||
                "Not available"
              }
            />

            <InfoBox
              icon="🆔"
              label="Student ID"
              value={
                student?.id
                  ? String(student.id)
                  : "Not available"
              }
            />

            <InfoBox
              icon="📅"
              label="Admission Date"
              value={formatDate(
                student?.admission_date || null
              )}
            />

          </div>

        </section>

        {/* ACCOUNT STATUS */}

        <section style={styles.card}>

          <div style={styles.cardHeader}>

            <div style={styles.cardIcon}>
              🛡️
            </div>

            <div>
              <h2 style={styles.cardTitle}>
                Account Status
              </h2>

              <p style={styles.cardSubtitle}>
                Current status of your student account
              </p>
            </div>

          </div>

          <div style={styles.statusBox}>

            <div style={styles.statusLeft}>

              <div style={styles.statusCircle}>
                ✓
              </div>

              <div>
                <strong style={styles.statusTitle}>
                  Account Active
                </strong>

                <p style={styles.statusText}>
                  Your student account is currently
                  active and available for use.
                </p>
              </div>

            </div>

            <span style={styles.activeBadge}>
              ACTIVE
            </span>

          </div>

        </section>

        {/* QUICK ACTIONS */}

        <section style={styles.card}>

          <div style={styles.cardHeader}>

            <div style={styles.cardIcon}>
              ⚡
            </div>

            <div>
              <h2 style={styles.cardTitle}>
                Quick Actions
              </h2>

              <p style={styles.cardSubtitle}>
                Quickly access your student portal
              </p>
            </div>

          </div>

          <div style={styles.actionGrid}>

            <button
              onClick={() =>
                router.push("/student/attendance")
              }
              style={styles.actionButton}
            >
              <span style={styles.actionIcon}>
                📝
              </span>

              <span>
                <strong>
                  Attendance
                </strong>

                <small>
                  View attendance
                </small>
              </span>

              <span style={styles.actionArrow}>
                →
              </span>
            </button>

            <button
              onClick={() =>
                router.push("/student/fees")
              }
              style={styles.actionButton}
            >
              <span style={styles.actionIcon}>
                💰
              </span>

              <span>
                <strong>
                  Fees
                </strong>

                <small>
                  View fee details
                </small>
              </span>

              <span style={styles.actionArrow}>
                →
              </span>
            </button>

            <button
              onClick={() =>
                router.push("/student/calendar")
              }
              style={styles.actionButton}
            >
              <span style={styles.actionIcon}>
                🗓️
              </span>

              <span>
                <strong>
                  Calendar
                </strong>

                <small>
                  Classes & dates
                </small>
              </span>

              <span style={styles.actionArrow}>
                →
              </span>
            </button>

            <button
              onClick={() =>
                router.push("/student/settings")
              }
              style={styles.actionButton}
            >
              <span style={styles.actionIcon}>
                ⚙️
              </span>

              <span>
                <strong>
                  Settings
                </strong>

                <small>
                  Account settings
                </small>
              </span>

              <span style={styles.actionArrow}>
                →
              </span>
            </button>

          </div>

        </section>

        {/* SECURITY */}

        <section style={styles.securityCard}>

          <div style={styles.securityIcon}>
            🔐
          </div>

          <div style={styles.securityContent}>

            <h3 style={styles.securityTitle}>
              Keep Your Account Secure
            </h3>

            <p style={styles.securityText}>
              Never share your username or password
              with anyone. You can change your password
              anytime from Student Settings.
            </p>

            <button
              onClick={() =>
                router.push("/student/settings")
              }
              style={styles.securityButton}
            >
              Change Password →
            </button>

          </div>

        </section>

        {/* LOGOUT */}

        <section style={styles.logoutCard}>

          <div>
            <h3 style={styles.logoutTitle}>
              🚪 Logout
            </h3>

            <p style={styles.logoutText}>
              Sign out from your student account.
            </p>
          </div>

          <button
            onClick={logout}
            style={styles.logoutButton}
          >
            Logout
          </button>

        </section>

        {/* FOOTER */}

        <footer style={styles.footer}>

          <strong>
            Attendance Portal
          </strong>

          <span>
            Student Profile • 2026
          </span>

        </footer>

      </div>
    </main>
  );
}

function InfoBox({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div style={styles.infoBox}>

      <div style={styles.infoIcon}>
        {icon}
      </div>

      <div>
        <p style={styles.infoLabel}>
          {label}
        </p>

        <p style={styles.infoValue}>
          {value}
        </p>
      </div>

    </div>
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
    maxWidth: "1050px",
    margin: "0 auto",
  },

  header: {
    background: "white",
    borderRadius: "20px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    flexWrap: "wrap",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
  },

  logo: {
    width: "55px",
    height: "55px",
    borderRadius: "16px",
    background:
      "linear-gradient(135deg,#2563eb,#7c3aed)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
  },

  title: {
    margin: 0,
    color: "#172554",
    fontSize: "25px",
    fontWeight: "800",
  },

  subtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  dashboardButton: {
    border: "none",
    background: "#1e3a8a",
    color: "white",
    padding: "11px 17px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },

  profileHero: {
    background:
      "linear-gradient(135deg,#1d4ed8,#4338ca,#7c3aed)",
    color: "white",
    borderRadius: "22px",
    padding: "28px",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    marginBottom: "20px",
    boxShadow:
      "0 15px 35px rgba(37,99,235,0.20)",
  },

  avatar: {
    width: "82px",
    height: "82px",
    borderRadius: "24px",
    background: "rgba(255,255,255,0.18)",
    border: "2px solid rgba(255,255,255,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "38px",
    fontWeight: "800",
    flexShrink: 0,
  },

  profileHeroContent: {
    flex: 1,
  },

  profileSmall: {
    margin: 0,
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "2px",
    opacity: 0.8,
  },

  profileName: {
    margin: "5px 0",
    fontSize: "29px",
    fontWeight: "800",
  },

  profileUsername: {
    margin: 0,
    fontSize: "14px",
    opacity: 0.85,
  },

  profileBadge: {
    background: "rgba(255,255,255,0.16)",
    border:
      "1px solid rgba(255,255,255,0.25)",
    padding: "9px 13px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "700",
    whiteSpace: "nowrap",
  },

  card: {
    background: "white",
    borderRadius: "20px",
    padding: "25px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    marginBottom: "22px",
  },

  cardIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "14px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
  },

  cardTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "20px",
    fontWeight: "800",
  },

  cardSubtitle: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(240px,1fr))",
    gap: "15px",
  },

  infoBox: {
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    borderRadius: "14px",
    padding: "17px",
    display: "flex",
    alignItems: "center",
    gap: "13px",
  },

  infoIcon: {
    width: "43px",
    height: "43px",
    borderRadius: "12px",
    background: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "21px",
    flexShrink: 0,
  },

  infoLabel: {
    margin: 0,
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "700",
  },

  infoValue: {
    margin: "4px 0 0",
    color: "#172554",
    fontSize: "15px",
    fontWeight: "800",
  },

  statusBox: {
    border:
      "1px solid #bbf7d0",
    background: "#f0fdf4",
    borderRadius: "15px",
    padding: "17px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    flexWrap: "wrap",
  },

  statusLeft: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
  },

  statusCircle: {
    width: "45px",
    height: "45px",
    borderRadius: "50%",
    background: "#16a34a",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
    fontSize: "20px",
  },

  statusTitle: {
    color: "#166534",
    fontSize: "15px",
  },

  statusText: {
    margin: "4px 0 0",
    color: "#4d7c5b",
    fontSize: "12px",
  },

  activeBadge: {
    background: "#16a34a",
    color: "white",
    padding: "8px 12px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "800",
  },

  actionGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: "12px",
  },

  actionButton: {
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    borderRadius: "14px",
    padding: "14px",
    display: "flex",
    alignItems: "center",
    gap: "11px",
    textAlign: "left",
    cursor: "pointer",
    color: "#172554",
  },

  actionIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    background: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "21px",
    flexShrink: 0,
  },

  actionArrow: {
    marginLeft: "auto",
    color: "#2563eb",
    fontSize: "20px",
    fontWeight: "800",
  },

  securityCard: {
    background:
      "linear-gradient(135deg,#eff6ff,#eef2ff)",
    border: "1px solid #dbeafe",
    borderRadius: "20px",
    padding: "22px",
    display: "flex",
    alignItems: "flex-start",
    gap: "15px",
    marginBottom: "20px",
  },

  securityIcon: {
    fontSize: "30px",
  },

  securityContent: {
    flex: 1,
  },

  securityTitle: {
    margin: 0,
    color: "#1e3a8a",
    fontSize: "17px",
  },

  securityText: {
    margin: "7px 0 12px",
    color: "#475569",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  securityButton: {
    border: "none",
    background: "#2563eb",
    color: "white",
    padding: "10px 15px",
    borderRadius: "9px",
    fontWeight: "700",
    cursor: "pointer",
  },

  logoutCard: {
    background: "white",
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    flexWrap: "wrap",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
  },

  logoutTitle: {
    margin: 0,
    color: "#334155",
    fontSize: "16px",
  },

  logoutText: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "12px",
  },

  logoutButton: {
    border: "none",
    background: "#dc2626",
    color: "white",
    padding: "11px 20px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },

  footer: {
    padding: "25px 10px 10px",
    textAlign: "center",
    color: "#64748b",
    fontSize: "12px",
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    flexWrap: "wrap",
  },

  loading: {
    background: "white",
    maxWidth: "450px",
    margin: "100px auto",
    padding: "40px",
    borderRadius: "20px",
    textAlign: "center",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
  },

  loadingIcon: {
    fontSize: "50px",
  },

  loadingTitle: {
    color: "#172554",
    margin: "15px 0 5px",
  },

  loadingText: {
    color: "#64748b",
    margin: 0,
    fontSize: "13px",
  },

  errorCard: {
    background: "white",
    maxWidth: "500px",
    margin: "80px auto",
    padding: "35px",
    borderRadius: "20px",
    textAlign: "center",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
  },

  errorIcon: {
    fontSize: "45px",
  },

  errorTitle: {
    color: "#991b1b",
    margin: "12px 0 7px",
  },

  errorText: {
    color: "#64748b",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  errorActions: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "20px",
  },

  primaryButton: {
    border: "none",
    background: "#2563eb",
    color: "white",
    padding: "11px 18px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },

  secondaryButton: {
    border: "none",
    background: "#e2e8f0",
    color: "#334155",
    padding: "11px 18px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },
};