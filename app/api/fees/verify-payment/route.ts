import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;
const razorpaySecret =
  process.env.RAZORPAY_KEY_SECRET!;

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey
);

export async function POST(request: Request) {
  try {
    if (!supabaseServiceRoleKey) {
      return NextResponse.json(
        {
          error: "SUPABASE_SERVICE_ROLE_KEY is not configured.",
        },
        { status: 500 }
      );
    }

    if (!razorpaySecret) {
      return NextResponse.json(
        {
          error: "RAZORPAY_KEY_SECRET is not configured.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const feeId = Number(body.feeId);
    const razorpayOrderId = String(
      body.razorpay_order_id || ""
    );
    const razorpayPaymentId = String(
      body.razorpay_payment_id || ""
    );
    const razorpaySignature = String(
      body.razorpay_signature || ""
    );

    if (!Number.isInteger(feeId) || feeId <= 0) {
      return NextResponse.json(
        {
          error: "Invalid fee ID.",
        },
        { status: 400 }
      );
    }

    if (
      !razorpayOrderId ||
      !razorpayPaymentId ||
      !razorpaySignature
    ) {
      return NextResponse.json(
        {
          error: "Incomplete Razorpay payment information.",
        },
        { status: 400 }
      );
    }

    const { data: fee, error: feeError } =
      await supabaseAdmin
        .from("fees")
        .select(
          "id, student_id, amount, status, razorpay_order_id"
        )
        .eq("id", feeId)
        .maybeSingle();

    if (feeError) {
      console.error("Fee lookup error:", feeError);

      return NextResponse.json(
        {
          error: "Unable to find fee record.",
        },
        { status: 500 }
      );
    }

    if (!fee) {
      return NextResponse.json(
        {
          error: "Fee record not found.",
        },
        { status: 404 }
      );
    }

    if (!fee.razorpay_order_id) {
      return NextResponse.json(
        {
          error:
            "Razorpay order is not linked to this fee.",
        },
        { status: 400 }
      );
    }

    const serverOrderId =
      String(fee.razorpay_order_id);

    if (serverOrderId !== razorpayOrderId) {
      return NextResponse.json(
        {
          error:
            "Razorpay order verification failed.",
        },
        { status: 400 }
      );
    }

    const generatedSignature =
      crypto
        .createHmac(
          "sha256",
          razorpaySecret
        )
        .update(
          `${serverOrderId}|${razorpayPaymentId}`
        )
        .digest("hex");

    const receivedBuffer = Buffer.from(
      razorpaySignature,
      "utf8"
    );

    const generatedBuffer = Buffer.from(
      generatedSignature,
      "utf8"
    );

    if (
      receivedBuffer.length !==
      generatedBuffer.length
    ) {
      return NextResponse.json(
        {
          error:
            "Payment signature verification failed.",
        },
        { status: 400 }
      );
    }

    const signatureValid =
      crypto.timingSafeEqual(
        receivedBuffer,
        generatedBuffer
      );

    if (!signatureValid) {
      return NextResponse.json(
        {
          error:
            "Payment signature verification failed.",
        },
        { status: 400 }
      );
    }

    const { data: updatedFee, error: updateError } =
      await supabaseAdmin
        .from("fees")
        .update({
          status: "PAID ONLINE",
          payment_method: "ONLINE",
          transaction_id:
            razorpayPaymentId,
          razorpay_order_id:
            serverOrderId,
          razorpay_payment_id:
            razorpayPaymentId,
          razorpay_signature:
            razorpaySignature,
          paid_at:
            new Date().toISOString(),
          payment_date:
            new Date().toISOString().slice(0, 10),
          remarks:
            fee.status === "PAID ONLINE"
              ? undefined
              : "Online payment completed successfully.",
        })
        .eq("id", fee.id)
        .select(
          "id, student_id, month, year, amount, status, payment_date, transaction_id, remarks, created_at, payment_method, razorpay_order_id, razorpay_payment_id, paid_at"
        )
        .single();

    if (updateError) {
      console.error(
        "Fee update error:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Payment verified, but fee record could not be updated.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Payment verified successfully.",
      fee: updatedFee,
    });
  } catch (error) {
    console.error(
      "Razorpay verification error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to verify payment.",
      },
      { status: 500 }
    );
  }
}