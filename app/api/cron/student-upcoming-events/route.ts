import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStudentCalendarEvents } from "../../../../lib/student-calendar-events";

export const runtime = "nodejs";
export const maxDuration = 60;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

function indiaDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function indiaDay(date: Date, offset: number) {
  const [year, month, day] = indiaDateKey(date).split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1, day + offset, 12));
  const key = `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-${String(target.getUTCDate()).padStart(2, "0")}`;
  return new Date(`${key}T12:00:00`);
}

const recurringClasses = new Set(["Monday Off", "Sunday Off", "Sunday Class"]);

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.MONTHLY_RESULT_CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const deliveries = [];
    for (const offset of [0, 1]) {
      const date = indiaDay(new Date(), offset);
      const dateKey = indiaDateKey(date);
      const dayName = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "Asia/Kolkata" }).format(date);
      const events = getStudentCalendarEvents(date).filter((event) => !recurringClasses.has(event.title));
      const { data: holidayRows, error: holidayError } = await supabaseAdmin
        .from("timetables").select("class_names").eq("day_of_week", dayName).eq("is_holiday", true);
      if (holidayError) throw holidayError;
      const targetClasses = Array.from(new Set((holidayRows || [])
        .flatMap((row: { class_names: string[] | null }) => Array.isArray(row.class_names) ? row.class_names : [])
        .map((value: string) => value.trim()).filter(Boolean)));

      const dayEvents = [...events];
      if (!dayEvents.length && targetClasses.length) {
        dayEvents.push({ date: dateKey, title: "Class Holiday", type: "holiday", description: "No classes are scheduled for your selected class." });
      }
      const classSpecificHoliday = events.length === 0 && targetClasses.length > 0;
      for (const event of dayEvents) {
        const { data: activeStudents, error: studentError } = await supabaseAdmin
          .from("students").select("id,is_active");
        if (studentError) throw studentError;
        const studentIds = (activeStudents || []).filter((row: { is_active?: boolean | null }) => row.is_active !== false)
          .map((row: { id: number }) => Number(row.id)).filter((id: number) => Number.isInteger(id) && id > 0);
        const title = offset === 0 ? `Today: ${event.title}` : `Tomorrow: ${event.title}`;
        const lead = offset === 0 ? "Today" : "Tomorrow";
        const message = `${event.title} is ${offset === 0 ? "today" : `on ${dayName}, ${dateKey}`}. ${event.description}${classSpecificHoliday ? ` This notice is for classes ${targetClasses.join(", ")}.` : ""}`;
        const payload: Record<string, unknown> = {
          category: "academic_calendar", title, message, url: "/student/calendar",
          notificationKey: `calendar-event:${lead.toLowerCase()}:${dateKey}:${event.type}:${event.title}`,
          metadata: { source: offset === 0 ? "same_day_calendar_reminder" : "next_day_calendar_reminder", eventDate: dateKey, eventType: event.type, eventTitle: event.title },
        };
        if (classSpecificHoliday) payload.targetClasses = targetClasses;
        else payload.studentIds = studentIds;
        const response = await fetch(new URL("/api/push/send", request.url), {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        const delivery = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(delivery.error || `Calendar reminder failed for ${dateKey}.`);
        deliveries.push({ date: dateKey, lead, event: event.title, ...delivery });
      }
    }
    return NextResponse.json({ success: true, deliveries });
  } catch (error) {
    console.error("Student upcoming-event notification failed:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Upcoming calendar notification failed." }, { status: 500 });
  }
}
