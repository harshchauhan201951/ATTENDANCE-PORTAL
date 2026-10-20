"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { downloadPdfFile } from "../../../lib/download-pdf";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Student = {
  id: number;
  student_name: string;
  student_username: string;
  admission_date?: string | null;
};

type AttendanceRecord = {
  id: number;
  student_id: number;
  attendance_date: string;
  status: string;
  source: "regular" | "extra";
  subject?: string | null;
};

type HistoryRow = {
  student: Student;
  status: string;
  attendance_date: string;
};

type StudentHistorySummary = {
  student: Student;
  total: number;
  present: number;
  absent: number;
  latestDate: string;
};

export default function AttendanceHistoryPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setErrorMessage("");

    try {
      const savedTeacherId = Number(localStorage.getItem("attendance_teacher_id") || "0");
      if (!savedTeacherId) { throw new Error("Teacher session not found."); }

      let assignedStudentIds: number[] = [];
      if (savedTeacherId !== 1) {
        const { data: assignedData, error: assignedError } = await supabase.rpc("get_teacher_assigned_student_ids", { p_teacher_id: savedTeacherId });
        if (assignedError) throw new Error(assignedError.message);
        assignedStudentIds = (assignedData || []).map((item: { student_id: number }) => Number(item.student_id));
      }

      // History is an archive: include deactivated students so their saved records remain visible.
      let studentQuery = supabase.from("students").select("id, student_name, student_username, admission_date, is_active").order("id", { ascending: true });
      if (savedTeacherId !== 1) {
        if (assignedStudentIds.length === 0) { setStudents([]); setRecords([]); setLoading(false); return; }
        studentQuery = studentQuery.in("id", assignedStudentIds);
      }

      let attendanceQuery = supabase.from("attendance").select("id, student_id, attendance_date, status").order("attendance_date", { ascending: false });
      let extraAttendanceQuery = supabase.from("extra_class_attendance").select("id, student_id, extra_class_date, status, subject").order("extra_class_date", { ascending: false });
      if (savedTeacherId !== 1 && assignedStudentIds.length > 0) { attendanceQuery = attendanceQuery.in("student_id", assignedStudentIds); }
      if (savedTeacherId !== 1 && assignedStudentIds.length > 0) { extraAttendanceQuery = extraAttendanceQuery.in("student_id", assignedStudentIds); }

      const [studentsResult, attendanceResult, extraAttendanceResult] = await Promise.all([studentQuery, attendanceQuery, extraAttendanceQuery]);
      if (studentsResult.error) throw new Error(studentsResult.error.message);
      if (attendanceResult.error) throw new Error(attendanceResult.error.message);
      if (extraAttendanceResult.error) throw new Error(`Extra class attendance could not be loaded: ${extraAttendanceResult.error.message}`);
      setStudents(studentsResult.data || []);
      const studentIds = new Set((studentsResult.data || []).map((student) => Number(student.id)));
      const regularRecords: AttendanceRecord[] = (attendanceResult.data || []).filter((record) => studentIds.has(Number(record.student_id))).map((record) => ({ ...record, source: "regular" as const }));
      const extraRecords: AttendanceRecord[] = (extraAttendanceResult.data || []).filter((record) => studentIds.has(Number(record.student_id))).map((record) => ({ id: record.id, student_id: record.student_id, attendance_date: record.extra_class_date, status: record.status, subject: record.subject, source: "extra" as const }));
      setRecords([...regularRecords, ...extraRecords].sort((a, b) => b.attendance_date.localeCompare(a.attendance_date) || b.id - a.id));
    } catch (error) {
      console.error("Load attendance history error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to load attendance history.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteAttendance(record: AttendanceRecord) {
    const { student_id: studentId, attendance_date: attendanceDate } = record;
    const savedTeacherId = Number(localStorage.getItem("attendance_teacher_id") || "0");

    if (!savedTeacherId) {
      setErrorMessage("Teacher session not found.");
      return;
    }

    if (savedTeacherId !== 1) {
      const { data: assignedData, error: assignedError } =
        await supabase.rpc("get_teacher_assigned_student_ids", {
          p_teacher_id: savedTeacherId,
        });

      if (assignedError) {
        setErrorMessage(assignedError.message);
        return;
      }

      const assignedStudentIds = (assignedData || []).map(
        (item: { student_id: number }) => Number(item.student_id)
      );

      if (!assignedStudentIds.includes(studentId)) {
        setErrorMessage("You can only manage attendance for assigned students.");
        return;
      }
    }

    const deleteKey = `${record.source}-${record.id}`;

    const confirmed = window.confirm(
      `Kya aap ${formatDate(attendanceDate)} ki ${record.source === "extra" ? "extra class " : ""}attendance delete karna chahte hain?\n\nIsse is student ki attendance permanently delete ho jayegi.`
    );

    if (!confirmed) {
      return;
    }

    setDeleting(deleteKey);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from(record.source === "extra" ? "extra_class_attendance" : "attendance")
      .delete()
      .eq("id", record.id);

    if (error) {
      console.error(
        "Delete attendance error:",
        error
      );

      setErrorMessage(
        "Attendance delete nahi hui: " +
          error.message
      );

      setDeleting(null);
      return;
    }

    setRecords((currentRecords) =>
      currentRecords.filter((item) => !(item.source === record.source && item.id === record.id))
    );

    setSuccessMessage(
      `Attendance successfully deleted for ${formatDate(
        attendanceDate
      )}.`
    );

    setDeleting(null);

    setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  }

  const availableDates = useMemo(() => {
    const dates = Array.from(
      new Set(
        records.map(
          (record) => record.attendance_date
        )
      )
    );

    return dates.sort(
      (a, b) =>
        new Date(b).getTime() -
        new Date(a).getTime()
    );
  }, [records]);

  const availableMonths = useMemo(() => Array.from(new Set(
    records.map((record) => record.attendance_date.slice(0, 7))
  )).sort((a, b) => b.localeCompare(a)), [records]);

  const filteredRecords = useMemo(() => {
    let result = records;

    if (selectedDate) {
      result = result.filter(
        (record) =>
          record.attendance_date ===
          selectedDate
      );
    }

    if (selectedMonth) {
      result = result.filter((record) => record.attendance_date.startsWith(selectedMonth));
    }

    if (search.trim()) {
      const searchText =
        search.trim().toLowerCase();

      result = result.filter((record) => {
        const student = students.find(
          (item) =>
            item.id === record.student_id
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
    selectedMonth,
    search,
  ]);

  const selectedStudent = students.find((student) => student.id === selectedStudentId) || null;
  const selectedStudentRecords = selectedStudentId === null ? [] : records
    .filter((record) => record.student_id === selectedStudentId && (!selectedMonth || record.attendance_date.startsWith(selectedMonth)))
    .sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));

  const historyRows: HistoryRow[] =
    filteredRecords
      .map((record) => {
        const student = students.find(
          (item) =>
            item.id === record.student_id
        );

        if (!student) {
          return null;
        }

        return {
          student,
          status: record.status,
          attendance_date:
            record.attendance_date,
        };
      })
      .filter(
        (
          item
        ): item is HistoryRow =>
          item !== null
      );

  const studentHistoryRows: StudentHistorySummary[] = useMemo(() => {
    const grouped = new Map<number, StudentHistorySummary>();
    if (!selectedMonth && !selectedDate) {
      students.forEach((student) => grouped.set(student.id, { student, total: 0, present: 0, absent: 0, latestDate: "" }));
    }
    for (const record of filteredRecords) {
      const student = students.find((item) => item.id === record.student_id);
      if (!student) continue;
      const summary = grouped.get(student.id) || { student, total: 0, present: 0, absent: 0, latestDate: record.attendance_date };
      summary.total += 1;
      if (record.status.toLowerCase() === "present") summary.present += 1;
      if (record.status.toLowerCase() === "absent") summary.absent += 1;
      if (record.attendance_date > summary.latestDate) summary.latestDate = record.attendance_date;
      grouped.set(student.id, summary);
    }
    return Array.from(grouped.values()).sort((a, b) => (a.student.student_name || a.student.student_username).localeCompare(b.student.student_name || b.student.student_username));
  }, [filteredRecords, students, selectedMonth, selectedDate]);

  const presentCount = historyRows.filter(
    (item) =>
      item.status.toLowerCase() ===
      "present"
  ).length;

  const absentCount = historyRows.filter(
    (item) =>
      item.status.toLowerCase() ===
      "absent"
  ).length;

  const totalCount = historyRows.length;

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
    setSelectedMonth("");
    setSearch("");
  }

  function exportStudentRecords() {
    if (!selectedStudent) return;
    const rows = [["Date", "Student", "Username", "Status"], ...selectedStudentRecords.map((record) => [record.attendance_date, selectedStudent.student_name || "Student", selectedStudent.student_username, record.status])];
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, `attendance-${selectedStudent.student_username}-${selectedMonth || "all-months"}.xlsx`);
  }

  function downloadSelectedStudentPdf() {
    if (!selectedStudent) return;
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      doc.setFillColor(12, 76, 145); doc.rect(0, 0, 210, 38, "F");
      doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.text("RACER ACADEMY", 15, 17);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text("STUDENT ATTENDANCE REPORT", 15, 27);
      doc.setTextColor(25, 43, 68); doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text(selectedStudent.student_name || "Student", 15, 50);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text(`Username: ${selectedStudent.student_username}`, 15, 57);
      doc.text(`Period: ${selectedMonth || "All months"}`, 15, 63);
      let y = 78;
      doc.setFont("helvetica", "bold"); doc.text("Date", 18, y); doc.text("Status", 108, y); doc.line(15, y + 3, 195, y + 3); y += 11;
      const rows = selectedStudentRecords.length ? selectedStudentRecords : [];
      rows.forEach((record) => {
        if (y > 278) { doc.addPage(); y = 20; }
        doc.setFont("helvetica", "normal"); doc.text(formatDate(record.attendance_date), 18, y);
        doc.setTextColor(record.status.toLowerCase() === "present" ? 20 : 180, record.status.toLowerCase() === "present" ? 120 : 50, 65);
        doc.text(record.status, 108, y); doc.setTextColor(25, 43, 68); y += 8;
      });
      if (!rows.length) doc.text("No attendance records found for this period.", 18, y);
      doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.text(`Total records: ${rows.length}`, 15, 286);
      downloadPdfFile(doc, `RACER_ACADEMY_ATTENDANCE_${selectedStudent.student_username}_${selectedMonth || "ALL"}.pdf`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Attendance PDF could not be downloaded.");
    }
  }

  return (
    <main className="racer-module-page racer-attendance-history-page" style={styles.page}>
<style>{`@media print{body *{visibility:hidden!important}.attendance-student-modal,.attendance-student-modal *{visibility:visible!important}.attendance-student-modal{position:absolute!important;inset:0!important;width:100%!important;max-width:none!important;box-shadow:none!important;border:0!important} .attendance-student-modal button{display:none!important}}`}</style>
<style>{`@media (max-width:640px){
  .racer-attendance-history-page{padding:0 0 88px!important;background:#f5f9ff!important;min-height:100vh!important;color:#142b57!important;overflow-x:hidden!important}
  .racer-attendance-history-page>div{width:100%!important;max-width:none!important;padding:0 16px 24px!important;box-sizing:border-box!important}
  .racer-attendance-history-page .header{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;padding:18px 0 12px!important;margin:0!important}
  .racer-attendance-history-page .header>div:first-child{min-width:0!important}
  .racer-attendance-history-page .badge{display:none!important}
  .racer-attendance-history-page .title{font-size:28px!important;line-height:1.05!important;margin:0!important;font-weight:900!important;color:#172d5f!important;letter-spacing:-.5px!important}
  .racer-attendance-history-page .subtitle{font-size:13px!important;line-height:1.4!important;margin:8px 0 0!important;color:#61749a!important}
  .racer-attendance-history-page .backButton{flex:0 0 auto!important;padding:10px 14px!important;border-radius:12px!important;font-size:12px!important;font-weight:900!important}
  .racer-attendance-history-page .filterCard{margin:8px 0!important;padding:10px!important;border-radius:16px!important;background:#fff!important;border:1px solid #e2eaf6!important;box-shadow:0 8px 24px rgba(25,58,112,.07)!important}
  .racer-attendance-history-page .filterTitle{margin-bottom:6px!important}
  .racer-attendance-history-page .filterGrid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;align-items:end!important}
  .racer-attendance-history-page .inputGroup{min-width:0!important;gap:5px!important}
  .racer-attendance-history-page .input{min-width:0!important;padding:8px!important;font-size:12px!important}
  .racer-attendance-history-page .clearButtonWrapper{display:flex!important;justify-content:flex-end!important;align-items:end!important}
  .racer-attendance-history-page .clearButton{min-height:40px!important;padding:9px 12px!important;font-size:11px!important}
  .racer-attendance-history-page .statsGrid{display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:8px!important;margin:6px 0!important}
  .racer-attendance-history-page .statCard{padding:8px!important;border-radius:14px!important;min-width:0!important}
  .racer-attendance-history-page .statIcon{width:28px!important;height:28px!important}
  .racer-attendance-history-page .statLabel{font-size:10px!important}
  .racer-attendance-history-page .statValue{font-size:20px!important}
  .racer-attendance-history-page .statText{font-size:8px!important;line-height:1.2!important}
  .racer-attendance-history-page .mobile-history-card{margin-top:12px!important;padding:14px!important;border-radius:20px!important;background:#fff!important;border:1px solid #dfe8f5!important;box-shadow:0 10px 26px rgba(25,58,112,.08)!important}
  .racer-attendance-history-page .historyHeader{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;margin-bottom:12px!important}
  .racer-attendance-history-page .historyTitle{font-size:19px!important;line-height:1.1!important;margin:0!important;color:#193566!important}
  .racer-attendance-history-page .historySubtitle{font-size:10px!important;line-height:1.35!important;margin:5px 0 0!important;color:#6b7b98!important}
  .racer-attendance-history-page .refreshButton{padding:10px 14px!important;border-radius:12px!important;background:#2563eb!important;color:#fff!important;font-size:12px!important;font-weight:900!important;box-shadow:none!important}
  .racer-attendance-history-page .tableWrapper{overflow:visible!important;width:100%!important}
  .racer-attendance-history-page .mobile-history-table{display:block!important;width:100%!important;min-width:0!important;border:0!important;background:transparent!important}
  .racer-attendance-history-page .mobile-history-table thead{display:none!important}
  .racer-attendance-history-page .mobile-history-table tbody{display:grid!important;gap:10px!important;width:100%!important}
  .racer-attendance-history-page .mobile-history-table tbody tr{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;grid-template-areas:"student date" "user status" "action action"!important;gap:7px 10px!important;padding:13px!important;margin:0!important;border:1px solid #dce7f5!important;border-radius:17px!important;background:#fff!important;box-shadow:0 5px 16px rgba(31,65,120,.06)!important}
  .racer-attendance-history-page .mobile-history-table tbody td{display:block!important;width:auto!important;padding:0!important;margin:0!important;border:0!important;min-width:0!important;background:transparent!important;white-space:normal!important;overflow:visible!important;word-break:normal!important;overflow-wrap:anywhere!important}
  .racer-attendance-history-page .mobile-history-table tbody td:nth-child(1){display:none!important}
  .racer-attendance-history-page .mobile-history-table tbody td:nth-child(2){grid-area:student!important}
  .racer-attendance-history-page .mobile-history-table tbody td:nth-child(3){grid-area:user!important}
  .racer-attendance-history-page .mobile-history-table tbody td:nth-child(4){grid-area:date!important;text-align:right!important;font-size:10px!important;color:#64748b!important;font-weight:800!important;white-space:nowrap!important}
  .racer-attendance-history-page .mobile-history-table tbody td:nth-child(5){grid-area:status!important;text-align:right!important}
  .racer-attendance-history-page .mobile-history-table tbody td:nth-child(6){grid-area:action!important;text-align:right!important}
  .racer-attendance-history-page .studentCell{display:flex!important;align-items:center!important;gap:9px!important;min-width:0!important}
  .racer-attendance-history-page .studentAvatar{width:34px!important;height:34px!important;min-width:34px!important;border-radius:50%!important;background:#dbeafe!important;color:#2563eb!important;display:grid!important;place-items:center!important;font-weight:900!important;font-size:13px!important}
  .racer-attendance-history-page .studentName{font-size:14px!important;line-height:1.15!important;color:#142b57!important;white-space:normal!important;overflow-wrap:break-word!important;word-break:normal!important}
  .racer-attendance-history-page .username{font-size:10px!important;color:#6b7b98!important;font-weight:800!important}
  .racer-attendance-history-page .presentBadge,.racer-attendance-history-page .absentBadge{display:inline-block!important;padding:6px 10px!important;border-radius:999px!important;font-size:10px!important;font-weight:900!important;white-space:nowrap!important}
  .racer-attendance-history-page .mobile-delete-button{width:100%!important;padding:9px 12px!important;border-radius:10px!important;font-size:11px!important;font-weight:900!important}
  .racer-attendance-history-page .deleteInfoCard{margin-top:12px!important;padding:14px!important;border-radius:16px!important;gap:10px!important}
  .racer-attendance-history-page .deleteInfoTitle{font-size:14px!important}
  .racer-attendance-history-page .deleteInfoText{font-size:10px!important;line-height:1.45!important}
  .racer-attendance-history-page .deleteWarning{font-size:9px!important}
  .racer-attendance-history-page .footer{display:none!important}
  }
  @media (min-width:641px){.racer-attendance-history-page .mobile-history-table{display:table!important}}
`}</style>
      <div style={styles.container}>

        {/* HEADER */}

        <header style={styles.header}>
          <div>
            <div style={styles.badge}>
              TEACHER PORTAL
            </div>

            <h1 style={styles.title}>
               Attendance History
            </h1>

            <p style={styles.subtitle}>
              View, manage and delete previous
              student attendance records
            </p>
          </div>

          <button
            onClick={() =>
              window.history.back()
            }
            style={styles.backButton}
          >
             Back
          </button>
        </header>

        {/* SUCCESS MESSAGE */}

        {successMessage && (
          <div style={styles.successBox}>
             {successMessage}
          </div>
        )}

        {/* FILTERS */}

        <section className="filterCard" style={styles.filterCard}>
          <div className="filterTitle" style={styles.filterTitle}>
             Search Attendance
          </div>

          <div className="filterGrid" style={styles.filterGrid}>

            <div className="inputGroup" style={styles.inputGroup}>
              <label className="label" style={styles.label}>
                Search Student
              </label>

              <input
                className="input"
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Name or username..."
                style={styles.input}
              />
            </div>

            <div className="inputGroup" style={styles.inputGroup}>
              <label className="label" style={styles.label}>Month</label>
              <select className="input" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={styles.input}>
                <option value="">All months</option>
                {availableMonths.map((value) => <option key={value} value={value}>{new Date(`${value}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</option>)}
              </select>
            </div>

            <div className="inputGroup" style={styles.inputGroup}>
              <label className="label" style={styles.label}>
                Attendance Date
              </label>

              <select
                className="input"
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
              className="clearButtonWrapper"
              style={
                styles.clearButtonWrapper
              }
            >
              <button
                className="clearButton"
                onClick={clearFilters}
                style={styles.clearButton}
              >
                 Clear Filters
              </button>
            </div>

          </div>
        </section>

        {/* SUMMARY */}

        <section className="statsGrid" style={styles.statsGrid}>

          <div className="statCard" style={styles.statCard}>
            <div
              className="statIcon"
              style={{
                ...styles.statIcon,
                background: "#dbeafe",
              }}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="#2f73d9" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 3.5h6v3H9zM8.5 11h7M8.5 15h7"/></svg>
            </div>

            <div>
              <div className="statLabel" style={styles.statLabel}>
                Records
              </div>

              <div className="statValue" style={styles.statValue}>
                {totalCount}
              </div>

              <div className="statText" style={styles.statText}>
                Attendance records
              </div>
            </div>
          </div>

          <div className="statCard" style={styles.statCard}>
            <div
              className="statIcon"
              style={{
                ...styles.statIcon,
                background: "#dcfce7",
              }}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="#15935b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16.5 9"/></svg>
            </div>

            <div>
              <div className="statLabel" style={styles.statLabel}>
                Present
              </div>

              <div
                className="statValue"
                style={{
                  ...styles.statValue,
                  color: "#15803d",
                }}
              >
                {presentCount}
              </div>

              <div className="statText" style={styles.statText}>
                Students present
              </div>
            </div>
          </div>

          <div className="statCard" style={styles.statCard}>
            <div
              className="statIcon"
              style={{
                ...styles.statIcon,
                background: "#fee2e2",
              }}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="#d93b45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></svg>
            </div>

            <div>
              <div className="statLabel" style={styles.statLabel}>
                Absent
              </div>

              <div
                className="statValue"
                style={{
                  ...styles.statValue,
                  color: "#dc2626",
                }}
              >
                {absentCount}
              </div>

              <div className="statText" style={styles.statText}>
                Students absent
              </div>
            </div>
          </div>

        </section>

        {/* ERROR */}

        {errorMessage && (
          <div style={styles.errorBox}>
             {errorMessage}
          </div>
        )}

        {/* HISTORY */}

        <section className="mobile-history-card" style={styles.historyCard}>

          <div className="historyHeader" style={styles.historyHeader}>
            <div>
              <h2 className="historyTitle" style={styles.historyTitle}>
                 Attendance Records
              </h2>

              <p className="historySubtitle" style={styles.historySubtitle}>
                {selectedDate
                  ? `Showing records for ${formatDate(
                      selectedDate
                    )}`
                  : "Showing all available records"}
              </p>
            </div>

            <button
              className="refreshButton"
              onClick={loadData}
              style={styles.refreshButton}
            >
               Refresh
            </button>
          </div>

          {loading ? (
            <div style={styles.loadingBox}>
              <div style={styles.loadingIcon}>
                
              </div>

              <h3 style={styles.loadingTitle}>
                Loading attendance...
              </h3>

              <p style={styles.loadingText}>
                Please wait while records are
                being loaded.
              </p>
            </div>
          ) : studentHistoryRows.length === 0 ? (
            <div style={styles.emptyBox}>
              <div style={styles.emptyIcon}>
                
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
            <div className="student-summary-list" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(245px, 1fr))", gap: 9 }}>
              {studentHistoryRows.map((row) => (
                <button key={row.student.id} type="button" onClick={() => setSelectedStudentId(row.student.id)} aria-label={`View all attendance for ${row.student.student_name || row.student.student_username}`} className="student-summary-row" style={{ display: "grid", gridTemplateColumns: "38px minmax(0,1fr) auto", alignItems: "center", gap: 10, width: "100%", minWidth: 0, padding: "11px 12px", border: "1px solid #dce7f5", borderRadius: 13, background: "#fff", color: "#17345d", textAlign: "left", cursor: "pointer", boxShadow: "0 3px 10px rgba(31,65,120,.04)" }}>
                  <span aria-hidden="true" style={{ display: "grid", placeItems: "center", width: 36, height: 36, minWidth: 36, borderRadius: "50%", background: "#dbeafe", color: "#2563eb", fontSize: 14, fontWeight: 900 }}>{(row.student.student_name || row.student.student_username || "S").charAt(0).toUpperCase()}</span>
                  <span style={{ display: "grid", gap: 3, minWidth: 0, overflow: "hidden" }}>
                    <strong className="student-summary-name" style={{ display: "block", minWidth: 0, color: "#142b57", fontSize: 13, lineHeight: 1.2, fontWeight: 850, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", wordBreak: "normal", overflowWrap: "normal" }}>{row.student.student_name || "Student"}</strong>
                    <small style={{ color: "#71809a", fontSize: 10, fontWeight: 750, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.student.student_username} · {row.latestDate ? formatDate(row.latestDate) : "No records yet"}</small>
                  </span>
                  <span style={{ display: "grid", justifyItems: "end", gap: 4, flexShrink: 0 }}>
                    <strong style={{ color: "#2860ae", fontSize: 11 }}>{row.total} records</strong>
                    <small style={{ color: "#62748c", fontSize: 9, fontWeight: 750 }}>{row.present} P · {row.absent} A</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* DELETE INFORMATION */}

        <section style={styles.deleteInfoCard}>
          <div style={styles.deleteInfoIcon}>
            
          </div>

          <div>
            <h3 style={styles.deleteInfoTitle}>
              Delete Incorrect Attendance
            </h3>

            <p style={styles.deleteInfoText}>
              Agar galti se Sunday, holiday ya kisi
              wrong date ki attendance mark ho gayi
              hai, to us record ke saamne
              <strong> Delete </strong>
              button dabakar attendance remove
              kar sakte hain.
            </p>

            <p style={styles.deleteWarning}>
               Delete karne ke baad attendance
              record permanently remove ho jayega.
            </p>
          </div>
        </section>

        {/* FOOTER */}

        <footer style={styles.footer}>
          Attendance Portal  Teacher Attendance
          History  2026
        </footer>

        {selectedStudent && (
          <div role="presentation" onClick={() => setSelectedStudentId(null)} style={{ position: "fixed", inset: "108px 0 72px", zIndex: 10000, display: "grid", placeItems: "center", padding: 12, background: "rgba(13,29,53,.55)" }}>
            <section role="dialog" aria-modal="true" aria-label={`${selectedStudent.student_name || "Student"} attendance`} className="attendance-student-modal" onClick={(event) => event.stopPropagation()} style={{ width: "min(100%, 720px)", maxHeight: "calc(100dvh - 200px)", overflow: "auto", padding: 20, borderRadius: 18, background: "#fff", boxShadow: "0 24px 80px rgba(10,25,48,.25)" }}>
              <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
                <div><div style={{ color: "#64748b", fontSize: 11, fontWeight: 800 }}>STUDENT ATTENDANCE</div><h2 style={{ margin: "5px 0", color: "#17345d", fontSize: 21 }}>{selectedStudent.student_name || "Student"}</h2><div style={{ color: "#728099", fontSize: 12 }}>{selectedStudent.student_username} · {selectedStudentRecords.length} records</div></div>
                <button type="button" aria-label="Close attendance details" onClick={() => setSelectedStudentId(null)} style={{ border: "1px solid #dbe4ef", borderRadius: 10, padding: "8px 11px", background: "#f8fafc", color: "#334155", cursor: "pointer" }}>Close</button>
              </header>
              <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginBottom: 14 }}>
                <select aria-label="Attendance month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{ ...styles.input, width: "auto", minWidth: 190 }}><option value="">All months</option>{availableMonths.map((value) => <option key={value} value={value}>{new Date(`${value}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</option>)}</select>
                <button type="button" onClick={exportStudentRecords} style={{ ...styles.refreshButton, background: "#176b45", border: 0 }}>Export Excel</button>
                <button type="button" onClick={downloadSelectedStudentPdf} style={{ ...styles.refreshButton, background: "#1e3a8a", border: 0 }}>Download PDF</button>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {selectedStudentRecords.length === 0 ? <p style={{ color: "#64748b" }}>No attendance records for this month.</p> : selectedStudentRecords.map((record) => (
                  <div key={`${record.source}-${record.id}`} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", alignItems: "center", gap: 10, padding: "11px 12px", border: "1px solid #e5ebf3", borderRadius: 12 }}>
                    <strong style={{ color: "#334b68", fontSize: 13 }}>{formatDate(record.attendance_date)}{record.source === "extra" ? <small style={{ display: "block", color: "#a15b12", marginTop: 3 }}>{record.subject || "Extra Class"} · Extra Class</small> : <small style={{ display: "block", color: "#64748b", marginTop: 3 }}>Regular Class</small>}</strong>
                    <span style={{ color: record.status.toLowerCase() === "present" ? "#16804c" : "#c43d45", fontSize: 12, fontWeight: 800 }}>{record.status}</span>
                    <button type="button" disabled={deleting === `${record.source}-${record.id}`} onClick={() => void deleteAttendance(record)} style={{ border: "1px solid #f0d0d0", borderRadius: 8, padding: "6px 9px", background: "#fff7f7", color: "#b4232d", cursor: "pointer" }}>Delete</button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

      </div>
    </main>
  );
}

const styles: {
  [key: string]: React.CSSProperties;
} = {
  page: {
    overflowX: "hidden",
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

  successBox: {
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #bbf7d0",
    borderRadius: "12px",
    padding: "15px",
    marginBottom: "20px",
    fontWeight: "800",
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
    overflowX: "hidden",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
  },

  table: {
    width: "100%",
    minWidth: "0",
    borderCollapse: "collapse",
    background: "#ffffff",
  },

  th: {
    background: "#172554",
    color: "#ffffff",
    padding: "9px",
    textAlign: "left",
    fontSize: "12px",
    fontWeight: "900",
    whiteSpace: "normal",
  },

  td: {
    padding: "9px",
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
    boxShadow:
      "0 4px 10px rgba(220,38,38,0.18)",
  },

  deleteInfoCard: {
    marginTop: "20px",
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    gap: "14px",
    alignItems: "flex-start",
  },

  deleteInfoIcon: {
    fontSize: "30px",
    flexShrink: 0,
  },

  deleteInfoTitle: {
    margin: 0,
    color: "#9a3412",
    fontSize: "17px",
    fontWeight: "900",
  },

  deleteInfoText: {
    margin: "7px 0 0",
    color: "#7c2d12",
    fontSize: "13px",
    lineHeight: 1.6,
    fontWeight: "600",
  },

  deleteWarning: {
    margin: "8px 0 0",
    color: "#b91c1c",
    fontSize: "12px",
    fontWeight: "800",
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









