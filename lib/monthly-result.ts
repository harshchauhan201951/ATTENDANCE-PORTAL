export type MonthlyQuizEntry = {
  quizId: number;
  title: string;
  subject: string;
  date: string;
  obtained: number;
  total: number;
  percentage: number;
};

export type MonthlyTestEntry = {
  id: number;
  name: string;
  subject: string;
  date: string;
  obtained: number;
  total: number;
  percentage: number;
};

export type MonthlyResultSnapshot = {
  monthKey: string;
  monthLabel: string;
  student: {
    id: number;
    name: string;
    username: string;
    className: string;
    fatherName: string;
    rollNo: string;
    medium: string;
    academicSession: string;
  };
  quizzes: MonthlyQuizEntry[];
  weeklyTests: MonthlyTestEntry[];
  mahaTest: {
    date: string;
    durationMinutes: number;
    total: number;
    obtained: number | null;
    remarks: string;
  };
  totals: {
    quizObtained: number;
    quizTotal: number;
    weeklyObtained: number;
    weeklyTotal: number;
    mahaObtained: number;
    mahaTotal: number;
    grandObtained: number;
    grandTotal: number;
    percentage: number;
    passPercentage: number;
    status: string;
  };
  generatedAt: string;
  position?: number;
  award?: string;
  awardGroup?: string;
};

export function monthKeyFromDate(value: string): string {
  return String(value || '').slice(0, 7);
}

export function monthLabelFromKey(key: string): string {
  const [y, m] = String(key || '').split('-').map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function isSaturday(date: string): boolean {
  const parts = String(date || '').slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return false;
  return new Date(parts[0], parts[1] - 1, parts[2]).getDay() === 6;
}

export function normalizeClass(value: unknown): string {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, ' ');
}

export function quizTargetsStudent(quiz: any, studentClass: string): boolean {
  const target = Array.isArray(quiz?.target_classes)
    ? quiz.target_classes
    : [];
  const wanted = normalizeClass(studentClass);
  if (target.length > 0) return target.some((v: unknown) => normalizeClass(v) === wanted);
  if (quiz?.class_name) return normalizeClass(quiz.class_name) === wanted;
  return true;
}

export function isSubmittedQuizResult(row: any): boolean {
  const type = String(row?.submission_type || '').trim().toLowerCase();
  return Boolean(row?.submitted_at) || ['manual', 'left_quiz', 'time_expired', 'auto_submit'].includes(type);
}

export function latestSubmittedQuizResult(rows: any[]): any | null {
  return [...rows].filter(isSubmittedQuizResult).sort((a, b) => {
    const ad = new Date(a?.submitted_at || a?.created_at || 0).getTime();
    const bd = new Date(b?.submitted_at || b?.created_at || 0).getTime();
    if (bd !== ad) return bd - ad;
    return Number(b?.attempt_number || 0) - Number(a?.attempt_number || 0);
  })[0] || null;
}

export function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function calculateMonthlyTotals(args: {
  quizzes: MonthlyQuizEntry[];
  weeklyTests: MonthlyTestEntry[];
  mahaObtained: number | null;
  passPercentage: number;
}) {
  const quizObtained = args.quizzes.reduce((s, r) => s + safeNumber(r.obtained), 0);
  const quizTotal = args.quizzes.reduce((s, r) => s + safeNumber(r.total), 0);
  const weeklyObtained = args.weeklyTests.reduce((s, r) => s + safeNumber(r.obtained), 0);
  const weeklyTotal = args.weeklyTests.reduce((s, r) => s + safeNumber(r.total), 0);
  const mahaIncluded = args.mahaObtained !== null && Number.isFinite(Number(args.mahaObtained));
  const mahaObtained = mahaIncluded ? Math.max(0, safeNumber(args.mahaObtained)) : 0;
  const mahaTotal = mahaIncluded ? 100 : 0;
  const grandObtained = quizObtained + weeklyObtained + mahaObtained;
  const grandTotal = quizTotal + weeklyTotal + mahaTotal;
  const percentage = grandTotal > 0 ? Math.max(0, Math.min(100, (grandObtained / grandTotal) * 100)) : 0;
  return {
    quizObtained, quizTotal, weeklyObtained, weeklyTotal, mahaObtained, mahaTotal,
    grandObtained, grandTotal, percentage,
    passPercentage: safeNumber(args.passPercentage) || 40,
    status: args.mahaObtained === null || args.mahaObtained === undefined || grandTotal <= 0 ? 'PENDING' : percentage >= (safeNumber(args.passPercentage) || 40) ? 'PASS' : 'FAIL',
  };
}


