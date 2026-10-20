import { getMonthlyCalendarEvent } from "./monthly-calendar";

export type CalendarEvent = {
  date: string;
  title: string;
  type: "holiday" | "test" | "class";
  description: string;
};

export function getStudentCalendarEventEmoji(event: CalendarEvent | null | undefined) {
  if (!event) return "";
  const title = event.title.toLowerCase();

  if (title.includes("gandhi jayanti")) return "👓";
  if (title.includes("republic day") || title.includes("independence day")) return "🇮🇳";
  if (title.includes("raksha bandhan")) return "🎀";
  if (title.includes("bhai dooj")) return "🎁";
  if (title.includes("diwali") || title.includes("govardhan")) return "🪔";
  if (title.includes("holi")) return "🎨";
  if (title.includes("christmas")) return "🎄";
  if (title.includes("janmashtami")) return "🪈";
  if (title.includes("ganesh")) return "🐘";
  if (title.includes("shivratri")) return "🔱";
  if (title.includes("guru nanak")) return "🙏";
  if (title.includes("basant") || title.includes("sankranti")) return "🪁";
  if (title.includes("ram navami")) return "🏹";
  if (title.includes("mahavir")) return "🙏";
  if (title.includes("buddha")) return "☸️";
  if (title.includes("dussehra")) return "🏹";
  if (title.includes("new year's day")) return "🎊";
  return "🎉";
}

export const studentCalendarHolidays: CalendarEvent[] = [
  // =========================
  // 2025
  // =========================
  { date: "2025-01-01", title: "New Year's Day", type: "holiday", description: "Tuition holiday." },
  { date: "2025-01-14", title: "Makar Sankranti", type: "holiday", description: "Hindu festival holiday." },
  { date: "2025-01-26", title: "Republic Day", type: "holiday", description: "National holiday." },
  { date: "2025-02-02", title: "Basant Panchami", type: "holiday", description: "Hindu festival holiday." },
  { date: "2025-02-26", title: "Maha Shivratri", type: "holiday", description: "Hindu festival holiday." },
  { date: "2025-03-14", title: "Holi", type: "holiday", description: "Hindu festival holiday." },
  { date: "2025-04-06", title: "Ram Navami", type: "holiday", description: "Hindu festival holiday." },
  { date: "2025-04-10", title: "Mahavir Jayanti", type: "holiday", description: "Festival holiday." },
  { date: "2025-05-12", title: "Buddha Purnima", type: "holiday", description: "Festival holiday." },
  { date: "2025-08-09", title: "Raksha Bandhan", type: "holiday", description: "Hindu festival holiday." },
  { date: "2025-08-15", title: "Independence Day", type: "holiday", description: "National holiday." },
  { date: "2025-08-16", title: "Janmashtami", type: "holiday", description: "Hindu festival holiday." },
  { date: "2025-08-27", title: "Ganesh Chaturthi", type: "holiday", description: "Hindu festival holiday." },
  { date: "2025-10-02", title: "Gandhi Jayanti / Dussehra", type: "holiday", description: "National and Hindu festival holiday." },
  { date: "2025-10-20", title: "Diwali", type: "holiday", description: "Hindu festival holiday." },
  { date: "2025-10-22", title: "Govardhan Puja", type: "holiday", description: "Hindu festival holiday." },
  { date: "2025-10-23", title: "Bhai Dooj", type: "holiday", description: "Hindu festival holiday." },
  { date: "2025-11-05", title: "Guru Nanak Jayanti", type: "holiday", description: "Festival holiday." },
  { date: "2025-12-25", title: "Christmas Day", type: "holiday", description: "Christmas holiday." },

  // =========================
  // 2026
  // =========================
  { date: "2026-01-01", title: "New Year's Day", type: "holiday", description: "Tuition holiday." },
  { date: "2026-01-23", title: "Basant Panchami", type: "holiday", description: "Hindu festival holiday." },
  { date: "2026-01-26", title: "Republic Day", type: "holiday", description: "National holiday." },
  { date: "2026-02-15", title: "Maha Shivratri", type: "holiday", description: "Hindu festival holiday." },
  { date: "2026-03-04", title: "Holi", type: "holiday", description: "Hindu festival holiday." },
  { date: "2026-03-26", title: "Ram Navami", type: "holiday", description: "Hindu festival holiday." },
  { date: "2026-05-01", title: "Buddha Purnima", type: "holiday", description: "Festival holiday." },
  { date: "2026-08-15", title: "Independence Day", type: "holiday", description: "National holiday." },
  { date: "2026-08-28", title: "Raksha Bandhan", type: "holiday", description: "Hindu festival holiday." },
  { date: "2026-09-04", title: "Janmashtami", type: "holiday", description: "Hindu festival holiday." },
  { date: "2026-09-14", title: "Ganesh Chaturthi", type: "holiday", description: "Hindu festival holiday." },
  { date: "2026-10-02", title: "Gandhi Jayanti", type: "holiday", description: "National holiday." },
  { date: "2026-10-20", title: "Dussehra", type: "holiday", description: "Hindu festival holiday." },
  { date: "2026-11-08", title: "Diwali", type: "holiday", description: "Hindu festival holiday." },
  { date: "2026-11-09", title: "Govardhan Puja", type: "holiday", description: "Hindu festival holiday." },
  { date: "2026-11-11", title: "Bhai Dooj", type: "holiday", description: "Hindu festival holiday." },
  { date: "2026-11-24", title: "Guru Nanak Jayanti", type: "holiday", description: "Festival holiday." },
  { date: "2026-12-25", title: "Christmas Day", type: "holiday", description: "Christmas holiday." },

  // =========================
  // 2027
  // =========================
  { date: "2027-01-01", title: "New Year's Day", type: "holiday", description: "Tuition holiday." },
  { date: "2027-01-26", title: "Republic Day", type: "holiday", description: "National holiday." },
  { date: "2027-02-06", title: "Basant Panchami", type: "holiday", description: "Hindu festival holiday." },
  { date: "2027-03-06", title: "Maha Shivratri", type: "holiday", description: "Hindu festival holiday." },
  { date: "2027-03-22", title: "Holi", type: "holiday", description: "Hindu festival holiday." },
  { date: "2027-04-15", title: "Ram Navami", type: "holiday", description: "Hindu festival holiday." },
  { date: "2027-08-15", title: "Independence Day", type: "holiday", description: "National holiday." },
  { date: "2027-08-17", title: "Raksha Bandhan", type: "holiday", description: "Hindu festival holiday." },
  { date: "2027-08-25", title: "Janmashtami", type: "holiday", description: "Hindu festival holiday." },
  { date: "2027-09-04", title: "Ganesh Chaturthi", type: "holiday", description: "Hindu festival holiday." },
  { date: "2027-10-02", title: "Gandhi Jayanti", type: "holiday", description: "National holiday." },
  { date: "2027-10-09", title: "Dussehra", type: "holiday", description: "Hindu festival holiday." },
  { date: "2027-10-29", title: "Diwali", type: "holiday", description: "Hindu festival holiday." },
  { date: "2027-10-30", title: "Govardhan Puja", type: "holiday", description: "Hindu festival holiday." },
  { date: "2027-10-31", title: "Bhai Dooj", type: "holiday", description: "Hindu festival holiday." },
  { date: "2027-11-14", title: "Guru Nanak Jayanti", type: "holiday", description: "Festival holiday." },
  { date: "2027-12-25", title: "Christmas Day", type: "holiday", description: "Christmas holiday." },

  // =========================
  // 2028
  // =========================
  { date: "2028-01-01", title: "New Year's Day", type: "holiday", description: "Tuition holiday." },
  { date: "2028-01-26", title: "Republic Day", type: "holiday", description: "National holiday." },
  { date: "2028-02-26", title: "Maha Shivratri", type: "holiday", description: "Hindu festival holiday." },
  { date: "2028-03-11", title: "Holi", type: "holiday", description: "Hindu festival holiday." },
  { date: "2028-04-03", title: "Ram Navami", type: "holiday", description: "Hindu festival holiday." },
  { date: "2028-08-05", title: "Raksha Bandhan", type: "holiday", description: "Hindu festival holiday." },
  { date: "2028-08-13", title: "Janmashtami", type: "holiday", description: "Hindu festival holiday." },
  { date: "2028-08-15", title: "Independence Day", type: "holiday", description: "National holiday." },
  { date: "2028-08-25", title: "Ganesh Chaturthi", type: "holiday", description: "Hindu festival holiday." },
  { date: "2028-09-30", title: "Dussehra", type: "holiday", description: "Hindu festival holiday." },
  { date: "2028-10-02", title: "Gandhi Jayanti", type: "holiday", description: "National holiday." },
  { date: "2028-11-03", title: "Guru Nanak Jayanti", type: "holiday", description: "Festival holiday." },
  { date: "2028-11-17", title: "Diwali", type: "holiday", description: "Hindu festival holiday." },
  { date: "2028-11-18", title: "Govardhan Puja", type: "holiday", description: "Hindu festival holiday." },
  { date: "2028-11-19", title: "Bhai Dooj", type: "holiday", description: "Hindu festival holiday." },
  { date: "2028-12-25", title: "Christmas Day", type: "holiday", description: "Christmas holiday." },

  // =========================
  // 2029
  // =========================
  { date: "2029-01-01", title: "New Year's Day", type: "holiday", description: "Tuition holiday." },
  { date: "2029-01-26", title: "Republic Day", type: "holiday", description: "National holiday." },
  { date: "2029-02-13", title: "Maha Shivratri", type: "holiday", description: "Hindu festival holiday." },
  { date: "2029-03-02", title: "Holi", type: "holiday", description: "Hindu festival holiday." },
  { date: "2029-03-24", title: "Ram Navami", type: "holiday", description: "Hindu festival holiday." },
  { date: "2029-08-15", title: "Independence Day", type: "holiday", description: "National holiday." },
  { date: "2029-08-23", title: "Raksha Bandhan", type: "holiday", description: "Hindu festival holiday." },
  { date: "2029-09-01", title: "Janmashtami", type: "holiday", description: "Hindu festival holiday." },
  { date: "2029-09-12", title: "Ganesh Chaturthi", type: "holiday", description: "Hindu festival holiday." },
  { date: "2029-10-02", title: "Gandhi Jayanti", type: "holiday", description: "National holiday." },
  { date: "2029-10-17", title: "Dussehra", type: "holiday", description: "Hindu festival holiday." },
  { date: "2029-11-05", title: "Diwali", type: "holiday", description: "Hindu festival holiday." },
  { date: "2029-11-06", title: "Govardhan Puja", type: "holiday", description: "Hindu festival holiday." },
  { date: "2029-11-07", title: "Bhai Dooj", type: "holiday", description: "Hindu festival holiday." },
  { date: "2029-11-22", title: "Guru Nanak Jayanti", type: "holiday", description: "Festival holiday." },
  { date: "2029-12-25", title: "Christmas Day", type: "holiday", description: "Christmas holiday." },

  // =========================
  // 2030
  // =========================
  { date: "2030-01-01", title: "New Year's Day", type: "holiday", description: "Tuition holiday." },
  { date: "2030-01-26", title: "Republic Day", type: "holiday", description: "National holiday." },
  { date: "2030-02-03", title: "Basant Panchami", type: "holiday", description: "Hindu festival holiday." },
  { date: "2030-03-04", title: "Maha Shivratri", type: "holiday", description: "Hindu festival holiday." },
  { date: "2030-03-22", title: "Holi", type: "holiday", description: "Hindu festival holiday." },
  { date: "2030-04-13", title: "Ram Navami", type: "holiday", description: "Hindu festival holiday." },
  { date: "2030-08-13", title: "Raksha Bandhan", type: "holiday", description: "Hindu festival holiday." },
  { date: "2030-08-15", title: "Independence Day", type: "holiday", description: "National holiday." },
  { date: "2030-08-21", title: "Janmashtami", type: "holiday", description: "Hindu festival holiday." },
  { date: "2030-09-03", title: "Ganesh Chaturthi", type: "holiday", description: "Hindu festival holiday." },
  { date: "2030-10-02", title: "Gandhi Jayanti", type: "holiday", description: "National holiday." },
  { date: "2030-10-07", title: "Dussehra", type: "holiday", description: "Hindu festival holiday." },
  { date: "2030-10-26", title: "Diwali", type: "holiday", description: "Hindu festival holiday." },
  { date: "2030-10-27", title: "Govardhan Puja", type: "holiday", description: "Hindu festival holiday." },
  { date: "2030-10-28", title: "Bhai Dooj", type: "holiday", description: "Hindu festival holiday." },
  { date: "2030-11-12", title: "Guru Nanak Jayanti", type: "holiday", description: "Festival holiday." },
  { date: "2030-12-25", title: "Christmas Day", type: "holiday", description: "Christmas holiday." },
];
function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function getStudentCalendarEvent(date: Date): CalendarEvent | null {
  const key = dateKey(date);
  const holiday = studentCalendarHolidays.find((event) => event.date === key);
  if (holiday) return holiday;

  const monthlyEvent = getMonthlyCalendarEvent(date);
  if (monthlyEvent) return monthlyEvent;

  const day = date.getDay();
  if (key >= "2026-08-30" && day === 0) {
    return { date: key, title: "Sunday Class", type: "class", description: "Regular Sunday class." };
  }
  if (key >= "2026-08-31" && day === 1) {
    return { date: key, title: "Monday Off", type: "holiday", description: "Weekly tuition holiday." };
  }
  if (day === 0) {
    return { date: key, title: "Sunday Off", type: "holiday", description: "Weekly tuition holiday." };
  }
  if (day === 6) {
    return { date: key, title: "Weekly Test", type: "test", description: "Weekly test for tuition students." };
  }
  return null;
}

/** Returns calendar entries that share a date, such as a Monday off and a monthly result. */
export function getStudentCalendarEvents(date: Date): CalendarEvent[] {
  const primary = getStudentCalendarEvent(date);
  if (!primary) return [];

  const events = [primary];
  const key = dateKey(date);
  const isMondayOff = key >= "2026-08-31" && date.getDay() === 1;
  if (isMondayOff && primary.title === "Monthly Result") {
    events.push({
      date: key,
      title: "Monday Off",
      type: "holiday",
      description: "Weekly tuition holiday.",
    });
  }
  return events;
}
