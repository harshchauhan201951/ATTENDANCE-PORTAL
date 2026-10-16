"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import RacerPageActions from "../../components/RacerPageActions"; import { supabase } from "../../lib/supabase";

const items = [
  { href: "/student/dashboard", label: "Home", icon: "âŒ‚" },
  { href: "/student/attendance", label: "Attendance", icon: "â–£" },
  { href: "/student/quiz-tests/available", label: "Quiz", icon: "âœ“" },
  { href: "/student/monthly-result", label: "Result", icon: "â˜…" },
  { href: "/student/settings", label: "More", icon: "â˜°" },
]; // RACER_STUDENT_MOBILE_NAV_REFERENCE_V3


const studentDesktopNavItems = [
  { href: "/student/dashboard", label: "Dashboard", icon: "⌂" },
  { href: "/student/attendance", label: "My Attendance", icon: "▣" },
  { href: "/student/attendance-history", label: "Attendance History", icon: "◷" },
  { href: "/student/calendar", label: "Academic Calendar", icon: "▦" },
  { href: "/student/reports", label: "Reports", icon: "▤" },
  { href: "/student/fees", label: "Fees", icon: "₹" },
  { href: "/student/homework", label: "Homework", icon: "✎" },
  { href: "/student/settings", label: "Settings", icon: "⚙" },
  { href: "/student/quiz-tests", label: "Quiz Tests", icon: "✓" },
  { href: "/student/monthly-result", label: "Monthly Final Result", icon: "★" },
  { href: "/student/timetable", label: "Timetable", icon: "▦" },
];

const studentDesktopExtraItems = [
  { href: "/student/announcements", label: "Announcements", icon: "★" },
  { href: "/student/notifications", label: "Notifications", icon: "🔔" },
  { href: "/student/profile", label: "My Profile", icon: "◉" },
];

function getStudentDesktopModule(pathname: string) {
  if (pathname.startsWith("/student/quiz-tests/attempt")) return { key: "quiz-attempt", title: "Quiz Tests", subtitle: "Read each question carefully and submit your answers before the timer ends.", icon: "✓" };
  if (pathname.startsWith("/student/quiz-tests/history")) return { key: "quiz-history", title: "Quiz Tests", subtitle: "Review your previous quiz attempts and scores.", icon: "◷" };
  if (pathname.startsWith("/student/quiz-tests/results")) return { key: "quiz-results", title: "Quiz Tests", subtitle: "Check your marks, accuracy, and submitted quiz details.", icon: "★" };
  if (pathname.startsWith("/student/quiz-tests/available")) return { key: "quiz-available", title: "Quiz Tests", subtitle: "Choose an assigned quiz and check its duration before starting.", icon: "✓" };
  if (pathname === "/student/dashboard" || pathname === "/student") return { key: "dashboard", title: "Dashboard", subtitle: "Your attendance, learning activities, results, and updates in one place.", icon: "⌂" };
  if (pathname.startsWith("/student/attendance-history")) return { key: "attendance-history", title: "Attendance History", subtitle: "Browse your recorded attendance by date and month.", icon: "◷" };
  if (pathname.startsWith("/student/attendance")) return { key: "attendance", title: "My Attendance", subtitle: "Track present days, absences, and extra-class attendance.", icon: "▣" };
  if (pathname.startsWith("/student/calendar")) return { key: "calendar", title: "Academic Calendar", subtitle: "View school days, holidays, events, and weekly test dates.", icon: "▦" };
  if (pathname.startsWith("/student/reports")) return { key: "reports", title: "Reports", subtitle: "Review attendance, assessment performance, and fee reports.", icon: "▤" };
  if (pathname.startsWith("/student/fees")) return { key: "fees", title: "Fees", subtitle: "View fee status, payment history, and available receipts.", icon: "₹" };
  if (pathname.startsWith("/student/homework")) return { key: "homework", title: "Homework", subtitle: "View assignments, due dates, and completion status.", icon: "✎" };
  if (pathname.startsWith("/student/settings")) return { key: "settings", title: "Settings", subtitle: "Manage your personal details and account security.", icon: "⚙" };
  if (pathname.startsWith("/student/quiz-tests")) return { key: "quiz-tests", title: "Quiz Tests", subtitle: "Start available quizzes or review your attempts and results.", icon: "✓" };
  if (pathname.startsWith("/student/monthly-result")) return { key: "monthly-result", title: "Monthly Final Result", subtitle: "Review quiz, Saturday test, MahaTest, and final score details.", icon: "★" };
  if (pathname.startsWith("/student/timetable")) return { key: "timetable", title: "Timetable", subtitle: "Check your class schedule and subject timings by weekday.", icon: "▦" };
  if (pathname.startsWith("/student/announcements")) return { key: "announcements", title: "Announcements", subtitle: "Read notices and academic updates shared by RACER ACADEMY.", icon: "★" };
  if (pathname.startsWith("/student/notifications")) return { key: "notifications", title: "Notifications", subtitle: "Review notices, reminders, results, and unread updates.", icon: "🔔" };
  if (pathname.startsWith("/student/profile")) return { key: "profile", title: "My Profile", subtitle: "View your student information and saved profile details.", icon: "◉" };
  return { key: "student", title: "Student Portal", subtitle: "Your RACER ACADEMY learning space.", icon: "⌂" };
}

export default function StudentLayout({ children }: { children: ReactNode }) {
  const [studentAccountChecking, setStudentAccountChecking] = useState(true);
  const [studentAccountActive, setStudentAccountActive] = useState(true);
  const [headerName, setHeaderName] = useState("Student");
  const [headerTime, setHeaderTime] = useState(""); const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    const savedName = localStorage.getItem("studentName") || localStorage.getItem("student_name") || "Student";
    const firstName = savedName.trim().split(/\s+/)[0] || "Student";
    setHeaderName(firstName); (async()=>{try{const username=localStorage.getItem("studentUsername")||localStorage.getItem("student_username")||localStorage.getItem("attendance_student_id")||localStorage.getItem("studentId")||""; if(username){const {data}=await supabase.from("students").select("profile_image_url").or(`student_username.eq.${username},id.eq.${username}`).limit(1).maybeSingle(); setProfileImage(typeof data?.profile_image_url==="string"&&data.profile_image_url.trim()?data.profile_image_url.trim():null);}}catch{setProfileImage(null);}})();
    const updateHeaderTime = () => setHeaderTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }));
    updateHeaderTime();
    const timer = setInterval(updateHeaderTime, 1000);
    return () => clearInterval(timer);
  }, []);
  // STUDENT ACCOUNT STATUS CHECK
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const username = localStorage.getItem("studentUsername") || localStorage.getItem("student_username") || "";
        const rawStudentId = localStorage.getItem("attendance_student_id") || localStorage.getItem("studentId") || localStorage.getItem("student_id") || "";
        if (!username && !rawStudentId) {
          if (!cancelled) setStudentAccountChecking(false);
          return;
        }
        let query = supabase.from("students").select("id,is_active");
        if (username) {
          query = query.eq("student_username", username);
        } else {
          const numericId = Number(rawStudentId);
          if (!Number.isInteger(numericId) || numericId <= 0) {
            if (!cancelled) setStudentAccountChecking(false);
            return;
          }
          query = query.eq("id", numericId);
        }
        const { data } = await query.maybeSingle();
        const active = data ? data.is_active !== false : true;
        if (!cancelled) {
          setStudentAccountActive(active);
          localStorage.setItem("studentAccountActive", String(active));
        }
      } catch {
        if (!cancelled) setStudentAccountActive(true);
      } finally {
        if (!cancelled) setStudentAccountChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const pathname = usePathname();
  const isDashboard = pathname === "/student/dashboard";

  if (studentAccountChecking) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px", fontFamily: "Arial, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <strong style={{ display: "block", fontSize: "16px" }}>Checking account...</strong>
          <span style={{ display: "block", marginTop: "6px", fontSize: "12px", color: "#64748b" }}>Please wait</span>
        </div>
      </div>
    );
  }

  const desktopModule = getStudentDesktopModule(pathname);

  const handleDesktopLogout = () => {
    ["student_username", "studentUsername", "studentLoggedIn", "attendance_student_id", "studentId", "student_id", "attendance_student_name", "studentName", "student_name"].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    window.location.href = "/";
  };

  return (
    <div className="racer-portal-shell racer-student-shell">
      {/* Original mobile app bar is preserved and remains the only header below desktop width. */}
      <header className="racer-mobile-appbar racer-student-fixed-header">
        <Link href="/student/dashboard" className="racer-appbar-brand">
          <span className="racer-appbar-logo racer-student-profile-circle">
            {profileImage ? <img src={profileImage} alt="Student Profile" onError={() => setProfileImage(null)} /> : <span className="racer-student-profile-fallback" aria-hidden="true">S</span>}
          </span>
          <span className="racer-student-header-brand-copy">
            <strong>RACER ACADEMY</strong>
            <small className="racer-student-header-meta">{headerTime} - Hello, {headerName}</small>
          </span>
        </Link>
        <div className="racer-student-header-actions">
          <Link href="/student/announcements" className="racer-appbar-action racer-student-bell" aria-label="Announcements">Notice</Link>
          <button type="button" className="racer-student-header-logout" onClick={handleDesktopLogout}>Logout</button>
        </div>
      </header>

      {/* Desktop header and navigation follow the approved reference board. */}
      <header className="racer-student-desktop-header">
        <Link href="/student/dashboard" className="racer-student-desktop-brand">
          <img src="/racer-academy-icon.png" alt="RACER ACADEMY" />
          <span className="racer-student-desktop-brand-copy">
            <strong>RACER ACADEMY</strong>
            <small>Learn • Grow • Achieve</small>
          </span>
        </Link>
        <div className="racer-student-desktop-title"><span aria-hidden="true">🎓</span><span>Student Portal</span></div>
        <div className="racer-student-desktop-actions">
          <Link href="/student/notifications" className="racer-student-desktop-notice" aria-label="Open notifications" title="Notifications">
            <span aria-hidden="true">🔔</span>
          </Link>
          <div className="racer-student-desktop-user">
            <span className="racer-student-desktop-avatar">
              {profileImage ? <img src={profileImage} alt="" onError={() => setProfileImage(null)} /> : headerName.trim().charAt(0).toUpperCase() || "S"}
            </span>
            <span className="racer-student-desktop-user-copy"><strong>{headerName}</strong><small>Student Account</small></span>
          </div>
          <button type="button" className="racer-student-desktop-logout" onClick={handleDesktopLogout}>Logout <span aria-hidden="true">↗</span></button>
        </div>
      </header>

      {!isDashboard && (
        <RacerPageActions
          dashboardPath="/student/dashboard"
          logoutKeys={["student_username", "studentUsername", "studentLoggedIn", "attendance_student_id", "studentId", "student_id", "attendance_student_name"]}
        />
      )}

      <div className="racer-student-desktop-workspace">
        <aside className="racer-student-desktop-sidebar" aria-label="Student portal navigation">
          <div className="racer-student-sidebar-section-label">YOUR LEARNING MENU</div>
          <nav className="racer-student-desktop-nav">
            {studentDesktopNavItems.map((item) => {
              const active = pathname === item.href || (item.href !== "/student/dashboard" && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} className={`racer-student-nav-item${active ? " active" : ""}`} aria-current={active ? "page" : undefined}>
                  <span className="racer-student-nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="racer-student-sidebar-section-label racer-student-sidebar-secondary-label">STUDENT CENTER</div>
          <nav className="racer-student-desktop-nav racer-student-desktop-extra-nav">
            {studentDesktopExtraItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href} className={`racer-student-nav-item${active ? " active" : ""}`} aria-current={active ? "page" : undefined}>
                  <span className="racer-student-nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="racer-student-sidebar-footer"><strong>RACER ACADEMY</strong><small>Learn • Grow • Achieve</small></div>
        </aside>

        <div className="racer-student-workarea">
          <div className="racer-student-module-heading">
            <span className="racer-student-module-heading-icon" aria-hidden="true">{desktopModule.icon}</span>
            <div className="racer-student-module-heading-copy"><h1>{desktopModule.title}</h1><p>{desktopModule.subtitle}</p></div>
            <div className="racer-student-module-time"><small>LOCAL TIME</small><strong>{headerTime || "--:--:--"}</strong></div>
          </div>
          <div className="racer-portal-content racer-module-page racer-student-content-area" data-student-route={desktopModule.key} style={{ paddingTop: isDashboard ? "0px" : "72px" }}>{children}</div>
        </div>
      </div>

      <nav className="racer-bottom-nav" aria-label="Student navigation">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/student/dashboard" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={`racer-bottom-nav-item${active ? " active" : ""}`}>
              <span className="racer-bottom-nav-icon">{item.icon}</span><span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}













