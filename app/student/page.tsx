"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function StudentLogin() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
       * STEP 1:
       * Verify username/password using
       * the existing student_login function.
       */
      const {
        data,
        error: loginError,
      } = await supabase.rpc(
        "student_login",
        {
          p_username: enteredUsername,
          p_password: enteredPassword,
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

      const student = data[0];

      /*
       * STEP 2:
       * Get the REAL student record directly
       * from students table using username.
       *
       * This guarantees we get the numeric
       * student ID needed by the fees table.
       */
      const {
        data: realStudent,
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

      if (!realStudent) {
        setError(
          "Student account not found."
        );

        return;
      }

      /*
       * STEP 3:
       * Clear old login information.
       */
      localStorage.removeItem(
        "studentId"
      );

      localStorage.removeItem(
        "studentUsername"
      );

      localStorage.removeItem(
        "student_username"
      );

      localStorage.removeItem(
        "studentName"
      );

      localStorage.removeItem(
        "student_name"
      );

      sessionStorage.removeItem(
        "student_username"
      );

      sessionStorage.removeItem(
        "student_name"
      );

      /*
       * STEP 4:
       * Save the REAL student information.
       */
      localStorage.setItem(
        "studentLoggedIn",
        "true"
      );

      localStorage.setItem(
        "studentId",
        String(realStudent.id)
      );

      localStorage.setItem(
        "studentUsername",
        realStudent.student_username
      );

      localStorage.setItem(
        "student_username",
        realStudent.student_username
      );

      localStorage.setItem(
        "studentName",
        realStudent.student_name ||
          "Student"
      );

      localStorage.setItem(
        "student_name",
        realStudent.student_name ||
          "Student"
      );

      sessionStorage.setItem(
        "student_username",
        realStudent.student_username
      );

      sessionStorage.setItem(
        "student_name",
        realStudent.student_name ||
          "Student"
      );

      /*
       * STEP 5:
       * Go to student dashboard.
       */
      router.push("/student/dashboard");
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
          Student Login
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#6b7280",
            margin:
              "0 0 30px",
          }}
        >
          Attendance Portal
        </p>

        <form
          onSubmit={handleLogin}
        >
          <label
            htmlFor="username"
            style={{
              display: "block",
              color: "#111827",
              fontWeight: "600",
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
            placeholder="STU1001"
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
              fontWeight: "600",
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
                textAlign:
                  "center",
                fontSize: "14px",
                fontWeight: "600",
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
              fontWeight: "700",
              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>
        </form>
      </div>
    </main>
  );
}