"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./lib/supabase";

type Role = "student" | "teacher";

export default function LoginPage() {
  const router = useRouter();

  const [role, setRole] =
    useState<Role>("student");

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  function clearAllSessions() {
    if (typeof window === "undefined") {
      return;
    }

    // Local storage - new login system
    const newKeys = [
      "attendance_role",
      "attendance_username",
      "attendance_teacher_id",
    ];

    newKeys.forEach((key) => {
      localStorage.removeItem(key);
    });

    // Teacher old session keys
    const teacherKeys = [
      "teacherLoggedIn",
      "teacher",
      "teacherUsername",
      "teacherName",
      "teacher_username",
      "teacher_name",
    ];

    teacherKeys.forEach((key) => {
      localStorage.removeItem(key);
    });

    // Student old session keys
    const studentKeys = [
      "studentLoggedIn",
      "studentId",
      "studentUsername",
      "student_username",
      "studentName",
      "student_name",
    ];

    studentKeys.forEach((key) => {
      localStorage.removeItem(key);
    });

    // Session storage
    const sessionKeys = [
      "attendance_role",
      "attendance_username",
      "attendance_teacher_id",
      "teacherLoggedIn",
      "teacher",
      "teacherUsername",
      "teacherName",
      "teacher_username",
      "teacher_name",
      "studentLoggedIn",
      "studentId",
      "studentUsername",
      "student_username",
      "studentName",
      "student_name",
    ];

    sessionKeys.forEach((key) => {
      sessionStorage.removeItem(key);
    });
  }

  async function handleLogin(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");

    const enteredUsername =
      username.trim().toUpperCase();

    const enteredPassword =
      password.trim();

    if (
      !enteredUsername ||
      !enteredPassword
    ) {
      setError(
        "Please enter username and password."
      );
      return;
    }

    setLoading(true);

    try {
      /*
       * Always clear any previous account
       * before creating a new session.
       */
      clearAllSessions();

      if (role === "student") {
        const {
          data,
          error: loginError,
        } = await supabase.rpc(
          "student_login",
          {
            p_username:
              enteredUsername,
            p_password:
              enteredPassword,
          }
        );

        if (loginError) {
          console.error(
            "Student login error:",
            loginError
          );

          setError(
            "Invalid username or password."
          );

          return;
        }

        if (
          !data ||
          !Array.isArray(data) ||
          data.length === 0
        ) {
          setError(
            "Invalid username or password."
          );

          return;
        }

        const {
          data: student,
          error: studentError,
        } = await supabase
          .from("students")
          .select(
            "id, student_name, student_username"
          )
          .eq(
            "student_username",
            enteredUsername
          )
          .maybeSingle();

        if (studentError) {
          console.error(
            "Student record error:",
            studentError
          );

          setError(
            "Unable to load student account."
          );

          return;
        }

        if (!student) {
          setError(
            "Student account not found."
          );

          return;
        }

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

        localStorage.setItem(
          "attendance_role",
          "Student"
        );

        localStorage.setItem(
          "attendance_username",
          student.student_username
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

        sessionStorage.setItem(
          "attendance_role",
          "Student"
        );

        sessionStorage.setItem(
          "attendance_username",
          student.student_username
        );

        router.replace(
          "/student/dashboard"
        );

        return;
      }

      /*
       * TEACHER LOGIN
       */
      const {
        data,
        error: loginError,
      } = await supabase.rpc(
        "teacher_login",
        {
          p_username:
            enteredUsername,
          p_password:
            enteredPassword,
        }
      );

      if (loginError) {
        console.error(
          "Teacher login error:",
          loginError
        );

        setError(
          "Invalid username or password."
        );

        return;
      }

      if (
        !data ||
        (Array.isArray(data) &&
          data.length === 0)
      ) {
        setError(
          "Invalid username or password."
        );

        return;
      }

      let teacherName =
        enteredUsername;

      let teacherId = "";

      if (Array.isArray(data)) {
        const teacher = data[0];

        if (teacher) {
          teacherName =
            teacher.teacher_name ||
            teacher.name ||
            teacher.username ||
            enteredUsername;

          teacherId =
            teacher.id != null
              ? String(teacher.id)
              : "";
        }
      } else if (
        typeof data === "object" &&
        data !== null
      ) {
        const teacher =
          data as Record<
            string,
            unknown
          >;

        teacherName =
          String(
            teacher.teacher_name ||
              teacher.name ||
              teacher.username ||
              enteredUsername
          );

        teacherId =
          teacher.id != null
            ? String(teacher.id)
            : "";
      }

      /*
       * New teacher session
       */
      localStorage.setItem(
        "attendance_role",
        "Teacher"
      );

      localStorage.setItem(
        "attendance_username",
        enteredUsername
      );

      if (teacherId) {
        localStorage.setItem(
          "attendance_teacher_id",
          teacherId
        );
      }

      /*
       * Old teacher session
       * kept for compatibility
       * with existing teacher pages.
       */
      localStorage.setItem(
        "teacherLoggedIn",
        "true"
      );

      localStorage.setItem(
        "teacher",
        teacherName
      );

      localStorage.setItem(
        "teacherUsername",
        enteredUsername
      );

      localStorage.setItem(
        "teacher_username",
        enteredUsername
      );

      localStorage.setItem(
        "teacherName",
        teacherName
      );

      localStorage.setItem(
        "teacher_name",
        teacherName
      );

      sessionStorage.setItem(
        "attendance_role",
        "Teacher"
      );

      sessionStorage.setItem(
        "attendance_username",
        enteredUsername
      );

      sessionStorage.setItem(
        "teacherLoggedIn",
        "true"
      );

      sessionStorage.setItem(
        "teacherUsername",
        enteredUsername
      );

      sessionStorage.setItem(
        "teacherName",
        teacherName
      );

      router.replace(
        "/teacher/dashboard"
      );
    } catch (err) {
      console.error(
        "Unexpected login error:",
        err
      );

      setError(
        "Unable to login. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg,#dbeafe,#eef2ff,#dcfce7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily:
          "Arial, sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "430px",
          background: "white",
          borderRadius: "24px",
          padding: "35px 28px",
          boxShadow:
            "0 20px 50px rgba(0,0,0,0.15)",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "75px",
            height: "75px",
            margin:
              "0 auto 15px",
            borderRadius: "50%",
            background:
              "linear-gradient(135deg,#2563eb,#4f46e5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "38px",
          }}
        >
          🎓
        </div>

        <h1
          style={{
            textAlign: "center",
            color: "#111827",
            fontSize: "30px",
            margin:
              "0 0 8px",
          }}
        >
          Attendance Portal
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#6b7280",
            margin:
              "0 0 25px",
          }}
        >
          Login to continue
        </p>

        {/* ROLE BUTTONS */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: "10px",
            marginBottom: "25px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setRole("student");
              setError("");
              setUsername("");
              setPassword("");
            }}
            disabled={loading}
            style={{
              border:
                role === "student"
                  ? "2px solid #2563eb"
                  : "1px solid #d1d5db",
              background:
                role === "student"
                  ? "#eff6ff"
                  : "#ffffff",
              color: "#111827",
              padding: "13px 8px",
              borderRadius: "11px",
              fontWeight: 700,
              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            👨‍🎓 Student
          </button>

          <button
            type="button"
            onClick={() => {
              setRole("teacher");
              setError("");
              setUsername("");
              setPassword("");
            }}
            disabled={loading}
            style={{
              border:
                role === "teacher"
                  ? "2px solid #4f46e5"
                  : "1px solid #d1d5db",
              background:
                role === "teacher"
                  ? "#eef2ff"
                  : "#ffffff",
              color: "#111827",
              padding: "13px 8px",
              borderRadius: "11px",
              fontWeight: 700,
              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            👨‍🏫 Teacher
          </button>
        </div>

        <form
          onSubmit={handleLogin}
        >
          <label
            htmlFor="username"
            style={{
              display: "block",
              color: "#111827",
              fontWeight: 600,
              marginBottom: "8px",
            }}
          >
            Username
          </label>

          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(
                e.target.value.toUpperCase()
              );

              if (error) {
                setError("");
              }
            }}
            placeholder={
              role === "student"
                ? "STU1001"
                : "Teacher username"
            }
            autoComplete="username"
            disabled={loading}
            style={{
              width: "100%",
              boxSizing:
                "border-box",
              padding: "14px",
              border:
                "1px solid #d1d5db",
              borderRadius: "11px",
              fontSize: "16px",
              marginBottom:
                "20px",
              color: "#111827",
              outline: "none",
            }}
          />

          <label
            htmlFor="password"
            style={{
              display: "block",
              color: "#111827",
              fontWeight: 600,
              marginBottom: "8px",
            }}
          >
            Password
          </label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(
                e.target.value
              );

              if (error) {
                setError("");
              }
            }}
            placeholder="Enter password"
            autoComplete="current-password"
            disabled={loading}
            style={{
              width: "100%",
              boxSizing:
                "border-box",
              padding: "14px",
              border:
                "1px solid #d1d5db",
              borderRadius: "11px",
              fontSize: "16px",
              marginBottom:
                "20px",
              color: "#111827",
              outline: "none",
            }}
          />

          {error && (
            <div
              style={{
                background: "#fee2e2",
                color: "#b91c1c",
                padding: "12px",
                borderRadius: "10px",
                marginBottom:
                  "18px",
                textAlign: "center",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              border: "none",
              background:
                loading
                  ? "#9ca3af"
                  : "linear-gradient(135deg,#2563eb,#4f46e5)",
              color: "white",
              padding: "14px",
              borderRadius: "11px",
              fontSize: "17px",
              fontWeight: 700,
              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            {loading
              ? "Logging in..."
              : "Login →"}
          </button>
        </form>
      </div>
    </main>
  );
}