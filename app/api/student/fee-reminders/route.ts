import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPendingFeeReminder } from "../../../../lib/server/fee-reminders";

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const requestedId = Number(body?.studentId);
    const username = String(body?.studentUsername || "").trim();
    if (!username && (!Number.isInteger(requestedId) || requestedId <= 0)) {
      return NextResponse.json({ success: false, error: "A logged-in student ID is required." }, { status: 400 });
    }

    let query = supabaseAdmin.from("students").select("id,student_username");
    if (username) query = query.eq("student_username", username);
    else query = query.eq("id", requestedId);
    const { data: student, error } = await query.maybeSingle();
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    if (!student || (requestedId > 0 && Number(student.id) !== requestedId)) {
      return NextResponse.json({ success: false, error: "The signed-in student does not match this student record." }, { status: 403 });
    }

    const reminder = await sendPendingFeeReminder(request.url, Number(student.id));
    return NextResponse.json({ success: true, reminder });
  } catch (error) {
    console.error("Student fee reminder error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unable to check pending fees." }, { status: 500 });
  }
}
