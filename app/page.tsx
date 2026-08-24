"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const router = useRouter();

  const [role, setRole] = useState<"Student" | "Teacher">("Student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function clearSessions() {
    localStorage.removeItem("studentLoggedIn");
    localStorage.removeItem("studentUsername");
    localStorage.removeItem("studentName");
    localStorage.removeItem("studentId");

    localStorage.removeItem("teacherLoggedIn");
    localStorage.removeItem("teacher");
    localStorage.removeItem("teacherUsername");
    localStorage.removeItem("teacherName");

    sessionStorage.clear();
  }

  async function handleLogin(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");
    setLoading(true);

    const enteredUsername = username.trim().toUpperCase();
    const enteredPassword = password.trim();

    if (!enteredUsername || !enteredPassword) {
      setError("❌ Username aur password dono enter karein.");
      setLoading(false);
      return;
    }

    /* ==============================
       TEACHER LOGIN
       ============================== */

    if (role === "Teacher") {
      if (
        enteredUsername === "HARSH201951" &&
        enteredPassword === "201951"
      ) {
        clearSessions();

        localStorage.setItem(
          "teacherLoggedIn",
          "true"
        );

        localStorage.setItem(
          "teacher",
          "true"
        );

        localStorage.setItem(
          "teacherUsername",
          "HARSH201951"
        );

        localStorage.setItem(
          "teacherName",
          "Harsh"
        );

        router.replace("/teacher");
        return;
      }

      setError(
        "❌ Invalid teacher username or password."
      );

      setLoading(false);
      return;
    }

    /* ==============================
       STUDENT LOGIN
       ============================== */

    try {
      const { data: student, error: studentError } =
        await supabase
          .from("students")
          .select(
            "id, student_name, student_username, password_hash"
          )
          .eq(
            "student_username",
            enteredUsername
          )
          .maybeSingle();

      if (studentError) {
        console.error(
          "Student database error:",
          studentError
        );

        setError(
          "❌ Student login database error: " +
            studentError.message
        );

        setLoading(false);
        return;
      }

      if (!student) {
        setError(
          "❌ Student username not found."
        );

        setLoading(false);
        return;
      }

      let validPassword = false;

      /* ==============================
         TRY RPC LOGIN
         ============================== */

      const { data: rpcData, error: rpcError } =
        await supabase.rpc("student_login", {
          p_username: enteredUsername,
          p_password: enteredPassword,
        });

      if (!rpcError && rpcData) {
        if (Array.isArray(rpcData)) {
          validPassword = rpcData.length > 0;
        } else {
          validPassword = true;
        }
      }

      /* ==============================
         FALLBACK PASSWORD CHECK
         ============================== */

      if (!validPassword) {
        if (
          String(student.password_hash) ===
          enteredPassword
        ) {
          validPassword = true;
        }
      }

      if (!validPassword) {
        setError(
          "❌ Invalid student username or password."
        );

        setLoading(false);
        return;
      }

      /* ==============================
         STUDENT SESSION ONLY
         ============================== */

      clearSessions();

      localStorage.setItem(
        "studentLoggedIn",
        "true"
      );

      localStorage.setItem(
        "studentUsername",
        student.student_username
      );

      localStorage.setItem(
        "studentName",
        student.student_name || "Student"
      );

      localStorage.setItem(
        "studentId",
        String(student.id)
      );

      router.replace("/student/dashboard");
    } catch (err: any) {
      console.error("Login error:", err);

      setError(
        err?.message ||
          "❌ Login failed. Please try again."
      );

      setLoading(false);
    }
  }

  function selectRole(
    selectedRole: "Student" | "Teacher"
  ) {
    setRole(selectedRole);
    setUsername("");
    setPassword("");
    setError("");
  }

  return (
    <main className="page">
      <div className="login-card">

        <div className="logo">
          🎓
        </div>

        <h1>Attendance Portal</h1>

        <p className="subtitle">
          Login to continue
        </p>

        <div className="role-buttons">

          <button
            type="button"
            className={
              role === "Student"
                ? "role-button student-active"
                : "role-button"
            }
            onClick={() =>
              selectRole("Student")
            }
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
            onClick={() =>
              selectRole("Teacher")
            }
          >
            👨‍🏫 Teacher
          </button>

        </div>

        <form onSubmit={handleLogin}>

          <label>Username</label>

          <input
            type="text"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value)
            }
            placeholder={
              role === "Student"
                ? "STU1001"
                : "HARSH201951"
            }
            autoComplete="username"
            disabled={loading}
          />

          <label>Password</label>

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="Enter Password"
            autoComplete="current-password"
            disabled={loading}
          />

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className={
              role === "Teacher"
                ? "login-button teacher-login"
                : "login-button student-login"
            }
            disabled={loading}
          >
            {loading
              ? "⏳ Checking..."
              : "Login →"}
          </button>

        </form>

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
          margin: 0 0 25px;
        }

        .role-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
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
          border: 2px solid #bfdbfe;
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

        .footer {
          text-align: center;
          color: #94a3b8;
          font-size: 12px;
          margin-top: 25px;
          margin-bottom: 0;
        }

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