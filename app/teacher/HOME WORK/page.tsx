"use client";

import { useState } from "react";

type Homework = {
  id: number;
  subject: string;
  title: string;
  description: string;
  dueDate: string;
  status: "Pending" | "Completed";
};

export default function TeacherHomeworkPage() {
  const [homework, setHomework] = useState<Homework[]>([]);

  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  function addHomework() {
    if (!subject.trim()) {
      alert("Please enter subject.");
      return;
    }

    if (!title.trim()) {
      alert("Please enter homework title.");
      return;
    }

    if (!description.trim()) {
      alert("Please enter homework description.");
      return;
    }

    if (!dueDate) {
      alert("Please select due date.");
      return;
    }

    const newHomework: Homework = {
      id: Date.now(),
      subject: subject.trim(),
      title: title.trim(),
      description: description.trim(),
      dueDate,
      status: "Pending",
    };

    setHomework((previous) => [
      newHomework,
      ...previous,
    ]);

    setSubject("");
    setTitle("");
    setDescription("");
    setDueDate("");
  }

  function deleteHomework(id: number) {
    setHomework((previous) =>
      previous.filter((item) => item.id !== id)
    );
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
              📚 Homework
            </h1>

            <p style={styles.subtitle}>
              Create and manage student homework
            </p>
          </div>

          <button
            onClick={() => window.history.back()}
            style={styles.backButton}
          >
            ← Back
          </button>
        </header>

        {/* CREATE HOMEWORK */}

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
                Add homework for your students
              </p>
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
                gridColumn: "span 2",
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
                gridColumn: "span 2",
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

          <div style={styles.actions}>
            <button
              onClick={addHomework}
              style={styles.addButton}
            >
              ➕ Add Homework
            </button>
          </div>
        </section>

        {/* HOMEWORK LIST */}

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
                {homework.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {homework.length === 0 ? (
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
                      <div style={styles.subjectBadge}>
                        {item.subject}
                      </div>

                      <h3
                        style={
                          styles.homeworkTitle
                        }
                      >
                        {item.title}
                      </h3>
                    </div>

                    <div
                      style={
                        item.status === "Completed"
                          ? styles.completedBadge
                          : styles.pendingBadge
                      }
                    >
                      {item.status}
                    </div>

                  </div>

                  <p
                    style={
                      styles.homeworkDescription
                    }
                  >
                    {item.description}
                  </p>

                  <div style={styles.homeworkBottom}>

                    <div style={styles.dueDate}>
                      📅 Due:{" "}
                      {new Date(
                        `${item.dueDate}T00:00:00`
                      ).toLocaleDateString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        }
                      )}
                    </div>

                    <button
                      onClick={() =>
                        deleteHomework(item.id)
                      }
                      style={styles.deleteButton}
                    >
                      🗑️ Delete
                    </button>

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

  pendingBadge: {
    background: "#fef3c7",
    color: "#92400e",
    padding: "7px 10px",
    borderRadius: "8px",
    fontSize: "11px",
    fontWeight: "900",
  },

  completedBadge: {
    background: "#dcfce7",
    color: "#166534",
    padding: "7px 10px",
    borderRadius: "8px",
    fontSize: "11px",
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