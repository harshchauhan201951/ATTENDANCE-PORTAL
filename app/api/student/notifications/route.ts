import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing.");
if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing.");

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function validStudent(studentId: number, username: string) {
  if (!Number.isInteger(studentId) || studentId <= 0 || !username.trim()) return false;
  const { data, error } = await supabaseAdmin.from("students").select("id")
    .eq("id", studentId).eq("student_username", username.trim()).maybeSingle();
  return !error && Boolean(data);
}

export async function GET(request: NextRequest) {
  try {
    const studentId = Number(request.nextUrl.searchParams.get("studentId"));
    const username = request.nextUrl.searchParams.get("studentUsername") || "";
    if (!(await validStudent(studentId, username))) return NextResponse.json({ success: false, error: "The signed-in student ID and username do not match." }, { status: 403 });
    const { data, error } = await supabaseAdmin.from("student_notifications")
      .select("id,student_id,category,title,message,url,is_read,audio_url,metadata,created_at,read_at")
      .eq("student_id", studentId).order("created_at", { ascending: false }).limit(100);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    const notifications = data || [];
    return NextResponse.json({ success: true, notifications, unreadCount: notifications.filter((item) => !item.is_read).length });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Internal server error." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const studentId = Number(body?.studentId);
    const username = String(body?.studentUsername || "");
    const notificationId = Number(body?.notificationId);
    if (!(await validStudent(studentId, username))) return NextResponse.json({ success: false, error: "The signed-in student ID and username do not match." }, { status: 403 });
    if (body?.markAll === true) {
      const { error } = await supabaseAdmin.from("student_notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("student_id", studentId).eq("is_read", false);
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, message: "All notifications marked as read." });
    }
    if (!Number.isInteger(notificationId) || notificationId <= 0) return NextResponse.json({ success: false, error: "Valid notificationId is required." }, { status: 400 });
    const { data, error } = await supabaseAdmin.from("student_notifications").update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId).eq("student_id", studentId).select().maybeSingle();
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ success: false, error: "Notification not found for this student." }, { status: 404 });
    return NextResponse.json({ success: true, notification: data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Internal server error." }, { status: 500 });
  }
}
