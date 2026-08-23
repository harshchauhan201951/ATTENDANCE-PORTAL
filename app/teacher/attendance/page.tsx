"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Student = {
  id: number;
  student_name: string | null;
  student_username: string;
};

type AttendanceRecord = {
  id: number;
  student_id: number;
  attendance_date: string;
  status: string;
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
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setMessage("");

    try {
      const { data: studentData, error: studentError } =
        await supabase
          .from("students")
          .select("id, student_name, student_username")
          .order("id", { ascending: true });

      if (studentError) {
        throw new Error(studentError.message);
      }

      const { data: attendanceData, error: attendanceError } =
        await supabase
          .from("attendance")
          .select("id, student_id, attendance_date, status")
          .order("attendance_date", { ascending: false });

      if (attendanceError) {
        throw new Error(attendanceError.message);
      }

      setStudents(studentData || []);
      setAttendance(attendanceData || []);
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

  function getStatus(studentId: number) {
    const record = selectedDateRecords.find(
      (item) => item.student_id === studentId
    );

    return record?.status?.toLowerCase() || "";
  }

  async function markAttendance(
    studentId: number,
    status: "present" | "absent"
  ) {
    setSaving(true);
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
          .update({ status })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        setAttendance((current) =>
          current.map((item) =>
            item.id === existing.id ? data : item
          )
        );
      } else {
        const { data, error } = await supabase
          .from("attendance")
          .insert({
            student_id: studentId,
            attendance_date: selectedDate,
            status,
          })
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        setAttendance((current) => [
          data,
          ...current,
        ]);
      }

      setMessage(
        "Attendance saved successfully."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save attendance."
      );
    } finally {
      setSaving(false);
    }
  }

  async function markAll(
    status: "present" | "absent"
  ) {
    if (students.length === 0) {
      setMessage("No students found.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const rows = students.map((student) => ({
        student_id: student.id,
        attendance_date: selectedDate,
        status,
      }));

      const { data, error } = await supabase
        .from("attendance")
        .upsert(rows, {
          onConflict:
            "student_id,attendance_date",
        })
        .select();

      if (error) {
        throw new Error(error.message);
      }

      await loadData();

      setMessage(
        status === "present"
          ? "All students marked Present."
          : "All students marked Absent."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to mark all students."
      );
    } finally {
      setSaving(false);
    }
  }

  function getStudentStats(studentId: number) {
    const records = attendance.filter(
      (record) =>
        record.student_id === studentId
    );

    const present = records.filter(
      (record) =>
        record.status?.toLowerCase() ===
        "present"
    ).length;

    const absent = records.filter(
      (record) =>
        record.status?.toLowerCase() ===
        "absent"
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
      (record) =>
        record.status?.toLowerCase() ===
        "present"
    ).length;

  const absentToday =
    selectedDateRecords.filter(
      (record) =>
        record.status?.toLowerCase() ===
        "absent"
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
          record.attendance_date.startsWith(
            month
          )
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
            📚
          </div>

          <h2 style={styles.loadingTitle}>
            Loading Attendance
          </h2>

          <p style={styles.loadingText}>
            Student records are loading...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* TOP HEADER */}

        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.badge}>
              TEACHER CONTROL CENTER
            </div>

            <h1 style={styles.title}>
              📋 Attendance Management
            </h1>

            <p style={styles.subtitle}>
              Manage all students, daily attendance
              and complete attendance history.
            </p>
          </div>

          <button
            type="button"
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
                .includes("success")
                ? styles.success
                : styles.error
            }
          >
            <strong>
              {message
                .toLowerCase()
                .includes("success")
                ? "✓ "
                : "⚠ "}
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
            icon="✓"
            title="Present Today"
            value={String(presentToday)}
            background="linear-gradient(135deg,#16a34a,#166534)"
          />

          <Stat
            icon="✕"
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
              onChange={(event) =>
                setSelectedDate(
                  event.target.value
                )
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
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search by student name or username"
              style={styles.input}
            />
          </div>
        </section>

        {/* QUICK ACTIONS */}

        <section style={styles.quickCard}>
          <div>
            <h2 style={styles.quickTitle}>
              ⚡ Quick Attendance
            </h2>

            <p style={styles.quickText}>
              Quickly mark attendance for all
              {totalStudents} students.
            </p>
          </div>

          <div style={styles.quickButtons}>
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                markAll("present")
              }
              style={styles.allPresentButton}
            >
              ✓ Mark All Present
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() =>
                markAll("absent")
              }
              style={styles.allAbsentButton}
            >
              ✕ Mark All Absent
            </button>
          </div>
        </section>

        {/* STUDENT LIST */}

        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <div style={styles.sectionTag}>
                STUDENT REGISTER
              </div>

              <h2 style={styles.sectionTitle}>
                👨‍🎓 Students Attendance
              </h2>

              <p style={styles.sectionSubtitle}>
                Mark attendance for{" "}
                <strong>
                  {formatDate(selectedDate)}
                </strong>
              </p>
            </div>

            <div style={styles.countBadge}>
              {filteredStudents.length} /{" "}
              {totalStudents} Students
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
                Try another student name or
                username.
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

                  const displayName =
                    student.student_name?.trim() ||
                    "Student";

                  const isPresent =
                    status === "present";

                  const isAbsent =
                    status === "absent";

                  return (
                    <div
                      key={student.id}
                      style={{
                        ...styles.studentRow,
                        borderLeft: isPresent
                          ? "5px solid #16a34a"
                          : isAbsent
                          ? "5px solid #dc2626"
                          : "5px solid #2563eb",
                      }}
                    >
                      {/* NUMBER */}

                      <div style={styles.number}>
                        {String(
                          index + 1
                        ).padStart(2, "0")}
                      </div>

                      {/* AVATAR */}

                      <div style={styles.avatar}>
                        {displayName
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      {/* STUDENT DETAILS */}

                      <div style={styles.studentInfo}>
                        <h3 style={styles.studentName}>
                          {displayName}
                        </h3>

                        <div style={styles.usernameBox}>
                          <span
                            style={
                              styles.usernameLabel
                            }
                          >
                            USERNAME
                          </span>

                          <span
                            style={
                              styles.username
                            }
                          >
                            {student.student_username}
                          </span>
                        </div>

                        <div style={styles.miniStats}>
                          <span
                            style={
                              styles.classStat
                            }
                          >
                            📚{" "}
                            {stats.total} Classes
                          </span>

                          <span
                            style={
                              styles.presentStat
                            }
                          >
                            ✓{" "}
                            {stats.present} Present
                          </span>

                          <span
                            style={
                              styles.absentStat
                            }
                          >
                            ✕{" "}
                            {stats.absent} Absent
                          </span>

                          <span
                            style={
                              styles.percentStat
                            }
                          >
                            📊{" "}
                            {stats.percentage}%
                          </span>
                        </div>
                      </div>

                      {/* ATTENDANCE */}

                      <div
                        style={
                          styles.attendanceActions
                        }
                      >
                        <div
                          style={
                            styles.currentStatus
                          }
                        >
                          {isPresent ? (
                            <span
                              style={
                                styles.presentBadge
                              }
                            >
                              ✓ PRESENT
                            </span>
                          ) : isAbsent ? (
                            <span
                              style={
                                styles.absentBadge
                              }
                            >
                              ✕ ABSENT
                            </span>
                          ) : (
                            <span
                              style={
                                styles.pendingBadge
                              }
                            >
                              ⏳ NOT MARKED
                            </span>
                          )}
                        </div>

                        <div
                          style={styles.buttons}
                        >
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              markAttendance(
                                student.id,
                                "present"
                              )
                            }
                            style={{
                              ...styles.presentButton,
                              ...(isPresent
                                ? styles.presentButtonActive
                                : {}),
                              opacity: saving
                                ? 0.6
                                : 1,
                            }}
                          >
                            ✓ Present
                          </button>

                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              markAttendance(
                                student.id,
                                "absent"
                              )
                            }
                            style={{
                              ...styles.absentButton,
                              ...(isAbsent
                                ? styles.absentButtonActive
                                : {}),
                              opacity: saving
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
              <div style={styles.sectionTag}>
                RECORDS
              </div>

              <h2 style={styles.sectionTitle}>
                📜 Attendance History
              </h2>

              <p style={styles.sectionSubtitle}>
                Complete date-wise attendance
                records.
              </p>
            </div>

            <input
              type="month"
              value={month}
              onChange={(event) =>
                setMonth(event.target.value)
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
                      DATE
                    </th>

                    <th style={styles.th}>
                      STUDENT
                    </th>

                    <th style={styles.th}>
                      USERNAME
                    </th>

                    <th style={styles.th}>
                      STATUS
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
                        record.status
                          ?.toLowerCase() ===
                        "present";

                      return (
                        <tr
                          key={record.id}
                          style={
                            styles.tableRow
                          }
                        >
                          <td style={styles.td}>
                            {index + 1}
                          </td>

                          <td style={styles.dateTd}>
                            {formatDate(
                              record.attendance_date
                            )}
                          </td>

                          <td
                            style={
                              styles.historyStudent
                            }
                          >
                            {student?.student_name ||
                              "Unknown Student"}
                          </td>

                          <td
                            style={
                              styles.historyUsername
                            }
                          >
                            {student?.student_username ||
                              "-"}
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

const styles: {
  [key: string]: React.CSSProperties;
} = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#eaf2ff 0%,#f8fafc 48%,#eef2ff 100%)",
    padding: "24px 14px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#0f172a",
  },

  container: {
    width: "100%",
    maxWidth: "1240px",
    margin: "0 auto",
  },

  header: {
    background:
      "linear-gradient(135deg,#ffffff,#f8fbff)",
    border:
      "1px solid #dbeafe",
    borderRadius: "24px",
    padding: "30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    boxShadow:
      "0 15px 40px rgba(15,23,42,0.10)",
    marginBottom: "20px",
  },

  headerLeft: {
    minWidth: 0,
  },

  badge: {
    display: "inline-block",
    background: "#dbeafe",
    color: "#1e40af",
    padding: "7px 12px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "0.8px",
    marginBottom: "10px",
  },

  title: {
    margin: 0,
    color: "#020617",
    fontSize: "34px",
    lineHeight: "1.2",
    fontWeight: "900",
  },

  subtitle: {
    margin: "9px 0 0",
    color: "#475569",
    fontSize: "14px",
    fontWeight: "600",
  },

  refreshButton: {
    border: "none",
    background:
      "linear-gradient(135deg,#2563eb,#1d4ed8)",
    color: "#ffffff",
    padding: "13px 20px",
    borderRadius: "12px",
    fontWeight: "900",
    cursor: "pointer",
    boxShadow:
      "0 7px 18px rgba(37,99,235,0.25)",
    whiteSpace: "nowrap",
  },

  success: {
    background: "#dcfce7",
    color: "#14532d",
    border:
      "1px solid #86efac",
    padding: "15px 18px",
    borderRadius: "13px",
    marginBottom: "20px",
    fontWeight: "800",
  },

  error: {
    background: "#fee2e2",
    color: "#7f1d1d",
    border:
      "1px solid #fca5a5",
    padding: "15px 18px",
    borderRadius: "13px",
    marginBottom: "20px",
    fontWeight: "800",
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
    padding: "25px",
    borderRadius: "21px",
    boxShadow:
      "0 12px 28px rgba(15,23,42,0.14)",
  },

  statIcon: {
    fontSize: "31px",
    fontWeight: "900",
  },

  statTitle: {
    marginTop: "12px",
    marginBottom: "5px",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "700",
  },

  statValue: {
    color: "#ffffff",
    fontSize: "36px",
    lineHeight: "1",
    fontWeight: "900",
  },

  controlCard: {
    background: "#ffffff",
    padding: "22px",
    borderRadius: "19px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(250px,1fr))",
    gap: "18px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
    marginBottom: "18px",
    border:
      "1px solid #e2e8f0",
  },

  controlBox: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
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
    border:
      "2px solid #cbd5e1",
    borderRadius: "11px",
    fontSize: "15px",
    color: "#020617",
    background: "#ffffff",
    outline: "none",
    fontWeight: "600",
  },

  quickCard: {
    background:
      "linear-gradient(135deg,#172554,#1e3a8a)",
    borderRadius: "20px",
    padding: "22px 24px",
    marginBottom: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
    boxShadow:
      "0 12px 30px rgba(30,64,175,0.20)",
  },

  quickTitle: {
    margin: 0,
    color: "#ffffff",
    fontSize: "20px",
    fontWeight: "900",
  },

  quickText: {
    margin: "6px 0 0",
    color: "#dbeafe",
    fontSize: "13px",
    fontWeight: "500",
  },

  quickButtons: {
    display: "flex",
    gap: "9px",
    flexWrap: "wrap",
  },

  allPresentButton: {
    border: "none",
    background: "#22c55e",
    color: "#ffffff",
    padding: "11px 15px",
    borderRadius: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  allAbsentButton: {
    border: "none",
    background: "#ef4444",
    color: "#ffffff",
    padding: "11px 15px",
    borderRadius: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  card: {
    background: "#ffffff",
    borderRadius: "22px",
    padding: "25px",
    boxShadow:
      "0 9px 28px rgba(15,23,42,0.08)",
    marginBottom: "20px",
    border:
      "1px solid #e2e8f0",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },

  sectionTag: {
    color: "#2563eb",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "1px",
    marginBottom: "5px",
  },

  sectionTitle: {
    margin: 0,
    color: "#020617",
    fontSize: "23px",
    fontWeight: "900",
  },

  sectionSubtitle: {
    margin: "6px 0 0",
    color: "#475569",
    fontSize: "14px",
    fontWeight: "600",
  },

  countBadge: {
    background: "#dbeafe",
    color: "#1e40af",
    padding: "10px 15px",
    borderRadius: "999px",
    fontWeight: "900",
    fontSize: "13px",
    border:
      "1px solid #bfdbfe",
  },

  studentList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  studentRow: {
    borderTop:
      "1px solid #e2e8f0",
    borderRight:
      "1px solid #e2e8f0",
    borderBottom:
      "1px solid #e2e8f0",
    borderRadius: "15px",
    padding: "17px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    background: "#ffffff",
    boxShadow:
      "0 4px 13px rgba(15,23,42,0.05)",
    minWidth: 0,
  },

  number: {
    width: "32px",
    textAlign: "center",
    color: "#1e293b",
    fontWeight: "900",
    fontSize: "14px",
    flexShrink: 0,
  },

  avatar: {
    width: "54px",
    height: "54px",
    borderRadius: "50%",
    background:
      "linear-gradient(135deg,#2563eb,#4338ca)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "21px",
    fontWeight: "900",
    flexShrink: 0,
    boxShadow:
      "0 5px 13px rgba(37,99,235,0.25)",
  },

  studentInfo: {
    flex: 1,
    minWidth: "220px",
  },

  studentName: {
    margin: 0,
    color: "#000000",
    fontSize: "19px",
    fontWeight: "900",
    lineHeight: "1.25",
    letterSpacing: "0.2px",
  },

  usernameBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "6px",
    flexWrap: "wrap",
  },

  usernameLabel: {
    color: "#64748b",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "0.8px",
  },

  username: {
    color: "#334155",
    fontSize: "13px",
    fontWeight: "800",
  },

  miniStats: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "9px",
  },

  classStat: {
    color: "#334155",
    background: "#f1f5f9",
    padding: "5px 8px",
    borderRadius: "7px",
    fontSize: "10px",
    fontWeight: "800",
  },

  presentStat: {
    color: "#166534",
    background: "#dcfce7",
    padding: "5px 8px",
    borderRadius: "7px",
    fontSize: "10px",
    fontWeight: "900",
  },

  absentStat: {
    color: "#991b1b",
    background: "#fee2e2",
    padding: "5px 8px",
    borderRadius: "7px",
    fontSize: "10px",
    fontWeight: "900",
  },

  percentStat: {
    color: "#1e40af",
    background: "#dbeafe",
    padding: "5px 8px",
    borderRadius: "7px",
    fontSize: "10px",
    fontWeight: "900",
  },

  attendanceActions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "9px",
    flexShrink: 0,
  },

  currentStatus: {
    minHeight: "25px",
  },

  buttons: {
    display: "flex",
    gap: "8px",
  },

  presentButton: {
    border:
      "2px solid #16a34a",
    background: "#ffffff",
    color: "#15803d",
    padding: "10px 14px",
    borderRadius: "9px",
    fontWeight: "900",
    cursor: "pointer",
  },

  presentButtonActive: {
    background: "#16a34a",
    color: "#ffffff",
    boxShadow:
      "0 4px 12px rgba(22,163,74,0.25)",
  },

  absentButton: {
    border:
      "2px solid #dc2626",
    background: "#ffffff",
    color: "#b91c1c",
    padding: "10px 14px",
    borderRadius: "9px",
    fontWeight: "900",
    cursor: "pointer",
  },

  absentButtonActive: {
    background: "#dc2626",
    color: "#ffffff",
    boxShadow:
      "0 4px 12px rgba(220,38,38,0.25)",
  },

  presentBadge: {
    display: "inline-block",
    background: "#dcfce7",
    color: "#166534",
    border:
      "1px solid #86efac",
    padding: "6px 10px",
    borderRadius: "999px",
    fontWeight: "900",
    fontSize: "11px",
  },

  absentBadge: {
    display: "inline-block",
    background: "#fee2e2",
    color: "#991b1b",
    border:
      "1px solid #fca5a5",
    padding: "6px 10px",
    borderRadius: "999px",
    fontWeight: "900",
    fontSize: "11px",
  },

  pendingBadge: {
    display: "inline-block",
    background: "#fef3c7",
    color: "#92400e",
    border:
      "1px solid #fcd34d",
    padding: "6px 10px",
    borderRadius: "999px",
    fontWeight: "900",
    fontSize: "11px",
  },

  monthInput: {
    padding: "11px",
    border:
      "2px solid #cbd5e1",
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
  },

  tableRow: {
    background: "#ffffff",
  },

  th: {
    padding: "14px",
    textAlign: "left",
    background: "#eff6ff",
    color: "#1e3a8a",
    borderBottom:
      "2px solid #bfdbfe",
    fontSize: "12px",
    fontWeight: "900",
    letterSpacing: "0.3px",
  },

  td: {
    padding: "14px",
    borderBottom:
      "1px solid #e2e8f0",
    color: "#334155",
    fontSize: "13px",
    fontWeight: "600",
  },

  dateTd: {
    padding: "14px",
    borderBottom:
      "1px solid #e2e8f0",
    color: "#1e293b",
    fontSize: "13px",
    fontWeight: "800",
  },

  historyStudent: {
    padding: "14px",
    borderBottom:
      "1px solid #e2e8f0",
    color: "#000000",
    fontSize: "14px",
    fontWeight: "900",
  },

  historyUsername: {
    padding: "14px",
    borderBottom:
      "1px solid #e2e8f0",
    color: "#334155",
    fontSize: "13px",
    fontWeight: "800",
  },

  empty: {
    textAlign: "center",
    padding: "50px 20px",
    color: "#475569",
    background: "#f8fafc",
    borderRadius: "15px",
    border:
      "1px dashed #cbd5e1",
  },

  emptyIcon: {
    fontSize: "48px",
    marginBottom: "10px",
  },

  emptyTitle: {
    margin: "5px 0",
    color: "#0f172a",
    fontWeight: "900",
  },

  emptyText: {
    margin: 0,
    color: "#64748b",
    fontWeight: "600",
  },

  loadingCard: {
    maxWidth: "450px",
    margin: "100px auto",
    background: "#ffffff",
    padding: "40px",
    borderRadius: "20px",
    textAlign: "center",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.10)",
  },

  loadingIcon: {
    fontSize: "42px",
    marginBottom: "15px",
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
    color: "#475569",
    padding: "25px",
    fontSize: "13px",
    fontWeight: "600",
  },
};