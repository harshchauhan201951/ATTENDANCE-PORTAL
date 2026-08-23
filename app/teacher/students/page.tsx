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
  created_at: string | null;
};

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("students")
      .select(
        "id, student_name, student_username, admission_date, created_at"
      )
      .order("student_name", {
        ascending: true,
      });

    if (error) {
      setError(error.message);
      setStudents([]);
    } else {
      setStudents(data || []);
    }

    setLoading(false);
  }

  const filteredStudents = students.filter((student) => {
    const searchText = search.toLowerCase().trim();

    return (
      (student.student_name || "")
        .toLowerCase()
        .includes(searchText) ||
      student.student_username
        .toLowerCase()
        .includes(searchText)
    );
  });

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}

        <header style={styles.header}>
          <div>
            <div style={styles.badge}>
              TEACHER CONTROL CENTER
            </div>

            <h1 style={styles.title}>
              👨‍🎓 Students
            </h1>

            <p style={styles.subtitle}>
              View and manage all registered students
            </p>
          </div>

          <div style={styles.headerButtons}>
            <button
              onClick={loadStudents}
              style={styles.refreshButton}
            >
              🔄 Refresh
            </button>

            <a
              href="/teacher"
              style={styles.backButton}
            >
              ← Dashboard
            </a>
          </div>
        </header>

        {/* SUMMARY */}

        <section style={styles.summaryGrid}>

          <div style={styles.summaryCard}>
            <div style={styles.summaryIcon}>
              👨‍🎓
            </div>

            <div>
              <div style={styles.summaryLabel}>
                Total Students
              </div>

              <div style={styles.summaryNumber}>
                {students.length}
              </div>
            </div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryIcon}>
              🔍
            </div>

            <div>
              <div style={styles.summaryLabel}>
                Showing
              </div>

              <div style={styles.summaryNumber}>
                {filteredStudents.length}
              </div>
            </div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryIcon}>
              📚
            </div>

            <div>
              <div style={styles.summaryLabel}>
                Registered
              </div>

              <div style={styles.summaryNumber}>
                {students.length}
              </div>
            </div>
          </div>

        </section>

        {/* SEARCH */}

        <section style={styles.searchCard}>

          <div>
            <h2 style={styles.sectionTitle}>
              🔎 Find Student
            </h2>

            <p style={styles.sectionSubtitle}>
              Search by student name or username
            </p>
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search student..."
            style={styles.searchInput}
          />

        </section>

        {/* ERROR */}

        {error && (
          <div style={styles.error}>
            ❌ {error}
          </div>
        )}

        {/* STUDENT LIST */}

        <section style={styles.card}>

          <div style={styles.listHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                📋 Student List
              </h2>

              <p style={styles.sectionSubtitle}>
                All students registered in the portal
              </p>
            </div>

            <div style={styles.countBadge}>
              {filteredStudents.length} Students
            </div>
          </div>

          {loading ? (
            <div style={styles.loading}>
              <div style={styles.loadingIcon}>
                ⏳
              </div>

              Loading students...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>
                👨‍🎓
              </div>

              <h3 style={styles.emptyTitle}>
                No Students Found
              </h3>

              <p style={styles.emptyText}>
                {search
                  ? "No student matches your search."
                  : "No students are registered yet."}
              </p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>

              <table style={styles.table}>

                <thead>
                  <tr>

                    <th style={styles.th}>
                      #
                    </th>

                    <th style={styles.th}>
                      Student
                    </th>

                    <th style={styles.th}>
                      Username
                    </th>

                    <th style={styles.th}>
                      Admission Date
                    </th>

                    <th style={styles.th}>
                      Status
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {filteredStudents.map(
                    (student, index) => (

                      <tr
                        key={student.id}
                        style={styles.row}
                      >

                        <td style={styles.td}>
                          <div style={styles.numberCircle}>
                            {index + 1}
                          </div>
                        </td>

                        <td style={styles.td}>

                          <div style={styles.studentBox}>

                            <div style={styles.studentAvatar}>
                              {(
                                student.student_name ||
                                student.student_username
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong
                                style={styles.studentName}
                              >
                                {student.student_name ||
                                  "Student"}
                              </strong>

                              <div style={styles.studentId}>
                                ID: {student.id}
                              </div>
                            </div>

                          </div>

                        </td>

                        <td style={styles.td}>
                          <span style={styles.username}>
                            {student.student_username}
                          </span>
                        </td>

                        <td style={styles.td}>
                          {student.admission_date
                            ? new Date(
                                student.admission_date
                              ).toLocaleDateString(
                                "en-IN"
                              )
                            : "—"}
                        </td>

                        <td style={styles.td}>
                          <span style={styles.activeBadge}>
                            ● Active
                          </span>
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>

        {/* INFO */}

        <section style={styles.infoCard}>

          <div style={styles.infoIcon}>
            💡
          </div>

          <div>
            <h3 style={styles.infoTitle}>
              Student Management
            </h3>

            <p style={styles.infoText}>
              This page displays all students
              registered in your Attendance Portal.
              Student information is loaded directly
              from your Supabase database.
            </p>
          </div>

        </section>

        {/* FOOTER */}

        <footer style={styles.footer}>
          Attendance Portal • Students Management • 2026
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
    maxWidth: "1200px",
    margin: "0 auto",
  },

  header: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "25px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
  },

  badge: {
    display: "inline-block",
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "6px 11px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "1px",
    marginBottom: "8px",
  },

  title: {
    margin: 0,
    fontSize: "30px",
    fontWeight: "900",
    color: "#172554",
  },

  subtitle: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  headerButtons: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  refreshButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "12px 17px",
    borderRadius: "10px",
    fontWeight: "800",
    cursor: "pointer",
  },

  backButton: {
    textDecoration: "none",
    background: "#172554",
    color: "#ffffff",
    padding: "12px 17px",
    borderRadius: "10px",
    fontWeight: "800",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(210px,1fr))",
    gap: "16px",
    marginBottom: "20px",
  },

  summaryCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
  },

  summaryIcon: {
    width: "55px",
    height: "55px",
    borderRadius: "15px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
  },

  summaryLabel: {
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "700",
  },

  summaryNumber: {
    color: "#172554",
    fontSize: "26px",
    fontWeight: "900",
    marginTop: "3px",
  },

  searchCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "22px",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    flexWrap: "wrap",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
  },

  sectionTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "21px",
    fontWeight: "900",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  searchInput: {
    width: "320px",
    maxWidth: "100%",
    boxSizing: "border-box",
    border:
      "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "13px 15px",
    fontSize: "14px",
    outline: "none",
    color: "#0f172a",
    background: "#ffffff",
  },

  error: {
    background: "#fee2e2",
    color: "#991b1b",
    border:
      "1px solid #fecaca",
    borderRadius: "12px",
    padding: "14px",
    marginBottom: "20px",
    fontWeight: "700",
  },

  card: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "25px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
    marginBottom: "20px",
  },

  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },

  countBadge: {
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "8px 13px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "900",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    minWidth: "800px",
    borderCollapse: "collapse",
  },

  th: {
    background: "#eff6ff",
    color: "#1e3a8a",
    padding: "14px",
    textAlign: "left",
    borderBottom:
      "2px solid #dbeafe",
    fontSize: "12px",
    fontWeight: "900",
  },

  td: {
    padding: "14px",
    borderBottom:
      "1px solid #e2e8f0",
    fontSize: "14px",
    color: "#334155",
  },

  row: {
    transition: "background 0.2s",
  },

  numberCircle: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "#eff6ff",
    color: "#1d4ed8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    fontSize: "12px",
  },

  studentBox: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  studentAvatar: {
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    background:
      "linear-gradient(135deg,#2563eb,#7c3aed)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    fontSize: "18px",
  },

  studentName: {
    color: "#172554",
    fontSize: "14px",
  },

  studentId: {
    color: "#94a3b8",
    fontSize: "11px",
    marginTop: "3px",
  },

  username: {
    background: "#f1f5f9",
    color: "#334155",
    padding: "7px 10px",
    borderRadius: "8px",
    fontWeight: "800",
    fontSize: "12px",
  },

  activeBadge: {
    background: "#dcfce7",
    color: "#166534",
    padding: "7px 10px",
    borderRadius: "999px",
    fontWeight: "800",
    fontSize: "11px",
  },

  loading: {
    textAlign: "center",
    padding: "55px 20px",
    color: "#64748b",
    fontWeight: "800",
  },

  loadingIcon: {
    fontSize: "35px",
    marginBottom: "10px",
  },

  empty: {
    textAlign: "center",
    padding: "55px 20px",
  },

  emptyIcon: {
    fontSize: "50px",
  },

  emptyTitle: {
    margin: "10px 0 5px",
    color: "#172554",
  },

  emptyText: {
    margin: 0,
    color: "#64748b",
  },

  infoCard: {
    background:
      "linear-gradient(135deg,#eff6ff,#eef2ff)",
    border:
      "1px solid #dbeafe",
    borderRadius: "18px",
    padding: "22px",
    display: "flex",
    gap: "15px",
    alignItems: "flex-start",
    marginBottom: "20px",
  },

  infoIcon: {
    fontSize: "28px",
  },

  infoTitle: {
    margin: 0,
    color: "#1e3a8a",
    fontSize: "17px",
  },

  infoText: {
    margin: "7px 0 0",
    color: "#475569",
    fontSize: "13px",
    lineHeight: 1.6,
  },

  footer: {
    textAlign: "center",
    padding: "20px",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "700",
  },
};