"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { isOnOrAfterAdmission } from "../../../../lib/admission-date";
import styles from "./attendance-calculator.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Student = { id: number; student_name: string | null; student_username: string; admission_date: string | null };
type Attendance = { student_id: number; attendance_date: string; status: string };

const today = () => new Date().toISOString().slice(0, 10);
const money = (amount: number) => `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AttendanceFeeCalculatorPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [studentId, setStudentId] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [monthlyFee, setMonthlyFee] = useState("");
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
        let query = supabase.from("students").select("id, student_name, student_username, admission_date").eq("is_active", true).order("student_name", { ascending: true });
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
      if (!selectedId || !startDate || !endDate || startDate > endDate) {
        setAttendance([]);
        return;
      }
      setLoadingAttendance(true);
      setError("");
      try {
        const { data, error: attendanceError } = await supabase.from("attendance")
          .select("student_id, attendance_date, status")
          .eq("student_id", selectedId)
          .gte("attendance_date", startDate)
          .lte("attendance_date", endDate)
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
  const presentDates = useMemo(() => {
    if (!student) return [];
    return [...new Set(attendance.filter((row) => row.status.trim().toLowerCase() === "present" && isOnOrAfterAdmission(student.admission_date, row.attendance_date)).map((row) => row.attendance_date))].sort();
  }, [attendance, student]);
  const feeAmount = Number(monthlyFee);
  const totalDue = useMemo(() => presentDates.reduce((sum, date) => {
    const [year, month] = date.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    return sum + (Number.isFinite(feeAmount) && feeAmount > 0 ? feeAmount / daysInMonth : 0);
  }, 0), [presentDates, feeAmount]);
  const dateInvalid = Boolean(startDate && endDate && startDate > endDate);

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <a className={styles.back} href="/teacher/dashboard">← Back to dashboard</a>
        <header className={styles.header}>
          <div className={styles.mark}>₹</div>
          <div><p className={styles.eyebrow}>FINANCE · ATTENDANCE BILLING</p><h1>Attendance Fee Calculator</h1><p className={styles.subtitle}>Calculate a student’s fee from their recorded present days.</p></div>
        </header>

        <section className={styles.panel} aria-labelledby="calculator-heading">
          <div className={styles.panelTitle}><div><p className={styles.step}>BILLING DETAILS</p><h2 id="calculator-heading">Choose a student and date range</h2></div><span className={styles.live}>LIVE CALCULATION</span></div>
          <div className={styles.fields}>
            <label className={styles.field}><span>Student</span><select value={studentId} onChange={(event) => setStudentId(event.target.value)} disabled={loadingStudents}>
              <option value="">{loadingStudents ? "Loading assigned students…" : "Select a student"}</option>
              {students.map((item) => <option key={item.id} value={item.id}>{item.student_name || item.student_username} · #{item.id}</option>)}
            </select></label>
            <label className={styles.field}><span>Starting date</span><input type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} /></label>
            <label className={styles.field}><span>End date</span><input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} /></label>
            <label className={styles.field}><span>Monthly fee</span><div className={styles.moneyInput}><span>₹</span><input type="number" min="0" step="0.01" inputMode="decimal" placeholder="e.g. 2500" value={monthlyFee} onChange={(event) => setMonthlyFee(event.target.value)} /></div></label>
          </div>
          {dateInvalid && <p className={styles.error}>End date must be on or after the starting date.</p>}
          {error && <p className={styles.error} role="alert">{error}</p>}
          {!loadingStudents && students.length === 0 && !error && <p className={styles.empty}>No active students are assigned to this teacher.</p>}
        </section>

        <section className={styles.result} aria-live="polite">
          <div className={styles.resultHead}><div><p className={styles.step}>ATTENDANCE SUMMARY</p><h2>{student ? student.student_name || student.student_username : "Select a student"}</h2><p>{student ? `${startDate} — ${endDate}` : "Your calculated total will appear here."}</p></div><div className={styles.amount}><span>Attendance based fee</span><strong>{money(totalDue)}</strong></div></div>
          <div className={styles.stats}>
            <div><span>Present days</span><strong>{loadingAttendance ? "…" : presentDates.length}</strong></div>
            <div><span>Monthly fee</span><strong>{Number.isFinite(feeAmount) && feeAmount > 0 ? money(feeAmount) : "—"}</strong></div>
            <div><span>Average per present day</span><strong>{presentDates.length > 0 ? money(totalDue / presentDates.length) : "—"}</strong></div>
          </div>
          <p className={styles.note}>Only recorded “Present” days are counted. Each present day is charged at the monthly fee ÷ calendar days in that attendance month.</p>
        </section>

        <section className={styles.attendance}>
          <div className={styles.attendanceHead}><div><p className={styles.step}>RECORDED DAYS</p><h2>Present attendance</h2></div><span>{presentDates.length} {presentDates.length === 1 ? "day" : "days"}</span></div>
          {!student ? <p className={styles.empty}>Choose a student to see attendance.</p> : loadingAttendance ? <p className={styles.empty}>Loading attendance…</p> : presentDates.length === 0 ? <p className={styles.empty}>No present attendance found in this date range.</p> : <ul className={styles.dateList}>{presentDates.map((date) => <li key={date}><span className={styles.check}>✓</span><span>{new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</span><strong>{Number.isFinite(feeAmount) && feeAmount > 0 ? money(feeAmount / new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0).getDate()) : "Enter monthly fee"}</strong></li>)}</ul>}
        </section>
      </div>
    </main>
  );
}
