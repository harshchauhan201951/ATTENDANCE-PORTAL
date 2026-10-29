import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

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


const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY;

const firebaseAdminApp = firebaseProjectId && firebaseClientEmail && firebasePrivateKey
  ? (getApps()[0] ?? initializeApp({
      credential: cert({projectId: firebaseProjectId, clientEmail: firebaseClientEmail, privateKey: firebasePrivateKey. replace(/\\n/g, "\n")}),
    })): null;

webpush.setVapidDetails(
  vapidSubject,
  vapidPublicKey,
  vapidPrivateKey
);

type PushSubscriptionRow = {
  id: number;
  student_id?: number;
  endpoint: string;
  subscription: {
    endpoint?: string;
    type?: string;
    token?: string;
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
    const teacherId = Number(body?.teacherId || 0);
    const isTeacherTarget = Number.isInteger(teacherId) && teacherId > 0;

    if (isTeacherTarget) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceRoleKey || request.headers.get("authorization") !== `Bearer ${serviceRoleKey}`) {
        return NextResponse.json({ success: false, error: "Unauthorized teacher push request." }, { status: 401 });
      }
      const { data: teacher, error: teacherError } = await supabaseAdmin.from("teachers").select("id").eq("id", teacherId).maybeSingle();
      if (teacherError) return NextResponse.json({ success: false, error: teacherError.message }, { status: 500 });
      if (!teacher) return NextResponse.json({ success: false, error: "Teacher not found." }, { status: 404 });
    }

    const announcementId = body?.announcementId ?? null;
    // RACER_PUSH_TARGETS_V3
    const requestedStudentIds: number[] = Array.isArray(body?.studentIds)
      ? Array.from(new Set(body.studentIds.map((value: unknown) => Number(value)).filter((value: number) => Number.isInteger(value) && value > 0)))
      : [];
    const targetClasses = Array.isArray(body?.targetClasses)
      ? Array.from(new Set(body.targetClasses.map((value: unknown) => String(value ?? "").trim().replace(/\s+/g, " ").toUpperCase()).filter(Boolean)))
      : [];

    const category = body?.category || "general";
    const url = body?.url || (category === "announcement" ? "/student/notifications" : ["fees", "fee_pending", "fee_paid", "fee_refunded"].includes(category) ? "/student/fees" : category === "homework" ? "/student/homework" : category === "quiz" ? "/student/quiz-tests" : category === "weekly_test" ? "/student/reports?section=tests" : category === "attendance" ? "/student/attendance-history" : category === "academic_calendar" ? "/student/calendar" : category === "timetable" ? "/student/timetable" : category === "result" ? "/student/monthly-result" : "/student/dashboard");
    const notificationKey = typeof body?.notificationKey === "string" ? body.notificationKey.trim().slice(0, 180) : "";

    // Fee notifications always belong to one verified student record; never broadcast fee details.
    if (category === "fees" || category === "fee_pending" || category === "fee_paid" || category === "fee_refunded") {
      const numericStudentId = Number(studentId);
      if (studentId === null || !Number.isInteger(numericStudentId) || numericStudentId <= 0) {
        return NextResponse.json({ success: false, error: "Fee notifications require one studentId." }, { status: 400 });
      }
    }

    let subscriptions: PushSubscriptionRow[] | null = null;
    let subscriptionsError: PostgrestError | null = null;
    if (isTeacherTarget) {
      const result = await supabaseAdmin.from("teacher_push_subscriptions").select("id, teacher_id, endpoint, subscription").eq("teacher_id", teacherId);
      subscriptions = result.data as PushSubscriptionRow[] | null;
      subscriptionsError = result.error;
    } else {
      let query = supabaseAdmin.from("push_subscriptions").select("id, student_id, endpoint, subscription");

      if (studentId !== null) {
        const numericStudentId = Number(studentId);

        if (Number.isNaN(numericStudentId) || numericStudentId <= 0) {
          return NextResponse.json({ success: false, error: "Invalid studentId." }, { status: 400 });
        }

        query = query.eq("student_id", numericStudentId);
      }

      if (studentId === null && Array.isArray(body?.studentIds)) {
        if (requestedStudentIds.length === 0) {
          return NextResponse.json({ success: true, message: "No valid target students were supplied.", sent: 0, failed: 0 });
        }
        query = query.in("student_id", requestedStudentIds);
      } else if (studentId === null && Array.isArray(body?.targetClasses)) {
        if (targetClasses.length === 0) {
          return NextResponse.json({ success: true, message: "No target classes were supplied.", sent: 0, failed: 0 });
        }
        const { data: targetStudents, error: targetStudentsError } = await supabaseAdmin
          .from("students")
          .select("id,class_name")
          .or("is_active.eq.true,is_active.is.null");
        if (targetStudentsError) {
          return NextResponse.json({ success: false, error: targetStudentsError.message }, { status: 500 });
        }
        const normalizeTargetClass = (value: unknown) => String(value ?? "").trim().replace(/\s+/g, " ").toUpperCase();
        const targetStudentIds = Array.from(new Set((targetStudents || [])
          .filter((student: { id: number; class_name: string | null }) => targetClasses.includes(normalizeTargetClass(student.class_name)))
          .map((student: { id: number }) => Number(student.id))
          .filter((id: number) => Number.isInteger(id) && id > 0)));
        if (targetStudentIds.length === 0) {
          return NextResponse.json({ success: true, message: "No students matched the target classes.", sent: 0, failed: 0 });
        }
        query = query.in("student_id", targetStudentIds);
      }

      const result = await query;
      subscriptions = result.data as PushSubscriptionRow[] | null;
      subscriptionsError = result.error;
    }

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

    if (isTeacherTarget) {
      const rows = (subscriptions || []) as PushSubscriptionRow[];
      const notificationKey = typeof body?.notificationKey === "string" ? body.notificationKey : "";
      const payload = JSON.stringify({
        title,
        message,
        category,
        tag: notificationKey || `racer-academy-${category}-${Date.now()}`,
        notificationKey,
        body: message,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        url,
        silent: false,
        renotify: true,
      });
      let sent = 0;
      let failed = 0;
      for (const row of rows) {
        const subscription = row.subscription;
        if (subscription?.type === "fcm") {
          if (!firebaseAdminApp || !subscription.token) {
            failed++;
            continue;
          }
          try {
            await getMessaging(firebaseAdminApp).send({
              token: subscription.token,
              notification: { title, body: message },
              data: { url, category, notificationKey },
              android: { priority: "high", notification: { channelId: "racer_academy_v4", sound: "racer_notification", ...(category === "quiz_submission" ? { priority: "max" as const } : {}) } },
            });
            sent++;
          } catch (pushError: unknown) {
            failed++;
            console.error("Teacher FCM notification error:", pushError);
            const pushErrorCode = (pushError as { code?: string } | null)?.code;
            if (pushErrorCode === "messaging/registration-token-not-registered" || pushErrorCode === "messaging/invalid-registration-token") {
              await supabaseAdmin.from("push_subscriptions").delete().eq("id", row.id);
            }
          }
          continue;
        }
        const endpoint = row.endpoint || subscription?.endpoint;
        const p256dh = subscription?.keys?.p256dh;
        const auth = subscription?.keys?.auth;
        if (!endpoint || !p256dh || !auth) {
          failed++;
          continue;
        }
        try {
          await webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, payload);
          sent++;
        } catch (pushError: unknown) {
          failed++;
          const statusCode = (pushError as { statusCode?: number } | null)?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await supabaseAdmin.from("push_subscriptions").delete().eq("id", row.id);
          }
          console.error("Teacher web push notification error:", pushError);
        }
      }
      return NextResponse.json({ success: sent > 0, sent, failed, total: rows.length, message: sent ? "Teacher push notification sent." : "No registered teacher device received the push." });
    }

    // Keep the in-app inbox in sync with push messages. Recipients come only from the
    // explicit student ID, explicit student IDs, or matching target classes above.
    let recipientStudentIds: number[] = [];
    if (studentId !== null) recipientStudentIds = [Number(studentId)];
    else if (Array.isArray(body?.studentIds)) recipientStudentIds = requestedStudentIds;
    else if (Array.isArray(body?.targetClasses)) {
      const normalized = (value: unknown) => String(value ?? "").trim().replace(/\s+/g, " ").toUpperCase();
      const { data: matchingStudents, error: matchingError } = await supabaseAdmin.from("students").select("id,class_name").or("is_active.eq.true,is_active.is.null");
      if (matchingError) return NextResponse.json({ success: false, error: matchingError.message }, { status: 500 });
      recipientStudentIds = Array.from(new Set((matchingStudents || []).filter((student: { id: number; class_name: string | null }) => targetClasses.includes(normalized(student.class_name))).map((student: { id: number }) => Number(student.id))));
    } else if (category === "announcement") {
      // Announcements are school-wide content; they contain no student-specific data.
      const { data: allStudents, error: studentsError } = await supabaseAdmin.from("students").select("id").or("is_active.eq.true,is_active.is.null");
      if (studentsError) return NextResponse.json({ success: false, error: studentsError.message }, { status: 500 });
      recipientStudentIds = (allStudents || []).map((student: { id: number }) => Number(student.id)).filter((id: number) => Number.isInteger(id) && id > 0);
    }

    if (recipientStudentIds.length) {
      const { data: existingStudents, error: recipientError } = await supabaseAdmin.from("students").select("id").in("id", recipientStudentIds);
      if (recipientError) return NextResponse.json({ success: false, error: recipientError.message }, { status: 500 });
      const validIds = new Set((existingStudents || []).map((student: { id: number }) => Number(student.id)));
      recipientStudentIds = recipientStudentIds.filter((id) => validIds.has(id));
      if (["fees", "fee_pending", "fee_paid", "fee_refunded"].includes(category) && !validIds.has(Number(studentId))) {
        return NextResponse.json({ success: false, error: "The fee notification student record does not exist." }, { status: 404 });
      }
    }
    if (!recipientStudentIds.length) {
      return NextResponse.json({ success: true, sent: 0, failed: 0, total: 0, message: "No eligible student recipients were selected; nothing was broadcast." });
    }

    let alreadyNotified: number[] = [];
    if (notificationKey && recipientStudentIds.length) {
      const { data: existingNotices, error: existingNoticeError } = await supabaseAdmin.from("student_notifications")
        .select("student_id").in("student_id", recipientStudentIds).contains("metadata", { notificationKey });
      if (existingNoticeError) return NextResponse.json({ success: false, error: existingNoticeError.message }, { status: 500 });
      alreadyNotified = Array.from(new Set((existingNotices || []).map((notice: { student_id: number }) => Number(notice.student_id))));
    }
    const pendingNoticeIds = recipientStudentIds.filter((id) => !alreadyNotified.includes(id));
    if (pendingNoticeIds.length) {
      const noticeRows = pendingNoticeIds.map((recipientId) => ({
        student_id: recipientId,
        category: category === "quiz" ? "quiz_test" : category === "homework" ? "general" : category === "fees" ? "fee_pending" : category,
        title: String(title).slice(0, 180),
        message: String(message).slice(0, 2000),
        url,
        is_read: false,
        metadata: { ...(body?.metadata && typeof body.metadata === "object" ? body.metadata : {}), ...(notificationKey ? { notificationKey } : {}), ...(announcementId ? { announcementId: String(announcementId) } : {}) },
      }));
      const { error: noticeInsertError } = await supabaseAdmin.from("student_notifications").insert(noticeRows);
      if (noticeInsertError) return NextResponse.json({ success: false, error: `Notification saved but push dispatch could not continue: ${noticeInsertError.message}` }, { status: 500 });
    }
    if (notificationKey && recipientStudentIds.length && alreadyNotified.length === recipientStudentIds.length) {
      return NextResponse.json({ success: true, sent: 0, failed: 0, total: 0, duplicate: true, message: "This update was already delivered today." });
    }

    const rows = ((subscriptions || []) as PushSubscriptionRow[])
      .filter((row) => pendingNoticeIds.includes(Number(row.student_id)));

    if (rows.length === 0) {
      return NextResponse.json(
        {
          success: pendingNoticeIds.length > 0 || alreadyNotified.length > 0,
          message:
            "The update is in the student's in-app inbox. No push-enabled device is currently registered.",
          sent: 0,
          failed: 0,
          total: 0,
        },
        { status: 200 }
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
      category,
      tag: notificationKey || `racer-academy-${category}-${Date.now()}`,
      notificationKey,
      body: message,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      url,
      announcementId: announcementId ? String(announcementId) : "",

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

       if (storedSubscription?.type === "fcm") {
        const token = storedSubscription?.token;
        if (!firebaseAdminApp || !token) {
          failed++;
          console.error("Invalid native FCM subscription record:", row.id);
          continue;
        }
        try {
          await getMessaging(firebaseAdminApp).send({token,notification:{title,body:message},data:{url,category,announcementId:announcementId ? String(announcementId) : ""},android:{priority:"high",notification:{channelId:"racer_academy_v4",sound:"racer_notification",...(category === "quiz_submission" ? {priority:"max" as const} : {})}}});
          sent++;
          console.log("Native FCM notification sent successfully:", row.id);
        } catch (pushError:any) {
          failed++;
          console.error("Native FCM notification error:",pushError);
          if (pushError?.code === "messaging/registration-token-not-registered" || pushError?.code === "messaging/invalid-registration-token") {
            await supabaseAdmin.from("push_subscriptions").delete().eq("id", row.id);
          }
        }
        continue;
      }

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







