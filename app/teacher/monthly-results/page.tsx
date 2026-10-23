"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { downloadPdfFile } from "../../../lib/download-pdf";
import { buildMonthlyResultPdf } from "../../../lib/monthly-result-pdf";
import * as XLSX from "xlsx";
import { isOnOrAfterAdmission } from "../../../lib/admission-date";
import { getMonthlyMahaTestDate } from "../../../lib/monthly-calendar";
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
import styles from "./monthly-results.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
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
function addOneDay(value: string) {
  if (!value) return "";
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function defaultReleaseInput(testDate: string) {
  const resultDate = addOneDay(testDate);
  return resultDate ? `${resultDate}T09:00` : "";
}
function cutoffDate(value: string) {
  return String(value || "").slice(0, 10);
}

export default function MonthlyResultsPage() {
  const [monthKey, setMonthKey] = useState(currentMonth());
  const [releaseInput, setReleaseInput] = useState("");
  const [passPercentage, setPassPercentage] = useState("");
  const [mahaDate, setMahaDate] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [mahaMarks, setMahaMarks] = useState<Record<number, string>>({});
  const [mahaRemarks, setMahaRemarks] = useState<Record<number, string>>({});
  const [students, setStudents] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [quizResults, setQuizResults] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [liveAddedAssessments, setLiveAddedAssessments] = useState<Record<number, { quizzes: any[]; weeklyTests: any[] }>>({});
  const [liveExcludedAssessments, setLiveExcludedAssessments] = useState<Record<number, { quizzes: string[]; weeklyTests: number[] }>>({});
  const [openLiveAssessmentPanel, setOpenLiveAssessmentPanel] = useState("");
  const [openLiveStudentDetails, setOpenLiveStudentDetails] = useState<Record<number, boolean>>({});
  const [mahaHistory, setMahaHistory] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<MonthlyResultSnapshot[]>([]);
  const [savedPeriods, setSavedPeriods] = useState<any[]>([]);
  const [archiveMonthKey, setArchiveMonthKey] = useState("");
  const [archiveResults, setArchiveResults] = useState<MonthlyResultSnapshot[]>([]);
  const [archivePeriodData, setArchivePeriodData] = useState<any>(null);
  const [archiveEditMode, setArchiveEditMode] = useState(false);
  const [openArchiveAssessmentPanel, setOpenArchiveAssessmentPanel] = useState("");
  const [openArchiveStudentDetails, setOpenArchiveStudentDetails] = useState<Record<number, boolean>>({});
  const [archiveSaving, setArchiveSaving] = useState(false);
  const [archiveNotice, setArchiveNotice] = useState("");
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setLiveAddedAssessments({});
    setLiveExcludedAssessments({});
    setOpenLiveAssessmentPanel("");
    setReleaseInput("");
    setMahaDate("");
    setPeriodStart("");
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
      const [studentsRes, mahaHistoryRes] = await Promise.all([
        supabase.from("students").select("id,student_name,student_username,class_name,father_name,admission_date,is_active").order("class_name").order("student_name"),
        supabase.from("monthly_mahatests").select("month_key,test_date").order("test_date"),
      ]);
      const allQuizRows: any[] = [];
      const quizTestsPageSize = 1000;
      for (let from = 0; ; from += quizTestsPageSize) {
        const { data: batch, error: batchError } = await supabase.from("quiz_tests")
          .select("id,title,subject,class_name,target_classes,scheduled_date,created_at")
          .order("scheduled_date").range(from, from + quizTestsPageSize - 1);
        if (batchError) throw batchError;
        allQuizRows.push(...(batch || []));
        if (!batch || batch.length < quizTestsPageSize) break;
      }
      const allWeeklyTestRows: any[] = [];
      const weeklyPageSize = 1000;
      for (let from = 0; ; from += weeklyPageSize) {
        const { data: batch, error: batchError } = await supabase.from("academy_assessments")
          .select("id,test_name,test_date,total_marks,student_id,obtained_marks,subject,attendance_status,remarks")
          .order("test_date").range(from, from + weeklyPageSize - 1);
        if (batchError) throw batchError;
        allWeeklyTestRows.push(...(batch || []));
        if (!batch || batch.length < weeklyPageSize) break;
      }
      const allQuizResults: any[] = [];
      const quizPageSize = 1000;
      for (let from = 0; ; from += quizPageSize) {
        const { data: batch, error: batchError } = await supabase.from("quiz_results").select("id,quiz_id,student_id,attempt_number,total_marks,obtained_marks,percentage,submitted_at,submission_type,created_at").order("created_at").range(from, from + quizPageSize - 1);
        if (batchError) throw batchError;
        allQuizResults.push(...(batch || []));
        if (!batch || batch.length < quizPageSize) break;
      }
      for (const r of [studentsRes, mahaHistoryRes]) if (r.error) throw r.error;
      // Deactivated students stay in the published archive, but are excluded from new/current result rosters.
      const ss = (studentsRes.data || []).filter((s: any) => s.is_active !== false && (!assigned || assigned.includes(Number(s.id))));

      const savedMahaDate = String(savedData.mahatest?.test_date || "").slice(0, 10);
      const effectiveMahaDate = savedMahaDate || (monthKey ? getMonthlyMahaTestDate(monthKey) : "");
      const previousMahaDates = (mahaHistoryRes.data || [])
        .map((r: any) => String(r.test_date || "").slice(0, 10))
        .filter((d: string) => d && d < effectiveMahaDate)
        .sort();
      const previousMahaDate = previousMahaDates.length ? previousMahaDates[previousMahaDates.length - 1] : "";
      // The first MahaTest includes every eligible record before its date.
      // Later tests start the day after the previous MahaTest to prevent repeats.
      const effectivePeriodStart = previousMahaDate ? addOneDay(previousMahaDate) : "";

      setAllStudents(studentsRes.data || []); setStudents(ss); setQuizzes(allQuizRows); setQuizResults(allQuizResults); setTests(allWeeklyTestRows); setMahaHistory(mahaHistoryRes.data || []);
      setMahaDate(effectiveMahaDate);
      setPeriodStart(effectivePeriodStart);
      const period = savedData.period as any;
      if (period) {
        setPassPercentage(String(period.pass_percentage ?? 40));
        setReleaseInput(period.scheduled_release_at ? isoToISTInput(String(period.scheduled_release_at)) : defaultReleaseInput(effectiveMahaDate));
      } else {
        setReleaseInput(defaultReleaseInput(effectiveMahaDate));
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
    const cutoff = cutoffDate(mahaDate);
    const start = cutoffDate(periodStart);
    const quizMap = new Map(quizzes.map((q: any) => [Number(q.id), q]));
    const qEntries = quizResults
      .filter((r) => Number(r.student_id) === Number(student.id))
      .filter((r) => {
        const completedDate = String(r.submitted_at || r.created_at || "").slice(0, 10);
        if (!isSubmittedQuizResult(r) || !completedDate || (start && completedDate < start) || (cutoff && completedDate > cutoff)) return false;
        const q = quizMap.get(Number(r.quiz_id));
        if (!q) return false;
        if (!cutoff || !isOnOrAfterAdmission(student.admission_date, completedDate)) return false;
        return quizTargetsStudent(q, student.class_name || "");
      })
      .sort((a, b) => {
        const ad = String(a.submitted_at || a.created_at || "");
        const bd = String(b.submitted_at || b.created_at || "");
        return ad.localeCompare(bd) || Number(a.quiz_id) - Number(b.quiz_id) || Number(a.attempt_number || 1) - Number(b.attempt_number || 1);
      })
      .map((r) => {
        const q = quizMap.get(Number(r.quiz_id));
        const obtained = safeNumber(r.obtained_marks);
        const total = safeNumber(r.total_marks);
        const attemptNumber = Number(r.attempt_number || 1);
        const baseTitle = q?.title || "Quiz";
        return {
          quizId: Number(r.quiz_id),
          title: attemptNumber > 1 ? `${baseTitle} (Attempt #${attemptNumber})` : baseTitle,
          subject: q?.subject || "",
          date: String(r.submitted_at || r.created_at || q?.scheduled_date || "").slice(0, 10),
          obtained,
          total,
          percentage: total > 0 ? (obtained / total) * 100 : 0,
        };
      });
    const added = liveAddedAssessments[Number(student.id)];
    const includedQuizKeys = new Set(qEntries.map((entry) => `${entry.quizId}|${entry.title}|${entry.date}`));
    for (const entry of added?.quizzes || []) {
      const key = `${entry.quizId}|${entry.title}|${entry.date}`;
      if (!includedQuizKeys.has(key)) { qEntries.push(entry); includedQuizKeys.add(key); }
    }
    const excluded = liveExcludedAssessments[Number(student.id)];
    const excludedQuizKeys = new Set(excluded?.quizzes || []);
    const includedQuizzes = qEntries.filter((entry) => !excludedQuizKeys.has(`${entry.quizId}|${entry.title}|${entry.date}`));
    const tEntries = tests.filter((t) => {
      const testDate = String(t.test_date || "").slice(0, 10);
      return Number(t.student_id) === Number(student.id)
        && testDate
        && isOnOrAfterAdmission(student.admission_date, testDate)
        && (!start || testDate >= start)
        && (!cutoff || testDate <= cutoff)
        && isSaturday(t.test_date)
        && !/maha\s*test/i.test(String(t.test_name || ""))
        && String(t.attendance_status || "PRESENT").toUpperCase() === "PRESENT";
    }).map((t) => {
      const obtained = safeNumber(t.obtained_marks), total = safeNumber(t.total_marks);
      return { id: Number(t.id), name: t.test_name || "Saturday Test", subject: t.subject || "", date: t.test_date, obtained, total, percentage: total > 0 ? (obtained/total)*100 : 0 };
    });
    const includedTestIds = new Set(tEntries.map((entry) => Number(entry.id)));
    for (const entry of added?.weeklyTests || []) {
      if (!includedTestIds.has(Number(entry.id))) { tEntries.push(entry); includedTestIds.add(Number(entry.id)); }
    }
    const excludedTestIds = new Set(excluded?.weeklyTests || []);
    const includedWeeklyTests = tEntries.filter((entry) => !excludedTestIds.has(Number(entry.id)));
    const mahaEligible = isOnOrAfterAdmission(student.admission_date, mahaDate);
    const mahaValue = !mahaEligible || mahaMarks[Number(student.id)] === undefined || mahaMarks[Number(student.id)] === "" ? null : Math.max(0, Math.min(100, Number(mahaMarks[Number(student.id)])));
    const totals = calculateMonthlyTotals({ quizzes: includedQuizzes, weeklyTests: includedWeeklyTests, mahaObtained: mahaValue, passPercentage: Number(passPercentage) || 40 });
    return {
      monthKey, monthLabel: monthLabelFromKey(monthKey),
      student: { id: Number(student.id), name: student.student_name || student.student_username || "Student", username: student.student_username || "", className: student.class_name || "", fatherName: student.father_name || "", rollNo: "", medium: "", academicSession: "2026-27" },
      quizzes: includedQuizzes, weeklyTests: includedWeeklyTests,
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
    eligible.slice(0, 3).forEach((s, index) => { const pos = index + 1; s.position = pos; s.award = pos === 1 ? "1st Position - GIFT / SURPRISE AWARD" : pos === 2 ? "2nd Position - GIFT / SURPRISE AWARD" : "3rd Position - GIFT / SURPRISE AWARD"; });
  }
  return result;
}

const preview = useMemo(() => applyMonthlyAwards(students.map(buildSnapshot)), [students, quizzes, quizResults, tests, liveAddedAssessments, liveExcludedAssessments, mahaMarks, mahaRemarks, mahaDate, periodStart, passPercentage, monthKey]); const displaySnapshots = preview;

  function availableLiveAssessments(snapshot: MonthlyResultSnapshot) {
    const cutoff = cutoffDate(mahaDate);
    const start = cutoffDate(periodStart);
    const quizMap = new Map(quizzes.map((quiz: any) => [Number(quiz.id), quiz]));
    const presentQuizKeys = new Set(snapshot.quizzes.map((entry) => `${entry.quizId}|${entry.title}|${entry.date}`));
    const availableQuizzes = quizResults.filter((row: any) => {
      const date = String(row.submitted_at || row.created_at || "").slice(0, 10);
      const quiz = quizMap.get(Number(row.quiz_id));
      return Number(row.student_id) === Number(snapshot.student.id) && isSubmittedQuizResult(row)
        && row.obtained_marks != null && row.total_marks != null && date && (!start || date >= start) && (!cutoff || date <= cutoff)
        && quiz && quizTargetsStudent(quiz, snapshot.student.className || "")
        && isOnOrAfterAdmission((allStudents.find((student: any) => Number(student.id) === Number(snapshot.student.id)) || {}).admission_date, date);
    }).map((row: any) => {
      const quiz = quizMap.get(Number(row.quiz_id));
      const attempt = Number(row.attempt_number || 1);
      const title = attempt > 1 ? `${quiz?.title || "Quiz"} (Attempt #${attempt})` : quiz?.title || "Quiz";
      const date = String(row.submitted_at || row.created_at || quiz?.scheduled_date || "").slice(0, 10);
      const obtained = safeNumber(row.obtained_marks), total = safeNumber(row.total_marks);
      return { quizId: Number(row.quiz_id), title, subject: quiz?.subject || "", date, obtained, total, percentage: total > 0 ? obtained / total * 100 : 0 };
    }).filter((entry: any) => !presentQuizKeys.has(`${entry.quizId}|${entry.title}|${entry.date}`));
    const presentTestIds = new Set(snapshot.weeklyTests.map((entry) => Number(entry.id)));
    const availableTests = tests.filter((test: any) => {
      const date = String(test.test_date || "").slice(0, 10);
      return Number(test.student_id) === Number(snapshot.student.id) && test.obtained_marks != null && test.total_marks != null
        && date && (!start || date >= start) && (!cutoff || date <= cutoff) && isSaturday(date)
        && !/maha\s*test/i.test(String(test.test_name || ""))
        && String(test.attendance_status || "PRESENT").toUpperCase() === "PRESENT"
        && isOnOrAfterAdmission((allStudents.find((student: any) => Number(student.id) === Number(snapshot.student.id)) || {}).admission_date, date)
        && !presentTestIds.has(Number(test.id));
    }).map((test: any) => {
      const obtained = safeNumber(test.obtained_marks), total = safeNumber(test.total_marks);
      return { id: Number(test.id), name: test.test_name || "Saturday Test", subject: test.subject || "", date: String(test.test_date).slice(0, 10), obtained, total, percentage: total > 0 ? obtained / total * 100 : 0 };
    });
    return { quizzes: availableQuizzes, weeklyTests: availableTests };
  }

  function addLiveAssessment(studentId: number, kind: "quiz" | "weekly", entry: any) {
    setLiveExcludedAssessments((current) => {
      const existing = current[studentId] || { quizzes: [], weeklyTests: [] };
      return { ...current, [studentId]: kind === "quiz"
        ? { ...existing, quizzes: existing.quizzes.filter((key) => key !== `${entry.quizId}|${entry.title}|${entry.date}`) }
        : { ...existing, weeklyTests: existing.weeklyTests.filter((id) => id !== Number(entry.id)) } };
    });
    setLiveAddedAssessments((current) => {
      const existing = current[studentId] || { quizzes: [], weeklyTests: [] };
      if (kind === "quiz") {
        if (existing.quizzes.some((item) => item.quizId === entry.quizId && item.title === entry.title && item.date === entry.date)) return current;
        return { ...current, [studentId]: { ...existing, quizzes: [...existing.quizzes, entry] } };
      }
      if (existing.weeklyTests.some((item) => item.id === entry.id)) return current;
      return { ...current, [studentId]: { ...existing, weeklyTests: [...existing.weeklyTests, entry] } };
    });
  }

  function removeLiveAssessment(studentId: number, kind: "quiz" | "weekly", entry: any) {
    setLiveExcludedAssessments((current) => {
      const existing = current[studentId] || { quizzes: [], weeklyTests: [] };
      const next = kind === "quiz"
        ? { ...existing, quizzes: [...new Set([...existing.quizzes, `${entry.quizId}|${entry.title}|${entry.date}`])] }
        : { ...existing, weeklyTests: [...new Set([...existing.weeklyTests, Number(entry.id)])] };
      return { ...current, [studentId]: next };
    });
    setLiveAddedAssessments((current) => {
      const existing = current[studentId];
      if (!existing) return current;
      return { ...current, [studentId]: kind === "quiz"
        ? { ...existing, quizzes: existing.quizzes.filter((item) => !(item.quizId === entry.quizId && item.title === entry.title && item.date === entry.date)) }
        : { ...existing, weeklyTests: existing.weeklyTests.filter((item) => Number(item.id) !== Number(entry.id)) } };
    });
  }

  function renderLiveAssessmentOptions(snapshot: MonthlyResultSnapshot, kind: "quiz" | "weekly") {
    const key = `${snapshot.student.id}|${kind}`;
    if (openLiveAssessmentPanel !== key) return null;
    const options = availableLiveAssessments(snapshot);
    const entries = kind === "quiz" ? options.quizzes : options.weeklyTests;
    return <div className={styles.availableGroup}><strong>Available {kind === "quiz" ? "quiz attempts" : "Saturday weekly tests"} · {entries.length}</strong>
      {entries.length ? entries.map((entry: any) => <div className={styles.availableAssessment} key={kind === "quiz" ? `${entry.quizId}-${entry.title}-${entry.date}` : entry.id}>
        <span>{kind === "quiz" ? entry.title : entry.name}<small>{entry.subject || (kind === "quiz" ? "Quiz" : "Weekly test")} · {formatDate(entry.date)} · {entry.obtained}/{entry.total}</small></span>
        <button type="button" onClick={() => addLiveAssessment(snapshot.student.id, kind, entry)}>Add</button>
      </div>) : <small>No additional eligible {kind === "quiz" ? "quiz attempts" : "Saturday tests"} with recorded marks.</small>}
    </div>;
  }

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

  async function openArchive(key: string) {
    if (archiveMonthKey === key) { setArchiveMonthKey(""); return; }
    setArchiveMonthKey(key); setArchiveLoading(true); setArchiveError(""); setArchiveNotice(""); setArchiveEditMode(false); setOpenArchiveAssessmentPanel(""); setOpenArchiveStudentDetails({}); setArchiveResults([]);
    try {
      const response = await fetch(`/api/monthly-results/publish?monthKey=${encodeURIComponent(key)}`);
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Could not load this result folder.");
      const saved = (data.results || []).map((row: any) => row.snapshot).filter(Boolean);
      setArchiveResults(saved);
      setArchivePeriodData(data);
    } catch (e) { setArchiveError(e instanceof Error ? e.message : "Could not load this result folder."); }
    finally { setArchiveLoading(false); }
  }

  function updateArchivedScore(studentId: number, kind: "quiz" | "weekly" | "maha", index: number, rawValue: string) {
    setArchiveResults((current) => current.map((snapshot) => {
      if (Number(snapshot.student.id) !== studentId) return snapshot;
      const value = rawValue === "" ? null : Math.max(0, Number(rawValue) || 0);
      const quizzes = kind === "quiz" ? snapshot.quizzes.map((entry, i) => i === index && value !== null ? { ...entry, obtained: Math.min(entry.total, value), percentage: entry.total ? Math.min(entry.total, value) / entry.total * 100 : 0 } : entry) : snapshot.quizzes;
      const weeklyTests = kind === "weekly" ? snapshot.weeklyTests.map((entry, i) => i === index && value !== null ? { ...entry, obtained: Math.min(entry.total, value), percentage: entry.total ? Math.min(entry.total, value) / entry.total * 100 : 0 } : entry) : snapshot.weeklyTests;
      const mahaObtained = kind === "maha" ? value === null ? null : Math.min(100, value) : snapshot.mahaTest.obtained;
      return { ...snapshot, quizzes, weeklyTests, mahaTest: { ...snapshot.mahaTest, obtained: mahaObtained }, totals: calculateMonthlyTotals({ quizzes, weeklyTests, mahaObtained, passPercentage: snapshot.totals.passPercentage }) };
    }));
  }

  function availableArchivedAssessments(snapshot: MonthlyResultSnapshot) {
    const student = allStudents.find((row: any) => Number(row.id) === Number(snapshot.student.id));
    const quizMap = new Map(quizzes.map((quiz: any) => [Number(quiz.id), quiz]));
    const existingQuizKeys = new Set(snapshot.quizzes.map((entry) => `${entry.quizId}|${entry.title}|${entry.date}`));
    const availableQuizzes = quizResults.filter((row: any) => {
      const submitted = String(row.submitted_at || row.created_at || "").slice(0, 10);
      const quiz = quizMap.get(Number(row.quiz_id));
      return Number(row.student_id) === Number(snapshot.student.id) && isSubmittedQuizResult(row)
        && row.obtained_marks != null && row.total_marks != null && submitted
        && quiz && quizTargetsStudent(quiz, snapshot.student.className || "")
        && isOnOrAfterAdmission(student?.admission_date, submitted);
    }).map((row: any) => {
      const quiz = quizMap.get(Number(row.quiz_id));
      const attempt = Number(row.attempt_number || 1);
      const title = attempt > 1 ? `${quiz?.title || "Quiz"} (Attempt #${attempt})` : quiz?.title || "Quiz";
      const date = String(row.submitted_at || row.created_at || quiz?.scheduled_date || "").slice(0, 10);
      const obtained = safeNumber(row.obtained_marks), total = safeNumber(row.total_marks);
      return { quizId: Number(row.quiz_id), title, subject: quiz?.subject || "", date, obtained, total, percentage: total > 0 ? obtained / total * 100 : 0 };
    }).filter((entry: any) => !existingQuizKeys.has(`${entry.quizId}|${entry.title}|${entry.date}`))
      .sort((left: any, right: any) => right.date.localeCompare(left.date));
    const existingTestIds = new Set(snapshot.weeklyTests.map((entry) => Number(entry.id)));
    const availableTests = tests.filter((test: any) => {
      const date = String(test.test_date || "").slice(0, 10);
      return Number(test.student_id) === Number(snapshot.student.id) && test.obtained_marks != null && test.total_marks != null
        && date && isSaturday(date) && !/maha\s*test/i.test(String(test.test_name || ""))
        && String(test.attendance_status || "PRESENT").toUpperCase() === "PRESENT"
        && isOnOrAfterAdmission(student?.admission_date, date)
        && !existingTestIds.has(Number(test.id));
    }).map((test: any) => {
      const obtained = safeNumber(test.obtained_marks), total = safeNumber(test.total_marks);
      return { id: Number(test.id), name: test.test_name || "Saturday Test", subject: test.subject || "", date: String(test.test_date).slice(0, 10), obtained, total, percentage: total > 0 ? obtained / total * 100 : 0 };
    }).sort((left: any, right: any) => String(right.date).localeCompare(String(left.date)));
    return { quizzes: availableQuizzes, weeklyTests: availableTests };
  }

  function archiveAssessmentKey(studentId: number, kind: "quiz" | "weekly") {
    return `${studentId}|${kind}`;
  }

  function addArchivedAssessment(studentId: number, kind: "quiz" | "weekly", entry: any) {
    setArchiveResults((current) => current.map((snapshot) => {
      if (Number(snapshot.student.id) !== studentId) return snapshot;
      const exists = kind === "quiz"
        ? snapshot.quizzes.some((item) => item.quizId === entry.quizId && item.title === entry.title && item.date === entry.date)
        : snapshot.weeklyTests.some((item) => item.id === entry.id);
      if (exists) return snapshot;
      const quizzes = kind === "quiz" ? [...snapshot.quizzes, entry] : snapshot.quizzes;
      const weeklyTests = kind === "weekly" ? [...snapshot.weeklyTests, entry] : snapshot.weeklyTests;
      return { ...snapshot, quizzes, weeklyTests, totals: calculateMonthlyTotals({ quizzes, weeklyTests, mahaObtained: snapshot.mahaTest.obtained, passPercentage: snapshot.totals.passPercentage }) };
    }));
  }

  function renderArchivedAssessmentOptions(snapshot: MonthlyResultSnapshot, kind: "quiz" | "weekly") {
    const options = availableArchivedAssessments(snapshot);
    const entries = kind === "quiz" ? options.quizzes : options.weeklyTests;
    if (openArchiveAssessmentPanel !== archiveAssessmentKey(snapshot.student.id, kind)) return null;
    const isQuiz = kind === "quiz";
    return <div className={styles.availableGroup}>
      <strong>All {isQuiz ? "eligible quiz attempts" : "eligible Saturday weekly tests"} · {entries.length}</strong>
      {entries.length ? entries.map((entry: any) => <div className={styles.availableAssessment} key={isQuiz ? `${entry.quizId}-${entry.title}-${entry.date}` : entry.id}>
        <span>{isQuiz ? entry.title : entry.name}<small>{entry.subject || (isQuiz ? "Quiz" : "Weekly test")} · {formatDate(entry.date)} · {entry.obtained}/{entry.total}</small></span>
        <button type="button" disabled={archiveSaving} onClick={() => addArchivedAssessment(snapshot.student.id, kind, entry)}>Add</button>
      </div>) : <small>All recorded eligible {isQuiz ? "quiz attempts" : "Saturday tests"} so far are already included.</small>}
    </div>;
  }

  async function saveArchiveEdits(results = archiveResults, note = "Saved edits for all student results.") {
    if (!archivePeriodData?.period || !archiveMonthKey) { setArchiveError("This result folder is missing its saved period details."); return; }
    setArchiveSaving(true); setArchiveError(""); setArchiveNotice("");
    try {
      const now = new Date().toISOString();
      const response = await fetch("/api/monthly-results/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        action: "save", period: { ...archivePeriodData.period, month_key: archiveMonthKey, month_label: archivePeriodData.period.month_label || monthLabelFromKey(archiveMonthKey) },
        mahatest: archivePeriodData.mahatest ? { ...archivePeriodData.mahatest, month_key: archiveMonthKey } : undefined,
        marks: results.map((snapshot) => ({ month_key: archiveMonthKey, student_id: snapshot.student.id, obtained_marks: snapshot.mahaTest.obtained, remarks: snapshot.mahaTest.remarks || null, updated_at: now })),
        results: results.map((snapshot) => ({ month_key: archiveMonthKey, student_id: snapshot.student.id, grand_obtained: snapshot.totals.grandObtained, grand_total: snapshot.totals.grandTotal, percentage: snapshot.totals.percentage, result_status: snapshot.totals.status, snapshot, generated_at: snapshot.generatedAt || now, updated_at: now })),
      }) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Could not save archived results.");
      setArchiveResults(results); setArchiveNotice(note);
    } catch (e) { setArchiveError(e instanceof Error ? e.message : "Could not save archived results."); }
    finally { setArchiveSaving(false); }
  }

  function rebuildPreOctoberResults() {
    const cutoff = "2026-10-03";
    const periodKey = archiveMonthKey;
    if (!periodKey || (periodKey !== "2026-09" && String(archivePeriodData?.mahatest?.test_date || "").slice(0, 10) !== cutoff)) {
      setArchiveError("The pre-03 October backfill is for the first saved MahaTest result period (September 2026)."); return;
    }
    const quizMap = new Map(quizzes.map((quiz: any) => [Number(quiz.id), quiz]));
    const existingByStudent = new Map(archiveResults.map((snapshot) => [Number(snapshot.student.id), snapshot]));
    const marksByStudent = new Map<number, any>((archivePeriodData?.marks || []).map((mark: any): [number, any] => [Number(mark.student_id), mark]));
    let addedQuizzes = 0; let addedWeekly = 0;
    const rebuilt = allStudents.map((student: any) => {
      const id = Number(student.id);
      const current = existingByStudent.get(id);
      const quizEntries = quizResults.filter((row: any) => {
        const submitted = String(row.submitted_at || row.created_at || "").slice(0, 10);
        const quiz = quizMap.get(Number(row.quiz_id));
        return Number(row.student_id) === id && row.obtained_marks != null && row.total_marks != null && isSubmittedQuizResult(row)
          && submitted && submitted < cutoff && isOnOrAfterAdmission(student.admission_date, submitted) && quiz && quizTargetsStudent(quiz, student.class_name || "");
      }).map((row: any) => {
        const quiz = quizMap.get(Number(row.quiz_id)); const obtained = safeNumber(row.obtained_marks); const total = safeNumber(row.total_marks); const attempt = Number(row.attempt_number || 1);
        return { quizId: Number(row.quiz_id), title: attempt > 1 ? `${quiz?.title || "Quiz"} (Attempt #${attempt})` : quiz?.title || "Quiz", subject: quiz?.subject || "", date: String(row.submitted_at || row.created_at || quiz?.scheduled_date || "").slice(0, 10), obtained, total, percentage: total > 0 ? obtained / total * 100 : 0 };
      });
      const testEntries = tests.filter((test: any) => {
        const date = String(test.test_date || "").slice(0, 10);
        return Number(test.student_id) === id && test.obtained_marks != null && test.total_marks != null && date && date < cutoff
          && isOnOrAfterAdmission(student.admission_date, date) && isSaturday(date) && !/maha\s*test/i.test(String(test.test_name || ""))
          && String(test.attendance_status || "PRESENT").toUpperCase() === "PRESENT";
      }).map((test: any) => {
        const obtained = safeNumber(test.obtained_marks); const total = safeNumber(test.total_marks);
        return { id: Number(test.id), name: test.test_name || "Saturday Test", subject: test.subject || "", date: test.test_date, obtained, total, percentage: total > 0 ? obtained / total * 100 : 0 };
      });
      const priorQuizzes = current?.quizzes || []; const priorTests = current?.weeklyTests || [];
      const knownQuizEntries = new Set(priorQuizzes.map((entry) => `${entry.quizId}|${entry.title}`));
      const knownTestIds = new Set(priorTests.map((entry) => Number(entry.id)));
      const missingQuizzes = quizEntries.filter((entry: any) => !knownQuizEntries.has(`${entry.quizId}|${entry.title}`));
      const missingTests = testEntries.filter((entry: any) => !knownTestIds.has(Number(entry.id)));
      addedQuizzes += missingQuizzes.length; addedWeekly += missingTests.length;
      const snapshot: MonthlyResultSnapshot = current || {
        monthKey: periodKey, monthLabel: monthLabelFromKey(periodKey), student: { id, name: student.student_name || student.student_username || "Student", username: student.student_username || "", className: student.class_name || "", fatherName: student.father_name || "", rollNo: "", medium: "", academicSession: "2026-27" },
        quizzes: [], weeklyTests: [], mahaTest: { date: String(archivePeriodData?.mahatest?.test_date || cutoff), durationMinutes: 120, total: 100, obtained: marksByStudent.get(id)?.obtained_marks ?? null, remarks: marksByStudent.get(id)?.remarks || "" },
        totals: calculateMonthlyTotals({ quizzes: [], weeklyTests: [], mahaObtained: marksByStudent.get(id)?.obtained_marks ?? null, passPercentage: Number(archivePeriodData?.period?.pass_percentage) || 40 }), generatedAt: new Date().toISOString(),
      };
      return { ...snapshot, quizzes: [...priorQuizzes, ...missingQuizzes], weeklyTests: [...priorTests, ...missingTests], totals: calculateMonthlyTotals({ quizzes: [...priorQuizzes, ...missingQuizzes], weeklyTests: [...priorTests, ...missingTests], mahaObtained: snapshot.mahaTest.obtained, passPercentage: Number(archivePeriodData?.period?.pass_percentage) || snapshot.totals.passPercentage || 40 }) };
    }).filter((snapshot) => snapshot.quizzes.length || snapshot.weeklyTests.length || existingByStudent.has(Number(snapshot.student.id)));
    const summary = `Updated ${rebuilt.length} students from recorded pre-03 Oct marks; added ${addedQuizzes} quizzes and ${addedWeekly} Saturday tests.`;
    setArchiveResults(rebuilt); setArchiveEditMode(false);
    void saveArchiveEdits(rebuilt, summary);
  }


  function downloadPdf(snapshot: MonthlyResultSnapshot) {
    try {
      const doc = buildMonthlyResultPdf(snapshot);
      downloadPdfFile(doc, "RACER_ACADEMY_" + snapshot.student.name.replace(/[^a-z0-9]+/gi,"_") + "_" + snapshot.monthKey + "_MONTHLY_RESULT.pdf");
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

  const publishedPeriods = savedPeriods.filter((period) => period.is_released);
  const passCount = displaySnapshots.filter((snapshot) => snapshot.totals.status === "PASS").length;
  return <main className={styles.page} data-racer-vip-module="monthly-results">
    <header className={styles.hero}>
      <div className={styles.heroTop}><a className={styles.backLink} href="/teacher/dashboard">← Dashboard</a><span className={styles.heroBadge}>ACADEMIC PERFORMANCE</span></div>
      <div className={styles.heroContent}><div><p className={styles.eyebrow}>RACER ACADEMY · TEACHER CONSOLE</p><h1>Monthly Results</h1><p className={styles.heroSub}>Every assessment, one clear picture of each student’s progress.</p></div><div className={styles.heroIcon}>✦</div></div>
      <div className={styles.stats}><div><span>Students</span><strong>{loading ? "—" : displaySnapshots.length}</strong></div><div><span>Passing</span><strong>{loading || !displaySnapshots.length ? "—" : `${Math.round((passCount / displaySnapshots.length) * 100)}%`}</strong></div><div><span>Published folders</span><strong>{publishedPeriods.length}</strong></div><div><span>Assessment mix</span><strong>Quiz · Weekly · MahaTest</strong></div></div>
    </header>

    <section className={styles.section}>
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>RESULT WORKSPACE</p><h2>Prepare a monthly result</h2><p>Enter MahaTest marks, review the complete calculation, then save, schedule, or publish.</p></div><span className={`${styles.statusPill} ${savedPeriods.find((period) => period.month_key === monthKey)?.is_released ? styles.published : styles.draft}`}>{savedPeriods.find((period) => period.month_key === monthKey)?.is_released ? "● Published" : "● Draft workspace"}</span></div>
      <div className={styles.formGrid}>
        <label className={styles.field}>Result month<input type="month" value={monthKey} onChange={e=>setMonthKey(e.target.value)} /></label>
        <label className={styles.field}>Release date & time (IST)<input type="datetime-local" value={releaseInput} onChange={e=>setReleaseInput(e.target.value)} /></label>
        <label className={styles.field}>Pass percentage<input type="number" min="0" max="100" value={passPercentage} onChange={e=>setPassPercentage(e.target.value)} /></label>
        <label className={styles.field}>MahaTest date<input type="date" value={mahaDate} onChange={e=>{const value=e.target.value;setMahaDate(value);setReleaseInput(defaultReleaseInput(value));}} /></label>
      </div>
      <div className={styles.periodNote}><span>✦</span><div><strong>2 hours · 100 marks · Result declared the next day</strong><small>Included period: {periodStart || "All available dates"} to {mahaDate || "—"}. Records from earlier monthly results are not repeated.</small></div></div>
      {error && <div className={styles.error}>{error}</div>}{message && <div className={styles.success}>{message}</div>}
      <div className={styles.actions}><button type="button" onClick={calculateOnly} className={styles.buttonSoft}>Recalculate</button><button type="button" onClick={saveOnly} disabled={saving} className={styles.buttonSoft}>Save all results</button><button type="button" onClick={scheduleOnly} disabled={saving} className={styles.buttonSoft}>Schedule release</button><button type="button" onClick={publishNow} disabled={saving} className={styles.buttonPrimary}>{saving ? "Saving…" : "Publish results ↗"}</button><button type="button" onClick={downloadExcel} className={styles.buttonExcel}>↓ Excel</button></div>
    </section>

    <section className={styles.section}>
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>MARKS ENTRY</p><h2>MahaTest · {monthKey ? monthLabelFromKey(monthKey) : "Choose a month"}</h2><p>Blank marks stay pending; they are never treated as zero.</p></div><span className={styles.countPill}>{students.length} students</span></div>
      {loading ? <div className={styles.empty}>Loading student and assessment data…</div> : <div className={styles.studentGrid}>{students.map((student,index)=><article className={styles.studentCard} key={student.id}><div className={styles.studentIdentity}><span className={styles.avatar}>{(student.student_name||student.student_username||"S").slice(0,1).toUpperCase()}</span><div><strong>{student.student_name||student.student_username}</strong><small>{student.class_name||"Class not set"} · #{String(index+1).padStart(2,"0")}</small></div></div><label className={styles.markField}>MARKS <span>/100</span><input aria-label={`${student.student_name} MahaTest marks`} type="number" min="0" max="100" value={mahaMarks[student.id]??""} placeholder="—" onChange={e=>setMahaMarks(x=>({...x,[student.id]:e.target.value}))}/></label><input className={styles.remarkInput} aria-label={`${student.student_name} remarks`} placeholder="Teacher remark (optional)" value={mahaRemarks[student.id]??""} onChange={e=>setMahaRemarks(x=>({...x,[student.id]:e.target.value}))}/></article>)}</div>}
    </section>

    <section className={styles.section}>
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>LIVE CALCULATION</p><h2>Complete monthly results</h2><p>Choose which recorded quiz attempts and Saturday weekly tests count for each student.</p></div><span className={styles.countPill}>{displaySnapshots.length} records</span></div>
      <div className={styles.resultGrid}>{displaySnapshots.map((snapshot,index)=><article className={styles.resultCard} key={snapshot.student.id}><div className={styles.resultStudent}><span className={styles.rank}>{String(index+1).padStart(2,"0")}</span><div><strong>{snapshot.student.name}</strong><small>{snapshot.student.className||"Class not set"} · {snapshot.quizzes.length} quizzes · {snapshot.weeklyTests.length} weekly tests</small></div><span className={`${styles.statusPill} ${snapshot.totals.status === "PASS" ? styles.published : styles.fail}`}>{snapshot.totals.status}</span></div><div className={styles.scoreStrip}><div><span>Quiz</span><strong>{snapshot.totals.quizObtained}<small>/{snapshot.totals.quizTotal}</small></strong></div><div><span>Weekly</span><strong>{snapshot.totals.weeklyObtained}<small>/{snapshot.totals.weeklyTotal}</small></strong></div><div><span>MahaTest</span><strong>{snapshot.mahaTest.obtained===null?"—":snapshot.mahaTest.obtained}<small>{snapshot.mahaTest.obtained===null?" pending":"/100"}</small></strong></div><div className={styles.totalScore}><span>Overall · {snapshot.totals.percentage.toFixed(1)}%</span><strong>{snapshot.totals.grandObtained}<small>/{snapshot.totals.grandTotal}</small></strong></div></div>
        <button type="button" className={styles.desktopDetailsToggle} aria-expanded={Boolean(openLiveStudentDetails[snapshot.student.id])} onClick={()=>setOpenLiveStudentDetails(current=>({...current,[snapshot.student.id]:!current[snapshot.student.id]}))}>{openLiveStudentDetails[snapshot.student.id]?"Hide entries":"Show entries"} · {snapshot.quizzes.length} quizzes, {snapshot.weeklyTests.length} Saturday tests <span>{openLiveStudentDetails[snapshot.student.id]?"⌃":"⌄"}</span></button>
        <div className={`${styles.assessmentEditGrid} ${styles.desktopAssessmentDetails} ${openLiveStudentDetails[snapshot.student.id]?styles.desktopAssessmentDetailsOpen:styles.desktopAssessmentDetailsCollapsed}`}>
          <div className={styles.assessmentGroup}><div className={styles.assessmentGroupHeading}><strong>Included quizzes</strong><button type="button" onClick={()=>setOpenLiveAssessmentPanel((current)=>current===`${snapshot.student.id}|quiz`?"":`${snapshot.student.id}|quiz`)}>{openLiveAssessmentPanel===`${snapshot.student.id}|quiz`?"Hide options":"Choose quizzes"} ({availableLiveAssessments(snapshot).quizzes.length})</button></div>{snapshot.quizzes.length?snapshot.quizzes.map((entry,index)=><label key={`${entry.quizId}-${entry.title}-${index}`}><span>{entry.title}<small>{formatDate(entry.date)} · {entry.obtained}/{entry.total}</small></span><button type="button" onClick={()=>removeLiveAssessment(snapshot.student.id,"quiz",entry)}>Remove</button></label>):<small>No quizzes included.</small>}{renderLiveAssessmentOptions(snapshot,"quiz")}</div>
          <div className={styles.assessmentGroup}><div className={styles.assessmentGroupHeading}><strong>Saturday weekly tests</strong><button type="button" onClick={()=>setOpenLiveAssessmentPanel((current)=>current===`${snapshot.student.id}|weekly`?"":`${snapshot.student.id}|weekly`)}>{openLiveAssessmentPanel===`${snapshot.student.id}|weekly`?"Hide options":"Choose tests"} ({availableLiveAssessments(snapshot).weeklyTests.length})</button></div>{snapshot.weeklyTests.length?snapshot.weeklyTests.map((entry)=><label key={entry.id}><span>{entry.name}<small>{formatDate(entry.date)} · {entry.obtained}/{entry.total}</small></span><button type="button" onClick={()=>removeLiveAssessment(snapshot.student.id,"weekly",entry)}>Remove</button></label>):<small>No Saturday tests included.</small>}{renderLiveAssessmentOptions(snapshot,"weekly")}</div>
        </div>
        <button className={styles.pdfButton} onClick={()=>downloadPdf(snapshot)}>↓ Download student PDF</button></article>)}</div>
    </section>

    <section className={styles.archiveSection}>
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>RESULT LIBRARY</p><h2>Published result folders</h2><p>Each folder keeps the complete saved student roster and its declared result.</p></div><span className={styles.countPill}>{publishedPeriods.length} published</span></div>
      {publishedPeriods.length ? <div className={styles.folderGrid}>{publishedPeriods.map((period)=><button key={period.month_key} className={`${styles.folderCard} ${archiveMonthKey===period.month_key?styles.folderActive:""}`} onClick={()=>void openArchive(period.month_key)}><span className={styles.folderIcon}>▰</span><span className={styles.folderInfo}><strong>{period.month_label||monthLabelFromKey(period.month_key)}</strong><small>Published {period.released_at?formatDate(String(period.released_at).slice(0,10)):"result"} · Open student records</small></span><span className={styles.folderArrow}>{archiveMonthKey===period.month_key?"−":"↗"}</span></button>)}</div> : <div className={styles.empty}>Published monthly results will appear here as folders.</div>}
      {archiveMonthKey && <div className={styles.archiveDetail}><div className={styles.archiveTitle}><div><p className={styles.eyebrow}>ARCHIVED RESULT FOLDER</p><h3>{monthLabelFromKey(archiveMonthKey)}</h3><small className={styles.archiveHint}>Changes recalculate every total and save for the complete student list.</small></div><div className={styles.archiveTools}>{!archiveEditMode && <button className={styles.closeButton} onClick={()=>{setArchiveEditMode(true);setArchiveNotice("");}}>Edit overall results</button>}{archiveEditMode && <><button className={styles.closeButton} onClick={rebuildPreOctoberResults} disabled={archiveSaving}>Add missing marks before 03 Oct & save</button><button className={styles.saveArchiveButton} onClick={()=>void saveArchiveEdits()} disabled={archiveSaving}>{archiveSaving?"Saving all…":"Save all student results"}</button><button className={styles.closeButton} onClick={()=>{setArchiveEditMode(false);setOpenArchiveAssessmentPanel("");}} disabled={archiveSaving}>Cancel edit</button></>}<button className={styles.closeButton} onClick={()=>setArchiveMonthKey("")}>Close folder ×</button></div></div>{archiveNotice&&<div className={styles.success}>{archiveNotice}</div>}{archiveError&&<div className={styles.error}>{archiveError}</div>}{archiveLoading?<div className={styles.empty}>Opening saved student results…</div>:archiveResults.length?<div className={styles.archiveList}>{archiveResults.map((snapshot)=><article className={styles.archiveRow} key={snapshot.student.id}><span className={styles.avatar}>{snapshot.student.name.slice(0,1).toUpperCase()}</span><div className={styles.archiveStudent}><strong>{snapshot.student.name}</strong><small>{snapshot.student.className||"Class not set"} · {snapshot.quizzes.length} quizzes · {snapshot.weeklyTests.length} weekly tests</small></div><div className={styles.archiveScore}><strong>{snapshot.totals.grandObtained}/{snapshot.totals.grandTotal}</strong><small>{snapshot.totals.percentage.toFixed(1)}%</small></div><span className={`${styles.statusPill} ${snapshot.totals.status === "PASS" ? styles.published : styles.fail}`}>{snapshot.totals.status}</span>{!archiveEditMode&&<button className={styles.pdfButton} onClick={()=>downloadPdf(snapshot)}>↓ PDF</button>}{archiveEditMode&&<button className={styles.pdfButton} onClick={()=>downloadPdf(snapshot)}>PDF preview</button>}{archiveEditMode&&<button type="button" className={styles.desktopDetailsToggle} aria-expanded={Boolean(openArchiveStudentDetails[snapshot.student.id])} onClick={()=>setOpenArchiveStudentDetails(current=>({...current,[snapshot.student.id]:!current[snapshot.student.id]}))}>{openArchiveStudentDetails[snapshot.student.id]?"Hide entries":"Show entries"} · {snapshot.quizzes.length} quizzes, {snapshot.weeklyTests.length} Saturday tests + MahaTest <span>{openArchiveStudentDetails[snapshot.student.id]?"⌃":"⌄"}</span></button>}{archiveEditMode&&<div className={`${styles.assessmentEditGrid} ${styles.desktopAssessmentDetails} ${openArchiveStudentDetails[snapshot.student.id]?styles.desktopAssessmentDetailsOpen:styles.desktopAssessmentDetailsCollapsed}`}><div className={styles.assessmentGroup}><div className={styles.assessmentGroupHeading}><strong>Quizzes</strong><button type="button" onClick={()=>setOpenArchiveAssessmentPanel((current)=>current===archiveAssessmentKey(snapshot.student.id,"quiz")?"":archiveAssessmentKey(snapshot.student.id,"quiz"))}>{openArchiveAssessmentPanel===archiveAssessmentKey(snapshot.student.id,"quiz")?"Hide options":"Add All Quizzes"} ({availableArchivedAssessments(snapshot).quizzes.length})</button></div>{snapshot.quizzes.length?snapshot.quizzes.map((entry,index)=><label key={`${entry.quizId}-${entry.title}-${index}`}><span>{entry.title}<small>{formatDate(entry.date)} · max {entry.total}</small></span><input type="number" min="0" max={entry.total} value={entry.obtained} onChange={(event)=>updateArchivedScore(snapshot.student.id,"quiz",index,event.target.value)}/></label>):<small>No recorded quiz scores.</small>}{renderArchivedAssessmentOptions(snapshot,"quiz")}</div><div className={styles.assessmentGroup}><div className={styles.assessmentGroupHeading}><strong>Saturday weekly tests</strong><button type="button" onClick={()=>setOpenArchiveAssessmentPanel((current)=>current===archiveAssessmentKey(snapshot.student.id,"weekly")?"":archiveAssessmentKey(snapshot.student.id,"weekly"))}>{openArchiveAssessmentPanel===archiveAssessmentKey(snapshot.student.id,"weekly")?"Hide options":"Add All Saturday Weekly Tests"} ({availableArchivedAssessments(snapshot).weeklyTests.length})</button></div>{snapshot.weeklyTests.length?snapshot.weeklyTests.map((entry,index)=><label key={entry.id}><span>{entry.name}<small>{formatDate(entry.date)} · max {entry.total}</small></span><input type="number" min="0" max={entry.total} value={entry.obtained} onChange={(event)=>updateArchivedScore(snapshot.student.id,"weekly",index,event.target.value)}/></label>):<small>No recorded weekly test scores.</small>}{renderArchivedAssessmentOptions(snapshot,"weekly")}</div><div className={styles.assessmentGroup}><strong>MahaTest</strong><label><span>{formatDate(snapshot.mahaTest.date)}<small>Maximum marks: {snapshot.mahaTest.total}</small></span><input type="number" min="0" max="100" placeholder="Pending" value={snapshot.mahaTest.obtained??""} onChange={(event)=>updateArchivedScore(snapshot.student.id,"maha",0,event.target.value)}/></label></div></div>}</article>)}</div>:<div className={styles.empty}>No saved student snapshots were found in this folder.</div>}</div>}
    </section>
  </main>;
}
const inputStyle: React.CSSProperties={width:"100%",marginTop:5,padding:"9px 10px",border:"1px solid #cbd5e1",borderRadius:8,boxSizing:"border-box"};
const th: React.CSSProperties={textAlign:"left",padding:9,borderBottom:"2px solid #dbe7f5",whiteSpace:"nowrap"};
const td: React.CSSProperties={padding:9,borderBottom:"1px solid #edf2f7",verticalAlign:"top"};
const buttonStyle: React.CSSProperties={border:0,borderRadius:9,padding:"10px 14px",background:"#0b57a3",color:"#fff",fontWeight:800,cursor:"pointer"};
const smallButton: React.CSSProperties={border:0,borderRadius:7,padding:"6px 9px",background:"#1d4ed8",color:"#fff",fontWeight:800,cursor:"pointer"};



























