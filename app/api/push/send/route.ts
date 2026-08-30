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
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
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
  subscription: {
    endpoint?: string;
    expirationTime?: number | null;
    keys?: {
      p256dh?: string;
      auth?: string;
    };
  };
};

export async function POST(
  request: Request
) {
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
        "id, student_id, endpoint, subscription"
      );

    if (studentId !== null) {
      const numericStudentId =
        Number(studentId);

      if (
        Number.isNaN(numericStudentId) ||
        numericStudentId <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid studentId.",
          },
          { status: 400 }
        );
      }

      query = query.eq(
        "student_id",
        numericStudentId
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
          error:
            subscriptionsError.message,
          code:
            subscriptionsError.code,
          details:
            subscriptionsError.details,
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

    /*
     * IMPORTANT:
     *
     * Your push_subscriptions table stores the
     * browser PushSubscription inside the JSONB
     * `subscription` column.
     *
     * The actual notification keys are:
     *
     * subscription.keys.p256dh
     * subscription.keys.auth
     */

    const payload = JSON.stringify({
      title,
      message,
      body: message,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      url: "/student",

      /*
       * Keep notification non-silent.
       * The actual notification sound is controlled
       * by the browser/OS notification settings.
       */
      silent: false,

      /*
       * Tell the service worker that this is a
       * new notification.
       */
      renotify: true,

      requireInteraction: false,
    });

    let sent = 0;
    let failed = 0;

    for (const row of rows) {
      const storedSubscription =
        row.subscription;

      const endpoint =
        row.endpoint ||
        storedSubscription?.endpoint;

      const p256dh =
        storedSubscription?.keys?.p256dh;

      const auth =
        storedSubscription?.keys?.auth;

      /*
       * Validate the stored subscription before
       * attempting to send.
       */
      if (
        !endpoint ||
        !p256dh ||
        !auth
      ) {
        failed++;

        console.error(
          "Invalid push subscription record:",
          row.id
        );

        continue;
      }

      const pushSubscription =
        {
          endpoint,
          keys: {
            p256dh,
            auth,
          },
        };

      try {
        await webpush.sendNotification(
          pushSubscription,
          payload
        );

        sent++;

        console.log(
          "Push notification sent successfully:",
          row.id
        );
      } catch (pushError: any) {
        failed++;

        console.error(
          "Push notification error:",
          pushError
        );

        /*
         * Remove expired/invalid browser
         * subscriptions.
         */
        if (
          pushError?.statusCode === 404 ||
          pushError?.statusCode === 410
        ) {
          const {
            error: deleteError,
          } = await supabaseAdmin
            .from("push_subscriptions")
            .delete()
            .eq("id", row.id);

          if (deleteError) {
            console.error(
              "Expired subscription delete error:",
              deleteError
            );
          }
        }
      }
    }

    return NextResponse.json({
      success: sent > 0,
      sent,
      failed,
      total: rows.length,
      message:
        sent > 0
          ? "Push notifications sent successfully."
          : "No push notifications were sent.",
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