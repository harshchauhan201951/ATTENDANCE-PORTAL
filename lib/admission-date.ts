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

export type AdmissionHistoryEntry = {
  date?: string | null;
  type?: string | null;
};

/** A record remains visible through the deactivation date and reappears from re-admission. */
export function isStudentRecordVisibleOnDate(
  admissionDate: string | null | undefined,
  admissionHistory: AdmissionHistoryEntry[] | null | undefined,
  recordDate: string | null | undefined,
): boolean {
  const record = normalizeDate(recordDate);
  if (!record) return true;
  const events: Array<{ date: string; active: boolean; order: number }> = [];
  const baseAdmission = normalizeDate(admissionDate);
  if (baseAdmission) events.push({ date: baseAdmission, active: true, order: -1 });
  (Array.isArray(admissionHistory) ? admissionHistory : []).forEach((entry, order) => {
    const date = normalizeDate(entry?.date);
    if (!date) return;
    const type = String(entry?.type || "").trim().toLowerCase();
    if (type.includes("deactiv")) {
      events.push({ date: addOneDay(date), active: false, order });
    } else if (type.includes("admission") || type.includes("reactiv")) {
      events.push({ date, active: true, order });
    }
  });
  if (!events.length) return true;
  events.sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order);
  const latest = events.filter((event) => event.date <= record).at(-1);
  return latest?.active ?? false;
}

/** Fee periods are visible when any part of the month overlaps an active enrollment. */
export function isStudentFeePeriodVisible(
  admissionDate: string | null | undefined,
  admissionHistory: AdmissionHistoryEntry[] | null | undefined,
  year: number | string | null | undefined,
  month: number | string | null | undefined,
): boolean {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) return true;
  const firstDay = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = `${y}-${String(m).padStart(2, "0")}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
  if (isStudentRecordVisibleOnDate(admissionDate, admissionHistory, firstDay)) return true;
  const admissionEvents = (Array.isArray(admissionHistory) ? admissionHistory : []).filter((entry) => {
    const type = String(entry?.type || "").trim().toLowerCase();
    const date = normalizeDate(entry?.date);
    return Boolean(date && date >= firstDay && date <= lastDay && (type.includes("admission") || type.includes("reactiv")));
  });
  return admissionEvents.some((entry) => isStudentRecordVisibleOnDate(admissionDate, admissionHistory, entry.date));
}

function addOneDay(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Quiz eligibility follows admission cycles. A deactivation closes the
 * current cycle; a later re-admission opens a new one. This lets historical
 * quizzes remain visible while excluding quizzes scheduled during a gap.
 */
export function isStudentEligibleForDate(
  admissionDate: string | null | undefined,
  admissionHistory: AdmissionHistoryEntry[] | null | undefined,
  recordDate: string | null | undefined,
  isActive?: boolean | null,
): boolean {
  const record = normalizeDate(recordDate);
  if (!record) return true;
  const events: Array<{ date: string; active: boolean }> = [];
  const baseAdmission = normalizeDate(admissionDate);
  if (baseAdmission) events.push({ date: baseAdmission, active: true });
  for (const entry of Array.isArray(admissionHistory) ? admissionHistory : []) {
    const date = normalizeDate(entry?.date);
    if (!date) continue;
    const type = String(entry?.type || "").trim().toLowerCase();
    if (type.includes("deactiv")) events.push({ date, active: false });
    else if (type.includes("admission") || type.includes("reactiv")) events.push({ date, active: true });
  }
  if (!events.length) return isActive === false ? false : true;
  events.sort((a, b) => a.date.localeCompare(b.date));
  const latest = events.filter((event) => event.date <= record).at(-1);
  if (!latest) return false;
  return latest.active;
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
