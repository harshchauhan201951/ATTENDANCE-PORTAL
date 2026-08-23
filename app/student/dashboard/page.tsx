"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Student = {
  id: number;
  student_name: string;
  student_username: string;
};

type AttendanceStatus = "Present" | "Absent";

export default function TeacherAttendancePage() {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<
    Record<number, AttendanceStatus>
  >({});

  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const today = useMemo(() => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }, []);

  useEffect(() => {
    setSelectedDate(today);
  }, [today]);

  useEffect(() => {
    if (selectedDate) {
      loadAttendancePage();
    }
  }, [selectedDate]);

  async function loadAttendancePage() {
    setLoading(true);
    setErrorMessage("");
    setMessage("");

    const { data, error } = await supabase
      .from("students")
      .select("id, student_name, student_username")
      .order("id", { ascending: true });

    if (error) {
      console.error("Students error:", error);

      setErrorMessage(
        "Students load nahi ho rahe: " + error.message
      );

      setLoading(false);
      return;
    }

    const studentList = (data || []) as Student[];

    setStudents(studentList);

    const { data: attendanceData, error: attendanceError } =
      await supabase
        .from("attendance")
        .select("student_id, attendance_date, status")
        .eq("attendance_date", selectedDate);

    if (attendanceError) {
      console.error(
        "Attendance load error:",
        attendanceError
      );

      setErrorMessage(
        "Attendance load nahi ho rahi: " +
          attendanceError.message
      );

      setAttendance({});
      setLoading(false);
      return;
    }

    const existingAttendance: Record<
      number,
      AttendanceStatus
    > = {};

    (attendanceData || []).forEach((record) => {
      const status =
        String(record.status).toLowerCase() ===
        "present"
          ? "Present"
          : "Absent";

      existingAttendance[Number(record.student_id)] =
        status;
    });

    setAttendance(existingAttendance);
    setLoading(false);
  }

  function markStudent(
    studentId: number,
    status: AttendanceStatus
  ) {
    setAttendance((previous) => ({
      ...previous,
      [studentId]: status,
    }));

    setMessage("");
    setErrorMessage("");
  }

  function markAll(status: AttendanceStatus) {
    const newAttendance: Record<
      number,
      AttendanceStatus
    > = {};

    students.forEach((student) => {
      newAttendance[student.id] = status;
    });

    setAttendance(newAttendance);

    setMessage("");
    setErrorMessage("");
  }

  async function saveAttendance() {
    if (!selectedDate) {
      setErrorMessage("Please select attendance date.");
      return;
    }

    if (students.length === 0) {
      setErrorMessage("No students found.");
      return;
    }

    const incompleteStudents = students.filter(
      (student) => !attendance[student.id]
    );

    if (incompleteStudents.length > 0) {
      setErrorMessage(
        `Please mark attendance for all students. ${incompleteStudents.length} student(s) are still unmarked.`
      );
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const rows = students.map((student) => ({
      student_id: student.id,
      attendance_date: selectedDate,
      status: attendance[student.id],
    }));

    const { error } = await supabase
      .from("attendance")
      .upsert(rows, {
        onConflict: "student_id,attendance_date",
      });

    if (error) {
      console.error("Save attendance error:", error);

      setErrorMessage(
        "Attendance save nahi hui: " + error.message
      );

      setSaving(false);
      return;
    }

    setMessage(
      `✅ Attendance saved successfully for ${formatDate(
        selectedDate
      )}.`
    );

    setSaving(false);

    await loadAttendancePage();
  }

  async function deleteAttendance() {
    if (!selectedDate) {
      setErrorMessage("Please select a date.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to DELETE attendance for ${formatDate(
        selectedDate
      )}?\n\nThis will remove the attendance for ALL students on this date.\n\nStudents will also no longer see this attendance.`
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("attendance")
      .delete()
      .eq("attendance_date", selectedDate);

    if (error) {
      console.error(
        "Delete attendance error:",
        error
      );

      setErrorMessage(
        "Attendance delete nahi hui: " +
          error.message
      );

      setDeleting(false);
      return;
    }

    setAttendance({});

    setMessage(
      `🗑️ Attendance for ${formatDate(
        selectedDate
      )} has been deleted successfully. Students will no longer see this attendance.`
    );

    setDeleting(false);

    await loadAttendancePage();
  }

  function formatDate(date: string) {
    if (!date) return "";

    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  const presentCount = students.filter(
    (student) =>
      attendance[student.id] === "Present"
  ).length;

  const absentCount = students.filter(
    (student) =>
      attendance[student.id] === "Absent"
  ).length;

  const unmarkedCount =
    students.length -
    presentCount -
    absentCount;

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
              📝 Mark Attendance
            </h1>

            <p style={styles.subtitle}>
              Mark and manage student attendance
            </p>
          </div>

          <button
            onClick={() =>
              router.push("/teacher")
            }
            style={styles.backButton}
          >
            ← Teacher Dashboard
          </button>
        </header>

        {/* DATE + ACTIONS */}

        <section style={styles.controlCard}>
          <div style={styles.dateSection}>
            <label style={styles.label}>
              Attendance Date
            </label>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) =>
                setSelectedDate(e.target.value)
              }
              style={styles.dateInput}
            />
          </div>

          <div style={styles.actionSection}>
            <button
              onClick={() =>
                markAll("Present")
              }
              disabled={loading || students.length === 0}
              style={styles.allPresentButton}
            >
              ✓ Mark All Present
            </button>

            <button
              onClick={() =>
                markAll("Absent")
              }
              disabled={loading || students.length === 0}
              style={styles.allAbsentButton}
            >
              ✕ Mark All Absent
            </button>
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
                Students
              </div>

              <div style={styles.statValue}>
                {students.length}
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
            </div>
          </div>

          <div style={styles.statCard}>
            <div
              style={{
                ...styles.statIcon,
                background: "#fef3c7",
              }}
            >
              ⏳
            </div>

            <div>
              <div style={styles.statLabel}>
                Unmarked
              </div>

              <div
                style={{
                  ...styles.statValue,
                  color: "#b45309",
                }}
              >
                {unmarkedCount}
              </div>
            </div>
          </div>
        </section>

        {/* MESSAGE */}

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

        {/* STUDENT LIST */}

        <section style={styles.attendanceCard}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>
                👨‍🎓 Student Attendance
              </h2>

              <p style={styles.cardSubtitle}>
                {selectedDate
                  ? formatDate(selectedDate)
                  : "Select a date"}
              </p>
            </div>

            <button
              onClick={loadAttendancePage}
              disabled={loading}
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
                Loading students...
              </h3>
            </div>
          ) : students.length === 0 ? (
            <div style={styles.emptyBox}>
              <div style={styles.emptyIcon}>
                📭
              </div>

              <h3 style={styles.emptyTitle}>
                No students found
              </h3>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>#</th>

                    <th style={styles.th}>
                      Student
                    </th>

                    <th style={styles.th}>
                      Username
                    </th>

                    <th style={styles.th}>
                      Attendance
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {students.map(
                    (student, index) => {
                      const currentStatus =
                        attendance[
                          student.id
                        ];

                      return (
                        <tr
                          key={student.id}
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
                                  styles.avatar
                                }
                              >
                                {student.student_name
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
                                {student.student_name ||
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
                                student.student_username
                              }
                            </span>
                          </td>

                          <td style={styles.td}>
                            <div
                              style={
                                styles.attendanceButtons
                              }
                            >
                              <button
                                onClick={() =>
                                  markStudent(
                                    student.id,
                                    "Present"
                                  )
                                }
                                style={{
                                  ...styles.presentButton,
                                  ...(currentStatus ===
                                  "Present"
                                    ? styles.presentSelected
                                    : {}),
                                }}
                              >
                                ✓ Present
                              </button>

                              <button
                                onClick={() =>
                                  markStudent(
                                    student.id,
                                    "Absent"
                                  )
                                }
                                style={{
                                  ...styles.absentButton,
                                  ...(currentStatus ===
                                  "Absent"
                                    ? styles.absentSelected
                                    : {}),
                                }}
                              >
                                ✕ Absent
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* SAVE + DELETE */}

          {!loading &&
            students.length > 0 && (
              <div style={styles.bottomActions}>
                <button
                  onClick={saveAttendance}
                  disabled={saving || deleting}
                  style={styles.saveButton}
                >
                  {saving
                    ? "⏳ Saving..."
                    : "💾 Save Attendance"}
                </button>

                <button
                  onClick={deleteAttendance}
                  disabled={
                    deleting ||
                    saving ||
                    presentCount === 0 &&
                      absentCount === 0
                  }
                  style={styles.deleteButton}
                >
                  {deleting
                    ? "⏳ Deleting..."
                    : "🗑️ Delete Attendance for This Date"}
                </button>
              </div>
            )}
        </section>

        {/* WARNING */}

        <section style={styles.warningCard}>
          <div style={styles.warningIcon}>
            ⚠️
          </div>

          <div>
            <h3 style={styles.warningTitle}>
              Attendance Management
            </h3>

            <p style={styles.warningText}>
              Attendance is saved only when you
              click <strong>Save Attendance</strong>.
              If attendance was accidentally marked
              on Sunday, a holiday, or any wrong
              date, select that date and click
              <strong>
                {" "}
                Delete Attendance for This Date
              </strong>
              . The records will be removed from the
              database and students will no longer
              see those records.
            </p>
          </div>
        </section>

        <footer style={styles.footer}>
          Attendance Portal • Teacher Attendance •
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

  controlCard: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "22px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
    display: "flex",
    alignItems: "end",
    justifyContent: "space-between",
    gap: "20px",
    flexWrap: "wrap",
  },

  dateSection: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  label: {
    color: "#334155",
    fontSize: "12px",
    fontWeight: "800",
  },

  dateInput: {
    padding: "12px 14px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "14px",
    fontWeight: "700",
  },

  actionSection: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  allPresentButton: {
    border: "none",
    background: "#16a34a",
    color: "#ffffff",
    padding: "12px 16px",
    borderRadius: "10px",
    fontWeight: "800",
    cursor: "pointer",
  },

  allAbsentButton: {
    border: "none",
    background: "#dc2626",
    color: "#ffffff",
    padding: "12px 16px",
    borderRadius: "10px",
    fontWeight: "800",
    cursor: "pointer",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(210px,1fr))",
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

  attendanceCard: {
    background: "#ffffff",
    borderRadius: "22px",
    padding: "22px",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.08)",
    overflow: "hidden",
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },

  cardTitle: {
    margin: 0,
    fontSize: "22px",
    color: "#172554",
    fontWeight: "900",
  },

  cardSubtitle: {
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
    minWidth: "800px",
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

  avatar: {
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

  attendanceButtons: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },

  presentButton: {
    border: "1px solid #86efac",
    background: "#f0fdf4",
    color: "#15803d",
    padding: "9px 13px",
    borderRadius: "9px",
    fontWeight: "800",
    cursor: "pointer",
  },

  presentSelected: {
    background: "#16a34a",
    color: "#ffffff",
    border: "1px solid #16a34a",
  },

  absentButton: {
    border: "1px solid #fca5a5",
    background: "#fef2f2",
    color: "#dc2626",
    padding: "9px 13px",
    borderRadius: "9px",
    fontWeight: "800",
    cursor: "pointer",
  },

  absentSelected: {
    background: "#dc2626",
    color: "#ffffff",
    border: "1px solid #dc2626",
  },

  bottomActions: {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    marginTop: "22px",
    paddingTop: "20px",
    borderTop: "1px solid #e2e8f0",
    flexWrap: "wrap",
  },

  saveButton: {
    border: "none",
    background:
      "linear-gradient(135deg,#16a34a,#15803d)",
    color: "#ffffff",
    padding: "14px 25px",
    borderRadius: "11px",
    fontWeight: "900",
    cursor: "pointer",
    fontSize: "14px",
    boxShadow:
      "0 8px 18px rgba(22,163,74,0.22)",
  },

  deleteButton: {
    border: "none",
    background:
      "linear-gradient(135deg,#dc2626,#b91c1c)",
    color: "#ffffff",
    padding: "14px 25px",
    borderRadius: "11px",
    fontWeight: "900",
    cursor: "pointer",
    fontSize: "14px",
    boxShadow:
      "0 8px 18px rgba(220,38,38,0.20)",
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
    margin: "12px 0 0",
    color: "#172554",
    fontSize: "18px",
    fontWeight: "900",
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
    margin: "12px 0 0",
    color: "#172554",
    fontSize: "19px",
    fontWeight: "900",
  },

  warningCard: {
    marginTop: "20px",
    background:
      "linear-gradient(135deg,#fffbeb,#fef3c7)",
    border: "1px solid #fde68a",
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    gap: "14px",
    alignItems: "flex-start",
  },

  warningIcon: {
    fontSize: "28px",
  },

  warningTitle: {
    margin: 0,
    color: "#92400e",
    fontSize: "17px",
    fontWeight: "900",
  },

  warningText: {
    margin: "7px 0 0",
    color: "#78350f",
    fontSize: "13px",
    lineHeight: 1.6,
    fontWeight: "600",
  },

  footer: {
    textAlign: "center",
    padding: "25px 10px",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "700",
  },
};