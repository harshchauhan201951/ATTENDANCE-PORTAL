import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function savePayload(body:any) {
  const {period,mahatest,marks,results}=body;
  if(!period?.month_key) throw new Error("Invalid monthly result data");
  const now=new Date().toISOString();
  const existing=await supabaseAdmin.from("monthly_result_periods").select("is_released,released_at").eq("month_key",period.month_key).maybeSingle();
  if(existing.error) throw existing.error;
  const action=String(body.action||"save");
  const releaseNow=action==="publish";
  const periodRow={
    ...period,
    is_released: releaseNow ? true : (action==="schedule" ? false : (existing.data?.is_released ?? false)),
    released_at: releaseNow ? now : (existing.data?.released_at ?? null),
    updated_at:now
  };
  const {error:pErr}=await supabaseAdmin.from("monthly_result_periods").upsert(periodRow,{onConflict:"month_key"});
  if(pErr) throw new Error(`monthly_result_periods save failed: ${pErr.message}`);
  if(mahatest){
    const {error:e}=await supabaseAdmin.from("monthly_mahatests").upsert({...mahatest,updated_at:now},{onConflict:"month_key"});
    if(e) throw new Error(`monthly_mahatests save failed: ${e.message}`);
  }
  if(Array.isArray(marks)){
    const {error:e}=await supabaseAdmin.from("monthly_mahatest_marks").upsert(marks,{onConflict:"month_key,student_id"});
    if(e) throw new Error(`monthly_mahatest_marks save failed: ${e.message}`);
  }
  if(Array.isArray(results)&&results.length){
    const {error:e}=await supabaseAdmin.from("monthly_results").upsert(results,{onConflict:"month_key,student_id"});
    if(e) throw new Error(`monthly_results save failed: ${e.message}`);
  }
  return {monthKey:period.month_key,action,released:releaseNow||Boolean(periodRow.is_released),releasedAt:periodRow.released_at};
}

export async function POST(request: Request) {
  try { return NextResponse.json({success:true,...await savePayload(await request.json())}); }
  catch(error) { console.error("Monthly result save error:",error); return NextResponse.json({success:false,error:error instanceof Error?error.message:"Monthly result save failed"},{status:500}); }
}

export async function GET(request: Request) {
  try {
    const url=new URL(request.url);
    const monthKey=url.searchParams.get("monthKey");
    const studentId=url.searchParams.get("studentId");
    const list=url.searchParams.get("list");
    const now=new Date().toISOString();
    if(list==="1"){
      const {data:due,error:dueError}=await supabaseAdmin.from("monthly_result_periods").select("id").eq("is_released",false).lte("scheduled_release_at",now);
      if(dueError) throw dueError;
      for(const p of due||[]){const {error}=await supabaseAdmin.from("monthly_result_periods").update({is_released:true,released_at:now,updated_at:now}).eq("id",p.id).eq("is_released",false);if(error)throw error;}
      const {data,error}=await supabaseAdmin.from("monthly_result_periods").select("*").order("month_key",{ascending:false});
      if(error) throw error;
      return NextResponse.json({success:true,periods:data||[]});
    }
    if(monthKey){
      const [periodRes,mahatestRes,marksRes,resultsRes]=await Promise.all([
        supabaseAdmin.from("monthly_result_periods").select("*").eq("month_key",monthKey).maybeSingle(),
        supabaseAdmin.from("monthly_mahatests").select("*").eq("month_key",monthKey).maybeSingle(),
        supabaseAdmin.from("monthly_mahatest_marks").select("student_id,obtained_marks,remarks").eq("month_key",monthKey),
        studentId ? supabaseAdmin.from("monthly_results").select("*").eq("month_key",monthKey).eq("student_id",Number(studentId)).maybeSingle() : supabaseAdmin.from("monthly_results").select("*").eq("month_key",monthKey).order("student_id")
      ]);
      for(const r of [periodRes,mahatestRes,marksRes,resultsRes]) if(r.error) throw r.error;
      return NextResponse.json({success:true,monthKey,period:periodRes.data||null,mahatest:mahatestRes.data||null,marks:marksRes.data||[],results:studentId?(resultsRes.data?[resultsRes.data]:[]):(resultsRes.data||[])});
    }
    const expected=process.env.CRON_SECRET||process.env.MONTHLY_RESULT_CRON_SECRET;
    const auth=request.headers.get("authorization")||"";
    if(expected&&auth!==`Bearer ${expected}`) return NextResponse.json({success:false,error:"Unauthorized"},{status:401});
    const {data:due,error:fetchError}=await supabaseAdmin.from("monthly_result_periods").select("id,month_key,scheduled_release_at,is_released").eq("is_released",false).lte("scheduled_release_at",now);
    if(fetchError) throw fetchError;
    if(!due?.length) return NextResponse.json({success:true,released:0,checkedAt:now});
    const releasedKeys:string[]=[];
    for(const period of due){const {error}=await supabaseAdmin.from("monthly_result_periods").update({is_released:true,released_at:now,updated_at:now}).eq("id",period.id).eq("is_released",false);if(error)throw error;releasedKeys.push(String(period.month_key));}
    return NextResponse.json({success:true,released:releasedKeys.length,monthKeys:releasedKeys,releasedAt:now});
  } catch(error) { console.error("Monthly result load/publish error:",error); return NextResponse.json({success:false,error:error instanceof Error?error.message:"Monthly result request failed"},{status:500}); }
}
