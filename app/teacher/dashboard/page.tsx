"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type MenuItem = {
  title: string;
  description: string;
  icon: string;
  path: string;
  section:
    | "Attendance & Academics"
    | "Students & Communication"
    | "Finance & Account"
    | "Administration";
};

export default function TeacherDashboard() {
  const router = useRouter();

  const [teacherName, setTeacherName] = useState("Teacher");
  const [loggingOut, setLoggingOut] = useState(false);
  const [search, setSearch] = useState("");

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

  const menuItems: MenuItem[] = [
    {
      title: "Mark Attendance",
      description: "Mark today's student attendance",
      icon: "📝",
      path: "/teacher/attendance",
      section: "Attendance & Academics",
    },
    {
      title: "Attendance History",
      description: "Check previous attendance records",
      icon: "📊",
      path: "/teacher/attendance-history",
      section: "Attendance & Academics",
    },
    {
      title: "Calendar",
      description: "View academic and attendance calendar",
      icon: "📅",
      path: "/teacher/calendar",
      section: "Attendance & Academics",
    },
    {
      title: "Reports",
      description: "View attendance reports",
      icon: "📈",
      path: "/teacher/reports",
      section: "Attendance & Academics",
    },
    {
      title: "Fees",
      description: "Manage student fee information",
      icon: "💰",
      path: "/teacher/fees",
      section: "Finance & Account",
    },
    {
      title: "Payments",
      description: "Manage cash and online fee payments",
      icon: "💳",
      path: "/teacher/payments",
      section: "Finance & Account",
    },
    {
      title: "Homework",
      description: "Create and manage student homework",
      icon: "📚",
      path: "/teacher/homework",
      section: "Attendance & Academics",
    },
    {
      title: "Announcements",
      description: "Create and manage announcements for all students",
      icon: "📢",
      path: "/teacher/announcements",
      section: "Students & Communication",
    },
    {
      title: "Student Login Activity",
      description: "Track when every student logs into the portal",
      icon: "🔐",
      path: "/teacher/login-activity",
      section: "Students & Communication",
    },
    {
      title: "Profile",
      description: "Manage your teacher profile and picture",
      icon: "👤",
      path: "/teacher/profile",
      section: "Finance & Account",
    },
    {
      title: "Settings",
      description: "Manage teacher account settings",
      icon: "⚙️",
      path: "/teacher/settings",
      section: "Finance & Account",
    },
    {
      title: "Student Directory",
      description: "View and export complete student details",
      icon: "👨‍🎓",
      path: "/teacher/student-directory",
      section: "Students & Communication",
    },

    // OPTION 13
    {
      title: "Extra Classes",
      description: "Manage extra classes and attendance",
      icon: "➕",
      path: "/teacher/extra-class",
      section: "Attendance & Academics",
    },

    // OPTION 14
    {
      title: "Quiz Tests",
      description: "Create, manage and review student quiz tests",
      icon: "🧠",
      path: "/teacher/quiz-tests",
      section: "Attendance & Academics",
    },

    // OPTION 15
    {
      title: "Voice & Call Center",
      description: "Contact students and manage academy communication",
      icon: "📞",
      path: "/teacher/voice-call",
      section: "Students & Communication",
    },

    // OPTION 16
    {
      title: "Teachers",
      description: "Manage teacher accounts and teacher information",
      icon: "👨‍🏫",
      path: "/teacher/teachers",
      section: "Administration",
    },

    // OPTION 17
    {
      title: "Timetable",
      description: "Create and manage class-wise timetables",
      icon: "🗓️",
      path: "/teacher/timetable",
      section: "Attendance & Academics",
    },
  ];

  const filteredItems = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return menuItems;
    }

    return menuItems.filter(
      (item) =>
        item.title.toLowerCase().includes(value) ||
        item.description.toLowerCase().includes(value) ||
        item.section.toLowerCase().includes(value)
    );
  }, [search]);

  const sections: MenuItem["section"][] = [
    "Attendance & Academics",
    "Students & Communication",
    "Finance & Account",
    "Administration",
  ];

  const sectionIcons: Record<MenuItem["section"], string> = {
    "Attendance & Academics": "📚",
    "Students & Communication": "👥",
    "Finance & Account": "💼",
    Administration: "🛠️",
  };

  const initials =
    teacherName
      .trim()
      .split(/\s+/)
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "T";

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #f8fafc 100%)",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: "#0f172a",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "1250px",
          margin: "0 auto",
          padding: "18px",
          boxSizing: "border-box",
        }}
      >
        {/* TOP HEADER */}

        <header
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "22px",
            padding: "16px 18px",
            marginBottom: "20px",
            boxShadow: "0 8px 30px rgba(15,23,42,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "14px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                flexShrink: 0,
                borderRadius: "15px",
                background:
                  "linear-gradient(135deg, #4f46e5, #7c3aed)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "17px",
                fontWeight: 900,
              }}
            >
              RA
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  color: "#6366f1",
                  textTransform: "uppercase",
                }}
              >
                RACER ACADEMY
              </div>

              <div
                style={{
                  marginTop: "3px",
                  fontSize: "17px",
                  fontWeight: 900,
                  color: "#0f172a",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                Teacher Control Center
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "#eef2ff",
                color: "#4338ca",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: 900,
              }}
              title={teacherName}
            >
              {initials}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              style={{
                border: "none",
                background: loggingOut ? "#94a3b8" : "#ef4444",
                color: "#ffffff",
                padding: "11px 16px",
                borderRadius: "12px",
                fontWeight: 800,
                cursor: loggingOut ? "not-allowed" : "pointer",
                fontSize: "13px",
                minWidth: "96px",
              }}
            >
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </header>

        {/* WELCOME HERO */}

        <section
          style={{
            background:
              "linear-gradient(135deg, #312e81 0%, #4f46e5 55%, #7c3aed 100%)",
            borderRadius: "24px",
            padding: "28px",
            marginBottom: "20px",
            color: "#ffffff",
            boxShadow: "0 14px 35px rgba(79,70,229,0.22)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: "180px",
              height: "180px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
              right: "-55px",
              top: "-70px",
            }}
          />

          <div
            style={{
              position: "absolute",
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.06)",
              right: "100px",
              bottom: "-70px",
            }}
          />

          <div style={{ position: "relative" }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                opacity: 0.82,
                marginBottom: "7px",
              }}
            >
              Welcome back
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(26px, 5vw, 38px)",
                lineHeight: 1.15,
                fontWeight: 900,
              }}
            >
              {teacherName}
            </h1>

            <p
              style={{
                margin: "10px 0 0",
                maxWidth: "650px",
                fontSize: "14px",
                lineHeight: 1.6,
                opacity: 0.9,
              }}
            >
              Manage attendance, students, academics,
              communication and academy operations from one place.
            </p>
          </div>
        </section>

        {/* QUICK SEARCH */}

        <section
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "18px",
            padding: "14px",
            marginBottom: "24px",
            boxShadow: "0 5px 20px rgba(15,23,42,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span
              style={{
                fontSize: "20px",
                flexShrink: 0,
              }}
            >
              🔎
            </span>

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search dashboard modules..."
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                fontSize: "14px",
                color: "#0f172a",
                background: "transparent",
              }}
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  border: "none",
                  background: "#f1f5f9",
                  color: "#475569",
                  borderRadius: "8px",
                  width: "30px",
                  height: "30px",
                  cursor: "pointer",
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            )}
          </div>
        </section>

        {/* MODULES */}

        {sections.map((section) => {
          const items = filteredItems.filter(
            (item) => item.section === section
          );

          if (items.length === 0) {
            return null;
          }

          return (
            <section
              key={section}
              style={{
                marginBottom: "28px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "13px",
                }}
              >
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "11px",
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                  }}
                >
                  {sectionIcons[section]}
                </div>

                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "19px",
                      fontWeight: 900,
                      color: "#0f172a",
                    }}
                  >
                    {section}
                  </h2>

                  <p
                    style={{
                      margin: "2px 0 0",
                      color: "#64748b",
                      fontSize: "12px",
                    }}
                  >
                    {items.length} module
                    {items.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(225px, 1fr))",
                  gap: "14px",
                }}
              >
                {items.map((item) => {
                  const originalIndex =
                    menuItems.findIndex(
                      (menuItem) =>
                        menuItem.path === item.path
                    );

                  return (
                    <button
                      type="button"
                      key={item.path}
                      onClick={() =>
                        router.push(item.path)
                      }
                      style={{
                        border: "1px solid #e2e8f0",
                        background: "#ffffff",
                        borderRadius: "18px",
                        padding: "19px",
                        textAlign: "left",
                        cursor: "pointer",
                        boxShadow:
                          "0 5px 18px rgba(15,23,42,0.055)",
                        transition:
                          "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
                        minHeight: "175px",
                        display: "flex",
                        flexDirection: "column",
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.transform =
                          "translateY(-3px)";
                        event.currentTarget.style.boxShadow =
                          "0 12px 28px rgba(15,23,42,0.11)";
                        event.currentTarget.style.borderColor =
                          "#c7d2fe";
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.transform =
                          "translateY(0)";
                        event.currentTarget.style.boxShadow =
                          "0 5px 18px rgba(15,23,42,0.055)";
                        event.currentTarget.style.borderColor =
                          "#e2e8f0";
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "14px",
                        }}
                      >
                        <div
                          style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "14px",
                            background: "#f8fafc",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "25px",
                          }}
                        >
                          {item.icon}
                        </div>

                        <div
                          style={{
                            fontSize: "11px",
                            fontWeight: 900,
                            color: "#94a3b8",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {String(
                            originalIndex + 1
                          ).padStart(2, "0")}
                        </div>
                      </div>

                      <h3
                        style={{
                          margin: "0 0 7px",
                          color: "#0f172a",
                          fontSize: "17px",
                          lineHeight: 1.25,
                          fontWeight: 900,
                        }}
                      >
                        {item.title}
                      </h3>

                      <p
                        style={{
                          margin: 0,
                          color: "#64748b",
                          fontSize: "13px",
                          lineHeight: 1.5,
                          flex: 1,
                        }}
                      >
                        {item.description}
                      </p>

                      <div
                        style={{
                          marginTop: "15px",
                          color: "#4f46e5",
                          fontWeight: 800,
                          fontSize: "12px",
                        }}
                      >
                        Open Module →
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* NO SEARCH RESULTS */}

        {filteredItems.length === 0 && (
          <section
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "18px",
              padding: "40px 20px",
              textAlign: "center",
              marginBottom: "28px",
            }}
          >
            <div
              style={{
                fontSize: "34px",
                marginBottom: "10px",
              }}
            >
              🔎
            </div>

            <h3
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 900,
              }}
            >
              No module found
            </h3>

            <p
              style={{
                margin: "7px 0 0",
                color: "#64748b",
                fontSize: "13px",
              }}
            >
              Try another dashboard module name.
            </p>

            <button
              type="button"
              onClick={() => setSearch("")}
              style={{
                marginTop: "15px",
                border: "none",
                background: "#4f46e5",
                color: "#ffffff",
                borderRadius: "10px",
                padding: "10px 15px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Show All Modules
            </button>
          </section>
        )}

        {/* FOOTER */}

        <footer
          style={{
            textAlign: "center",
            padding: "10px 0 22px",
            color: "#94a3b8",
            fontSize: "12px",
          }}
        >
          <div
            style={{
              fontWeight: 800,
              color: "#64748b",
              marginBottom: "4px",
            }}
          >
            RACER ACADEMY
          </div>

          Teacher Control Center • 2026
        </footer>
      </div>

      <style jsx>{`
        @media (max-width: 640px) {
          main {
            padding-bottom: env(safe-area-inset-bottom);
          }
        }

        @media (max-width: 480px) {
          header {
            padding: 14px !important;
          }
        }

        @media (max-width: 380px) {
          button {
            max-width: 100%;
          }
        }
      `}</style>
    </main>
  );
}