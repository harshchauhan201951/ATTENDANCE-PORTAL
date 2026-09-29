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
      <>
        <main
          className="student-settings-page"
          style={styles.page}
        >
          <div
            className="settings-loading-card"
            style={styles.loadingCard}
          >
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

        <style jsx global>{`
          html,
          body {
            margin: 0;
            padding: 0;
            width: 100%;
            max-width: 100%;
            overflow-x: hidden !important;
          }

          *,
          *::before,
          *::after {
            box-sizing: border-box;
          }

          .student-settings-page {
            width: 100%;
            max-width: 100vw;
            min-width: 0;
            overflow-x: hidden;
          }

          .settings-loading-card {
            width: calc(100% - 24px);
            max-width: 500px;
          }

          @media (max-width: 480px) {
            .settings-loading-card {
              width: calc(100% - 16px);
              margin: 50px auto !important;
              padding: 35px 18px !important;
            }
          }
        `}</style>
      </>
    );
  }

  return (
    <>
      <main
        className="student-settings-page"
        style={styles.page}
      >
        <div
          className="student-settings-container"
          style={styles.container}
        >
          {/* HEADER */}

          <header
            className="settings-header"
            style={styles.header}
          >
            <div
              className="settings-header-content"
              style={styles.headerContent}
            >
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

            <div
              className="settings-header-buttons"
              style={styles.headerButtons}
            >
              <button
                type="button"
                onClick={() =>
                  router.push("/student/profile")
                }
                style={styles.profileButton}
              >
                👤 My Profile
              </button>

              <button
                type="button"
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
            <div
              className="settings-success"
              style={styles.success}
            >
              {message}
            </div>
          )}

          {error && (
            <div
              className="settings-error"
              style={styles.error}
            >
              ⚠️ {error}
            </div>
          )}

          {/* PROFILE FORM */}

          <form
            onSubmit={saveProfile}
            className="settings-card"
            style={styles.card}
          >
            <div
              className="settings-card-header"
              style={styles.cardHeader}
            >
              <div style={styles.cardIcon}>
                👤
              </div>

              <div
                className="settings-card-heading"
              >
                <h2 style={styles.cardTitle}>
                  My Profile Details
                </h2>

                <p style={styles.cardSubtitle}>
                  Fill in or update your personal information
                </p>
              </div>
            </div>

            <div
              className="settings-form-grid"
              style={styles.formGrid}
            >
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

              {/* ADMISSION DATE - LOCKED */}

              <div style={styles.field}>
                <label style={styles.label}>
                  Admission Date
                </label>

                <input
                  type="date"
                  value={form.admission_date}
                  readOnly
                  disabled
                  style={{
                    ...styles.input,
                    background: "#e2e8f0",
                    color: "#475569",
                    cursor: "not-allowed",
                    border: "1px solid #cbd5e1",
                  }}
                />

                <small style={styles.lockedText}>
                  🔒 Admission Date is locked. Only Teacher can change it.
                </small>
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
                className="settings-address-field"
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
                    minHeight: "100px",
                  }}
                />
              </div>
            </div>

            <div
              className="settings-actions"
              style={styles.actions}
            >
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

          <section
            className="settings-card password-card"
            style={styles.card}
          >
            <div
              className="settings-card-header"
              style={styles.cardHeader}
            >
              <div style={styles.cardIcon}>
                🔐
              </div>

              <div
                className="settings-card-heading"
              >
                <h2 style={styles.cardTitle}>
                  Change Password
                </h2>

                <p style={styles.cardSubtitle}>
                  Change your account password securely
                </p>
              </div>
            </div>

            <form onSubmit={changePassword}>
              <div
                className="settings-form-grid"
                style={styles.formGrid}
              >
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

          <section
            className="settings-logout-card"
            style={styles.logoutCard}
          >
            <div className="settings-logout-content">
              <h3 style={styles.logoutTitle}>
                Logout
              </h3>

              <p style={styles.logoutText}>
                Logout from your student account on this device.
              </p>
            </div>

            <button
              type="button"
              onClick={logout}
              style={styles.logoutButton}
            >
              🚪 Logout
            </button>
          </section>

          <footer
            className="settings-footer"
            style={styles.footer}
          >
            Attendance Portal • Student Settings • 2026
          </footer>
        </div>
      </main>

      <style jsx global>{`
        html,
        body {
          margin: 0;
          padding: 0;
          width: 100%;
          max-width: 100%;
          overflow-x: hidden !important;
        }

        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }

        .student-settings-page {
          width: 100%;
          max-width: 100vw;
          min-width: 0;
          overflow-x: hidden;
        }

        .student-settings-container {
          width: 100%;
          max-width: 1100px;
          min-width: 0;
        }

        .settings-header,
        .settings-card,
        .settings-logout-card {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow: hidden;
        }

        .settings-header-content,
        .settings-card-heading,
        .settings-logout-content {
          min-width: 0;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .settings-header-content h1,
        .settings-header-content p,
        .settings-card-heading h2,
        .settings-card-heading p,
        .settings-logout-content h3,
        .settings-logout-content p {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .settings-form-grid {
          width: 100%;
          min-width: 0;
        }

        .settings-form-grid input,
        .settings-form-grid select,
        .settings-form-grid textarea {
          max-width: 100%;
          min-width: 0;
        }

        .settings-header-buttons {
          min-width: 0;
        }

        .settings-header-buttons button,
        .settings-actions button,
        .settings-logout-card button {
          max-width: 100%;
        }

        .settings-success,
        .settings-error {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        @media (max-width: 768px) {
          .student-settings-page {
            padding: 12px !important;
          }

          .student-settings-container {
            width: 100%;
            max-width: 100%;
          }

          .settings-header {
            padding: 18px !important;
            border-radius: 17px !important;
            align-items: stretch !important;
          }

          .settings-header-content {
            width: 100%;
          }

          .settings-header-content h1 {
            font-size: 25px !important;
            line-height: 1.2 !important;
          }

          .settings-header-content p {
            font-size: 12px !important;
            line-height: 1.5 !important;
          }

          .settings-header-buttons {
            width: 100%;
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            gap: 8px !important;
          }

          .settings-header-buttons button {
            width: 100%;
            min-width: 0;
            min-height: 42px;
            padding: 10px 7px !important;
            font-size: 11px;
          }

          .settings-card {
            padding: 18px !important;
            border-radius: 17px !important;
          }

          .settings-card-header {
            align-items: flex-start !important;
            margin-bottom: 18px !important;
          }

          .settings-card-heading {
            flex: 1;
            min-width: 0;
          }

          .settings-card-heading h2 {
            font-size: 19px !important;
            line-height: 1.3 !important;
          }

          .settings-card-heading p {
            font-size: 11px !important;
            line-height: 1.5 !important;
          }

          .settings-form-grid {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 13px !important;
          }

          .settings-address-field {
            grid-column: span 1 !important;
          }

          .settings-actions {
            width: 100%;
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            gap: 8px !important;
          }

          .settings-actions button {
            width: 100%;
            min-width: 0;
            padding: 11px 7px !important;
            font-size: 11px;
          }

          .settings-card input,
          .settings-card select,
          .settings-card textarea {
            font-size: 14px !important;
          }

          .settings-logout-card {
            padding: 17px !important;
            align-items: flex-start !important;
            flex-direction: column !important;
          }

          .settings-logout-content {
            width: 100%;
          }

          .settings-logout-card .settings-logout-button {
            width: 100%;
          }

          .settings-logout-card > button {
            width: 100%;
          }

          .settings-footer {
            padding: 20px 8px !important;
            line-height: 1.5;
          }
        }

        @media (max-width: 480px) {
          .student-settings-page {
            padding: 8px !important;
          }

          .settings-header {
            padding: 14px !important;
            margin-bottom: 14px !important;
          }

          .settings-header-content .badge {
            font-size: 9px !important;
            padding: 6px 9px !important;
            margin-bottom: 7px !important;
          }

          .settings-header-content h1 {
            font-size: 21px !important;
          }

          .settings-header-content p {
            font-size: 10px !important;
          }

          .settings-header-buttons {
            grid-template-columns: 1fr !important;
          }

          .settings-header-buttons button {
            min-height: 40px;
          }

          .settings-success,
          .settings-error {
            padding: 11px !important;
            margin-bottom: 13px !important;
            font-size: 11px !important;
            line-height: 1.5;
          }

          .settings-card {
            padding: 14px !important;
            margin-bottom: 14px !important;
            border-radius: 15px !important;
          }

          .settings-card-header {
            gap: 9px !important;
            margin-bottom: 15px !important;
          }

          .settings-card-header > div:first-child {
            width: 39px !important;
            height: 39px !important;
            min-width: 39px !important;
            border-radius: 11px !important;
            font-size: 19px !important;
          }

          .settings-card-heading h2 {
            font-size: 17px !important;
          }

          .settings-card-heading p {
            font-size: 10px !important;
          }

          .settings-form-grid {
            gap: 11px !important;
          }

          .settings-form-grid label {
            font-size: 11px !important;
          }

          .settings-form-grid input,
          .settings-form-grid select,
          .settings-form-grid textarea {
            width: 100% !important;
            font-size: 13px !important;
            padding: 10px 11px !important;
          }

          .settings-form-grid textarea {
            min-height: 95px !important;
          }

          .settings-form-grid small {
            font-size: 9px !important;
            line-height: 1.45;
          }

          .settings-actions {
            grid-template-columns: 1fr !important;
            margin-top: 17px !important;
          }

          .settings-actions button {
            min-height: 40px;
            font-size: 11px !important;
          }

          .password-card form > button {
            width: 100% !important;
            margin-top: 15px !important;
            min-height: 40px;
            padding: 10px !important;
            font-size: 11px;
          }

          .settings-logout-card {
            padding: 14px !important;
            border-radius: 15px !important;
          }

          .settings-logout-content h3 {
            font-size: 16px !important;
          }

          .settings-logout-content p {
            font-size: 10px !important;
            line-height: 1.5;
          }

          .settings-logout-card > button {
            min-height: 40px;
            font-size: 11px !important;
          }

          .settings-footer {
            font-size: 9px !important;
            padding: 17px 5px !important;
          }
        }

        @media (max-width: 360px) {
          .student-settings-page {
            padding: 6px !important;
          }

          .settings-header {
            padding: 12px !important;
          }

          .settings-card {
            padding: 12px !important;
          }

          .settings-card-heading h2 {
            font-size: 16px !important;
          }

          .settings-card-heading p {
            font-size: 9px !important;
          }

          .settings-form-grid input,
          .settings-form-grid select,
          .settings-form-grid textarea {
            font-size: 12px !important;
          }

          .settings-footer {
            font-size: 8px !important;
          }
        }
      `}</style>
    </>
  );
}

const styles: {
  [key: string]: React.CSSProperties;
} = {
  page: {
    minHeight: "100vh",
    width: "100%",
    maxWidth: "100vw",
    background:
      "linear-gradient(135deg,#eef2ff,#f8fafc,#eff6ff)",
    padding: "25px 15px",
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
    minWidth: 0,
    boxSizing: "border-box",
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
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
  },

  headerContent: {
    minWidth: 0,
    flex: "1 1 auto",
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
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  subtitle: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: "14px",
    fontWeight: "600",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  headerButtons: {
    display: "flex",
    gap: "9px",
    flexWrap: "wrap",
    minWidth: 0,
  },

  profileButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "11px 16px",
    borderRadius: "10px",
    fontWeight: "900",
    cursor: "pointer",
    minWidth: 0,
  },

  dashboardButton: {
    border: "none",
    background: "#475569",
    color: "#ffffff",
    padding: "11px 16px",
    borderRadius: "10px",
    fontWeight: "900",
    cursor: "pointer",
    minWidth: 0,
  },

  success: {
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #bbf7d0",
    borderRadius: "12px",
    padding: "14px",
    marginBottom: "18px",
    fontWeight: "800",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
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
    overflowWrap: "anywhere",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
  },

  card: {
    background: "#ffffff",
    borderRadius: "22px",
    padding: "25px",
    marginBottom: "20px",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.08)",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    overflow: "hidden",
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "22px",
    minWidth: 0,
  },

  cardIcon: {
    width: "46px",
    height: "46px",
    minWidth: "46px",
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
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  cardSubtitle: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "600",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: "16px",
    width: "100%",
    minWidth: 0,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    minWidth: 0,
    width: "100%",
  },

  label: {
    fontSize: "12px",
    fontWeight: "900",
    color: "#334155",
    overflowWrap: "anywhere",
  },

  input: {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
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
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  lockedText: {
    color: "#b45309",
    fontSize: "11px",
    fontWeight: "800",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "22px",
    flexWrap: "wrap",
    width: "100%",
  },

  secondaryButton: {
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#334155",
    padding: "12px 18px",
    borderRadius: "10px",
    fontWeight: "900",
    cursor: "pointer",
    minWidth: 0,
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
    maxWidth: "100%",
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
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    overflow: "hidden",
  },

  logoutTitle: {
    margin: 0,
    color: "#991b1b",
    fontWeight: "900",
    overflowWrap: "anywhere",
  },

  logoutText: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "12px",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  logoutButton: {
    border: "none",
    background: "#dc2626",
    color: "#ffffff",
    padding: "11px 18px",
    borderRadius: "10px",
    fontWeight: "900",
    cursor: "pointer",
    minWidth: 0,
  },

  loadingCard: {
    maxWidth: "500px",
    width: "calc(100% - 30px)",
    margin: "80px auto",
    background: "#ffffff",
    borderRadius: "22px",
    padding: "45px 25px",
    textAlign: "center",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.08)",
    boxSizing: "border-box",
    overflow: "hidden",
  },

  loadingIcon: {
    fontSize: "40px",
  },

  loadingTitle: {
    margin: "15px 0 5px",
    color: "#172554",
    fontWeight: "900",
    overflowWrap: "anywhere",
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
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    width: "100%",
    boxSizing: "border-box",
  },
};