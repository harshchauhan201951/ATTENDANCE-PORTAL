import type { SupabaseClient } from "@supabase/supabase-js";

/** Returns null for the main teacher (full roster) and a strict ID allowlist for other teachers. */
export async function getTeacherAssignedStudentIds(
  client: SupabaseClient
): Promise<number[] | null> {
  const teacherId = Number(
    localStorage.getItem("attendance_teacher_id") ||
      localStorage.getItem("teacher_id") ||
      "0"
  );

  if (!Number.isInteger(teacherId) || teacherId <= 0) {
    throw new Error("Teacher session not found. Please login again.");
  }
  if (teacherId === 1) return null;

  const { data, error } = await client.rpc(
    "get_teacher_assigned_student_ids",
    { p_teacher_id: teacherId }
  );
  if (error) throw new Error(error.message);

  return (data || [])
    .map((row: { student_id: number }) => Number(row.student_id))
    .filter((id: number) => Number.isInteger(id) && id > 0);
}
