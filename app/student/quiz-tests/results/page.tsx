"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function StudentResultsContent() {
  const searchParams = useSearchParams();
  const quizId = searchParams.get("quizId");

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "30px 20px",
        background: "#f8fafc",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 20,
          padding: 30,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ marginTop: 0 }}>🏆 Quiz Result</h1>

        <p>
          Quiz ID: <strong>{quizId || "Not selected"}</strong>
        </p>

        <p style={{ color: "#64748b" }}>
          Student result page is ready.
        </p>
      </div>
    </main>
  );
}

export default function StudentQuizResultsPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: "100vh",
            padding: 40,
            textAlign: "center",
            fontFamily: "Arial, sans-serif",
          }}
        >
          Loading Result...
        </main>
      }
    >
      <StudentResultsContent />
    </Suspense>
  );
}