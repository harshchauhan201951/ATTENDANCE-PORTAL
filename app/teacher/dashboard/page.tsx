"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function TeacherDashboard() {
  const router = useRouter();
  const [teacherName, setTeacherName] = useState("Teacher");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const savedTeacherName =
      localStorage.getItem("teacherName") ||
      localStorage.getItem("teacher_name") ||
      localStorage.getItem("teacherUsername") ||
      localStorage.getItem("teacher_username") ||
      "Teacher";

    setTeacherName(savedTeacherName);
  }, []);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);

    const authKeys = [
      "attendance_role",
      "attendance_username",
      "attendance_teacher_id",
      "teacherLoggedIn",
      "teacher",
      "teacherUsername",
      "teacher_username",
      "teacherName",
      "teacher_name",
      "studentLoggedIn",
      "studentId",
      "studentUsername",
      "student_username",
      "studentName",
      "student_name",
    ];

    authKeys.forEach((key) => localStorage.removeItem(key));
    authKeys.forEach((key) => sessionStorage.removeItem(key));
    await new Promise((resolve) => setTimeout(resolve, 100));
    router.replace("/");
    router.refresh();
  }

  const menuItems = [
    { title: "Mark Attendance", description: "Mark today's student attendance", icon: "✓", path: "/teacher/attendance" },
    { title: "Attendance History", description: "Check previous attendance records", icon: "▤", path: "/teacher/attendance-history" },
    { title: "Calendar", description: "View academic and attendance calendar", icon: "▦", path: "/teacher/calendar" },
    { title: "Reports", description: "View attendance reports", icon: "▥", path: "/teacher/reports" },
    { title: "Fees", description: "Manage student fee information", icon: "₹", path: "/teacher/fees" },
    { title: "Payments", description: "Manage cash and online fee payments", icon: "¤", path: "/teacher/payments" },
    { title: "Homework", description: "Create and manage student homework", icon: "□", path: "/teacher/homework" },
    { title: "Announcements", description: "Create and manage announcements for all students", icon: "●", path: "/teacher/announcements" },
    { title: "Student Login Activity", description: "Track when every student logs into the portal", icon: "◉", path: "/teacher/login-activity" },
    { title: "Profile", description: "Manage your teacher profile and picture", icon: "○", path: "/teacher/profile" },
    { title: "Settings", description: "Manage teacher account settings", icon: "⚙", path: "/teacher/settings" },
    { title: "Student Directory", description: "View and export complete student details", icon: "◎", path: "/teacher/student-directory" },
    { title: "Extra Classes", description: "Manage extra classes and attendance", icon: "+", path: "/teacher/extra-class" },
    { title: "Quiz Tests", description: "Create, manage and review student quiz tests", icon: "Q", path: "/teacher/quiz-tests" },
    { title: "Voice & Call Center", description: "Contact students and manage academy communication", icon: "☎", path: "/teacher/voice-call" },
    { title: "Teachers", description: "Manage teacher accounts and teacher information", icon: "T", path: "/teacher/teachers" },
  ];

  return (
    <main className="racer-teacher-dashboard">
      <div className="racer-teacher-inner">
        <header className="racer-teacher-header">
          <div className="racer-teacher-brand">
            <div className="racer-teacher-logo">RA</div>
            <div>
              <div className="racer-teacher-kicker">RACER ACADEMY</div>
              <h1>Welcome, {teacherName}</h1>
              <p>Teacher Control Center</p>
            </div>
          </div>

          <div className="racer-teacher-header-actions">
            <button type="button" onClick={() => router.push("/teacher/announcements")} aria-label="Announcements">●</button>
            <button type="button" onClick={handleLogout} disabled={loggingOut} className="racer-teacher-logout">
              {loggingOut ? "..." : "Logout"}
            </button>
          </div>
        </header>

        <section className="racer-teacher-title">
          <div>
            <span>TEACHER SERVICES</span>
            <h2>Dashboard</h2>
          </div>
          <strong>{menuItems.length} MODULES</strong>
        </section>

        <section className="racer-teacher-grid">
          {menuItems.map((item, index) => (
            <button
              type="button"
              key={item.path}
              onClick={() => router.push(item.path)}
              className="racer-teacher-module"
              aria-label={item.title}
            >
              <span className="racer-teacher-module-icon">{item.icon}</span>
              <span className="racer-teacher-module-title">{item.title}</span>
              <span className="racer-teacher-module-number">{String(index + 1).padStart(2, "0")}</span>
            </button>
          ))}
        </section>

        <section className="racer-teacher-info">
          <span className="racer-teacher-info-icon">i</span>
          <div>
            <strong>All teacher functions remain available.</strong>
            <p>Use the module grid above to open the existing attendance, students, fees, homework, quiz, communication and administration features.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
