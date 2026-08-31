"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function StudentSettingsPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadStudent = () => {
      try {
        let studentUsername = "";

        // First try the existing "student" object
        const storedStudent = localStorage.getItem("student");

        if (storedStudent) {
          try {
            const student = JSON.parse(storedStudent);

            studentUsername =
              student?.student_username ||
              student?.username ||
              "";
          } catch (parseError) {
            console.error(
              "Unable to parse stored student:",
              parseError
            );
          }
        }

        // Fallback to existing localStorage username keys
        if (!studentUsername) {
          studentUsername =
            localStorage.getItem("student_username") ||
            localStorage.getItem("studentUsername") ||
            localStorage.getItem("username") ||
            "";
        }

        if (!studentUsername) {
          setError(
            "Student username nahi mila. Please login again."
          );
          setLoading(false);
          return;
        }

        setUsername(studentUsername);
      } catch (err) {
        console.error("Student data error:", err);

        setError(
          "Student information load nahi ho saki."
        );
      } finally {
        setLoading(false);
      }
    };

    loadStudent();
  }, []);

  async function handleChangePassword(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!username) {
      setError(
        "Student username nahi mila. Please login again."
      );
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError(
        "Please dono password fields fill karein."
      );
      return;
    }

    if (newPassword.length < 6) {
      setError(
        "Password kam se kam 6 characters ka hona chahiye."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        "New Password aur Confirm Password match nahi kar rahe."
      );
      return;
    }

    setChanging(true);

    try {
      /*
       * Supabase RPC:
       *
       * change_student_password(
       *   p_username text,
       *   p_new_password text
       * ) returns boolean
       */

      const { data, error: rpcError } =
        await supabase.rpc(
          "change_student_password",
          {
            p_username: username,
            p_new_password: newPassword,
          }
        );

      if (rpcError) {
        console.error(
          "Password change RPC error:",
          rpcError
        );

        throw new Error(
          rpcError.message ||
            "Password change nahi ho saka."
        );
      }

      /*
       * Database function returns:
       * TRUE  = password updated
       * FALSE = username/student not found
       */

      if (data !== true) {
        throw new Error(
          "Password update nahi hua. Student username database mein nahi mila."
        );
      }

      setNewPassword("");
      setConfirmPassword("");

      setShowNewPassword(false);
      setShowConfirmPassword(false);

      setMessage(
        "✅ Password successfully change ho gaya."
      );
    } catch (err) {
      console.error(
        "Unexpected password change error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to change password. Please try again."
      );
    } finally {
      setChanging(false);
    }
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f7fb",
          fontFamily: "Arial, sans-serif",
          padding: "20px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            padding: "25px 35px",
            borderRadius: "15px",
            boxShadow:
              "0 8px 25px rgba(0,0,0,0.08)",
            fontSize: "16px",
            fontWeight: 600,
            color: "#111827",
          }}
        >
          Loading...
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "30px 20px",
        fontFamily: "Arial, sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "500px",
          margin: "0 auto",
        }}
      >
        {/* BACK BUTTON */}

        <button
          type="button"
          onClick={() => router.back()}
          style={{
            border: "none",
            background: "transparent",
            fontSize: "16px",
            cursor: "pointer",
            marginBottom: "20px",
            color: "#111827",
            fontWeight: 600,
            padding: "5px 0",
          }}
        >
          ← Back
        </button>

        {/* MAIN CARD */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "18px",
            padding: "28px",
            boxShadow:
              "0 10px 30px rgba(0,0,0,0.08)",
          }}
        >
          {/* HEADER */}

          <div
            style={{
              marginBottom: "25px",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "50px",
                height: "50px",
                borderRadius: "14px",
                background: "#eef2ff",
                fontSize: "24px",
                marginBottom: "12px",
              }}
            >
              🔐
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "25px",
                fontWeight: 800,
                color: "#111827",
              }}
            >
              Change Password
            </h1>

            <p
              style={{
                margin: "7px 0 0",
                color: "#6b7280",
                fontSize: "14px",
                lineHeight: 1.5,
              }}
            >
              Change your student account password
              securely.
            </p>
          </div>

          {/* ERROR MESSAGE */}

          {error && (
            <div
              style={{
                background: "#fef2f2",
                color: "#b91c1c",
                border:
                  "1px solid #fecaca",
                padding: "12px 15px",
                borderRadius: "10px",
                marginBottom: "18px",
                fontSize: "14px",
                fontWeight: 600,
                lineHeight: 1.5,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* SUCCESS MESSAGE */}

          {message && (
            <div
              style={{
                background: "#ecfdf5",
                color: "#047857",
                border:
                  "1px solid #a7f3d0",
                padding: "12px 15px",
                borderRadius: "10px",
                marginBottom: "18px",
                fontSize: "14px",
                fontWeight: 600,
                lineHeight: 1.5,
              }}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleChangePassword}>
            {/* USERNAME */}

            <div
              style={{
                marginBottom: "18px",
              }}
            >
              <label
                style={{
                  display: "block",
                  fontWeight: 700,
                  marginBottom: "8px",
                  color: "#111827",
                  fontSize: "14px",
                }}
              >
                Username
              </label>

              <input
                type="text"
                value={username}
                readOnly
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "13px 14px",
                  borderRadius: "10px",
                  border:
                    "1px solid #d1d5db",
                  background: "#f3f4f6",
                  color: "#555",
                  fontSize: "15px",
                  outline: "none",
                  cursor: "not-allowed",
                }}
              />

              <small
                style={{
                  display: "block",
                  marginTop: "6px",
                  color: "#9ca3af",
                  fontSize: "12px",
                }}
              >
                Username cannot be changed.
              </small>
            </div>

            {/* NEW PASSWORD */}

            <div
              style={{
                marginBottom: "18px",
              }}
            >
              <label
                style={{
                  display: "block",
                  fontWeight: 700,
                  marginBottom: "8px",
                  color: "#111827",
                  fontSize: "14px",
                }}
              >
                New Password
              </label>

              <div
                style={{
                  position: "relative",
                }}
              >
                <input
                  type={
                    showNewPassword
                      ? "text"
                      : "password"
                  }
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError("");
                    setMessage("");
                  }}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  disabled={changing}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding:
                      "13px 50px 13px 14px",
                    borderRadius: "10px",
                    border:
                      "1px solid #d1d5db",
                    fontSize: "15px",
                    outline: "none",
                    color: "#111827",
                    background: changing
                      ? "#f9fafb"
                      : "#ffffff",
                  }}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowNewPassword(
                      (previous) => !previous
                    )
                  }
                  disabled={changing}
                  aria-label={
                    showNewPassword
                      ? "Hide new password"
                      : "Show new password"
                  }
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform:
                      "translateY(-50%)",
                    border: "none",
                    background:
                      "transparent",
                    cursor: changing
                      ? "not-allowed"
                      : "pointer",
                    fontSize: "18px",
                    padding: "5px",
                  }}
                >
                  {showNewPassword
                    ? "🙈"
                    : "👁️"}
                </button>
              </div>
            </div>

            {/* CONFIRM PASSWORD */}

            <div
              style={{
                marginBottom: "24px",
              }}
            >
              <label
                style={{
                  display: "block",
                  fontWeight: 700,
                  marginBottom: "8px",
                  color: "#111827",
                  fontSize: "14px",
                }}
              >
                Confirm New Password
              </label>

              <div
                style={{
                  position: "relative",
                }}
              >
                <input
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(
                      e.target.value
                    );
                    setError("");
                    setMessage("");
                  }}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  disabled={changing}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding:
                      "13px 50px 13px 14px",
                    borderRadius: "10px",
                    border:
                      "1px solid #d1d5db",
                    fontSize: "15px",
                    outline: "none",
                    color: "#111827",
                    background: changing
                      ? "#f9fafb"
                      : "#ffffff",
                  }}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (previous) => !previous
                    )
                  }
                  disabled={changing}
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform:
                      "translateY(-50%)",
                    border: "none",
                    background:
                      "transparent",
                    cursor: changing
                      ? "not-allowed"
                      : "pointer",
                    fontSize: "18px",
                    padding: "5px",
                  }}
                >
                  {showConfirmPassword
                    ? "🙈"
                    : "👁️"}
                </button>
              </div>
            </div>

            {/* CHANGE PASSWORD BUTTON */}

            <button
              type="submit"
              disabled={changing}
              style={{
                width: "100%",
                padding: "14px",
                border: "none",
                borderRadius: "10px",
                background: changing
                  ? "#9ca3af"
                  : "#111827",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: 700,
                cursor: changing
                  ? "not-allowed"
                  : "pointer",
                transition: "0.2s",
              }}
            >
              {changing
                ? "⏳ Updating Password..."
                : "🔑 Change Password"}
            </button>
          </form>

          {/* FOOTER NOTE */}

          <p
            style={{
              textAlign: "center",
              color: "#777",
              fontSize: "13px",
              marginTop: "18px",
              marginBottom: 0,
              lineHeight: 1.5,
            }}
          >
            Password change hone ke baad next
            login mein new password use karein.
          </p>
        </div>
      </div>
    </main>
  );
}