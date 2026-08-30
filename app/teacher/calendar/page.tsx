"use client";

import { useMemo, useState } from "react";

type CalendarEvent = {
  date: string;
  title: string;
  type: "holiday" | "test" | "class";
  description: string;
};

const holidays: CalendarEvent[] = [
  // =========================
  // 2025
  // =========================
  {
    date: "2025-01-01",
    title: "New Year's Day",
    type: "holiday",
    description: "Tuition holiday.",
  },
  {
    date: "2025-01-14",
    title: "Makar Sankranti",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2025-01-26",
    title: "Republic Day",
    type: "holiday",
    description: "National holiday.",
  },
  {
    date: "2025-02-02",
    title: "Basant Panchami",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2025-02-26",
    title: "Maha Shivratri",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2025-03-14",
    title: "Holi",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2025-04-06",
    title: "Ram Navami",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2025-04-10",
    title: "Mahavir Jayanti",
    type: "holiday",
    description: "Festival holiday.",
  },
  {
    date: "2025-05-12",
    title: "Buddha Purnima",
    type: "holiday",
    description: "Festival holiday.",
  },
  {
    date: "2025-08-09",
    title: "Raksha Bandhan",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2025-08-15",
    title: "Independence Day",
    type: "holiday",
    description: "National holiday.",
  },
  {
    date: "2025-08-16",
    title: "Janmashtami",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2025-08-27",
    title: "Ganesh Chaturthi",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2025-10-02",
    title: "Gandhi Jayanti / Dussehra",
    type: "holiday",
    description: "National and Hindu festival holiday.",
  },
  {
    date: "2025-10-20",
    title: "Diwali",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2025-10-22",
    title: "Govardhan Puja",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2025-10-23",
    title: "Bhai Dooj",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2025-11-05",
    title: "Guru Nanak Jayanti",
    type: "holiday",
    description: "Festival holiday.",
  },
  {
    date: "2025-12-25",
    title: "Christmas Day",
    type: "holiday",
    description: "Christmas holiday.",
  },

  // =========================
  // 2026
  // =========================
  {
    date: "2026-01-01",
    title: "New Year's Day",
    type: "holiday",
    description: "Tuition holiday.",
  },
  {
    date: "2026-01-23",
    title: "Basant Panchami",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2026-01-26",
    title: "Republic Day",
    type: "holiday",
    description: "National holiday.",
  },
  {
    date: "2026-02-15",
    title: "Maha Shivratri",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2026-03-04",
    title: "Holi",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2026-03-26",
    title: "Ram Navami",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2026-05-01",
    title: "Buddha Purnima",
    type: "holiday",
    description: "Festival holiday.",
  },
  {
    date: "2026-08-15",
    title: "Independence Day",
    type: "holiday",
    description: "National holiday.",
  },
  {
    date: "2026-08-28",
    title: "Raksha Bandhan",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2026-09-04",
    title: "Janmashtami",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2026-09-14",
    title: "Ganesh Chaturthi",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2026-10-02",
    title: "Gandhi Jayanti",
    type: "holiday",
    description: "National holiday.",
  },
  {
    date: "2026-10-20",
    title: "Dussehra",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2026-11-08",
    title: "Diwali",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2026-11-09",
    title: "Govardhan Puja",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2026-11-11",
    title: "Bhai Dooj",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2026-11-24",
    title: "Guru Nanak Jayanti",
    type: "holiday",
    description: "Festival holiday.",
  },
  {
    date: "2026-12-25",
    title: "Christmas Day",
    type: "holiday",
    description: "Christmas holiday.",
  },

  // =========================
  // 2027
  // =========================
  {
    date: "2027-01-01",
    title: "New Year's Day",
    type: "holiday",
    description: "Tuition holiday.",
  },
  {
    date: "2027-01-26",
    title: "Republic Day",
    type: "holiday",
    description: "National holiday.",
  },
  {
    date: "2027-02-06",
    title: "Basant Panchami",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2027-03-06",
    title: "Maha Shivratri",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2027-03-22",
    title: "Holi",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2027-04-15",
    title: "Ram Navami",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2027-08-15",
    title: "Independence Day",
    type: "holiday",
    description: "National holiday.",
  },
  {
    date: "2027-08-17",
    title: "Raksha Bandhan",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2027-08-25",
    title: "Janmashtami",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2027-09-04",
    title: "Ganesh Chaturthi",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2027-10-02",
    title: "Gandhi Jayanti",
    type: "holiday",
    description: "National holiday.",
  },
  {
    date: "2027-10-09",
    title: "Dussehra",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2027-10-29",
    title: "Diwali",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2027-10-30",
    title: "Govardhan Puja",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2027-10-31",
    title: "Bhai Dooj",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2027-11-14",
    title: "Guru Nanak Jayanti",
    type: "holiday",
    description: "Festival holiday.",
  },
  {
    date: "2027-12-25",
    title: "Christmas Day",
    type: "holiday",
    description: "Christmas holiday.",
  },

  // =========================
  // 2028
  // =========================
  {
    date: "2028-01-01",
    title: "New Year's Day",
    type: "holiday",
    description: "Tuition holiday.",
  },
  {
    date: "2028-01-26",
    title: "Republic Day",
    type: "holiday",
    description: "National holiday.",
  },
  {
    date: "2028-02-26",
    title: "Maha Shivratri",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2028-03-11",
    title: "Holi",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2028-04-03",
    title: "Ram Navami",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2028-08-05",
    title: "Raksha Bandhan",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2028-08-13",
    title: "Janmashtami",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2028-08-15",
    title: "Independence Day",
    type: "holiday",
    description: "National holiday.",
  },
  {
    date: "2028-08-25",
    title: "Ganesh Chaturthi",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2028-09-30",
    title: "Dussehra",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2028-10-02",
    title: "Gandhi Jayanti",
    type: "holiday",
    description: "National holiday.",
  },
  {
    date: "2028-11-03",
    title: "Guru Nanak Jayanti",
    type: "holiday",
    description: "Festival holiday.",
  },
  {
    date: "2028-11-17",
    title: "Diwali",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2028-11-18",
    title: "Govardhan Puja",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2028-11-19",
    title: "Bhai Dooj",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2028-12-25",
    title: "Christmas Day",
    type: "holiday",
    description: "Christmas holiday.",
  },

  // =========================
  // 2029
  // =========================
  {
    date: "2029-01-01",
    title: "New Year's Day",
    type: "holiday",
    description: "Tuition holiday.",
  },
  {
    date: "2029-01-26",
    title: "Republic Day",
    type: "holiday",
    description: "National holiday.",
  },
  {
    date: "2029-02-13",
    title: "Maha Shivratri",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2029-03-02",
    title: "Holi",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2029-03-24",
    title: "Ram Navami",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2029-08-15",
    title: "Independence Day",
    type: "holiday",
    description: "National holiday.",
  },
  {
    date: "2029-08-23",
    title: "Raksha Bandhan",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2029-09-01",
    title: "Janmashtami",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2029-09-12",
    title: "Ganesh Chaturthi",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2029-10-02",
    title: "Gandhi Jayanti",
    type: "holiday",
    description: "National holiday.",
  },
  {
    date: "2029-10-17",
    title: "Dussehra",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2029-11-05",
    title: "Diwali",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2029-11-06",
    title: "Govardhan Puja",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2029-11-07",
    title: "Bhai Dooj",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2029-11-22",
    title: "Guru Nanak Jayanti",
    type: "holiday",
    description: "Festival holiday.",
  },
  {
    date: "2029-12-25",
    title: "Christmas Day",
    type: "holiday",
    description: "Christmas holiday.",
  },

  // =========================
  // 2030
  // =========================
  {
    date: "2030-01-01",
    title: "New Year's Day",
    type: "holiday",
    description: "Tuition holiday.",
  },
  {
    date: "2030-01-26",
    title: "Republic Day",
    type: "holiday",
    description: "National holiday.",
  },
  {
    date: "2030-02-03",
    title: "Basant Panchami",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2030-03-04",
    title: "Maha Shivratri",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2030-03-22",
    title: "Holi",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2030-04-13",
    title: "Ram Navami",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2030-08-13",
    title: "Raksha Bandhan",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2030-08-15",
    title: "Independence Day",
    type: "holiday",
    description: "National holiday.",
  },
  {
    date: "2030-08-21",
    title: "Janmashtami",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2030-09-03",
    title: "Ganesh Chaturthi",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2030-10-02",
    title: "Gandhi Jayanti",
    type: "holiday",
    description: "National holiday.",
  },
  {
    date: "2030-10-07",
    title: "Dussehra",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2030-10-26",
    title: "Diwali",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2030-10-27",
    title: "Govardhan Puja",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2030-10-28",
    title: "Bhai Dooj",
    type: "holiday",
    description: "Hindu festival holiday.",
  },
  {
    date: "2030-11-12",
    title: "Guru Nanak Jayanti",
    type: "holiday",
    description: "Festival holiday.",
  },
  {
    date: "2030-12-25",
    title: "Christmas Day",
    type: "holiday",
    description: "Christmas holiday.",
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
  return holidays.find(
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

  return (
    key >= "2026-08-30" &&
    isSunday(date)
  );
}

function isMondayOffDate(date: Date) {
  const key = dateKey(date);

  return (
    key >= "2026-08-31" &&
    isMonday(date)
  );
}

export default function TeacherCalendarPage() {
  const today = new Date();

  const [currentMonth, setCurrentMonth] =
    useState(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    );

  const [selectedEvent, setSelectedEvent] =
    useState<CalendarEvent | null>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(
    year,
    month,
    1
  ).getDay();

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

    for (
      let day = 1;
      day <= daysInMonth;
      day++
    ) {
      days.push(
        new Date(year, month, day)
      );
    }

    return days;
  }, [
    year,
    month,
    firstDay,
    daysInMonth,
  ]);

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

  function getDayInfo(
    date: Date
  ): CalendarEvent | null {
    const holiday = getHoliday(date);

    // Special holidays always have priority.
    if (holiday) {
      return holiday;
    }

    // FROM 30 AUGUST 2026:
    // Sunday becomes a regular CLASS day.
    if (isSundayClassDate(date)) {
      return {
        date: dateKey(date),
        title: "Sunday Class",
        type: "class",
        description:
          "Sunday classes are open from 30 August 2026 onward.",
      };
    }

    // FROM 31 AUGUST 2026:
    // Every Monday is OFF.
    if (isMondayOffDate(date)) {
      return {
        date: dateKey(date),
        title: "Monday Off",
        type: "holiday",
        description:
          "Monday is the weekly tuition holiday from 31 August 2026 onward.",
      };
    }

    // BEFORE 30 AUGUST 2026:
    // Sundays remain OFF.
    if (isSunday(date)) {
      return {
        date: dateKey(date),
        title: "Sunday Off",
        type: "holiday",
        description:
          "Sunday was a weekly tuition holiday before 30 August 2026.",
      };
    }

    // Saturday remains Weekly Test.
    if (isSaturday(date)) {
      return {
        date: dateKey(date),
        title: "Weekly Test",
        type: "test",
        description:
          "Weekly test for tuition students.",
      };
    }

    return null;
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <div style={styles.badge}>
              TEACHER PORTAL
            </div>

            <h1 style={styles.title}>
              📅 Academic Calendar
            </h1>

            <p style={styles.subtitle}>
              Classes • Weekly Tests • Sundays •
              Holidays
            </p>
          </div>

          <a
            href="/teacher"
            style={styles.backButton}
          >
            ← Teacher Dashboard
          </a>
        </header>

        <section style={styles.legendCard}>
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

        <section style={styles.calendarCard}>
          <div style={styles.calendarTop}>
            <button
              type="button"
              onClick={previousMonth}
              style={styles.navButton}
            >
              ←
            </button>

            <div style={styles.monthTitle}>
              {monthNames[month]} {year}
            </div>

            <button
              type="button"
              onClick={nextMonth}
              style={styles.navButton}
            >
              →
            </button>
          </div>

          <button
            type="button"
            onClick={goToday}
            style={styles.todayButton}
          >
            Today
          </button>

          <div style={styles.weekGrid}>
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
              >
                {day}
              </div>
            ))}
          </div>

          <div style={styles.calendarGrid}>
            {calendarDays.map(
              (date, index) => {
                if (!date) {
                  return (
                    <div
                      key={`empty-${index}`}
                      style={styles.emptyDay}
                    />
                  );
                }

                const info =
                  getDayInfo(date);

                const sunday =
                  isSunday(date);

                const monday =
                  isMonday(date);

                const saturday =
                  isSaturday(date);

                const sundayClass =
                  isSundayClassDate(date);

                const mondayOff =
                  isMondayOffDate(date);

                const holiday =
                  getHoliday(date);

                const todayDate =
                  dateKey(date) ===
                  dateKey(today);

                return (
                  <button
                    type="button"
                    key={dateKey(date)}
                    onClick={() => {
                      if (info) {
                        setSelectedEvent(
                          info
                        );
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
                      !holiday
                        ? styles.mondayOff
                        : {}),
                      ...(saturday
                        ? styles.saturday
                        : {}),
                      ...(holiday
                        ? styles.holiday
                        : {}),
                    }}
                  >
                    <div
                      style={{
                        ...styles.dayNumber,
                        ...(todayDate
                          ? styles.todayNumber
                          : {}),
                      }}
                    >
                      {date.getDate()}
                    </div>

                    {holiday ? (
                      <>
                        <div
                          style={
                            styles.holidayLabel
                          }
                        >
                          🎉 HOLIDAY
                        </div>

                        <div
                          style={
                            styles.eventName
                          }
                        >
                          {holiday.title}
                        </div>
                      </>
                    ) : sundayClass ? (
                      <>
                        <div
                          style={
                            styles.classLabel
                          }
                        >
                          📚 CLASS
                        </div>

                        <div
                          style={styles.smallText}
                        >
                          Sunday Class
                        </div>
                      </>
                    ) : mondayOff ? (
                      <>
                        <div
                          style={styles.offLabel}
                        >
                          🔴 OFF
                        </div>

                        <div
                          style={styles.smallText}
                        >
                          Monday
                        </div>
                      </>
                    ) : sunday ? (
                      <>
                        <div
                          style={styles.offLabel}
                        >
                          🔴 OFF
                        </div>

                        <div
                          style={styles.smallText}
                        >
                          Sunday
                        </div>
                      </>
                    ) : saturday ? (
                      <>
                        <div
                          style={
                            styles.testLabel
                          }
                        >
                          📝 TEST
                        </div>

                        <div
                          style={styles.smallText}
                        >
                          Weekly Test
                        </div>
                      </>
                    ) : (
                      <>
                        <div
                          style={
                            styles.classLabel
                          }
                        >
                          📚 CLASS
                        </div>

                        <div
                          style={styles.smallText}
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
          <h2 style={styles.sectionTitle}>
            📋 {monthNames[month]} Schedule
          </h2>

          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <div style={styles.infoIcon}>
                📚
              </div>

              <div>
                <strong>
                  Tuesday - Friday
                </strong>

                <p>
                  Regular Tuition Classes
                </p>
              </div>
            </div>

            <div style={styles.infoItem}>
              <div style={styles.infoIcon}>
                📚
              </div>

              <div>
                <strong>
                  Every Sunday
                </strong>

                <p>
                  Regular Tuition Classes
                </p>
              </div>
            </div>

            <div style={styles.infoItem}>
              <div style={styles.infoIcon}>
                📝
              </div>

              <div>
                <strong>
                  Every Saturday
                </strong>

                <p>
                  Weekly Test
                </p>
              </div>
            </div>

            <div style={styles.infoItem}>
              <div style={styles.infoIcon}>
                🔴
              </div>

              <div>
                <strong>
                  Every Monday
                </strong>

                <p>
                  Tuition Closed
                </p>
              </div>
            </div>

            <div style={styles.infoItem}>
              <div style={styles.infoIcon}>
                🎉
              </div>

              <div>
                <strong>
                  Holidays
                </strong>

                <p>
                  Tuition Closed
                </p>
              </div>
            </div>
          </div>
        </section>

        <section style={styles.holidayCard}>
          <h2 style={styles.sectionTitle}>
            🎉 Tuition Holidays
          </h2>

          <div style={styles.holidayList}>
            {holidays
              .filter((holiday) =>
                holiday.date.startsWith(
                  String(year)
                )
              )
              .map((holiday) => (
                <button
                  type="button"
                  key={holiday.date}
                  onClick={() =>
                    setSelectedEvent(
                      holiday
                    )
                  }
                  style={styles.holidayRow}
                >
                  <strong>
                    {formatDate(
                      new Date(
                        `${holiday.date}T00:00:00`
                      )
                    )}
                  </strong>

                  <span>
                    🎉 {holiday.title}
                  </span>
                </button>
              ))}

            {holidays.filter(
              (holiday) =>
                holiday.date.startsWith(
                  String(year)
                )
            ).length === 0 && (
              <div style={styles.noHoliday}>
                No special holidays added for
                this year.
              </div>
            )}
          </div>
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
                {selectedEvent.type ===
                "test"
                  ? "📝"
                  : selectedEvent.type ===
                    "class"
                  ? "📚"
                  : "🎉"}
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

              <p
                style={
                  styles.modalDescription
                }
              >
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
          Attendance Portal • Teacher Calendar •
          2025–2030
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
    background: "#f5f7fb",
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
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#6b7280",
    fontSize: "14px",
  },

  backButton: {
    textDecoration: "none",
    background: "#111827",
    color: "white",
    padding: "11px 15px",
    borderRadius: "9px",
    fontWeight: "700",
    fontSize: "13px",
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
  },

  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    padding: "9px",
    background: "#f8fafc",
    borderRadius: "9px",
  },

  legendIcon: {
    width: "34px",
    height: "34px",
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
  },

  calendarCard: {
    background: "white",
    borderRadius: "16px",
    padding: "18px",
    boxShadow:
      "0 4px 15px rgba(15,23,42,0.07)",
    overflowX: "auto",
  },

  calendarTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "15px",
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
    border: "none",
    borderRadius: "9px",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: "20px",
    fontWeight: "800",
    cursor: "pointer",
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
      "repeat(7,minmax(80px,1fr))",
    gap: "5px",
    minWidth: "620px",
  },

  weekDay: {
    textAlign: "center",
    padding: "10px 4px",
    background: "#f1f5f9",
    color: "#334155",
    fontWeight: "800",
    fontSize: "12px",
    borderRadius: "7px",
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
      "repeat(7,minmax(80px,1fr))",
    gap: "5px",
    marginTop: "5px",
    minWidth: "620px",
  },

  emptyDay: {
    minHeight: "100px",
    background: "#f8fafc",
    borderRadius: "8px",
  },

  day: {
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
  },

  testLabel: {
    display: "inline-block",
    background: "#f5f3ff",
    color: "#7c3aed",
    padding: "5px 6px",
    borderRadius: "6px",
    fontSize: "9px",
    fontWeight: "900",
  },

  offLabel: {
    display: "inline-block",
    background: "#fef2f2",
    color: "#dc2626",
    padding: "5px 6px",
    borderRadius: "6px",
    fontSize: "9px",
    fontWeight: "900",
  },

  holidayLabel: {
    display: "inline-block",
    background: "#fff7ed",
    color: "#ea580c",
    padding: "5px 6px",
    borderRadius: "6px",
    fontSize: "9px",
    fontWeight: "900",
  },

  eventName: {
    marginTop: "6px",
    color: "#9a3412",
    fontSize: "9px",
    fontWeight: "700",
    lineHeight: 1.3,
  },

  smallText: {
    marginTop: "6px",
    color: "#6b7280",
    fontSize: "9px",
    fontWeight: "700",
  },

  infoCard: {
    background: "white",
    borderRadius: "16px",
    padding: "20px",
    marginTop: "18px",
    boxShadow:
      "0 4px 15px rgba(15,23,42,0.06)",
  },

  sectionTitle: {
    margin: 0,
    color: "#111827",
    fontSize: "20px",
    fontWeight: "800",
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: "10px",
    marginTop: "15px",
  },

  infoItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "13px",
    background: "#f8fafc",
    borderRadius: "10px",
  },

  infoIcon: {
    fontSize: "25px",
  },

  holidayCard: {
    background: "white",
    borderRadius: "16px",
    padding: "20px",
    marginTop: "18px",
    boxShadow:
      "0 4px 15px rgba(15,23,42,0.06)",
  },

  holidayList: {
    display: "grid",
    gap: "8px",
    marginTop: "15px",
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
  },

  modalIcon: {
    fontSize: "42px",
    marginBottom: "8px",
  },

  modalTitle: {
    margin: 0,
    color: "#111827",
    fontSize: "22px",
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
  },
};