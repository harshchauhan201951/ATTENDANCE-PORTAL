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
  record: AttendanceRecord;
  student: Student;
};

export default function AttendanceHistoryPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  const [selectedDate, setSelectedDate] = useState("");
  const [search, setSearch] = useState("");

  const [deletedRecords, setDeletedRecords] = useState<
    AttendanceRecord[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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
          .select(
            "id, student_name, student_username"
          )
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
      setErrorMessage(
        "Students load nahi ho rahe: " +
          studentsResult.error.message
      );
      setLoading(false);
      return;
    }

    if (attendanceResult.error) {
      setErrorMessage(
        "Attendance load nahi ho rahi: " +
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

  function markForDeletion(record: AttendanceRecord) {
    const alreadyDeleted = deletedRecords.some(
      (item) =>
        item.student_id === record.student_id &&
        item.attendance_date ===
          record.attendance_date
    );

    if (alreadyDeleted) return;

    setDeletedRecords((previous) => [
      ...previous,
      record,
    ]);

    setMessage(
      "Attendance deletion ke liye select ho gayi hai. Permanent delete karne ke liye Save Deleted Attendances dabayein."
    );

    setErrorMessage("");
  }

  function undoDelete(record: AttendanceRecord) {
    setDeletedRecords((previous) =>
      previous.filter(
        (item) =>
          !(
            item.student_id ===
              record.student_id &&
            item.attendance_date ===
              record.attendance_date
          )
      )
    );

    setMessage("");
  }

  async function saveDeletedAttendances() {
    if (deletedRecords.length === 0) {
      setMessage(
        "Koi attendance delete ke liye select nahi hai."
      );
      return;
    }

    const confirmed = window.confirm(
      `${deletedRecords.length} attendance record(s) permanently delete karne hain?\n\nYe action Teacher aur Student dono portals se record hata dega.`
    );

    if (!confirmed) return;

    setSaving(true);
    setErrorMessage("");
    setMessage("");

    try {
      for (const record of deletedRecords) {
        const { error } = await supabase
          .from("attendance")
          .delete()
          .eq("student_id", record.student_id)
          .eq(
            "attendance_date",
            record.attendance_date
          );

        if (error) {
          throw new Error(
            `Student ID ${record.student_id}, Date ${record.attendance_date}: ${error.message}`
          );
        }
      }

      setRecords((previous) =>
        previous.filter(
          (record) =>
            !deletedRecords.some(
              (deleted) =>
                deleted.student_id ===
                  record.student_id &&
                deleted.attendance_date ===
                  record.attendance_date
            )
        )
      );

      setDeletedRecords([]);

      setMessage(
        "✅ Attendance permanently delete ho gayi. Teacher aur Student dono portals se record remove ho gaya."
      );
    } catch (error) {
      console.error(
        "Permanent attendance deletion error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Attendance delete nahi ho paayi."
      );
    } finally {
      setSaving(false);
    }
  }

  const availableDates = useMemo(() => {
    return Array.from(
      new Set(
        records.map(
          (record) => record.attendance_date
        )
      )
    ).sort(
      (a, b) =>
        new Date(b).getTime() -
        new Date(a).getTime()
    );
  }, [records]);

  const filteredRecords = useMemo(() => {
    let result = [...records];

    if (selectedDate) {
      result = result.filter(
        (record) =>
          record.attendance_date ===
          selectedDate
      );
    }

    if (search.trim()) {
      const text = search
        .trim()
        .toLowerCase();

      result = result.filter((record) => {
        const student = students.find(
          (item) =>
            item.id === record.student_id
        );

        if (!student) return false;

        return (
          student.student_name
            ?.toLowerCase()
            .includes(text) ||
          student.student_username
            ?.toLowerCase()
            .includes(text)
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

        if (!student) return null;

        return {
          record,
          student,
        };
      })
      .filter(
        (item): item is HistoryRow =>
          item !== null
      );

  const presentCount = historyRows.filter(
    (item) =>
      item.record.status.toLowerCase() ===
      "present"
  ).length;

  const absentCount = historyRows.filter(
    (item) =>
      item.record.status.toLowerCase() ===
      "absent"
  ).length;

  function formatDate(date: string) {
    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function isMarkedForDeletion(
    record: AttendanceRecord
  ) {
    return deletedRecords.some(
      (item) =>
        item.student_id === record.student_id &&
        item.attendance_date ===
          record.attendance_date
    );
  }

  function clearFilters() {
    setSelectedDate("");
    setSearch("");
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
              📅 Attendance History
            </h1>

            <p style={styles.subtitle}>
              View, manage and permanently delete
              previous attendance records
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
                  setSelectedDate(e.target.value)
                }
                style={styles.input}
              >
                <option value="">
                  All Dates
                </option>

                {availableDates.map((date) => (
                  <option
                    key={date}
                    value={date}
                  >
                    {formatDate(date)}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={clearFilters}
              style={styles.clearButton}
            >
              ✕ Clear Filters
            </button>
          </div>
        </section>

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
                {historyRows.length}
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

          <div style={styles.statCard}>
            <div
              style={{
                ...styles.statIcon,
                background: "#fef3c7",
              }}
            >
              🗑️
            </div>

            <div>
              <div style={styles.statLabel}>
                Selected for Delete
              </div>

              <div
                style={{
                  ...styles.statValue,
                  color: "#b45309",
                }}
              >
                {deletedRecords.length}
              </div>

              <div style={styles.statText}>
                Waiting for save
              </div>
            </div>
          </div>
        </section>

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

            <div style={styles.actionArea}>
              <button
                onClick={loadData}
                disabled={saving}
                style={styles.refreshButton}
              >
                🔄 Refresh
              </button>

              <button
                onClick={saveDeletedAttendances}
                disabled={
                  saving ||
                  deletedRecords.length === 0
                }
                style={{
                  ...styles.saveButton,
                  opacity:
                    saving ||
                    deletedRecords.length === 0
                      ? 0.5
                      : 1,
                  cursor:
                    saving ||
                    deletedRecords.length === 0
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {saving
                  ? "⏳ Saving..."
                  : `💾 Save Deleted Attendances (${deletedRecords.length})`}
              </button>
            </div>
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
                Please wait.
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
                No records match your current
                filters.
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

                    <th style={styles.th}>
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {historyRows.map(
                    (row, index) => {
                      const marked =
                        isMarkedForDeletion(
                          row.record
                        );

                      return (
                        <tr
                          key={`${row.record.student_id}-${row.record.attendance_date}`}
                          style={{
                            background: marked
                              ? "#fff7ed"
                              : "#ffffff",
                          }}
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
                              row.record
                                .attendance_date
                            )}
                          </td>

                          <td style={styles.td}>
                            {row.record.status
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

                          <td style={styles.td}>
                            {marked ? (
                              <button
                                onClick={() =>
                                  undoDelete(
                                    row.record
                                  )
                                }
                                style={
                                  styles.undoButton
                                }
                              >
                                ↩ Undo
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  markForDeletion(
                                    row.record
                                  )
                                }
                                style={
                                  styles.deleteButton
                                }
                              >
                                🗑️ Delete
                              </button>
                            )}
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
    fontFamily: "Arial, Helvetica, sans-serif",
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

  successBox: {
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #bbf7d0",
    borderRadius: "12px",
    padding: "15px",
    marginBottom: "20px",
    fontWeight: "700",
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

  actionArea: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap",
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

  saveButton: {
    border: "none",
    background:
      "linear-gradient(135deg,#15803d,#16a34a)",
    color: "#ffffff",
    padding: "12px 17px",
    borderRadius: "10px",
    fontWeight: "900",
    cursor: "pointer",
    boxShadow:
      "0 6px 15px rgba(22,163,74,0.22)",
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
    padding: "8px 12px",
    borderRadius: "8px",
    fontWeight: "800",
    cursor: "pointer",
    fontSize: "12px",
  },

  undoButton: {
    border: "none",
    background: "#f59e0b",
    color: "#ffffff",
    padding: "8px 12px",
    borderRadius: "8px",
    fontWeight: "800",
    cursor: "pointer",
    fontSize: "12px",
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