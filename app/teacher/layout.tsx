"use client";
import "./teacher-mobile-header-fix.css";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import "../racer-teacher-desktop.css";
import TeacherModuleHeaderCleaner from "../components/TeacherModuleHeaderCleaner";
const items = [
  { href: "/teacher/dashboard", label: "Home", icon: "\u2302" },
  { href: "/teacher/attendance", label: "Attendance", icon: "\u25A6" },
    // RACER_TEACHER_BOTTOM_NAV_STUDENTS_V1
    { label: 'Students', href: '/teacher/student-directory', icon: '👥' },
  { href: "/teacher/settings", label: "Settings", icon: "\u2699" },
  { href: "/teacher/profile", label: "Profile", icon: "\u25C9" },
];

// RACER_TEACHER_DESKTOP_SIDEBAR_V1 - desktop (>=1025px) sidebar; same modules as the dashboard
const teacherDesktopGroups = [
  { label: "TEACHING", items: [
    { href: "/teacher/attendance", label: "Mark Attendance", icon: "\u25A3" },
    { href: "/teacher/attendance-history", label: "Attendance History", icon: "\u25F7" },
    { href: "/teacher/calendar", label: "Calendar", icon: "\u25A6" },
    { href: "/teacher/timetable", label: "Timetable", icon: "\u25A4" },
    { href: "/teacher/homework", label: "Homework", icon: "\u270E" },
    { href: "/teacher/extra-class", label: "Extra Classes", icon: "\u271A" },
    { href: "/teacher/quiz-tests", label: "Quiz Tests", icon: "\u2713" },
    { href: "/teacher/monthly-results", label: "Monthly Result", icon: "\u2605" },
  ] },
  { label: "STUDENTS", items: [
    { href: "/teacher/students", label: "Students", icon: "\u25C9" },
    { href: "/teacher/student-directory", label: "Student Directory", icon: "\u25A4" },
    { href: "/teacher/login-activity", label: "Student Login Activity", icon: "\u25F7" },
    { href: "/teacher/reports", label: "Reports", icon: "\u25A6" },
    { href: "/teacher/announcements", label: "Announcements", icon: "\u2605" },
  ] },
  { label: "FEES", items: [
    { href: "/teacher/fees", label: "Fees", icon: "\u20B9" },
    { href: "/teacher/payments", label: "Payments", icon: "\u25C8" },
  ] },
  { label: "MANAGE", items: [
    { href: "/teacher/voice-call", label: "Voice & Call Center", icon: "\u260E" },
    { href: "/teacher/teachers", label: "Teachers", icon: "\u263A" },
    { href: "/teacher/academy-profile", label: "Academy Profile", icon: "\u2302" },
    { href: "/teacher/profile", label: "Profile", icon: "\u25C9" },
    { href: "/teacher/settings", label: "Settings", icon: "\u2699" },
  ] },
];

function getTeacherDesktopTitle(pathname: string) {
  if (pathname === "/teacher/dashboard" || pathname === "/teacher") return "Teacher Dashboard";
  const all = teacherDesktopGroups.flatMap((g) => g.items);
  const hit = all.filter((i) => pathname === i.href || pathname.startsWith(i.href + "/")).sort((a, b) => b.href.length - a.href.length)[0];
  return hit ? hit.label : "Teacher Portal";
}

export default function TeacherLayout({ children }: { children: ReactNode }) {
  const [headerName, setHeaderName] = useState("Teacher");
  const [headerTime, setHeaderTime] = useState(""); const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    const savedName = localStorage.getItem("teacherName") || localStorage.getItem("teacher_name") || localStorage.getItem("teacherUsername") || localStorage.getItem("teacher_username") || "Teacher";
    const firstName = savedName.trim().split(/\s+/)[0] || "Teacher";
    setHeaderName(firstName); setProfileImage(localStorage.getItem("teacherProfileImage"));
    const updateHeaderTime = () => setHeaderTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
    updateHeaderTime();
    const timer = setInterval(updateHeaderTime, 1000);
    // RACER_SHARED_FIXED_HEADER_LOGOUT
  function handleSharedTeacherLogout() {
    const keys = [
      "teacher_username",
      "teacherUsername",
      "teacherLoggedIn",
      "attendance_role",
      "attendance_username",
      "attendance_teacher_id",
      "teacher_id",
    ];
    keys.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    window.location.href = "/";
  }
return () => clearInterval(timer);
  }, []);
  const pathname = usePathname();
  const isDashboard = pathname === "/teacher/dashboard";
  const handleTeacherDesktopLogout = () => {
    ["teacher_username", "teacherUsername", "teacherLoggedIn", "attendance_role", "attendance_username", "attendance_teacher_id", "teacher_id"].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    window.location.href = "/";
  };

  return (
    <div className="racer-portal-shell racer-teacher-shell">
      {/* RACER_TEACHER_DESKTOP_SIDEBAR_V1: visible only at >= 1025px (see racer-teacher-desktop.css) */}
      <header className="rtd-header">
        <Link href="/teacher/dashboard" className="rtd-brand">
          <img src="/racer-academy-icon.png" alt="RACER ACADEMY" />
          <span>
            <strong>RACER ACADEMY</strong>
            <small>TEACHER CONTROL CENTER</small>
          </span>
        </Link>
        <div className="rtd-title">{getTeacherDesktopTitle(pathname)}</div>
        <div className="rtd-tools">
          {!isDashboard && <button type="button" className="rtd-btn" onClick={() => window.history.back()}>Back</button>}
          <button type="button" className="rtd-btn" onClick={() => window.location.reload()}>Refresh</button>
          <Link href="/teacher/profile" className="rtd-user">
            <span className="rtd-avatar">{profileImage ? <img src={profileImage} alt="" onError={() => setProfileImage(null)} /> : headerName.slice(0, 1).toUpperCase()}</span>
            <span><strong>{headerName}</strong><small>Teacher Account</small></span>
          </Link>
          <button type="button" className="rtd-btn logout" onClick={handleTeacherDesktopLogout}>Logout</button>
        </div>
      </header>

      <aside className="rtd-sidebar" aria-label="Teacher portal navigation">
        <div className="rtd-label">MAIN</div>
        <nav className="rtd-nav">
          <Link href="/teacher/dashboard" className={`rtd-item${isDashboard ? " active" : ""}`} aria-current={isDashboard ? "page" : undefined}>
            <span className="rtd-ico" aria-hidden="true">{"\u2302"}</span><span>Dashboard</span>
          </Link>
        </nav>
        {teacherDesktopGroups.map((group) => (
          <div key={group.label}>
            <div className="rtd-label">{group.label}</div>
            <nav className="rtd-nav">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link key={item.href} href={item.href} className={`rtd-item${active ? " active" : ""}`} aria-current={active ? "page" : undefined}>
                    <span className="rtd-ico" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
        <div className="rtd-foot"><strong>RACER ACADEMY</strong>Learn {"\u2022"} Grow {"\u2022"} Achieve</div>
      </aside>

      {/* RACER_SHARED_FIXED_MODULE_HEADER_V1 */}
      {!isDashboard && (
        <header className="racer-shared-fixed-module-header">
          <div className="racer-shared-fixed-brand-row">
            <Link href="/teacher/dashboard#teacher-modules" className="racer-shared-fixed-menu" aria-label="Modules">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </Link>

            <Link href="/teacher/dashboard" className="racer-shared-fixed-brand">
              <img src="/racer-academy-icon.png" alt="RACER ACADEMY" />
              <span>
                <strong>RACER ACADEMY</strong>
                <small>{getTeacherDesktopTitle(pathname).toUpperCase()}</small>
              </span>
            </Link>

            <div className="racer-shared-fixed-right">
              <Link href="/teacher/announcements" className="racer-shared-fixed-icon" aria-label="Announcements">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link href="/teacher/profile" className="racer-shared-fixed-avatar" aria-label="Profile">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" onError={() => setProfileImage(null)} />
                ) : (
                  <span>{headerName.slice(0, 1).toUpperCase()}</span>
                )}
              </Link>
            </div>
          </div>

          <div className="racer-shared-fixed-actions" aria-label="Teacher page actions">
            <button type="button" onClick={() => window.history.back()} className="racer-shared-action back">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 12H5M11 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Back</span>
            </button>

            <button type="button" onClick={() => window.location.reload()} className="racer-shared-action refresh">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 11a8 8 0 0 0-14.7-4.2L3 9M3 4v5h5M4 13a8 8 0 0 0 14.7 4.2L21 15M21 20v-5h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Refresh</span>
            </button>

            <Link href="/teacher/dashboard" className="racer-shared-action dashboard">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4" y="4" width="6" height="6" rx="1" fill="currentColor" />
                <rect x="14" y="4" width="6" height="6" rx="1" fill="currentColor" />
                <rect x="4" y="14" width="6" height="6" rx="1" fill="currentColor" />
                <rect x="14" y="14" width="6" height="6" rx="1" fill="currentColor" />
              </svg>
              <span>Dashboard</span>
            </Link>

            <button type="button" onClick={() => { ["teacher_username","teacherUsername","teacherLoggedIn","attendance_role","attendance_username","attendance_teacher_id","teacher_id"].forEach((key) => { localStorage.removeItem(key); sessionStorage.removeItem(key); }); window.location.href = "/"; }} className="racer-shared-action logout">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10 5H5v14h5M15 8l4 4-4 4M9 12h10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </header>
      )}

      {!isDashboard && <TeacherModuleHeaderCleaner />}
      <div className={`racer-portal-content${isDashboard ? "" : " racer-shared-teacher-module-content"}${pathname.startsWith("/teacher/profile") ? " racer-teacher-profile-route" : ""}`}>{children}</div>

      <nav className="racer-bottom-nav" aria-label="Teacher navigation">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/teacher/dashboard" && pathname.startsWith(item.href));

          return (
            <Link key={item.href} href={item.href} className={`racer-bottom-nav-item${active ? " active" : ""}`}>
              <span className="racer-bottom-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}













