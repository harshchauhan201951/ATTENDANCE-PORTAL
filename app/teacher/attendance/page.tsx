"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type AttendanceStatus = "Present" | "Absent";

type Student = {
  id: number;
  student_name: string | null;
  student_username: string;
};

type AttendanceRecord = {
  id: number;
  student_id: number;
  attendance_date: string;
  status: AttendanceStatus;
};

export default function TeacherAttendancePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingStudentId, setSavingStudentId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setMessage("");

    try {
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id, student_name, student_username")
        .order("id", { ascending: true });

      if (studentError) {
        throw new Error(
          `Students load failed: ${studentError.message}`
        );
      }

      const { data: attendanceData, error: attendanceError } =
        await supabase
          .from("attendance")
          .select(
            "id, student_id, attendance_date, status"
          )
          .order("attendance_date", {
            ascending: false,
          });

      if (attendanceError) {
        throw new Error(
          `Attendance load failed: ${attendanceError.message}`
        );
      }

      setStudents((studentData || []) as Student[]);
      setAttendance((attendanceData || []) as AttendanceRecord[]);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load attendance data."
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredStudents = useMemo(() => {
    const text = search.trim().toLowerCase();

    if (!text) {
      return students;
    }

    return students.filter((student) => {
      const name =
        student.student_name?.toLowerCase() || "";

      const username =
        student.student_username.toLowerCase();

      return (
        name.includes(text) ||
        username.includes(text)
      );
    });
  }, [students, search]);

  const selectedDateRecords = useMemo(() => {
    return attendance.filter(
      (record) =>
        record.attendance_date === selectedDate
    );
  }, [attendance, selectedDate]);

  function getStatus(studentId: number): AttendanceStatus | "" {
    const record = selectedDateRecords.find(
      (item) => item.student_id === studentId
    );

    if (!record) {
      return "";
    }

    if (record.status === "Present") {
      return "Present";
    }

    if (record.status === "Absent") {
      return "Absent";
    }

    return "";
  }

  async function markAttendance(
    studentId: number,
    status: AttendanceStatus
  ) {
    setSavingStudentId(studentId);
    setMessage("");

    try {
      const existing = attendance.find(
        (record) =>
          record.student_id === studentId &&
          record.attendance_date === selectedDate
      );

      if (existing) {
        const { data, error } = await supabase
          .from("attendance")
          .update({
            status: status,
          })
          .eq("id", existing.id)
          .select(
            "id, student_id, attendance_date, status"
          )
          .single();

        if (error) {
          throw new Error(
            `Attendance update failed: ${error.message}`
          );
        }

        setAttendance((current) =>
          current.map((item) =>
            item.id === existing.id
              ? (data as AttendanceRecord)
              : item
          )
        );
      } else {
        const { data, error } = await supabase
          .from("attendance")
          .insert({
            student_id: studentId,
            attendance_date: selectedDate,
            status: status,
          })
          .select(
            "id, student_id, attendance_date, status"
          )
          .single();

        if (error) {
          throw new Error(
            `Attendance insert failed: ${error.message}`
          );
        }

        setAttendance((current) => [
          data as AttendanceRecord,
          ...current,
        ]);
      }

      setMessage(
        `${status} attendance marked successfully.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save attendance."
      );
    } finally {
      setSavingStudentId(null);
    }
  }

  function getStudentStats(studentId: number) {
    const records = attendance.filter(
      (record) =>
        record.student_id === studentId
    );

    const present = records.filter(
      (record) => record.status === "Present"
    ).length;

    const absent = records.filter(
      (record) => record.status === "Absent"
    ).length;

    const total = records.length;

    const percentage =
      total > 0
        ? Math.round((present / total) * 100)
        : 0;

    return {
      total,
      present,
      absent,
      percentage,
    };
  }

  const totalStudents = students.length;

  const presentToday =
    selectedDateRecords.filter(
      (record) => record.status === "Present"
    ).length;

  const absentToday =
    selectedDateRecords.filter(
      (record) => record.status === "Absent"
    ).length;

  const pendingToday = Math.max(
    0,
    totalStudents -
      presentToday -
      absentToday
  );

  const history = useMemo(() => {
    const filtered = month
      ? attendance.filter((record) =>
          record.attendance_date.startsWith(month)
        )
      : attendance;

    return [...filtered].sort((a, b) =>
      b.attendance_date.localeCompare(
        a.attendance_date
      )
    );
  }, [attendance, month]);

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingIcon}>
            ⏳
          </div>

          <h2 style={styles.loadingTitle}>
            Loading Attendance...
          </h2>

          <p style={styles.loadingText}>
            Please wait while student records
            are loaded.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}

        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.badge}>
              TEACHER CONTROL CENTER
            </div>

            <h1 style={styles.title}>
              📋 Attendance Management
            </h1>

            <p style={styles.subtitle}>
              Manage all students and mark their
              daily attendance.
            </p>
          </div>

          <button
            onClick={loadData}
            style={styles.refreshButton}
          >
            🔄 Refresh
          </button>
        </header>

        {/* MESSAGE */}

        {message && (
          <div
            style={
              message
                .toLowerCase()
                .includes("successfully")
                ? styles.success
                : styles.error
            }
          >
            <strong>
              {message
                .toLowerCase()
                .includes("successfully")
                ? "✅ "
                : "❌ "}
            </strong>

            {message}
          </div>
        )}

        {/* STATISTICS */}

        <section style={styles.statsGrid}>
          <Stat
            icon="👨‍🎓"
            title="Total Students"
            value={String(totalStudents)}
            background="linear-gradient(135deg,#2563eb,#1e40af)"
          />

          <Stat
            icon="✅"
            title="Present Today"
            value={String(presentToday)}
            background="linear-gradient(135deg,#16a34a,#166534)"
          />

          <Stat
            icon="❌"
            title="Absent Today"
            value={String(absentToday)}
            background="linear-gradient(135deg,#dc2626,#991b1b)"
          />

          <Stat
            icon="⏳"
            title="Pending"
            value={String(pendingToday)}
            background="linear-gradient(135deg,#f59e0b,#b45309)"
          />
        </section>

        {/* CONTROLS */}

        <section style={styles.controlCard}>
          <div style={styles.controlBox}>
            <label style={styles.label}>
              📅 Attendance Date
            </label>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) =>
                setSelectedDate(e.target.value)
              }
              style={styles.input}
            />
          </div>

          <div style={styles.controlBox}>
            <label style={styles.label}>
              🔎 Search Student
            </label>

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search name or username..."
              style={styles.input}
            />
          </div>
        </section>

        {/* STUDENT ATTENDANCE */}

        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                👨‍🎓 Students Attendance
              </h2>

              <p style={styles.sectionSubtitle}>
                Mark attendance for{" "}
                <strong style={styles.darkText}>
                  {formatDate(selectedDate)}
                </strong>
              </p>
            </div>

            <div style={styles.countBadge}>
              {filteredStudents.length} Students
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>
                🔍
              </div>

              <h3 style={styles.emptyTitle}>
                No Students Found
              </h3>

              <p style={styles.emptyText}>
                No student matches your search.
              </p>
            </div>
          ) : (
            <div style={styles.studentList}>
              {filteredStudents.map(
                (student, index) => {
                  const status =
                    getStatus(student.id);

                  const stats =
                    getStudentStats(
                      student.id
                    );

                  const isSaving =
                    savingStudentId ===
                    student.id;

                  return (
                    <div
                      key={student.id}
                      style={{
                        ...styles.studentRow,
                        border:
                          status === "Present"
                            ? "2px solid #22c55e"
                            : status === "Absent"
                            ? "2px solid #ef4444"
                            : "2px solid #cbd5e1",
                        background:
                          status === "Present"
                            ? "#f0fdf4"
                            : status === "Absent"
                            ? "#fef2f2"
                            : "#ffffff",
                      }}
                    >
                      {/* NUMBER */}

                      <div style={styles.number}>
                        {index + 1}
                      </div>

                      {/* AVATAR */}

                      <div style={styles.avatar}>
                        {(
                          student.student_name ||
                          student.student_username
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      {/* STUDENT DETAILS */}

                      <div style={styles.studentInfo}>
                        <h3
                          style={
                            styles.studentName
                          }
                        >
                          {student.student_name ||
                            "Student"}
                        </h3>

                        <p
                          style={
                            styles.username
                          }
                        >
                          Username:{" "}
                          <strong>
                            {
                              student.student_username
                            }
                          </strong>
                        </p>

                        <div
                          style={
                            styles.miniStats
                          }
                        >
                          <span
                            style={
                              styles.statText
                            }
                          >
                            📚 {stats.total} Classes
                          </span>

                          <span
                            style={
                              styles.presentText
                            }
                          >
                            ✅ {stats.present} Present
                          </span>

                          <span
                            style={
                              styles.absentText
                            }
                          >
                            ❌ {stats.absent} Absent
                          </span>

                          <span
                            style={
                              styles.percentText
                            }
                          >
                            📊 {stats.percentage}%
                          </span>
                        </div>
                      </div>

                      {/* ATTENDANCE */}

                      <div
                        style={
                          styles.attendanceActions
                        }
                      >
                        {isSaving && (
                          <div
                            style={
                              styles.savingText
                            }
                          >
                            ⏳ Saving...
                          </div>
                        )}

                        {status && !isSaving && (
                          <div
                            style={
                              status === "Present"
                                ? styles.presentBadge
                                : styles.absentBadge
                            }
                          >
                            {status === "Present"
                              ? "✓ PRESENT"
                              : "✕ ABSENT"}
                          </div>
                        )}

                        <div
                          style={styles.buttons}
                        >
                          <button
                            disabled={
                              savingStudentId !==
                              null
                            }
                            onClick={() =>
                              markAttendance(
                                student.id,
                                "Present"
                              )
                            }
                            style={{
                              ...styles.presentButton,
                              background:
                                status === "Present"
                                  ? "#15803d"
                                  : "#ffffff",
                              color:
                                status === "Present"
                                  ? "#ffffff"
                                  : "#15803d",
                              border:
                                "2px solid #15803d",
                              opacity:
                                savingStudentId !==
                                null
                                  ? 0.6
                                  : 1,
                            }}
                          >
                            ✓ Present
                          </button>

                          <button
                            disabled={
                              savingStudentId !==
                              null
                            }
                            onClick={() =>
                              markAttendance(
                                student.id,
                                "Absent"
                              )
                            }
                            style={{
                              ...styles.absentButton,
                              background:
                                status === "Absent"
                                  ? "#b91c1c"
                                  : "#ffffff",
                              color:
                                status === "Absent"
                                  ? "#ffffff"
                                  : "#b91c1c",
                              border:
                                "2px solid #b91c1c",
                              opacity:
                                savingStudentId !==
                                null
                                  ? 0.6
                                  : 1,
                            }}
                          >
                            ✕ Absent
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* HISTORY */}

        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                📜 Attendance History
              </h2>

              <p style={styles.sectionSubtitle}>
                Complete attendance records.
              </p>
            </div>

            <input
              type="month"
              value={month}
              onChange={(e) =>
                setMonth(e.target.value)
              }
              style={styles.monthInput}
            />
          </div>

          {history.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>
                📅
              </div>

              <h3 style={styles.emptyTitle}>
                No Attendance History
              </h3>

              <p style={styles.emptyText}>
                Attendance records will appear
                here after marking attendance.
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
                      Date
                    </th>

                    <th style={styles.th}>
                      Student
                    </th>

                    <th style={styles.th}>
                      Username
                    </th>

                    <th style={styles.th}>
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {history.map(
                    (record, index) => {
                      const student =
                        students.find(
                          (item) =>
                            item.id ===
                            record.student_id
                        );

                      const isPresent =
                        record.status ===
                        "Present";

                      return (
                        <tr key={record.id}>
                          <td style={styles.td}>
                            {index + 1}
                          </td>

                          <td style={styles.td}>
                            <strong>
                              {formatDate(
                                record.attendance_date
                              )}
                            </strong>
                          </td>

                          <td style={styles.td}>
                            <strong
                              style={
                                styles.historyName
                              }
                            >
                              {student?.student_name ||
                                "Unknown Student"}
                            </strong>
                          </td>

                          <td style={styles.td}>
                            <strong>
                              {student?.student_username ||
                                "-"}
                            </strong>
                          </td>

                          <td style={styles.td}>
                            <span
                              style={
                                isPresent
                                  ? styles.presentBadge
                                  : styles.absentBadge
                              }
                            >
                              {isPresent
                                ? "✓ PRESENT"
                                : "✕ ABSENT"}
                            </span>
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
          <strong>
            Attendance Portal
          </strong>{" "}
          • Teacher Management Center • 2026
        </footer>
      </div>
    </main>
  );
}

/* STAT COMPONENT */

function Stat({
  icon,
  title,
  value,
  background,
}: {
  icon: string;
  title: string;
  value: string;
  background: string;
}) {
  return (
    <div
      style={{
        ...styles.stat,
        background,
      }}
    >
      <div style={styles.statIcon}>
        {icon}
      </div>

      <div style={styles.statTitle}>
        {title}
      </div>

      <div style={styles.statValue}>
        {value}
      </div>
    </div>
  );
}

/* DATE FORMAT */

function formatDate(value: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

/* STYLES */

const styles: {
  [key: string]: React.CSSProperties;
} = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#e0f2fe 0%,#f8fafc 45%,#ede9fe 100%)",
    padding: "24px 16px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#0f172a",
  },

  container: {
    width: "100%",
    maxWidth: "1250px",
    margin: "0 auto",
  },

  header: {
    background: "#ffffff",
    border: "2px solid #dbeafe",
    borderRadius: "22px",
    padding: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.10)",
    marginBottom: "20px",
  },

  headerLeft: {
    minWidth: 0,
  },

  badge: {
    display: "inline-block",
    background: "#1d4ed8",
    color: "#ffffff",
    padding: "7px 12px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "0.6px",
    marginBottom: "10px",
  },

  title: {
    margin: 0,
    color: "#0f172a",
    fontSize: "32px",
    fontWeight: "900",
    lineHeight: 1.2,
  },

  subtitle: {
    margin: "9px 0 0",
    color: "#334155",
    fontSize: "15px",
    fontWeight: "600",
  },

  refreshButton: {
    border: "none",
    background: "#1d4ed8",
    color: "#ffffff",
    padding: "13px 20px",
    borderRadius: "12px",
    fontWeight: "800",
    fontSize: "14px",
    cursor: "pointer",
    boxShadow:
      "0 5px 15px rgba(29,78,216,0.25)",
  },

  success: {
    background: "#dcfce7",
    color: "#14532d",
    border: "2px solid #4ade80",
    padding: "15px 18px",
    borderRadius: "12px",
    marginBottom: "20px",
    fontWeight: "800",
    fontSize: "14px",
  },

  error: {
    background: "#fee2e2",
    color: "#7f1d1d",
    border: "2px solid #f87171",
    padding: "15px 18px",
    borderRadius: "12px",
    marginBottom: "20px",
    fontWeight: "800",
    fontSize: "14px",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(210px,1fr))",
    gap: "18px",
    marginBottom: "20px",
  },

  stat: {
    color: "#ffffff",
    padding: "24px",
    borderRadius: "20px",
    minHeight: "150px",
    boxSizing: "border-box",
    boxShadow:
      "0 10px 25px rgba(15,23,42,0.15)",
  },

  statIcon: {
    fontSize: "30px",
  },

  statTitle: {
    marginTop: "12px",
    fontSize: "14px",
    fontWeight: "800",
    color: "#ffffff",
  },

  statValue: {
    marginTop: "5px",
    fontSize: "36px",
    fontWeight: "900",
    color: "#ffffff",
  },

  controlCard: {
    background: "#ffffff",
    padding: "22px",
    borderRadius: "18px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(280px,1fr))",
    gap: "18px",
    border: "2px solid #e2e8f0",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
    marginBottom: "20px",
  },

  controlBox: {
    display: "flex",
    flexDirection: "column",
    gap: "9px",
  },

  label: {
    color: "#0f172a",
    fontWeight: "900",
    fontSize: "14px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    border: "2px solid #94a3b8",
    borderRadius: "10px",
    fontSize: "15px",
    color: "#0f172a",
    background: "#ffffff",
    outline: "none",
    fontWeight: "600",
  },

  card: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "24px",
    border: "2px solid #e2e8f0",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
    marginBottom: "20px",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },

  sectionTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "23px",
    fontWeight: "900",
  },

  sectionSubtitle: {
    margin: "7px 0 0",
    color: "#475569",
    fontSize: "14px",
    fontWeight: "600",
  },

  darkText: {
    color: "#0f172a",
    fontWeight: "900",
  },

  countBadge: {
    background: "#dbeafe",
    color: "#1e3a8a",
    border: "2px solid #93c5fd",
    padding: "9px 14px",
    borderRadius: "999px",
    fontWeight: "900",
    fontSize: "13px",
  },

  studentList: {
    display: "flex",
    flexDirection: "column",
    gap: "13px",
  },

  studentRow: {
    borderRadius: "16px",
    padding: "17px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    boxSizing: "border-box",
    boxShadow:
      "0 4px 12px rgba(15,23,42,0.06)",
  },

  number: {
    width: "32px",
    minWidth: "32px",
    textAlign: "center",
    color: "#0f172a",
    fontWeight: "900",
    fontSize: "16px",
  },

  avatar: {
    width: "54px",
    height: "54px",
    minWidth: "54px",
    borderRadius: "50%",
    background:
      "linear-gradient(135deg,#1d4ed8,#4f46e5)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "21px",
    fontWeight: "900",
    border: "3px solid #bfdbfe",
  },

  studentInfo: {
    flex: 1,
    minWidth: "220px",
  },

  studentName: {
    margin: 0,
    color: "#020617",
    fontSize: "19px",
    fontWeight: "900",
    lineHeight: 1.25,
  },

  username: {
    margin: "5px 0 0",
    color: "#334155",
    fontSize: "13px",
    fontWeight: "600",
  },

  miniStats: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "9px",
  },

  statText: {
    color: "#334155",
    fontSize: "12px",
    fontWeight: "800",
  },

  presentText: {
    color: "#15803d",
    fontSize: "12px",
    fontWeight: "900",
  },

  absentText: {
    color: "#b91c1c",
    fontSize: "12px",
    fontWeight: "900",
  },

  percentText: {
    color: "#1d4ed8",
    fontSize: "12px",
    fontWeight: "900",
  },

  attendanceActions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "9px",
    minWidth: "205px",
  },

  savingText: {
    color: "#1d4ed8",
    fontSize: "12px",
    fontWeight: "900",
  },

  buttons: {
    display: "flex",
    gap: "8px",
  },

  presentButton: {
    padding: "10px 14px",
    borderRadius: "9px",
    fontWeight: "900",
    fontSize: "13px",
    cursor: "pointer",
  },

  absentButton: {
    padding: "10px 14px",
    borderRadius: "9px",
    fontWeight: "900",
    fontSize: "13px",
    cursor: "pointer",
  },

  presentBadge: {
    display: "inline-block",
    background: "#16a34a",
    color: "#ffffff",
    padding: "7px 12px",
    borderRadius: "999px",
    fontWeight: "900",
    fontSize: "12px",
    border: "2px solid #166534",
  },

  absentBadge: {
    display: "inline-block",
    background: "#dc2626",
    color: "#ffffff",
    padding: "7px 12px",
    borderRadius: "999px",
    fontWeight: "900",
    fontSize: "12px",
    border: "2px solid #991b1b",
  },

  monthInput: {
    padding: "11px",
    border: "2px solid #94a3b8",
    borderRadius: "10px",
    color: "#0f172a",
    background: "#ffffff",
    fontWeight: "700",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "720px",
    background: "#ffffff",
  },

  th: {
    padding: "14px",
    textAlign: "left",
    background: "#dbeafe",
    color: "#172554",
    borderBottom: "2px solid #93c5fd",
    fontSize: "13px",
    fontWeight: "900",
  },

  td: {
    padding: "14px",
    borderBottom: "1px solid #cbd5e1",
    color: "#0f172a",
    fontSize: "13px",
    fontWeight: "600",
    background: "#ffffff",
  },

  historyName: {
    color: "#020617",
    fontWeight: "900",
  },

  empty: {
    textAlign: "center",
    padding: "50px 20px",
    color: "#334155",
  },

  emptyIcon: {
    fontSize: "48px",
    marginBottom: "10px",
  },

  emptyTitle: {
    color: "#0f172a",
    fontWeight: "900",
    fontSize: "20px",
  },

  emptyText: {
    color: "#475569",
    fontWeight: "600",
  },

  loadingCard: {
    maxWidth: "450px",
    margin: "100px auto",
    background: "#ffffff",
    padding: "40px",
    borderRadius: "20px",
    textAlign: "center",
    border: "2px solid #dbeafe",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.12)",
  },

  loadingIcon: {
    fontSize: "42px",
  },

  loadingTitle: {
    color: "#0f172a",
    fontWeight: "900",
  },

  loadingText: {
    color: "#475569",
    fontWeight: "600",
  },

  footer: {
    textAlign: "center",
    color: "#334155",
    padding: "25px",
    fontSize: "13px",
    fontWeight: "600",
  },
};