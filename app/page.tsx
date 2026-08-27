"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type LoginType = "student" | "teacher";

export default function HomePage() {
  const router = useRouter();

  const [loginType, setLoginType] = useState<LoginType>("student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please enter username and password.");
      return;
    }

    try {
      setLoading(true);

      const functionName =
        loginType === "student" ? "student_login" : "teacher_login";

      console.log("LOGIN TYPE:", loginType);
      console.log("FUNCTION:", functionName);
      console.log("USERNAME:", username.trim());

      const { data, error: loginError } = await supabase.rpc(
        functionName,
        {
          p_username: username.trim(),
          p_password: password,
        }
      );

      console.log("SUPABASE DATA:", data);
      console.log("SUPABASE ERROR:", loginError);

      // RPC ERROR
      if (loginError) {
        console.error("LOGIN ERROR:", loginError);

        if (loginType === "student") {
          setError(
            `Student Login Error: ${loginError.message} | Code: ${
              loginError.code || "N/A"
            }`
          );
        } else {
          setError(
            `Teacher Login Error: ${loginError.message} | Code: ${
              loginError.code || "N/A"
            }`
          );
        }

        return;
      }

      // EMPTY RESPONSE
      if (!data || (Array.isArray(data) && data.length === 0)) {
        console.error("EMPTY LOGIN RESPONSE:", data);

        setError(
          loginType === "student"
            ? "Student Login Error: Login function returned no student data."
            : "Teacher Login Error: Login function returned no teacher data."
        );

        return;
      }

      // GET USER DATA
      const userData = Array.isArray(data) ? data[0] : data;

      console.log("USER DATA:", userData);

      // STUDENT LOGIN
      if (loginType === "student") {
        // Existing storage
        localStorage.setItem(
          "racer_academy_student",
          JSON.stringify(userData)
        );

        localStorage.setItem(
          "student",
          JSON.stringify(userData)
        );

        // Student dashboard expected storage
        localStorage.setItem(
          "studentLoggedIn",
          "true"
        );

        localStorage.setItem(
          "studentName",
          userData.student_name || "Student"
        );

        localStorage.setItem(
          "student_name",
          userData.student_name || "Student"
        );

        localStorage.setItem(
          "student_username",
          userData.student_username || ""
        );

        localStorage.setItem(
          "studentUsername",
          userData.student_username || ""
        );

        router.push("/student/dashboard");
        return;
      }

      // TEACHER LOGIN
      localStorage.setItem(
        "racer_academy_teacher",
        JSON.stringify(userData)
      );

      localStorage.setItem(
        "teacher",
        JSON.stringify(userData)
      );

      router.push("/teacher");
    } catch (err) {
      console.error("UNEXPECTED ERROR:", err);

      const errorMessage =
        err instanceof Error ? err.message : String(err);

      setError(
        `${loginType === "student" ? "Student" : "Teacher"} Login Error: ${errorMessage}`
      );
    } finally {
      setLoading(false);
    }
  };

  const switchLoginType = (type: LoginType) => {
    setLoginType(type);
    setUsername("");
    setPassword("");
    setError("");
    setShowPassword(false);
  };

  return (
    <main className="racer-login-page">
      {/* BACKGROUND */}
      <div className="racer-orb racer-orb-one" />
      <div className="racer-orb racer-orb-two" />
      <div className="racer-grid" />

      {/* MAIN CARD */}
      <section className="racer-login-card">
        {/* LOGO */}
        <div className="racer-logo-area">
          <div className="racer-logo">🎓</div>

          <h1>
            RACER
            <span>ACADEMY</span>
          </h1>

          <p>Smart Education & Student Management</p>
        </div>

        {/* LOGIN SWITCH */}
        <div className="login-switch">
          <button
            type="button"
            className={
              loginType === "student"
                ? "switch-button active"
                : "switch-button"
            }
            onClick={() => switchLoginType("student")}
            disabled={loading}
          >
            <span className="switch-icon">🎓</span>
            <span>Student</span>
          </button>

          <button
            type="button"
            className={
              loginType === "teacher"
                ? "switch-button active"
                : "switch-button"
            }
            onClick={() => switchLoginType("teacher")}
            disabled={loading}
          >
            <span className="switch-icon">👨‍🏫</span>
            <span>Teacher</span>
          </button>
        </div>

        {/* HEADING */}
        <div className="racer-heading">
          <div className="portal-badge">
            {loginType === "student"
              ? "STUDENT PORTAL"
              : "TEACHER PORTAL"}
          </div>

          <h2>
            Welcome Back <span>👋</span>
          </h2>

          <p>
            {loginType === "student"
              ? "Login to access your student dashboard."
              : "Login to access your teacher dashboard."}
          </p>
        </div>

        {/* LOGIN FORM */}
        <form
          onSubmit={handleLogin}
          className="racer-form"
        >
          {/* USERNAME */}
          <div className="racer-input-group">
            <label htmlFor="username">
              Username
            </label>

            <div className="racer-input">
              <span className="field-icon">
                👤
              </span>

              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
                placeholder={
                  loginType === "student"
                    ? "e.g. STU1001"
                    : "Enter teacher username"
                }
                autoComplete="username"
                disabled={loading}
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div className="racer-input-group">
            <label htmlFor="password">
              Password
            </label>

            <div className="racer-input">
              <span className="field-icon">
                🔒
              </span>

              <input
                id="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={loading}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(
                    (previous) => !previous
                  )
                }
                disabled={loading}
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div className="racer-error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* LOGIN BUTTON */}
          <button
            type="submit"
            className="racer-login-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="racer-spinner" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>
                  Login as{" "}
                  {loginType === "student"
                    ? "Student"
                    : "Teacher"}
                </span>

                <span className="login-arrow">
                  →
                </span>
              </>
            )}
          </button>
        </form>

        {/* FOOTER */}
        <div className="racer-footer">
          <div className="security-line">
            <span>🔒</span>
            Secure Login
          </div>

          <span className="footer-dot">
            •
          </span>

          <div className="security-line">
            <span>⚡</span>
            Fast & Reliable
          </div>
        </div>
      </section>

      {/* BOTTOM BRAND */}
      <div className="racer-bottom-brand">
        RACER ACADEMY
      </div>
    </main>
  );
}