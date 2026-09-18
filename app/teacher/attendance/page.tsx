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
  student_name: string | null;
  student_username: string;
};

type AttendanceRecord = {
  id: number;
  student_id: number;
  attendance_date: string;
  status: string;
};

type AttendanceTab =
  | "today"
  | "date-wise"
  | "extra-class"
  | "reporting"
  | "month-wise";

export default function TeacherAttendancePage() {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");

  const [activeTab, setActiveTab] =
    useState<AttendanceTab>("today");

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
          .order("attendance_date", {
            ascending: false,
          });

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
    status: "Present" | "Absent"
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
          .update({
            status,
          })
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
        `Attendance marked ${status} successfully.`
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
    status: "Present" | "Absent"
  ) {
    if (students.length === 0) {
      setMessage("No students found.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to mark ALL ${
        students.length
      } students as ${status} for ${formatDate(
        selectedDate
      )}?`
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const existingRecords = attendance.filter(
        (record) =>
          record.attendance_date === selectedDate
      );

      const existingByStudent = new Map(
        existingRecords.map((record) => [
          record.student_id,
          record,
        ])
      );

      const studentsToUpdate = students.filter(
        (student) =>
          existingByStudent.has(student.id)
      );

      const studentsToInsert = students.filter(
        (student) =>
          !existingByStudent.has(student.id)
      );

      const updatedRecords: AttendanceRecord[] =
        [];

      const insertedRecords: AttendanceRecord[] =
        [];

      for (const student of studentsToUpdate) {
        const existing =
          existingByStudent.get(student.id);

        if (!existing) continue;

        const { data, error } = await supabase
          .from("attendance")
          .update({
            status,
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) {
          throw new Error(
            `Failed for ${
              student.student_name ||
              student.student_username
            }: ${error.message}`
          );
        }

        updatedRecords.push(data);
      }

      if (studentsToInsert.length > 0) {
        const rows = studentsToInsert.map(
          (student) => ({
            student_id: student.id,
            attendance_date: selectedDate,
            status,
          })
        );

        const { data, error } = await supabase
          .from("attendance")
          .insert(rows)
          .select();

        if (error) {
          throw new Error(error.message);
        }

        insertedRecords.push(
          ...(data || [])
        );
      }

      const newRecords = [
        ...updatedRecords,
        ...insertedRecords,
      ];

      setAttendance((current) => {
        const ids = new Set(
          newRecords.map(
            (record) => record.id
          )
        );

        const withoutOld = current.filter(
          (record) => !ids.has(record.id)
        );

        return [
          ...newRecords,
          ...withoutOld,
        ];
      });

      setMessage(
        `All ${students.length} students marked ${status} successfully.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to mark all attendance."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteAttendance() {
    const dateRecords = attendance.filter(
      (record) =>
        record.attendance_date === selectedDate
    );

    if (dateRecords.length === 0) {
      setMessage(
        `No attendance found for ${formatDate(
          selectedDate
        )}.`
      );
      return;
    }

    const confirmed = window.confirm(
      `DELETE ALL attendance for ${formatDate(
        selectedDate
      )}?\n\n${
        dateRecords.length
      } attendance records will be permanently deleted.`
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("attendance")
        .delete()
        .eq("attendance_date", selectedDate);

      if (error) {
        throw new Error(error.message);
      }

      setAttendance((current) =>
        current.filter(
          (record) =>
            record.attendance_date !==
            selectedDate
        )
      );

      setMessage(
        `All attendance for ${formatDate(
          selectedDate
        )} deleted successfully.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete attendance."
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

  const overallPresent = attendance.filter(
    (record) =>
      record.status?.toLowerCase() ===
      "present"
  ).length;

  const overallAbsent = attendance.filter(
    (record) =>
      record.status?.toLowerCase() ===
      "absent"
  ).length;

  const overallTotal =
    overallPresent + overallAbsent;

  const overallPercentage =
    overallTotal > 0
      ? Math.round(
          (overallPresent / overallTotal) * 100
        )
      : 0;

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

  const monthSummary = useMemo(() => {
    if (!month) {
      return {
        present: 0,
        absent: 0,
        total: 0,
        percentage: 0,
        days: 0,
      };
    }

    const monthRecords = attendance.filter(
      (record) =>
        record.attendance_date.startsWith(
          month
        )
    );

    const present = monthRecords.filter(
      (record) =>
        record.status?.toLowerCase() ===
        "present"
    ).length;

    const absent = monthRecords.filter(
      (record) =>
        record.status?.toLowerCase() ===
        "absent"
    ).length;

    const total = present + absent;

    const uniqueDays = new Set(
      monthRecords.map(
        (record) => record.attendance_date
      )
    ).size;

    return {
      present,
      absent,
      total,
      percentage:
        total > 0
          ? Math.round((present / total) * 100)
          : 0,
      days: uniqueDays,
    };
  }, [attendance, month]);

  const studentMonthlyStats = useMemo(() => {
    if (!month) {
      return [];
    }

    return students.map((student) => {
      const records = attendance.filter(
        (record) =>
          record.student_id === student.id &&
          record.attendance_date.startsWith(
            month
          )
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

      const total = present + absent;

      return {
        student,
        present,
        absent,
        total,
        percentage:
          total > 0
            ? Math.round(
                (present / total) * 100
              )
            : 0,
      };
    });
  }, [students, attendance, month]);

  function openTab(tab: AttendanceTab) {
    setActiveTab(tab);

    if (tab === "extra-class") {
      router.push("/teacher/extra-class");
    }
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingLogo}>
            RA
          </div>

          <h2 style={styles.loadingTitle}>
            Loading Attendance
          </h2>

          <p style={styles.loadingText}>
            Please wait while student attendance
            records are loaded.
          </p>

          <div style={styles.loadingBar}>
            <div
              style={styles.loadingBarInner}
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        {/* HEADER */}

        <header style={styles.header}>
          <div style={styles.brandArea}>
            <div style={styles.logo}>
              RA
            </div>

            <div>
              <div style={styles.brandName}>
                RACER ACADEMY
              </div>

              <div style={styles.brandSub}>
                TEACHER CONTROL CENTER
              </div>
            </div>
          </div>

          <div style={styles.headerActions}>
            <button
              onClick={loadData}
              disabled={saving}
              style={{
                ...styles.refreshButton,
                opacity: saving ? 0.6 : 1,
              }}
            >
              Refresh
            </button>
          </div>
        </header>

        {/* PAGE TITLE */}

        <section style={styles.hero}>
          <div style={styles.heroText}>
            <div style={styles.heroBadge}>
              ATTENDANCE CENTER
            </div>

            <h1 style={styles.title}>
              Attendance Management
            </h1>

            <p style={styles.subtitle}>
              Manage daily attendance, review
              records, reporting and monthly
              attendance from one place.
            </p>
          </div>

          <div style={styles.heroDate}>
            <div style={styles.heroDateLabel}>
              SELECTED DATE
            </div>

            <div style={styles.heroDateValue}>
              {formatDate(selectedDate)}
            </div>
          </div>
        </section>

        {/* ATTENDANCE NAVIGATION */}

        <section style={styles.navigationCard}>
          <div style={styles.navigationTitle}>
            Attendance Sections
          </div>

          <div style={styles.tabs}>
            <AttendanceTabButton
              active={activeTab === "today"}
              number="1"
              title="Today's Attendance"
              subtitle="Mark attendance"
              onClick={() =>
                openTab("today")
              }
            />

            <AttendanceTabButton
              active={
                activeTab === "date-wise"
              }
              number="2"
              title="Date Wise / Period Wise"
              subtitle="View records"
              onClick={() =>
                openTab("date-wise")
              }
            />

            <AttendanceTabButton
              active={
                activeTab === "extra-class"
              }
              number="3"
              title="Extra Class"
              subtitle="Extra class attendance"
              onClick={() =>
                openTab("extra-class")
              }
            />

            <AttendanceTabButton
              active={
                activeTab === "reporting"
              }
              number="4"
              title="Reporting"
              subtitle="Attendance reports"
              onClick={() =>
                openTab("reporting")
              }
            />

            <AttendanceTabButton
              active={
                activeTab === "month-wise"
              }
              number="5"
              title="Month Wise Attendance"
              subtitle="Monthly summary"
              onClick={() =>
                openTab("month-wise")
              }
            />
          </div>
        </section>

        {/* MESSAGE */}

        {message && (
          <div
            style={
              message.includes(
                "successfully"
              )
                ? styles.success
                : styles.error
            }
          >
            <strong>
              {message.includes(
                "successfully"
              )
                ? "SUCCESS  "
                : "ERROR  "}
            </strong>

            {message}
          </div>
        )}

        {/* TODAY'S ATTENDANCE */}

        {activeTab === "today" && (
          <>
            <section style={styles.statsGrid}>
              <Stat
                icon="ST"
                title="Total Students"
                value={String(
                  totalStudents
                )}
                background="linear-gradient(135deg,#1d4ed8,#1e3a8a)"
              />

              <Stat
                icon="P"
                title="Present"
                value={String(
                  presentToday
                )}
                background="linear-gradient(135deg,#16a34a,#166534)"
              />

              <Stat
                icon="A"
                title="Absent"
                value={String(
                  absentToday
                )}
                background="linear-gradient(135deg,#dc2626,#991b1b)"
              />

              <Stat
                icon="..."
                title="Pending"
                value={String(
                  pendingToday
                )}
                background="linear-gradient(135deg,#f59e0b,#b45309)"
              />
            </section>

            <section
              style={styles.controlCard}
            >
              <div style={styles.controlBox}>
                <label style={styles.label}>
                  Attendance Date
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
                  placeholder="Search name or username..."
                  style={styles.input}
                />
              </div>
            </section>

            <section
              style={styles.actionCard}
            >
              <div>
                <h2
                  style={styles.actionTitle}
                >
                  Quick Attendance Actions
                </h2>

                <p
                  style={
                    styles.actionSubtitle
                  }
                >
                  Apply an attendance status
                  to all students for{" "}
                  <strong>
                    {formatDate(
                      selectedDate
                    )}
                  </strong>
                  .
                </p>
              </div>

              <div
                style={styles.actionButtons}
              >
                <button
                  disabled={
                    saving ||
                    students.length ===
                      0
                  }
                  onClick={() =>
                    markAll("Present")
                  }
                  style={{
                    ...styles.bulkPresentButton,
                    opacity:
                      saving ||
                      students.length ===
                        0
                        ? 0.6
                        : 1,
                  }}
                >
                  Mark All Present
                </button>

                <button
                  disabled={
                    saving ||
                    students.length ===
                      0
                  }
                  onClick={() =>
                    markAll("Absent")
                  }
                  style={{
                    ...styles.bulkAbsentButton,
                    opacity:
                      saving ||
                      students.length ===
                        0
                        ? 0.6
                        : 1,
                  }}
                >
                  Mark All Absent
                </button>

                <button
                  disabled={
                    saving ||
                    selectedDateRecords.length ===
                      0
                  }
                  onClick={
                    deleteAttendance
                  }
                  style={{
                    ...styles.deleteButton,
                    opacity:
                      saving ||
                      selectedDateRecords.length ===
                        0
                        ? 0.6
                        : 1,
                  }}
                >
                  Delete Attendance
                </button>
              </div>
            </section>

            <section style={styles.card}>
              <div
                style={
                  styles.sectionHeader
                }
              >
                <div>
                  <div
                    style={styles.smallLabel}
                  >
                    DAILY ATTENDANCE
                  </div>

                  <h2
                    style={
                      styles.sectionTitle
                    }
                  >
                    Students Attendance
                  </h2>

                  <p
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    Mark attendance for{" "}
                    <strong
                      style={
                        styles.darkText
                      }
                    >
                      {formatDate(
                        selectedDate
                      )}
                    </strong>
                  </p>
                </div>

                <div
                  style={
                    styles.countBadge
                  }
                >
                  {filteredStudents.length}{" "}
                  Students
                </div>
              </div>

              {filteredStudents.length ===
              0 ? (
                <EmptyState
                  title="No Students Found"
                  text="No student matches your search."
                />
              ) : (
                <div
                  style={
                    styles.studentList
                  }
                >
                  {filteredStudents.map(
                    (
                      student,
                      index
                    ) => {
                      const status =
                        getStatus(
                          student.id
                        );

                      const stats =
                        getStudentStats(
                          student.id
                        );

                      return (
                        <div
                          key={
                            student.id
                          }
                          style={{
                            ...styles.studentRow,
                            border:
                              status ===
                              "present"
                                ? "2px solid #22c55e"
                                : status ===
                                  "absent"
                                ? "2px solid #ef4444"
                                : "2px solid #cbd5e1",
                            background:
                              status ===
                              "present"
                                ? "#f0fdf4"
                                : status ===
                                  "absent"
                                ? "#fef2f2"
                                : "#ffffff",
                          }}
                        >
                          <div
                            style={
                              styles.number
                            }
                          >
                            {index +
                              1}
                          </div>

                          <div
                            style={
                              styles.avatar
                            }
                          >
                            {(
                              student.student_name ||
                              student.student_username
                            )
                              .charAt(
                                0
                              )
                              .toUpperCase()}
                          </div>

                          <div
                            style={
                              styles.studentInfo
                            }
                          >
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
                                Classes:{" "}
                                {
                                  stats.total
                                }
                              </span>

                              <span
                                style={
                                  styles.presentText
                                }
                              >
                                Present:{" "}
                                {
                                  stats.present
                                }
                              </span>

                              <span
                                style={
                                  styles.absentText
                                }
                              >
                                Absent:{" "}
                                {
                                  stats.absent
                                }
                              </span>

                              <span
                                style={
                                  styles.percentText
                                }
                              >
                                Attendance:{" "}
                                {
                                  stats.percentage
                                }
                                %
                              </span>
                            </div>
                          </div>

                          <div
                            style={
                              styles.attendanceActions
                            }
                          >
                            {status && (
                              <div
                                style={
                                  status ===
                                  "present"
                                    ? styles.presentBadge
                                    : styles.absentBadge
                                }
                              >
                                {status ===
                                "present"
                                  ? "PRESENT"
                                  : "ABSENT"}
                              </div>
                            )}

                            <div
                              style={
                                styles.buttons
                              }
                            >
                              <button
                                disabled={
                                  saving
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
                                    status ===
                                    "present"
                                      ? "#15803d"
                                      : "#ffffff",
                                  color:
                                    status ===
                                    "present"
                                      ? "#ffffff"
                                      : "#15803d",
                                }}
                              >
                                Present
                              </button>

                              <button
                                disabled={
                                  saving
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
                                    status ===
                                    "absent"
                                      ? "#b91c1c"
                                      : "#ffffff",
                                  color:
                                    status ===
                                    "absent"
                                      ? "#ffffff"
                                      : "#b91c1c",
                                }}
                              >
                                Absent
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
          </>
        )}

        {/* DATE WISE / PERIOD WISE */}

        {activeTab === "date-wise" && (
          <>
            <section
              style={styles.featureHero}
            >
              <div>
                <div
                  style={
                    styles.smallLabel
                  }
                >
                  ATTENDANCE RECORDS
                </div>

                <h2
                  style={
                    styles.featureTitle
                  }
                >
                  Date Wise / Period Wise
                </h2>

                <p
                  style={
                    styles.featureText
                  }
                >
                  Review attendance records by
                  selecting a date or month.
                </p>
              </div>

              <div
                style={styles.featureIcon}
              >
                DW
              </div>
            </section>

            <section
              style={styles.controlCard}
            >
              <div style={styles.controlBox}>
                <label style={styles.label}>
                  Select Date
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
                  placeholder="Search student..."
                  style={styles.input}
                />
              </div>
            </section>

            <section style={styles.card}>
              <div
                style={
                  styles.sectionHeader
                }
              >
                <div>
                  <div
                    style={styles.smallLabel}
                  >
                    SELECTED DATE
                  </div>

                  <h2
                    style={
                      styles.sectionTitle
                    }
                  >
                    {formatDate(
                      selectedDate
                    )}
                  </h2>
                </div>

                <div
                  style={
                    styles.countBadge
                  }
                >
                  {
                    selectedDateRecords.length
                  } Records
                </div>
              </div>

              {selectedDateRecords.length ===
              0 ? (
                <EmptyState
                  title="No Attendance Records"
                  text="No attendance has been marked for the selected date."
                />
              ) : (
                <div
                  style={
                    styles.tableWrapper
                  }
                >
                  <table
                    style={styles.table}
                  >
                    <thead>
                      <tr>
                        <th
                          style={styles.th}
                        >
                          #
                        </th>

                        <th
                          style={styles.th}
                        >
                          Student
                        </th>

                        <th
                          style={styles.th}
                        >
                          Username
                        </th>

                        <th
                          style={styles.th}
                        >
                          Date
                        </th>

                        <th
                          style={styles.th}
                        >
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedDateRecords
                        .filter(
                          (record) => {
                            const student =
                              students.find(
                                (
                                  item
                                ) =>
                                  item.id ===
                                  record.student_id
                              );

                            const text =
                              search
                                .trim()
                                .toLowerCase();

                            if (
                              !text
                            ) {
                              return true;
                            }

                            return (
                              student?.student_name
                                ?.toLowerCase()
                                .includes(
                                  text
                                ) ||
                              student?.student_username
                                .toLowerCase()
                                .includes(
                                  text
                                )
                            );
                          }
                        )
                        .map(
                          (
                            record,
                            index
                          ) => {
                            const student =
                              students.find(
                                (
                                  item
                                ) =>
                                  item.id ===
                                  record.student_id
                              );

                            const isPresent =
                              record.status
                                ?.toLowerCase() ===
                              "present";

                            return (
                              <tr
                                key={
                                  record.id
                                }
                              >
                                <td
                                  style={
                                    styles.td
                                  }
                                >
                                  {index +
                                    1}
                                </td>

                                <td
                                  style={
                                    styles.td
                                  }
                                >
                                  <strong
                                    style={
                                      styles.historyName
                                    }
                                  >
                                    {student?.student_name ||
                                      "Unknown Student"}
                                  </strong>
                                </td>

                                <td
                                  style={
                                    styles.td
                                  }
                                >
                                  {
                                    student?.student_username ||
                                    "-"
                                  }
                                </td>

                                <td
                                  style={
                                    styles.td
                                  }
                                >
                                  {formatDate(
                                    record.attendance_date
                                  )}
                                </td>

                                <td
                                  style={
                                    styles.td
                                  }
                                >
                                  <span
                                    style={
                                      isPresent
                                        ? styles.presentBadge
                                        : styles.absentBadge
                                    }
                                  >
                                    {isPresent
                                      ? "PRESENT"
                                      : "ABSENT"}
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
          </>
        )}

        {/* EXTRA CLASS */}

        {activeTab === "extra-class" && (
          <section
            style={styles.featureHero}
          >
            <div>
              <div
                style={styles.smallLabel}
              >
                EXTRA CLASSES
              </div>

              <h2
                style={styles.featureTitle}
              >
                Extra Class Attendance
              </h2>

              <p
                style={styles.featureText}
              >
                Use the existing Extra Class
                module to create and manage
                extra class attendance.
              </p>

              <button
                onClick={() =>
                  router.push(
                    "/teacher/extra-class"
                  )
                }
                style={
                  styles.primaryFeatureButton
                }
              >
                Open Extra Class
              </button>
            </div>

            <div
              style={styles.featureIcon}
            >
              EC
            </div>
          </section>
        )}

        {/* REPORTING */}

        {activeTab === "reporting" && (
          <>
            <section
              style={styles.featureHero}
            >
              <div>
                <div
                  style={styles.smallLabel}
                >
                  ATTENDANCE REPORTING
                </div>

                <h2
                  style={
                    styles.featureTitle
                  }
                >
                  Attendance Reporting
                </h2>

                <p
                  style={
                    styles.featureText
                  }
                >
                  View the current attendance
                  position across the academy.
                </p>
              </div>

              <div
                style={styles.featureIcon}
              >
                RP
              </div>
            </section>

            <section style={styles.statsGrid}>
              <Stat
                icon="P"
                title="Overall Present"
                value={String(
                  overallPresent
                )}
                background="linear-gradient(135deg,#16a34a,#166534)"
              />

              <Stat
                icon="A"
                title="Overall Absent"
                value={String(
                  overallAbsent
                )}
                background="linear-gradient(135deg,#dc2626,#991b1b)"
              />

              <Stat
                icon="CL"
                title="Total Classes"
                value={String(
                  overallTotal
                )}
                background="linear-gradient(135deg,#2563eb,#1e40af)"
              />

              <Stat
                icon="%"
                title="Overall Attendance"
                value={`${overallPercentage}%`}
                background="linear-gradient(135deg,#7c3aed,#4c1d95)"
              />
            </section>

            <section style={styles.card}>
              <div
                style={
                  styles.sectionHeader
                }
              >
                <div>
                  <div
                    style={styles.smallLabel}
                  >
                    STUDENT REPORT
                  </div>

                  <h2
                    style={
                      styles.sectionTitle
                    }
                  >
                    Student Attendance Report
                  </h2>

                  <p
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    Attendance calculated from
                    the existing attendance records.
                  </p>
                </div>
              </div>

              {students.length ===
              0 ? (
                <EmptyState
                  title="No Students Found"
                  text="Student attendance reports will appear when students are available."
                />
              ) : (
                <div
                  style={
                    styles.reportGrid
                  }
                >
                  {students.map(
                    (student) => {
                      const stats =
                        getStudentStats(
                          student.id
                        );

                      return (
                        <div
                          key={
                            student.id
                          }
                          style={
                            styles.reportCard
                          }
                        >
                          <div
                            style={
                              styles.reportAvatar
                            }
                          >
                            {(
                              student.student_name ||
                              student.student_username
                            )
                              .charAt(
                                0
                              )
                              .toUpperCase()}
                          </div>

                          <div
                            style={
                              styles.reportInfo
                            }
                          >
                            <h3
                              style={
                                styles.reportName
                              }
                            >
                              {student.student_name ||
                                "Student"}
                            </h3>

                            <p
                              style={
                                styles.reportUsername
                              }
                            >
                              {
                                student.student_username
                              }
                            </p>
                          </div>

                          <div
                            style={
                              styles.reportPercentage
                            }
                          >
                            {
                              stats.percentage
                            }
                            %
                          </div>

                          <div
                            style={
                              styles.reportStats
                            }
                          >
                            <span>
                              Total:{" "}
                              {
                                stats.total
                              }
                            </span>

                            <span
                              style={
                                styles.presentText
                              }
                            >
                              Present:{" "}
                              {
                                stats.present
                              }
                            </span>

                            <span
                              style={
                                styles.absentText
                              }
                            >
                              Absent:{" "}
                              {
                                stats.absent
                              }
                            </span>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </section>
          </>
        )}

        {/* MONTH WISE */}

        {activeTab === "month-wise" && (
          <>
            <section
              style={styles.featureHero}
            >
              <div>
                <div
                  style={styles.smallLabel}
                >
                  MONTHLY ATTENDANCE
                </div>

                <h2
                  style={
                    styles.featureTitle
                  }
                >
                  Month Wise Attendance
                </h2>

                <p
                  style={
                    styles.featureText
                  }
                >
                  Select a month to view
                  attendance totals and student-wise
                  monthly performance.
                </p>
              </div>

              <div
                style={styles.featureIcon}
              >
                MO
              </div>
            </section>

            <section
              style={styles.controlCard}
            >
              <div style={styles.controlBox}>
                <label style={styles.label}>
                  Select Month
                </label>

                <input
                  type="month"
                  value={month}
                  onChange={(e) =>
                    setMonth(
                      e.target.value
                    )
                  }
                  style={styles.input}
                />
              </div>

              <div style={styles.monthInfo}>
                <span
                  style={
                    styles.monthInfoLabel
                  }
                >
                  MONTH
                </span>

                <strong
                  style={
                    styles.monthInfoValue
                  }
                >
                  {month
                    ? formatMonth(month)
                    : "Select a month"}
                </strong>
              </div>
            </section>

            {!month ? (
              <EmptyState
                title="Select a Month"
                text="Choose a month above to view monthly attendance."
              />
            ) : (
              <>
                <section
                  style={styles.statsGrid}
                >
                  <Stat
                    icon="P"
                    title="Present Classes"
                    value={String(
                      monthSummary.present
                    )}
                    background="linear-gradient(135deg,#16a34a,#166534)"
                  />

                  <Stat
                    icon="A"
                    title="Absent Classes"
                    value={String(
                      monthSummary.absent
                    )}
                    background="linear-gradient(135deg,#dc2626,#991b1b)"
                  />

                  <Stat
                    icon="CL"
                    title="Total Records"
                    value={String(
                      monthSummary.total
                    )}
                    background="linear-gradient(135deg,#2563eb,#1e40af)"
                  />

                  <Stat
                    icon="%"
                    title="Attendance"
                    value={`${monthSummary.percentage}%`}
                    background="linear-gradient(135deg,#7c3aed,#4c1d95)"
                  />
                </section>

                <section style={styles.card}>
                  <div
                    style={
                      styles.sectionHeader
                    }
                  >
                    <div>
                      <div
                        style={
                          styles.smallLabel
                        }
                      >
                        MONTHLY STUDENT SUMMARY
                      </div>

                      <h2
                        style={
                          styles.sectionTitle
                        }
                      >
                        {formatMonth(month)}
                      </h2>
                    </div>
                  </div>

                  <div
                    style={
                      styles.reportGrid
                    }
                  >
                    {studentMonthlyStats.map(
                      (item) => (
                        <div
                          key={
                            item.student.id
                          }
                          style={
                            styles.reportCard
                          }
                        >
                          <div
                            style={
                              styles.reportAvatar
                            }
                          >
                            {(
                              item.student
                                .student_name ||
                              item.student
                                .student_username
                            )
                              .charAt(
                                0
                              )
                              .toUpperCase()}
                          </div>

                          <div
                            style={
                              styles.reportInfo
                            }
                          >
                            <h3
                              style={
                                styles.reportName
                              }
                            >
                              {item.student
                                .student_name ||
                                "Student"}
                            </h3>

                            <p
                              style={
                                styles.reportUsername
                              }
                            >
                              {
                                item
                                  .student
                                  .student_username
                              }
                            </p>
                          </div>

                          <div
                            style={
                              styles.reportPercentage
                            }
                          >
                            {
                              item.percentage
                            }
                            %
                          </div>

                          <div
                            style={
                              styles.reportStats
                            }
                          >
                            <span>
                              Total:{" "}
                              {
                                item.total
                              }
                            </span>

                            <span
                              style={
                                styles.presentText
                              }
                            >
                              Present:{" "}
                              {
                                item.present
                              }
                            </span>

                            <span
                              style={
                                styles.absentText
                              }
                            >
                              Absent:{" "}
                              {
                                item.absent
                              }
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </section>

                <section style={styles.card}>
                  <div
                    style={
                      styles.sectionHeader
                    }
                  >
                    <div>
                      <div
                        style={
                          styles.smallLabel
                        }
                      >
                        MONTHLY RECORDS
                      </div>

                      <h2
                        style={
                          styles.sectionTitle
                        }
                      >
                        Attendance History
                      </h2>
                    </div>

                    <div
                      style={
                        styles.countBadge
                      }
                    >
                      {
                        history.length
                      } Records
                    </div>
                  </div>

                  {history.length ===
                  0 ? (
                    <EmptyState
                      title="No Records This Month"
                      text="No attendance records were found for the selected month."
                    />
                  ) : (
                    <div
                      style={
                        styles.tableWrapper
                      }
                    >
                      <table
                        style={
                          styles.table
                        }
                      >
                        <thead>
                          <tr>
                            <th
                              style={
                                styles.th
                              }
                            >
                              #
                            </th>

                            <th
                              style={
                                styles.th
                              }
                            >
                              Date
                            </th>

                            <th
                              style={
                                styles.th
                              }
                            >
                              Student
                            </th>

                            <th
                              style={
                                styles.th
                              }
                            >
                              Username
                            </th>

                            <th
                              style={
                                styles.th
                              }
                            >
                              Status
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {history.map(
                            (
                              record,
                              index
                            ) => {
                              const student =
                                students.find(
                                  (
                                    item
                                  ) =>
                                    item.id ===
                                    record.student_id
                                );

                              const isPresent =
                                record.status
                                  ?.toLowerCase() ===
                                "present";

                              return (
                                <tr
                                  key={
                                    record.id
                                  }
                                >
                                  <td
                                    style={
                                      styles.td
                                    }
                                  >
                                    {index +
                                      1}
                                  </td>

                                  <td
                                    style={
                                      styles.td
                                    }
                                  >
                                    <strong>
                                      {formatDate(
                                        record.attendance_date
                                      )}
                                    </strong>
                                  </td>

                                  <td
                                    style={
                                      styles.td
                                    }
                                  >
                                    <strong
                                      style={
                                        styles.historyName
                                      }
                                    >
                                      {student?.student_name ||
                                        "Unknown Student"}
                                    </strong>
                                  </td>

                                  <td
                                    style={
                                      styles.td
                                    }
                                  >
                                    {
                                      student?.student_username ||
                                      "-"
                                    }
                                  </td>

                                  <td
                                    style={
                                      styles.td
                                    }
                                  >
                                    <span
                                      style={
                                        isPresent
                                          ? styles.presentBadge
                                          : styles.absentBadge
                                      }
                                    >
                                      {isPresent
                                        ? "PRESENT"
                                        : "ABSENT"}
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
              </>
            )}
          </>
        )}

        {/* FOOTER */}

        <footer style={styles.footer}>
          <div
            style={styles.footerBrand}
          >
            RACER ACADEMY
          </div>

          <div>
            Teacher Attendance Center •
            2026
          </div>
        </footer>
      </div>
    </main>
  );
}

function AttendanceTabButton({
  active,
  number,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  number: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.tabButton,
        ...(active
          ? styles.tabButtonActive
          : {}),
      }}
    >
      <div
        style={{
          ...styles.tabNumber,
          ...(active
            ? styles.tabNumberActive
            : {}),
        }}
      >
        {number}
      </div>

      <div style={styles.tabContent}>
        <div
          style={{
            ...styles.tabTitle,
            ...(active
              ? styles.tabTitleActive
              : {}),
          }}
        >
          {title}
        </div>

        <div
          style={styles.tabSubtitle}
        >
          {subtitle}
        </div>
      </div>
    </button>
  );
}

function EmptyState({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div style={styles.empty}>
      <div style={styles.emptyIcon}>
        —
      </div>

      <h3 style={styles.emptyTitle}>
        {title}
      </h3>

      <p style={styles.emptyText}>
        {text}
      </p>
    </div>
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

function formatMonth(value: string) {
  if (!value) {
    return "-";
  }

  const [year, month] =
    value.split("-");

  if (!year || !month) {
    return value;
  }

  const date = new Date(
    Number(year),
    Number(month) - 1,
    1
  );

  return date.toLocaleDateString(
    "en-IN",
    {
      month: "long",
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
      "linear-gradient(135deg,#eff6ff 0%,#f8fafc 48%,#f5f3ff 100%)",
    padding: "18px 14px 35px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#0f172a",
  },

  container: {
    width: "100%",
    maxWidth: "1280px",
    margin: "0 auto",
  },

  header: {
    background: "#ffffff",
    border: "1px solid #dbeafe",
    borderRadius: "20px",
    padding: "18px 22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
    marginBottom: "18px",
  },

  brandArea: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    minWidth: 0,
  },

  logo: {
    width: "50px",
    height: "50px",
    minWidth: "50px",
    borderRadius: "15px",
    background:
      "linear-gradient(135deg,#1d4ed8,#4f46e5)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    fontSize: "17px",
    letterSpacing: "0.5px",
    boxShadow:
      "0 7px 18px rgba(37,99,235,0.25)",
  },

  brandName: {
    fontSize: "18px",
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: "0.5px",
  },

  brandSub: {
    marginTop: "3px",
    fontSize: "10px",
    color: "#64748b",
    fontWeight: "900",
    letterSpacing: "0.8px",
  },

  headerActions: {
    display: "flex",
    gap: "8px",
  },

  refreshButton: {
    border: "none",
    background: "#1d4ed8",
    color: "#ffffff",
    padding: "11px 17px",
    borderRadius: "10px",
    fontWeight: "900",
    fontSize: "13px",
    cursor: "pointer",
  },

  hero: {
    background:
      "linear-gradient(135deg,#172554 0%,#1d4ed8 55%,#4f46e5 100%)",
    color: "#ffffff",
    borderRadius: "22px",
    padding: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "18px",
    boxShadow:
      "0 15px 35px rgba(30,64,175,0.22)",
  },

  heroText: {
    minWidth: 0,
  },

  heroBadge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    background:
      "rgba(255,255,255,0.15)",
    border:
      "1px solid rgba(255,255,255,0.3)",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "1px",
    marginBottom: "10px",
  },

  title: {
    margin: 0,
    fontSize: "32px",
    lineHeight: 1.15,
    fontWeight: "900",
  },

  subtitle: {
    margin: "9px 0 0",
    color: "#dbeafe",
    fontSize: "14px",
    lineHeight: 1.55,
    fontWeight: "600",
    maxWidth: "720px",
  },

  heroDate: {
    minWidth: "190px",
    background:
      "rgba(255,255,255,0.12)",
    border:
      "1px solid rgba(255,255,255,0.2)",
    borderRadius: "16px",
    padding: "17px",
    textAlign: "right",
  },

  heroDateLabel: {
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "1px",
    color: "#bfdbfe",
  },

  heroDateValue: {
    marginTop: "6px",
    fontSize: "18px",
    fontWeight: "900",
  },

  navigationCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    padding: "18px",
    marginBottom: "18px",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.06)",
  },

  navigationTitle: {
    fontSize: "13px",
    fontWeight: "900",
    color: "#475569",
    marginBottom: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.7px",
  },

  tabs: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(190px,1fr))",
    gap: "10px",
  },

  tabButton: {
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    borderRadius: "14px",
    padding: "12px",
    display: "flex",
    alignItems: "center",
    gap: "11px",
    textAlign: "left",
    cursor: "pointer",
    minHeight: "70px",
  },

  tabButtonActive: {
    background: "#eff6ff",
    border: "2px solid #2563eb",
    boxShadow:
      "0 6px 15px rgba(37,99,235,0.12)",
  },

  tabNumber: {
    width: "34px",
    height: "34px",
    minWidth: "34px",
    borderRadius: "10px",
    background: "#e2e8f0",
    color: "#334155",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    fontSize: "13px",
  },

  tabNumberActive: {
    background: "#2563eb",
    color: "#ffffff",
  },

  tabContent: {
    minWidth: 0,
  },

  tabTitle: {
    color: "#0f172a",
    fontSize: "12px",
    fontWeight: "900",
    lineHeight: 1.25,
  },

  tabTitleActive: {
    color: "#1d4ed8",
  },

  tabSubtitle: {
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "700",
    marginTop: "4px",
  },

  success: {
    background: "#dcfce7",
    color: "#14532d",
    border: "1px solid #4ade80",
    padding: "14px 17px",
    borderRadius: "12px",
    marginBottom: "18px",
    fontWeight: "800",
    fontSize: "13px",
  },

  error: {
    background: "#fee2e2",
    color: "#7f1d1d",
    border: "1px solid #f87171",
    padding: "14px 17px",
    borderRadius: "12px",
    marginBottom: "18px",
    fontWeight: "800",
    fontSize: "13px",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(200px,1fr))",
    gap: "14px",
    marginBottom: "18px",
  },

  stat: {
    color: "#ffffff",
    padding: "19px",
    borderRadius: "18px",
    minHeight: "135px",
    boxSizing: "border-box",
    boxShadow:
      "0 10px 25px rgba(15,23,42,0.13)",
  },

  statIcon: {
    width: "34px",
    height: "34px",
    borderRadius: "10px",
    background:
      "rgba(255,255,255,0.17)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "0.5px",
  },

  statTitle: {
    marginTop: "11px",
    fontSize: "12px",
    fontWeight: "800",
  },

  statValue: {
    marginTop: "4px",
    fontSize: "30px",
    fontWeight: "900",
  },

  controlCard: {
    background: "#ffffff",
    padding: "18px",
    borderRadius: "18px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(260px,1fr))",
    gap: "15px",
    border: "1px solid #e2e8f0",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.06)",
    marginBottom: "18px",
  },

  controlBox: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  label: {
    color: "#0f172a",
    fontWeight: "900",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    fontSize: "14px",
    color: "#0f172a",
    background: "#ffffff",
    outline: "none",
    fontWeight: "600",
  },

  actionCard: {
    background: "#ffffff",
    padding: "19px",
    borderRadius: "18px",
    border: "1px solid #bfdbfe",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.06)",
    marginBottom: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "18px",
    flexWrap: "wrap",
  },

  actionTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "18px",
    fontWeight: "900",
  },

  actionSubtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "600",
  },

  actionButtons: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },

  bulkPresentButton: {
    padding: "11px 14px",
    borderRadius: "9px",
    border: "none",
    background: "#15803d",
    color: "#ffffff",
    fontWeight: "900",
    fontSize: "12px",
    cursor: "pointer",
  },

  bulkAbsentButton: {
    padding: "11px 14px",
    borderRadius: "9px",
    border: "none",
    background: "#b91c1c",
    color: "#ffffff",
    fontWeight: "900",
    fontSize: "12px",
    cursor: "pointer",
  },

  deleteButton: {
    padding: "11px 14px",
    borderRadius: "9px",
    border: "1px solid #991b1b",
    background: "#ffffff",
    color: "#991b1b",
    fontWeight: "900",
    fontSize: "12px",
    cursor: "pointer",
  },

  card: {
    background: "#ffffff",
    borderRadius: "19px",
    padding: "21px",
    border: "1px solid #e2e8f0",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.06)",
    marginBottom: "18px",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "14px",
    marginBottom: "18px",
    flexWrap: "wrap",
  },

  smallLabel: {
    color: "#2563eb",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "1px",
    marginBottom: "5px",
  },

  sectionTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "21px",
    fontWeight: "900",
  },

  sectionSubtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "600",
  },

  darkText: {
    color: "#0f172a",
    fontWeight: "900",
  },

  countBadge: {
    background: "#eff6ff",
    color: "#1e40af",
    border: "1px solid #bfdbfe",
    padding: "8px 12px",
    borderRadius: "999px",
    fontWeight: "900",
    fontSize: "11px",
  },

  studentList: {
    display: "flex",
    flexDirection: "column",
    gap: "11px",
  },

  studentRow: {
    borderRadius: "15px",
    padding: "14px",
    display: "flex",
    alignItems: "center",
    gap: "13px",
    boxSizing: "border-box",
    boxShadow:
      "0 3px 10px rgba(15,23,42,0.04)",
  },

  number: {
    width: "28px",
    minWidth: "28px",
    textAlign: "center",
    color: "#475569",
    fontWeight: "900",
    fontSize: "13px",
  },

  avatar: {
    width: "48px",
    height: "48px",
    minWidth: "48px",
    borderRadius: "14px",
    background:
      "linear-gradient(135deg,#1d4ed8,#4f46e5)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    fontWeight: "900",
  },

  studentInfo: {
    flex: 1,
    minWidth: "190px",
  },

  studentName: {
    margin: 0,
    color: "#020617",
    fontSize: "16px",
    fontWeight: "900",
  },

  username: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "600",
  },

  miniStats: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "8px",
  },

  statText: {
    color: "#475569",
    fontSize: "10px",
    fontWeight: "800",
  },

  presentText: {
    color: "#15803d",
    fontSize: "10px",
    fontWeight: "900",
  },

  absentText: {
    color: "#b91c1c",
    fontSize: "10px",
    fontWeight: "900",
  },

  percentText: {
    color: "#1d4ed8",
    fontSize: "10px",
    fontWeight: "900",
  },

  attendanceActions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "7px",
    minWidth: "195px",
  },

  buttons: {
    display: "flex",
    gap: "7px",
  },

  presentButton: {
    padding: "9px 12px",
    borderRadius: "8px",
    border: "2px solid #15803d",
    fontWeight: "900",
    fontSize: "11px",
    cursor: "pointer",
  },

  absentButton: {
    padding: "9px 12px",
    borderRadius: "8px",
    border: "2px solid #b91c1c",
    fontWeight: "900",
    fontSize: "11px",
    cursor: "pointer",
  },

  presentBadge: {
    display: "inline-block",
    background: "#16a34a",
    color: "#ffffff",
    padding: "6px 10px",
    borderRadius: "999px",
    fontWeight: "900",
    fontSize: "9px",
    border: "1px solid #166534",
  },

  absentBadge: {
    display: "inline-block",
    background: "#dc2626",
    color: "#ffffff",
    padding: "6px 10px",
    borderRadius: "999px",
    fontWeight: "900",
    fontSize: "9px",
    border: "1px solid #991b1b",
  },

  featureHero: {
    background: "#ffffff",
    border: "1px solid #dbeafe",
    borderRadius: "20px",
    padding: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "18px",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.06)",
  },

  featureTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "25px",
    fontWeight: "900",
  },

  featureText: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: "13px",
    lineHeight: 1.5,
    fontWeight: "600",
    maxWidth: "680px",
  },

  featureIcon: {
    width: "70px",
    height: "70px",
    minWidth: "70px",
    borderRadius: "20px",
    background:
      "linear-gradient(135deg,#1d4ed8,#4f46e5)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    fontSize: "16px",
    boxShadow:
      "0 10px 25px rgba(37,99,235,0.2)",
  },

  primaryFeatureButton: {
    marginTop: "15px",
    border: "none",
    background: "#1d4ed8",
    color: "#ffffff",
    padding: "11px 17px",
    borderRadius: "10px",
    fontWeight: "900",
    fontSize: "12px",
    cursor: "pointer",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
    WebkitOverflowScrolling:
      "touch",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "680px",
    background: "#ffffff",
  },

  th: {
    padding: "12px",
    textAlign: "left",
    background: "#eff6ff",
    color: "#172554",
    borderBottom:
      "1px solid #bfdbfe",
    fontSize: "11px",
    fontWeight: "900",
  },

  td: {
    padding: "12px",
    borderBottom:
      "1px solid #e2e8f0",
    color: "#0f172a",
    fontSize: "11px",
    fontWeight: "600",
  },

  historyName: {
    color: "#020617",
    fontWeight: "900",
  },

  reportGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(260px,1fr))",
    gap: "11px",
  },

  reportCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "14px",
    display: "grid",
    gridTemplateColumns:
      "42px 1fr auto",
    gap: "9px",
    alignItems: "center",
    background: "#ffffff",
  },

  reportAvatar: {
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    background:
      "linear-gradient(135deg,#dbeafe,#e0e7ff)",
    color: "#1e40af",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    fontSize: "15px",
  },

  reportInfo: {
    minWidth: 0,
  },

  reportName: {
    margin: 0,
    color: "#0f172a",
    fontSize: "13px",
    fontWeight: "900",
  },

  reportUsername: {
    margin: "3px 0 0",
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "700",
  },

  reportPercentage: {
    color: "#1d4ed8",
    fontSize: "19px",
    fontWeight: "900",
  },

  reportStats: {
    gridColumn: "1 / -1",
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    paddingTop: "7px",
    borderTop:
      "1px solid #f1f5f9",
    color: "#475569",
    fontSize: "10px",
    fontWeight: "800",
  },

  monthInfo: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "13px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },

  monthInfoLabel: {
    color: "#64748b",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "0.8px",
  },

  monthInfoValue: {
    color: "#0f172a",
    fontSize: "16px",
    fontWeight: "900",
    marginTop: "4px",
  },

  empty: {
    textAlign: "center",
    padding: "48px 18px",
    color: "#475569",
    background: "#f8fafc",
    borderRadius: "14px",
    border:
      "1px dashed #cbd5e1",
  },

  emptyIcon: {
    width: "44px",
    height: "44px",
    margin: "0 auto 10px",
    borderRadius: "13px",
    background: "#e2e8f0",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    fontSize: "18px",
  },

  emptyTitle: {
    margin: 0,
    color: "#0f172a",
    fontWeight: "900",
    fontSize: "17px",
  },

  emptyText: {
    color: "#64748b",
    fontWeight: "600",
    fontSize: "12px",
    margin: "7px 0 0",
  },

  loadingCard: {
    maxWidth: "420px",
    margin: "100px auto",
    background: "#ffffff",
    padding: "38px",
    borderRadius: "20px",
    textAlign: "center",
    border: "1px solid #dbeafe",
    boxShadow:
      "0 15px 35px rgba(15,23,42,0.1)",
  },

  loadingLogo: {
    width: "58px",
    height: "58px",
    margin: "0 auto 15px",
    borderRadius: "17px",
    background:
      "linear-gradient(135deg,#1d4ed8,#4f46e5)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    fontSize: "17px",
  },

  loadingTitle: {
    color: "#0f172a",
    fontWeight: "900",
    margin: 0,
    fontSize: "20px",
  },

  loadingText: {
    color: "#64748b",
    fontWeight: "600",
    fontSize: "12px",
    lineHeight: 1.5,
  },

  loadingBar: {
    height: "5px",
    background: "#e2e8f0",
    borderRadius: "999px",
    overflow: "hidden",
    marginTop: "18px",
  },

  loadingBarInner: {
    width: "55%",
    height: "100%",
    background: "#2563eb",
    borderRadius: "999px",
  },

  footer: {
    textAlign: "center",
    color: "#64748b",
    padding: "20px 10px 5px",
    fontSize: "11px",
    fontWeight: "600",
    lineHeight: 1.7,
  },

  footerBrand: {
    color: "#1d4ed8",
    fontWeight: "900",
    letterSpacing: "0.7px",
  },
};