import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";

const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Supabase server credentials are missing.");
}

const supabaseAdmin = createClient(
  supabaseUrl!,
  supabaseServiceRoleKey!
);

export async function POST(request: Request) {
  try {
    if (!razorpayKeyId || !razorpayKeySecret) {
      return NextResponse.json(
        {
          error: "Razorpay keys are not configured.",
        },
        { status: 500 }
      );
    }

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY is not configured.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const feeId = Number(body.feeId);

    if (!Number.isInteger(feeId) || feeId <= 0) {
      return NextResponse.json(
        {
          error: "Invalid fee ID.",
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

    if (
      fee.status === "PAID ONLINE" ||
      fee.status === "PAID"
    ) {
      return NextResponse.json(
        {
          error: "This fee is already paid.",
        },
        { status: 400 }
      );
    }

    const amount = Number(fee.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          error: "Invalid fee amount.",
        },
        { status: 400 }
      );
    }

    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `fee_${fee.id}_${Date.now()}`,
    });

    const { error: updateError } =
      await supabaseAdmin
        .from("fees")
        .update({
          razorpay_order_id: order.id,
        })
        .eq("id", fee.id);

    if (updateError) {
      console.error(
        "Razorpay order ID update error:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Order created, but fee record could not be updated.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      keyId: razorpayKeyId,
      feeId: fee.id,
    });
  } catch (error) {
    console.error(
      "Razorpay create order error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create Razorpay order.",
      },
      { status: 500 }
    );
  }
}