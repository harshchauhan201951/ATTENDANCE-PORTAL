/* RACER_TEACHER_DASHBOARD_VIP_V1 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import TeacherNotificationsBell from "../../components/TeacherNotificationsBell";
import "../../teacher-dashboard-vip.css";
import "../../teacher-dashboard-refresh.css";

type IconName =
  | "attendance" | "history" | "calendar" | "reports" | "fees" | "payments"
  | "homework" | "announcement" | "activity" | "profile" | "settings"
  | "directory" | "extra" | "quiz" | "result" | "call" | "teachers" | "time"
  | "home" | "bell" | "menu" | "modules" | "notification" | "bulb" | "chevron";

const menuItems = [
  ["Mark Attendance", "/teacher/attendance", "attendance"],
  ["Attendance History", "/teacher/attendance-history", "history"],
  ["Calendar", "/teacher/calendar", "calendar"],
  ["Reports", "/teacher/reports", "reports"],
  ["Fees", "/teacher/fees", "fees"],
  ["Payments", "/teacher/payments", "payments"],
  ["Homework", "/teacher/homework", "homework"],
  ["Announcements", "/teacher/announcements", "announcement"],
  ["Student Login Activity", "/teacher/login-activity", "activity"],
  ["Profile", "/teacher/profile", "profile"],
  ["Settings", "/teacher/settings", "settings"],
  ["Student Directory", "/teacher/student-directory", "directory"],
  ["Extra Classes", "/teacher/extra-class", "extra"],
  ["Quiz Tests", "/teacher/quiz-tests", "quiz"],
  ["Monthly Result", "/teacher/monthly-results", "result"],
  ["Voice & Call Center", "/teacher/voice-call", "call"],
  ["Teachers", "/teacher/teachers", "teachers"],
  ["Timetable", "/teacher/timetable", "time"],
] as const;

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "home":
      return <svg {...common}><path d="M3 11.5L12 4l9 7.5" /><path d="M5.5 10.5V20h13v-9.5" /><path d="M9.5 20v-5h5v5" /></svg>;
    case "attendance":
      return <svg {...common}><path d="M5 12l4 4L19 6" /><path d="M5 5h7" /></svg>;
    case "history":
      return <svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 7v5l3 2" /></svg>;
    case "calendar":
      return <svg {...common}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 9h16" /><path d="M8 13h2M14 13h2M8 17h2M14 17h2" /></svg>;
    case "reports":
      return <svg {...common}><path d="M5 20V10M10 20V5M15 20v-8M20 20V3" /></svg>;
    case "fees":
      return <svg {...common}><ellipse cx="12" cy="7" rx="6.5" ry="3" /><path d="M5.5 7v5c0 1.7 2.9 3 6.5 3s6.5-1.3 6.5-3V7" /><path d="M5.5 12v5c0 1.7 2.9 3 6.5 3s6.5-1.3 6.5-3v-5" /></svg>;
    case "payments":
      return <svg {...common}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></svg>;
    case "homework":
      return <svg {...common}><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3z" /><path d="M8 4v16M11 8h5M11 12h5M11 16h4" /></svg>;
    case "announcement":
      return <svg {...common}><path d="M4 13h4l7 4V7L8 11H4z" /><path d="M8 13l1 6h2l-1-5" /><path d="M19 10a3 3 0 0 1 0 4" /></svg>;
    case "activity":
      return <svg {...common}><circle cx="12" cy="8" r="3" /><path d="M5 21c1-4 3.5-6 7-6s6 2 7 6" /></svg>;
    case "profile":
      return <svg {...common}><circle cx="12" cy="8" r="3.2" /><path d="M5 20c1-4 3.2-6 7-6s6 2 7 6" /></svg>;
    case "settings":
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 1.7-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-2.4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L8 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H6v-2.4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L7.3 8.6 9 6.9l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h2.4v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.7 1.7-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.5 1z" /></svg>;
    case "directory":
      return <svg {...common}><circle cx="9" cy="9" r="3" /><circle cx="17" cy="9" r="3" /><path d="M3 20c1-4 3-6 6-6s5 2 6 6M13 20c.8-2.8 2.4-4.5 4-5" /></svg>;
    case "extra":
      return <svg {...common}><path d="M4 5h16v11H4z" /><path d="M8 19h8M12 16v3" /><path d="M7 9h10M7 12h6" /></svg>;
    case "quiz":
      return <svg {...common}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 7h6M9 11h6M9 15h3" /></svg>;
    case "result":
      return <svg {...common}><path d="M5 20V11M12 20V6M19 20V3" /><path d="M3 20h18" /></svg>;
    case "call":
      return <svg {...common}><path d="M6.5 4.5l3 3-2 2c1.2 2.3 3 4.1 5.3 5.3l2-2 3 3-1.8 2c-.6.7-1.5 1-2.4.8C8.9 17.5 6.5 15.1 5.4 10.4c-.2-.9.1-1.8.8-2.4z" /></svg>;
    case "teachers":
      return <svg {...common}><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3.5 20c.8-4 2.7-6 5.5-6s4.7 2 5.5 6M13 15c1-.8 2.1-1.2 3.4-1.2 2.5 0 4.2 1.7 5.1 5.2" /></svg>;
    case "time":
      return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M12 8v5l3 2" /></svg>;
    case "bell":
      return <svg {...common}><path d="M6 17h12l-1.3-2v-4a4.7 4.7 0 0 0-9.4 0v4z" /><path d="M10 20h4" /></svg>;
    case "menu":
      return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
    case "modules":
      return <svg {...common}><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>;
    case "notification":
      return <svg {...common}><path d="M6 17h12l-1.3-2v-4a4.7 4.7 0 0 0-9.4 0v4z" /><path d="M10 20h4" /></svg>;
    case "bulb":
      return <svg {...common}><path d="M9 18h6M10 21h4" /><path d="M8.5 15.5C7.5 14.4 7 13.3 7 12a5 5 0 1 1 10 0c0 1.3-.5 2.4-1.5 3.5-.7.8-1 1.4-1.1 2H9.6c-.1-.6-.4-1.2-1.1-2z" /></svg>;
    case "chevron":
      return <svg {...common}><path d="M9 6l6 6-6 6" /></svg>;
    default:
      return null;
  }
}


// ---- VIP dashboard config (theme badalne ke liye sirf ye ek line) ----
const VIP_THEME: "gold" | "royal" = "gold";

const vipGroups = [
  { title: "Academics", sub: "Classes & learning", paths: ["/teacher/attendance", "/teacher/attendance-history", "/teacher/calendar", "/teacher/timetable", "/teacher/homework", "/teacher/extra-class", "/teacher/quiz-tests", "/teacher/monthly-results"] },
  { title: "Students", sub: "People & communication", paths: ["/teacher/student-directory", "/teacher/login-activity", "/teacher/reports", "/teacher/announcements"] },
  { title: "Finance", sub: "Fees & payments", paths: ["/teacher/fees", "/teacher/payments"] },
  { title: "Manage", sub: "Account & tools", paths: ["/teacher/voice-call", "/teacher/teachers", "/teacher/profile", "/teacher/settings"] },
];
const vipQuick = ["/teacher/attendance", "/teacher/homework", "/teacher/fees", "/teacher/announcements"];
const vipTones = ["blue", "violet", "green", "orange", "pink", "cyan"];
const vipModule = (path: string) => menuItems.find((m) => m[1] === path)!;
const vipTone = (path: string) => vipTones[menuItems.findIndex((m) => m[1] === path) % vipTones.length];

function vipGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
}

function currentTimeLabel() {
  const value = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date());
  return value.toUpperCase();
}

export default function TeacherDashboard() {
  const router = useRouter();
  const [teacherName, setTeacherName] = useState("Teacher");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [watchTime, setWatchTime] = useState(currentTimeLabel());
  const [todayLabel, setTodayLabel] = useState("");
  const [greeting, setGreeting] = useState("Welcome");
  // RACER_ASSIGNED_TOTAL_STUDENTS_PATCH
  const [assignedStudentCount, setAssignedStudentCount] = useState<number | null>(null);

  useEffect(() => {
    const savedTeacherName =
      localStorage.getItem("teacherName") ||
      localStorage.getItem("teacher_name") ||
      localStorage.getItem("teacherUsername") ||
      localStorage.getItem("teacher_username") ||
      "Teacher";
    setTeacherName(savedTeacherName);
    setProfileImage(localStorage.getItem("teacherProfileImage"));
    setTodayLabel(new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date()));
    setGreeting(vipGreeting());

    const timer = window.setInterval(() => setWatchTime(currentTimeLabel()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  // RACER_ASSIGNED_TOTAL_STUDENTS_PATCH
  useEffect(() => {
    let cancelled = false;

    async function loadAssignedStudentCount() {
      try {
        const rawTeacherId =
          sessionStorage.getItem("attendance_teacher_id") ||
          localStorage.getItem("attendance_teacher_id") ||
          sessionStorage.getItem("teacher_id") ||
          localStorage.getItem("teacher_id") ||
          "";

        const teacherId = Number(rawTeacherId);
        if (!Number.isInteger(teacherId) || teacherId <= 0) {
          if (!cancelled) setAssignedStudentCount(0);
          return;
        }

        const assignedResult =
          teacherId === 1
            ? null
            : await supabase.rpc("get_teacher_assigned_student_ids", {
                p_teacher_id: teacherId,
              });

        if (assignedResult && assignedResult.error) {
          throw assignedResult.error;
        }

        const assignedIds =
          teacherId === 1
            ? null
            : (assignedResult?.data || [])
                .map((row: { student_id?: number }) => Number(row.student_id))
                .filter((id: number) => Number.isInteger(id) && id > 0);

        if (assignedIds !== null && assignedIds.length === 0) {
          if (!cancelled) setAssignedStudentCount(0);
          return;
        }

        let query = supabase
          .from("students")
          .select("id", { count: "exact", head: true });

        if (assignedIds !== null) {
          query = query.in("id", assignedIds);
        }

        const { count, error } = await query;
        if (error) throw error;

        if (!cancelled) {
          setAssignedStudentCount(typeof count === "number" ? count : 0);
        }
      } catch (error) {
        console.error("Teacher dashboard student count error:", error);
        if (!cancelled) setAssignedStudentCount(0);
      }
    }

    loadAssignedStudentCount();

    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = teacherName.trim() || "Teacher";
  const initial = displayName.slice(0, 1).toUpperCase();

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    const authKeys = [
      "attendance_role","attendance_username","attendance_teacher_id","teacherLoggedIn","teacher",
      "teacherUsername","teacher_username","teacherName","teacher_name","studentLoggedIn","studentId",
      "studentUsername","student_username","studentName","student_name",
    ];
    authKeys.forEach((key) => localStorage.removeItem(key));
    authKeys.forEach((key) => sessionStorage.removeItem(key));
    router.replace("/");
  }

  return (
    <main className={`vip-td vip-td--${VIP_THEME}`}>
      <div className="vip-td-wrap">
        <header className="vip-td-top">
          <div className="vip-td-brand">
            <span className="vip-td-logo"><img src="/racer-academy-icon.png" alt="RACER ACADEMY" /></span>
            <span>
              <strong>WELCOME RACER ACADEMY</strong>
              <small>TEACHER CONTROL CENTER</small>
            </span>
          </div>
          <div className="vip-td-actions">
            <TeacherNotificationsBell className="teacher-notifications-dashboard" />
            <button type="button" className="vip-td-icon-btn" onClick={handleLogout} disabled={loggingOut} aria-label="Logout">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 5H5v14h5M15 8l4 4-4 4M9 12h10" /></svg>
            </button>
          </div>
        </header>

        <section className="vip-td-hero">
          <div>
            <div className="vip-td-id">
              <button type="button" className="vip-td-avatar" onClick={() => router.push("/teacher/profile")} aria-label="Profile">
                {profileImage ? <img src={profileImage} alt="Profile" onError={() => setProfileImage(null)} /> : initial}
                <i />
              </button>
              <div>
                <small>{greeting}</small>
                <h1>{displayName}</h1>
                <span className="vip-td-chip">TEACHER</span>
              </div>
            </div>
          </div>
          <div className="vip-td-stats">
            <div className="vip-td-total">
              <small>Total Students</small>
              <strong>{assignedStudentCount === null ? "--" : assignedStudentCount}</strong>
              <span>Assigned to you</span>
            </div>
            <div className="vip-td-mini">
              <div><Icon name="calendar" size={15} /><small>Today</small><b>{todayLabel || "--"}</b></div>
              <div><Icon name="time" size={15} /><small>Time</small><b>{watchTime}</b></div>
              <div><Icon name="modules" size={15} /><small>Modules</small><b>{menuItems.length}</b></div>
            </div>
          </div>
        </section>

        <section className="vip-td-quick" aria-label="Quick actions">
          {vipQuick.map((path) => {
            const m = vipModule(path);
            return (
              <button key={path} type="button" className="vip-td-q" data-tone={vipTone(path)} onPointerEnter={() => router.prefetch(path)} onFocus={() => router.prefetch(path)} onClick={() => router.push(path)}>
                <span className="vip-td-q-ico"><Icon name={m[2]} size={21} /></span>
                <span>{m[0]}</span>
              </button>
            );
          })}
        </section>

        <div id="teacher-modules">
          {vipGroups.map((group) => (
            <section key={group.title} className="vip-td-group">
              <div className="vip-td-group-head">
                <h2>{group.title}</h2>
                <span>{group.sub}</span>
              </div>
              <div className="vip-td-grid" data-n={group.paths.length}>
                {group.paths.map((path) => {
                  const m = vipModule(path);
                  return (
                    <button key={path} type="button" className="vip-td-tile" data-tone={vipTone(path)} onPointerEnter={() => router.prefetch(path)} onFocus={() => router.prefetch(path)} onClick={() => router.push(path)}>
                      <span className="vip-td-tile-ico"><Icon name={m[2]} size={24} /></span>
                      <span className="vip-td-tile-title">{m[0]}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <section className="vip-td-banner">
          <span><Icon name="bulb" size={20} /></span>
          <div>
            <strong>Better Students, Brighter Future!</strong>
            <small>Together we can build a smarter learning platform.</small>
          </div>
        </section>
      </div>
    </main>
  );
}
