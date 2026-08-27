"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Homework = {
  id: number;
  subject: string;
  title: string;
  description: string;
  due_date: string;
  class_name: string;
  created_at?: string;
};

type Student = {
  id: number;
  student_name: string | null;
  student_username: string;
  class_name: string | null;
};

export default function TeacherHomeworkPage() {
  const router = useRouter();

  const [homework, setHomework] = useState<Homework[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const { data: homeworkData, error: homeworkError } =
        await supabase
          .from("homework")
          .select(
            "id, subject, title, description, due_date, class_name, created_at"
          )
          .order("created_at", {
            ascending: false,
          });

      if (homeworkError) {
        console.error("Homework loading error:", homeworkError);
        setError(
          `Homework table could not be loaded: ${homeworkError.message}`
        );
        return;
      }

      const { data: studentsData, error: studentsError } =
        await supabase
          .from("students")
          .select(
            "id, student_name, student_username, class_name"
          )
          .order("student_name", {
            ascending: true,
          });

      if (studentsError) {
        console.error("Students loading error:", studentsError);
        setError(
          `Students could not be loaded: ${studentsError.message}`
        );
        return;
      }

      setHomework((homeworkData || []) as Homework[]);
      setStudents((studentsData || []) as Student[]);
    } catch (err) {
      console.error("Unexpected loading error:", err);
      setError("Unable to load homework.");
    } finally {
      setLoading(false);
    }
  }

  const classNames = Array.from(
    new Set(
      students
        .map((student) => student.class_name?.trim())
        .filter(
          (value): value is string => Boolean(value)
        )
    )
  ).sort();

  function toggleClass(classValue: string) {
    setSelectedClasses((previous) => {
      if (previous.includes(classValue)) {
        return previous.filter(
          (item) => item !== classValue
        );
      }

      return [...previous, classValue];
    });
  }

  function selectAllClasses() {
    setSelectedClasses(classNames);
  }

  function clearAllClasses() {
    setSelectedClasses([]);
  }

  async function addHomework() {
    setError("");

    if (!subject.trim()) {
      setError("Please enter subject.");
      return;
    }

    if (!title.trim()) {
      setError("Please enter homework title.");
      return;
    }

    if (!description.trim()) {
      setError("Please enter homework description.");
      return;
    }

    if (!dueDate) {
      setError("Please select due date.");
      return;
    }

    if (selectedClasses.length === 0) {
      setError("Please select at least one class.");
      return;
    }

    setSaving(true);

    try {
      const classValue = selectedClasses.join(", ");

      const { data, error: insertError } =
        await supabase
          .from("homework")
          .insert({
            subject: subject.trim(),
            title: title.trim(),
            description: description.trim(),
            due_date: dueDate,
            class_name: classValue,
          })
          .select(
            "id, subject, title, description, due_date, class_name, created_at"
          )
          .single();

      if (insertError) {
        console.error(
          "Homework insert error:",
          insertError
        );

        setError(
          `Homework could not be added: ${insertError.message}`
        );
        return;
      }

      if (data) {
        setHomework((previous) => [
          data as Homework,
          ...previous,
        ]);
      }

      const numberOfClasses = selectedClasses.length;

      setSubject("");
      setTitle("");
      setDescription("");
      setDueDate("");
      setSelectedClasses([]);

      alert(
        `Homework added successfully for ${numberOfClasses} class${
          numberOfClasses !== 1 ? "es" : ""
        }.`
      );
    } catch (err) {
      console.error(
        "Unexpected homework insert error:",
        err
      );

      setError("Unable to add homework.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteHomework(id: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this homework?"
    );

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      const { error: deleteError } =
        await supabase
          .from("homework")
          .delete()
          .eq("id", id);

      if (deleteError) {
        console.error(
          "Homework delete error:",
          deleteError
        );

        setError(
          `Homework could not be deleted: ${deleteError.message}`
        );
        return;
      }

      setHomework((previous) =>
        previous.filter(
          (item) => item.id !== id
        )
      );
    } catch (err) {
      console.error(
        "Unexpected homework delete error:",
        err
      );

      setError("Unable to delete homework.");
    }
  }

  function formatDate(date: string) {
    if (!date) {
      return "";
    }

    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  function getAssignedClasses(
    className: string
  ) {
    return className
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function getStudentCount(
    className: string
  ) {
    const assignedClasses =
      getAssignedClasses(className);

    return students.filter((student) => {
      const studentClass =
        student.class_name?.trim();

      return (
        studentClass &&
        assignedClasses.includes(studentClass)
      );
    }).length;
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        <header style={styles.header}>
          <div>
            <div style={styles.badge}>
              TEACHER PORTAL
            </div>

            <h1 style={styles.title}>
              📚 Homework
            </h1>

            <p style={styles.subtitle}>
              Create and manage homework for
              one or multiple classes
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/teacher/dashboard")
            }
            style={styles.backButton}
          >
            ← Dashboard
          </button>
        </header>

        {error && (
          <div style={styles.errorBox}>
            ⚠️ {error}
          </div>
        )}

        <section style={styles.createCard}>

          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>
              ✏️
            </div>

            <div>
              <h2 style={styles.cardTitle}>
                Create New Homework
              </h2>

              <p style={styles.cardSubtitle}>
                Select one or multiple classes.
              </p>
            </div>
          </div>

          <div style={styles.classSection}>

            <div style={styles.classHeaderRow}>

              <label style={styles.label}>
                Select Classes
              </label>

              <div style={styles.classActions}>

                <button
                  type="button"
                  onClick={selectAllClasses}
                  disabled={
                    classNames.length === 0
                  }
                  style={{
                    ...styles.smallButton,
                    opacity:
                      classNames.length === 0
                        ? 0.5
                        : 1,
                  }}
                >
                  Select All
                </button>

                <button
                  type="button"
                  onClick={clearAllClasses}
                  style={styles.smallButtonSecondary}
                >
                  Clear
                </button>

              </div>
            </div>

            {classNames.length > 0 ? (
              <div style={styles.classGrid}>

                {classNames.map((item) => {

                  const selected =
                    selectedClasses.includes(item);

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        toggleClass(item)
                      }
                      style={{
                        ...styles.classOption,
                        ...(selected
                          ? styles.classOptionSelected
                          : {}),
                      }}
                    >
                      <span
                        style={{
                          ...styles.checkbox,
                          ...(selected
                            ? styles.checkboxSelected
                            : {}),
                        }}
                      >
                        {selected ? "✓" : ""}
                      </span>

                      <span>
                        {item}
                      </span>
                    </button>
                  );
                })}

              </div>
            ) : (
              <div style={styles.noClasses}>
                No classes found in student
                records. Add class names from
                Teacher → Students first.
              </div>
            )}

            <div style={styles.selectedInfo}>

              <div>
                <span style={styles.selectedLabel}>
                  🎯 Selected Classes
                </span>
              </div>

              <div style={styles.selectedClassesText}>
                {selectedClasses.length > 0
                  ? selectedClasses.join(", ")
                  : "No class selected"}
              </div>

            </div>

          </div>

          <div style={styles.formGrid}>

            <div style={styles.field}>

              <label style={styles.label}>
                Subject
              </label>

              <input
                type="text"
                placeholder="e.g. Mathematics"
                value={subject}
                onChange={(e) =>
                  setSubject(e.target.value)
                }
                style={styles.input}
              />

            </div>

            <div style={styles.field}>

              <label style={styles.label}>
                Due Date
              </label>

              <input
                type="date"
                value={dueDate}
                onChange={(e) =>
                  setDueDate(e.target.value)
                }
                style={styles.input}
              />

            </div>

            <div
              style={{
                ...styles.field,
                gridColumn: "1 / -1",
              }}
            >

              <label style={styles.label}>
                Homework Title
              </label>

              <input
                type="text"
                placeholder="Enter homework title"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                style={styles.input}
              />

            </div>

            <div
              style={{
                ...styles.field,
                gridColumn: "1 / -1",
              }}
            >

              <label style={styles.label}>
                Description
              </label>

              <textarea
                rows={5}
                placeholder="Write homework instructions..."
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                style={{
                  ...styles.input,
                  resize: "vertical",
                  minHeight: "120px",
                }}
              />

            </div>

          </div>

          <div style={styles.assignmentInfo}>

            <div style={styles.assignmentIcon}>
              🎯
            </div>

            <div>

              <div style={styles.assignmentTitle}>
                Homework will be assigned to
              </div>

              <div style={styles.assignmentClass}>
                {selectedClasses.length > 0
                  ? selectedClasses.join(" • ")
                  : "Select one or more classes"}
              </div>

              {selectedClasses.length > 0 && (
                <div style={styles.studentCountText}>
                  {
                    students.filter((student) =>
                      selectedClasses.includes(
                        student.class_name?.trim() || ""
                      )
                    ).length
                  }{" "}
                  students will receive this
                  homework
                </div>
              )}

            </div>

          </div>

          <div style={styles.actions}>

            <button
              type="button"
              onClick={addHomework}
              disabled={saving}
              style={{
                ...styles.addButton,
                opacity: saving ? 0.7 : 1,
                cursor: saving
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {saving
                ? "Adding Homework..."
                : "➕ Add Homework"}
            </button>

          </div>

        </section>

        <section style={styles.listCard}>

          <div style={styles.cardHeader}>

            <div style={styles.cardIcon}>
              📋
            </div>

            <div>

              <h2 style={styles.cardTitle}>
                Homework List
              </h2>

              <p style={styles.cardSubtitle}>
                {homework.length} homework item
                {homework.length !== 1
                  ? "s"
                  : ""}
              </p>

            </div>

          </div>

          {loading ? (
            <div style={styles.empty}>

              <div style={styles.emptyIcon}>
                ⏳
              </div>

              <h3 style={styles.emptyTitle}>
                Loading Homework...
              </h3>

            </div>
          ) : homework.length === 0 ? (
            <div style={styles.empty}>

              <div style={styles.emptyIcon}>
                📚
              </div>

              <h3 style={styles.emptyTitle}>
                No Homework Added
              </h3>

              <p style={styles.emptyText}>
                Create your first homework using
                the form above.
              </p>

            </div>
          ) : (
            <div style={styles.homeworkList}>

              {homework.map((item) => {

                const assignedClasses =
                  getAssignedClasses(
                    item.class_name
                  );

                return (
                  <div
                    key={item.id}
                    style={styles.homeworkCard}
                  >

                    <div style={styles.homeworkTop}>

                      <div>

                        <div
                          style={styles.badgeRow}
                        >

                          {assignedClasses.map(
                            (classItem) => (
                              <span
                                key={classItem}
                                style={
                                  styles.classBadge
                                }
                              >
                                {classItem}
                              </span>
                            )
                          )}

                          <span
                            style={
                              styles.subjectBadge
                            }
                          >
                            {item.subject}
                          </span>

                        </div>

                        <h3
                          style={
                            styles.homeworkTitle
                          }
                        >
                          {item.title}
                        </h3>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          deleteHomework(item.id)
                        }
                        style={
                          styles.deleteButton
                        }
                      >
                        🗑️ Delete
                      </button>

                    </div>

                    <p
                      style={
                        styles.homeworkDescription
                      }
                    >
                      {item.description}
                    </p>

                    <div
                      style={
                        styles.homeworkBottom
                      }
                    >

                      <div style={styles.dueDate}>
                        📅 Due:{" "}
                        {formatDate(
                          item.due_date
                        )}
                      </div>

                      <div
                        style={
                          styles.studentCount
                        }
                      >
                        👨‍🎓{" "}
                        {getStudentCount(
                          item.class_name
                        )}{" "}
                        students
                      </div>

                    </div>

                  </div>
                );
              })}

            </div>
          )}

        </section>

        <footer style={styles.footer}>
          Attendance Portal • Teacher Homework • 2026
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

  errorBox: {
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    borderRadius: "12px",
    padding: "13px 15px",
    marginBottom: "18px",
    fontSize: "13px",
    fontWeight: "700",
  },

  createCard: {
    background: "#ffffff",
    borderRadius: "22px",
    padding: "25px",
    marginBottom: "18px",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.08)",
    border: "2px solid #bfdbfe",
  },

  listCard: {
    background: "#ffffff",
    borderRadius: "22px",
    padding: "25px",
    marginBottom: "18px",
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

  classSection: {
    marginBottom: "20px",
    padding: "16px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
  },

  classHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "12px",
  },

  classActions: {
    display: "flex",
    gap: "7px",
    flexWrap: "wrap",
  },

  smallButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "7px 11px",
    borderRadius: "7px",
    fontSize: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  smallButtonSecondary: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#475569",
    padding: "7px 11px",
    borderRadius: "7px",
    fontSize: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  classGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3,minmax(0,1fr))",
    gap: "9px",
  },

  classOption: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    padding: "11px 12px",
    borderRadius: "9px",
    display: "flex",
    alignItems: "center",
    gap: "9px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "800",
    textAlign: "left",
  },

  classOptionSelected: {
    border: "2px solid #2563eb",
    background: "#eff6ff",
    color: "#1d4ed8",
  },

  checkbox: {
    width: "20px",
    height: "20px",
    borderRadius: "5px",
    border: "1px solid #cbd5e1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontSize: "12px",
    fontWeight: "900",
  },

  checkboxSelected: {
    background: "#2563eb",
    border: "1px solid #2563eb",
    color: "#ffffff",
  },

  noClasses: {
    padding: "14px",
    borderRadius: "9px",
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    color: "#9a3412",
    fontSize: "12px",
    fontWeight: "700",
  },

  selectedInfo: {
    marginTop: "12px",
    padding: "12px",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "9px",
  },

  selectedLabel: {
    color: "#475569",
    fontSize: "11px",
    fontWeight: "800",
  },

  selectedClassesText: {
    marginTop: "4px",
    color: "#1d4ed8",
    fontSize: "13px",
    fontWeight: "900",
    wordBreak: "break-word",
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

  assignmentInfo: {
    marginTop: "18px",
    padding: "14px",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  assignmentIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "11px",
    background: "#dbeafe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    flexShrink: 0,
  },

  assignmentTitle: {
    color: "#475569",
    fontSize: "11px",
    fontWeight: "800",
  },

  assignmentClass: {
    color: "#1d4ed8",
    fontSize: "15px",
    fontWeight: "900",
    marginTop: "3px",
    wordBreak: "break-word",
  },

  studentCountText: {
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "700",
    marginTop: "3px",
  },

  actions: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "20px",
  },

  addButton: {
    border: "none",
    background:
      "linear-gradient(135deg,#2563eb,#7c3aed)",
    color: "#ffffff",
    padding: "13px 22px",
    borderRadius: "11px",
    fontWeight: "900",
    fontSize: "14px",
  },

  empty: {
    textAlign: "center",
    padding: "50px 20px",
    background: "#f8fafc",
    borderRadius: "16px",
    border: "1px dashed #cbd5e1",
  },

  emptyIcon: {
    fontSize: "45px",
    marginBottom: "10px",
  },

  emptyTitle: {
    margin: "5px 0",
    color: "#334155",
    fontSize: "18px",
    fontWeight: "900",
  },

  emptyText: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "600",
  },

  homeworkList: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },

  homeworkCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "18px",
    background: "#f8fafc",
  },

  homeworkTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
    flexWrap: "wrap",
  },

  badgeRow: {
    display: "flex",
    gap: "7px",
    flexWrap: "wrap",
  },

  classBadge: {
    display: "inline-block",
    background: "#ede9fe",
    color: "#6d28d9",
    padding: "5px 9px",
    borderRadius: "7px",
    fontSize: "10px",
    fontWeight: "900",
  },

  subjectBadge: {
    display: "inline-block",
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "5px 9px",
    borderRadius: "7px",
    fontSize: "10px",
    fontWeight: "900",
    textTransform: "uppercase",
  },

  homeworkTitle: {
    margin: "8px 0 0",
    color: "#172554",
    fontSize: "19px",
    fontWeight: "900",
  },

  homeworkDescription: {
    margin: "14px 0",
    color: "#475569",
    fontSize: "13px",
    lineHeight: 1.6,
    fontWeight: "600",
    whiteSpace: "pre-wrap",
  },

  homeworkBottom: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    paddingTop: "12px",
    borderTop: "1px solid #e2e8f0",
    flexWrap: "wrap",
  },

  dueDate: {
    color: "#475569",
    fontSize: "12px",
    fontWeight: "800",
  },

  studentCount: {
    background: "#dcfce7",
    color: "#166534",
    padding: "7px 10px",
    borderRadius: "8px",
    fontSize: "11px",
    fontWeight: "900",
  },

  deleteButton: {
    border: "none",
    background: "#fee2e2",
    color: "#991b1b",
    padding: "8px 12px",
    borderRadius: "8px",
    fontWeight: "900",
    cursor: "pointer",
    fontSize: "11px",
  },

  footer: {
    textAlign: "center",
    padding: "25px 10px",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "700",
  },
};