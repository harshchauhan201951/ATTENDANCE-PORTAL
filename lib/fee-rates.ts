export function getStudentClassLabel(student: Record<string, unknown>): string {
  for (const key of ["student_class", "class", "class_name", "grade", "standard", "student_grade"]) {
    const value = student[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
}

export function getMonthlyFeeRate(studentClass: string, year: number, month: number): number {
  const normalizedClass = String(studentClass ?? "")
    .trim()
    .toLowerCase()
    .replace(/^(?:class|grade)\s*/, "")
    .replace(/[.\s_-]/g, "");
  const effectiveFromOctober = year > 2026 || (year === 2026 && month >= 10);
  const effectiveFromNovember = year > 2026 || (year === 2026 && month >= 11);

  if (/^(?:9|9th|ninth|10|10th|tenth)(?:class)?(?:[a-z])?$/.test(normalizedClass)) {
    return effectiveFromNovember ? 350 : 300;
  }
  if (effectiveFromOctober) {
    if (/^(nursery|nur|lkg|lowerkg|lowerkindergarten|ukg|upperkg|upperkindergarten)(?:[a-z])?$/.test(normalizedClass)) return 200;
    if (/^(?:[1-8](?:st|nd|rd|th)?|first|second|third|fourth|fifth|sixth|seventh|eighth|i|ii|iii|iv|v|vi|vii|viii)(?:class|grade)?(?:[a-z])?$/.test(normalizedClass)) return 250;
  }
  // Preserve the historic monthly rate for earlier dates and unknown class labels.
  return 200;
}
