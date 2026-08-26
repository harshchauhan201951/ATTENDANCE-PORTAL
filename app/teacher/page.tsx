"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function TeacherControlCenter() {
  const router = useRouter();

  const [teacherName, setTeacherName] =
    useState("Teacher");

  const [checkingLogin, setCheckingLogin] =
    useState(true);

  useEffect(() => {
    const newRole =
      localStorage.getItem("attendance_role");

    const newUsername =
      localStorage.getItem("attendance_username");

    const oldLoggedIn =
      localStorage.getItem("teacherLoggedIn");

    const oldTeacherName =
      localStorage.getItem("teacherName");

    const oldTeacherUsername =
      localStorage.getItem("teacherUsername");

    const newTeacherLogin =
      newRole === "Teacher" &&
      !!newUsername;

    const oldTeacherLogin =
      oldLoggedIn === "true";

    if (
      !newTeacherLogin &&
      !oldTeacherLogin
    ) {
      router.replace("/");
      return;
    }

    const name =
      oldTeacherName ||
      oldTeacherUsername ||
      newUsername ||
      "Teacher";

    setTeacherName(name);

    /*
     * Keep compatibility with existing
     * teacher pages.
     */
    localStorage.setItem(
      "teacherLoggedIn",
      "true"
    );

    localStorage.setItem(
      "teacherUsername",
      newUsername ||
        oldTeacherUsername ||
        ""
    );

    localStorage.setItem(
      "teacherName",
      name
    );

    localStorage.setItem(
      "teacher",
      name
    );

    /*
     * Remove student session.
     */
    localStorage.removeItem(
      "studentLoggedIn"
    );

    localStorage.removeItem(
      "studentUsername"
    );

    localStorage.removeItem(
      "studentName"
    );

    localStorage.removeItem(
      "studentId"
    );

    setCheckingLogin(false);
  }, [router]);

  function logout() {
    /*
     * New login session
     */
    localStorage.removeItem(
      "attendance_role"
    );

    localStorage.removeItem(
      "attendance_username"
    );

    localStorage.removeItem(
      "attendance_teacher_id"
    );

    /*
     * Old login session
     */
    localStorage.removeItem(
      "teacherLoggedIn"
    );

    localStorage.removeItem(
      "teacher"
    );

    localStorage.removeItem(
      "teacherUsername"
    );

    localStorage.removeItem(
      "teacherName"
    );

    router.replace("/");
  }

  const options = [
    {
      title: "Dashboard",
      icon: "📊",
      description:
        "View attendance overview",
      path: "/teacher/dashboard",
    },
    {
      title: "Students",
      icon: "👨‍🎓",
      description:
        "View and manage students",
      path: "/teacher/students",
    },
    {
      title: "Attendance",
      icon: "✅",
      description:
        "Mark today's attendance",
      path: "/teacher/attendance",
    },
    {
      title: "Attendance History",
      icon: "📋",
      description:
        "View previous attendance",
      path: "/teacher/attendance-history",
    },
    {
      title: "Calendar",
      icon: "📅",
      description:
        "View attendance calendar",
      path: "/teacher/calendar",
    },
    {
      title: "Fees",
      icon: "💰",
      description:
        "Manage student fees",
      path: "/teacher/fees",
    },
    {
      title: "Reports",
      icon: "📈",
      description:
        "View attendance reports",
      path: "/teacher/reports",
    },
    {
      title: "Settings",
      icon: "⚙️",
      description:
        "Manage teacher settings",
      path: "/teacher/settings",
    },
  ];

  if (checkingLogin) {
    return (
      <main className="loading-page">
        <div className="loading-box">
          <div className="loading-icon">
            👨‍🏫
          </div>

          <h2>
            Loading Teacher Control Center...
          </h2>

          <p>
            Please wait...
          </p>
        </div>

        <style jsx>{`
          .loading-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;

            background:
              linear-gradient(
                135deg,
                #eef2ff 0%,
                #f8fafc 50%,
                #ecfdf5 100%
              );

            font-family:
              Arial,
              Helvetica,
              sans-serif;
          }

          .loading-box {
            width: 100%;
            max-width: 420px;

            padding: 35px 25px;

            background: white;

            border-radius: 22px;

            text-align: center;

            box-shadow:
              0 15px 40px
              rgba(0, 0, 0, 0.08);
          }

          .loading-icon {
            font-size: 50px;
            margin-bottom: 15px;
          }

          h2 {
            margin: 0;
            color: #111827;
            font-size: 20px;
          }

          p {
            margin: 8px 0 0;
            color: #64748b;
            font-size: 14px;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="container">

        {/* HEADER */}

        <header className="header">
          <div>
            <div className="brand">
              📚 Attendance Portal
            </div>

            <h1>
              Teacher Control Center
            </h1>

            <p className="welcome">
              Welcome back,{" "}
              <strong>
                {teacherName}
              </strong>{" "}
              👋
            </p>
          </div>

          <button
            className="logout-button"
            onClick={logout}
          >
            🚪 Logout
          </button>
        </header>

        {/* CONTROL CENTER */}

        <section className="control-section">

          <div className="section-heading">
            <div>
              <h2>
                🛠️ Teacher Options
              </h2>

              <p>
                Select an option to continue
              </p>
            </div>
          </div>

          <div className="grid">
            {options.map((option) => (
              <button
                key={option.path}
                className="card"
                onClick={() =>
                  router.push(option.path)
                }
              >
                <div className="icon">
                  {option.icon}
                </div>

                <div className="card-content">
                  <h2>
                    {option.title}
                  </h2>

                  <p>
                    {option.description}
                  </p>
                </div>

                <div className="arrow">
                  →
                </div>
              </button>
            ))}
          </div>

        </section>

        {/* INFO */}

        <div className="info-box">
          <span className="info-icon">
            💡
          </span>

          <div>
            <strong>
              Teacher Control Center
            </strong>

            <p>
              Login ke baad yahan se aap
              apni zarurat ke according
              koi bhi option open kar sakte hain.
            </p>
          </div>
        </div>

        {/* FOOTER */}

        <footer>
          Teacher Attendance Management System
        </footer>

      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;

          padding:
            25px 20px 40px;

          background:
            linear-gradient(
              135deg,
              #eef2ff 0%,
              #f8fafc 45%,
              #ecfdf5 100%
            );

          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .container {
          width: 100%;

          max-width: 1100px;

          margin: 0 auto;
        }

        .header {
          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 20px;

          margin-bottom: 25px;

          padding: 25px;

          background: white;

          border-radius: 22px;

          box-shadow:
            0 15px 40px
            rgba(0, 0, 0, 0.08);
        }

        .brand {
          color: #4f46e5;

          font-size: 18px;

          font-weight: 800;

          margin-bottom: 8px;
        }

        h1 {
          margin: 0;

          color: #111827;

          font-size: 32px;
        }

        .welcome {
          margin:
            8px 0 0;

          color: #64748b;

          font-size: 15px;
        }

        .welcome strong {
          color: #111827;
        }

        .logout-button {
          border: none;

          background: #fee2e2;

          color: #b91c1c;

          padding:
            12px 18px;

          border-radius: 11px;

          font-size: 14px;

          font-weight: 700;

          cursor: pointer;

          white-space: nowrap;
        }

        .logout-button:hover {
          background: #fecaca;
        }

        .control-section {
          background: white;

          border-radius: 22px;

          padding: 25px;

          box-shadow:
            0 10px 30px
            rgba(0, 0, 0, 0.06);
        }

        .section-heading {
          margin-bottom: 22px;
        }

        .section-heading h2 {
          margin: 0;

          color: #111827;

          font-size: 23px;
        }

        .section-heading p {
          margin:
            6px 0 0;

          color: #64748b;

          font-size: 14px;
        }

        .grid {
          display: grid;

          grid-template-columns:
            repeat(4, 1fr);

          gap: 18px;
        }

        .card {
          position: relative;

          min-height: 175px;

          padding: 22px;

          border:
            2px solid #e5e7eb;

          border-radius: 18px;

          background: white;

          text-align: left;

          cursor: pointer;

          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            border-color 0.2s ease;

          box-shadow:
            0 8px 25px
            rgba(0, 0, 0, 0.05);
        }

        .card:hover {
          transform:
            translateY(-4px);

          border-color:
            #c7d2fe;

          box-shadow:
            0 15px 35px
            rgba(0, 0, 0, 0.10);
        }

        .icon {
          width: 55px;

          height: 55px;

          display: flex;

          align-items: center;

          justify-content: center;

          margin-bottom: 18px;

          border-radius: 15px;

          background: #eef2ff;

          font-size: 28px;
        }

        .card-content h2 {
          margin:
            0 0 7px;

          color: #111827;

          font-size: 18px;
        }

        .card-content p {
          margin: 0;

          color: #64748b;

          font-size: 13px;

          line-height: 1.5;
        }

        .arrow {
          position: absolute;

          right: 18px;

          bottom: 18px;

          color: #6366f1;

          font-size: 22px;

          font-weight: bold;
        }

        .info-box {
          display: flex;

          align-items: center;

          gap: 15px;

          margin-top: 22px;

          padding: 18px 20px;

          background: white;

          border:
            1px solid #e2e8f0;

          border-radius: 16px;

          color: #334155;
        }

        .info-icon {
          font-size: 28px;
        }

        .info-box strong {
          color: #111827;

          font-size: 14px;
        }

        .info-box p {
          margin:
            5px 0 0;

          color: #64748b;

          font-size: 12px;

          line-height: 1.5;
        }

        footer {
          text-align: center;

          margin-top: 30px;

          color: #94a3b8;

          font-size: 12px;
        }

        @media (max-width: 900px) {
          .grid {
            grid-template-columns:
              repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .page {
            padding:
              15px 12px 30px;
          }

          .header {
            padding: 20px;

            flex-direction: column;

            align-items: flex-start;
          }

          h1 {
            font-size: 27px;
          }

          .logout-button {
            width: 100%;
          }

          .grid {
            grid-template-columns: 1fr;

            gap: 14px;
          }

          .card {
            min-height: 140px;
          }

          .info-box {
            align-items: flex-start;
          }
        }
      `}</style>
    </main>
  );
}