"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

type FormData = {
  student_name: string;
  date_of_birth: string;
  admission_date: string;
  father_name: string;
  mother_name: string;
  father_phone: string;
  mother_phone: string;
  class_name: string;
  blood_group: string;
  city: string;
  address: string;
};

const emptyForm: FormData = {
  student_name: "",
  date_of_birth: "",
  admission_date: "",
  father_name: "",
  mother_name: "",
  father_phone: "",
  mother_phone: "",
  class_name: "",
  blood_group: "",
  city: "",
  address: "",
};

export default function StudentSettingsPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [form, setForm] = useState<FormData>(emptyForm);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const savedUsername =
        localStorage.getItem("student_username") ||
        localStorage.getItem("studentUsername") ||
        localStorage.getItem("username") ||
        "";

      if (!savedUsername) {
        setError(
          "Student login information not found. Please login again."
        );
        setLoading(false);
        return;
      }

      setUsername(savedUsername);

      const { data, error } = await supabase
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
        .eq("student_username", savedUsername)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("Student profile not found.");
      }

      const student = data as Student;

      setForm({
        student_name: student.student_name || "",
        date_of_birth: student.date_of_birth || "",
        admission_date: student.admission_date || "",
        father_name: student.father_name || "",
        mother_name: student.mother_name || "",
        father_phone: student.father_phone || "",
        mother_phone: student.mother_phone || "",
        class_name: student.class_name || "",
        blood_group: student.blood_group || "",
        city: student.city || "",
        address: student.address || "",
      });

      if (student.student_name) {
        localStorage.setItem(
          "studentName",
          student.student_name
        );
        localStorage.setItem(
          "student_name",
          student.student_name
        );
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load student profile."
      );
    } finally {
      setLoading(false);
    }
  }

  function updateField(
    field: keyof FormData,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function saveProfile(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!username) {
      setError(
        "Student username not found. Please login again."
      );
      return;
    }

    if (!form.student_name.trim()) {
      setError("Student name is required.");
      return;
    }

    setSaving(true);

    try {
      const studentData = {
        student_name:
          form.student_name.trim(),

        date_of_birth:
          form.date_of_birth || null,

        admission_date:
          form.admission_date || null,

        father_name:
          form.father_name.trim() || null,

        mother_name:
          form.mother_name.trim() || null,

        father_phone:
          form.father_phone.trim() || null,

        mother_phone:
          form.mother_phone.trim() || null,

        class_name:
          form.class_name.trim() || null,

        blood_group:
          form.blood_group.trim() || null,

        city:
          form.city.trim() || null,

        address:
          form.address.trim() || null,
      };

      const { data, error } = await supabase
        .from("students")
        .update(studentData)
        .eq("student_username", username)
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
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error(
          "Profile update nahi hui. Supabase permissions/RLS policy check karein."
        );
      }

      const updatedStudent =
        data as Student;

      setForm({
        student_name:
          updatedStudent.student_name || "",

        date_of_birth:
          updatedStudent.date_of_birth || "",

        admission_date:
          updatedStudent.admission_date || "",

        father_name:
          updatedStudent.father_name || "",

        mother_name:
          updatedStudent.mother_name || "",

        father_phone:
          updatedStudent.father_phone || "",

        mother_phone:
          updatedStudent.mother_phone || "",

        class_name:
          updatedStudent.class_name || "",

        blood_group:
          updatedStudent.blood_group || "",

        city:
          updatedStudent.city || "",

        address:
          updatedStudent.address || "",
      });

      localStorage.setItem(
        "studentName",
        updatedStudent.student_name || ""
      );

      localStorage.setItem(
        "student_name",
        updatedStudent.student_name || ""
      );

      setMessage(
        "✅ Profile details saved successfully."
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save profile."
      );
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!username) {
      setError(
        "Student username not found. Please login again."
      );
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError(
        "Please enter new password and confirm password."
      );
      return;
    }

    if (newPassword.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        "New password and confirm password do not match."
      );
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.rpc(
        "student_change_password",
        {
          p_username: username,
          p_new_password: newPassword,
        }
      );

      if (error) {
        throw error;
      }

      setNewPassword("");
      setConfirmPassword("");

      setMessage(
        "✅ Password changed successfully."
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to change password."
      );
    } finally {
      setChangingPassword(false);
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

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingIcon}>
            ⏳
          </div>

          <h2 style={styles.loadingTitle}>
            Loading Settings...
          </h2>

          <p style={styles.loadingText}>
            Please wait.
          </p>
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
              STUDENT PORTAL
            </div>

            <h1 style={styles.title}>
              ⚙️ Student Settings
            </h1>

            <p style={styles.subtitle}>
              Manage your student profile and account
            </p>
          </div>

          <div style={styles.headerButtons}>
            <button
              onClick={() =>
                router.push("/student/profile")
              }
              style={styles.profileButton}
            >
              👤 My Profile
            </button>

            <button
              onClick={() =>
                router.push("/student/dashboard")
              }
              style={styles.dashboardButton}
            >
              ← Dashboard
            </button>
          </div>
        </header>

        {/* MESSAGES */}

        {message && (
          <div style={styles.success}>
            {message}
          </div>
        )}

        {error && (
          <div style={styles.error}>
            ⚠️ {error}
          </div>
        )}

        {/* PROFILE FORM */}

        <form
          onSubmit={saveProfile}
          style={styles.card}
        >
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>
              👤
            </div>

            <div>
              <h2 style={styles.cardTitle}>
                My Profile Details
              </h2>

              <p style={styles.cardSubtitle}>
                Fill in or update your personal information
              </p>
            </div>
          </div>

          <div style={styles.formGrid}>

            {/* USERNAME */}

            <div style={styles.field}>
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

              <small style={styles.helpText}>
                Username cannot be changed.
              </small>
            </div>

            {/* NAME */}

            <div style={styles.field}>
              <label style={styles.label}>
                Student Name *
              </label>

              <input
                type="text"
                value={form.student_name}
                onChange={(e) =>
                  updateField(
                    "student_name",
                    e.target.value
                  )
                }
                placeholder="Enter student name"
                style={styles.input}
              />
            </div>

            {/* DOB */}

            <div style={styles.field}>
              <label style={styles.label}>
                Date of Birth
              </label>

              <input
                type="date"
                value={form.date_of_birth}
                onChange={(e) =>
                  updateField(
                    "date_of_birth",
                    e.target.value
                  )
                }
                style={styles.input}
              />
            </div>

            {/* ADMISSION */}

            <div style={styles.field}>
              <label style={styles.label}>
                Admission Date
              </label>

              <input
                type="date"
                value={form.admission_date}
                onChange={(e) =>
                  updateField(
                    "admission_date",
                    e.target.value
                  )
                }
                style={styles.input}
              />
            </div>

            {/* FATHER */}

            <div style={styles.field}>
              <label style={styles.label}>
                Father's Name
              </label>

              <input
                type="text"
                value={form.father_name}
                onChange={(e) =>
                  updateField(
                    "father_name",
                    e.target.value
                  )
                }
                placeholder="Father's full name"
                style={styles.input}
              />
            </div>

            {/* MOTHER */}

            <div style={styles.field}>
              <label style={styles.label}>
                Mother's Name
              </label>

              <input
                type="text"
                value={form.mother_name}
                onChange={(e) =>
                  updateField(
                    "mother_name",
                    e.target.value
                  )
                }
                placeholder="Mother's full name"
                style={styles.input}
              />
            </div>

            {/* FATHER PHONE */}

            <div style={styles.field}>
              <label style={styles.label}>
                Father's Phone
              </label>

              <input
                type="tel"
                value={form.father_phone}
                onChange={(e) =>
                  updateField(
                    "father_phone",
                    e.target.value
                  )
                }
                placeholder="Father's phone"
                style={styles.input}
              />
            </div>

            {/* MOTHER PHONE */}

            <div style={styles.field}>
              <label style={styles.label}>
                Mother's Phone
              </label>

              <input
                type="tel"
                value={form.mother_phone}
                onChange={(e) =>
                  updateField(
                    "mother_phone",
                    e.target.value
                  )
                }
                placeholder="Mother's phone"
                style={styles.input}
              />
            </div>

            {/* CLASS */}

            <div style={styles.field}>
              <label style={styles.label}>
                Class
              </label>

              <input
                type="text"
                value={form.class_name}
                onChange={(e) =>
                  updateField(
                    "class_name",
                    e.target.value
                  )
                }
                placeholder="e.g. Class 10"
                style={styles.input}
              />
            </div>

            {/* BLOOD */}

            <div style={styles.field}>
              <label style={styles.label}>
                Blood Group
              </label>

              <select
                value={form.blood_group}
                onChange={(e) =>
                  updateField(
                    "blood_group",
                    e.target.value
                  )
                }
                style={styles.input}
              >
                <option value="">
                  Select Blood Group
                </option>

                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            {/* CITY */}

            <div style={styles.field}>
              <label style={styles.label}>
                City
              </label>

              <input
                type="text"
                value={form.city}
                onChange={(e) =>
                  updateField(
                    "city",
                    e.target.value
                  )
                }
                placeholder="City"
                style={styles.input}
              />
            </div>

            {/* ADDRESS */}

            <div
              style={{
                ...styles.field,
                gridColumn: "span 2",
              }}
            >
              <label style={styles.label}>
                Complete Address
              </label>

              <textarea
                value={form.address}
                onChange={(e) =>
                  updateField(
                    "address",
                    e.target.value
                  )
                }
                placeholder="Complete residential address"
                rows={4}
                style={{
                  ...styles.input,
                  resize: "vertical",
                }}
              />
            </div>
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              onClick={loadProfile}
              disabled={saving}
              style={styles.secondaryButton}
            >
              🔄 Reload
            </button>

            <button
              type="submit"
              disabled={saving}
              style={styles.primaryButton}
            >
              {saving
                ? "⏳ Saving..."
                : "💾 Save Profile Details"}
            </button>
          </div>
        </form>

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
                Change your account password securely
              </p>
            </div>
          </div>

          <form onSubmit={changePassword}>
            <div style={styles.formGrid}>

              <div style={styles.field}>
                <label style={styles.label}>
                  Username
                </label>

                <input
                  value={username}
                  readOnly
                  style={{
                    ...styles.input,
                    background: "#f1f5f9",
                  }}
                />
              </div>

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
                  autoComplete="new-password"
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>
                  Confirm Password
                </label>

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  style={styles.input}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={changingPassword}
              style={styles.primaryButton}
            >
              {changingPassword
                ? "⏳ Changing Password..."
                : "🔑 Change Password"}
            </button>
          </form>
        </section>

        {/* LOGOUT */}

        <section style={styles.logoutCard}>
          <div>
            <h3 style={styles.logoutTitle}>
              Logout
            </h3>

            <p style={styles.logoutText}>
              Logout from your student account on this device.
            </p>
          </div>

          <button
            onClick={logout}
            style={styles.logoutButton}
          >
            🚪 Logout
          </button>
        </section>

        <footer style={styles.footer}>
          Attendance Portal • Student Settings • 2026
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
    padding: "25px 15px",
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
    borderRadius: "22px",
    padding: "26px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "18px",
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
    marginBottom: "9px",
  },

  title: {
    margin: 0,
    fontSize: "30px",
    fontWeight: "900",
  },

  subtitle: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: "14px",
    fontWeight: "600",
  },

  headerButtons: {
    display: "flex",
    gap: "9px",
    flexWrap: "wrap",
  },

  profileButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "11px 16px",
    borderRadius: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  dashboardButton: {
    border: "none",
    background: "#475569",
    color: "#ffffff",
    padding: "11px 16px",
    borderRadius: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  success: {
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #bbf7d0",
    borderRadius: "12px",
    padding: "14px",
    marginBottom: "18px",
    fontWeight: "800",
  },

  error: {
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    borderRadius: "12px",
    padding: "14px",
    marginBottom: "18px",
    fontWeight: "800",
    wordBreak: "break-word",
  },

  card: {
    background: "#ffffff",
    borderRadius: "22px",
    padding: "25px",
    marginBottom: "20px",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.08)",
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "22px",
  },

  cardIcon: {
    width: "46px",
    height: "46px",
    borderRadius: "13px",
    background: "#dbeafe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    flexShrink: 0,
  },

  cardTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "21px",
    fontWeight: "900",
  },

  cardSubtitle: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "600",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: "16px",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    minWidth: 0,
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
    fontSize: "11px",
  },

  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "22px",
    flexWrap: "wrap",
  },

  secondaryButton: {
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#334155",
    padding: "12px 18px",
    borderRadius: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  primaryButton: {
    border: "none",
    background:
      "linear-gradient(135deg,#2563eb,#7c3aed)",
    color: "#ffffff",
    padding: "12px 20px",
    borderRadius: "10px",
    fontWeight: "900",
    cursor: "pointer",
    marginTop: "20px",
  },

  logoutCard: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
    flexWrap: "wrap",
  },

  logoutTitle: {
    margin: 0,
    color: "#991b1b",
    fontWeight: "900",
  },

  logoutText: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "12px",
  },

  logoutButton: {
    border: "none",
    background: "#dc2626",
    color: "#ffffff",
    padding: "11px 18px",
    borderRadius: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  loadingCard: {
    maxWidth: "500px",
    margin: "80px auto",
    background: "#ffffff",
    borderRadius: "22px",
    padding: "45px 25px",
    textAlign: "center",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.08)",
  },

  loadingIcon: {
    fontSize: "40px",
  },

  loadingTitle: {
    margin: "15px 0 5px",
    color: "#172554",
    fontWeight: "900",
  },

  loadingText: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
  },

  footer: {
    textAlign: "center",
    padding: "25px 10px",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "700",
  },
};