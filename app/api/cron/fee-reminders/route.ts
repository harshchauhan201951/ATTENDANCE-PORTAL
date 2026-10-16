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
    // Vercel cron runs at 10:15:00 IST (04:45 UTC); wait to send at :18.
    const now = new Date();
    const indiaTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(now);
    if (indiaTime.startsWith("10:15:")) {
      const second = Number(indiaTime.slice(-2));
      if (second < 18) await new Promise((resolve) => setTimeout(resolve, (18 - second) * 1000));
    }

    const reminders = await sendAllPendingFeeReminders(request.url);
    return NextResponse.json({ success: true, checkedAt: new Date().toISOString(), studentsWithPendingFees: reminders.length, reminders });
  } catch (error) {
    console.error("Scheduled fee reminder error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Fee reminders could not be sent." }, { status: 500 });
  }
}
