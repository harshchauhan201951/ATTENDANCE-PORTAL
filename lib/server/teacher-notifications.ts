import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export type TeacherNotificationInput = {
  teacherIds?: number[];
  title: string;
  message: string;
  category: string;
  url?: string;
  metadata?: Record<string, unknown>;
  notificationKey?: string;
};

export async function createTeacherNotifications(input: TeacherNotificationInput) {
  let teacherIds = Array.from(new Set((input.teacherIds || [])
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0)));

  if (teacherIds.length === 0) {
    const { data, error } = await supabaseAdmin.from("teachers").select("id");
    if (error) throw error;
    teacherIds = (data || []).map((row) => Number(row.id)).filter((id) => Number.isInteger(id) && id > 0);
  }
  if (teacherIds.length === 0) return { inserted: 0 };

  if (input.notificationKey) {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("teacher_notifications")
      .select("teacher_id")
      .in("teacher_id", teacherIds)
      .contains("metadata", { notificationKey: input.notificationKey });
    if (existingError) throw existingError;
    const already = new Set((existing || []).map((row) => Number(row.teacher_id)));
    teacherIds = teacherIds.filter((id) => !already.has(id));
  }
  if (teacherIds.length === 0) return { inserted: 0 };

  const metadata = { ...(input.metadata || {}), ...(input.notificationKey ? { notificationKey: input.notificationKey } : {}) };
  const rows = teacherIds.map((teacherId) => ({
    teacher_id: teacherId,
    title: input.title.slice(0, 180),
    message: input.message.slice(0, 1000),
    category: input.category.slice(0, 80),
    url: (input.url || "/teacher/dashboard").slice(0, 500),
    metadata,
  }));
  const { error } = await supabaseAdmin.from("teacher_notifications").insert(rows);
  if (error) throw error;
  return { inserted: rows.length };
}
