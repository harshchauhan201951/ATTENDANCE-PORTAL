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

export default function StudentHomeworkPage() {
  const router = useRouter();

  const [student, setStudent] = useState<Student | null>(null);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadStudentHomework();
  }, []);

  async function loadStudentHomework() {
    try {
      setLoading(true);
      setError("");

      const username =
        localStorage.getItem("student_username") ||
        localStorage.getItem("studentUsername") ||
        "";

      if (!username) {
        setError("Student session not found. Please login again.");
        setLoading(false);
        return;
      }

      const { data: studentData, error: studentError } =
        await supabase
          .from("students")
          .select(
            "id, student_name, student_username, class_name"
          )
          .eq("student_username", username)
          .single();

      if (studentError) {
        console.error("Student loading error:", studentError);
        setError("Unable to load your student information.");
        setLoading(false);
        return;
      }

      const currentStudent = studentData as Student;

      setStudent(currentStudent);

      const studentClass =
        currentStudent.class_name?.trim() || "";

      if (!studentClass) {
        setError(
          "Your class is not assigned yet. Please contact your teacher."
        );
        setHomework([]);
        setLoading(false);
        return;
      }

      /*
       * IMPORTANT
       *
       * Teacher homework can now contain multiple classes.
       *
       * Example:
       *
       * Class 9
       *
       * OR
       *
       * Class 9, Class 10, Class 11
       *
       * So we fetch homework and then check whether
       * the student's class is included in the selected classes.
       */

      const { data: homeworkData, error: homeworkError } =
        await supabase
          .from("homework")
          .select(
            "id, subject, title, description, due_date, class_name, created_at"
          )
          .order("due_date", {
            ascending: true,
          });

      if (homeworkError) {
        console.error(
          "Homework loading error:",
          homeworkError
        );

        setError(
          "Unable to load your homework right now."
        );

        setLoading(false);
        return;
      }

      const assignedHomework = (
        (homeworkData || []) as Homework[]
      ).filter((item) => {
        const assignedClasses = item.class_name
          .split(",")
          .map((classItem) =>
            classItem.trim().toLowerCase()
          )
          .filter(Boolean);

        return assignedClasses.includes(
          studentClass.toLowerCase()
        );
      });

      setHomework(assignedHomework);
    } catch (err) {
      console.error(
        "Unexpected student homework error:",
        err
      );

      setError(
        "Something went wrong while loading homework."
      );
    } finally {
      setLoading(false);
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

  function isOverdue(date: string) {
    if (!date) {
      return false;
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const due = new Date(
      `${date}T00:00:00`
    );

    return due < today;
  }

  function logout() {
    localStorage.removeItem("studentLoggedIn");
    localStorage.removeItem("student_username");
    localStorage.removeItem("studentUsername");
    localStorage.removeItem("studentName");
    localStorage.removeItem("student_name");
    localStorage.removeItem("studentId");

    sessionStorage.clear();

    router.push("/");
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}

        <header style={styles.header}>
          <div style={styles.headerLeft}>

            <div style={styles.logo}>
              📚
            </div>

            <div>
              <div style={styles.portalBadge}>
                STUDENT PORTAL
              </div>

              <h1 style={styles.title}>
                My Homework
              </h1>

              <p style={styles.subtitle}>
                View homework assigned by your teacher
              </p>
            </div>

          </div>

          <div style={styles.headerActions}>

            <button
              type="button"
              onClick={() =>
                router.push("/student/dashboard")
              }
              style={styles.dashboardButton}
            >
              ← Dashboard
            </button>

            <button
              type="button"
              onClick={logout}
              style={styles.logoutButton}
            >
              Logout
            </button>

          </div>
        </header>

        {/* STUDENT INFORMATION */}

        {student && (
          <section style={styles.studentCard}>

            <div style={styles.studentAvatar}>
              {(student.student_name || "S")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div style={styles.studentInfo}>

              <div style={styles.infoLabel}>
                STUDENT
              </div>

              <div style={styles.studentName}>
                {student.student_name || "Student"}
              </div>

              <div style={styles.username}>
                @{student.student_username}
              </div>

            </div>

            <div style={styles.classBox}>

              <div style={styles.infoLabel}>
                MY CLASS
              </div>

              <div style={styles.className}>
                {student.class_name || "Not Assigned"}
              </div>

            </div>

            <div style={styles.homeworkCountBox}>

              <div style={styles.infoLabel}>
                HOMEWORK
              </div>

              <div style={styles.homeworkCount}>
                {homework.length}
              </div>

            </div>

          </section>
        )}

        {/* ERROR */}

        {error && (
          <div style={styles.errorBox}>

            <div style={styles.errorIcon}>
              ⚠️
            </div>

            <div>

              <div style={styles.errorTitle}>
                Unable to Load Homework
              </div>

              <div style={styles.errorText}>
                {error}
              </div>

            </div>

          </div>
        )}

        {/* LOADING */}

        {loading ? (
          <section style={styles.emptyCard}>

            <div style={styles.loadingIcon}>
              ⏳
            </div>

            <h2 style={styles.emptyTitle}>
              Loading Your Homework...
            </h2>

            <p style={styles.emptyText}>
              Please wait while we load homework
              assigned to your class.
            </p>

          </section>
        ) : !error && homework.length === 0 ? (

          /* NO HOMEWORK */

          <section style={styles.emptyCard}>

            <div style={styles.emptyIcon}>
              📚
            </div>

            <h2 style={styles.emptyTitle}>
              No Homework Assigned
            </h2>

            <p style={styles.emptyText}>
              There is currently no homework assigned
              to your class.
            </p>

            {student?.class_name && (
              <div style={styles.emptyClass}>
                Class: {student.class_name}
              </div>
            )}

          </section>

        ) : (

          /* HOMEWORK LIST */

          <section>

            <div style={styles.sectionHeader}>

              <div>

                <div style={styles.sectionEyebrow}>
                  ACADEMIC WORK
                </div>

                <h2 style={styles.sectionTitle}>
                  Assigned Homework
                </h2>

                <p style={styles.sectionSubtitle}>
                  Homework assigned to your class by
                  your teacher.
                </p>

              </div>

              <div style={styles.readOnlyBadge}>
                🔒 READ ONLY
              </div>

            </div>

            <div style={styles.homeworkList}>

              {homework.map((item) => {

                const overdue = isOverdue(
                  item.due_date
                );

                return (
                  <article
                    key={item.id}
                    style={styles.homeworkCard}
                  >

                    <div style={styles.homeworkHeader}>

                      <div style={styles.badges}>

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
                          {student?.class_name}
                        </span>

                      </div>

                      <div
                        style={{
                          ...styles.statusBadge,
                          ...(overdue
                            ? styles.overdueBadge
                            : styles.pendingBadge),
                        }}
                      >
                        {overdue
                          ? "OVERDUE"
                          : "ACTIVE"}
                      </div>

                    </div>

                    <h3 style={styles.homeworkTitle}>
                      {item.title}
                    </h3>

                    <div style={styles.descriptionBox}>

                      <div
                        style={
                          styles.descriptionLabel
                        }
                      >
                        HOMEWORK
                      </div>

                      <p
                        style={
                          styles.homeworkDescription
                        }
                      >
                        {item.description}
                      </p>

                    </div>

                    <div style={styles.homeworkFooter}>

                      <div style={styles.dueBox}>

                        <div style={styles.dueIcon}>
                          📅
                        </div>

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
                              styles.dueDate
                            }
                          >
                            {formatDate(
                              item.due_date
                            )}
                          </div>

                        </div>

                      </div>

                      <div style={styles.classVisibility}>

                        <span
                          style={
                            styles.visibilityIcon
                          }
                        >
                          👥
                        </span>

                        <span>
                          Assigned to your class{" "}
                          <strong>
                            {student?.class_name}
                          </strong>
                        </span>

                      </div>

                    </div>

                  </article>
                );
              })}

            </div>

          </section>
        )}

        {/* INFORMATION */}

        {!loading && !error && (
          <section style={styles.infoCard}>

            <div style={styles.infoCardIcon}>
              ℹ️
            </div>

            <div>

              <div style={styles.infoCardTitle}>
                Homework Information
              </div>

              <p style={styles.infoCardText}>
                This page is view-only. Homework is
                assigned and managed by your teacher.
                You can only view homework assigned to
                your own class.
              </p>

            </div>

          </section>
        )}

        {/* FOOTER */}

        <footer style={styles.footer}>

          <div style={styles.footerBrand}>
            🎓 Attendance Portal
          </div>

          <div>
            Student Portal • Homework • 2026
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
    padding: "18px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#0f172a",
  },

  container: {
    width: "100%",
    maxWidth: "1150px",
    margin: "0 auto",
  },

  header: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    padding: "18px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "18px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.06)",
    flexWrap: "wrap",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  logo: {
    width: "50px",
    height: "50px",
    borderRadius: "14px",
    background:
      "linear-gradient(135deg,#2563eb,#7c3aed)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    boxShadow:
      "0 8px 18px rgba(37,99,235,0.18)",
  },

  portalBadge: {
    display: "inline-block",
    color: "#2563eb",
    fontSize: "9px",
    fontWeight: "1000",
    letterSpacing: "2px",
    marginBottom: "4px",
  },

  title: {
    margin: 0,
    color: "#172554",
    fontSize: "27px",
    fontWeight: "1000",
  },

  subtitle: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "600",
  },

  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    flexWrap: "wrap",
  },

  dashboardButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    padding: "10px 14px",
    borderRadius: "9px",
    fontSize: "11px",
    fontWeight: "900",
    cursor: "pointer",
  },

  logoutButton: {
    border: "none",
    background: "#0f172a",
    color: "#ffffff",
    padding: "10px 15px",
    borderRadius: "9px",
    fontSize: "11px",
    fontWeight: "900",
    cursor: "pointer",
  },

  studentCard: {
    background:
      "linear-gradient(135deg,#172554,#2563eb,#4f46e5)",
    borderRadius: "20px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    marginBottom: "18px",
    boxShadow:
      "0 15px 35px rgba(37,99,235,0.18)",
    flexWrap: "wrap",
  },

  studentAvatar: {
    width: "62px",
    height: "62px",
    minWidth: "62px",
    borderRadius: "18px",
    background: "#ffffff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "27px",
    fontWeight: "1000",
  },

  studentInfo: {
    flex: 1,
    minWidth: "180px",
  },

  infoLabel: {
    color: "#bfdbfe",
    fontSize: "8px",
    fontWeight: "1000",
    letterSpacing: "1.5px",
    marginBottom: "4px",
  },

  studentName: {
    color: "#ffffff",
    fontSize: "20px",
    fontWeight: "1000",
  },

  username: {
    color: "#dbeafe",
    fontSize: "10px",
    fontWeight: "700",
    marginTop: "3px",
  },

  classBox: {
    padding: "11px 15px",
    minWidth: "120px",
    borderRadius: "12px",
    background:
      "rgba(255,255,255,0.12)",
    border:
      "1px solid rgba(255,255,255,0.18)",
  },

  className: {
    color: "#ffffff",
    fontSize: "17px",
    fontWeight: "1000",
  },

  homeworkCountBox: {
    padding: "11px 15px",
    minWidth: "90px",
    borderRadius: "12px",
    background:
      "rgba(255,255,255,0.12)",
    border:
      "1px solid rgba(255,255,255,0.18)",
  },

  homeworkCount: {
    color: "#ffffff",
    fontSize: "17px",
    fontWeight: "1000",
  },

  errorBox: {
    background: "#fee2e2",
    border: "1px solid #fecaca",
    borderRadius: "14px",
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "18px",
  },

  errorIcon: {
    fontSize: "22px",
  },

  errorTitle: {
    color: "#991b1b",
    fontSize: "13px",
    fontWeight: "1000",
  },

  errorText: {
    color: "#b91c1c",
    fontSize: "11px",
    fontWeight: "600",
    marginTop: "3px",
  },

  emptyCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    padding: "65px 20px",
    textAlign: "center",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.05)",
  },

  loadingIcon: {
    fontSize: "40px",
    marginBottom: "12px",
  },

  emptyIcon: {
    fontSize: "50px",
    marginBottom: "12px",
  },

  emptyTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "20px",
    fontWeight: "1000",
  },

  emptyText: {
    margin: "7px auto 0",
    maxWidth: "480px",
    color: "#64748b",
    fontSize: "12px",
    lineHeight: 1.6,
    fontWeight: "600",
  },

  emptyClass: {
    display: "inline-block",
    marginTop: "15px",
    padding: "8px 13px",
    borderRadius: "9px",
    background: "#eff6ff",
    color: "#2563eb",
    fontSize: "11px",
    fontWeight: "900",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "15px",
    marginBottom: "15px",
    flexWrap: "wrap",
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
    fontSize: "24px",
    fontWeight: "1000",
  },

  sectionSubtitle: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "600",
  },

  readOnlyBadge: {
    background: "#ecfdf5",
    border: "1px solid #bbf7d0",
    color: "#15803d",
    padding: "8px 11px",
    borderRadius: "9px",
    fontSize: "9px",
    fontWeight: "1000",
    letterSpacing: "0.5px",
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
    padding: "19px",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.05)",
  },

  homeworkHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    flexWrap: "wrap",
  },

  badges: {
    display: "flex",
    gap: "7px",
    flexWrap: "wrap",
  },

  subjectBadge: {
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "6px 9px",
    borderRadius: "7px",
    fontSize: "9px",
    fontWeight: "1000",
    textTransform: "uppercase",
  },

  classBadge: {
    background: "#ede9fe",
    color: "#6d28d9",
    padding: "6px 9px",
    borderRadius: "7px",
    fontSize: "9px",
    fontWeight: "1000",
  },

  statusBadge: {
    padding: "6px 9px",
    borderRadius: "7px",
    fontSize: "9px",
    fontWeight: "1000",
  },

  pendingBadge: {
    background: "#dcfce7",
    color: "#15803d",
  },

  overdueBadge: {
    background: "#fee2e2",
    color: "#b91c1c",
  },

  homeworkTitle: {
    margin: "12px 0 0",
    color: "#172554",
    fontSize: "20px",
    fontWeight: "1000",
  },

  descriptionBox: {
    marginTop: "13px",
    padding: "13px",
    borderRadius: "11px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },

  descriptionLabel: {
    color: "#64748b",
    fontSize: "8px",
    fontWeight: "1000",
    letterSpacing: "1.2px",
    marginBottom: "5px",
  },

  homeworkDescription: {
    margin: 0,
    color: "#475569",
    fontSize: "12px",
    lineHeight: 1.7,
    fontWeight: "600",
    whiteSpace: "pre-wrap",
  },

  homeworkFooter: {
    marginTop: "14px",
    paddingTop: "13px",
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },

  dueBox: {
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
    fontSize: "17px",
  },

  dueLabel: {
    color: "#64748b",
    fontSize: "8px",
    fontWeight: "1000",
    letterSpacing: "1px",
  },

  dueDate: {
    marginTop: "2px",
    color: "#172554",
    fontSize: "11px",
    fontWeight: "900",
  },

  classVisibility: {
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },

  visibilityIcon: {
    fontSize: "14px",
  },

  infoCard: {
    marginTop: "18px",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "15px",
    padding: "14px 16px",
    display: "flex",
    alignItems: "flex-start",
    gap: "11px",
  },

  infoCardIcon: {
    width: "34px",
    height: "34px",
    minWidth: "34px",
    borderRadius: "9px",
    background: "#dbeafe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
  },

  infoCardTitle: {
    color: "#1e3a8a",
    fontSize: "11px",
    fontWeight: "1000",
  },

  infoCardText: {
    margin: "3px 0 0",
    color: "#475569",
    fontSize: "10px",
    lineHeight: 1.5,
    fontWeight: "600",
  },

  footer: {
    marginTop: "25px",
    padding: "18px 5px",
    borderTop: "1px solid #e2e8f0",
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