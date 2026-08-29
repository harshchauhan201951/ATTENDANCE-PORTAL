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
        const storedStudent = localStorage.getItem("student");

        if (!storedStudent) {
          router.push("/");
          return;
        }

        const student = JSON.parse(storedStudent);

        const studentUsername =
          student.student_username ||
          student.username ||
          "";

        if (!studentUsername) {
          setError("Student username nahi mila.");
          setLoading(false);
          return;
        }

        setUsername(studentUsername);
      } catch (err) {
        console.error("Student data error:", err);
        setError("Student information load nahi ho saki.");
      } finally {
        setLoading(false);
      }
    };

    loadStudent();
  }, [router]);

  const handleChangePassword = async () => {
    setMessage("");
    setError("");

    if (!username) {
      setError("Student username nahi mila.");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError("Please dono password fields fill karein.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password kam se kam 6 characters ka hona chahiye.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New Password aur Confirm Password match nahi kar rahe.");
      return;
    }

    setChanging(true);

    try {
      const { error: rpcError } = await supabase.rpc(
        "change_student_password",
        {
          p_username: username,
          p_new_password: newPassword,
        }
      );

      if (rpcError) {
        console.error("Password change RPC error:", rpcError);

        setError(
          rpcError.message || "Password change nahi ho saka."
        );

        return;
      }

      setMessage("✅ Password successfully change ho gaya.");

      setNewPassword("");
      setConfirmPassword("");
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err) {
      console.error("Unexpected password change error:", err);

      setError("Unable to change password. Please try again.");
    } finally {
      setChanging(false);
    }
  };

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
        }}
      >
        <div
          style={{
            background: "#ffffff",
            padding: "25px 35px",
            borderRadius: "15px",
            boxShadow: "0 8px 25px rgba(0,0,0,0.08)",
            fontSize: "16px",
            fontWeight: 600,
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
      }}
    >
      <div
        style={{
          maxWidth: "500px",
          margin: "0 auto",
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            border: "none",
            background: "transparent",
            fontSize: "16px",
            cursor: "pointer",
            marginBottom: "20px",
            color: "#111827",
            fontWeight: 600,
          }}
        >
          ← Back
        </button>

        <div
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            padding: "30px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          }}
        >
          {/* HEADER */}

          <div
            style={{
              textAlign: "center",
              marginBottom: "28px",
            }}
          >
            <div
              style={{
                width: "70px",
                height: "70px",
                borderRadius: "50%",
                background: "#eef2ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 15px",
                fontSize: "32px",
              }}
            >
              🔐
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "28px",
                fontWeight: 700,
                color: "#111827",
              }}
            >
              Change Password
            </h1>

            <p
              style={{
                color: "#666",
                marginTop: "8px",
                marginBottom: 0,
              }}
            >
              Apna password securely change karein
            </p>
          </div>

          {/* ERROR MESSAGE */}

          {error && (
            <div
              style={{
                background: "#fff1f2",
                color: "#be123c",
                border: "1px solid #fecdd3",
                padding: "12px 15px",
                borderRadius: "10px",
                marginBottom: "18px",
                fontSize: "14px",
                fontWeight: 500,
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
                border: "1px solid #a7f3d0",
                padding: "12px 15px",
                borderRadius: "10px",
                marginBottom: "18px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              {message}
            </div>
          )}

          {/* USERNAME */}

          <div
            style={{
              marginBottom: "18px",
            }}
          >
            <label
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: "8px",
                color: "#111827",
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
                border: "1px solid #d1d5db",
                background: "#f3f4f6",
                color: "#555",
                fontSize: "15px",
                outline: "none",
              }}
            />
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
                fontWeight: 600,
                marginBottom: "8px",
                color: "#111827",
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
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError("");
                  setMessage("");
                }}
                placeholder="Enter new password"
                autoComplete="new-password"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "13px 50px 13px 14px",
                  borderRadius: "10px",
                  border: "1px solid #d1d5db",
                  fontSize: "15px",
                  outline: "none",
                  color: "#111827",
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowNewPassword(!showNewPassword)
                }
                aria-label={
                  showNewPassword
                    ? "Hide new password"
                    : "Show new password"
                }
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "18px",
                }}
              >
                {showNewPassword ? "🙈" : "👁️"}
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
                fontWeight: 600,
                marginBottom: "8px",
                color: "#111827",
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
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError("");
                  setMessage("");
                }}
                placeholder="Confirm new password"
                autoComplete="new-password"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "13px 50px 13px 14px",
                  borderRadius: "10px",
                  border: "1px solid #d1d5db",
                  fontSize: "15px",
                  outline: "none",
                  color: "#111827",
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "18px",
                }}
              >
                {showConfirmPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* CHANGE PASSWORD BUTTON */}

          <button
            onClick={handleChangePassword}
            disabled={changing}
            style={{
              width: "100%",
              padding: "14px",
              border: "none",
              borderRadius: "10px",
              background: changing ? "#9ca3af" : "#111827",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: 700,
              cursor: changing ? "not-allowed" : "pointer",
              transition: "0.2s",
            }}
          >
            {changing
              ? "Updating Password..."
              : "Change Password"}
          </button>

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
            Password change hone ke baad next login mein new
            password use karein.
          </p>
        </div>
      </div>
    </main>
  );
}