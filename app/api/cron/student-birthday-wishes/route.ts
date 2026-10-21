import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

function indiaDateTime(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function ageOnBirthday(dateOfBirth: string, currentYear: number) {
  const [birthYear, month, day] = dateOfBirth.slice(0, 10).split("-").map(Number);
  if (!birthYear || !month || !day || month < 1 || month > 12 || day < 1 || day > 31 || birthYear > currentYear) return null;
  return currentYear - birthYear;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.MONTHLY_RESULT_CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = indiaDateTime(new Date());
  const hour = Number(now.hour);
  const slot = hour === 7 ? "morning" : hour === 17 ? "evening" : "";
  if (!slot) return NextResponse.json({ success: false, error: "Birthday wishes are only scheduled at 7 AM and 5 PM India time." }, { status: 400 });

  const { data: students, error } = await supabaseAdmin
    .from("students")
    .select("id,student_name,student_username,date_of_birth,is_active")
    .not("date_of_birth", "is", null);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  const todaysBirthdays = (students || []).filter((student: any) => {
    if (student.is_active === false || typeof student.date_of_birth !== "string") return false;
    const dateOfBirth = student.date_of_birth.slice(0, 10);
    return dateOfBirth.slice(5) === `${now.month}-${now.day}` && ageOnBirthday(dateOfBirth, Number(now.year)) !== null;
  });

  const deliveries = await Promise.all(todaysBirthdays.map(async (student: any) => {
    const name = String(student.student_name || student.student_username || "प्रिय विद्यार्थी").trim().slice(0, 80);
    const age = ageOnBirthday(String(student.date_of_birth), Number(now.year));
    if (age === null) return { studentId: student.id, skipped: true };
    const message = slot === "morning"
      ? `प्रिय ${name}, जन्मदिन की हार्दिक शुभकामनाएँ! आज आप ${age} वर्ष के हो गए हैं। ईश्वर और सभी देवी-देवताओं का आशीर्वाद सदा आप पर बना रहे। आपका नया साल खुशियों, उत्तम स्वास्थ्य और सफलता से भरा हो। 🎂🎉`
      : `प्रिय ${name}, उम्मीद है आपका जन्मदिन खुशियों और अपनों के प्यार से भरा रहा। ${age}वें वर्ष में खूब सीखें, मुस्कुराएँ और अपने सपने पूरे करें। ईश्वर का आशीर्वाद हमेशा आपके साथ रहे। जन्मदिन की ढेर सारी शुभकामनाएँ! 🎂💜`;
    const response = await fetch(new URL("/api/push/send", request.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: Number(student.id),
        category: "birthday",
        title: "🎂 जन्मदिन की हार्दिक शुभकामनाएँ",
        message,
        url: "/student/dashboard",
        notificationKey: `birthday:${now.year}-${now.month}-${now.day}:${slot}`,
        metadata: { source: "student_birthday_cron", birthdayDate: `${now.year}-${now.month}-${now.day}`, slot, age },
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `Could not send the birthday wish to student ${student.id}.`);
    return { studentId: student.id, slot, ...result };
  }));

  return NextResponse.json({ success: true, slot, indiaDate: `${now.year}-${now.month}-${now.day}`, birthdayStudents: todaysBirthdays.length, deliveries });
}
