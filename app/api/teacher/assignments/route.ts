import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && serviceKey
  ? createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

function positiveInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function verifyTeacher(teacherId: number) {
  if (!supabaseAdmin) throw new Error("Supabase service configuration is missing.");
  const { data, error } = await supabaseAdmin.from("teachers").select("id").eq("id", teacherId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Teacher account was not found.");
}

async function assignedIds(teacherId: number): Promise<number[]> {
  if (!supabaseAdmin) throw new Error("Supabase service configuration is missing.");
  const { data, error } = await supabaseAdmin.rpc("get_teacher_assigned_student_ids", { p_teacher_id: teacherId });
  if (error) throw new Error(error.message);
  return (data || []).map((row: { student_id: number }) => Number(row.student_id)).filter((id: number) => Number.isInteger(id) && id > 0).sort((a: number, b: number) => a - b);
}

async function restoreAssignments(teacherId: number, previousRows: Array<{ teacher_id: number; student_id: number }>) {
  if (!supabaseAdmin) return;
  await supabaseAdmin.from("teacher_student_assignments").delete().eq("teacher_id", teacherId);
  if (previousRows.length) await supabaseAdmin.from("teacher_student_assignments").insert(previousRows);
}

export async function PUT(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: "Supabase service configuration is missing." }, { status: 500 });
  }

  try {
    const body = await request.json();
    const managerTeacherId = positiveInteger(body?.managerTeacherId);
    const teacherId = positiveInteger(body?.teacherId);
    if (managerTeacherId !== 1) {
      return NextResponse.json({ success: false, error: "Only the main teacher can assign students." }, { status: 403 });
    }
    if (!teacherId || teacherId === 1) {
      return NextResponse.json({ success: false, error: "Choose a valid teacher account to assign students to." }, { status: 400 });
    }
    if (!Array.isArray(body?.studentIds)) {
      return NextResponse.json({ success: false, error: "Student selection is invalid." }, { status: 400 });
    }

    const normalizedStudentIds: number[] = (body.studentIds as unknown[])
      .map((value) => positiveInteger(value))
      .filter((id): id is number => id !== null);
    const studentIds = Array.from(new Set<number>(normalizedStudentIds)).sort((a, b) => a - b);
    if (studentIds.length !== body.studentIds.length) {
      return NextResponse.json({ success: false, error: "Student selection contains invalid or duplicate IDs." }, { status: 400 });
    }

    await verifyTeacher(1);
    await verifyTeacher(teacherId);

    if (studentIds.length) {
      const { data: students, error: studentsError } = await supabaseAdmin.from("students").select("id").in("id", studentIds);
      if (studentsError) throw new Error(studentsError.message);
      if ((students || []).length !== studentIds.length) {
        return NextResponse.json({ success: false, error: "One or more selected students were not found." }, { status: 400 });
      }
    }

    const { data: previousRows, error: previousError } = await supabaseAdmin
      .from("teacher_student_assignments")
      .select("teacher_id, student_id")
      .eq("teacher_id", teacherId);
    if (previousError) throw new Error(previousError.message);

    const { error: deleteError } = await supabaseAdmin.from("teacher_student_assignments").delete().eq("teacher_id", teacherId);
    if (deleteError) throw new Error(deleteError.message);

    if (studentIds.length) {
      const { error: insertError } = await supabaseAdmin.from("teacher_student_assignments").insert(
        studentIds.map((studentId) => ({ teacher_id: teacherId, student_id: studentId }))
      );
      if (insertError) {
        await restoreAssignments(teacherId, previousRows || []);
        throw new Error(insertError.message);
      }
    }

    let savedIds: number[];
    try {
      savedIds = await assignedIds(teacherId);
    } catch (verificationError) {
      await restoreAssignments(teacherId, previousRows || []);
      throw verificationError;
    }
    if (savedIds.length !== studentIds.length || savedIds.some((id, index) => id !== studentIds[index])) {
      await restoreAssignments(teacherId, previousRows || []);
      return NextResponse.json({ success: false, error: "The saved assignment did not match the teacher access list; previous assignments were restored." }, { status: 500 });
    }

    return NextResponse.json({ success: true, teacherId, assignedStudentCount: savedIds.length });
  } catch (error) {
    console.error("Teacher student assignment error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Could not save student assignments." }, { status: 500 });
  }
}
