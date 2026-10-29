import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { createTeacherNotifications } from "../../../../lib/server/teacher-notifications";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const razorpayKeySecret =
  process.env.RAZORPAY_KEY_SECRET;

if (
  !supabaseUrl ||
  !supabaseServiceRoleKey ||
  !razorpayKeySecret
) {
  console.error(
    "Server credentials are missing."
  );
}

const supabaseAdmin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(
        supabaseUrl,
        supabaseServiceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )
    : null;

export async function POST(
  request: NextRequest
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Supabase server credentials are missing.",
        },
        { status: 500 }
      );
    }

    if (!razorpayKeySecret) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Razorpay secret key is not configured.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,

      fee_id,
      feeId,

      student_id,
      studentId,

      month,
      year,
    } = body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Razorpay payment details are missing.",
        },
        { status: 400 }
      );
    }

    /*
     * VERIFY RAZORPAY SIGNATURE
     */

    const generatedSignature =
      crypto
        .createHmac(
          "sha256",
          razorpayKeySecret
        )
        .update(
          `${razorpay_order_id}|${razorpay_payment_id}`
        )
        .digest("hex");

    const signaturesMatch =
      generatedSignature ===
      razorpay_signature;

    if (!signaturesMatch) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment signature verification failed.",
        },
        { status: 400 }
      );
    }

    /*
     * FIND FEE RECORD
     */

    let feeRecord: {
      id: number;
      student_id: number;
      amount: number;
      status: string;
      month?: number;
      year?: number;
    } | null = null;

    /*
     * First preference:
     * fee_id sent from frontend
     */

    const actualFeeId =
      fee_id ?? feeId;

    if (actualFeeId) {
      const {
        data,
        error,
      } = await supabaseAdmin
        .from("fees")
        .select(
          "id, student_id, amount, status, month, year"
        )
        .eq(
          "id",
          Number(actualFeeId)
        )
        .maybeSingle();

      if (error) {
        console.error(
          "Fee lookup error:",
          error
        );

        return NextResponse.json(
          {
            success: false,
            message:
              "Unable to find fee record.",
            error: error.message,
          },
          { status: 500 }
        );
      }

      feeRecord = data;
    }

    /*
     * Second preference:
     * student + month + year
     */

    if (!feeRecord && student_id && month && year) {
      const {
        data,
        error,
      } = await supabaseAdmin
        .from("fees")
        .select(
          "id, student_id, amount, status, month, year"
        )
        .eq(
          "student_id",
          Number(student_id)
        )
        .eq(
          "month",
          Number(month)
        )
        .eq(
          "year",
          Number(year)
        )
        .maybeSingle();

      if (error) {
        console.error(
          "Fee lookup error:",
          error
        );

        return NextResponse.json(
          {
            success: false,
            message:
              "Unable to find fee record.",
            error: error.message,
          },
          { status: 500 }
        );
      }

      feeRecord = data;
    }

    /*
     * Third preference:
     * camelCase studentId
     */

    if (!feeRecord && studentId && month && year) {
      const {
        data,
        error,
      } = await supabaseAdmin
        .from("fees")
        .select(
          "id, student_id, amount, status, month, year"
        )
        .eq(
          "student_id",
          Number(studentId)
        )
        .eq(
          "month",
          Number(month)
        )
        .eq(
          "year",
          Number(year)
        )
        .maybeSingle();

      if (error) {
        console.error(
          "Fee lookup error:",
          error
        );

        return NextResponse.json(
          {
            success: false,
            message:
              "Unable to find fee record.",
            error: error.message,
          },
          { status: 500 }
        );
      }

      feeRecord = data;
    }

    if (!feeRecord) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment verified, but fee record was not found.",
          payment_id:
            razorpay_payment_id,
          order_id:
            razorpay_order_id,
        },
        { status: 404 }
      );
    }

    /*
     * UPDATE FEE RECORD
     */

    const today =
      new Date()
        .toISOString()
        .split("T")[0];

    const {
      data: updatedFee,
      error: updateError,
    } = await supabaseAdmin
      .from("fees")
      .update({
        status: "SUBMITTED",
        payment_date: today,
        transaction_id:
          razorpay_payment_id,
        remarks:
          `Online payment successful. Razorpay Order ID: ${razorpay_order_id}`,
      })
      .eq(
        "id",
        feeRecord.id
      )
      .select()
      .single();

    if (updateError) {
      console.error(
        "Fee update error:",
        updateError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Payment verified, but fee record could not be updated.",
          error:
            updateError.message,
          payment_id:
            razorpay_payment_id,
          order_id:
            razorpay_order_id,
        },
        { status: 500 }
      );
    }

    try {
      const notification = await fetch(new URL("/api/push/send", request.url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: Number(updatedFee.student_id),
          category: "fee_paid",
          title: "Online Fee Payment Successful",
          message: `Your fee payment of ₹${Number(updatedFee.amount).toLocaleString("en-IN")} has been received successfully.`,
          url: "/student/fees",
          notificationKey: `fee-online-paid:${razorpay_payment_id}`,
          metadata: { source: "verified_online_fee_payment", feeId: Number(updatedFee.id), paymentId: String(razorpay_payment_id), amount: Number(updatedFee.amount) },
        }),
      });
      if (!notification.ok) console.error("Online fee payment notification failed:", await notification.json().catch(() => null));
    } catch (notificationError) {
      console.error("Online fee notification request failed:", notificationError);
    }

    try {
      const studentIdNumber = Number(updatedFee.student_id);
      const [{ data: student, error: studentError }, { data: assignments, error: assignmentsError }] = await Promise.all([
        supabaseAdmin.from("students").select("student_name,student_username").eq("id", studentIdNumber).maybeSingle(),
        supabaseAdmin.from("teacher_student_assignments").select("teacher_id").eq("student_id", studentIdNumber),
      ]);
      if (studentError) throw studentError;
      if (assignmentsError) throw assignmentsError;

      const studentName = String(student?.student_name || student?.student_username || `Student #${studentIdNumber}`).trim();
      const teacherIds = Array.from(new Set([1, ...(assignments || []).map((assignment: { teacher_id: number }) => Number(assignment.teacher_id))]
        .filter((teacherId) => Number.isInteger(teacherId) && teacherId > 0)));
      const feeMonth = Number(updatedFee.month ?? feeRecord.month ?? month);
      const feeYear = Number(updatedFee.year ?? feeRecord.year ?? year);
      const monthLabel = Number.isInteger(feeMonth) && feeMonth >= 1 && feeMonth <= 12
        ? new Intl.DateTimeFormat("en-IN", { month: "long", timeZone: "Asia/Kolkata" }).format(new Date(Date.UTC(2026, feeMonth - 1, 15)))
        : "monthly";
      const paidOn = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date());
      const notificationKey = `fee-online-paid:${razorpay_payment_id}`;
      const message = `${studentName} paid ₹${Number(updatedFee.amount).toLocaleString("en-IN")} for ${monthLabel} ${feeYear} fee on ${paidOn}.`;
      const saved = await createTeacherNotifications({
        teacherIds,
        title: `Fee Paid: ${studentName}`,
        message,
        category: "fee_paid",
        url: "/teacher/fees",
        metadata: { source: "verified_online_fee_payment", studentId: studentIdNumber, studentName, feeId: Number(updatedFee.id), month: feeMonth, year: feeYear, amount: Number(updatedFee.amount), paymentId: String(razorpay_payment_id) },
        notificationKey,
      });

      if (saved.inserted > 0) {
        await Promise.all(teacherIds.map(async (teacherId) => {
          try {
            const response = await fetch(new URL("/api/push/send", request.url), {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseServiceRoleKey}` },
              body: JSON.stringify({
                teacherId,
                category: "fee_paid",
                title: `Fee Paid: ${studentName}`,
                message,
                url: "/teacher/fees",
                notificationKey,
                metadata: { studentId: studentIdNumber, studentName, feeId: Number(updatedFee.id), month: feeMonth, year: feeYear, amount: Number(updatedFee.amount), paymentId: String(razorpay_payment_id) },
              }),
            });
            if (!response.ok) console.error(`Teacher fee push failed for teacher ${teacherId}:`, await response.json().catch(() => null));
          } catch (pushError) {
            console.error(`Teacher fee push request failed for teacher ${teacherId}:`, pushError);
          }
        }));
      }
    } catch (teacherNotificationError) {
      console.error("Teacher fee payment notification could not be saved:", teacherNotificationError);
    }

    /*
     * SUCCESS
     */

    return NextResponse.json({
      success: true,
      message:
        "Payment successful and fee record updated.",
      payment_id:
        razorpay_payment_id,
      order_id:
        razorpay_order_id,
      fee: updatedFee,
    });
  } catch (error) {
    console.error(
      "Payment verification error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while verifying payment.",
      },
      { status: 500 }
    );
  }
}
