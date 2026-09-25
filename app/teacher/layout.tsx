"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import RacerPageActions from "../../components/RacerPageActions";

const items = [
  { href: "/teacher/dashboard", label: "Home", icon: "H" },
  { href: "/teacher/attendance", label: "Attendance", icon: "OK" },
  { href: "/teacher/students", label: "Students", icon: "S" },
  { href: "/teacher/profile", label: "Profile", icon: "P" },
];

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
    return () => clearInterval(timer);
  }, []);
  const pathname = usePathname();
  const isDashboard = pathname === "/teacher/dashboard";

  return (
    <div className="racer-portal-shell racer-teacher-shell">
      {!isDashboard && (
        <header className="racer-mobile-appbar" style={{position:"fixed",top:0,left:0,right:0,zIndex:9999,width:"100%"}}>
          <Link href="/teacher/dashboard" className="racer-appbar-brand">
            <span className="racer-appbar-logo" style={{overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>{profileImage ? <img src={profileImage} alt="Profile" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}} onError={()=>setProfileImage(null)} /> : "RA"}</span>
            <span>
              <strong>RACER ACADEMY</strong>
              <small>Welcome, {headerName}</small>
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

      <div className="racer-portal-content" style={{paddingTop:"72px"}}>{children}</div>

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






