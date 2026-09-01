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
  address: string | null;
  student_mobile: string | null;
  father_mobile: string | null;
  mother_mobile: string | null;
  class_name: string | null;
  section: string | null;
  gender: string | null;
  blood_group: string | null;
  email: string | null;
  notes: string | null;
  father_phone: string | null;
  mother_phone: string | null;
  city: string | null;
  profile_image_url: string | null;
};

export default function TeacherStudentsPage() {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editingStudent, setEditingStudent] =
    useState<Student | null>(null);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editAdmissionDate, setEditAdmissionDate] = useState("");
  const [editDateOfBirth, setEditDateOfBirth] = useState("");

  const [editFatherName, setEditFatherName] = useState("");
  const [editMotherName, setEditMotherName] = useState("");

  const [editStudentMobile, setEditStudentMobile] = useState("");
  const [editFatherMobile, setEditFatherMobile] = useState("");
  const [editMotherMobile, setEditMotherMobile] = useState("");

  const [editFatherPhone, setEditFatherPhone] = useState("");
  const [editMotherPhone, setEditMotherPhone] = useState("");

  const [editClassName, setEditClassName] = useState("");
  const [editSection, setEditSection] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editBloodGroup, setEditBloodGroup] = useState("");

  const [editEmail, setEditEmail] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editProfileImageUrl, setEditProfileImageUrl] = useState("");

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("students")
      .select(`
        id,
        student_username,
        password_hash,
        created_at,
        student_name,
        admission_date,
        date_of_birth,
        father_name,
        mother_name,
        address,
        student_mobile,
        father_mobile,
        mother_mobile,
        class_name,
        section,
        gender,
        blood_group,
        email,
        notes,
        father_phone,
        mother_phone,
        city,
        profile_image_url
      `)
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
    setEditPassword("");

    setEditAdmissionDate(student.admission_date || "");
    setEditDateOfBirth(student.date_of_birth || "");

    setEditFatherName(student.father_name || "");
    setEditMotherName(student.mother_name || "");

    setEditStudentMobile(student.student_mobile || "");
    setEditFatherMobile(student.father_mobile || "");
    setEditMotherMobile(student.mother_mobile || "");

    setEditFatherPhone(student.father_phone || "");
    setEditMotherPhone(student.mother_phone || "");

    setEditClassName(student.class_name || "");
    setEditSection(student.section || "");
    setEditGender(student.gender || "");
    setEditBloodGroup(student.blood_group || "");

    setEditEmail(student.email || "");
    setEditCity(student.city || "");
    setEditAddress(student.address || "");
    setEditNotes(student.notes || "");
    setEditProfileImageUrl(student.profile_image_url || "");

    setError("");
    setSuccess("");
  }

  function closeEdit() {
    if (saving) return;

    setEditingStudent(null);
    setEditName("");
    setEditUsername("");
    setEditPassword("");
    setEditAdmissionDate("");
    setEditDateOfBirth("");
    setEditFatherName("");
    setEditMotherName("");
    setEditStudentMobile("");
    setEditFatherMobile("");
    setEditMotherMobile("");
    setEditFatherPhone("");
    setEditMotherPhone("");
    setEditClassName("");
    setEditSection("");
    setEditGender("");
    setEditBloodGroup("");
    setEditEmail("");
    setEditCity("");
    setEditAddress("");
    setEditNotes("");
    setEditProfileImageUrl("");
  }

  async function saveStudent(
    e: React.FormEvent<HTMLFormElement>
  ) {
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
    setSuccess("");

    const updateData: Partial<Student> = {
      student_name: editName.trim(),
      student_username: editUsername.trim(),
      admission_date:
        editAdmissionDate.trim() || null,
      date_of_birth:
        editDateOfBirth.trim() || null,
      father_name:
        editFatherName.trim() || null,
      mother_name:
        editMotherName.trim() || null,
      student_mobile:
        editStudentMobile.trim() || null,
      father_mobile:
        editFatherMobile.trim() || null,
      mother_mobile:
        editMotherMobile.trim() || null,
      father_phone:
        editFatherPhone.trim() || null,
      mother_phone:
        editMotherPhone.trim() || null,
      class_name:
        editClassName.trim() || null,
      section:
        editSection.trim() || null,
      gender:
        editGender.trim() || null,
      blood_group:
        editBloodGroup.trim() || null,
      email:
        editEmail.trim() || null,
      city:
        editCity.trim() || null,
      address:
        editAddress.trim() || null,
      notes:
        editNotes.trim() || null,
      profile_image_url:
        editProfileImageUrl.trim() || null,
    };

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

    const updatedName = editName.trim();

    await loadStudents();

    setEditingStudent(null);
    setEditName("");
    setEditUsername("");
    setEditPassword("");
    setEditAdmissionDate("");
    setEditDateOfBirth("");
    setEditFatherName("");
    setEditMotherName("");
    setEditStudentMobile("");
    setEditFatherMobile("");
    setEditMotherMobile("");
    setEditFatherPhone("");
    setEditMotherPhone("");
    setEditClassName("");
    setEditSection("");
    setEditGender("");
    setEditBloodGroup("");
    setEditEmail("");
    setEditCity("");
    setEditAddress("");
    setEditNotes("");
    setEditProfileImageUrl("");

    setSuccess(
      `${updatedName} profile updated successfully.`
    );

    setSaving(false);

    setTimeout(() => {
      setSuccess("");
    }, 4000);
  }

  async function deleteStudent(student: Student) {
    const studentName =
      student.student_name ||
      student.student_username;

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
      current.filter(
        (item) => item.id !== student.id
      )
    );

    setDeletingId(null);

    setSuccess(
      `${studentName} has been deleted successfully.`
    );

    setTimeout(() => {
      setSuccess("");
    }, 4000);
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
            <div style={styles.iconBox}>
              👨‍🎓
            </div>

            <div style={styles.headerText}>
              <h1 style={styles.title}>
                Students Management
              </h1>

              <p style={styles.subtitle}>
                Manage complete student profiles
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

        <section style={styles.summaryCard}>
          <div style={styles.summaryIcon}>
            👨‍🎓
          </div>

          <div style={styles.summaryText}>
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
            <div style={styles.cardIcon}>
              👥
            </div>

            <div style={styles.cardHeaderText}>
              <h2 style={styles.sectionTitle}>
                All Students
              </h2>

              <p style={styles.sectionSubtitle}>
                Edit complete profiles or delete student
                accounts
              </p>
            </div>
          </div>

          {loading ? (
            <div style={styles.loading}>
              ⏳ Loading students...
            </div>
          ) : students.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>
                👨‍🎓
              </div>

              <h3 style={styles.emptyTitle}>
                No Students Found
              </h3>

              <p style={styles.emptyText}>
                There are currently no students in the
                database.
              </p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>
                      ID
                    </th>

                    <th style={styles.th}>
                      Student Name
                    </th>

                    <th style={styles.th}>
                      Username
                    </th>

                    <th style={styles.th}>
                      Admission Date
                    </th>

                    <th style={styles.th}>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {students.map(
                    (student, index) => (
                      <tr key={student.id}>
                        <td style={styles.td}>
                          <span
                            style={styles.idBadge}
                          >
                            {student.student_username ||
                              `STU${1001 + index}`}
                          </span>
                        </td>

                        <td style={styles.td}>
                          <div
                            style={
                              styles.studentName
                            }
                          >
                            {student.student_name ||
                              "Unnamed Student"}
                          </div>
                        </td>

                        <td style={styles.td}>
                          {
                            student.student_username
                          }
                        </td>

                        <td style={styles.td}>
                          {student.admission_date ||
                            "Not set"}
                        </td>

                        <td style={styles.td}>
                          <div
                            style={
                              styles.actionButtons
                            }
                          >
                            <button
                              type="button"
                              onClick={() =>
                                openEdit(student)
                              }
                              style={
                                styles.editButton
                              }
                            >
                              ✏️ Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                deleteStudent(
                                  student
                                )
                              }
                              disabled={
                                deletingId ===
                                student.id
                              }
                              style={{
                                ...styles.deleteButton,
                                opacity:
                                  deletingId ===
                                  student.id
                                    ? 0.6
                                    : 1,
                              }}
                            >
                              {deletingId ===
                              student.id
                                ? "Deleting..."
                                : "🗑️ Delete"}
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

        {editingStudent && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <div style={styles.modalHeader}>
                <div
                  style={styles.modalHeaderText}
                >
                  <h2 style={styles.modalTitle}>
                    ✏️ Edit Student Profile
                  </h2>

                  <p style={styles.modalSubtitle}>
                    Update complete student
                    information
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={saving}
                  style={styles.closeButton}
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={saveStudent}
                style={styles.modalForm}
              >
                <div style={styles.modalBody}>
                  <div style={styles.formSection}>
                    <h3
                      style={
                        styles.formSectionTitle
                      }
                    >
                      🔐 Account Details
                    </h3>

                    <div style={styles.formGrid}>
                      <div style={styles.field}>
                        <label
                          style={styles.label}
                        >
                          Username
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
                        />
                      </div>

                      <div style={styles.field}>
                        <label
                          style={styles.label}
                        >
                          New Password
                        </label>

                        <input
                          type="text"
                          value={editPassword}
                          onChange={(e) =>
                            setEditPassword(
                              e.target.value
                            )
                          }
                          placeholder="Leave blank to keep current password"
                          style={styles.input}
                        />

                        <p
                          style={
                            styles.helpText
                          }
                        >
                          Enter a password only if
                          you want to change it.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div style={styles.formSection}>
                    <h3
                      style={
                        styles.formSectionTitle
                      }
                    >
                      👤 Basic Details
                    </h3>

                    <div style={styles.formGrid}>
                      <div style={styles.field}>
                        <label
                          style={styles.label}
                        >
                          Student Name *
                        </label>

                        <input
                          type="text"
                          value={editName}
                          onChange={(e) =>
                            setEditName(
                              e.target.value
                            )
                          }
                          style={styles.input}
                          required
                        />
                      </div>

                      <div style={styles.field}>
                        <label
                          style={styles.label}
                        >
                          Date of Birth
                        </label>

                        <input
                          type="date"
                          value={
                            editDateOfBirth
                          }
                          onChange={(e) =>
                            setEditDateOfBirth(
                              e.target.value
                            )
                          }
                          style={styles.input}
                        />
                      </div>

                      <div style={styles.field}>
                        <label
                          style={styles.label}
                        >
                          Admission Date
                        </label>

                        <input
                          type="date"
                          value={
                            editAdmissionDate
                          }
                          onChange={(e) =>
                            setEditAdmissionDate(
                              e.target.value
                            )
                          }
                          style={styles.input}
                        />
                      </div>

                      <div style={styles.field}>
                        <label
                          style={styles.label}
                        >
                          Gender
                        </label>

                        <select
                          value={editGender}
                          onChange={(e) =>
                            setEditGender(
                              e.target.value
                            )
                          }
                          style={styles.input}
                        >
                          <option value="">
                            Select Gender
                          </option>

                          <option value="Male">
                            Male
                          </option>

                          <option value="Female">
                            Female
                          </option>

                          <option value="Other">
                            Other
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div style={styles.formSection}>
                    <h3
                      style={
                        styles.formSectionTitle
                      }
                    >
                      👨‍👩‍👧 Parent Details
                    </h3>

                    <div style={styles.formGrid}>
                      <div style={styles.field}>
                        <label
                          style={styles.label}
                        >
                          Father's Name
                        </label>

                        <input
                          type="text"
                          value={
                            editFatherName
                          }
                          onChange={(e) =>
                            setEditFatherName(
                              e.target.value
                            )
                          }
                          style={styles.input}
                        />
                      </div>

                      <div style={styles.field}>
                        <label
                          style={styles.label}
                        >
                          Mother's Name
                        </label>

                        <input
                          type="text"
                          value={
                            editMotherName
                          }
                          onChange={(e) =>
                            setEditMotherName(
                              e.target.value
                            )
                          }
                          style={styles.input}
                        />
                      </div>

                      <div style={styles.field}>
                        <label
                          style={styles.label}
                        >
                          Father's Phone
                        </label>

                        <input
                          type="tel"
                          value={
                            editFatherPhone
                          }
                          onChange={(e) =>
                            setEditFatherPhone(
                              e.target.value
                            )
                          }
                          style={styles.input}
                        />
                      </div>

                      <div style={styles.field}>
                        <label
                          style={styles.label}
                        >
                          Mother's Phone
                        </label>

                        <input
                          type="tel"
                          value={
                            editMotherPhone
                          }
                          onChange={(e) =>
                            setEditMotherPhone(
                              e.target.value
                            )
                          }
                          style={styles.input}
                        />
                      </div>

                      <div style={styles.field}>
                        <label
                          style={styles.label}
                        >
                          Father Mobile
                        </label>

                        <input
                          type="tel"
                          value={
                            editFatherMobile
                          }
                          onChange={(e) =>
                            setEditFatherMobile(
                              e.target.value
                            )
                          }
                          style={styles.input}
                        />
                      </div>

                      <div style={styles.field}>
                        <label
                          style={styles.label}
                        >
                          Mother Mobile
                        </label>

                        <input
                          type="tel"
                          value={
                            editMotherMobile
                          }
                          onChange={(e) =>
                            setEditMotherMobile(
                              e.target.value
                            )
                          }
                          style={styles.input}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={styles.formSection}>
                    <h3
                      style={
                        styles.formSectionTitle
                      }
                    >
                      📱 Contact Details
                    </h3>

                    <div style={styles.formGrid}>
                      <div style={styles.field}>
                        <label
                          style={styles.label}
                        >
                          Student Mobile
                        </label>

                        <input
                          type="tel"
                          value={
                            editStudentMobile
                          }
                          onChange={(e) =>
                            setEditStudentMobile(
                              e.target.value
                            )
                          }
                          style={styles.input}
                        />
                      </div>

                      <div style={styles.field}>
                        <label
                          style={styles.label}
                        >
                          Email
                        </label>

                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) =>
                            setEditEmail(
                              e.target.value
                            )
                          }
                          style={styles.input}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={styles.formSection}>
                    <h3
                      style={
                        styles.formSectionTitle
                      }
                    >
                      🎓 Academic Details
                    </h3>

                    <div style={styles.formGrid}>
                      <div style={styles.field}>
                        <label
                          style={styles.label}
                        >
                          Class
                        </label>

                        <input
                          type="text"
                          value={
                            editClassName
                          }
                          onChange={(e) =>
                            setEditClassName(
                              e.target.value
                            )
                          }
                          placeholder="Example: B.Tech CSE-AIML"
                          style={styles.input}
                        />
                      </div>

                      <div style={styles.field}>
                        <label
                          style={styles.label}
                        >
                          Section
                        </label>

                        <input
                          type="text"
                          value={editSection}
                          onChange={(e) =>
                            setEditSection(
                              e.target.value
                            )
                          }
                          style={styles.input}
                        />
                      </div>

                      <div style={styles.field}>
                        <label
                          style={styles.label}
                        >
                          Blood Group
                        </label>

                        <select
                          value={
                            editBloodGroup
                          }
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
                    </div>
                  </div>

                  <div style={styles.formSection}>
                    <h3
                      style={
                        styles.formSectionTitle
                      }
                    >
                      📍 Address Details
                    </h3>

                    <div style={styles.formGrid}>
                      <div style={styles.field}>
                        <label
                          style={styles.label}
                        >
                          City
                        </label>

                        <input
                          type="text"
                          value={editCity}
                          onChange={(e) =>
                            setEditCity(
                              e.target.value
                            )
                          }
                          style={styles.input}
                        />
                      </div>

                      <div
                        style={
                          styles.fullWidthField
                        }
                      >
                        <label
                          style={styles.label}
                        >
                          Complete Address
                        </label>

                        <textarea
                          value={editAddress}
                          onChange={(e) =>
                            setEditAddress(
                              e.target.value
                            )
                          }
                          rows={4}
                          style={
                            styles.textarea
                          }
                          placeholder="Enter complete address"
                        />
                      </div>
                    </div>
                  </div>

                  <div style={styles.formSection}>
                    <h3
                      style={
                        styles.formSectionTitle
                      }
                    >
                      📝 Other Information
                    </h3>

                    <div
                      style={
                        styles.fullWidthField
                      }
                    >
                      <label
                        style={styles.label}
                      >
                        Profile Image URL
                      </label>

                      <input
                        type="url"
                        value={
                          editProfileImageUrl
                        }
                        onChange={(e) =>
                          setEditProfileImageUrl(
                            e.target.value
                          )
                        }
                        style={styles.input}
                        placeholder="https://..."
                      />
                    </div>

                    <div style={styles.notesField}>
                      <label
                        style={styles.label}
                      >
                        Notes
                      </label>

                      <textarea
                        value={editNotes}
                        onChange={(e) =>
                          setEditNotes(
                            e.target.value
                          )
                        }
                        rows={4}
                        style={styles.textarea}
                        placeholder="Additional notes about the student"
                      />
                    </div>
                  </div>
                </div>

                <div style={styles.modalFooter}>
                  <button
                    type="button"
                    onClick={closeEdit}
                    disabled={saving}
                    style={
                      styles.cancelButton
                    }
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
                      ? "⏳ Saving..."
                      : "💾 Save Complete Profile"}
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
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    overflowX: "hidden",
    background:
      "linear-gradient(135deg, #eef2ff, #f8fafc, #eff6ff)",
    padding: "20px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    wordBreak: "normal",
    overflowWrap: "normal",
    whiteSpace: "normal",
  },

  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
    boxSizing: "border-box",
    minWidth: 0,
    wordBreak: "normal",
    overflowWrap: "normal",
    whiteSpace: "normal",
  },

  header: {
    width: "100%",
    boxSizing: "border-box",
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
    minWidth: 0,
    wordBreak: "normal",
    overflowWrap: "normal",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    minWidth: 0,
    flex: "1 1 300px",
  },

  headerText: {
    minWidth: 0,
    flex: 1,
    wordBreak: "normal",
    overflowWrap: "normal",
    whiteSpace: "normal",
  },

  iconBox: {
    width: "55px",
    height: "55px",
    minWidth: "55px",
    borderRadius: "15px",
    background:
      "linear-gradient(135deg, #2563eb, #7c3aed)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
    flexShrink: 0,
  },

  title: {
    margin: 0,
    color: "#172554",
    fontSize: "26px",
    fontWeight: "800",
    lineHeight: 1.2,
    wordBreak: "normal",
    overflowWrap: "normal",
    whiteSpace: "normal",
  },

  subtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
    lineHeight: 1.4,
    wordBreak: "normal",
    overflowWrap: "normal",
    whiteSpace: "normal",
  },

  headerButtons: {
    display: "flex",
    gap: "9px",
    flexWrap: "wrap",
    flexShrink: 0,
    minWidth: 0,
  },

  dashboardButton: {
    border: "none",
    background: "#1e3a8a",
    color: "white",
    padding: "11px 15px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
    whiteSpace: "nowrap",
    wordBreak: "normal",
  },

  settingsButton: {
    border: "none",
    background: "#475569",
    color: "white",
    padding: "11px 15px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
    whiteSpace: "nowrap",
    wordBreak: "normal",
  },

  logoutButton: {
    border: "none",
    background: "#dc2626",
    color: "white",
    padding: "11px 15px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
    whiteSpace: "nowrap",
    wordBreak: "normal",
  },

  error: {
    width: "100%",
    boxSizing: "border-box",
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    padding: "14px 16px",
    borderRadius: "12px",
    marginBottom: "20px",
    fontWeight: "700",
    lineHeight: 1.5,
    wordBreak: "normal",
    overflowWrap: "normal",
    whiteSpace: "normal",
  },

  success: {
    width: "100%",
    boxSizing: "border-box",
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #86efac",
    padding: "14px 16px",
    borderRadius: "12px",
    marginBottom: "20px",
    fontWeight: "700",
    lineHeight: 1.5,
    wordBreak: "normal",
    overflowWrap: "normal",
    whiteSpace: "normal",
  },

  summaryCard: {
    width: "100%",
    boxSizing: "border-box",
    background: "white",
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    boxShadow:
      "0 8px 25px rgba(15, 23, 42, 0.07)",
    marginBottom: "20px",
    minWidth: 0,
  },

  summaryIcon: {
    width: "58px",
    height: "58px",
    minWidth: "58px",
    borderRadius: "15px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "29px",
    flexShrink: 0,
  },

  summaryText: {
    minWidth: 0,
    flex: 1,
    wordBreak: "normal",
    overflowWrap: "normal",
  },

  summaryLabel: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "700",
    lineHeight: 1.4,
    whiteSpace: "normal",
  },

  summaryNumber: {
    margin: "3px 0 0",
    color: "#172554",
    fontSize: "28px",
    fontWeight: "800",
    lineHeight: 1.2,
  },

  card: {
    width: "100%",
    boxSizing: "border-box",
    background: "white",
    borderRadius: "20px",
    padding: "25px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15, 23, 42, 0.07)",
    minWidth: 0,
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    marginBottom: "20px",
    minWidth: 0,
  },

  cardIcon: {
    width: "48px",
    height: "48px",
    minWidth: "48px",
    borderRadius: "14px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    flexShrink: 0,
  },

  cardHeaderText: {
    minWidth: 0,
    flex: 1,
    wordBreak: "normal",
    overflowWrap: "normal",
  },

  sectionTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "21px",
    fontWeight: "800",
    lineHeight: 1.3,
    wordBreak: "normal",
    overflowWrap: "normal",
    whiteSpace: "normal",
  },

  sectionSubtitle: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "13px",
    lineHeight: 1.5,
    wordBreak: "normal",
    overflowWrap: "normal",
    whiteSpace: "normal",
  },

  tableWrapper: {
    width: "100%",
    maxWidth: "100%",
    overflowX: "auto",
    overflowY: "hidden",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    WebkitOverflowScrolling: "touch",
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
    whiteSpace: "nowrap",
    wordBreak: "normal",
  },

  td: {
    padding: "15px 14px",
    color: "#475569",
    fontSize: "14px",
    borderBottom: "1px solid #f1f5f9",
    whiteSpace: "normal",
    wordBreak: "normal",
    overflowWrap: "normal",
  },

  idBadge: {
    display: "inline-block",
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "6px 9px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "800",
    whiteSpace: "nowrap",
    wordBreak: "normal",
  },

  studentName: {
    color: "#172554",
    fontWeight: "800",
    whiteSpace: "normal",
    wordBreak: "normal",
    overflowWrap: "normal",
    lineHeight: 1.4,
  },

  actionButtons: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    minWidth: 0,
  },

  editButton: {
    border: "none",
    background: "#2563eb",
    color: "white",
    padding: "9px 12px",
    borderRadius: "8px",
    fontWeight: "700",
    cursor: "pointer",
    whiteSpace: "nowrap",
    wordBreak: "normal",
  },

  deleteButton: {
    border: "none",
    background: "#dc2626",
    color: "white",
    padding: "9px 12px",
    borderRadius: "8px",
    fontWeight: "700",
    cursor: "pointer",
    whiteSpace: "nowrap",
    wordBreak: "normal",
  },

  loading: {
    textAlign: "center",
    padding: "50px 20px",
    color: "#64748b",
    fontWeight: "700",
    lineHeight: 1.5,
    whiteSpace: "normal",
    wordBreak: "normal",
    overflowWrap: "normal",
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
    wordBreak: "normal",
    overflowWrap: "normal",
  },

  emptyText: {
    color: "#64748b",
    fontSize: "14px",
    lineHeight: 1.5,
    wordBreak: "normal",
    overflowWrap: "normal",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    width: "100%",
    height: "100%",
    background: "rgba(15, 23, 42, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    boxSizing: "border-box",
    zIndex: 1000,
    overflow: "auto",
  },

  modal: {
    width: "100%",
    maxWidth: "700px",
    maxHeight: "92vh",
    background: "white",
    borderRadius: "20px",
    boxShadow:
      "0 25px 60px rgba(15, 23, 42, 0.25)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    minWidth: 0,
  },

  modalHeader: {
    flexShrink: 0,
    padding: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
    borderBottom: "1px solid #e2e8f0",
    background: "white",
    minWidth: 0,
  },

  modalHeaderText: {
    minWidth: 0,
    flex: 1,
    wordBreak: "normal",
    overflowWrap: "normal",
  },

  modalTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "21px",
    fontWeight: "800",
    lineHeight: 1.3,
    wordBreak: "normal",
    overflowWrap: "normal",
    whiteSpace: "normal",
  },

  modalSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
    lineHeight: 1.5,
    wordBreak: "normal",
    overflowWrap: "normal",
    whiteSpace: "normal",
  },

  closeButton: {
    border: "none",
    background: "#f1f5f9",
    color: "#475569",
    width: "35px",
    height: "35px",
    minWidth: "35px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "800",
    flexShrink: 0,
  },

  modalForm: {
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    flex: 1,
    minWidth: 0,
  },

  modalBody: {
    padding: "20px",
    display: "grid",
    gap: "18px",
    overflowY: "auto",
    overflowX: "hidden",
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },

  formSection: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "15px",
    padding: "17px",
    minWidth: 0,
    boxSizing: "border-box",
  },

  formSectionTitle: {
    margin: "0 0 15px",
    color: "#172554",
    fontSize: "16px",
    fontWeight: "800",
    lineHeight: 1.4,
    wordBreak: "normal",
    overflowWrap: "normal",
    whiteSpace: "normal",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(min(230px, 100%), 1fr))",
    gap: "15px",
    minWidth: 0,
  },

  field: {
    minWidth: 0,
    width: "100%",
  },

  fullWidthField: {
    width: "100%",
    minWidth: 0,
    gridColumn: "1 / -1",
  },

  notesField: {
    width: "100%",
    minWidth: 0,
    marginTop: "15px",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    color: "#334155",
    fontSize: "13px",
    fontWeight: "700",
    lineHeight: 1.4,
    wordBreak: "normal",
    overflowWrap: "normal",
    whiteSpace: "normal",
  },

  input: {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "11px 12px",
    fontSize: "14px",
    color: "#111827",
    background: "white",
    outline: "none",
    minWidth: 0,
  },

  textarea: {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "11px 12px",
    fontSize: "14px",
    color: "#111827",
    background: "white",
    outline: "none",
    resize: "vertical",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    lineHeight: 1.5,
    minWidth: 0,
  },

  helpText: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "11px",
    lineHeight: 1.4,
    wordBreak: "normal",
    overflowWrap: "normal",
    whiteSpace: "normal",
  },

  modalFooter: {
    flexShrink: 0,
    padding: "16px 20px",
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    borderTop: "1px solid #e2e8f0",
    background: "white",
    flexWrap: "wrap",
  },

  cancelButton: {
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#334155",
    padding: "11px 17px",
    borderRadius: "9px",
    fontWeight: "700",
    cursor: "pointer",
    whiteSpace: "nowrap",
    wordBreak: "normal",
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
    whiteSpace: "nowrap",
    wordBreak: "normal",
  },

  footer: {
    padding: "25px 10px 10px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
    color: "#64748b",
    fontSize: "12px",
    textAlign: "center",
    lineHeight: 1.5,
    wordBreak: "normal",
    overflowWrap: "normal",
    whiteSpace: "normal",
  },
};