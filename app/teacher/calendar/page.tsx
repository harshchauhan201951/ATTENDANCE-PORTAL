"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { getMonthlyCalendarEvent } from "../../../lib/monthly-calendar";
import { getTeacherAssignedStudentIds } from "../../../lib/teacher-assigned-students";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

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
  const [extraClassCounts, setExtraClassCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const assignedIds = await getTeacherAssignedStudentIds(supabase);
        if (assignedIds?.length === 0) return;
        let query = supabase.from("extra_class_attendance").select("student_id,extra_class_date");
        if (assignedIds) query = query.in("student_id", assignedIds);
        const { data, error } = await query;
        if (error) throw error;
        const counts: Record<string, Set<number>> = {};
        for (const row of data || []) {
          const date = String(row.extra_class_date || "").slice(0, 10);
          const studentId = Number(row.student_id);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
          (counts[date] ||= new Set()).add(studentId);
        }
        if (active) setExtraClassCounts(Object.fromEntries(Object.entries(counts).map(([date, ids]) => [date, ids.size])));
      } catch (error) {
        console.error("Calendar extra-class load failed:", error);
      }
    })();
    return () => { active = false; };
  }, []);

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

    const monthlyEvent = getMonthlyCalendarEvent(date);
    if (monthlyEvent) return monthlyEvent;

    const extraClassCount = extraClassCounts[dateKey(date)] || 0;
    if (extraClassCount > 0) {
      return { date: dateKey(date), title: "Extra Class", type: "class", description: `Extra Class held; attendance marked for ${extraClassCount} student${extraClassCount === 1 ? "" : "s"}.` };
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

  const vipCalendarDates = calendarDays.filter((date): date is Date => Boolean(date));
  const vipHolidayCount = holidays.filter((holiday) => holiday.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}-`)).length;
  const vipTestCount = vipCalendarDates.filter((date) => getDayInfo(date)?.type === "test").length;
  const vipWorkingDays = vipCalendarDates.filter((date) => getDayInfo(date)?.type !== "holiday").length;

  return (
    <main className="racer-vip-module-page racer-vip-calendar-page">
      <div className="racer-vip-phone">
        <header className="racer-vip-header">
          <button className="racer-vip-icon-btn" type="button" aria-label="Menu"><Icon name="menu" /></button>
          <div className="racer-vip-brand">
            <img src="/racer-academy-icon.png" alt="RACER ACADEMY" />
            <div>
              <div className="racer-vip-brand-title">RACER ACADEMY</div>
              <div className="racer-vip-brand-subtitle">TEACHER CONTROL CENTER</div>
            </div>
          </div>
          <div className="racer-vip-header-right">
            <div className="racer-vip-avatar">TC</div>
            <button className="racer-vip-icon-btn" type="button" aria-label="Notifications"><Icon name="bell" /></button>
          </div>
        </header>

        <section className="racer-vip-page-heading">
          <div className="racer-vip-heading-icon"><Icon name="calendar" /></div>
          <div className="racer-vip-heading-copy">
            <h1>ACADEMY CALENDAR</h1>
            <p>View holidays, tests and academy schedule</p>
          </div>
          <div className="racer-vip-date-tile">
            <span><Icon name="calendar" /></span>
            <span>
              <small>Date Range</small>
              <strong>{formatDate(new Date(year, month, 1))} - {formatDate(new Date(year, month, daysInMonth))}</strong>
            </span>
          </div>
        </section>

        <section className="racer-vip-calendar-card racer-vip-card">
          <div className="racer-vip-calendar-top">
            <button className="racer-vip-calendar-nav" type="button" onClick={previousMonth} aria-label="Previous month"><Icon name="chevron-left" /></button>
            <div className="racer-vip-month-title"><Icon name="calendar" /><span>{monthNames[month]} {year}</span></div>
            <button className="racer-vip-calendar-nav" type="button" onClick={nextMonth} aria-label="Next month"><Icon name="chevron-right" /></button>
          </div>
          <button className="racer-vip-today" type="button" onClick={goToday}>Today</button>

          <div className="racer-vip-calendar-grid-head">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className={`racer-vip-cal-head ${day === "Sun" ? "sun" : day === "Mon" ? "mon" : day === "Sat" ? "sat" : ""}`}>{day}</div>)}
          </div>

          <div className="racer-vip-calendar-grid">
            {calendarDays.map((date, index) => {
              if (!date) return <div key={`empty-${index}`} className="racer-vip-cal-day empty" />;
              const info = getDayInfo(date);
              const holiday = getHoliday(date);
              const monthlyEvent = info?.type === "test" && info.title.startsWith("Monthly ") ? info : null;
              const extraClass = info?.title === "Extra Class" ? info : null;
              const monthlyTone = monthlyEvent?.title === "Monthly Result" ? "monthly-result" : monthlyEvent ? "monthly-mahatest" : "";
              const sundayClass = isSundayClassDate(date);
              const mondayOff = isMondayOffDate(date);
              const saturday = isSaturday(date);
              const todayDate = dateKey(date) === dateKey(today);
              return (
                <button
                  type="button"
                  key={dateKey(date)}
                  className={`racer-vip-cal-day ${todayDate ? "today" : ""} ${holiday ? "holiday" : ""} ${sundayClass && !monthlyEvent && !extraClass ? "sunday-class" : ""} ${mondayOff && !holiday && !monthlyEvent && !extraClass ? "monday-off" : ""} ${(saturday || monthlyEvent) && !holiday && !extraClass ? "test" : ""} ${extraClass ? "extra-class-day" : !holiday ? monthlyTone : ""}`}
                  style={extraClass ? { background: "linear-gradient(145deg,#e4faff,#aee8ec)", boxShadow: "inset 0 0 0 1px #28a5af" } : monthlyEvent ? { background: monthlyEvent.title === "Monthly Result" ? "linear-gradient(145deg,#e0fbfa,#b8e6ec)" : "linear-gradient(145deg,#fff8e5,#f4d778)", boxShadow: monthlyEvent.title === "Monthly Result" ? "inset 0 0 0 1px #52b8bd" : "inset 0 0 0 1px #d4a72c" } : undefined}
                  onClick={() => info && setSelectedEvent(info)}
                >
                  <span className="racer-vip-cal-number">{date.getDate()}</span>
                  {holiday ? <span className="racer-vip-cal-pill holiday-pill">{holiday.title}</span> : monthlyEvent ? <><span className={`racer-vip-cal-pill ${monthlyTone}-pill`} style={monthlyEvent.title === "Monthly Result" ? { background: "linear-gradient(120deg,#075985,#0f8b8d)", color: "#f0ffff", border: "1px solid #70d3d0", boxShadow: "0 2px 6px rgba(7,89,133,.24)", whiteSpace: "normal", overflow: "visible", textOverflow: "clip", overflowWrap: "anywhere" } : { background: "linear-gradient(120deg,#3c176b,#7042b5)", color: "#fff3bd", border: "1px solid #e7bf50", boxShadow: "0 2px 6px rgba(60,23,107,.24)", whiteSpace: "normal", overflow: "visible", textOverflow: "clip", overflowWrap: "anywhere" }}>{monthlyEvent.title === "Monthly Result" ? "📢 Monthly Result" : "⭐ Monthly MahaTest"}</span>{monthlyEvent.title === "Monthly Result" && mondayOff && <span className="racer-vip-cal-pill off-pill">OFF · Monday</span>}</> : extraClass ? <span className="racer-vip-cal-pill" style={{ background: "linear-gradient(120deg,#087f8c,#20b9b0)", color: "#fff", border: "1px solid #6ad9d2", whiteSpace: "normal", overflowWrap: "anywhere" }}>✨ EXTRA CLASS ({extraClassCounts[dateKey(date)]})</span> : sundayClass ? <span className="racer-vip-cal-pill class-pill">CLASS</span> : mondayOff ? <span className="racer-vip-cal-pill off-pill">OFF</span> : saturday ? <span className="racer-vip-cal-pill test-pill">TEST</span> : <span className="racer-vip-cal-small">Tuition</span>}
                </button>
              );
            })}
          </div>

          <div className="racer-vip-calendar-legend">
            <span><i className="holiday-dot" />Holiday</span>
            <span><i className="test-dot" />Weekly Test</span>
            <span><i className="class-dot" />Sunday Class</span>
            <span><i className="off-dot" />Monday Off</span>
          </div>
        </section>

        <section className="racer-vip-month-summary">
          <div className="racer-vip-summary-title"><Icon name="calendar" /><span>This Month</span></div>
          <div className="racer-vip-summary-grid">
            <div><span className="summary-icon holiday"><Icon name="calendar" /></span><small>Holidays</small><b>{vipHolidayCount}</b></div>
            <div><span className="summary-icon test"><Icon name="check" /></span><small>Tests</small><b>{vipTestCount}</b></div>
            <div><span className="summary-icon working"><Icon name="users" /></span><small>Working Days</small><b>{vipWorkingDays}</b></div>
          </div>
        </section>

        <section className="racer-vip-calendar-info">
          <div className="racer-vip-info-title">{monthNames[month]} Schedule</div>
          <div className="racer-vip-info-grid">
            <div><strong>Tuesday - Friday</strong><span>Regular Tuition Classes</span></div>
            <div><strong>Saturday</strong><span>Weekly Test</span></div>
            <div><strong>Sunday</strong><span>Regular Tuition Classes</span></div>
            <div><strong>Monday</strong><span>Tuition Closed</span></div>
          </div>
        </section>

        <section className="racer-vip-holiday-list">
          <div className="racer-vip-info-title">Tuition Holidays</div>
          {holidays.filter((holiday) => holiday.date.startsWith(String(year))).length === 0 ? (
            <div className="racer-vip-empty">No special holidays added for this year.</div>
          ) : (
            <div className="racer-vip-holiday-rows">
              {holidays.filter((holiday) => holiday.date.startsWith(String(year))).map((holiday) => (
                <button type="button" key={holiday.date} onClick={() => setSelectedEvent(holiday)}>
                  <span>{formatDate(new Date(`${holiday.date}T00:00:00`))}</span>
                  <strong>{holiday.title}</strong>
                </button>
              ))}
            </div>
          )}
        </section>

        {selectedEvent && (
          <div className="racer-vip-modal-overlay" onClick={() => setSelectedEvent(null)}>
            <div className="racer-vip-modal" onClick={(e) => e.stopPropagation()}>
              <div className="racer-vip-modal-icon"><Icon name={selectedEvent.type === "test" ? "check" : "calendar"} /></div>
              <h2>{selectedEvent.title}</h2>
              <p className="date">{formatDate(new Date(`${selectedEvent.date}T00:00:00`))}</p>
              <p>{selectedEvent.description}</p>
              <button type="button" onClick={() => setSelectedEvent(null)}>Close</button>
            </div>
          </div>
        )}

        <div className="racer-vip-bottom-nav">
          <button type="button" onClick={() => window.history.back()}><Icon name="back" />Back</button>
          <div className="racer-vip-footer-brand"><strong>RACER ACADEMY</strong><small>TEACHER CONTROL CENTER</small></div>
          <button type="button" onClick={() => { window.location.href = "/teacher"; }}><Icon name="home" />Dashboard</button>
        </div>
      </div>
    </main>
  );
}

function Icon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (name) {
    case "menu": return <svg {...common}><path d="M4 6h16M4 12h16M4 18h16" /></svg>;
    case "bell": return <svg {...common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>;
    case "calendar": return <svg {...common}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 9h18" /></svg>;
    case "coins": return <svg {...common}><circle cx="8" cy="8" r="4" /><path d="M8 4h8a4 4 0 0 1 0 8h-1M8 12v4a4 4 0 0 0 4 4h4a4 4 0 0 0 0-8h-4" /></svg>;
    case "users": return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case "search": return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>;
    case "download": return <svg {...common}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>;
    case "eye": return <svg {...common}><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="2.5" /></svg>;
    case "edit": return <svg {...common}><path d="m4 20 4.2-1 9.7-9.7a2 2 0 0 0-2.8-2.8L5.4 16.2 4 20Z" /><path d="m13.5 7.5 3 3" /></svg>;
    case "trash": return <svg {...common}><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 14h10l1-14M9 7l1-3h4l1 3" /></svg>;
    case "receipt": return <svg {...common}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>;
    case "back": return <svg {...common}><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>;
    case "home": return <svg {...common}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></svg>;
    case "chevron-left": return <svg {...common}><path d="m14 6-6 6 6 6" /></svg>;
    case "chevron-right": return <svg {...common}><path d="m10 6 6 6-6 6" /></svg>;
    case "check": return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
    default: return <svg {...common}><circle cx="12" cy="12" r="9" /></svg>;
  }
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
    border: "1px solid #c7d2fe",
    background: "linear-gradient(180deg,#ffffff,#f8fbff)",
    borderRadius: "16px",
    padding: "18px",
    boxShadow:
      "0 4px 15px rgba(15,23,42,0.07)",
    overflowX: "hidden",
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
      "repeat(7,minmax(0,1fr))",
    gap: "5px",
    minWidth: "0",
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
      "repeat(7,minmax(0,1fr))",
    gap: "5px",
    marginTop: "5px",
    minWidth: "0",
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


