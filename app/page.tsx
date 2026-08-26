"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Role = "Student" | "Teacher";

export default function Home() {
  const router = useRouter();

  const [role, setRole] = useState<Role>("Student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function clearSessions() {
    const localKeys = [
      "attendance_role",
      "attendance_username",
      "attendance_teacher_id",

      "studentLoggedIn",
      "studentId",
      "studentUsername",
      "student_username",
      "studentName",
      "student_name",

      "teacherLoggedIn",
      "teacher",
      "teacherUsername",
      "teacher_username",
      "teacherName",
      "teacher_name",
    ];

    localKeys.forEach((key) => {
      localStorage.removeItem(key);
    });

    sessionStorage.clear();
  }

  function selectRole(selectedRole: Role) {
    setRole(selectedRole);
    setUsername("");
    setPassword("");
    setError("");
  }

  async function handleLogin(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (loading) return;

    setError("");

    const enteredUsername = username.trim().toUpperCase();
    const enteredPassword = password.trim();

    if (!enteredUsername || !enteredPassword) {
      setError("Username aur password dono enter karein.");
      return;
    }

    setLoading(true);

    /*
     * ================================
     * TEACHER LOGIN
     * ================================
     */

    if (role === "Teacher") {
      if (
        enteredUsername === "HARSH201951" &&
        enteredPassword === "201951"
      ) {
        clearSessions();

        localStorage.setItem(
          "attendance_role",
          "Teacher"
        );

        localStorage.setItem(
          "attendance_username",
          "HARSH201951"
        );

        localStorage.setItem(
          "attendance_teacher_id",
          "HARSH201951"
        );

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
          "teacher_username",
          "HARSH201951"
        );

        localStorage.setItem(
          "teacherName",
          "Harsh"
        );

        localStorage.setItem(
          "teacher_name",
          "Harsh"
        );

        router.replace("/teacher");
        return;
      }

      setError(
        "Invalid teacher username or password."
      );

      setLoading(false);
      return;
    }

    /*
     * ================================
     * STUDENT LOGIN
     * ================================
     */

    try {
      const {
        data: student,
        error: studentError,
      } = await supabase
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
          "Student login database error: " +
            studentError.message
        );

        setLoading(false);
        return;
      }

      if (!student) {
        setError(
          "Student username not found."
        );

        setLoading(false);
        return;
      }

      let validPassword = false;

      /*
       * Existing PostgreSQL login function
       */

      const {
        data: rpcData,
        error: rpcError,
      } = await supabase.rpc(
        "student_login",
        {
          p_username: enteredUsername,
          p_password: enteredPassword,
        }
      );

      if (!rpcError && rpcData) {
        if (Array.isArray(rpcData)) {
          validPassword = rpcData.length > 0;
        } else {
          validPassword = true;
        }
      }

      /*
       * Fallback for direct password storage
       */

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
          "Invalid student username or password."
        );

        setLoading(false);
        return;
      }

      /*
       * ================================
       * STUDENT SESSION
       * ================================
       */

      clearSessions();

      localStorage.setItem(
        "studentLoggedIn",
        "true"
      );

      localStorage.setItem(
        "studentId",
        String(student.id)
      );

      localStorage.setItem(
        "studentUsername",
        student.student_username
      );

      localStorage.setItem(
        "student_username",
        student.student_username
      );

      localStorage.setItem(
        "studentName",
        student.student_name || "Student"
      );

      localStorage.setItem(
        "student_name",
        student.student_name || "Student"
      );

      sessionStorage.setItem(
        "student_username",
        student.student_username
      );

      sessionStorage.setItem(
        "student_name",
        student.student_name || "Student"
      );

      router.replace("/student/dashboard");
    } catch (err) {
      console.error(
        "Login error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Login failed. Please try again."
      );

      setLoading(false);
    }
  }

  return (
    <main className="page">
      <div className="background-grid" />
      <div className="glow glow-one" />
      <div className="glow glow-two" />

      <div className="login-wrapper">

        {/* BRAND */}
        <div className="brand">

          <div className="brand-logo">
            <span>R</span>
          </div>

          <div className="brand-text">
            <h1>RACER ACADEMY</h1>
            <p>ACADEMIC MANAGEMENT SYSTEM</p>
          </div>

        </div>

        {/* LOGIN CARD */}
        <section className="login-card">

          <div className="card-top-line" />

          <div className="academy-icon">
            <div className="icon-ring">
              <span>R</span>
            </div>
          </div>

          <div className="heading">

            <div className="mini-label">
              SECURE ACCESS
            </div>

            <h2>
              Welcome Back
            </h2>

            <p>
              Login to continue
            </p>

          </div>

          {/* ROLE SWITCH */}
          <div className="role-switch">

            <button
              type="button"
              className={
                role === "Student"
                  ? "role-button active"
                  : "role-button"
              }
              onClick={() =>
                selectRole("Student")
              }
              disabled={loading}
            >
              <span className="role-icon">
                👨‍🎓
              </span>

              <span>
                Student Login
              </span>
            </button>

            <button
              type="button"
              className={
                role === "Teacher"
                  ? "role-button active teacher"
                  : "role-button"
              }
              onClick={() =>
                selectRole("Teacher")
              }
              disabled={loading}
            >
              <span className="role-icon">
                👨‍🏫
              </span>

              <span>
                Teacher Login
              </span>
            </button>

          </div>

          {/* SELECTED ROLE */}
          <div className="selected-role">

            <span className="status-dot" />

            {role === "Student"
              ? "Student Login"
              : "Teacher Login"}

          </div>

          {/* FORM */}
          <form
            onSubmit={handleLogin}
            className="login-form"
          >

            <div className="input-group">

              <label>
                Username
              </label>

              <div className="input-wrapper">

                <span className="input-icon">
                  ◉
                </span>

                <input
                  type="text"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value)
                  }
                  placeholder={
                    role === "Teacher"
                      ? "Enter teacher username"
                      : "Enter student username"
                  }
                  autoComplete="username"
                  disabled={loading}
                />

              </div>

            </div>

            <div className="input-group">

              <label>
                Password
              </label>

              <div className="input-wrapper">

                <span className="input-icon">
                  ◆
                </span>

                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter password"
                  autoComplete="current-password"
                  disabled={loading}
                />

              </div>

            </div>

            {error && (
              <div className="error">

                <span>!</span>

                <p>{error}</p>

              </div>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >

              {loading ? (
                <>
                  <span className="spinner" />
                  Signing in...
                </>
              ) : (
                <>
                  <span>
                    Login as{" "}
                    {role === "Student"
                      ? "Student"
                      : "Teacher"}
                  </span>

                  <strong>
                    →
                  </strong>
                </>
              )}

            </button>

          </form>

          {/* SECURITY */}
          <div className="security">

            <span className="security-icon">
              🔒
            </span>

            <span>
              Secure Login
            </span>

            <i />

            <span>
              Private Access
            </span>

          </div>

        </section>

        {/* FOOTER */}
        <footer>

          <div>
            RACER ACADEMY
          </div>

          <span>
            •
          </span>

          <div>
            Secure Academic Portal
          </div>

          <span>
            •
          </span>

          <div>
            © 2026
          </div>

        </footer>

      </div>

      <style jsx>{`

        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;

          display: flex;
          justify-content: center;
          align-items: center;

          background:
            radial-gradient(
              circle at 15% 15%,
              rgba(99, 102, 241, 0.16),
              transparent 30%
            ),
            radial-gradient(
              circle at 85% 85%,
              rgba(14, 165, 233, 0.13),
              transparent 30%
            ),
            linear-gradient(
              135deg,
              #050814,
              #0b1020 50%,
              #050812
            );

          color: #f8fafc;

          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;

          padding: 30px 20px;
        }

        .background-grid {
          position: fixed;
          inset: 0;

          pointer-events: none;

          opacity: 0.25;

          background-image:
            linear-gradient(
              rgba(148, 163, 184, 0.035) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(148, 163, 184, 0.035) 1px,
              transparent 1px
            );

          background-size: 42px 42px;

          mask-image:
            linear-gradient(
              to bottom,
              black,
              transparent
            );
        }

        .glow {
          position: fixed;

          width: 330px;
          height: 330px;

          border-radius: 50%;

          filter: blur(100px);

          opacity: 0.13;

          pointer-events: none;
        }

        .glow-one {
          background: #6366f1;
          top: -180px;
          left: -140px;
        }

        .glow-two {
          background: #06b6d4;
          bottom: -180px;
          right: -120px;
        }

        .login-wrapper {
          width: min(100%, 470px);

          position: relative;
          z-index: 2;
        }

        /* BRAND */

        .brand {
          display: flex;
          align-items: center;
          justify-content: center;

          gap: 13px;

          margin-bottom: 28px;
        }

        .brand-logo {
          width: 48px;
          height: 48px;

          border-radius: 15px;

          padding: 1px;

          display: grid;
          place-items: center;

          background:
            linear-gradient(
              135deg,
              #818cf8,
              #38bdf8
            );

          box-shadow:
            0 12px 35px
              rgba(99, 102, 241, 0.25);
        }

        .brand-logo span {
          width: 100%;
          height: 100%;

          display: grid;
          place-items: center;

          border-radius: 14px;

          background: #0a1020;

          font-size: 22px;
          font-weight: 950;

          letter-spacing: -1px;
        }

        .brand-text {
          text-align: left;
        }

        .brand-text h1 {
          margin: 0;

          font-size: 20px;

          font-weight: 950;

          letter-spacing: 2.2px;

          background:
            linear-gradient(
              90deg,
              #ffffff,
              #a5b4fc,
              #67e8f9
            );

          -webkit-background-clip: text;
          background-clip: text;

          color: transparent;
        }

        .brand-text p {
          margin: 4px 0 0;

          color: #64748b;

          font-size: 7px;

          letter-spacing: 2px;

          font-weight: 800;
        }

        /* CARD */

        .login-card {
          position: relative;

          padding: 36px 34px 30px;

          border-radius: 28px;

          border: 1px solid
            rgba(148, 163, 184, 0.13);

          background:
            linear-gradient(
              145deg,
              rgba(20, 28, 52, 0.95),
              rgba(8, 14, 29, 0.96)
            );

          backdrop-filter: blur(25px);

          box-shadow:
            0 35px 100px
              rgba(0, 0, 0, 0.4),
            inset 0 1px 0
              rgba(255, 255, 255, 0.04);
        }

        .card-top-line {
          position: absolute;

          top: 0;
          left: 15%;

          width: 70%;
          height: 1px;

          background:
            linear-gradient(
              90deg,
              transparent,
              #818cf8,
              #38bdf8,
              transparent
            );

          opacity: 0.8;
        }

        .academy-icon {
          display: flex;
          justify-content: center;

          margin-bottom: 18px;
        }

        .icon-ring {
          width: 72px;
          height: 72px;

          border-radius: 23px;

          display: grid;
          place-items: center;

          position: relative;

          background:
            linear-gradient(
              145deg,
              rgba(99, 102, 241, 0.25),
              rgba(14, 165, 233, 0.1)
            );

          border: 1px solid
            rgba(129, 140, 248, 0.28);

          box-shadow:
            0 0 45px
              rgba(99, 102, 241, 0.14);
        }

        .icon-ring::before {
          content: "";

          position: absolute;

          inset: 7px;

          border-radius: 18px;

          border: 1px dashed
            rgba(129, 140, 248, 0.35);

          animation: rotate 12s linear infinite;
        }

        .icon-ring span {
          font-size: 27px;

          font-weight: 950;

          background:
            linear-gradient(
              135deg,
              #ffffff,
              #818cf8,
              #67e8f9
            );

          -webkit-background-clip: text;
          background-clip: text;

          color: transparent;
        }

        /* HEADING */

        .heading {
          text-align: center;

          margin-bottom: 25px;
        }

        .mini-label {
          color: #818cf8;

          font-size: 8px;

          font-weight: 900;

          letter-spacing: 2.4px;

          margin-bottom: 8px;
        }

        .heading h2 {
          margin: 0;

          font-size: 31px;

          letter-spacing: -1.3px;

          font-weight: 850;
        }

        .heading p {
          margin: 7px 0 0;

          color: #718096;

          font-size: 12px;
        }

        /* ROLE */

        .role-switch {
          display: grid;

          grid-template-columns: 1fr 1fr;

          gap: 9px;

          padding: 5px;

          border-radius: 16px;

          background: rgba(2, 6, 23, 0.55);

          border: 1px solid
            rgba(148, 163, 184, 0.08);

          margin-bottom: 13px;
        }

        .role-button {
          border: 0;

          min-height: 53px;

          border-radius: 12px;

          background: transparent;

          color: #64748b;

          display: flex;

          align-items: center;

          justify-content: center;

          gap: 8px;

          font-size: 11px;

          font-weight: 800;

          cursor: pointer;

          transition: 0.25s ease;
        }

        .role-button:hover {
          color: #cbd5e1;

          background:
            rgba(255, 255, 255, 0.035);
        }

        .role-button.active {
          color: #ffffff;

          background:
            linear-gradient(
              135deg,
              rgba(99, 102, 241, 0.25),
              rgba(56, 189, 248, 0.1)
            );

          border: 1px solid
            rgba(129, 140, 248, 0.2);

          box-shadow:
            0 8px 25px
              rgba(99, 102, 241, 0.08);
        }

        .role-button:disabled {
          opacity: 0.6;

          cursor: not-allowed;
        }

        .role-icon {
          font-size: 17px;
        }

        /* SELECTED */

        .selected-role {
          display: flex;

          justify-content: center;

          align-items: center;

          gap: 7px;

          color: #94a3b8;

          font-size: 9px;

          font-weight: 800;

          letter-spacing: 0.8px;

          margin-bottom: 23px;
        }

        .status-dot {
          width: 6px;
          height: 6px;

          border-radius: 50%;

          background: #22c55e;

          box-shadow:
            0 0 12px
              rgba(34, 197, 94, 0.8);
        }

        /* FORM */

        .login-form {
          display: flex;

          flex-direction: column;

          gap: 17px;
        }

        .input-group {
          display: flex;

          flex-direction: column;

          gap: 7px;
        }

        .input-group label {
          color: #94a3b8;

          font-size: 9px;

          font-weight: 850;

          letter-spacing: 1.2px;

          text-transform: uppercase;
        }

        .input-wrapper {
          position: relative;
        }

        .input-icon {
          position: absolute;

          left: 15px;
          top: 50%;

          transform: translateY(-50%);

          color: #6366f1;

          font-size: 12px;

          z-index: 2;
        }

        .input-wrapper input {
          width: 100%;

          height: 52px;

          border-radius: 13px;

          border: 1px solid
            rgba(148, 163, 184, 0.12);

          outline: none;

          background:
            rgba(2, 6, 23, 0.58);

          color: #f8fafc;

          padding:
            0 15px 0 42px;

          font-size: 13px;

          transition: 0.25s ease;
        }

        .input-wrapper input::placeholder {
          color: #475569;
        }

        .input-wrapper input:focus {
          border-color:
            rgba(129, 140, 248, 0.55);

          background:
            rgba(15, 23, 42, 0.72);

          box-shadow:
            0 0 0 3px
              rgba(99, 102, 241, 0.08);
        }

        .input-wrapper input:disabled {
          opacity: 0.65;

          cursor: not-allowed;
        }

        /* ERROR */

        .error {
          display: flex;

          align-items: center;

          gap: 9px;

          padding: 11px 13px;

          border-radius: 11px;

          border: 1px solid
            rgba(248, 113, 113, 0.2);

          background:
            rgba(127, 29, 29, 0.15);

          color: #fca5a5;

          font-size: 10px;

          line-height: 1.4;
        }

        .error span {
          width: 20px;
          height: 20px;

          display: grid;
          place-items: center;

          border-radius: 50%;

          background:
            rgba(248, 113, 113, 0.15);

          font-weight: 900;
        }

        .error p {
          margin: 0;
        }

        /* LOGIN BUTTON */

        .login-button {
          height: 54px;

          border: 0;

          border-radius: 14px;

          display: flex;

          align-items: center;

          justify-content: space-between;

          padding: 0 18px 0 20px;

          color: white;

          font-size: 12px;

          font-weight: 850;

          cursor: pointer;

          background:
            linear-gradient(
              100deg,
              #4f46e5,
              #6366f1 48%,
              #0891b2
            );

          box-shadow:
            0 14px 35px
              rgba(79, 70, 229, 0.23);

          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease,
            opacity 0.25s ease;
        }

        .login-button strong {
          width: 30px;
          height: 30px;

          display: grid;
          place-items: center;

          border-radius: 9px;

          background:
            rgba(255, 255, 255, 0.12);

          font-size: 17px;
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-2px);

          box-shadow:
            0 18px 45px
              rgba(79, 70, 229, 0.32);
        }

        .login-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-button:disabled {
          opacity: 0.65;

          cursor: not-allowed;
        }

        .spinner {
          width: 17px;
          height: 17px;

          border-radius: 50%;

          border:
            2px solid
            rgba(255, 255, 255, 0.3);

          border-top-color: white;

          animation:
            spin 0.8s linear infinite;
        }

        /* SECURITY */

        .security {
          display: flex;

          align-items: center;

          justify-content: center;

          gap: 8px;

          margin-top: 22px;

          color: #475569;

          font-size: 8px;

          font-weight: 750;

          letter-spacing: 0.7px;
        }

        .security-icon {
          font-size: 10px;
        }

        .security i {
          width: 3px;
          height: 3px;

          border-radius: 50%;

          background: #334155;
        }

        /* FOOTER */

        footer {
          display: flex;

          justify-content: center;

          align-items: center;

          flex-wrap: wrap;

          gap: 9px;

          margin-top: 22px;

          color: #334155;

          font-size: 8px;

          font-weight: 700;

          letter-spacing: 0.5px;
        }

        footer span {
          color: #4f46e5;
        }

        /* ANIMATIONS */

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        /* MOBILE */

        @media (max-width: 520px) {

          .page {
            padding: 20px 13px;
          }

          .brand {
            margin-bottom: 22px;
          }

          .brand-logo {
            width: 42px;
            height: 42px;
            border-radius: 13px;
          }

          .brand-logo span {
            border-radius: 12px;
            font-size: 19px;
          }

          .brand-text h1 {
            font-size: 16px;
            letter-spacing: 1.7px;
          }

          .brand-text p {
            font-size: 6px;
            letter-spacing: 1.4px;
          }

          .login-card {
            padding: 29px 20px 24px;
            border-radius: 23px;
          }

          .heading h2 {
            font-size: 27px;
          }

          .role-button {
            min-height: 50px;
            font-size: 10px;
          }

          .role-icon {
            font-size: 15px;
          }

          .input-wrapper input {
            height: 50px;
          }

          footer {
            font-size: 7px;
          }
        }

        @media (max-width: 370px) {

          .brand-text h1 {
            font-size: 14px;
          }

          .login-card {
            padding-left: 16px;
            padding-right: 16px;
          }

          .role-switch {
            gap: 4px;
          }

          .role-button {
            font-size: 9px;
          }
        }

      `}</style>
    </main>
  );
}