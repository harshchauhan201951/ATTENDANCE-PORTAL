"use client";

import { useMemo, useState } from "react";

type CalendarEvent = {
  date: string;
  title: string;
  type: "holiday" | "event" | "test" | "class";
  description: string;
};

const calendarEvents: CalendarEvent[] = [
  {
    date: "2026-01-26",
    title: "Republic Day",
    type: "holiday",
    description: "Tuition classes closed",
  },
  {
    date: "2026-02-15",
    title: "Maha Shivratri",
    type: "holiday",
    description: "Tuition holiday",
  },
  {
    date: "2026-03-04",
    title: "Holi",
    type: "holiday",
    description: "Tuition holiday",
  },
  {
    date: "2026-03-21",
    title: "Eid-ul-Fitr",
    type: "holiday",
    description: "Holiday",
  },
  {
    date: "2026-04-03",
    title: "Good Friday",
    type: "holiday",
    description: "Holiday",
  },
  {
    date: "2026-04-14",
    title: "Ambedkar Jayanti",
    type: "holiday",
    description: "Holiday",
  },
  {
    date: "2026-05-01",
    title: "May Day",
    type: "holiday",
    description: "Tuition holiday",
  },
  {
    date: "2026-05-27",
    title: "Eid-ul-Adha",
    type: "holiday",
    description: "Holiday",
  },
  {
    date: "2026-06-26",
    title: "Muharram",
    type: "holiday",
    description: "Holiday",
  },
  {
    date: "2026-08-15",
    title: "Independence Day",
    type: "holiday",
    description: "Tuition holiday",
  },
  {
    date: "2026-08-28",
    title: "Janmashtami",
    type: "holiday",
    description: "Holiday",
  },
  {
    date: "2026-10-02",
    title: "Gandhi Jayanti",
    type: "holiday",
    description: "Tuition holiday",
  },
  {
    date: "2026-10-20",
    title: "Dussehra",
    type: "holiday",
    description: "Holiday",
  },
  {
    date: "2026-11-08",
    title: "Diwali",
    type: "holiday",
    description: "Tuition holiday",
  },
  {
    date: "2026-11-24",
    title: "Guru Nanak Jayanti",
    type: "holiday",
    description: "Holiday",
  },
  {
    date: "2026-12-25",
    title: "Christmas",
    type: "holiday",
    description: "Tuition holiday",
  },

  {
    date: "2026-01-10",
    title: "Monthly Test",
    type: "test",
    description: "January assessment",
  },
  {
    date: "2026-02-14",
    title: "Monthly Test",
    type: "test",
    description: "February assessment",
  },
  {
    date: "2026-03-14",
    title: "Monthly Test",
    type: "test",
    description: "March assessment",
  },
  {
    date: "2026-04-11",
    title: "Monthly Test",
    type: "test",
    description: "April assessment",
  },
  {
    date: "2026-05-09",
    title: "Monthly Test",
    type: "test",
    description: "May assessment",
  },
  {
    date: "2026-07-11",
    title: "Monthly Test",
    type: "test",
    description: "July assessment",
  },
  {
    date: "2026-08-08",
    title: "Monthly Test",
    type: "test",
    description: "August assessment",
  },
  {
    date: "2026-09-12",
    title: "Monthly Test",
    type: "test",
    description: "September assessment",
  },
  {
    date: "2026-10-10",
    title: "Monthly Test",
    type: "test",
    description: "October assessment",
  },
  {
    date: "2026-11-14",
    title: "Monthly Test",
    type: "test",
    description: "November assessment",
  },
  {
    date: "2026-12-12",
    title: "Annual Assessment",
    type: "test",
    description: "Final yearly assessment",
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

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AcademicCalendarPage() {
  const [currentDate, setCurrentDate] = useState(
    new Date(2026, new Date().getMonth(), 1)
  );

  const [selectedEvent, setSelectedEvent] =
    useState<CalendarEvent | null>(null);

  const [showAllEvents, setShowAllEvents] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const firstDay = new Date(
    year,
    month,
    1
  ).getDay();

  const monthEvents = useMemo(() => {
    return calendarEvents
      .filter((event) => {
        const date = new Date(event.date + "T00:00:00");
        return (
          date.getFullYear() === year &&
          date.getMonth() === month
        );
      })
      .sort((a, b) =>
        a.date.localeCompare(b.date)
      );
  }, [year, month]);

  const holidays = calendarEvents.filter(
    (event) => event.type === "holiday"
  );

  const tests = calendarEvents.filter(
    (event) => event.type === "test"
  );

  function previousMonth() {
    setCurrentDate(
      new Date(year, month - 1, 1)
    );
  }

  function nextMonth() {
    setCurrentDate(
      new Date(year, month + 1, 1)
    );
  }

  function goToday() {
    const today = new Date();

    setCurrentDate(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    );
  }

  function getEventForDay(day: number) {
    const date = `${year}-${String(
      month + 1
    ).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;

    return calendarEvents.find(
      (event) => event.date === date
    );
  }

  function getDayClass(day: number) {
    const event = getEventForDay(day);

    if (!event) return styles.day;

    if (event.type === "holiday")
      return {
        ...styles.day,
        ...styles.holidayDay,
      };

    if (event.type === "test")
      return {
        ...styles.day,
        ...styles.testDay,
      };

    return styles.day;
  }

  const calendarCells = [];

  for (let i = 0; i < firstDay; i++) {
    calendarCells.push(
      <div
        key={`empty-${i}`}
        style={styles.emptyDay}
      />
    );
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const event = getEventForDay(day);

    calendarCells.push(
      <button
        key={day}
        type="button"
        style={getDayClass(day)}
        onClick={() => {
          if (event) {
            setSelectedEvent(event);
          }
        }}
      >
        <span style={styles.dayNumber}>
          {day}
        </span>

        {event && (
          <span
            style={
              event.type === "holiday"
                ? styles.holidayLabel
                : styles.testLabel
            }
          >
            {event.type === "holiday"
              ? "HOLIDAY"
              : "TEST"}
          </span>
        )}

        {event && (
          <span style={styles.eventName}>
            {event.title}
          </span>
        )}
      </button>
    );
  }

  const visibleEvents = showAllEvents
    ? calendarEvents
    : calendarEvents.slice(0, 8);

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        {/* HEADER */}

        <header style={styles.header}>
          <div>
            <div style={styles.topBadge}>
              TUITION ACADEMIC CALENDAR
            </div>

            <h1 style={styles.title}>
              📅 Academic Calendar
            </h1>

            <p style={styles.subtitle}>
              Tuition Classes • Holidays • Tests •
              Important Events
            </p>
          </div>

          <div style={styles.yearBox}>
            <span style={styles.yearLabel}>
              Academic Year
            </span>

            <strong style={styles.year}>
              2026
            </strong>
          </div>
        </header>

        {/* SUMMARY */}

        <section style={styles.statsGrid}>
          <div style={styles.statBlue}>
            <div style={styles.statIcon}>📚</div>
            <div>
              <p style={styles.statTitle}>
                Tuition Classes
              </p>
              <strong style={styles.statValue}>
                Regular
              </strong>
            </div>
          </div>

          <div style={styles.statGreen}>
            <div style={styles.statIcon}>🎉</div>
            <div>
              <p style={styles.statTitle}>
                Holidays
              </p>
              <strong style={styles.statValue}>
                {holidays.length}
              </strong>
            </div>
          </div>

          <div style={styles.statPurple}>
            <div style={styles.statIcon}>📝</div>
            <div>
              <p style={styles.statTitle}>
                Tests
              </p>
              <strong style={styles.statValue}>
                {tests.length}
              </strong>
            </div>
          </div>

          <div style={styles.statOrange}>
            <div style={styles.statIcon}>📆</div>
            <div>
              <p style={styles.statTitle}>
                Current Month
              </p>
              <strong style={styles.statValue}>
                {monthNames[month]}
              </strong>
            </div>
          </div>
        </section>

        {/* CALENDAR */}

        <section style={styles.card}>
          <div style={styles.calendarHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                {monthNames[month]} {year}
              </h2>

              <p style={styles.sectionSubtitle}>
                Tuition class schedule
              </p>
            </div>

            <div style={styles.navigation}>
              <button
                type="button"
                onClick={previousMonth}
                style={styles.navButton}
              >
                ← Previous
              </button>

              <button
                type="button"
                onClick={goToday}
                style={styles.todayButton}
              >
                Today
              </button>

              <button
                type="button"
                onClick={nextMonth}
                style={styles.navButton}
              >
                Next →
              </button>
            </div>
          </div>

          {/* LEGEND */}

          <div style={styles.legend}>
            <div style={styles.legendItem}>
              <span
                style={{
                  ...styles.legendDot,
                  background: "#fee2e2",
                  borderColor: "#ef4444",
                }}
              />
              Holiday
            </div>

            <div style={styles.legendItem}>
              <span
                style={{
                  ...styles.legendDot,
                  background: "#ede9fe",
                  borderColor: "#8b5cf6",
                }}
              />
              Test
            </div>

            <div style={styles.legendItem}>
              <span
                style={{
                  ...styles.legendDot,
                  background: "#ffffff",
                  borderColor: "#cbd5e1",
                }}
              />
              Regular Class
            </div>
          </div>

          {/* WEEK DAYS */}

          <div style={styles.weekHeader}>
            {dayNames.map((day) => (
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
            {calendarCells}
          </div>
        </section>

        {/* MONTH EVENTS */}

        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                📌 {monthNames[month]} Events
              </h2>

              <p style={styles.sectionSubtitle}>
                Important activities for this month
              </p>
            </div>

            <span style={styles.countBadge}>
              {monthEvents.length} Events
            </span>
          </div>

          {monthEvents.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>
                📅
              </div>

              <h3 style={styles.emptyTitle}>
                No special events
              </h3>

              <p style={styles.emptyText}>
                Regular tuition classes will continue
                according to the normal schedule.
              </p>
            </div>
          ) : (
            <div style={styles.eventList}>
              {monthEvents.map((event) => (
                <button
                  key={`${event.date}-${event.title}`}
                  type="button"
                  onClick={() =>
                    setSelectedEvent(event)
                  }
                  style={styles.eventCard}
                >
                  <div
                    style={
                      event.type === "holiday"
                        ? styles.eventDateHoliday
                        : styles.eventDateTest
                    }
                  >
                    {new Date(
                      event.date + "T00:00:00"
                    ).getDate()}
                  </div>

                  <div style={styles.eventInfo}>
                    <strong style={styles.eventTitle}>
                      {event.title}
                    </strong>

                    <span style={styles.eventDateText}>
                      {formatDate(event.date)}
                    </span>

                    <span style={styles.eventDescription}>
                      {event.description}
                    </span>
                  </div>

                  <span
                    style={
                      event.type === "holiday"
                        ? styles.holidayBadge
                        : styles.testBadge
                    }
                  >
                    {event.type === "holiday"
                      ? "HOLIDAY"
                      : "TEST"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ALL EVENTS */}

        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                🗓️ Important Dates
              </h2>

              <p style={styles.sectionSubtitle}>
                Complete yearly calendar events
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowAllEvents(
                  (current) => !current
                )
              }
              style={styles.viewButton}
            >
              {showAllEvents
                ? "Show Less"
                : "View All Events"}
            </button>
          </div>

          <div style={styles.allEventsGrid}>
            {visibleEvents.map((event) => (
              <button
                key={`${event.date}-${event.title}-all`}
                type="button"
                onClick={() =>
                  setSelectedEvent(event)
                }
                style={styles.smallEvent}
              >
                <div style={styles.smallEventDate}>
                  {formatDate(event.date)}
                </div>

                <strong
                  style={styles.smallEventTitle}
                >
                  {event.title}
                </strong>

                <span
                  style={
                    event.type === "holiday"
                      ? styles.smallHoliday
                      : styles.smallTest
                  }
                >
                  {event.type === "holiday"
                    ? "Holiday"
                    : "Test"}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* EVENT MODAL */}

        {selectedEvent && (
          <div
            style={styles.modalOverlay}
            onClick={() =>
              setSelectedEvent(null)
            }
          >
            <div
              style={styles.modal}
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <button
                type="button"
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
                  : "📝"}
              </div>

              <h2 style={styles.modalTitle}>
                {selectedEvent.title}
              </h2>

              <p style={styles.modalDate}>
                📅 {formatDate(selectedEvent.date)}
              </p>

              <div
                style={
                  selectedEvent.type ===
                  "holiday"
                    ? styles.modalHoliday
                    : styles.modalTest
                }
              >
                {selectedEvent.type ===
                "holiday"
                  ? "TUITION HOLIDAY"
                  : "ASSESSMENT / TEST"}
              </div>

              <p style={styles.modalDescription}>
                {selectedEvent.description}
              </p>

              <button
                type="button"
                onClick={() =>
                  setSelectedEvent(null)
                }
                style={styles.modalButton}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* FOOTER */}

        <footer style={styles.footer}>
          📚 Tuition Attendance Portal • Academic
          Calendar 2026
        </footer>
      </div>
    </main>
  );
}

function formatDate(value: string) {
  const date = new Date(
    value + "T00:00:00"
  );

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const styles: {
  [key: string]: React.CSSProperties;
} = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#eff6ff 0%,#f8fafc 45%,#eef2ff 100%)",
    padding: "24px 15px 50px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#0f172a",
  },

  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
  },

  header: {
    background:
      "linear-gradient(135deg,#172554,#1d4ed8)",
    borderRadius: "24px",
    padding: "30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    color: "white",
    boxShadow:
      "0 18px 40px rgba(30,64,175,0.22)",
    marginBottom: "20px",
  },

  topBadge: {
    display: "inline-block",
    background: "rgba(255,255,255,0.18)",
    border:
      "1px solid rgba(255,255,255,0.25)",
    padding: "7px 12px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "0.7px",
    marginBottom: "12px",
  },

  title: {
    margin: 0,
    fontSize: "34px",
    lineHeight: 1.2,
    fontWeight: "900",
    color: "#ffffff",
  },

  subtitle: {
    margin: "9px 0 0",
    fontSize: "14px",
    color: "#dbeafe",
    fontWeight: "600",
  },

  yearBox: {
    minWidth: "130px",
    padding: "18px",
    borderRadius: "18px",
    background:
      "rgba(255,255,255,0.13)",
    border:
      "1px solid rgba(255,255,255,0.2)",
    textAlign: "center",
  },

  yearLabel: {
    display: "block",
    fontSize: "11px",
    color: "#dbeafe",
    marginBottom: "5px",
    fontWeight: "700",
  },

  year: {
    fontSize: "28px",
    color: "#ffffff",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: "16px",
    marginBottom: "20px",
  },

  statBlue: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "22px",
    borderRadius: "18px",
    color: "white",
    background:
      "linear-gradient(135deg,#2563eb,#1e40af)",
    boxShadow:
      "0 10px 25px rgba(37,99,235,0.18)",
  },

  statGreen: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "22px",
    borderRadius: "18px",
    color: "white",
    background:
      "linear-gradient(135deg,#16a34a,#166534)",
    boxShadow:
      "0 10px 25px rgba(22,163,74,0.18)",
  },

  statPurple: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "22px",
    borderRadius: "18px",
    color: "white",
    background:
      "linear-gradient(135deg,#7c3aed,#5b21b6)",
    boxShadow:
      "0 10px 25px rgba(124,58,237,0.18)",
  },

  statOrange: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "22px",
    borderRadius: "18px",
    color: "white",
    background:
      "linear-gradient(135deg,#f97316,#c2410c)",
    boxShadow:
      "0 10px 25px rgba(249,115,22,0.18)",
  },

  statIcon: {
    fontSize: "32px",
  },

  statTitle: {
    margin: 0,
    fontSize: "12px",
    color: "rgba(255,255,255,0.85)",
    fontWeight: "700",
  },

  statValue: {
    display: "block",
    marginTop: "4px",
    fontSize: "22px",
    color: "#ffffff",
    fontWeight: "900",
  },

  card: {
    background: "#ffffff",
    borderRadius: "22px",
    padding: "24px",
    marginBottom: "20px",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.08)",
    border: "1px solid #e2e8f0",
  },

  calendarHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
    marginBottom: "18px",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
    marginBottom: "18px",
  },

  sectionTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "23px",
    fontWeight: "900",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#475569",
    fontSize: "14px",
    fontWeight: "600",
  },

  navigation: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },

  navButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    padding: "10px 13px",
    borderRadius: "10px",
    fontWeight: "800",
    cursor: "pointer",
  },

  todayButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "10px 15px",
    borderRadius: "10px",
    fontWeight: "800",
    cursor: "pointer",
  },

  legend: {
    display: "flex",
    gap: "18px",
    flexWrap: "wrap",
    marginBottom: "18px",
    padding: "13px",
    background: "#f8fafc",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
  },

  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    color: "#1e293b",
    fontSize: "13px",
    fontWeight: "800",
  },

  legendDot: {
    width: "14px",
    height: "14px",
    borderRadius: "4px",
    border: "2px solid",
    display: "inline-block",
  },

  weekHeader: {
    display: "grid",
    gridTemplateColumns:
      "repeat(7,minmax(0,1fr))",
    gap: "6px",
    marginBottom: "6px",
  },

  weekDay: {
    textAlign: "center",
    padding: "10px 4px",
    background: "#172554",
    color: "#ffffff",
    borderRadius: "8px",
    fontWeight: "900",
    fontSize: "12px",
  },

  calendarGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(7,minmax(0,1fr))",
    gap: "6px",
  },

  day: {
    minHeight: "105px",
    padding: "9px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#0f172a",
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    overflow: "hidden",
  },

  emptyDay: {
    minHeight: "105px",
    borderRadius: "10px",
    background: "#f8fafc",
  },

  holidayDay: {
    background: "#fff1f2",
    border: "2px solid #f87171",
  },

  testDay: {
    background: "#f5f3ff",
    border: "2px solid #8b5cf6",
  },

  dayNumber: {
    display: "block",
    fontSize: "17px",
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: "5px",
  },

  holidayLabel: {
    display: "inline-block",
    background: "#dc2626",
    color: "#ffffff",
    padding: "3px 6px",
    borderRadius: "5px",
    fontSize: "8px",
    fontWeight: "900",
    marginBottom: "4px",
  },

  testLabel: {
    display: "inline-block",
    background: "#7c3aed",
    color: "#ffffff",
    padding: "3px 6px",
    borderRadius: "5px",
    fontSize: "8px",
    fontWeight: "900",
    marginBottom: "4px",
  },

  eventName: {
    display: "block",
    color: "#0f172a",
    fontSize: "10px",
    lineHeight: 1.2,
    fontWeight: "800",
  },

  countBadge: {
    display: "inline-block",
    background: "#dbeafe",
    color: "#1e40af",
    padding: "8px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "900",
  },

  eventList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  eventCard: {
    width: "100%",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    borderRadius: "14px",
    padding: "14px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    textAlign: "left",
    cursor: "pointer",
    color: "#0f172a",
  },

  eventDateHoliday: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    background: "#fee2e2",
    color: "#b91c1c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    fontWeight: "900",
    flexShrink: 0,
  },

  eventDateTest: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    background: "#ede9fe",
    color: "#6d28d9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    fontWeight: "900",
    flexShrink: 0,
  },

  eventInfo: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },

  eventTitle: {
    color: "#0f172a",
    fontSize: "16px",
    fontWeight: "900",
  },

  eventDateText: {
    color: "#334155",
    fontSize: "12px",
    fontWeight: "700",
  },

  eventDescription: {
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "600",
  },

  holidayBadge: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "7px 10px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: "900",
    flexShrink: 0,
  },

  testBadge: {
    background: "#ede9fe",
    color: "#5b21b6",
    padding: "7px 10px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: "900",
    flexShrink: 0,
  },

  viewButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "10px 14px",
    borderRadius: "10px",
    fontWeight: "800",
    cursor: "pointer",
  },

  allEventsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: "12px",
  },

  smallEvent: {
    textAlign: "left",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    borderRadius: "14px",
    padding: "15px",
    cursor: "pointer",
    color: "#0f172a",
  },

  smallEventDate: {
    color: "#475569",
    fontSize: "12px",
    fontWeight: "800",
    marginBottom: "7px",
  },

  smallEventTitle: {
    display: "block",
    color: "#0f172a",
    fontSize: "15px",
    fontWeight: "900",
    marginBottom: "8px",
  },

  smallHoliday: {
    display: "inline-block",
    background: "#fee2e2",
    color: "#991b1b",
    padding: "4px 7px",
    borderRadius: "6px",
    fontSize: "10px",
    fontWeight: "900",
  },

  smallTest: {
    display: "inline-block",
    background: "#ede9fe",
    color: "#5b21b6",
    padding: "4px 7px",
    borderRadius: "6px",
    fontSize: "10px",
    fontWeight: "900",
  },

  empty: {
    textAlign: "center",
    padding: "35px 20px",
    background: "#f8fafc",
    borderRadius: "14px",
    border: "1px dashed #cbd5e1",
  },

  emptyIcon: {
    fontSize: "40px",
    marginBottom: "8px",
  },

  emptyTitle: {
    margin: "0 0 5px",
    color: "#0f172a",
  },

  emptyText: {
    margin: 0,
    color: "#475569",
    fontSize: "13px",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background:
      "rgba(15,23,42,0.65)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 1000,
  },

  modal: {
    width: "100%",
    maxWidth: "430px",
    background: "#ffffff",
    borderRadius: "22px",
    padding: "30px",
    position: "relative",
    textAlign: "center",
    boxShadow:
      "0 25px 60px rgba(0,0,0,0.25)",
    color: "#0f172a",
  },

  closeButton: {
    position: "absolute",
    top: "10px",
    right: "14px",
    border: "none",
    background: "transparent",
    fontSize: "30px",
    color: "#334155",
    cursor: "pointer",
  },

  modalIcon: {
    fontSize: "50px",
    marginBottom: "10px",
  },

  modalTitle: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "900",
    color: "#0f172a",
  },

  modalDate: {
    color: "#334155",
    fontWeight: "700",
    margin: "10px 0",
  },

  modalHoliday: {
    display: "inline-block",
    background: "#fee2e2",
    color: "#991b1b",
    padding: "8px 12px",
    borderRadius: "999px",
    fontWeight: "900",
    fontSize: "11px",
  },

  modalTest: {
    display: "inline-block",
    background: "#ede9fe",
    color: "#5b21b6",
    padding: "8px 12px",
    borderRadius: "999px",
    fontWeight: "900",
    fontSize: "11px",
  },

  modalDescription: {
    color: "#475569",
    lineHeight: 1.6,
    fontSize: "14px",
    margin: "18px 0",
  },

  modalButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "11px 22px",
    borderRadius: "10px",
    fontWeight: "800",
    cursor: "pointer",
  },

  footer: {
    textAlign: "center",
    padding: "20px",
    color: "#475569",
    fontSize: "13px",
    fontWeight: "700",
  },
};