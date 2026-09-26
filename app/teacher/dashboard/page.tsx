"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function TeacherDashboard() {
  const router = useRouter();
  const [teacherName, setTeacherName] = useState("Teacher");
  const [loggingOut, setLoggingOut] = useState(false);
  const [headerTime, setHeaderTime] = useState("");

  useEffect(() => {
    const savedTeacherName =
      localStorage.getItem("teacherName") ||
      localStorage.getItem("teacher_name") ||
      localStorage.getItem("teacherUsername") ||
      localStorage.getItem("teacher_username") ||
      "Teacher";

    setTeacherName(savedTeacherName);
    const updateHeaderTime = () => setHeaderTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }));
    updateHeaderTime();
    const timer = setInterval(updateHeaderTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const firstName = teacherName.trim().split(/\s+/)[0] || "Teacher";

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
    { title: "Mark Attendance", description: "Mark today's student attendance", icon: "attendance", path: "/teacher/attendance" },
    { title: "Attendance History", description: "Check previous attendance records", icon: "history", path: "/teacher/attendance-history" },
    { title: "Calendar", description: "View academic and attendance calendar", icon: "calendar", path: "/teacher/calendar" },
    { title: "Reports", description: "View attendance reports", icon: "reports", path: "/teacher/reports" },
    { title: "Fees", description: "Manage student fee information", icon: "fees", path: "/teacher/fees" },
    { title: "Payments", description: "Manage cash and online fee payments", icon: "payments", path: "/teacher/payments" },
    { title: "Homework", description: "Create and manage student homework", icon: "homework", path: "/teacher/homework" },
    { title: "Announcements", description: "Create and manage announcements for all students", icon: "announcements", path: "/teacher/announcements" },
    { title: "Student Login Activity", description: "Track when every student logs into the portal", icon: "activity", path: "/teacher/login-activity" },
    { title: "Profile", description: "Manage your teacher profile and picture", icon: "profile", path: "/teacher/profile" },
    { title: "Settings", description: "Manage teacher account settings", icon: "settings", path: "/teacher/settings" },
    { title: "Student Directory", description: "View and export complete student details", icon: "directory", path: "/teacher/student-directory" },
    { title: "Extra Classes", description: "Manage extra classes and attendance", icon: "extra", path: "/teacher/extra-class" },
    { title: "Quiz Tests", description: "Create, manage and review student quiz tests", icon: "quiz", path: "/teacher/quiz-tests" },
    { title: "Voice & Call Center", description: "Contact students and manage academy communication", icon: "call", path: "/teacher/voice-call" },
    { title: "Teachers", description: "Manage teacher accounts and teacher information", icon: "teachers", path: "/teacher/teachers" },
    { title: "Timetable", description: "Create and manage class timetables", icon: "timetable", path: "/teacher/timetable" },
  ];

  return (
    <main className="racer-teacher-dashboard">
      <div className="racer-teacher-inner">
        <header className="racer-teacher-header" style={{ position: "sticky", top: 0, zIndex: 100 }}>
          <div className="racer-teacher-brand">
            <div className="racer-teacher-logo" style={{ width: "48px", height: "48px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "18px", background: "#1e293b", color: "#ffffff", border: "2px solid rgba(255,255,255,0.35)", boxShadow: "0 4px 12px rgba(0,0,0,0.20)" }}><img src="/racer-academy-icon.png" alt="RACER ACADEMY" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}} /></div>
            <div>
              <div className="racer-teacher-kicker">RACER ACADEMY</div>
              <h1>Welcome, {firstName}</h1>
              <p>Teacher Control Center</p>
            </div>
          </div>

          <div className="racer-teacher-header-actions">
            <span style={{fontSize:"12px",fontWeight:800,whiteSpace:"nowrap",color:"#0f172a",background:"#ffffff",padding:"8px 12px",borderRadius:"10px",border:"1px solid #cbd5e1",boxShadow:"0 2px 8px rgba(0,0,0,0.10)"}}>WATCH TIME {headerTime}</span>
            <button type="button" onClick={() => router.push("/teacher/announcements")} aria-label="Announcements" title="Announcements" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:"38px",height:"38px",borderRadius:"10px",fontSize:"20px",lineHeight:1,background:"#1e293b",color:"#ffffff",border:"1px solid rgba(255,255,255,0.30)",boxShadow:"0 3px 8px rgba(0,0,0,0.18)"}}>{String.fromCodePoint(0x1F514)}</button>
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
              <span className={"racer-teacher-module-icon icon-" + item.icon.toLowerCase()} aria-hidden="true" style={{width:"56px",height:"56px",borderRadius:"18px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"27px",fontWeight:900,boxShadow:"0 8px 20px rgba(15,23,42,.14)",border:"1px solid rgba(255,255,255,.8)",background:({attendance:"#dcfce7",history:"#dbeafe",calendar:"#fef3c7",reports:"#ede9fe",fees:"#d1fae5",payments:"#cffafe",homework:"#ffedd5",announcements:"#fee2e2",activity:"#fef9c3",profile:"#e0e7ff",settings:"#e5e7eb",directory:"#fce7f3",extra:"#dcfce7",quiz:"#fae8ff",call:"#dbeafe",teachers:"#f3e8ff",timetable:"#cffafe"} as Record<string,string>)[item.icon] || "#e2e8f0"}}>{({attendance:String.fromCodePoint(0x2705),history:String.fromCodePoint(0x21BA),calendar:String.fromCodePoint(0x1F4C5),reports:String.fromCodePoint(0x1F4CA),fees:String.fromCodePoint(0x20B9),payments:String.fromCodePoint(0x1F4B3),homework:String.fromCodePoint(0x1F4DA),announcements:String.fromCodePoint(0x1F4E2),activity:String.fromCodePoint(0x26A1),profile:String.fromCodePoint(0x1F464),settings:String.fromCodePoint(0x2699),directory:String.fromCodePoint(0x1F465),extra:String.fromCodePoint(0x2728),quiz:String.fromCodePoint(0x1F9E0),call:String.fromCodePoint(0x260E),teachers:String.fromCodePoint(0x1F393),timetable:String.fromCodePoint(0x1F4CB)} as Record<string,string>)[item.icon] || String.fromCodePoint(0x2728)}</span>
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













