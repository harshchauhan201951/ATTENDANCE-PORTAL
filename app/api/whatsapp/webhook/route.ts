import { NextRequest, NextResponse } from "next/server";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const API_VERSION = process.env.WHATSAPP_API_VERSION || "v23.0";

// WhatsApp Webhook Verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token &&
    VERIFY_TOKEN &&
    token === VERIFY_TOKEN
  ) {
    return new NextResponse(challenge || "", {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  return new NextResponse("Forbidden", {
    status: 403,
  });
}

// Receive WhatsApp Messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log(
      "WhatsApp Webhook Received:",
      JSON.stringify(body, null, 2)
    );

    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    const message = value?.messages?.[0];

    // Ignore events that are not actual messages
    if (!message) {
      return NextResponse.json(
        { success: true },
        { status: 200 }
      );
    }

    const from = message?.from;
    const messageType = message?.type;

    let incomingText = "";

    if (messageType === "text") {
      incomingText = message?.text?.body?.trim() || "";
    }

    console.log("WhatsApp message from:", from);
    console.log("WhatsApp message:", incomingText);

    if (!from || !ACCESS_TOKEN || !PHONE_NUMBER_ID) {
      console.error("WhatsApp configuration is missing.");
      return NextResponse.json(
        { success: false },
        { status: 200 }
      );
    }

    // Basic RACER ACADEMY auto-reply
    let replyText =
      "नमस्ते! 👋\n\n" +
      "RACER ACADEMY में आपका स्वागत है।\n\n" +
      "कृपया अपना प्रश्न भेजें। हम आपकी सहायता करेंगे।";

    const lowerText = incomingText.toLowerCase();

    if (
      lowerText.includes("hello") ||
      lowerText.includes("hi") ||
      lowerText.includes("नमस्ते") ||
      lowerText.includes("हेलो")
    ) {
      replyText =
        "नमस्ते! 👋\n\n" +
        "RACER ACADEMY में आपका स्वागत है।\n\n" +
        "आप फीस, क्लास, टाइमिंग, एडमिशन या अकैडमी से संबंधित कोई भी जानकारी पूछ सकते हैं।";
    }

    if (
      lowerText.includes("fee") ||
      lowerText.includes("fees") ||
      lowerText.includes("फीस")
    ) {
      replyText =
        "RACER ACADEMY की फीस से संबंधित जानकारी के लिए अपना प्रश्न भेजें।\n\n" +
        "हम आपको उपलब्ध फीस एवं संबंधित जानकारी बताएंगे।";
    }

    if (
      lowerText.includes("admission") ||
      lowerText.includes("एडमिशन")
    ) {
      replyText =
        "RACER ACADEMY में एडमिशन से संबंधित जानकारी के लिए कृपया विद्यार्थी की Class बताएं।";
    }

    if (
      lowerText.includes("timing") ||
      lowerText.includes("time") ||
      lowerText.includes("टाइम") ||
      lowerText.includes("टाइमिंग")
    ) {
      replyText =
        "RACER ACADEMY की क्लास टाइमिंग से संबंधित जानकारी के लिए कृपया Class बताएं।";
    }

    const url =
      `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: from,
        type: "text",
        text: {
          preview_url: false,
          body: replyText,
        },
      }),
    });

    const result = await response.json();

    console.log("WhatsApp API Response:", result);

    if (!response.ok) {
      console.error("WhatsApp API Error:", result);

      return NextResponse.json(
        {
          success: false,
          error: result,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "WhatsApp reply sent",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("WhatsApp Webhook Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Webhook processing failed",
      },
      { status: 200 }
    );
  }
}