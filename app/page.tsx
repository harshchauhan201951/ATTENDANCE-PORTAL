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

    if (loading) {
      return;
    }

    setError("");

    const enteredUsername =
      username.trim().toUpperCase();

    const enteredPassword =
      password.trim();

    if (!enteredUsername || !enteredPassword) {
      setError(
        "Username aur password dono enter karein."
      );
      return;
    }

    setLoading(true);

    /*
     * ========================================
     * TEACHER LOGIN
     * ========================================
     */

    if (role === "Teacher") {
      if (
        enteredUsername === "HARSH201951" &&
        enteredPassword === "201951"
      ) {
        clearSessions();

        /*
         * New teacher session
         */
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

        /*
         * Compatibility with existing
         * teacher pages
         */
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
     * ========================================
     * STUDENT LOGIN
     * ========================================
     */

    try {
      /*
       * First find the student account.
       */
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
       * Try the existing student_login
       * PostgreSQL function first.
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
          validPassword =
            rpcData.length > 0;
        } else {
          validPassword = true;
        }
      }

      /*
       * Fallback for accounts where the
       * password_hash column contains the
       * password directly.
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
       * ========================================
       * STUDENT SESSION
       * ========================================
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
        student.student_name ||
          "Student"
      );

      localStorage.setItem(
        "student_name",
        student.student_name ||
          "Student"
      );

      sessionStorage.setItem(
        "student_username",
        student.student_username
      );

      sessionStorage.setItem(
        "student_name",
        student.student_name ||
          "Student"
      );

      router.replace(
        "/student/dashboard"
      );
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
      <div className="login-card">

        <div className="logo">
          🎓
        </div>

        <h1>
          Attendance Portal
        </h1>

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
            disabled={loading}
          >
            👨‍🎓 Student Login
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
            disabled={loading}
          >
            👨‍🏫 Teacher Login
          </button>

        </div>

        <div className="selected-role">
          {role === "Student"
            ? "Student Login"
            : "Teacher Login"}
        </div>

        <form
          onSubmit={handleLogin}
          className="login-form"
        >

          <label>
            Username
          </label>

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

          <label>
            Password
          </label>

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

          {error && (
            <div className="error">
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading
              ? "Logging in..."
              : `Login as ${role}`}
          </button>

        </form>

        <div className="footer">
          Attendance Portal • Secure Login
        </div>

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
          padding: 24px;
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

        .login-card {
          width: 100%;
          max-width: 460px;
          background: #ffffff;
          border-radius: 24px;
          padding: 34px;
          box-shadow:
            0 20px 50px
            rgba(15, 23, 42, 0.12);
        }

        .logo {
          width: 72px;
          height: 72px;
          margin: 0 auto 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 20px;
          background:
            linear-gradient(
              135deg,
              #4f46e5,
              #2563eb
            );
          font-size: 38px;
        }

        h1 {
          margin: 0;
          text-align: center;
          color: #0f172a;
          font-size: 30px;
          font-weight: 900;
        }

        .subtitle {
          margin: 8px 0 24px;
          text-align: center;
          color: #64748b;
          font-size: 15px;
        }

        .role-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 18px;
        }

        .role-button {
          border: 2px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          padding: 13px 10px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .role-button:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .role-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .student-active {
          background: #eff6ff;
          border-color: #2563eb;
          color: #1d4ed8;
        }

        .teacher-active {
          background: #ecfdf5;
          border-color: #16a34a;
          color: #15803d;
        }

        .selected-role {
          text-align: center;
          margin-bottom: 20px;
          color: #0f172a;
          font-size: 18px;
          font-weight: 900;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        label {
          color: #334155;
          font-size: 14px;
          font-weight: 800;
          margin-top: 4px;
        }

        input {
          width: 100%;
          padding: 14px;
          border: 2px solid #cbd5e1;
          border-radius: 12px;
          outline: none;
          background: #ffffff;
          color: #0f172a;
          font-size: 15px;
          font-weight: 600;
        }

        input:focus {
          border-color: #4f46e5;
          box-shadow:
            0 0 0 3px
            rgba(79, 70, 229, 0.1);
        }

        input:disabled {
          background: #f8fafc;
        }

        .error {
          margin-top: 6px;
          padding: 12px;
          border-radius: 10px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          font-size: 14px;
          font-weight: 700;
        }

        .login-button {
          width: 100%;
          margin-top: 10px;
          padding: 15px;
          border: none;
          border-radius: 12px;
          background:
            linear-gradient(
              135deg,
              #4f46e5,
              #2563eb
            );
          color: #ffffff;
          font-size: 16px;
          font-weight: 900;
          cursor: pointer;
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .login-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .footer {
          margin-top: 24px;
          text-align: center;
          color: #94a3b8;
          font-size: 12px;
          font-weight: 600;
        }

        @media (max-width: 480px) {
          .page {
            padding: 14px;
          }

          .login-card {
            padding: 24px 18px;
            border-radius: 20px;
          }

          h1 {
            font-size: 25px;
          }

          .role-buttons {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}