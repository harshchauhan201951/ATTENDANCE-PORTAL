import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && serviceKey
  ? createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

type AssessmentIdentity = { id: number; test_name: string | null; test_date: string | null };
type WeeklyGroup = { testName: string; testDate: string; firstId: number; ids: number[]; autoLabel: boolean };

function positiveInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isAutoWeeklyLabel(name: string) {
  return /^saturday\s+(?:weeks?\s+)?tests?\s*[:-]\s*\d+$/i.test(name.trim());
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ success: false, error: "Supabase service configuration is missing." }, { status: 500 });
    const body = await request.json();
    const teacherId = positiveInteger(body?.teacherId);
    if (!teacherId) return NextResponse.json({ success: false, error: "Teacher session is required." }, { status: 400 });
    if (teacherId !== 1) return NextResponse.json({ success: false, error: "Only the main teacher can rename saved weekly test records." }, { status: 403 });
    const { data: teacher, error: teacherError } = await supabaseAdmin.from("teachers").select("id").eq("id", teacherId).maybeSingle();
    if (teacherError) throw new Error(teacherError.message);
    if (!teacher) return NextResponse.json({ success: false, error: "Teacher account was not found." }, { status: 403 });

    const rows: AssessmentIdentity[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabaseAdmin.from("academy_assessments")
        .select("id,test_name,test_date").order("id", { ascending: true }).range(from, from + 999);
      if (error) throw new Error(error.message);
      rows.push(...((data || []) as AssessmentIdentity[]));
      if (!data || data.length < 1000) break;
    }

    const groups = new Map<string, WeeklyGroup>();
    for (const row of rows) {
      const testName = String(row.test_name || "").trim();
      const testDate = String(row.test_date || "").slice(0, 10);
      if (!testDate || !/^\d{4}-\d{2}-\d{2}$/.test(testDate)
        || new Date(`${testDate}T00:00:00`).getDay() !== 6
        || /maha\s*test/i.test(testName)) continue;
      const key = JSON.stringify([testName, testDate]);
      const current = groups.get(key);
      if (current) current.ids.push(Number(row.id));
      else groups.set(key, { testName, testDate, firstId: Number(row.id), ids: [Number(row.id)], autoLabel: isAutoWeeklyLabel(testName) });
    }
    const ordered = Array.from(groups.values()).sort((a, b) => a.testDate.localeCompare(b.testDate) || a.firstId - b.firstId);
    const alreadyNormalized = ordered.every((group, index) => !group.autoLabel || group.testName === `Saturday Weeks Tests:-${index + 1}`);
    if (alreadyNormalized) {
      return NextResponse.json({
        success: true,
        totalTests: ordered.length,
        tests: ordered.map((group, index) => ({ originalName: group.testName, name: group.testName, date: group.testDate, number: index + 1, autoLabel: group.autoLabel })),
      });
    }

    // Move every group through a unique temporary name first, so swaps and renumbering
    // cannot accidentally merge marks from two tests. Assessment row IDs and marks stay intact.
    const staged: Array<{ group: WeeklyGroup; temporaryName: string; finalName: string }> = [];
    for (const [index, group] of ordered.entries()) {
      if (!group.autoLabel) continue;
      const temporaryName = `__weekly_rename_${randomUUID()}__`;
      const { error } = await supabaseAdmin.from("academy_assessments")
        .update({ test_name: temporaryName }).in("id", group.ids);
      if (error) throw new Error(`Could not stage ${group.testName} (${group.testDate}): ${error.message}`);
      staged.push({ group, temporaryName, finalName: `Saturday Weeks Tests:-${index + 1}` });
    }
    for (const item of staged) {
      const { error } = await supabaseAdmin.from("academy_assessments")
        .update({ test_name: item.finalName }).in("id", item.group.ids);
      if (error) throw new Error(`Could not save ${item.finalName} (${item.group.testDate}): ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      totalTests: ordered.length,
      tests: ordered.map((group, index) => ({
        originalName: group.testName,
        name: group.autoLabel ? `Saturday Weeks Tests:-${index + 1}` : group.testName,
        date: group.testDate,
        number: index + 1,
        autoLabel: group.autoLabel,
      })),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unable to normalize Saturday weekly test names." }, { status: 500 });
  }
}
