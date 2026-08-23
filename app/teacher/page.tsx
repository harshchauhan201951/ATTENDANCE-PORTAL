"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type MenuItem = {
  icon: string;
  title: string;
  description: string;
  path?: string;
  action?: () => void;
};

export default function TeacherDashboard() {
  const router = useRouter();

  const [teacherName, setTeacherName] = useState("Teacher");
  const [time, setTime] = useState("");

  useEffect(() => {
    const savedName =
      localStorage.getItem("teacherName") ||
      localStorage.getItem("teacher_name") ||
      sessionStorage.getItem("teacherName") ||
      sessionStorage.getItem("teacher_name");

    if (savedName) {
      setTeacherName(savedName);
    }

    const updateTime = () => {
      const now = new Date();

      setTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
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

    sessionStorage.removeItem("teacherLoggedIn");
    sessionStorage.removeItem("teacherName");
    sessionStorage.removeItem("teacher_name");

    router.push("/");
  }

  const menuItems: MenuItem[] = [
    {
      icon: "📝",
      title: "Mark Attendance",
      description: "Mark today's student attendance",
      path: "/dashboard",
    },
    {
      icon: "📜",
      title: "Attendance History",
      description: "View previous attendance records",
      action: () =>
        alert("Attendance History section will be added here."),
    },
    {
      icon: "🗓️",
      title: "Attendance Calendar",
      description: "View attendance month by month",
      action: () =>
        alert("Attendance Calendar section will be added here."),
    },
    {
      icon: "💰",
      title: "Fees Management",
      description: "Manage pending, submitted and refunded fees",
      path: "/teacher/fees",
    },
    {
      icon: "👨‍🎓",
      title: "Students",
      description: "View and manage all students",
      action: () =>
        alert("Student Management section will be added here."),
    },
    {
      icon: "📊",
      title: "Reports",
      description: "Attendance and fees reports",
      action: () =>
        alert("Reports section will be added here."),
    },
    {
      icon: "📅",
      title: "Academic Calendar",
      description: "Manage important academic dates",
      action: () =>
        alert("Academic Calendar section will be added here."),
    },
    {
      icon: "⚙️",
      title: "Settings",
      description: "Manage teacher and portal settings",
      action: () =>
        alert("Settings section will be added here."),
    },
  ];

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* TOP HEADER */}
        <header style={styles.header}>

          <div style={styles.headerLeft}>
            <div style={styles.logo}>
              👨‍🏫
            </div>

            <div>
              <p style={styles.smallLabel}>
                ATTENDANCE PORTAL
              </p>

              <h1 style={styles.heading}>
                Teacher Dashboard
              </h1>

              <p style={styles.subHeading}>
                Manage your complete classroom from one place
              </p>
            </div>
          </div>

          <div style={styles.headerRight}>

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

        {/* WELCOME CARD */}
        <section style={styles.welcomeCard}>

          <div>
            <p style={styles.welcomeSmall}>
              GOOD DAY 👋
            </p>

            <h2 style={styles.welcomeTitle}>
              Welcome, {teacherName}
            </h2>

            <p style={styles.welcomeText}>
              Everything you need to manage attendance,
              students and fees is available below.
            </p>
          </div>

          <div style={styles.welcomeIcon}>
            🎓
          </div>

        </section>

        {/* QUICK STATS */}
        <section style={styles.statsGrid}>

          <div style={styles.statCard}>
            <div style={styles.statIconBlue}>
              👨‍🎓
            </div>

            <div>
              <p style={styles.statLabel}>
                TOTAL STUDENTS
              </p>

              <h2 style={styles.statNumber}>
                12
              </h2>

              <p style={styles.statDescription}>
                Students registered
              </p>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIconGreen}>
              ✅
            </div>

            <div>
              <p style={styles.statLabel}>
                ATTENDANCE
              </p>

              <h2 style={styles.statNumber}>
                Today
              </h2>

              <p style={styles.statDescription}>
                Mark today's attendance
              </p>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIconOrange}>
              💰
            </div>

            <div>
              <p style={styles.statLabel}>
                MONTHLY FEES
              </p>

              <h2 style={styles.statNumber}>
                ₹200
              </h2>

              <p style={styles.statDescription}>
                Per student / month
              </p>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIconPurple}>
              📊
            </div>

            <div>
              <p style={styles.statLabel}>
                MANAGEMENT
              </p>

              <h2 style={styles.statNumber}>
                8
              </h2>

              <p style={styles.statDescription}>
                Available sections
              </p>
            </div>
          </div>

        </section>

        {/* MAIN MENU */}
        <section style={styles.section}>

          <div style={styles.sectionHeading}>
            <div>
              <p style={styles.sectionLabel}>
                CONTROL CENTER
              </p>

              <h2 style={styles.sectionTitle}>
                Manage Your Portal
              </h2>

              <p style={styles.sectionDescription}>
                Select an option to continue.
              </p>
            </div>
          </div>

          <div style={styles.menuGrid}>

            {menuItems.map((item) => (
              <button
                key={item.title}
                onClick={() => {
                  if (item.path) {
                    router.push(item.path);
                    return;
                  }

                  if (item.action) {
                    item.action();
                  }
                }}
                style={styles.menuCard}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform =
                    "translateY(-5px)";
                  e.currentTarget.style.boxShadow =
                    "0 18px 35px rgba(15,23,42,0.13)";
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

        {/* TODAY'S WORK */}
        <section style={styles.todayCard}>

          <div>
            <p style={styles.sectionLabel}>
              TODAY
            </p>

            <h2 style={styles.todayTitle}>
              Teacher's Quick Actions
            </h2>

            <p style={styles.todayText}>
              Start with attendance or manage student fees.
            </p>
          </div>

          <div style={styles.quickActions}>

            <button
              onClick={() => router.push("/dashboard")}
              style={styles.primaryButton}
            >
              📝 Mark Attendance
            </button>

            <button
              onClick={() => router.push("/teacher/fees")}
              style={styles.secondaryButton}
            >
              💰 Manage Fees
            </button>

          </div>

        </section>

        {/* FOOTER */}
        <footer style={styles.footer}>

          <div>
            <strong>
              Attendance Portal
            </strong>

            <span style={styles.footerDot}>
              •
            </span>

            Teacher Management System
          </div>

          <div>
            © 2026
          </div>

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
      "linear-gradient(135deg,#eef2ff 0%,#f8fafc 45%,#eff6ff 100%)",
    padding: "20px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#0f172a",
  },

  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
  },

  header: {
    background: "white",
    borderRadius: "22px",
    padding: "22px 25px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    boxShadow:
      "0 10px 35px rgba(15,23,42,0.08)",
    marginBottom: "20px",
    flexWrap: "wrap",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },

  logo: {
    width: "65px",
    height: "65px",
    borderRadius: "18px",
    background:
      "linear-gradient(135deg,#2563eb,#4f46e5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "32px",
    boxShadow:
      "0 8px 20px rgba(37,99,235,0.25)",
    flexShrink: 0,
  },

  smallLabel: {
    margin: 0,
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "2px",
    color: "#2563eb",
  },

  heading: {
    margin: "3px 0 3px",
    fontSize: "28px",
    fontWeight: "800",
    color: "#172554",
  },

  subHeading: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  clock: {
    background: "#f1f5f9",
    padding: "11px 15px",
    borderRadius: "10px",
    fontWeight: "700",
    color: "#334155",
    fontSize: "14px",
  },

  logoutButton: {
    border: "none",
    background: "#dc2626",
    color: "white",
    padding: "11px 17px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
    fontSize: "14px",
  },

  welcomeCard: {
    background:
      "linear-gradient(135deg,#1e3a8a,#4338ca)",
    color: "white",
    borderRadius: "22px",
    padding: "30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    boxShadow:
      "0 15px 35px rgba(30,58,138,0.22)",
    marginBottom: "20px",
  },

  welcomeSmall: {
    margin: 0,
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "2px",
    opacity: 0.8,
  },

  welcomeTitle: {
    margin: "8px 0 8px",
    fontSize: "30px",
    fontWeight: "800",
  },

  welcomeText: {
    margin: 0,
    fontSize: "14px",
    opacity: 0.85,
    maxWidth: "650px",
    lineHeight: 1.6,
  },

  welcomeIcon: {
    width: "85px",
    height: "85px",
    borderRadius: "25px",
    background: "rgba(255,255,255,0.13)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "43px",
    flexShrink: 0,
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: "16px",
    marginBottom: "25px",
  },

  statCard: {
    background: "white",
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
  },

  statIconBlue: {
    width: "52px",
    height: "52px",
    borderRadius: "14px",
    background: "#dbeafe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "25px",
    flexShrink: 0,
  },

  statIconGreen: {
    width: "52px",
    height: "52px",
    borderRadius: "14px",
    background: "#dcfce7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "25px",
    flexShrink: 0,
  },

  statIconOrange: {
    width: "52px",
    height: "52px",
    borderRadius: "14px",
    background: "#ffedd5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "25px",
    flexShrink: 0,
  },

  statIconPurple: {
    width: "52px",
    height: "52px",
    borderRadius: "14px",
    background: "#ede9fe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "25px",
    flexShrink: 0,
  },

  statLabel: {
    margin: 0,
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "800",
    letterSpacing: "1px",
  },

  statNumber: {
    margin: "3px 0",
    color: "#172554",
    fontSize: "23px",
    fontWeight: "800",
  },

  statDescription: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "11px",
  },

  section: {
    background: "white",
    borderRadius: "22px",
    padding: "28px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
    marginBottom: "20px",
  },

  sectionHeading: {
    marginBottom: "22px",
  },

  sectionLabel: {
    margin: 0,
    color: "#2563eb",
    fontSize: "10px",
    fontWeight: "800",
    letterSpacing: "2px",
  },

  sectionTitle: {
    margin: "5px 0 4px",
    color: "#172554",
    fontSize: "24px",
    fontWeight: "800",
  },

  sectionDescription: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
  },

  menuGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(260px,1fr))",
    gap: "15px",
  },

  menuCard: {
    width: "100%",
    minHeight: "125px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    borderRadius: "17px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    textAlign: "left",
    gap: "15px",
    cursor: "pointer",
    transition:
      "transform 0.2s ease, box-shadow 0.2s ease",
    boxSizing: "border-box",
  },

  menuIcon: {
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
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "12px",
    lineHeight: 1.5,
  },

  arrow: {
    color: "#2563eb",
    fontSize: "23px",
    fontWeight: "800",
  },

  todayCard: {
    background: "white",
    borderRadius: "22px",
    padding: "25px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    flexWrap: "wrap",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
    marginBottom: "20px",
  },

  todayTitle: {
    margin: "5px 0",
    color: "#172554",
    fontSize: "21px",
  },

  todayText: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
  },

  quickActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  primaryButton: {
    border: "none",
    background:
      "linear-gradient(135deg,#2563eb,#4f46e5)",
    color: "white",
    padding: "13px 18px",
    borderRadius: "11px",
    fontWeight: "700",
    cursor: "pointer",
    fontSize: "13px",
  },

  secondaryButton: {
    border: "none",
    background: "#fef3c7",
    color: "#92400e",
    padding: "13px 18px",
    borderRadius: "11px",
    fontWeight: "700",
    cursor: "pointer",
    fontSize: "13px",
  },

  footer: {
    display: "flex",
    justifyContent: "space-between",
    gap: "15px",
    padding: "20px 5px",
    color: "#64748b",
    fontSize: "12px",
    flexWrap: "wrap",
  },

  footerDot: {
    margin: "0 8px",
  },
};