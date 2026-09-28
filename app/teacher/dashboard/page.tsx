"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function TeacherDashboard() {
  const router = useRouter();
  const [teacherName, setTeacherName] = useState("Teacher");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const savedTeacherName =
      localStorage.getItem("teacherName") ||
      localStorage.getItem("teacher_name") ||
      localStorage.getItem("teacherUsername") ||
      localStorage.getItem("teacher_username") ||
      "Teacher";
    setTeacherName(savedTeacherName);
    setProfileImage(localStorage.getItem("teacherProfileImage"));
  }, []);

  const firstName = teacherName.trim().split(/\s+/)[0] || "Teacher";

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
    await new Promise((resolve) => setTimeout(resolve, 100));
    router.replace("/");
    router.refresh();
  }

  const menuItems = [
    ["Mark Attendance", "/teacher/attendance", "✓", "academic"],
    ["Attendance History", "/teacher/attendance-history", "▤", "academic"],
    ["Calendar", "/teacher/calendar", "▦", "academic"],
    ["Reports", "/teacher/reports", "▥", "academic"],
    ["Fees", "/teacher/fees", "₹", "management"],
    ["Payments", "/teacher/payments", "▣", "management"],
    ["Homework", "/teacher/homework", "▤", "academic"],
    ["Announcements", "/teacher/announcements", "●", "management"],
    ["Student Login Activity", "/teacher/login-activity", "◉", "management"],
    ["Profile", "/teacher/profile", "○", "management"],
    ["Settings", "/teacher/settings", "⚙", "management"],
    ["Student Directory", "/teacher/student-directory", "◉", "academic"],
    ["Extra Classes", "/teacher/extra-class", "+", "academic"],
    ["Quiz Tests", "/teacher/quiz-tests", "Q", "academic"],
    ["Voice & Call Center", "/teacher/voice-call", "☎", "management"],
    ["Teachers", "/teacher/teachers", "T", "management"],
    ["Timetable", "/teacher/timetable", "▦", "academic"],
  ] as const;

  const iconClass = (index: number) => `racer-ref-icon racer-ref-icon-${index + 1}`;

  return (
    <main className="racer-dashboard-v2 racer-reference-dashboard">
      <div className="racer-dashboard-v2-shell">
        {/* Existing desktop dashboard remains available; reference dashboard is mobile-only. */}
        <section className="racer-reference-mobile-dashboard" aria-label="Teacher Services">
          <header className="racer-reference-mobile-topbar">
            <div className="racer-reference-mobile-brand">
              <div className="racer-reference-mobile-logo">RA</div>
              <div>
                <strong>Teacher Services</strong>
                <span>Modules&nbsp; | &nbsp;Teacher</span>
              </div>
            </div>
            <button type="button" className="racer-reference-mobile-profile" onClick={() => router.push("/teacher/profile")} aria-label="Profile">
              {profileImage ? <img src={profileImage} alt="Profile" onError={() => setProfileImage(null)} /> : firstName.slice(0, 1).toUpperCase()}
            </button>
          </header>

          <div className="racer-reference-mobile-tabs" aria-hidden="true">
            <span className="active">All</span>
            <span>Academic</span>
            <span>Management</span>
          </div>

          <section className="racer-reference-mobile-grid">
            {menuItems.slice(0, 16).map(([title, path, glyph], index) => (
              <button key={path} type="button" onClick={() => router.push(path)} className="racer-reference-module-card">
                <span className={iconClass(index)}>{glyph}</span>
                <span className="racer-reference-module-copy">
                  <strong>{title}</strong>
                  <small>{String(index + 1).padStart(2, "0")}</small>
                </span>
                <span className="racer-reference-chevron">›</span>
              </button>
            ))}
          </section>

          <button type="button" onClick={() => router.push("/teacher/timetable")} className="racer-reference-timetable-card">
            <span className="racer-ref-icon racer-ref-icon-17">▦</span>
            <span><strong>Timetable</strong><small>17</small></span>
            <span className="racer-reference-chevron">›</span>
          </button>

          <div className="racer-reference-mobile-footer-space" />
        </section>

        <section className="racer-reference-desktop-dashboard">
          <header className="racer-dashboard-v2-header">
            <div className="racer-dashboard-v2-brand">
              <div className="racer-dashboard-v2-logo">RA</div>
              <div className="racer-dashboard-v2-brand-text">
                <strong>RACER ACADEMY</strong>
                <span>LEARN&nbsp; | &nbsp;PRACTICE&nbsp; | &nbsp;GROW</span>
              </div>
            </div>
            <div className="racer-dashboard-v2-header-actions">
              <button type="button" onClick={() => router.push("/teacher/announcements")} aria-label="Announcements">♧</button>
              <button type="button" onClick={handleLogout} disabled={loggingOut} className="racer-dashboard-v2-logout">{loggingOut ? "..." : "Logout"}</button>
            </div>
          </header>
          <section className="racer-dashboard-v2-welcome">
            <div><span className="racer-dashboard-v2-eyebrow">TEACHER CONTROL CENTER</span><h1>Hello, {firstName}</h1><p>Small steps. Make big progress.</p></div>
            <div className="racer-dashboard-v2-welcome-art">RA</div>
          </section>
          <section className="racer-dashboard-v2-grid">
            {menuItems.map(([title, path, glyph], index) => (
              <button key={path} type="button" onClick={() => router.push(path)} className="racer-dashboard-v2-module">
                <span className="dash-icon">{glyph}</span><span className="dash-module-number">{String(index + 1).padStart(2, "0")}</span><strong>{title}</strong>
              </button>
            ))}
          </section>
        </section>
      </div>
    </main>
  );
}
