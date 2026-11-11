import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

function classNames(value: unknown): string[] {
  if (typeof value !== "string") return [];
  const clean = value.trim();
  if (clean.startsWith("[")) {
    try {
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed)) return Array.from(new Set(parsed.map((item) => String(item || "").trim()).filter(Boolean)));
    } catch {}
  }
  return Array.from(new Set(clean.split(",").map((item) => item.trim()).filter(Boolean)));
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.MONTHLY_RESULT_CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseAdmin.from("homework")
      .select("id,title,subject,due_date,class_name,scheduled_at")
      .not("scheduled_at", "is", null)
      .lte("scheduled_at", new Date().toISOString());
    if (error) throw error;

    const deliveries = await Promise.all((data || []).map(async (homework: any) => {
      const targets = classNames(homework.class_name);
      if (!targets.length) return { homeworkId: homework.id, skipped: true, reason: "No target classes." };
      const response = await fetch(new URL("/api/push/send", request.url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `RACER ACADEMY द्वारा नया Homework: ${homework.title}`,
          message: `RACER ACADEMY द्वारा ${homework.title} Homework डाल दिया गया है। यह ${targets.join(", ")} class के लिए है। Subject: ${homework.subject || "सामान्य"}। जमा करने की अंतिम तारीख: ${homework.due_date}। पूरे निर्देश देखने के लिए Homework section खोलें।`,
          category: "homework",
          url: "/student/homework",
          targetClasses: targets,
          notificationKey: `homework-published:${homework.id}`,
          metadata: { source: "teacher_homework_publish", homeworkId: Number(homework.id), dueDate: homework.due_date, subject: homework.subject, scheduledAt: homework.scheduled_at },
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Homework ${homework.id} notification failed.`);
      return { homeworkId: homework.id, ...result };
    }));

    return NextResponse.json({ success: true, checkedAt: new Date().toISOString(), publishedHomework: deliveries.length, deliveries });
  } catch (error) {
    console.error("Scheduled homework notification failed:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Scheduled homework could not be announced." }, { status: 500 });
  }
}
