"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { isOnOrAfterAdmission } from "../../../../lib/admission-date";
import { getMonthlyFeeRate, getStudentClassLabel } from "../../../../lib/fee-rates";
import styles from "./attendance-calculator.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Student = { id: number; student_name: string | null; student_username: string; admission_date: string | null; [key: string]: unknown };
type Attendance = { student_id: number; attendance_date: string; status: string };

const today = () => new Date().toISOString().slice(0, 10);
const money = (amount: number) => `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const monthStart = (value: string) => `${value.slice(0, 7)}-01`;
const nextMonthStart = (value: string) => {
  const [year, month] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
};

export default function AttendanceFeeCalculatorPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [studentId, setStudentId] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [includeAbsences, setIncludeAbsences] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadStudents() {
      setLoadingStudents(true);
      setError("");
      try {
        const teacherId = Number(localStorage.getItem("attendance_teacher_id") || "0");
        if (!Number.isInteger(teacherId) || teacherId <= 0) throw new Error("Teacher session not found. Please sign in again.");
        let ids: number[] | null = null;
        if (teacherId !== 1) {
          const { data, error: assignmentError } = await supabase.rpc("get_teacher_assigned_student_ids", { p_teacher_id: teacherId });
          if (assignmentError) throw assignmentError;
          ids = (data || []).map((row: { student_id: number }) => Number(row.student_id)).filter((id: number) => Number.isInteger(id) && id > 0);
        }
        if (ids && ids.length === 0) {
          if (!cancelled) setStudents([]);
          return;
        }
        let query = supabase.from("students").select("*").eq("is_active", true).order("student_name", { ascending: true });
        if (ids) query = query.in("id", ids);
        const { data, error: studentsError } = await query;
        if (studentsError) throw studentsError;
        if (!cancelled) setStudents((data || []) as Student[]);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load assigned students.");
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    }
    loadStudents();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadAttendance() {
      const selectedId = Number(studentId);
      if (!selectedId || !startDate || !endDate || startDate >= endDate) {
        setAttendance([]);
        setLoadingAttendance(false);
        return;
      }
      setLoadingAttendance(true);
      setError("");
      try {
        const { data, error: attendanceError } = await supabase.from("attendance")
          .select("student_id, attendance_date, status")
          .eq("student_id", selectedId)
          .gte("attendance_date", monthStart(startDate))
          .lt("attendance_date", nextMonthStart(endDate))
          .order("attendance_date", { ascending: true });
        if (attendanceError) throw attendanceError;
        if (!cancelled) setAttendance((data || []) as Attendance[]);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load attendance records.");
        if (!cancelled) setAttendance([]);
      } finally {
        if (!cancelled) setLoadingAttendance(false);
      }
    }
    loadAttendance();
    return () => { cancelled = true; };
  }, [studentId, startDate, endDate]);

  const student = students.find((item) => String(item.id) === studentId);
  const recordedDays = useMemo(() => {
    if (!student) return [];
    return [...new Map(attendance
      .filter((row) => row.attendance_date >= startDate && row.attendance_date < endDate && ["present", "absent"].includes(row.status.trim().toLowerCase()) && isOnOrAfterAdmission(student.admission_date, row.attendance_date))
      .map((row) => [row.attendance_date, { date: row.attendance_date, status: row.status.trim().toLowerCase() }]))
      .values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [attendance, student, startDate, endDate]);
  const presentCount = recordedDays.filter((day) => day.status === "present").length;
  const absentCount = recordedDays.filter((day) => day.status === "absent").length;
  const billableDays = recordedDays.filter((day) => day.status === "present" || (includeAbsences && day.status === "absent"));
  const classLabel = student ? getStudentClassLabel(student) : "";
  const monthlyFeeFor = (date: string) => getMonthlyFeeRate(classLabel, Number(date.slice(0, 4)), Number(date.slice(5, 7)));
  const daysInMonthFor = (date: string) => new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0)).getUTCDate();
  const dailyRateFor = (date: string) => {
    const daysInMonth = daysInMonthFor(date);
    return daysInMonth > 0 ? monthlyFeeFor(date) / daysInMonth : 0;
  };
  const totalDue = billableDays.reduce((sum, day) => sum + dailyRateFor(day.date), 0);
  const selectedMonthlyFee = student && startDate ? monthlyFeeFor(startDate) : 0;
  const dateInvalid = Boolean(startDate && endDate && startDate >= endDate);
  const exportRows = recordedDays.map(({ date, status }) => {
    const billable = status === "present" || includeAbsences;
    const dailyAmount = billable ? dailyRateFor(date) : 0;
    return {
      date,
      status: status === "present" ? "Present" : "Absent",
      billing: billable ? "Included" : "Not included",
      monthlyFee: monthlyFeeFor(date),
      calendarDaysInMonth: daysInMonthFor(date),
      dailyAmount,
    };
  });
  const exportDisabled = !student || loadingAttendance || dateInvalid;
  const safeStudentName = (student?.student_username || student?.student_name || "student").replace(/[^a-z0-9-_]/gi, "_");

  function exportExcel() {
    if (exportDisabled || !student) return;
    const summary = XLSX.utils.aoa_to_sheet([
      ["RACER ACADEMY — ATTENDANCE FEE STATEMENT"],
      ["Student", student.student_name || student.student_username],
      ["Username", student.student_username],
      ["Student ID", student.id],
      ["Period", `${startDate} inclusive to ${endDate} exclusive`],
      ["Class", classLabel || "Not set"],
      ["Monthly fee (INR)", selectedMonthlyFee],
      ["Include absent days", includeAbsences ? "Yes" : "No"],
      ["Present days", presentCount],
      ["Absent days", absentCount],
      ["Billable days", billableDays.length],
      ["Total fee (INR)", totalDue],
      ["Calculation", "For each recorded billable attendance day: class monthly fee ÷ actual calendar days in that month."],
      ["Generated", new Date().toLocaleString("en-IN")],
    ]);
    summary["!cols"] = [{ wch: 35 }, { wch: 75 }];
    const detail = XLSX.utils.json_to_sheet(exportRows.map((row) => ({
      Date: row.date,
      Status: row.status,
      Billing: row.billing,
      "Monthly fee (INR)": row.monthlyFee,
      "Calendar days in month": row.calendarDaysInMonth,
      "Daily charge (INR)": Number(row.dailyAmount.toFixed(2)),
    })));
    detail["!cols"] = [{ wch: 15 }, { wch: 13 }, { wch: 16 }, { wch: 20 }, { wch: 22 }, { wch: 20 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summary, "Fee Summary");
    XLSX.utils.book_append_sheet(workbook, detail, "Attendance Details");
    XLSX.writeFile(workbook, `RACER_ACADEMY_FEE_STATEMENT_${safeStudentName}_${startDate}_${endDate}.xlsx`);
  }

  function exportPdf() {
    if (exportDisabled || !student) return;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFillColor(12, 76, 145);
    doc.rect(0, 0, pageWidth, 34, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("RACER ACADEMY", 14, 14);
    doc.setFontSize(10);
    doc.text("ATTENDANCE FEE STATEMENT", 14, 24);
    doc.setTextColor(25, 43, 68);
    doc.setFontSize(10);
    doc.text(`Student: ${student.student_name || student.student_username}`, 14, 45);
    doc.text(`Username / ID: ${student.student_username} / ${student.id}`, 14, 52);
    doc.text(`Class: ${classLabel || "Not set"}`, 14, 59);
    doc.text(`Period: ${startDate} to ${endDate} (end date not included)`, 14, 66);
    doc.text(`Monthly fee: INR ${selectedMonthlyFee.toFixed(2)}`, 14, 73);
    doc.text(`Include absent days: ${includeAbsences ? "Yes" : "No"}`, 14, 80);
    doc.text(`Present: ${presentCount}   Absent: ${absentCount}   Billable: ${billableDays.length}`, 14, 87);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(`TOTAL FEE: INR ${totalDue.toFixed(2)}`, 14, 98);
    doc.setFontSize(8);
    doc.text("Date", 14, 110);
    doc.text("Status", 70, 110);
    doc.text("Billing", 108, 110);
    doc.text("Daily charge (INR)", 150, 110);
    doc.setDrawColor(185, 198, 215);
    doc.line(14, 113, pageWidth - 14, 113);
    let y = 120;
    for (const row of exportRows) {
      if (y > 278) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(45, 63, 86);
      doc.text(row.date, 14, y);
      doc.text(row.status, 70, y);
      doc.text(row.billing, 108, y);
      doc.text(row.billing === "Included" ? row.dailyAmount.toFixed(2) : "—", 150, y);
      y += 7;
    }
    if (exportRows.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("No attendance records found for this period.", 14, y);
    }
    y += 8;
    if (y > 280) { doc.addPage(); y = 20; }
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Each billable day = class monthly fee ÷ actual calendar days in that month.", 14, y);
    doc.save(`RACER_ACADEMY_FEE_STATEMENT_${safeStudentName}_${startDate}_${endDate}.pdf`);
  }

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <a className={styles.back} href="/teacher/dashboard">← Back to dashboard</a>
        <header className={styles.header}>
          <div className={styles.mark}>₹</div>
          <div><p className={styles.eyebrow}>FINANCE · ATTENDANCE BILLING</p><h1>Attendance Fee Calculator</h1><p className={styles.subtitle}>Calculate a student’s fee from their recorded attendance.</p></div>
        </header>

        <section className={styles.panel} aria-labelledby="calculator-heading">
          <div className={styles.panelTitle}><div><p className={styles.step}>BILLING DETAILS</p><h2 id="calculator-heading">Choose a student and date range</h2></div><span className={styles.live}>LIVE CALCULATION</span></div>
          <div className={styles.fields}>
            <label className={styles.field}><span>Student</span><select value={studentId} onChange={(event) => setStudentId(event.target.value)} disabled={loadingStudents}>
              <option value="">{loadingStudents ? "Loading assigned students…" : "Select a student"}</option>
              {students.map((item) => <option key={item.id} value={item.id}>{item.student_name || item.student_username} · {getStudentClassLabel(item) || "Class not set"} · #{item.id}</option>)}
            </select></label>
            <label className={styles.field}><span>Starting date</span><input type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} /></label>
            <label className={styles.field}><span>End date (not included)</span><input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} /></label>
            <label className={styles.field}><span>Class monthly fee</span><div className={styles.moneyInput}><span>₹</span><input type="text" readOnly value={student ? selectedMonthlyFee : ""} placeholder="Select a student" /></div></label>
          </div>
          <label className={styles.absenceOption}>
            <input type="checkbox" checked={includeAbsences} onChange={(event) => setIncludeAbsences(event.target.checked)} />
            <span className={styles.switch} aria-hidden="true" />
            <span className={styles.optionCopy}><strong>Include absent days</strong><small>When on, recorded Present and Absent days are included in the fee.</small></span>
          </label>
          {dateInvalid && <p className={styles.error}>End date must be on or after the starting date.</p>}
          {error && <p className={styles.error} role="alert">{error}</p>}
          {!loadingStudents && students.length === 0 && !error && <p className={styles.empty}>No active students are assigned to this teacher.</p>}
        </section>

        <section className={styles.result} aria-live="polite">
          <div className={styles.resultHead}><div><p className={styles.step}>ATTENDANCE SUMMARY</p><h2>{student ? student.student_name || student.student_username : "Select a student"}</h2><p>{student ? `${classLabel || "Class not set"} · ${startDate} — ${endDate}` : "Your calculated total will appear here."}</p></div><div className={styles.amount}><span>Attendance based fee</span><strong>{money(totalDue)}</strong></div></div>
          <div className={styles.stats}>
            <div><span>Present days</span><strong>{loadingAttendance ? "…" : presentCount}</strong></div>
            <div><span>Absent days</span><strong>{loadingAttendance ? "…" : absentCount}</strong></div>
            <div><span>Billable days</span><strong>{loadingAttendance ? "…" : billableDays.length}</strong></div>
            <div><span>Monthly fee</span><strong>{student ? money(selectedMonthlyFee) : "—"}</strong></div>
          </div>
          <p className={styles.note}>{includeAbsences ? "Recorded Present and Absent days are counted." : "Only recorded Present days are counted; absent days are shown below but excluded from the fee."} Each billable day is monthly fee ÷ actual calendar days in that month (30 or 31). The end date is a cutoff and is not included; for example, Aug 1 to Sep 1 is one full August billing period.</p>
        </section>

        <section className={styles.attendance}>
          <div className={styles.attendanceHead}><div><p className={styles.step}>RECORDED DAYS</p><h2>Attendance records</h2></div><div className={styles.attendanceActions}><span>{recordedDays.length} {recordedDays.length === 1 ? "day" : "days"}</span><button type="button" className={styles.exportButton} onClick={exportPdf} disabled={exportDisabled}>Download PDF</button><button type="button" className={styles.exportButton} onClick={exportExcel} disabled={exportDisabled}>Download Excel</button></div></div>
          {!student ? <p className={styles.empty}>Choose a student to see attendance.</p> : loadingAttendance ? <p className={styles.empty}>Loading attendance…</p> : dateInvalid ? <p className={styles.empty}>Choose an end date after the starting date.</p> : recordedDays.length === 0 ? <p className={styles.empty}>No attendance records found in this date range.</p> : <ul className={styles.dateList}>{recordedDays.map(({ date, status }) => { const charge = status === "present" || includeAbsences; const dailyRate = dailyRateFor(date); return <li key={date}><span className={`${styles.check} ${status === "absent" ? styles.absent : ""}`}>{status === "present" ? "✓" : "×"}</span><span>{new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}<small className={styles.statusLabel}>{status === "present" ? "Present" : "Absent"} · {daysInMonthFor(date)}-day month</small></span><strong className={charge ? "" : styles.excluded}>{charge ? money(dailyRate) : "Not included"}</strong></li>; })}</ul>}
        </section>
      </div>
    </main>
  );
}
