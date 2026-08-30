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
  password_hash: string;
  created_at: string | null;
  student_name: string | null;
  admission_date: string | null;
};

export default function TeacherStudentsPage() {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingStudent, setEditingStudent] =
    useState<Student | null>(null);

  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editAdmissionDate, setEditAdmissionDate] = useState("");

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
        "id, student_username, password_hash, created_at, student_name, admission_date"
      )
      .order("id", { ascending: true });

    if (error) {
      console.error("Students loading error:", error);
      setError(error.message);
      setStudents([]);
    } else {
      setStudents(data || []);
    }

    setLoading(false);
  }

  function openEdit(student: Student) {
    setEditingStudent(student);
    setEditName(student.student_name || "");
    setEditUsername(student.student_username || "");
    setEditAdmissionDate(student.admission_date || "");
    setError("");
  }

  function closeEdit() {
    setEditingStudent(null);
    setEditName("");
    setEditUsername("");
    setEditAdmissionDate("");
  }

  async function saveStudent(e: React.FormEvent) {
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

    setSaving(true);
    setError("");

    const { error } = await supabase
      .from("students")
      .update({
        student_name: editName.trim(),
        student_username: editUsername.trim(),
        admission_date: editAdmissionDate.trim() || null,
      })
      .eq("id", editingStudent.id);

    if (error) {
      console.error("Student update error:", error);
      setError(error.message);
      setSaving(false);
      return;
    }

    await loadStudents();

    setSaving(false);
    closeEdit();
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
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.iconBox}>👨‍🎓</div>

            <div>
              <h1 style={styles.title}>Students Management</h1>

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
              onClick={() => router.push("/teacher/settings")}
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

        {error && (
          <div style={styles.error}>
            ❌ {error}
          </div>
        )}

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

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>👥</div>

            <div>
              <h2 style={styles.sectionTitle}>
                All Students
              </h2>

              <p style={styles.sectionSubtitle}>
                Edit or delete student accounts
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
                          {student.student_name || "Unnamed Student"}
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
                            onClick={() => openEdit(student)}
                            style={styles.editButton}
                          >
                            ✏️ Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteStudent(student)}
                            disabled={deletingId === student.id}
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

        {editingStudent && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <div style={styles.modalHeader}>
                <div>
                  <h2 style={styles.modalTitle}>
                    Edit Student
                  </h2>

                  <p style={styles.modalSubtitle}>
                    Update student information
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
                  <div>
                    <label style={styles.label}>
                      Student Name
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
                      Username
                    </label>

                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) =>
                        setEditUsername(e.target.value)
                      }
                      style={styles.input}
                      placeholder="Enter username"
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
                        setEditAdmissionDate(e.target.value)
                      }
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.modalFooter}>
                  <button
                    type="button"
                    onClick={closeEdit}
                    style={styles.cancelButton}
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
                      : "💾 Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
    background: "rgba(15, 23, 42, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 1000,
  },

  modal: {
    width: "100%",
    maxWidth: "520px",
    background: "white",
    borderRadius: "20px",
    boxShadow:
      "0 25px 60px rgba(15, 23, 42, 0.25)",
    overflow: "hidden",
  },

  modalHeader: {
    padding: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "1px solid #e2e8f0",
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
    gap: "17px",
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

  modalFooter: {
    padding: "16px 20px",
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    borderTop: "1px solid #e2e8f0",
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