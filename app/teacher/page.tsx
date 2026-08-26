"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type MenuItem = {
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  accent: string;
};

const menuItems: MenuItem[] = [
  {
    title: "Mark Attendance",
    subtitle: "Mark today's student attendance",
    icon: "✓",
    route: "/teacher/attendance",
    accent: "attendance",
  },
  {
    title: "Attendance History",
    subtitle: "Check previous attendance records",
    icon: "◷",
    route: "/teacher/attendance-history",
    accent: "history",
  },
  {
    title: "Calendar",
    subtitle: "View academic and attendance calendar",
    icon: "▣",
    route: "/teacher/calendar",
    accent: "calendar",
  },
  {
    title: "Reports",
    subtitle: "View attendance reports",
    icon: "↗",
    route: "/teacher/reports",
    accent: "reports",
  },
  {
    title: "Fees",
    subtitle: "Manage student fee information",
    icon: "₹",
    route: "/teacher/fees",
    accent: "fees",
  },
  {
    title: "Settings",
    subtitle: "Manage teacher account settings",
    icon: "⚙",
    route: "/teacher/settings",
    accent: "settings",
  },
];

export default function TeacherControlCenter() {
  const router = useRouter();

  const [teacherName, setTeacherName] = useState("Teacher");
  const [checkingLogin, setCheckingLogin] = useState(true);
  const [activeCard, setActiveCard] = useState<string | null>(null);

  useEffect(() => {
    try {
      const possibleNames = [
        localStorage.getItem("teacherName"),
        localStorage.getItem("teacher_name"),
        localStorage.getItem("teacher"),
        sessionStorage.getItem("teacherName"),
        sessionStorage.getItem("teacher_name"),
      ];

      const savedName = possibleNames.find(
        (name) => name && name.trim().length > 0
      );

      if (savedName) {
        setTeacherName(savedName);
      }

      setCheckingLogin(false);
    } catch {
      setCheckingLogin(false);
    }
  }, []);

  const handleLogout = () => {
    try {
      localStorage.removeItem("teacherName");
      localStorage.removeItem("teacher_name");
      localStorage.removeItem("teacher");
      sessionStorage.removeItem("teacherName");
      sessionStorage.removeItem("teacher_name");
      sessionStorage.removeItem("teacher");
    } catch {
      // Ignore storage errors
    }

    router.push("/");
  };

  const openSection = (route: string) => {
    router.push(route);
  };

  if (checkingLogin) {
    return (
      <main className="loading-screen">
        <div className="loading-orbit">
          <div className="loading-dot" />
        </div>
        <p>Preparing Teacher Control Centre...</p>

        <style jsx>{`
          .loading-screen {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background:
              radial-gradient(
                circle at 20% 20%,
                rgba(99, 102, 241, 0.2),
                transparent 32%
              ),
              radial-gradient(
                circle at 80% 80%,
                rgba(14, 165, 233, 0.18),
                transparent 30%
              ),
              #070b17;
            color: white;
            font-family:
              Inter,
              ui-sans-serif,
              system-ui,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;
          }

          .loading-orbit {
            width: 58px;
            height: 58px;
            border: 2px solid rgba(255, 255, 255, 0.12);
            border-top-color: #818cf8;
            border-right-color: #38bdf8;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            display: grid;
            place-items: center;
            margin-bottom: 20px;
          }

          .loading-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: white;
            box-shadow: 0 0 20px rgba(129, 140, 248, 0.9);
          }

          .loading-screen p {
            color: #94a3b8;
            font-size: 14px;
            letter-spacing: 0.3px;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="teacher-page">
      <div className="background-grid" />
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <div className="app-shell">
        {/* TOP BAR */}
        <header className="topbar">
          <div className="brand-area">
            <div className="brand-mark">
              <span className="brand-mark-inner">T</span>
            </div>

            <div>
              <div className="brand-name">RACER ACADEMY</div>
              <div className="brand-subtitle">ACADEMIC MANAGEMENT SYSTEM</div>
            </div>
          </div>

          <div className="top-actions">
            <div className="live-status">
              <span className="live-dot" />
              <span>CONTROL CENTRE</span>
            </div>

            <button
              className="logout-button"
              onClick={handleLogout}
              type="button"
            >
              <span>↪</span>
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* HERO */}
        <section className="hero">
          <div className="hero-left">
            <div className="eyebrow">
              <span className="eyebrow-line" />
              TEACHER CONTROL CENTRE
            </div>

            <h1>
              Welcome back,
              <br />
              <span>{teacherName}</span>
              <b>👋</b>
            </h1>

            <p className="hero-description">
              Everything you need to manage your classroom, attendance,
              reports and academic activities — all from one place.
            </p>

            <div className="hero-meta">
              <div className="meta-pill">
                <span className="meta-icon">●</span>
                System Online
              </div>

              <div className="meta-pill">
                <span className="meta-icon">◆</span>
                Teacher Access
              </div>
            </div>
          </div>

          <div className="hero-right">
            <div className="control-orb">
              <div className="orb-ring ring-one" />
              <div className="orb-ring ring-two" />
              <div className="orb-core">
                <span>TC</span>
              </div>

              <div className="orb-label">
                <strong>CONTROL</strong>
                <small>CENTRE</small>
              </div>
            </div>
          </div>
        </section>

        {/* QUICK STATUS */}
        <section className="status-strip">
          <div className="status-item">
            <div className="status-symbol">01</div>
            <div>
              <span>ACCESS</span>
              <strong>TEACHER</strong>
            </div>
          </div>

          <div className="status-divider" />

          <div className="status-item">
            <div className="status-symbol">06</div>
            <div>
              <span>MODULES</span>
              <strong>AVAILABLE</strong>
            </div>
          </div>

          <div className="status-divider" />

          <div className="status-item">
            <div className="status-symbol pulse-symbol">●</div>
            <div>
              <span>PORTAL</span>
              <strong>ONLINE</strong>
            </div>
          </div>
        </section>

        {/* SECTION HEADING */}
        <section className="modules-heading">
          <div>
            <div className="section-kicker">YOUR WORKSPACE</div>
            <h2>Choose a module</h2>
          </div>

          <div className="section-caption">
            Select an option to continue
          </div>
        </section>

        {/* MODULE CARDS */}
        <section className="module-grid">
          {menuItems.map((item, index) => (
            <button
              key={item.title}
              type="button"
              className={`module-card ${activeCard === item.title ? "active" : ""}`}
              onMouseEnter={() => setActiveCard(item.title)}
              onMouseLeave={() => setActiveCard(null)}
              onClick={() => openSection(item.route)}
            >
              <div className="card-number">
                {String(index + 1).padStart(2, "0")}
              </div>

              <div className={`module-icon icon-${item.accent}`}>
                <span>{item.icon}</span>
              </div>

              <div className="module-content">
                <div className="module-title-row">
                  <h3>{item.title}</h3>

                  <span className="arrow">
                    →
                  </span>
                </div>

                <p>{item.subtitle}</p>

                <div className="open-label">
                  <span>OPEN MODULE</span>
                  <i />
                </div>
              </div>

              <div className={`card-glow glow-${item.accent}`} />
            </button>
          ))}
        </section>

        {/* FOOTER */}
        <footer className="footer">
          <div className="footer-brand">
            <span className="footer-logo">R</span>
            <span>Racer Academy</span>
          </div>

          <div className="footer-center">
            Teacher Management Portal
          </div>

          <div className="footer-right">
            Secure • Private • Connected
          </div>
        </footer>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .teacher-page {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          color: #f8fafc;
          background:
            radial-gradient(
              circle at 12% 10%,
              rgba(79, 70, 229, 0.16),
              transparent 28%
            ),
            radial-gradient(
              circle at 88% 30%,
              rgba(14, 165, 233, 0.12),
              transparent 28%
            ),
            linear-gradient(135deg, #060914 0%, #0b1020 48%, #070b16 100%);
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .background-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.24;
          background-image:
            linear-gradient(
              rgba(148, 163, 184, 0.04) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(148, 163, 184, 0.04) 1px,
              transparent 1px
            );
          background-size: 45px 45px;
          mask-image: linear-gradient(to bottom, black, transparent 90%);
        }

        .ambient {
          position: fixed;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          opacity: 0.15;
        }

        .ambient-one {
          background: #6366f1;
          top: 20%;
          left: -180px;
        }

        .ambient-two {
          background: #0ea5e9;
          right: -180px;
          bottom: 5%;
        }

        .app-shell {
          width: min(1380px, calc(100% - 42px));
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }

        /* TOPBAR */

        .topbar {
          height: 88px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        }

        .brand-area {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .brand-mark {
          width: 42px;
          height: 42px;
          border-radius: 13px;
          padding: 1px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #818cf8, #38bdf8);
          box-shadow:
            0 8px 30px rgba(99, 102, 241, 0.22),
            inset 0 0 20px rgba(255, 255, 255, 0.12);
        }

        .brand-mark-inner {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: #0b1020;
          font-size: 18px;
          font-weight: 900;
        }

        .brand-name {
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 1.6px;
        }

        .brand-subtitle {
          color: #64748b;
          font-size: 8px;
          letter-spacing: 1.5px;
          margin-top: 3px;
        }

        .top-actions {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .live-status {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #94a3b8;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.3px;
        }

        .live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 14px rgba(34, 197, 94, 0.8);
          animation: livePulse 1.8s ease-in-out infinite;
        }

        .logout-button {
          border: 1px solid rgba(148, 163, 184, 0.13);
          background: rgba(15, 23, 42, 0.62);
          color: #cbd5e1;
          border-radius: 11px;
          padding: 10px 15px;
          display: flex;
          gap: 7px;
          align-items: center;
          cursor: pointer;
          font-size: 12px;
          transition: 0.25s ease;
        }

        .logout-button:hover {
          border-color: rgba(248, 113, 113, 0.45);
          color: #fca5a5;
          transform: translateY(-2px);
        }

        /* HERO */

        .hero {
          min-height: 385px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 72px 30px 50px;
          position: relative;
        }

        .hero-left {
          max-width: 790px;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #818cf8;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 2.5px;
          margin-bottom: 20px;
        }

        .eyebrow-line {
          width: 30px;
          height: 1px;
          background: linear-gradient(90deg, #818cf8, transparent);
        }

        .hero h1 {
          margin: 0;
          font-size: clamp(40px, 5.2vw, 72px);
          line-height: 0.98;
          letter-spacing: -3.5px;
          font-weight: 850;
        }

        .hero h1 span {
          background: linear-gradient(90deg, #ffffff, #a5b4fc 48%, #67e8f9);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .hero h1 b {
          display: inline-block;
          font-size: 34px;
          margin-left: 13px;
          vertical-align: middle;
          filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.2));
        }

        .hero-description {
          max-width: 630px;
          color: #94a3b8;
          font-size: 15px;
          line-height: 1.8;
          margin: 27px 0 24px;
        }

        .hero-meta {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .meta-pill {
          padding: 8px 12px;
          border-radius: 100px;
          background: rgba(15, 23, 42, 0.68);
          border: 1px solid rgba(148, 163, 184, 0.11);
          color: #94a3b8;
          font-size: 10px;
          font-weight: 700;
        }

        .meta-icon {
          color: #67e8f9;
          margin-right: 6px;
        }

        .hero-right {
          width: 300px;
          display: flex;
          justify-content: center;
        }

        .control-orb {
          width: 235px;
          height: 235px;
          position: relative;
          display: grid;
          place-items: center;
        }

        .orb-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(129, 140, 248, 0.2);
        }

        .ring-one {
          inset: 0;
          animation: rotate 16s linear infinite;
        }

        .ring-two {
          inset: 22px;
          border-color: rgba(56, 189, 248, 0.18);
          animation: rotateReverse 11s linear infinite;
        }

        .orb-core {
          width: 112px;
          height: 112px;
          border-radius: 35px;
          display: grid;
          place-items: center;
          background:
            radial-gradient(
              circle at 30% 25%,
              rgba(129, 140, 248, 0.45),
              transparent 48%
            ),
            linear-gradient(145deg, #111936, #0b1125);
          border: 1px solid rgba(129, 140, 248, 0.28);
          box-shadow:
            0 0 70px rgba(99, 102, 241, 0.22),
            inset 0 0 35px rgba(99, 102, 241, 0.08);
          transform: rotate(45deg);
        }

        .orb-core span {
          transform: rotate(-45deg);
          font-weight: 950;
          font-size: 27px;
          letter-spacing: -1px;
          background: linear-gradient(135deg, white, #818cf8);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .orb-label {
          position: absolute;
          bottom: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          letter-spacing: 2px;
        }

        .orb-label strong {
          font-size: 9px;
        }

        .orb-label small {
          color: #64748b;
          font-size: 7px;
          margin-top: 3px;
        }

        /* STATUS */

        .status-strip {
          display: grid;
          grid-template-columns: 1fr 1px 1fr 1px 1fr;
          align-items: center;
          padding: 20px 24px;
          margin-bottom: 62px;
          border: 1px solid rgba(148, 163, 184, 0.09);
          border-radius: 18px;
          background: rgba(15, 23, 42, 0.46);
          backdrop-filter: blur(20px);
        }

        .status-item {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
        }

        .status-symbol {
          color: #818cf8;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .pulse-symbol {
          color: #22c55e;
          animation: livePulse 1.8s infinite;
        }

        .status-item div:last-child {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .status-item span {
          color: #64748b;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .status-item strong {
          color: #cbd5e1;
          font-size: 11px;
          letter-spacing: 1px;
        }

        .status-divider {
          height: 28px;
          background: rgba(148, 163, 184, 0.1);
        }

        /* MODULE HEADING */

        .modules-heading {
          display: flex;
          align-items: end;
          justify-content: space-between;
          margin-bottom: 22px;
        }

        .section-kicker {
          color: #6366f1;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 2.2px;
          margin-bottom: 8px;
        }

        .modules-heading h2 {
          margin: 0;
          font-size: 27px;
          letter-spacing: -1px;
        }

        .section-caption {
          color: #64748b;
          font-size: 11px;
        }

        /* CARDS */

        .module-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 17px;
          padding-bottom: 70px;
        }

        .module-card {
          min-height: 218px;
          text-align: left;
          position: relative;
          overflow: hidden;
          border-radius: 22px;
          border: 1px solid rgba(148, 163, 184, 0.11);
          background:
            linear-gradient(
              145deg,
              rgba(22, 30, 55, 0.92),
              rgba(10, 16, 31, 0.9)
            );
          padding: 25px;
          color: white;
          cursor: pointer;
          transition:
            transform 0.3s ease,
            border-color 0.3s ease,
            box-shadow 0.3s ease;
          isolation: isolate;
        }

        .module-card::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.04),
            transparent 35%
          );
          pointer-events: none;
        }

        .module-card:hover,
        .module-card.active {
          transform: translateY(-7px);
          border-color: rgba(129, 140, 248, 0.32);
          box-shadow:
            0 25px 50px rgba(0, 0, 0, 0.3),
            0 0 35px rgba(99, 102, 241, 0.08);
        }

        .card-number {
          position: absolute;
          top: 20px;
          right: 22px;
          color: rgba(148, 163, 184, 0.2);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .module-icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          font-size: 22px;
          font-weight: 800;
          margin-bottom: 27px;
          position: relative;
          z-index: 2;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .icon-attendance {
          background: rgba(34, 197, 94, 0.11);
          color: #4ade80;
        }

        .icon-history {
          background: rgba(99, 102, 241, 0.12);
          color: #a5b4fc;
        }

        .icon-calendar {
          background: rgba(56, 189, 248, 0.11);
          color: #67e8f9;
        }

        .icon-reports {
          background: rgba(168, 85, 247, 0.11);
          color: #c084fc;
        }

        .icon-fees {
          background: rgba(245, 158, 11, 0.11);
          color: #fbbf24;
        }

        .icon-settings {
          background: rgba(148, 163, 184, 0.1);
          color: #cbd5e1;
        }

        .module-content {
          position: relative;
          z-index: 2;
        }

        .module-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .module-title-row h3 {
          margin: 0;
          font-size: 17px;
          letter-spacing: -0.3px;
        }

        .arrow {
          color: #64748b;
          font-size: 21px;
          transition: 0.25s ease;
        }

        .module-card:hover .arrow {
          color: #a5b4fc;
          transform: translateX(5px);
        }

        .module-content p {
          margin: 9px 0 22px;
          color: #718096;
          font-size: 11px;
          line-height: 1.6;
          max-width: 270px;
        }

        .open-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #64748b;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }

        .open-label i {
          display: block;
          width: 18px;
          height: 1px;
          background: #4f46e5;
          transition: 0.25s ease;
        }

        .module-card:hover .open-label i {
          width: 34px;
        }

        .card-glow {
          position: absolute;
          width: 140px;
          height: 140px;
          border-radius: 50%;
          right: -70px;
          bottom: -80px;
          filter: blur(55px);
          opacity: 0.15;
          pointer-events: none;
          transition: 0.35s ease;
        }

        .module-card:hover .card-glow {
          opacity: 0.32;
        }

        .glow-attendance {
          background: #22c55e;
        }

        .glow-history {
          background: #6366f1;
        }

        .glow-calendar {
          background: #06b6d4;
        }

        .glow-reports {
          background: #a855f7;
        }

        .glow-fees {
          background: #f59e0b;
        }

        .glow-settings {
          background: #94a3b8;
        }

        /* FOOTER */

        .footer {
          min-height: 80px;
          border-top: 1px solid rgba(148, 163, 184, 0.09);
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #475569;
          font-size: 9px;
          letter-spacing: 0.6px;
        }

        .footer-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 800;
        }

        .footer-logo {
          width: 23px;
          height: 23px;
          display: grid;
          place-items: center;
          border-radius: 7px;
          background: rgba(99, 102, 241, 0.14);
          color: #818cf8;
          font-size: 10px;
        }

        .footer-center {
          color: #334155;
        }

        .footer-right {
          color: #475569;
        }

        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @keyframes rotateReverse {
          from {
            transform: rotate(360deg);
          }

          to {
            transform: rotate(0deg);
          }
        }

        @keyframes livePulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }

          50% {
            opacity: 0.45;
            transform: scale(0.78);
          }
        }

        /* TABLET */

        @media (max-width: 950px) {
          .hero {
            padding-left: 10px;
            padding-right: 10px;
          }

          .hero-right {
            width: 230px;
          }

          .control-orb {
            width: 190px;
            height: 190px;
          }

          .orb-core {
            width: 90px;
            height: 90px;
          }

          .module-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* MOBILE */

        @media (max-width: 680px) {
          .app-shell {
            width: min(100% - 24px, 600px);
          }

          .topbar {
            height: 74px;
          }

          .brand-subtitle,
          .live-status {
            display: none;
          }

          .brand-name {
            font-size: 11px;
          }

          .brand-mark {
            width: 36px;
            height: 36px;
            border-radius: 11px;
          }

          .logout-button {
            padding: 9px 11px;
          }

          .hero {
            min-height: auto;
            padding: 48px 5px 35px;
          }

          .hero-left {
            width: 100%;
          }

          .hero h1 {
            font-size: 43px;
            letter-spacing: -2.5px;
          }

          .hero h1 b {
            font-size: 23px;
            margin-left: 7px;
          }

          .hero-description {
            font-size: 13px;
            line-height: 1.7;
            margin-top: 21px;
          }

          .hero-right {
            display: none;
          }

          .status-strip {
            grid-template-columns: 1fr;
            gap: 17px;
            margin-bottom: 42px;
            padding: 18px;
          }

          .status-divider {
            width: 100%;
            height: 1px;
          }

          .status-item {
            justify-content: flex-start;
          }

          .modules-heading {
            align-items: flex-start;
            flex-direction: column;
            gap: 7px;
          }

          .modules-heading h2 {
            font-size: 24px;
          }

          .module-grid {
            grid-template-columns: 1fr;
            gap: 13px;
          }

          .module-card {
            min-height: 190px;
            padding: 22px;
          }

          .module-icon {
            width: 48px;
            height: 48px;
            margin-bottom: 23px;
          }

          .footer {
            flex-direction: column;
            justify-content: center;
            gap: 9px;
            padding: 22px 0;
            text-align: center;
          }

          .footer-center {
            order: 3;
          }

          .footer-right {
            order: 2;
          }
        }

        @media (max-width: 390px) {
          .hero h1 {
            font-size: 37px;
          }

          .eyebrow {
            font-size: 8px;
            letter-spacing: 1.8px;
          }

          .meta-pill {
            font-size: 9px;
          }
        }
      `}</style>
    </main>
  );
}
