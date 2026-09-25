"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import RacerPageActions from "../../components/RacerPageActions";

const items = [
  { href: "/teacher/dashboard", label: "Home", icon: "⌂" },
  { href: "/teacher/attendance", label: "Attendance", icon: "✓" },
  { href: "/teacher/students", label: "Students", icon: "○" },
  { href: "/teacher/profile", label: "Profile", icon: "●" },
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
            ●
          </Link>
        </header>
      )}

      {!isDashboard && (
        <RacerPageActions
          dashboardPath="/teacher/dashboard"
          logoutKeys={["teacher_username","teacherUsername","teacherLoggedIn","attendance_role","attendance_username","attendance_teacher_id","teacher_id"]}
        />
      )}

      <div className="racer-portal-content">{children}</div>

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
