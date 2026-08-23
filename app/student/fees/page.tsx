"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Student = {
  id: number;
  student_name: string | null;
  student_username: string;
};

type Fee = {
  id: number;
  student_id: number;
  month: number;
  year: number;
  amount: number;
  status: string;
  payment_date: string | null;
  transaction_id: string | null;
  remarks: string | null;
};

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function StudentFeesPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadFees();
  }, []);

  async function loadFees() {
    setLoading(true);
    setError("");

    try {
      const username =
        localStorage.getItem("student_username") ||
        localStorage.getItem("studentUsername") ||
        localStorage.getItem("username");

      if (!username) {
        setError("Student login information not found.");
        setLoading(false);
        return;
      }

      const { data: studentData, error: studentError } =
        await supabase
          .from("students")
          .select(
            "id, student_name, student_username"
          )
          .ilike(
            "student_username",
            username
          )
          .maybeSingle();

      if (studentError) {
        setError(studentError.message);
        setLoading(false);
        return;
      }

      if (!studentData) {
        setError("Student account not found.");
        setLoading(false);
        return;
      }

      setStudent(studentData);

      const { data: feeData, error: feeError } =
        await supabase
          .from("fees")
          .select("*")
          .eq("student_id", studentData.id)
          .order("year", {
            ascending: false,
          })
          .order("month", {
            ascending: false,
          });

      if (feeError) {
        setError(feeError.message);
        setLoading(false);
        return;
      }

      setFees(feeData || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    }

    setLoading(false);
  }

  const totalAmount = fees.reduce(
    (sum, fee) => sum + Number(fee.amount),
    0
  );

  const submittedAmount = fees
    .filter(
      (fee) =>
        fee.status.toUpperCase() === "SUBMITTED"
    )
    .reduce(
      (sum, fee) => sum + Number(fee.amount),
      0
    );

  const pendingAmount = fees
    .filter(
      (fee) =>
        fee.status.toUpperCase() === "PENDING"
    )
    .reduce(
      (sum, fee) => sum + Number(fee.amount),
      0
    );

  const refundedAmount = fees
    .filter(
      (fee) =>
        fee.status.toUpperCase() === "REFUNDED"
    )
    .reduce(
      (sum, fee) => sum + Number(fee.amount),
      0
    );

  function getStatusStyle(status: string) {
    switch (status.toUpperCase()) {
      case "SUBMITTED":
        return {
          background: "#dcfce7",
          color: "#166534",
        };

      case "PENDING":
        return {
          background: "#fef3c7",
          color: "#92400e",
        };

      case "REFUNDED":
        return {
          background: "#ede9fe",
          color: "#5b21b6",
        };

      case "CANCELLED":
        return {
          background: "#fee2e2",
          color: "#991b1b",
        };

      default:
        return {
          background: "#e2e8f0",
          color: "#334155",
        };
    }
  }

  function getStatusIcon(status: string) {
    switch (status.toUpperCase()) {
      case "SUBMITTED":
        return "✓";

      case "PENDING":
        return "⏳";

      case "REFUNDED":
        return "↩️";

      case "CANCELLED":
        return "✕";

      default:
        return "•";
    }
  }

  function formatDate(date: string | null) {
    if (!date) return "—";

    return new Date(
      date + "T00:00:00"
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          💰 Loading Fees...
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}

        <header style={styles.header}>
          <div>
            <div style={styles.smallTitle}>
              STUDENT PORTAL
            </div>

            <h1 style={styles.title}>
              💰 Fees Management
            </h1>

            <p style={styles.subtitle}>
              View your fee payment records
            </p>
          </div>

          <Link
            href="/student/dashboard"
            style={styles.backButton}
          >
            ← Dashboard
          </Link>
        </header>

        {/* STUDENT INFO */}

        <section style={styles.studentCard}>
          <div style={styles.avatar}>
            👨‍🎓
          </div>

          <div>
            <p style={styles.infoLabel}>
              Student
            </p>

            <h2 style={styles.studentName}>
              {student?.student_name ||
                student?.student_username}
            </h2>

            <p style={styles.username}>
              Username:{" "}
              {student?.student_username}
            </p>
          </div>
        </section>

        {/* ERROR */}

        {error && (
          <div style={styles.error}>
            ❌ {error}
          </div>
        )}

        {/* SUMMARY */}

        <section style={styles.statsGrid}>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              💰
            </div>

            <div>
              <p style={styles.statLabel}>
                Total Fees
              </p>

              <h2 style={styles.statValue}>
                ₹
                {totalAmount.toLocaleString(
                  "en-IN"
                )}
              </h2>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              ✅
            </div>

            <div>
              <p style={styles.statLabel}>
                Paid
              </p>

              <h2
                style={{
                  ...styles.statValue,
                  color: "#16a34a",
                }}
              >
                ₹
                {submittedAmount.toLocaleString(
                  "en-IN"
                )}
              </h2>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              ⏳
            </div>

            <div>
              <p style={styles.statLabel}>
                Pending
              </p>

              <h2
                style={{
                  ...styles.statValue,
                  color: "#d97706",
                }}
              >
                ₹
                {pendingAmount.toLocaleString(
                  "en-IN"
                )}
              </h2>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              ↩️
            </div>

            <div>
              <p style={styles.statLabel}>
                Refunded
              </p>

              <h2
                style={{
                  ...styles.statValue,
                  color: "#7c3aed",
                }}
              >
                ₹
                {refundedAmount.toLocaleString(
                  "en-IN"
                )}
              </h2>
            </div>
          </div>

        </section>

        {/* FEE HISTORY */}

        <section style={styles.card}>

          <div style={styles.historyHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                📋 Fee History
              </h2>

              <p style={styles.sectionSubtitle}>
                Your complete monthly fee records
              </p>
            </div>

            <button
              onClick={loadFees}
              style={styles.refreshButton}
            >
              🔄 Refresh
            </button>
          </div>

          {fees.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>
                📭
              </div>

              <h3 style={styles.emptyTitle}>
                No Fee Records
              </h3>

              <p style={styles.emptyText}>
                Your fee records will appear here
                once they are added by your teacher.
              </p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>

              <table style={styles.table}>

                <thead>
                  <tr>

                    <th style={styles.th}>
                      #
                    </th>

                    <th style={styles.th}>
                      Month
                    </th>

                    <th style={styles.th}>
                      Amount
                    </th>

                    <th style={styles.th}>
                      Status
                    </th>

                    <th style={styles.th}>
                      Payment Date
                    </th>

                    <th style={styles.th}>
                      Transaction ID
                    </th>

                    <th style={styles.th}>
                      Remarks
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {fees.map(
                    (fee, index) => (

                      <tr key={fee.id}>

                        <td style={styles.td}>
                          {index + 1}
                        </td>

                        <td style={styles.td}>
                          <strong>
                            {months[
                              fee.month - 1
                            ] || "Unknown"}{" "}
                            {fee.year}
                          </strong>
                        </td>

                        <td style={styles.td}>
                          ₹
                          {Number(
                            fee.amount
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </td>

                        <td style={styles.td}>

                          <span
                            style={{
                              ...styles.badge,
                              ...getStatusStyle(
                                fee.status
                              ),
                            }}
                          >
                            {getStatusIcon(
                              fee.status
                            )}{" "}
                            {fee.status}
                          </span>

                        </td>

                        <td style={styles.td}>
                          {formatDate(
                            fee.payment_date
                          )}
                        </td>

                        <td style={styles.td}>
                          {fee.transaction_id ||
                            "—"}
                        </td>

                        <td style={styles.td}>
                          {fee.remarks || "—"}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>

        {/* PAYMENT INFORMATION */}

        <section style={styles.infoCard}>

          <div style={styles.infoIcon}>
            💡
          </div>

          <div>
            <h3 style={styles.infoTitle}>
              Fee Payment Information
            </h3>

            <p style={styles.infoText}>
              Your fee status is updated by your
              teacher. If you have already paid
              your fees but the status still shows
              Pending, please contact your teacher.
            </p>
          </div>

        </section>

        {/* FOOTER */}

        <footer style={styles.footer}>
          <strong>
            Attendance Portal
          </strong>

          <span>
            Student Fees • 2026
          </span>
        </footer>

      </div>
    </main>
  );
}

const styles: {
  [key: string]: React.CSSProperties;
} = {

  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#eff6ff,#f8fafc,#eef2ff)",
    padding: "20px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "1150px",
    margin: "0 auto",
  },

  header: {
    background: "white",
    borderRadius: "20px",
    padding: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    flexWrap: "wrap",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
  },

  smallTitle: {
    color: "#2563eb",
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "2px",
    marginBottom: "5px",
  },

  title: {
    margin: 0,
    color: "#172554",
    fontSize: "30px",
    fontWeight: "800",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  backButton: {
    textDecoration: "none",
    background: "#1e3a8a",
    color: "white",
    padding: "12px 18px",
    borderRadius: "10px",
    fontWeight: "700",
  },

  studentCard: {
    background:
      "linear-gradient(135deg,#1d4ed8,#4f46e5)",
    color: "white",
    borderRadius: "20px",
    padding: "25px",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    marginBottom: "20px",
    boxShadow:
      "0 12px 30px rgba(37,99,235,0.20)",
  },

  avatar: {
    width: "70px",
    height: "70px",
    borderRadius: "20px",
    background:
      "rgba(255,255,255,0.16)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "38px",
  },

  infoLabel: {
    margin: 0,
    fontSize: "12px",
    opacity: 0.8,
    fontWeight: "700",
  },

  studentName: {
    margin: "4px 0",
    fontSize: "25px",
  },

  username: {
    margin: 0,
    fontSize: "13px",
    opacity: 0.85,
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(200px,1fr))",
    gap: "15px",
    marginBottom: "20px",
  },

  statCard: {
    background: "white",
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
  },

  statIcon: {
    width: "52px",
    height: "52px",
    borderRadius: "15px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "25px",
    flexShrink: 0,
  },

  statLabel: {
    margin: 0,
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "700",
  },

  statValue: {
    margin: "4px 0 0",
    color: "#172554",
    fontSize: "22px",
    fontWeight: "800",
  },

  card: {
    background: "white",
    borderRadius: "20px",
    padding: "25px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
  },

  historyHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "20px",
  },

  sectionTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "21px",
    fontWeight: "800",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  refreshButton: {
    border: "none",
    background: "#2563eb",
    color: "white",
    padding: "10px 15px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    minWidth: "900px",
    borderCollapse: "collapse",
  },

  th: {
    background: "#eff6ff",
    color: "#1e3a8a",
    padding: "13px",
    textAlign: "left",
    borderBottom:
      "2px solid #dbeafe",
    fontSize: "13px",
  },

  td: {
    padding: "14px 13px",
    borderBottom:
      "1px solid #e2e8f0",
    color: "#334155",
    fontSize: "14px",
  },

  badge: {
    display: "inline-block",
    padding: "7px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "800",
  },

  empty: {
    textAlign: "center",
    padding: "45px 20px",
  },

  emptyIcon: {
    fontSize: "45px",
  },

  emptyTitle: {
    margin: "10px 0 5px",
    color: "#172554",
    fontSize: "19px",
  },

  emptyText: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
  },

  infoCard: {
    background:
      "linear-gradient(135deg,#eff6ff,#eef2ff)",
    border:
      "1px solid #dbeafe",
    borderRadius: "18px",
    padding: "22px",
    display: "flex",
    gap: "15px",
    alignItems: "flex-start",
  },

  infoIcon: {
    fontSize: "28px",
  },

  infoTitle: {
    margin: 0,
    color: "#1e3a8a",
    fontSize: "17px",
  },

  infoText: {
    margin: "7px 0 0",
    color: "#475569",
    fontSize: "13px",
    lineHeight: 1.6,
  },

  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "13px 16px",
    borderRadius: "12px",
    marginBottom: "20px",
    fontWeight: "600",
  },

  loading: {
    background: "white",
    maxWidth: "400px",
    margin: "100px auto",
    padding: "40px",
    borderRadius: "20px",
    textAlign: "center",
    fontSize: "18px",
    fontWeight: "700",
  },

  footer: {
    padding: "20px 10px",
    textAlign: "center",
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    flexWrap: "wrap",
    color: "#64748b",
    fontSize: "12px",
  },
};