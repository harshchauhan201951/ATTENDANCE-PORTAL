"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
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

const statuses = [
  "PENDING",
  "SUBMITTED",
  "REFUNDED",
  "CANCELLED",
];

export default function TeacherFeesPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);

  const [studentId, setStudentId] = useState("");
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const [amount, setAmount] = useState("200");
  const [status, setStatus] = useState("PENDING");
  const [paymentDate, setPaymentDate] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [remarks, setRemarks] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");

    const { data: studentsData, error: studentsError } =
      await supabase
        .from("students")
        .select(
          "id, student_name, student_username"
        )
        .order("student_name", {
          ascending: true,
        });

    if (studentsError) {
      setError(studentsError.message);
      setLoading(false);
      return;
    }

    const { data: feesData, error: feesError } =
      await supabase
        .from("fees")
        .select("*")
        .order("year", {
          ascending: false,
        })
        .order("month", {
          ascending: false,
        });

    if (feesError) {
      setError(feesError.message);
      setLoading(false);
      return;
    }

    setStudents(studentsData || []);
    setFees(feesData || []);
    setLoading(false);
  }

  async function saveFee(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!studentId) {
      setError("Please select a student.");
      return;
    }

    if (!amount || Number(amount) < 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setSaving(true);

    const { data: existingFee } =
      await supabase
        .from("fees")
        .select("id")
        .eq("student_id", Number(studentId))
        .eq("month", Number(month))
        .eq("year", Number(year))
        .maybeSingle();

    if (existingFee) {
      const { error: updateError } =
        await supabase
          .from("fees")
          .update({
            amount: Number(amount),
            status,
            payment_date:
              paymentDate || null,
            transaction_id:
              transactionId.trim() || null,
            remarks:
              remarks.trim() || null,
          })
          .eq("id", existingFee.id);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      setMessage("Fee record updated successfully.");
    } else {
      const { error: insertError } =
        await supabase
          .from("fees")
          .insert({
            student_id: Number(studentId),
            month: Number(month),
            year: Number(year),
            amount: Number(amount),
            status,
            payment_date:
              paymentDate || null,
            transaction_id:
              transactionId.trim() || null,
            remarks:
              remarks.trim() || null,
          });

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }

      setMessage("Fee record added successfully.");
    }

    await loadData();

    setSaving(false);
  }

  async function deleteFee(id: number) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this fee record?"
    );

    if (!confirmDelete) return;

    const { error: deleteError } =
      await supabase
        .from("fees")
        .delete()
        .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setMessage("Fee record deleted.");

    await loadData();
  }

  function getStudentName(studentId: number) {
    const student = students.find(
      (s) => s.id === studentId
    );

    if (!student) return "Unknown Student";

    return (
      student.student_name ||
      student.student_username
    );
  }

  const totalSubmitted = fees
    .filter(
      (fee) => fee.status === "SUBMITTED"
    )
    .reduce(
      (sum, fee) => sum + Number(fee.amount),
      0
    );

  const totalPending = fees
    .filter(
      (fee) => fee.status === "PENDING"
    )
    .reduce(
      (sum, fee) => sum + Number(fee.amount),
      0
    );

  const totalRefunded = fees
    .filter(
      (fee) => fee.status === "REFUNDED"
    )
    .reduce(
      (sum, fee) => sum + Number(fee.amount),
      0
    );

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          Loading Fees Management...
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>
              💰 Fees Management
            </h1>

            <p style={styles.subtitle}>
              Manage student monthly fees and payment history
            </p>
          </div>

          <a
            href="/teacher"
            style={styles.backButton}
          >
            ← Teacher Dashboard
          </a>
        </header>

        {/* SUMMARY */}

        <section style={styles.summaryGrid}>

          <SummaryCard
            title="Submitted"
            amount={totalSubmitted}
            icon="✅"
            background="#16a34a"
          />

          <SummaryCard
            title="Pending"
            amount={totalPending}
            icon="⏳"
            background="#f59e0b"
          />

          <SummaryCard
            title="Refunded"
            amount={totalRefunded}
            icon="↩️"
            background="#7c3aed"
          />

          <SummaryCard
            title="Total Records"
            amount={fees.length}
            icon="📚"
            background="#2563eb"
          />

        </section>

        {/* ADD / UPDATE FEE */}

        <section style={styles.card}>

          <h2 style={styles.sectionTitle}>
            ➕ Add / Update Fee
          </h2>

          <form onSubmit={saveFee}>

            <div style={styles.formGrid}>

              <div>
                <label style={styles.label}>
                  Student
                </label>

                <select
                  value={studentId}
                  onChange={(e) =>
                    setStudentId(e.target.value)
                  }
                  style={styles.input}
                >
                  <option value="">
                    Select Student
                  </option>

                  {students.map((student) => (
                    <option
                      key={student.id}
                      value={student.id}
                    >
                      {student.student_name ||
                        student.student_username}{" "}
                      (
                      {
                        student.student_username
                      }
                      )
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.label}>
                  Month
                </label>

                <select
                  value={month}
                  onChange={(e) =>
                    setMonth(e.target.value)
                  }
                  style={styles.input}
                >
                  {months.map(
                    (monthName, index) => (
                      <option
                        key={monthName}
                        value={index + 1}
                      >
                        {monthName}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label style={styles.label}>
                  Year
                </label>

                <input
                  type="number"
                  value={year}
                  onChange={(e) =>
                    setYear(e.target.value)
                  }
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>
                  Amount (₹)
                </label>

                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value)
                  }
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>
                  Status
                </label>

                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value)
                  }
                  style={styles.input}
                >
                  {statuses.map(
                    (statusName) => (
                      <option
                        key={statusName}
                        value={statusName}
                      >
                        {statusName}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label style={styles.label}>
                  Payment Date
                </label>

                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) =>
                    setPaymentDate(
                      e.target.value
                    )
                  }
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>
                  Transaction ID
                </label>

                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) =>
                    setTransactionId(
                      e.target.value
                    )
                  }
                  placeholder="Optional"
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>
                  Remarks
                </label>

                <input
                  type="text"
                  value={remarks}
                  onChange={(e) =>
                    setRemarks(e.target.value)
                  }
                  placeholder="Optional"
                  style={styles.input}
                />
              </div>

            </div>

            <button
              type="submit"
              disabled={saving}
              style={styles.saveButton}
            >
              {saving
                ? "Saving..."
                : "💾 Save Fee"}
            </button>

          </form>

          {message && (
            <div style={styles.success}>
              ✅ {message}
            </div>
          )}

          {error && (
            <div style={styles.error}>
              ❌ {error}
            </div>
          )}

        </section>

        {/* HISTORY */}

        <section style={styles.card}>

          <div style={styles.historyHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                📚 Fee History
              </h2>

              <p style={styles.subtitle}>
                Complete student fee records
              </p>
            </div>

            <button
              onClick={loadData}
              style={styles.refreshButton}
            >
              🔄 Refresh
            </button>
          </div>

          {fees.length === 0 ? (
            <div style={styles.empty}>
              No fee records found.
            </div>
          ) : (
            <div style={styles.tableWrapper}>

              <table style={styles.table}>

                <thead>
                  <tr>
                    <th style={styles.th}>
                      Student
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
                      Transaction
                    </th>

                    <th style={styles.th}>
                      Remarks
                    </th>

                    <th style={styles.th}>
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {fees.map((fee) => (

                    <tr key={fee.id}>

                      <td style={styles.td}>
                        <strong>
                          {getStudentName(
                            fee.student_id
                          )}
                        </strong>
                      </td>

                      <td style={styles.td}>
                        {months[
                          fee.month - 1
                        ]}{" "}
                        {fee.year}
                      </td>

                      <td style={styles.td}>
                        ₹
                        {Number(
                          fee.amount
                        ).toLocaleString("en-IN")}
                      </td>

                      <td style={styles.td}>
                        <StatusBadge
                          status={fee.status}
                        />
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

                      <td style={styles.td}>

                        <button
                          onClick={() =>
                            deleteFee(
                              fee.id
                            )
                          }
                          style={
                            styles.deleteButton
                          }
                        >
                          Delete
                        </button>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>
          )}

        </section>

      </div>
    </main>
  );
}

function SummaryCard({
  title,
  amount,
  icon,
  background,
}: {
  title: string;
  amount: number;
  icon: string;
  background: string;
}) {
  return (
    <div
      style={{
        ...styles.summaryCard,
        background,
      }}
    >
      <div style={styles.summaryIcon}>
        {icon}
      </div>

      <div style={styles.summaryTitle}>
        {title}
      </div>

      <div style={styles.summaryAmount}>
        {title === "Total Records"
          ? amount
          : `₹${amount.toLocaleString(
              "en-IN"
            )}`}
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const statusStyles: {
    [key: string]: React.CSSProperties;
  } = {
    SUBMITTED: {
      background: "#dcfce7",
      color: "#166534",
    },

    PENDING: {
      background: "#fef3c7",
      color: "#92400e",
    },

    REFUNDED: {
      background: "#ede9fe",
      color: "#5b21b6",
    },

    CANCELLED: {
      background: "#fee2e2",
      color: "#991b1b",
    },
  };

  return (
    <span
      style={{
        ...styles.badge,
        ...(statusStyles[status] ||
          statusStyles.PENDING),
      }}
    >
      {status === "SUBMITTED" && "✓ "}
      {status === "PENDING" && "⏳ "}
      {status === "REFUNDED" && "↩️ "}
      {status === "CANCELLED" && "✕ "}
      {status}
    </span>
  );
}

const styles: {
  [key: string]: React.CSSProperties;
} = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#eff6ff,#f8fafc)",
    padding: "25px 15px",
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
    background: "white",
    padding: "24px",
    borderRadius: "18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
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
    whiteSpace: "nowrap",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(210px,1fr))",
    gap: "18px",
    marginBottom: "20px",
  },

  summaryCard: {
    color: "white",
    padding: "22px",
    borderRadius: "18px",
    boxShadow:
      "0 8px 20px rgba(15,23,42,0.12)",
  },

  summaryIcon: {
    fontSize: "28px",
  },

  summaryTitle: {
    marginTop: "10px",
    fontSize: "14px",
    opacity: 0.9,
  },

  summaryAmount: {
    fontSize: "28px",
    fontWeight: "800",
    marginTop: "5px",
  },

  card: {
    background: "white",
    borderRadius: "18px",
    padding: "25px",
    marginBottom: "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
  },

  sectionTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "22px",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: "18px",
    marginTop: "20px",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    color: "#334155",
    fontWeight: "700",
    fontSize: "14px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    fontSize: "15px",
    color: "#111827",
    background: "white",
  },

  saveButton: {
    marginTop: "22px",
    border: "none",
    background:
      "linear-gradient(135deg,#2563eb,#4f46e5)",
    color: "white",
    padding: "13px 24px",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
  },

  success: {
    marginTop: "18px",
    background: "#dcfce7",
    color: "#166534",
    padding: "12px",
    borderRadius: "10px",
    fontWeight: "600",
  },

  error: {
    marginTop: "18px",
    background: "#fee2e2",
    color: "#991b1b",
    padding: "12px",
    borderRadius: "10px",
    fontWeight: "600",
  },

  historyHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "20px",
  },

  refreshButton: {
    border: "none",
    background: "#2563eb",
    color: "white",
    padding: "11px 17px",
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
    minWidth: "1000px",
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
    padding: "13px",
    borderBottom:
      "1px solid #e2e8f0",
    color: "#334155",
    fontSize: "14px",
  },

  badge: {
    display: "inline-block",
    padding: "7px 11px",
    borderRadius: "999px",
    fontWeight: "700",
    fontSize: "12px",
  },

  deleteButton: {
    border: "none",
    background: "#dc2626",
    color: "white",
    padding: "8px 11px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
  },

  empty: {
    textAlign: "center",
    padding: "40px",
    color: "#64748b",
  },

  loading: {
    background: "white",
    maxWidth: "450px",
    margin: "100px auto",
    padding: "40px",
    borderRadius: "18px",
    textAlign: "center",
    fontSize: "18px",
    fontWeight: "700",
  },
};