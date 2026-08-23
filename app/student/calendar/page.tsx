"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type EventType = "CLASS" | "EXAM" | "HOLIDAY" | "EVENT";

type CalendarEvent = {
id: number;
date: string;
title: string;
type: EventType;
description: string;
};

const events: CalendarEvent[] = [
{
id: 1,
date: "2026-08-25",
title: "Regular Classes",
type: "CLASS",
description: "Regular college classes",
},
{
id: 2,
date: "2026-08-29",
title: "Saturday Holiday",
type: "HOLIDAY",
description: "Weekly holiday",
},
{
id: 3,
date: "2026-09-05",
title: "Class Test",
type: "EXAM",
description: "Internal class test",
},
{
id: 4,
date: "2026-09-15",
title: "College Event",
type: "EVENT",
description: "Important college event",
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

export default function StudentCalendarPage() {
const router = useRouter();

const today = new Date();

const [currentMonth, setCurrentMonth] = useState(
new Date(today.getFullYear(), today.getMonth(), 1)
);

const year = currentMonth.getFullYear();
const month = currentMonth.getMonth();

const daysInMonth = new Date(year, month + 1, 0).getDate();

const firstDay = new Date(year, month, 1).getDay();

const calendarDays = useMemo(() => {
const days: Array<number | null> = [];

```
for (let i = 0; i < firstDay; i++) {
  days.push(null);
}

for (let day = 1; day <= daysInMonth; day++) {
  days.push(day);
}

return days;
```

}, [firstDay, daysInMonth]);

function previousMonth() {
setCurrentMonth(new Date(year, month - 1, 1));
}

function nextMonth() {
setCurrentMonth(new Date(year, month + 1, 1));
}

function goToday() {
setCurrentMonth(
new Date(today.getFullYear(), today.getMonth(), 1)
);
}

function getDateString(day: number) {
const monthString = String(month + 1).padStart(2, "0");
const dayString = String(day).padStart(2, "0");

```
return `${year}-${monthString}-${dayString}`;
```

}

function getDayEvents(day: number) {
const date = getDateString(day);

```
return events.filter((event) => event.date === date);
```

}

function isToday(day: number) {
return (
day === today.getDate() &&
month === today.getMonth() &&
year === today.getFullYear()
);
}

function getEventColor(type: EventType) {
switch (type) {
case "CLASS":
return "#2563eb";
case "EXAM":
return "#dc2626";
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
case "CLASS":
return "#eff6ff";
case "EXAM":
return "#fef2f2";
case "HOLIDAY":
return "#f0fdf4";
case "EVENT":
return "#f5f3ff";
default:
return "#f8fafc";
}
}

return ( <main style={styles.page}> <div style={styles.container}> <header style={styles.header}> <div> <div style={styles.smallLabel}>STUDENT PORTAL</div>

```
        <h1 style={styles.title}>
          🗓️ Student Calendar
        </h1>

        <p style={styles.subtitle}>
          View your classes, exams, holidays and important dates
        </p>
      </div>

      <button
        type="button"
        onClick={() => router.push("/student/dashboard")}
        style={styles.dashboardButton}
      >
        ← Student Dashboard
      </button>
    </header>

    <section style={styles.calendarCard}>
      <div style={styles.calendarTop}>
        <button
          type="button"
          onClick={previousMonth}
          style={styles.navigationButton}
          aria-label="Previous month"
        >
          ←
        </button>

        <h2 style={styles.monthTitle}>
          {monthNames[month]} {year}
        </h2>

        <button
          type="button"
          onClick={nextMonth}
          style={styles.navigationButton}
          aria-label="Next month"
        >
          →
        </button>
      </div>

      <button
        type="button"
        onClick={goToday}
        style={styles.todayButton}
      >
        📍 Today
      </button>

      <div style={styles.weekGrid}>
        {weekDays.map((day) => (
          <div key={day} style={styles.weekDay}>
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

          const dayEvents = getDayEvents(day);

          return (
            <div
              key={day}
              style={{
                ...styles.dayCell,
                ...(isToday(day) ? styles.todayCell : {}),
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

              <div style={styles.eventsContainer}>
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    title={event.description}
                    style={{
                      ...styles.eventBadge,
                      color: getEventColor(event.type),
                      background: getEventBackground(
                        event.type
                      ),
                    }}
                  >
                    {event.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>

    <section style={styles.card}>
      <h2 style={styles.sectionTitle}>
        📌 Calendar Guide
      </h2>

      <p style={styles.sectionSubtitle}>
        Understand the different calendar entries
      </p>

      <div style={styles.legendGrid}>
        <Legend
          color="#2563eb"
          background="#eff6ff"
          title="Classes"
          description="Regular classes and lectures"
        />

        <Legend
          color="#dc2626"
          background="#fef2f2"
          title="Exams"
          description="Tests and examinations"
        />

        <Legend
          color="#16a34a"
          background="#f0fdf4"
          title="Holidays"
          description="College holidays"
        />

        <Legend
          color="#7c3aed"
          background="#f5f3ff"
          title="Events"
          description="Important college events"
        />
      </div>
    </section>

    <section style={styles.card}>
      <h2 style={styles.sectionTitle}>
        🔔 Upcoming Dates
      </h2>

      <p style={styles.sectionSubtitle}>
        Important dates currently available in the calendar
      </p>

      <div style={styles.eventList}>
        {events.map((event) => (
          <div
            key={event.id}
            style={{
              ...styles.eventCard,
              borderLeft: `5px solid ${getEventColor(
                event.type
              )}`,
            }}
          >
            <div style={styles.eventInfo}>
              <div style={styles.eventDate}>
                📅 {event.date}
              </div>

              <h3 style={styles.eventTitle}>
                {event.title}
              </h3>

              <p style={styles.eventDescription}>
                {event.description}
              </p>
            </div>

            <span
              style={{
                ...styles.typeBadge,
                color: getEventColor(event.type),
                background: getEventBackground(event.type),
              }}
            >
              {event.type}
            </span>
          </div>
        ))}
      </div>
    </section>

    <footer style={styles.footer}>
      Attendance Portal • Student Calendar • 2026
    </footer>
  </div>
</main>
```

);
}

function Legend({
color,
background,
title,
description,
}: {
color: string;
background: string;
title: string;
description: string;
}) {
return ( <div style={styles.legendItem}>
<div
style={{
...styles.legendIcon,
color,
background,
}}
>
● </div>

```
  <div>
    <strong style={styles.legendTitle}>
      {title}
    </strong>

    <p style={styles.legendDescription}>
      {description}
    </p>
  </div>
</div>
```

);
}

const styles: {
[key: string]: React.CSSProperties;
} = {
page: {
minHeight: "100vh",
background:
"linear-gradient(135deg,#eff6ff,#f8fafc,#eef2ff)",
padding: "20px 15px",
boxSizing: "border-box",
fontFamily: "Arial, Helvetica, sans-serif",
},

container: {
width: "100%",
maxWidth: "1200px",
margin: "0 auto",
},

header: {
background: "white",
borderRadius: "20px",
padding: "22px",
display: "flex",
alignItems: "center",
justifyContent: "space-between",
gap: "18px",
flexWrap: "wrap",
marginBottom: "20px",
boxShadow:
"0 8px 25px rgba(15,23,42,0.08)",
},

smallLabel: {
color: "#2563eb",
fontSize: "11px",
fontWeight: "800",
letterSpacing: "2px",
marginBottom: "6px",
},

title: {
margin: 0,
color: "#172554",
fontSize: "29px",
fontWeight: "800",
},

subtitle: {
margin: "7px 0 0",
color: "#64748b",
fontSize: "14px",
},

dashboardButton: {
border: "none",
background: "#1e3a8a",
color: "white",
padding: "12px 18px",
borderRadius: "10px",
fontWeight: "700",
cursor: "pointer",
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
minWidth: "200px",
margin: 0,
textAlign: "center",
color: "#172554",
fontSize: "25px",
fontWeight: "800",
},

navigationButton: {
width: "43px",
height: "43px",
border: "none",
borderRadius: "11px",
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
},

weekDay: {
textAlign: "center",
padding: "12px 4px",
background: "#eff6ff",
color: "#1e3a8a",
fontWeight: "800",
fontSize: "13px",
borderRadius: "8px",
},

calendarGrid: {
display: "grid",
gridTemplateColumns:
"repeat(7,minmax(0,1fr))",
gap: "5px",
marginTop: "5px",
},

emptyCell: {
minHeight: "92px",
background: "#f8fafc",
borderRadius: "8px",
},

dayCell: {
minHeight: "92px",
border: "1px solid #e2e8f0",
borderRadius: "8px",
padding: "7px",
background: "white",
boxSizing: "border-box",
},

todayCell: {
border: "2px solid #2563eb",
background: "#f8fbff",
},

dayNumber: {
width: "28px",
height: "28px",
display: "flex",
alignItems: "center",
justifyContent: "center",
borderRadius: "50%",
color: "#334155",
fontSize: "13px",
fontWeight: "700",
},

todayNumber: {
background: "#2563eb",
color: "white",
},

eventsContainer: {
marginTop: "5px",
display: "flex",
flexDirection: "column",
gap: "4px",
},

eventBadge: {
padding: "4px 5px",
borderRadius: "5px",
fontSize: "10px",
fontWeight: "700",
overflow: "hidden",
textOverflow: "ellipsis",
whiteSpace: "nowrap",
},

card: {
background: "white",
borderRadius: "20px",
padding: "24px",
marginTop: "20px",
boxShadow:
"0 8px 25px rgba(15,23,42,0.08)",
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

legendGrid: {
display: "grid",
gridTemplateColumns:
"repeat(auto-fit,minmax(220px,1fr))",
gap: "15px",
marginTop: "18px",
},

legendItem: {
display: "flex",
alignItems: "center",
gap: "12px",
padding: "14px",
borderRadius: "12px",
background: "#f8fafc",
},

legendIcon: {
width: "40px",
height: "40px",
borderRadius: "10px",
display: "flex",
alignItems: "center",
justifyContent: "center",
fontSize: "18px",
flexShrink: 0,
},

legendTitle: {
color: "#172554",
fontSize: "14px",
},

legendDescription: {
margin: "3px 0 0",
color: "#64748b",
fontSize: "12px",
},

eventList: {
display: "grid",
gap: "12px",
marginTop: "18px",
},

eventCard: {
background: "#f8fafc",
borderRadius: "12px",
padding: "15px 17px",
display: "flex",
alignItems: "center",
justifyContent: "space-between",
gap: "15px",
},

eventInfo: {
minWidth: 0,
},

eventDate: {
color: "#64748b",
fontSize: "12px",
fontWeight: "700",
},

eventTitle: {
margin: "5px 0 0",
color: "#172554",
fontSize: "16px",
},

eventDescription: {
margin: "4px 0 0",
color: "#64748b",
fontSize: "12px",
},

typeBadge: {
padding: "7px 10px",
borderRadius: "999px",
fontSize: "10px",
fontWeight: "800",
flexShrink: 0,
},

footer: {
textAlign: "center",
padding: "25px 10px 10px",
color: "#64748b",
fontSize: "12px",
},

"@media (max-width: 600px)": {
title: {
fontSize: "24px",
},

```
monthTitle: {
  minWidth: "160px",
  fontSize: "20px",
},

dayCell: {
  minHeight: "72px",
  padding: "4px",
},

emptyCell: {
  minHeight: "72px",
},

eventBadge: {
  fontSize: "8px",
  padding: "3px",
},
```

},
};
