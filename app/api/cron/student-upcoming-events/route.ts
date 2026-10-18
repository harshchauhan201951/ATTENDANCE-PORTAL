import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStudentCalendarEvent } from "../../../../lib/student-calendar-events";

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

function nextIndiaDay(now: Date) {
  const [year, month, day] = indiaDateKey(now).split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1, 12));
  const key = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
  return { key, date: new Date(`${key}T12:00:00`) };
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.MONTHLY_RESULT_CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { key: tomorrow, date } = nextIndiaDay(new Date());
    const calendarEvent = getStudentCalendarEvent(date);

    const dayName = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "Asia/Kolkata" }).format(date);
    const { data: holidayRows, error: holidayError } = await supabaseAdmin
      .from("timetables")
      .select("class_names")
      .eq("day_of_week", dayName)
      .eq("is_holiday", true);
    if (holidayError) throw holidayError;

    const targetClasses = Array.from(new Set((holidayRows || [])
      .flatMap((row: { class_names: string[] | null }) => Array.isArray(row.class_names) ? row.class_names : [])
      .map((value: string) => value.trim()).filter(Boolean)));
    if (!calendarEvent && !targetClasses.length) return NextResponse.json({ success: true, tomorrow, sent: 0, message: "No calendar event is scheduled for tomorrow." });
    const event = calendarEvent || { date: tomorrow, title: "Class Holiday", type: "holiday" as const, description: "No classes are scheduled for your selected class." };
    const { data: activeStudents, error: studentError } = await supabaseAdmin
      .from("students").select("id,is_active");
    if (studentError) throw studentError;
    const studentIds = (activeStudents || []).filter((row: { is_active?: boolean | null }) => row.is_active !== false)
      .map((row: { id: number }) => Number(row.id)).filter((id: number) => Number.isInteger(id) && id > 0);

    const holidayLabel = event.type === "holiday" || targetClasses.length > 0;
    const title = `Tomorrow: ${event.title}`;
    const message = holidayLabel
      ? `${event.title} is on ${dayName}, ${tomorrow}. ${event.description}${targetClasses.length ? ` This notice is for classes ${targetClasses.join(", ")}.` : ""}`
      : `${event.title} is scheduled for ${dayName}, ${tomorrow}. ${event.description}`;
    const payload: Record<string, unknown> = {
      category: "academic_calendar",
      title,
      message,
      url: "/student/calendar",
      notificationKey: `calendar-event:${tomorrow}:${event.type}:${event.title}`,
      metadata: { source: "next_day_calendar_reminder", eventDate: tomorrow, eventType: event.type, eventTitle: event.title },
    };
    if (targetClasses.length) payload.targetClasses = targetClasses;
    else payload.studentIds = studentIds;

    const response = await fetch(new URL("/api/push/send", request.url), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const delivery = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(delivery.error || "Calendar reminder could not be sent.");
    return NextResponse.json({ success: true, tomorrow, event, ...delivery });
  } catch (error) {
    console.error("Student upcoming-event notification failed:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Upcoming calendar notification failed." }, { status: 500 });
  }
}
