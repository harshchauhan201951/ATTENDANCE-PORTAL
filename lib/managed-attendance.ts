const MANAGED_ATTENDANCE_TOKEN = /\[\[RACER_MANAGED_ATTENDANCE:(\d{4}-\d{2}-\d{2})\]\]/;
const ALL_MANAGED_ATTENDANCE_TOKENS = /\s*\[\[RACER_MANAGED_ATTENDANCE:\d{4}-\d{2}-\d{2}\]\]/g;

export function getManagedAttendanceDate(remarks: string | null | undefined) {
  return remarks?.match(MANAGED_ATTENDANCE_TOKEN)?.[1] || null;
}

export function getVisibleManagedAttendanceRemarks(remarks: string | null | undefined) {
  return (remarks || "")
    .replace(ALL_MANAGED_ATTENDANCE_TOKENS, "")
    .replace(/^Managed extra class date\.\s*/i, "")
    .trim();
}

export function withManagedAttendanceDate(
  remarks: string | null | undefined,
  date: string | null | undefined
) {
  const visibleRemarks = getVisibleManagedAttendanceRemarks(remarks);
  const cleanDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
  const token = cleanDate ? `[[RACER_MANAGED_ATTENDANCE:${cleanDate}]]` : "";
  return [visibleRemarks, token].filter(Boolean).join(" ") || null;
}
