import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isSameOriginRequest } from "../../../../lib/server/student-session";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, error: "Request origin could not be verified." }, { status: 403 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: "Password updates are temporarily unavailable." }, { status: 503 });
  }

  try {
    const rawBody = await request.text();
    if (rawBody.length > 4_096) return NextResponse.json({ success: false, error: "Password request is too large." }, { status: 413 });
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const accountType = body.accountType === "teacher" ? "teacher" : body.accountType === "student" ? "student" : null;
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (!accountType || !username || username.length > 120 || !currentPassword || currentPassword.length > 256 || !newPassword || newPassword.length > 128) {
      return NextResponse.json({ success: false, error: "Enter your current password and a valid new password." }, { status: 400 });
    }
    if (newPassword.length < 6) return NextResponse.json({ success: false, error: "New password must contain at least 6 characters." }, { status: 400 });
    if (currentPassword === newPassword) return NextResponse.json({ success: false, error: "Choose a password different from your current password." }, { status: 400 });

    const table = accountType === "student" ? "students" : "teachers";
    const loginFunction = accountType === "student" ? "student_login" : "teacher_login";
    const { data, error: loginError } = await supabaseAdmin.rpc(loginFunction, {
      p_username: username,
      p_password: currentPassword,
    });
    const account = Array.isArray(data) ? data[0] : data;
    const accountId = Number(account?.id);

    if (loginError || !Number.isInteger(accountId) || accountId <= 0) {
      return NextResponse.json({ success: false, error: "Current password is incorrect. Please check it and try again." }, { status: 401 });
    }
    if (accountType === "student" && account?.is_active === false) {
      return NextResponse.json({ success: false, error: "This student account is inactive." }, { status: 403 });
    }

    const { data: updatedAccount, error: updateError } = await supabaseAdmin
      .from(table)
      .update({ password_hash: newPassword })
      .eq("id", accountId)
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("Account password update failed:", updateError.message);
      return NextResponse.json({ success: false, error: "Password could not be updated. Please try again." }, { status: 500 });
    }
    if (!updatedAccount) {
      return NextResponse.json({ success: false, error: "Account could not be verified. Please sign in again." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Password update failed. Please try again." }, { status: 500 });
  }
}
