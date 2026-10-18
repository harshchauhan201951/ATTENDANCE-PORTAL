export function isHiddenStudentTimetableTeacher(name: string | null | undefined) {
  const normalized = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/^(mrs?|miss|ms)\.?\s+/, "")
    .replace(/[^a-z]/g, "");

  return normalized === "lakshitachauhan";
}
