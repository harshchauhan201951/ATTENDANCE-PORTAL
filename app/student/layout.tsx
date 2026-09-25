"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import RacerPageActions from "../../components/RacerPageActions";

const items = [
  { href: "/student/dashboard", label: "Home", icon: "âŒ‚" },
  { href: "/student/calendar", label: "Calendar", icon: "â–¦" },
  { href: "/student/announcements", label: "Notice", icon: "â—" },
  { href: "/student/profile", label: "Profile", icon: "â—‹" },
];

export default function StudentLayout({ children }: { children: ReactNode }) {
  const [headerName, setHeaderName] = useState("Student");
  const [headerTime, setHeaderTime] = useState("");

  useEffect(() => {
    const savedName = localStorage.getItem("studentName") || localStorage.getItem("student_name") || "Student";
    const firstName = savedName.trim().split(/\s+/)[0] || "Student";
    setHeaderName(firstName);
    const updateHeaderTime = () => setHeaderTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
    updateHeaderTime();
    const timer = setInterval(updateHeaderTime, 1000);
    return () => clearInterval(timer);
  }, []);
  const pathname = usePathname();
  const isDashboard = pathname === "/student/dashboard";

  return (
    <div className="racer-portal-shell racer-student-shell">
      {!isDashboard && (
        <header className="racer-mobile-appbar" style={{ position: "sticky", top: 0, zIndex: 80 }}>
          <Link href="/student/dashboard" className="racer-appbar-brand">
            <span className="racer-appbar-logo">RA</span>
            <span>
              <strong>RACER ACADEMY</strong>
              <small>Hello, {headerName}</small>
            </span>
          </Link>
          <Link href="/student/announcements" className="racer-appbar-action" aria-label="Announcements">
            â—
          </Link>
        </header>
      )}

      {!isDashboard && (
        <RacerPageActions
          dashboardPath="/student/dashboard"
          logoutKeys={["student_username","studentUsername","studentLoggedIn","attendance_student_id","studentId","student_id","attendance_student_name"]}
        />
      )}

      <div className="racer-portal-content">{children}</div>

      <nav className="racer-bottom-nav" aria-label="Student navigation">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/student/dashboard" && pathname.startsWith(item.href));

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

