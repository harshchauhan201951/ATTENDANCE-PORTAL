import { createHmac, timingSafeEqual } from "node:crypto";

export const STUDENT_SESSION_COOKIE = "racer_student_session";
export const STUDENT_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export type StudentSession = { studentId: number; username: string; expiresAt: number };

function secret() {
  const value = process.env.RACER_STUDENT_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error("Student session signing is not configured.");
  return value;
}

export function createStudentSessionToken(studentId: number, username: string) {
  const payload = Buffer.from(JSON.stringify({
    studentId,
    username,
    expiresAt: Math.floor(Date.now() / 1000) + STUDENT_SESSION_MAX_AGE_SECONDS,
  })).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readStudentSession(request: Request): StudentSession | null {
  const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${STUDENT_SESSION_COOKIE}=`))?.slice(STUDENT_SESSION_COOKIE.length + 1);
  if (!cookie) return null;
  const [payload, suppliedSignature] = cookie.split(".");
  if (!payload || !suppliedSignature) return null;
  try {
    const expected = createHmac("sha256", secret()).update(payload).digest();
    const supplied = Buffer.from(suppliedSignature, "base64url");
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<StudentSession>;
    if (!Number.isInteger(value.studentId) || Number(value.studentId) <= 0 || typeof value.username !== "string" || !value.username || !Number.isInteger(value.expiresAt) || Number(value.expiresAt) <= Math.floor(Date.now() / 1000)) return null;
    return { studentId: Number(value.studentId), username: value.username, expiresAt: Number(value.expiresAt) };
  } catch {
    return null;
  }
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const parsedOrigin = new URL(origin);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const requestHost = request.headers.get("host")?.trim() || forwardedHost;
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const requestProtocol = forwardedProtocol
      ? `${forwardedProtocol.replace(/:$/, "")}:`
      : new URL(request.url).protocol;

    // Behind a TLS-terminating proxy, request.url can contain the internal
    // HTTP origin while the browser correctly sends the public HTTPS origin.
    // Validate against the incoming host and forwarded public protocol.
    if (requestHost) {
      return parsedOrigin.host.toLowerCase() === requestHost.toLowerCase()
        && parsedOrigin.protocol === requestProtocol;
    }

    return parsedOrigin.origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

const rateBuckets = new Map<string, { startedAt: number; count: number }>();

export function allowSaathiRequest(key: string, limit: number, windowMs = 60_000) {
  const now = Date.now();
  const current = rateBuckets.get(key);
  if (!current || now - current.startedAt >= windowMs) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    if (rateBuckets.size > 2_000) {
      for (const [entry, bucket] of rateBuckets) if (now - bucket.startedAt >= windowMs) rateBuckets.delete(entry);
    }
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}
