"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { getMonthlyCalendarEvents, getMonthlyCalendarEvent } from "../../lib/monthly-calendar";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

type CalendarEvent = {
  date: string;
  title: string;
  type: "holiday" | "test" | "event" | "break" | "class";
  description: string;
};

const events: CalendarEvent[] = [
  {
    date: "2026-01-26",
    title: "Republic Day",
    type: "holiday",
    description: "Tuition classes closed.",
  },
  {
    date: "2026-03-04",
    title: "Holi",
    type: "holiday",
    description: "Holiday.",
  },
  {
    date: "2026-04-03",
    title: "Good Friday",
    type: "holiday",
    description: "Holiday.",
  },
  {
    date: "2026-04-14",
    title: "Ambedkar Jayanti",
    type: "holiday",
    description: "Holiday.",
  },
  {
    date: "2026-05-01",
    title: "May Day",
    type: "holiday",
    description: "Holiday.",
  },
  {
    date: "2026-08-15",
    title: "Independence Day",
    type: "holiday",
    description: "Holiday.",
  },
  {
    date: "2026-08-27",
    title: "Janmashtami",
    type: "holiday",
    description: "Holiday.",
  },
  {
    date: "2026-10-02",
    title: "Gandhi Jayanti",
    type: "holiday",
    description: "Holiday.",
  },
  {
    date: "2026-10-20",
    title: "Dussehra",
    type: "holiday",
    description: "Holiday.",
  },
  {
    date: "2026-11-08",
    title: "Diwali",
    type: "holiday",
    description: "Holiday.",
  },
  {
    date: "2026-11-09",
    title: "Diwali Holiday",
    type: "holiday",
    description: "Tuition classes closed.",
  },
  {
    date: "2026-11-24",
    title: "Guru Nanak Jayanti",
    type: "holiday",
    description: "Holiday.",
  },
  {
    date: "2026-12-25",
    title: "Christmas Day",
    type: "holiday",
    description: "Holiday.",
  },

  {
    date: "2026-05-25",
    title: "Summer Break Begins",
    type: "break",
    description: "Summer vacation begins.",
  },
  {
    date: "2026-06-15",
    title: "Summer Break Ends",
    type: "break",
    description: "Regular tuition classes resume.",
  },

  {
    date: "2026-09-05",
    title: "Teachers' Day",
    type: "event",
    description: "Special tuition activity.",
  },
  {
    date: "2026-11-14",
    title: "Children's Day",
    type: "event",
    description: "Special student activity.",
  },
  {
    date: "2026-12-31",
    title: "Year End Activity",
    type: "event",
    description: "Year-end tuition activity.",
  },
];

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

function formatDate(date: Date) {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function AcademicCalendarPage() {
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const [selectedEvent, setSelectedEvent] =
    useState<CalendarEvent | null>(null);
  const [extraClassByDate, setExtraClassByDate] = useState<Record<string, string>>({});

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
        const rows: Record<string, string[]> = {};
        for (const row of data || []) {
          const date = String(row.extra_class_date || "").slice(0, 10);
          if (/^\d{4}-\d{2}-\d{2}$/.test(date)) (rows[date] ||= []).push(String(row.status || ""));
        }
        if (active) setExtraClassByDate(Object.fromEntries(Object.entries(rows).map(([date, statuses]) => [date, statuses.some((status) => status.toLowerCase() === "present") ? "Present" : "Absent"])));
      } catch (error) {
        console.error("Academic calendar extra-class load failed:", error);
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

  const monthEvents = [
    ...events.filter((event) => {
    const date = new Date(event.date);

    return (
      date.getFullYear() === year &&
      date.getMonth() === month
    );
    }),
    ...getMonthlyCalendarEvents(year, month),
    ...Object.entries(extraClassByDate)
      .filter(([date]) => date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}-`))
      .map(([date, status]) => ({ date, title: `Extra Class · ${status}`, type: "class" as const, description: `Teacher held an Extra Class; your attendance is ${status}.` })),
    ...getMonthlyCalendarEvents(year, month)
      .filter((event) => event.title === "Monthly Result" && new Date(`${event.date}T00:00:00`).getDay() === 1 && event.date >= "2026-08-31")
      .map((event) => ({ date: event.date, title: "Monday Off", type: "holiday" as const, description: "Monday is the weekly tuition holiday; the Monthly Result is also scheduled for this date." })),
  ];

  function getEvent(date: Date): CalendarEvent | undefined {
    const key = dateKey(date);
    const holiday = events.find((event) => event.date === key && event.type === "holiday");
    if (holiday) return holiday;
    const monthlyEvent = getMonthlyCalendarEvent(date);
    if (monthlyEvent) return monthlyEvent;
    const extraStatus = extraClassByDate[key];
    if (extraStatus) return { date: key, title: `Extra Class · ${extraStatus}`, type: "class", description: `Teacher held an Extra Class; your attendance is ${extraStatus}.` };
    if (key >= "2026-08-31" && date.getDay() === 1) {
      return { date: key, title: "Monday Off", type: "holiday", description: "Monday is the weekly tuition holiday from 31 August 2026 onward." };
    }
    return events.find((event) => event.date === key);
  }

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
      new Date(today.getFullYear(), today.getMonth(), 1)
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}

        <header style={styles.header}>
          <div>
            <div style={styles.badge}>
              TUITION ACADEMIC CALENDAR
            </div>

            <h1 style={styles.title}>
              📅 Academic Calendar
            </h1>

            <p style={styles.subtitle}>
              Tuition classes, holidays, tests and special events
            </p>
          </div>

          <div style={styles.yearBadge}>
            {year}
          </div>
        </header>

        {/* LEGEND */}

        <section style={styles.legendCard}>
          <Legend
            color="#fee2e2"
            textColor="#991b1b"
            icon="🎉"
            text="Holiday"
          />

          <Legend
            color="#dcfce7"
            textColor="#166534"
            icon="📝"
            text="Monthly Test"
          />

          <Legend
            color="#dbeafe"
            textColor="#1d4ed8"
            icon="⭐"
            text="Special Event"
          />

          <Legend
            color="#fef3c7"
            textColor="#92400e"
            icon="🏖️"
            text="Break"
          />
        </section>

        {/* CALENDAR */}

        <section style={styles.calendarCard}>

          <div style={styles.calendarHeader}>
            <button
              onClick={previousMonth}
              style={styles.navButton}
            >
              ←
            </button>

            <div style={styles.monthTitle}>
              {monthNames[month]} {year}
            </div>

            <button
              onClick={nextMonth}
              style={styles.navButton}
            >
              →
            </button>
          </div>

          <button
            onClick={goToday}
            style={styles.todayButton}
          >
            📍 Go to Today
          </button>

          {/* WEEK DAYS */}

          <div style={styles.weekGrid}>
            {[
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ].map((day) => (
              <div
                key={day}
                style={styles.weekDay}
              >
                {day}
              </div>
            ))}
          </div>

          {/* DAYS */}

          <div style={styles.calendarGrid}>
            {calendarDays.map((date, index) => {

              if (!date) {
                return (
                  <div
                    key={`empty-${index}`}
                    style={styles.emptyDay}
                  />
                );
              }

              const event = getEvent(date);
              const isToday =
                dateKey(date) === dateKey(today);

              const isSunday =
                date.getDay() === 0;

              return (
                <button
                  key={dateKey(date)}
                  onClick={() =>
                    event && setSelectedEvent(event)
                  }
                  style={{
                    ...styles.day,
                    ...(isToday
                      ? styles.today
                      : {}),
                    ...(isSunday
                      ? styles.sunday
                      : {}),
                    cursor: event
                      ? "pointer"
                      : "default",
                  }}
                >
                  <div style={styles.dayNumber}>
                    {date.getDate()}
                  </div>

                  {isSunday && (
                    <div style={styles.closed}>
                      CLOSED
                    </div>
                  )}

                  {event && (
                    <div
                      style={{
                        ...styles.eventTag,
                        ...(event.type ===
                        "holiday"
                          ? styles.holidayTag
                          : {}),
                        ...(event.type ===
                        "test"
                          ? styles.testTag
                          : {}),
                        ...(event.title === "Monthly MahaTest" ? styles.monthlyMahaTestTag : {}),
                        ...(event.title === "Monthly Result" ? styles.monthlyResultTag : {}),
                        ...(event.type === "class" ? styles.extraClassTag : {}),
                        ...(event.type ===
                        "event"
                          ? styles.eventTagBlue
                          : {}),
                        ...(event.type ===
                        "break"
                          ? styles.breakTag
                          : {}),
                      }}
                    >
                      {event.type ===
                      "holiday"
                        ? "🎉"
                        : event.type === "class"
                        ? "✨"
                        : event.type ===
                          "test"
                        ? "📝"
                        : event.type ===
                          "break"
                        ? "🏖️"
                        : "⭐"}{" "}
                      {event.title}
                    </div>
                  )}

                  {event?.title === "Monthly Result" && date.getDay() === 1 && dateKey(date) >= "2026-08-31" && (
                    <div style={{ ...styles.closed, marginTop: 2 }}>× OFF · MONDAY</div>
                  )}
                  {extraClassByDate[dateKey(date)] && !event?.title.startsWith("Extra Class") && (
                    <div style={{ ...styles.extraClassTag, marginTop: 3, padding: "3px 4px", borderRadius: 7, fontSize: 7, fontWeight: 900, textAlign: "center" }}>✨ EXTRA CLASS · {extraClassByDate[dateKey(date)].toUpperCase()}</div>
                  )}

                  {!event &&
                    !isSunday && (
                      <div
                        style={styles.classText}
                      >
                        📚 Classes
                      </div>
                    )}
                </button>
              );
            })}
          </div>
        </section>

        {/* MONTH EVENTS */}

        <section style={styles.eventsCard}>
          <div style={styles.sectionTitle}>
            📌 {monthNames[month]} Events
          </div>

          {monthEvents.length === 0 ? (
            <div style={styles.noEvents}>
              No special events this month.
            </div>
          ) : (
            <div style={styles.eventsList}>
              {monthEvents
                .sort((a, b) =>
                  a.date.localeCompare(b.date)
                )
                .map((event) => (
                  <button
                    key={`${event.date}-${event.title}`}
                    onClick={() =>
                      setSelectedEvent(event)
                    }
                    style={styles.eventRow}
                  >
                    <div style={styles.eventDate}>
                      {formatDate(
                        new Date(event.date)
                      )}
                    </div>

                    <div style={styles.eventMain}>
                      <strong>
                        {event.title}
                      </strong>

                      <span>
                        {event.description}
                      </span>
                    </div>

                    <div
                      style={{
                        ...styles.typeBadge,
                        ...(event.type ===
                        "holiday"
                          ? styles.typeHoliday
                          : {}),
                        ...(event.type ===
                        "test"
                          ? styles.typeTest
                          : {}),
                        ...(event.title === "Monthly MahaTest" ? styles.monthlyMahaTestBadge : {}),
                        ...(event.title === "Monthly Result" ? styles.monthlyResultBadge : {}),
                        ...(event.type === "class" ? styles.extraClassBadge : {}),
                        ...(event.type ===
                        "event"
                          ? styles.typeEvent
                          : {}),
                        ...(event.type ===
                        "break"
                          ? styles.typeBreak
                          : {}),
                      }}
                    >
                      {event.title === "Monthly MahaTest" ? "MONTHLY MAHATEST" : event.title === "Monthly Result" ? "MONTHLY RESULT" : event.type === "class" ? "EXTRA CLASS" : event.type}
                    </div>
                  </button>
                ))}
            </div>
          )}
        </section>

        {/* INFORMATION */}

        <section style={styles.infoGrid}>

          <div style={styles.infoCard}>
            <div style={styles.infoIcon}>
              📚
            </div>

            <h3>
              Regular Tuition Classes
            </h3>

            <p>
              Classes are conducted on regular
              tuition working days.
            </p>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.infoIcon}>
              🎉
            </div>

            <h3>
              Holidays
            </h3>

            <p>
              Tuition remains closed on
              listed holidays and Sundays.
            </p>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.infoIcon}>
              📝
            </div>

            <h3>
              Monthly Tests
            </h3>

            <p>
              Monthly tests are scheduled
              throughout the tuition year.
            </p>
          </div>

        </section>

        <footer style={styles.footer}>
          Tuition Academic Calendar • 2026
        </footer>
      </div>

      {/* EVENT MODAL */}

      {selectedEvent && (
        <div
          style={styles.overlay}
          onClick={() =>
            setSelectedEvent(null)
          }
        >
          <div
            style={styles.modal}
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <button
              onClick={() =>
                setSelectedEvent(null)
              }
              style={styles.closeButton}
            >
              ×
            </button>

            <div style={styles.modalIcon}>
              {selectedEvent.type ===
              "holiday"
                ? "🎉"
                : selectedEvent.type ===
                  "test"
                ? "📝"
                : selectedEvent.type ===
                  "break"
                ? "🏖️"
                : "⭐"}
            </div>

            <h2 style={styles.modalTitle}>
              {selectedEvent.title}
            </h2>

            <p style={styles.modalDate}>
              📅{" "}
              {formatDate(
                new Date(selectedEvent.date)
              )}
            </p>

            <p style={styles.modalDescription}>
              {selectedEvent.description}
            </p>

            <div style={styles.modalType}>
              {selectedEvent.type.toUpperCase()}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Legend({
  color,
  textColor,
  icon,
  text,
}: {
  color: string;
  textColor: string;
  icon: string;
  text: string;
}) {
  return (
    <div
      style={{
        ...styles.legendItem,
        background: color,
        color: textColor,
      }}
    >
      <span>{icon}</span>
      <strong>{text}</strong>
    </div>
  );
}

const styles: {
  [key: string]: React.CSSProperties;
} = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#eff6ff,#f8fafc,#eef2ff)",
    padding: "25px 15px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#0f172a",
  },

  container: {
    maxWidth: "1250px",
    margin: "0 auto",
  },

  header: {
    background: "#ffffff",
    borderRadius: "24px",
    padding: "30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    boxShadow:
      "0 12px 35px rgba(15,23,42,.10)",
    marginBottom: "20px",
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
    color: "#0f172a",
    fontSize: "34px",
    fontWeight: "900",
  },

  subtitle: {
    margin: "8px 0 0",
    color: "#475569",
    fontSize: "15px",
    fontWeight: "600",
  },

  yearBadge: {
    background:
      "linear-gradient(135deg,#2563eb,#4f46e5)",
    color: "#ffffff",
    fontSize: "26px",
    fontWeight: "900",
    padding: "18px 25px",
    borderRadius: "18px",
  },

  legendCard: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "18px",
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    boxShadow:
      "0 8px 25px rgba(15,23,42,.07)",
    marginBottom: "20px",
  },

  legendItem: {
    padding: "10px 14px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
  },

  calendarCard: {
    background: "#ffffff",
    borderRadius: "22px",
    padding: "22px",
    boxShadow:
      "0 10px 30px rgba(15,23,42,.08)",
    marginBottom: "20px",
  },

  calendarHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "25px",
    marginBottom: "12px",
  },

  monthTitle: {
    minWidth: "220px",
    textAlign: "center",
    fontSize: "26px",
    fontWeight: "900",
    color: "#0f172a",
  },

  navButton: {
    width: "45px",
    height: "45px",
    border: "none",
    borderRadius: "12px",
    background: "#1d4ed8",
    color: "#ffffff",
    fontSize: "24px",
    fontWeight: "900",
    cursor: "pointer",
  },

  todayButton: {
    display: "block",
    margin: "0 auto 20px",
    border: "none",
    background: "#0f172a",
    color: "#ffffff",
    padding: "10px 17px",
    borderRadius: "10px",
    fontWeight: "800",
    cursor: "pointer",
  },

  weekGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(7,1fr)",
    gap: "6px",
    marginBottom: "6px",
  },

  weekDay: {
    background: "#1e3a8a",
    color: "#ffffff",
    padding: "11px 5px",
    textAlign: "center",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "900",
  },

  calendarGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(7,1fr)",
    gap: "6px",
  },

  emptyDay: {
    minHeight: "105px",
    background: "#f8fafc",
    borderRadius: "10px",
  },

  day: {
    minHeight: "105px",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    background: "#ffffff",
    padding: "8px",
    textAlign: "left",
    color: "#0f172a",
  },

  today: {
    border:
      "3px solid #2563eb",
    background: "#eff6ff",
  },

  sunday: {
    background: "#fff7f7",
  },

  dayNumber: {
    fontSize: "17px",
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: "6px",
  },

  closed: {
    fontSize: "9px",
    fontWeight: "900",
    color: "#dc2626",
    marginBottom: "4px",
  },

  classText: {
    fontSize: "10px",
    color: "#475569",
    fontWeight: "700",
  },

  eventTag: {
    padding: "5px 6px",
    borderRadius: "6px",
    fontSize: "9px",
    lineHeight: "1.2",
    fontWeight: "900",
    marginTop: "3px",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    textAlign: "center",
  },

  holidayTag: {
    background: "#fee2e2",
    color: "#991b1b",
  },

  testTag: {
    background: "#dcfce7",
    color: "#166534",
  },

  monthlyMahaTestTag: {
    background: "linear-gradient(120deg,#3c176b,#7042b5)",
    color: "#fff3bd",
    border: "1px solid #e7bf50",
    boxShadow: "0 3px 9px rgba(60,23,107,.22)",
  },

  monthlyResultTag: {
    background: "linear-gradient(120deg,#075985,#0f8b8d)",
    color: "#f0ffff",
    border: "1px solid #70d3d0",
    boxShadow: "0 3px 9px rgba(7,89,133,.2)",
  },

  extraClassTag: {
    background: "linear-gradient(120deg,#087f8c,#20b9b0)",
    color: "#ffffff",
    border: "1px solid #6ad9d2",
    boxShadow: "0 3px 9px rgba(8,127,140,.2)",
  },

  eventTagBlue: {
    background: "#dbeafe",
    color: "#1d4ed8",
  },

  breakTag: {
    background: "#fef3c7",
    color: "#92400e",
  },

  eventsCard: {
    background: "#ffffff",
    borderRadius: "22px",
    padding: "25px",
    boxShadow:
      "0 10px 30px rgba(15,23,42,.08)",
    marginBottom: "20px",
  },

  sectionTitle: {
    fontSize: "22px",
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: "18px",
  },

  eventsList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  eventRow: {
    width: "100%",
    border:
      "1px solid #e2e8f0",
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "14px",
    display: "grid",
    gridTemplateColumns:
      "150px 1fr auto",
    alignItems: "center",
    gap: "15px",
    textAlign: "left",
    cursor: "pointer",
    color: "#0f172a",
  },

  eventDate: {
    fontWeight: "900",
    color: "#1d4ed8",
  },

  eventMain: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },

  typeBadge: {
    padding: "7px 10px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: "900",
  },

  typeHoliday: {
    background: "#fee2e2",
    color: "#991b1b",
  },

  typeTest: {
    background: "#dcfce7",
    color: "#166534",
  },

  monthlyMahaTestBadge: {
    background: "linear-gradient(120deg,#3c176b,#7042b5)",
    color: "#fff3bd",
    border: "1px solid #e7bf50",
  },

  monthlyResultBadge: {
    background: "linear-gradient(120deg,#075985,#0f8b8d)",
    color: "#f0ffff",
    border: "1px solid #70d3d0",
  },

  extraClassBadge: {
    background: "linear-gradient(120deg,#087f8c,#20b9b0)",
    color: "#ffffff",
    border: "1px solid #6ad9d2",
  },

  typeEvent: {
    background: "#dbeafe",
    color: "#1d4ed8",
  },

  typeBreak: {
    background: "#fef3c7",
    color: "#92400e",
  },

  noEvents: {
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "25px",
    textAlign: "center",
    color: "#64748b",
    fontWeight: "700",
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(230px,1fr))",
    gap: "16px",
    marginBottom: "20px",
  },

  infoCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "22px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,.07)",
  },

  infoIcon: {
    fontSize: "32px",
    marginBottom: "10px",
  },

  footer: {
    textAlign: "center",
    padding: "25px",
    color: "#475569",
    fontWeight: "700",
    fontSize: "13px",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background:
      "rgba(15,23,42,.60)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 1000,
  },

  modal: {
    position: "relative",
    width: "100%",
    maxWidth: "460px",
    background: "#ffffff",
    borderRadius: "24px",
    padding: "35px",
    textAlign: "center",
    boxShadow:
      "0 25px 70px rgba(0,0,0,.25)",
    color: "#0f172a",
  },

  closeButton: {
    position: "absolute",
    right: "15px",
    top: "12px",
    border: "none",
    background: "#f1f5f9",
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    fontSize: "25px",
    cursor: "pointer",
    color: "#0f172a",
  },

  modalIcon: {
    fontSize: "55px",
    marginBottom: "10px",
  },

  modalTitle: {
    margin: 0,
    fontSize: "27px",
    fontWeight: "900",
  },

  modalDate: {
    color: "#1d4ed8",
    fontWeight: "800",
    marginTop: "10px",
  },

  modalDescription: {
    color: "#475569",
    lineHeight: "1.6",
    fontSize: "15px",
  },

  modalType: {
    display: "inline-block",
    background: "#eff6ff",
    color: "#1d4ed8",
    padding: "8px 14px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "900",
    marginTop: "10px",
  },
};
