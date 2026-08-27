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

declare global {
  interface Window {
    Razorpay: any;
  }
}

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
  const [payingFeeId, setPayingFeeId] =
    useState<number | null>(null);

  useEffect(() => {
    loadFees();
    loadRazorpayScript();
  }, []);

  function loadRazorpayScript() {
    if (
      document.getElementById(
        "razorpay-checkout-script"
      )
    ) {
      return;
    }

    const script = document.createElement("script");

    script.id = "razorpay-checkout-script";
    script.src =
      "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    document.body.appendChild(script);
  }

  async function loadFees() {
    try {
      setLoading(true);
      setError("");

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
        student.student_name || "Student"
      );

      setStudentUsername(
        student.student_username
      );

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

  async function handlePayOnline(fee: Fee) {
    try {
      setError("");
      setPayingFeeId(fee.id);

      const currentStatus =
        String(
          fee.status || ""
        ).toUpperCase();

      if (currentStatus !== "PENDING") {
        setError(
          "This fee is not available for online payment."
        );
        setPayingFeeId(null);
        return;
      }

      if (!window.Razorpay) {
        loadRazorpayScript();

        setError(
          "Razorpay is still loading. Please try again in a few seconds."
        );

        setPayingFeeId(null);
        return;
      }

      const orderResponse = await fetch(
        "/api/fees/create-order",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            feeId: fee.id,
          }),
        }
      );

      const orderData =
        await orderResponse.json();

      if (
        !orderResponse.ok ||
        !orderData.success
      ) {
        throw new Error(
          orderData.error ||
            orderData.message ||
            "Unable to create Razorpay order."
        );
      }

      const options = {
        key: orderData.keyId,

        amount:
          orderData.order.amount,

        currency:
          orderData.order.currency || "INR",

        name: "RACER ACADEMY",

        description:
          `${months[fee.month] || `Month ${fee.month}`} ${fee.year} Fees`,

        order_id:
          orderData.order.id,

        prefill: {
          name: studentName,
        },

        theme: {
          color: "#111827",
        },

        handler: async function (
          response: any
        ) {
          try {
            /*
             * VERIFY PAYMENT
             */

            const verifyResponse =
              await fetch(
                "/api/fees/verify-payment",
                {
                  method: "POST",

                  headers: {
                    "Content-Type":
                      "application/json",
                  },

                  body: JSON.stringify({
                    feeId: fee.id,

                    razorpay_order_id:
                      response.razorpay_order_id,

                    razorpay_payment_id:
                      response.razorpay_payment_id,

                    razorpay_signature:
                      response.razorpay_signature,

                    studentId:
                      fee.student_id,

                    month:
                      fee.month,

                    year:
                      fee.year,
                  }),
                }
              );

            const verifyData =
              await verifyResponse.json();

            if (
              !verifyResponse.ok ||
              !verifyData.success
            ) {
              throw new Error(
                verifyData.error ||
                  verifyData.message ||
                  "Payment verification failed."
              );
            }

            /*
             * PAYMENT SUCCESS
             *
             * Backend automatically changes:
             * status = SUBMITTED
             * payment_date = today
             * transaction_id = Razorpay Payment ID
             */

            alert(
              "✅ Payment successful!\n\nYour fee has been submitted successfully."
            );

            await loadFees();
          } catch (verifyError) {
            console.error(
              "Payment verification error:",
              verifyError
            );

            setError(
              verifyError instanceof Error
                ? verifyError.message
                : "Payment verification failed."
            );
          } finally {
            setPayingFeeId(null);
          }
        },

        modal: {
          ondismiss: function () {
            setPayingFeeId(null);
          },
        },
      };

      const razorpay =
        new window.Razorpay(options);

      razorpay.on(
        "payment.failed",
        function (response: any) {
          console.error(
            "Razorpay payment failed:",
            response
          );

          setError(
            response?.error?.description ||
              "Payment failed. Please try again."
          );

          setPayingFeeId(null);
        }
      );

      razorpay.open();
    } catch (err) {
      console.error(
        "Online payment error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to start online payment."
      );

      setPayingFeeId(null);
    }
  }

  /*
   * DOWNLOAD RECEIPT
   */

  function downloadReceipt(fee: Fee) {
    const monthName =
      months[fee.month] ||
      `Month ${fee.month}`;

    const amount =
      Number(
        fee.amount || 0
      ).toLocaleString("en-IN");

    const paymentDate =
      fee.payment_date || "—";

    const transactionId =
      fee.transaction_id || "—";

    const receiptNumber =
      `RA-${fee.year}-${String(
        fee.month
      ).padStart(2, "0")}-${fee.id}`;

    const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">

<title>RACER ACADEMY Fee Receipt</title>

<style>

body {
  margin: 0;
  padding: 30px;
  font-family: Arial, Helvetica, sans-serif;
  background: #f3f4f6;
  color: #111827;
}

.receipt {
  max-width: 700px;
  margin: 0 auto;
  background: white;
  padding: 40px;
  border-radius: 18px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.08);
}

.header {
  text-align: center;
  border-bottom: 2px solid #111827;
  padding-bottom: 20px;
  margin-bottom: 25px;
}

.academy {
  font-size: 30px;
  font-weight: 800;
  letter-spacing: 1px;
}

.title {
  font-size: 22px;
  margin-top: 8px;
  font-weight: 700;
}

.success {
  margin: 20px 0;
  padding: 14px;
  background: #dcfce7;
  color: #166534;
  border-radius: 10px;
  text-align: center;
  font-weight: 700;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 13px 0;
  border-bottom: 1px solid #e5e7eb;
}

.label {
  color: #6b7280;
  font-weight: 600;
}

.value {
  font-weight: 700;
  text-align: right;
}

.amount {
  font-size: 25px;
}

.footer {
  margin-top: 30px;
  text-align: center;
  color: #6b7280;
  font-size: 13px;
}

.receiptNo {
  text-align: right;
  color: #6b7280;
  font-size: 13px;
  margin-bottom: 15px;
}

</style>
</head>

<body>

<div class="receipt">

  <div class="header">
    <div class="academy">
      RACER ACADEMY
    </div>

    <div class="title">
      FEE PAYMENT RECEIPT
    </div>
  </div>

  <div class="receiptNo">
    Receipt No: ${receiptNumber}
  </div>

  <div class="success">
    ✓ PAYMENT SUCCESSFUL
  </div>

  <div class="row">
    <div class="label">
      Student Name
    </div>

    <div class="value">
      ${studentName}
    </div>
  </div>

  <div class="row">
    <div class="label">
      Username
    </div>

    <div class="value">
      ${studentUsername}
    </div>
  </div>

  <div class="row">
    <div class="label">
      Fee Month
    </div>

    <div class="value">
      ${monthName} ${fee.year}
    </div>
  </div>

  <div class="row">
    <div class="label">
      Amount Paid
    </div>

    <div class="value amount">
      ₹${amount}
    </div>
  </div>

  <div class="row">
    <div class="label">
      Payment Date
    </div>

    <div class="value">
      ${paymentDate}
    </div>
  </div>

  <div class="row">
    <div class="label">
      Transaction ID
    </div>

    <div class="value">
      ${transactionId}
    </div>
  </div>

  <div class="row">
    <div class="label">
      Payment Status
    </div>

    <div class="value">
      SUBMITTED
    </div>
  </div>

  <div class="footer">
    <strong>RACER ACADEMY</strong>
    <br />
    This is a computer-generated fee payment receipt.
    <br />
    Thank you for your payment.
  </div>

</div>

</body>
</html>
`;

    const blob =
      new Blob(
        [receiptHTML],
        {
          type: "text/html",
        }
      );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `Racer-Academy-Fee-Receipt-${fee.id}.html`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  const totalFees =
    fees.reduce(
      (sum, fee) =>
        sum +
        Number(
          fee.amount || 0
        ),
      0
    );

  const submittedFees =
    fees
      .filter(
        (fee) =>
          String(
            fee.status
          ).toUpperCase() ===
          "SUBMITTED"
      )
      .reduce(
        (sum, fee) =>
          sum +
          Number(
            fee.amount || 0
          ),
        0
      );

  const pendingFees =
    fees
      .filter(
        (fee) =>
          String(
            fee.status
          ).toUpperCase() ===
          "PENDING"
      )
      .reduce(
        (sum, fee) =>
          sum +
          Number(
            fee.amount || 0
          ),
        0
      );

  if (loading) {
    return (
      <main style={styles.loadingPage}>
        <div style={styles.loadingBox}>
          💳
          <h2>
            Loading Fees...
          </h2>
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

              <h3>
                No Fees Assigned
              </h3>

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
                      Payment
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {fees.map((fee) => {

                    const status =
                      String(
                        fee.status || ""
                      ).toUpperCase();

                    const isPending =
                      status ===
                      "PENDING";

                    const isSubmitted =
                      status ===
                      "SUBMITTED";

                    const isPaid =
                      status ===
                        "PAID ONLINE" ||
                      status ===
                        "PAID" ||
                      isSubmitted;

                    return (

                      <tr key={fee.id}>

                        <td style={styles.td}>

                          <strong>
                            {months[
                              fee.month
                            ] ||
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
                                isSubmitted ||
                                isPaid
                                  ? "#dcfce7"
                                  : status ===
                                    "PENDING"
                                  ? "#fef3c7"
                                  : "#e5e7eb",

                              color:
                                isSubmitted ||
                                isPaid
                                  ? "#166534"
                                  : status ===
                                    "PENDING"
                                  ? "#92400e"
                                  : "#374151",
                            }}
                          >

                            {isSubmitted
                              ? "✓ SUBMITTED"
                              : isPaid
                              ? "✓ PAID"
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

                          {isPending ? (

                            <button
                              type="button"
                              onClick={() =>
                                handlePayOnline(
                                  fee
                                )
                              }
                              disabled={
                                payingFeeId ===
                                fee.id
                              }
                              style={{
                                ...styles.payButton,

                                opacity:
                                  payingFeeId ===
                                  fee.id
                                    ? 0.7
                                    : 1,

                                cursor:
                                  payingFeeId ===
                                  fee.id
                                    ? "not-allowed"
                                    : "pointer",
                              }}
                            >

                              {payingFeeId ===
                              fee.id
                                ? "Opening..."
                                : "💳 Pay Online"}

                            </button>

                          ) : isPaid ? (

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
                            "—"
                          )}

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
            After successful online payment,
            your fee is automatically marked as
            <strong> SUBMITTED </strong>
            and the Razorpay transaction ID is
            saved in your fee record.
          </p>

          <p>
            You can download your payment receipt
            using the <strong>🧾 Receipt</strong>
            button.
          </p>

        </div>

        <footer style={styles.footer}>
          RACER ACADEMY • Student Fees • 2026
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
    fontFamily:
      "Arial, sans-serif",
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
    justifyContent:
      "space-between",
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
    minWidth: "950px",
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

  payButton: {
    border: "none",
    background: "#111827",
    color: "white",
    padding: "9px 13px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  receiptButton: {
    border: "none",
    background:
      "linear-gradient(135deg,#16a34a,#15803d)",
    color: "white",
    padding: "9px 13px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
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
    lineHeight: 1.6,
  },

  footer: {
    textAlign: "center",
    color: "#9ca3af",
    marginTop: "25px",
    fontSize: "13px",
  },
};