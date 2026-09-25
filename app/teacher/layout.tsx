"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import RacerPageActions from "../../components/RacerPageActions";

const items = [
  { href: "/teacher/dashboard", label: "Home", icon: "âŒ‚" },
  { href: "/teacher/attendance", label: "Attendance", icon: "âœ“" },
  { href: "/teacher/students", label: "Students", icon: "â—‹" },
  { href: "/teacher/profile", label: "Profile", icon: "â—" },
];

export default function TeacherLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname === "/teacher/dashboard";

  return (
    <div className="racer-portal-shell racer-teacher-shell">
      {!isDashboard && (
        <header className="racer-mobile-appbar">
          <Link href="/teacher/dashboard" className="racer-appbar-brand">
            <span className="racer-appbar-logo">RA</span>
            <span>
              <strong>RACER ACADEMY</strong>
              <small>TEACHER PORTAL</small>
            </span>
          </Link>
          <Link href="/teacher/announcements" className="racer-appbar-action" aria-label="Announcements">
            â—
          </Link>
        </header>
      )}

      {!isDashboard && (
        <RacerPageActions
          dashboardPath="/teacher/dashboard"
          logoutKeys={["teacher_username","teacherUsername","teacherLoggedIn","attendance_role","attendance_username","attendance_teacher_id","teacher_id"]}
        />
      )}

      <style dangerouslySetInnerHTML={{__html:"@media(max-width:640px){.racer-teacher-shell{width:100%!important;max-width:100%!important;overflow-x:hidden!important}.racer-teacher-shell .racer-portal-content{width:100%!important;max-width:100%!important;min-width:0!important;overflow-x:hidden!important}.racer-teacher-shell .racer-portal-content *{box-sizing:border-box!important;min-width:0!important;max-width:100%!important;overflow-wrap:anywhere!important;word-break:normal!important}.racer-teacher-shell .racer-portal-content h1{font-size:22px!important;line-height:1.2!important}.racer-teacher-shell .racer-portal-content h2{font-size:18px!important;line-height:1.25!important}.racer-teacher-shell .racer-portal-content h3{font-size:15px!important;line-height:1.3!important}.racer-teacher-shell .racer-portal-content h4,.racer-teacher-shell .racer-portal-content h5,.racer-teacher-shell .racer-portal-content h6{font-size:13px!important;line-height:1.3!important}.racer-teacher-shell .racer-portal-content p,.racer-teacher-shell .racer-portal-content span,.racer-teacher-shell .racer-portal-content strong,.racer-teacher-shell .racer-portal-content label{line-height:1.25!important;overflow-wrap:anywhere!important}.racer-teacher-shell .racer-portal-content input,.racer-teacher-shell .racer-portal-content select,.racer-teacher-shell .racer-portal-content textarea{width:100%!important;max-width:100%!important;min-width:0!important;font-size:12px!important}.racer-teacher-shell .racer-portal-content button,.racer-teacher-shell .racer-portal-content a{max-width:100%!important;font-size:11px!important}.racer-teacher-shell .racer-portal-content table{width:100%!important;max-width:100%!important;min-width:0!important;border-collapse:collapse!important}.racer-teacher-shell .racer-portal-content th,.racer-teacher-shell .racer-portal-content td{min-width:0!important;max-width:100%!important;padding:5px 3px!important;font-size:9px!important;line-height:1.2!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important;vertical-align:middle!important}.racer-teacher-shell .racer-portal-content img,.racer-teacher-shell .racer-portal-content video{max-width:100%!important;height:auto!important}.racer-teacher-shell .racer-portal-content form,.racer-teacher-shell .racer-portal-content section,.racer-teacher-shell .racer-portal-content article,.racer-teacher-shell .racer-portal-content header,.racer-teacher-shell .racer-portal-content footer{max-width:100%!important;min-width:0!important}}"}} /><div className="racer-portal-content">{children}</div>

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

