"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type MenuItem = {
  number: string;
  title: string;
  description: string;
  icon: string;
  path: string;
};

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
    if (loggingOut) {
      return;
    }

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

    authKeys.forEach((key) => {
      localStorage.removeItem(key);
    });

    authKeys.forEach((key) => {
      sessionStorage.removeItem(key);
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });

    router.replace("/");
    router.refresh();
  }

  const menuItems: MenuItem[] = [
    {
      number: "01",
      title: "Mark Attendance",
      description: "Mark today's student attendance",
      icon: "✓",
      path: "/teacher/attendance",
    },
    {
      number: "02",
      title: "Attendance History",
      description: "Check previous attendance records",
      icon: "◷",
      path: "/teacher/attendance-history",
    },
    {
      number: "03",
      title: "Calendar",
      description: "View academic and attendance calendar",
      icon: "▣",
      path: "/teacher/calendar",
    },
    {
      number: "04",
      title: "Reports",
      description: "View attendance reports",
      icon: "↗",
      path: "/teacher/reports",
    },
    {
      number: "05",
      title: "Fees",
      description: "Manage student fee information",
      icon: "₹",
      path: "/teacher/fees",
    },
    {
      number: "06",
      title: "Payments",
      description: "Manage cash and online fee payments",
      icon: "💳",
      path: "/teacher/payments",
    },
    {
      number: "07",
      title: "Homework",
      description: "Create and manage student homework",
      icon: "📚",
      path: "/teacher/homework",
    },
    {
      number: "08",
      title: "Announcements",
      description: "Create and manage announcements for all students",
      icon: "📢",
      path: "/teacher/announcements",
    },
    {
      number: "09",
      title: "Profile",
      description: "Manage your teacher profile and picture",
      icon: "👤",
      path: "/teacher/profile",
    },
    {
      number: "10",
      title: "Settings",
      description: "Manage teacher account settings",
      icon: "⚙",
      path: "/teacher/settings",
    },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #f8fafc 100%)",
        padding: "24px",
        boxSizing: "border-box",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}

        <header
          style={{
            background: "#ffffff",
            borderRadius: "22px",
            padding: "28px",
            marginBottom: "28px",
            boxShadow: "0 10px 35px rgba(15,23,42,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-block",
                background: "#eef2ff",
                color: "#4f46e5",
                padding: "7px 12px",
                borderRadius: "999px",
                fontSize: "11px",
                fontWeight: 900,
                letterSpacing: "1px",
                marginBottom: "10px",
              }}
            >
              TEACHER PORTAL
            </div>

            <h1
              style={{
                margin: 0,
                color: "#0f172a",
                fontSize: "30px",
                fontWeight: 900,
              }}
            >
              Welcome, {teacherName} 👋
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                color: "#64748b",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Manage attendance, homework, students, fees and more.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              border: "none",
              background: loggingOut ? "#94a3b8" : "#ef4444",
              color: "#ffffff",
              padding: "12px 20px",
              borderRadius: "12px",
              fontWeight: 800,
              fontSize: "14px",
              cursor: loggingOut ? "not-allowed" : "pointer",
              minWidth: "115px",
            }}
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </header>

        {/* TITLE */}

        <section
          style={{
            marginBottom: "20px",
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: "24px",
              fontWeight: 900,
            }}
          >
            YOUR WORKSPACE
          </h2>

          <p
            style={{
              margin: "7px 0 0",
              color: "#64748b",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Choose a module
          </p>

          <p
            style={{
              margin: "3px 0 0",
              color: "#94a3b8",
              fontSize: "13px",
            }}
          >
            Select an option to continue
          </p>
        </section>

        {/* DASHBOARD CARDS */}

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "18px",
          }}
        >
          {menuItems.map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => router.push(item.path)}
              style={{
                border: "none",
                background: "#ffffff",
                borderRadius: "20px",
                padding: "24px",
                textAlign: "left",
                cursor: "pointer",
                boxShadow:
                  "0 8px 28px rgba(15,23,42,0.07)",
                transition:
                  "transform 0.2s ease, box-shadow 0.2s ease",
                minHeight: "220px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.transform =
                  "translateY(-5px)";

                event.currentTarget.style.boxShadow =
                  "0 16px 35px rgba(15,23,42,0.13)";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.transform =
                  "translateY(0)";

                event.currentTarget.style.boxShadow =
                  "0 8px 28px rgba(15,23,42,0.07)";
              }}
            >
              <div>
                {/* NUMBER */}

                <div
                  style={{
                    color: "#94a3b8",
                    fontSize: "11px",
                    fontWeight: 900,
                    letterSpacing: "1px",
                    marginBottom: "14px",
                  }}
                >
                  {item.number}
                </div>

                {/* ICON */}

                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "15px",
                    background:
                      item.title === "Homework"
                        ? "linear-gradient(135deg,#ede9fe,#ddd6fe)"
                        : item.title === "Announcements"
                        ? "linear-gradient(135deg,#fef3c7,#fde68a)"
                        : "#eef2ff",
                    color:
                      item.title === "Homework"
                        ? "#7c3aed"
                        : item.title === "Announcements"
                        ? "#d97706"
                        : "#4f46e5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    fontWeight: 900,
                    marginBottom: "17px",
                  }}
                >
                  {item.icon}
                </div>

                {/* TITLE */}

                <h3
                  style={{
                    margin: "0 0 8px",
                    color: "#172554",
                    fontSize: "19px",
                    fontWeight: 900,
                  }}
                >
                  {item.title}
                </h3>

                {/* DESCRIPTION */}

                <p
                  style={{
                    margin: 0,
                    color: "#64748b",
                    fontSize: "13px",
                    lineHeight: 1.5,
                    fontWeight: 600,
                  }}
                >
                  {item.description}
                </p>
              </div>

              {/* OPEN MODULE */}

              <div
                style={{
                  marginTop: "18px",
                  color:
                    item.title === "Homework"
                      ? "#7c3aed"
                      : item.title === "Announcements"
                      ? "#d97706"
                      : "#4f46e5",
                  fontSize: "12px",
                  fontWeight: 900,
                  letterSpacing: "0.5px",
                }}
              >
                OPEN MODULE →
              </div>
            </button>
          ))}
        </section>

        {/* FOOTER */}

        <footer
          style={{
            textAlign: "center",
            marginTop: "35px",
            padding: "20px",
            color: "#94a3b8",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          Attendance Portal • Teacher Dashboard • 2026
        </footer>
      </div>
    </main>
  );
}