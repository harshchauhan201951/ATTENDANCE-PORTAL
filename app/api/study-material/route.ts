import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readStudentSession } from "../../../lib/server/student-session";

export const runtime = "nodejs";

const BUCKET = "study-materials";
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
]);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const admin = supabaseUrl && serviceKey
  ? createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

type StudentClass = { id: number; student_name?: string | null; class_name: string | null };

function normalizeClass(value: unknown) {
  return typeof value === "string"
    ? value.trim().toUpperCase().replace(/^CLASS\s+/i, "").replace(/\s+/g, " ")
    : "";
}

function positiveInt(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function teacherContext(teacherId: number) {
  if (!admin) throw new Error("Supabase service configuration is missing.");
  const { data: teacher, error: teacherError } = await admin.from("teachers").select("id").eq("id", teacherId).maybeSingle();
  if (teacherError) throw new Error(teacherError.message);
  if (!teacher) throw new Error("Teacher account was not found. Please sign in again.");

  const { data: students, error: studentsError } = await admin.from("students").select("id,student_name,class_name").eq("is_active", true).not("class_name", "is", null);
  if (studentsError) throw new Error(studentsError.message);

  let visibleStudents = (students || []) as StudentClass[];
  if (teacherId !== 1) {
    const { data: assigned, error: assignedError } = await admin.rpc("get_teacher_assigned_student_ids", { p_teacher_id: teacherId });
    if (assignedError) throw new Error(assignedError.message);
    const assignedIds = new Set((assigned || []).map((row: { student_id: number }) => Number(row.student_id)));
    visibleStudents = visibleStudents.filter((student) => assignedIds.has(Number(student.id)));
  }

  const classes = Array.from(new Set(visibleStudents.map((student) => normalizeClass(student.class_name)).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const classMembers = visibleStudents.map((student) => ({
    name: student.student_name?.trim() || `Student ${student.id}`,
    class_name: normalizeClass(student.class_name),
  }));
  return { classes, classMembers };
}

async function ensureBucket() {
  if (!admin) throw new Error("Supabase service configuration is missing.");
  const { error } = await admin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: MAX_FILE_SIZE,
    allowedMimeTypes: Array.from(ALLOWED_TYPES),
  });
  if (error && !/already exists|duplicate/i.test(error.message)) throw new Error(error.message);
}

function errorResponse(error: unknown, fallback: string, status = 500) {
  return NextResponse.json({ success: false, error: error instanceof Error ? error.message : fallback }, { status });
}

function isMissingMaterialTable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return /study_materials.*schema cache|could not find the table.*study_materials|relation .*study_materials.*does not exist/i.test(message);
}

export async function GET(request: NextRequest) {
  let classes: string[] = [];
  let classMembers: Array<{ name: string; class_name: string }> = [];
  let className = "";
  let studentName: string | null = null;
  try {
    if (!admin) return errorResponse(null, "Supabase service configuration is missing.");
    const teacherId = positiveInt(request.nextUrl.searchParams.get("teacherId"));

    if (teacherId) {
      const context = await teacherContext(teacherId);
      classes = context.classes;
      classMembers = context.classMembers;
    } else {
      const session = readStudentSession(request);
      if (!session) return errorResponse(new Error("Please sign in again to view your study material."), "Sign in required.", 401);
      const { data: student, error } = await admin.from("students").select("id,student_name,class_name").eq("id", session.studentId).maybeSingle();
      if (error) throw new Error(error.message);
      if (!student?.class_name) return errorResponse(new Error("Student class was not found."), "Student class was not found.", 404);
      className = normalizeClass(student.class_name);
      studentName = student.student_name || null;
      classes = [className];
    }

    if (!classes.length) return NextResponse.json({ success: true, classes, materials: [], className, studentName, classMembers });
    const { data: materials, error } = await admin.from("study_materials")
      .select("id,title,description,class_name,file_name,file_path,file_size,content_type,uploaded_by,created_at")
      .in("class_name", classes)
      .order("created_at", { ascending: false });
    if (error) {
      if (isMissingMaterialTable(error)) {
        return NextResponse.json({ success: true, classes, classMembers, materials: [], className, studentName, setupRequired: true }, { headers: { "Cache-Control": "no-store" } });
      }
      throw new Error(error.message);
    }

    const signedMaterials = await Promise.all((materials || []).map(async (material) => {
      const { data, error: signedUrlError } = await admin!.storage.from(BUCKET).createSignedUrl(material.file_path, 60 * 60);
      return { ...material, downloadUrl: signedUrlError ? null : data.signedUrl };
    }));
    return NextResponse.json({ success: true, classes, materials: signedMaterials, className, studentName, classMembers }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isMissingMaterialTable(error)) {
      return NextResponse.json({ success: true, classes, classMembers, materials: [], className, studentName, setupRequired: true }, { headers: { "Cache-Control": "no-store" } });
    }
    return errorResponse(error, "Unable to load study material.");
  }
}

export async function POST(request: NextRequest) {
  let uploadedPath: string | null = null;
  try {
    if (!admin) return errorResponse(null, "Supabase service configuration is missing.");
    const form = await request.formData();
    const teacherId = positiveInt(form.get("teacherId"));
    const className = normalizeClass(form.get("className"));
    const title = String(form.get("title") || "").trim();
    const description = String(form.get("description") || "").trim();
    const file = form.get("file");

    if (!teacherId || !className || !title) return errorResponse(new Error("Choose a class and enter a title."), "Class and title are required.", 400);
    if (!(file instanceof File) || file.size === 0) return errorResponse(new Error("Select a file to upload."), "A file is required.", 400);
    if (file.size > MAX_FILE_SIZE) return errorResponse(new Error("Files must be 20 MB or smaller."), "File is too large.", 413);
    if (!ALLOWED_TYPES.has(file.type)) return errorResponse(new Error("Upload a PDF, Word document, PowerPoint, JPG or PNG file."), "Unsupported file type.", 415);

    const { classes } = await teacherContext(teacherId);
    if (!classes.includes(className)) return errorResponse(new Error("You do not have access to this class."), "Class access denied.", 403);

    await ensureBucket();
    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "file";
    uploadedPath = `${encodeURIComponent(className)}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(uploadedPath, file, { contentType: file.type, upsert: false, cacheControl: "3600" });
    if (uploadError) throw new Error(uploadError.message);

    const { data, error } = await admin.from("study_materials").insert({
      title,
      description: description || null,
      class_name: className,
      file_path: uploadedPath,
      file_name: file.name,
      file_size: file.size,
      content_type: file.type,
      uploaded_by: teacherId,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    if (uploadedPath && admin) await admin.storage.from(BUCKET).remove([uploadedPath]).catch(() => undefined);
    return errorResponse(error, "Unable to upload study material.");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!admin) return errorResponse(null, "Supabase service configuration is missing.");
    const body = await request.json();
    const teacherId = positiveInt(body?.teacherId);
    const materialId = positiveInt(body?.materialId);
    if (!teacherId || !materialId) return errorResponse(new Error("Teacher and material details are required."), "Invalid request.", 400);

    const { classes } = await teacherContext(teacherId);
    const { data: material, error: loadError } = await admin.from("study_materials").select("id,class_name,file_path").eq("id", materialId).maybeSingle();
    if (loadError) throw new Error(loadError.message);
    if (!material) return errorResponse(new Error("This material was already removed."), "Material not found.", 404);
    if (!classes.includes(normalizeClass(material.class_name))) return errorResponse(new Error("You do not have access to this class."), "Class access denied.", 403);

    const { error: removeError } = await admin.storage.from(BUCKET).remove([material.file_path]);
    if (removeError) throw new Error(removeError.message);
    const { error } = await admin.from("study_materials").delete().eq("id", materialId);
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "Unable to delete study material.");
  }
}
