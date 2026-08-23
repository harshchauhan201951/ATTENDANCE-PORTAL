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
      // STUDENTS
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id, student_name, student_username")
        .order("id", { ascending: true });

      console.log("STUDENTS:", studentData);
      console.log("STUDENT ERROR:", studentError);

      if (studentError) {
        throw new Error(
          "Students load error: " + studentError.message
        );
      }

      // ATTENDANCE
      const { data: attendanceData, error: attendanceError } =
        await supabase
          .from("attendance")
          .select(
            "id, student_id, attendance_date, status"
          )
          .order("attendance_date", {
            ascending: false,
          });

      console.log("ATTENDANCE:", attendanceData);
      console.log("ATTENDANCE ERROR:", attendanceError);

      if (attendanceError) {
        throw new Error(
          "Attendance load error: " +
            attendanceError.message
        );
      }

      setStudents(studentData || []);
      setAttendance(attendanceData || []);

      if (!studentData || studentData.length === 0) {
        setMessage(
          "⚠️ Students table se 0 students mil rahe hain."
        );
      } else {
        setMessage(
          `✅ ${studentData.length} students successfully loaded.`
        );
      }
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load data."
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
        student.student_username?.toLowerCase() || "";

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
        "✅ Attendance saved successfully."
      );
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save attendance."
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
            ⏳
          </div>

          <h2>Loading Attendance...</h2>

          <p>
            Loading students from Supabase...
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
          <div>
            <div style={styles.badge}>
              TEACHER CONTROL CENTER
            </div>

            <h1 style={styles.title}>
              📋 Attendance Management
            </h1>

            <p style={styles.subtitle}>
              Manage students and daily attendance.
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
              message.includes("successfully") ||
              message.includes("success")
                ? styles.success
                : styles.error
            }
          >
            {message}
          </div>
        )}

        {/* STATS */}

        <section style={styles.statsGrid}>
          <Stat
            icon="👨‍🎓"
            title="Total Students"
            value={String(totalStudents)}
            background="linear-gradient(135deg,#2563eb,#1d4ed8)"
          />

          <Stat
            icon="✅"
            title="Present Today"
            value={String(presentToday)}
            background="linear-gradient(135deg,#16a34a,#15803d)"
          />

          <Stat
            icon="❌"
            title="Absent Today"
            value={String(absentToday)}
            background="linear-gradient(135deg,#dc2626,#b91c1c)"
          />

          <Stat
            icon="⏳"
            title="Pending"
            value={String(pendingToday)}
            background="linear-gradient(135deg,#f59e0b,#d97706)"
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
                setSelectedDate(
                  e.target.value
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
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search name or username..."
              style={styles.input}
            />
          </div>
        </section>

        {/* STUDENTS */}

        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                👨‍🎓 Students Attendance
              </h2>

              <p style={styles.sectionSubtitle}>
                Mark attendance for{" "}
                {formatDate(selectedDate)}
              </p>
            </div>

            <div style={styles.countBadge}>
              Showing{" "}
              {filteredStudents.length} /{" "}
              {students.length}
            </div>
          </div>

          {students.length === 0 ? (
            <div style={styles.noStudents}>
              <div style={styles.noStudentsIcon}>
                ⚠️
              </div>

              <h2>
                No Students Loaded
              </h2>

              <p>
                Supabase se students table
                mein koi record nahi aa raha.
              </p>

              <p>
                Refresh button dabakar dobara
                check karo.
              </p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div style={styles.empty}>
              🔍 No student found for "{search}"
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

                  return (
                    <div
                      key={student.id}
                      style={styles.studentRow}
                    >
                      <div style={styles.number}>
                        {index + 1}
                      </div>

                      <div style={styles.avatar}>
                        {(
                          student.student_name ||
                          student.student_username
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>

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
                          {
                            student.student_username
                          }
                        </p>

                        <div
                          style={
                            styles.miniStats
                          }
                        >
                          <span>
                            📚 {stats.total}
                          </span>

                          <span>
                            ✅ {stats.present}
                          </span>

                          <span>
                            ❌ {stats.absent}
                          </span>

                          <span>
                            📊 {stats.percentage}%
                          </span>
                        </div>
                      </div>

                      <div
                        style={
                          styles.attendanceActions
                        }
                      >
                        {status && (
                          <span
                            style={
                              status ===
                              "present"
                                ? styles.presentBadge
                                : styles.absentBadge
                            }
                          >
                            {status ===
                            "present"
                              ? "✓ Present"
                              : "✗ Absent"}
                          </span>
                        )}

                        <div
                          style={
                            styles.buttons
                          }
                        >
                          <button
                            disabled={saving}
                            onClick={() =>
                              markAttendance(
                                student.id,
                                "present"
                              )
                            }
                            style={
                              styles.presentButton
                            }
                          >
                            ✓ Present
                          </button>

                          <button
                            disabled={saving}
                            onClick={() =>
                              markAttendance(
                                student.id,
                                "absent"
                              )
                            }
                            style={
                              styles.absentButton
                            }
                          >
                            ✗ Absent
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
                Complete attendance history.
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
              📅 No attendance history.
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
                        record.status
                          ?.toLowerCase() ===
                        "present";

                      return (
                        <tr
                          key={record.id}
                        >
                          <td
                            style={styles.td}
                          >
                            {index + 1}
                          </td>

                          <td
                            style={styles.td}
                          >
                            {formatDate(
                              record.attendance_date
                            )}
                          </td>

                          <td
                            style={styles.td}
                          >
                            <strong>
                              {student?.student_name ||
                                "Unknown Student"}
                            </strong>
                          </td>

                          <td
                            style={styles.td}
                          >
                            {student?.student_username ||
                              "-"}
                          </td>

                          <td
                            style={styles.td}
                          >
                            <span
                              style={
                                isPresent
                                  ? styles.presentBadge
                                  : styles.absentBadge
                              }
                            >
                              {isPresent
                                ? "✓ Present"
                                : "✗ Absent"}
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
          Attendance Portal • Teacher Management
          Center • 2026
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

      <p style={styles.statTitle}>
        {title}
      </p>

      <h2 style={styles.statValue}>
        {value}
      </h2>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return "-";

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
      "linear-gradient(135deg,#eff6ff,#f8fafc,#eef2ff)",
    padding: "25px 15px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
  },

  header: {
    background: "white",
    borderRadius: "22px",
    padding: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    boxShadow:
      "0 12px 35px rgba(15,23,42,0.09)",
    marginBottom: "20px",
  },

  badge: {
    display: "inline-block",
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "800",
    marginBottom: "10px",
  },

  title: {
    margin: 0,
    color: "#172554",
    fontSize: "32px",
    fontWeight: "800",
  },

  subtitle: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  refreshButton: {
    border: "none",
    background: "#1d4ed8",
    color: "white",
    padding: "13px 20px",
    borderRadius: "12px",
    fontWeight: "800",
    cursor: "pointer",
  },

  success: {
    background: "#dcfce7",
    color: "#166534",
    padding: "14px 18px",
    borderRadius: "12px",
    marginBottom: "20px",
    fontWeight: "700",
  },

  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "14px 18px",
    borderRadius: "12px",
    marginBottom: "20px",
    fontWeight: "700",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(210px,1fr))",
    gap: "18px",
    marginBottom: "20px",
  },

  stat: {
    color: "white",
    padding: "24px",
    borderRadius: "20px",
    boxShadow:
      "0 12px 25px rgba(15,23,42,0.12)",
  },

  statIcon: {
    fontSize: "30px",
  },

  statTitle: {
    margin: "12px 0 5px",
    opacity: 0.9,
    fontSize: "14px",
  },

  statValue: {
    margin: 0,
    fontSize: "34px",
    fontWeight: "800",
  },

  controlCard: {
    background: "white",
    padding: "22px",
    borderRadius: "18px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(250px,1fr))",
    gap: "18px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
    marginBottom: "20px",
  },

  controlBox: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  label: {
    color: "#334155",
    fontWeight: "700",
    fontSize: "14px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    border:
      "1px solid #cbd5e1",
    borderRadius: "10px",
    fontSize: "15px",
    color: "#0f172a",
    background: "white",
  },

  card: {
    background: "white",
    borderRadius: "20px",
    padding: "24px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
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
    color: "#172554",
    fontSize: "22px",
  },

  sectionSubtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  countBadge: {
    background: "#eff6ff",
    color: "#1d4ed8",
    padding: "9px 13px",
    borderRadius: "999px",
    fontWeight: "800",
    fontSize: "13px",
  },

  studentList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  studentRow: {
    border:
      "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "15px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    background: "#f8fafc",
  },

  number: {
    width: "30px",
    textAlign: "center",
    color: "#64748b",
    fontWeight: "800",
  },

  avatar: {
    width: "52px",
    height: "52px",
    borderRadius: "50%",
    background:
      "linear-gradient(135deg,#2563eb,#4f46e5)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "21px",
    fontWeight: "800",
    flexShrink: 0,
  },

  studentInfo: {
    flex: 1,
    minWidth: 0,
  },

  studentName: {
    margin: 0,
    color: "#172554",
    fontSize: "17px",
  },

  username: {
    margin: "4px 0",
    color: "#64748b",
    fontSize: "13px",
  },

  miniStats: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    color: "#475569",
    fontSize: "11px",
    marginTop: "7px",
  },

  attendanceActions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "8px",
  },

  buttons: {
    display: "flex",
    gap: "7px",
  },

  presentButton: {
    border: "none",
    background: "#16a34a",
    color: "white",
    padding: "9px 12px",
    borderRadius: "9px",
    fontWeight: "700",
    cursor: "pointer",
  },

  absentButton: {
    border: "none",
    background: "#dc2626",
    color: "white",
    padding: "9px 12px",
    borderRadius: "9px",
    fontWeight: "700",
    cursor: "pointer",
  },

  presentBadge: {
    display: "inline-block",
    background: "#dcfce7",
    color: "#166534",
    padding: "6px 10px",
    borderRadius: "999px",
    fontWeight: "800",
    fontSize: "12px",
  },

  absentBadge: {
    display: "inline-block",
    background: "#fee2e2",
    color: "#991b1b",
    padding: "6px 10px",
    borderRadius: "999px",
    fontWeight: "800",
    fontSize: "12px",
  },

  monthInput: {
    padding: "11px",
    border:
      "1px solid #cbd5e1",
    borderRadius: "10px",
    color: "#0f172a",
    background: "white",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "700px",
  },

  th: {
    padding: "13px",
    textAlign: "left",
    background: "#eff6ff",
    color: "#1e3a8a",
    borderBottom:
      "2px solid #dbeafe",
    fontSize: "13px",
  },

  td: {
    padding: "13px",
    borderBottom:
      "1px solid #e2e8f0",
    color: "#334155",
    fontSize: "13px",
  },

  empty: {
    textAlign: "center",
    padding: "45px 20px",
    color: "#64748b",
  },

  noStudents: {
    textAlign: "center",
    padding: "45px 20px",
    background: "#fff7ed",
    borderRadius: "15px",
    color: "#9a3412",
  },

  noStudentsIcon: {
    fontSize: "48px",
  },

  loadingCard: {
    maxWidth: "450px",
    margin: "100px auto",
    background: "white",
    padding: "40px",
    borderRadius: "20px",
    textAlign: "center",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.1)",
  },

  loadingIcon: {
    fontSize: "40px",
    marginBottom: "15px",
  },

  footer: {
    textAlign: "center",
    color: "#64748b",
    padding: "25px",
    fontSize: "13px",
  },
};