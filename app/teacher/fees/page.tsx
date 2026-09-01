"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

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
  payment_mode: string | null;
  payment_date: string | null;
  transaction_id: string | null;
  remarks: string | null;
  created_at?: string;
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

const paymentModes = ["CASH", "ONLINE"];

export default function TeacherFeesPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);

  const [studentId, setStudentId] = useState("");
  const [month, setMonth] = useState(
    String(new Date().getMonth() + 1)
  );
  const [year, setYear] = useState(
    String(new Date().getFullYear())
  );

  const [amount, setAmount] = useState("200");
  const [status, setStatus] = useState("PENDING");
  const [paymentMode, setPaymentMode] = useState("ONLINE");
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

  function handlePaymentModeChange(mode: string) {
    setPaymentMode(mode);

    if (mode === "CASH") {
      setStatus("SUBMITTED");

      if (!paymentDate) {
        setPaymentDate(
          new Date().toISOString().split("T")[0]
        );
      }
    } else {
      setStatus("PENDING");
    }
  }

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const {
        data: studentsData,
        error: studentsError,
      } = await supabase
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

      const {
        data: feesData,
        error: feesError,
      } = await supabase
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
    } catch (err) {
      console.error(err);
      setError(
        "Unable to load fee management data."
      );
    } finally {
      setLoading(false);
    }
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

    if (!paymentMode) {
      setError("Please select a payment mode.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: existingFee,
        error: existingError,
      } = await supabase
        .from("fees")
        .select("id")
        .eq("student_id", Number(studentId))
        .eq("month", Number(month))
        .eq("year", Number(year))
        .maybeSingle();

      if (existingError) {
        setError(existingError.message);
        setSaving(false);
        return;
      }

      const finalStatus =
        paymentMode === "CASH"
          ? "SUBMITTED"
          : status;

      const finalPaymentDate =
        paymentMode === "CASH"
          ? paymentDate ||
            new Date()
              .toISOString()
              .split("T")[0]
          : paymentDate || null;

      const feeData = {
        student_id: Number(studentId),
        month: Number(month),
        year: Number(year),
        amount: Number(amount),
        status: finalStatus,
        payment_mode: paymentMode,
        payment_date: finalPaymentDate,
        transaction_id:
          transactionId.trim() || null,
        remarks: remarks.trim() || null,
      };

      if (existingFee) {
        const { error: updateError } =
          await supabase
            .from("fees")
            .update(feeData)
            .eq("id", existingFee.id);

        if (updateError) {
          setError(updateError.message);
          setSaving(false);
          return;
        }

        setMessage(
          paymentMode === "CASH"
            ? "Cash payment saved successfully. Receipt is ready."
            : "Fee record updated successfully."
        );
      } else {
        const { error: insertError } =
          await supabase
            .from("fees")
            .insert(feeData);

        if (insertError) {
          setError(insertError.message);
          setSaving(false);
          return;
        }

        setMessage(
          paymentMode === "CASH"
            ? "Cash payment saved successfully. Receipt is ready."
            : "Fee record added successfully."
        );
      }

      await loadData();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save fee."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteFee(id: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this fee record?"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    const { error: deleteError } =
      await supabase
        .from("fees")
        .delete()
        .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setMessage("Fee record deleted successfully.");

    await loadData();
  }

  function getStudentName(id: number) {
    const student = students.find(
      (item) => item.id === id
    );

    if (!student) {
      return "Unknown Student";
    }

    return (
      student.student_name ||
      student.student_username
    );
  }

  function getStudentUsername(id: number) {
    const student = students.find(
      (item) => item.id === id
    );

    return student?.student_username || "";
  }

  function getMonthName(monthNumber: number) {
    return (
      months[monthNumber - 1] ||
      `Month ${monthNumber}`
    );
  }

  function getPaymentMode(fee: Fee) {
    const mode = String(
      fee.payment_mode || ""
    ).toUpperCase();

    if (mode === "CASH") {
      return "CASH";
    }

    if (mode === "ONLINE") {
      return "ONLINE";
    }

    if (
      String(fee.status || "").toUpperCase() ===
        "PAID ONLINE" ||
      String(fee.status || "").toUpperCase() ===
        "PAID"
    ) {
      return "ONLINE";
    }

    return "—";
  }

  function downloadReceipt(fee: Fee) {
    const studentName = getStudentName(
      fee.student_id
    );

    const username = getStudentUsername(
      fee.student_id
    );

    const monthName = getMonthName(fee.month);

    const paymentMode =
      getPaymentMode(fee);

    const receiptNumber =
      `RA-${fee.year}-${String(fee.month).padStart(
        2,
        "0"
      )}-${fee.id}`;

    const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>RACER ACADEMY Fee Receipt</title>

<style>
  body {
    font-family: Arial, Helvetica, sans-serif;
    background: #f1f5f9;
    margin: 0;
    padding: 30px;
  }

  .receipt {
    max-width: 760px;
    margin: auto;
    background: white;
    padding: 40px;
    border-radius: 18px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.08);
  }

  .top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #111827;
    padding-bottom: 20px;
  }

  .academy {
    font-size: 30px;
    font-weight: 900;
    color: #111827;
  }

  .tagline {
    margin-top: 5px;
    color: #6b7280;
    font-size: 13px;
  }

  .receipt-title {
    text-align: right;
    font-size: 24px;
    font-weight: 800;
    color: #1d4ed8;
  }

  .receipt-number {
    text-align: right;
    margin-top: 6px;
    color: #6b7280;
    font-size: 13px;
  }

  .paid {
    margin: 30px 0;
    padding: 18px;
    text-align: center;
    border-radius: 12px;
    background: #dcfce7;
    color: #166534;
    font-size: 22px;
    font-weight: 800;
  }

  .section {
    margin-top: 25px;
  }

  .section-title {
    font-size: 16px;
    font-weight: 800;
    color: #111827;
    margin-bottom: 10px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  td {
    padding: 12px;
    border-bottom: 1px solid #e5e7eb;
  }

  td:first-child {
    width: 40%;
    color: #64748b;
    font-weight: 700;
  }

  td:last-child {
    color: #111827;
    font-weight: 600;
  }

  .amount {
    font-size: 24px;
    font-weight: 900;
    color: #111827;
  }

  .payment-mode {
    font-size: 16px;
    font-weight: 900;
  }

  .footer {
    margin-top: 35px;
    padding-top: 20px;
    border-top: 1px solid #e5e7eb;
    text-align: center;
    color: #64748b;
    font-size: 12px;
  }

  .print-button {
    display: block;
    margin: 25px auto 0;
    background: #111827;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 700;
  }

  @media print {
    body {
      background: white;
      padding: 0;
    }

    .receipt {
      box-shadow: none;
      border-radius: 0;
      max-width: none;
    }

    .print-button {
      display: none;
    }
  }
</style>
</head>

<body>

<div class="receipt">

  <div class="top">

    <div>
      <div class="academy">
        RACER ACADEMY
      </div>

      <div class="tagline">
        Learn • Grow • Race Ahead
      </div>
    </div>

    <div>
      <div class="receipt-title">
        FEE RECEIPT
      </div>

      <div class="receipt-number">
        Receipt No: ${receiptNumber}
      </div>
    </div>

  </div>

  <div class="paid">
    ✓ PAYMENT RECEIVED
  </div>

  <div class="section">

    <div class="section-title">
      Student Details
    </div>

    <table>

      <tr>
        <td>Student Name</td>
        <td>${studentName}</td>
      </tr>

      <tr>
        <td>Username</td>
        <td>${username}</td>
      </tr>

    </table>

  </div>

  <div class="section">

    <div class="section-title">
      Fee Details
    </div>

    <table>

      <tr>
        <td>Fee Month</td>
        <td>${monthName} ${fee.year}</td>
      </tr>

      <tr>
        <td>Amount Paid</td>
        <td class="amount">
          ₹${Number(fee.amount).toLocaleString("en-IN")}
        </td>
      </tr>

      <tr>
        <td>Payment Mode</td>
        <td class="payment-mode">
          ${paymentMode}
        </td>
      </tr>

      <tr>
        <td>Status</td>
        <td>${fee.status}</td>
      </tr>

      <tr>
        <td>Payment Date</td>
        <td>${fee.payment_date || "—"}</td>
      </tr>

      <tr>
        <td>Transaction ID</td>
        <td>${fee.transaction_id || "—"}</td>
      </tr>

      <tr>
        <td>Remarks</td>
        <td>${fee.remarks || "—"}</td>
      </tr>

    </table>

  </div>

  <div class="footer">
    This is a computer-generated fee receipt.
    <br />
    RACER ACADEMY • Attendance & Fee Management
  </div>

  <button
    class="print-button"
    onclick="window.print()"
  >
    🖨️ Print / Save PDF
  </button>

</div>

</body>
</html>
`;

    const receiptWindow = window.open(
      "",
      "_blank",
      "width=900,height=900"
    );

    if (!receiptWindow) {
      setError(
        "Please allow pop-ups to download the receipt."
      );
      return;
    }

    receiptWindow.document.open();
    receiptWindow.document.write(
      receiptHTML
    );
    receiptWindow.document.close();
  }

  const totalSubmitted = fees
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

  const totalPending = fees
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

  const totalRefunded = fees
    .filter(
      (fee) =>
        String(fee.status).toUpperCase() ===
        "REFUNDED"
    )
    .reduce(
      (sum, fee) =>
        sum + Number(fee.amount || 0),
      0
    );

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          💰
          <h2>
            Loading Fees Management...
          </h2>
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
              Manage student monthly fees,
              payments and receipts
            </p>
          </div>

          <a
            href="/teacher"
            style={styles.backButton}
          >
            ← Teacher Dashboard
          </a>

        </header>

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
                    setStudentId(
                      e.target.value
                    )
                  }
                  style={styles.input}
                >

                  <option value="">
                    Select Student
                  </option>

                  {students.map(
                    (student) => (
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
                    )
                  )}

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
                  Payment Mode
                </label>

                <select
                  value={paymentMode}
                  onChange={(e) =>
                    handlePaymentModeChange(
                      e.target.value
                    )
                  }
                  style={{
                    ...styles.input,
                    fontWeight: 700,
                    border:
                      paymentMode === "CASH"
                        ? "2px solid #16a34a"
                        : "2px solid #2563eb",
                  }}
                >

                  {paymentModes.map(
                    (mode) => (
                      <option
                        key={mode}
                        value={mode}
                      >
                        {mode === "CASH"
                          ? "💵 CASH"
                          : "💳 ONLINE"}
                      </option>
                    )
                  )}

                </select>

                <div
                  style={
                    paymentMode === "CASH"
                      ? styles.cashHint
                      : styles.onlineHint
                  }
                >
                  {paymentMode === "CASH"
                    ? "Cash payment will be saved immediately and receipt will be available."
                    : "Student can pay this fee online through Razorpay."}
                </div>
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
                  disabled={
                    paymentMode === "CASH"
                  }
                  style={{
                    ...styles.input,
                    opacity:
                      paymentMode === "CASH"
                        ? 0.65
                        : 1,
                  }}
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
                  placeholder={
                    paymentMode === "ONLINE"
                      ? "Optional"
                      : "Optional"
                  }
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
                    setRemarks(
                      e.target.value
                    )
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
                : paymentMode === "CASH"
                ? "💵 Save CASH Payment + Receipt"
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
                      Payment Mode
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
                      Receipt
                    </th>

                    <th style={styles.th}>
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {fees.map((fee) => {

                    const normalizedStatus =
                      String(
                        fee.status || ""
                      ).toUpperCase();

                    const paymentMode =
                      getPaymentMode(fee);

                    const canReceipt =
                      normalizedStatus ===
                        "SUBMITTED" ||
                      normalizedStatus ===
                        "PAID" ||
                      normalizedStatus ===
                        "PAID ONLINE";

                    return (
                      <tr key={fee.id}>

                        <td style={styles.td}>

                          <strong>
                            {getStudentName(
                              fee.student_id
                            )}
                          </strong>

                          <div
                            style={
                              styles.username
                            }
                          >
                            {
                              getStudentUsername(
                                fee.student_id
                              )
                            }
                          </div>

                        </td>

                        <td style={styles.td}>
                          {getMonthName(
                            fee.month
                          )}{" "}
                          {fee.year}
                        </td>

                        <td style={styles.td}>
                          <strong>
                            ₹
                            {Number(
                              fee.amount
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </strong>
                        </td>

                        <td style={styles.td}>

                          {paymentMode === "CASH" ? (
                            <span
                              style={
                                styles.cashBadge
                              }
                            >
                              💵 CASH
                            </span>
                          ) : paymentMode ===
                            "ONLINE" ? (
                            <span
                              style={
                                styles.onlineBadge
                              }
                            >
                              💳 ONLINE
                            </span>
                          ) : (
                            "—"
                          )}

                        </td>

                        <td style={styles.td}>

                          <StatusBadge
                            status={
                              fee.status
                            }
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
                          {fee.remarks ||
                            "—"}
                        </td>

                        <td style={styles.td}>

                          {canReceipt ? (
                            <button
                              type="button"
                              onClick={() =>
                                downloadReceipt(
                                  fee
                                )
                              }
                              style={
                                styles.receiptButton
                              }
                            >
                              🧾 Receipt
                            </button>
                          ) : (
                            <span
                              style={
                                styles.notAvailable
                              }
                            >
                              Available after payment
                            </span>
                          )}

                        </td>

                        <td style={styles.td}>

                          <button
                            type="button"
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
                    );
                  })}

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
  const normalized =
    String(status || "").toUpperCase();

  const statusStyles: Record<
    string,
    React.CSSProperties
  > = {
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

    PAID: {
      background: "#dcfce7",
      color: "#166534",
    },

    "PAID ONLINE": {
      background: "#dcfce7",
      color: "#166534",
    },
  };

  return (
    <span
      style={{
        ...styles.badge,
        ...(statusStyles[normalized] ||
          statusStyles.PENDING),
      }}
    >

      {normalized === "SUBMITTED" &&
        "✓ "}

      {normalized === "PENDING" &&
        "⏳ "}

      {normalized === "REFUNDED" &&
        "↩️ "}

      {normalized === "CANCELLED" &&
        "✕ "}

      {(normalized === "PAID" ||
        normalized === "PAID ONLINE") &&
        "✓ "}

      {normalized}

    </span>
  );
}

const styles: Record<
  string,
  React.CSSProperties
> = {
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
    maxWidth: "1300px",
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
    fontWeight: 800,
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
    fontWeight: 700,
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
    fontWeight: 800,
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
    fontWeight: 700,
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

  cashHint: {
    marginTop: "6px",
    color: "#166534",
    fontSize: "11px",
    lineHeight: 1.4,
  },

  onlineHint: {
    marginTop: "6px",
    color: "#1d4ed8",
    fontSize: "11px",
    lineHeight: 1.4,
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
    fontWeight: 700,
    cursor: "pointer",
  },

  success: {
    marginTop: "18px",
    background: "#dcfce7",
    color: "#166534",
    padding: "12px",
    borderRadius: "10px",
    fontWeight: 600,
  },

  error: {
    marginTop: "18px",
    background: "#fee2e2",
    color: "#991b1b",
    padding: "12px",
    borderRadius: "10px",
    fontWeight: 600,
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
    fontWeight: 700,
    cursor: "pointer",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    minWidth: "1400px",
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
    verticalAlign: "middle",
  },

  username: {
    marginTop: "4px",
    color: "#64748b",
    fontSize: "12px",
  },

  badge: {
    display: "inline-block",
    padding: "7px 11px",
    borderRadius: "999px",
    fontWeight: 700,
    fontSize: "12px",
    whiteSpace: "nowrap",
  },

  cashBadge: {
    display: "inline-block",
    background: "#dcfce7",
    color: "#166534",
    padding: "7px 10px",
    borderRadius: "999px",
    fontWeight: 800,
    fontSize: "12px",
    whiteSpace: "nowrap",
  },

  onlineBadge: {
    display: "inline-block",
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "7px 10px",
    borderRadius: "999px",
    fontWeight: 800,
    fontSize: "12px",
    whiteSpace: "nowrap",
  },

  receiptButton: {
    border: "none",
    background:
      "linear-gradient(135deg,#059669,#16a34a)",
    color: "white",
    padding: "9px 13px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  notAvailable: {
    color: "#94a3b8",
    fontSize: "11px",
    display: "inline-block",
    maxWidth: "100px",
  },

  deleteButton: {
    border: "none",
    background: "#dc2626",
    color: "white",
    padding: "8px 11px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 700,
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
    fontWeight: 700,
  },
};