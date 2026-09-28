"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import RacerPageActions from "../../components/RacerPageActions"; import { supabase } from "../../lib/supabase";

const items = [
  { href: "/student/dashboard", label: "Home", icon: "\u2302" },
  { href: "/student/calendar", label: "Calendar", icon: "\u25A6" },
  { href: "/student/announcements", label: "Notice", icon: "\u2605" },
  { href: "/student/profile", label: "Profile", icon: "\u25C9" },
];

export default function StudentLayout({ children }: { children: ReactNode }) {
  const [headerName, setHeaderName] = useState("Student");
  const [headerTime, setHeaderTime] = useState(""); const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    const savedName = localStorage.getItem("studentName") || localStorage.getItem("student_name") || "Student";
    const firstName = savedName.trim().split(/\s+/)[0] || "Student";
    setHeaderName(firstName); (async()=>{try{const username=localStorage.getItem("studentUsername")||localStorage.getItem("student_username")||localStorage.getItem("attendance_student_id")||localStorage.getItem("studentId")||""; if(username){const {data}=await supabase.from("students").select("profile_image_url").or(`student_username.eq.${username},id.eq.${username}`).limit(1).maybeSingle(); setProfileImage(typeof data?.profile_image_url==="string"&&data.profile_image_url.trim()?data.profile_image_url.trim():null);}}catch{setProfileImage(null);}})();
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
        <header className="racer-mobile-appbar" style={{position:"fixed",top:0,left:0,right:0,zIndex:9999,width:"100%"}}>
          <Link href="/student/dashboard" className="racer-appbar-brand">
            <span className="racer-appbar-logo" style={{overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>{profileImage ? <img src={profileImage} alt="Profile" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}} onError={()=>setProfileImage(null)} /> : <img src="/racer-academy-icon.png" alt="RACER ACADEMY" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}} />}</span>
            <span>
              <strong>RACER ACADEMY</strong>
              <small style={{color:"#000000",fontWeight:700}}>{headerTime} • Hello, {headerName}</small>
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

      <div className="racer-portal-content" style={{paddingTop:isDashboard ? "0px" : "72px"}}>{children}</div>

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









