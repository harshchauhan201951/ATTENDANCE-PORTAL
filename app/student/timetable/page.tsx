"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { isHiddenStudentTimetableTeacher } from "../../../lib/student-timetable";

type TimetableRow = {
  id: number;
  teacher_id: string;
  teacher_name: string;
  class_names: string[] | null;
  day_of_week: string;
  subject: string | null;
  start_time: string | null;
  end_time: string | null;
  is_holiday: boolean;
};

type StudentInfo = {
  id: number;
  student_username: string | null;
  class_name: string | null;
  student_name?: string | null;
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_ORDER: Record<string, number> = Object.fromEntries(DAYS.map((day, index) => [day, index]));

function formatTime(value: string | null) {
  if (!value) return "Time not set";
  const [rawHour, rawMinute] = value.split(":");
  const hour = Number(rawHour);
  const minute = Number(rawMinute || 0);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

function getTodayName() {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "Asia/Kolkata" }).format(new Date());
}

function getClassTracker(item: TimetableRow, todayName: string, now: Date | null) {
  if (!now) return { label: "SCHEDULED", state: "scheduled" };
  if (item.day_of_week !== todayName) {
    return { label: "SCHEDULED", state: "scheduled" };
  }

  const [startHour, startMinute] = String(item.start_time || "").split(":").map(Number);
  const [endHour, endMinute] = String(item.end_time || "").split(":").map(Number);
  if (!Number.isFinite(startHour) || !Number.isFinite(endHour)) return { label: "SCHEDULED", state: "scheduled" };
  const start = startHour * 60 + (startMinute || 0);
  const end = endHour * 60 + (endMinute || 0);
  const current = now.getHours() * 60 + now.getMinutes();
  if (current < start) {
    return { label: "UP NEXT", state: "up-next" };
  }
  if (current >= end || end <= start) return { label: "COMPLETED", state: "completed" };
  return { label: "LIVE NOW", state: "live" };
}

export default function StudentTimetablePage() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [timetables, setTimetables] = useState<TimetableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDay, setSelectedDay] = useState(getTodayName());
  const [scheduleMode, setScheduleMode] = useState<"today" | "full-week">("today");
  const [clockNow, setClockNow] = useState<Date | null>(null);
  const todayName = getTodayName();

  const loadTimetable = async () => {
    try {
      setError("");
      const loggedIn = localStorage.getItem("studentLoggedIn") || sessionStorage.getItem("studentLoggedIn");
      if (loggedIn !== "true") { router.replace("/"); return; }

      const username = localStorage.getItem("student_username") || localStorage.getItem("studentUsername") || "";
      const savedStudentId = localStorage.getItem("studentId") || "";
      if (!username && !savedStudentId) { router.replace("/"); return; }

      let studentData: StudentInfo | null = null;
      if (savedStudentId && Number(savedStudentId) > 0) {
        const { data } = await supabase.from("students").select("id,student_username,class_name,student_name").eq("id", Number(savedStudentId)).maybeSingle();
        if (data) studentData = data as StudentInfo;
      }
      if (!studentData && username) {
        const { data } = await supabase.from("students").select("id,student_username,class_name,student_name").eq("student_username", username).maybeSingle();
        if (data) studentData = data as StudentInfo;
      }
      if (!studentData) throw new Error("Student details could not be found.");
      setStudent(studentData);

      const studentClass = studentData.class_name?.trim();
      if (!studentClass) throw new Error("Your class is not assigned yet.");

      const { data, error: timetableError } = await supabase
        .from("timetables")
        .select("id,teacher_id,teacher_name,class_names,day_of_week,subject,start_time,end_time,is_holiday");
      if (timetableError) throw timetableError;

      const normalizedClass = studentClass.toLowerCase();
      const rows = ((data || []) as TimetableRow[])
        .filter((item) => !isHiddenStudentTimetableTeacher(item.teacher_name))
        .filter((item) => Array.isArray(item.class_names) && item.class_names.some((name) => String(name).trim().toLowerCase() === normalizedClass))
        .sort((a, b) => DAY_ORDER[a.day_of_week] - DAY_ORDER[b.day_of_week] || (a.start_time || "").localeCompare(b.start_time || ""));
      setTimetables(rows);
    } catch (loadError: any) {
      console.error("Student timetable error:", loadError);
      setError(loadError?.message || "Unable to load timetable.");
      setTimetables([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadTimetable(); }, []);

  useEffect(() => {
    const updateTime = () => setClockNow(new Date());
    updateTime();
    const timer = window.setInterval(updateTime, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const days = useMemo(() => DAYS.map((day) => {
    const rows = timetables.filter((item) => item.day_of_week === day && !item.is_holiday);
    const holiday = timetables.some((item) => item.day_of_week === day && item.is_holiday);
    return { day, rows, holiday };
  }), [timetables]);

  const classRows = timetables.filter((item) => !item.is_holiday);
  const subjects = new Set(classRows.map((item) => String(item.subject || "").trim()).filter(Boolean));
  const nextClass = useMemo(() => {
    if (!clockNow) return null;
    const now = clockNow;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return [...classRows].map((item) => {
      const dayOffset = (DAY_ORDER[item.day_of_week] - DAY_ORDER[todayName] + 7) % 7;
      const [hour, minute] = String(item.start_time || "").split(":").map(Number);
      const startMinutes = Number.isFinite(hour) ? hour * 60 + (minute || 0) : -1;
      const offset = dayOffset === 0 && startMinutes < currentMinutes ? 7 : dayOffset;
      return { item, offset };
    }).filter(({ offset }) => offset < 7).sort((a, b) => a.offset - b.offset || (a.item.start_time || "").localeCompare(b.item.start_time || ""))[0]?.item || null;
  }, [classRows, todayName, clockNow]);

  const selectedDayIndex = DAY_ORDER[selectedDay] ?? DAY_ORDER[todayName];
  const visibleDays = scheduleMode === "full-week"
    ? days
    : [days[selectedDayIndex]].filter(Boolean);

  return (
    <main className="student-timetable-page student-timetable-v2">
      <div className="student-timetable-v2-container">
        <header className="student-timetable-v2-heading">
          <div>
            <span>RACER ACADEMY · CLASS {student?.class_name || ""}</span>
            <h1>My Timetable</h1>
            <p>Your classes at a glance. Choose a day to see its schedule.</p>
          </div>
        </header>

        {error && <div className="student-timetable-v2-error" role="alert">{error}</div>}

        {!error && <>
          <section className="student-timetable-overview">
            <article className="student-timetable-next">
              <span>NEXT CLASS</span>
              {loading ? <strong>Loading your schedule…</strong> : nextClass ? <><strong>{nextClass.subject || "Class"}</strong><p>{nextClass.day_of_week === todayName ? "Today" : nextClass.day_of_week} · {formatTime(nextClass.start_time)}–{formatTime(nextClass.end_time)}</p></> : <><strong>No upcoming class</strong><p>Your next scheduled class will appear here.</p></>}
            </article>
            <article><span>CLASSES THIS WEEK</span><strong>{loading ? "—" : classRows.length}</strong></article>
            <article><span>SUBJECTS</span><strong>{loading ? "—" : subjects.size}</strong></article>
          </section>

          <section className="student-timetable-week">
            <div className="student-timetable-week-heading">
              <div><span>YOUR SCHEDULE</span><h2>Weekly classes</h2></div>
              <span className="student-timetable-class-pill">Class {student?.class_name || "—"}</span>
            </div>
            <div className="student-timetable-day-tabs" role="group" aria-label="Choose a day">
              {DAYS.map((day) => <button key={day} type="button" className={`${selectedDay === day ? "active" : ""} ${todayName === day ? "is-today" : ""}`} onClick={() => { setSelectedDay(day); setScheduleMode("today"); }}>{day}</button>)}
            </div>
            <div className="student-timetable-view-tabs" role="group" aria-label="Choose timetable range">
              <button type="button" className={scheduleMode === "today" ? "active" : ""} onClick={() => { setSelectedDay(todayName); setScheduleMode("today"); }}>Today’s Timetable</button>
              <button type="button" className={scheduleMode === "full-week" ? "active" : ""} onClick={() => setScheduleMode("full-week")}>Full Week Timetable</button>
            </div>

            <div className="student-timetable-day-list">
              {loading ? <div className="student-timetable-v2-empty">Loading your classes…</div> : timetables.length === 0 ? <div className="student-timetable-v2-empty">No timetable has been assigned to your class yet.</div> : visibleDays.map(({ day, rows, holiday }) => (
                <article key={day} className={`student-timetable-day-card ${day === todayName ? "today" : ""}`}>
                  <header><div><span>{day === todayName ? "TODAY" : "WEEKLY SCHEDULE"}</span><h3>{day}</h3></div><strong>{holiday && rows.length === 0 ? "HOLIDAY" : `${rows.length} CLASS${rows.length === 1 ? "" : "ES"}`}</strong></header>
                  {holiday && rows.length === 0 ? <p className="student-timetable-holiday">No classes scheduled for this holiday.</p> : rows.length ? <div className="student-timetable-classes">{rows.map((item) => { const tracker = getClassTracker(item, todayName, clockNow); const accent = ["#2563eb", "#7c3aed", "#08916c", "#d97706", "#db2777"][item.id % 5]; return <div key={item.id} className={`student-timetable-class-row ${tracker.state}`} style={{ "--class-accent": accent } as React.CSSProperties}>
                    <div className="student-timetable-class-main"><div className="student-timetable-class-top"><strong>{item.subject || "Class"}</strong><span className={`student-timetable-state ${tracker.state}`}>{tracker.label}</span></div><span className="student-timetable-class-teacher">{item.teacher_name || "Teacher"}</span>
                      <div className="student-timetable-class-time-range"><span>{formatTime(item.start_time)}</span><b>→</b><span>{formatTime(item.end_time)}</span></div>
                    </div>
                  </div>; })}</div> : <p className="student-timetable-no-class">No classes scheduled for this day.</p>}
                </article>
              ))}
              {!loading && !visibleDays.length && <div className="student-timetable-v2-empty">No schedule for this day.</div>}
            </div>
          </section>
        </>}

        <footer className="student-timetable-v2-footer"><span>{student?.student_name || "Student"}</span><Link href="/student/dashboard">Back to Dashboard →</Link></footer>
      </div>
    </main>
  );
}
