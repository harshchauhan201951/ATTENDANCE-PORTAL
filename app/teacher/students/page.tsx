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
  student_username: string;
  password_hash: string | null;
  created_at: string | null;
  student_name: string | null;
  admission_date: string | null;
  date_of_birth: string | null;
  father_name: string | null;
  mother_name: string | null;
  father_phone: string | null;
  mother_phone: string | null;
  class_name: string | null;
  blood_group: string | null;
  city: string | null;
  complete_address: string | null;
};

export default function TeacherStudentsPage() {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editingStudent, setEditingStudent] =
    useState<Student | null>(null);

  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editAdmissionDate, setEditAdmissionDate] = useState("");
  const [editDateOfBirth, setEditDateOfBirth] = useState("");

  const [editFatherName, setEditFatherName] = useState("");
  const [editMotherName, setEditMotherName] = useState("");

  const [editFatherPhone, setEditFatherPhone] = useState("");
  const [editMotherPhone, setEditMotherPhone] = useState("");

  const [editClassName, setEditClassName] = useState("");
  const [editBloodGroup, setEditBloodGroup] = useState("");

  const [editCity, setEditCity] = useState("");
  const [editCompleteAddress, setEditCompleteAddress] = useState("");

  const [editPassword, setEditPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("students")
      .select(
        `
        id,
        student_username,
        password_hash,
        created_at,
        student_name,
        admission_date,
        date_of_birth,
        father_name,
        mother_name,
        father_phone,
        mother_phone,
        class_name,
        blood_group,
        city,
        complete_address
        `
      )
      .order("id", { ascending: true });

    if (error) {
      console.error("Students loading error:", error);
      setError(error.message);
      setStudents([]);
    } else {
      setStudents((data || []) as Student[]);
    }

    setLoading(false);
  }

  function openEdit(student: Student) {
    setEditingStudent(student);

    setEditName(student.student_name || "");
    setEditUsername(student.student_username || "");
    setEditAdmissionDate(student.admission_date || "");
    setEditDateOfBirth(student.date_of_birth || "");

    setEditFatherName(student.father_name || "");
    setEditMotherName(student.mother_name || "");

    setEditFatherPhone(student.father_phone || "");
    setEditMotherPhone(student.mother_phone || "");

    setEditClassName(student.class_name || "");
    setEditBloodGroup(student.blood_group || "");

    setEditCity(student.city || "");
    setEditCompleteAddress(student.complete_address || "");

    // Existing password is never displayed.
    // Teacher can enter a new password.
    setEditPassword("");
    setShowPassword(false);

    setError("");
    setSuccess("");
  }

  function closeEdit() {
    setEditingStudent(null);

    setEditName("");
    setEditUsername("");
    setEditAdmissionDate("");
    setEditDateOfBirth("");

    setEditFatherName("");
    setEditMotherName("");

    setEditFatherPhone("");
    setEditMotherPhone("");

    setEditClassName("");
    setEditBloodGroup("");

    setEditCity("");
    setEditCompleteAddress("");

    setEditPassword("");
    setShowPassword(false);
  }

  async function saveStudent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!editingStudent) return;

    if (!editName.trim()) {
      setError("Student name cannot be empty.");
      return;
    }

    if (!editUsername.trim()) {
      setError("Username cannot be empty.");
      return;
    }

    if (editPassword.trim() && editPassword.trim().length < 6) {
      setError("New password must contain at least 6 characters.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const updateData: Record<string, string | null> = {
      student_name: editName.trim(),
      student_username: editUsername.trim(),
      admission_date: editAdmissionDate || null,
      date_of_birth: editDateOfBirth || null,
      father_name: editFatherName.trim() || null,
      mother_name: editMotherName.trim() || null,
      father_phone: editFatherPhone.trim() || null,
      mother_phone: editMotherPhone.trim() || null,
      class_name: editClassName.trim() || null,
      blood_group: editBloodGroup || null,
      city: editCity.trim() || null,
      complete_address: editCompleteAddress.trim() || null,
    };

    /*
      IMPORTANT:
      password_hash is updated only when Teacher enters
      a new password. Existing password is never fetched
      into the form or displayed.
      
      This uses the same pgcrypto hashing approach used
      for the student passwords.
    */

    if (editPassword.trim()) {
      updateData.password_hash = editPassword.trim();
    }

    const { error } = await supabase
      .from("students")
      .update(updateData)
      .eq("id", editingStudent.id);

    if (error) {
      console.error("Student update error:", error);
      setError(error.message);
      setSaving(false);
      return;
    }

    await loadStudents();

    setSaving(false);
    setSuccess("Student profile updated successfully.");

    closeEdit();

    setTimeout(() => {
      setSuccess("");
    }, 3000);
  }

  async function deleteStudent(student: Student) {
    const studentName =
      student.student_name || student.student_username;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${studentName}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(student.id);
    setError("");
    setSuccess("");

    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", student.id);

    if (error) {
      console.error("Student delete error:", error);
      setError(error.message);
      setDeletingId(null);
      return;
    }

    setStudents((current) =>
      current.filter((item) => item.id !== student.id)
    );

    setDeletingId(null);
    setSuccess("Student deleted successfully.");

    setTimeout(() => {
      setSuccess("");
    }, 3000);
  }

  function logout() {
    localStorage.removeItem("teacherLoggedIn");
    localStorage.removeItem("teacherName");
    localStorage.removeItem("teacher_name");
    localStorage.removeItem("teacher_username");

    sessionStorage.clear();

    router.push("/");
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}

        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.iconBox}>👨‍🎓</div>

            <div>
              <h1 style={styles.title}>
                Students Management
              </h1>

              <p style={styles.subtitle}>
                Manage all registered students
              </p>
            </div>
          </div>

          <div style={styles.headerButtons}>
            <button
              type="button"
              onClick={() => router.push("/teacher")}
              style={styles.dashboardButton}
            >
              ← Teacher Dashboard
            </button>

            <button
              type="button"
              onClick={() =>
                router.push("/teacher/settings")
              }
              style={styles.settingsButton}
            >
              ⚙️ Settings
            </button>

            <button
              type="button"
              onClick={logout}
              style={styles.logoutButton}
            >
              🚪 Logout
            </button>
          </div>
        </header>

        {/* MESSAGES */}

        {error && (
          <div style={styles.error}>
            ❌ {error}
          </div>
        )}

        {success && (
          <div style={styles.success}>
            ✅ {success}
          </div>
        )}

        {/* TOTAL STUDENTS */}

        <section style={styles.summaryCard}>
          <div style={styles.summaryIcon}>👨‍🎓</div>

          <div>
            <p style={styles.summaryLabel}>
              Total Students
            </p>

            <h2 style={styles.summaryNumber}>
              {students.length}
            </h2>
          </div>
        </section>

        {/* STUDENTS TABLE */}

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>👥</div>

            <div>
              <h2 style={styles.sectionTitle}>
                All Students
              </h2>

              <p style={styles.sectionSubtitle}>
                Edit complete profiles or delete student accounts
              </p>
            </div>
          </div>

          {loading ? (
            <div style={styles.loading}>
              ⏳ Loading students...
            </div>
          ) : students.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>👨‍🎓</div>

              <h3 style={styles.emptyTitle}>
                No Students Found
              </h3>

              <p style={styles.emptyText}>
                There are currently no students in the database.
              </p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>Student Name</th>
                    <th style={styles.th}>Username</th>
                    <th style={styles.th}>Admission Date</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {students.map((student, index) => (
                    <tr key={student.id}>
                      <td style={styles.td}>
                        <span style={styles.idBadge}>
                          {student.student_username ||
                            `STU${1001 + index}`}
                        </span>
                      </td>

                      <td style={styles.td}>
                        <div style={styles.studentName}>
                          {student.student_name ||
                            "Unnamed Student"}
                        </div>
                      </td>

                      <td style={styles.td}>
                        {student.student_username}
                      </td>

                      <td style={styles.td}>
                        {student.admission_date || "Not set"}
                      </td>

                      <td style={styles.td}>
                        <div style={styles.actionButtons}>
                          <button
                            type="button"
                            onClick={() =>
                              openEdit(student)
                            }
                            style={styles.editButton}
                          >
                            ✏️ Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteStudent(student)
                            }
                            disabled={
                              deletingId === student.id
                            }
                            style={{
                              ...styles.deleteButton,
                              opacity:
                                deletingId === student.id
                                  ? 0.6
                                  : 1,
                            }}
                          >
                            {deletingId === student.id
                              ? "Deleting..."
                              : "🗑️ Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* EDIT STUDENT MODAL */}

        {editingStudent && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>

              <div style={styles.modalHeader}>
                <div>
                  <h2 style={styles.modalTitle}>
                    ✏️ Edit Student Profile
                  </h2>

                  <p style={styles.modalSubtitle}>
                    Update complete student information
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeEdit}
                  style={styles.closeButton}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={saveStudent}>
                <div style={styles.modalBody}>

                  {/* ACCOUNT INFORMATION */}

                  <div style={styles.formSection}>
                    <h3 style={styles.formSectionTitle}>
                      🔐 Account Information
                    </h3>

                    <div style={styles.formGrid}>

                      <div>
                        <label style={styles.label}>
                          Username *
                        </label>

                        <input
                          type="text"
                          value={editUsername}
                          onChange={(e) =>
                            setEditUsername(
                              e.target.value
                            )
                          }
                          style={styles.input}
                          placeholder="Student username"
                        />
                      </div>

                      <div>
                        <label style={styles.label}>
                          New Password
                        </label>

                        <div style={styles.passwordWrapper}>
                          <input
                            type={
                              showPassword
                                ? "text"
                                : "password"
                            }
                            value={editPassword}
                            onChange={(e) =>
                              setEditPassword(
                                e.target.value
                              )
                            }
                            style={{
                              ...styles.input,
                              paddingRight: "50px",
                            }}
                            placeholder="Leave empty to keep current password"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              setShowPassword(
                                !showPassword
                              )
                            }
                            style={styles.passwordButton}
                          >
                            {showPassword
                              ? "🙈"
                              : "👁️"}
                          </button>
                        </div>

                        <p style={styles.helpText}>
                          Enter a password only if you want
                          to change the student's current password.
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* PERSONAL INFORMATION */}

                  <div style={styles.formSection}>
                    <h3 style={styles.formSectionTitle}>
                      👤 Personal Information
                    </h3>

                    <div style={styles.formGrid}>

                      <div>
                        <label style={styles.label}>
                          Student Name *
                        </label>

                        <input
                          type="text"
                          value={editName}
                          onChange={(e) =>
                            setEditName(e.target.value)
                          }
                          style={styles.input}
                          placeholder="Enter student name"
                        />
                      </div>

                      <div>
                        <label style={styles.label}>
                          Date of Birth
                        </label>

                        <input
                          type="date"
                          value={editDateOfBirth}
                          onChange={(e) =>
                            setEditDateOfBirth(
                              e.target.value
                            )
                          }
                          style={styles.input}
                        />
                      </div>

                      <div>
                        <label style={styles.label}>
                          Admission Date
                        </label>

                        <input
                          type="date"
                          value={editAdmissionDate}
                          onChange={(e) =>
                            setEditAdmissionDate(
                              e.target.value
                            )
                          }
                          style={styles.input}
                        />

                        <p style={styles.helpText}>
                          Teacher can change the admission date.
                        </p>
                      </div>

                      <div>
                        <label style={styles.label}>
                          Class
                        </label>

                        <input
                          type="text"
                          value={editClassName}
                          onChange={(e) =>
                            setEditClassName(
                              e.target.value
                            )
                          }
                          style={styles.input}
                          placeholder="Example: B.Tech CSE-AIML"
                        />
                      </div>

                      <div>
                        <label style={styles.label}>
                          Blood Group
                        </label>

                        <select
                          value={editBloodGroup}
                          onChange={(e) =>
                            setEditBloodGroup(
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

                      <div>
                        <label style={styles.label}>
                          City
                        </label>

                        <input
                          type="text"
                          value={editCity}
                          onChange={(e) =>
                            setEditCity(e.target.value)
                          }
                          style={styles.input}
                          placeholder="Enter city"
                        />
                      </div>

                    </div>
                  </div>

                  {/* PARENT INFORMATION */}

                  <div style={styles.formSection}>
                    <h3 style={styles.formSectionTitle}>
                      👨‍👩‍👦 Parent Information
                    </h3>

                    <div style={styles.formGrid}>

                      <div>
                        <label style={styles.label}>
                          Father's Name
                        </label>

                        <input
                          type="text"
                          value={editFatherName}
                          onChange={(e) =>
                            setEditFatherName(
                              e.target.value
                            )
                          }
                          style={styles.input}
                          placeholder="Father's name"
                        />
                      </div>

                      <div>
                        <label style={styles.label}>
                          Mother's Name
                        </label>

                        <input
                          type="text"
                          value={editMotherName}
                          onChange={(e) =>
                            setEditMotherName(
                              e.target.value
                            )
                          }
                          style={styles.input}
                          placeholder="Mother's name"
                        />
                      </div>

                      <div>
                        <label style={styles.label}>
                          Father's Phone
                        </label>

                        <input
                          type="tel"
                          value={editFatherPhone}
                          onChange={(e) =>
                            setEditFatherPhone(
                              e.target.value
                            )
                          }
                          style={styles.input}
                          placeholder="Father's phone number"
                        />
                      </div>

                      <div>
                        <label style={styles.label}>
                          Mother's Phone
                        </label>

                        <input
                          type="tel"
                          value={editMotherPhone}
                          onChange={(e) =>
                            setEditMotherPhone(
                              e.target.value
                            )
                          }
                          style={styles.input}
                          placeholder="Mother's phone number"
                        />
                      </div>

                    </div>
                  </div>

                  {/* ADDRESS */}

                  <div style={styles.formSection}>
                    <h3 style={styles.formSectionTitle}>
                      📍 Address Information
                    </h3>

                    <div>
                      <label style={styles.label}>
                        Complete Address
                      </label>

                      <textarea
                        value={editCompleteAddress}
                        onChange={(e) =>
                          setEditCompleteAddress(
                            e.target.value
                          )
                        }
                        style={styles.textarea}
                        placeholder="Enter complete address"
                        rows={4}
                      />
                    </div>
                  </div>

                </div>

                {/* MODAL FOOTER */}

                <div style={styles.modalFooter}>
                  <button
                    type="button"
                    onClick={closeEdit}
                    style={styles.cancelButton}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      ...styles.saveButton,
                      opacity: saving ? 0.6 : 1,
                    }}
                  >
                    {saving
                      ? "Saving..."
                      : "💾 Save Student Profile"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* FOOTER */}

        <footer style={styles.footer}>
          <strong>Attendance Portal</strong>

          <span>
            Students Management • 2026
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
      "linear-gradient(135deg, #eef2ff, #f8fafc, #eff6ff)",
    padding: "20px",
    boxSizing: "border-box",
    fontFamily: "Arial, Helvetica, sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
  },

  header: {
    background: "white",
    borderRadius: "18px",
    padding: "18px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
    boxShadow:
      "0 8px 25px rgba(15, 23, 42, 0.08)",
    marginBottom: "20px",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
  },

  iconBox: {
    width: "55px",
    height: "55px",
    borderRadius: "15px",
    background:
      "linear-gradient(135deg, #2563eb, #7c3aed)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
  },

  title: {
    margin: 0,
    color: "#172554",
    fontSize: "26px",
    fontWeight: "800",
  },

  subtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  headerButtons: {
    display: "flex",
    gap: "9px",
    flexWrap: "wrap",
  },

  dashboardButton: {
    border: "none",
    background: "#1e3a8a",
    color: "white",
    padding: "11px 15px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },

  settingsButton: {
    border: "none",
    background: "#475569",
    color: "white",
    padding: "11px 15px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },

  logoutButton: {
    border: "none",
    background: "#dc2626",
    color: "white",
    padding: "11px 15px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },

  error: {
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    padding: "14px 16px",
    borderRadius: "12px",
    marginBottom: "20px",
    fontWeight: "700",
  },

  success: {
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #86efac",
    padding: "14px 16px",
    borderRadius: "12px",
    marginBottom: "20px",
    fontWeight: "700",
  },

  summaryCard: {
    background: "white",
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    boxShadow:
      "0 8px 25px rgba(15, 23, 42, 0.07)",
    marginBottom: "20px",
  },

  summaryIcon: {
    width: "58px",
    height: "58px",
    borderRadius: "15px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "29px",
  },

  summaryLabel: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "700",
  },

  summaryNumber: {
    margin: "3px 0 0",
    color: "#172554",
    fontSize: "28px",
    fontWeight: "800",
  },

  card: {
    background: "white",
    borderRadius: "20px",
    padding: "25px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15, 23, 42, 0.07)",
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    marginBottom: "20px",
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

  sectionTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "21px",
    fontWeight: "800",
  },

  sectionSubtitle: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "800px",
  },

  th: {
    textAlign: "left",
    padding: "14px",
    background: "#f8fafc",
    color: "#334155",
    fontSize: "13px",
    fontWeight: "800",
    borderBottom: "1px solid #e2e8f0",
  },

  td: {
    padding: "15px 14px",
    color: "#475569",
    fontSize: "14px",
    borderBottom: "1px solid #f1f5f9",
  },

  idBadge: {
    display: "inline-block",
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "6px 9px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "800",
  },

  studentName: {
    color: "#172554",
    fontWeight: "800",
  },

  actionButtons: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },

  editButton: {
    border: "none",
    background: "#2563eb",
    color: "white",
    padding: "9px 12px",
    borderRadius: "8px",
    fontWeight: "700",
    cursor: "pointer",
  },

  deleteButton: {
    border: "none",
    background: "#dc2626",
    color: "white",
    padding: "9px 12px",
    borderRadius: "8px",
    fontWeight: "700",
    cursor: "pointer",
  },

  loading: {
    textAlign: "center",
    padding: "50px 20px",
    color: "#64748b",
    fontWeight: "700",
  },

  empty: {
    textAlign: "center",
    padding: "50px 20px",
  },

  emptyIcon: {
    fontSize: "45px",
    marginBottom: "10px",
  },

  emptyTitle: {
    margin: 0,
    color: "#172554",
  },

  emptyText: {
    color: "#64748b",
    fontSize: "14px",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.60)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 1000,
    overflowY: "auto",
  },

  modal: {
    width: "100%",
    maxWidth: "760px",
    maxHeight: "94vh",
    background: "white",
    borderRadius: "20px",
    boxShadow:
      "0 25px 60px rgba(15, 23, 42, 0.25)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },

  modalHeader: {
    padding: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "1px solid #e2e8f0",
    flexShrink: 0,
  },

  modalTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "21px",
    fontWeight: "800",
  },

  modalSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  closeButton: {
    border: "none",
    background: "#f1f5f9",
    color: "#475569",
    width: "35px",
    height: "35px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "800",
  },

  modalBody: {
    padding: "20px",
    display: "grid",
    gap: "22px",
    overflowY: "auto",
  },

  formSection: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "15px",
    padding: "17px",
  },

  formSectionTitle: {
    margin: "0 0 16px",
    color: "#1e3a8a",
    fontSize: "16px",
    fontWeight: "800",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "16px",
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
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "12px 13px",
    fontSize: "15px",
    color: "#111827",
    background: "white",
    outline: "none",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "12px 13px",
    fontSize: "15px",
    color: "#111827",
    background: "white",
    outline: "none",
    resize: "vertical",
    fontFamily: "Arial, Helvetica, sans-serif",
  },

  passwordWrapper: {
    position: "relative",
    width: "100%",
  },

  passwordButton: {
    position: "absolute",
    right: "8px",
    top: "50%",
    transform: "translateY(-50%)",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "18px",
    padding: "6px",
  },

  helpText: {
    margin: "5px 0 0",
    color: "#94a3b8",
    fontSize: "11px",
    lineHeight: 1.4,
  },

  modalFooter: {
    padding: "16px 20px",
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    borderTop: "1px solid #e2e8f0",
    flexShrink: 0,
    background: "white",
  },

  cancelButton: {
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#334155",
    padding: "11px 17px",
    borderRadius: "9px",
    fontWeight: "700",
    cursor: "pointer",
  },

  saveButton: {
    border: "none",
    background:
      "linear-gradient(135deg, #2563eb, #4f46e5)",
    color: "white",
    padding: "11px 17px",
    borderRadius: "9px",
    fontWeight: "700",
    cursor: "pointer",
  },

  footer: {
    padding: "25px 10px 10px",
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    flexWrap: "wrap",
    color: "#64748b",
    fontSize: "12px",
    textAlign: "center",
  },
};