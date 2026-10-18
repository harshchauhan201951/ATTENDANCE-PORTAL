"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { isFeePeriodOnOrAfterAdmission, isOnOrAfterAdmission } from "../../../lib/admission-date";
import { getStudentCalendarEvent } from "../../../lib/student-calendar-events";
import { filterMonthlySnapshotByAdmission } from "../../../lib/monthly-result";

type Student = { id: number; student_name: string | null; class_name: string | null; admission_date: string | null };
type Choice = { id: string; label: string; emoji: string; href: string };
type Message = { from: "bot" | "student"; text: string };

const choices: Choice[] = [
  { id: "attendance", label: "मेरी अटेंडेंस", emoji: "📊", href: "/student/attendance-history" },
  { id: "fees", label: "मेरी फीस", emoji: "💳", href: "/student/fees" },
  { id: "quiz", label: "क्विज़ रिज़ल्ट", emoji: "✏️", href: "/student/quiz-tests/history" },
  { id: "weekly", label: "सैटरडे टेस्ट", emoji: "📝", href: "/student/exams/weekly-tests" },
  { id: "monthly", label: "मंथली रिज़ल्ट", emoji: "🏆", href: "/student/monthly-result" },
  { id: "timetable", label: "टाइमटेबल", emoji: "🗓️", href: "/student/timetable" },
  { id: "homework", label: "होमवर्क", emoji: "📚", href: "/student/homework" },
  { id: "calendar", label: "कैलेंडर", emoji: "🎉", href: "/student/calendar" },
];

function dateLabel(value: string | null | undefined) {
  if (!value) return "तारीख उपलब्ध नहीं";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("hi-IN", { day: "numeric", month: "short", year: "numeric" });
}

function money(value: number) {
  return `₹${Math.round(value || 0).toLocaleString("en-IN")}`;
}

export default function StudentRacerSaathi({ studentId }: { studentId: number | null }) {
  const [open, setOpen] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const currentChoice = useMemo(() => choices, []);

  useEffect(() => {
    if (!open || !studentId) return;
    let active = true;
    void supabase.from("students").select("id,student_name,class_name,admission_date").eq("id", studentId).maybeSingle().then(({ data }) => {
      if (active && data) setStudent(data as Student);
    });
    return () => { active = false; };
  }, [open, studentId]);

  const show = (text: string) => setMessages((prior) => [...prior, { from: "bot", text }]);

  const answer = async (choice: Choice) => {
    if (!studentId) {
      show("आपकी विद्यार्थी जानकारी अभी लोड हो रही है। थोड़ी देर बाद फिर कोशिश करें।");
      return;
    }
    setMessages((prior) => [...prior, { from: "student", text: choice.label }]);
    setLoading(true);
    try {
      if (choice.id === "attendance") {
        const [regular, extra] = await Promise.all([
          supabase.from("attendance").select("attendance_date,status").eq("student_id", studentId),
          supabase.from("extra_class_attendance").select("extra_class_date,status").eq("student_id", studentId),
        ]);
        if (regular.error) throw regular.error;
        const rows = [
          ...(regular.data || []).map((row) => ({ date: row.attendance_date, status: row.status })),
          ...(extra.data || []).map((row) => ({ date: row.extra_class_date, status: row.status })),
        ].filter((row) => isOnOrAfterAdmission(student?.admission_date, row.date));
        const present = rows.filter((row) => String(row.status || "").toLowerCase() === "present").length;
        const absent = rows.filter((row) => String(row.status || "").toLowerCase() === "absent").length;
        const total = present + absent;
        const percent = total ? Math.round((present / total) * 100) : 0;
        show(total ? `आपकी अटेंडेंस: ${percent}%\nकुल दर्ज क्लास: ${total}\nआए: ${present}  •  अनुपस्थित: ${absent}` : "अभी आपकी अटेंडेंस दर्ज नहीं हुई है।");
      } else if (choice.id === "fees") {
        const { data, error } = await supabase.from("fees").select("month,year,amount,status").eq("student_id", studentId).order("year", { ascending: false }).order("month", { ascending: false }).limit(24);
        if (error) throw error;
        const rows = (data || []).filter((row) => isFeePeriodOnOrAfterAdmission(student?.admission_date, Number(row.year), Number(row.month)));
        const pending = rows.filter((row) => !["paid", "complete", "completed"].includes(String(row.status || "").toLowerCase()));
        const paid = rows.filter((row) => !pending.includes(row));
        const latest = rows[0];
        show(rows.length ? `फीस की जानकारी\nबाकी फीस: ${money(pending.reduce((sum, row) => sum + Number(row.amount || 0), 0))}\nजमा फीस: ${money(paid.reduce((sum, row) => sum + Number(row.amount || 0), 0))}${latest ? `\nनवीनतम रिकॉर्ड: ${latest.month}/${latest.year} • ${money(Number(latest.amount))} • ${latest.status || "स्थिति उपलब्ध नहीं"}` : ""}` : "आपकी फीस का रिकॉर्ड अभी उपलब्ध नहीं है।");
      } else if (choice.id === "quiz") {
        const { data, error } = await supabase.from("quiz_results").select("quiz_id,obtained_marks,total_marks,percentage,submitted_at,created_at").eq("student_id", studentId).not("submitted_at", "is", null).order("submitted_at", { ascending: false, nullsFirst: false }).limit(20);
        if (error) throw error;
        const ids = [...new Set((data || []).map((row) => row.quiz_id).filter(Boolean))];
        const { data: quizzes } = ids.length ? await supabase.from("quiz_tests").select("id,title,subject,scheduled_date").in("id", ids) : { data: [] as any[] };
        const byId = new Map((quizzes || []).map((quiz: any) => [Number(quiz.id), quiz]));
        const rows = (data || []).filter((row) => isOnOrAfterAdmission(student?.admission_date, byId.get(Number(row.quiz_id))?.scheduled_date)).slice(0, 5);
        show(rows.length ? `आपके नए क्विज़ रिज़ल्ट\n${rows.map((row) => { const quiz: any = byId.get(Number(row.quiz_id)); return `• ${quiz?.title || "क्विज़"}${quiz?.subject ? ` (${quiz.subject})` : ""}: ${row.percentage != null ? `${Math.round(Number(row.percentage))}%` : `${row.obtained_marks ?? 0}/${row.total_marks ?? 0}`} — ${dateLabel(quiz?.scheduled_date)}`; }).join("\n")}` : "अभी कोई नया सबमिट किया हुआ क्विज़ रिज़ल्ट नहीं है।");
      } else if (choice.id === "weekly") {
        const { data, error } = await supabase.from("academy_assessments").select("test_name,test_date,total_marks,obtained_marks,subject,attendance_status").eq("student_id", studentId).order("test_date", { ascending: false }).limit(30);
        if (error) throw error;
        const rows = (data || []).filter((row) => isOnOrAfterAdmission(student?.admission_date, row.test_date) && /weekly|saturday|saturday test/i.test(`${row.test_name || ""} ${row.subject || ""}`)).slice(0, 5);
        show(rows.length ? `आपके नए सैटरडे टेस्ट\n${rows.map((row) => `• ${row.test_name || "सैटरडे टेस्ट"}${row.subject ? ` (${row.subject})` : ""}: ${row.obtained_marks ?? 0}/${row.total_marks ?? 0} — ${dateLabel(row.test_date)}`).join("\n")}` : "अभी आपका कोई सैटरडे टेस्ट रिज़ल्ट उपलब्ध नहीं है।");
      } else if (choice.id === "monthly") {
        const listResponse = await fetch("/api/monthly-results/publish?list=1", { cache: "no-store" });
        const listData = await listResponse.json();
        if (!listResponse.ok || !listData.success) throw new Error(listData.error || "Monthly result load failed");
        const period = (listData.periods || []).find((item: any) => Boolean(item.is_released) || (item.scheduled_release_at && Date.now() >= new Date(item.scheduled_release_at).getTime()));
        if (!period) {
          show("मंथली रिज़ल्ट अभी जारी नहीं हुआ है। जारी होते ही यहाँ दिख जाएगा।");
        } else {
          const resultResponse = await fetch(`/api/monthly-results/publish?monthKey=${encodeURIComponent(period.month_key)}&studentId=${studentId}`, { cache: "no-store" });
          const resultData = await resultResponse.json();
          if (!resultResponse.ok || !resultData.success) throw new Error(resultData.error || "Student result load failed");
          const raw = resultData.results?.[0]?.snapshot;
          const snapshot = raw ? filterMonthlySnapshotByAdmission(raw, student?.admission_date) : null;
          show(snapshot?.totals?.grandTotal ? `आपका नया मंथली रिज़ल्ट (${period.month_key})\nस्कोर: ${snapshot.totals.grandObtained}/${snapshot.totals.grandTotal}\nप्रतिशत: ${Math.round(snapshot.totals.percentage)}%` : "आपका मंथली रिज़ल्ट अभी उपलब्ध नहीं है।");
        }
      } else if (choice.id === "timetable") {
        const { data, error } = await supabase.from("timetables").select("teacher_name,class_names,day_of_week,subject,start_time,end_time,is_holiday");
        if (error) throw error;
        const today = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "Asia/Kolkata" }).format(new Date());
        const cls = student?.class_name?.trim().toLowerCase();
        const rows = (data || []).filter((row) => !row.is_holiday && String(row.day_of_week).toLowerCase() === today.toLowerCase() && Array.isArray(row.class_names) && row.class_names.some((name: string) => name.trim().toLowerCase() === cls));
        show(rows.length ? `आज का टाइमटेबल (${today})\n${rows.map((row) => `• ${row.subject || "क्लास"}: ${row.start_time || ""}${row.end_time ? `–${row.end_time}` : ""}${row.teacher_name ? ` • ${row.teacher_name}` : ""}`).join("\n")}` : `आज (${today}) के लिए कोई क्लास टाइमटेबल में नहीं मिली।`);
      } else if (choice.id === "homework") {
        const { data, error } = await supabase.from("homework").select("title,subject,description,due_date,class_name,created_at").order("created_at", { ascending: false }).limit(60);
        if (error) throw error;
        const cls = student?.class_name?.trim().toLowerCase() || "";
        const rows = (data || []).filter((row) => {
          const classes = String(row.class_name || "").split(/[,;|]/).map((value) => value.trim().toLowerCase());
          return classes.includes(cls) && isOnOrAfterAdmission(student?.admission_date, row.created_at);
        }).slice(0, 5);
        show(rows.length ? `आपकी क्लास का नया होमवर्क\n${rows.map((row) => `• ${row.title || row.subject || "होमवर्क"}${row.subject ? ` (${row.subject})` : ""}${row.due_date ? ` — जमा करें: ${dateLabel(row.due_date)}` : ""}${row.description ? `\n  ${row.description.slice(0, 120)}` : ""}`).join("\n")}` : "आपकी क्लास के लिए अभी कोई नया होमवर्क नहीं है।");
      } else if (choice.id === "calendar") {
        const dates = Array.from({ length: 45 }, (_, offset) => { const date = new Date(); date.setDate(date.getDate() + offset); return date; });
        const events = dates.map((date) => getStudentCalendarEvent(date)).filter((event) => event && isOnOrAfterAdmission(student?.admission_date, event.date)).slice(0, 5);
        show(events.length ? `आने वाले कैलेंडर इवेंट\n${events.map((event) => `• ${dateLabel(event!.date)}: ${event!.title}`).join("\n")}` : "अगले 45 दिनों में कोई आने वाला इवेंट नहीं है।");
      }
    } catch (error: any) {
      console.error("Racer Saathi could not load student data:", error);
      show("अभी जानकारी नहीं मिल पाई। कृपया थोड़ी देर बाद फिर कोशिश करें या संबंधित सेक्शन खोलें।");
    } finally {
      setLoading(false);
    }
  };

  const start = () => {
    setOpen(true);
    if (!messages.length) show("नमस्ते! 👋 रेसर साथी में आपका स्वागत है। अपनी जानकारी देखने के लिए नीचे कोई विकल्प चुनें।");
  };

  return (
    <>
      <button type="button" className="racer-saathi-launcher" onClick={() => open ? setOpen(false) : start()} aria-label="रेसर साथी खोलें">
        <span className="racer-saathi-launcher-face" aria-hidden="true">🧸</span>
        <span><strong>रेसर साथी</strong><small>पूछो, मैं बताऊँ!</small></span>
        <span className="racer-saathi-launcher-dot" />
      </button>
      {open && <section className="racer-saathi-panel" aria-label="रेसर साथी विद्यार्थी सहायता">
        <header className="racer-saathi-header">
          <div className="racer-saathi-bear" aria-hidden="true"><span>🧸</span><i>✦</i></div>
          <div><strong>रेसर साथी</strong><small>{student?.student_name ? `${student.student_name} के लिए मदद` : "आपका स्टडी साथी"}</small></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="बंद करें">×</button>
        </header>
        <div className="racer-saathi-messages" aria-live="polite">
          {messages.map((message, index) => <div key={`${index}-${message.from}`} className={`racer-saathi-message ${message.from}`}>{message.text}</div>)}
          {loading && <div className="racer-saathi-message bot">आपकी जानकारी देख रहा हूँ…</div>}
        </div>
        <div className="racer-saathi-menu-label">आप क्या जानना चाहते हैं?</div>
        <div className="racer-saathi-menu">
          {currentChoice.map((choice) => <button key={choice.id} type="button" onClick={() => void answer(choice)} disabled={loading}><span>{choice.emoji}</span>{choice.label}</button>)}
        </div>
      </section>}
      <style jsx>{`
        .racer-saathi-launcher{position:fixed;z-index:1200;right:24px;bottom:24px;display:flex;align-items:center;gap:10px;padding:9px 16px 9px 9px;border:1px solid #cde5ff;border-radius:999px;background:linear-gradient(120deg,#fff,#f0f8ff);box-shadow:0 12px 35px #173c6a30;color:#173d72;cursor:pointer;text-align:left;animation:saathi-float 3s ease-in-out infinite}
        .racer-saathi-launcher-face{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#fff0c5;font-size:25px}
        .racer-saathi-launcher strong,.racer-saathi-launcher small{display:block}.racer-saathi-launcher strong{font-size:13px;font-weight:900}.racer-saathi-launcher small{font-size:10px;color:#6b7f9e;margin-top:2px}.racer-saathi-launcher-dot{width:8px;height:8px;background:#27be82;border:2px solid #fff;border-radius:50%;position:absolute;left:40px;top:7px}
        .racer-saathi-panel{position:fixed;z-index:1201;right:24px;bottom:82px;width:min(390px,calc(100vw - 28px));height:min(620px,calc(100dvh - 125px));min-height:360px;background:#f7faff;border:1px solid #d8e5f5;border-radius:23px;box-shadow:0 24px 75px #122f5840;display:flex;flex-direction:column;overflow:hidden;color:#17365d}
        .racer-saathi-header{padding:13px 15px;display:flex;align-items:center;gap:11px;color:white;background:linear-gradient(120deg,#114a91,#287fe0)}.racer-saathi-header>div:nth-child(2){flex:1}.racer-saathi-header strong,.racer-saathi-header small{display:block}.racer-saathi-header strong{font-size:15px;font-weight:900}.racer-saathi-header small{font-size:10px;opacity:.82;margin-top:3px}.racer-saathi-header button{width:32px;height:32px;border:0;border-radius:50%;background:#ffffff24;color:white;font-size:24px;cursor:pointer}
        .racer-saathi-bear{position:relative;width:43px;height:43px;border-radius:15px;background:#ffffff25;display:grid;place-items:center}.racer-saathi-bear span{font-size:27px;animation:saathi-wave 2.4s ease-in-out infinite}.racer-saathi-bear i{position:absolute;right:-3px;top:-5px;color:#ffe78b;font-style:normal;font-size:15px}
        .racer-saathi-messages{flex:1;overflow:auto;padding:14px 12px 8px;display:flex;flex-direction:column;gap:9px}.racer-saathi-message{max-width:92%;white-space:pre-line;padding:10px 12px;border-radius:15px;font-size:12px;line-height:1.5;box-shadow:0 3px 10px #274d7710}.racer-saathi-message.bot{align-self:flex-start;border:1px solid #e2ebf7;background:white;border-bottom-left-radius:5px}.racer-saathi-message.student{align-self:flex-end;background:#e3efff;color:#174d91;border-bottom-right-radius:5px}
        .racer-saathi-menu-label{font-size:10px;font-weight:800;color:#8190a8;padding:6px 13px 7px}.racer-saathi-menu{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:0 11px 12px}.racer-saathi-menu button{min-width:0;display:flex;align-items:center;gap:7px;padding:9px 8px;border:1px solid #dce7f5;border-radius:12px;background:white;color:#23456f;font-size:10px;font-weight:800;text-align:left;cursor:pointer}.racer-saathi-menu button span{font-size:16px}.racer-saathi-menu button:disabled{opacity:.55;cursor:wait}
        @keyframes saathi-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@keyframes saathi-wave{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(7deg)}}
        @media(max-width:600px){.racer-saathi-launcher{right:12px;bottom:82px;padding:7px 12px 7px 7px}.racer-saathi-launcher-face{width:38px;height:38px;font-size:23px}.racer-saathi-launcher strong{font-size:12px}.racer-saathi-panel{right:8px;bottom:130px;width:calc(100vw - 16px);height:min(590px,calc(100dvh - 155px));border-radius:20px}}
        @media(prefers-reduced-motion:reduce){.racer-saathi-launcher,.racer-saathi-bear span{animation:none}}
      `}</style>
    </>
  );
}
