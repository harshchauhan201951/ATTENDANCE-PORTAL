import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readStudentSession } from "../../../../lib/server/student-session";
import type { MonthlyResultPaperPhoto, MonthlyResultSnapshot } from "../../../../lib/monthly-result";

export const runtime = "nodejs";

const BUCKET = "monthly-result-paper-photos";
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_PHOTOS_PER_STUDENT = 10;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const admin = supabaseUrl && serviceKey
  ? createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

function responseError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function positiveInt(value: unknown) {
  const result = Number(value);
  return Number.isInteger(result) && result > 0 ? result : null;
}

function validMonthKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

async function ensureBucket() {
  if (!admin) throw new Error("Supabase service configuration is missing.");
  const { error } = await admin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: MAX_FILE_SIZE,
    allowedMimeTypes: [...ALLOWED_TYPES],
  });
  if (error && !/already exists|duplicate/i.test(error.message)) throw new Error(error.message);
}

async function teacherCanAccessStudent(teacherId: number, studentId: number) {
  if (!admin) throw new Error("Supabase service configuration is missing.");
  const { data: teacher, error: teacherError } = await admin.from("teachers").select("id").eq("id", teacherId).maybeSingle();
  if (teacherError) throw new Error(teacherError.message);
  if (!teacher) return false;
  if (teacherId === 1) return true;
  const { data, error } = await admin.rpc("get_teacher_assigned_student_ids", { p_teacher_id: teacherId });
  if (error) throw new Error(error.message);
  return (data || []).some((row: { student_id: number }) => Number(row.student_id) === studentId);
}

export async function POST(request: Request) {
  try {
    if (!admin) return responseError("Supabase service configuration is missing.", 500);
    const body = await request.json();
    const teacherId = positiveInt(body?.teacherId);
    const studentId = positiveInt(body?.studentId);
    const monthKey = body?.monthKey;
    const action = String(body?.action || "prepare");
    if (!teacherId || !studentId || !validMonthKey(monthKey)) return responseError("Choose a valid student and result month.");
    if (!(await teacherCanAccessStudent(teacherId, studentId))) return responseError("This student is not assigned to your teacher account.", 403);

    const { data: row, error: rowError } = await admin.from("monthly_results").select("snapshot").eq("month_key", monthKey).eq("student_id", studentId).maybeSingle();
    if (rowError) throw new Error(rowError.message);
    if (!row?.snapshot) return responseError("Save this monthly result first, then upload the student's paper photos.", 409);

    const current = Array.isArray((row.snapshot as MonthlyResultSnapshot).paperPhotos)
      ? (row.snapshot as MonthlyResultSnapshot).paperPhotos || []
      : [];
    const storage = admin.storage.from(BUCKET);
    if (action === "prepare") {
      const files = Array.isArray(body?.files) ? body.files as Array<{ name?: unknown; type?: unknown; size?: unknown }> : [];
      if (!files.length) return responseError("Choose at least one JPG, PNG, or WebP paper photo.");
      if (files.length > MAX_PHOTOS_PER_STUDENT) return responseError(`Upload up to ${MAX_PHOTOS_PER_STUDENT} photos at a time.`);
      if (files.some((file) => typeof file.type !== "string" || !ALLOWED_TYPES.has(file.type))) return responseError("Paper photos must be JPG, PNG, or WebP images.", 415);
      if (files.some((file) => !Number.isFinite(Number(file.size)) || Number(file.size) <= 0 || Number(file.size) > MAX_FILE_SIZE)) return responseError("Each paper photo must be 8 MB or smaller.", 413);
      if (current.length + files.length > MAX_PHOTOS_PER_STUDENT) return responseError(`This student can have up to ${MAX_PHOTOS_PER_STUDENT} paper photos per monthly result.`);
      await ensureBucket();
      const uploads = await Promise.all(files.map(async (file) => {
        const type = String(file.type);
        const extension = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
        const path = `${monthKey}/${studentId}/${randomUUID()}.${extension}`;
        const { data, error } = await storage.createSignedUploadUrl(path, { upsert: false });
        if (error) throw new Error(error.message);
        return { path, token: data.token, name: String(file.name || "Paper photo").slice(0, 160) };
      }));
      return NextResponse.json({ success: true, uploads });
    }

    if (action !== "complete") return responseError("Unsupported paper photo action.");
    const uploads = Array.isArray(body?.uploads) ? body.uploads as Array<{ path?: unknown; name?: unknown }> : [];
    if (!uploads.length || uploads.length > MAX_PHOTOS_PER_STUDENT) return responseError("No uploaded paper photos were found.");
    if (current.length + uploads.length > MAX_PHOTOS_PER_STUDENT) return responseError(`This student can have up to ${MAX_PHOTOS_PER_STUDENT} paper photos per monthly result.`);
    const additions: MonthlyResultPaperPhoto[] = uploads.map((upload) => ({
      path: String(upload.path || ""),
      name: String(upload.name || "Paper photo").slice(0, 160),
      uploadedAt: new Date().toISOString(),
    }));
    const folder = `${monthKey}/${studentId}`;
    if (additions.some((photo) => !photo.path.startsWith(`${folder}/`) || photo.path.includes("..") || current.some((old) => old.path === photo.path))) {
      return responseError("The uploaded photos do not belong to this student's result.", 403);
    }
    const { data: storedFiles, error: listError } = await storage.list(folder, { limit: 100 });
    if (listError) throw new Error(listError.message);
    const storedNames = new Set((storedFiles || []).map((file) => `${folder}/${file.name}`));
    if (additions.some((photo) => !storedNames.has(photo.path))) return responseError("A paper photo did not finish uploading. Please try again.", 400);

    const nextSnapshot = { ...(row.snapshot as MonthlyResultSnapshot), paperPhotos: [...current, ...additions] };
    const { error: updateError } = await admin.from("monthly_results").update({ snapshot: nextSnapshot, updated_at: new Date().toISOString() }).eq("month_key", monthKey).eq("student_id", studentId);
    if (updateError) throw new Error(updateError.message);
    return NextResponse.json({ success: true, photos: nextSnapshot.paperPhotos });
  } catch (error) {
    return responseError(error instanceof Error ? error.message : "Paper photo upload failed.", 500);
  }
}

export async function GET(request: Request) {
  try {
    if (!admin) return responseError("Supabase service configuration is missing.", 500);
    const session = readStudentSession(request);
    if (!session) return responseError("Please sign in again to view your result photos.", 401);
    const url = new URL(request.url);
    const monthKey = url.searchParams.get("monthKey");
    if (!validMonthKey(monthKey)) return responseError("Choose a valid result month.");
    const { data: period, error: periodError } = await admin.from("monthly_result_periods").select("is_released,scheduled_release_at").eq("month_key", monthKey).maybeSingle();
    if (periodError) throw new Error(periodError.message);
    const releaseAt = period?.scheduled_release_at ? new Date(period.scheduled_release_at).getTime() : NaN;
    if (!period || (!period.is_released && (!Number.isFinite(releaseAt) || Date.now() < releaseAt))) {
      return responseError("These result photos are not released yet.", 404);
    }
    const { data: row, error } = await admin.from("monthly_results").select("snapshot").eq("month_key", monthKey).eq("student_id", session.studentId).maybeSingle();
    if (error) throw new Error(error.message);
    const photos = Array.isArray((row?.snapshot as MonthlyResultSnapshot | null)?.paperPhotos)
      ? (row?.snapshot as MonthlyResultSnapshot).paperPhotos || []
      : [];
    const signedPhotos = await Promise.all(photos.map(async (photo) => {
      const { data, error: signedError } = await admin!.storage.from(BUCKET).createSignedUrl(photo.path, 60 * 60);
      return signedError ? null : { ...photo, signedUrl: data.signedUrl };
    }));
    return NextResponse.json({ success: true, photos: signedPhotos.filter(Boolean) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return responseError(error instanceof Error ? error.message : "Paper photos could not be loaded.", 500);
  }
}
