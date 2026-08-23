"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type MenuItem = {
  icon: string;
  title: string;
  description: string;
  path: string;
};

const menuItems: MenuItem[] = [
  {
    icon: "📝",
    title: "Mark Attendance",
    description: "Mark today's student attendance",
    path: "/dashboard",
  },
  {
    icon: "📅",
    title: "Attendance History",
    description: "View previous attendance records",
    path: "/teacher/attendance-history",
  },
  {
    icon: "💰",
    title: "Fees Management",
    description: "Manage paid, pending and refunded fees",
    path: "/teacher/fees",
  },
  {
    icon: "👨‍🎓",
    title: "Students",
    description: "View and manage all students",
    path: "/teacher/students",
  },
  {
    icon: "🗓️",
    title: "Calendar",
    description: "View classes and important dates",
    path: "/academic-calendar",
  },
  {
    icon: "📊",
    title: "Reports",
    description: "View attendance and fee reports",
    path: "/teacher/reports",
  },
  {
    icon: "⚙️",
    title: "Settings",
    description: "Manage teacher dashboard settings",
    path: "/teacher/settings",
  },
];

export default function TeacherDashboard() {
  const router = useRouter();

  const [teacherName, setTeacherName] = useState("Teacher");
  const [time, setTime] = useState("");

  useEffect(() => {
    const savedName =
      localStorage.getItem("teacherName") ||
      localStorage.getItem("teacher_name");

    if (savedName) {
      setTeacherName(savedName);
    }

    const updateTime = () => {
      setTime(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };

    updateTime();

    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  function logout() {
    localStorage.removeItem("teacherLoggedIn");
    localStorage.removeItem("teacherName");
    localStorage.removeItem("teacher_name");
    localStorage.removeItem("teacher_username");

    sessionStorage.clear();

    router.push("/");
  }

  function openPage(path: string) {
    router.push(path);
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* NAVBAR */}
        <header style={styles.navbar}>
          <div style={styles.brandArea}>
            <div style={styles.logo}>🎓</div>

            <div>
              <h1 style={styles.brandTitle}>
                Attendance Portal
              </h1>

              <p style={styles.brandSubtitle}>
                Teacher Control Center
              </p>
            </div>
          </div>

          <div style={styles.navRight}>
            <div style={styles.clock}>
              🕐 {time}
            </div>

            <button
              onClick={logout}
              style={styles.logoutButton}
            >
              🚪 Logout
            </button>
          </div>
        </header>

        {/* HERO */}
        <section style={styles.hero}>
          <div>
            <div style={styles.welcomeSmall}>
              TEACHER PORTAL
            </div>

            <h2 style={styles.heroTitle}>
              Welcome back, {teacherName} 👋
            </h2>

            <p style={styles.heroText}>
              Manage attendance, fees, students,
              reports and your complete class activity
              from one place.
            </p>
          </div>

          <div style={styles.heroIcon}>
            👨‍🏫
          </div>
        </section>

        {/* QUICK STATS */}
        <section style={styles.statsGrid}>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>👨‍🎓</div>

            <div>
              <p style={styles.statLabel}>
                Students
              </p>

              <h3 style={styles.statValue}>
                12
              </h3>

              <p style={styles.statDescription}>
                Registered students
              </p>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>📝</div>

            <div>
              <p style={styles.statLabel}>
                Attendance
              </p>

              <h3 style={styles.statValue}>
                Today
              </h3>

              <p style={styles.statDescription}>
                Mark today's attendance
              </p>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>💰</div>

            <div>
              <p style={styles.statLabel}>
                Monthly Fee
              </p>

              <h3 style={styles.statValue}>
                ₹200
              </h3>

              <p style={styles.statDescription}>
                Per student
              </p>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>📊</div>

            <div>
              <p style={styles.statLabel}>
                Reports
              </p>

              <h3 style={styles.statValue}>
                View
              </h3>

              <p style={styles.statDescription}>
                Attendance & fees
              </p>
            </div>
          </div>

        </section>

        {/* MAIN MENU */}
        <section>

          <div style={styles.sectionHeading}>
            <h2 style={styles.sectionTitle}>
              Teacher Control Center
            </h2>

            <p style={styles.sectionSubtitle}>
              Choose what you want to manage
            </p>
          </div>

          <div style={styles.menuGrid}>

            {menuItems.map((item) => (
              <button
                key={item.title}
                onClick={() => openPage(item.path)}
                style={styles.menuCard}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform =
                    "translateY(-5px)";

                  e.currentTarget.style.boxShadow =
                    "0 18px 35px rgba(15,23,42,0.14)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform =
                    "translateY(0)";

                  e.currentTarget.style.boxShadow =
                    "0 8px 25px rgba(15,23,42,0.07)";
                }}
              >
                <div style={styles.menuIcon}>
                  {item.icon}
                </div>

                <div style={styles.menuContent}>
                  <h3 style={styles.menuTitle}>
                    {item.title}
                  </h3>

                  <p style={styles.menuDescription}>
                    {item.description}
                  </p>
                </div>

                <div style={styles.arrow}>
                  →
                </div>
              </button>
            ))}

          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section style={styles.quickSection}>

          <h2 style={styles.sectionTitle}>
            ⚡ Quick Actions
          </h2>

          <p style={styles.sectionSubtitle}>
            Frequently used teacher actions
          </p>

          <div style={styles.quickGrid}>

            <button
              onClick={() =>
                router.push("/dashboard")
              }
              style={styles.quickButton}
            >
              <span>📝</span>
              <span>
                Mark Attendance
              </span>
            </button>

            <button
              onClick={() =>
                router.push("/teacher/fees")
              }
              style={styles.quickButton}
            >
              <span>💰</span>
              <span>
                Manage Fees
              </span>
            </button>

            <button
              onClick={() =>
                router.push(
                  "/teacher/attendance-history"
                )
              }
              style={styles.quickButton}
            >
              <span>📅</span>
              <span>
                Attendance History
              </span>
            </button>

          </div>
        </section>

        {/* INFORMATION */}
        <section style={styles.infoCard}>

          <div style={styles.infoIcon}>
            💡
          </div>

          <div>
            <h3 style={styles.infoTitle}>
              Teacher Dashboard
            </h3>

            <p style={styles.infoText}>
              This is your central control panel.
              From here you can manage attendance,
              fees, students, attendance history,
              calendar, reports and settings.
            </p>
          </div>

        </section>

        {/* FOOTER */}
        <footer style={styles.footer}>
          <strong>
            Attendance Portal
          </strong>

          <span>
            Teacher Control Center • 2026
          </span>
        </footer>

      </div>
    </main>
  );
}

const styles: {
  [key: string]: React.CSSProperties;
} = {

  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#eef2ff,#f8fafc,#eff6ff)",
    padding: "20px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#172554",
  },

  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
  },

  navbar: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
    marginBottom: "20px",
    flexWrap: "wrap",
  },

  brandArea: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
  },

  logo: {
    width: "52px",
    height: "52px",
    borderRadius: "15px",
    background:
      "linear-gradient(135deg,#2563eb,#7c3aed)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "27px",
  },

  brandTitle: {
    margin: 0,
    fontSize: "20px",
    color: "#172554",
    fontWeight: "800",
  },

  brandSubtitle: {
    margin: "4px 0 0",
    color: "#475569",
    fontSize: "12px",
    fontWeight: "600",
  },

  navRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  clock: {
    background: "#f1f5f9",
    color: "#334155",
    padding: "10px 14px",
    borderRadius: "10px",
    fontWeight: "700",
    fontSize: "13px",
  },

  logoutButton: {
    border: "none",
    background: "#dc2626",
    color: "white",
    padding: "11px 17px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },

  hero: {
    background:
      "linear-gradient(135deg,#1d4ed8,#4338ca,#7c3aed)",
    color: "white",
    borderRadius: "24px",
    padding: "35px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "20px",
    boxShadow:
      "0 15px 35px rgba(37,99,235,0.22)",
  },

  welcomeSmall: {
    fontSize: "12px",
    fontWeight: "800",
    letterSpacing: "2px",
    opacity: 0.9,
    marginBottom: "8px",
  },

  heroTitle: {
    margin: 0,
    fontSize: "32px",
    fontWeight: "800",
  },

  heroText: {
    margin: "12px 0 0",
    maxWidth: "650px",
    lineHeight: 1.6,
    opacity: 0.95,
    fontSize: "15px",
  },

  heroIcon: {
    width: "100px",
    height: "100px",
    borderRadius: "28px",
    background:
      "rgba(255,255,255,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "55px",
    flexShrink: 0,
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: "16px",
    marginBottom: "30px",
  },

  statCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
  },

  statIcon: {
    width: "55px",
    height: "55px",
    borderRadius: "15px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "27px",
    flexShrink: 0,
  },

  statLabel: {
    margin: 0,
    color: "#475569",
    fontSize: "12px",
    fontWeight: "700",
  },

  statValue: {
    margin: "3px 0",
    color: "#172554",
    fontSize: "23px",
    fontWeight: "800",
  },

  statDescription: {
    margin: 0,
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "600",
  },

  sectionHeading: {
    marginBottom: "15px",
  },

  sectionTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "23px",
    fontWeight: "800",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#475569",
    fontSize: "13px",
    fontWeight: "600",
  },

  menuGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(260px,1fr))",
    gap: "16px",
  },

  menuCard: {
    border: "none",
    background: "#ffffff",
    borderRadius: "18px",
    padding: "21px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    textAlign: "left",
    cursor: "pointer",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
    transition:
      "transform 0.2s ease, box-shadow 0.2s ease",
    color: "#172554",
  },

  menuIcon: {
    width: "58px",
    height: "58px",
    borderRadius: "16px",
    background: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "29px",
    flexShrink: 0,
  },

  menuContent: {
    flex: 1,
  },

  menuTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "17px",
    fontWeight: "800",
  },

  menuDescription: {
    margin: "5px 0 0",
    color: "#475569",
    fontSize: "12px",
    lineHeight: 1.4,
    fontWeight: "600",
  },

  arrow: {
    color: "#2563eb",
    fontSize: "24px",
    fontWeight: "800",
  },

  quickSection: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "25px",
    marginTop: "30px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
  },

  quickGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(200px,1fr))",
    gap: "12px",
    marginTop: "18px",
  },

  quickButton: {
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    color: "#1e3a8a",
    fontWeight: "700",
    cursor: "pointer",
    fontSize: "14px",
  },

  infoCard: {
    marginTop: "20px",
    background:
      "linear-gradient(135deg,#eff6ff,#eef2ff)",
    border: "1px solid #bfdbfe",
    borderRadius: "18px",
    padding: "22px",
    display: "flex",
    gap: "15px",
    alignItems: "flex-start",
  },

  infoIcon: {
    fontSize: "28px",
  },

  infoTitle: {
    margin: 0,
    color: "#1e3a8a",
    fontSize: "17px",
    fontWeight: "800",
  },

  infoText: {
    margin: "7px 0 0",
    color: "#334155",
    fontSize: "13px",
    lineHeight: 1.6,
    fontWeight: "600",
  },

  footer: {
    padding: "28px 10px 10px",
    textAlign: "center",
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    flexWrap: "wrap",
    color: "#475569",
    fontSize: "12px",
  },
};