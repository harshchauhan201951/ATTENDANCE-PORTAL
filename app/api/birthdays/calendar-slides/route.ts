import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { teacherBirthdayRecords } from "../../../../lib/teacher-birthdays";

export const runtime = "nodejs";

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

function nextBirthdayDate(monthDay: string, today: string) {
  const [year, month, day] = today.split("-").map(Number);
  for (let offset = 0; offset < 365; offset += 1) {
    const date = new Date(Date.UTC(year, month - 1, day + offset, 12));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
    if (key.slice(5) === monthDay) return key;
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const studentId = Number(params.get("studentId"));
    const username = String(params.get("studentUsername") || "").trim();
    if (!Number.isInteger(studentId) || studentId <= 0 || !username) {
      return NextResponse.json({ success: false, error: "A valid student session is required." }, { status: 401 });
    }
    const { data: viewer, error: viewerError } = await supabaseAdmin.from("students").select("id")
      .eq("id", studentId).eq("student_username", username).maybeSingle();
    if (viewerError) throw viewerError;
    if (!viewer) return NextResponse.json({ success: false, error: "The student session could not be verified." }, { status: 401 });

    const today = indiaDateKey(new Date());
    const { data: students, error } = await supabaseAdmin.from("students")
      .select("student_name,student_username,date_of_birth,is_active")
      .not("date_of_birth", "is", null).or("is_active.eq.true,is_active.is.null");
    if (error) throw error;

    const events = (students || []).flatMap((student: any) => {
      if (typeof student.date_of_birth !== "string") return [];
      const celebrationDate = nextBirthdayDate(student.date_of_birth.slice(5, 10), today);
      if (!celebrationDate) return [];
      const name = String(student.student_name || student.student_username || "विद्यार्थी").trim();
      return [{ date: celebrationDate, title: `${name} का जन्मदिन`, type: "birthday" as const, description: `🎂 ${name} का जन्मदिन — उन्हें ढेर सारी शुभकामनाएँ दें!` }];
    });

    for (const teacher of teacherBirthdayRecords) {
      const celebrationDate = nextBirthdayDate(teacher.dateOfBirth.slice(5, 10), today);
      if (celebrationDate) {
        events.push({ date: celebrationDate, title: `${teacher.canonicalName} का जन्मदिन · शिक्षक`, type: "birthday" as const, description: `🎂 ${teacher.canonicalName} का जन्मदिन — उन्हें ढेर सारी शुभकामनाएँ दें!` });
      }
    }

    events.sort((left, right) => left.date.localeCompare(right.date) || left.title.localeCompare(right.title));
    return NextResponse.json({ success: true, events }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Today's birthdays loading failed:", error);
    return NextResponse.json({ success: false, error: "Today's birthdays are unavailable right now." }, { status: 500 });
  }
}
