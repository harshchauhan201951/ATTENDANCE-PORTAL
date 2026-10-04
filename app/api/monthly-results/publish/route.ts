import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: Request) { try { const body=await request.json(); const {period,mahatest,marks,results}=body; if(!period||!period.month_key) return NextResponse.json({success:false,error:"Invalid monthly result data"},{status:400}); const now=new Date().toISOString(); const {error:pErr}=await supabaseAdmin.from("monthly_result_periods").upsert({...period,updated_at:now},{onConflict:"month_key"}); if(pErr) throw new Error(`monthly_result_periods save failed: ${pErr.message}`); if(mahatest){const {error:e}=await supabaseAdmin.from("monthly_mahatests").upsert({...mahatest,updated_at:now},{onConflict:"month_key"});if(e)throw new Error(`monthly_mahatests save failed: ${e.message}`);} if(Array.isArray(marks)&&marks.length){const {error:e}=await supabaseAdmin.from("monthly_mahatest_marks").upsert(marks,{onConflict:"month_key,student_id"});if(e)throw new Error(`monthly_mahatest_marks save failed: ${e.message}`);} if(Array.isArray(results)&&results.length){const {error:e}=await supabaseAdmin.from("monthly_results").upsert(results,{onConflict:"month_key,student_id"});if(e)throw new Error(`monthly_results save failed: ${e.message}`);} return NextResponse.json({success:true,saved:true,monthKey:period.month_key}); } catch(error) { console.error("Monthly result save error:",error); return NextResponse.json({success:false,error:error instanceof Error?error.message:"Monthly result save failed"},{status:500}); } }

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



