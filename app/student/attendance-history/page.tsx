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
  student_id: number;
  attendance_date: string;
  status: string;
};

export default function AttendanceHistoryPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  const [selectedDate, setSelectedDate] = useState("");
  const [search, setSearch] = useState("");

  const [deletedRecords, setDeletedRecords] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setErrorMessage("");
    setSaveMessage("");

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

    setDeletedRecords([]);
    setLoading(false);
  }

  /*
   * Unique key for one student's attendance
   * on one particular date.
   */
  function getRecordKey(
    studentId: number,
    attendanceDate: string
  ) {
    return `${studentId}__${attendanceDate}`;
  }

  /*
   * TEMPORARY DELETE
   *
   * This does NOT delete from Supabase.
   * It only hides the record until Save Changes.
   */
  function deleteAttendance(
    studentId: number,
    attendanceDate: string
  ) {
    const key = getRecordKey(
      studentId,
      attendanceDate
    );

    setDeletedRecords((previous) => {
      if (previous.includes(key)) {
        return previous;
      }

      return [...previous, key];
    });

    setSaveMessage("");
    setErrorMessage("");
  }

  /*
   * UNDO TEMPORARY DELETE
   */
  function undoDelete(
    studentId: number,
    attendanceDate: string
  ) {
    const key = getRecordKey(
      studentId,
      attendanceDate
    );

    setDeletedRecords((previous) =>
      previous.filter(
        (item) => item !== key
      )
    );

    setSaveMessage("");
    setErrorMessage("");
  }

  /*
   * PERMANENT SAVE
   *
   * Deletes selected attendance records
   * directly from Supabase.
   */
  async function saveChanges() {
    if (deletedRecords.length === 0) {
      setSaveMessage(
        "Koi attendance delete ke liye selected nahi hai."
      );
      return;
    }

    const confirmed = window.confirm(
      `Aap ${deletedRecords.length} attendance record(s) permanently delete karne wale hain.\n\n` +
        "Ye Student aur Teacher dono portals se remove ho jayenge.\n\n" +
        "Kya aap continue karna chahte hain?"
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setSaveMessage("");
    setErrorMessage("");

    try {
      /*
       * Delete each selected record.
       *
       * student_id + attendance_date together
       * identify the attendance record.
       */
      for (const key of deletedRecords) {
        const separatorIndex =
          key.indexOf("__");

        const studentId = Number(
          key.substring(0, separatorIndex)
        );

        const attendanceDate =
          key.substring(
            separatorIndex + 2
          );

        const { error } = await supabase
          .from("attendance")
          .delete()
          .eq(
            "student_id",
            studentId
          )
          .eq(
            "attendance_date",
            attendanceDate
          );

        if (error) {
          console.error(
            "Delete attendance error:",
            error
          );

          throw new Error(
            `Student ID ${studentId}, Date ${attendanceDate}: ${error.message}`
          );
        }
      }

      /*
       * Successfully deleted from database.
       * Reload fresh data from Supabase.
       */
      setDeletedRecords([]);

      await loadData();

      setSaveMessage(
        "✅ Attendance changes saved successfully. Deleted records permanently remove ho gaye hain."
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "❌ Attendance delete save nahi hui. " +
          (error instanceof Error
            ? error.message
            : "Unknown error")
      );
    } finally {
      setSaving(false);
    }
  }

  const availableDates = useMemo(() => {
    const dates = Array.from(
      new Set(
        records.map(
          (record) =>
            record.attendance_date
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
            item.id ===
            record.student_id
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
            item.id ===
            record.student_id
        );

        if (!student) {
          return null;
        }

        return {
          student,
          student_id: record.student_id,
          attendance_date:
            record.attendance_date,
          status: record.status,
        };
      })
      .filter(
        (
          item
        ): item is HistoryRow =>
          item !== null
      );

  const visibleRows =
    historyRows.filter((row) => {
      const key = getRecordKey(
        row.student_id,
        row.attendance_date
      );

      return !deletedRecords.includes(
        key
      );
    });

  const presentCount =
    visibleRows.filter(
      (item) =>
        item.status.toLowerCase() ===
        "present"
    ).length;

  const absentCount =
    visibleRows.filter(
      (item) =>
        item.status.toLowerCase() ===
        "absent"
    ).length;

  const totalCount =
    visibleRows.length;

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

  function cancelAllDeletes() {
    if (
      deletedRecords.length === 0
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Saare pending deletions cancel karke records wapas dikhaye jayen?"
    );

    if (!confirmed) {
      return;
    }

    setDeletedRecords([]);
    setSaveMessage("");
    setErrorMessage("");
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
              View, manage and permanently
              delete previous student
              attendance records
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

        {/* SAVE BAR */}

        {deletedRecords.length > 0 && (
          <section style={styles.saveCard}>
            <div>
              <div style={styles.saveTitle}>
                ⚠️ Pending Attendance Deletions
              </div>

              <div style={styles.saveText}>
                {deletedRecords.length} attendance
                record(s) delete ke liye selected
                hain.
                <br />
                <strong>
                  Save Changes
                </strong>{" "}
                dabane par ye records
                permanently database se delete
                ho jayenge aur Student + Teacher
                dono portals se remove ho jayenge.
              </div>
            </div>

            <div style={styles.saveActions}>
              <button
                onClick={cancelAllDeletes}
                disabled={saving}
                style={
                  styles.cancelDeleteButton
                }
              >
                ↩ Cancel
              </button>

              <button
                onClick={saveChanges}
                disabled={saving}
                style={styles.saveButton}
              >
                {saving
                  ? "⏳ Saving..."
                  : "💾 Save Changes"}
              </button>
            </div>
          </section>
        )}

        {/* SUCCESS */}

        {saveMessage && (
          <div style={styles.successBox}>
            {saveMessage}
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
                  setSearch(
                    e.target.value
                  )
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
                Visible attendance records
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
              disabled={saving}
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
                Please wait while records
                are being loaded.
              </p>
            </div>
          ) : visibleRows.length === 0 ? (
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

                    <th style={styles.th}>
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {visibleRows.map(
                    (row, index) => {
                      const key =
                        getRecordKey(
                          row.student_id,
                          row.attendance_date
                        );

                      return (
                        <tr key={key}>

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
                                {row.student
                                  .student_name
                                  ?.charAt(
                                    0
                                  )
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

                          <td style={styles.td}>
                            <button
                              onClick={() =>
                                deleteAttendance(
                                  row.student_id,
                                  row.attendance_date
                                )
                              }
                              disabled={saving}
                              style={
                                styles.deleteButton
                              }
                            >
                              🗑️ Delete
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

  saveCard: {
    background:
      "linear-gradient(135deg,#fff7ed,#fffbeb)",
    border:
      "2px solid #f59e0b",
    borderRadius: "18px",
    padding: "20px",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    boxShadow:
      "0 8px 25px rgba(245,158,11,0.12)",
    flexWrap: "wrap",
  },

  saveTitle: {
    color: "#92400e",
    fontSize: "18px",
    fontWeight: "900",
    marginBottom: "7px",
  },

  saveText: {
    color: "#78350f",
    fontSize: "13px",
    lineHeight: 1.6,
    fontWeight: "600",
  },

  saveActions: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },

  saveButton: {
    border: "none",
    background: "#16a34a",
    color: "#ffffff",
    padding: "13px 20px",
    borderRadius: "11px",
    fontWeight: "900",
    cursor: "pointer",
    fontSize: "14px",
    boxShadow:
      "0 6px 15px rgba(22,163,74,0.25)",
  },

  cancelDeleteButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    padding: "13px 17px",
    borderRadius: "11px",
    fontWeight: "800",
    cursor: "pointer",
    fontSize: "14px",
  },

  successBox: {
    background: "#dcfce7",
    color: "#166534",
    border:
      "1px solid #86efac",
    borderRadius: "12px",
    padding: "14px 16px",
    marginBottom: "20px",
    fontWeight: "800",
    fontSize: "13px",
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
    border:
      "1px solid #cbd5e1",
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
    border:
      "1px solid #fecaca",
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
    border:
      "1px solid #e2e8f0",
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