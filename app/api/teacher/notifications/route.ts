import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

function validTeacherId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : 0;
}

async function teacherExists(teacherId: number) {
  const { data, error } = await supabaseAdmin.from("teachers").select("id").eq("id", teacherId).maybeSingle();
  return !error && Boolean(data);
}

export async function GET(request: Request) {
  const teacherId = validTeacherId(new URL(request.url).searchParams.get("teacherId"));
  if (!teacherId || !(await teacherExists(teacherId))) return NextResponse.json({ success: false, error: "Valid teacher session is required." }, { status: 401 });
  const { data, error } = await supabaseAdmin.from("teacher_notifications").select("id,teacher_id,title,message,category,url,metadata,is_read,read_at,created_at").eq("teacher_id", teacherId).order("created_at", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, notifications: data || [], unreadCount: (data || []).filter((item) => !item.is_read).length });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const teacherId = validTeacherId(body?.teacherId);
  if (!teacherId || !(await teacherExists(teacherId))) return NextResponse.json({ success: false, error: "Valid teacher session is required." }, { status: 401 });
  let query = supabaseAdmin.from("teacher_notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("teacher_id", teacherId).eq("is_read", false);
  if (!body?.markAll) {
    const notificationId = Number(body?.notificationId);
    if (!Number.isInteger(notificationId) || notificationId <= 0) return NextResponse.json({ success: false, error: "Valid notificationId is required." }, { status: 400 });
    query = query.eq("id", notificationId);
  }
  const { error } = await query;
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
