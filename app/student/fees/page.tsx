"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Fee = {
  id: number;
  month: number;
  year: number;
  amount: number;
  status: string;
  payment_date: string | null;
  transaction_id: string | null;
  remarks: string | null;
};

export default function StudentFeesPage() {
  const router = useRouter();

  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [studentName, setStudentName] = useState("Student");
  const [studentId, setStudentId] = useState("");

  useEffect(() => {
    const name =
      localStorage.getItem("studentName") ||
      localStorage.getItem("student_name") ||
      "Student";

    const username =
      localStorage.getItem("studentUsername") ||
      localStorage.getItem("student_username") ||
      "";

    setStudentName(name);
    setStudentId(username);

    loadFees(username);
  }, []);

  async function loadFees(username: string) {
    try {
      setLoading(true);
      setError("");

      /*
       * This page intentionally does not use hard-coded fee data.
       * The database/API can be connected here.
       *
       * For now, an empty list is shown instead of fake fee records.
       */

      if (!username) {
        setFees([]);
        return;
      }

      setFees([]);
    } catch (err) {
      console.error(err);
      setError("Unable to load fee information.");
    } finally {
      setLoading(false);
    }
  }

  function formatMoney(amount: number) {
    const value = Number(amount || 0).toLocaleString("en-IN");
    return "Rs. " + value;
  }

  function formatDate(date: string | null) {
    if (!date) return "-";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return date;
    }

    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getStatusLabel(status: string) {
    switch (status.toUpperCase()) {
      case "SUBMITTED":
        return "SUBMITTED";

      case "PENDING":
        return "PENDING";

      case "REFUNDED":
        return "REFUNDED";

      case "CANCELLED":
        return "CANCELLED";

      default:
        return status.toUpperCase();
    }
  }

  function getStatusStyle(status: string) {
    const value = status.toUpperCase();

    if (value === "SUBMITTED") {
      return {
        background: "#dcfce7",
        color: "#166534",
      };
    }

    if (value === "PENDING") {
      return {
        background: "#fef3c7",
        color: "#92400e",
      };
    }

    if (value === "REFUNDED") {
      return {
        background: "#dbeafe",
        color: "#1e40af",
      };
    }

    if (value === "CANCELLED") {
      return {
        background: "#fee2e2",
        color: "#991b1b",
      };
    }

    return {
      background: "#f1f5f9",
      color: "#475569",
    };
  }

  const totalFees = fees.reduce(
    (sum, fee) => sum + Number(fee.amount || 0),
    0
  );

  const submittedFees = fees
    .filter(
      (fee) => fee.status.toUpperCase() === "SUBMITTED"
    )
    .reduce(
      (sum, fee) => sum + Number(fee.amount || 0),
      0
    );

  const pendingFees = fees
    .filter(
      (fee) => fee.status.toUpperCase() === "PENDING"
    )
    .reduce(
      (sum, fee) => sum + Number(fee.amount || 0),
      0
    );

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        <header style={styles.header}>
          <div>
            <div style={styles.badge}>
              STUDENT PORTAL
            </div>

            <h1 style={styles.title}>
              My Fees
            </h1>

            <p style={styles.subtitle}>
              View your fee records and payment status
            </p>

            {studentId && (
              <p style={styles.username}>
                Student: {studentName} • {studentId}
              </p>
            )}
          </div>

          <button
            onClick={() => router.push("/student/dashboard")}
            style={styles.backButton}
          >
            ← Student Dashboard
          </button>
        </header>

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
                {formatMoney(totalFees)}
              </h2>

              <p style={styles.statText}>
                Total fee amount
              </p>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              ✅
            </div>

            <div>
              <p style={styles.statLabel}>
                Submitted
              </p>

              <h2 style={styles.statValue}>
                {formatMoney(submittedFees)}
              </h2>

              <p style={styles.statText}>
                Submitted amount
              </p>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              ⚠️
            </div>

            <div>
              <p style={styles.statLabel}>
                Pending
              </p>

              <h2 style={styles.statValue}>
                {formatMoney(pendingFees)}
              </h2>

              <p style={styles.statText}>
                Amount pending
              </p>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              📊
            </div>

            <div>
              <p style={styles.statLabel}>
                Fee Records
              </p>

              <h2 style={styles.statValue}>
                {fees.length}
              </h2>

              <p style={styles.statText}>
                Total fee records
              </p>
            </div>
          </div>

        </section>

        <section style={styles.card}>

          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                📋 Fee Details
              </h2>

              <p style={styles.sectionSubtitle}>
                Complete details of your fees
              </p>
            </div>

            <button
              onClick={() => loadFees(studentId)}
              style={styles.refreshButton}
            >
              🔄 Refresh
            </button>
          </div>

          {loading && (
            <div style={styles.messageBox}>
              <div style={styles.messageIcon}>
                ⏳
              </div>

              <h3 style={styles.messageTitle}>
                Loading fee information...
              </h3>

              <p style={styles.messageText}>
                Please wait.
              </p>
            </div>
          )}

          {!loading && error && (
            <div style={styles.errorBox}>
              <div style={styles.messageIcon}>
                ❌
              </div>

              <h3 style={styles.messageTitle}>
                Unable to load fees
              </h3>

              <p style={styles.messageText}>
                {error}
              </p>
            </div>
          )}

          {!loading && !error && fees.length === 0 && (
            <div style={styles.emptyBox}>
              <div style={styles.emptyIcon}>
                💰
              </div>

              <h3 style={styles.messageTitle}>
                No fee records found
              </h3>

              <p style={styles.messageText}>
                No fee records are currently available for
                this student.
              </p>
            </div>
          )}

          {!loading && !error && fees.length > 0 && (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>
                      Month
                    </th>

                    <th style={styles.th}>
                      Year
                    </th>

                    <th style={styles.th}>
                      Amount
                    </th>

                    <th style={styles.th}>
                      Payment Date
                    </th>

                    <th style={styles.th}>
                      Status
                    </th>

                    <th style={styles.th}>
                      Transaction ID
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {fees.map((fee) => (
                    <tr key={fee.id}>

                      <td style={styles.td}>
                        {fee.month}
                      </td>

                      <td style={styles.td}>
                        {fee.year}
                      </td>

                      <td style={styles.amountCell}>
                        {formatMoney(Number(fee.amount))}
                      </td>

                      <td style={styles.td}>
                        {formatDate(fee.payment_date)}
                      </td>

                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.statusBadge,
                            ...getStatusStyle(fee.status),
                          }}
                        >
                          {getStatusLabel(fee.status)}
                        </span>
                      </td>

                      <td style={styles.td}>
                        {fee.transaction_id || "-"}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </section>

        <section style={styles.infoCard}>

          <div style={styles.infoIcon}>
            💡
          </div>

          <div>
            <h3 style={styles.infoTitle}>
              Fee Information
            </h3>

            <p style={styles.infoText}>
              Your fee records are shown according to
              the information available for your student
              account.
            </p>
          </div>

        </section>

        <footer style={styles.footer}>
          Attendance Portal • Student Fees • 2026
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
    padding: "20px 15px",
    boxSizing: "border-box",
    fontFamily: "Arial, Helvetica, sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
  },

  header: {
    background: "white",
    borderRadius: "20px",
    padding: "25px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    flexWrap: "wrap",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
    marginBottom: "20px",
  },

  badge: {
    display: "inline-block",
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: "800",
    letterSpacing: "1px",
  },

  title: {
    margin: "8px 0 0",
    color: "#172554",
    fontSize: "30px",
    fontWeight: "800",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  username: {
    margin: "8px 0 0",
    color: "#475569",
    fontSize: "12px",
    fontWeight: "700",
  },

  backButton: {
    border: "none",
    background: "#1e3a8a",
    color: "white",
    padding: "12px 18px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
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
    borderRadius: "14px",
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
    margin: "4px 0",
    color: "#172554",
    fontSize: "22px",
  },

  statText: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "11px",
  },

  card: {
    background: "white",
    borderRadius: "20px",
    padding: "24px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    flexWrap: "wrap",
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
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
    padding: "9px 14px",
    borderRadius: "9px",
    fontWeight: "700",
    cursor: "pointer",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "750px",
  },

  th: {
    background: "#eff6ff",
    color: "#1e3a8a",
    padding: "13px 10px",
    textAlign: "left",
    fontSize: "12px",
    fontWeight: "800",
    borderBottom: "1px solid #dbeafe",
  },

  td: {
    padding: "14px 10px",
    color: "#475569",
    fontSize: "12px",
    borderBottom: "1px solid #e2e8f0",
  },

  amountCell: {
    padding: "14px 10px",
    color: "#172554",
    fontSize: "13px",
    fontWeight: "800",
    borderBottom: "1px solid #e2e8f0",
  },

  statusBadge: {
    display: "inline-block",
    padding: "6px 9px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: "800",
  },

  messageBox: {
    textAlign: "center",
    padding: "45px 20px",
    background: "#f8fafc",
    borderRadius: "15px",
  },

  emptyBox: {
    textAlign: "center",
    padding: "45px 20px",
    background: "#f8fafc",
    borderRadius: "15px",
  },

  errorBox: {
    textAlign: "center",
    padding: "45px 20px",
    background: "#fef2f2",
    borderRadius: "15px",
  },

  emptyIcon: {
    fontSize: "45px",
    marginBottom: "10px",
  },

  messageIcon: {
    fontSize: "35px",
    marginBottom: "10px",
  },

  messageTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "17px",
  },

  messageText: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  infoCard: {
    marginTop: "20px",
    background: "#eff6ff",
    border: "1px solid #dbeafe",
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    gap: "14px",
    alignItems: "flex-start",
  },

  infoIcon: {
    fontSize: "27px",
  },

  infoTitle: {
    margin: 0,
    color: "#1e3a8a",
    fontSize: "16px",
  },

  infoText: {
    margin: "6px 0 0",
    color: "#475569",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  footer: {
    textAlign: "center",
    padding: "25px 10px 10px",
    color: "#64748b",
    fontSize: "12px",
  },
};
