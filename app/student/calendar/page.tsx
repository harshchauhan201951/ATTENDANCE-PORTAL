"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type EventType = "TEST" | "HOLIDAY" | "EVENT";

type CalendarEvent = {
  id: number;
  date: string;
  title: string;
  type: EventType;
  description: string;
};

const specialEvents: CalendarEvent[] = [
  {
    id: 1,
    date: "2026-08-15",
    title: "Independence Day",
    type: "HOLIDAY",
    description: "Tuition holiday.",
  },
  {
    id: 2,
    date: "2026-08-27",
    title: "Janmashtami",
    type: "HOLIDAY",
    description: "Tuition holiday.",
  },
  {
    id: 3,
    date: "2026-10-02",
    title: "Gandhi Jayanti",
    type: "HOLIDAY",
    description: "Tuition holiday.",
  },
  {
    id: 4,
    date: "2026-10-20",
    title: "Dussehra",
    type: "HOLIDAY",
    description: "Tuition holiday.",
  },
  {
    id: 5,
    date: "2026-11-08",
    title: "Diwali",
    type: "HOLIDAY",
    description: "Tuition holiday.",
  },
  {
    id: 6,
    date: "2026-11-09",
    title: "Diwali Holiday",
    type: "HOLIDAY",
    description: "Tuition classes closed.",
  },
  {
    id: 7,
    date: "2026-11-24",
    title: "Guru Nanak Jayanti",
    type: "HOLIDAY",
    description: "Tuition holiday.",
  },
  {
    id: 8,
    date: "2026-12-25",
    title: "Christmas Day",
    type: "HOLIDAY",
    description: "Tuition holiday.",
  },
  {
    id: 9,
    date: "2026-09-05",
    title: "Teachers' Day",
    type: "EVENT",
    description: "Special tuition activity.",
  },
  {
    id: 10,
    date: "2026-11-14",
    title: "Children's Day",
    type: "EVENT",
    description: "Special student activity.",
  },
  {
    id: 11,
    date: "2026-12-31",
    title: "Year End Activity",
    type: "EVENT",
    description: "Special tuition activity.",
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

const weekDays = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(
    day
  ).padStart(2, "0")}`;
}

function getSpecialEvent(date: string) {
  return specialEvents.find((event) => event.date === date);
}

function getEventColor(type: EventType) {
  switch (type) {
    case "TEST":
      return "#2563eb";
    case "HOLIDAY":
      return "#16a34a";
    case "EVENT":
      return "#7c3aed";
    default:
      return "#64748b";
  }
}

function getEventBackground(type: EventType) {
  switch (type) {
    case "TEST":
      return "#eff6ff";
    case "HOLIDAY":
      return "#f0fdf4";
    case "EVENT":
      return "#f5f3ff";
    default:
      return "#f8fafc";
  }
}

export default function StudentCalendarPage() {
  const router = useRouter();

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
    const days: Array<number | null> = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  }, [firstDay, daysInMonth]);

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

  function isToday(day: number) {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  }

  function getDayInfo(day: number) {
    const date = new Date(year, month, day);
    const dateString = dateKey(year, month, day);

    const special = getSpecialEvent(dateString);

    if (special) {
      return {
        type: special.type,
        title: special.title,
        description: special.description,
        color: getEventColor(special.type),
        background: getEventBackground(special.type),
        event: special,
      };
    }

    if (date.getDay() === 0) {
      return {
        type: "SUNDAY",
        title: "Sunday OFF",
        description:
          "Tuition is closed every Sunday.",
        color: "#dc2626",
        background: "#fef2f2",
        event: null,
      };
    }

    if (date.getDay() === 6) {
      const testEvent: CalendarEvent = {
        id: Number(`${year}${month + 1}${day}`),
        date: dateString,
        title: "Weekly Test",
        type: "TEST",
        description:
          "Weekly test for tuition students.",
      };

      return {
        type: "TEST",
        title: "Weekly Test",
        description:
          "Weekly test for tuition students.",
        color: "#2563eb",
        background: "#eff6ff",
        event: testEvent,
      };
    }

    return {
      type: "CLASS",
      title: "Tuition Class",
      description: "Regular tuition class.",
      color: "#475569",
      background: "#f8fafc",
      event: null,
    };
  }

  const monthEvents = useMemo(() => {
    const result: CalendarEvent[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);

      if (date.getDay() === 6) {
        result.push({
          id: Number(`${year}${month + 1}${day}`),
          date: dateKey(year, month, day),
          title: "Weekly Test",
          type: "TEST",
          description:
            "Weekly test for tuition students.",
        });
      }
    }

    specialEvents.forEach((event) => {
      const eventDate = new Date(
        `${event.date}T00:00:00`
      );

      if (
        eventDate.getFullYear() === year &&
        eventDate.getMonth() === month
      ) {
        result.push(event);
      }
    });

    return result.sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [year, month, daysInMonth]);

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        <header style={styles.header}>
          <div>
            <div style={styles.smallLabel}>
              STUDENT PORTAL
            </div>

            <h1 style={styles.title}>
              📅 Tuition Calendar
            </h1>

            <p style={styles.subtitle}>
              Classes, weekly tests and tuition holidays
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/student/dashboard")
            }
            style={styles.dashboardButton}
          >
            ← Dashboard
          </button>
        </header>

        <section style={styles.calendarCard}>

          <div style={styles.calendarTop}>

            <button
              type="button"
              onClick={previousMonth}
              style={styles.navigationButton}
            >
              ‹
            </button>

            <div style={styles.monthTitle}>
              {monthNames[month]} {year}
            </div>

            <button
              type="button"
              onClick={nextMonth}
              style={styles.navigationButton}
            >
              ›
            </button>

          </div>

          <button
            type="button"
            onClick={goToday}
            style={styles.todayButton}
          >
            Go to Today
          </button>

          <div style={styles.weekGrid}>
            {weekDays.map((day) => (
              <div
                key={day}
                style={{
                  ...styles.weekDay,
                  ...(day === "Sun"
                    ? styles.sundayHeader
                    : {}),
                  ...(day === "Sat"
                    ? styles.saturdayHeader
                    : {}),
                }}
              >
                {day}
              </div>
            ))}
          </div>

          <div style={styles.calendarGrid}>

            {calendarDays.map((day, index) => {
              if (day === null) {
                return (
                  <div
                    key={`empty-${index}`}
                    style={styles.emptyCell}
                  />
                );
              }

              const info = getDayInfo(day);

              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => {
                    if (info.event) {
                      setSelectedEvent(info.event);
                    }
                  }}
                  style={{
                    ...styles.dayCell,
                    ...(isToday(day)
                      ? styles.todayCell
                      : {}),
                    ...(info.type === "SUNDAY"
                      ? styles.sundayCell
                      : {}),
                    ...(info.type === "TEST"
                      ? styles.testCell
                      : {}),
                  }}
                >

                  <div
                    style={{
                      ...styles.dayNumber,
                      ...(isToday(day)
                        ? styles.todayNumber
                        : {}),
                    }}
                  >
                    {day}
                  </div>

                  <div
                    style={{
                      ...styles.dayStatus,
                      color: info.color,
                      background: info.background,
                    }}
                  >
                    {info.type === "SUNDAY" && "OFF"}
                    {info.type === "TEST" && "TEST"}
                    {info.type === "HOLIDAY" &&
                      "HOLIDAY"}
                    {info.type === "EVENT" &&
                      "EVENT"}
                    {info.type === "CLASS" &&
                      "CLASS"}
                  </div>

                  <div style={styles.dayTitle}>
                    {info.title}
                  </div>

                </button>
              );
            })}

          </div>

        </section>

        <section style={styles.card}>

          <h2 style={styles.sectionTitle}>
            📌 Calendar Guide
          </h2>

          <p style={styles.sectionSubtitle}>
            Tuition schedule
          </p>

          <div style={styles.legendGrid}>

            <Legend
              icon="📚"
              color="#475569"
              background="#f8fafc"
              title="Tuition Class"
              description="Regular tuition classes"
            />

            <Legend
              icon="📝"
              color="#2563eb"
              background="#eff6ff"
              title="Weekly Test"
              description="Every Saturday"
            />

            <Legend
              icon="🔴"
              color="#dc2626"
              background="#fef2f2"
              title="Sunday OFF"
              description="Tuition remains closed"
            />

            <Legend
              icon="🎉"
              color="#16a34a"
              background="#f0fdf4"
              title="Holiday"
              description="Tuition holiday"
            />

          </div>
        </section>

        <section style={styles.card}>

          <h2 style={styles.sectionTitle}>
            📋 {monthNames[month]} Schedule
          </h2>

          <p style={styles.sectionSubtitle}>
            Weekly tests and special holidays
          </p>

          {monthEvents.length === 0 ? (
            <div style={styles.noEvents}>
              No special dates this month.
            </div>
          ) : (
            <div style={styles.eventList}>

              {monthEvents.map((event) => (
                <button
                  type="button"
                  key={`${event.date}-${event.title}`}
                  onClick={() =>
                    setSelectedEvent(event)
                  }
                  style={{
                    ...styles.eventCard,
                    borderLeftWidth: "5px",
                    borderLeftStyle: "solid",
                    borderLeftColor:
                      getEventColor(event.type),
                  }}
                >

                  <div style={styles.eventInfo}>

                    <div style={styles.eventDate}>
                      📅 {event.date}
                    </div>

                    <div style={styles.eventTitle}>
                      {event.type === "TEST"
                        ? "📝 "
                        : "🎉 "}
                      {event.title}
                    </div>

                    <div
                      style={
                        styles.eventDescription
                      }
                    >
                      {event.description}
                    </div>

                  </div>

                  <span
                    style={{
                      ...styles.typeBadge,
                      color:
                        getEventColor(event.type),
                      background:
                        getEventBackground(
                          event.type
                        ),
                    }}
                  >
                    {event.type}
                  </span>

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
                {selectedEvent.type === "TEST"
                  ? "📝"
                  : selectedEvent.type === "HOLIDAY"
                  ? "🎉"
                  : "📌"}
              </div>

              <h2 style={styles.modalTitle}>
                {selectedEvent.title}
              </h2>

              <p style={styles.modalDate}>
                📅 {selectedEvent.date}
              </p>

              <p style={styles.modalDescription}>
                {selectedEvent.description}
              </p>

              <div
                style={{
                  ...styles.modalBadge,
                  color:
                    getEventColor(
                      selectedEvent.type
                    ),
                  background:
                    getEventBackground(
                      selectedEvent.type
                    ),
                }}
              >
                {selectedEvent.type}
              </div>

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
          Attendance Portal • Tuition Calendar • 2026
        </footer>

      </div>
    </main>
  );
}

function Legend({
  icon,
  color,
  background,
  title,
  description,
}: {
  icon: string;
  color: string;
  background: string;
  title: string;
  description: string;
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

      <div>
        <strong style={styles.legendTitle}>
          {title}
        </strong>

        <p style={styles.legendDescription}>
          {description}
        </p>
      </div>

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
    padding: "16px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "1100px",
    margin: "0 auto",
  },

  header: {
    background: "white",
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "16px",
    boxShadow:
      "0 6px 20px rgba(15,23,42,0.08)",
  },

  smallLabel: {
    color: "#2563eb",
    fontSize: "10px",
    fontWeight: "800",
    letterSpacing: "1.5px",
    marginBottom: "6px",
  },

  title: {
    margin: 0,
    color: "#172554",
    fontSize: "27px",
    fontWeight: "800",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  dashboardButton: {
    border: "none",
    background: "#1e3a8a",
    color: "white",
    padding: "10px 15px",
    borderRadius: "9px",
    fontWeight: "700",
    cursor: "pointer",
  },

  calendarCard: {
    background: "white",
    borderRadius: "18px",
    padding: "16px",
    boxShadow:
      "0 6px 20px rgba(15,23,42,0.08)",
    overflow: "hidden",
  },

  calendarTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "15px",
  },

  monthTitle: {
    minWidth: "180px",
    textAlign: "center",
    color: "#172554",
    fontSize: "22px",
    fontWeight: "800",
  },

  navigationButton: {
    width: "40px",
    height: "40px",
    border: "none",
    borderRadius: "9px",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: "25px",
    fontWeight: "800",
    cursor: "pointer",
  },

  todayButton: {
    display: "block",
    margin: "14px auto",
    border: "none",
    background: "#2563eb",
    color: "white",
    padding: "9px 16px",
    borderRadius: "9px",
    fontWeight: "700",
    cursor: "pointer",
  },

  weekGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(7,minmax(0,1fr))",
    gap: "4px",
  },

  weekDay: {
    textAlign: "center",
    padding: "9px 3px",
    background: "#eff6ff",
    color: "#1e3a8a",
    fontWeight: "800",
    fontSize: "11px",
    borderRadius: "7px",
  },

  sundayHeader: {
    background: "#fef2f2",
    color: "#dc2626",
  },

  saturdayHeader: {
    background: "#eff6ff",
    color: "#2563eb",
  },

  calendarGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(7,minmax(0,1fr))",
    gap: "4px",
    marginTop: "4px",
  },

  emptyCell: {
    minHeight: "82px",
    background: "#f8fafc",
    borderRadius: "7px",
  },

  dayCell: {
    minHeight: "82px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#e2e8f0",
    borderRadius: "7px",
    padding: "6px",
    background: "white",
    boxSizing: "border-box",
    textAlign: "left",
    overflow: "hidden",
  },

  todayCell: {
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "#2563eb",
    background: "#f8fbff",
  },

  sundayCell: {
    borderColor: "#fecaca",
    background: "#fffafa",
  },

  testCell: {
    borderColor: "#bfdbfe",
    background: "#f8fbff",
  },

  dayNumber: {
    color: "#334155",
    fontSize: "13px",
    fontWeight: "800",
    marginBottom: "5px",
  },

  todayNumber: {
    display: "inline-flex",
    width: "25px",
    height: "25px",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    background: "#2563eb",
    color: "white",
  },

  dayStatus: {
    display: "inline-block",
    padding: "3px 5px",
    borderRadius: "5px",
    fontSize: "8px",
    fontWeight: "900",
  },

  dayTitle: {
    marginTop: "5px",
    color: "#475569",
    fontSize: "9px",
    fontWeight: "700",
    lineHeight: 1.2,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  card: {
    background: "white",
    borderRadius: "18px",
    padding: "20px",
    marginTop: "16px",
    boxShadow:
      "0 6px 20px rgba(15,23,42,0.08)",
  },

  sectionTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "19px",
    fontWeight: "800",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "12px",
  },

  legendGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(200px,1fr))",
    gap: "10px",
    marginTop: "15px",
  },

  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "11px",
    borderRadius: "10px",
    background: "#f8fafc",
  },

  legendIcon: {
    width: "36px",
    height: "36px",
    borderRadius: "9px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "17px",
    flexShrink: 0,
  },

  legendTitle: {
    color: "#172554",
    fontSize: "13px",
  },

  legendDescription: {
    margin: "3px 0 0",
    color: "#64748b",
    fontSize: "11px",
  },

  eventList: {
    display: "grid",
    gap: "9px",
    marginTop: "15px",
  },

  eventCard: {
    width: "100%",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#e2e8f0",
    background: "#f8fafc",
    borderRadius: "10px",
    padding: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    textAlign: "left",
    cursor: "pointer",
  },

  eventInfo: {
    minWidth: 0,
  },

  eventDate: {
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "700",
  },

  eventTitle: {
    marginTop: "4px",
    color: "#172554",
    fontSize: "14px",
    fontWeight: "800",
  },

  eventDescription: {
    marginTop: "3px",
    color: "#64748b",
    fontSize: "11px",
  },

  typeBadge: {
    padding: "6px 8px",
    borderRadius: "999px",
    fontSize: "8px",
    fontWeight: "900",
    flexShrink: 0,
  },

  noEvents: {
    marginTop: "15px",
    padding: "16px",
    background: "#f8fafc",
    borderRadius: "10px",
    textAlign: "center",
    color: "#64748b",
    fontSize: "12px",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "15px",
    zIndex: 1000,
  },

  modal: {
    width: "100%",
    maxWidth: "400px",
    background: "white",
    borderRadius: "18px",
    padding: "24px",
    textAlign: "center",
    boxShadow:
      "0 20px 50px rgba(15,23,42,0.25)",
  },

  modalIcon: {
    fontSize: "40px",
    marginBottom: "7px",
  },

  modalTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "21px",
  },

  modalDate: {
    color: "#64748b",
    fontWeight: "700",
    fontSize: "12px",
    margin: "8px 0",
  },

  modalDescription: {
    color: "#475569",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  modalBadge: {
    display: "inline-block",
    padding: "7px 10px",
    borderRadius: "999px",
    fontSize: "9px",
    fontWeight: "900",
  },

  closeButton: {
    display: "block",
    width: "100%",
    marginTop: "18px",
    border: "none",
    background: "#1e3a8a",
    color: "white",
    padding: "10px",
    borderRadius: "9px",
    fontWeight: "800",
    cursor: "pointer",
  },

  footer: {
    textAlign: "center",
    padding: "20px 10px 8px",
    color: "#64748b",
    fontSize: "11px",
  },

  "@media (max-width: 600px)": {
    page: {
      padding: "10px",
    },

    header: {
      padding: "16px",
    },

    title: {
      fontSize: "23px",
    },

    subtitle: {
      fontSize: "12px",
    },

    dashboardButton: {
      width: "100%",
    },

    calendarCard: {
      padding: "8px",
    },

    monthTitle: {
      minWidth: "150px",
      fontSize: "18px",
    },

    navigationButton: {
      width: "36px",
      height: "36px",
    },

    weekDay: {
      padding: "8px 2px",
      fontSize: "9px",
    },

    dayCell: {
      minHeight: "68px",
      padding: "4px",
    },

    emptyCell: {
      minHeight: "68px",
    },

    dayNumber: {
      fontSize: "11px",
    },

    dayStatus: {
      fontSize: "7px",
      padding: "2px 3px",
    },

    dayTitle: {
      fontSize: "7px",
    },

    card: {
      padding: "15px",
    },

    eventCard: {
      padding: "10px",
    },

    eventTitle: {
      fontSize: "12px",
    },

    eventDescription: {
      fontSize: "9px",
    },

    typeBadge: {
      fontSize: "7px",
      padding: "5px 6px",
    },
  },
};