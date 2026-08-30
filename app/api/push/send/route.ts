import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const vapidPublicKey =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

const vapidPrivateKey =
  process.env.VAPID_PRIVATE_KEY;

const vapidSubject =
  process.env.VAPID_SUBJECT;

if (
  !supabaseUrl ||
  !serviceRoleKey ||
  !vapidPublicKey ||
  !vapidPrivateKey ||
  !vapidSubject
) {
  throw new Error(
    "Push notification environment variables are missing."
  );
}

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey
);

webpush.setVapidDetails(
  vapidSubject,
  vapidPublicKey,
  vapidPrivateKey
);

type PushSubscriptionRow = {
  id: number;
  student_id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const title =
      body?.title || "New Announcement";

    const message =
      body?.message ||
      "Your teacher has posted a new announcement.";

    const studentId =
      body?.studentId ?? null;

    let query = supabaseAdmin
      .from("push_subscriptions")
      .select(
        "id, student_id, endpoint, p256dh, auth"
      );

    if (studentId !== null) {
      query = query.eq(
        "student_id",
        Number(studentId)
      );
    }

    const {
      data: subscriptions,
      error: subscriptionsError,
    } = await query;

    if (subscriptionsError) {
      console.error(
        "Push subscriptions loading error:",
        subscriptionsError
      );

      return NextResponse.json(
        {
          success: false,
          error: subscriptionsError.message,
        },
        { status: 500 }
      );
    }

    const rows =
      (subscriptions ||
        []) as PushSubscriptionRow[];

    if (rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No push subscriptions found.",
          sent: 0,
        },
        { status: 404 }
      );
    }

    const payload = JSON.stringify({
      title,
      body: message,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      url: "/student",
    });

    let sent = 0;
    let failed = 0;

    for (const row of rows) {
      const subscription = {
        endpoint: row.endpoint,
        keys: {
          p256dh: row.p256dh,
          auth: row.auth,
        },
      };

      try {
        await webpush.sendNotification(
          subscription,
          payload
        );

        sent++;
      } catch (pushError: any) {
        failed++;

        console.error(
          "Push notification error:",
          pushError
        );

        if (
          pushError?.statusCode === 404 ||
          pushError?.statusCode === 410
        ) {
          await supabaseAdmin
            .from("push_subscriptions")
            .delete()
            .eq("id", row.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: rows.length,
    });
  } catch (error: any) {
    console.error(
      "Push send API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Failed to send push notification.",
      },
      { status: 500 }
    );
  }
}