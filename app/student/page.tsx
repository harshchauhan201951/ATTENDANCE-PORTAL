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
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError("");

    const enteredUsername =
      username.trim().toUpperCase();

    const enteredPassword =
      password.trim();

    if (!enteredUsername || !enteredPassword) {
      setError(
        "Please enter username and password."
      );
      return;
    }

    setLoading(true);

    const { data, error } =
      await supabase.rpc("student_login", {
        p_username: enteredUsername,
        p_password: enteredPassword,
      });

    setLoading(false);

    if (error) {
      console.error(error);
      setError(
        "Invalid username or password."
      );
      return;
    }

    if (!data || data.length === 0) {
      setError(
        "Invalid username or password."
      );
      return;
    }

    const student = data[0];

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
      "studentName",
      student.student_name
    );

    router.push("/student/dashboard");
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
        fontFamily: "Arial,sans-serif",
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
        }}
      >
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
            marginBottom: "30px",
          }}
        >
          Attendance Portal
        </p>

        <form onSubmit={handleLogin}>
          <label
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
            type="text"
            value={username}
            onChange={(e) =>
              setUsername(
                e.target.value.toUpperCase()
              )
            }
            placeholder="STU1001"
            autoComplete="username"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px",
              border:
                "1px solid #d1d5db",
              borderRadius: "11px",
              fontSize: "16px",
              marginBottom: "20px",
              color: "#111827",
            }}
          />

          <label
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
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="Enter password"
            autoComplete="current-password"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px",
              border:
                "1px solid #d1d5db",
              borderRadius: "11px",
              fontSize: "16px",
              marginBottom: "20px",
              color: "#111827",
            }}
          />

          {error && (
            <div
              style={{
                background: "#fee2e2",
                color: "#b91c1c",
                padding: "12px",
                borderRadius: "10px",
                marginBottom: "18px",
                textAlign: "center",
              }}
            >
              ❌ {error}
            </div>
          )}

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
              cursor: loading
                ? "not-allowed"
                : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? "Logging in..."
              : "Login →"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            color: "#9ca3af",
            fontSize: "13px",
            marginTop: "25px",
          }}
        >
          Student Attendance Management System
        </p>
      </div>
    </main>
  );
}