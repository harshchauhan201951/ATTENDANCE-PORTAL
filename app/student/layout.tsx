"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const items = [
  { href: "/student/dashboard", label: "Home", icon: "⌂" },
  { href: "/student/calendar", label: "Calendar", icon: "▦" },
  { href: "/student/announcements", label: "Notice", icon: "●" },
  { href: "/student/profile", label: "Profile", icon: "○" },
];

export default function StudentLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname === "/student/dashboard";

  return (
    <div className="racer-portal-shell racer-student-shell">
      {!isDashboard && (
        <header className="racer-mobile-appbar">
          <Link href="/student/dashboard" className="racer-appbar-brand">
            <span className="racer-appbar-logo">RA</span>
            <span>
              <strong>RACER ACADEMY</strong>
              <small>STUDENT PORTAL</small>
            </span>
          </Link>
          <Link href="/student/announcements" className="racer-appbar-action" aria-label="Announcements">
            ●
          </Link>
        </header>
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
