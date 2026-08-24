"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type StudentAccount = {
  username: string;
  password: string;
  name: string;
};

const students: StudentAccount[] = [
  {
    username: "STU1001",
    password: "Aditya02",
    name: "ADITYA",
  },
  {
    username: "STU1002",
    password: "Anmol01",
    name: "ANMOL",
  },
  {
    username: "STU1003",
    password: "Chirag06",
    name: "CHIRAG",
  },
  {
    username: "STU1004",
    password: "Duggu10",
    name: "DUGGU",
  },
  {
    username: "STU1005",
    password: "Duggu13",
    name: "DUGGU",
  },
  {
    username: "STU1006",
    password: "Jaggu10",
    name: "JAGGU",
  },
  {
    username: "STU1007",
    password: "Mannu13",
    name: "MANNU",
  },
  {
    username: "STU1008",
    password: "Palak02",
    name: "PALAK",
  },
  {
    username: "STU1009",
    password: "Piyush01",
    name: "PIYUSH",
  },
  {
    username: "STU1010",
    password: "Prince04",
    name: "PRINCE",
  },
  {
    username: "STU1011",
    password: "Raghav20",
    name: "RAGHAV",
  },
  {
    username: "STU1012",
    password: "Sharvi04",
    name: "SHARVI",
  },
];

export default function Home() {
  const router = useRouter();

  const [role, setRole] = useState<"Student" | "Teacher">(
    "Student"
  );

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

    if (loading) return;

    setError("");

    const enteredUsername = username
      .trim()
      .toUpperCase();

    const enteredPassword = password.trim();

    if (!enteredUsername || !enteredPassword) {
      setError(
        "❌ Username aur password dono enter karein."
      );
      return;
    }

    setLoading(true);

    /* =====================================================
       TEACHER LOGIN
       ===================================================== */

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

    /* =====================================================
       STUDENT LOGIN
       ===================================================== */

    const student = students.find(
      (item) =>
        item.username.toUpperCase() ===
          enteredUsername &&
        item.password === enteredPassword
    );

    if (!student) {
      setError(
        "❌ Invalid student username or password."
      );

      setLoading(false);
      return;
    }

    /*
     * Student credentials are checked above.
     * Now find the actual student ID from Supabase.
     */

    try {
      const { data, error: dbError } =
        await supabase
          .from("students")
          .select(
            "id, student_name, student_username"
          )
          .eq(
            "student_username",
            enteredUsername
          )
          .maybeSingle();

      if (dbError) {
        console.error(
          "Student database error:",
          dbError
        );

        setError(
          "❌ Student database error: " +
            dbError.message
        );

        setLoading(false);
        return;
      }

      /*
       * Student exists in login list but database
       * record is missing.
       */

      if (!data) {
        setError(
          "❌ Student account database mein nahi mila."
        );

        setLoading(false);
        return;
      }

      /* ================================================
         CLEAR OLD LOGIN
         ================================================ */

      clearSessions();

      /* ================================================
         CREATE STUDENT SESSION
         ================================================ */

      localStorage.setItem(
        "studentLoggedIn",
        "true"
      );

      localStorage.setItem(
        "studentUsername",
        data.student_username ||
          student.username
      );

      localStorage.setItem(
        "studentName",
        data.student_name ||
          student.name
      );

      localStorage.setItem(
        "studentId",
        String(data.id)
      );

      /*
       * IMPORTANT:
       * Student can ONLY go to student dashboard.
       */

      router.replace("/student/dashboard");

    } catch (err: any) {
      console.error(
        "Student login error:",
        err
      );

      setError(
        err?.message ||
          "❌ Student login failed."
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

        <h1>
          Attendance Portal
        </h1>

        <p className="subtitle">
          Login to continue
        </p>

        {/* ROLE */}

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
            disabled={loading}
          >
            👨‍🏫 Teacher
          </button>

        </div>

        {/* FORM */}

        <form onSubmit={handleLogin}>

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
              role === "Student"
                ? "STU1001"
                : "HARSH201951"
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
        }

        .role-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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

        input:disabled {
          background: #f1f5f9;
        }

        .error {
          background: #fee2e2;

          color: #991b1b;

          padding: 12px;

          border-radius: 10px;

          margin-bottom: 15px;

          font-weight: 600;

          text-align: center;

          font-size: 14px;
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

        .login-button:disabled {
          opacity: 0.7;
          cursor: wait;
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