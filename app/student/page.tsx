"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

export default function StudentLogin() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const enteredUsername = username.trim().toUpperCase();
    const enteredPassword = password.trim();

    if (!enteredUsername || !enteredPassword) {
      setError("Please enter username and password.");
      return;
    }

    // Check if this username was changed earlier
    const savedAccounts = JSON.parse(
      localStorage.getItem("studentAccounts") || "{}"
    );

    let student = null;

    // First check saved/changed accounts
    for (const key of Object.keys(savedAccounts)) {
      if (
        savedAccounts[key].username.toUpperCase() === enteredUsername &&
        savedAccounts[key].password === enteredPassword
      ) {
        student = savedAccounts[key];
        break;
      }
    }

    // If not found, check original accounts
    if (!student) {
      student = students.find(
        (item) =>
          item.username.toUpperCase() === enteredUsername &&
          item.password === enteredPassword
      );
    }

    if (!student) {
      setError("Invalid username or password.");
      return;
    }

    localStorage.setItem("studentLoggedIn", "true");
    localStorage.setItem("studentUsername", student.username);
    localStorage.setItem("studentName", student.name);

    router.push("/student/dashboard");
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #dbeafe 0%, #eef2ff 50%, #dcfce7 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "430px",
          background: "#ffffff",
          borderRadius: "24px",
          padding: "35px 28px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
        }}
      >
        <div
          style={{
            width: "75px",
            height: "75px",
            margin: "0 auto 15px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #2563eb, #4f46e5)",
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
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px",
              border: "1px solid #d1d5db",
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
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px",
              border: "1px solid #d1d5db",
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
            style={{
              width: "100%",
              padding: "14px",
              border: "none",
              borderRadius: "11px",
              background:
                "linear-gradient(135deg, #2563eb, #4f46e5)",
              color: "#ffffff",
              fontSize: "17px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Login →
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