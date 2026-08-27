"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Student = {
  id: number;
  student_name: string | null;
  student_username: string;
  class_name: string | null;
};

type Homework = {
  id: number;
  subject: string;
  title: string;
  description: string;
  due_date: string;
  class_name: string;
  created_at: string | null;
};

export default function TeacherHomeworkPage() {
  const router = useRouter();

  const [homework, setHomework] = useState<Homework[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classNames, setClassNames] = useState<string[]>([]);

  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [className, setClassName] = useState("");

  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadHomework();
    loadStudents();
  }, []);

  async function loadHomework() {
    try {
      setLoading(true);
      setError("");

      const { data, error: homeworkError } = await supabase
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

      setHomework((data || []) as Homework[]);
    } catch (err) {
      console.error("Unexpected homework loading error:", err);
      setError("Unable to load homework.");
    } finally {
      setLoading(false);
    }
  }

  async function loadStudents() {
    try {
      const { data, error: studentsError } = await supabase
        .from("students")
        .select(
          "id, student_name, student_username, class_name"
        )
        .order("student_name", {
          ascending: true,
        });

      if (studentsError) {
        console.error(
          "Students loading error:",
          studentsError
        );
        return;
      }

      const studentData = (data || []) as Student[];

      setStudents(studentData);

      const uniqueClasses = Array.from(
        new Set(
          studentData
            .map((student) =>
              student.class_name?.trim()
            )
            .filter(
              (value): value is string =>
                Boolean(value)
            )
        )
      ).sort();

      setClassNames(uniqueClasses);

      if (
        uniqueClasses.length > 0 &&
        !className
      ) {
        setClassName(uniqueClasses[0]);
      }
    } catch (err) {
      console.error(
        "Unexpected students loading error:",
        err
      );
    }
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

    if (!className.trim()) {
      setError("Please select a class.");
      return;
    }

    try {
      setAdding(true);

      const { data, error: insertError } = await supabase
        .from("homework")
        .insert({
          subject: subject.trim(),
          title: title.trim(),
          description: description.trim(),
          due_date: dueDate,
          class_name: className.trim(),
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

      setSubject("");
      setTitle("");
      setDescription("");
      setDueDate("");

      alert(
        `Homework assigned successfully to ${className}.`
      );
    } catch (err) {
      console.error(
        "Unexpected homework insert error:",
        err
      );

      setError("Unable to add homework.");
    } finally {
      setAdding(false);
    }
  }

  async function deleteHomework(id: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this homework?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const { error: deleteError } = await supabase
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

  const selectedClassStudents =
    students.filter(
      (student) =>
        student.class_name?.trim() ===
        className.trim()
    );

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
              Create and manage homework for students
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/teacher/dashboard")
            }
            style={styles.backButton}
          >
            ← Back to Dashboard
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
              ➕
            </div>

            <div>
              <h2 style={styles.cardTitle}>
                Create New Homework
              </h2>

              <p style={styles.cardSubtitle}>
                Assign homework to a specific class
              </p>
            </div>
          </div>

          <div style={styles.formGrid}>

            <div style={styles.field}>
              <label style={styles.label}>
                Class
              </label>

              {classNames.length > 0 ? (
                <select
                  value={className}
                  onChange={(e) =>
                    setClassName(e.target.value)
                  }
                  style={styles.input}
                >
                  <option value="">
                    Select Class
                  </option>

                  {classNames.map((item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={className}
                  onChange={(e) =>
                    setClassName(e.target.value)
                  }
                  placeholder="e.g. Class 10"
                  style={styles.input}
                />
              )}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                Subject
              </label>

              <input
                type="text"
                value={subject}
                onChange={(e) =>
                  setSubject(e.target.value)
                }
                placeholder="e.g. Mathematics"
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

            <div style={styles.field}>
              <label style={styles.label}>
                Homework Title
              </label>

              <input
                type="text"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                placeholder="Enter homework title"
                style={styles.input}
              />
            </div>

            <div
              style={{
                ...styles.field,
                gridColumn: "span 2",
              }}
            >
              <label style={styles.label}>
                Description
              </label>

              <textarea
                rows={5}
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                placeholder="Write homework instructions..."
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
                This homework will be assigned to:
              </div>

              <div style={styles.assignmentClass}>
                {className
                  ? className
                  : "Select a class"}
              </div>

              {className && (
                <div style={styles.studentCount}>
                  {selectedClassStudents.length} student
                  {selectedClassStudents.length !== 1
                    ? "s"
                    : ""}{" "}
                  found in this class
                </div>
              )}
            </div>
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              onClick={addHomework}
              disabled={adding}
              style={{
                ...styles.addButton,
                opacity: adding ? 0.7 : 1,
              }}
            >
              {adding
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
              {homework.map((item) => (
                <div
                  key={item.id}
                  style={styles.homeworkCard}
                >
                  <div style={styles.homeworkTop}>
                    <div>
                      <div style={styles.badgeRow}>
                        <span
                          style={
                            styles.subjectBadge
                          }
                        >
                          {item.subject}
                        </span>

                        <span
                          style={
                            styles.classBadge
                          }
                        >
                          {item.class_name}
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
                      style={styles.deleteButton}
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

                    <div style={styles.visibleTo}>
                      👥 Visible to{" "}
                      {item.class_name} students
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer style={styles.footer}>
          Attendance Portal • Teacher Homework •
          2026
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
    border: "1px solid #fecaca",
    color: "#991b1b",
    borderRadius: "12px",
    padding: "13px 15px",
    marginBottom: "18px",
    fontSize: "13px",
    fontWeight: "800",
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
    marginTop: "20px",
    padding: "14px",
    borderRadius: "13px",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
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
    fontSize: "17px",
    fontWeight: "900",
    marginTop: "2px",
  },

  studentCount: {
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "700",
    marginTop: "2px",
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
    cursor: "pointer",
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

  classBadge: {
    display: "inline-block",
    background: "#ede9fe",
    color: "#6d28d9",
    padding: "5px 9px",
    borderRadius: "7px",
    fontSize: "10px",
    fontWeight: "900",
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

  visibleTo: {
    color: "#2563eb",
    fontSize: "11px",
    fontWeight: "800",
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