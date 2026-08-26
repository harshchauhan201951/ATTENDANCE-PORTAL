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
  student_username: string;
  password: string;
  admission_date: string;
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
  student_username: "",
  password: "",
  admission_date: "",
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

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState<FormData>(emptyForm);
  const [search, setSearch] = useState("");

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("students")
      .select(
        `
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
        `
      )
      .order("id", { ascending: true });

    if (error) {
      console.error(error);

      setErrorMessage(
        "Students load nahi ho rahe: " + error.message
      );

      setStudents([]);
    } else {
      setStudents((data || []) as Student[]);
    }

    setLoading(false);
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

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
    setErrorMessage("");
    setShowForm(true);
  }

  function openEditForm(student: Student) {
    setEditingId(student.id);

    setForm({
      student_name: student.student_name || "",
      student_username: student.student_username || "",
      password: "",
      admission_date: student.admission_date || "",
      date_of_birth: student.date_of_birth || "",
      father_name: student.father_name || "",
      mother_name: student.mother_name || "",
      father_phone: student.father_phone || "",
      mother_phone: student.mother_phone || "",
      address: student.address || "",
      city: student.city || "",
      class_name: student.class_name || "",
      blood_group: student.blood_group || "",
    });

    setMessage("");
    setErrorMessage("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
    setErrorMessage("");
  }

  async function saveStudent() {
    setMessage("");
    setErrorMessage("");

    const studentName = form.student_name.trim();
    const username = form.student_username.trim().toUpperCase();
    const password = form.password.trim();

    if (!studentName) {
      setErrorMessage("Student name zaroori hai.");
      return;
    }

    if (!username) {
      setErrorMessage("Student username zaroori hai.");
      return;
    }

    /*
     * Password is required only while adding
     * a new student.
     *
     * While editing, blank password means:
     * keep existing password.
     */
    if (editingId === null && !password) {
      setErrorMessage(
        "New student ke liye password zaroori hai."
      );
      return;
    }

    if (username.length < 3) {
      setErrorMessage(
        "Username kam se kam 3 characters ka hona chahiye."
      );
      return;
    }

    if (password && password.length < 4) {
      setErrorMessage(
        "Password kam se kam 4 characters ka hona chahiye."
      );
      return;
    }

    setSaving(true);

    try {
      /*
       * ========================================
       * DUPLICATE USERNAME CHECK
       * ========================================
       */

      const { data: existingStudent, error: usernameCheckError } =
        await supabase
          .from("students")
          .select("id, student_username")
          .eq("student_username", username)
          .maybeSingle();

      if (usernameCheckError) {
        throw usernameCheckError;
      }

      if (
        existingStudent &&
        existingStudent.id !== editingId
      ) {
        setErrorMessage(
          `Username "${username}" already exists. Please use a different username.`
        );

        setSaving(false);
        return;
      }

      /*
       * ========================================
       * COMMON STUDENT DATA
       * ========================================
       */

      const studentData = {
        student_name: studentName,
        student_username: username,
        admission_date:
          form.admission_date || null,
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
          form.blood_group.trim() || null,
      };

      /*
       * ========================================
       * EDIT STUDENT
       * ========================================
       */

      if (editingId !== null) {
        const { error } = await supabase
          .from("students")
          .update(studentData)
          .eq("id", editingId);

        if (error) {
          throw error;
        }

        /*
         * If a new password was entered while
         * editing, update password separately.
         *
         * This expects the Supabase function:
         * update_student_password
         */
        if (password) {
          const { error: passwordError } =
            await supabase.rpc(
              "update_student_password",
              {
                p_student_id: editingId,
                p_password: password,
              }
            );

          if (passwordError) {
            throw new Error(
              "Student details updated, but password update failed: " +
                passwordError.message
            );
          }
        }

        setMessage(
          "✅ Student details successfully updated."
        );
      } else {
        /*
         * ========================================
         * ADD NEW STUDENT
         * ========================================
         *
         * Use RPC so PostgreSQL can hash the password
         * using crypt() + gen_salt().
         */

        const { error: addError } =
          await supabase.rpc(
            "create_student",
            {
              p_student_name: studentName,
              p_student_username: username,
              p_password: password,
              p_admission_date:
                form.admission_date || null,
              p_date_of_birth:
                form.date_of_birth || null,
              p_father_name:
                form.father_name.trim() || null,
              p_mother_name:
                form.mother_name.trim() || null,
              p_father_phone:
                form.father_phone.trim() || null,
              p_mother_phone:
                form.mother_phone.trim() || null,
              p_address:
                form.address.trim() || null,
              p_city:
                form.city.trim() || null,
              p_class_name:
                form.class_name.trim() || null,
              p_blood_group:
                form.blood_group.trim() || null,
            }
          );

        if (addError) {
          throw addError;
        }

        setMessage(
          "✅ New student successfully added. Student can now login."
        );
      }

      await loadStudents();

      setTimeout(() => {
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);
        setMessage("");
      }, 1200);
    } catch (error: any) {
      console.error("Student save error:", error);

      setErrorMessage(
        error?.message ||
          "Student save nahi ho saka."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteStudent(student: Student) {
    const confirmed = window.confirm(
      `Kya aap "${student.student_name || "Student"}" ko permanently delete karna chahte hain?\n\nIs student ke related attendance records bhi delete ho sakte hain.`
    );

    if (!confirmed) return;

    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", student.id);

    if (error) {
      console.error(error);

      setErrorMessage(
        "Student delete nahi hua: " +
          error.message
      );

      return;
    }

    setMessage(
      "✅ Student successfully deleted."
    );

    await loadStudents();
  }

  const filteredStudents = students.filter(
    (student) => {
      const text = search
        .trim()
        .toLowerCase();

      if (!text) return true;

      return (
        (student.student_name || "")
          .toLowerCase()
          .includes(text) ||
        student.student_username
          .toLowerCase()
          .includes(text) ||
        (student.father_name || "")
          .toLowerCase()
          .includes(text) ||
        (student.mother_name || "")
          .toLowerCase()
          .includes(text)
      );
    }
  );

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

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}

        <header style={styles.header}>
          <div>
            <div style={styles.badge}>
              TEACHER PORTAL
            </div>

            <h1 style={styles.title}>
              👨‍🎓 Students Management
            </h1>

            <p style={styles.subtitle}>
              Add, edit and manage complete
              student information
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

            <button
              onClick={openAddForm}
              style={styles.addButton}
            >
              ＋ Add Student
            </button>
          </div>
        </header>

        {/* MESSAGE */}

        {message && (
          <div style={styles.successBox}>
            {message}
          </div>
        )}

        {errorMessage && (
          <div style={styles.errorBox}>
            ⚠️ {errorMessage}
          </div>
        )}

        {/* SEARCH */}

        <section style={styles.searchCard}>
          <div style={styles.searchTitle}>
            🔎 Search Students
          </div>

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search by name, username, father or mother name..."
            style={styles.searchInput}
          />

          <div style={styles.studentCount}>
            Showing{" "}
            <strong>
              {filteredStudents.length}
            </strong>{" "}
            of{" "}
            <strong>{students.length}</strong>{" "}
            students
          </div>
        </section>

        {/* FORM */}

        {showForm && (
          <section style={styles.formCard}>
            <div style={styles.formHeader}>
              <div>
                <h2 style={styles.formTitle}>
                  {editingId !== null
                    ? "✏️ Edit Student"
                    : "➕ Add New Student"}
                </h2>

                <p style={styles.formSubtitle}>
                  Fill in the student's complete
                  details below.
                </p>
              </div>

              <button
                onClick={closeForm}
                style={styles.closeButton}
                disabled={saving}
              >
                ✕
              </button>
            </div>

            <div style={styles.formGrid}>

              {/* STUDENT NAME */}

              <div style={styles.field}>
                <label style={styles.label}>
                  Student Name *
                </label>

                <input
                  value={form.student_name}
                  onChange={(e) =>
                    updateField(
                      "student_name",
                      e.target.value
                    )
                  }
                  placeholder="Student full name"
                  style={styles.input}
                />
              </div>

              {/* USERNAME */}

              <div style={styles.field}>
                <label style={styles.label}>
                  Username *
                </label>

                <input
                  value={form.student_username}
                  onChange={(e) =>
                    updateField(
                      "student_username",
                      e.target.value.toUpperCase()
                    )
                  }
                  placeholder="STU1001"
                  style={styles.input}
                  autoComplete="off"
                />
              </div>

              {/* PASSWORD */}

              <div style={styles.field}>
                <label style={styles.label}>
                  Password{" "}
                  {editingId === null ? "*" : ""}
                </label>

                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    updateField(
                      "password",
                      e.target.value
                    )
                  }
                  placeholder={
                    editingId !== null
                      ? "Leave blank to keep current password"
                      : "Enter student password"
                  }
                  style={styles.input}
                  autoComplete="new-password"
                />

                <small style={styles.passwordHelp}>
                  {editingId !== null
                    ? "✏️ Enter a password only if you want to change it."
                    : "🔐 This password will be securely hashed before saving."}
                </small>
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

              {/* ADMISSION DATE */}

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
                  placeholder="Father's phone number"
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
                  placeholder="Mother's phone number"
                  style={styles.input}
                />
              </div>

              {/* CLASS */}

              <div style={styles.field}>
                <label style={styles.label}>
                  Class
                </label>

                <input
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
                  Address
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

            {/* FORM ACTIONS */}

            <div style={styles.formActions}>
              <button
                onClick={closeForm}
                disabled={saving}
                style={styles.cancelButton}
              >
                Cancel
              </button>

              <button
                onClick={saveStudent}
                disabled={saving}
                style={styles.saveButton}
              >
                {saving
                  ? "⏳ Saving..."
                  : editingId !== null
                  ? "💾 Save Changes"
                  : "💾 Save Student"}
              </button>
            </div>
          </section>
        )}

        {/* STUDENT LIST */}

        <section style={styles.listCard}>
          <div style={styles.listHeader}>
            <div>
              <h2 style={styles.listTitle}>
                📋 Student List
              </h2>

              <p style={styles.listSubtitle}>
                Complete student information
              </p>
            </div>

            <button
              onClick={loadStudents}
              style={styles.refreshButton}
            >
              🔄 Refresh
            </button>
          </div>

          {loading ? (
            <div style={styles.loading}>
              ⏳ Loading students...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div style={styles.empty}>
              📭 No students found.
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>#</th>

                    <th style={styles.th}>
                      Student
                    </th>

                    <th style={styles.th}>
                      Username
                    </th>

                    <th style={styles.th}>
                      DOB
                    </th>

                    <th style={styles.th}>
                      Father
                    </th>

                    <th style={styles.th}>
                      Mother
                    </th>

                    <th style={styles.th}>
                      Class
                    </th>

                    <th style={styles.th}>
                      City
                    </th>

                    <th style={styles.th}>
                      Blood
                    </th>

                    <th style={styles.th}>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStudents.map(
                    (student, index) => (
                      <tr key={student.id}>

                        <td style={styles.td}>
                          {index + 1}
                        </td>

                        <td style={styles.td}>
                          <div
                            style={
                              styles.studentCell
                            }
                          >
                            <div
                              style={
                                styles.avatar
                              }
                            >
                              {(
                                student.student_name ||
                                "S"
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong
                                style={
                                  styles.studentName
                                }
                              >
                                {student.student_name ||
                                  "Student"}
                              </strong>

                              <div
                                style={
                                  styles.addressSmall
                                }
                              >
                                {student.address ||
                                  "Address not added"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={styles.td}>
                          <span
                            style={
                              styles.username
                            }
                          >
                            {
                              student.student_username
                            }
                          </span>
                        </td>

                        <td style={styles.td}>
                          {formatDate(
                            student.date_of_birth
                          )}
                        </td>

                        <td style={styles.td}>
                          <strong>
                            {student.father_name ||
                              "—"}
                          </strong>

                          {student.father_phone && (
                            <div
                              style={
                                styles.phoneSmall
                              }
                            >
                              📞{" "}
                              {
                                student.father_phone
                              }
                            </div>
                          )}
                        </td>

                        <td style={styles.td}>
                          <strong>
                            {student.mother_name ||
                              "—"}
                          </strong>

                          {student.mother_phone && (
                            <div
                              style={
                                styles.phoneSmall
                              }
                            >
                              📞{" "}
                              {
                                student.mother_phone
                              }
                            </div>
                          )}
                        </td>

                        <td style={styles.td}>
                          {student.class_name ||
                            "—"}
                        </td>

                        <td style={styles.td}>
                          {student.city || "—"}
                        </td>

                        <td style={styles.td}>
                          {student.blood_group ||
                            "—"}
                        </td>

                        <td style={styles.td}>
                          <div
                            style={
                              styles.actionButtons
                            }
                          >
                            <button
                              onClick={() =>
                                openEditForm(
                                  student
                                )
                              }
                              style={
                                styles.editButton
                              }
                            >
                              ✏️ Edit
                            </button>

                            <button
                              onClick={() =>
                                deleteStudent(
                                  student
                                )
                              }
                              style={
                                styles.deleteButton
                              }
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer style={styles.footer}>
          Attendance Portal • Student Management
          • 2026
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
    maxWidth: "1400px",
    margin: "0 auto",
  },

  header: {
    background: "#ffffff",
    borderRadius: "22px",
    padding: "28px",
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
    fontSize: "32px",
    fontWeight: "900",
    color: "#0f172a",
  },

  subtitle: {
    margin: "8px 0 0",
    color: "#475569",
    fontSize: "14px",
    fontWeight: "600",
  },

  headerButtons: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
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

  addButton: {
    border: "none",
    background:
      "linear-gradient(135deg,#2563eb,#7c3aed)",
    color: "#ffffff",
    padding: "12px 18px",
    borderRadius: "10px",
    fontWeight: "900",
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

  searchCard: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "22px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
  },

  searchTitle: {
    fontSize: "18px",
    fontWeight: "900",
    color: "#172554",
    marginBottom: "12px",
  },

  searchInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 15px",
    border: "1px solid #cbd5e1",
    borderRadius: "11px",
    fontSize: "14px",
    outline: "none",
    color: "#0f172a",
    background: "#ffffff",
  },

  studentCount: {
    marginTop: "10px",
    color: "#64748b",
    fontSize: "12px",
  },

  formCard: {
    background: "#ffffff",
    borderRadius: "22px",
    padding: "25px",
    marginBottom: "20px",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.09)",
    border: "2px solid #dbeafe",
  },

  formHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
    marginBottom: "22px",
  },

  formTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "23px",
    fontWeight: "900",
  },

  formSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  closeButton: {
    border: "none",
    background: "#fee2e2",
    color: "#991b1b",
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    fontWeight: "900",
    fontSize: "17px",
    cursor: "pointer",
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

  passwordHelp: {
    color: "#64748b",
    fontSize: "11px",
    lineHeight: 1.4,
  },

  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "22px",
    flexWrap: "wrap",
  },

  cancelButton: {
    border: "1px solid #cbd5e1",
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

  listCard: {
    background: "#ffffff",
    borderRadius: "22px",
    padding: "22px",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.08)",
    overflow: "hidden",
  },

  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "18px",
    flexWrap: "wrap",
  },

  listTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "22px",
    fontWeight: "900",
  },

  listSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "12px",
  },

  refreshButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "11px 16px",
    borderRadius: "10px",
    fontWeight: "800",
    cursor: "pointer",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
  },

  table: {
    width: "100%",
    minWidth: "1250px",
    borderCollapse: "collapse",
    background: "#ffffff",
  },

  th: {
    background: "#172554",
    color: "#ffffff",
    padding: "14px 12px",
    textAlign: "left",
    fontSize: "12px",
    fontWeight: "900",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "13px 12px",
    borderBottom:
      "1px solid #e2e8f0",
    color: "#334155",
    fontSize: "13px",
    fontWeight: "600",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  },

  studentCell: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: "210px",
  },

  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "#dbeafe",
    color: "#1d4ed8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    flexShrink: 0,
  },

  studentName: {
    color: "#0f172a",
    fontSize: "14px",
  },

  addressSmall: {
    marginTop: "3px",
    color: "#94a3b8",
    fontSize: "10px",
    maxWidth: "190px",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  username: {
    background: "#f1f5f9",
    color: "#334155",
    padding: "6px 9px",
    borderRadius: "7px",
    fontSize: "12px",
    fontWeight: "800",
  },

  phoneSmall: {
    marginTop: "4px",
    color: "#64748b",
    fontSize: "10px",
  },

  actionButtons: {
    display: "flex",
    gap: "7px",
    alignItems: "center",
  },

  editButton: {
    border: "none",
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "8px 11px",
    borderRadius: "8px",
    fontWeight: "900",
    cursor: "pointer",
    fontSize: "11px",
  },

  deleteButton: {
    border: "none",
    background: "#fee2e2",
    color: "#b91c1c",
    padding: "8px 11px",
    borderRadius: "8px",
    fontWeight: "900",
    cursor: "pointer",
    fontSize: "11px",
  },

  loading: {
    textAlign: "center",
    padding: "55px",
    color: "#64748b",
    fontWeight: "800",
  },

  empty: {
    textAlign: "center",
    padding: "55px",
    background: "#f8fafc",
    borderRadius: "14px",
    color: "#64748b",
    fontWeight: "800",
  },

  footer: {
    textAlign: "center",
    padding: "25px 10px",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "700",
  },
};