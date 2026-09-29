'use client';

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type AttendanceRecord = {
  id?: number;
  student_id: number;
  attendance_date: string;
  status: string;
};

type ExtraAttendanceRecord = {
  id: number;
  student_id: number;
  extra_class_date: string;
  class_time: string | null;
  subject: string | null;
  topic: string | null;
  status: string;
  remarks: string | null;
};

type StudentAttendanceHistoryMobileProps = {
  studentName: string;
  username: string;
  loading: boolean;
  errorMessage: string;
  records: AttendanceRecord[];
  extraRecords: ExtraAttendanceRecord[];
  selectedMonth: string;
  setSelectedMonth: (value: string) => void;
};

function safeDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  const value = String(dateString).slice(0, 10);
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthKey(dateString: string | null | undefined): string {
  const date = safeDate(dateString);
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function shortDate(dateString: string): string {
  const date = safeDate(dateString);
  if (!date) return "—";
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function statusPresent(status: string): boolean {
  const value = String(status || "").trim().toUpperCase();
  return value === "PRESENT" || value === "P";
}

function MobileAttendanceHistoryVIP({
  studentName,
  username,
  loading,
  errorMessage,
  records,
  extraRecords,
  selectedMonth,
  setSelectedMonth,
}: StudentAttendanceHistoryMobileProps) {
  const regularMonthKeys = useMemo(
    () =>
      Array.from(
        new Set(records.map((record) => monthKey(record.attendance_date)).filter(Boolean))
      ).sort((a, b) => b.localeCompare(a)),
    [records]
  );

  const extraMonthKeys = useMemo(
    () =>
      Array.from(
        new Set(extraRecords.map((record) => monthKey(record.extra_class_date)).filter(Boolean))
      ).sort((a, b) => b.localeCompare(a)),
    [extraRecords]
  );

  const monthKeys = useMemo(
    () => Array.from(new Set([...regularMonthKeys, ...extraMonthKeys])).sort((a, b) => b.localeCompare(a)),
    [regularMonthKeys, extraMonthKeys]
  );

  useEffect(() => {
    if (!selectedMonth && monthKeys[0]) setSelectedMonth(monthKeys[0]);
    if (selectedMonth && !monthKeys.includes(selectedMonth) && monthKeys[0]) {
      setSelectedMonth(monthKeys[0]);
    }
  }, [monthKeys, selectedMonth, setSelectedMonth]);

  const presentCount = records.filter((record) => statusPresent(record.status)).length;
  const absentCount = records.filter((record) => !statusPresent(record.status)).length;
  const totalCount = records.length;
  const percentage = totalCount ? Math.round((presentCount / totalCount) * 100) : 0;

  const selectedRegular = records.filter((record) => monthKey(record.attendance_date) === selectedMonth);
  const selectedExtra = extraRecords.filter((record) => monthKey(record.extra_class_date) === selectedMonth);
  const selectedPresent = selectedRegular.filter((record) => statusPresent(record.status)).length;
  const selectedTotal = selectedRegular.length;
  const selectedPercentage = selectedTotal ? Math.round((selectedPresent / selectedTotal) * 100) : 0;

  const monthSummaries = monthKeys.map((key) => {
    const regular = records.filter((record) => monthKey(record.attendance_date) === key);
    const extra = extraRecords.filter((record) => monthKey(record.extra_class_date) === key);
    const present = regular.filter((record) => statusPresent(record.status)).length;
    return {
      key,
      total: regular.length,
      present,
      extra: extra.length,
      percentage: regular.length ? Math.round((present / regular.length) * 100) : 0,
    };
  });

  const selectedDays = selectedRegular.map((record) => ({
    id: `regular-${record.id ?? record.attendance_date}`,
    date: record.attendance_date,
    status: record.status,
    extra: false,
  })).concat(
    selectedExtra.map((record) => ({
      id: `extra-${record.id}`,
      date: record.extra_class_date,
      status: record.status,
      extra: true,
      subject: record.subject,
    }))
  ).sort((a, b) => String(b.date).localeCompare(String(a.date)));

  return (
    <main className="rah-vip-page">
      <div className="rah-vip-wrap">
        <section className="rah-vip-title-row">
          <div className="rah-vip-title-icon">◉</div>
          <div className="rah-vip-title-copy">
            <div className="rah-vip-eyebrow">ATTENDANCE</div>
            <h1>Attendance History</h1>
            <p>View your complete attendance record</p>
          </div>
          <button className="rah-vip-refresh" type="button" onClick={() => window.location.reload()} aria-label="Refresh">↻</button>
        </section>

        <section className="rah-vip-student-strip">
          <div className="rah-vip-avatar">{(studentName || "S").trim().charAt(0).toUpperCase()}</div>
          <div className="rah-vip-student-copy">
            <strong>{studentName || "Student"}</strong>
            <span>@{username || "student"}</span>
          </div>
          <div className="rah-vip-active-pill"><i /> ACTIVE</div>
        </section>

        {errorMessage && <div className="rah-vip-error">{errorMessage}</div>}

        <section className="rah-vip-stat-grid">
          <div className="rah-vip-stat rah-blue"><div className="rah-vip-stat-icon">▣</div><span>Total Days</span><strong>{totalCount}</strong></div>
          <div className="rah-vip-stat rah-green"><div className="rah-vip-stat-icon">✓</div><span>Present</span><strong>{presentCount}</strong></div>
          <div className="rah-vip-stat rah-red"><div className="rah-vip-stat-icon">×</div><span>Absent</span><strong>{absentCount}</strong></div>
          <div className="rah-vip-stat rah-purple"><div className="rah-vip-stat-icon">%</div><span>Percentage</span><strong>{percentage}%</strong></div>
        </section>

        <section className="rah-vip-filter-row">
          <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} aria-label="Select attendance month">
            {monthKeys.length === 0 ? <option value="">No attendance months</option> : monthKeys.map((key) => <option key={key} value={key}>{monthLabel(key)}</option>)}
          </select>
          <div className="rah-vip-filter-static">◫ &nbsp; All Attendance</div>
        </section>

        <section className="rah-vip-month-focus">
          <div className="rah-vip-month-focus-icon">◫</div>
          <div className="rah-vip-month-focus-copy">
            <strong>{selectedMonth ? monthLabel(selectedMonth) : "Attendance"}</strong>
            <span>{selectedTotal} Days • {selectedPercentage}% &nbsp; {selectedExtra ? `• ${selectedExtra.length} Extra` : ""}</span>
          </div>
          <span className="rah-vip-chevron">›</span>
        </section>

        {monthSummaries.length > 0 && (
          <section className="rah-vip-month-list">
            {monthSummaries.map((item) => (
              <button type="button" key={item.key} className={`rah-vip-month-card${item.key === selectedMonth ? " active" : ""}`} onClick={() => setSelectedMonth(item.key)}>
                <div className="rah-vip-month-icon">◫</div>
                <div className="rah-vip-month-copy">
                  <strong>{monthLabel(item.key)}</strong>
                  <span>{item.total} Days • {item.percentage}%{item.extra ? ` • ${item.extra} Extra` : ""}</span>
                </div>
                <span className="rah-vip-month-arrow">›</span>
              </button>
            ))}
          </section>
        )}

        <section className="rah-vip-selected-days">
          <div className="rah-vip-section-head">
            <div>
              <h2>{selectedMonth ? monthLabel(selectedMonth) : "Attendance"}</h2>
              <p>{loading ? "Loading records..." : `${selectedDays.length} attendance entries in this month`}</p>
            </div>
            <span>{selectedPercentage}%</span>
          </div>

          {loading ? (
            <div className="rah-vip-empty">Loading your attendance...</div>
          ) : selectedDays.length === 0 ? (
            <div className="rah-vip-empty">No attendance records for this month.</div>
          ) : (
            <div className="rah-vip-day-list">
              {selectedDays.map((item) => (
                <article className="rah-vip-day-row" key={item.id}>
                  <div className="rah-vip-day-date">
                    <strong>{safeDate(item.date)?.getDate() ?? "—"}</strong>
                    <small>{safeDate(item.date)?.toLocaleDateString("en-IN", { month: "short" }).toUpperCase() ?? ""}</small>
                  </div>
                  <div className="rah-vip-day-copy">
                    <strong>{safeDate(item.date)?.toLocaleDateString("en-IN", { weekday: "long" }) ?? "Attendance"}</strong>
                    <span>{item.extra ? `${(item as { subject?: string }).subject || "Extra Class"} • Extra Class` : "Regular Class"}</span>
                  </div>
                  <div className={`rah-vip-day-status ${statusPresent(item.status) ? "present" : "absent"}`}>
                    {item.extra && <b>★</b>}
                    <span>{statusPresent(item.status) ? "P" : "A"}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="rah-vip-footer">RACER ACADEMY • Student Attendance History</footer>
      </div>

      <style jsx global>{`
        .rah-vip-page{min-height:calc(100vh - 72px);background:linear-gradient(180deg,#f7fbff 0%,#eef5ff 100%);padding:14px 10px 90px;color:#10255d;overflow-x:hidden}
        .rah-vip-wrap{width:100%;max-width:720px;margin:0 auto}
        .rah-vip-title-row{display:flex;align-items:center;gap:10px;margin:4px 2px 12px;padding:4px 2px}.rah-vip-title-icon{width:40px;height:40px;border-radius:14px;background:#e8f1ff;color:#1d5eea;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:21px;flex:none}.rah-vip-title-copy{min-width:0;flex:1}.rah-vip-eyebrow{font-size:9px;font-weight:900;letter-spacing:.9px;color:#4165ad}.rah-vip-title-copy h1{margin:1px 0 1px;font-size:23px;line-height:1.08;color:#10245e;font-weight:900;letter-spacing:-.3px}.rah-vip-title-copy p{margin:0;font-size:10px;color:#6d7fa7;font-weight:700}.rah-vip-refresh{width:36px;height:36px;border:0;border-radius:12px;background:#fff;color:#1457cf;font-size:20px;font-weight:900;box-shadow:0 4px 12px rgba(22,75,163,.08)}
        .rah-vip-student-strip{display:flex;align-items:center;gap:10px;background:linear-gradient(110deg,#1056c7,#4659e9);border-radius:18px;padding:11px 12px;margin-bottom:10px;color:#fff;box-shadow:0 10px 22px rgba(31,90,196,.18)}.rah-vip-avatar{width:44px;height:44px;border-radius:50%;background:#fff;color:#1960d5;display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:900;flex:none}.rah-vip-student-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:2px}.rah-vip-student-copy strong{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rah-vip-student-copy span{font-size:9px;opacity:.85}.rah-vip-active-pill{font-size:8px;font-weight:900;padding:7px 8px;border:1px solid rgba(255,255,255,.25);border-radius:10px;background:rgba(255,255,255,.08)}.rah-vip-active-pill i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#25df8c;margin-right:4px}
        .rah-vip-error{background:#fff0f0;border:1px solid #ffcaca;color:#a61b1b;border-radius:12px;padding:10px 11px;font-size:10px;font-weight:800;margin-bottom:10px;overflow-wrap:anywhere}
        .rah-vip-stat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-bottom:10px}.rah-vip-stat{min-width:0;background:#fff;border:1px solid #dce8fb;border-radius:16px;padding:10px 7px;box-shadow:0 5px 14px rgba(24,69,141,.06);text-align:center}.rah-vip-stat-icon{width:27px;height:27px;border-radius:50%;margin:0 auto 6px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900}.rah-vip-stat span{display:block;font-size:7px;font-weight:900;color:#6c7da4;text-transform:uppercase;letter-spacing:.3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rah-vip-stat strong{display:block;margin-top:2px;font-size:18px;line-height:1.05}.rah-blue .rah-vip-stat-icon{background:#e8f1ff;color:#1762d7}.rah-blue strong{color:#174eb7}.rah-green .rah-vip-stat-icon{background:#dcfbed;color:#0ca66c}.rah-green strong{color:#0d9a62}.rah-red .rah-vip-stat-icon{background:#ffe5ea;color:#f13a57}.rah-red strong{color:#de3150}.rah-purple .rah-vip-stat-icon{background:#eeebff;color:#6e56e9}.rah-purple strong{color:#5f4bd4}
        .rah-vip-filter-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}.rah-vip-filter-row select,.rah-vip-filter-static{height:42px;border:1px solid #bdd5f8;border-radius:12px;background:#fff;color:#173d8b;font-size:10px;font-weight:900;padding:0 12px;box-sizing:border-box}.rah-vip-filter-row select{appearance:auto}.rah-vip-filter-static{display:flex;align-items:center;justify-content:center;color:#315083}
        .rah-vip-month-focus{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #dbe7f8;border-radius:16px;padding:11px;margin-bottom:9px;box-shadow:0 6px 18px rgba(22,67,135,.06)}.rah-vip-month-focus-icon{width:40px;height:40px;border-radius:50%;background:#dff7ee;color:#14996c;display:flex;align-items:center;justify-content:center;font-size:18px}.rah-vip-month-focus-copy{min-width:0;flex:1}.rah-vip-month-focus-copy strong{display:block;font-size:14px;color:#10285f}.rah-vip-month-focus-copy span{display:block;font-size:9px;color:#536b98;font-weight:800;margin-top:2px}.rah-vip-chevron{font-size:28px;line-height:1;color:#1662cf}
        .rah-vip-month-list{display:flex;flex-direction:column;gap:7px;margin-bottom:10px}.rah-vip-month-card{width:100%;display:flex;align-items:center;gap:10px;text-align:left;border:1px solid #d9e6f8;background:#fff;border-radius:15px;padding:10px 11px;color:#10285f;box-shadow:0 4px 14px rgba(22,67,135,.045)}.rah-vip-month-card.active{border-color:#7ca7f7;box-shadow:0 6px 18px rgba(31,88,194,.10);background:#fbfdff}.rah-vip-month-icon{width:36px;height:36px;border-radius:50%;background:#e2f6ef;color:#15976b;display:flex;align-items:center;justify-content:center;font-weight:900;flex:none}.rah-vip-month-copy{flex:1;min-width:0}.rah-vip-month-copy strong{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rah-vip-month-copy span{display:block;font-size:8px;color:#61739a;font-weight:800;margin-top:2px}.rah-vip-month-arrow{font-size:24px;color:#155ec9}
        .rah-vip-selected-days{background:#fff;border:1px solid #dbe7f8;border-radius:18px;padding:12px;box-shadow:0 6px 18px rgba(22,67,135,.06)}.rah-vip-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.rah-vip-section-head h2{margin:0;font-size:17px;line-height:1.1;color:#11285f}.rah-vip-section-head p{margin:3px 0 0;color:#6b7da3;font-size:9px;font-weight:700}.rah-vip-section-head>span{color:#1063d1;font-size:18px;font-weight:900}.rah-vip-day-list{display:flex;flex-direction:column;gap:7px}.rah-vip-day-row{display:flex;align-items:center;gap:9px;border:1px solid #e0e9f7;border-radius:13px;padding:8px 9px;min-height:54px}.rah-vip-day-date{width:48px;flex:none;border-radius:11px;background:#eff5ff;text-align:center;padding:5px 2px;color:#1b50b3}.rah-vip-day-date strong{display:block;font-size:17px;line-height:1}.rah-vip-day-date small{display:block;margin-top:2px;font-size:7px;font-weight:900}.rah-vip-day-copy{flex:1;min-width:0}.rah-vip-day-copy strong{display:block;font-size:11px;color:#173274;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rah-vip-day-copy span{display:block;margin-top:2px;font-size:8px;color:#7383a5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rah-vip-day-status{position:relative;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;flex:none}.rah-vip-day-status.present{background:#20ce92;color:#fff}.rah-vip-day-status.absent{background:#ff4c68;color:#fff}.rah-vip-day-status b{position:absolute;top:-8px;right:-2px;color:#f2a600;font-size:11px;text-shadow:0 1px 2px rgba(0,0,0,.1)}.rah-vip-empty{padding:30px 12px;text-align:center;color:#7284a6;font-size:10px;font-weight:800}.rah-vip-footer{text-align:center;color:#8391ab;font-size:8px;font-weight:800;padding:14px 0 4px}
        @media (min-width:701px){.rah-vip-page{padding:18px 16px 70px}.rah-vip-wrap{max-width:980px}.rah-vip-title-row{margin-top:10px}.rah-vip-stat-grid{gap:12px}.rah-vip-stat{padding:14px}.rah-vip-month-list{display:grid;grid-template-columns:1fr 1fr}.rah-vip-selected-days{padding:16px}.rah-vip-day-list{display:grid;grid-template-columns:1fr 1fr}.rah-vip-filter-row{max-width:620px}}
      `}</style>
    </main>
  );
}

export default function StudentAttendanceHistoryPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [extraRecords, setExtraRecords] = useState<ExtraAttendanceRecord[]>([]);
  const [studentName, setStudentName] = useState("Student");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth <= 700); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => { loadStudentAttendance(); }, []);

  async function loadStudentAttendance() {
    setLoading(true);
    setErrorMessage("");
    try {
      const savedUsername = localStorage.getItem("student_username") || localStorage.getItem("studentUsername") || "";
      const savedName = localStorage.getItem("studentName") || localStorage.getItem("student_name") || "Student";
      setUsername(savedUsername);
      setStudentName(savedName);
      if (!savedUsername) throw new Error("Student login information nahi mili. Please dobara login karein.");

      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id, student_name, student_username")
        .eq("student_username", savedUsername)
        .maybeSingle();
      if (studentError) throw new Error("Student information load nahi ho paayi: " + studentError.message);
      if (!student) throw new Error("Logged-in student account nahi mila.");

      setStudentName(student.student_name || savedName);

      const { data: attendance, error: attendanceError } = await supabase
        .from("attendance")
        .select("id, student_id, attendance_date, status")
        .eq("student_id", student.id)
        .order("attendance_date", { ascending: false })
        .order("id", { ascending: false });
      if (attendanceError) throw new Error("Attendance load nahi ho paayi: " + attendanceError.message);
      setRecords((attendance || []) as AttendanceRecord[]);

      // Extra-class data is additive and never blocks the regular history if unavailable.
      const { data: extra, error: extraError } = await supabase
        .from("extra_class_attendance")
        .select("id, student_id, extra_class_date, class_time, subject, topic, status, remarks")
        .eq("student_id", student.id)
        .order("extra_class_date", { ascending: false })
        .order("id", { ascending: false });
      if (!extraError) setExtraRecords((extra || []) as ExtraAttendanceRecord[]);
      else setExtraRecords([]);
    } catch (error) {
      console.error("Student attendance history error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Attendance history load nahi ho paayi.");
    } finally {
      setLoading(false);
    }
  }

  const mobile = (
    <MobileAttendanceHistoryVIP
      studentName={studentName}
      username={username}
      loading={loading}
      errorMessage={errorMessage}
      records={records}
      extraRecords={extraRecords}
      selectedMonth={selectedMonth}
      setSelectedMonth={setSelectedMonth}
    />
  );

  if (isMobile) return mobile;

  // Desktop keeps the module functional and compact; the approved VIP redesign is focused on the phone app view.
  const presentCount = records.filter((record) => statusPresent(record.status)).length;
  const absentCount = records.filter((record) => !statusPresent(record.status)).length;
  const totalCount = records.length;
  const percentage = totalCount ? Math.round((presentCount / totalCount) * 100) : 0;

  return (
    <main style={desktopStyles.page}>
      <div style={desktopStyles.container}>
        <section style={desktopStyles.header}>
          <div>
            <div style={desktopStyles.eyebrow}>STUDENT PORTAL</div>
            <h1 style={desktopStyles.title}>My Attendance History</h1>
            <p style={desktopStyles.subtitle}>Your personal attendance records</p>
          </div>
        </section>
        <section style={desktopStyles.studentCard}>
          <div style={desktopStyles.avatar}>{(studentName || "S").trim().charAt(0).toUpperCase()}</div>
          <div><strong style={desktopStyles.studentName}>{studentName}</strong><div style={desktopStyles.username}>@{username || "student"}</div></div>
        </section>
        {errorMessage && <div style={desktopStyles.error}>{errorMessage}</div>}
        <section style={desktopStyles.stats}>
          <div style={desktopStyles.stat}><span>Total Days</span><strong>{totalCount}</strong></div>
          <div style={desktopStyles.stat}><span>Present</span><strong style={{color:"#15803d"}}>{presentCount}</strong></div>
          <div style={desktopStyles.stat}><span>Absent</span><strong style={{color:"#dc2626"}}>{absentCount}</strong></div>
          <div style={desktopStyles.stat}><span>Percentage</span><strong>{percentage}%</strong></div>
        </section>
        <section style={desktopStyles.card}>
          <h2 style={desktopStyles.sectionTitle}>Attendance History</h2>
          <div style={{overflowX:"auto"}}><table style={desktopStyles.table}><thead><tr><th>Date</th><th>Status</th></tr></thead><tbody>
            {loading ? <tr><td colSpan={2} style={desktopStyles.td}>Loading...</td></tr> : records.map((record) => <tr key={`${record.student_id}-${record.id ?? record.attendance_date}`}><td style={desktopStyles.td}>{safeDate(record.attendance_date)?.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</td><td style={desktopStyles.td}><span style={{...desktopStyles.badge,background:statusPresent(record.status)?"#dcfce7":"#fee2e2",color:statusPresent(record.status)?"#166534":"#991b1b"}}>{statusPresent(record.status)?"Present":"Absent"}</span></td></tr>)}</tbody></table></div>
        </section>
      </div>
    </main>
  );
}

const desktopStyles: Record<string, React.CSSProperties> = {
  page:{minHeight:"100vh",background:"linear-gradient(180deg,#f7fbff,#eef5ff)",padding:"18px",boxSizing:"border-box"},
  container:{maxWidth:"980px",margin:"0 auto"},
  header:{background:"#fff",borderRadius:"20px",padding:"22px",boxShadow:"0 8px 24px rgba(15,23,42,.06)",marginBottom:"14px"},
  eyebrow:{fontSize:"10px",fontWeight:900,letterSpacing:"1.4px",color:"#4165ad"},
  title:{margin:"3px 0",fontSize:"28px",color:"#10245e",fontWeight:900},
  subtitle:{margin:0,fontSize:"13px",color:"#6d7fa7",fontWeight:700},
  studentCard:{display:"flex",alignItems:"center",gap:"14px",padding:"18px",background:"linear-gradient(110deg,#1056c7,#4659e9)",borderRadius:"18px",color:"#fff",marginBottom:"14px"},
  avatar:{width:"56px",height:"56px",borderRadius:"50%",background:"#fff",color:"#1d5ed0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"24px",fontWeight:900},
  studentName:{fontSize:"20px"},username:{fontSize:"11px",opacity:.85},
  error:{background:"#fff0f0",color:"#9b1c1c",padding:"12px",borderRadius:"12px",marginBottom:"14px"},
  stats:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"14px"},
  stat:{background:"#fff",borderRadius:"15px",padding:"16px",boxShadow:"0 5px 16px rgba(15,23,42,.06)"},
  card:{background:"#fff",borderRadius:"18px",padding:"18px",boxShadow:"0 7px 20px rgba(15,23,42,.06)"},
  sectionTitle:{margin:"0 0 12px",color:"#10245e"},
  table:{width:"100%",borderCollapse:"collapse"},
  td:{padding:"12px",borderTop:"1px solid #e2e8f0"},
  badge:{display:"inline-block",padding:"6px 10px",borderRadius:"999px",fontWeight:900,fontSize:"10px"},
};
