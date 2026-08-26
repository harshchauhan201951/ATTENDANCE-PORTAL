"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Student = {
  id: number;
  student_name: string | null;
  student_username: string;
  admission_date: string | null;
  date_of_birth: string | null;
  father_name: string | null;
  mother_name: string | null;
  father_phone: string | null;
  mother_phone: string | null;
  address: string | null;
  city: string | null;
  class_name: string | null;
  blood_group: string | null;
};

export default function StudentProfilePage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const loadStudent = useCallback(async () => {
    setErrorMessage("");

    try {
      const username =
        localStorage.getItem("student_username") ||
        localStorage.getItem("studentUsername");

      const studentId =
        localStorage.getItem("studentId");

      if (!username && !studentId) {
        setStudent(null);
        setErrorMessage(
          "Student login information nahi mili. Please logout karke dobara login karein."
        );
        return;
      }

      let query = supabase
        .from("students")
        .select(`
          id,
          student_name,
          student_username,
          admission_date,
          date_of_birth,
          father_name,
          mother_name,
          father_phone,
          mother_phone,
          address,
          city,
          class_name,
          blood_group
        `);

      if (studentId) {
        query = query.eq("id", Number(studentId));
      } else {
        query = query.eq(
          "student_username",
          username
        );
      }

      const { data, error } =
        await query.maybeSingle();

      if (error) {
        console.error(
          "Student profile error:",
          error
        );

        setStudent(null);
        setErrorMessage(
          "Profile load nahi ho rahi: " +
            error.message
        );

        return;
      }

      if (!data) {
        setStudent(null);
        setErrorMessage(
          "Student profile nahi mili."
        );

        return;
      }

      /*
       * IMPORTANT:
       * Always use the latest data directly
       * from Supabase.
       *
       * Teacher ke Students Management mein
       * jo bhi update hoga, wahi yahan show hoga.
       */
      setStudent(data as Student);

      setLastUpdated(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    } catch (error: any) {
      console.error(
        "Unexpected profile error:",
        error
      );

      setStudent(null);
      setErrorMessage(
        error?.message ||
          "Profile load karte waqt problem hui."
      );
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function firstLoad() {
      if (!mounted) return;

      setLoading(true);
      await loadStudent();

      if (mounted) {
        setLoading(false);
      }
    }

    firstLoad();

    return () => {
      mounted = false;
    };
  }, [loadStudent]);

  async function refreshProfile() {
    if (refreshing) return;

    setRefreshing(true);
    await loadStudent();
    setRefreshing(false);
  }

  function formatDate(date: string | null) {
    if (!date) {
      return "Not Added";
    }

    const parsedDate = new Date(
      `${date}T00:00:00`
    );

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );
  }

  function value(
    text: string | null | undefined
  ) {
    if (!text || !text.trim()) {
      return "Not Added";
    }

    return text;
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingIcon}>
            ⏳
          </div>

          <h2 style={styles.loadingTitle}>
            Loading Profile...
          </h2>

          <p style={styles.loadingText}>
            Please wait.
          </p>
        </div>
      </main>
    );
  }

  if (!student) {
    return (
      <main style={styles.page}>
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>
            ⚠️
          </div>

          <h2 style={styles.errorTitle}>
            Profile Not Available
          </h2>

          <p style={styles.errorText}>
            {errorMessage ||
              "Student profile load nahi ho saki."}
          </p>

          <button
            type="button"
            onClick={refreshProfile}
            style={styles.retryButton}
          >
            🔄 Try Again
          </button>
        </div>
      </main>
    );
  }

  const firstLetter =
    (student.student_name || "S")
      .charAt(0)
      .toUpperCase();

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}

        <header style={styles.header}>
          <div>
            <div style={styles.badge}>
              STUDENT PORTAL
            </div>

            <h1 style={styles.title}>
              👤 My Profile
            </h1>

            <p style={styles.subtitle}>
              Your complete student information
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.history.back()}
            style={styles.backButton}
          >
            ← Back
          </button>
        </header>

        {/* PROFILE HERO */}

        <section style={styles.profileHero}>
          <div style={styles.avatar}>
            {firstLetter}
          </div>

          <div style={styles.heroInfo}>
            <h2 style={styles.studentName}>
              {value(student.student_name)}
            </h2>

            <div style={styles.usernameBadge}>
              {student.student_username}
            </div>

            <p style={styles.heroText}>
              Your profile is managed by your teacher.
            </p>
          </div>
        </section>

        {/* PERSONAL DETAILS */}

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>
              👤
            </div>

            <div>
              <h2 style={styles.cardTitle}>
                Personal Details
              </h2>

              <p style={styles.cardSubtitle}>
                Your basic student information
              </p>
            </div>
          </div>

          <div style={styles.detailsGrid}>
            <Detail
              label="Student Name"
              value={value(student.student_name)}
            />

            <Detail
              label="Username"
              value={student.student_username}
            />

            <Detail
              label="Date of Birth"
              value={formatDate(student.date_of_birth)}
            />

            <Detail
              label="Admission Date"
              value={formatDate(student.admission_date)}
            />

            <Detail
              label="Class"
              value={value(student.class_name)}
            />

            <Detail
              label="Blood Group"
              value={value(student.blood_group)}
            />
          </div>
        </section>

        {/* PARENTS DETAILS */}

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>
              👨‍👩‍👦
            </div>

            <div>
              <h2 style={styles.cardTitle}>
                Parents / Guardian Details
              </h2>

              <p style={styles.cardSubtitle}>
                Information provided by the teacher
              </p>
            </div>
          </div>

          <div style={styles.detailsGrid}>
            <Detail
              label="Father's Name"
              value={value(student.father_name)}
            />

            <Detail
              label="Father's Phone"
              value={value(student.father_phone)}
            />

            <Detail
              label="Mother's Name"
              value={value(student.mother_name)}
            />

            <Detail
              label="Mother's Phone"
              value={value(student.mother_phone)}
            />
          </div>
        </section>

        {/* ADDRESS */}

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>
              🏠
            </div>

            <div>
              <h2 style={styles.cardTitle}>
                Address Details
              </h2>

              <p style={styles.cardSubtitle}>
                Your residential information
              </p>
            </div>
          </div>

          <div style={styles.detailsGrid}>
            <Detail
              label="City"
              value={value(student.city)}
            />

            <div style={styles.detailBox}>
              <div style={styles.detailLabel}>
                Complete Address
              </div>

              <div style={styles.addressValue}>
                {value(student.address)}
              </div>
            </div>
          </div>
        </section>

        {/* INFORMATION */}

        <div style={styles.infoBox}>
          <div style={styles.infoIcon}>
            ℹ️
          </div>

          <div>
            <strong style={styles.infoTitle}>
              Profile Information
            </strong>

            <p style={styles.infoText}>
              Your profile details are managed by
              the teacher. Whenever your details are
              updated by the teacher, the updated
              information will appear here automatically.
            </p>
          </div>
        </div>

        {/* REFRESH */}

        <button
          type="button"
          onClick={refreshProfile}
          disabled={refreshing}
          style={{
            ...styles.refreshButton,
            opacity: refreshing ? 0.7 : 1,
            cursor: refreshing
              ? "not-allowed"
              : "pointer",
          }}
        >
          {refreshing
            ? "🔄 Updating..."
            : "🔄 Refresh Profile"}
        </button>

        {lastUpdated && (
          <p style={styles.updatedText}>
            Latest profile data loaded at {lastUpdated}
          </p>
        )}

        <footer style={styles.footer}>
          Attendance Portal • Student Profile • 2026
        </footer>
      </div>
    </main>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={styles.detailBox}>
      <div style={styles.detailLabel}>
        {label}
      </div>

      <div style={styles.detailValue}>
        {value}
      </div>
    </div>
  );
}

const styles: {
  [key: string]: React.CSSProperties;
} = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#eef2ff,#f8fafc,#eff6ff)",
    padding: "25px 15px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#0f172a",
  },

  container: {
    width: "100%",
    maxWidth: "1100px",
    margin: "0 auto",
  },

  header: {
    background: "#ffffff",
    borderRadius: "22px",
    padding: "25px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "18px",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.08)",
    flexWrap: "wrap",
  },

  badge: {
    display: "inline-block",
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "7px 12px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "1px",
    marginBottom: "9px",
  },

  title: {
    margin: 0,
    fontSize: "30px",
    fontWeight: "900",
    color: "#0f172a",
  },

  subtitle: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: "14px",
    fontWeight: "600",
  },

  backButton: {
    border: "none",
    background: "#475569",
    color: "#ffffff",
    padding: "11px 18px",
    borderRadius: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  profileHero: {
    background:
      "linear-gradient(135deg,#2563eb,#7c3aed)",
    borderRadius: "22px",
    padding: "30px",
    display: "flex",
    alignItems: "center",
    gap: "20px",
    marginBottom: "18px",
    boxShadow:
      "0 12px 35px rgba(37,99,235,0.22)",
  },

  avatar: {
    width: "90px",
    height: "90px",
    minWidth: "90px",
    borderRadius: "50%",
    background: "#ffffff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "40px",
    fontWeight: "900",
    boxShadow:
      "0 8px 25px rgba(0,0,0,0.15)",
  },

  heroInfo: {
    minWidth: 0,
  },

  studentName: {
    margin: 0,
    color: "#ffffff",
    fontSize: "28px",
    fontWeight: "900",
    wordBreak: "break-word",
  },

  usernameBadge: {
    display: "inline-block",
    marginTop: "8px",
    background:
      "rgba(255,255,255,0.18)",
    border:
      "1px solid rgba(255,255,255,0.3)",
    color: "#ffffff",
    padding: "6px 10px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "900",
  },

  heroText: {
    margin: "8px 0 0",
    color: "#dbeafe",
    fontSize: "13px",
    fontWeight: "700",
  },

  card: {
    background: "#ffffff",
    borderRadius: "22px",
    padding: "24px",
    marginBottom: "18px",
    boxShadow:
      "0 9px 28px rgba(15,23,42,0.07)",
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
  },

  cardIcon: {
    width: "45px",
    height: "45px",
    borderRadius: "12px",
    background: "#dbeafe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    flexShrink: 0,
  },

  cardTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "20px",
    fontWeight: "900",
  },

  cardSubtitle: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "600",
  },

  detailsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: "14px",
  },

  detailBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "13px",
    padding: "15px",
    minWidth: 0,
  },

  detailLabel: {
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "7px",
  },

  detailValue: {
    color: "#0f172a",
    fontSize: "15px",
    fontWeight: "800",
    wordBreak: "break-word",
  },

  addressValue: {
    color: "#0f172a",
    fontSize: "14px",
    fontWeight: "700",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },

  infoBox: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "15px",
    padding: "16px",
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    marginBottom: "15px",
  },

  infoIcon: {
    fontSize: "20px",
    flexShrink: 0,
  },

  infoTitle: {
    color: "#1e3a8a",
    fontSize: "14px",
  },

  infoText: {
    margin: "5px 0 0",
    color: "#475569",
    fontSize: "12px",
    lineHeight: 1.6,
    fontWeight: "600",
  },

  refreshButton: {
    display: "block",
    margin: "0 auto",
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "12px 20px",
    borderRadius: "10px",
    fontWeight: "900",
  },

  updatedText: {
    textAlign: "center",
    marginTop: "10px",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "600",
  },

  loadingCard: {
    maxWidth: "500px",
    margin: "80px auto",
    background: "#ffffff",
    borderRadius: "22px",
    padding: "45px 25px",
    textAlign: "center",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.08)",
  },

  loadingIcon: {
    fontSize: "40px",
  },

  loadingTitle: {
    margin: "15px 0 5px",
    color: "#172554",
    fontWeight: "900",
  },

  loadingText: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
  },

  errorCard: {
    maxWidth: "550px",
    margin: "80px auto",
    background: "#ffffff",
    borderRadius: "22px",
    padding: "40px 25px",
    textAlign: "center",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.08)",
  },

  errorIcon: {
    fontSize: "45px",
  },

  errorTitle: {
    margin: "15px 0 8px",
    color: "#991b1b",
    fontWeight: "900",
  },

  errorText: {
    color: "#64748b",
    fontSize: "13px",
    lineHeight: 1.6,
  },

  retryButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "11px 20px",
    borderRadius: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  footer: {
    textAlign: "center",
    padding: "25px 10px",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "700",
  },
};