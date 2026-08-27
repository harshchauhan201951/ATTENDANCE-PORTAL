"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Homework = {
  id: number;
  subject: string | null;
  title: string | null;
  description: string | null;
  due_date: string | null;
  class_name: string | null;
  created_at: string | null;
};

export default function StudentHomeworkPage() {
  const router = useRouter();

  const [studentName, setStudentName] = useState("Student");
  const [studentClass, setStudentClass] = useState("");
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadStudentAndHomework();
  }, []);

  async function loadStudentAndHomework() {
    try {
      setLoading(true);
      setError("");

      const savedUsername =
        localStorage.getItem("student_username") ||
        localStorage.getItem("studentUsername") ||
        "";

      const savedName =
        localStorage.getItem("studentName") ||
        localStorage.getItem("student_name") ||
        "Student";

      setStudentName(savedName);

      if (!savedUsername) {
        setError("Student information could not be found.");
        return;
      }

      const { data: student, error: studentError } =
        await supabase
          .from("students")
          .select(
            "id, student_name, student_username, class_name"
          )
          .eq("student_username", savedUsername)
          .maybeSingle();

      if (studentError) {
        console.error(
          "Student loading error:",
          studentError
        );

        setError(
          `Student information could not be loaded: ${studentError.message}`
        );

        return;
      }

      if (!student) {
        setError("Student account could not be found.");
        return;
      }

      const currentClass =
        student.class_name?.trim() || "";

      setStudentClass(currentClass);

      if (!currentClass) {
        setError(
          "Your class is not assigned in the student profile."
        );
        return;
      }

      const { data, error: homeworkError } =
        await supabase
          .from("homework")
          .select(
            "id, subject, title, description, due_date, class_name, created_at"
          )
          .eq("class_name", currentClass)
          .order("due_date", {
            ascending: true,
          });

      if (homeworkError) {
        console.error(
          "Homework loading error:",
          homeworkError
        );

        setError(
          `Homework could not be loaded: ${homeworkError.message}`
        );

        return;
      }

      setHomework(
        (data || []) as Homework[]
      );
    } catch (err) {
      console.error(
        "Unexpected student homework error:",
        err
      );

      setError(
        "Unable to load your homework."
      );
    } finally {
      setLoading(false);
    }
  }

  function formatDate(
    date: string | null
  ) {
    if (!date) {
      return "No due date";
    }

    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  function getDueStatus(
    date: string | null
  ) {
    if (!date) {
      return "No Due Date";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(
      `${date}T00:00:00`
    );
    due.setHours(0, 0, 0, 0);

    const difference =
      due.getTime() - today.getTime();

    const daysLeft =
      Math.ceil(
        difference /
          (1000 * 60 * 60 * 24)
      );

    if (daysLeft < 0) {
      return "Overdue";
    }

    if (daysLeft === 0) {
      return "Due Today";
    }

    if (daysLeft === 1) {
      return "Due Tomorrow";
    }

    return `${daysLeft} Days Left`;
  }

  function getStatusStyle(
    date: string | null
  ) {
    const status = getDueStatus(date);

    if (status === "Overdue") {
      return styles.statusOverdue;
    }

    if (status === "Due Today") {
      return styles.statusToday;
    }

    return styles.statusNormal;
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}

        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/student/dashboard"
                )
              }
              style={styles.backButton}
            >
              ←
            </button>

            <div>
              <div style={styles.badge}>
                STUDENT PORTAL
              </div>

              <h1 style={styles.title}>
                📚 Homework
              </h1>

              <p style={styles.subtitle}>
                Homework assigned by your teacher
              </p>
            </div>
          </div>

          <div style={styles.studentInfo}>
            <div style={styles.avatar}>
              {studentName
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <div style={styles.studentName}>
                {studentName}
              </div>

              <div style={styles.studentClass}>
                {studentClass
                  ? `Class: ${studentClass}`
                  : "Student"}
              </div>
            </div>
          </div>
        </header>

        {/* ERROR */}

        {error && (
          <div style={styles.errorBox}>
            ⚠️ {error}
          </div>
        )}

        {/* SUMMARY */}

        <section style={styles.summaryCard}>
          <div style={styles.summaryIcon}>
            📖
          </div>

          <div style={styles.summaryText}>
            <div style={styles.summaryLabel}>
              YOUR HOMEWORK
            </div>

            <div style={styles.summaryTitle}>
              {loading
                ? "Loading..."
                : `${homework.length} Homework ${
                    homework.length === 1
                      ? "Item"
                      : "Items"
                  }`}
            </div>

            <div style={styles.summaryDescription}>
              Showing homework assigned to{" "}
              {studentClass
                ? studentClass
                : "your class"}
              .
            </div>
          </div>

          <button
            type="button"
            onClick={loadStudentAndHomework}
            style={styles.refreshButton}
          >
            ↻ Refresh
          </button>
        </section>

        {/* HOMEWORK LIST */}

        <section style={styles.listSection}>
          <div style={styles.sectionHeader}>
            <div>
              <div style={styles.sectionEyebrow}>
                ASSIGNED WORK
              </div>

              <h2 style={styles.sectionTitle}>
                My Homework
              </h2>
            </div>

            <div style={styles.countBadge}>
              {homework.length}
            </div>
          </div>

          {loading ? (
            <div style={styles.emptyCard}>
              <div style={styles.loadingIcon}>
                ⏳
              </div>

              <h3 style={styles.emptyTitle}>
                Loading Homework...
              </h3>

              <p style={styles.emptyText}>
                Please wait while we load your
                assigned homework.
              </p>
            </div>
          ) : homework.length === 0 ? (
            <div style={styles.emptyCard}>
              <div style={styles.emptyIcon}>
                🎉
              </div>

              <h3 style={styles.emptyTitle}>
                No Homework Assigned
              </h3>

              <p style={styles.emptyText}>
                There is currently no homework
                assigned to your class.
              </p>
            </div>
          ) : (
            <div style={styles.homeworkList}>
              {homework.map((item) => (
                <article
                  key={item.id}
                  style={styles.homeworkCard}
                >
                  <div style={styles.homeworkHeader}>
                    <div
                      style={
                        styles.homeworkHeaderLeft
                      }
                    >
                      <div
                        style={
                          styles.subjectBadge
                        }
                      >
                        {item.subject ||
                          "General"}
                      </div>

                      <div
                        style={
                          styles.classBadge
                        }
                      >
                        {item.class_name ||
                          studentClass}
                      </div>
                    </div>

                    <div
                      style={{
                        ...styles.statusBadge,
                        ...getStatusStyle(
                          item.due_date
                        ),
                      }}
                    >
                      {getDueStatus(
                        item.due_date
                      )}
                    </div>
                  </div>

                  <h3
                    style={
                      styles.homeworkTitle
                    }
                  >
                    {item.title ||
                      "Homework"}
                  </h3>

                  <p
                    style={
                      styles.description
                    }
                  >
                    {item.description ||
                      "No additional instructions provided."}
                  </p>

                  <div
                    style={
                      styles.homeworkFooter
                    }
                  >
                    <div
                      style={
                        styles.dueDateBox
                      }
                    >
                      <span
                        style={
                          styles.dueIcon
                        }
                      >
                        📅
                      </span>

                      <div>
                        <div
                          style={
                            styles.dueLabel
                          }
                        >
                          DUE DATE
                        </div>

                        <div
                          style={
                            styles.dueValue
                          }
                        >
                          {formatDate(
                            item.due_date
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      style={
                        styles.assignedBox
                      }
                    >
                      <span>
                        👥
                      </span>

                      <span>
                        Assigned to your class
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* INFORMATION */}

        <section style={styles.infoCard}>
          <div style={styles.infoIcon}>
            💡
          </div>

          <div>
            <h3 style={styles.infoTitle}>
              Homework Information
            </h3>

            <p style={styles.infoText}>
              Check your homework regularly and
              complete all assignments before
              their due dates.
            </p>
          </div>
        </section>

        {/* FOOTER */}

        <footer style={styles.footer}>
          <div style={styles.footerBrand}>
            🎓 Attendance Portal
          </div>

          <div>
            Student Homework • 2026
          </div>
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
      "linear-gradient(135deg,#f8fafc 0%,#eef2ff 50%,#f0f9ff 100%)",
    padding: "20px 15px",
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
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    padding: "18px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "18px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.06)",
    flexWrap: "wrap",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
  },

  backButton: {
    width: "42px",
    height: "42px",
    border: "none",
    borderRadius: "11px",
    background: "#eef2ff",
    color: "#3730a3",
    fontSize: "21px",
    fontWeight: "900",
    cursor: "pointer",
  },

  badge: {
    display: "inline-block",
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "5px 9px",
    borderRadius: "999px",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "1.5px",
    marginBottom: "5px",
  },

  title: {
    margin: 0,
    fontSize: "27px",
    fontWeight: "1000",
    color: "#172554",
  },

  subtitle: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "600",
  },

  studentInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "13px",
    padding: "8px 12px",
  },

  avatar: {
    width: "38px",
    height: "38px",
    borderRadius: "11px",
    background:
      "linear-gradient(135deg,#2563eb,#7c3aed)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "17px",
    fontWeight: "1000",
  },

  studentName: {
    color: "#172554",
    fontSize: "12px",
    fontWeight: "900",
  },

  studentClass: {
    marginTop: "2px",
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "700",
  },

  errorBox: {
    background: "#fee2e2",
    border: "1px solid #fecaca",
    color: "#991b1b",
    borderRadius: "13px",
    padding: "13px 15px",
    marginBottom: "18px",
    fontSize: "12px",
    fontWeight: "800",
  },

  summaryCard: {
    background:
      "linear-gradient(135deg,#172554,#2563eb,#4f46e5)",
    borderRadius: "20px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "25px",
    boxShadow:
      "0 15px 35px rgba(37,99,235,0.18)",
    flexWrap: "wrap",
  },

  summaryIcon: {
    width: "52px",
    height: "52px",
    borderRadius: "15px",
    background:
      "rgba(255,255,255,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "25px",
    flexShrink: 0,
  },

  summaryText: {
    flex: 1,
    minWidth: "200px",
  },

  summaryLabel: {
    color: "#bfdbfe",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "1.5px",
  },

  summaryTitle: {
    color: "#ffffff",
    fontSize: "20px",
    fontWeight: "1000",
    marginTop: "3px",
  },

  summaryDescription: {
    color: "#dbeafe",
    fontSize: "11px",
    fontWeight: "600",
    marginTop: "3px",
  },

  refreshButton: {
    border: "1px solid rgba(255,255,255,0.25)",
    background:
      "rgba(255,255,255,0.12)",
    color: "#ffffff",
    padding: "9px 13px",
    borderRadius: "9px",
    fontSize: "11px",
    fontWeight: "900",
    cursor: "pointer",
  },

  listSection: {
    marginBottom: "20px",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "15px",
    marginBottom: "15px",
  },

  sectionEyebrow: {
    color: "#2563eb",
    fontSize: "9px",
    fontWeight: "1000",
    letterSpacing: "2px",
    marginBottom: "3px",
  },

  sectionTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "23px",
    fontWeight: "1000",
  },

  countBadge: {
    minWidth: "32px",
    height: "32px",
    padding: "0 8px",
    borderRadius: "9px",
    background: "#dbeafe",
    color: "#1d4ed8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "1000",
  },

  homeworkList: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },

  homeworkCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "18px",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.05)",
  },

  homeworkHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },

  homeworkHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    flexWrap: "wrap",
  },

  subjectBadge: {
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "5px 9px",
    borderRadius: "7px",
    fontSize: "9px",
    fontWeight: "900",
    textTransform: "uppercase",
  },

  classBadge: {
    background: "#ede9fe",
    color: "#6d28d9",
    padding: "5px 9px",
    borderRadius: "7px",
    fontSize: "9px",
    fontWeight: "900",
  },

  statusBadge: {
    padding: "5px 9px",
    borderRadius: "7px",
    fontSize: "9px",
    fontWeight: "900",
  },

  statusNormal: {
    background: "#dcfce7",
    color: "#166534",
  },

  statusToday: {
    background: "#fef3c7",
    color: "#92400e",
  },

  statusOverdue: {
    background: "#fee2e2",
    color: "#991b1b",
  },

  homeworkTitle: {
    margin: "12px 0 0",
    color: "#172554",
    fontSize: "19px",
    fontWeight: "1000",
  },

  description: {
    margin: "8px 0 0",
    color: "#475569",
    fontSize: "12px",
    lineHeight: 1.65,
    fontWeight: "600",
    whiteSpace: "pre-wrap",
  },

  homeworkFooter: {
    marginTop: "16px",
    paddingTop: "13px",
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },

  dueDateBox: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
  },

  dueIcon: {
    width: "35px",
    height: "35px",
    borderRadius: "9px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
  },

  dueLabel: {
    color: "#94a3b8",
    fontSize: "8px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  dueValue: {
    color: "#334155",
    fontSize: "11px",
    fontWeight: "900",
    marginTop: "2px",
  },

  assignedBox: {
    color: "#2563eb",
    background: "#eff6ff",
    borderRadius: "8px",
    padding: "7px 9px",
    fontSize: "9px",
    fontWeight: "800",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },

  emptyCard: {
    background: "#ffffff",
    border: "1px dashed #cbd5e1",
    borderRadius: "18px",
    padding: "55px 20px",
    textAlign: "center",
  },

  loadingIcon: {
    fontSize: "38px",
    marginBottom: "8px",
  },

  emptyIcon: {
    fontSize: "48px",
    marginBottom: "8px",
  },

  emptyTitle: {
    margin: "5px 0",
    color: "#334155",
    fontSize: "17px",
    fontWeight: "1000",
  },

  emptyText: {
    margin: 0,
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "600",
    lineHeight: 1.6,
  },

  infoCard: {
    background: "#ffffff",
    border: "1px solid #dbeafe",
    borderRadius: "16px",
    padding: "15px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
  },

  infoIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    flexShrink: 0,
  },

  infoTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "12px",
    fontWeight: "900",
  },

  infoText: {
    margin: "3px 0 0",
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "600",
  },

  footer: {
    borderTop: "1px solid #e2e8f0",
    padding: "18px 5px",
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    color: "#94a3b8",
    fontSize: "10px",
    fontWeight: "700",
    flexWrap: "wrap",
  },

  footerBrand: {
    color: "#475569",
    fontWeight: "900",
  },
};