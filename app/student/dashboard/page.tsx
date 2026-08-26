"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type DashboardCard = {
  icon: string;
  title: string;
  description: string;
  path: string;
  className: string;
};

export default function StudentDashboardPage() {
  const router = useRouter();

  const [studentName, setStudentName] = useState("Student");
  const [username, setUsername] = useState("");
  const [time, setTime] = useState("");

  useEffect(() => {
    const name =
      localStorage.getItem("studentName") ||
      localStorage.getItem("student_name") ||
      "Student";

    const savedUsername =
      localStorage.getItem("student_username") ||
      localStorage.getItem("studentUsername") ||
      "";

    setStudentName(name);
    setUsername(savedUsername);

    updateTime();

    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  function updateTime() {
    setTime(
      new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
  }

  function logout() {
    localStorage.removeItem("studentLoggedIn");
    localStorage.removeItem("student_username");
    localStorage.removeItem("studentUsername");
    localStorage.removeItem("studentName");
    localStorage.removeItem("student_name");

    sessionStorage.clear();

    router.push("/");
  }

  const firstLetter = studentName.charAt(0).toUpperCase();

  const cards: DashboardCard[] = [
    {
      icon: "📊",
      title: "My Attendance",
      description: "View your current attendance and attendance percentage.",
      path: "/student/attendance",
      className: "blue",
    },
    {
      icon: "📜",
      title: "Attendance History",
      description: "Check your previous attendance records and details.",
      path: "/student/attendance-history",
      className: "purple",
    },
    {
      icon: "📅",
      title: "Academic Calendar",
      description: "View important academic dates and calendar information.",
      path: "/student/calendar",
      className: "green",
    },
    {
      icon: "📈",
      title: "Reports",
      description: "View your attendance reports and performance details.",
      path: "/student/reports",
      className: "orange",
    },
    {
      icon: "💰",
      title: "Fees",
      description: "Check your student fee information and payment details.",
      path: "/student/fees",
      className: "pink",
    },
    {
      icon: "⚙️",
      title: "Settings",
      description: "Manage your account, name and password.",
      path: "/student/settings",
      className: "cyan",
    },
  ];

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* TOP NAVIGATION */}
        <nav style={styles.navbar}>

          <div style={styles.brandArea}>
            <div style={styles.brandIcon}>
              🎓
            </div>

            <div>
              <div style={styles.brandName}>
                ATTENDANCE PORTAL
              </div>

              <div style={styles.brandSub}>
                STUDENT CENTER
              </div>
            </div>
          </div>

          <div style={styles.navRight}>

            <div style={styles.clock}>
              🕒 {time}
            </div>

            <button
              onClick={logout}
              style={styles.logoutButton}
            >
              Logout
            </button>

          </div>

        </nav>

        {/* HERO */}
        <section style={styles.hero}>

          <div style={styles.heroGlowOne} />
          <div style={styles.heroGlowTwo} />

          <div style={styles.heroContent}>

            <div style={styles.avatar}>
              {firstLetter}
            </div>

            <div style={styles.welcomeArea}>

              <div style={styles.smallGreeting}>
                STUDENT DASHBOARD
              </div>

              <h1 style={styles.welcomeTitle}>
                Welcome, {studentName}
              </h1>

              <p style={styles.welcomeText}>
                Manage your attendance, academic information,
                reports, fees and account settings from one place.
              </p>

              {username && (
                <div style={styles.usernameBadge}>
                  Username: {username}
                </div>
              )}

            </div>

          </div>

          <div style={styles.heroSide}>

            <div style={styles.statusDot} />

            <div>
              <div style={styles.onlineText}>
                ACCOUNT ACTIVE
              </div>

              <div style={styles.onlineSub}>
                Student Portal
              </div>
            </div>

          </div>

        </section>

        {/* NOTICE */}
        <section style={styles.notice}>

          <div style={styles.noticeIcon}>
            ℹ️
          </div>

          <div>
            <div style={styles.noticeTitle}>
              Student Information Center
            </div>

            <p style={styles.noticeText}>
              Use the options below to check your attendance,
              academic calendar, reports, fees and account settings.
            </p>
          </div>

        </section>

        {/* SERVICES */}
        <section>

          <div style={styles.sectionHeading}>

            <div>
              <div style={styles.sectionEyebrow}>
                STUDENT SERVICES
              </div>

              <h2 style={styles.sectionTitle}>
                Your Dashboard
              </h2>
            </div>

            <div style={styles.serviceCount}>
              {cards.length} OPTIONS
            </div>

          </div>

          <div style={styles.cardGrid}>

            {cards.map((card) => (
              <button
                key={card.path}
                type="button"
                onClick={() => router.push(card.path)}
                style={styles.serviceCard}
              >

                <div
                  style={{
                    ...styles.cardTop,
                    ...(styles[
                      `card${card.className
                        .charAt(0)
                        .toUpperCase()}${card.className.slice(1)}`
                    ] || {}),
                  }}
                >

                  <div style={styles.cardIcon}>
                    {card.icon}
                  </div>

                  <div style={styles.arrow}>
                    →
                  </div>

                </div>

                <div style={styles.cardBody}>

                  <h3 style={styles.cardTitle}>
                    {card.title}
                  </h3>

                  <p style={styles.cardDescription}>
                    {card.description}
                  </p>

                  <div style={styles.openLink}>
                    <span>Open</span>
                    <span>→</span>
                  </div>

                </div>

              </button>
            ))}

          </div>

        </section>

        {/* PROFILE PANEL */}
        <section style={styles.bottomPanel}>

          <div style={styles.bottomIcon}>
            👤
          </div>

          <div style={styles.bottomText}>

            <h3 style={styles.bottomTitle}>
              Keep your profile updated
            </h3>

            <p style={styles.bottomDescription}>
              Your personal information is managed through
              your student profile.
            </p>

          </div>

          <button
            type="button"
            onClick={() => router.push("/student/profile")}
            style={styles.profileButton}
          >
            View Profile →
          </button>

        </section>

        {/* FOOTER */}
        <footer style={styles.footer}>

          <div style={styles.footerBrand}>
            🎓 Attendance Portal
          </div>

          <div>
            Student Portal • 2026
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
      "linear-gradient(135deg,#f8fafc 0%,#eef2ff 50%,#f0f9ff 100%)",
    padding: "18px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#0f172a",
  },

  container: {
    width: "100%",
    maxWidth: "1250px",
    margin: "0 auto",
  },

  navbar: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "14px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "18px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.06)",
    flexWrap: "wrap",
  },

  brandArea: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
  },

  brandIcon: {
    width: "45px",
    height: "45px",
    borderRadius: "13px",
    background:
      "linear-gradient(135deg,#2563eb,#7c3aed)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
  },

  brandName: {
    fontSize: "13px",
    fontWeight: "1000",
    letterSpacing: "1px",
    color: "#172554",
  },

  brandSub: {
    marginTop: "3px",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "2px",
    color: "#64748b",
  },

  navRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },

  clock: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    padding: "9px 12px",
    borderRadius: "9px",
    color: "#475569",
    fontSize: "11px",
    fontWeight: "800",
  },

  logoutButton: {
    border: "none",
    background: "#0f172a",
    color: "#ffffff",
    padding: "10px 15px",
    borderRadius: "9px",
    fontWeight: "900",
    cursor: "pointer",
  },

  hero: {
    position: "relative",
    overflow: "hidden",
    background:
      "linear-gradient(135deg,#172554,#2563eb,#4f46e5)",
    borderRadius: "25px",
    padding: "34px",
    minHeight: "220px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "25px",
    marginBottom: "18px",
    boxShadow:
      "0 18px 45px rgba(37,99,235,0.22)",
    boxSizing: "border-box",
  },

  heroGlowOne: {
    position: "absolute",
    width: "230px",
    height: "230px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.08)",
    right: "120px",
    top: "-100px",
  },

  heroGlowTwo: {
    position: "absolute",
    width: "180px",
    height: "180px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.06)",
    right: "-40px",
    bottom: "-90px",
  },

  heroContent: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    alignItems: "center",
    gap: "20px",
    minWidth: 0,
  },

  avatar: {
    width: "88px",
    height: "88px",
    minWidth: "88px",
    borderRadius: "24px",
    background: "#ffffff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "38px",
    fontWeight: "1000",
    boxShadow:
      "0 12px 30px rgba(0,0,0,0.18)",
  },

  welcomeArea: {
    minWidth: 0,
  },

  smallGreeting: {
    color: "#bfdbfe",
    fontSize: "10px",
    fontWeight: "1000",
    letterSpacing: "2px",
    marginBottom: "8px",
  },

  welcomeTitle: {
    margin: 0,
    color: "#ffffff",
    fontSize: "30px",
    lineHeight: 1.2,
    fontWeight: "1000",
    wordBreak: "break-word",
  },

  welcomeText: {
    margin: "9px 0 0",
    color: "#dbeafe",
    fontSize: "13px",
    fontWeight: "600",
    lineHeight: 1.6,
    maxWidth: "600px",
  },

  usernameBadge: {
    display: "inline-block",
    marginTop: "13px",
    padding: "7px 11px",
    borderRadius: "8px",
    background: "rgba(255,255,255,0.13)",
    border:
      "1px solid rgba(255,255,255,0.22)",
    color: "#ffffff",
    fontSize: "11px",
    fontWeight: "900",
  },

  heroSide: {
    position: "relative",
    zIndex: 2,
    background: "rgba(255,255,255,0.12)",
    border:
      "1px solid rgba(255,255,255,0.2)",
    borderRadius: "14px",
    padding: "13px 15px",
    display: "flex",
    alignItems: "center",
    gap: "9px",
    minWidth: "155px",
  },

  statusDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#4ade80",
    boxShadow:
      "0 0 0 5px rgba(74,222,128,0.15)",
  },

  onlineText: {
    color: "#ffffff",
    fontSize: "10px",
    fontWeight: "1000",
    letterSpacing: "1px",
  },

  onlineSub: {
    marginTop: "3px",
    color: "#bfdbfe",
    fontSize: "10px",
    fontWeight: "700",
  },

  notice: {
    background: "#ffffff",
    border: "1px solid #dbeafe",
    borderRadius: "17px",
    padding: "15px 18px",
    display: "flex",
    alignItems: "center",
    gap: "13px",
    marginBottom: "25px",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.05)",
  },

  noticeIcon: {
    width: "40px",
    height: "40px",
    minWidth: "40px",
    borderRadius: "11px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "19px",
  },

  noticeTitle: {
    color: "#172554",
    fontSize: "13px",
    fontWeight: "900",
  },

  noticeText: {
    margin: "3px 0 0",
    color: "#64748b",
    fontSize: "11px",
    lineHeight: 1.5,
    fontWeight: "600",
  },

  sectionHeading: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "15px",
    marginBottom: "15px",
  },

  sectionEyebrow: {
    color: "#2563eb",
    fontSize: "9px",
    fontWeight: "1000",
    letterSpacing: "2px",
    marginBottom: "3px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "1000",
    color: "#172554",
  },

  serviceCount: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    color: "#64748b",
    padding: "8px 11px",
    borderRadius: "9px",
    fontSize: "10px",
    fontWeight: "900",
  },

  cardGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3,minmax(0,1fr))",
    gap: "15px",
  },

  serviceCard: {
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    borderRadius: "19px",
    overflow: "hidden",
    padding: 0,
    textAlign: "left",
    cursor: "pointer",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.05)",
  },

  cardTop: {
    padding: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  cardBlue: {
    background:
      "linear-gradient(135deg,#dbeafe,#bfdbfe)",
  },

  cardPurple: {
    background:
      "linear-gradient(135deg,#ede9fe,#ddd6fe)",
  },

  cardGreen: {
    background:
      "linear-gradient(135deg,#dcfce7,#bbf7d0)",
  },

  cardOrange: {
    background:
      "linear-gradient(135deg,#ffedd5,#fed7aa)",
  },

  cardPink: {
    background:
      "linear-gradient(135deg,#fce7f3,#fbcfe8)",
  },

  cardCyan: {
    background:
      "linear-gradient(135deg,#cffafe,#a5f3fc)",
  },

  cardIcon: {
    width: "47px",
    height: "47px",
    borderRadius: "14px",
    background: "rgba(255,255,255,0.72)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
  },

  arrow: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.65)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#172554",
    fontWeight: "1000",
  },

  cardBody: {
    padding: "17px",
  },

  cardTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "17px",
    fontWeight: "1000",
  },

  cardDescription: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: "11px",
    lineHeight: 1.6,
    minHeight: "36px",
    fontWeight: "600",
  },

  openLink: {
    marginTop: "13px",
    color: "#2563eb",
    fontSize: "11px",
    fontWeight: "1000",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  bottomPanel: {
    marginTop: "20px",
    background:
      "linear-gradient(135deg,#ffffff,#f8fafc)",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "17px",
    display: "flex",
    alignItems: "center",
    gap: "13px",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.05)",
    flexWrap: "wrap",
  },

  bottomIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "13px",
    background: "#eef2ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
  },

  bottomText: {
    flex: 1,
    minWidth: "200px",
  },

  bottomTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "14px",
    fontWeight: "1000",
  },

  bottomDescription: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "600",
  },

  profileButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "10px 15px",
    borderRadius: "9px",
    fontWeight: "900",
    cursor: "pointer",
  },

  footer: {
    marginTop: "25px",
    padding: "18px 5px",
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    color: "#94a3b8",
    fontSize: "10px",
    fontWeight: "700",
    flexWrap: "wrap",
  },

  footerBrand: {
    color: "#475569",
    fontWeight: "900",
  },
};