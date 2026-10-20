"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

import { getStudentCalendarEvent, getStudentCalendarEventEmoji, studentCalendarHolidays, type CalendarEvent } from "../../../lib/student-calendar-events";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getHoliday(date: Date) {
  return studentCalendarHolidays.find(
    (event) => event.date === dateKey(date)
  );
}

function isSunday(date: Date) {
  return date.getDay() === 0;
}

function isSaturday(date: Date) {
  return date.getDay() === 6;
}

function isMonday(date: Date) {
  return date.getDay() === 1;
}

function isSundayClassDate(date: Date) {
  const key = dateKey(date);

  return key >= "2026-08-30" && isSunday(date);
}

function isMondayOffDate(date: Date) {
  const key = dateKey(date);

  return key >= "2026-08-31" && isMonday(date);
}


/* RACER CALENDAR MOBILE VIP 2026-09-29 */
type CalendarReferenceVipProps = {
  today: Date;
  currentMonth: Date;
  monthNames: string[];
  calendarDays: (Date | null)[];
  selectedEvent: CalendarEvent | null;
  setSelectedEvent: (value: CalendarEvent | null) => void;
  previousMonth: () => void;
  nextMonth: () => void;
  goToday: () => void;
  getDayInfo: (date: Date) => CalendarEvent | null;
  getDayEvents: (date: Date) => CalendarEvent[];
};

function CalendarReferenceVip({
  today,
  currentMonth,
  monthNames,
  calendarDays,
  selectedEvent,
  setSelectedEvent,
  previousMonth,
  nextMonth,
  goToday,
  getDayInfo,
  getDayEvents,
}: CalendarReferenceVipProps) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const todayKey = dateKey(today);

  const eventColor = (type: CalendarEvent["type"], title = "") => {
    if (title.startsWith("Extra Class")) return "#087e8b";
    if (title === "Monthly MahaTest") return "#9a6700";
    if (title === "Monthly Result") return "#087e8b";
    if (type === "holiday") return "#f43f75";
    if (type === "test") return "#7c55e8";
    return "#16a37d";
  };

  const eventBg = (type: CalendarEvent["type"], title = "") => {
    if (title.startsWith("Extra Class")) return "#d9f7f5";
    if (title === "Monthly MahaTest") return "#fff4d6";
    if (title === "Monthly Result") return "#d9f7f5";
    if (type === "holiday") return "#ffe9f0";
    if (type === "test") return "#f0eaff";
    return "#e6f9f2";
  };

  const upcomingEvents: CalendarEvent[] = [];
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  for (let i = 0; i < 90 && upcomingEvents.length < 5; i++) {
    const date = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + i);
    const info = getDayInfo(date);
    if (
      info &&
      !info.title.toLowerCase().includes("off") &&
      !upcomingEvents.some((item) => item.date === info.date && item.title === info.title)
    ) {
      upcomingEvents.push(info);
    }
  }

  const scheduleItems = [
    ["📚", "Tuesday - Friday", "Regular Tuition Classes"],
    ["📚", "Every Sunday", "Regular Tuition Classes"],
    ["📝", "Every Saturday", "Weekly Test"],
    ["🔴", "Every Monday", "Tuition Closed"],
    ["🎉", "Holidays", "Tuition Closed"],
  ];

  return (
    <main className="student-calendar-mobile-page"
      style={{
        minHeight: "100vh",
        width: "100%",
        padding: "8px 8px 96px",
        background: "linear-gradient(180deg,#f5f9ff 0%,#edf4ff 100%)",
        color: "#12285f",
      }}
    >
      <div style={{ width: "100%", maxWidth: 430, margin: "0 auto" }}>
        <section className="student-calendar-mobile-hero"
          style={{
            background: "linear-gradient(112deg,#2d54db,#6645e6)",
            color: "#fff",
            borderRadius: 20,
            padding: 15,
            marginBottom: 9,
            boxShadow: "0 10px 24px rgba(45,84,219,.20)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 42,
                height: 42,
                minWidth: 42,
                borderRadius: 13,
                background: "rgba(255,255,255,.14)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              📅
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 7, fontWeight: 900, letterSpacing: 1, opacity: 0.78 }}>
                RACER ACADEMY
              </div>
              <h1 style={{ margin: "3px 0", fontSize: 21, lineHeight: 1.05, fontWeight: 900 }}>
                Academic Calendar
              </h1>
              <p style={{ margin: 0, fontSize: 8, lineHeight: 1.35, opacity: 0.84 }}>
                Stay organized and never miss an important date
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
            <button
              type="button"
              onClick={previousMonth}
              aria-label="Previous month"
              style={{ width: 36, height: 36, border: 0, borderRadius: 11, background: "rgba(255,255,255,.14)", color: "#fff", fontSize: 20, fontWeight: 900 }}
            >
              ‹
            </button>
            <div style={{ flex: 1, textAlign: "center", fontSize: 14, fontWeight: 900, whiteSpace: "nowrap" }}>
              {monthNames[month]} {year}
            </div>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              style={{ width: 36, height: 36, border: 0, borderRadius: 11, background: "rgba(255,255,255,.14)", color: "#fff", fontSize: 20, fontWeight: 900 }}
            >
              ›
            </button>
          </div>
        </section>

        <section
          style={{
            background: "#fff",
            border: "1px solid #dce7f8",
            borderRadius: 17,
            padding: 8,
            marginBottom: 9,
            boxShadow: "0 6px 18px rgba(20,67,136,.055)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 2, marginBottom: 3 }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                style={{
                  textAlign: "center",
                  padding: "6px 1px",
                  fontSize: 7,
                  fontWeight: 900,
                  color: day === "Sun" ? "#d94b63" : day === "Mon" ? "#dc754a" : "#667ba3",
                }}
              >
                {day}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 2 }}>
            {calendarDays.map((date, index) => {
              if (!date) {
                return <div key={"empty-" + index} style={{ minHeight: 70, borderRadius: 7, background: "#fbfdff" }} />;
              }

              const info = getDayInfo(date);
              const dayEvents = getDayEvents(date);
              const key = dateKey(date);
              const selected = key === todayKey;

              return (
                <button
                  type="button"
                  key={key}
                  className="student-calendar-mobile-day"
                  onClick={() => info && setSelectedEvent(info)}
                  style={{
                    minHeight: 70,
                    width: "100%",
                    border: selected ? "2px solid #4c42df" : "1px solid #e2eaf6",
                    borderRadius: 8,
                    background: selected ? "#f0edff" : "#fff",
                    padding: 5,
                    textAlign: "left",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ fontSize: 9, fontWeight: 900, color: selected ? "#4c42df" : "#20376e", marginBottom: 5 }}>
                    {date.getDate()}
                  </div>

                  {info ? (
                    <>
                      {dayEvents.map((event) => <div key={event.title} style={{ marginBottom: 2 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: eventColor(event.type, event.title), marginBottom: 2 }} />
                        <div style={{ fontSize: 5.5, fontWeight: 900, color: eventColor(event.type, event.title), background: event.title === "Monthly MahaTest" ? "linear-gradient(110deg,#fff5d6,#f7d77a)" : event.title === "Monthly Result" ? "linear-gradient(110deg,#d9f7f5,#b5e7ee)" : event.title === "Monday Off" ? "#ffe9f0" : "transparent", border: event.title.startsWith("Monthly ") ? `1px solid ${event.title === "Monthly Result" ? "#5eb8c0" : "#d7aa35"}` : "0", borderRadius: 999, padding: event.title.startsWith("Monthly ") ? "2px 3px" : 0, lineHeight: 1.15, overflowWrap: "anywhere" }}>
                          {event.type === "holiday" ? `${getStudentCalendarEventEmoji(event)} OFF` : event.type === "test" ? event.title : event.title.startsWith("Extra Class") ? "✨ EXTRA CLASS" : "Class"}
                        </div>
                        <div style={{ marginTop: 1, fontSize: 5.5, color: "#6f819f", lineHeight: 1.15, overflowWrap: "anywhere" }}>{event.title}</div>
                      </div>)}
                    </>
                  ) : (
                    <div style={{ fontSize: 5.5, color: "#b0bacb", marginTop: 12 }}>—</div>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="student-calendar-mobile-today"
            onClick={goToday}
            style={{ width: "100%", marginTop: 8, border: "1px solid #bfd3f5", borderRadius: 10, padding: 8, background: "#eef4ff", color: "#1c5dca", fontSize: 8, fontWeight: 900 }}
          >
            Today • {formatDate(today)}
          </button>
        </section>

        <section style={{ background: "#fff", border: "1px solid #dce7f8", borderRadius: 17, padding: 11, marginBottom: 9, boxShadow: "0 6px 18px rgba(20,67,136,.055)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 9 }}>
            <div>
              <div style={{ fontSize: 7, fontWeight: 900, letterSpacing: 0.7, color: "#6277aa" }}>SCHEDULE</div>
              <h2 style={{ margin: "2px 0 0", fontSize: 14, color: "#18336d" }}>{monthNames[month]} {year} Schedule</h2>
            </div>
            <span style={{ padding: "6px 7px", borderRadius: 9, background: "#eef3ff", color: "#3154cf", fontSize: 6.5, fontWeight: 900 }}>2025–2030</span>
          </div>

          {scheduleItems.map(([icon, title, subtitle]) => (
            <div key={title} style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, marginBottom: 5, borderRadius: 10, background: "#f8fbff", border: "1px solid #e4ebf6" }}>
              <div style={{ fontSize: 14 }}>{icon}</div>
              <div>
                <strong style={{ display: "block", fontSize: 9, color: "#19366f" }}>{title}</strong>
                <span style={{ display: "block", marginTop: 2, fontSize: 7, color: "#7687a6" }}>{subtitle}</span>
              </div>
            </div>
          ))}
        </section>

        <section style={{ background: "linear-gradient(135deg,#f1edff,#f8fbff)", border: "1px solid #e2dcfb", borderRadius: 17, padding: 11, marginBottom: 9 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: "#e7e1ff", color: "#674bdc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🎯</div>
            <div>
              <strong style={{ display: "block", fontSize: 11, color: "#233a75" }}>Discipline today builds the success of tomorrow.</strong>
              <span style={{ display: "block", marginTop: 3, fontSize: 7.5, color: "#7485a6" }}>Keep going, you&apos;re doing great!</span>
            </div>
          </div>
        </section>

        <section style={{ background: "#fff", border: "1px solid #dce7f8", borderRadius: 17, padding: 11, marginBottom: 9 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h2 style={{ margin: 0, fontSize: 13, color: "#18336d" }}>Upcoming Events</h2>
            <span style={{ padding: "6px 7px", borderRadius: 9, background: "#eef3ff", color: "#155fcf", fontSize: 7, fontWeight: 900 }}>{upcomingEvents.length} EVENTS</span>
          </div>

          {upcomingEvents.length === 0 ? (
            <div style={{ padding: 12, borderRadius: 10, background: "#f8fbff", border: "1px dashed #cad9ef", textAlign: "center", color: "#7284a5", fontSize: 8 }}>
              No upcoming events are recorded yet. Events can be added here later.
            </div>
          ) : (
            upcomingEvents.map((event) => (
              <button
                type="button"
                key={event.date + "-" + event.title}
                onClick={() => setSelectedEvent(event)}
                style={{ width: "100%", border: 0, borderTop: "1px solid #edf1f6", background: "#fff", padding: "8px 0", display: "flex", alignItems: "center", gap: 8, textAlign: "left" }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: eventColor(event.type, event.title), flex: "none" }} />
                <span style={{ minWidth: 0, flex: 1 }}>
                  <strong style={{ display: "block", fontSize: 8.5, color: "#1b356e" }}>{event.title}</strong>
                  <span style={{ display: "block", marginTop: 2, fontSize: 6.5, color: "#7182a1" }}>{formatDate(new Date(event.date + "T00:00:00"))}</span>
                </span>
                <span style={{ fontSize: 15, color: "#5271aa" }}>›</span>
              </button>
            ))
          )}
        </section>

        <section style={{ background: "#fff", border: "1px solid #dce7f8", borderRadius: 17, padding: 11, marginBottom: 9 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 13, color: "#18336d" }}>Event Categories</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {[["#16a37d", "Class"], ["#7c55e8", "Weekly Test"], ["#f43f75", "Holiday"]].map(([color, label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, padding: 7, borderRadius: 9, background: "#f8fbff", fontSize: 7, color: "#5c7199", fontWeight: 800 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
                {label}
              </div>
            ))}
          </div>
        </section>

        {selectedEvent && (
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(14,29,70,.42)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 10 }}
            onClick={() => setSelectedEvent(null)}
          >
            <div
              style={{ width: "100%", maxWidth: 430, borderRadius: "20px 20px 16px 16px", background: "#fff", padding: 16, boxShadow: "0 -8px 30px rgba(10,40,100,.20)" }}
              onClick={(event) => event.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: eventBg(selectedEvent.type, selectedEvent.title), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                  {selectedEvent.title === "Monthly Result" ? "📢" : selectedEvent.type === "test" ? "📝" : selectedEvent.type === "class" ? "📚" : getStudentCalendarEventEmoji(selectedEvent)}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong style={{ display: "block", fontSize: 13, color: "#19366f" }}>{selectedEvent.title}</strong>
                  <span style={{ display: "block", marginTop: 2, fontSize: 7, color: "#7284a6" }}>{formatDate(new Date(selectedEvent.date + "T00:00:00"))}</span>
                </div>
              </div>
              <p style={{ margin: "12px 0", fontSize: 8.5, lineHeight: 1.5, color: "#5d7095" }}>{selectedEvent.description}</p>
              <button type="button" onClick={() => setSelectedEvent(null)} style={{ width: "100%", border: 0, borderRadius: 10, padding: 10, background: "#4d42dc", color: "#fff", fontSize: 8, fontWeight: 900 }}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function StudentCalendarPage() {
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const [selectedEvent, setSelectedEvent] =
    useState<CalendarEvent | null>(null);

  const [isMobileVip, setIsMobileVip] = useState(false);
  const [extraClassStatusByDate, setExtraClassStatusByDate] = useState<Record<string, string>>({});

  useEffect(() => {
    const check = () => setIsMobileVip(window.innerWidth <= 700);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const username = localStorage.getItem("student_username") || localStorage.getItem("studentUsername") || localStorage.getItem("username");
        if (!username) return;
        const { data: student } = await supabase.from("students").select("id").ilike("student_username", username.trim()).maybeSingle();
        if (!student?.id) return;
        const { data, error } = await supabase.from("extra_class_attendance").select("extra_class_date,status").eq("student_id", student.id);
        if (error) throw error;
        const records: Record<string, string[]> = {};
        for (const row of data || []) {
          const date = String(row.extra_class_date || "").slice(0, 10);
          if (/^\d{4}-\d{2}-\d{2}$/.test(date)) (records[date] ||= []).push(String(row.status || ""));
        }
        if (active) setExtraClassStatusByDate(Object.fromEntries(Object.entries(records).map(([date, statuses]) => [date, statuses.some((status) => status.toLowerCase() === "present") ? "Present" : "Absent"])));
      } catch (error) {
        console.error("Student calendar extra-class load failed:", error);
      }
    })();
    return () => { active = false; };
  }, []);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1).getDay();

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const calendarDays = useMemo(() => {
    const days: (Date | null)[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }, [year, month, firstDay, daysInMonth]);

  function previousMonth() {
    setCurrentMonth(
      new Date(year, month - 1, 1)
    );
  }

  function nextMonth() {
    setCurrentMonth(
      new Date(year, month + 1, 1)
    );
  }

  function goToday() {
    setCurrentMonth(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    );
  }

  function getDayInfo(date: Date): CalendarEvent | null {
    const baseEvent = getStudentCalendarEvent(date);
    const status = extraClassStatusByDate[dateKey(date)];
    if (status && !studentCalendarHolidays.some((event) => event.date === dateKey(date)) && !baseEvent?.title.startsWith("Monthly ")) {
      return { date: dateKey(date), title: `Extra Class · ${status}`, type: "class", description: `Teacher held an Extra Class; your attendance is ${status}.` };
    }
    return baseEvent;
  }

  function getDayEvents(date: Date): CalendarEvent[] {
    const info = getDayInfo(date);
    if (!info) return [];
    const events = [info];
    if (info.title === "Monthly Result" && date.getDay() === 1 && dateKey(date) >= "2026-08-31") {
      events.push({ date: dateKey(date), title: "Monday Off", type: "holiday", description: "Monday is the weekly tuition holiday from 31 August 2026 onward." });
    }
    return events;
  }

  const yearlyHolidays = studentCalendarHolidays.filter(
    (holiday) =>
      holiday.date.startsWith(String(year))
  );

  if (isMobileVip) {
    return (
      <CalendarReferenceVip
        today={today}
        currentMonth={currentMonth}
        monthNames={monthNames}
        calendarDays={calendarDays}
        selectedEvent={selectedEvent}
        setSelectedEvent={setSelectedEvent}
        previousMonth={previousMonth}
        nextMonth={nextMonth}
        goToday={goToday}
        getDayInfo={getDayInfo}
        getDayEvents={getDayEvents}
      />
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header
          style={styles.header}
          className="calendar-header"
        >
          <div
            style={styles.headerContent}
          >
            <div style={styles.badge}>
              STUDENT PORTAL
            </div>

            <h1 style={styles.title}>
              📅 Academic Calendar
            </h1>

            <p style={styles.subtitle}>
              Classes • Weekly Tests • Sundays • Holidays
            </p>
          </div>

          <a
            href="/student"
            style={styles.backButton}
            className="calendar-back-button"
          >
            ← Student Dashboard
          </a>
        </header>

        <section
          style={styles.legendCard}
          className="calendar-legend"
        >
          <Legend
            icon="📚"
            title="Regular Class"
            color="#2563eb"
            background="#eff6ff"
          />

          <Legend
            icon="📝"
            title="Every Saturday - Weekly Test"
            color="#7c3aed"
            background="#f5f3ff"
          />

          <Legend
            icon="📚"
            title="Sunday - CLASS"
            color="#2563eb"
            background="#eff6ff"
          />

          <Legend
            icon="🔴"
            title="Monday - OFF"
            color="#dc2626"
            background="#fef2f2"
          />

          <Legend
            icon="🎉"
            title="Holiday"
            color="#ea580c"
            background="#fff7ed"
          />
        </section>

        <section
          style={styles.calendarCard}
          className="student-calendar-card"
        >
          <div
            style={styles.calendarTop}
            className="calendar-top"
          >
            <button
              type="button"
              onClick={previousMonth}
              style={styles.navButton}
              className="calendar-nav-button"
              aria-label="Previous month"
            >
              ←
            </button>

            <div
              style={styles.monthTitle}
              className="calendar-month-title"
            >
              {monthNames[month]} {year}
            </div>

            <button
              type="button"
              onClick={nextMonth}
              style={styles.navButton}
              className="calendar-nav-button"
              aria-label="Next month"
            >
              →
            </button>
          </div>

          <button
            type="button"
            onClick={goToday}
            style={styles.todayButton}
            className="calendar-today-button"
          >
            Today
          </button>

          <div
            style={styles.weekGrid}
            className="student-calendar-week"
          >
            {[
              "Sun",
              "Mon",
              "Tue",
              "Wed",
              "Thu",
              "Fri",
              "Sat",
            ].map((day) => (
              <div
                key={day}
                style={{
                  ...styles.weekDay,
                  ...(day === "Sun"
                    ? styles.sundayHeader
                    : {}),
                  ...(day === "Mon"
                    ? styles.mondayHeader
                    : {}),
                  ...(day === "Sat"
                    ? styles.saturdayHeader
                    : {}),
                }}
                className="student-calendar-week-day"
              >
                {day}
              </div>
            ))}
          </div>

          <div
            style={styles.calendarGrid}
            className="student-calendar-grid"
          >
            {calendarDays.map(
              (date, index) => {
                if (!date) {
                  return (
                    <div
                      key={`empty-${index}`}
                      style={styles.emptyDay}
                      className="student-calendar-empty"
                    />
                  );
                }

                const info = getDayInfo(date);
                const dayEvents = getDayEvents(date);

                const sunday = isSunday(date);
                const monday = isMonday(date);
                const saturday = isSaturday(date);
                const sundayClass =
                  isSundayClassDate(date);
                const mondayOff =
                  isMondayOffDate(date);
                const holiday = getHoliday(date);
                const monthlyEvent = info?.type === "test" && info.title.startsWith("Monthly ") ? info : null;
                const extraClassEvent = info?.title.startsWith("Extra Class") ? info : null;

                const todayDate =
                  dateKey(date) ===
                  dateKey(today);

                return (
                  <button
                    type="button"
                    key={dateKey(date)}
                    onClick={() => {
                      if (info) {
                        setSelectedEvent(info);
                      }
                    }}
                    style={{
                      ...styles.day,
                      ...(todayDate
                        ? styles.today
                        : {}),
                      ...(sunday &&
                      !sundayClass &&
                      !holiday
                        ? styles.sunday
                        : {}),
                      ...(sundayClass &&
                      !holiday
                        ? styles.sundayClass
                        : {}),
                      ...(monday &&
                      mondayOff &&
                      !holiday && !monthlyEvent
                        ? styles.mondayOff
                        : {}),
                      ...(saturday
                        && !monthlyEvent ? styles.saturday
                        : {}),
                      ...(monthlyEvent?.title === "Monthly MahaTest" ? styles.monthlyMahaTestDay : {}),
                      ...(monthlyEvent?.title === "Monthly Result" ? styles.monthlyResultDay : {}),
                      ...(extraClassEvent ? { background: "linear-gradient(145deg,#e3fbff,#b9edf0)", border: "1px solid #49b6bc", color: "#086b75" } : {}),
                      ...(holiday
                        ? styles.holiday
                        : {}),
                    }}
                    className="student-calendar-day"
                  >
                    <div
                      style={{
                        ...styles.dayNumber,
                        ...(todayDate
                          ? styles.todayNumber
                          : {}),
                      }}
                      className="student-calendar-day-number"
                    >
                      {date.getDate()}
                    </div>

                    {holiday ? (
                      <>
                        <div
                          style={styles.holidayLabel}
                          className="student-calendar-holiday-label"
                        >
                          {getStudentCalendarEventEmoji(holiday)} HOLIDAY
                        </div>

                        <div
                          style={styles.eventName}
                          className="student-calendar-event-name"
                        >
                          {holiday.title}
                        </div>
                      </>
                    ) : monthlyEvent ? (
                      <>
                        <div style={{...styles.testLabel,...(monthlyEvent.title === "Monthly Result" ? styles.monthlyResultLabel : styles.monthlyMahaTestLabel)}} className={`student-calendar-test-label ${monthlyEvent.title === "Monthly Result" ? "student-calendar-monthly-result" : "student-calendar-monthly-mahatest"}`}>{monthlyEvent.title === "Monthly Result" ? "📢 MONTHLY RESULT" : "📝 MONTHLY MAHATEST"}</div>
                        <div style={styles.smallText} className="student-calendar-small-text">{monthlyEvent.title}</div>
                        {dayEvents.some((event) => event.title === "Monday Off") && <div style={{ ...styles.holidayLabel, marginTop: 3, color: "#c84e61", background: "#ffe9f0" }}>× OFF · MONDAY</div>}
                      </>
                    ) : extraClassEvent ? (
                      <>
                        <div style={{ ...styles.classLabel, color: "#087e8b", background: "linear-gradient(110deg,#d9f7f5,#b5e7ee)", border: "1px solid #5eb8c0" }}>✨ EXTRA CLASS</div>
                        <div style={{ ...styles.smallText, color: "#086b75" }}>{info.title.replace("Extra Class · ", "")}</div>
                      </>
                    ) : sundayClass ? (
                      <>
                        <div
                          style={styles.classLabel}
                          className="student-calendar-class-label"
                        >
                          📚 CLASS
                        </div>

                        <div
                          style={styles.smallText}
                          className="student-calendar-small-text"
                        >
                          Sunday Class
                        </div>
                      </>
                    ) : mondayOff ? (
                      <>
                        <div
                          style={styles.offLabel}
                          className="student-calendar-off-label"
                        >
                          🔴 OFF
                        </div>

                        <div
                          style={styles.smallText}
                          className="student-calendar-small-text"
                        >
                          Monday
                        </div>
                      </>
                    ) : sunday ? (
                      <>
                        <div
                          style={styles.offLabel}
                          className="student-calendar-off-label"
                        >
                          🔴 OFF
                        </div>

                        <div
                          style={styles.smallText}
                          className="student-calendar-small-text"
                        >
                          Sunday
                        </div>
                      </>
                    ) : saturday ? (
                      <>
                        <div
                          style={styles.testLabel}
                          className="student-calendar-test-label"
                        >
                          📝 TEST
                        </div>

                        <div
                          style={styles.smallText}
                          className="student-calendar-small-text"
                        >
                          {monthlyEvent ? "Weekly + Monthly MahaTest" : "Weekly Test"}
                        </div>
                      </>
                    ) : (
                      <>
                        <div
                          style={styles.classLabel}
                          className="student-calendar-class-label"
                        >
                          📚 CLASS
                        </div>

                        <div
                          style={styles.smallText}
                          className="student-calendar-small-text"
                        >
                          Tuition
                        </div>
                      </>
                    )}
                  </button>
                );
              }
            )}
          </div>
        </section>

        <section style={styles.infoCard}>
          <h2
            style={styles.sectionTitle}
            className="student-calendar-section-title"
          >
            📋 {monthNames[month]} Schedule
          </h2>

          <div
            style={styles.infoGrid}
            className="student-calendar-info-grid"
          >
            <div
              style={styles.infoItem}
              className="student-calendar-info-item"
            >
              <div style={styles.infoIcon}>📚</div>
              <div>
                <strong>Tuesday - Friday</strong>
                <p>Regular Tuition Classes</p>
              </div>
            </div>

            <div
              style={styles.infoItem}
              className="student-calendar-info-item"
            >
              <div style={styles.infoIcon}>📚</div>
              <div>
                <strong>Every Sunday</strong>
                <p>Regular Tuition Classes</p>
              </div>
            </div>

            <div
              style={styles.infoItem}
              className="student-calendar-info-item"
            >
              <div style={styles.infoIcon}>📝</div>
              <div>
                <strong>Every Saturday</strong>
                <p>Weekly Test</p>
              </div>
            </div>

            <div
              style={styles.infoItem}
              className="student-calendar-info-item"
            >
              <div style={styles.infoIcon}>🔴</div>
              <div>
                <strong>Every Monday</strong>
                <p>Tuition Closed</p>
              </div>
            </div>

            <div
              style={styles.infoItem}
              className="student-calendar-info-item"
            >
              <div style={styles.infoIcon}>🎉</div>
              <div>
                <strong>Holidays</strong>
                <p>Tuition Closed</p>
              </div>
            </div>
          </div>
        </section>

        <section style={styles.holidayCard}>
          <h2
            style={styles.sectionTitle}
            className="student-calendar-section-title"
          >
            🎉 Tuition Holidays
          </h2>

          <div style={styles.holidayList}>
            {yearlyHolidays.map((holiday) => (
              <button
                type="button"
                key={holiday.date}
                onClick={() =>
                  setSelectedEvent(holiday)
                }
                style={styles.holidayRow}
                className="student-calendar-holiday-row"
              >
                <strong>
                  {formatDate(
                    new Date(
                      `${holiday.date}T00:00:00`
                    )
                  )}
                </strong>

                <span>
                  {getStudentCalendarEventEmoji(holiday)} {holiday.title}
                </span>
              </button>
            ))}

            {yearlyHolidays.length === 0 && (
              <div style={styles.noHoliday}>
                No special holidays added for this year.
              </div>
            )}
          </div>
        </section>

        {selectedEvent && (
          <div
            style={styles.modalOverlay}
            className="student-calendar-modal-overlay"
            onClick={() => setSelectedEvent(null)}
          >
            <div
              style={styles.modal}
              className="student-calendar-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.modalIcon}>
                {selectedEvent.type === "test"
                  ? "📝"
                  : selectedEvent.type === "class"
                  ? "📚"
                  : getStudentCalendarEventEmoji(selectedEvent)}
              </div>

              <h2 style={styles.modalTitle}>
                {selectedEvent.title}
              </h2>

              <p style={styles.modalDate}>
                📅{" "}
                {formatDate(
                  new Date(
                    `${selectedEvent.date}T00:00:00`
                  )
                )}
              </p>

              <p style={styles.modalDescription}>
                {selectedEvent.description}
              </p>

              <button
                type="button"
                onClick={() =>
                  setSelectedEvent(null)
                }
                style={styles.closeButton}
              >
                Close
              </button>
            </div>
          </div>
        )}

        <footer style={styles.footer}>
          Attendance Portal • Student Calendar • 2025–2030
        </footer>
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          width: 100%;
          max-width: 100%;
          margin: 0;
          padding: 0;
          overflow-x: hidden !important;
        }

        body {
          min-width: 0;
        }

        @media (max-width: 768px) {
          main {
            width: 100% !important;
            max-width: 100% !important;
            padding: 10px !important;
            overflow-x: hidden !important;
          }

          .calendar-header,
          .calendar-legend,
          .student-calendar-card,
          .student-calendar-info-grid,
          .student-calendar-holiday-row {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
          }

          .calendar-header {
            padding: 16px !important;
            border-radius: 15px !important;
            gap: 12px !important;
          }

          .calendar-header > div {
            width: 100% !important;
            min-width: 0 !important;
          }

          .calendar-header h1 {
            font-size: 22px !important;
            line-height: 1.25 !important;
            overflow-wrap: anywhere !important;
          }

          .calendar-header p {
            font-size: 11px !important;
            line-height: 1.4 !important;
          }

          .calendar-back-button {
            width: 100% !important;
            max-width: 100% !important;
            display: flex !important;
            justify-content: center !important;
            text-align: center !important;
          }

          .calendar-legend {
            grid-template-columns: 1fr !important;
            padding: 10px !important;
          }

          .calendar-legend-item {
            width: 100% !important;
            min-width: 0 !important;
          }

          .student-calendar-card {
            padding: 10px !important;
            overflow: hidden !important;
          }

          .calendar-top {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            gap: 7px !important;
          }

          .calendar-month-title {
            min-width: 0 !important;
            flex: 1 1 auto !important;
            font-size: 18px !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
          }

          .calendar-nav-button {
            width: 36px !important;
            height: 36px !important;
            min-width: 36px !important;
            flex-shrink: 0 !important;
          }

          .student-calendar-week {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            grid-template-columns: repeat(
              7,
              minmax(0, 1fr)
            ) !important;
            gap: 2px !important;
          }

          .student-calendar-week-day {
            width: 100% !important;
            min-width: 0 !important;
            padding: 7px 1px !important;
            font-size: 8px !important;
            overflow: hidden !important;
            white-space: nowrap !important;
          }

          .student-calendar-grid {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            grid-template-columns: repeat(
              7,
              minmax(0, 1fr)
            ) !important;
            gap: 2px !important;
            overflow: hidden !important;
          }

          .student-calendar-day,
          .student-calendar-empty {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            min-height: 76px !important;
            height: auto !important;
            padding: 5px 2px !important;
            border-radius: 6px !important;
            overflow: hidden !important;
          }

          .student-calendar-day-number {
            font-size: 10px !important;
            margin-bottom: 5px !important;
          }

          .student-calendar-class-label,
          .student-calendar-test-label,
          .student-calendar-off-label,
          .student-calendar-holiday-label {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 3px 1px !important;
            font-size: 6.5px !important;
            line-height: 1.15 !important;
            text-align: center !important;
            overflow: hidden !important;
            white-space: normal !important;
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
          }

          .student-calendar-event-name,
          .student-calendar-small-text {
            width: 100% !important;
            max-width: 100% !important;
            font-size: 6.5px !important;
            line-height: 1.15 !important;
            margin-top: 3px !important;
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
          }

          .student-calendar-info-grid {
            grid-template-columns: 1fr !important;
          }

          .student-calendar-info-item {
            width: 100% !important;
            min-width: 0 !important;
          }

          .student-calendar-holiday-row {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 5px !important;
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
          }

          .student-calendar-modal-overlay {
            padding: 12px !important;
          }

          .student-calendar-modal {
            width: 100% !important;
            max-width: 100% !important;
            padding: 20px !important;
          }
        }

        @media (max-width: 480px) {
          main {
            padding: 7px !important;
          }

          .calendar-header {
            padding: 14px !important;
          }

          .calendar-header h1 {
            font-size: 20px !important;
          }

          .student-calendar-card {
            padding: 7px !important;
          }

          .calendar-month-title {
            font-size: 16px !important;
          }

          .calendar-nav-button {
            width: 34px !important;
            height: 34px !important;
            min-width: 34px !important;
            font-size: 16px !important;
          }

          .student-calendar-week {
            gap: 1px !important;
          }

          .student-calendar-grid {
            gap: 1px !important;
          }

          .student-calendar-day,
          .student-calendar-empty {
            min-height: 65px !important;
            padding: 4px 1px !important;
            border-radius: 5px !important;
          }

          .student-calendar-day-number {
            font-size: 9px !important;
            margin-bottom: 4px !important;
          }

          .student-calendar-class-label,
          .student-calendar-test-label,
          .student-calendar-off-label,
          .student-calendar-holiday-label {
            font-size: 5.5px !important;
            padding: 2px 0 !important;
          }

          .student-calendar-event-name,
          .student-calendar-small-text {
            font-size: 5.5px !important;
            margin-top: 2px !important;
          }

          .student-calendar-info-item {
            padding: 10px !important;
          }

          .student-calendar-section-title {
            font-size: 17px !important;
          }
        }

        @media (max-width: 360px) {
          main {
            padding: 5px !important;
          }

          .student-calendar-card {
            padding: 5px !important;
          }

          .student-calendar-day,
          .student-calendar-empty {
            min-height: 60px !important;
            padding: 3px 1px !important;
          }

          .student-calendar-day-number {
            font-size: 8px !important;
          }

          .student-calendar-class-label,
          .student-calendar-test-label,
          .student-calendar-off-label,
          .student-calendar-holiday-label,
          .student-calendar-event-name,
          .student-calendar-small-text {
            font-size: 5px !important;
          }
        }
      `}</style>
    </main>
  );
}

function Legend({
  icon,
  title,
  color,
  background,
}: {
  icon: string;
  title: string;
  color: string;
  background: string;
}) {
  return (
    <div
      style={styles.legendItem}
      className="calendar-legend-item"
    >
      <div
        style={{
          ...styles.legendIcon,
          color,
          background,
        }}
      >
        {icon}
      </div>

      <strong style={styles.legendText}>
        {title}
      </strong>
    </div>
  );
}

const styles: {
  [key: string]: React.CSSProperties;
} = {
  page: {
    minHeight: "100vh",
    width: "100%",
    maxWidth: "100%",
    background: "#f5f7fb",
    padding: "20px",
    boxSizing: "border-box",
    fontFamily: "Arial, Helvetica, sans-serif",
    overflowX: "hidden",
  },

  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
    minWidth: 0,
  },

  header: {
    background: "white",
    borderRadius: "18px",
    padding: "22px",
    marginBottom: "18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
    boxShadow:
      "0 4px 15px rgba(15,23,42,0.07)",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  },

  headerContent: {
    minWidth: 0,
    flex: "1 1 250px",
  },

  badge: {
    display: "inline-block",
    background: "#eff6ff",
    color: "#1d4ed8",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: "800",
    marginBottom: "8px",
  },

  title: {
    margin: 0,
    color: "#111827",
    fontSize: "28px",
    fontWeight: "800",
    lineHeight: 1.25,
    overflowWrap: "anywhere",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#6b7280",
    fontSize: "14px",
    lineHeight: 1.4,
    overflowWrap: "anywhere",
  },

  backButton: {
    textDecoration: "none",
    background: "#111827",
    color: "white",
    padding: "11px 15px",
    borderRadius: "9px",
    fontWeight: "700",
    fontSize: "13px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  legendCard: {
    background: "white",
    borderRadius: "16px",
    padding: "15px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(190px,1fr))",
    gap: "10px",
    marginBottom: "18px",
    boxShadow:
      "0 4px 15px rgba(15,23,42,0.06)",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  },

  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    padding: "9px",
    background: "#f8fafc",
    borderRadius: "9px",
    minWidth: 0,
    width: "100%",
  },

  legendIcon: {
    width: "34px",
    height: "34px",
    minWidth: "34px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "17px",
    flexShrink: 0,
  },

  legendText: {
    color: "#374151",
    fontSize: "12px",
    lineHeight: 1.35,
    overflowWrap: "anywhere",
    minWidth: 0,
  },

  calendarCard: {
    background: "white",
    borderRadius: "16px",
    padding: "18px",
    boxShadow:
      "0 4px 15px rgba(15,23,42,0.07)",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    overflow: "hidden",
  },

  calendarTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "15px",
    width: "100%",
    minWidth: 0,
  },

  monthTitle: {
    minWidth: "190px",
    textAlign: "center",
    color: "#111827",
    fontSize: "23px",
    fontWeight: "800",
  },

  navButton: {
    width: "42px",
    height: "42px",
    minWidth: "42px",
    border: "none",
    borderRadius: "9px",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: "20px",
    fontWeight: "800",
    cursor: "pointer",
    flexShrink: 0,
  },

  todayButton: {
    display: "block",
    margin: "15px auto",
    border: "none",
    background: "#2563eb",
    color: "white",
    padding: "9px 17px",
    borderRadius: "9px",
    fontWeight: "700",
    cursor: "pointer",
  },

  weekGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(7,minmax(0,1fr))",
    gap: "5px",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  },

  weekDay: {
    textAlign: "center",
    padding: "10px 4px",
    background: "#f1f5f9",
    color: "#334155",
    fontWeight: "800",
    fontSize: "12px",
    borderRadius: "7px",
    minWidth: 0,
    overflow: "hidden",
  },

  sundayHeader: {
    background: "#eff6ff",
    color: "#2563eb",
  },

  mondayHeader: {
    background: "#fef2f2",
    color: "#dc2626",
  },

  saturdayHeader: {
    background: "#f5f3ff",
    color: "#7c3aed",
  },

  calendarGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(7,minmax(0,1fr))",
    gap: "5px",
    marginTop: "5px",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  },

  emptyDay: {
    minHeight: "100px",
    width: "100%",
    minWidth: 0,
    background: "#f8fafc",
    borderRadius: "8px",
  },

  day: {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    minHeight: "100px",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "8px",
    background: "white",
    textAlign: "left",
    boxSizing: "border-box",
    overflow: "hidden",
    cursor: "pointer",
  },

  today: {
    border: "2px solid #2563eb",
  },

  sunday: {
    background: "#fff7f7",
    borderColor: "#fecaca",
  },

  sundayClass: {
    background: "#f5f9ff",
    borderColor: "#bfdbfe",
  },

  mondayOff: {
    background: "#fff7f7",
    borderColor: "#fecaca",
  },

  saturday: {
    background: "#faf8ff",
    borderColor: "#ddd6fe",
  },

  holiday: {
    background: "#fffaf5",
    borderColor: "#fed7aa",
  },

  dayNumber: {
    color: "#374151",
    fontSize: "14px",
    fontWeight: "800",
    marginBottom: "12px",
  },

  todayNumber: {
    color: "#2563eb",
  },

  classLabel: {
    display: "inline-block",
    background: "#eff6ff",
    color: "#2563eb",
    padding: "5px 6px",
    borderRadius: "6px",
    fontSize: "9px",
    fontWeight: "900",
    maxWidth: "100%",
  },

  testLabel: {
    display: "inline-block",
    background: "#f5f3ff",
    color: "#7c3aed",
    padding: "5px 6px",
    borderRadius: "6px",
    fontSize: "9px",
    fontWeight: "900",
    maxWidth: "100%",
  },

  monthlyMahaTestDay: {
    background: "linear-gradient(145deg,#fff9e8,#f5dc91)",
    border: "1px solid #d4a72c",
  },

  monthlyResultDay: {
    background: "linear-gradient(145deg,#e5fbfa,#c0edf0)",
    border: "1px solid #51b8bf",
  },

  monthlyMahaTestLabel: {
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    lineHeight: 1.2,
    textAlign: "center",
    background: "linear-gradient(130deg,#321160,#6c3fb5)",
    color: "#fff2b2",
    border: "1px solid #e4bd52",
    boxShadow: "0 2px 8px rgba(76,39,128,.24)",
  },

  monthlyResultLabel: {
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    lineHeight: 1.2,
    textAlign: "center",
    background: "linear-gradient(130deg,#06466c,#128b91)",
    color: "#e7ffff",
    border: "1px solid #70d2d0",
    boxShadow: "0 2px 8px rgba(8,105,122,.22)",
  },

  offLabel: {
    display: "inline-block",
    background: "#fef2f2",
    color: "#dc2626",
    padding: "5px 6px",
    borderRadius: "6px",
    fontSize: "9px",
    fontWeight: "900",
    maxWidth: "100%",
  },

  holidayLabel: {
    display: "inline-block",
    background: "#fff7ed",
    color: "#ea580c",
    padding: "5px 6px",
    borderRadius: "6px",
    fontSize: "9px",
    fontWeight: "900",
    maxWidth: "100%",
  },

  eventName: {
    marginTop: "6px",
    color: "#9a3412",
    fontSize: "9px",
    fontWeight: "700",
    lineHeight: 1.3,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  smallText: {
    marginTop: "6px",
    color: "#6b7280",
    fontSize: "9px",
    fontWeight: "700",
    lineHeight: 1.3,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  infoCard: {
    background: "white",
    borderRadius: "16px",
    padding: "20px",
    marginTop: "18px",
    boxShadow:
      "0 4px 15px rgba(15,23,42,0.06)",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  },

  sectionTitle: {
    margin: 0,
    color: "#111827",
    fontSize: "20px",
    fontWeight: "800",
    overflowWrap: "anywhere",
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: "10px",
    marginTop: "15px",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  },

  infoItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "13px",
    background: "#f8fafc",
    borderRadius: "10px",
    minWidth: 0,
    width: "100%",
  },

  infoIcon: {
    fontSize: "25px",
    flexShrink: 0,
  },

  holidayCard: {
    background: "white",
    borderRadius: "16px",
    padding: "20px",
    marginTop: "18px",
    boxShadow:
      "0 4px 15px rgba(15,23,42,0.06)",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  },

  holidayList: {
    display: "grid",
    gap: "8px",
    marginTop: "15px",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  },

  holidayRow: {
    border: "1px solid #fed7aa",
    background: "#fffaf5",
    padding: "12px",
    borderRadius: "9px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer",
    color: "#9a3412",
    textAlign: "left",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  },

  noHoliday: {
    padding: "15px",
    background: "#f8fafc",
    borderRadius: "10px",
    color: "#6b7280",
    textAlign: "center",
    fontSize: "13px",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 1000,
    boxSizing: "border-box",
  },

  modal: {
    width: "100%",
    maxWidth: "420px",
    background: "white",
    borderRadius: "18px",
    padding: "25px",
    textAlign: "center",
    boxShadow:
      "0 20px 50px rgba(15,23,42,0.2)",
    boxSizing: "border-box",
  },

  modalIcon: {
    fontSize: "42px",
    marginBottom: "8px",
  },

  modalTitle: {
    margin: 0,
    color: "#111827",
    fontSize: "22px",
    overflowWrap: "anywhere",
  },

  modalDate: {
    color: "#6b7280",
    fontWeight: "700",
    fontSize: "13px",
  },

  modalDescription: {
    color: "#4b5563",
    fontSize: "14px",
    lineHeight: 1.5,
    overflowWrap: "anywhere",
  },

  closeButton: {
    width: "100%",
    marginTop: "15px",
    border: "none",
    background: "#111827",
    color: "white",
    padding: "11px",
    borderRadius: "9px",
    fontWeight: "700",
    cursor: "pointer",
  },

  footer: {
    textAlign: "center",
    padding: "22px 10px 5px",
    color: "#9ca3af",
    fontSize: "12px",
    lineHeight: 1.5,
    overflowWrap: "anywhere",
  },
};
