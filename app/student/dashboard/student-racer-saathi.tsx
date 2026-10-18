"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { isFeePeriodOnOrAfterAdmission, isOnOrAfterAdmission } from "../../../lib/admission-date";
import { getStudentCalendarEvent } from "../../../lib/student-calendar-events";
import { filterMonthlySnapshotByAdmission } from "../../../lib/monthly-result";

type Student = { id: number; student_name: string | null; class_name: string | null; admission_date: string | null };
type MenuOption = { id: string; label: string; icon?: string };
type ChatRow = { label: string; value: string };
type Message = { from: "bot" | "student"; text: string; rows?: ChatRow[]; createdAt: number };
type Category = "attendance" | "fees" | "quiz" | "weekly" | "monthly" | "timetable" | "homework" | "calendar";

const categories: Array<MenuOption & { category: Category }> = [
  { id: "attendance", category: "attendance", label: "मेरी अटेंडेंस", icon: "◷" },
  { id: "fees", category: "fees", label: "मेरी फीस", icon: "₹" },
  { id: "quiz", category: "quiz", label: "क्विज़ रिज़ल्ट", icon: "✎" },
  { id: "weekly", category: "weekly", label: "सैटरडे टेस्ट", icon: "▤" },
  { id: "monthly", category: "monthly", label: "मंथली रिज़ल्ट", icon: "★" },
  { id: "timetable", category: "timetable", label: "टाइमटेबल", icon: "▦" },
  { id: "homework", category: "homework", label: "होमवर्क", icon: "▣" },
  { id: "calendar", category: "calendar", label: "कैलेंडर और इवेंट", icon: "◇" },
];
const mainOptions: MenuOption[] = [...categories, { id: "other", label: "कुछ और पूछें", icon: "✦" }];

const todayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const monthKey = (date = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).format(date);
const addIstDays = (value: string, days: number) => {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
};
const dateLabel = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("hi-IN", { day: "numeric", month: "short", year: "numeric" });
};
const monthLabel = (value: string) => {
  const date = new Date(`${value}-01T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("hi-IN", { month: "long", year: "numeric" });
};
const money = (value: number) => `₹${Math.round(value || 0).toLocaleString("en-IN")}`;
const localDay = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" });
const monthOf = (value: string | null | undefined) => String(value || "").slice(0, 7);

function RACreature({ compact = false }: { compact?: boolean }) {
  const gradientId = `ra-helmet-${useId().replace(/:/g, "")}`;
  return <svg className={`racer-mascot${compact ? " compact" : ""}`} viewBox="0 0 72 72" role="img" aria-label="Racer Academy RA mascot">
    <defs><linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1"><stop stopColor="#62c7ff"/><stop offset="1" stopColor="#2454d8"/></linearGradient></defs>
    <path d="M13 31c0-14 10-24 23-24s23 10 23 24v18c0 11-9 17-23 17S13 60 13 49z" fill={`url(#${gradientId})`} stroke="#fff" strokeWidth="3"/>
    <path d="M9 30c0-16 12-27 27-27s27 11 27 27H9z" fill="#163a83" stroke="#fff" strokeWidth="3"/>
    <path d="M18 31h36c3 0 5 2 5 5v6c0 9-9 15-23 15s-23-6-23-15v-6c0-3 2-5 5-5z" fill="#dff6ff" stroke="#7bcfff" strokeWidth="2"/>
    <circle cx="28" cy="41" r="2.2" fill="#163a83"/><circle cx="44" cy="41" r="2.2" fill="#163a83"/>
    <path d="M31 48q5 5 10 0" fill="none" stroke="#163a83" strokeWidth="2" strokeLinecap="round"/>
    <path d="M22 22l5-8 4 8m6-1 5-9 5 10m5 0 3-7 4 8" fill="none" stroke="#76e2ff" strokeWidth="2" strokeLinecap="round"/>
    <rect x="25" y="6" width="22" height="11" rx="5.5" fill="#ffd36c" stroke="#fff" strokeWidth="1.5"/><text x="36" y="14" textAnchor="middle" fontSize="7" fontWeight="900" fill="#18376b">RA</text>
  </svg>;
}

export default function StudentRacerSaathi({ studentId }: { studentId: number | null }) {
  const [open, setOpen] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [options, setOptions] = useState<MenuOption[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [picker, setPicker] = useState<"date" | "month" | null>(null);
  const [pickerValue, setPickerValue] = useState("");
  const [typedQuestion, setTypedQuestion] = useState("");
  const [historyReadyFor, setHistoryReadyFor] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const questionInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, loading, options.length]);

  useEffect(() => {
    if (!open || !studentId) return;
    const key = `racer-saathi-history:${studentId}`;
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) || "[]") as Message[];
      const recent = saved.filter((message) => Number(message.createdAt) >= Date.now() - 30 * 60 * 1000);
      if (recent.length) setMessages(recent);
      else sessionStorage.removeItem(key);
    } catch { sessionStorage.removeItem(key); }
    setHistoryReadyFor(studentId);
  }, [open, studentId]);

  useEffect(() => {
    if (!studentId || historyReadyFor !== studentId || typeof window === "undefined") return;
    const key = `racer-saathi-history:${studentId}`;
    if (messages.length) sessionStorage.setItem(key, JSON.stringify(messages));
    else sessionStorage.removeItem(key);
  }, [messages, studentId, historyReadyFor]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const cutoff = Date.now() - 30 * 60 * 1000;
      setMessages((old) => old.filter((message) => message.createdAt >= cutoff));
    }, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open || messages.length) return;
    setCategory(null);
    setOptions([]);
    setPicker(null);
  }, [open, messages.length]);

  useEffect(() => {
    if (!open || !studentId) return;
    let active = true;
    void supabase.from("students").select("id,student_name,class_name,admission_date").eq("id", studentId).maybeSingle().then(({ data }) => {
      if (active && data) setStudent(data as Student);
    });
    return () => { active = false; };
  }, [open, studentId]);

  const bot = (text: string, rows?: ChatRow[]) => setMessages((old) => [...old, { from: "bot", text, rows, createdAt: Date.now() }]);
  const studentSaid = (text: string) => setMessages((old) => [...old, { from: "student", text, createdAt: Date.now() }]);
  const menu = (items: MenuOption[], prompt?: string) => {
    if (prompt) bot(prompt);
    setOptions(items);
    setPicker(null);
    setPickerValue("");
  };
  const mainMenu = () => { setCategory(null); menu([], "किस जानकारी में मदद करूँ? नीचे से एक विकल्प चुनें।"); };
  const withMainMenu = (items: MenuOption[]) => [...items, { id: "main", label: "मुख्य मेनू", icon: "⌂" }];

  const askCategory = (item: typeof categories[number], alreadySaid = false) => {
    if (!alreadySaid) studentSaid(`${item.icon}  ${item.label}`);
    setCategory(item.category);
    if (item.category === "attendance") menu(withMainMenu([
      { id: "today", label: "आज की अटेंडेंस", icon: "☀" },
      { id: "month", label: "इस महीने का हिसाब", icon: "▦" },
      { id: "all", label: "अब तक का कुल रिकॉर्ड", icon: "Σ" },
      { id: "date", label: "किसी तारीख की जानकारी", icon: "⌕" },
    ]), "अटेंडेंस किस अवधि की देखनी है?");
    else if (item.category === "fees") menu(withMainMenu([
      { id: "paid", label: "कुल जमा फीस", icon: "✓" },
      { id: "due_all", label: "कुल बकाया फीस", icon: "!" },
      { id: "due_month", label: "इस महीने का बकाया", icon: "◷" },
      { id: "month", label: "किसी महीने का फीस हिसाब", icon: "⌕" },
    ]), "फीस में कौन-सा हिसाब चाहिए?");
    else if (item.category === "quiz") menu(withMainMenu([
      { id: "quiz_month", label: "महीने के हिसाब से क्विज़", icon: "▦" },
      { id: "quiz_latest", label: "सबसे नए क्विज़", icon: "↗" },
      { id: "quiz_custom", label: "अपना महीना चुनें", icon: "⌕" },
    ]), "किस महीने या किस नए क्विज़ का रिज़ल्ट चाहिए?");
    else if (item.category === "weekly") void prepareWeeklyOptions();
    else if (item.category === "monthly") void prepareMonthlyOptions();
    else if (item.category === "timetable") menu(withMainMenu([
      { id: "today", label: "आज का टाइमटेबल", icon: "☀" },
      { id: "tomorrow", label: "कल का टाइमटेबल", icon: "↗" },
      { id: "week", label: "पूरे सप्ताह का टाइमटेबल", icon: "▦" },
      { id: "date", label: "किसी दिन का टाइमटेबल", icon: "⌕" },
    ]), "किस दिन की क्लास देखनी है?");
    else if (item.category === "homework") menu(withMainMenu([
      { id: "today", label: "आज का होमवर्क", icon: "☀" },
      { id: "recent", label: "पिछले 7 दिनों का", icon: "↶" },
      { id: "all", label: "सारा उपलब्ध होमवर्क", icon: "▤" },
      { id: "date", label: "किसी तारीख का होमवर्क", icon: "⌕" },
    ]), "होमवर्क किस दिन का देखना है?");
    else menu(withMainMenu([
      { id: "holidays", label: "आने वाली छुट्टियाँ", icon: "☼" },
      { id: "tests", label: "आने वाले टेस्ट", icon: "✎" },
      { id: "events", label: "सभी अकादमिक इवेंट", icon: "◇" },
      { id: "date", label: "किसी तारीख का इवेंट", icon: "⌕" },
    ]), "कैलेंडर में क्या देखना चाहेंगे?");
  };

  const showDatePicker = (mode: "date" | "month", prompt: string) => {
    studentSaid(mode === "month" ? "महीना चुनें" : "तारीख चुनें");
    setPicker(mode);
    setPickerValue(mode === "month" ? monthKey() : todayKey());
    bot(prompt);
  };

  const attendanceAnswer = async (period: string, exactDate?: string) => {
    if (!studentId) throw new Error("Student session not found.");
    const [regular, extra] = await Promise.all([
      supabase.from("attendance").select("attendance_date,status").eq("student_id", studentId),
      supabase.from("extra_class_attendance").select("extra_class_date,status").eq("student_id", studentId),
    ]);
    if (regular.error) throw regular.error;
    const rows = [
      ...(regular.data || []).map((row) => ({ date: row.attendance_date, status: row.status })),
      ...(extra.data || []).map((row) => ({ date: row.extra_class_date, status: row.status })),
    ].filter((row) => isOnOrAfterAdmission(student?.admission_date, row.date))
      .filter((row) => period === "today" ? row.date === todayKey() : period === "month" ? monthOf(row.date) === monthKey() : period === "date" ? row.date === exactDate : true);
    const present = rows.filter((row) => String(row.status || "").toLowerCase() === "present").length;
    const absent = rows.filter((row) => String(row.status || "").toLowerCase() === "absent").length;
    const recorded = present + absent;
    const percent = recorded ? `${Math.round((present / recorded) * 100)}%` : "—";
    bot("आपका अटेंडेंस कार्ड तैयार है ✨", [
      { label: "कुल दर्ज क्लास", value: String(recorded) },
      { label: "उपस्थित", value: `${present} दिन  ›` },
      { label: "अनुपस्थित", value: `${absent} दिन  ›` },
      { label: "उपस्थिति प्रतिशत", value: percent },
      { label: "अवधि", value: period === "today" ? "आज" : period === "month" ? monthLabel(monthKey()) : period === "date" ? dateLabel(exactDate) : "Admission से अब तक" },
    ]);
  };

  const feesAnswer = async (kind: string, selectedMonth?: string) => {
    if (!studentId) throw new Error("Student session not found.");
    const { data, error } = await supabase.from("fees").select("month,year,amount,status").eq("student_id", studentId).order("year", { ascending: false }).order("month", { ascending: false }).limit(100);
    if (error) throw error;
    const rows = (data || []).filter((row) => isFeePeriodOnOrAfterAdmission(student?.admission_date, Number(row.year), Number(row.month)));
    const paidRows = rows.filter((row) => ["paid", "paid online", "submitted", "complete", "completed"].includes(String(row.status || "").toLowerCase()));
    const dueRows = rows.filter((row) => String(row.status || "").toLowerCase() === "pending");
    const amount = (values: typeof rows) => values.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    if (kind === "paid") bot("आपकी जमा फीस का सारांश 💙", [
      { label: "अब तक कुल जमा", value: money(amount(paidRows)) },
      { label: "जमा महीनों की संख्या", value: String(paidRows.length) },
      { label: "हाल की जमा फीस", value: paidRows[0] ? `${money(Number(paidRows[0].amount))}  ›` : "अभी कोई जमा रिकॉर्ड नहीं" },
    ]);
    else if (kind === "due_month" || kind === "due_selected") {
      const targetMonth = selectedMonth || monthKey();
      const filtered = dueRows.filter((row) => `${row.year}-${String(row.month).padStart(2, "0")}` === targetMonth);
      bot(`${monthLabel(targetMonth)} की फीस स्थिति`, [
        { label: "इस महीने का बकाया", value: money(amount(filtered)) },
        { label: "रिकॉर्ड", value: filtered.length ? `${filtered.length} शुल्क रिकॉर्ड` : "कोई बकाया रिकॉर्ड नहीं" },
        ...filtered.slice(0, 4).map((row) => ({ label: `${row.month}/${row.year} • ${row.status || "स्थिति"}`, value: `${money(Number(row.amount))}  ›` })),
      ]);
    } else if (kind === "month") {
      const filtered = rows.filter((row) => `${row.year}-${String(row.month).padStart(2, "0")}` === selectedMonth);
      bot(`${monthLabel(selectedMonth || "")} का फीस स्टेटमेंट`, filtered.length ? filtered.map((row) => ({ label: `${row.month}/${row.year} • ${row.status || "स्थिति"}`, value: `${money(Number(row.amount))}  ›` })) : [{ label: "इस महीने का रिकॉर्ड", value: "उपलब्ध नहीं" }]);
    } else bot("आपकी कुल फीस का सारांश 💳", [
      { label: "कुल जमा फीस", value: money(amount(paidRows)) },
      { label: "कुल बकाया फीस", value: money(amount(dueRows)) },
      { label: "बकाया महीनों की संख्या", value: String(dueRows.length) },
    ]);
  };

  const quizRows = async () => {
    if (!studentId) throw new Error("Student session not found.");
    const { data, error } = await supabase.from("quiz_results").select("quiz_id,obtained_marks,total_marks,percentage,submitted_at,created_at").eq("student_id", studentId).not("submitted_at", "is", null).order("submitted_at", { ascending: false, nullsFirst: false }).limit(100);
    if (error) throw error;
    const ids = [...new Set((data || []).map((row) => Number(row.quiz_id)).filter(Boolean))];
    const { data: quizzes, error: quizError } = ids.length ? await supabase.from("quiz_tests").select("id,title,subject,scheduled_date").in("id", ids) : { data: [] as any[], error: null };
    if (quizError) throw quizError;
    const quizById = new Map((quizzes || []).map((quiz: any) => [Number(quiz.id), quiz]));
    return (data || []).map((result) => ({ result, quiz: quizById.get(Number(result.quiz_id)) }))
      .filter((item) => isOnOrAfterAdmission(student?.admission_date, item.quiz?.scheduled_date));
  };

  const prepareWeeklyOptions = async () => {
    setCategory("weekly"); setLoading(true);
    try {
      const { data, error } = await supabase.from("academy_assessments").select("id,test_name,test_date,total_marks,obtained_marks,subject,attendance_status").eq("student_id", studentId).order("test_date", { ascending: false }).limit(100);
      if (error) throw error;
      const rows = (data || []).filter((row) => isOnOrAfterAdmission(student?.admission_date, row.test_date) && /weekly|saturday|saturday test/i.test(`${row.test_name || ""} ${row.subject || ""}`));
      studentSaid("सैटरडे टेस्ट");
      menu(withMainMenu(rows.slice(0, 8).map((row) => ({ id: `weekly:${row.id}`, label: `${dateLabel(row.test_date)} • ${row.test_name || "सैटरडे टेस्ट"}`, icon: "▤" })).concat([{ id: "weekly:all", label: "सभी सैटरडे टेस्ट", icon: "↗" }])), rows.length ? "कौन-सा शनिवार वाला टेस्ट देखना है? सबसे नया टेस्ट सबसे ऊपर है।" : "अभी सैटरडे टेस्ट का कोई रिज़ल्ट नहीं मिला।");
    } catch (error) { reportError(error); }
    finally { setLoading(false); }
  };

  const prepareMonthlyOptions = async () => {
    setCategory("monthly"); setLoading(true);
    try {
      const response = await fetch("/api/monthly-results/publish?list=1", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Monthly results could not be loaded.");
      const periods = (payload.periods || []).filter((item: any) => Boolean(item.is_released) || (item.scheduled_release_at && Date.now() >= new Date(item.scheduled_release_at).getTime()));
      studentSaid("मंथली रिज़ल्ट");
      menu(withMainMenu(periods.slice(0, 8).map((item: any) => ({ id: `monthly:${item.month_key}`, label: monthLabel(item.month_key), icon: "★" }))), periods.length ? "किस महीने का रिज़ल्ट खोलना है? सबसे नया महीना ऊपर है।" : "अभी कोई मंथली रिज़ल्ट जारी नहीं हुआ है।");
    } catch (error) { reportError(error); }
    finally { setLoading(false); }
  };

  const reportError = (error: unknown) => {
    console.error("Racer Saathi could not load student data:", error);
    bot("अभी जानकारी नहीं मिल पाई। एक बार फिर कोशिश करें या नीचे मुख्य मेनू चुनें।");
    setOptions(withMainMenu([]));
  };

  const detail = async (id: string) => {
    if (!category) return;
    if (id === "main") { mainMenu(); return; }
    studentSaid(options.find((item) => item.id === id)?.label || "जानकारी चुनें");
    setLoading(true);
    try {
      if (category === "attendance") {
        if (id === "date") { showDatePicker("date", "कैलेंडर से तारीख चुनें, मैं उसी दिन की अटेंडेंस देखूँगा।"); return; }
        await attendanceAnswer(id);
      } else if (category === "fees") {
        if (id === "month") { showDatePicker("month", "किस महीने का फीस हिसाब चाहिए? महीना चुनें।"); return; }
        if (id === "due_month") { await feesAnswer("due_month"); }
        else if (id === "due_all") await feesAnswer("due_all");
        else await feesAnswer(id);
      } else if (category === "quiz") {
        if (id === "quiz_custom" || id === "quiz_month") { showDatePicker("month", "क्विज़ किस महीने के हैं? महीना चुनें, फिर उस महीने के क्विज़ में से चुनेंगे।"); return; }
        const rows = await quizRows();
        const selected = id.startsWith("quiz:") ? rows.filter((item) => String(item.quiz?.id) === id.split(":")[1]) : rows.slice(0, 5);
        if (id === "quiz_latest") {
          const quizzes = Array.from(new Map(selected.map((item) => [item.quiz?.id, item])).values());
          menu(withMainMenu(quizzes.map((item) => ({ id: `quiz:${item.quiz?.id}`, label: `${item.quiz?.title || "क्विज़"} • ${dateLabel(item.quiz?.scheduled_date)}`, icon: "✎" }))), quizzes.length ? "कौन-सा क्विज़ रिज़ल्ट खोलना है?" : "अभी कोई नया सबमिट किया हुआ क्विज़ नहीं है।");
        } else if (!selected.length) bot("इस चयन के लिए कोई क्विज़ रिज़ल्ट नहीं मिला।");
        else bot("आपका चुना हुआ क्विज़ रिज़ल्ट 📘", selected.map((item) => ({ label: `${item.quiz?.title || "क्विज़"}${item.quiz?.subject ? ` • ${item.quiz.subject}` : ""}`, value: `${item.result.percentage != null ? `${Math.round(Number(item.result.percentage))}%` : `${item.result.obtained_marks ?? 0}/${item.result.total_marks ?? 0}`}  ›  ${dateLabel(item.quiz?.scheduled_date)}` })));
      } else if (category === "weekly") {
        const { data, error } = await supabase.from("academy_assessments").select("id,test_name,test_date,total_marks,obtained_marks,subject,attendance_status").eq("student_id", studentId).order("test_date", { ascending: false }).limit(100);
        if (error) throw error;
        let rows = (data || []).filter((row) => isOnOrAfterAdmission(student?.admission_date, row.test_date) && /weekly|saturday|saturday test/i.test(`${row.test_name || ""} ${row.subject || ""}`));
        if (id.startsWith("weekly:" ) && id !== "weekly:all") rows = rows.filter((row) => String(row.id) === id.split(":")[1]);
        rows = id === "weekly:all" ? rows.slice(0, 12) : rows.slice(0, 1);
        bot(rows.length ? "आपकी Saturday Test रिपोर्ट 🏁" : "इस टेस्ट का रिज़ल्ट अभी उपलब्ध नहीं है।", rows.map((row) => ({ label: `${row.test_name || "Saturday Test"}${row.subject ? ` • ${row.subject}` : ""}`, value: `${row.obtained_marks ?? 0}/${row.total_marks ?? 0}  ›  ${dateLabel(row.test_date)}` })));
      } else if (category === "monthly") {
        const key = id.replace("monthly:", "");
        const response = await fetch(`/api/monthly-results/publish?monthKey=${encodeURIComponent(key)}&studentId=${studentId}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.error || "Monthly result could not be loaded.");
        const raw = payload.results?.[0]?.snapshot;
        const snapshot = raw ? filterMonthlySnapshotByAdmission(raw, student?.admission_date) : null;
        bot(snapshot?.totals?.grandTotal ? `✨ ${monthLabel(key)} — मंथली रिपोर्ट` : "इस महीने की रिपोर्ट अभी उपलब्ध नहीं है।", snapshot?.totals?.grandTotal ? [
          { label: "क्विज़ में अंक", value: `${snapshot.totals.quizObtained}/${snapshot.totals.quizTotal}` },
          { label: "सैटरडे टेस्ट अंक", value: `${snapshot.totals.weeklyObtained}/${snapshot.totals.weeklyTotal}` },
          { label: "महा टेस्ट अंक", value: `${snapshot.totals.mahaObtained}/${snapshot.totals.mahaTotal}` },
          { label: "कुल प्रतिशत", value: `${Math.round(snapshot.totals.percentage)}%  ›` },
        ] : undefined);
      } else if (category === "timetable") {
        if (id === "date") { showDatePicker("date", "जिस तारीख का टाइमटेबल चाहिए, वह चुनें। उस तारीख के weekday की क्लासें दिखेंगी।"); return; }
        const targetDate = id === "tomorrow" ? addIstDays(todayKey(), 1) : todayKey();
        if (id === "week") {
          const { data, error } = await supabase.from("timetables").select("teacher_name,class_names,day_of_week,subject,start_time,end_time,is_holiday");
          if (error) throw error;
          const rows = matchingTimetable(data || [], student?.class_name).filter((row) => !row.is_holiday);
          bot(rows.length ? "आपका पूरे सप्ताह का क्लास ट्रैकर 🗓️" : "इस सप्ताह का टाइमटेबल नहीं मिला।", rows.slice(0, 12).map((row) => ({ label: `${row.day_of_week} • ${row.subject || "क्लास"}`, value: `${row.start_time || "समय नहीं"}${row.end_time ? `–${row.end_time}` : ""}${row.teacher_name ? ` › ${row.teacher_name}` : ""}` })));
        } else await timetableAnswer(targetDate);
      } else if (category === "homework") {
        if (id === "date") { showDatePicker("date", "होमवर्क की तारीख चुनें। मैं उसी दिन पोस्ट हुआ काम ढूँढूँगा।"); return; }
        await homeworkAnswer(id);
      } else if (category === "calendar") {
        if (id === "date") { showDatePicker("date", "किस तारीख का कैलेंडर देखना है? तारीख चुनें।"); return; }
        await calendarAnswer(id);
      }
    } catch (error) { reportError(error); }
    finally { setLoading(false); }
  };

  const matchingTimetable = (rows: any[], className: string | null | undefined) => {
    const normalized = className?.trim().toLowerCase();
    return rows.filter((row) => Array.isArray(row.class_names) && row.class_names.some((name: string) => name.trim().toLowerCase() === normalized));
  };

  const timetableAnswer = async (date: string) => {
    const { data, error } = await supabase.from("timetables").select("teacher_name,class_names,day_of_week,subject,start_time,end_time,is_holiday");
    if (error) throw error;
    const day = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "Asia/Kolkata" }).format(new Date(`${date}T12:00:00+05:30`));
    const rows = matchingTimetable(data || [], student?.class_name).filter((row) => String(row.day_of_week).toLowerCase() === day.toLowerCase());
    bot(`${dateLabel(date)} का टाइमटेबल (${day})`, rows.length ? rows.map((row) => ({ label: row.is_holiday ? "छुट्टी" : row.subject || "क्लास", value: row.is_holiday ? "आज क्लास नहीं है" : `${row.start_time || "समय नहीं"}${row.end_time ? `–${row.end_time}` : ""}${row.teacher_name ? `  ›  ${row.teacher_name}` : ""}` })) : [{ label: "इस दिन की क्लास", value: "टाइमटेबल में नहीं मिली" }]);
  };

  const homeworkAnswer = async (period: string, exactDate?: string) => {
    const { data, error } = await supabase.from("homework").select("title,subject,description,due_date,class_name,created_at").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    const cls = student?.class_name?.trim().toLowerCase() || "";
    const now = new Date(`${todayKey()}T00:00:00`).getTime();
    let rows = (data || []).filter((row) => {
      const classes = String(row.class_name || "").split(/[,;|]/).map((value) => value.trim().toLowerCase());
      return classes.includes(cls) && isOnOrAfterAdmission(student?.admission_date, row.created_at);
    });
    if (period === "today") rows = rows.filter((row) => String(row.created_at || "").slice(0, 10) === todayKey() || row.due_date === todayKey());
    if (period === "recent") rows = rows.filter((row) => { const posted = new Date(String(row.created_at || "").slice(0, 10)).getTime(); return posted <= now && posted >= now - 7 * 86400000; });
    if (period === "date") rows = rows.filter((row) => String(row.created_at || "").slice(0, 10) === exactDate || row.due_date === exactDate);
    bot(rows.length ? "आपकी क्लास का होमवर्क बोर्ड 📚" : "इस अवधि में आपकी क्लास के लिए होमवर्क नहीं मिला।", rows.slice(0, 8).map((row) => ({ label: `${row.title || row.subject || "होमवर्क"}${row.subject ? ` • ${row.subject}` : ""}`, value: `${row.due_date ? `जमा: ${dateLabel(row.due_date)}` : "जमा तारीख नहीं"}${row.description ? `  ›  ${row.description.slice(0, 70)}` : ""}` })));
  };

  const calendarAnswer = async (kind: string, exactDate?: string) => {
    const dates = kind === "date" && exactDate ? [new Date(`${exactDate}T12:00:00`)] : Array.from({ length: 120 }, (_, offset) => new Date(`${addIstDays(todayKey(), offset)}T12:00:00`));
    const events = dates.map((date) => getStudentCalendarEvent(date)).filter((event) => event && isOnOrAfterAdmission(student?.admission_date, event.date));
    const upcoming = events.filter((event) => event!.date >= todayKey());
    const match = upcoming.filter((event) => kind === "holidays" ? event!.type === "holiday" : kind === "tests" ? event!.type === "test" : true).slice(0, 10);
    bot(kind === "holidays" ? "आने वाली छुट्टियों की झलक 🌤" : kind === "tests" ? "आने वाले टेस्ट का ट्रैकर ✏️" : "अकादमिक कैलेंडर इवेंट ◇", match.length ? match.map((event) => ({ label: event!.title, value: `${dateLabel(event!.date)}  ›  ${event!.description}` })) : [{ label: "आगे का कैलेंडर", value: "इस चयन में कोई इवेंट नहीं है" }]);
  };

  const submitPicker = async () => {
    if (!category || !picker || !pickerValue) return;
    const value = pickerValue;
    studentSaid(picker === "month" ? monthLabel(value) : dateLabel(value));
    setPicker(null); setLoading(true);
    try {
      if (category === "attendance") await attendanceAnswer("date", value);
      else if (category === "fees") await feesAnswer("month", value);
      else if (category === "quiz") {
        const rows = (await quizRows()).filter((item) => monthOf(item.quiz?.scheduled_date) === value);
        const unique = Array.from(new Map(rows.map((item) => [item.quiz?.id, item])).values());
        if (!unique.length) bot(`${monthLabel(value)} में कोई क्विज़ रिज़ल्ट नहीं मिला।`);
        else menu(withMainMenu(unique.map((item) => ({ id: `quiz:${item.quiz?.id}`, label: `${item.quiz?.title || "क्विज़"}${item.quiz?.subject ? ` • ${item.quiz.subject}` : ""}`, icon: "✎" }))), `${monthLabel(value)} के कौन-से क्विज़ का रिज़ल्ट देखना है?`);
      } else if (category === "timetable") await timetableAnswer(value);
      else if (category === "homework") await homeworkAnswer("date", value);
      else if (category === "calendar") await calendarAnswer("date", value);
    } catch (error) { reportError(error); }
    finally { setLoading(false); }
  };

  const start = () => {
    setOpen(true);
    if (!messages.length) {
      bot("नमस्ते! Racer Academy में आपका स्वागत है 👋\nमैं आपका Racer Saathi हूँ। नीचे से जानकारी का विकल्प चुनें, मैं आपकी रिपोर्ट आसान तरीके से दिखाऊँगा।");
      setOptions(mainOptions);
    }
  };

  const submitTypedQuestion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = typedQuestion.trim();
    if (!text || loading) return;
    setTypedQuestion("");
    const normalized = text.toLowerCase();
    const aliases: Array<[Category, string[]]> = [
      ["attendance", ["attendance", "अटेंडेंस", "उपस्थिति", "हाजिरी"]],
      ["fees", ["fees", "fee", "फीस", "भुगतान"]],
      ["quiz", ["quiz", "क्विज़", "क्विज", "क्विज़"]],
      ["weekly", ["weekly", "सैटरडे", "शनिवार", "वीकली", "weekly test"]],
      ["monthly", ["monthly", "मंथली", "मासिक", "महा टेस्ट"]],
      ["timetable", ["timetable", "time table", "टाइमटेबल", "समय सारणी"]],
      ["homework", ["homework", "होमवर्क", "गृहकार्य"]],
      ["calendar", ["calendar", "कैलेंडर", "छुट्टी", "holiday", "इवेंट", "कार्यक्रम"]],
    ];
    const match = aliases.find(([, words]) => words.some((word) => normalized.includes(word)));
    if (!match) {
      studentSaid(text);
      bot("मैं attendance, फीस, quiz, Saturday test, monthly result, timetable, homework और calendar की जानकारी ढूँढ सकता हूँ। इनमें से क्या देखना है?");
      setCategory(null);
      setOptions(mainOptions);
      return;
    }
    const selected = categories.find((item) => item.category === match[0]);
    if (selected) {
      studentSaid(text);
      askCategory(selected, true);
    }
  };

  return <>
    <button type="button" className="racer-saathi-launcher" onClick={() => open ? setOpen(false) : start()} aria-label="रेसर साथी खोलें">
      <span className="racer-saathi-launcher-face"><RACreature compact /></span>
      <span><strong>रेसर साथी</strong><small>आपका Racer helper</small></span><span className="racer-saathi-launcher-dot" />
    </button>
    {open && <section className="racer-saathi-panel" aria-label="रेसर साथी विद्यार्थी सहायता">
      <header className="racer-saathi-header"><span className="racer-saathi-header-mascot"><RACreature compact /></span><div><strong>रेसर साथी</strong><small>{student?.student_name ? `${student.student_name} के लिए आपका RA guide` : "Racer Academy • आपका RA guide"}</small></div><button type="button" onClick={() => setOpen(false)} aria-label="बंद करें">×</button></header>
      <div className="racer-saathi-messages" aria-live="polite">
        {messages.map((message, index) => <div key={`${index}-${message.from}`} className={`racer-saathi-message ${message.from}`}>
          <div className="racer-saathi-message-text">{message.text}</div>
          {message.rows?.length ? <div className="racer-saathi-answer-card"><div className="racer-saathi-answer-cap"><span>RA • STUDENT SNAPSHOT</span><span>↗</span></div>{message.rows.map((row, rowIndex) => <div className="racer-saathi-answer-row" key={`${row.label}-${rowIndex}`}><span>{row.label}</span><strong>{row.value}</strong></div>)}</div> : null}
        </div>)}
        {loading && <div className="racer-saathi-message bot"><div className="racer-saathi-message-text">आपकी जानकारी खोल रहा हूँ <span className="saathi-typing">•••</span></div></div>}
        <div ref={messagesEndRef} />
      </div>
      {picker && <div className="racer-saathi-picker"><label>{picker === "month" ? "महीना चुनें" : "तारीख चुनें"}<input type={picker} value={pickerValue} onChange={(event) => setPickerValue(event.target.value)} /></label><button type="button" onClick={() => void submitPicker()} disabled={loading || !pickerValue}>दिखाएँ <span>→</span></button></div>}
      <div className="racer-saathi-menu-label">{category ? "अपनी पसंद चुनें" : "किस जानकारी की ज़रूरत है?"}</div>
      {category && <div className="racer-saathi-menu">{options.map((option) => <button key={option.id} type="button" onClick={() => {
        if (option.id === "main") { studentSaid(option.label); mainMenu(); return; }
        void detail(option.id);
      }} disabled={loading}><span>{option.icon || "›"}</span>{option.label}<b>→</b></button>)}</div>}
      <div className="racer-saathi-shortcuts-label">मुख्य विकल्प <span>किसी भी समय चुनें</span></div>
      <div className="racer-saathi-shortcuts">{mainOptions.map((option) => <button key={option.id} type="button" onClick={() => {
        if (option.id === "other") { studentSaid("कुछ और पूछें"); bot("अपना सवाल नीचे लिखें—मैं उसे संबंधित जानकारी से जोड़ने की कोशिश करूँगा।"); questionInputRef.current?.focus(); return; }
        const selected = categories.find((item) => item.id === option.id);
        if (selected) askCategory(selected);
      }} disabled={loading}><span>{option.icon}</span><small>{option.label}</small></button>)}</div>
      <form className="racer-saathi-composer" onSubmit={submitTypedQuestion}>
        <input ref={questionInputRef} value={typedQuestion} onChange={(event) => setTypedQuestion(event.target.value)} placeholder="कुछ और पूछें…" aria-label="रेसर साथी से सवाल पूछें" />
        <button type="submit" aria-label="सवाल भेजें" disabled={!typedQuestion.trim() || loading}>➤</button>
      </form>
    </section>}
    <style jsx>{`
      .racer-mascot{width:64px;height:64px;display:block;filter:drop-shadow(0 5px 6px #0a285b30)}.racer-mascot.compact{width:46px;height:46px}
      .racer-saathi-launcher{position:fixed;z-index:1200;right:24px;bottom:24px;display:flex;align-items:center;gap:10px;padding:8px 16px 8px 8px;border:1px solid #c9e3ff;border-radius:999px;background:linear-gradient(120deg,#fff,#eef7ff);box-shadow:0 12px 35px #173c6a30;color:#173d72;cursor:pointer;text-align:left;animation:saathi-float 3s ease-in-out infinite}.racer-saathi-launcher-face{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:#e3f5ff}.racer-saathi-launcher strong,.racer-saathi-launcher small{display:block}.racer-saathi-launcher strong{font-size:13px;font-weight:900}.racer-saathi-launcher small{font-size:10px;color:#6b7f9e;margin-top:2px}.racer-saathi-launcher-dot{width:9px;height:9px;background:#27be82;border:2px solid white;border-radius:50%;position:absolute;left:45px;top:7px}
      .racer-saathi-panel{position:fixed;z-index:1201;right:24px;bottom:82px;width:min(410px,calc(100vw - 28px));height:min(680px,calc(100dvh - 125px));min-height:390px;background:#f4f8ff;border:1px solid #d8e5f5;border-radius:24px;box-shadow:0 24px 75px #122f5840;display:flex;flex-direction:column;overflow:hidden;color:#17365d}.racer-saathi-header{padding:12px 15px;display:flex;align-items:center;gap:11px;color:white;background:linear-gradient(115deg,#103c87,#2577d5)}.racer-saathi-header-mascot{width:50px;height:50px;border-radius:16px;background:#ffffff20;display:grid;place-items:center}.racer-saathi-header>div{flex:1;min-width:0}.racer-saathi-header strong,.racer-saathi-header small{display:block}.racer-saathi-header strong{font-size:15px;font-weight:900}.racer-saathi-header small{font-size:10px;opacity:.85;margin-top:3px}.racer-saathi-header button{width:33px;height:33px;border:0;border-radius:50%;background:#ffffff24;color:white;font-size:24px;cursor:pointer}
      .racer-saathi-messages{flex:1;overflow:auto;padding:14px 12px 8px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}.racer-saathi-message{max-width:96%;white-space:pre-line;animation:saathi-pop .2s ease-out}.racer-saathi-message.bot{align-self:flex-start}.racer-saathi-message.student{align-self:flex-end;max-width:88%}.racer-saathi-message-text{padding:10px 12px;border-radius:15px;font-size:12px;line-height:1.5;box-shadow:0 3px 10px #274d7710}.racer-saathi-message.bot .racer-saathi-message-text{border:1px solid #e2ebf7;background:white;border-bottom-left-radius:5px}.racer-saathi-message.student .racer-saathi-message-text{background:linear-gradient(120deg,#e2efff,#e9e8ff);color:#174d91;border-bottom-right-radius:5px;font-weight:750}
      .racer-saathi-answer-card{margin-top:7px;padding:9px 11px;border:1px solid #d9e6f6;border-radius:14px;background:white;box-shadow:0 7px 18px #17457610}.racer-saathi-answer-cap{display:flex;justify-content:space-between;align-items:center;padding:0 0 6px;color:#7290b3;font-size:8px;letter-spacing:1.1px;font-weight:900;border-bottom:1px solid #eaf0f7}.racer-saathi-answer-cap span:last-child{font-size:13px;color:#2877d4}.racer-saathi-answer-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:7px 1px;border-bottom:1px dashed #e8eef6;font-size:10px}.racer-saathi-answer-row:last-child{border-bottom:0}.racer-saathi-answer-row>span{color:#7889a3}.racer-saathi-answer-row strong{color:#193e72;font-size:11px;text-align:right;max-width:190px;overflow-wrap:anywhere}
      .racer-saathi-menu-label,.racer-saathi-shortcuts-label{font-size:9px;letter-spacing:.6px;font-weight:900;color:#7b8ca6;padding:7px 13px}.racer-saathi-shortcuts-label{display:flex;justify-content:space-between;align-items:center;padding:6px 13px 4px}.racer-saathi-shortcuts-label span{font-size:8px;letter-spacing:0;font-weight:700;color:#9ba8ba}.racer-saathi-menu{max-height:118px;overflow:auto;display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 11px 6px}.racer-saathi-menu button{min-width:0;display:grid;grid-template-columns:22px 1fr 13px;align-items:center;gap:6px;padding:7px;border:1px solid #dce7f5;border-radius:12px;background:white;color:#23456f;font-size:9px;font-weight:800;text-align:left;cursor:pointer;box-shadow:0 3px 9px #23456f08;transition:transform .16s,border-color .16s,box-shadow .16s}.racer-saathi-menu button:hover{transform:translateY(-1px);border-color:#7cb6ff;box-shadow:0 6px 13px #23456f14}.racer-saathi-menu button span{width:22px;height:22px;border-radius:8px;display:grid;place-items:center;background:#e9f3ff;color:#256ad0;font-size:13px}.racer-saathi-menu button b{color:#3a81d4;font-size:12px;text-align:right}.racer-saathi-menu button:disabled{opacity:.55;cursor:wait}
      .racer-saathi-shortcuts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;padding:0 10px 7px}.racer-saathi-shortcuts button{min-width:0;min-height:46px;padding:5px 3px;border:1px solid #dce7f5;border-radius:11px;background:#fff;color:#285081;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer}.racer-saathi-shortcuts button span{font-size:14px;color:#2673ce;font-weight:900}.racer-saathi-shortcuts button small{font-size:7px;line-height:1.1;text-align:center;font-weight:850}.racer-saathi-shortcuts button:disabled{opacity:.55}.racer-saathi-composer{display:flex;align-items:center;gap:7px;padding:7px 10px 10px;border-top:1px solid #e6edf6;background:#fff}.racer-saathi-composer input{flex:1;min-width:0;height:37px;padding:0 12px;border:1px solid #d7e3f2;border-radius:999px;outline:none;color:#173d72;font-size:11px}.racer-saathi-composer input:focus{border-color:#5da1ec;box-shadow:0 0 0 3px #2d83df18}.racer-saathi-composer button{width:37px;height:37px;border:0;border-radius:50%;background:#2673d0;color:white;font-size:17px;cursor:pointer}.racer-saathi-composer button:disabled{opacity:.45}
      .racer-saathi-picker{display:flex;gap:8px;align-items:end;padding:4px 12px 8px}.racer-saathi-picker label{display:flex;flex:1;flex-direction:column;gap:4px;color:#7284a0;font-size:9px;font-weight:850}.racer-saathi-picker input{min-width:0;width:100%;height:36px;padding:0 8px;border:1px solid #cbdcf2;border-radius:10px;background:white;color:#193e72;font:inherit;font-size:12px}.racer-saathi-picker>button{height:36px;padding:0 12px;border:0;border-radius:10px;background:#226bd0;color:white;font-size:10px;font-weight:900;cursor:pointer}.racer-saathi-picker>button span{margin-left:6px}.racer-saathi-picker>button:disabled{opacity:.55}.saathi-typing{display:inline-block;letter-spacing:2px;color:#3987df;animation:saathi-dots .8s infinite alternate}
      @keyframes saathi-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@keyframes saathi-pop{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@keyframes saathi-dots{to{opacity:.25;transform:translateY(-2px)}}
      @media(max-width:600px){.racer-saathi-launcher{right:12px;bottom:82px;padding:6px 12px 6px 6px}.racer-saathi-launcher-face{width:44px;height:44px}.racer-saathi-launcher strong{font-size:12px}.racer-saathi-panel{right:8px;bottom:130px;width:calc(100vw - 16px);height:min(720px,calc(100dvh - 155px));min-height:350px;border-radius:20px}.racer-saathi-menu{max-height:110px;gap:5px}.racer-saathi-menu button{padding:6px;font-size:8px}.racer-saathi-shortcuts button{min-height:42px}.racer-saathi-shortcuts button small{font-size:6.5px}.racer-saathi-answer-row{font-size:9px}}
      @media(prefers-reduced-motion:reduce){.racer-saathi-launcher,.saathi-typing{animation:none}.racer-saathi-menu button{transition:none}}
    `}</style>
  </>;
}
