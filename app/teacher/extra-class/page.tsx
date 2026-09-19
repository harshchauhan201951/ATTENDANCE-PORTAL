"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Student = {
  id: number;
  student_name?: string | null;
  student_username?: string | null;
  father_name?: string | null;
  mother_name?: string | null;
  admission_date?: string | null;
  date_of_birth?: string | null;
};

type Status = "Present" | "Absent";

type ExtraClass = {
  id: number;
  class_date: string;
  class_time: string | null;
  subject: string | null;
  topic: string | null;
  remarks: string | null;
  created_at?: string;
};

type ExtraClassAttendance = {
  id: number;
  extra_class_id: number;
  student_id: number;
  extra_class_date: string;
  class_time: string | null;
  subject: string | null;
  topic: string | null;
  status: Status;
  remarks: string | null;
  created_at?: string;
};

type StatusMap = Record<number, Status>;

function getStudentName(student: Student) {
  return student.student_name?.trim() || `Student #${student.id}`;
}

function getStudentUsername(student: Student) {
  return student.student_username?.trim() || "No username";
}

function formatDate(date: string) {
  if (!date) return "-";

  const d = new Date(`${date}T00:00:00`);

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(time: string | null) {
  if (!time) return "-";

  const [hourString, minute] = time.split(":");
  const hour = Number(hourString);

  if (Number.isNaN(hour)) return time;

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minute} ${suffix}`;
}

function getMonthName(monthValue: string) {
  if (!monthValue) return "";

  const date = new Date(`${monthValue}-01T00:00:00`);

  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export default function ExtraClassPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ExtraClass[]>([]);
  const [attendance, setAttendance] = useState<ExtraClassAttendance[]>([]);

  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

  const [classDate, setClassDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [classTime, setClassTime] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [remarks, setRemarks] = useState("");

  const [studentSearch, setStudentSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");

  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [statusMap, setStatusMap] = useState<StatusMap>({});

  const [historyMonth, setHistoryMonth] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | "info"
  >("info");

  const isEditing = selectedClassId !== null;

  // ---------------------------------------------------------
  // LOAD DATA
  // ---------------------------------------------------------

  async function loadData() {
    try {
      setLoading(true);

      const [studentsResult, classesResult, attendanceResult] =
        await Promise.all([
          supabase
            .from("students")
            .select("*")
            .order("id", { ascending: true }),

          supabase
            .from("extra_classes")
            .select("*")
            .order("class_date", { ascending: false })
            .order("id", { ascending: false }),

          supabase
            .from("extra_class_attendance")
            .select("*")
            .order("id", { ascending: true }),
        ]);

      if (studentsResult.error) {
        throw new Error(studentsResult.error.message);
      }

      if (classesResult.error) {
        throw new Error(classesResult.error.message);
      }

      if (attendanceResult.error) {
        throw new Error(attendanceResult.error.message);
      }

      setStudents((studentsResult.data || []) as Student[]);
      setClasses((classesResult.data || []) as ExtraClass[]);
      setAttendance(
        (attendanceResult.data || []) as ExtraClassAttendance[]
      );
    } catch (error) {
      console.error("Extra class load error:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load Extra Class data."
      );

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // ---------------------------------------------------------
  // MESSAGE
  // ---------------------------------------------------------

  function showMessage(
    text: string,
    type: "success" | "error" | "info" = "info"
  ) {
    setMessage(text);
    setMessageType(type);

    window.setTimeout(() => {
      setMessage("");
    }, 4500);
  }

  // ---------------------------------------------------------
  // NEW CLASS
  // ---------------------------------------------------------

  function startNewClass() {
    setSelectedClassId(null);

    setClassDate(new Date().toISOString().split("T")[0]);
    setClassTime("");
    setSubject("");
    setTopic("");
    setRemarks("");

    setStudentSearch("");
    setSelectedStudents([]);

    const newStatusMap: StatusMap = {};

    students.forEach((student) => {
      newStatusMap[student.id] = "Present";
    });

    setStatusMap(newStatusMap);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // ---------------------------------------------------------
  // EDIT CLASS
  // ---------------------------------------------------------

  function editClass(extraClass: ExtraClass) {
    const classAttendance = attendance.filter(
      (item) => item.extra_class_id === extraClass.id
    );

    setSelectedClassId(extraClass.id);

    setClassDate(extraClass.class_date);
    setClassTime(extraClass.class_time || "");
    setSubject(extraClass.subject || "");
    setTopic(extraClass.topic || "");
    setRemarks(extraClass.remarks || "");

    const studentIds = classAttendance.map((item) => item.student_id);

    setSelectedStudents(studentIds);

    const newStatusMap: StatusMap = {};

    students.forEach((student) => {
      const record = classAttendance.find(
        (item) => item.student_id === student.id
      );

      newStatusMap[student.id] = record?.status || "Absent";
    });

    setStatusMap(newStatusMap);
    setStudentSearch("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // ---------------------------------------------------------
  // STUDENT FILTER
  // ---------------------------------------------------------

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();

    if (!query) return students;

    return students.filter((student) => {
      const name = getStudentName(student).toLowerCase();

      const username = (
        student.student_username || ""
      ).toLowerCase();

      const id = String(student.id);

      return (
        name.includes(query) ||
        username.includes(query) ||
        id.includes(query)
      );
    });
  }, [students, studentSearch]);

  // ---------------------------------------------------------
  // STUDENT SELECTION
  // ---------------------------------------------------------

  function toggleStudent(studentId: number) {
    setSelectedStudents((current) => {
      if (current.includes(studentId)) {
        return current.filter((id) => id !== studentId);
      }

      return [...current, studentId];
    });

    setStatusMap((current) => ({
      ...current,
      [studentId]: current[studentId] || "Present",
    }));
  }

  function selectAllFilteredStudents() {
    const ids = filteredStudents.map((student) => student.id);

    setSelectedStudents((current) => {
      return Array.from(new Set([...current, ...ids]));
    });

    setStatusMap((current) => {
      const updated = { ...current };

      ids.forEach((id) => {
        updated[id] = updated[id] || "Present";
      });

      return updated;
    });
  }

  function deselectAllFilteredStudents() {
    const ids = new Set(
      filteredStudents.map((student) => student.id)
    );

    setSelectedStudents((current) =>
      current.filter((id) => !ids.has(id))
    );
  }

  // ---------------------------------------------------------
  // ATTENDANCE
  // ---------------------------------------------------------

  function updateStatus(studentId: number, status: Status) {
    setStatusMap((current) => ({
      ...current,
      [studentId]: status,
    }));
  }

  function markAllPresent() {
    setStatusMap((current) => {
      const updated = { ...current };

      selectedStudents.forEach((studentId) => {
        updated[studentId] = "Present";
      });

      return updated;
    });
  }

  function markAllAbsent() {
    setStatusMap((current) => {
      const updated = { ...current };

      selectedStudents.forEach((studentId) => {
        updated[studentId] = "Absent";
      });

      return updated;
    });
  }

  // ---------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------

  const selectedTotal = selectedStudents.length;

  const selectedPresent = selectedStudents.filter(
    (id) => statusMap[id] === "Present"
  ).length;

  const selectedAbsent = selectedStudents.filter(
    (id) => statusMap[id] === "Absent"
  ).length;

  const selectedPercentage =
    selectedTotal > 0
      ? Math.round((selectedPresent / selectedTotal) * 100)
      : 0;

  // ---------------------------------------------------------
  // SAVE CLASS
  // ---------------------------------------------------------

  async function saveClass() {
    if (!classDate) {
      showMessage("Please select Extra Class date.", "error");
      return;
    }

    if (!subject.trim()) {
      showMessage("Please enter subject.", "error");
      return;
    }

    if (!topic.trim()) {
      showMessage("Please enter topic.", "error");
      return;
    }

    if (selectedStudents.length === 0) {
      showMessage(
        "Please select at least one student.",
        "error"
      );
      return;
    }

    try {
      setSaving(true);

      let classId = selectedClassId;

      // -----------------------------------------------------
      // CREATE CLASS
      // -----------------------------------------------------

      if (!classId) {
        const { data, error } = await supabase
          .from("extra_classes")
          .insert({
            class_date: classDate,
            class_time: classTime || null,
            subject: subject.trim(),
            topic: topic.trim(),
            remarks: remarks.trim() || null,
          })
          .select("*")
          .single();

        if (error) {
          throw new Error(error.message);
        }

        classId = data.id;
      } else {
        // ---------------------------------------------------
        // UPDATE CLASS
        // ---------------------------------------------------

        const { error } = await supabase
          .from("extra_classes")
          .update({
            class_date: classDate,
            class_time: classTime || null,
            subject: subject.trim(),
            topic: topic.trim(),
            remarks: remarks.trim() || null,
          })
          .eq("id", classId);

        if (error) {
          throw new Error(error.message);
        }

        const { error: deleteAttendanceError } = await supabase
          .from("extra_class_attendance")
          .delete()
          .eq("extra_class_id", classId);

        if (deleteAttendanceError) {
          throw new Error(deleteAttendanceError.message);
        }
      }

      // -----------------------------------------------------
      // INSERT ATTENDANCE
      // -----------------------------------------------------

      const attendanceRows = selectedStudents.map((studentId) => ({
        extra_class_id: classId,
        student_id: studentId,
        extra_class_date: classDate,
        class_time: classTime || null,
        subject: subject.trim(),
        topic: topic.trim(),
        status: statusMap[studentId] || "Absent",
        remarks: remarks.trim() || null,
      }));

      const { error: attendanceInsertError } = await supabase
        .from("extra_class_attendance")
        .insert(attendanceRows);

      if (attendanceInsertError) {
        throw new Error(attendanceInsertError.message);
      }

      showMessage(
        isEditing
          ? "Extra Class updated successfully."
          : "Extra Class created successfully.",
        "success"
      );

      // Reload data before editing the saved class.
      await loadData();

      if (classId !== null) {
        setSelectedClassId(classId);

        const savedClass =
          classes.find((item) => item.id === classId) || {
            id: classId,
            class_date: classDate,
            class_time: classTime || null,
            subject: subject.trim(),
            topic: topic.trim(),
            remarks: remarks.trim() || null,
          };

        setTimeout(() => {
          editClass(savedClass);
        }, 150);
      }
    } catch (error) {
      console.error("Save extra class error:", error);

      showMessage(
        error instanceof Error
          ? error.message
          : "Unable to save Extra Class.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------
  // DELETE CLASS
  // ---------------------------------------------------------

  async function deleteClass(extraClass: ExtraClass) {
    const confirmed = window.confirm(
      `Delete this Extra Class?\n\n${
        extraClass.subject || "Extra Class"
      }\n${extraClass.topic || ""}\n${formatDate(
        extraClass.class_date
      )} ${
        extraClass.class_time
          ? `at ${formatTime(extraClass.class_time)}`
          : ""
      }\n\nIts attendance records will also be deleted.`
    );

    if (!confirmed) return;

    try {
      setDeleting(true);

      const { error } = await supabase
        .from("extra_classes")
        .delete()
        .eq("id", extraClass.id);

      if (error) {
        throw new Error(error.message);
      }

      if (selectedClassId === extraClass.id) {
        startNewClass();
      }

      await loadData();

      showMessage(
        "Extra Class deleted successfully.",
        "success"
      );
    } catch (error) {
      console.error("Delete extra class error:", error);

      showMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete Extra Class.",
        "error"
      );
    } finally {
      setDeleting(false);
    }
  }

  // ---------------------------------------------------------
  // HISTORY
  // ---------------------------------------------------------

  const availableMonths = useMemo(() => {
    const months = Array.from(
      new Set(
        classes.map((item) =>
          item.class_date.slice(0, 7)
        )
      )
    );

    return months.sort((a, b) => b.localeCompare(a));
  }, [classes]);

  useEffect(() => {
    if (!historyMonth && availableMonths.length > 0) {
      setHistoryMonth(availableMonths[0]);
    }
  }, [availableMonths, historyMonth]);

  const historyClasses = useMemo(() => {
    let result = classes;

    if (historyMonth) {
      result = result.filter(
        (item) =>
          item.class_date.slice(0, 7) === historyMonth
      );
    }

    const query = historySearch.trim().toLowerCase();

    if (query) {
      result = result.filter((item) => {
        return (
          (item.subject || "")
            .toLowerCase()
            .includes(query) ||
          (item.topic || "")
            .toLowerCase()
            .includes(query) ||
          (item.remarks || "")
            .toLowerCase()
            .includes(query) ||
          item.class_date.includes(query)
        );
      });
    }

    return result;
  }, [classes, historyMonth, historySearch]);

  function getClassAttendance(classId: number) {
    return attendance.filter(
      (item) => item.extra_class_id === classId
    );
  }

  function getClassStats(classId: number) {
    const classAttendance =
      getClassAttendance(classId);

    const total = classAttendance.length;

    const present = classAttendance.filter(
      (item) => item.status === "Present"
    ).length;

    const absent = classAttendance.filter(
      (item) => item.status === "Absent"
    ).length;

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

  // ---------------------------------------------------------
  // CLASS VIEW
  // ---------------------------------------------------------

  function viewClass(extraClass: ExtraClass) {
    editClass(extraClass);
  }

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <main className="extra-page">
      <div className="page-shell">
        {/* HEADER */}
        <header className="top-header">
          <div>
            <div className="brand-small">
              RACER ACADEMY
            </div>

            <h1>Extra Classes</h1>

            <p>
              Create extra classes, select students and
              manage attendance class-wise.
            </p>
          </div>

          <div className="header-actions">
            <a
              href="/teacher"
              className="back-button"
            >
              ← Teacher Dashboard
            </a>

            <button
              type="button"
              className="new-class-button"
              onClick={startNewClass}
            >
              ＋ New Extra Class
            </button>
          </div>
        </header>

        {/* MESSAGE */}
        {message && (
          <div className={`message ${messageType}`}>
            <span>
              {messageType === "success"
                ? "✓"
                : messageType === "error"
                ? "!"
                : "i"}
            </span>

            <p>{message}</p>

            <button
              type="button"
              onClick={() => setMessage("")}
              aria-label="Close message"
            >
              ×
            </button>
          </div>
        )}

        {/* CREATE / EDIT CLASS */}
        <section className="create-card">
          <div className="section-heading">
            <div>
              <span className="section-kicker">
                {isEditing
                  ? "EDIT MODE"
                  : "CREATE MODE"}
              </span>

              <h2>
                {isEditing
                  ? "Edit Extra Class"
                  : "Create New Extra Class"}
              </h2>

              <p>
                First create the class details, then
                select the students who attended this
                Extra Class.
              </p>
            </div>

            {isEditing && (
              <button
                type="button"
                className="cancel-edit"
                onClick={startNewClass}
              >
                + Create New
              </button>
            )}
          </div>

          <div className="details-grid">
            <label className="field">
              <span>Date *</span>

              <input
                type="date"
                value={classDate}
                onChange={(e) =>
                  setClassDate(e.target.value)
                }
              />
            </label>

            <label className="field">
              <span>Time</span>

              <input
                type="time"
                value={classTime}
                onChange={(e) =>
                  setClassTime(e.target.value)
                }
              />
            </label>

            <label className="field">
              <span>Subject *</span>

              <input
                type="text"
                value={subject}
                onChange={(e) =>
                  setSubject(e.target.value)
                }
                placeholder="e.g. Mathematics"
              />
            </label>

            <label className="field">
              <span>Topic *</span>

              <input
                type="text"
                value={topic}
                onChange={(e) =>
                  setTopic(e.target.value)
                }
                placeholder="e.g. Trigonometry"
              />
            </label>

            <label className="field full-width">
              <span>Remarks / Instructions</span>

              <textarea
                value={remarks}
                onChange={(e) =>
                  setRemarks(e.target.value)
                }
                placeholder="Extra class instructions, homework, important notes..."
                rows={3}
              />
            </label>
          </div>
        </section>

        {/* SUMMARY */}
        <section className="summary-grid">
          <div className="summary-card">
            <div className="summary-icon blue">
              👨‍🎓
            </div>

            <div>
              <span>Selected</span>
              <strong>{selectedTotal}</strong>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon green">
              ✓
            </div>

            <div>
              <span>Present</span>
              <strong>{selectedPresent}</strong>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon red">
              ×
            </div>

            <div>
              <span>Absent</span>
              <strong>{selectedAbsent}</strong>
            </div>
          </div>

          <div className="summary-card percentage-card">
            <div className="circle-progress">
              <svg viewBox="0 0 42 42">
                <circle
                  className="circle-bg"
                  cx="21"
                  cy="21"
                  r="15.9155"
                />

                <circle
                  className="circle-value"
                  cx="21"
                  cy="21"
                  r="15.9155"
                  strokeDasharray={`${selectedPercentage} ${
                    100 - selectedPercentage
                  }`}
                  strokeDashoffset="25"
                />
              </svg>

              <strong>{selectedPercentage}%</strong>
            </div>

            <div>
              <span>Attendance</span>

              <strong className="percentage-number">
                {selectedPercentage}%
              </strong>
            </div>
          </div>
        </section>

        {/* STUDENTS */}
        <section className="attendance-card">
          <div className="section-heading student-heading">
            <div>
              <span className="section-kicker">
                STEP 2
              </span>

              <h2>
                Select Students & Attendance
              </h2>

              <p>
                Select only the students who attended
                this Extra Class.
              </p>
            </div>

            <div className="attendance-actions">
              <button
                type="button"
                className="present-all"
                onClick={markAllPresent}
                disabled={selectedTotal === 0}
              >
                ✓ All Present
              </button>

              <button
                type="button"
                className="absent-all"
                onClick={markAllAbsent}
                disabled={selectedTotal === 0}
              >
                × All Absent
              </button>
            </div>
          </div>

          <div className="student-toolbar">
            <div className="search-box">
              <span>⌕</span>

              <input
                type="text"
                value={studentSearch}
                onChange={(e) =>
                  setStudentSearch(e.target.value)
                }
                placeholder="Search student by name, username or ID..."
              />

              {studentSearch && (
                <button
                  type="button"
                  onClick={() =>
                    setStudentSearch("")
                  }
                >
                  ×
                </button>
              )}
            </div>

            <div className="selection-actions">
              <button
                type="button"
                onClick={
                  selectAllFilteredStudents
                }
                disabled={
                  filteredStudents.length === 0
                }
              >
                Select All
              </button>

              <button
                type="button"
                onClick={
                  deselectAllFilteredStudents
                }
                disabled={
                  filteredStudents.length === 0
                }
              >
                Clear
              </button>
            </div>
          </div>

          <div className="selection-info">
            <span>
              <strong>{selectedTotal}</strong>{" "}
              students selected
            </span>

            <span>
              Showing{" "}
              <strong>
                {filteredStudents.length}
              </strong>{" "}
              of{" "}
              <strong>{students.length}</strong>
            </span>
          </div>

          {loading ? (
            <div className="loading-box">
              <div className="loader" />

              <p>Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="empty-box">
              <div>👨‍🎓</div>

              <h3>No students found</h3>

              <p>
                Try another search.
              </p>
            </div>
          ) : (
            <div className="students-list">
              {filteredStudents.map(
                (student, index) => {
                  const selected =
                    selectedStudents.includes(
                      student.id
                    );

                  const status =
                    statusMap[student.id] ||
                    "Present";

                  const studentName =
                    getStudentName(student);

                  const studentUsername =
                    getStudentUsername(student);

                  return (
                    <div
                      key={student.id}
                      className={`student-row ${
                        selected
                          ? "selected"
                          : ""
                      }`}
                    >
                      <button
                        type="button"
                        className="student-select-area"
                        onClick={() =>
                          toggleStudent(
                            student.id
                          )
                        }
                      >
                        <div className="student-checkbox">
                          {selected ? "✓" : ""}
                        </div>

                        <div className="student-avatar">
                          {studentName
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="student-information">
                          <strong>
                            {studentName}
                          </strong>

                          <div className="student-details">
                            <span className="student-username">
                              Username:{" "}
                              <b>
                                {studentUsername}
                              </b>
                            </span>

                            <span className="student-id">
                              Student ID:{" "}
                              <b>{student.id}</b>
                            </span>
                          </div>
                        </div>

                        <span className="serial-number">
                          #{index + 1}
                        </span>
                      </button>

                      {selected && (
                        <div className="status-buttons">
                          <button
                            type="button"
                            className={
                              status === "Present"
                                ? "status-present active"
                                : "status-present"
                            }
                            onClick={() =>
                              updateStatus(
                                student.id,
                                "Present"
                              )
                            }
                          >
                            ✓ Present
                          </button>

                          <button
                            type="button"
                            className={
                              status === "Absent"
                                ? "status-absent active"
                                : "status-absent"
                            }
                            onClick={() =>
                              updateStatus(
                                student.id,
                                "Absent"
                              )
                            }
                          >
                            × Absent
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}

          {/* SAVE */}
          <div className="save-area">
            <div>
              <strong>
                {isEditing
                  ? "Ready to update this Extra Class?"
                  : "Ready to save this Extra Class?"}
              </strong>

              <span>
                {selectedTotal} students ·{" "}
                {selectedPresent} present ·{" "}
                {selectedAbsent} absent
              </span>
            </div>

            <button
              type="button"
              className="save-button"
              onClick={saveClass}
              disabled={saving || loading}
            >
              {saving
                ? "Saving..."
                : isEditing
                ? "✓ Update Extra Class"
                : "✓ Save Extra Class"}
            </button>
          </div>
        </section>

        {/* HISTORY */}
        <section className="history-card">
          <div className="section-heading">
            <div>
              <span className="section-kicker">
                HISTORY
              </span>

              <h2>Extra Class History</h2>

              <p>
                Every Extra Class is shown separately,
                even when multiple classes happen on
                the same date.
              </p>
            </div>

            <div className="history-count">
              {historyClasses.length}{" "}
              {historyClasses.length === 1
                ? "Class"
                : "Classes"}
            </div>
          </div>

          <div className="history-toolbar">
            <select
              value={historyMonth}
              onChange={(e) =>
                setHistoryMonth(e.target.value)
              }
            >
              <option value="">
                All Months
              </option>

              {availableMonths.map((month) => (
                <option
                  key={month}
                  value={month}
                >
                  {getMonthName(month)}
                </option>
              ))}
            </select>

            <div className="history-search">
              <span>⌕</span>

              <input
                type="text"
                value={historySearch}
                onChange={(e) =>
                  setHistorySearch(e.target.value)
                }
                placeholder="Search subject, topic or date..."
              />
            </div>
          </div>

          {historyClasses.length === 0 ? (
            <div className="empty-history">
              <div className="empty-history-icon">
                📚
              </div>

              <h3>No Extra Classes Found</h3>

              <p>
                Create your first Extra Class and its
                history will appear here.
              </p>
            </div>
          ) : (
            <div className="history-list">
              {historyClasses.map(
                (extraClass) => {
                  const stats =
                    getClassStats(
                      extraClass.id
                    );

                  return (
                    <article
                      key={extraClass.id}
                      className="history-class"
                    >
                      <div className="history-date">
                        <span>
                          {new Date(
                            `${extraClass.class_date}T00:00:00`
                          ).toLocaleDateString(
                            "en-IN",
                            {
                              weekday: "short",
                            }
                          )}
                        </span>

                        <strong>
                          {new Date(
                            `${extraClass.class_date}T00:00:00`
                          ).getDate()}
                        </strong>

                        <small>
                          {new Date(
                            `${extraClass.class_date}T00:00:00`
                          ).toLocaleDateString(
                            "en-IN",
                            {
                              month: "short",
                            }
                          )}
                        </small>
                      </div>

                      <div className="history-main">
                        <div className="history-title-row">
                          <div>
                            <div className="history-subject">
                              {extraClass.subject ||
                                "Extra Class"}
                            </div>

                            <h3>
                              {extraClass.topic ||
                                "No topic"}
                            </h3>
                          </div>

                          <span className="class-id">
                            CLASS #
                            {extraClass.id}
                          </span>
                        </div>

                        <div className="history-meta">
                          <span>
                            🕐{" "}
                            {formatTime(
                              extraClass.class_time
                            )}
                          </span>

                          <span>
                            👨‍🎓 {stats.total} Students
                          </span>

                          <span className="meta-present">
                            ✓ {stats.present} Present
                          </span>

                          <span className="meta-absent">
                            × {stats.absent} Absent
                          </span>
                        </div>

                        {extraClass.remarks && (
                          <div className="history-remarks">
                            <strong>
                              Note:
                            </strong>{" "}
                            {extraClass.remarks}
                          </div>
                        )}

                        <div className="history-bottom">
                          <div className="history-progress">
                            <div className="progress-track">
                              <div
                                className="progress-fill"
                                style={{
                                  width: `${stats.percentage}%`,
                                }}
                              />
                            </div>

                            <strong>
                              {stats.percentage}%
                              Attendance
                            </strong>
                          </div>

                          <div className="history-actions">
                            <button
                              type="button"
                              className="view-button"
                              onClick={() =>
                                viewClass(
                                  extraClass
                                )
                              }
                            >
                              View / Edit
                            </button>

                            <button
                              type="button"
                              className="delete-button"
                              onClick={() =>
                                deleteClass(
                                  extraClass
                                )
                              }
                              disabled={deleting}
                            >
                              🗑 Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* FOOTER */}
        <footer className="page-footer">
          <strong>RACER ACADEMY</strong>

          <span>
            Extra Class Management System
          </span>
        </footer>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .extra-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top right,
              rgba(37, 99, 235, 0.09),
              transparent 30%
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
          gap: 24px;
          margin-bottom: 24px;
        }

        .brand-small {
          color: #2563eb;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 2px;
          margin-bottom: 7px;
        }

        .top-header h1 {
          margin: 0;
          font-size: clamp(28px, 4vw, 42px);
          line-height: 1.1;
          font-weight: 900;
          letter-spacing: -1.5px;
        }

        .top-header p {
          margin: 9px 0 0;
          color: #64748b;
          font-size: 14px;
        }

        .header-actions {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .back-button,
        .new-class-button,
        .cancel-edit {
          border-radius: 12px;
          padding: 12px 16px;
          font-weight: 800;
          text-decoration: none;
          border: 1px solid #dbe2ea;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .back-button {
          background: #fff;
          color: #334155;
        }

        .back-button:hover {
          background: #f8fafc;
          transform: translateY(-1px);
        }

        .new-class-button {
          border: 0;
          background: linear-gradient(
            135deg,
            #2563eb,
            #4f46e5
          );
          color: white;
          box-shadow: 0 10px 25px
            rgba(37, 99, 235, 0.22);
        }

        .new-class-button:hover {
          transform: translateY(-2px);
        }

        .message {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 13px 15px;
          border-radius: 14px;
          margin-bottom: 18px;
          border: 1px solid;
        }

        .message span {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-weight: 900;
        }

        .message p {
          flex: 1;
          margin: 0;
          font-size: 14px;
          font-weight: 700;
        }

        .message button {
          border: 0;
          background: transparent;
          cursor: pointer;
          font-size: 20px;
          color: inherit;
        }

        .message.success {
          background: #ecfdf5;
          border-color: #a7f3d0;
          color: #047857;
        }

        .message.success span {
          background: #d1fae5;
        }

        .message.error {
          background: #fef2f2;
          border-color: #fecaca;
          color: #b91c1c;
        }

        .message.error span {
          background: #fee2e2;
        }

        .message.info {
          background: #eff6ff;
          border-color: #bfdbfe;
          color: #1d4ed8;
        }

        .message.info span {
          background: #dbeafe;
        }

        .create-card,
        .attendance-card,
        .history-card {
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid #e5eaf1;
          border-radius: 22px;
          padding: 24px;
          box-shadow: 0 12px 40px
            rgba(15, 23, 42, 0.055);
          margin-bottom: 20px;
        }

        .section-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        .section-kicker {
          display: inline-block;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.8px;
          color: #2563eb;
          margin-bottom: 6px;
        }

        .section-heading h2 {
          margin: 0;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.5px;
        }

        .section-heading p {
          margin: 7px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
        }

        .cancel-edit {
          background: #eff6ff;
          color: #1d4ed8;
          border-color: #bfdbfe;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(
            4,
            minmax(0, 1fr)
          );
          gap: 16px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field.full-width {
          grid-column: 1 / -1;
        }

        .field span {
          font-size: 12px;
          font-weight: 900;
          color: #475569;
        }

        .field input,
        .field textarea,
        .history-toolbar select,
        .search-box input,
        .history-search input {
          width: 100%;
          border: 1px solid #dce3ec;
          background: #fbfcfe;
          color: #172033;
          border-radius: 12px;
          padding: 12px 13px;
          outline: none;
          font: inherit;
          transition: 0.2s ease;
        }

        .field input:focus,
        .field textarea:focus,
        .history-toolbar select:focus,
        .search-box input:focus,
        .history-search input:focus {
          border-color: #60a5fa;
          background: white;
          box-shadow: 0 0 0 4px
            rgba(37, 99, 235, 0.08);
        }

        .field textarea {
          resize: vertical;
          min-height: 82px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(
            4,
            minmax(0, 1fr)
          );
          gap: 14px;
          margin-bottom: 20px;
        }

        .summary-card {
          display: flex;
          align-items: center;
          gap: 13px;
          min-height: 100px;
          padding: 18px;
          background: white;
          border: 1px solid #e5eaf1;
          border-radius: 18px;
          box-shadow: 0 10px 28px
            rgba(15, 23, 42, 0.045);
        }

        .summary-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          font-size: 21px;
          font-weight: 900;
          flex-shrink: 0;
        }

        .summary-icon.blue {
          background: #dbeafe;
          color: #2563eb;
        }

        .summary-icon.green {
          background: #dcfce7;
          color: #15803d;
        }

        .summary-icon.red {
          background: #fee2e2;
          color: #dc2626;
        }

        .summary-card > div:last-child {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .summary-card span {
          font-size: 12px;
          color: #64748b;
          font-weight: 700;
        }

        .summary-card strong {
          font-size: 26px;
          line-height: 1;
          font-weight: 900;
        }

        .percentage-card {
          position: relative;
        }

        .circle-progress {
          width: 58px;
          height: 58px;
          position: relative;
          flex-shrink: 0;
        }

        .circle-progress svg {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }

        .circle-progress circle {
          fill: none;
          stroke-width: 3.5;
        }

        .circle-bg {
          stroke: #e5e7eb;
        }

        .circle-value {
          stroke: #2563eb;
          stroke-linecap: round;
        }

        .circle-progress strong {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          font-size: 11px;
          color: #1d4ed8;
        }

        .percentage-number {
          display: none !important;
        }

        .student-heading {
          margin-bottom: 18px;
        }

        .attendance-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .attendance-actions button,
        .selection-actions button {
          border: 1px solid #dce3ec;
          border-radius: 10px;
          padding: 10px 13px;
          background: white;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .attendance-actions button:disabled,
        .selection-actions button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .present-all {
          color: #15803d;
          background: #f0fdf4 !important;
          border-color: #bbf7d0 !important;
        }

        .absent-all {
          color: #dc2626;
          background: #fef2f2 !important;
          border-color: #fecaca !important;
        }

        .student-toolbar {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 12px;
        }

        .search-box,
        .history-search {
          flex: 1;
          position: relative;
        }

        .search-box > span,
        .history-search > span {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 20px;
          pointer-events: none;
        }

        .search-box input,
        .history-search input {
          padding-left: 40px;
        }

        .search-box button {
          position: absolute;
          right: 7px;
          top: 50%;
          transform: translateY(-50%);
          border: 0;
          background: #e2e8f0;
          width: 27px;
          height: 27px;
          border-radius: 50%;
          cursor: pointer;
          color: #475569;
          font-weight: 900;
        }

        .selection-actions {
          display: flex;
          gap: 8px;
        }

        .selection-actions button {
          color: #334155;
        }

        .selection-info {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 10px 2px 14px;
          color: #64748b;
          font-size: 12px;
        }

        .selection-info strong {
          color: #1e293b;
        }

        .students-list {
          border: 1px solid #e6ebf1;
          border-radius: 16px;
          overflow: hidden;
        }

        .student-row {
          display: flex;
          align-items: center;
          min-height: 78px;
          border-bottom: 1px solid #edf1f5;
          background: white;
          transition: 0.18s ease;
        }

        .student-row:last-child {
          border-bottom: 0;
        }

        .student-row.selected {
          background: #f8fbff;
        }

        .student-row:hover {
          background: #f8fafc;
        }

        .student-select-area {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 12px;
          border: 0;
          background: transparent;
          text-align: left;
          padding: 12px 14px;
          cursor: pointer;
        }

        .student-checkbox {
          width: 24px;
          height: 24px;
          border: 2px solid #cbd5e1;
          border-radius: 7px;
          display: grid;
          place-items: center;
          color: white;
          background: white;
          font-size: 13px;
          font-weight: 900;
          flex-shrink: 0;
        }

        .student-row.selected .student-checkbox {
          background: #2563eb;
          border-color: #2563eb;
        }

        .student-avatar {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: linear-gradient(
            135deg,
            #dbeafe,
            #ede9fe
          );
          color: #3730a3;
          display: grid;
          place-items: center;
          font-weight: 900;
          flex-shrink: 0;
          font-size: 16px;
        }

        .student-information {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .student-information strong {
          font-size: 14px;
          color: #1e293b;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .student-details {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .student-information span {
          font-size: 11px;
        }

        .student-username {
          color: #2563eb;
        }

        .student-id {
          color: #64748b;
        }

        .student-information b {
          font-weight: 900;
        }

        .serial-number {
          margin-left: auto;
          color: #cbd5e1;
          font-size: 11px;
          font-weight: 800;
        }

        .status-buttons {
          display: flex;
          gap: 6px;
          padding: 0 13px 0 5px;
        }

        .status-buttons button {
          border-radius: 9px;
          padding: 8px 10px;
          border: 1px solid;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
          transition: 0.15s ease;
        }

        .status-present {
          color: #15803d;
          background: #f0fdf4;
          border-color: #bbf7d0;
        }

        .status-present.active {
          color: white;
          background: #16a34a;
          border-color: #16a34a;
        }

        .status-absent {
          color: #dc2626;
          background: #fef2f2;
          border-color: #fecaca;
        }

        .status-absent.active {
          color: white;
          background: #dc2626;
          border-color: #dc2626;
        }

        .save-area {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-top: 18px;
          padding: 17px;
          border-radius: 15px;
          background: linear-gradient(
            135deg,
            #f8fafc,
            #eff6ff
          );
          border: 1px solid #dbeafe;
        }

        .save-area > div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .save-area strong {
          font-size: 14px;
        }

        .save-area span {
          color: #64748b;
          font-size: 12px;
        }

        .save-button {
          border: 0;
          border-radius: 11px;
          background: linear-gradient(
            135deg,
            #2563eb,
            #4f46e5
          );
          color: white;
          padding: 13px 20px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 8px 20px
            rgba(37, 99, 235, 0.2);
        }

        .save-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .loading-box,
        .empty-box,
        .empty-history {
          text-align: center;
          padding: 55px 20px;
          color: #64748b;
        }

        .loading-box p,
        .empty-box p,
        .empty-history p {
          margin: 8px 0 0;
          font-size: 13px;
        }

        .loader {
          width: 32px;
          height: 32px;
          border: 3px solid #dbeafe;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .empty-box > div,
        .empty-history-icon {
          font-size: 42px;
        }

        .empty-box h3,
        .empty-history h3 {
          margin: 12px 0 0;
          color: #334155;
        }

        .history-count {
          background: #eff6ff;
          color: #1d4ed8;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .history-toolbar {
          display: flex;
          gap: 12px;
          margin-bottom: 18px;
        }

        .history-toolbar select {
          width: 220px;
          flex-shrink: 0;
        }

        .history-search {
          max-width: 420px;
          margin-left: auto;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .history-class {
          display: flex;
          gap: 15px;
          border: 1px solid #e5eaf1;
          border-radius: 17px;
          padding: 15px;
          background: #fff;
          transition: 0.2s ease;
        }

        .history-class:hover {
          border-color: #bfdbfe;
          box-shadow: 0 10px 25px
            rgba(37, 99, 235, 0.07);
          transform: translateY(-1px);
        }

        .history-date {
          width: 72px;
          height: 80px;
          border-radius: 14px;
          background: linear-gradient(
            145deg,
            #eff6ff,
            #eef2ff
          );
          color: #1d4ed8;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          flex-shrink: 0;
        }

        .history-date span {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .history-date strong {
          font-size: 27px;
          line-height: 1;
          margin: 2px 0;
        }

        .history-date small {
          font-size: 10px;
          font-weight: 800;
        }

        .history-main {
          flex: 1;
          min-width: 0;
        }

        .history-title-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
        }

        .history-subject {
          color: #2563eb;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          margin-bottom: 3px;
        }

        .history-title-row h3 {
          margin: 0;
          font-size: 17px;
          font-weight: 900;
          color: #172033;
        }

        .class-id {
          color: #94a3b8;
          font-size: 10px;
          font-weight: 900;
          white-space: nowrap;
        }

        .history-meta {
          display: flex;
          align-items: center;
          gap: 13px;
          flex-wrap: wrap;
          margin-top: 9px;
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
        }

        .meta-present {
          color: #15803d;
        }

        .meta-absent {
          color: #dc2626;
        }

        .history-remarks {
          margin-top: 10px;
          padding: 9px 11px;
          border-radius: 9px;
          background: #f8fafc;
          color: #64748b;
          font-size: 11px;
          line-height: 1.5;
        }

        .history-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-top: 13px;
        }

        .history-progress {
          flex: 1;
          max-width: 430px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .progress-track {
          flex: 1;
          height: 7px;
          background: #e2e8f0;
          border-radius: 99px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(
            90deg,
            #2563eb,
            #4f46e5
          );
          border-radius: inherit;
        }

        .history-progress strong {
          font-size: 11px;
          color: #334155;
          white-space: nowrap;
        }

        .history-actions {
          display: flex;
          gap: 7px;
        }

        .view-button,
        .delete-button {
          border-radius: 9px;
          padding: 8px 11px;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .view-button {
          color: #1d4ed8;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
        }

        .delete-button {
          color: #dc2626;
          background: #fef2f2;
          border: 1px solid #fecaca;
        }

        .delete-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .page-footer {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          color: #94a3b8;
          font-size: 11px;
          padding: 8px 0 20px;
        }

        .page-footer strong {
          color: #64748b;
          letter-spacing: 1px;
        }

        @media (max-width: 1050px) {
          .details-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            );
          }

          .summary-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            );
          }
        }

        @media (max-width: 760px) {
          .extra-page {
            padding: 12px;
          }

          .top-header {
            flex-direction: column;
          }

          .header-actions {
            width: 100%;
            justify-content: stretch;
          }

          .back-button,
          .new-class-button {
            flex: 1;
            text-align: center;
          }

          .create-card,
          .attendance-card,
          .history-card {
            padding: 16px;
            border-radius: 17px;
          }

          .section-heading {
            flex-direction: column;
          }

          .details-grid {
            grid-template-columns: 1fr;
          }

          .summary-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            );
          }

          .summary-card {
            min-height: 88px;
            padding: 13px;
          }

          .summary-icon {
            width: 40px;
            height: 40px;
            font-size: 17px;
          }

          .summary-card strong {
            font-size: 22px;
          }

          .student-heading {
            gap: 12px;
          }

          .attendance-actions {
            width: 100%;
          }

          .attendance-actions button {
            flex: 1;
          }

          .student-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .selection-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .student-row {
            align-items: stretch;
            flex-direction: column;
          }

          .student-select-area {
            min-height: 72px;
          }

          .serial-number {
            display: none;
          }

          .status-buttons {
            padding: 0 13px 12px 50px;
          }

          .status-buttons button {
            flex: 1;
          }

          .save-area {
            flex-direction: column;
            align-items: stretch;
          }

          .save-button {
            width: 100%;
          }

          .history-toolbar {
            flex-direction: column;
          }

          .history-toolbar select,
          .history-search {
            width: 100%;
            max-width: none;
            margin: 0;
          }

          .history-class {
            padding: 12px;
            gap: 10px;
          }

          .history-date {
            width: 57px;
            height: 68px;
          }

          .history-date strong {
            font-size: 23px;
          }

          .history-title-row {
            flex-direction: column;
            gap: 5px;
          }

          .history-bottom {
            flex-direction: column;
            align-items: stretch;
          }

          .history-progress {
            max-width: none;
          }

          .history-actions {
            width: 100%;
          }

          .view-button,
          .delete-button {
            flex: 1;
          }
        }

        @media (max-width: 430px) {
          .top-header h1 {
            font-size: 29px;
          }

          .summary-grid {
            gap: 8px;
          }

          .summary-card {
            padding: 11px;
            gap: 8px;
          }

          .summary-icon {
            width: 34px;
            height: 34px;
            border-radius: 10px;
            font-size: 14px;
          }

          .summary-card span {
            font-size: 10px;
          }

          .summary-card strong {
            font-size: 19px;
          }

          .circle-progress {
            width: 45px;
            height: 45px;
          }

          .student-details {
            flex-direction: column;
            align-items: flex-start;
            gap: 2px;
          }

          .history-class {
            flex-direction: column;
          }

          .history-date {
            width: 100%;
            height: 48px;
            flex-direction: row;
            gap: 5px;
          }

          .history-date strong {
            font-size: 21px;
          }

          .history-date span,
          .history-date small {
            font-size: 10px;
          }

          .history-progress {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </main>
  );
}