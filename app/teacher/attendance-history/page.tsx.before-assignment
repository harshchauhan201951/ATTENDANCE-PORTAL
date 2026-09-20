"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Student = {
  id: number;
  student_name: string;
  student_username: string;
};

type AttendanceRecord = {
  student_id: number;
  attendance_date: string;
  status: string;
};

type HistoryRow = {
  student: Student;
  status: string;
  attendance_date: string;
};

export default function AttendanceHistoryPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  const [selectedDate, setSelectedDate] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setErrorMessage("");

    const [studentsResult, attendanceResult] =
      await Promise.all([
        supabase
          .from("students")
          .select("id, student_name, student_username")
          .order("id", {
            ascending: true,
          }),

        supabase
          .from("attendance")
          .select(
            "student_id, attendance_date, status"
          )
          .order("attendance_date", {
            ascending: false,
          }),
      ]);

    if (studentsResult.error) {
      console.error(
        "Students error:",
        studentsResult.error
      );

      setErrorMessage(
        "Students load nahi ho rahe: " +
          studentsResult.error.message
      );

      setLoading(false);
      return;
    }

    if (attendanceResult.error) {
      console.error(
        "Attendance error:",
        attendanceResult.error
      );

      setErrorMessage(
        "Attendance history load nahi ho rahi: " +
          attendanceResult.error.message
      );

      setLoading(false);
      return;
    }

    setStudents(
      (studentsResult.data || []) as Student[]
    );

    setRecords(
      (attendanceResult.data || []) as AttendanceRecord[]
    );

    setLoading(false);
  }

  async function deleteAttendance(
    studentId: number,
    attendanceDate: string
  ) {
    const deleteKey =
      `${studentId}-${attendanceDate}`;

    const confirmed = window.confirm(
      `Kya aap ${formatDate(
        attendanceDate
      )} ki attendance delete karna chahte hain?\n\nIsse is student ki us din ki attendance permanently delete ho jayegi.`
    );

    if (!confirmed) {
      return;
    }

    setDeleting(deleteKey);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("attendance")
      .delete()
      .eq("student_id", studentId)
      .eq("attendance_date", attendanceDate);

    if (error) {
      console.error(
        "Delete attendance error:",
        error
      );

      setErrorMessage(
        "Attendance delete nahi hui: " +
          error.message
      );

      setDeleting(null);
      return;
    }

    setRecords((currentRecords) =>
      currentRecords.filter(
        (record) =>
          !(
            record.student_id === studentId &&
            record.attendance_date === attendanceDate
          )
      )
    );

    setSuccessMessage(
      `Attendance successfully deleted for ${formatDate(
        attendanceDate
      )}.`
    );

    setDeleting(null);

    setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  }

  const availableDates = useMemo(() => {
    const dates = Array.from(
      new Set(
        records.map(
          (record) => record.attendance_date
        )
      )
    );

    return dates.sort(
      (a, b) =>
        new Date(b).getTime() -
        new Date(a).getTime()
    );
  }, [records]);

  const filteredRecords = useMemo(() => {
    let result = records;

    if (selectedDate) {
      result = result.filter(
        (record) =>
          record.attendance_date ===
          selectedDate
      );
    }

    if (search.trim()) {
      const searchText =
        search.trim().toLowerCase();

      result = result.filter((record) => {
        const student = students.find(
          (item) =>
            item.id === record.student_id
        );

        if (!student) {
          return false;
        }

        return (
          student.student_name
            ?.toLowerCase()
            .includes(searchText) ||
          student.student_username
            ?.toLowerCase()
            .includes(searchText)
        );
      });
    }

    return result;
  }, [
    records,
    students,
    selectedDate,
    search,
  ]);

  const historyRows: HistoryRow[] =
    filteredRecords
      .map((record) => {
        const student = students.find(
          (item) =>
            item.id === record.student_id
        );

        if (!student) {
          return null;
        }

        return {
          student,
          status: record.status,
          attendance_date:
            record.attendance_date,
        };
      })
      .filter(
        (
          item
        ): item is HistoryRow =>
          item !== null
      );

  const presentCount = historyRows.filter(
    (item) =>
      item.status.toLowerCase() ===
      "present"
  ).length;

  const absentCount = historyRows.filter(
    (item) =>
      item.status.toLowerCase() ===
      "absent"
  ).length;

  const totalCount = historyRows.length;

  function formatDate(date: string) {
    if (!date) {
      return "";
    }

    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function clearFilters() {
    setSelectedDate("");
    setSearch("");
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
              📅 Attendance History
            </h1>

            <p style={styles.subtitle}>
              View, manage and delete previous
              student attendance records
            </p>
          </div>

          <button
            onClick={() =>
              window.history.back()
            }
            style={styles.backButton}
          >
            ← Back
          </button>
        </header>

        {/* SUCCESS MESSAGE */}

        {successMessage && (
          <div style={styles.successBox}>
            ✅ {successMessage}
          </div>
        )}

        {/* FILTERS */}

        <section style={styles.filterCard}>
          <div style={styles.filterTitle}>
            🔎 Search Attendance
          </div>

          <div style={styles.filterGrid}>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Search Student
              </label>

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Name or username..."
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Attendance Date
              </label>

              <select
                value={selectedDate}
                onChange={(e) =>
                  setSelectedDate(
                    e.target.value
                  )
                }
                style={styles.input}
              >
                <option value="">
                  All Dates
                </option>

                {availableDates.map(
                  (date) => (
                    <option
                      key={date}
                      value={date}
                    >
                      {formatDate(date)}
                    </option>
                  )
                )}
              </select>
            </div>

            <div
              style={
                styles.clearButtonWrapper
              }
            >
              <button
                onClick={clearFilters}
                style={styles.clearButton}
              >
                ✕ Clear Filters
              </button>
            </div>

          </div>
        </section>

        {/* SUMMARY */}

        <section style={styles.statsGrid}>

          <div style={styles.statCard}>
            <div
              style={{
                ...styles.statIcon,
                background: "#dbeafe",
              }}
            >
              👨‍🎓
            </div>

            <div>
              <div style={styles.statLabel}>
                Records
              </div>

              <div style={styles.statValue}>
                {totalCount}
              </div>

              <div style={styles.statText}>
                Attendance records
              </div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div
              style={{
                ...styles.statIcon,
                background: "#dcfce7",
              }}
            >
              ✓
            </div>

            <div>
              <div style={styles.statLabel}>
                Present
              </div>

              <div
                style={{
                  ...styles.statValue,
                  color: "#15803d",
                }}
              >
                {presentCount}
              </div>

              <div style={styles.statText}>
                Students present
              </div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div
              style={{
                ...styles.statIcon,
                background: "#fee2e2",
              }}
            >
              ✕
            </div>

            <div>
              <div style={styles.statLabel}>
                Absent
              </div>

              <div
                style={{
                  ...styles.statValue,
                  color: "#dc2626",
                }}
              >
                {absentCount}
              </div>

              <div style={styles.statText}>
                Students absent
              </div>
            </div>
          </div>

        </section>

        {/* ERROR */}

        {errorMessage && (
          <div style={styles.errorBox}>
            ⚠️ {errorMessage}
          </div>
        )}

        {/* HISTORY */}

        <section style={styles.historyCard}>

          <div style={styles.historyHeader}>
            <div>
              <h2 style={styles.historyTitle}>
                📋 Attendance Records
              </h2>

              <p style={styles.historySubtitle}>
                {selectedDate
                  ? `Showing records for ${formatDate(
                      selectedDate
                    )}`
                  : "Showing all available records"}
              </p>
            </div>

            <button
              onClick={loadData}
              style={styles.refreshButton}
            >
              🔄 Refresh
            </button>
          </div>

          {loading ? (
            <div style={styles.loadingBox}>
              <div style={styles.loadingIcon}>
                ⏳
              </div>

              <h3 style={styles.loadingTitle}>
                Loading attendance...
              </h3>

              <p style={styles.loadingText}>
                Please wait while records are
                being loaded.
              </p>
            </div>
          ) : historyRows.length === 0 ? (
            <div style={styles.emptyBox}>
              <div style={styles.emptyIcon}>
                📭
              </div>

              <h3 style={styles.emptyTitle}>
                No attendance records found
              </h3>

              <p style={styles.emptyText}>
                There are no attendance records
                matching your current filters.
              </p>

              <button
                onClick={clearFilters}
                style={styles.clearButton}
              >
                Show All Records
              </button>
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
                      Date
                    </th>

                    <th style={styles.th}>
                      Status
                    </th>

                    <th
                      style={{
                        ...styles.th,
                        textAlign: "center",
                      }}
                    >
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {historyRows.map(
                    (row, index) => {
                      const deleteKey =
                        `${row.student.id}-${row.attendance_date}`;

                      const isDeleting =
                        deleting === deleteKey;

                      return (
                        <tr
                          key={`${row.student.id}-${row.attendance_date}`}
                        >
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
                                  styles.studentAvatar
                                }
                              >
                                {row.student.student_name
                                  ?.charAt(0)
                                  .toUpperCase() ||
                                  "S"}
                              </div>

                              <strong
                                style={
                                  styles.studentName
                                }
                              >
                                {row.student
                                  .student_name ||
                                  "Student"}
                              </strong>
                            </div>
                          </td>

                          <td style={styles.td}>
                            <span
                              style={
                                styles.username
                              }
                            >
                              {
                                row.student
                                  .student_username
                              }
                            </span>
                          </td>

                          <td style={styles.td}>
                            {formatDate(
                              row.attendance_date
                            )}
                          </td>

                          <td style={styles.td}>
                            {row.status
                              .toLowerCase() ===
                            "present" ? (
                              <span
                                style={
                                  styles.presentBadge
                                }
                              >
                                ✓ Present
                              </span>
                            ) : (
                              <span
                                style={
                                  styles.absentBadge
                                }
                              >
                                ✕ Absent
                              </span>
                            )}
                          </td>

                          <td
                            style={{
                              ...styles.td,
                              textAlign: "center",
                            }}
                          >
                            <button
                              onClick={() =>
                                deleteAttendance(
                                  row.student.id,
                                  row.attendance_date
                                )
                              }
                              disabled={isDeleting}
                              style={{
                                ...styles.deleteButton,
                                opacity:
                                  isDeleting
                                    ? 0.6
                                    : 1,
                                cursor:
                                  isDeleting
                                    ? "not-allowed"
                                    : "pointer",
                              }}
                            >
                              {isDeleting
                                ? "⏳ Deleting..."
                                : "🗑️ Delete"}
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* DELETE INFORMATION */}

        <section style={styles.deleteInfoCard}>
          <div style={styles.deleteInfoIcon}>
            🗑️
          </div>

          <div>
            <h3 style={styles.deleteInfoTitle}>
              Delete Incorrect Attendance
            </h3>

            <p style={styles.deleteInfoText}>
              Agar galti se Sunday, holiday ya kisi
              wrong date ki attendance mark ho gayi
              hai, to us record ke saamne
              <strong> Delete </strong>
              button dabakar attendance remove
              kar sakte hain.
            </p>

            <p style={styles.deleteWarning}>
              ⚠️ Delete karne ke baad attendance
              record permanently remove ho jayega.
            </p>
          </div>
        </section>

        {/* FOOTER */}

        <footer style={styles.footer}>
          Attendance Portal • Teacher Attendance
          History • 2026
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

  backButton: {
    border: "none",
    background: "#1d4ed8",
    color: "#ffffff",
    padding: "12px 18px",
    borderRadius: "10px",
    fontWeight: "800",
    cursor: "pointer",
    fontSize: "14px",
  },

  successBox: {
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #bbf7d0",
    borderRadius: "12px",
    padding: "15px",
    marginBottom: "20px",
    fontWeight: "800",
  },

  filterCard: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "22px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
  },

  filterTitle: {
    fontSize: "18px",
    fontWeight: "900",
    color: "#172554",
    marginBottom: "16px",
  },

  filterGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: "15px",
    alignItems: "end",
  },

  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  label: {
    fontSize: "12px",
    fontWeight: "800",
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

  clearButtonWrapper: {
    display: "flex",
    alignItems: "end",
  },

  clearButton: {
    border: "none",
    background: "#475569",
    color: "#ffffff",
    padding: "12px 17px",
    borderRadius: "10px",
    fontWeight: "800",
    cursor: "pointer",
    fontSize: "13px",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: "15px",
    marginBottom: "20px",
  },

  statCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
  },

  statIcon: {
    width: "55px",
    height: "55px",
    borderRadius: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "26px",
    fontWeight: "900",
    flexShrink: 0,
  },

  statLabel: {
    color: "#475569",
    fontSize: "12px",
    fontWeight: "800",
  },

  statValue: {
    color: "#172554",
    fontSize: "25px",
    fontWeight: "900",
    marginTop: "2px",
  },

  statText: {
    color: "#64748b",
    fontSize: "11px",
    marginTop: "2px",
    fontWeight: "600",
  },

  errorBox: {
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    borderRadius: "12px",
    padding: "15px",
    marginBottom: "20px",
    fontWeight: "700",
  },

  historyCard: {
    background: "#ffffff",
    borderRadius: "22px",
    padding: "22px",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.08)",
    overflow: "hidden",
  },

  historyHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },

  historyTitle: {
    margin: 0,
    fontSize: "22px",
    color: "#172554",
    fontWeight: "900",
  },

  historySubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "600",
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
    minWidth: "850px",
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
    padding: "14px 12px",
    borderBottom:
      "1px solid #e2e8f0",
    color: "#334155",
    fontSize: "13px",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },

  studentCell: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  studentAvatar: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    background: "#dbeafe",
    color: "#1d4ed8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    fontSize: "15px",
  },

  studentName: {
    color: "#0f172a",
    fontSize: "14px",
  },

  username: {
    background: "#f1f5f9",
    color: "#334155",
    padding: "6px 9px",
    borderRadius: "7px",
    fontSize: "12px",
    fontWeight: "800",
  },

  presentBadge: {
    display: "inline-block",
    background: "#dcfce7",
    color: "#166534",
    padding: "7px 11px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "900",
  },

  absentBadge: {
    display: "inline-block",
    background: "#fee2e2",
    color: "#991b1b",
    padding: "7px 11px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "900",
  },

  deleteButton: {
    border: "none",
    background: "#dc2626",
    color: "#ffffff",
    padding: "9px 13px",
    borderRadius: "9px",
    fontWeight: "900",
    cursor: "pointer",
    fontSize: "12px",
    boxShadow:
      "0 4px 10px rgba(220,38,38,0.18)",
  },

  deleteInfoCard: {
    marginTop: "20px",
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    gap: "14px",
    alignItems: "flex-start",
  },

  deleteInfoIcon: {
    fontSize: "30px",
    flexShrink: 0,
  },

  deleteInfoTitle: {
    margin: 0,
    color: "#9a3412",
    fontSize: "17px",
    fontWeight: "900",
  },

  deleteInfoText: {
    margin: "7px 0 0",
    color: "#7c2d12",
    fontSize: "13px",
    lineHeight: 1.6,
    fontWeight: "600",
  },

  deleteWarning: {
    margin: "8px 0 0",
    color: "#b91c1c",
    fontSize: "12px",
    fontWeight: "800",
  },

  loadingBox: {
    textAlign: "center",
    padding: "60px 20px",
    background: "#f8fafc",
    borderRadius: "14px",
  },

  loadingIcon: {
    fontSize: "40px",
  },

  loadingTitle: {
    margin: "12px 0 5px",
    color: "#172554",
    fontSize: "18px",
    fontWeight: "900",
  },

  loadingText: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
  },

  emptyBox: {
    textAlign: "center",
    padding: "55px 20px",
    background: "#f8fafc",
    borderRadius: "14px",
  },

  emptyIcon: {
    fontSize: "48px",
  },

  emptyTitle: {
    margin: "12px 0 5px",
    color: "#172554",
    fontSize: "19px",
    fontWeight: "900",
  },

  emptyText: {
    margin: "0 auto 18px",
    maxWidth: "500px",
    color: "#64748b",
    fontSize: "13px",
    lineHeight: "1.6",
  },

  footer: {
    textAlign: "center",
    padding: "25px 10px",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "700",
  },
};