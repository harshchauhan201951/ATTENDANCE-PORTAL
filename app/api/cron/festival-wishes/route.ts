import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { studentCalendarHolidays } from "../../../../lib/student-calendar-events";

export const runtime = "nodejs";
export const maxDuration = 60;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

function indiaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

const celebrationNames = [
  "diwali", "bhai dooj", "govardhan", "holi", "raksha bandhan", "janmashtami",
  "ganesh", "shivratri", "basant", "sankranti", "ram navami", "mahavir",
  "buddha", "guru nanak", "christmas", "independence day", "republic day",
  "gandhi jayanti", "dussehra",
];

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.MONTHLY_RESULT_CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const today = indiaDateKey();
  const festival = studentCalendarHolidays.find((event) =>
    event.date === today
      && event.type === "holiday"
      && celebrationNames.some((name) => event.title.toLowerCase().includes(name))
  );
  if (!festival) return NextResponse.json({ success: true, skipped: true, date: today, reason: "No festival greeting is scheduled for today." });

  const festivalHindiName = festival.title.toLowerCase().includes("diwali")
    ? "दीपावली"
    : festival.title.toLowerCase().includes("bhai dooj")
      ? "भाई दूज"
      : festival.title.toLowerCase().includes("govardhan")
        ? "गोवर्धन पूजा"
        : festival.title;

  try {
    const { data: students, error } = await supabaseAdmin
      .from("students")
      .select("id")
      .or("is_active.eq.true,is_active.is.null");
    if (error) throw error;

    const studentIds = Array.from(new Set((students || [])
      .map((student: { id: number }) => Number(student.id))
      .filter((id: number) => Number.isInteger(id) && id > 0)));
    if (!studentIds.length) return NextResponse.json({ success: true, skipped: true, date: today, festival: festival.title, recipients: 0 });

    const response = await fetch(new URL("/api/push/send", request.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentIds,
        category: "celebration",
        title: `RACER ACADEMY की ओर से ${festivalHindiName} की शुभकामनाएँ`,
        message: `RACER ACADEMY परिवार की ओर से आपको ${festivalHindiName} की हार्दिक शुभकामनाएँ! आपका दिन खुशियों, अच्छे स्वास्थ्य और नई सीख से भरा रहे। 🎉`,
        url: "/student/dashboard",
        notificationKey: `festival-wish:${today}:${festival.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        metadata: { source: "student_festival_wish", festival: festival.title, date: today },
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Festival wishes could not be sent.");
    return NextResponse.json({ success: true, date: today, festival: festival.title, recipients: studentIds.length, ...result });
  } catch (error) {
    console.error("Festival wishes notification failed:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Festival wishes notification failed." }, { status: 500 });
  }
}
