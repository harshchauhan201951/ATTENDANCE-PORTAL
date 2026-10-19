import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL is missing."
  );
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is missing."
  );
}

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const studentId = Number(body?.studentId);

    const subscription = body?.subscription;
    const isNativeFcm = subscription?.type === "fcm" && typeof subscription?.token === "string" && subscription.token.length > 0;

    if (
      !studentId ||
      Number.isNaN(studentId) ||
      studentId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid studentId is required.",
        },
        { status: 400 }
      );
    }

    if (!subscription || (!isNativeFcm && !subscription.endpoint)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Valid push subscription is required.",
        },
        { status: 400 }
      );
    }

    /*
     * Check that the student exists.
     */
    const {
      data: student,
      error: studentError,
    } = await supabaseAdmin
      .from("students")
      .select("id")
      .eq("id", studentId)
      .maybeSingle();

    if (studentError) {
      console.error(
        "Student verification error:",
        studentError
      );

      return NextResponse.json(
        {
          success: false,
          error: studentError.message,
        },
        { status: 500 }
      );
    }

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          error: "Student not found.",
        },
        { status: 404 }
      );
    }

    /*
     * Save the complete browser push subscription.
     *
     * IMPORTANT:
     * Your current Supabase table only has:
     *
     * id
     * student_id
     * endpoint
     * subscription
     * created_at
     * updated_at
     *
     * Therefore we DO NOT insert auth or p256dh
     * into separate columns.
     */
    const endpoint = subscription.endpoint || ("fcm:" + subscription.token);

    /*
     * A browser/PWA or native app install may be used by another student
     * later. Rebind the endpoint before saving the current login so one
     * physical install can never remain attached to two student IDs.
     * This also repairs duplicate legacy rows when the endpoint constraint
     * was not present in an older database version.
     */
    const { error: staleBindingError } = await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint);
    if (staleBindingError) {
      console.error("Old push subscription binding cleanup error:", staleBindingError);
      return NextResponse.json({ success: false, error: staleBindingError.message }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from("push_subscriptions")
      .insert({ student_id: studentId, endpoint, subscription })
      .select()
      .single();

    if (error) {
      console.error(
        "Push subscription database error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Push subscription saved successfully.",
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Push subscribe API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Internal server error.",
      },
      { status: 500 }
    );
  }
}









