"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

    await new Promise((resolve) => setTimeout(resolve, 100));

    router.replace("/");
    router.refresh();
  }

  const menuItems = [
    {
      title: "Mark Attendance",
      description: "Mark today's student attendance",
      icon: "📝",
      path: "/teacher/attendance",
    },
    {
      title: "Attendance History",
      description: "Check previous attendance records",
      icon: "📊",
      path: "/teacher/attendance-history",
    },
    {
      title: "Calendar",
      description: "View academic and attendance calendar",
      icon: "📅",
      path: "/teacher/calendar",
    },
    {
      title: "Reports",
      description: "View attendance reports",
      icon: "📈",
      path: "/teacher/reports",
    },
    {
      title: "Fees",
      description: "Manage student fee information",
      icon: "💰",
      path: "/teacher/fees",
    },
    {
      title: "Settings",
      description: "Manage teacher account settings",
      icon: "⚙️",
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
        fontFamily: "Arial, Helvetica, sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            padding: "24px",
            marginBottom: "24px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "14px",
                color: "#64748b",
                marginBottom: "6px",
              }}
            >
              Teacher Control Center
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "30px",
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              Welcome, {teacherName} 👋
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                color: "#64748b",
                fontSize: "15px",
              }}
            >
              Manage attendance, students, reports and more.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              border: "none",
              background: loggingOut ? "#9ca3af" : "#ef4444",
              color: "#ffffff",
              padding: "12px 20px",
              borderRadius: "12px",
              fontWeight: 700,
              cursor: loggingOut ? "not-allowed" : "pointer",
              fontSize: "14px",
              minWidth: "110px",
            }}
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </header>

        <section
          style={{
            marginBottom: "18px",
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: "22px",
              fontWeight: 800,
            }}
          >
            Teacher Dashboard
          </h2>

          <p
            style={{
              margin: "6px 0 0",
              color: "#64748b",
            }}
          >
            Select an option to continue.
          </p>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "18px",
          }}
        >
          {menuItems.map((item) => (
            <button
              type="button"
              key={item.path}
              onClick={() => router.push(item.path)}
              style={{
                border: "none",
                background: "#ffffff",
                borderRadius: "18px",
                padding: "24px",
                textAlign: "left",
                cursor: "pointer",
                boxShadow: "0 6px 22px rgba(0,0,0,0.07)",
                transition:
                  "transform 0.2s ease, box-shadow 0.2s ease",
                width: "100%",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow =
                  "0 12px 30px rgba(0,0,0,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 6px 22px rgba(0,0,0,0.07)";
              }}
            >
              <div
                style={{
                  fontSize: "36px",
                  marginBottom: "14px",
                }}
              >
                {item.icon}
              </div>

              <h3
                style={{
                  margin: "0 0 8px",
                  color: "#0f172a",
                  fontSize: "19px",
                  fontWeight: 800,
                }}
              >
                {item.title}
              </h3>

              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                  fontSize: "14px",
                  lineHeight: 1.5,
                }}
              >
                {item.description}
              </p>

              <div
                style={{
                  marginTop: "18px",
                  color: "#4f46e5",
                  fontWeight: 700,
                  fontSize: "14px",
                }}
              >
                Open →
              </div>
            </button>
          ))}
        </section>

        <footer
          style={{
            textAlign: "center",
            marginTop: "32px",
            color: "#94a3b8",
            fontSize: "13px",
          }}
        >
          Attendance Portal • Teacher Dashboard
        </footer>
      </div>
    </main>
  );
}