"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const [role, setRole] = useState<"Student" | "Teacher">("Student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const students = [
    { username: "STU1001", password: "Aditya02", name: "ADITYA" },
    { username: "STU1002", password: "Anmol01", name: "ANMOL" },
    { username: "STU1003", password: "Chirag06", name: "CHIRAG" },
    { username: "STU1004", password: "Duggu10", name: "DUGGU" },
    { username: "STU1005", password: "Duggu13", name: "DUGGU" },
    { username: "STU1006", password: "Jaggu10", name: "JAGGU" },
    { username: "STU1007", password: "Mannu13", name: "MANNU" },
    { username: "STU1008", password: "Palak02", name: "PALAK" },
    { username: "STU1009", password: "Piyush01", name: "PIYUSH" },
    { username: "STU1010", password: "Prince04", name: "PRINCE" },
    { username: "STU1011", password: "Raghav20", name: "RAGHAV" },
    { username: "STU1012", password: "Sharvi04", name: "SHARVI" },
  ];

  function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");

    const enteredUsername = username.trim().toUpperCase();
    const enteredPassword = password.trim();

    /* =========================
       TEACHER LOGIN
       ========================= */

    if (
      role === "Teacher" &&
      enteredUsername === "HARSH201951" &&
      enteredPassword === "201951"
    ) {
      localStorage.setItem("teacher", "true");
      router.push("/teacher");
      return;
    }

    /* =========================
       STUDENT LOGIN
       ========================= */

    if (role === "Student") {
      const savedAccounts = JSON.parse(
        localStorage.getItem("studentAccounts") || "{}"
      );

      const savedStudent = Object.values(savedAccounts).find(
        (account: any) =>
          account?.username?.toUpperCase() === enteredUsername &&
          account?.password === enteredPassword
      ) as any;

      const originalStudent = students.find(
        (student) =>
          student.username.toUpperCase() === enteredUsername &&
          student.password === enteredPassword
      );

      const student = savedStudent || originalStudent;

      if (student) {
        localStorage.setItem("studentLoggedIn", "true");

        localStorage.setItem(
          "studentUsername",
          student.username
        );

        localStorage.setItem(
          "studentName",
          student.name || "Student"
        );

        router.push("/student/dashboard");
        return;
      }
    }

    setError("❌ Invalid username or password.");
  }

  return (
    <main className="page">

      <div className="login-card">

        {/* ICON */}

        <div className="logo">
          🎓
        </div>

        {/* TITLE */}

        <h1>
          Attendance Portal
        </h1>

        <p className="subtitle">
          Login to continue
        </p>

        {/* ROLE BUTTONS */}

        <div className="role-buttons">

          <button
            type="button"
            className={
              role === "Student"
                ? "role-button student-active"
                : "role-button"
            }
            onClick={() => {
              setRole("Student");
              setError("");
              setUsername("");
              setPassword("");
            }}
          >
            👨‍🎓 Student
          </button>

          <button
            type="button"
            className={
              role === "Teacher"
                ? "role-button teacher-active"
                : "role-button"
            }
            onClick={() => {
              setRole("Teacher");
              setError("");
              setUsername("");
              setPassword("");
            }}
          >
            👨‍🏫 Teacher
          </button>

        </div>

        {/* LOGIN FORM */}

        <form onSubmit={handleLogin}>

          {/* USERNAME */}

          <label>
            Username
          </label>

          <input
            type="text"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value)
            }
            placeholder="Username"
            autoComplete="username"
          />

          {/* PASSWORD */}

          <label>
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="Enter Password"
            autoComplete="current-password"
          />

          {/* ERROR */}

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          {/* LOGIN */}

          <button
            type="submit"
            className={
              role === "Teacher"
                ? "login-button teacher-login"
                : "login-button student-login"
            }
          >
            Login →
          </button>

        </form>

        {/* FOOTER */}

        <p className="footer">
          Student Attendance Management System
        </p>

      </div>


      <style jsx>{`

        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;

          background:
            linear-gradient(
              135deg,
              #dbeafe 0%,
              #eef2ff 50%,
              #dcfce7 100%
            );

          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }


        .login-card {
          width: 100%;
          max-width: 430px;

          background: white;

          padding: 35px;

          border-radius: 25px;

          box-shadow:
            0 25px 60px
            rgba(0, 0, 0, 0.15);
        }


        .logo {
          width: 75px;
          height: 75px;

          margin: 0 auto 15px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 20px;

          background:
            linear-gradient(
              135deg,
              #dbeafe,
              #e0e7ff
            );

          font-size: 40px;
        }


        h1 {
          text-align: center;

          margin: 10px 0;

          color: #111827;

          font-size: 30px;
        }


        .subtitle {
          text-align: center;

          color: #64748b;

          margin:
            0 0 25px;
        }


        .role-buttons {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 10px;

          margin-bottom: 22px;
        }


        .role-button {
          border: none;

          padding: 13px;

          border-radius: 10px;

          background: #e2e8f0;

          color: #334155;

          font-weight: bold;

          font-size: 15px;

          cursor: pointer;

          transition: 0.2s;
        }


        .student-active {
          background: #2563eb;

          color: white;
        }


        .teacher-active {
          background: #7c3aed;

          color: white;
        }


        label {
          display: block;

          margin-bottom: 7px;

          color: #111827;

          font-weight: bold;

          font-size: 14px;
        }


        input {
          width: 100%;

          padding: 14px;

          margin-bottom: 18px;

          border:
            2px solid #bfdbfe;

          border-radius: 10px;

          background: white;

          color: #111827;

          font-size: 16px;

          outline: none;
        }


        input:focus {
          border-color: #2563eb;

          box-shadow:
            0 0 0 3px
            rgba(37, 99, 235, 0.1);
        }


        input::placeholder {
          color: #94a3b8;
        }


        .error {
          background: #fee2e2;

          color: #991b1b;

          padding: 12px;

          border-radius: 10px;

          margin-bottom: 15px;

          font-weight: 600;

          text-align: center;
        }


        .login-button {
          width: 100%;

          padding: 15px;

          border: none;

          border-radius: 11px;

          color: white;

          font-size: 17px;

          font-weight: bold;

          cursor: pointer;

          transition: 0.2s;
        }


        .student-login {
          background:
            linear-gradient(
              135deg,
              #2563eb,
              #1d4ed8
            );
        }


        .teacher-login {
          background:
            linear-gradient(
              135deg,
              #7c3aed,
              #4f46e5
            );
        }


        .login-button:hover {
          transform: translateY(-1px);

          box-shadow:
            0 8px 20px
            rgba(0, 0, 0, 0.15);
        }


        .footer {
          text-align: center;

          color: #94a3b8;

          font-size: 12px;

          margin-top: 25px;

          margin-bottom: 0;
        }


        /* MOBILE */

        @media (max-width: 500px) {

          .page {
            padding: 15px;
          }

          .login-card {
            padding: 25px 20px;

            border-radius: 20px;
          }

          h1 {
            font-size: 26px;
          }

          .logo {
            width: 65px;
            height: 65px;

            font-size: 34px;
          }

        }

      `}</style>

    </main>
  );
}