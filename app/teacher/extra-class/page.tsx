"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";

type Student = {
  id: number;
  student_name: string | null;
  student_username: string;
  admission_date?: string | null;
  class_name?: string | null;
};

type AttendanceRecord = {
  id: number;
  student_id: number;
  attendance_date: string;
  status: string;
  marked_by_teacher_id?: number | null;
};

type ExtraClass = {
  id: number;
  class_date: string;
  remarks: string | null;
  created_at?: string;
};

type ExtraClassAttendance = {
  id: number;
  extra_class_id: number;
  student_id: number;
  extra_class_date: string;
  status: "Present" | "Absent";
  remarks: string | null;
  created_at?: string;
};

type AttendanceTab =
  | "today"
  | "date-wise"
  | "extra-class"
  | "reporting"
  | "month-wise";

const MAIN_TEACHER_ID = 1;

function formatDate(date: string) {
  if (!date) return "-";

  return new Date(`${date}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function getStudentName(student: Student) {
  return (
    student.student_name?.trim() ||
    `Student #${student.id}`
  );
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getMonthValue(date: string) {
  return date ? date.slice(0, 7) : "";
}

function getMonthName(month: string) {
  if (!month) return "";

  return new Date(
    `${month}-01T00:00:00`
  ).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export default function TeacherAttendancePage() {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<
    AttendanceRecord[]
  >([]);

  const [extraClasses, setExtraClasses] = useState<
    ExtraClass[]
  >([]);

  const [extraClassAttendance, setExtraClassAttendance] =
    useState<ExtraClassAttendance[]>([]);

  const [selectedDate, setSelectedDate] =
    useState(getToday());

  const [search, setSearch] = useState("");

  const [month, setMonth] = useState(
    getToday().slice(0, 7)
  );

  const [activeTab, setActiveTab] =
    useState<AttendanceTab>("today");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  const [teacherId, setTeacherId] =
    useState<number | null>(null);

  const [isMainTeacher, setIsMainTeacher] =
    useState(false);

  // ---------------------------------------------------------
  // LOAD DATA
  // ---------------------------------------------------------

  async function loadData() {
    try {
      setLoading(true);
      setMessage("");

      const storedTeacherId =
        window.localStorage.getItem(
          "attendance_teacher_id"
        );

      if (!storedTeacherId) {
        throw new Error(
          "Teacher session not found. Please login again."
        );
      }

      const currentTeacherId =
        Number(storedTeacherId);

      if (!Number.isFinite(currentTeacherId)) {
        throw new Error(
          "Invalid teacher session. Please login again."
        );
      }

      const mainTeacher =
        currentTeacherId === MAIN_TEACHER_ID;

      setTeacherId(currentTeacherId);
      setIsMainTeacher(mainTeacher);

      // -----------------------------------------------------
      // MAIN TEACHER
      // -----------------------------------------------------

      if (mainTeacher) {
        const [
          studentsResult,
          attendanceResult,
          extraClassesResult,
          extraClassAttendanceResult,
        ] = await Promise.all([
          supabase
            .from("students")
            .select("*")
            .order("id", {
              ascending: true,
            }),

          supabase
            .from("attendance")
            .select("*")
            .order("attendance_date", {
              ascending: false,
            })
            .order("id", {
              ascending: false,
            }),

          supabase
            .from("extra_classes")
            .select("*")
            .order("class_date", {
              ascending: false,
            })
            .order("id", {
              ascending: false,
            }),

          supabase
            .from("extra_class_attendance")
            .select("*")
            .order("id", {
              ascending: true,
            }),
        ]);

        if (studentsResult.error)
          throw new Error(
            studentsResult.error.message
          );

        if (attendanceResult.error)
          throw new Error(
            attendanceResult.error.message
          );

        if (extraClassesResult.error)
          throw new Error(
            extraClassesResult.error.message
          );

        if (extraClassAttendanceResult.error)
          throw new Error(
            extraClassAttendanceResult.error.message
          );

        setStudents(
          (studentsResult.data ||
            []) as Student[]
        );

        setAttendance(
          (attendanceResult.data ||
            []) as AttendanceRecord[]
        );

        setExtraClasses(
          (extraClassesResult.data ||
            []) as ExtraClass[]
        );

        setExtraClassAttendance(
          (extraClassAttendanceResult.data ||
            []) as ExtraClassAttendance[]
        );

        return;
      }

      // -----------------------------------------------------
      // ASSIGNED TEACHER
      // -----------------------------------------------------

      const {
        data: assignments,
        error: assignmentError,
      } = await supabase
        .from("teacher_student_assignments")
        .select("student_id")
        .eq("teacher_id", currentTeacherId);

      if (assignmentError) {
        throw new Error(
          assignmentError.message
        );
      }

      const assignedStudentIds = Array.from(
        new Set(
          (assignments || [])
            .map((item) =>
              Number(item.student_id)
            )
            .filter((id) =>
              Number.isFinite(id)
            )
        )
      );

      if (assignedStudentIds.length === 0) {
        setStudents([]);
        setAttendance([]);
        setExtraClasses([]);
        setExtraClassAttendance([]);
        return;
      }

      const [
        studentsResult,
        attendanceResult,
        extraClassAttendanceResult,
      ] = await Promise.all([
        supabase
          .from("students")
          .select("*")
          .in("id", assignedStudentIds)
          .order("id", {
            ascending: true,
          }),

        supabase
          .from("attendance")
          .select("*")
          .in(
            "student_id",
            assignedStudentIds
          )
          .order("attendance_date", {
            ascending: false,
          })
          .order("id", {
            ascending: false,
          }),

        supabase
          .from("extra_class_attendance")
          .select("*")
          .in(
            "student_id",
            assignedStudentIds
          )
          .order("id", {
            ascending: true,
          }),
      ]);

      if (studentsResult.error)
        throw new Error(
          studentsResult.error.message
        );

      if (attendanceResult.error)
        throw new Error(
          attendanceResult.error.message
        );

      if (extraClassAttendanceResult.error)
        throw new Error(
          extraClassAttendanceResult.error.message
        );

      const assignedExtraAttendance =
        (extraClassAttendanceResult.data ||
          []) as ExtraClassAttendance[];

      const assignedClassIds = Array.from(
        new Set(
          assignedExtraAttendance.map(
            (item) => item.extra_class_id
          )
        )
      );

      let assignedClasses: ExtraClass[] = [];

      if (assignedClassIds.length > 0) {
        const {
          data: classData,
          error: classError,
        } = await supabase
          .from("extra_classes")
          .select("*")
          .in("id", assignedClassIds)
          .order("class_date", {
            ascending: false,
          })
          .order("id", {
            ascending: false,
          });

        if (classError) {
          throw new Error(
            classError.message
          );
        }

        assignedClasses =
          (classData || []) as ExtraClass[];
      }

      setStudents(
        (studentsResult.data ||
          []) as Student[]
      );

      setAttendance(
        (attendanceResult.data ||
          []) as AttendanceRecord[]
      );

      setExtraClassAttendance(
        assignedExtraAttendance
      );

      setExtraClasses(assignedClasses);
    } catch (error) {
      console.error(
        "Teacher attendance load error:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load attendance."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // ---------------------------------------------------------
  // SEARCH
  // ---------------------------------------------------------

  const filteredStudents = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) return students;

    return students.filter((student) => {
      const name =
        getStudentName(student).toLowerCase();

      const username =
        (
          student.student_username || ""
        ).toLowerCase();

      const id = String(student.id);

      return (
        name.includes(query) ||
        username.includes(query) ||
        id.includes(query)
      );
    });
  }, [students, search]);

  // ---------------------------------------------------------
  // REGULAR ATTENDANCE
  // ---------------------------------------------------------

  const attendanceForSelectedDate =
    useMemo(() => {
      return attendance.filter(
        (item) =>
          item.attendance_date ===
          selectedDate
      );
    }, [attendance, selectedDate]);

  function getAttendance(
    studentId: number,
    date = selectedDate
  ) {
    return attendance.find(
      (item) =>
        item.student_id === studentId &&
        item.attendance_date === date
    );
  }

  function isStudentAllowed(studentId: number) {
    return students.some(
      (student) => student.id === studentId
    );
  }

  async function markAttendance(
    studentId: number,
    status: "Present" | "Absent"
  ) {
    if (!teacherId) {
      setMessage(
        "Teacher session not found. Please login again."
      );
      return;
    }

    if (!isStudentAllowed(studentId)) {
      setMessage(
        "You can only manage students assigned to you."
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const existing = getAttendance(
        studentId,
        selectedDate
      );

      if (existing) {
        const { data, error } =
          await supabase
            .from("attendance")
            .update({
              status,
              marked_by_teacher_id:
                teacherId,
            })
            .eq("id", existing.id)
            .select("*")
            .single();

        if (error) {
          throw new Error(error.message);
        }

        setAttendance((current) =>
          current.map((item) =>
            item.id === existing.id
              ? (data as AttendanceRecord)
              : item
          )
        );
      } else {
        const { data, error } =
          await supabase
            .from("attendance")
            .insert({
              student_id: studentId,
              attendance_date:
                selectedDate,
              status,
              marked_by_teacher_id:
                teacherId,
            })
            .select("*")
            .single();

        if (error) {
          throw new Error(error.message);
        }

        setAttendance((current) => [
          ...current,
          data as AttendanceRecord,
        ]);
      }

      setMessage(
        `${status} marked successfully.`
      );
    } catch (error) {
      console.error(
        "Mark attendance error:",
        error
      );

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
    if (!teacherId) {
      setMessage(
        "Teacher session not found."
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      for (const student of students) {
        const existing = getAttendance(
          student.id,
          selectedDate
        );

        if (existing) {
          const { data, error } =
            await supabase
              .from("attendance")
              .update({
                status,
                marked_by_teacher_id:
                  teacherId,
              })
              .eq("id", existing.id)
              .select("*")
              .single();

          if (error) {
            throw new Error(
              error.message
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
          const { data, error } =
            await supabase
              .from("attendance")
              .insert({
                student_id: student.id,
                attendance_date:
                  selectedDate,
                status,
                marked_by_teacher_id:
                  teacherId,
              })
              .select("*")
              .single();

          if (error) {
            throw new Error(
              error.message
            );
          }

          setAttendance((current) => [
            ...current,
            data as AttendanceRecord,
          ]);
        }
      }

      setMessage(
        `All students marked ${status}.`
      );
    } catch (error) {
      console.error(
        "Mark all error:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to mark attendance."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteAttendance(
    studentId: number
  ) {
    const record = getAttendance(
      studentId,
      selectedDate
    );

    if (!record) return;

    if (!isStudentAllowed(studentId)) {
      setMessage(
        "You cannot modify this student's attendance."
      );
      return;
    }

    try {
      setSaving(true);

      const { error } =
        await supabase
          .from("attendance")
          .delete()
          .eq("id", record.id);

      if (error) {
        throw new Error(error.message);
      }

      setAttendance((current) =>
        current.filter(
          (item) => item.id !== record.id
        )
      );

      setMessage(
        "Attendance record removed."
      );
    } catch (error) {
      console.error(
        "Delete attendance error:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete attendance."
      );
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------
  // TODAY STATS
  // ---------------------------------------------------------

  const todayPresent =
    attendanceForSelectedDate.filter(
      (item) => item.status === "Present"
    ).length;

  const todayAbsent =
    attendanceForSelectedDate.filter(
      (item) => item.status === "Absent"
    ).length;

  const todayMarked =
    todayPresent + todayAbsent;

  const todayPercentage =
    todayMarked > 0
      ? Math.round(
          (todayPresent / todayMarked) * 100
        )
      : 0;

  // ---------------------------------------------------------
  // REGULAR STUDENT STATS
  // ---------------------------------------------------------

  function getStudentRegularStats(
    studentId: number
  ) {
    const records = attendance.filter(
      (item) =>
        item.student_id === studentId
    );

    const total = records.length;

    const present = records.filter(
      (item) =>
        item.status === "Present"
    ).length;

    const absent = records.filter(
      (item) =>
        item.status === "Absent"
    ).length;

    const percentage =
      total > 0
        ? Math.round(
            (present / total) * 100
          )
        : 0;

    return {
      total,
      present,
      absent,
      percentage,
    };
  }

  // ---------------------------------------------------------
  // MONTH STATS
  // ---------------------------------------------------------

  const monthRecords = useMemo(() => {
    return attendance.filter(
      (item) =>
        item.attendance_date.startsWith(
          month
        )
    );
  }, [attendance, month]);

  const monthPresent =
    monthRecords.filter(
      (item) => item.status === "Present"
    ).length;

  const monthAbsent =
    monthRecords.filter(
      (item) => item.status === "Absent"
    ).length;

  const monthTotal =
    monthPresent + monthAbsent;

  const monthPercentage =
    monthTotal > 0
      ? Math.round(
          (monthPresent / monthTotal) * 100
        )
      : 0;

  // ---------------------------------------------------------
  // EXTRA CLASS STATS
  // ---------------------------------------------------------

  function getExtraClassStats(
    studentId: number
  ) {
    const records =
      extraClassAttendance.filter(
        (item) =>
          item.student_id === studentId
      );

    const total = records.length;

    const present = records.filter(
      (item) =>
        item.status === "Present"
    ).length;

    const absent = records.filter(
      (item) =>
        item.status === "Absent"
    ).length;

    const percentage =
      total > 0
        ? Math.round(
            (present / total) * 100
          )
        : 0;

    return {
      total,
      present,
      absent,
      percentage,
    };
  }

  const extraClassTotal =
    extraClassAttendance.length;

  const extraClassPresent =
    extraClassAttendance.filter(
      (item) =>
        item.status === "Present"
    ).length;

  const extraClassAbsent =
    extraClassAttendance.filter(
      (item) =>
        item.status === "Absent"
    ).length;

  const extraClassPercentage =
    extraClassTotal > 0
      ? Math.round(
          (extraClassPresent /
            extraClassTotal) *
            100
        )
      : 0;

  const extraClassMonths = useMemo(() => {
    return Array.from(
      new Set(
        extraClasses.map((item) =>
          getMonthValue(item.class_date)
        )
      )
    ).sort((a, b) =>
      b.localeCompare(a)
    );
  }, [extraClasses]);

  // ---------------------------------------------------------
  // EXTRA CLASS STUDENT DATA
  // ---------------------------------------------------------

  const extraClassStudents =
    useMemo(() => {
      return filteredStudents.map(
        (student) => {
          const stats =
            getExtraClassStats(
              student.id
            );

          const records =
            extraClassAttendance
              .filter(
                (item) =>
                  item.student_id ===
                  student.id
              )
              .sort((a, b) =>
                b.extra_class_date.localeCompare(
                  a.extra_class_date
                )
              );

          return {
            student,
            stats,
            records,
          };
        }
      );
    }, [
      filteredStudents,
      extraClassAttendance,
    ]);

  // ---------------------------------------------------------
  // TAB
  // ---------------------------------------------------------

  function openTab(
    tab: AttendanceTab
  ) {
    setActiveTab(tab);

    // IMPORTANT:
    // Extra Class stays inside this page.
    // It no longer redirects to /teacher/extra-class.
  }

  // ---------------------------------------------------------
  // DATE RECORDS
  // ---------------------------------------------------------

  const dateRecords =
    filteredStudents.map(
      (student) => ({
        student,
        record: getAttendance(
          student.id,
          selectedDate
        ),
      })
    );

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <main className="attendance-page">
      <div className="page-shell">
        {/* HEADER */}

        <header className="top-header">
          <div>
            <div className="brand-small">
              RACER ACADEMY
            </div>

            <h1>Teacher Attendance</h1>

            <p>
              Manage student attendance and
              Extra Class attendance.
            </p>

            <div
              className={`access-badge ${
                isMainTeacher
                  ? "main"
                  : "assigned"
              }`}
            >
              {isMainTeacher
                ? "MAIN TEACHER • ALL STUDENTS ACCESS"
                : "ASSIGNED TEACHER • ASSIGNED STUDENTS ONLY"}
            </div>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                router.push("/teacher/dashboard")
              }
            >
              ← Dashboard
            </button>

            <button
              type="button"
              className="refresh-button"
              onClick={loadData}
              disabled={loading}
            >
              ↻ Refresh
            </button>
          </div>
        </header>

        {/* MESSAGE */}

        {message && (
          <div className="message-box">
            <span>i</span>

            <strong>{message}</strong>

            <button
              type="button"
              onClick={() =>
                setMessage("")
              }
            >
              ×
            </button>
          </div>
        )}

        {/* TABS */}

        <section className="tabs-card">
          <button
            type="button"
            className={
              activeTab === "today"
                ? "tab active"
                : "tab"
            }
            onClick={() =>
              openTab("today")
            }
          >
            <span>TD</span>
            Today
          </button>

          <button
            type="button"
            className={
              activeTab === "date-wise"
                ? "tab active"
                : "tab"
            }
            onClick={() =>
              openTab("date-wise")
            }
          >
            <span>DW</span>
            Date Wise
          </button>

          <button
            type="button"
            className={
              activeTab === "extra-class"
                ? "tab active extra-tab"
                : "tab"
            }
            onClick={() =>
              openTab("extra-class")
            }
          >
            <span>EC</span>
            Extra Class
          </button>

          <button
            type="button"
            className={
              activeTab === "reporting"
                ? "tab active"
                : "tab"
            }
            onClick={() =>
              openTab("reporting")
            }
          >
            <span>RP</span>
            Reporting
          </button>

          <button
            type="button"
            className={
              activeTab === "month-wise"
                ? "tab active"
                : "tab"
            }
            onClick={() =>
              openTab("month-wise")
            }
          >
            <span>MW</span>
            Month Wise
          </button>
        </section>

        {loading ? (
          <section className="loading-card">
            <div className="loader" />
            <h3>Loading Attendance...</h3>
            <p>
              Please wait while the teacher
              attendance data is loaded.
            </p>
          </section>
        ) : (
          <>
            {/* =================================================
                TODAY
            ================================================= */}

            {activeTab === "today" && (
              <>
                <section className="control-card">
                  <div>
                    <span className="section-kicker">
                      TODAY
                    </span>

                    <h2>
                      Today's Attendance
                    </h2>

                    <p>
                      Mark attendance for
                      {formatDate(
                        selectedDate
                      )}
                    </p>
                  </div>

                  <div className="control-actions">
                    <button
                      type="button"
                      className="present-all-button"
                      onClick={() =>
                        markAll("Present")
                      }
                      disabled={saving}
                    >
                      ✓ Mark All Present
                    </button>

                    <button
                      type="button"
                      className="absent-all-button"
                      onClick={() =>
                        markAll("Absent")
                      }
                      disabled={saving}
                    >
                      × Mark All Absent
                    </button>
                  </div>
                </section>

                <section className="stats-grid">
                  <div className="stat-card">
                    <span>Total Students</span>
                    <strong>
                      {students.length}
                    </strong>
                  </div>

                  <div className="stat-card present">
                    <span>Present</span>
                    <strong>
                      {todayPresent}
                    </strong>
                  </div>

                  <div className="stat-card absent">
                    <span>Absent</span>
                    <strong>
                      {todayAbsent}
                    </strong>
                  </div>

                  <div className="stat-card percentage">
                    <span>Marked Attendance</span>
                    <strong>
                      {todayPercentage}%
                    </strong>
                  </div>
                </section>

                <section className="attendance-card">
                  <div className="card-heading">
                    <div>
                      <span className="section-kicker">
                        STUDENTS
                      </span>

                      <h2>
                        Today's Student Attendance
                      </h2>
                    </div>

                    <div className="search-wrapper">
                      <span>⌕</span>

                      <input
                        value={search}
                        onChange={(e) =>
                          setSearch(
                            e.target.value
                          )
                        }
                        placeholder="Search student..."
                      />
                    </div>
                  </div>

                  <div className="student-list">
                    {filteredStudents.length ===
                    0 ? (
                      <div className="empty-box">
                        No students found.
                      </div>
                    ) : (
                      filteredStudents.map(
                        (student, index) => {
                          const record =
                            getAttendance(
                              student.id
                            );

                          const status =
                            record?.status;

                          return (
                            <div
                              key={student.id}
                              className="attendance-row"
                            >
                              <div className="serial">
                                {index + 1}
                              </div>

                              <div className="avatar">
                                {getStudentName(
                                  student
                                )
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div className="student-main">
                                <strong>
                                  {getStudentName(
                                    student
                                  )}
                                </strong>

                                <div className="student-meta">
                                  <span>
                                    Username:{" "}
                                    <b>
                                      {
                                        student.student_username
                                      }
                                    </b>
                                  </span>

                                  <span>
                                    Student ID:{" "}
                                    <b>
                                      {student.id}
                                    </b>
                                  </span>
                                </div>

                                {record &&
                                  record.marked_by_teacher_id &&
                                  record.marked_by_teacher_id !==
                                    MAIN_TEACHER_ID && (
                                    <small className="marked-by">
                                      Marked by Teacher #
                                      {
                                        record.marked_by_teacher_id
                                      }
                                    </small>
                                  )}
                              </div>

                              <div className="status-actions">
                                <button
                                  type="button"
                                  className={
                                    status ===
                                    "Present"
                                      ? "present active"
                                      : "present"
                                  }
                                  onClick={() =>
                                    markAttendance(
                                      student.id,
                                      "Present"
                                    )
                                  }
                                  disabled={saving}
                                >
                                  ✓ Present
                                </button>

                                <button
                                  type="button"
                                  className={
                                    status ===
                                    "Absent"
                                      ? "absent active"
                                      : "absent"
                                  }
                                  onClick={() =>
                                    markAttendance(
                                      student.id,
                                      "Absent"
                                    )
                                  }
                                  disabled={saving}
                                >
                                  × Absent
                                </button>

                                {record && (
                                  <button
                                    type="button"
                                    className="remove-button"
                                    onClick={() =>
                                      deleteAttendance(
                                        student.id
                                      )
                                    }
                                    disabled={saving}
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        }
                      )
                    )}
                  </div>
                </section>
              </>
            )}

            {/* =================================================
                DATE WISE
            ================================================= */}

            {activeTab === "date-wise" && (
              <>
                <section className="control-card">
                  <div>
                    <span className="section-kicker">
                      DATE WISE
                    </span>

                    <h2>
                      Attendance by Date
                    </h2>

                    <p>
                      Select any date to view
                      or mark attendance.
                    </p>
                  </div>

                  <div className="date-picker">
                    <label>
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
                    />
                  </div>
                </section>

                <section className="stats-grid">
                  <div className="stat-card">
                    <span>Selected Date</span>
                    <strong className="small-value">
                      {formatDate(
                        selectedDate
                      )}
                    </strong>
                  </div>

                  <div className="stat-card present">
                    <span>Present</span>
                    <strong>
                      {todayPresent}
                    </strong>
                  </div>

                  <div className="stat-card absent">
                    <span>Absent</span>
                    <strong>
                      {todayAbsent}
                    </strong>
                  </div>

                  <div className="stat-card percentage">
                    <span>Attendance</span>
                    <strong>
                      {todayPercentage}%
                    </strong>
                  </div>
                </section>

                <section className="attendance-card">
                  <div className="card-heading">
                    <div>
                      <span className="section-kicker">
                        DATE RECORD
                      </span>

                      <h2>
                        {formatDate(
                          selectedDate
                        )}
                      </h2>
                    </div>

                    <div className="search-wrapper">
                      <span>⌕</span>

                      <input
                        value={search}
                        onChange={(e) =>
                          setSearch(
                            e.target.value
                          )
                        }
                        placeholder="Search student..."
                      />
                    </div>
                  </div>

                  <div className="student-list">
                    {dateRecords.map(
                      ({
                        student,
                        record,
                      }) => (
                        <div
                          key={student.id}
                          className="attendance-row"
                        >
                          <div className="avatar">
                            {getStudentName(
                              student
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="student-main">
                            <strong>
                              {getStudentName(
                                student
                              )}
                            </strong>

                            <div className="student-meta">
                              <span>
                                {
                                  student.student_username
                                }
                              </span>

                              <span>
                                ID:{" "}
                                {student.id}
                              </span>
                            </div>
                          </div>

                          <div className="status-actions">
                            <button
                              type="button"
                              className={
                                record?.status ===
                                "Present"
                                  ? "present active"
                                  : "present"
                              }
                              onClick={() =>
                                markAttendance(
                                  student.id,
                                  "Present"
                                )
                              }
                              disabled={saving}
                            >
                              ✓ Present
                            </button>

                            <button
                              type="button"
                              className={
                                record?.status ===
                                "Absent"
                                  ? "absent active"
                                  : "absent"
                              }
                              onClick={() =>
                                markAttendance(
                                  student.id,
                                  "Absent"
                                )
                              }
                              disabled={saving}
                            >
                              × Absent
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </section>
              </>
            )}

            {/* =================================================
                EXTRA CLASS
            ================================================= */}

            {activeTab === "extra-class" && (
              <>
                <section className="extra-hero">
                  <div>
                    <span className="extra-kicker">
                      EXTRA CLASS ATTENDANCE
                    </span>

                    <h2>
                      Extra Class Attendance
                    </h2>

                    <p>
                      Student-wise attendance for
                      Extra Classes is shown here
                      separately from regular
                      attendance.
                    </p>

                    {!isMainTeacher && (
                      <div className="extra-access-note">
                        Only students assigned to
                        you are shown.
                      </div>
                    )}
                  </div>

                  <div className="extra-hero-icon">
                    EC
                  </div>
                </section>

                <section className="extra-summary-grid">
                  <div className="extra-summary-card blue-card">
                    <span>
                      Extra Classes
                    </span>

                    <strong>
                      {extraClasses.length}
                    </strong>

                    <small>
                      Classes recorded
                    </small>
                  </div>

                  <div className="extra-summary-card green-card">
                    <span>
                      Present
                    </span>

                    <strong>
                      {extraClassPresent}
                    </strong>

                    <small>
                      Extra class attendance
                    </small>
                  </div>

                  <div className="extra-summary-card red-card">
                    <span>
                      Absent
                    </span>

                    <strong>
                      {extraClassAbsent}
                    </strong>

                    <small>
                      Extra class attendance
                    </small>
                  </div>

                  <div className="extra-summary-card purple-card">
                    <span>
                      Attendance
                    </span>

                    <strong>
                      {extraClassPercentage}%
                    </strong>

                    <small>
                      Extra Class Attendance
                    </small>
                  </div>
                </section>

                <section className="extra-filter-card">
                  <div>
                    <span className="section-kicker">
                      STUDENT SEARCH
                    </span>

                    <h2>
                      Student Extra Class
                      Records
                    </h2>

                    <p>
                      Search a student to see
                      their complete Extra Class
                      attendance.
                    </p>
                  </div>

                  <div className="extra-search">
                    <span>⌕</span>

                    <input
                      value={search}
                      onChange={(e) =>
                        setSearch(
                          e.target.value
                        )
                      }
                      placeholder="Search student by name, username or ID..."
                    />
                  </div>
                </section>

                {extraClassStudents.length ===
                0 ? (
                  <section className="extra-empty">
                    <div className="extra-empty-icon">
                      EC
                    </div>

                    <h3>
                      No Extra Class
                      Attendance Found
                    </h3>

                    <p>
                      Extra Class attendance
                      records will appear here
                      after they are created.
                    </p>
                  </section>
                ) : (
                  <section className="extra-student-grid">
                    {extraClassStudents.map(
                      ({
                        student,
                        stats,
                        records,
                      }) => (
                        <article
                          key={student.id}
                          className="extra-student-card"
                        >
                          <div className="extra-student-header">
                            <div className="extra-student-avatar">
                              {getStudentName(
                                student
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <h3>
                                {getStudentName(
                                  student
                                )}
                              </h3>

                              <div className="extra-student-meta">
                                <span>
                                  {
                                    student.student_username
                                  }
                                </span>

                                <span>
                                  Student ID:{" "}
                                  {student.id}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="unique-extra-attendance">
                            <div className="unique-label">
                              EXTRA CLASS
                              ATTENDANCE
                            </div>

                            <div className="unique-main">
                              <strong>
                                {stats.percentage}%
                              </strong>

                              <span>
                                Attendance
                              </span>
                            </div>

                            <div className="unique-line">
                              <div>
                                <b>
                                  {
                                    stats.present
                                  }
                                </b>

                                <span>
                                  Present
                                </span>
                              </div>

                              <div>
                                <b>
                                  {
                                    stats.absent
                                  }
                                </b>

                                <span>
                                  Absent
                                </span>
                              </div>

                              <div>
                                <b>
                                  {
                                    stats.total
                                  }
                                </b>

                                <span>
                                  Total
                                </span>
                              </div>
                            </div>
                          </div>

                          {records.length > 0 ? (
                            <div className="extra-records">
                              <div className="extra-records-title">
                                Recent Extra
                                Classes
                              </div>

                              {records
                                .slice(0, 5)
                                .map(
                                  (
                                    record
                                  ) => (
                                    <div
                                      key={
                                        record.id
                                      }
                                      className="extra-record-row"
                                    >
                                      <div>
                                        <strong>
                                          {formatDate(
                                            record.extra_class_date
                                          )}
                                        </strong>

                                        <span>
                                          Extra
                                          Class #
                                          {
                                            record.extra_class_id
                                          }
                                        </span>
                                      </div>

                                      <span
                                        className={
                                          record.status ===
                                          "Present"
                                            ? "extra-present"
                                            : "extra-absent"
                                        }
                                      >
                                        {record.status ===
                                        "Present"
                                          ? "✓ Present"
                                          : "× Absent"}
                                      </span>
                                    </div>
                                  )
                                )}
                            </div>
                          ) : (
                            <div className="no-extra-records">
                              No Extra Class
                              attendance
                              recorded.
                            </div>
                          )}
                        </article>
                      )
                    )}
                  </section>
                )}
              </>
            )}

            {/* =================================================
                REPORTING
            ================================================= */}

            {activeTab === "reporting" && (
              <>
                <section className="control-card">
                  <div>
                    <span className="section-kicker">
                      REPORTING
                    </span>

                    <h2>
                      Student Attendance
                      Report
                    </h2>

                    <p>
                      Regular attendance
                      statistics for every
                      student.
                    </p>
                  </div>

                  <div className="search-wrapper">
                    <span>⌕</span>

                    <input
                      value={search}
                      onChange={(e) =>
                        setSearch(
                          e.target.value
                        )
                      }
                      placeholder="Search student..."
                    />
                  </div>
                </section>

                <section className="report-grid">
                  {filteredStudents.map(
                    (student) => {
                      const stats =
                        getStudentRegularStats(
                          student.id
                        );

                      return (
                        <article
                          key={student.id}
                          className="report-card"
                        >
                          <div className="report-header">
                            <div className="report-avatar">
                              {getStudentName(
                                student
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <h3>
                                {getStudentName(
                                  student
                                )}
                              </h3>

                              <p>
                                {
                                  student.student_username
                                }{" "}
                                · ID{" "}
                                {student.id}
                              </p>
                            </div>
                          </div>

                          <div className="report-percent">
                            <strong>
                              {stats.percentage}%
                            </strong>

                            <span>
                              Regular Attendance
                            </span>
                          </div>

                          <div className="report-stats">
                            <div>
                              <b>
                                {stats.total}
                              </b>

                              <span>
                                Total
                              </span>
                            </div>

                            <div>
                              <b>
                                {stats.present}
                              </b>

                              <span>
                                Present
                              </span>
                            </div>

                            <div>
                              <b>
                                {stats.absent}
                              </b>

                              <span>
                                Absent
                              </span>
                            </div>
                          </div>
                        </article>
                      );
                    }
                  )}
                </section>
              </>
            )}

            {/* =================================================
                MONTH WISE
            ================================================= */}

            {activeTab === "month-wise" && (
              <>
                <section className="control-card">
                  <div>
                    <span className="section-kicker">
                      MONTH WISE
                    </span>

                    <h2>
                      Monthly Attendance
                    </h2>

                    <p>
                      View attendance
                      statistics month by
                      month.
                    </p>
                  </div>

                  <div className="date-picker">
                    <label>
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
                    />
                  </div>
                </section>

                <section className="stats-grid">
                  <div className="stat-card">
                    <span>Month</span>
                    <strong className="small-value">
                      {getMonthName(month)}
                    </strong>
                  </div>

                  <div className="stat-card present">
                    <span>Present</span>
                    <strong>
                      {monthPresent}
                    </strong>
                  </div>

                  <div className="stat-card absent">
                    <span>Absent</span>
                    <strong>
                      {monthAbsent}
                    </strong>
                  </div>

                  <div className="stat-card percentage">
                    <span>Attendance</span>
                    <strong>
                      {monthPercentage}%
                    </strong>
                  </div>
                </section>

                <section className="attendance-card">
                  <div className="card-heading">
                    <div>
                      <span className="section-kicker">
                        MONTHLY STUDENTS
                      </span>

                      <h2>
                        {getMonthName(
                          month
                        )}
                      </h2>
                    </div>
                  </div>

                  <div className="student-list">
                    {students.map(
                      (student) => {
                        const records =
                          monthRecords.filter(
                            (item) =>
                              item.student_id ===
                              student.id
                          );

                        const present =
                          records.filter(
                            (item) =>
                              item.status ===
                              "Present"
                          ).length;

                        const absent =
                          records.filter(
                            (item) =>
                              item.status ===
                              "Absent"
                          ).length;

                        const total =
                          present + absent;

                        const percentage =
                          total > 0
                            ? Math.round(
                                (present /
                                  total) *
                                  100
                              )
                            : 0;

                        return (
                          <div
                            key={
                              student.id
                            }
                            className="month-row"
                          >
                            <div className="avatar">
                              {getStudentName(
                                student
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="student-main">
                              <strong>
                                {getStudentName(
                                  student
                                )}
                              </strong>

                              <div className="student-meta">
                                <span>
                                  {
                                    student.student_username
                                  }
                                </span>

                                <span>
                                  ID:{" "}
                                  {
                                    student.id
                                  }
                                </span>
                              </div>
                            </div>

                            <div className="month-numbers">
                              <span className="month-present">
                                {present} Present
                              </span>

                              <span className="month-absent">
                                {absent} Absent
                              </span>

                              <strong>
                                {percentage}%
                              </strong>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </section>
              </>
            )}
          </>
        )}

        <footer className="page-footer">
          <strong>
            RACER ACADEMY
          </strong>

          <span>
            Teacher Attendance Management
          </span>
        </footer>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .attendance-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top right,
              rgba(37, 99, 235, 0.08),
              transparent 32%
            ),
            #f5f7fb;
          color: #172033;
          padding: 24px;
        }

        .page-shell {
          width: 100%;
          max-width: 1450px;
          margin: 0 auto;
        }

        .top-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 20px;
        }

        .brand-small {
          color: #2563eb;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 2px;
          margin-bottom: 6px;
        }

        .top-header h1 {
          margin: 0;
          font-size: clamp(28px, 4vw, 42px);
          line-height: 1.1;
          font-weight: 900;
          letter-spacing: -1.5px;
        }

        .top-header p {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 14px;
        }

        .access-badge {
          display: inline-flex;
          margin-top: 11px;
          padding: 7px 11px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.5px;
        }

        .access-badge.main {
          background: #dcfce7;
          color: #15803d;
        }

        .access-badge.assigned {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .header-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .secondary-button,
        .refresh-button {
          border: 1px solid #dbe2ea;
          background: white;
          color: #334155;
          border-radius: 11px;
          padding: 11px 15px;
          font-weight: 800;
          cursor: pointer;
        }

        .refresh-button {
          color: #2563eb;
          background: #eff6ff;
          border-color: #bfdbfe;
        }

        .refresh-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .message-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 13px 15px;
          margin-bottom: 15px;
          border: 1px solid #bfdbfe;
          border-radius: 13px;
          background: #eff6ff;
          color: #1d4ed8;
        }

        .message-box span {
          width: 25px;
          height: 25px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #dbeafe;
          font-weight: 900;
        }

        .message-box strong {
          flex: 1;
          font-size: 13px;
        }

        .message-box button {
          border: 0;
          background: transparent;
          color: inherit;
          font-size: 20px;
          cursor: pointer;
        }

        .tabs-card {
          display: flex;
          gap: 7px;
          padding: 7px;
          background: white;
          border: 1px solid #e5eaf1;
          border-radius: 17px;
          box-shadow: 0 8px 25px
            rgba(15, 23, 42, 0.045);
          margin-bottom: 18px;
          overflow-x: auto;
        }

        .tab {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-width: 130px;
          border: 0;
          border-radius: 11px;
          background: transparent;
          color: #64748b;
          padding: 11px 14px;
          font-weight: 850;
          cursor: pointer;
          white-space: nowrap;
        }

        .tab span {
          width: 25px;
          height: 25px;
          display: grid;
          place-items: center;
          border-radius: 7px;
          background: #f1f5f9;
          color: #64748b;
          font-size: 9px;
          font-weight: 900;
        }

        .tab.active {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .tab.active span {
          background: #2563eb;
          color: white;
        }

        .tab.extra-tab.active {
          background: #f5f3ff;
          color: #6d28d9;
        }

        .tab.extra-tab.active span {
          background: #7c3aed;
        }

        .control-card,
        .attendance-card,
        .extra-filter-card {
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid #e5eaf1;
          border-radius: 20px;
          padding: 22px;
          box-shadow: 0 10px 32px
            rgba(15, 23, 42, 0.045);
          margin-bottom: 18px;
        }

        .control-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .section-kicker {
          display: inline-block;
          color: #2563eb;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.7px;
          margin-bottom: 5px;
        }

        .control-card h2,
        .card-heading h2,
        .extra-filter-card h2 {
          margin: 0;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.5px;
        }

        .control-card p,
        .extra-filter-card p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 13px;
        }

        .control-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .present-all-button,
        .absent-all-button {
          border-radius: 10px;
          padding: 10px 13px;
          font-weight: 850;
          cursor: pointer;
          border: 1px solid;
        }

        .present-all-button {
          color: #15803d;
          background: #f0fdf4;
          border-color: #bbf7d0;
        }

        .absent-all-button {
          color: #dc2626;
          background: #fef2f2;
          border-color: #fecaca;
        }

        .control-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .date-picker {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 210px;
        }

        .date-picker label {
          font-size: 11px;
          font-weight: 900;
          color: #475569;
        }

        .date-picker input {
          border: 1px solid #dce3ec;
          border-radius: 10px;
          padding: 11px 12px;
          background: #fbfcfe;
          color: #172033;
          font: inherit;
          outline: none;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 18px;
        }

        .stat-card {
          background: white;
          border: 1px solid #e5eaf1;
          border-radius: 17px;
          padding: 18px;
          box-shadow: 0 8px 25px
            rgba(15, 23, 42, 0.035);
        }

        .stat-card span {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 7px;
        }

        .stat-card strong {
          font-size: 29px;
          font-weight: 900;
        }

        .stat-card.present strong {
          color: #15803d;
        }

        .stat-card.absent strong {
          color: #dc2626;
        }

        .stat-card.percentage strong {
          color: #2563eb;
        }

        .small-value {
          font-size: 16px !important;
        }

        .card-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 18px;
        }

        .search-wrapper,
        .extra-search {
          position: relative;
          width: 300px;
        }

        .search-wrapper span,
        .extra-search span {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 19px;
        }

        .search-wrapper input,
        .extra-search input {
          width: 100%;
          border: 1px solid #dce3ec;
          background: #fbfcfe;
          border-radius: 11px;
          padding: 11px 12px 11px 38px;
          outline: none;
          font: inherit;
        }

        .search-wrapper input:focus,
        .extra-search input:focus {
          border-color: #60a5fa;
          box-shadow: 0 0 0 4px
            rgba(37, 99, 235, 0.07);
        }

        .student-list {
          border: 1px solid #e6ebf1;
          border-radius: 15px;
          overflow: hidden;
        }

        .attendance-row,
        .month-row {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 76px;
          padding: 11px 14px;
          border-bottom: 1px solid #edf1f5;
        }

        .attendance-row:last-child,
        .month-row:last-child {
          border-bottom: 0;
        }

        .attendance-row:hover,
        .month-row:hover {
          background: #f8fafc;
        }

        .serial {
          width: 26px;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 900;
          text-align: center;
        }

        .avatar,
        .report-avatar,
        .extra-student-avatar {
          width: 43px;
          height: 43px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: linear-gradient(
            135deg,
            #dbeafe,
            #ede9fe
          );
          color: #3730a3;
          font-weight: 900;
        }

        .student-main {
          min-width: 0;
          flex: 1;
        }

        .student-main > strong {
          display: block;
          color: #1e293b;
          font-size: 14px;
          font-weight: 900;
        }

        .student-meta {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 4px;
          color: #64748b;
          font-size: 10px;
        }

        .student-meta b {
          font-weight: 900;
        }

        .marked-by {
          display: inline-block;
          margin-top: 5px;
          color: #2563eb;
          font-size: 10px;
          font-weight: 800;
        }

        .status-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-actions button {
          border-radius: 9px;
          padding: 8px 10px;
          border: 1px solid;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .status-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .status-actions .present {
          color: #15803d;
          background: #f0fdf4;
          border-color: #bbf7d0;
        }

        .status-actions .present.active {
          color: white;
          background: #16a34a;
          border-color: #16a34a;
        }

        .status-actions .absent {
          color: #dc2626;
          background: #fef2f2;
          border-color: #fecaca;
        }

        .status-actions .absent.active {
          color: white;
          background: #dc2626;
          border-color: #dc2626;
        }

        .remove-button {
          color: #64748b !important;
          background: #f8fafc !important;
          border-color: #e2e8f0 !important;
        }

        .empty-box,
        .loading-card,
        .extra-empty {
          text-align: center;
          padding: 55px 20px;
          color: #64748b;
        }

        .loading-card {
          background: white;
          border: 1px solid #e5eaf1;
          border-radius: 20px;
        }

        .loading-card h3 {
          margin: 15px 0 0;
          color: #334155;
        }

        .loading-card p {
          margin: 6px 0 0;
          font-size: 13px;
        }

        .loader {
          width: 34px;
          height: 34px;
          margin: 0 auto;
          border: 3px solid #dbeafe;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* EXTRA CLASS */

        .extra-hero {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          padding: 25px;
          margin-bottom: 16px;
          border-radius: 21px;
          background: linear-gradient(
            135deg,
            #f5f3ff,
            #eff6ff
          );
          border: 1px solid #ddd6fe;
        }

        .extra-kicker {
          display: block;
          color: #7c3aed;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.7px;
          margin-bottom: 6px;
        }

        .extra-hero h2 {
          margin: 0;
          font-size: 26px;
          font-weight: 900;
          letter-spacing: -0.7px;
        }

        .extra-hero p {
          margin: 7px 0 0;
          max-width: 700px;
          color: #64748b;
          font-size: 13px;
          line-height: 1.55;
        }

        .extra-access-note {
          display: inline-block;
          margin-top: 11px;
          padding: 7px 10px;
          border-radius: 8px;
          background: #dbeafe;
          color: #1d4ed8;
          font-size: 10px;
          font-weight: 900;
        }

        .extra-hero-icon {
          width: 76px;
          height: 76px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 21px;
          background: linear-gradient(
            135deg,
            #7c3aed,
            #4f46e5
          );
          color: white;
          font-size: 19px;
          font-weight: 900;
          box-shadow: 0 12px 25px
            rgba(124, 58, 237, 0.2);
        }

        .extra-summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 18px;
        }

        .extra-summary-card {
          min-height: 125px;
          padding: 18px;
          border-radius: 17px;
          border: 1px solid;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .extra-summary-card span {
          font-size: 11px;
          font-weight: 900;
        }

        .extra-summary-card strong {
          margin-top: 4px;
          font-size: 30px;
          line-height: 1;
          font-weight: 900;
        }

        .extra-summary-card small {
          margin-top: 7px;
          font-size: 10px;
          font-weight: 700;
          opacity: 0.75;
        }

        .blue-card {
          background: #eff6ff;
          border-color: #bfdbfe;
          color: #1d4ed8;
        }

        .green-card {
          background: #f0fdf4;
          border-color: #bbf7d0;
          color: #15803d;
        }

        .red-card {
          background: #fef2f2;
          border-color: #fecaca;
          color: #dc2626;
        }

        .purple-card {
          background: #f5f3ff;
          border-color: #ddd6fe;
          color: #6d28d9;
        }

        .extra-filter-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .extra-search {
          width: 360px;
        }

        .extra-student-grid {
          display: grid;
          grid-template-columns: repeat(
            2,
            minmax(0, 1fr)
          );
          gap: 15px;
        }

        .extra-student-card {
          background: white;
          border: 1px solid #e5eaf1;
          border-radius: 20px;
          padding: 18px;
          box-shadow: 0 9px 30px
            rgba(15, 23, 42, 0.045);
        }

        .extra-student-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 15px;
        }

        .extra-student-header h3 {
          margin: 0;
          color: #172033;
          font-size: 16px;
          font-weight: 900;
        }

        .extra-student-meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 5px;
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
        }

        .unique-extra-attendance {
          padding: 16px;
          border-radius: 17px;
          background:
            radial-gradient(
              circle at top right,
              rgba(124, 58, 237, 0.12),
              transparent 45%
            ),
            #f8f7ff;
          border: 1px solid #e4ddff;
        }

        .unique-label {
          color: #7c3aed;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }

        .unique-main {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-top: 6px;
        }

        .unique-main strong {
          color: #5b21b6;
          font-size: 36px;
          line-height: 1;
          font-weight: 950;
        }

        .unique-main span {
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
        }

        .unique-line {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 14px;
        }

        .unique-line div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .unique-line b {
          color: #334155;
          font-size: 16px;
          font-weight: 900;
        }

        .unique-line span {
          color: #94a3b8;
          font-size: 9px;
          font-weight: 800;
        }

        .extra-records {
          margin-top: 15px;
        }

        .extra-records-title {
          margin-bottom: 7px;
          color: #475569;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.7px;
        }

        .extra-record-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding: 9px 0;
          border-top: 1px solid #edf1f5;
        }

        .extra-record-row div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .extra-record-row strong {
          color: #334155;
          font-size: 11px;
        }

        .extra-record-row span {
          color: #94a3b8;
          font-size: 9px;
        }

        .extra-present,
        .extra-absent {
          font-weight: 900 !important;
          font-size: 10px !important;
        }

        .extra-present {
          color: #15803d !important;
        }

        .extra-absent {
          color: #dc2626 !important;
        }

        .no-extra-records {
          margin-top: 14px;
          padding: 11px;
          border-radius: 9px;
          background: #f8fafc;
          color: #94a3b8;
          text-align: center;
          font-size: 10px;
          font-weight: 800;
        }

        .extra-empty {
          background: white;
          border: 1px solid #e5eaf1;
          border-radius: 20px;
        }

        .extra-empty-icon {
          width: 65px;
          height: 65px;
          display: grid;
          place-items: center;
          margin: 0 auto;
          border-radius: 18px;
          background: #f5f3ff;
          color: #7c3aed;
          font-weight: 900;
        }

        .extra-empty h3 {
          margin: 14px 0 0;
          color: #334155;
        }

        .extra-empty p {
          margin: 7px 0 0;
          font-size: 12px;
        }

        /* REPORT */

        .report-grid {
          display: grid;
          grid-template-columns: repeat(
            3,
            minmax(0, 1fr)
          );
          gap: 14px;
        }

        .report-card {
          background: white;
          border: 1px solid #e5eaf1;
          border-radius: 18px;
          padding: 17px;
          box-shadow: 0 8px 25px
            rgba(15, 23, 42, 0.04);
        }

        .report-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .report-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 900;
        }

        .report-header p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 9px;
        }

        .report-percent {
          margin: 17px 0;
          padding: 15px;
          border-radius: 13px;
          background: #eff6ff;
        }

        .report-percent strong {
          display: block;
          color: #1d4ed8;
          font-size: 29px;
          font-weight: 900;
        }

        .report-percent span {
          color: #64748b;
          font-size: 10px;
          font-weight: 800;
        }

        .report-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .report-stats div {
          text-align: center;
          padding: 9px 5px;
          border-radius: 9px;
          background: #f8fafc;
        }

        .report-stats b {
          display: block;
          color: #334155;
          font-size: 16px;
        }

        .report-stats span {
          color: #94a3b8;
          font-size: 9px;
          font-weight: 800;
        }

        /* MONTH */

        .month-numbers {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .month-numbers span {
          font-size: 10px;
          font-weight: 900;
        }

        .month-present {
          color: #15803d;
        }

        .month-absent {
          color: #dc2626;
        }

        .month-numbers strong {
          min-width: 45px;
          color: #2563eb;
          font-size: 17px;
          font-weight: 900;
          text-align: right;
        }

        .page-footer {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          padding: 12px 0 20px;
          color: #94a3b8;
          font-size: 10px;
        }

        .page-footer strong {
          color: #64748b;
          letter-spacing: 1px;
        }

        @media (max-width: 1050px) {
          .stats-grid,
          .extra-summary-grid {
            grid-template-columns: repeat(
              2,
              1fr
            );
          }

          .extra-student-grid {
            grid-template-columns: 1fr;
          }

          .report-grid {
            grid-template-columns: repeat(
              2,
              1fr
            );
          }
        }

        @media (max-width: 760px) {
          .attendance-page {
            padding: 12px;
          }

          .top-header,
          .control-card,
          .extra-filter-card {
            flex-direction: column;
            align-items: stretch;
          }

          .header-actions {
            width: 100%;
          }

          .header-actions button {
            flex: 1;
          }

          .tabs-card {
            overflow-x: auto;
          }

          .tab {
            min-width: 115px;
          }

          .control-actions {
            width: 100%;
          }

          .control-actions button {
            flex: 1;
          }

          .stats-grid,
          .extra-summary-grid,
          .report-grid {
            grid-template-columns: repeat(
              2,
              1fr
            );
          }

          .card-heading {
            flex-direction: column;
          }

          .search-wrapper,
          .extra-search {
            width: 100%;
          }

          .status-actions {
            flex-wrap: wrap;
          }

          .attendance-row,
          .month-row {
            align-items: flex-start;
          }

          .month-numbers {
            flex-direction: column;
            align-items: flex-end;
            gap: 4px;
          }

          .extra-hero {
            align-items: flex-start;
          }

          .extra-hero-icon {
            width: 58px;
            height: 58px;
          }
        }

        @media (max-width: 500px) {
          .stats-grid,
          .extra-summary-grid,
          .report-grid {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }

          .stat-card {
            padding: 13px;
          }

          .stat-card strong {
            font-size: 22px;
          }

          .extra-summary-card {
            min-height: 105px;
            padding: 13px;
          }

          .extra-summary-card strong {
            font-size: 24px;
          }

          .attendance-row {
            flex-wrap: wrap;
          }

          .serial {
            display: none;
          }

          .student-main {
            min-width: calc(
              100% - 60px
            );
          }

          .status-actions {
            width: 100%;
            padding-left: 55px;
          }

          .status-actions button {
            flex: 1;
          }

          .remove-button {
            flex: 0 !important;
          }

          .unique-line {
            gap: 4px;
          }

          .unique-main strong {
            font-size: 31px;
          }

          .month-numbers {
            margin-left: auto;
          }

          .page-footer {
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}