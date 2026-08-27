import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

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
          "id, student_id, amount, status"
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
          "id, student_id, amount, status"
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
          "id, student_id, amount, status"
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