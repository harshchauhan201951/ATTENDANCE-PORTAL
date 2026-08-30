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

    if (
      !subscription ||
      !subscription.endpoint
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid push subscription is required.",
        },
        { status: 400 }
      );
    }

    /*
     * Make sure the student actually exists.
     */
    const { data: student, error: studentError } =
      await supabaseAdmin
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
     * Save subscription.
     *
     * endpoint is used as the unique browser/device
     * identifier so the same subscription is updated
     * instead of creating duplicate records.
     */
    const { data, error } =
      await supabaseAdmin
        .from("push_subscriptions")
        .upsert(
          {
            student_id: studentId,
            endpoint:
              subscription.endpoint,
            p256dh:
              subscription.keys?.p256dh || null,
            auth:
              subscription.keys?.auth || null,
            subscription:
              subscription,
          },
          {
            onConflict: "endpoint",
          }
        )
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