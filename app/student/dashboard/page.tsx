"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function StudentDashboard() {
  const router = useRouter();

  const [username, setUsername] = useState("Student");
  const [name, setName] = useState("Student");

  const [showSettings, setShowSettings] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loggedIn = localStorage.getItem("studentLoggedIn");

    if (loggedIn !== "true") {
      router.push("/student");
      return;
    }

    setUsername(
      localStorage.getItem("studentUsername") || "Student"
    );

    setName(
      localStorage.getItem("studentName") || "Student"
    );
  }, [router]);

  const openSettings = () => {
    setShowSettings(true);
    setNewUsername(username);
    setMessage("");
    setError("");
  };

  const closeSettings = () => {
    setShowSettings(false);
    setMessage("");
    setError("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const logout = () => {
    localStorage.removeItem("studentLoggedIn");
    localStorage.removeItem("studentUsername");
    localStorage.removeItem("studentName");

    router.push("/student");
  };

  const changeCredentials = () => {
    setMessage("");
    setError("");

    if (!newUsername.trim()) {
      setError("Username cannot be empty.");
      return;
    }

    if (!currentPassword) {
      setError("Please enter your current password.");
      return;
    }

    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }

    if (newPassword.length < 4) {
      setError("New password must contain at least 4 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    const savedAccounts = JSON.parse(
      localStorage.getItem("studentAccounts") || "{}"
    );

    const originalPasswords: Record<string, string> = {
      STU1001: "Aditya02",
      STU1002: "Anmol01",
      STU1003: "Chirag06",
      STU1004: "Duggu10",
      STU1005: "Duggu13",
      STU1006: "Jaggu10",
      STU1007: "Mannu13",
      STU1008: "Palak02",
      STU1009: "Piyush01",
      STU1010: "Prince04",
      STU1011: "Raghav20",
      STU1012: "Sharvi04",
    };

    const savedAccount = savedAccounts[username];

    const correctPassword =
      savedAccount?.password ||
      originalPasswords[username];

    if (currentPassword !== correctPassword) {
      setError("Current password is incorrect.");
      return;
    }

    const usernameTaken = Object.values(savedAccounts).some(
      (account: any) =>
        account.username.toUpperCase() ===
          newUsername.trim().toUpperCase() &&
        account.username !== username
    );

    if (usernameTaken) {
      setError("This username is already in use.");
      return;
    }

    const updatedAccount = {
      username: newUsername.trim().toUpperCase(),
      password: newPassword,
      name: name,
    };

    savedAccounts[updatedAccount.username] =
      updatedAccount;

    if (username !== updatedAccount.username) {
      delete savedAccounts[username];
    }

    localStorage.setItem(
      "studentAccounts",
      JSON.stringify(savedAccounts)
    );

    localStorage.setItem(
      "studentUsername",
      updatedAccount.username
    );

    localStorage.setItem(
      "studentName",
      updatedAccount.name
    );

    setUsername(updatedAccount.username);

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    setMessage(
      "✅ Username and password changed successfully!"
    );
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #eef2ff, #f8fafc, #ecfdf5)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* HEADER */}
      <header
        style={{
          background:
            "linear-gradient(135deg, #1d4ed8, #2563eb, #4f46e5)",
          color: "white",
          padding: "18px 20px",
          boxShadow: "0 5px 20px rgba(37,99,235,0.25)",
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "12px",
                opacity: 0.85,
              }}
            >
              ATTENDANCE PORTAL
            </div>

            <h1
              style={{
                margin: "3px 0 0",
                fontSize: "23px",
              }}
            >
              Student Dashboard
            </h1>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
            }}
          >
            <button
              onClick={openSettings}
              style={{
                background: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.5)",
                color: "white",
                padding: "10px 13px",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "700",
              }}
            >
              ⚙️ Settings
            </button>

            <button
              onClick={logout}
              style={{
                background: "#dc2626",
                border: "none",
                color: "white",
                padding: "10px 13px",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "700",
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <section
        style={{
          maxWidth: "1100px",
          margin: "30px auto",
          padding: "0 20px 40px",
        }}
      >
        {/* WELCOME */}
        <div
          style={{
            background:
              "linear-gradient(135deg, #ffffff, #eff6ff)",
            borderRadius: "20px",
            padding: "28px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            border: "1px solid #dbeafe",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "18px",
            }}
          >
            <div
              style={{
                width: "65px",
                height: "65px",
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, #2563eb, #7c3aed)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "30px",
              }}
            >
              🎓
            </div>

            <div>
              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                }}
              >
                Welcome back
              </p>

              <h2
                style={{
                  margin: "4px 0",
                  color: "#0f172a",
                }}
              >
                {name} 👋
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                }}
              >
                Username: {username}
              </p>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "18px",
            marginTop: "25px",
          }}
        >
          <Stat
            icon="📊"
            title="Attendance"
            value="0%"
            text="Overall attendance"
            background="linear-gradient(135deg,#2563eb,#1d4ed8)"
          />

          <Stat
            icon="✅"
            title="Present"
            value="0"
            text="Classes attended"
            background="linear-gradient(135deg,#16a34a,#15803d)"
          />

          <Stat
            icon="❌"
            title="Absent"
            value="0"
            text="Classes missed"
            background="linear-gradient(135deg,#ef4444,#dc2626)"
          />

          <Stat
            icon="📚"
            title="Total Classes"
            value="0"
            text="Classes conducted"
            background="linear-gradient(135deg,#7c3aed,#6d28d9)"
          />
        </div>

        {/* ATTENDANCE */}
        <div
          style={{
            background: "white",
            borderRadius: "18px",
            padding: "25px",
            marginTop: "25px",
            boxShadow: "0 8px 25px rgba(0,0,0,0.07)",
          }}
        >
          <h2 style={{ color: "#0f172a" }}>
            📅 Attendance Details
          </h2>

          <div
            style={{
              background: "#f8fafc",
              border: "1px dashed #94a3b8",
              borderRadius: "15px",
              padding: "30px 15px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "45px" }}>📋</div>

            <h3 style={{ color: "#334155" }}>
              No attendance records yet
            </h3>

            <p style={{ color: "#64748b" }}>
              Your attendance records will appear here
              once your teacher marks attendance.
            </p>
          </div>
        </div>
      </section>

      {/* SETTINGS POPUP */}
      {showSettings && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "470px",
              maxHeight: "90vh",
              overflowY: "auto",
              background:
                "linear-gradient(145deg,#ffffff,#eff6ff)",
              borderRadius: "24px",
              boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
              border: "2px solid #bfdbfe",
            }}
          >
            {/* POPUP HEADER */}
            <div
              style={{
                background:
                  "linear-gradient(135deg,#1d4ed8,#4f46e5)",
                color: "white",
                padding: "25px",
                borderRadius: "22px 22px 0 0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "35px",
                    }}
                  >
                    ⚙️
                  </div>

                  <h2
                    style={{
                      margin: "5px 0",
                      fontSize: "25px",
                    }}
                  >
                    Account Settings
                  </h2>

                  <p
                    style={{
                      margin: 0,
                      color: "#dbeafe",
                      fontSize: "14px",
                    }}
                  >
                    Manage your student account
                  </p>
                </div>

                <button
                  onClick={closeSettings}
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    border:
                      "1px solid rgba(255,255,255,0.5)",
                    background:
                      "rgba(255,255,255,0.15)",
                    color: "white",
                    fontSize: "20px",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* POPUP BODY */}
            <div
              style={{
                padding: "25px",
              }}
            >
              {/* CURRENT USER */}
              <div
                style={{
                  background:
                    "linear-gradient(135deg,#dbeafe,#e0e7ff)",
                  border: "1px solid #93c5fd",
                  borderRadius: "15px",
                  padding: "17px",
                  marginBottom: "22px",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#475569",
                  }}
                >
                  CURRENT ACCOUNT
                </div>

                <div
                  style={{
                    marginTop: "5px",
                    color: "#1e3a8a",
                    fontSize: "21px",
                    fontWeight: "700",
                  }}
                >
                  👤 {name}
                </div>

                <div
                  style={{
                    marginTop: "4px",
                    color: "#475569",
                  }}
                >
                  Username: {username}
                </div>
              </div>

              {/* USERNAME */}
              <label
                style={{
                  display: "block",
                  fontWeight: "700",
                  color: "#172554",
                  marginBottom: "8px",
                }}
              >
                👤 New Username
              </label>

              <input
                type="text"
                value={newUsername}
                onChange={(e) =>
                  setNewUsername(e.target.value)
                }
                placeholder="Enter new username"
                style={inputStyle("#93c5fd")}
              />

              {/* CURRENT PASSWORD */}
              <label
                style={labelStyle}
              >
                🔑 Current Password
              </label>

              <input
                type="password"
                value={currentPassword}
                onChange={(e) =>
                  setCurrentPassword(e.target.value)
                }
                placeholder="Enter current password"
                style={inputStyle("#a5b4fc")}
              />

              {/* NEW PASSWORD */}
              <label
                style={labelStyle}
              >
                🔐 New Password
              </label>

              <input
                type="password"
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(e.target.value)
                }
                placeholder="Enter new password"
                style={inputStyle("#86efac")}
              />

              {/* CONFIRM */}
              <label
                style={labelStyle}
              >
                🔐 Confirm New Password
              </label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                placeholder="Confirm new password"
                style={inputStyle("#fde68a")}
              />

              {/* ERROR */}
              {error && (
                <div
                  style={{
                    background: "#fee2e2",
                    border: "2px solid #fca5a5",
                    color: "#991b1b",
                    padding: "13px",
                    borderRadius: "11px",
                    marginTop: "15px",
                    fontWeight: "600",
                  }}
                >
                  ❌ {error}
                </div>
              )}

              {/* SUCCESS */}
              {message && (
                <div
                  style={{
                    background: "#dcfce7",
                    border: "2px solid #86efac",
                    color: "#166534",
                    padding: "13px",
                    borderRadius: "11px",
                    marginTop: "15px",
                    fontWeight: "600",
                  }}
                >
                  {message}
                </div>
              )}

              {/* SAVE */}
              <button
                onClick={changeCredentials}
                style={{
                  width: "100%",
                  padding: "15px",
                  marginTop: "20px",
                  border: "none",
                  borderRadius: "12px",
                  background:
                    "linear-gradient(135deg,#2563eb,#4f46e5)",
                  color: "white",
                  fontSize: "17px",
                  fontWeight: "700",
                  cursor: "pointer",
                  boxShadow:
                    "0 8px 20px rgba(37,99,235,0.3)",
                }}
              >
                💾 Save Changes
              </button>

              {/* CANCEL */}
              <button
                onClick={closeSettings}
                style={{
                  width: "100%",
                  padding: "14px",
                  marginTop: "10px",
                  border: "2px solid #cbd5e1",
                  borderRadius: "12px",
                  background: "white",
                  color: "#334155",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <footer
        style={{
          textAlign: "center",
          color: "#64748b",
          padding: "20px",
          fontSize: "13px",
        }}
      >
        Student Attendance Management System © 2026
      </footer>
    </main>
  );
}

function Stat({
  icon,
  title,
  value,
  text,
  background,
}: {
  icon: string;
  title: string;
  value: string;
  text: string;
  background: string;
}) {
  return (
    <div
      style={{
        background,
        color: "white",
        padding: "25px",
        borderRadius: "18px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
      }}
    >
      <div style={{ fontSize: "32px" }}>
        {icon}
      </div>

      <p
        style={{
          margin: "12px 0 5px",
          opacity: 0.85,
        }}
      >
        {title}
      </p>

      <h2
        style={{
          fontSize: "32px",
          margin: 0,
        }}
      >
        {value}
      </h2>

      <p
        style={{
          fontSize: "13px",
          opacity: 0.8,
        }}
      >
        {text}
      </p>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontWeight: "700",
  color: "#172554",
  marginTop: "18px",
  marginBottom: "8px",
};

const inputStyle = (borderColor: string) => ({
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "14px",
  border: `2px solid ${borderColor}`,
  borderRadius: "11px",
  fontSize: "16px",
  color: "#111827",
  background: "#ffffff",
  outline: "none",
});