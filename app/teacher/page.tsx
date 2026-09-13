"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TeacherPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/teacher/dashboard");
  }, [router]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: "#0f172a",
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: "30px",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            margin: "0 auto 14px",
            borderRadius: "50%",
            border: "4px solid #e2e8f0",
            borderTopColor: "#4f46e5",
            animation: "teacher-page-spin 0.8s linear infinite",
          }}
        />

        <h1
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: 900,
          }}
        >
          Opening Teacher Dashboard...
        </h1>

        <p
          style={{
            marginTop: "8px",
            fontSize: "12px",
            color: "#64748b",
          }}
        >
          Please wait
        </p>
      </div>

      <style jsx>{`
        @keyframes teacher-page-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  );
}