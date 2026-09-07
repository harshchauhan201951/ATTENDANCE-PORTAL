"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Student = {
  id: number;
  username?: string | null;
  name?: string | null;
  full_name?: string | null;
};

type Status = "Present" | "Absent";

type ExtraClassRecord = {
  id: number;
  student_id: number;
  extra_class_date: string;
  class_time: string | null;
  subject: string | null;
  topic: string | null;
  status: Status;
  remarks: string | null;
  created_at?: string;
};

function getStudentName(student: Student): string {
  return (
    student.name?.trim() ||
    student.full_name?.trim() ||
    student.username?.trim() ||
    `Student ${student.id}`
  );
}

function formatDate(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getMonthName(month: string): string {
  const date = new Date(`${month}-01T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return month;
  }

  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export default function ExtraClassPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<ExtraClassRecord[]>([]);

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [classTime, setClassTime] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [remarks, setRemarks] = useState("");

  const [search, setSearch] = useState("");
  const [historyMonth, setHistoryMonth] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | "info"
  >("info");

  const [statusMap, setStatusMap] = useState<Record<number, Status>>({});

  async function loadData(): Promise<void> {
    try {
      setLoading(true);

      const [studentsResult, recordsResult] = await Promise.all([
        supabase
          .from("students")
          .select("*")
          .order("id", { ascending: true }),

        supabase
          .from("extra_class_attendance")
          .select("*")
          .order("extra_class_date", { ascending: false }),
      ]);

      if (studentsResult.error) {
        throw studentsResult.error;
      }

      if (recordsResult.error) {
        throw recordsResult.error;
      }

      setStudents((studentsResult.data as Student[]) || []);
      setRecords((recordsResult.data as ExtraClassRecord[]) || []);
    } catch (error) {
      console.error("Extra Class load error:", error);

      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load Extra Class data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const selectedDateRecords = useMemo(() => {
    return records.filter(
      (record) => record.extra_class_date === selectedDate
    );
  }, [records, selectedDate]);

  useEffect(() => {
    const nextStatusMap: Record<number, Status> = {};

    students.forEach((student) => {
      const existingRecord = selectedDateRecords.find(
        (record) => record.student_id === student.id
      );

      nextStatusMap[student.id] = existingRecord?.status || "Absent";
    });

    setStatusMap(nextStatusMap);

    const firstRecord = selectedDateRecords[0];

    if (firstRecord) {
      setClassTime(firstRecord.class_time || "");
      setSubject(firstRecord.subject || "");
      setTopic(firstRecord.topic || "");
      setRemarks(firstRecord.remarks || "");
    } else {
      setClassTime("");
      setSubject("");
      setTopic("");
      setRemarks("");
    }
  }, [students, selectedDateRecords]);

  const filteredStudents = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return students;
    }

    return students.filter((student) => {
      const name = getStudentName(student).toLowerCase();
      const username = (student.username || "").toLowerCase();
      const id = String(student.id);

      return (
        name.includes(value) ||
        username.includes(value) ||
        id.includes(value)
      );
    });
  }, [students, search]);

  const totalStudents = students.length;

  const presentCount = useMemo(() => {
    return students.filter(
      (student) => statusMap[student.id] === "Present"
    ).length;
  }, [students, statusMap]);

  const absentCount = useMemo(() => {
    return students.filter(
      (student) => statusMap[student.id] === "Absent"
    ).length;
  }, [students, statusMap]);

  const pendingCount = useMemo(() => {
    return Math.max(totalStudents - presentCount - absentCount, 0);
  }, [totalStudents, presentCount, absentCount]);

  const attendancePercentage =
    totalStudents > 0
      ? Math.round((presentCount / totalStudents) * 100)
      : 0;

  const historyMonths = useMemo(() => {
    const months = Array.from(
      new Set(
        records.map((record) => record.extra_class_date.slice(0, 7))
      )
    );

    return months.sort((a, b) => b.localeCompare(a));
  }, [records]);

  const historyRecords = useMemo(() => {
    if (!historyMonth) {
      return records;
    }

    return records.filter((record) =>
      record.extra_class_date.startsWith(historyMonth)
    );
  }, [records, historyMonth]);

  const historyDates = useMemo(() => {
    const dates = Array.from(
      new Set(
        historyRecords.map((record) => record.extra_class_date)
      )
    );

    return dates.sort((a, b) => b.localeCompare(a));
  }, [historyRecords]);

  function updateStatus(studentId: number, status: Status): void {
    setStatusMap((previous) => ({
      ...previous,
      [studentId]: status,
    }));
  }

  function markAll(status: Status): void {
    const next: Record<number, Status> = {};

    students.forEach((student) => {
      next[student.id] = status;
    });

    setStatusMap(next);
  }

  async function saveAttendance(): Promise<void> {
    if (!selectedDate) {
      setMessageType("error");
      setMessage("Please select a date.");
      return;
    }

    if (students.length === 0) {
      setMessageType("error");
      setMessage("No students found.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const rows = students.map((student) => ({
        student_id: student.id,
        extra_class_date: selectedDate,
        class_time: classTime.trim() || null,
        subject: subject.trim() || null,
        topic: topic.trim() || null,
        status: statusMap[student.id] || "Absent",
        remarks: remarks.trim() || null,
      }));

      const { error } = await supabase
        .from("extra_class_attendance")
        .upsert(rows, {
          onConflict: "student_id,extra_class_date",
        });

      if (error) {
        throw error;
      }

      setMessageType("success");
      setMessage(
        `Extra Class attendance saved successfully for ${formatDate(
          selectedDate
        )}.`
      );

      await loadData();
    } catch (error) {
      console.error("Extra Class save error:", error);

      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save Extra Class attendance."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteSelectedDate(): Promise<void> {
    const confirmed = window.confirm(
      `Delete Extra Class attendance for ${formatDate(
        selectedDate
      )}? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setMessage("");

      const { error } = await supabase
        .from("extra_class_attendance")
        .delete()
        .eq("extra_class_date", selectedDate);

      if (error) {
        throw error;
      }

      setMessageType("success");
      setMessage(
        `Extra Class record deleted for ${formatDate(selectedDate)}.`
      );

      await loadData();
    } catch (error) {
      console.error("Extra Class delete error:", error);

      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete the selected date."
      );
    } finally {
      setDeleting(false);
    }
  }

  function openHistoryDate(date: string): void {
    setSelectedDate(date);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <main className="extra-class-page">
      <div className="page-shell">
        <header className="top-header">
          <div>
            <div className="brand-line">
              <span className="brand-icon">📚</span>
              <span>RACER ACADEMY</span>
            </div>

            <h1>Extra Class</h1>

            <p>
              Manage separate attendance records for special and extra
              classes.
            </p>
          </div>

          <button
            type="button"
            className="back-button"
            onClick={() => window.history.back()}
          >
            ← Back
          </button>
        </header>

        {message && (
          <div
            className={`message ${
              messageType === "success"
                ? "message-success"
                : messageType === "error"
                ? "message-error"
                : "message-info"
            }`}
          >
            <span>
              {messageType === "success"
                ? "✓"
                : messageType === "error"
                ? "!"
                : "i"}
            </span>

            <span>{message}</span>
          </div>
        )}

        <section className="class-details card">
          <div className="section-title">
            <div className="section-icon">📝</div>

            <div>
              <h2>Extra Class Details</h2>
              <p>Enter the details of today's extra class.</p>
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Date</span>

              <input
                type="date"
                value={selectedDate}
                onChange={(event) =>
                  setSelectedDate(event.target.value)
                }
              />
            </label>

            <label className="field">
              <span>Time</span>

              <input
                type="time"
                value={classTime}
                onChange={(event) =>
                  setClassTime(event.target.value)
                }
              />
            </label>

            <label className="field">
              <span>Subject</span>

              <input
                type="text"
                value={subject}
                onChange={(event) =>
                  setSubject(event.target.value)
                }
                placeholder="e.g. Mathematics"
              />
            </label>

            <label className="field">
              <span>Topic</span>

              <input
                type="text"
                value={topic}
                onChange={(event) =>
                  setTopic(event.target.value)
                }
                placeholder="e.g. Trigonometry"
              />
            </label>

            <label className="field field-wide">
              <span>Remark</span>

              <textarea
                value={remarks}
                onChange={(event) =>
                  setRemarks(event.target.value)
                }
                placeholder="Optional class remark..."
                rows={3}
              />
            </label>
          </div>
        </section>

        <section className="summary-grid">
          <div className="summary-card total">
            <div className="summary-icon">👥</div>

            <div>
              <span>Total Students</span>
              <strong>{totalStudents}</strong>
            </div>
          </div>

          <div className="summary-card present">
            <div className="summary-icon">✓</div>

            <div>
              <span>Present</span>
              <strong>{presentCount}</strong>
            </div>
          </div>

          <div className="summary-card absent">
            <div className="summary-icon">✕</div>

            <div>
              <span>Absent</span>
              <strong>{absentCount}</strong>
            </div>
          </div>

          <div className="summary-card pending">
            <div className="summary-icon">⏳</div>

            <div>
              <span>Pending</span>
              <strong>{pendingCount}</strong>
            </div>
          </div>

          <div className="summary-card percentage">
            <div className="summary-icon">%</div>

            <div>
              <span>Attendance</span>
              <strong>{attendancePercentage}%</strong>
            </div>
          </div>
        </section>

        <section className="student-section card">
          <div className="student-header">
            <div className="section-title">
              <div className="section-icon">👨‍🎓</div>

              <div>
                <h2>Student Attendance</h2>

                <p>
                  {formatDate(selectedDate)} •{" "}
                  {filteredStudents.length} students shown
                </p>
              </div>
            </div>

            <div className="quick-actions">
              <button
                type="button"
                className="quick-present"
                onClick={() => markAll("Present")}
              >
                ✓ Mark All Present
              </button>

              <button
                type="button"
                className="quick-absent"
                onClick={() => markAll("Absent")}
              >
                ✕ Mark All Absent
              </button>
            </div>
          </div>

          <div className="student-toolbar">
            <div className="search-box">
              <span>🔍</span>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search student by name, username or ID..."
              />
            </div>

            <div className="toolbar-count">
              {filteredStudents.length} / {students.length}
            </div>
          </div>

          {loading ? (
            <div className="loading-box">
              <div className="loader" />
              <p>Loading students...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="empty-box">
              <div>👨‍🎓</div>

              <h3>No Students Found</h3>

              <p>
                Please make sure students are available in the
                students table.
              </p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="empty-box">
              <div>🔎</div>

              <h3>No Matching Student</h3>

              <p>Try another search.</p>
            </div>
          ) : (
            <div className="student-list">
              {filteredStudents.map((student, index) => {
                const status =
                  statusMap[student.id] || "Absent";

                return (
                  <div
                    className="student-row"
                    key={student.id}
                  >
                    <div className="student-number">
                      {index + 1}
                    </div>

                    <div className="student-info">
                      <div className="student-avatar">
                        {getStudentName(student)
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <strong>
                          {getStudentName(student)}
                        </strong>

                        <small>
                          {student.username
                            ? `@${student.username}`
                            : `Student ID: ${student.id}`}
                        </small>
                      </div>
                    </div>

                    <div className="status-buttons">
                      <button
                        type="button"
                        className={
                          status === "Present"
                            ? "status-button active-present"
                            : "status-button"
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
                            ? "status-button active-absent"
                            : "status-button"
                        }
                        onClick={() =>
                          updateStatus(
                            student.id,
                            "Absent"
                          )
                        }
                      >
                        ✕ Absent
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="save-area">
            <button
              type="button"
              className="save-button"
              onClick={() => void saveAttendance()}
              disabled={
                saving ||
                loading ||
                students.length === 0
              }
            >
              {saving ? (
                <>
                  <span className="button-spinner" />
                  Saving...
                </>
              ) : (
                <>💾 Save Extra Class Attendance</>
              )}
            </button>

            <button
              type="button"
              className="delete-button"
              onClick={() => void deleteSelectedDate()}
              disabled={deleting || saving}
            >
              {deleting
                ? "Deleting..."
                : "🗑️ Delete This Date"}
            </button>
          </div>
        </section>

        <section className="history-section card">
          <div className="history-header">
            <div className="section-title">
              <div className="section-icon">📊</div>

              <div>
                <h2>Extra Class History</h2>

                <p>
                  View previously saved extra class
                  attendance.
                </p>
              </div>
            </div>

            <select
              value={historyMonth}
              onChange={(event) =>
                setHistoryMonth(event.target.value)
              }
              className="month-select"
            >
              <option value="">All Months</option>

              {historyMonths.map((month) => (
                <option key={month} value={month}>
                  {getMonthName(month)}
                </option>
              ))}
            </select>
          </div>

          {historyDates.length === 0 ? (
            <div className="empty-history">
              <div>📚</div>

              <h3>No Extra Class History</h3>

              <p>
                Saved extra class attendance records will
                appear here.
              </p>
            </div>
          ) : (
            <div className="history-list">
              {historyDates.map((date) => {
                const dateRecords = historyRecords.filter(
                  (record) =>
                    record.extra_class_date === date
                );

                const present = dateRecords.filter(
                  (record) =>
                    record.status === "Present"
                ).length;

                const absent = dateRecords.filter(
                  (record) =>
                    record.status === "Absent"
                ).length;

                const percentage =
                  dateRecords.length > 0
                    ? Math.round(
                        (present /
                          dateRecords.length) *
                          100
                      )
                    : 0;

                const first = dateRecords[0];

                const historyDate = new Date(
                  `${date}T00:00:00`
                );

                return (
                  <div
                    className="history-card"
                    key={date}
                  >
                    <div className="history-main">
                      <div className="history-date">
                        <span className="history-day">
                          {historyDate.getDate()}
                        </span>

                        <span>
                          {historyDate.toLocaleDateString(
                            "en-IN",
                            {
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </span>
                      </div>

                      <div className="history-details">
                        <h3>
                          {first?.subject ||
                            "Extra Class"}
                        </h3>

                        <p>
                          {first?.topic ||
                            "No topic added"}
                        </p>

                        <div className="history-meta">
                          {first?.class_time && (
                            <span>
                              🕐 {first.class_time}
                            </span>
                          )}

                          <span>
                            👥 {dateRecords.length} records
                          </span>
                        </div>
                      </div>

                      <div className="history-stats">
                        <div>
                          <strong>{present}</strong>
                          <span>Present</span>
                        </div>

                        <div>
                          <strong>{absent}</strong>
                          <span>Absent</span>
                        </div>

                        <div>
                          <strong>
                            {percentage}%
                          </strong>
                          <span>Attendance</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="view-button"
                        onClick={() =>
                          openHistoryDate(date)
                        }
                      >
                        View
                      </button>
                    </div>

                    {first?.remarks && (
                      <div className="history-remark">
                        <strong>Remark:</strong>{" "}
                        {first.remarks}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <footer className="page-footer">
          <span>RACER ACADEMY</span>
          <span>•</span>
          <span>Extra Class Attendance</span>
        </footer>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .extra-class-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top left,
              rgba(99, 102, 241, 0.12),
              transparent 32%
            ),
            radial-gradient(
              circle at bottom right,
              rgba(14, 165, 233, 0.1),
              transparent 30%
            ),
            #f5f7fb;
          color: #172033;
          padding: 28px 18px 50px;
        }

        .page-shell {
          width: 100%;
          max-width: 1250px;
          margin: 0 auto;
        }

        .top-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
        }

        .brand-line {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #4f46e5;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 1.5px;
          margin-bottom: 8px;
        }

        .brand-icon {
          font-size: 20px;
        }

        .top-header h1 {
          margin: 0;
          font-size: clamp(30px, 4vw, 46px);
          line-height: 1.05;
          font-weight: 900;
          letter-spacing: -1.5px;
        }

        .top-header p {
          margin: 9px 0 0;
          color: #687386;
          font-size: 15px;
        }

        .back-button {
          border: 0;
          background: #ffffff;
          color: #27324a;
          border-radius: 13px;
          padding: 12px 18px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(31, 41, 55, 0.08);
          transition: 0.2s ease;
        }

        .back-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 28px rgba(31, 41, 55, 0.12);
        }

        .card {
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid #e9edf4;
          border-radius: 22px;
          box-shadow: 0 12px 35px rgba(30, 41, 59, 0.06);
        }

        .message {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 13px 16px;
          border-radius: 14px;
          margin-bottom: 18px;
          font-size: 14px;
          font-weight: 700;
        }

        .message-success {
          background: #ecfdf3;
          color: #087443;
          border: 1px solid #b7efd0;
        }

        .message-error {
          background: #fff1f2;
          color: #be123c;
          border: 1px solid #fecdd3;
        }

        .message-info {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }

        .class-details {
          padding: 25px;
          margin-bottom: 18px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .section-icon {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: #eef2ff;
          font-size: 22px;
          flex-shrink: 0;
        }

        .section-title h2 {
          margin: 0;
          font-size: 21px;
          font-weight: 900;
        }

        .section-title p {
          margin: 4px 0 0;
          color: #7b8495;
          font-size: 13px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(
            4,
            minmax(0, 1fr)
          );
          gap: 16px;
          margin-top: 23px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .field-wide {
          grid-column: 1 / -1;
        }

        .field span {
          font-size: 13px;
          font-weight: 800;
          color: #465166;
        }

        .field input,
        .field textarea,
        .month-select {
          width: 100%;
          border: 1px solid #dfe4ec;
          border-radius: 12px;
          background: #fbfcfe;
          color: #1d2739;
          padding: 12px 13px;
          font-size: 14px;
          outline: none;
          transition: 0.2s ease;
          font-family: inherit;
        }

        .field input:focus,
        .field textarea:focus,
        .month-select:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px
            rgba(99, 102, 241, 0.1);
          background: #ffffff;
        }

        .field textarea {
          resize: vertical;
          min-height: 78px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(
            5,
            minmax(0, 1fr)
          );
          gap: 14px;
          margin-bottom: 18px;
        }

        .summary-card {
          min-height: 105px;
          border-radius: 18px;
          padding: 17px;
          display: flex;
          align-items: center;
          gap: 13px;
          border: 1px solid transparent;
        }

        .summary-card.total {
          background: #f4f7fb;
          border-color: #e4e9f1;
        }

        .summary-card.present {
          background: #effdf5;
          border-color: #c8f1d9;
        }

        .summary-card.absent {
          background: #fff3f4;
          border-color: #ffd5da;
        }

        .summary-card.pending {
          background: #fffaf0;
          border-color: #fbe5b1;
        }

        .summary-card.percentage {
          background: #f2f1ff;
          border-color: #ddd9ff;
        }

        .summary-icon {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.8);
          font-weight: 900;
          font-size: 19px;
          flex-shrink: 0;
        }

        .summary-card span {
          display: block;
          color: #727c8e;
          font-size: 12px;
          font-weight: 700;
        }

        .summary-card strong {
          display: block;
          margin-top: 3px;
          font-size: 26px;
          font-weight: 900;
        }

        .student-section {
          padding: 25px;
          margin-bottom: 18px;
        }

        .student-header,
        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
        }

        .quick-actions {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
        }

        .quick-actions button {
          border: 0;
          padding: 10px 13px;
          border-radius: 11px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .quick-actions button:hover {
          transform: translateY(-1px);
        }

        .quick-present {
          background: #dcfce7;
          color: #166534;
        }

        .quick-absent {
          background: #ffe4e6;
          color: #be123c;
        }

        .student-toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 22px 0 15px;
        }

        .search-box {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 9px;
          border: 1px solid #e0e5ed;
          border-radius: 13px;
          background: #fafbfc;
          padding: 0 13px;
        }

        .search-box span {
          font-size: 15px;
        }

        .search-box input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          padding: 13px 0;
          font-size: 14px;
          color: #1f2937;
          font-family: inherit;
        }

        .toolbar-count {
          color: #6b7485;
          font-size: 13px;
          font-weight: 800;
          white-space: nowrap;
        }

        .student-list {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .student-row {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 70px;
          padding: 10px 12px;
          border: 1px solid #edf0f4;
          border-radius: 15px;
          background: #ffffff;
          transition: 0.18s ease;
        }

        .student-row:hover {
          border-color: #dfe4ff;
          background: #fcfcff;
        }

        .student-number {
          width: 29px;
          color: #98a1b1;
          font-size: 12px;
          font-weight: 800;
          text-align: center;
        }

        .student-info {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .student-avatar {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: linear-gradient(
            135deg,
            #6366f1,
            #8b5cf6
          );
          color: white;
          font-weight: 900;
          flex-shrink: 0;
        }

        .student-info strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
        }

        .student-info small {
          display: block;
          margin-top: 3px;
          color: #8992a3;
          font-size: 11px;
        }

        .status-buttons {
          display: flex;
          gap: 7px;
        }

        .status-button {
          border: 1px solid #e2e6ed;
          background: #ffffff;
          color: #697386;
          padding: 9px 12px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.18s ease;
        }

        .status-button:hover {
          transform: translateY(-1px);
        }

        .active-present {
          background: #dcfce7;
          border-color: #86efac;
          color: #15803d;
        }

        .active-absent {
          background: #ffe4e6;
          border-color: #fda4af;
          color: #be123c;
        }

        .save-area {
          display: flex;
          gap: 10px;
          margin-top: 20px;
          padding-top: 19px;
          border-top: 1px solid #edf0f4;
        }

        .save-button {
          flex: 1;
          min-height: 48px;
          border: 0;
          border-radius: 13px;
          background: linear-gradient(
            135deg,
            #4f46e5,
            #7c3aed
          );
          color: white;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 8px 20px
            rgba(79, 70, 229, 0.2);
          transition: 0.2s ease;
        }

        .save-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 25px
            rgba(79, 70, 229, 0.28);
        }

        .save-button:disabled,
        .delete-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .delete-button {
          min-height: 48px;
          padding: 0 18px;
          border: 1px solid #fecdd3;
          border-radius: 13px;
          background: #fff1f2;
          color: #be123c;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .button-spinner,
        .loader {
          display: inline-block;
          border: 3px solid
            rgba(255, 255, 255, 0.35);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .button-spinner {
          width: 16px;
          height: 16px;
          vertical-align: -3px;
          margin-right: 7px;
        }

        .loading-box,
        .empty-box,
        .empty-history {
          text-align: center;
          padding: 45px 20px;
          color: #737d8e;
        }

        .loader {
          width: 32px;
          height: 32px;
          border-color: #dfe2ff;
          border-top-color: #6366f1;
        }

        .loading-box p {
          margin: 12px 0 0;
          font-size: 13px;
          font-weight: 700;
        }

        .empty-box > div,
        .empty-history > div {
          font-size: 38px;
          margin-bottom: 9px;
        }

        .empty-box h3,
        .empty-history h3 {
          margin: 0;
          color: #30394b;
          font-size: 17px;
        }

        .empty-box p,
        .empty-history p {
          margin: 7px 0 0;
          font-size: 13px;
        }

        .history-section {
          padding: 25px;
        }

        .month-select {
          width: auto;
          min-width: 170px;
          cursor: pointer;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 11px;
          margin-top: 21px;
        }

        .history-card {
          border: 1px solid #e9edf3;
          border-radius: 16px;
          background: #fcfdff;
          overflow: hidden;
        }

        .history-main {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px;
        }

        .history-date {
          width: 62px;
          height: 62px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: #eef2ff;
          color: #4f46e5;
          font-size: 10px;
          font-weight: 800;
          flex-shrink: 0;
        }

        .history-day {
          font-size: 24px;
          line-height: 1;
          font-weight: 900;
        }

        .history-details {
          flex: 1;
          min-width: 0;
        }

        .history-details h3 {
          margin: 0;
          color: #283247;
          font-size: 15px;
          font-weight: 900;
        }

        .history-details p {
          margin: 3px 0 7px;
          color: #737d8f;
          font-size: 12px;
        }

        .history-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
          color: #8a93a3;
          font-size: 10px;
          font-weight: 700;
        }

        .history-stats {
          display: flex;
          gap: 17px;
          text-align: center;
        }

        .history-stats div {
          min-width: 55px;
        }

        .history-stats strong {
          display: block;
          color: #293248;
          font-size: 17px;
          font-weight: 900;
        }

        .history-stats span {
          display: block;
          margin-top: 2px;
          color: #8992a2;
          font-size: 9px;
          font-weight: 700;
        }

        .view-button {
          border: 0;
          border-radius: 10px;
          background: #eef2ff;
          color: #4f46e5;
          padding: 9px 13px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .history-remark {
          padding: 11px 15px;
          border-top: 1px solid #edf0f4;
          color: #687386;
          font-size: 12px;
          background: #fafbfe;
        }

        .history-remark strong {
          color: #394358;
        }

        .page-footer {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 9px;
          padding-top: 25px;
          color: #99a1b0;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.4px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 950px) {
          .summary-grid {
            grid-template-columns: repeat(
              3,
              minmax(0, 1fr)
            );
          }

          .form-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            );
          }

          .field-wide {
            grid-column: 1 / -1;
          }

          .history-stats {
            gap: 10px;
          }
        }

        @media (max-width: 700px) {
          .extra-class-page {
            padding: 18px 10px 35px;
          }

          .top-header {
            flex-direction: column;
          }

          .back-button {
            width: 100%;
          }

          .class-details,
          .student-section,
          .history-section {
            padding: 17px;
            border-radius: 17px;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .field-wide {
            grid-column: auto;
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
            width: 36px;
            height: 36px;
            font-size: 16px;
          }

          .summary-card strong {
            font-size: 22px;
          }

          .student-header,
          .history-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .quick-actions {
            width: 100%;
          }

          .quick-actions button {
            flex: 1;
          }

          .student-toolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .toolbar-count {
            text-align: right;
          }

          .student-row {
            align-items: flex-start;
            flex-wrap: wrap;
            padding: 12px;
          }

          .student-number {
            width: 22px;
          }

          .student-info {
            width: calc(100% - 40px);
          }

          .status-buttons {
            width: 100%;
            padding-left: 34px;
          }

          .status-button {
            flex: 1;
          }

          .save-area {
            flex-direction: column;
          }

          .delete-button {
            width: 100%;
          }

          .month-select {
            width: 100%;
          }

          .history-main {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .history-details {
            width: calc(100% - 80px);
          }

          .history-stats {
            width: 100%;
            justify-content: space-around;
            padding-top: 8px;
            border-top: 1px solid #edf0f4;
          }

          .view-button {
            width: 100%;
          }

          .history-remark {
            line-height: 1.5;
          }
        }

        @media (max-width: 430px) {
          .summary-grid {
            grid-template-columns: 1fr 1fr;
            gap: 9px;
          }

          .summary-card {
            gap: 8px;
          }

          .summary-icon {
            display: none;
          }

          .top-header h1 {
            font-size: 32px;
          }

          .section-title h2 {
            font-size: 18px;
          }
        }
      `}</style>
    </main>
  );
}