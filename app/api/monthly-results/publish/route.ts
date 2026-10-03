import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: Request) {
  try {
    const expected = process.env.CRON_SECRET || process.env.MONTHLY_RESULT_CRON_SECRET;
    const auth = request.headers.get("authorization") || "";
    if (expected && auth !== `Bearer ${expected}`) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const now = new Date().toISOString();
    const { data: due, error: fetchError } = await supabaseAdmin
      .from("monthly_result_periods")
      .select("id,month_key,scheduled_release_at,is_released")
      .eq("is_released", false)
      .lte("scheduled_release_at", now);
    if (fetchError) throw fetchError;
    if (!due?.length) return NextResponse.json({ success: true, released: 0, checkedAt: now });

    const releasedKeys: string[] = [];
    for (const period of due) {
      const { error } = await supabaseAdmin
        .from("monthly_result_periods")
        .update({ is_released: true, released_at: now, updated_at: now })
        .eq("id", period.id)
        .eq("is_released", false);
      if (error) throw error;
      releasedKeys.push(String(period.month_key));
    }
    return NextResponse.json({ success: true, released: releasedKeys.length, monthKeys: releasedKeys, releasedAt: now });
  } catch (error) {
    console.error("Monthly result publish error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Publish failed" }, { status: 500 });
  }
}
