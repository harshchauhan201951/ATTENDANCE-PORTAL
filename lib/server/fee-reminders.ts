import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export function indiaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export async function sendPendingFeeReminder(requestUrl: string, studentId: number) {
  const { data: fees, error } = await supabaseAdmin.from("fees")
    .select("id,student_id,month,year,amount,status")
    .eq("student_id", studentId);
  if (error) throw error;
  const pending = (fees || []).filter((fee: any) => String(fee.status || "").trim().toUpperCase() === "PENDING");
  if (!pending.length) return { studentId, pending: 0, sent: false };

  const total = pending.reduce((sum: number, fee: any) => sum + (Number(fee.amount) || 0), 0);
  const periods = pending.map((fee: any) => `${new Date(2000, Number(fee.month) - 1, 1).toLocaleString("en-IN", { month: "long" })} ${fee.year}`).join(", ");
  const notificationKey = `fee-reminder:${studentId}:${indiaDateKey()}`;
  const response = await fetch(new URL("/api/push/send", requestUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId,
      category: "fee_pending",
      title: "Pending Fee Reminder",
      message: `Your fee payment of ₹${total.toLocaleString("en-IN")} is pending for ${periods}. Please check your Fees page.`,
      url: "/student/fees",
      notificationKey,
      metadata: { source: "daily_fee_reminder", pendingFeeIds: pending.map((fee: any) => Number(fee.id)), reminderDate: indiaDateKey() },
    }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || "Unable to send the pending fee reminder.");
  return { studentId, pending: pending.length, total, sent: !result?.duplicate, duplicate: Boolean(result?.duplicate) };
}

export async function sendAllPendingFeeReminders(requestUrl: string) {
  const { data: fees, error } = await supabaseAdmin.from("fees").select("student_id,status");
  if (error) throw error;
  const studentIds = Array.from(new Set((fees || [])
    .filter((fee: any) => String(fee.status || "").trim().toUpperCase() === "PENDING")
    .map((fee: any) => Number(fee.student_id))
    .filter((id: number) => Number.isInteger(id) && id > 0)));
  const results = [];
  for (const studentId of studentIds) {
    results.push(await sendPendingFeeReminder(requestUrl, studentId));
  }
  return results;
}
