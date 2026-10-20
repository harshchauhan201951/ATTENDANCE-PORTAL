import { NextRequest, NextResponse } from "next/server";
import { sendAllPendingFeeReminders } from "../../../../lib/server/fee-reminders";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.MONTHLY_RESULT_CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reminderSlot = "19:00";
    const reminders = await sendAllPendingFeeReminders(request.url, reminderSlot);
    return NextResponse.json({ success: true, reminderSlot, checkedAt: new Date().toISOString(), studentsWithPendingFees: reminders.length, reminders });
  } catch (error) {
    console.error("Scheduled evening fee reminder error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Evening fee reminders could not be sent." }, { status: 500 });
  }
}
