"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import {
  calculateMonthlyTotals,
  isSaturday,
  isSubmittedQuizResult,
  latestSubmittedQuizResult,
  monthLabelFromKey,
  quizTargetsStudent,
  safeNumber,
  type MonthlyResultSnapshot,
} from "../../../lib/monthly-result";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}
function monthStart(key: string) { return `${key}-01`; }
function monthEnd(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}
function formatDate(value: string) {
  if (!value) return "---";
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-IN");
}
function isoForISTDateTime(input: string) {
  if (!input) return null;
  const [date, time] = input.split("T");
  if (!date || !time) return null;
  return new Date(`${date}T${time}:00+05:30`).toISOString();
}
function isoToISTInput(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const ist = new Date(d.getTime() + 330 * 60 * 1000);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth()+1).padStart(2,"0")}-${String(ist.getUTCDate()).padStart(2,"0")}T${String(ist.getUTCHours()).padStart(2,"0")}:${String(ist.getUTCMinutes()).padStart(2,"0")}`;
}
function defaultReleaseInput(key: string) {
  const [y, m] = key.split("-").map(Number);
  const last = new Date(y, m, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}T09:00`;
}
function getLastSaturday(key: string) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m, 0);
  while (d.getDay() !== 6) d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function drawHeader(doc: jsPDF, title: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("RACER ACADEMY", 105, 18, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Monthly Academic Result", 105, 25, { align: "center" });
  doc.line(15, 29, 195, 29);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, 105, 38, { align: "center" });
}
function pdfSnapshot(snapshot: MonthlyResultSnapshot) {
  const pdfText = (value: unknown) => value === null || value === undefined ? "" : String(value);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawHeader(doc, `${snapshot.monthLabel} - ${snapshot.student.name}`);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("STUDENT DETAILS", 15, 50);
  doc.setFont("helvetica", "normal");
  const details = [
    ["Student Name", snapshot.student.name, "Father / Guardian", snapshot.student.fatherName || "---"],
    ["Class", snapshot.student.className || "---"],
    ["Student ID", String(snapshot.student.id), "Medium", snapshot.student.medium || "---"],
    ["Academic Session", snapshot.student.academicSession || "---"],
  ];
  let y = 58;
  for (const row of details) {
    doc.setFont("helvetica", "bold"); doc.text(pdfText(row[0]), 15, y);
    doc.setFont("helvetica", "normal"); doc.text(String(row[1]), 55, y);
    doc.setFont("helvetica", "bold"); doc.text(pdfText(row[2]), 110, y);
    doc.setFont("helvetica", "normal"); doc.text(String(row[3]), 150, y);
    y += 7;
  }
  y += 5;
  doc.setFont("helvetica", "bold"); doc.text("1. QUIZ PERFORMANCE", 15, y); y += 7;
  doc.setFontSize(8);
  doc.text("Quiz", 15, y); doc.text("Date", 80, y); doc.text("Marks", 125, y); doc.text("%", 155, y); doc.text("Status", 175, y); y += 5;
  doc.setFont("helvetica", "normal");
  for (const q of snapshot.quizzes) {
    if (y > 280) { doc.addPage(); drawHeader(doc, "Quiz Performance (continued)"); y = 48; }
    doc.text(String(q.title).slice(0, 32), 15, y); doc.text(formatDate(q.date), 80, y); doc.text(`${q.obtained}/${q.total}`, 125, y); doc.text(`${q.percentage.toFixed(1)}%`, 155, y); doc.text(q.percentage >= snapshot.totals.passPercentage ? "PASS" : "FAIL", 175, y); y += 5;
  }
  if (!snapshot.quizzes.length) { doc.text("No submitted / eligible quiz was included.", 15, y); y += 5; }
  y += 5; doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text("2. SATURDAY WEEKLY TESTS", 15, y); y += 7;
  doc.setFontSize(8); doc.text("Test", 15, y); doc.text("Date", 80, y); doc.text("Marks", 125, y); doc.text("%", 155, y); y += 5; doc.setFont("helvetica", "normal");
  for (const t of snapshot.weeklyTests) {
    if (y > 280) { doc.addPage(); drawHeader(doc, "Saturday Weekly Tests (continued)"); y = 48; }
    doc.text(String(t.name).slice(0, 32), 15, y); doc.text(formatDate(t.date), 80, y); doc.text(`${t.obtained}/${t.total}`, 125, y); doc.text(`${t.percentage.toFixed(1)}%`, 155, y); y += 5;
  }
  if (!snapshot.weeklyTests.length) { doc.text("No applicable Saturday weekly test was recorded.", 15, y); y += 5; }
  y += 6; doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text("3. MONTHLY MAHATEST", 15, y); y += 8;
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text(`Test Date: ${formatDate(snapshot.mahaTest.date)}`, 15, y); doc.text(`Duration: ${snapshot.mahaTest.durationMinutes} minutes`, 90, y); y += 7;
  doc.text(`Maximum Marks: ${snapshot.mahaTest.total}`, 15, y); doc.text(`Obtained: ${snapshot.mahaTest.obtained === null ? "Not entered" : snapshot.mahaTest.obtained}`, 90, y); y += 10;
  if (y > 260) { doc.addPage(); drawHeader(doc, "Final Calculation"); y = 50; }
  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text("4. FINAL CALCULATION", 15, y); y += 8;
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  const calc = [
    ["Quiz Marks", `${snapshot.totals.quizObtained} / ${snapshot.totals.quizTotal}`],
    ["Weekly Test Marks", `${snapshot.totals.weeklyObtained} / ${snapshot.totals.weeklyTotal}`],
    ["MahaTest Marks", `${snapshot.totals.mahaObtained} / ${snapshot.totals.mahaTotal}`],
    ["GRAND TOTAL", `${snapshot.totals.grandObtained} / ${snapshot.totals.grandTotal}`],
    ["PERCENTAGE", `${snapshot.totals.percentage.toFixed(2)}%`],
    ["FINAL STATUS", snapshot.totals.status],
  ];
  for (const [a,b] of calc) { doc.setFont("helvetica", "bold"); doc.text(pdfText(a), 25, y); doc.setFont("helvetica", "normal"); doc.text(pdfText(b), 105, y); y += 8; }
  y += 8; doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("OFFICIAL RESULT", 105, y, { align: "center" }); y += 9;
  doc.setFontSize(16); doc.text(pdfText(snapshot.totals.status), 105, y, { align: "center" }); y += 9;
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.text(`Result declared: ${new Date().toLocaleString("en-IN")}`, 105, y, { align: "center" });
  doc.setFontSize(8); doc.text("Teacher Remarks: Monthly performance calculated only from eligible, recorded and submitted academic work.", 15, 285);
  doc.text("RACER ACADEMY", 195, 292, { align: "right" });
  return doc;
}

export default function MonthlyResultsPage() {
  const [monthKey, setMonthKey] = useState("");
  const [releaseInput, setReleaseInput] = useState("");
  const [passPercentage, setPassPercentage] = useState("");
  const [mahaDate, setMahaDate] = useState("");
  const [mahaMarks, setMahaMarks] = useState<Record<number, string>>({});
  const [mahaRemarks, setMahaRemarks] = useState<Record<number, string>>({});
  const [students, setStudents] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [quizResults, setQuizResults] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<MonthlyResultSnapshot[]>([]);
  const [savedPeriods, setSavedPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setReleaseInput("");
    setMahaDate("");
    void loadMonth();
  }, [monthKey]);

  async function loadMonth() {
    setLoading(true); setError(""); setMessage("");
    try {
      const teacherId = Number(localStorage.getItem("attendance_teacher_id") || localStorage.getItem("teacher_id") || "0");
      let assigned: number[] | null = null;
      if (teacherId !== 1) {
        const { data, error } = await supabase.rpc("get_teacher_assigned_student_ids", { p_teacher_id: teacherId });
        if (error) throw error;
        assigned = (data || []).map((x: any) => Number(x.student_id));
      }
      const savedRes = await fetch(`/api/monthly-results/publish?monthKey=${encodeURIComponent(monthKey)}`);
      const savedData = await savedRes.json();
      if (!savedRes.ok || !savedData.success) throw new Error(savedData.error || "Saved monthly result load failed.");
      const listRes = await fetch("/api/monthly-results/publish?list=1");
      const listData = await listRes.json();
      if (listRes.ok && listData.success) setSavedPeriods(listData.periods || []);
      const [studentsRes, quizzesRes, resultsRes, testsRes] = await Promise.all([
        supabase.from("students").select("id,student_name,student_username,class_name,father_name,admission_date").order("class_name").order("student_name"),
        supabase.from("quiz_tests").select("id,title,subject,class_name,target_classes,scheduled_date,created_at").gte("scheduled_date", monthStart(monthKey)).lte("scheduled_date", monthEnd(monthKey)),
        supabase.from("quiz_results").select("id,quiz_id,student_id,attempt_number,total_marks,obtained_marks,percentage,submitted_at,submission_type,created_at"),
        supabase.from("academy_assessments").select("id,test_name,test_date,total_marks,student_id,obtained_marks,subject,attendance_status,remarks").gte("test_date", monthStart(monthKey)).lte("test_date", monthEnd(monthKey)).order("test_date"),
      ]);
      for (const r of [studentsRes, quizzesRes, resultsRes, testsRes]) if (r.error) throw r.error;
      const ss = (studentsRes.data || []).filter((s: any) => !assigned || assigned.includes(Number(s.id)));
      setStudents(ss); setQuizzes(quizzesRes.data || []); setQuizResults(resultsRes.data || []); setTests(testsRes.data || []);
      const period = savedData.period as any;
      if (period) {
        setPassPercentage(String(period.pass_percentage ?? 40));
        if (period.scheduled_release_at) setReleaseInput(isoToISTInput(String(period.scheduled_release_at)));
      }
      const mm: Record<number,string> = {}; const mr: Record<number,string> = {};
      for (const row of (savedData.marks || [])) { mm[Number(row.student_id)] = row.obtained_marks == null ? "" : String(row.obtained_marks); mr[Number(row.student_id)] = row.remarks || ""; }
      setMahaMarks(mm); setMahaRemarks(mr);
      const savedSnapshots = (savedData.results || []).map((r:any)=>r.snapshot).filter(Boolean);
      setSnapshots(savedSnapshots);
      if (savedData.period?.is_released) setMessage(`Published: ${savedData.period.month_label || monthLabelFromKey(monthKey)}${savedData.period.released_at ? ` on ${new Date(savedData.period.released_at).toLocaleString("en-IN")}` : ""}.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Monthly data load failed."); }
    finally { setLoading(false); }
  }

  function buildSnapshot(student: any): MonthlyResultSnapshot {
    const relevantQuizzes = quizzes.filter((q) => {
      const rows = quizResults.filter((r) => Number(r.quiz_id) === Number(q.id) && Number(r.student_id) === Number(student.id));
      const latest = latestSubmittedQuizResult(rows);
      const completedDate = latest?.submitted_at || latest?.created_at || "";
      return latest && isSubmittedQuizResult(latest) && String(completedDate).slice(0,7) === monthKey && quizTargetsStudent(q, student.class_name || "");
    });
    const qEntries = relevantQuizzes.map((q) => {
      const latest = latestSubmittedQuizResult(quizResults.filter((r) => Number(r.quiz_id) === Number(q.id) && Number(r.student_id) === Number(student.id)))!;
      const obtained = safeNumber(latest.obtained_marks), total = safeNumber(latest.total_marks);
      return { quizId: Number(q.id), title: q.title || "Quiz", subject: q.subject || "", date: q.scheduled_date || String(latest.submitted_at || latest.created_at).slice(0,10), obtained, total, percentage: total > 0 ? (obtained/total)*100 : 0 };
    });
    const tEntries = tests.filter((t) => Number(t.student_id) === Number(student.id) && isSaturday(t.test_date) && !/maha\s*test/i.test(String(t.test_name || "")) && String(t.attendance_status || "PRESENT").toUpperCase() === "PRESENT").map((t) => {
      const obtained = safeNumber(t.obtained_marks), total = safeNumber(t.total_marks);
      return { id: Number(t.id), name: t.test_name || "Saturday Test", subject: t.subject || "", date: t.test_date, obtained, total, percentage: total > 0 ? (obtained/total)*100 : 0 };
    });
    const mahaValue = mahaMarks[Number(student.id)] === undefined || mahaMarks[Number(student.id)] === "" ? null : Math.max(0, Math.min(100, Number(mahaMarks[Number(student.id)])));
    const totals = calculateMonthlyTotals({ quizzes: qEntries, weeklyTests: tEntries, mahaObtained: mahaValue, passPercentage: Number(passPercentage) || 40 });
    return {
      monthKey, monthLabel: monthLabelFromKey(monthKey),
      student: { id: Number(student.id), name: student.student_name || student.student_username || "Student", username: student.student_username || "", className: student.class_name || "", fatherName: student.father_name || "", rollNo: "", medium: "", academicSession: "2026-27" },
      quizzes: qEntries, weeklyTests: tEntries,
      mahaTest: { date: mahaDate, durationMinutes: 120, total: 100, obtained: mahaValue, remarks: mahaRemarks[Number(student.id)] || "" },
      totals, generatedAt: new Date().toISOString(),
    };
  }

  function applyMonthlyAwards(list: MonthlyResultSnapshot[]) {
  const group = (value: string) => {
    const c = String(value || "").trim().toUpperCase();
    if (c === "NURSERY" || c === "LKG" || c === "UKG") return "NURSERY-UKG";
    const n = parseInt(c.replace(/[^0-9]/g, ""), 10);
    if (Number.isFinite(n) && n >= 1 && n <= 5) return "CLASS 1-5";
    if (Number.isFinite(n) && n >= 6 && n <= 10) return "CLASS 6-10";
    return "OTHER";
  };
  const result = list.map(s => ({ ...s, position: 0 as number | undefined, award: "", awardGroup: group(s.student.className) }));
  for (const g of ["NURSERY-UKG","CLASS 1-5","CLASS 6-10"]) {
    const eligible = result.filter(s => s.awardGroup === g && s.totals.grandTotal > 0).sort((a,b) => b.totals.percentage - a.totals.percentage || b.totals.grandObtained - a.totals.grandObtained || a.student.name.localeCompare(b.student.name));
    eligible.slice(0, 3).forEach((s, index) => { const pos = index + 1; s.position = pos; s.award = pos === 1 ? "1st Position -Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬-ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â GIFT / SURPRISE AWARD" : pos === 2 ? "2nd Position --ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬-ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â GIFT / SURPRISE AWARD" : "3rd Position --ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬-ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â GIFT / SURPRISE AWARD"; });
  }
  return result;
}

const preview = useMemo(() => applyMonthlyAwards(students.map(buildSnapshot)), [students, quizzes, quizResults, tests, mahaMarks, mahaRemarks, mahaDate, passPercentage, monthKey]); const displaySnapshots = snapshots.length ? snapshots : preview;

  function calculatedSnapshots() {
    if (!students.length) return [];
    return applyMonthlyAwards(students.map(buildSnapshot));
  }

  async function persistMonthly(action:"save"|"schedule"|"publish") {
    setSaving(true); setError(""); setMessage("");
    try {
      if (!isSaturday(mahaDate)) throw new Error("MahaTest date must be a Saturday.");
      const releaseIso = releaseInput ? isoForISTDateTime(releaseInput) : null;
      if ((action === "schedule" || action === "publish") && !releaseIso) throw new Error("Please select a valid release date/time.");
      const teacherId = Number(localStorage.getItem("attendance_teacher_id") || localStorage.getItem("teacher_id") || "0");
      const finalSnapshots = calculatedSnapshots();
      if (!finalSnapshots.length) throw new Error("No student result data is available. Click Calculate first.");
      const now = new Date().toISOString();
      const markRows = students.map((s) => ({ month_key: monthKey, student_id: Number(s.id), obtained_marks: mahaMarks[Number(s.id)] === undefined || mahaMarks[Number(s.id)] === "" ? null : Math.max(0, Math.min(100, Number(mahaMarks[Number(s.id)]))), remarks: mahaRemarks[Number(s.id)] || null, updated_at: now }));
      const rows = finalSnapshots.map((s) => ({ month_key: monthKey, student_id: s.student.id, grand_obtained: s.totals.grandObtained, grand_total: s.totals.grandTotal, percentage: s.totals.percentage, result_status: s.totals.status, snapshot: s, generated_at: now, updated_at: now }));
      const response = await fetch("/api/monthly-results/publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,period:{month_key:monthKey,month_label:monthLabelFromKey(monthKey),scheduled_release_at:releaseIso,pass_percentage:Number(passPercentage)||40,created_by:teacherId||null},mahatest:{month_key:monthKey,test_date:mahaDate,duration_minutes:120,total_marks:100,created_by:teacherId||null},marks:markRows,results:rows})});
      const result=await response.json();
      if(!response.ok||!result.success) throw new Error(result.error||"Monthly result save failed.");
      setSnapshots(finalSnapshots);
      const label=monthLabelFromKey(monthKey);
      setMessage(action==="publish"?`${label} monthly result is published now.`:action==="schedule"?`${label} monthly result is scheduled for ${new Date(releaseIso || "").toLocaleString("en-IN")}.`:`${label} monthly result data saved successfully.`);
      const listRes=await fetch("/api/monthly-results/publish?list=1"); const listData=await listRes.json(); if(listRes.ok&&listData.success)setSavedPeriods(listData.periods||[]);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save monthly result."); }
    finally { setSaving(false); }
  }

  function calculateOnly() {
    setError("");
    const calculated=calculatedSnapshots();
    setSnapshots(calculated);
    setMessage(`Calculated monthly result for ${calculated.length} students. Click Save to store it permanently.`);
  }

  async function saveOnly(){ await persistMonthly("save"); }
  async function scheduleOnly(){ await persistMonthly("schedule"); }
  async function publishNow(){ await persistMonthly("publish"); }


  function downloadPdf(snapshot: MonthlyResultSnapshot) {
    try {
      const doc = pdfSnapshot(snapshot);
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "RACER_ACADEMY_" + snapshot.student.name.replace(/[^a-z0-9]+/gi,"_") + "_" + snapshot.monthKey + "_MONTHLY_RESULT.pdf";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      setError(e instanceof Error ? "PDF download failed: " + e.message : "PDF download failed.");
    }
  }
  function downloadExcel() {
    const rows: any[] = [];
    for (const s of (snapshots.length ? snapshots : preview)) {
      rows.push({ "Student ID": s.student.id, "Student Name": s.student.name, "Father Name": s.student.fatherName, "Class": s.student.className, "Username": s.student.username, "Month": s.monthLabel, "Quiz Total": s.totals.quizTotal, "Quiz Obtained": s.totals.quizObtained, "Weekly Test Total": s.totals.weeklyTotal, "Weekly Test Obtained": s.totals.weeklyObtained, "MahaTest /100": s.totals.mahaTotal ? s.totals.mahaObtained : "", "Grand Total": s.totals.grandTotal, "Obtained": s.totals.grandObtained, "Percentage": `${s.totals.percentage.toFixed(2)}%`, "Final Status": s.totals.status, "Quiz Details": s.quizzes.map(q=>`${q.title}: ${q.obtained}/${q.total}`).join(" | "), "Saturday Test Details": s.weeklyTests.map(t=>`${t.name} (${t.date}): ${t.obtained}/${t.total}`).join(" | "), "MahaTest Remarks": s.mahaTest.remarks });
    }
    const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Monthly Result"); XLSX.writeFile(wb, `RACER_ACADEMY_${monthKey}_MONTHLY_RESULT.xlsx`);
  }

  return <main style={{padding:"16px",maxWidth:1200,margin:"0 auto",fontFamily:"Arial,sans-serif"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:16}}><div><h1 style={{margin:0,color:"#0b3d7a"}}>Monthly Result</h1><p style={{margin:"5px 0",color:"#64748b"}}>Quiz + Saturday Weekly Tests + 100-Mark MahaTest</p></div><a href="/teacher/dashboard" style={{padding:"9px 13px",borderRadius:9,background:"#0b57a3",color:"#fff",textDecoration:"none",fontWeight:700}}>Dashboard</a></div>
    <section style={{background:"#fff",border:"1px solid #dbe7f5",borderRadius:14,padding:14,marginBottom:14}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10}}>
        <label>Result Month<input type="month" value={monthKey} onChange={e=>setMonthKey(e.target.value)} style={inputStyle}/></label>
        <label>Release Date & Time (IST)<input type="datetime-local" value={releaseInput} onChange={e=>setReleaseInput(e.target.value)} style={inputStyle}/></label>
        <label>Pass Percentage<input type="number" min="0" max="100" value={passPercentage} onChange={e=>setPassPercentage(e.target.value)} style={inputStyle}/></label>
        <label>MahaTest Saturday<input type="date" value={mahaDate} onChange={e=>setMahaDate(e.target.value)} style={inputStyle}/></label>
      </div>
      <div style={{marginTop:10,padding:10,borderRadius:10,background:"#eef7ff",color:"#124d83",fontWeight:700}}>MahaTest: 2 Hours - 100 Marks - Only one monthly Saturday test</div>
      {error && <div style={{marginTop:10,padding:10,borderRadius:8,background:"#fff1f2",color:"#b91c1c"}}>{error}</div>}
      {message && <div style={{marginTop:10,padding:10,borderRadius:8,background:"#ecfdf5",color:"#047857"}}>{message}</div>}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:12}}><button type="button" onClick={calculateOnly} style={buttonStyle}>CALCULATE</button><button type="button" onClick={saveOnly} style={buttonStyle}>SAVE</button><button type="button" onClick={scheduleOnly} style={buttonStyle}>SCHEDULE RESULT</button><button type="button" onClick={publishNow} style={{...buttonStyle,background:"#047857"}}>POST / PUBLISH RESULT</button></div>
    </section>
    <section style={{background:"#fff",border:"1px solid #dbe7f5",borderRadius:14,padding:14,marginBottom:14}}>
      <h2 style={{margin:"0 0 8px",fontSize:18}}>MahaTest Marks Entry</h2><p style={{margin:"0 0 10px",fontSize:12,color:"#64748b"}}>Blank marks are not counted as zero. They remain pending until entered.</p>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr><th style={th}>Student</th><th style={th}>Class</th><th style={th}>Marks /100</th><th style={th}>Remarks</th></tr></thead><tbody>{students.map(s=><tr key={s.id}><td style={td}><b>{s.student_name||s.student_username}</b><br/><small>{s.student_username}</small></td><td style={td}>{s.class_name||"---"}</td><td style={td}><input type="number" min="0" max="100" value={mahaMarks[s.id]??""} onChange={e=>setMahaMarks(x=>({...x,[s.id]:e.target.value}))} style={{...inputStyle,width:110}}/></td><td style={td}><input value={mahaRemarks[s.id]??""} onChange={e=>setMahaRemarks(x=>({...x,[s.id]:e.target.value}))} style={{...inputStyle,minWidth:220}}/></td></tr>)}</tbody></table></div>
    </section>
    
    <section style={{background:"#fff",border:"1px solid #dbe7f5",borderRadius:14,padding:14}}><h2 style={{margin:"0 0 10px",fontSize:18}}>Complete Monthly Results ({displaySnapshots.length})</h2>{loading?<p>Loading...</p>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}><thead><tr><th style={th}>Student</th><th style={th}>Quizzes</th><th style={th}>Weekly Tests</th><th style={th}>MahaTest</th><th style={th}>Grand Total</th><th style={th}>%</th><th style={th}>Status</th><th style={th}>PDF</th></tr></thead><tbody>{displaySnapshots.map(s=><tr key={s.student.id}><td style={td}><b>{s.student.name}</b><br/>{s.student.className}</td><td style={td}>{s.quizzes.length} - {s.totals.quizObtained}/{s.totals.quizTotal}</td><td style={td}>{s.weeklyTests.length} - {s.totals.weeklyObtained}/{s.totals.weeklyTotal}</td><td style={td}>{s.mahaTest.obtained===null?"Pending":`${s.mahaTest.obtained}/100`}</td><td style={td}><b>{s.totals.grandObtained}/{s.totals.grandTotal}</b></td><td style={td}>{s.totals.percentage.toFixed(2)}%</td><td style={{...td,fontWeight:800,color:s.totals.status==="PASS"?"#047857":"#b91c1c"}}>{s.totals.status}</td><td style={td}><button onClick={()=>downloadPdf(s)} style={{...smallButton}}>PDF</button></td></tr>)}</tbody></table></div>}</section>
  </main>;
}
const inputStyle: React.CSSProperties={width:"100%",marginTop:5,padding:"9px 10px",border:"1px solid #cbd5e1",borderRadius:8,boxSizing:"border-box"};
const th: React.CSSProperties={textAlign:"left",padding:9,borderBottom:"2px solid #dbe7f5",whiteSpace:"nowrap"};
const td: React.CSSProperties={padding:9,borderBottom:"1px solid #edf2f7",verticalAlign:"top"};
const buttonStyle: React.CSSProperties={border:0,borderRadius:9,padding:"10px 14px",background:"#0b57a3",color:"#fff",fontWeight:800,cursor:"pointer"};
const smallButton: React.CSSProperties={border:0,borderRadius:7,padding:"6px 9px",background:"#1d4ed8",color:"#fff",fontWeight:800,cursor:"pointer"};

























