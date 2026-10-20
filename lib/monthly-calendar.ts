export type MonthlyCalendarEvent = {
  date: string;
  title: "Monthly MahaTest" | "Monthly Result";
  type: "test";
  description: string;
};

const MONTHLY_MAHATEST_START_MONTH = "2026-10";
const FIRST_MONTHLY_MAHATEST_DATE = "2026-10-03";

function dateKey(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getMonthlyMahaTestDate(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || year < 1 || month < 1 || month > 12) return "";
  if (monthKey < MONTHLY_MAHATEST_START_MONTH) return "";
  if (monthKey === MONTHLY_MAHATEST_START_MONTH) return FIRST_MONTHLY_MAHATEST_DATE;

  const monthIndex = month - 1;
  const daysInMonth = new Date(year, month, 0).getDate();

  // Look for Saturday among the month's final three dates: 29, 30 and 31.
  if (daysInMonth >= 29) {
    for (let day = Math.max(29, daysInMonth - 2); day <= daysInMonth; day += 1) {
      if (new Date(year, monthIndex, day).getDay() === 6) {
        return dateKey(year, monthIndex, day);
      }
    }

    // Keep the academy's requested fallback when none of those dates is Saturday.
    if (daysInMonth === 30) return dateKey(year, monthIndex, 29);
    if (daysInMonth === 31) return dateKey(year, monthIndex, 30);
  }

  // February has fewer than three month-end dates, so use its last Saturday.
  const lastDay = new Date(year, month, 0);
  while (lastDay.getDay() !== 6) lastDay.setDate(lastDay.getDate() - 1);
  return dateKey(year, monthIndex, lastDay.getDate());
}

export function getMonthlyResultDate(monthKey: string) {
  const testDate = getMonthlyMahaTestDate(monthKey);
  if (!testDate) return "";
  const [year, month, day] = testDate.split("-").map(Number);
  const result = new Date(year, month - 1, day + 1);
  return dateKey(result.getFullYear(), result.getMonth(), result.getDate());
}

export function getMonthlyCalendarEvents(year: number, monthIndex: number): MonthlyCalendarEvent[] {
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const testDate = getMonthlyMahaTestDate(monthKey);
  if (!testDate) return [];
  const resultDate = getMonthlyResultDate(monthKey);
  const previousMonth = new Date(year, monthIndex - 1, 1);
  const previousKey = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, "0")}`;
  const previousResultDate = getMonthlyResultDate(previousKey);
  const events: MonthlyCalendarEvent[] = [];
  if (previousResultDate.startsWith(monthKey)) {
    events.push({
      date: previousResultDate,
      title: "Monthly Result",
      type: "test",
      description: "Monthly result is scheduled for the day after the previous month's MahaTest.",
    });
  }
  events.push(
    {
      date: testDate,
      title: "Monthly MahaTest",
      type: "test",
      description: "Monthly MahaTest is scheduled at month end. The monthly result is scheduled for the following day.",
    },
    {
      date: resultDate,
      title: "Monthly Result",
      type: "test",
      description: "Monthly result is scheduled for the day after the MahaTest.",
    },
  );
  return events;
}

export function getMonthlyCalendarEvent(date: Date): MonthlyCalendarEvent | null {
  const key = dateKey(date.getFullYear(), date.getMonth(), date.getDate());
  const events = getMonthlyCalendarEvents(date.getFullYear(), date.getMonth());
  return events.find((event) => event.date === key) || null;
}
