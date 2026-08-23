"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function StudentSettingsPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [studentName, setStudentName] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
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
  }, []);

  function updateName() {
    setError("");
    setMessage("");

    const name = studentName.trim();

    if (!name) {
      setError("Please enter your name.");
      return;
    }

    localStorage.setItem("studentName", name);
    localStorage.setItem("student_name", name);

    setMessage("Name updated successfully.");
  }

  async function changePassword(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!newPassword || !confirmPassword) {
      setError("Please enter new password and confirm password.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    if (!username) {
      setError("Student username not found. Please login again.");
      return;
    }

    setSaving(true);

    try {
      /*
        IMPORTANT:
        Password change is sent through the existing
        student_change_password Supabase RPC if available.
      */

      const { createClient } = await import("@supabase/supabase-js");

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

      const { error: rpcError } =
        await supabase.rpc(
          "student_change_password",
          {
            p_username: username,
            p_new_password: newPassword,
          }
        );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      setNewPassword("");
      setConfirmPassword("");

      setMessage(
        "Password changed successfully."
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to change password.";

      setError(message);
    } finally {
      setSaving(false);
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

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}
        <header style={styles.header}>

          <div style={styles.headerLeft}>

            <div style={styles.logo}>
              ⚙️
            </div>

            <div>
              <h1 style={styles.title}>
                Student Settings
              </h1>

              <p style={styles.subtitle}>
                Manage your student account settings
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

        {/* PROFILE */}
        <section style={styles.card}>

          <div style={styles.cardHeader}>

            <div style={styles.cardIcon}>
              👨‍🎓
            </div>

            <div>
              <h2 style={styles.cardTitle}>
                Profile Information
              </h2>

              <p style={styles.cardSubtitle}>
                Update your basic student information
              </p>
            </div>

          </div>

          <div style={styles.formGrid}>

            <div>
              <label style={styles.label}>
                Username
              </label>

              <input
                type="text"
                value={username}
                readOnly
                style={{
                  ...styles.input,
                  background: "#f1f5f9",
                  cursor: "not-allowed",
                }}
              />

              <p style={styles.helpText}>
                Username cannot be changed.
              </p>
            </div>

            <div>
              <label style={styles.label}>
                Student Name
              </label>

              <input
                type="text"
                value={studentName}
                onChange={(e) =>
                  setStudentName(e.target.value)
                }
                placeholder="Enter your name"
                style={styles.input}
              />
            </div>

          </div>

          <button
            type="button"
            onClick={updateName}
            style={styles.primaryButton}
          >
            💾 Save Name
          </button>

        </section>

        {/* PASSWORD */}
        <section style={styles.card}>

          <div style={styles.cardHeader}>

            <div style={styles.cardIcon}>
              🔐
            </div>

            <div>
              <h2 style={styles.cardTitle}>
                Change Password
              </h2>

              <p style={styles.cardSubtitle}>
                Create a new password for your account
              </p>
            </div>

          </div>

          <div style={styles.securityNotice}>
            <div style={styles.noticeIcon}>
              🛡️
            </div>

            <div>
              <strong style={styles.noticeTitle}>
                Keep your account secure
              </strong>

              <p style={styles.noticeText}>
                Use a strong password with at least
                6 characters. Do not share your
                password with anyone.
              </p>
            </div>
          </div>

          <form onSubmit={changePassword}>

            <div style={styles.passwordGrid}>

              <div>
                <label style={styles.label}>
                  Username
                </label>

                <input
                  type="text"
                  value={username}
                  readOnly
                  style={{
                    ...styles.input,
                    background: "#f1f5f9",
                    cursor: "not-allowed",
                  }}
                />
              </div>

              <div>
                <label style={styles.label}>
                  New Password
                </label>

                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) =>
                    setNewPassword(e.target.value)
                  }
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>
                  Confirm Password
                </label>

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  style={styles.input}
                />
              </div>

            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                ...styles.primaryButton,
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving
                ? "Changing Password..."
                : "🔑 Change Password"}
            </button>

          </form>

        </section>

        {/* MESSAGES */}
        {message && (
          <div style={styles.success}>
            <span>✅</span>
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div style={styles.error}>
            <span>❌</span>
            <span>{error}</span>
          </div>
        )}

        {/* ACCOUNT */}
        <section style={styles.card}>

          <div style={styles.cardHeader}>

            <div style={styles.cardIcon}>
              👤
            </div>

            <div>
              <h2 style={styles.cardTitle}>
                Account
              </h2>

              <p style={styles.cardSubtitle}>
                Manage your current session
              </p>
            </div>

          </div>

          <div style={styles.accountBox}>

            <div>
              <strong style={styles.accountTitle}>
                Logout from Student Portal
              </strong>

              <p style={styles.accountText}>
                You will need to login again to access
                your student dashboard.
              </p>
            </div>

            <button
              onClick={logout}
              style={styles.logoutButton}
            >
              🚪 Logout
            </button>

          </div>

        </section>

        {/* FOOTER */}
        <footer style={styles.footer}>
          <strong>
            Attendance Portal
          </strong>

          <span>
            Student Settings • 2026
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

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(260px,1fr))",
    gap: "18px",
    marginBottom: "20px",
  },

  passwordGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(260px,1fr))",
    gap: "18px",
    marginTop: "20px",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    color: "#334155",
    fontSize: "14px",
    fontWeight: "700",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 13px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    background: "white",
    color: "#111827",
    fontSize: "15px",
    outline: "none",
  },

  helpText: {
    margin: "6px 0 0",
    color: "#94a3b8",
    fontSize: "11px",
  },

  primaryButton: {
    border: "none",
    background:
      "linear-gradient(135deg,#2563eb,#4f46e5)",
    color: "white",
    padding: "12px 20px",
    borderRadius: "10px",
    fontWeight: "700",
    fontSize: "14px",
    cursor: "pointer",
  },

  securityNotice: {
    background: "#eff6ff",
    border: "1px solid #dbeafe",
    borderRadius: "14px",
    padding: "15px",
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
  },

  noticeIcon: {
    fontSize: "23px",
  },

  noticeTitle: {
    color: "#1e3a8a",
    fontSize: "14px",
  },

  noticeText: {
    margin: "5px 0 0",
    color: "#475569",
    fontSize: "12px",
    lineHeight: 1.5,
  },

  success: {
    background: "#dcfce7",
    border: "1px solid #bbf7d0",
    color: "#166534",
    padding: "14px 16px",
    borderRadius: "12px",
    marginBottom: "20px",
    display: "flex",
    gap: "10px",
    fontWeight: "600",
  },

  error: {
    background: "#fee2e2",
    border: "1px solid #fecaca",
    color: "#991b1b",
    padding: "14px 16px",
    borderRadius: "12px",
    marginBottom: "20px",
    display: "flex",
    gap: "10px",
    fontWeight: "600",
  },

  accountBox: {
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    borderRadius: "14px",
    padding: "17px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    flexWrap: "wrap",
  },

  accountTitle: {
    color: "#334155",
    fontSize: "14px",
  },

  accountText: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "12px",
  },

  logoutButton: {
    border: "none",
    background: "#dc2626",
    color: "white",
    padding: "11px 18px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },

  footer: {
    padding: "20px 10px",
    textAlign: "center",
    color: "#64748b",
    fontSize: "12px",
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
};