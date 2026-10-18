import type { SupabaseClient } from "@supabase/supabase-js";
import { isFeePeriodOnOrAfterAdmission, isOnOrAfterAdmission } from "../admission-date";
import { getStudentCalendarEvent } from "../student-calendar-events";

type Topic = "attendance" | "fees" | "results" | "homework" | "timetable" | "calendar" | null;

function requestedTopic(question: string): Topic {
  const text = question.toLowerCase();
  if (/\b(attendance|present|absent)\b/.test(text) || /हाज़िरी|हाजिरी|अटेंडेंस|उपस्थिति/.test(text)) return "attendance";
  if (/\b(fee|fees|payment|paid|due)\b/.test(text) || /फीस|शुल्क|भुगतान|बकाया/.test(text)) return "fees";
  if (/\b(homework|assignment)\b/.test(text) || /गृहकार्य|होमवर्क|असाइनमेंट/.test(text)) return "homework";
  if (/\b(timetable|time table|schedule|class time)\b/.test(text) || /टाइमटेबल|समय सारणी|क्लास का समय/.test(text)) return "timetable";
  if (/\b(holiday|calendar|event)\b/.test(text) || /छुट्टी|अवकाश|कैलेंडर|इवेंट/.test(text)) return "calendar";
  if (/\b(result|marks|score|quiz|test|percentage)\b/.test(text) || /मंथली|मासिक|रिज़ल्ट|रिजल्ट|अंक|नंबर|क्विज़|क्विज|टेस्ट/.test(text)) return "results";
  return null;
}

const safeLabel = (value: unknown, max = 120) => String(value ?? "").replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, max);
const paidStatuses = new Set(["paid", "paid online", "submitted", "complete", "completed"]);

export async function loadSaathiStudentContext(db: SupabaseClient, studentId: number, username: string, question: string) {
  const { data: profile, error: profileError } = await db.from("students")
    .select("student_username,class_name,admission_date,is_active")
    .eq("id", studentId).maybeSingle();
  if (profileError || !profile || String(profile.student_username || "").toLowerCase() !== username.toLowerCase()) {
    return { authorized: false as const, context: null };
  }
  if (profile.is_active === false) return { authorized: false as const, context: null };

  const topic = requestedTopic(question);
  if (!topic) return { authorized: true as const, context: null };
  const className = String(profile.class_name || "").trim();
  const admissionDate = profile.admission_date as string | null;

  if (topic === "attendance") {
    const [regular, extra] = await Promise.all([
      db.from("attendance").select("attendance_date,status").eq("student_id", studentId).order("attendance_date", { ascending: false }).limit(180),
      db.from("extra_class_attendance").select("extra_class_date,status").eq("student_id", studentId).order("extra_class_date", { ascending: false }).limit(90),
    ]);
    if (regular.error || extra.error) return { authorized: true as const, context: { topic, available: false } };
    const rows = [
      ...(regular.data || []).map((row) => ({ date: row.attendance_date, status: row.status })),
      ...(extra.data || []).map((row) => ({ date: row.extra_class_date, status: row.status })),
    ].filter((row) => isOnOrAfterAdmission(admissionDate, row.date));
    const present = rows.filter((row) => String(row.status || "").toLowerCase() === "present").length;
    const absent = rows.filter((row) => String(row.status || "").toLowerCase() === "absent").length;
    return { authorized: true as const, context: { topic, available: true, recordedClasses: present + absent, present, absent, percentage: present + absent ? Math.round((present / (present + absent)) * 100) : null, recent: rows.slice(0, 10) } };
  }

  if (topic === "fees") {
    const { data, error } = await db.from("fees").select("month,year,amount,status").eq("student_id", studentId).order("year", { ascending: false }).order("month", { ascending: false }).limit(48);
    if (error) return { authorized: true as const, context: { topic, available: false } };
    const rows = (data || []).filter((row) => isFeePeriodOnOrAfterAdmission(admissionDate, Number(row.year), Number(row.month)));
    const paid = rows.filter((row) => paidStatuses.has(String(row.status || "").toLowerCase()));
    const due = rows.filter((row) => String(row.status || "").toLowerCase() === "pending");
    const total = (items: typeof rows) => items.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    return { authorized: true as const, context: { topic, available: true, paidTotal: total(paid), pendingTotal: total(due), pendingPeriods: due.slice(0, 12).map((row) => ({ month: row.month, year: row.year, amount: row.amount })) } };
  }

  if (topic === "results") {
    const [quizResult, weeklyResult, monthlyResult] = await Promise.all([
      db.from("quiz_results").select("quiz_id,obtained_marks,total_marks,percentage,submitted_at,created_at").eq("student_id", studentId).not("submitted_at", "is", null).order("submitted_at", { ascending: false, nullsFirst: false }).limit(24),
      db.from("academy_assessments").select("id,test_name,test_date,total_marks,obtained_marks,subject,attendance_status").eq("student_id", studentId).order("test_date", { ascending: false }).limit(24),
      db.from("monthly_results").select("month_key,snapshot").eq("student_id", studentId).order("month_key", { ascending: false }).limit(12),
    ]);
    if (quizResult.error && weeklyResult.error && monthlyResult.error) return { authorized: true as const, context: { topic, available: false } };
    const quizIds = [...new Set((quizResult.data || []).map((row) => Number(row.quiz_id)).filter((id) => Number.isInteger(id) && id > 0))];
    const quizInfo = quizIds.length ? await db.from("quiz_tests").select("id,title,subject,scheduled_date").in("id", quizIds) : { data: [], error: null };
    const quizById = new Map((quizInfo.data || []).map((row) => [Number(row.id), row]));
    const quizzes = (quizResult.data || []).map((row) => {
      const quiz = quizById.get(Number(row.quiz_id));
      if (!isOnOrAfterAdmission(admissionDate, quiz?.scheduled_date)) return null;
      return { title: safeLabel(quiz?.title || "Quiz"), subject: safeLabel(quiz?.subject), date: quiz?.scheduled_date, marks: row.obtained_marks, total: row.total_marks, percentage: row.percentage };
    }).filter(Boolean).slice(0, 10);
    const weekly = (weeklyResult.data || []).filter((row) => isOnOrAfterAdmission(admissionDate, row.test_date) && /weekly|saturday|शनिवार/i.test(`${row.test_name || ""} ${row.subject || ""}`)).slice(0, 10)
      .map((row) => ({ title: safeLabel(row.test_name || "Weekly test"), subject: safeLabel(row.subject), date: row.test_date, marks: row.obtained_marks, total: row.total_marks }));
    const published = await db.from("monthly_result_periods").select("month_key").eq("is_released", true);
    const releasedKeys = new Set((published.data || []).map((row) => String(row.month_key)));
    const monthly = (monthlyResult.data || []).filter((row) => releasedKeys.has(String(row.month_key))).slice(0, 6).map((row) => {
      const totals = (row.snapshot as { totals?: Record<string, unknown> } | null)?.totals;
      return totals ? { month: row.month_key, obtained: totals.grandObtained, total: totals.grandTotal, percentage: totals.percentage, status: safeLabel(totals.status, 30) } : null;
    }).filter(Boolean);
    return { authorized: true as const, context: { topic, available: true, quizzes, weeklyTests: weekly, releasedMonthlyResults: monthly } };
  }

  if (topic === "homework") {
    if (!className) return { authorized: true as const, context: { topic, available: false } };
    const { data, error } = await db.from("homework").select("title,subject,description,due_date,class_name,created_at").order("created_at", { ascending: false }).limit(80);
    if (error) return { authorized: true as const, context: { topic, available: false } };
    const rows = (data || []).filter((row) => String(row.class_name || "").split(/[,;|]/).some((value) => value.trim().toLowerCase() === className.toLowerCase()) && isOnOrAfterAdmission(admissionDate, row.created_at));
    return { authorized: true as const, context: { topic, available: true, className: safeLabel(className, 40), assignments: rows.slice(0, 12).map((row) => ({ title: safeLabel(row.title || row.subject), subject: safeLabel(row.subject), description: safeLabel(row.description, 240), dueDate: row.due_date })) } };
  }

  if (topic === "timetable") {
    if (!className) return { authorized: true as const, context: { topic, available: false } };
    const { data, error } = await db.from("timetables").select("teacher_name,class_names,day_of_week,subject,start_time,end_time,is_holiday");
    if (error) return { authorized: true as const, context: { topic, available: false } };
    const rows = (data || []).filter((row) => Array.isArray(row.class_names) && row.class_names.some((name: string) => name.trim().toLowerCase() === className.toLowerCase()));
    return { authorized: true as const, context: { topic, available: true, className: safeLabel(className, 40), schedule: rows.slice(0, 50).map((row) => ({ day: safeLabel(row.day_of_week), subject: safeLabel(row.subject), start: row.start_time, end: row.end_time, holiday: Boolean(row.is_holiday), teacher: safeLabel(row.teacher_name, 80) })) } };
  }

  const today = new Date();
  const events = Array.from({ length: 120 }, (_, offset) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset, 12);
    return getStudentCalendarEvent(date);
  }).filter((event) => event && isOnOrAfterAdmission(admissionDate, event.date));
  return { authorized: true as const, context: { topic, available: true, events: events.slice(0, 15) } };
}
