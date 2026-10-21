import { studentCalendarHolidays } from "./student-calendar-events";

export type FestivalCelebration = {
  startDate: string;
  endDate: string;
  title: string;
  emoji: string;
  kind: "diwali" | "holi" | "navratri" | "new-year" | "general";
};

function shiftDate(dateKey: string, amount: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount, 12));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function daysBetween(from: string, to: string) {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

function dateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("hi-IN", { day: "numeric", month: "long", timeZone: "Asia/Kolkata" })
    .format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function indiaTodayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getActiveFestivalCelebrations(today = indiaTodayKey()): (FestivalCelebration & { dateRange: string; daysUntilStart: number; daysAfterEnd: number })[] {
  const holidays = studentCalendarHolidays.filter((event) =>
    event.type === "holiday" && !/weekly|monday off|sunday off/i.test(`${event.title} ${event.description}`)
  );
  const celebrations: FestivalCelebration[] = [];
  const groupedFestivalDates = new Set<string>();

  for (const diwali of holidays.filter((event) => /\bdiwali\b/i.test(event.title))) {
    const year = diwali.date.slice(0, 4);
    const diwaliGroup = holidays.filter((event) =>
      event.date.startsWith(`${year}-`) && /diwali|govardhan|bhai dooj/i.test(event.title)
    );
    const lastFestivalDay = diwaliGroup.reduce((latest, event) => event.date > latest ? event.date : latest, diwali.date);
    diwaliGroup.forEach((event) => groupedFestivalDates.add(`${event.date}|${event.title}`));
    celebrations.push({ startDate: shiftDate(diwali.date, -2), endDate: lastFestivalDay, title: "दीपावली उत्सव", emoji: "🪔", kind: "diwali" });
  }

  for (const holi of holidays.filter((event) => /^holi$/i.test(event.title.trim()))) {
    groupedFestivalDates.add(`${holi.date}|${holi.title}`);
    celebrations.push({ startDate: shiftDate(holi.date, -1), endDate: holi.date, title: "होली और होलिका दहन", emoji: "🎨", kind: "holi" });
  }

  for (const dussehra of holidays.filter((event) => /dussehra|vijayadashami/i.test(event.title))) {
    groupedFestivalDates.add(`${dussehra.date}|${dussehra.title}`);
    celebrations.push({ startDate: shiftDate(dussehra.date, -9), endDate: dussehra.date, title: "नवरात्रि और विजयादशमी", emoji: "🌺", kind: "navratri" });
  }

  for (const holiday of holidays) {
    if (groupedFestivalDates.has(`${holiday.date}|${holiday.title}`)) continue;
    const title = /new year's day/i.test(holiday.title) ? "Happy New Year · नववर्ष" : holiday.title;
    const kind: FestivalCelebration["kind"] = /new year's day/i.test(holiday.title) ? "new-year" : "general";
    celebrations.push({ startDate: holiday.date, endDate: holiday.date, title, emoji: kind === "new-year" ? "🎊" : "🎉", kind });
  }

  return celebrations
    .map((event) => {
      const windowStart = shiftDate(event.startDate, -10);
      const windowEnd = shiftDate(event.endDate, 10);
      return {
        ...event,
        dateRange: event.startDate === event.endDate ? dateLabel(event.startDate) : `${dateLabel(event.startDate)} – ${dateLabel(event.endDate)}`,
        daysUntilStart: daysBetween(today, event.startDate),
        daysAfterEnd: daysBetween(event.endDate, today),
        windowStart,
        windowEnd,
      };
    })
    .filter((event) => today >= event.windowStart && today <= event.windowEnd)
    .sort((left, right) => left.startDate.localeCompare(right.startDate) || left.title.localeCompare(right.title));
}

