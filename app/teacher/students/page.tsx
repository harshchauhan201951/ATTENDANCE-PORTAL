"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Student = {
  id: number;
  student_name: string | null;
  student_username: string;
  admission_date: string | null;
  date_of_birth: string | null;
  father_name: string | null;
  mother_name: string | null;
  father_phone: string | null;
  mother_phone: string | null;
  address: string | null;
  city: string | null;
  class_name: string | null;
  blood_group: string | null;
};

export default function StudentProfilePage() {
  const [student, setStudent] = useState<Student | null>(null);

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadStudent();
  }, []);

  async function loadStudent() {
    setLoading(true);
    setError("");

    try {
      /*
       * Student login ke time commonly username
       * localStorage mein save hota hai.
       *
       * Hum multiple possible keys check kar rahe hain
       * taaki existing login system disturb na ho.
       */

      const possibleKeys = [
        "student_username",
        "studentUsername",
        "username",
        "student",
        "loggedInStudent",
      ];

      let username = "";

      for (const key of possibleKeys) {
        const value = localStorage.getItem(key);

        if (!value) continue;

        try {
          const parsed = JSON.parse(value);

          if (typeof parsed === "string") {
            username = parsed;
          } else if (parsed?.student_username) {
            username = parsed.student_username;
          } else if (parsed?.username) {
            username = parsed.username;
          }
        } catch {
          username = value;
        }

        if (username) break;
      }

      username = username.trim().toUpperCase();

      if (!username) {
        setError(
          "Student login information nahi mili. Please login again."
        );
        setLoading(false);
        return;
      }

      const { data, error: studentError } = await supabase
        .from("students")
        .select(`
          id,
          student_name,
          student_username,
          admission_date,
          date_of_birth,
          father_name,
          mother_name,
          father_phone,
          mother_phone,
          address,
          city,
          class_name,
          blood_group
        `)
        .eq("student_username", username)
        .maybeSingle();

      if (studentError) {
        throw studentError;
      }

      if (!data) {
        setError("Student profile nahi mila. Please login again.");
        setLoading(false);
        return;
      }

      setStudent(data as Student);
    } catch (err: any) {
      console.error("Student profile error:", err);

      setError(
        err?.message ||
          "Student profile load nahi ho saka."
      );
    } finally {
      setLoading(false);
    }
  }

  async function updatePassword() {
    setMessage("");
    setError("");

    const password = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (!student) {
      setError("Student profile available nahi hai.");
      return;
    }

    if (!password) {
      setError("Please New Password enter karo.");
      return;
    }

    if (!confirm) {
      setError("Please Confirm Password enter karo.");
      return;
    }

    if (password.length < 4) {
      setError(
        "Password kam se kam 4 characters ka hona chahiye."
      );
      return;
    }

    if (password !== confirm) {
      setError(
        "New Password aur Confirm Password same nahi hain."
      );
      return;
    }

    setUpdating(true);

    try {
      /*
       * IMPORTANT:
       * Supabase RPC database mein password ko
       * securely hash karke update karega.
       */

      const { error: rpcError } = await supabase.rpc(
        "update_student_password",
        {
          p_student_id: student.id,
          p_password: password,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      setNewPassword("");
      setConfirmPassword("");

      setMessage(
        "✅ Password successfully updated!"
      );
    } catch (err: any) {
      console.error("Password update error:", err);

      setError(
        err?.message ||
          "Password update nahi ho saka."
      );
    } finally {
      setUpdating(false);
    }
  }

  function logout() {
    const keys = [
      "student_username",
      "studentUsername",
      "username",
      "student",
      "loggedInStudent",
    ];

    keys.forEach((key) => {
      localStorage.removeItem(key);
    });

    window.location.href = "/";
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingIcon}>⏳</div>

          <h2 style={styles.loadingTitle}>
            Loading Profile...
          </h2>

          <p style={styles.loadingText}>
            Please wait while we load your profile.
          </p>
        </div>
      </main>
    );
  }

  if (!student) {
    return (
      <main style={styles.page}>
        <div style={styles.errorCard}>
          <div style={styles.bigIcon}>⚠️</div>

          <h2 style={styles.errorTitle}>
            Profile Not Found
          </h2>

          <p style={styles.errorText}>
            {error || "Student information not available."}
          </p>

          <button
            onClick={() => {
              window.location.href = "/";
            }}
            style={styles.loginButton}
          >
            ← Back to Login
          </button>
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
            <div style={styles.badge}>
              RACER ACADEMY
            </div>

            <h1 style={styles.title}>
              👨‍🎓 Student Profile
            </h1>

            <p style={styles.subtitle}>
              Manage your profile and account password
            </p>
          </div>

          <button
            onClick={() => window.history.back()}
            style={styles.backButton}
          >
            ← Back
          </button>
        </header>

        {/* ERROR */}

        {error && (
          <div style={styles.errorBox}>
            ⚠️ {error}
          </div>
        )}

        {/* SUCCESS */}

        {message && (
          <div style={styles.successBox}>
            {message}
          </div>
        )}

        <div style={styles.grid}>

          {/* PROFILE CARD */}

          <section style={styles.profileCard}>
            <div style={styles.profileTop}>

              <div style={styles.avatar}>
                {(student.student_name || "S")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <h2 style={styles.studentName}>
                  {student.student_name || "Student"}
                </h2>

                <div style={styles.usernameBadge}>
                  {student.student_username}
                </div>
              </div>
            </div>

            <div style={styles.profileDivider} />

            <div style={styles.detailsGrid}>

              <ProfileItem
                label="Student Name"
                value={student.student_name}
              />

              <ProfileItem
                label="Username"
                value={student.student_username}
              />

              <ProfileItem
                label="Class"
                value={student.class_name}
              />

              <ProfileItem
                label="Blood Group"
                value={student.blood_group}
              />

              <ProfileItem
                label="Date of Birth"
                value={formatDate(student.date_of_birth)}
              />

              <ProfileItem
                label="Admission Date"
                value={formatDate(student.admission_date)}
              />

              <ProfileItem
                label="Father's Name"
                value={student.father_name}
              />

              <ProfileItem
                label="Mother's Name"
                value={student.mother_name}
              />

              <ProfileItem
                label="Father's Phone"
                value={student.father_phone}
              />

              <ProfileItem
                label="Mother's Phone"
                value={student.mother_phone}
              />

              <ProfileItem
                label="City"
                value={student.city}
              />

              <ProfileItem
                label="Address"
                value={student.address}
              />

            </div>
          </section>

          {/* PASSWORD CARD */}

          <section style={styles.passwordCard}>

            <div style={styles.passwordIcon}>
              🔐
            </div>

            <h2 style={styles.passwordTitle}>
              Update Password
            </h2>

            <p style={styles.passwordDescription}>
              Change your student account password
              securely.
            </p>

            {/* USERNAME */}

            <div style={styles.field}>
              <label style={styles.label}>
                Username
              </label>

              <input
                value={student.student_username}
                readOnly
                style={{
                  ...styles.input,
                  background: "#f1f5f9",
                  cursor: "not-allowed",
                }}
              />

              <small style={styles.helpText}>
                Username cannot be changed here.
              </small>
            </div>

            {/* NEW PASSWORD */}

            <div style={styles.field}>
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
                style={styles.input}
                autoComplete="new-password"
              />
            </div>

            {/* CONFIRM PASSWORD */}

            <div style={styles.field}>
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
                style={styles.input}
                autoComplete="new-password"
              />
            </div>

            <div style={styles.passwordRule}>
              🔒 Password must contain at least 4
              characters.
            </div>

            <button
              onClick={updatePassword}
              disabled={updating}
              style={{
                ...styles.updateButton,
                opacity: updating ? 0.7 : 1,
                cursor: updating
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {updating
                ? "⏳ Updating Password..."
                : "🔐 Update Password"}
            </button>

            <div style={styles.securityNote}>
              🛡️ Your password is securely stored
              in the database.
            </div>

          </section>
        </div>

        {/* LOGOUT */}

        <div style={styles.logoutArea}>
          <button
            onClick={logout}
            style={styles.logoutButton}
          >
            🚪 Logout
          </button>
        </div>

        <footer style={styles.footer}>
          RACER ACADEMY • Student Portal • 2026
        </footer>

      </div>
    </main>
  );
}

function ProfileItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div style={styles.profileItem}>
      <div style={styles.profileLabel}>
        {label}
      </div>

      <div style={styles.profileValue}>
        {value || "—"}
      </div>
    </div>
  );
}

function formatDate(date: string | null) {
  if (!date) return "—";

  return new Date(
    `${date}T00:00:00`
  ).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const styles: {
  [key: string]: React.CSSProperties;
} = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#eef2ff,#f8fafc,#eff6ff)",
    padding: "25px 15px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#0f172a",
  },

  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
  },

  header: {
    background: "#ffffff",
    borderRadius: "22px",
    padding: "25px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "20px",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.08)",
    flexWrap: "wrap",
  },

  badge: {
    display: "inline-block",
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "7px 12px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "1px",
    marginBottom: "10px",
  },

  title: {
    margin: 0,
    fontSize: "30px",
    fontWeight: "900",
    color: "#0f172a",
  },

  subtitle: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: "14px",
    fontWeight: "600",
  },

  backButton: {
    border: "none",
    background: "#475569",
    color: "#ffffff",
    padding: "12px 18px",
    borderRadius: "10px",
    fontWeight: "800",
    cursor: "pointer",
  },

  successBox: {
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #bbf7d0",
    borderRadius: "12px",
    padding: "14px",
    marginBottom: "18px",
    fontWeight: "800",
  },

  errorBox: {
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    borderRadius: "12px",
    padding: "14px",
    marginBottom: "18px",
    fontWeight: "800",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1.5fr) minmax(320px,0.8fr)",
    gap: "20px",
    alignItems: "start",
  },

  profileCard: {
    background: "#ffffff",
    borderRadius: "22px",
    padding: "25px",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.08)",
  },

  profileTop: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },

  avatar: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    background:
      "linear-gradient(135deg,#2563eb,#7c3aed)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "30px",
    fontWeight: "900",
    flexShrink: 0,
  },

  studentName: {
    margin: 0,
    fontSize: "23px",
    fontWeight: "900",
    color: "#0f172a",
  },

  usernameBadge: {
    display: "inline-block",
    marginTop: "7px",
    background: "#f1f5f9",
    color: "#334155",
    padding: "6px 10px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "900",
  },

  profileDivider: {
    height: "1px",
    background: "#e2e8f0",
    margin: "22px 0",
  },

  detailsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: "14px",
  },

  profileItem: {
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "13px",
    border: "1px solid #e2e8f0",
  },

  profileLabel: {
    fontSize: "10px",
    fontWeight: "900",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "5px",
  },

  profileValue: {
    fontSize: "13px",
    fontWeight: "800",
    color: "#0f172a",
    wordBreak: "break-word",
  },

  passwordCard: {
    background: "#ffffff",
    borderRadius: "22px",
    padding: "25px",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.08)",
    border: "2px solid #dbeafe",
  },

  passwordIcon: {
    width: "55px",
    height: "55px",
    borderRadius: "15px",
    background: "#dbeafe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "26px",
    marginBottom: "15px",
  },

  passwordTitle: {
    margin: 0,
    fontSize: "22px",
    fontWeight: "900",
    color: "#172554",
  },

  passwordDescription: {
    margin: "7px 0 22px",
    color: "#64748b",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    marginBottom: "16px",
  },

  label: {
    fontSize: "12px",
    fontWeight: "900",
    color: "#334155",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 13px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "14px",
    fontWeight: "600",
    outline: "none",
  },

  helpText: {
    color: "#94a3b8",
    fontSize: "10px",
  },

  passwordRule: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "10px",
    color: "#64748b",
    fontSize: "11px",
    marginBottom: "16px",
  },

  updateButton: {
    width: "100%",
    border: "none",
    background:
      "linear-gradient(135deg,#2563eb,#7c3aed)",
    color: "#ffffff",
    padding: "13px 18px",
    borderRadius: "10px",
    fontWeight: "900",
    fontSize: "13px",
  },

  securityNote: {
    marginTop: "14px",
    textAlign: "center",
    color: "#64748b",
    fontSize: "10px",
    lineHeight: 1.4,
  },

  logoutArea: {
    display: "flex",
    justifyContent: "center",
    marginTop: "22px",
  },

  logoutButton: {
    border: "none",
    background: "#fee2e2",
    color: "#b91c1c",
    padding: "11px 20px",
    borderRadius: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  footer: {
    textAlign: "center",
    padding: "25px 10px",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "700",
  },

  loadingCard: {
    maxWidth: "500px",
    margin: "100px auto",
    background: "#ffffff",
    borderRadius: "22px",
    padding: "40px",
    textAlign: "center",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.08)",
  },

  loadingIcon: {
    fontSize: "40px",
  },

  loadingTitle: {
    margin: "15px 0 5px",
    fontSize: "22px",
    fontWeight: "900",
  },

  loadingText: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
  },

  errorCard: {
    maxWidth: "500px",
    margin: "100px auto",
    background: "#ffffff",
    borderRadius: "22px",
    padding: "40px",
    textAlign: "center",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.08)",
  },

  bigIcon: {
    fontSize: "45px",
  },

  errorTitle: {
    margin: "15px 0 8px",
    fontSize: "22px",
    fontWeight: "900",
  },

  errorText: {
    color: "#64748b",
    fontSize: "13px",
    lineHeight: 1.5,
    marginBottom: "20px",
  },

  loginButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "12px 20px",
    borderRadius: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },
};