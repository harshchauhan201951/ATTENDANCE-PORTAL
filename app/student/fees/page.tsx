"use client";

import { useRouter } from "next/navigation";

type FeeRecord = {
  id: number;
  title: string;
  amount: number;
  paid: number;
  pending: number;
  status: "PAID" | "PARTIAL" | "PENDING";
  dueDate: string;
  paymentDate: string;
};

const feeRecords: FeeRecord[] = [
  {
    id: 1,
    title: "Tuition Fee",
    amount: 45000,
    paid: 45000,
    pending: 0,
    status: "PAID",
    dueDate: "2026-08-10",
    paymentDate: "2026-08-05",
  },
  {
    id: 2,
    title: "Examination Fee",
    amount: 2500,
    paid: 2500,
    pending: 0,
    status: "PAID",
    dueDate: "2026-09-05",
    paymentDate: "2026-08-20",
  },
  {
    id: 3,
    title: "Library Fee",
    amount: 1500,
    paid: 1000,
    pending: 500,
    status: "PARTIAL",
    dueDate: "2026-09-15",
    paymentDate: "2026-08-22",
  },
  {
    id: 4,
    title: "Activity Fee",
    amount: 2000,
    paid: 0,
    pending: 2000,
    status: "PENDING",
    dueDate: "2026-09-20",
    paymentDate: "-",
  },
];

export default function StudentFeesPage() {
  const router = useRouter();

  const totalAmount = feeRecords.reduce(
    (sum, fee) => sum + fee.amount,
    0
  );

  const totalPaid = feeRecords.reduce(
    (sum, fee) => sum + fee.paid,
    0
  );

  const totalPending = feeRecords.reduce(
    (sum, fee) => sum + fee.pending,
    0
  );

  function formatCurrency(amount: number) {
    return `₹${amount.toLocaleString("en-IN")}`;
  }

  function statusColor(status: FeeRecord["status"]) {
    if (status === "PAID") return "#15803d";
    if (status === "PARTIAL") return "#ca8a04";
    return "#dc2626";
  }

  function statusBackground(status: FeeRecord["status"]) {
    if (status === "PAID") return "#dcfce7";
    if (status === "PARTIAL") return "#fef9c3";
    return "#fee2e2";
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}

        <header style={styles.header}>
          <div>
            <div style={styles.smallHeading}>
              STUDENT PORTAL
            </div>

            <h1 style={styles.title}>
              💰 My Fees
            </h1>

            <p style={styles.subtitle}>
              View your paid, pending and fee payment details
            </p>
          </div>

          <button
            onClick={() => router.push("/student/dashboard")}
            style={styles.backButton}
          >
            ← Student Dashboard
          </button>
        </header>

        {/* SUMMARY */}

        <section style={styles.summaryGrid}>

          <div style={styles.summaryCard}>
            <div
              style={{
                ...styles.summaryIcon,
                background: "#eff6ff",
              }}
            >
              💰
            </div>

            <div>
              <p style={styles.summaryLabel}>
                Total Fees
              </p>

              <h2 style={styles.summaryValue}>
                {formatCurrency(totalAmount)}
              </h2>

              <p style={styles.summaryDescription}>
                Total fee amount
              </p>
            </div>
          </div>

          <div style={styles.summaryCard}>
            <div
              style={{
                ...styles.summaryIcon,
                background: "#dcfce7",
              }}
            >
              ✅
            </div>

            <div>
              <p style={styles.summaryLabel}>
                Paid
              </p>

              <h2
                style={{
                  ...styles.summaryValue,
                  color: "#15803d",
                }}
              >
                {formatCurrency(totalPaid)}
              </h2>

              <p style={styles.summaryDescription}>
                Amount paid
              </p>
            </div>
          </div>

          <div style={styles.summaryCard}>
            <div
              style={{
                ...styles.summaryIcon,
                background: "#fee2e2",
              }}
            >
              ⚠️
            </div>

            <div>
              <p style={styles.summaryLabel}>
                Pending
              </p>

              <h2
                style={{
                  ...styles.summaryValue,
                  color: "#dc2626",
                }}
              >
                {formatCurrency(totalPending)}
              </h2>

              <p style={styles.summaryDescription}>
                Amount remaining
              </p>
            </div>
          </div>

          <div style={styles.summaryCard}>
            <div
              style={{
                ...styles.summaryIcon,
                background: "#f3e8ff",
              }}
            >
              📊
            </div>

            <div>
              <p style={styles.summaryLabel}>
                Fee Items
              </p>

              <h2 style={styles.summaryValue}>
                {feeRecords.length}
              </h2>

              <p style={styles.summaryDescription}>
                Total fee records
              </p>
            </div>
          </div>

        </section>

        {/* FEE STATUS */}

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
          </div>

          <div style={styles.tableWrapper}>
            <table style={styles.table}>

              <thead>
                <tr>
                  <th style={styles.th}>Fee</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Paid</th>
                  <th style={styles.th}>Pending</th>
                  <th style={styles.th}>Due Date</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>

              <tbody>
                {feeRecords.map((fee) => (
                  <tr key={fee.id}>

                    <td style={styles.td}>
                      <strong style={styles.feeTitle}>
                        {fee.title}
                      </strong>
                    </td>

                    <td style={styles.td}>
                      {formatCurrency(fee.amount)}
                    </td>

                    <td
                      style={{
                        ...styles.td,
                        color: "#15803d",
                        fontWeight: "700",
                      }}
                    >
                      {formatCurrency(fee.paid)}
                    </td>

                    <td
                      style={{
                        ...styles.td,
                        color:
                          fee.pending > 0
                            ? "#dc2626"
                            : "#15803d",
                        fontWeight: "700",
                      }}
                    >
                      {formatCurrency(fee.pending)}
                    </td>

                    <td style={styles.td}>
                      {fee.dueDate}
                    </td>

                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          color: statusColor(fee.status),
                          background:
                            statusBackground(fee.status),
                        }}
                      >
                        {fee.status}
                      </span>
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>
          </div>

        </section>

        {/* PAYMENT HISTORY */}

        <section style={styles.card}>

          <h2 style={styles.sectionTitle}>
            💳 Payment History
          </h2>

          <p style={styles.sectionSubtitle}>
            Recent fee payment information
          </p>

          <div style={styles.paymentList}>

            {feeRecords
              .filter((fee) => fee.paid > 0)
              .map((fee) => (
                <div
                  key={fee.id}
                  style={styles.paymentCard}
                >

                  <div style={styles.paymentIcon}>
                    ✅
                  </div>

                  <div style={styles.paymentContent}>

                    <h3 style={styles.paymentTitle}>
                      {fee.title}
                    </h3>

                    <p style={styles.paymentDate}>
                      Payment Date: {fee.paymentDate}
                    </p>

                  </div>

                  <div style={styles.paymentAmount}>
                    {formatCurrency(fee.paid)}
                  </div>

                </div>
              ))}

          </div>

        </section>

        {/* PENDING FEES */}

        {totalPending > 0 && (
          <section style={styles.warningCard}>

            <div style={styles.warningIcon}>
              ⚠️
            </div>

            <div style={styles.warningContent}>

              <h3 style={styles.warningTitle}>
                Pending Fees
              </h3>

              <p style={styles.warningText}>
                You currently have{" "}
                <strong>
                  {formatCurrency(totalPending)}
                </strong>{" "}
                in pending fees.
              </p>

              <p style={styles.warningText}>
                Please complete the payment before
                the respective due dates.
              </p>

            </div>

          </section>
        )}

        {/* INFO */}

        <section style={styles.infoCard}>

          <div style={styles.infoIcon}>
            💡
          </div>

          <div>
            <h3 style={styles.infoTitle}>
              Fee Information
            </h3>

            <p style={styles.infoText}>
              This page shows your current fee summary,
              payment history and pending amount.
              Contact the college accounts department
              if you find any incorrect information.
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
      "linear-gradient(135deg,#eff6ff,#f8fafc,#f1f5f9)",
    padding: "20px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
  },

  header: {
    background: "white",
    borderRadius: "20px",
    padding: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
  },

  smallHeading: {
    color: "#2563eb",
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "2px",
    marginBottom: "6px",
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
    border: "none",
    background: "#1e3a8a",
    color: "white",
    padding: "12px 18px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: "16px",
    marginBottom: "20px",
  },

  summaryCard: {
    background: "white",
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
  },

  summaryIcon: {
    width: "55px",
    height: "55px",
    borderRadius: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "25px",
    flexShrink: 0,
  },

  summaryLabel: {
    margin: 0,
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "700",
  },

  summaryValue: {
    margin: "4px 0",
    color: "#172554",
    fontSize: "22px",
    fontWeight: "800",
  },

  summaryDescription: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "11px",
  },

  card: {
    background: "white",
    borderRadius: "20px",
    padding: "24px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.07)",
  },

  sectionHeader: {
    marginBottom: "18px",
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
    textAlign: "left",
    padding: "13px 12px",
    background: "#eff6ff",
    color: "#1e3a8a",
    fontSize: "12px",
    fontWeight: "800",
    borderBottom:
      "1px solid #dbeafe",
  },

  td: {
    padding: "15px 12px",
    color: "#475569",
    fontSize: "13px",
    borderBottom:
      "1px solid #e2e8f0",
  },

  feeTitle: {
    color: "#172554",
  },

  statusBadge: {
    display: "inline-block",
    padding: "7px 10px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: "800",
  },

  paymentList: {
    display: "grid",
    gap: "12px",
    marginTop: "18px",
  },

  paymentCard: {
    background: "#f8fafc",
    borderRadius: "14px",
    padding: "15px",
    display: "flex",
    alignItems: "center",
    gap: "13px",
    border:
      "1px solid #e2e8f0",
  },

  paymentIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    background: "#dcfce7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "19px",
    flexShrink: 0,
  },

  paymentContent: {
    flex: 1,
  },

  paymentTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "15px",
  },

  paymentDate: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "12px",
  },

  paymentAmount: {
    color: "#15803d",
    fontSize: "16px",
    fontWeight: "800",
  },

  warningCard: {
    background: "#fff7ed",
    border:
      "1px solid #fed7aa",
    borderRadius: "18px",
    padding: "20px",
    marginBottom: "20px",
    display: "flex",
    alignItems: "flex-start",
    gap: "15px",
  },

  warningIcon: {
    fontSize: "28px",
  },

  warningContent: {
    flex: 1,
  },

  warningTitle: {
    margin: 0,
    color: "#9a3412",
    fontSize: "17px",
  },

  warningText: {
    margin: "6px 0 0",
    color: "#7c2d12",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  infoCard: {
    background:
      "linear-gradient(135deg,#eff6ff,#eef2ff)",
    border:
      "1px solid #dbeafe",
    borderRadius: "18px",
    padding: "22px",
    display: "flex",
    alignItems: "flex-start",
    gap: "15px",
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

  footer: {
    padding: "25px 10px 10px",
    textAlign: "center",
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    flexWrap: "wrap",
    color: "#64748b",
    fontSize: "12px",
  },
};