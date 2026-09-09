import { NextRequest, NextResponse } from "next/server";

type Recipient = {
  id?: string;
  name?: string;
  phone: string;
};

type VoiceType = "female" | "male";

function normalizePhone(phone: string): string {
  const value = String(phone || "").trim();

  if (!value) {
    return "";
  }

  const digits = value.replace(/\D/g, "");

  // Indian 10-digit number
  if (digits.length === 10) {
    return `+91${digits}`;
  }

  // Indian number written as 91XXXXXXXXXX
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  // Already international number
  if (value.startsWith("+")) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getVoice(voiceType: VoiceType): string {
  /*
   * Twilio currently supports Google English-India voices.
   *
   * Female:
   * Google.en-IN-Neural2-D
   *
   * Male:
   * Google.en-IN-Neural2-B
   */

  return voiceType === "female"
    ? "Google.en-IN-Neural2-D"
    : "Google.en-IN-Neural2-B";
}

export async function POST(request: NextRequest) {
  try {
    const accountSid =
      process.env.TWILIO_ACCOUNT_SID?.trim();

    const authToken =
      process.env.TWILIO_AUTH_TOKEN?.trim();

    const fromNumber =
      process.env.TWILIO_PHONE_NUMBER?.trim();

    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Twilio configuration is missing. Please check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER in .env.local.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    const voiceType: VoiceType =
      body.voiceType === "male"
        ? "male"
        : "female";

    const recipients: Recipient[] =
      Array.isArray(body.recipients)
        ? body.recipients
        : [];

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          message: "Voice message is required.",
        },
        { status: 400 }
      );
    }

    if (message.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Voice message cannot exceed 1000 characters.",
        },
        { status: 400 }
      );
    }

    if (!recipients.length) {
      return NextResponse.json(
        {
          success: false,
          message:
            "At least one recipient is required.",
        },
        { status: 400 }
      );
    }

    if (recipients.length > 50) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Maximum 50 recipients can be called in one request.",
        },
        { status: 400 }
      );
    }

    const voice = getVoice(voiceType);

    const twiml = `
<Response>
  <Say
    voice="${voice}"
    language="en-IN"
  >${escapeXml(message)}</Say>
  <Hangup/>
</Response>
`.trim();

    const authorization = Buffer.from(
      `${accountSid}:${authToken}`
    ).toString("base64");

    const results: Array<{
      id: string;
      name: string;
      phone: string;
      twilioPhone: string;
      success: boolean;
      callSid?: string;
      status?: string;
      error?: string;
    }> = [];

    /*
     * Calls are created one by one.
     * This makes the result easier to track and prevents
     * a sudden large burst of requests.
     */
    for (const recipient of recipients) {
      const originalPhone =
        typeof recipient.phone === "string"
          ? recipient.phone.trim()
          : "";

      const phone = normalizePhone(
        originalPhone
      );

      const id = String(
        recipient.id || ""
      );

      const name = String(
        recipient.name || "Student"
      );

      if (!phone) {
        results.push({
          id,
          name,
          phone: originalPhone,
          twilioPhone: "",
          success: false,
          error: "Phone number is empty.",
        });

        continue;
      }

      try {
        const formData =
          new URLSearchParams();

        formData.append(
          "To",
          phone
        );

        formData.append(
          "From",
          fromNumber
        );

        formData.append(
          "Twiml",
          twiml
        );

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${authorization}`,
              "Content-Type":
                "application/x-www-form-urlencoded",
            },
            body: formData.toString(),
            cache: "no-store",
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          results.push({
            id,
            name,
            phone: originalPhone,
            twilioPhone: phone,
            success: false,
            error:
              data?.message ||
              data?.error_message ||
              `Twilio returned HTTP ${response.status}.`,
          });

          continue;
        }

        results.push({
          id,
          name,
          phone: originalPhone,
          twilioPhone: phone,
          success: true,
          callSid: data.sid,
          status: data.status,
        });
      } catch (error) {
        results.push({
          id,
          name,
          phone: originalPhone,
          twilioPhone: phone,
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Unknown calling error.",
        });
      }
    }

    const successful =
      results.filter(
        (item) => item.success
      );

    const failed =
      results.filter(
        (item) => !item.success
      );

    return NextResponse.json({
      success: successful.length > 0,
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      results,
    });
  } catch (error) {
    console.error(
      "Twilio voice call API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to create voice calls.",
      },
      { status: 500 }
    );
  }
}