"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

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
  created_at: string;
};

const months = [
  "",
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
  const [fees, setFees] = useState<Fee[]>([]);
  const [studentName, setStudentName] = useState("");
  const [studentUsername, setStudentUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadFees();
  }, []);

  async function loadFees() {
    try {
      setLoading(true);
      setError("");

      /*
       * We use username first.
       * This avoids depending only on localStorage studentId.
       */
      const username =
        localStorage.getItem("studentUsername") ||
        localStorage.getItem("student_username");

      if (!username) {
        setError(
          "Student login information not found. Please login again."
        );
        setLoading(false);
        return;
      }

      const cleanUsername =
        username.trim().toUpperCase();

      /*
       * Find the actual student record.
       */
      const {
        data: student,
        error: studentError,
      } = await supabase
        .from("students")
        .select(
          "id, student_name, student_username"
        )
        .eq(
          "student_username",
          cleanUsername
        )
        .maybeSingle();

      if (studentError) {
        console.error(
          "Student lookup error:",
          studentError
        );

        setError(
          "Unable to find student account."
        );
        setLoading(false);
        return;
      }

      if (!student) {
        setError(
          "Student account not found."
        );
        setLoading(false);
        return;
      }

      setStudentName(
        student.student_name ||
          "Student"
      );

      setStudentUsername(
        student.student_username
      );

      /*
       * IMPORTANT:
       * fees.student_id is linked to students.id.
       */
      const {
        data: feeData,
        error: feeError,
      } = await supabase
        .from("fees")
        .select(
          "id, student_id, month, year, amount, status, payment_date, transaction_id, remarks, created_at"
        )
        .eq(
          "student_id",
          student.id
        )
        .order("year", {
          ascending: false,
        })
        .order("month", {
          ascending: false,
        });

      if (feeError) {
        console.error(
          "Fee loading error:",
          feeError
        );

        setError(
          "Unable to load fee information."
        );

        setFees([]);
        setLoading(false);
        return;
      }

      setFees(feeData || []);
    } catch (err) {
      console.error(
        "Unexpected fee error:",
        err
      );

      setError(
        "Something went wrong while loading fees."
      );

      setFees([]);
    } finally {
      setLoading(false);
    }
  }

  const totalFees = fees.reduce(
    (sum, fee) =>
      sum + Number(fee.amount || 0),
    0
  );

  const submittedFees = fees
    .filter(
      (fee) =>
        String(fee.status).toUpperCase() ===
        "SUBMITTED"
    )
    .reduce(
      (sum, fee) =>
        sum + Number(fee.amount || 0),
      0
    );

  const pendingFees = fees
    .filter(
      (fee) =>
        String(fee.status).toUpperCase() ===
        "PENDING"
    )
    .reduce(
      (sum, fee) =>
        sum + Number(fee.amount || 0),
      0
    );

  if (loading) {
    return (
      <main style={styles.loadingPage}>
        <div style={styles.loadingBox}>
          💳
          <h2>Loading Fees...</h2>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>
              💳 My Fees
            </h1>

            <p style={styles.subtitle}>
              {studentName}
              {studentUsername
                ? ` • ${studentUsername}`
                : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={loadFees}
            style={styles.refreshButton}
          >
            🔄 Refresh
          </button>
        </div>

        {error && (
          <div style={styles.error}>
            ⚠️ {error}
          </div>
        )}

        <div style={styles.summaryGrid}>

          <div style={styles.summaryCard}>
            <div style={styles.icon}>
              💰
            </div>

            <div>
              <p style={styles.label}>
                Total Fees
              </p>

              <h2 style={styles.amount}>
                ₹
                {totalFees.toLocaleString(
                  "en-IN"
                )}
              </h2>
            </div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.icon}>
              ✅
            </div>

            <div>
              <p style={styles.label}>
                Submitted
              </p>

              <h2 style={styles.amount}>
                ₹
                {submittedFees.toLocaleString(
                  "en-IN"
                )}
              </h2>
            </div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.icon}>
              ⏳
            </div>

            <div>
              <p style={styles.label}>
                Pending
              </p>

              <h2 style={styles.amount}>
                ₹
                {pendingFees.toLocaleString(
                  "en-IN"
                )}
              </h2>
            </div>
          </div>

        </div>

        <section style={styles.card}>

          <h2 style={styles.sectionTitle}>
            📋 Fee Details
          </h2>

          <p style={styles.sectionSubtitle}>
            Fees assigned by your teacher
          </p>

          {fees.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>
                💳
              </div>

              <h3>No Fees Assigned</h3>

              <p>
                Your teacher has not assigned
                any fees yet.
              </p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
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
                  {fees.map((fee) => {
                    const status =
                      String(
                        fee.status || ""
                      ).toUpperCase();

                    return (
                      <tr key={fee.id}>

                        <td style={styles.td}>
                          <strong>
                            {months[fee.month] ||
                              `Month ${fee.month}`}
                          </strong>{" "}
                          {fee.year}
                        </td>

                        <td style={styles.td}>
                          <strong>
                            ₹
                            {Number(
                              fee.amount || 0
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </strong>
                        </td>

                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.status,
                              background:
                                status ===
                                "SUBMITTED"
                                  ? "#dcfce7"
                                  : status ===
                                    "PENDING"
                                  ? "#fef3c7"
                                  : "#e5e7eb",
                              color:
                                status ===
                                "SUBMITTED"
                                  ? "#166534"
                                  : status ===
                                    "PENDING"
                                  ? "#92400e"
                                  : "#374151",
                            }}
                          >
                            {status ===
                            "SUBMITTED"
                              ? "✓ SUBMITTED"
                              : status}
                          </span>
                        </td>

                        <td style={styles.td}>
                          {fee.payment_date ||
                            "—"}
                        </td>

                        <td style={styles.td}>
                          {fee.transaction_id ||
                            "—"}
                        </td>

                        <td style={styles.td}>
                          {fee.remarks || "—"}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div style={styles.info}>
          <strong>
            💡 Fee Information
          </strong>

          <p>
            Fees are assigned and managed by
            your teacher. You can only view
            fees assigned to your account.
          </p>
        </div>

        <footer style={styles.footer}>
          Attendance Portal • Student Fees • 2026
        </footer>

      </div>
    </main>
  );
}

const styles: Record<
  string,
  React.CSSProperties
> = {
  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f7fb",
    fontFamily: "Arial, sans-serif",
  },

  loadingBox: {
    background: "white",
    padding: "40px",
    borderRadius: "18px",
    textAlign: "center",
    boxShadow:
      "0 8px 25px rgba(0,0,0,0.08)",
    fontSize: "40px",
  },

  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    padding: "24px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    boxSizing: "border-box",
  },

  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "25px",
    flexWrap: "wrap",
  },

  title: {
    margin: 0,
    color: "#111827",
    fontSize: "32px",
    fontWeight: 800,
  },

  subtitle: {
    margin: "7px 0 0",
    color: "#6b7280",
    fontSize: "15px",
  },

  refreshButton: {
    border: "none",
    background: "#111827",
    color: "white",
    padding: "11px 17px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: 700,
  },

  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "14px",
    borderRadius: "10px",
    marginBottom: "20px",
    fontWeight: 600,
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: "16px",
    marginBottom: "25px",
  },

  summaryCard: {
    background: "white",
    borderRadius: "15px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    boxShadow:
      "0 4px 14px rgba(0,0,0,0.06)",
  },

  icon: {
    fontSize: "30px",
  },

  label: {
    margin: 0,
    color: "#6b7280",
    fontSize: "14px",
  },

  amount: {
    margin: "5px 0 0",
    color: "#111827",
    fontSize: "25px",
  },

  card: {
    background: "white",
    borderRadius: "15px",
    padding: "25px",
    boxShadow:
      "0 4px 14px rgba(0,0,0,0.06)",
  },

  sectionTitle: {
    margin: 0,
    color: "#111827",
    fontSize: "23px",
  },

  sectionSubtitle: {
    color: "#6b7280",
    marginTop: "7px",
    marginBottom: "20px",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    minWidth: "800px",
    borderCollapse: "collapse",
  },

  th: {
    background: "#f9fafb",
    color: "#374151",
    padding: "13px",
    textAlign: "left",
    borderBottom:
      "1px solid #e5e7eb",
    fontSize: "13px",
  },

  td: {
    padding: "14px 13px",
    borderBottom:
      "1px solid #e5e7eb",
    color: "#374151",
    fontSize: "14px",
  },

  status: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  empty: {
    textAlign: "center",
    padding: "50px 10px",
    color: "#6b7280",
  },

  emptyIcon: {
    fontSize: "50px",
  },

  info: {
    marginTop: "20px",
    background: "#eff6ff",
    color: "#1e40af",
    padding: "18px",
    borderRadius: "12px",
  },

  footer: {
    textAlign: "center",
    color: "#9ca3af",
    marginTop: "25px",
    fontSize: "13px",
  },
};