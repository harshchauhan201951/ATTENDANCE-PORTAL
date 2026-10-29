"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function TeacherSettingsPage() {
  const router = useRouter();

  const [teacherName, setTeacherName] = useState("");
  const [teacherUsername, setTeacherUsername] = useState("");

  const [portalName, setPortalName] = useState("Attendance Portal");
  const [className, setClassName] = useState("");
  const [academicYear, setAcademicYear] = useState("2026-27");

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedTeacher = localStorage.getItem("teacher");
    let teacherRecord: { name?: string; teacher_name?: string; username?: string; teacher_username?: string } = {};

    if (savedTeacher) {
      try {
        teacherRecord = JSON.parse(savedTeacher) as typeof teacherRecord;
      } catch {
        teacherRecord = { username: savedTeacher };
      }
    }

    const savedUsername =
      localStorage.getItem("teacher_username") ||
      localStorage.getItem("teacherUsername") ||
      localStorage.getItem("username") ||
      localStorage.getItem("attendance_username") ||
      teacherRecord.teacher_username ||
      teacherRecord.username ||
      "";

    const savedTeacherName =
      localStorage.getItem("teacherName") ||
      localStorage.getItem("teacher_name") ||
      teacherRecord.teacher_name ||
      teacherRecord.name ||
      savedUsername ||
      "Teacher";

    const savedPortalName =
      localStorage.getItem("portalName") ||
      "Attendance Portal";

    const savedClassName =
      localStorage.getItem("className") || "";

    const savedAcademicYear =
      localStorage.getItem("academicYear") ||
      "2026-27";

    setTeacherName(savedTeacherName);
    setTeacherUsername(savedUsername);
    setPortalName(savedPortalName);
    setClassName(savedClassName);
    setAcademicYear(savedAcademicYear);
  }, []);

  function saveSettings(e: React.FormEvent) {
    e.preventDefault();

    localStorage.setItem("teacherName", teacherName);
    localStorage.setItem("teacher_name", teacherName);

    localStorage.setItem("portalName", portalName);
    localStorage.setItem("className", className);
    localStorage.setItem("academicYear", academicYear);

    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 3000);
  }

  function resetSettings() {
    const confirmReset = window.confirm(
      "Are you sure you want to reset the dashboard settings?"
    );

    if (!confirmReset) return;

    setPortalName("Attendance Portal");
    setClassName("");
    setAcademicYear("2026-27");

    localStorage.setItem("portalName", "Attendance Portal");
    localStorage.setItem("className", "");
    localStorage.setItem("academicYear", "2026-27");

    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 3000);
  }

  function logout() {
    sessionStorage.removeItem("teacherLoggedIn");
    localStorage.removeItem("teacherName");
    localStorage.removeItem("teacher_name");
    localStorage.removeItem("teacher_username");

    sessionStorage.clear();

    router.push("/");
  }

  return (
    <main data-racer-vip-module="settings" className="racer-module-page racer-settings-page racer-settings-refresh">
      <div className="racer-settings-container" style={styles.container}>

        {/* HEADER */}

        <header data-racer-vip-header="1"  style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.iconBox}>
              ⚙️
            </div>

            <div>
              <h1 style={styles.title}>RACER ACADEMY</h1>

              <p style={styles.subtitle}>TEACHER CONTROL CENTER</p>
            </div>
          </div>

          <div style={styles.headerButtons}>
            <button
              type="button"
              onClick={() => router.push("/teacher")}
              style={styles.dashboardButton}
            >
              ← Teacher Dashboard
            </button>

            <button
              type="button"
              onClick={logout}
              style={styles.logoutButton}
            >
              🚪 Logout
            </button>
          </div>
        </header>

        {/* SUCCESS MESSAGE */}

        {saved && (
          <div style={styles.success}>
            ✅ Settings saved successfully.
          </div>
        )}

        <div className="racer-settings-grid">

        {/* TEACHER PROFILE */}

        <section className="racer-settings-account" style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>
              👨‍🏫
            </div>

            <div>
              <h2 style={styles.sectionTitle}>
                Teacher Profile
              </h2>

              <p style={styles.sectionSubtitle}>
                Your teacher account information
              </p>
            </div>
          </div>

          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>
                Teacher Name
              </label>

              <input
                type="text"
                value={teacherName}
                onChange={(e) =>
                  setTeacherName(e.target.value)
                }
                placeholder="Enter teacher name"
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>
                Username
              </label>

              <input
                type="text"
                value={teacherUsername}
                readOnly
                style={{
                  ...styles.input,
                  background: "#f1f5f9",
                  color: "#64748b",
                }}
              />

              <p style={styles.helpText}>
                Username cannot be changed here.
              </p>
            </div>
          </div>
        </section>

        {/* PORTAL SETTINGS */}

        <section className="racer-settings-portal" style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>
              🏫
            </div>

            <div>
              <h2 style={styles.sectionTitle}>
                Portal Settings
              </h2>

              <p style={styles.sectionSubtitle}>
                Customize your attendance portal
              </p>
            </div>
          </div>

          <form onSubmit={saveSettings}>
            <div style={styles.formGrid}>
              <div>
                <label style={styles.label}>
                  Portal Name
                </label>

                <input
                  type="text"
                  value={portalName}
                  onChange={(e) =>
                    setPortalName(e.target.value)
                  }
                  placeholder="Attendance Portal"
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>Monthly Fees - Effective October 2026</label>
                <div style={{ ...styles.input, height: "auto", display: "grid", gap: 5, color: "#17345c", fontWeight: 700 }}>
                  <span>Nursery, LKG, UKG - Rs 200</span>
                  <span>Classes 1-8 - Rs 250</span>
                  <span>Classes 9-10 - Rs 300</span>
                </div>
              </div>

              <div>
                <label style={styles.label}>
                  Class / Section
                </label>

                <input
                  type="text"
                  value={className}
                  onChange={(e) =>
                    setClassName(e.target.value)
                  }
                  placeholder="Example: B.Tech CSE-AIML"
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>
                  Academic Year
                </label>

                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) =>
                    setAcademicYear(e.target.value)
                  }
                  placeholder="2026-27"
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.buttonRow}>
              <button
                type="submit"
                style={styles.saveButton}
              >
                💾 Save Settings
              </button>

              <button
                type="button"
                onClick={resetSettings}
                style={styles.resetButton}
              >
                🔄 Reset
              </button>
            </div>
          </form>
        </section>

        {/* DASHBOARD INFORMATION */}

        <section className="racer-settings-summary" style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>
              📊
            </div>

            <div>
              <h2 style={styles.sectionTitle}>
                Dashboard Information
              </h2>

              <p style={styles.sectionSubtitle}>
                Current portal configuration
              </p>
            </div>
          </div>

          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>
                Portal
              </span>

              <strong style={styles.infoValue}>
                {portalName || "Attendance Portal"}
              </strong>
            </div>

            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Monthly Fees from October 2026</span>
              <strong style={styles.infoValue}>Nursery-UKG Rs 200 | Classes 1-8 Rs 250 | Classes 9-10 Rs 300</strong>
            </div>

            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>
                Class
              </span>

              <strong style={styles.infoValue}>
                {className || "Not set"}
              </strong>
            </div>

            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>
                Academic Year
              </span>

              <strong style={styles.infoValue}>
                {academicYear}
              </strong>
            </div>
          </div>
        </section>

        {/* QUICK NAVIGATION */}

        <section className="racer-settings-navigation" style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>
              ⚡
            </div>

            <div>
              <h2 style={styles.sectionTitle}>
                Quick Navigation
              </h2>

              <p style={styles.sectionSubtitle}>
                Quickly open other teacher sections
              </p>
            </div>
          </div>

          <div style={styles.navigationGrid}>

            {/* MARK ATTENDANCE */}

            <button
              type="button"
              onClick={() =>
                router.push("/teacher/attendance")
              }
              style={styles.navigationButton}
            >
              <span style={styles.navigationIcon}>
                📝
              </span>

              <span>
                Mark Attendance
              </span>
            </button>

            {/* ATTENDANCE HISTORY */}

            <button
              type="button"
              onClick={() =>
                router.push("/teacher/attendance-history")
              }
              style={styles.navigationButton}
            >
              <span style={styles.navigationIcon}>
                📅
              </span>

              <span>
                Attendance History
              </span>
            </button>

            {/* FEES MANAGEMENT */}

            <button
              type="button"
              onClick={() =>
                router.push("/teacher/fees")
              }
              style={styles.navigationButton}
            >
              <span style={styles.navigationIcon}>
                💰
              </span>

              <span>
                Fees Management
              </span>
            </button>

            {/* ADD STUDENT */}

            <button
              type="button"
              onClick={() =>
                router.push("/teacher/students?add=true")
              }
              style={{
                ...styles.navigationButton,
                border: "2px solid #2563eb",
                background:
                  "linear-gradient(135deg,#eff6ff,#eef2ff)",
              }}
            >
              <span style={styles.navigationIcon}>
                ➕
              </span>

              <span>
                Add Student
              </span>
            </button>

            {/* CALENDAR */}

            <button
              type="button"
              onClick={() =>
                router.push("/teacher/calendar")
              }
              style={styles.navigationButton}
            >
              <span style={styles.navigationIcon}>
                🗓️
              </span>

              <span>
                Calendar
              </span>
            </button>

            {/* REPORTS */}

            <button
              type="button"
              onClick={() =>
                router.push("/teacher/reports")
              }
              style={styles.navigationButton}
            >
              <span style={styles.navigationIcon}>
                📊
              </span>

              <span>
                Reports
              </span>
            </button>

          </div>
        </section>

        </div>

        {/* SECURITY */}

        <section className="racer-settings-security" style={styles.securityCard}>
          <div style={styles.securityIcon}>
            🔐
          </div>

          <div style={styles.securityContent}>
            <h2 style={styles.securityTitle}>
              Account Security
            </h2>

            <p style={styles.securityText}>
              Keep your teacher account secure. Always
              log out when using the portal on a shared
              computer.
            </p>

            <button
              type="button"
              onClick={logout}
              style={styles.securityButton}
            >
              🚪 Logout from Teacher Account
            </button>
          </div>
        </section>

        {/* FOOTER */}

        <footer className="racer-settings-footer" style={styles.footer}>
          <strong>
            Attendance Portal
          </strong>

          <span>
            Teacher Settings • 2026
          </span>
        </footer>

      </div>
      <style jsx global>{`
        .racer-settings-refresh {
          min-height: 100% !important;
          padding: 12px 18px 24px !important;
          background: #f5f8fc !important;
          color: #172b4d !important;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        }
        .racer-settings-refresh > .racer-settings-container {
          width: min(100%, 1280px) !important;
          margin: 0 auto !important;
        }
        .racer-settings-refresh .racer-settings-grid {
          display: grid;
          grid-template-columns: minmax(0, .95fr) minmax(0, 1.35fr);
          grid-template-areas: "account portal" "summary navigation";
          gap: 13px;
          align-items: stretch;
        }
        .racer-settings-refresh .racer-settings-account { grid-area: account; }
        .racer-settings-refresh .racer-settings-portal { grid-area: portal; }
        .racer-settings-refresh .racer-settings-summary { grid-area: summary; }
        .racer-settings-refresh .racer-settings-navigation { grid-area: navigation; }
        .racer-settings-refresh .racer-settings-grid > section,
        .racer-settings-refresh .racer-settings-security {
          min-width: 0 !important;
          padding: 16px !important;
          margin: 0 0 12px !important;
          border: 1px solid #e1e9f2 !important;
          border-radius: 16px !important;
          background: #fff !important;
          box-shadow: 0 7px 22px rgba(34, 67, 110, .055) !important;
        }
        .racer-settings-refresh .racer-settings-grid > section > div:first-child { margin-bottom: 12px !important; }
        .racer-settings-refresh .racer-settings-grid h2 { color: #1e3554 !important; font-size: 17px !important; letter-spacing: -.02em; }
        .racer-settings-refresh .racer-settings-grid p { line-height: 1.45; }
        .racer-settings-refresh .racer-settings-grid input {
          min-width: 0 !important;
          height: 40px !important;
          padding: 9px 11px !important;
          border: 1px solid #dbe4ef !important;
          border-radius: 10px !important;
          background: #fbfdff !important;
          color: #1e293b !important;
          font-size: 13px !important;
        }
        .racer-settings-refresh .racer-settings-grid input:focus { border-color: #6aa5eb !important; outline: 3px solid rgba(59,130,246,.12); }
        .racer-settings-refresh .racer-settings-grid label { color: #334b68 !important; font-size: 12px !important; }
        .racer-settings-refresh .racer-settings-account > div:nth-child(2),
        .racer-settings-refresh .racer-settings-portal form > div:first-child {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 11px !important;
        }
        .racer-settings-refresh .racer-settings-summary > div:nth-child(2) {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 8px !important;
        }
        .racer-settings-refresh .racer-settings-summary > div:nth-child(2) > div {
          min-width: 0;
          padding: 11px !important;
          border: 1px solid #e5edf5 !important;
          border-radius: 11px !important;
          background: #f8fbff !important;
        }
        .racer-settings-refresh .racer-settings-summary strong { display: block; overflow-wrap: anywhere; font-size: 14px !important; }
        .racer-settings-refresh .racer-settings-navigation > div:nth-child(2) {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 8px !important;
        }
        .racer-settings-refresh .racer-settings-navigation button {
          min-width: 0 !important;
          min-height: 42px !important;
          padding: 8px 10px !important;
          border: 1px solid #e1e9f2 !important;
          border-radius: 10px !important;
          background: #f8fbff !important;
          color: #334b68 !important;
          font-size: 12px !important;
          text-align: left;
        }
        .racer-settings-refresh .racer-settings-navigation button:hover { border-color: #a9c8ee !important; background: #f0f6ff !important; }
        .racer-settings-refresh .racer-settings-security { align-items: center !important; padding: 13px 16px !important; background: #fffaf8 !important; border-color: #f1e2d9 !important; }
        .racer-settings-refresh .racer-settings-security h2 { font-size: 15px !important; }
        .racer-settings-refresh .racer-settings-security p { margin: 4px 0 9px !important; font-size: 12px !important; }
        .racer-settings-refresh .racer-settings-security button { padding: 9px 12px !important; font-size: 12px !important; }
        .racer-settings-refresh .racer-settings-footer { min-height: 30px !important; margin: 3px 0 0 !important; padding: 7px 0 !important; color: #8292a8 !important; font-size: 11px !important; }
        @media (max-width: 1100px) {
          .racer-settings-refresh { padding: 10px 12px 22px !important; }
          .racer-settings-refresh .racer-settings-grid { grid-template-columns: minmax(0,1fr) minmax(0,1fr); }
        }
        @media (max-width: 760px) {
          .racer-settings-refresh { padding: 8px 10px calc(86px + env(safe-area-inset-bottom)) !important; }
          .racer-settings-refresh > .racer-settings-container { width: 100% !important; max-width: none !important; }
          .racer-settings-refresh .racer-settings-grid {
            grid-template-columns: minmax(0,1fr);
            grid-template-areas: "account" "portal" "summary" "navigation";
            gap: 9px;
          }
          .racer-settings-refresh .racer-settings-grid > section,
          .racer-settings-refresh .racer-settings-security { padding: 13px !important; margin-bottom: 9px !important; border-radius: 14px !important; }
          .racer-settings-refresh .racer-settings-footer { display: none !important; }
        }
        @media (max-width: 420px) {
          .racer-settings-refresh .racer-settings-account > div:nth-child(2),
          .racer-settings-refresh .racer-settings-portal form > div:first-child { grid-template-columns: minmax(0,1fr) !important; }
          .racer-settings-refresh .racer-settings-security { flex-wrap: wrap; }
          .racer-settings-refresh .racer-settings-security button { width: 100%; }
        }
      `}</style>
      <style jsx global>{`
        .racer-settings-refresh [data-racer-vip-header="1"]{border:1px solid #dce8f6!important;background:linear-gradient(115deg,#fff 0%,#f7faff 55%,#edf5ff 100%)!important;box-shadow:0 10px 30px rgba(28,65,112,.08)!important}
        .racer-settings-refresh .racer-settings-grid>section{transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
        .racer-settings-refresh .racer-settings-grid>section:hover{transform:translateY(-2px);border-color:#c6d9ef!important;box-shadow:0 12px 28px rgba(34,67,110,.09)!important}
        .racer-settings-refresh .racer-settings-grid button{transition:transform .16s ease,box-shadow .16s ease,background .16s ease}
        .racer-settings-refresh .racer-settings-grid button:hover{transform:translateY(-1px);box-shadow:0 5px 14px rgba(35,78,130,.1)}
        .racer-settings-refresh .racer-settings-security{box-shadow:0 5px 18px rgba(120,60,35,.05)!important}
        @media(max-width:760px){.racer-settings-refresh .racer-settings-grid>section:hover{transform:none}}
      `}</style>
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
  },

  container: {
    width: "100%",
    maxWidth: "1100px",
    margin: "0 auto",
  },

  header: {
    background: "white",
    borderRadius: "18px",
    padding: "18px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
    marginBottom: "20px",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
  },

  iconBox: {
    width: "55px",
    height: "55px",
    borderRadius: "15px",
    background:
      "linear-gradient(135deg,#2563eb,#7c3aed)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
  },

  title: {
    margin: 0,
    color: "#172554",
    fontSize: "26px",
    fontWeight: "800",
  },

  subtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  headerButtons: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  dashboardButton: {
    border: "none",
    background: "#1e3a8a",
    color: "white",
    padding: "11px 16px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },

  logoutButton: {
    border: "none",
    background: "#dc2626",
    color: "white",
    padding: "11px 16px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },

  success: {
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #86efac",
    padding: "14px 16px",
    borderRadius: "12px",
    marginBottom: "20px",
    fontWeight: "700",
  },

  card: {
    background: "white",
    borderRadius: "20px",
    padding: "25px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    marginBottom: "20px",
  },

  cardIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "14px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
  },

  sectionTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "21px",
    fontWeight: "800",
  },

  sectionSubtitle: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(250px,1fr))",
    gap: "18px",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    color: "#334155",
    fontSize: "14px",
    fontWeight: "700",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "12px 13px",
    fontSize: "15px",
    color: "#111827",
    background: "white",
    outline: "none",
  },

  helpText: {
    margin: "5px 0 0",
    color: "#94a3b8",
    fontSize: "11px",
  },

  buttonRow: {
    display: "flex",
    gap: "12px",
    marginTop: "22px",
    flexWrap: "wrap",
  },

  saveButton: {
    border: "none",
    background:
      "linear-gradient(135deg,#2563eb,#4f46e5)",
    color: "white",
    padding: "13px 22px",
    borderRadius: "10px",
    fontWeight: "700",
    fontSize: "15px",
    cursor: "pointer",
  },

  resetButton: {
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#334155",
    padding: "13px 22px",
    borderRadius: "10px",
    fontWeight: "700",
    fontSize: "15px",
    cursor: "pointer",
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(210px,1fr))",
    gap: "14px",
  },

  infoItem: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "13px",
    padding: "17px",
  },

  infoLabel: {
    display: "block",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "700",
    marginBottom: "6px",
  },

  infoValue: {
    color: "#172554",
    fontSize: "16px",
  },

  navigationGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(190px,1fr))",
    gap: "12px",
  },

  navigationButton: {
    border: "1px solid #dbeafe",
    background: "#f8fafc",
    color: "#1e3a8a",
    borderRadius: "12px",
    padding: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    fontWeight: "700",
    fontSize: "14px",
    cursor: "pointer",
    minHeight: "55px",
  },

  navigationIcon: {
    fontSize: "20px",
  },

  securityCard: {
    background:
      "linear-gradient(135deg,#fff7ed,#fef2f2)",
    border: "1px solid #fed7aa",
    borderRadius: "20px",
    padding: "24px",
    display: "flex",
    gap: "16px",
    alignItems: "flex-start",
    marginBottom: "20px",
  },

  securityIcon: {
    fontSize: "30px",
  },

  securityContent: {
    flex: 1,
  },

  securityTitle: {
    margin: 0,
    color: "#9a3412",
    fontSize: "19px",
    fontWeight: "800",
  },

  securityText: {
    margin: "7px 0 15px",
    color: "#7c2d12",
    fontSize: "13px",
    lineHeight: 1.6,
  },

  securityButton: {
    border: "none",
    background: "#dc2626",
    color: "white",
    padding: "11px 16px",
    borderRadius: "9px",
    fontWeight: "700",
    cursor: "pointer",
  },

  footer: {
    padding: "25px 10px 10px",
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    flexWrap: "wrap",
    color: "#64748b",
    fontSize: "12px",
    textAlign: "center",
  },
};
