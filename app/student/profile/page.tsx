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

type FormData = {
  student_name: string;
  date_of_birth: string;
  father_name: string;
  mother_name: string;
  father_phone: string;
  mother_phone: string;
  address: string;
  city: string;
  class_name: string;
  blood_group: string;
};

const emptyForm: FormData = {
  student_name: "",
  date_of_birth: "",
  father_name: "",
  mother_name: "",
  father_phone: "",
  mother_phone: "",
  address: "",
  city: "",
  class_name: "",
  blood_group: "",
};

export default function StudentProfilePage() {
  const [student, setStudent] = useState<Student | null>(null);

  const [form, setForm] =
    useState<FormData>(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [lastUpdated, setLastUpdated] =
    useState("");

  useEffect(() => {
    loadStudent();
  }, []);

  function getUsername() {
    return (
      localStorage.getItem("student_username") ||
      localStorage.getItem("studentUsername") ||
      localStorage.getItem("username") ||
      ""
    )
      .trim()
      .toUpperCase();
  }

  function studentToForm(data: Student): FormData {
    return {
      student_name: data.student_name || "",
      date_of_birth: data.date_of_birth || "",
      father_name: data.father_name || "",
      mother_name: data.mother_name || "",
      father_phone: data.father_phone || "",
      mother_phone: data.mother_phone || "",
      address: data.address || "",
      city: data.city || "",
      class_name: data.class_name || "",
      blood_group: data.blood_group || "",
    };
  }

  async function loadStudent() {
    setLoading(true);
    setErrorMessage("");

    try {
      const username = getUsername();

      if (!username) {
        setStudent(null);
        setErrorMessage(
          "Student login information nahi mili. Please login again."
        );
        return;
      }

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
        .eq("student_username", username)
        .maybeSingle();

      if (error) {
        console.error(
          "Student profile load error:",
          error
        );

        setErrorMessage(
          "Profile load nahi ho rahi: " +
            error.message
        );

        setStudent(null);
        return;
      }

      if (!data) {
        setStudent(null);
        setErrorMessage(
          "Student profile nahi mili."
        );
        return;
      }

      const loadedStudent = data as Student;

      setStudent(loadedStudent);
      setForm(studentToForm(loadedStudent));

      if (loadedStudent.student_name) {
        localStorage.setItem(
          "studentName",
          loadedStudent.student_name
        );

        localStorage.setItem(
          "student_name",
          loadedStudent.student_name
        );
      }

      setLastUpdated(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Profile load karte waqt problem hui."
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

  function startEditing() {
    if (!student) return;

    setErrorMessage("");
    setSuccessMessage("");

    setForm(studentToForm(student));
    setEditing(true);
  }

  function cancelEditing() {
    if (saving) return;

    if (student) {
      setForm(studentToForm(student));
    }

    setEditing(false);
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function saveProfile() {
    if (!student) return;

    setErrorMessage("");
    setSuccessMessage("");

    const studentName =
      form.student_name.trim();

    if (!studentName) {
      setErrorMessage(
        "Student Name zaroori hai."
      );
      return;
    }

    setSaving(true);

    try {
      /*
       * IMPORTANT:
       * Username and admission date are NOT
       * changed by the student.
       *
       * Only student-editable profile fields
       * are updated here.
       */

      const updateData = {
        student_name: studentName,

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

        address:
          form.address.trim() || null,

        city:
          form.city.trim() || null,

        class_name:
          form.class_name.trim() || null,

        blood_group:
          form.blood_group || null,
      };

      const { data, error } = await supabase
        .from("students")
        .update(updateData)
        .eq("id", student.id)
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
        console.error(
          "Profile update error:",
          error
        );

        throw new Error(
          "Profile save nahi hui: " +
            error.message
        );
      }

      if (!data) {
        throw new Error(
          "Profile save nahi hui. Database ne updated record return nahi kiya."
        );
      }

      const updatedStudent =
        data as Student;

      setStudent(updatedStudent);
      setForm(studentToForm(updatedStudent));

      localStorage.setItem(
        "studentName",
        updatedStudent.student_name ||
          "Student"
      );

      localStorage.setItem(
        "student_name",
        updatedStudent.student_name ||
          "Student"
      );

      localStorage.setItem(
        "studentUsername",
        updatedStudent.student_username
      );

      localStorage.setItem(
        "student_username",
        updatedStudent.student_username
      );

      setEditing(false);

      setSuccessMessage(
        "✅ Profile successfully updated."
      );

      setLastUpdated(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Profile save nahi ho saki."
      );
    } finally {
      setSaving(false);
    }
  }

  function formatDate(
    date: string | null
  ) {
    if (!date) return "Not Added";

    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  function displayValue(
    value: string | null
  ) {
    if (!value || !value.trim()) {
      return "Not Added";
    }

    return value;
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingIcon}>
            ⏳
          </div>

          <h2 style={styles.loadingTitle}>
            Loading Profile...
          </h2>

          <p style={styles.loadingText}>
            Please wait while we load your
            profile.
          </p>
        </div>
      </main>
    );
  }

  if (!student) {
    return (
      <main style={styles.page}>
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>
            ⚠️
          </div>

          <h2 style={styles.errorTitle}>
            Profile Not Available
          </h2>

          <p style={styles.errorText}>
            {errorMessage ||
              "Student profile load nahi ho saki."}
          </p>

          <button
            onClick={loadStudent}
            style={styles.retryButton}
          >
            🔄 Try Again
          </button>
        </div>
      </main>
    );
  }

  const firstLetter =
    (
      student.student_name ||
      "S"
    )
      .charAt(0)
      .toUpperCase();

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
              👤 My Profile
            </h1>

            <p style={styles.subtitle}>
              View and manage your personal
              information
            </p>
          </div>

          <div style={styles.headerButtons}>
            <button
              onClick={() =>
                window.history.back()
              }
              style={styles.backButton}
            >
              ← Back
            </button>

            {!editing ? (
              <button
                onClick={startEditing}
                style={styles.editProfileButton}
              >
                ✏️ Edit Profile
              </button>
            ) : (
              <button
                onClick={cancelEditing}
                disabled={saving}
                style={styles.cancelTopButton}
              >
                ✕ Cancel
              </button>
            )}
          </div>
        </header>

        {/* MESSAGES */}

        {successMessage && (
          <div style={styles.successBox}>
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div style={styles.errorBox}>
            ⚠️ {errorMessage}
          </div>
        )}

        {/* PROFILE HERO */}

        <section style={styles.profileHero}>
          <div style={styles.avatar}>
            {firstLetter}
          </div>

          <div style={styles.heroInfo}>
            <h2 style={styles.studentName}>
              {displayValue(
                student.student_name
              )}
            </h2>

            <div style={styles.usernameBadge}>
              {student.student_username}
            </div>

            <p style={styles.heroText}>
              Your profile can be updated by
              you and your teacher.
            </p>
          </div>
        </section>

        {/* EDIT FORM */}

        {editing && (
          <section style={styles.editCard}>
            <div style={styles.editHeader}>
              <div>
                <h2 style={styles.editTitle}>
                  ✏️ Edit My Profile
                </h2>

                <p style={styles.editSubtitle}>
                  Fill in your details and save
                  your changes.
                </p>
              </div>
            </div>

            <div style={styles.notice}>
              <span style={styles.noticeIcon}>
                🔒
              </span>

              <div>
                <strong style={styles.noticeTitle}>
                  Account Information
                </strong>

                <p style={styles.noticeText}>
                  Username and Admission Date
                  are managed by your teacher.
                  Other profile details can be
                  updated by you.
                </p>
              </div>
            </div>

            <div style={styles.formGrid}>

              {/* STUDENT NAME */}

              <Field
                label="Student Name *"
                value={form.student_name}
                onChange={(value) =>
                  updateField(
                    "student_name",
                    value
                  )
                }
              />

              {/* USERNAME LOCKED */}

              <div style={styles.field}>
                <label style={styles.label}>
                  Username
                </label>

                <input
                  type="text"
                  value={
                    student.student_username
                  }
                  readOnly
                  style={styles.lockedInput}
                />

                <span style={styles.helpText}>
                  🔒 Managed by teacher
                </span>
              </div>

              {/* DOB */}

              <div style={styles.field}>
                <label style={styles.label}>
                  Date of Birth
                </label>

                <input
                  type="date"
                  value={
                    form.date_of_birth
                  }
                  onChange={(e) =>
                    updateField(
                      "date_of_birth",
                      e.target.value
                    )
                  }
                  style={styles.input}
                />
              </div>

              {/* ADMISSION DATE LOCKED */}

              <div style={styles.field}>
                <label style={styles.label}>
                  Admission Date
                </label>

                <input
                  type="date"
                  value={
                    student.admission_date ||
                    ""
                  }
                  readOnly
                  style={styles.lockedInput}
                />

                <span style={styles.helpText}>
                  🔒 Managed by teacher
                </span>
              </div>

              {/* CLASS */}

              <Field
                label="Class"
                value={form.class_name}
                onChange={(value) =>
                  updateField(
                    "class_name",
                    value
                  )
                }
              />

              {/* BLOOD GROUP */}

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

                  <option value="A+">
                    A+
                  </option>

                  <option value="A-">
                    A-
                  </option>

                  <option value="B+">
                    B+
                  </option>

                  <option value="B-">
                    B-
                  </option>

                  <option value="AB+">
                    AB+
                  </option>

                  <option value="AB-">
                    AB-
                  </option>

                  <option value="O+">
                    O+
                  </option>

                  <option value="O-">
                    O-
                  </option>
                </select>
              </div>

              {/* FATHER */}

              <Field
                label="Father's Name"
                value={form.father_name}
                onChange={(value) =>
                  updateField(
                    "father_name",
                    value
                  )
                }
              />

              {/* MOTHER */}

              <Field
                label="Mother's Name"
                value={form.mother_name}
                onChange={(value) =>
                  updateField(
                    "mother_name",
                    value
                  )
                }
              />

              {/* FATHER PHONE */}

              <Field
                label="Father's Phone"
                value={form.father_phone}
                onChange={(value) =>
                  updateField(
                    "father_phone",
                    value
                  )
                }
                type="tel"
              />

              {/* MOTHER PHONE */}

              <Field
                label="Mother's Phone"
                value={form.mother_phone}
                onChange={(value) =>
                  updateField(
                    "mother_phone",
                    value
                  )
                }
                type="tel"
              />

              {/* CITY */}

              <Field
                label="City"
                value={form.city}
                onChange={(value) =>
                  updateField(
                    "city",
                    value
                  )
                }
              />

              {/* ADDRESS */}

              <div
                style={{
                  ...styles.field,
                  gridColumn:
                    "span 2",
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
                  rows={4}
                  placeholder="Enter your complete residential address"
                  style={{
                    ...styles.input,
                    resize: "vertical",
                    minHeight: "100px",
                  }}
                />
              </div>
            </div>

            {/* ACTION BUTTONS */}

            <div style={styles.formActions}>
              <button
                onClick={cancelEditing}
                disabled={saving}
                style={styles.cancelButton}
              >
                Cancel
              </button>

              <button
                onClick={saveProfile}
                disabled={saving}
                style={{
                  ...styles.saveButton,
                  opacity: saving
                    ? 0.7
                    : 1,
                }}
              >
                {saving
                  ? "⏳ Saving..."
                  : "💾 Save Changes"}
              </button>
            </div>
          </section>
        )}

        {/* PERSONAL DETAILS */}

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>
              👤
            </div>

            <div>
              <h2 style={styles.cardTitle}>
                Personal Details
              </h2>

              <p style={styles.cardSubtitle}>
                Your basic student information
              </p>
            </div>
          </div>

          <div style={styles.detailsGrid}>
            <Detail
              label="Student Name"
              value={displayValue(
                student.student_name
              )}
            />

            <Detail
              label="Username"
              value={student.student_username}
            />

            <Detail
              label="Date of Birth"
              value={formatDate(
                student.date_of_birth
              )}
            />

            <Detail
              label="Admission Date"
              value={formatDate(
                student.admission_date
              )}
            />

            <Detail
              label="Class"
              value={displayValue(
                student.class_name
              )}
            />

            <Detail
              label="Blood Group"
              value={displayValue(
                student.blood_group
              )}
            />
          </div>
        </section>

        {/* PARENTS */}

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>
              👨‍👩‍👦
            </div>

            <div>
              <h2 style={styles.cardTitle}>
                Parents / Guardian Details
              </h2>

              <p style={styles.cardSubtitle}>
                Information provided by you or
                your teacher
              </p>
            </div>
          </div>

          <div style={styles.detailsGrid}>
            <Detail
              label="Father's Name"
              value={displayValue(
                student.father_name
              )}
            />

            <Detail
              label="Father's Phone"
              value={displayValue(
                student.father_phone
              )}
            />

            <Detail
              label="Mother's Name"
              value={displayValue(
                student.mother_name
              )}
            />

            <Detail
              label="Mother's Phone"
              value={displayValue(
                student.mother_phone
              )}
            />
          </div>
        </section>

        {/* ADDRESS */}

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>
              🏠
            </div>

            <div>
              <h2 style={styles.cardTitle}>
                Address Details
              </h2>

              <p style={styles.cardSubtitle}>
                Your residential information
              </p>
            </div>
          </div>

          <div style={styles.detailsGrid}>
            <Detail
              label="City"
              value={displayValue(
                student.city
              )}
            />

            <div style={styles.detailBox}>
              <div style={styles.detailLabel}>
                Complete Address
              </div>

              <div style={styles.addressValue}>
                {displayValue(
                  student.address
                )}
              </div>
            </div>
          </div>
        </section>

        {/* INFORMATION */}

        <div style={styles.infoBox}>
          <div style={styles.infoIcon}>
            ℹ️
          </div>

          <div>
            <strong style={styles.infoTitle}>
              Profile Information
            </strong>

            <p style={styles.infoText}>
              Students can update their
              personal and family information
              using Edit Profile. Username and
              Admission Date remain managed by
              the teacher.
            </p>
          </div>
        </div>

        {/* REFRESH */}

        <button
          onClick={loadStudent}
          style={styles.refreshButton}
          disabled={loading || saving}
        >
          🔄 Refresh Profile
        </button>

        {lastUpdated && (
          <div style={styles.updatedText}>
            Latest profile data loaded at{" "}
            {lastUpdated}
          </div>
        )}

        <footer style={styles.footer}>
          Attendance Portal • Student Profile •
          2026
        </footer>
      </div>
    </main>
  );
}

/* =========================================================
   FIELD COMPONENT
========================================================= */

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        style={styles.input}
      />
    </div>
  );
}

/* =========================================================
   DETAIL COMPONENT
========================================================= */

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={styles.detailBox}>
      <div style={styles.detailLabel}>
        {label}
      </div>

      <div style={styles.detailValue}>
        {value}
      </div>
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

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
    padding: "25px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "18px",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.08)",
    flexWrap: "wrap",
  },

  headerButtons: {
    display: "flex",
    gap: "10px",
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
    padding: "11px 18px",
    borderRadius: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  editProfileButton: {
    border: "none",
    background:
      "linear-gradient(135deg,#2563eb,#7c3aed)",
    color: "#ffffff",
    padding: "11px 18px",
    borderRadius: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  cancelTopButton: {
    border: "none",
    background: "#fee2e2",
    color: "#991b1b",
    padding: "11px 18px",
    borderRadius: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  successBox: {
    background: "#dcfce7",
    color: "#166534",
    border:
      "1px solid #bbf7d0",
    borderRadius: "12px",
    padding: "14px",
    marginBottom: "18px",
    fontWeight: "800",
  },

  errorBox: {
    background: "#fee2e2",
    color: "#991b1b",
    border:
      "1px solid #fecaca",
    borderRadius: "12px",
    padding: "14px",
    marginBottom: "18px",
    fontWeight: "800",
  },

  profileHero: {
    background:
      "linear-gradient(135deg,#2563eb,#7c3aed)",
    borderRadius: "22px",
    padding: "30px",
    display: "flex",
    alignItems: "center",
    gap: "20px",
    marginBottom: "18px",
    boxShadow:
      "0 12px 35px rgba(37,99,235,0.22)",
  },

  avatar: {
    width: "90px",
    height: "90px",
    minWidth: "90px",
    borderRadius: "50%",
    background: "#ffffff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "40px",
    fontWeight: "900",
    boxShadow:
      "0 8px 25px rgba(0,0,0,0.15)",
  },

  heroInfo: {
    minWidth: 0,
  },

  studentName: {
    margin: 0,
    color: "#ffffff",
    fontSize: "28px",
    fontWeight: "900",
    wordBreak: "break-word",
  },

  usernameBadge: {
    display: "inline-block",
    marginTop: "8px",
    background:
      "rgba(255,255,255,0.18)",
    border:
      "1px solid rgba(255,255,255,0.3)",
    color: "#ffffff",
    padding: "6px 10px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "900",
  },

  heroText: {
    margin: "8px 0 0",
    color: "#dbeafe",
    fontSize: "13px",
    fontWeight: "700",
  },

  editCard: {
    background: "#ffffff",
    borderRadius: "22px",
    padding: "25px",
    marginBottom: "18px",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.09)",
    border:
      "2px solid #bfdbfe",
  },

  editHeader: {
    marginBottom: "18px",
  },

  editTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "23px",
    fontWeight: "900",
  },

  editSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "600",
  },

  notice: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    background: "#f8fafc",
    border:
      "1px solid #e2e8f0",
    borderRadius: "13px",
    padding: "14px",
    marginBottom: "20px",
  },

  noticeIcon: {
    fontSize: "20px",
  },

  noticeTitle: {
    color: "#334155",
    fontSize: "13px",
  },

  noticeText: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "12px",
    lineHeight: 1.5,
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
    border:
      "1px solid #cbd5e1",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "14px",
    fontWeight: "600",
    outline: "none",
  },

  lockedInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 13px",
    border:
      "1px solid #cbd5e1",
    borderRadius: "10px",
    background: "#f1f5f9",
    color: "#64748b",
    fontSize: "14px",
    fontWeight: "700",
    outline: "none",
    cursor: "not-allowed",
  },

  helpText: {
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "700",
  },

  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "22px",
    flexWrap: "wrap",
  },

  cancelButton: {
    border:
      "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#334155",
    padding: "12px 20px",
    borderRadius: "10px",
    fontWeight: "800",
    cursor: "pointer",
  },

  saveButton: {
    border: "none",
    background:
      "linear-gradient(135deg,#16a34a,#15803d)",
    color: "#ffffff",
    padding: "12px 22px",
    borderRadius: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  card: {
    background: "#ffffff",
    borderRadius: "22px",
    padding: "24px",
    marginBottom: "18px",
    boxShadow:
      "0 9px 28px rgba(15,23,42,0.07)",
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
  },

  cardIcon: {
    width: "45px",
    height: "45px",
    borderRadius: "12px",
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
    fontSize: "20px",
    fontWeight: "900",
  },

  cardSubtitle: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "600",
  },

  detailsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: "14px",
  },

  detailBox: {
    background: "#f8fafc",
    border:
      "1px solid #e2e8f0",
    borderRadius: "13px",
    padding: "15px",
    minWidth: 0,
  },

  detailLabel: {
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "7px",
  },

  detailValue: {
    color: "#0f172a",
    fontSize: "15px",
    fontWeight: "800",
    wordBreak: "break-word",
  },

  addressValue: {
    color: "#0f172a",
    fontSize: "14px",
    fontWeight: "700",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },

  infoBox: {
    background: "#eff6ff",
    border:
      "1px solid #bfdbfe",
    borderRadius: "15px",
    padding: "16px",
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    marginBottom: "15px",
  },

  infoIcon: {
    fontSize: "20px",
    flexShrink: 0,
  },

  infoTitle: {
    color: "#1e3a8a",
    fontSize: "14px",
  },

  infoText: {
    margin: "5px 0 0",
    color: "#475569",
    fontSize: "12px",
    lineHeight: 1.6,
    fontWeight: "600",
  },

  refreshButton: {
    display: "block",
    margin: "0 auto",
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "12px 20px",
    borderRadius: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  updatedText: {
    textAlign: "center",
    marginTop: "10px",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "700",
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

  errorCard: {
    maxWidth: "550px",
    margin: "80px auto",
    background: "#ffffff",
    borderRadius: "22px",
    padding: "40px 25px",
    textAlign: "center",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.08)",
  },

  errorIcon: {
    fontSize: "45px",
  },

  errorTitle: {
    margin: "15px 0 8px",
    color: "#991b1b",
    fontWeight: "900",
  },

  errorText: {
    color: "#64748b",
    fontSize: "13px",
    lineHeight: 1.6,
  },

  retryButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
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
};