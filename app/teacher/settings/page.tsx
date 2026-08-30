"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function TeacherSettingsPage() {
  const router = useRouter();

  const [teacherName, setTeacherName] = useState("");
  const [teacherUsername, setTeacherUsername] = useState("");

  const [portalName, setPortalName] = useState("Attendance Portal");
  const [monthlyFee, setMonthlyFee] = useState("200");
  const [className, setClassName] = useState("");
  const [academicYear, setAcademicYear] = useState("2026-27");

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedTeacherName =
      localStorage.getItem("teacherName") ||
      localStorage.getItem("teacher_name") ||
      "Teacher";

    const savedUsername =
      localStorage.getItem("teacher_username") || "";

    const savedPortalName =
      localStorage.getItem("portalName") ||
      "Attendance Portal";

    const savedMonthlyFee =
      localStorage.getItem("monthlyFee") ||
      "200";

    const savedClassName =
      localStorage.getItem("className") || "";

    const savedAcademicYear =
      localStorage.getItem("academicYear") ||
      "2026-27";

    setTeacherName(savedTeacherName);
    setTeacherUsername(savedUsername);
    setPortalName(savedPortalName);
    setMonthlyFee(savedMonthlyFee);
    setClassName(savedClassName);
    setAcademicYear(savedAcademicYear);
  }, []);

  function saveSettings(e: React.FormEvent) {
    e.preventDefault();

    localStorage.setItem("teacherName", teacherName);
    localStorage.setItem("teacher_name", teacherName);

    localStorage.setItem("portalName", portalName);
    localStorage.setItem("monthlyFee", monthlyFee);
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
    setMonthlyFee("200");
    setClassName("");
    setAcademicYear("2026-27");

    localStorage.setItem("portalName", "Attendance Portal");
    localStorage.setItem("monthlyFee", "200");
    localStorage.setItem("className", "");
    localStorage.setItem("academicYear", "2026-27");

    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 3000);
  }

  function logout() {
    localStorage.removeItem("teacherLoggedIn");
    localStorage.removeItem("teacherName");
    localStorage.removeItem("teacher_name");
    localStorage.removeItem("teacher_username");

    sessionStorage.clear();

    router.push("/");
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}

        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.iconBox}>
              ⚙️
            </div>

            <div>
              <h1 style={styles.title}>
                Teacher Settings
              </h1>

              <p style={styles.subtitle}>
                Manage your teacher dashboard settings
              </p>
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

        {/* TEACHER PROFILE */}

        <section style={styles.card}>
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

        <section style={styles.card}>
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
                <label style={styles.label}>
                  Monthly Fee (₹)
                </label>

                <input
                  type="number"
                  min="0"
                  value={monthlyFee}
                  onChange={(e) =>
                    setMonthlyFee(e.target.value)
                  }
                  style={styles.input}
                />
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

        <section style={styles.card}>
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
              <span style={styles.infoLabel}>
                Monthly Fee
              </span>

              <strong style={styles.infoValue}>
                ₹
                {Number(monthlyFee || 0).toLocaleString(
                  "en-IN"
                )}
              </strong>
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

        <section style={styles.card}>
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

            {/* STUDENTS - FIXED ROUTE */}

            <button
              type="button"
              onClick={() =>
                router.push("/teacher/students")
              }
              style={{
                ...styles.navigationButton,
                border: "2px solid #2563eb",
                background:
                  "linear-gradient(135deg,#eff6ff,#eef2ff)",
              }}
            >
              <span style={styles.navigationIcon}>
                👨‍🎓
              </span>

              <span>
                Students
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

        {/* SECURITY */}

        <section style={styles.securityCard}>
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

        <footer style={styles.footer}>
          <strong>
            Attendance Portal
          </strong>

          <span>
            Teacher Settings • 2026
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