/** Inclusive enrollment cutoff used when displaying historical student records. */
export function isOnOrAfterAdmission(
  admissionDate: string | null | undefined,
  recordDate: string | null | undefined,
): boolean {
  const admission = normalizeDate(admissionDate);
  const record = normalizeDate(recordDate);
  // Preserve legacy data when either date is absent or cannot be interpreted.
  if (!admission || !record) return true;
  return record >= admission;
}

/** Fee records represent a whole month, so eligibility begins in the admission month. */
export function isFeePeriodOnOrAfterAdmission(
  admissionDate: string | null | undefined,
  year: number | string | null | undefined,
  month: number | string | null | undefined,
): boolean {
  const admission = normalizeDate(admissionDate);
  const y = Number(year);
  const m = Number(month);
  if (!admission || !Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) return true;
  return `${y}-${String(m).padStart(2, "0")}` >= admission.slice(0, 7);
}

function normalizeDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = String(value).trim();
  const iso = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}
