"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Role = "Student" | "Teacher";

export default function Home() {
  const router = useRouter();

  const [role, setRole] = useState<Role>("Student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    setError("");

    const cleanUsername = username.trim();

    if (!cleanUsername || !password) {
      setError("Please enter username and password.");
      return;
    }

    setLoading(true);

    try {
      let result: any = null;
      let loginError: any = null;

      if (role === "Student") {
        const response = await supabase.rpc("student_login", {
          p_username: cleanUsername,
          p_password: password,
        });

        result = response.data;
        loginError = response.error;
      } else {
        const response = await supabase.rpc("teacher_login", {
          p_username: cleanUsername,
          p_password: password,
        });

        result = response.data;
        loginError = response.error;
      }

      console.log("LOGIN RESULT:", result);
      console.log("LOGIN ERROR:", loginError);

      if (loginError) {
        console.error("Supabase login error:", loginError);
        setError(
          loginError.message || "Unable to login. Please try again."
        );
        return;
      }

      let userData: any = result;

      if (Array.isArray(result)) {
        userData = result.length > 0 ? result[0] : null;
      }

      if (!userData) {
        setError("Invalid username or password.");
        return;
      }

      if (
        userData.success === false ||
        userData.logged_in === false ||
        userData.authenticated === false
      ) {
        setError("Invalid username or password.");
        return;
      }

      /* =========================
         STUDENT LOGIN
         ========================= */

      if (role === "Student") {
        localStorage.setItem("attendance_role", "Student");
        localStorage.setItem(
          "attendance_username",
          cleanUsername
        );

        if (userData.student_id) {
          localStorage.setItem(
            "attendance_student_id",
            String(userData.student_id)
          );
        }

        if (userData.student_name) {
          localStorage.setItem(
            "attendance_student_name",
            String(userData.student_name)
          );
        }

        /*
         * IMPORTANT:
         * Student goes directly to dashboard.
         * NOT /student
         */
        router.push("/student/dashboard");
        return;
      }

      /* =========================
         TEACHER LOGIN
         ========================= */

      localStorage.setItem("attendance_role", "Teacher");
      localStorage.setItem(
        "attendance_username",
        cleanUsername
      );

      if (userData.teacher_id) {
        localStorage.setItem(
          "attendance_teacher_id",
          String(userData.teacher_id)
        );
      }

      /*
       * Teacher goes to teacher dashboard.
       */
      router.push("/teacher");
    } catch (err: any) {
      console.error("LOGIN EXCEPTION:", err);

      setError(
        err?.message || "Something went wrong while logging in."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-gray-100">

          {/* Header */}
          <div className="text-center mb-7">
            <div className="text-5xl mb-3">
              📚
            </div>

            <h1 className="text-3xl font-bold text-gray-800">
              Attendance Portal
            </h1>

            <p className="text-gray-500 mt-2">
              Login to continue
            </p>
          </div>

          {/* Role Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">

            <button
              type="button"
              onClick={() => {
                setRole("Student");
                setError("");
              }}
              className={`rounded-xl py-3 px-3 font-semibold transition-all ${
                role === "Student"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              👨‍🎓 Student
            </button>

            <button
              type="button"
              onClick={() => {
                setRole("Teacher");
                setError("");
              }}
              className={`rounded-xl py-3 px-3 font-semibold transition-all ${
                role === "Teacher"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              👨‍🏫 Teacher
            </button>

          </div>

          {/* Login Form */}
          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >

            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Username
              </label>

              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                placeholder={
                  role === "Student"
                    ? "Enter student username"
                    : "Enter teacher username"
                }
                autoComplete="username"
                disabled={loading}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="Enter password"
                autoComplete="current-password"
                disabled={loading}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-sm font-medium text-red-700">
                  ❌ {error}
                </p>
              </div>
            )}

            {/* Login */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-xl py-3.5 font-bold text-white transition-all ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : role === "Student"
                  ? "bg-blue-600 hover:bg-blue-700 active:scale-[0.98]"
                  : "bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]"
              }`}
            >
              {loading
                ? "⏳ Checking..."
                : "Login →"}
            </button>

          </form>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-xs text-gray-400">
              Student Attendance Management System
            </p>
          </div>

        </div>
      </div>
    </main>
  );
}