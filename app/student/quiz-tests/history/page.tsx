"use client";

import { useEffect } from "react";

export default function StudentQuizHistoryPage() {
  useEffect(() => {
    document.title = "Quiz History";
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 20px",
        background: "#f8fafc",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: 20,
          padding: 30,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 30 }}>📚 Quiz History</h1>

        <p style={{ marginTop: 12, color: "#64748b" }}>
          Quiz history page is ready.
        </p>
      </div>
    </main>
  );
}