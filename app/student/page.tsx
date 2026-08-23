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

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Clear old error whenever Login is pressed
    setError("");

    const enteredUsername = username.trim().toUpperCase();
    const enteredPassword = password.trim();

    // Only show this message after pressing Login
    if (!enteredUsername || !enteredPassword) {
      setError("Please enter username and password.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: loginError } = await supabase.rpc(
        "student_login",
        {
          p_username: enteredUsername,
          p_password: enteredPassword,
        }
      );

      if (loginError) {
        console.error("Student login error:", loginError);
        setError("Invalid username or password.");
        return;
      }

      if (!data || data.length === 0) {
        setError("Invalid username or password.");
        return;
      }

      const student = data[0];

      // Save student login information
      localStorage.setItem("studentLoggedIn", "true");
      localStorage.setItem("studentId", String(student.id));
      localStorage.setItem(
        "studentUsername",
        student.student_username || enteredUsername
      );
      localStorage.setItem(
        "studentName",
        student.student_name || "Student"
      );

      // Also save the keys used by the dashboard
      localStorage.setItem(
        "student_username",
        student.student_username || enteredUsername
      );
      localStorage.setItem(
        "student_name",
        student.student_name || "Student"
      );

      sessionStorage.setItem(
        "student_username",
        student.student_username || enteredUsername
      );
      sessionStorage.setItem(
        "student_name",
        student.student_name || "Student"
      );

      // Go to dashboard
      router.push("/student/dashboard");
    } catch (err) {
      console.error("Unexpected login error:", err);
      setError("Unable to login. Please try again.");
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
        fontFamily: "Arial, sans-serif",
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
          boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
          boxSizing: "border-box",
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: "75px",
            height: "75px",
            margin: "0 auto 15px",
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

        {/* Heading */}
        <h1
          style={{
            textAlign: "center",
            color: "#111827",
            fontSize: "30px",
            margin: "0 0 8px",
          }}
        >
          Student Login
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#6b7280",
            margin: "0 0 30px",
          }}
        >
          Attendance Portal
        </p>

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          {/* Username */}
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
              setUsername(e.target.value.toUpperCase());

              // Remove old error when user starts typing
              if (error) {
                setError("");
              }
            }}
            placeholder="STU1001"
            autoComplete="username"
            disabled={loading}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px",
              border: "1px solid #d1d5db",
              borderRadius: "11px",
              fontSize: "16px",
              marginBottom: "20px",
              color: "#111827",
              outline: "none",
            }}
          />

          {/* Password */}
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
              setPassword(e.target.value);

              // Remove old error when user starts typing
              if (error) {
                setError("");
              }
            }}
            placeholder="Enter password"
            autoComplete="current-password"
            disabled={loading}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px",
              border: "1px solid #d1d5db",
              borderRadius: "11px",
              fontSize: "16px",
              marginBottom: "20px",
              color: "#111827",
              outline: "none",
            }}
          />

          {/* Error */}
          {error && (
            <div
              style={{
                background: "#fee2e2",
                color: "#b91c1c",
                padding: "12px",
                borderRadius: "10px",
                marginBottom: "18px",
                textAlign: "center",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              ❌ {error}
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              border: "none",
              borderRadius: "11px",
              background:
                "linear-gradient(135deg,#2563eb,#4f46e5)",
              color: "white",
              fontSize: "17px",
              fontWeight: "700",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Logging in..." : "Login →"}
          </button>
        </form>

        {/* Footer */}
        <p
          style={{
            textAlign: "center",
            color: "#9ca3af",
            fontSize: "13px",
            marginTop: "25px",
            marginBottom: 0,
          }}
        >
          Student Attendance Management System
        </p>
      </div>
    </main>
  );
}