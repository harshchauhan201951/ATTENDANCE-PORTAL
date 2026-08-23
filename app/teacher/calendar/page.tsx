```tsx
"use client";

import { useMemo, useState } from "react";

type CalendarEvent = {
  date: string;
  title: string;
  type: "holiday" | "test" | "event" | "break";
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
    date: "2026-02-14",
    title: "Monthly Test",
    type: "test",
    description: "Regular tuition monthly test.",
  },
  {
    date: "2026-03-14",
    title: "Monthly Test",
    type: "test",
    description: "Regular tuition monthly test.",
  },
  {
    date: "2026-04-18",
    title: "Monthly Test",
    type: "test",
    description: "Regular tuition monthly test.",
  },
  {
    date: "2026-05-16",
    title: "Monthly Test",
    type: "test",
    description: "Regular tuition monthly test.",
  },
  {
    date: "2026-06-13",
    title: "Monthly Test",
    type: "test",
    description: "Regular tuition monthly test.",
  },
  {
    date: "2026-07-18",
    title: "Monthly Test",
    type: "test",
    description: "Regular tuition monthly test.",
  },
  {
    date: "2026-08-15",
    title: "Monthly Test",
    type: "test",
    description: "Monthly test schedule.",
  },
  {
    date: "2026-09-19",
    title: "Monthly Test",
    type: "test",
    description: "Regular tuition monthly test.",
  },
  {
    date: "2026-10-17",
    title: "Monthly Test",
    type: "test",
    description: "Regular tuition monthly test.",
  },
  {
    date: "2026-11-14",
    title: "Monthly Test",
    type: "test",
    description: "Regular tuition monthly test.",
  },
  {
    date: "2026-12-12",
    title: "Monthly Test",
    type: "test",
    description: "Final monthly test of the year.",
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

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function eventIcon(type: CalendarEvent["type"]) {
  if (type === "holiday") return "🎉";
  if (type === "test") return "📖";
  if (type === "break") return "🏖️";
  return "📌";
}

function eventColor(type: CalendarEvent["type"]) {
  if (type === "holiday") return "#dc2626";
  if (type === "test") return "#2563eb";
  if (type === "break") return "#16a34a";
  return "#7c3aed";
}

function eventBackground(type: CalendarEvent["type"]) {
  if (type === "holiday") return "#fef2f2";
  if (type === "test") return "#eff6ff";
  if (type === "break") return "#f0fdf4";
  return "#f5f3ff";
}

export default function TeacherCalendarPage() {
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const [selectedEvent, setSelectedEvent] =
    useState<CalendarEvent | null>(null);

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

  const monthEvents = events.filter((event) => {
    const date = new Date(`${event.date}T00:00:00`);

    return (
      date.getFullYear() === year &&
      date.getMonth() === month
    );
  });

  function getEvent(date: Date) {
    return events.find(
      (event) => event.date === dateKey(date)
    );
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
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        <header style={styles.header}>
          <div>
            <div style={styles.badge}>
              👨‍🏫 TEACHER PORTAL
            </div>

            <h1 style={styles.title}>
              📅 Academic Calendar
            </h1>

            <p style={styles.subtitle}>
              Manage and view classes, tests, holidays and important events
            </p>
          </div>
        </header>

        <section style={styles.legendCard}>
          <Legend
            icon="🎉"
            title="Holiday"
            color="#dc2626"
            background="#fef2f2"
          />

          <Legend
            icon="📖"
            title="Test"
            color="#2563eb"
            background="#eff6ff"
          />

          <Legend
            icon="🏖️"
            title="Break"
            color="#16a34a"
            background="#f0fdf4"
          />

          <Legend
            icon="📌"
            title="Event"
            color="#7c3aed"
            background="#f5f3ff"
          />

          <Legend
            icon="🔴"
            title="Sunday Closed"
            color="#dc2626"
            background="#fff7f7"
          />
        </section>

        <section style={styles.calendarCard}>

          <div style={styles.calendarTop}>

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
                  onClick={() => {
                    if (event) {
                      setSelectedEvent(event);
                    }
                  }}
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

                  <div
                    style={{
                      ...styles.dayNumber,
                      ...(isToday
                        ? styles.todayNumber
                        : {}),
                    }}
                  >
                    {date.getDate()}
                  </div>

                  {isSunday && (
                    <div style={styles.closed}>
                      CLOSED
                    </div>
                  )}

                  {event ? (
                    <div
                      style={{
                        ...styles.eventTag,
                        color: eventColor(
                          event.type
                        ),
                        background:
                          eventBackground(
                            event.type
                          ),
                      }}
                    >
                      {eventIcon(event.type)}{" "}
                      {event.title}
                    </div>
                  ) : (
                    !isSunday && (
                      <div style={styles.classText}>
                        📚 Classes
                      </div>
                    )
                  )}

                </button>
              );
            })}

          </div>

        </section>

        <section style={styles.eventsCard}>

          <h2 style={styles.sectionTitle}>
            📌 {monthNames[month]} Events
          </h2>

          <p style={styles.sectionSubtitle}>
            Events and important dates for this month
          </p>

          {monthEvents.length === 0 ? (
            <div style={styles.noEvents}>
              No special events this month.
            </div>
          ) : (
            <div style={styles.eventsList}>

              {[...monthEvents]
                .sort((a, b) =>
                  a.date.localeCompare(b.date)
                )
                .map((event) => (

                  <button
                    key={`${event.date}-${event.title}`}
                    onClick={() =>
                      setSelectedEvent(event)
                    }
                    style={{
                      ...styles.eventRow,
                      borderLeft:
                        `5px solid ${eventColor(
                          event.type
                        )}`,
                    }}
                  >

                    <div style={styles.eventDate}>
                      {formatDate(
                        new Date(
                          `${event.date}T00:00:00`
                        )
                      )}
                    </div>

                    <div style={styles.eventMain}>
                      <strong>
                        {eventIcon(event.type)}{" "}
                        {event.title}
                      </strong>

                      <span>
                        {event.description}
                      </span>
                    </div>

                    <div
                      style={{
                        ...styles.typeBadge,
                        color:
                          eventColor(
                            event.type
                          ),
                        background:
                          eventBackground(
                            event.type
                          ),
                      }}
                    >
                      {event.type.toUpperCase()}
                    </div>

                  </button>
                ))}

            </div>
          )}

        </section>

        {selectedEvent && (
          <div
            style={styles.modalOverlay}
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

              <div style={styles.modalIcon}>
                {eventIcon(
                  selectedEvent.type
                )}
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

              <div
                style={{
                  ...styles.modalBadge,
                  color:
                    eventColor(
                      selectedEvent.type
                    ),
                  background:
                    eventBackground(
                      selectedEvent.type
                    ),
                }}
              >
                {selectedEvent.type.toUpperCase()}
              </div>

              <button
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
          Attendance Portal • Teacher Academic Calendar • 2026
        </footer>

      </div>
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
    <div style={styles.legendItem}>
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
    background:
      "linear-gradient(135deg,#eef2ff,#f8fafc,#eff6ff)",
    padding: "20px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
  },

  header: {
    background: "white",
    borderRadius: "20px",
    padding: "25px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
  },

  badge: {
    display: "inline-block",
    background: "#eff6ff",
    color: "#1d4ed8",
    padding: "7px 12px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "1px",
    marginBottom: "10px",
  },

  title: {
    margin: 0,
    color: "#172554",
    fontSize: "30px",
    fontWeight: "800",
  },

  subtitle: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  legendCard: {
    background: "white",
    borderRadius: "18px",
    padding: "18px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(170px,1fr))",
    gap: "12px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
  },

  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px",
    background: "#f8fafc",
    borderRadius: "10px",
  },

  legendIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "19px",
    flexShrink: 0,
  },

  legendText: {
    color: "#334155",
    fontSize: "13px",
  },

  calendarCard: {
    background: "white",
    borderRadius: "20px",
    padding: "22px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
    overflow: "hidden",
  },

  calendarTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "18px",
  },

  monthTitle: {
    minWidth: "210px",
    textAlign: "center",
    color: "#172554",
    fontSize: "25px",
    fontWeight: "800",
  },

  navButton: {
    width: "44px",
    height: "44px",
    border: "none",
    borderRadius: "10px",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: "22px",
    fontWeight: "800",
    cursor: "pointer",
  },

  todayButton: {
    display: "block",
    margin: "18px auto",
    border: "none",
    background: "#2563eb",
    color: "white",
    padding: "10px 18px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },

  weekGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(7,minmax(0,1fr))",
    gap: "5px",
    marginTop: "10px",
  },

  weekDay: {
    textAlign: "center",
    padding: "12px 4px",
    background: "#eff6ff",
    color: "#1e3a8a",
    fontWeight: "800",
    fontSize: "12px",
    borderRadius: "8px",
  },

  calendarGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(7,minmax(0,1fr))",
    gap: "5px",
    marginTop: "5px",
  },

  emptyDay: {
    minHeight: "105px",
    background: "#f8fafc",
    borderRadius: "8px",
  },

  day: {
    minHeight: "105px",
    border: "1px solid #e2e8f0",
    borderRadius: "9px",
    padding: "8px",
    background: "white",
    textAlign: "left",
    boxSizing: "border-box",
    overflow: "hidden",
  },

  today: {
    border: "2px solid #2563eb",
    background: "#f8fbff",
  },

  sunday: {
    background: "#fffafa",
    borderColor: "#fecaca",
  },

  dayNumber: {
    color: "#334155",
    fontSize: "14px",
    fontWeight: "800",
    marginBottom: "5px",
  },

  todayNumber: {
    color: "#2563eb",
  },

  closed: {
    color: "#dc2626",
    fontSize: "9px",
    fontWeight: "900",
    marginBottom: "5px",
  },

  eventTag: {
    padding: "5px",
    borderRadius: "6px",
    fontSize: "10px",
    fontWeight: "800",
    lineHeight: 1.3,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  classText: {
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "700",
    marginTop: "10px",
  },

  eventsCard: {
    background: "white",
    borderRadius: "20px",
    padding: "24px",
    marginTop: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
  },

  sectionTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "21px",
    fontWeight: "800",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  noEvents: {
    marginTop: "18px",
    padding: "20px",
    background: "#f8fafc",
    borderRadius: "12px",
    textAlign: "center",
    color: "#64748b",
  },

  eventsList: {
    display: "grid",
    gap: "10px",
    marginTop: "18px",
  },

  eventRow: {
    width: "100%",
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "14px",
    display: "grid",
    gridTemplateColumns:
      "130px 1fr auto",
    alignItems: "center",
    gap: "15px",
    textAlign: "left",
    cursor: "pointer",
  },

  eventDate: {
    color: "#475569",
    fontSize: "12px",
    fontWeight: "800",
  },

  eventMain: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    color: "#172554",
    fontSize: "14px",
  },

  typeBadge: {
    padding: "7px 10px",
    borderRadius: "999px",
    fontSize: "9px",
    fontWeight: "900",
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
  },

  modal: {
    width: "100%",
    maxWidth: "430px",
    background: "white",
    borderRadius: "20px",
    padding: "28px",
    textAlign: "center",
    boxShadow:
      "0 25px 60px rgba(15,23,42,0.25)",
  },

  modalIcon: {
    fontSize: "45px",
    marginBottom: "8px",
  },

  modalTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "23px",
  },

  modalDate: {
    color: "#64748b",
    fontWeight: "700",
    fontSize: "13px",
    margin: "10px 0",
  },

  modalDescription: {
    color: "#475569",
    fontSize: "14px",
    lineHeight: 1.6,
  },

  modalBadge: {
    display: "inline-block",
    padding: "8px 12px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: "900",
    marginTop: "5px",
  },

  closeButton: {
    display: "block",
    width: "100%",
    marginTop: "20px",
    border: "none",
    background: "#1e3a8a",
    color: "white",
    padding: "12px",
    borderRadius: "10px",
    fontWeight: "800",
    cursor: "pointer",
  },

  footer: {
    textAlign: "center",
    padding: "25px 10px 10px",
    color: "#64748b",
    fontSize: "12px",
  },
};
```
