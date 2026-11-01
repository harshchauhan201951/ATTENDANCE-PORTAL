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
  const uploadedPaths: string[] = [];
  try {
    if (!admin) return responseError("Supabase service configuration is missing.", 500);
    const form = await request.formData();
    const teacherId = positiveInt(form.get("teacherId"));
    const studentId = positiveInt(form.get("studentId"));
    const monthKey = form.get("monthKey");
    const files = form.getAll("files").filter((file): file is File => file instanceof File && file.size > 0);
    if (!teacherId || !studentId || !validMonthKey(monthKey)) return responseError("Choose a valid student and result month.");
    if (!files.length) return responseError("Choose at least one JPG, PNG, or WebP paper photo.");
    if (files.length > MAX_PHOTOS_PER_STUDENT) return responseError(`Upload up to ${MAX_PHOTOS_PER_STUDENT} photos at a time.`);
    if (files.some((file) => !ALLOWED_TYPES.has(file.type))) return responseError("Paper photos must be JPG, PNG, or WebP images.", 415);
    if (files.some((file) => file.size > MAX_FILE_SIZE)) return responseError("Each paper photo must be 8 MB or smaller.", 413);
    if (!(await teacherCanAccessStudent(teacherId, studentId))) return responseError("This student is not assigned to your teacher account.", 403);

    const { data: row, error: rowError } = await admin.from("monthly_results").select("snapshot").eq("month_key", monthKey).eq("student_id", studentId).maybeSingle();
    if (rowError) throw new Error(rowError.message);
    if (!row?.snapshot) return responseError("Save this monthly result first, then upload the student's paper photos.", 409);

    await ensureBucket();
    const current = Array.isArray((row.snapshot as MonthlyResultSnapshot).paperPhotos)
      ? (row.snapshot as MonthlyResultSnapshot).paperPhotos || []
      : [];
    if (current.length + files.length > MAX_PHOTOS_PER_STUDENT) return responseError(`This student can have up to ${MAX_PHOTOS_PER_STUDENT} paper photos per monthly result.`);

    const additions: MonthlyResultPaperPhoto[] = [];
    for (const file of files) {
      const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${monthKey}/${studentId}/${randomUUID()}.${extension}`;
      const { error } = await admin.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false, cacheControl: "3600" });
      if (error) throw new Error(error.message);
      uploadedPaths.push(path);
      additions.push({ path, name: file.name.slice(0, 160) || `Paper photo ${additions.length + 1}`, uploadedAt: new Date().toISOString() });
    }
    const nextSnapshot = { ...(row.snapshot as MonthlyResultSnapshot), paperPhotos: [...current, ...additions] };
    const { error: updateError } = await admin.from("monthly_results").update({ snapshot: nextSnapshot, updated_at: new Date().toISOString() }).eq("month_key", monthKey).eq("student_id", studentId);
    if (updateError) throw new Error(updateError.message);
    return NextResponse.json({ success: true, photos: nextSnapshot.paperPhotos });
  } catch (error) {
    if (uploadedPaths.length && admin) await admin.storage.from(BUCKET).remove(uploadedPaths).catch(() => undefined);
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
