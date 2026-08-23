"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const router = useRouter();

  const [loginType, setLoginType] = useState<"student" | "teacher">(
    "student"
  );

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setError("");

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setError("Username aur password dono enter karein.");
      return;
    }

    setLoading(true);

    try {
      /*
       * =========================================================
       * STUDENT LOGIN
       * =========================================================
       */

      if (loginType === "student") {
        const { data, error } = await supabase.rpc("student_login", {
          p_username: cleanUsername,
          p_password: cleanPassword,
        });

        if (error) {
          console.error("Student login error:", error);
          setError("Invalid student username or password.");
          return;
        }

        if (!data || (Array.isArray(data) && data.length === 0)) {
          setError("Invalid student username or password.");
          return;
        }

        const student = Array.isArray(data) ? data[0] : data;

        /*
         * IMPORTANT:
         * Student login ke liye sirf student session save hoga.
         * Teacher session kabhi save nahi hoga.
         */

        localStorage.removeItem("teacherLoggedIn");
        localStorage.removeItem("teacherName");
        localStorage.removeItem("teacher_name");
        localStorage.removeItem("teacher_username");

        localStorage.setItem("studentLoggedIn", "true");
        localStorage.setItem(
          "student_username",
          student?.student_username || cleanUsername
        );

        localStorage.setItem(
          "student_name",
          student?.student_name || cleanUsername
        );

        if (student?.id !== undefined && student?.id !== null) {
          localStorage.setItem(
            "student_id",
            String(student.id)
          );
        }

        sessionStorage.removeItem("teacherLoggedIn");
        sessionStorage.removeItem("teacher_username");
        sessionStorage.removeItem("teacherName");

        sessionStorage.setItem("studentLoggedIn", "true");
        sessionStorage.setItem(
          "student_username",
          student?.student_username || cleanUsername
        );

        sessionStorage.setItem(
          "student_name",
          student?.student_name || cleanUsername
        );

        if (student?.id !== undefined && student?.id !== null) {
          sessionStorage.setItem(
            "student_id",
            String(student.id)
          );
        }

        router.replace("/student/dashboard");
        return;
      }

      /*
       * =========================================================
       * TEACHER LOGIN
       * =========================================================
       */

      const { data, error } = await supabase.rpc("teacher_login", {
        p_username: cleanUsername,
        p_password: cleanPassword,
      });

      if (error) {
        console.error("Teacher login error:", error);
        setError("Invalid teacher username or password.");
        return;
      }

      if (!data || (Array.isArray(data) && data.length === 0)) {
        setError("Invalid teacher username or password.");
        return;
      }

      const teacher = Array.isArray(data) ? data[0] : data;

      /*
       * IMPORTANT:
       * Teacher login ke liye student session remove hoga.
       */

      localStorage.removeItem("studentLoggedIn");
      localStorage.removeItem("student_username");
      localStorage.removeItem("student_name");
      localStorage.removeItem("student_id");

      localStorage.setItem("teacherLoggedIn", "true");

      localStorage.setItem(
        "teacher_username",
        teacher?.teacher_username || cleanUsername
      );

      localStorage.setItem(
        "teacherName",
        teacher?.teacher_name ||
          teacher?.name ||
          cleanUsername
      );

      localStorage.setItem(
        "teacher_name",
        teacher?.teacher_name ||
          teacher?.name ||
          cleanUsername
      );

      sessionStorage.removeItem("studentLoggedIn");
      sessionStorage.removeItem("student_username");
      sessionStorage.removeItem("student_name");
      sessionStorage.removeItem("student_id");

      sessionStorage.setItem("teacherLoggedIn", "true");

      sessionStorage.setItem(
        "teacher_username",
        teacher?.teacher_username || cleanUsername
      );

      sessionStorage.setItem(
        "teacherName",
        teacher?.teacher_name ||
          teacher?.name ||
          cleanUsername
      );

      router.replace("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>

        {/* LOGO */}
        <div style={styles.logo}>
          🎓
        </div>

        <h1 style={styles.title}>
          Attendance Portal
        </h1>

        <p style={styles.subtitle}>
          Login to continue
        </p>

        {/* LOGIN TYPE */}
        <div style={styles.tabs}>
          <button
            type="button"
            onClick={() => {
              setLoginType("student");
              setError("");
              setUsername("");
              setPassword("");
            }}
            style={{
              ...styles.tab,
              ...(loginType === "student"
                ? styles.activeTab
                : {}),
            }}
          >
            👨‍🎓 Student
          </button>

          <button
            type="button"
            onClick={() => {
              setLoginType("teacher");
              setError("");
              setUsername("");
              setPassword("");
            }}
            style={{
              ...styles.tab,
              ...(loginType === "teacher"
                ? styles.activeTab
                : {}),
            }}
          >
            👨‍🏫 Teacher
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div style={styles.error}>
            ⚠️ {error}
          </div>
        )}

        {/* LOGIN FORM */}
        <form onSubmit={handleLogin}>

          <label style={styles.label}>
            Username
          </label>

          <input
            type="text"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value)
            }
            placeholder={
              loginType === "student"
                ? "Enter student username"
                : "Enter teacher username"
            }
            autoComplete="username"
            style={styles.input}
          />

          <label style={styles.label}>
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="Enter password"
            autoComplete="current-password"
            style={styles.input}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.loginButton,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? "⏳ Logging in..."
              : loginType === "student"
              ? "🎓 Student Login"
              : "👨‍🏫 Teacher Login"}
          </button>
        </form>

        {/* INFORMATION */}
        <div style={styles.info}>
          {loginType === "student" ? (
            <>
              <strong>Student Portal</strong>
              <span>
                View your attendance, profile,
                reports, fees and calendar.
              </span>
            </>
          ) : (
            <>
              <strong>Teacher Portal</strong>
              <span>
                Manage students, attendance,
                fees, reports and settings.
              </span>
            </>
          )}
        </div>

        <footer style={styles.footer}>
          Student Attendance Management System
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
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    boxSizing: "border-box",
    background:
      "linear-gradient(135deg,#eef2ff,#f8fafc,#eff6ff)",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  card: {
    width: "100%",
    maxWidth: "430px",
    background: "#ffffff",
    borderRadius: "24px",
    padding: "32px",
    boxSizing: "border-box",
    boxShadow:
      "0 20px 50px rgba(15,23,42,0.12)",
  },

  logo: {
    width: "72px",
    height: "72px",
    borderRadius: "20px",
    margin: "0 auto 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "38px",
    background:
      "linear-gradient(135deg,#2563eb,#7c3aed)",
  },

  title: {
    margin: 0,
    textAlign: "center",
    color: "#172554",
    fontSize: "28px",
    fontWeight: "900",
  },

  subtitle: {
    margin: "7px 0 24px",
    textAlign: "center",
    color: "#64748b",
    fontSize: "14px",
    fontWeight: "600",
  },

  tabs: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
    padding: "5px",
    background: "#f1f5f9",
    borderRadius: "12px",
    marginBottom: "20px",
  },

  tab: {
    border: "none",
    background: "transparent",
    color: "#475569",
    padding: "12px 8px",
    borderRadius: "9px",
    fontWeight: "800",
    cursor: "pointer",
    fontSize: "13px",
  },

  activeTab: {
    background: "#ffffff",
    color: "#1d4ed8",
    boxShadow:
      "0 3px 10px rgba(15,23,42,0.08)",
  },

  error: {
    background: "#fee2e2",
    border: "1px solid #fecaca",
    color: "#991b1b",
    borderRadius: "10px",
    padding: "11px",
    marginBottom: "16px",
    fontSize: "13px",
    fontWeight: "700",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    marginTop: "14px",
    color: "#334155",
    fontSize: "13px",
    fontWeight: "800",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    borderRadius: "10px",
    padding: "13px 14px",
    fontSize: "14px",
    outline: "none",
  },

  loginButton: {
    width: "100%",
    border: "none",
    marginTop: "22px",
    background:
      "linear-gradient(135deg,#2563eb,#4f46e5)",
    color: "#ffffff",
    padding: "14px",
    borderRadius: "11px",
    fontWeight: "900",
    fontSize: "14px",
    cursor: "pointer",
  },

  info: {
    marginTop: "20px",
    padding: "14px",
    borderRadius: "12px",
    background: "#eff6ff",
    border: "1px solid #dbeafe",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    color: "#1e3a8a",
    fontSize: "12px",
    lineHeight: 1.5,
  },

  footer: {
    textAlign: "center",
    marginTop: "22px",
    color: "#94a3b8",
    fontSize: "11px",
    fontWeight: "600",
  },
};