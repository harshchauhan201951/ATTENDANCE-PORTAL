import { NextResponse } from "next/server";
import { experimental_generateSpeech as generateSpeech } from "ai";
import { createGateway } from "@ai-sdk/gateway";
import { allowSaathiRequest, isSameOriginRequest, readStudentSession } from "../../../../../lib/server/student-session";
import { getAiProvider } from "../../../../../lib/server/ai-provider";

export const runtime = "nodejs";

const supportedVoices = new Set(["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse", "marin", "cedar"]);

function retryAfterSeconds(value: string | null) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(1, Math.ceil((timestamp - Date.now()) / 1_000)) : null;
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ success: false, error: "Request origin could not be verified." }, { status: 403 });
  const session = readStudentSession(request);
  if (!session) return NextResponse.json({ success: false, error: "Sign in again to play voice replies." }, { status: 401 });
  if (!allowSaathiRequest(`speech:${session.studentId}`, 12)) return NextResponse.json({ success: false, error: "Please wait before replaying another answer." }, { status: 429 });
  const aiProvider = getAiProvider();
  if (!aiProvider.configured) return NextResponse.json({ success: false, error: "AI voice isn’t connected in this environment. Add AI_GATEWAY_API_KEY to .env.local and restart localhost, or add it to Vercel and redeploy." }, { status: 503 });

  try {
    const body = await request.json() as { text?: unknown; voice?: unknown; speed?: unknown };
    const text = typeof body.text === "string" ? body.text.trim().slice(0, 3_500) : "";
    if (!text) return NextResponse.json({ success: false, error: "There is no answer to play." }, { status: 400 });
    const requestedVoice = typeof body.voice === "string" ? body.voice : process.env.OPENAI_TTS_VOICE || "shimmer";
    const configuredVoice = requestedVoice;
    const gatewayVoices = new Set(["alloy", "echo", "fable", "nova", "onyx", "shimmer"]);
    const voice = supportedVoices.has(configuredVoice) && (!aiProvider.throughGateway || gatewayVoices.has(configuredVoice)) ? configuredVoice : "shimmer";
    const requestedSpeed = Number(body.speed ?? 1);
    const speed = Number.isFinite(requestedSpeed) ? Math.max(0.75, Math.min(1.25, requestedSpeed)) : 1;
    const providerSignal = AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]);
    if (aiProvider.throughGateway) {
      const gatewayProvider = createGateway({ apiKey: aiProvider.apiKey });
      let result;
      try {
        result = await generateSpeech({
          model: gatewayProvider.speechModel(process.env.AI_GATEWAY_TTS_MODEL || "openai/tts-1"),
          text,
          voice,
          speed,
          outputFormat: "mp3",
          maxRetries: 0,
          abortSignal: providerSignal,
        });
      } catch (error) {
        if (request.signal.aborted) return new Response(null, { status: 499 });
        const status = Number((error as { statusCode?: unknown })?.statusCode);
        console.error(`RACER Saathi Gateway speech request failed: status=${Number.isFinite(status) ? status : "unknown"}`);
        if (status === 401) return NextResponse.json({ success: false, error: "AI Gateway key rejected. Check AI_GATEWAY_API_KEY for this environment, then restart localhost or redeploy Vercel." }, { status: 502 });
        if (status === 403) return NextResponse.json({ success: false, error: "AI Gateway voice access is not enabled for this key or project. Check model access and billing." }, { status: 502 });
        if (status === 404) return NextResponse.json({ success: false, error: "The Gateway voice model is unavailable. Set AI_GATEWAY_TTS_MODEL to openai/tts-1 or leave it unset." }, { status: 502 });
        if (status === 429) return NextResponse.json({ success: false, error: "AI voice is busy or its Gateway limit was reached. Please wait and try again." }, { status: 429 });
        return NextResponse.json({ success: false, error: "AI voice provider is temporarily unavailable. Please try again shortly." }, { status: 502 });
      }
      // Copy into a plain ArrayBuffer to satisfy the DOM Response body type
      // across Node's newer generic Uint8Array definitions.
      const audioBytes = result.audio.uint8Array;
      const audioBuffer = new ArrayBuffer(audioBytes.byteLength);
      new Uint8Array(audioBuffer).set(audioBytes);
      return new Response(audioBuffer, { headers: { "Content-Type": result.audio.mediaType || "audio/mpeg", "Cache-Control": "no-store", "X-RACER-Voice": voice } });
    }
    const response = await fetch(`${aiProvider.baseUrl}/audio/speech`, {
      method: "POST",
      headers: { Authorization: `Bearer ${aiProvider.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: aiProvider.model(
          aiProvider.throughGateway ? process.env.AI_GATEWAY_TTS_MODEL : process.env.OPENAI_TTS_MODEL,
          aiProvider.throughGateway ? "tts-1" : "gpt-4o-mini-tts",
        ),
        voice,
        input: text,
        speed,
        instructions: aiProvider.throughGateway ? undefined : "Speak warmly and clearly to a school-age student. Aim for a gentle feminine-sounding Indian English accent; pronounce Hindi and Hinglish naturally where possible. Keep the pace calm and encouraging.",
        response_format: "mp3",
      }),
      signal: providerSignal,
    });
    if (!response.ok || !response.body) {
      const providerPayload = await response.json().catch(() => null) as { error?: { type?: unknown; code?: unknown } } | null;
      const providerType = String(providerPayload?.error?.type || "").slice(0, 80);
      const providerCode = String(providerPayload?.error?.code || "").slice(0, 80);
      console.error(`RACER Saathi speech provider request rejected: status=${response.status} type=${providerType || "unknown"} code=${providerCode || "unknown"}`);
      if (response.status === 401) return NextResponse.json({ success: false, error: "AI voice key rejected. Check the AI Gateway/OpenAI secret key in Vercel, then redeploy." }, { status: 502 });
      if (response.status === 403) return NextResponse.json({ success: false, error: "AI voice access is not enabled for this key or project. Academy admin: check API permissions and billing." }, { status: 502 });
      if (response.status === 429 && ["insufficient_quota", "billing_hard_limit_reached", "usage_limit_reached"].includes(providerCode)) return NextResponse.json({ success: false, error: "OpenAI API credits or usage limit are exhausted. Academy admin: check API billing, then try again." }, { status: 503 });
      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        const waitSeconds = retryAfterSeconds(retryAfter);
        const error = waitSeconds
          ? `AI voice is rate-limited. Please wait about ${waitSeconds} seconds before trying again.`
          : "AI voice is rate-limited. Please wait before retrying; repeated attempts can extend the limit.";
        return NextResponse.json({ success: false, error }, {
          status: 429,
          headers: retryAfter ? { "Retry-After": retryAfter } : undefined,
        });
      }
      if (response.status === 404 || providerCode === "model_not_found") return NextResponse.json({ success: false, error: "The configured voice model is unavailable. Academy admin: check AI_GATEWAY_TTS_MODEL or OPENAI_TTS_MODEL." }, { status: 502 });
      return NextResponse.json({ success: false, error: "AI voice provider is temporarily unavailable. Please try again shortly." }, { status: 502 });
    }
    return new Response(response.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-RACER-Voice": voice } });
  } catch {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    return NextResponse.json({ success: false, error: "Voice playback failed. Please try again." }, { status: 502 });
  }
}
