"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Student = {
  id: number;
  student_name: string | null;
  student_username: string;
  [key: string]: unknown;
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
  payment_mode: string | null;
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

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getStudentClass(student: Student): string {
  const possibleKeys = [
    "student_class",
    "class",
    "class_name",
    "grade",
    "standard",
    "student_grade",
  ];

  for (const key of possibleKeys) {
    const value = student[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value).trim();
    }
  }

  return "";
}

function isClassNineOrTen(student: Student): boolean {
  const studentClass = normalizeText(
    getStudentClass(student)
  );

  return (
    studentClass === "9" ||
    studentClass === "9th" ||
    studentClass === "class 9" ||
    studentClass === "class 9th" ||
    studentClass === "ninth" ||
    studentClass === "10" ||
    studentClass === "10th" ||
    studentClass === "class 10" ||
    studentClass === "class 10th" ||
    studentClass === "tenth"
  );
}

function getFeeAmount(student: Student): number {
  return isClassNineOrTen(student)
    ? 300
    : 200;
}

function getAdmissionDate(student: Student): string {
  const possibleKeys = [
    "admission_date",
    "admissionDate",
    "date_of_admission",
    "dateOfAdmission",
    "joining_date",
    "joiningDate",
  ];

  for (const key of possibleKeys) {
    const value = student[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value).trim();
    }
  }

  return "";
}

function parseLocalDate(value: string): Date | null {
  if (!value) {
    return null;
  }

  const cleanValue = value.trim();

  const isoMatch =
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(
      cleanValue
    );

  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);

    const date = new Date(
      year,
      month - 1,
      day
    );

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }

    return null;
  }

  const parsed = new Date(cleanValue);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate()
  );
}

function getBillingDay(
  admissionDate: Date,
  year: number,
  monthIndex: number
): number {
  const daysInMonth = new Date(
    year,
    monthIndex + 1,
    0
  ).getDate();

  return Math.min(
    admissionDate.getDate(),
    daysInMonth
  );
}

function isFeeAvailableAutomatically(
  admissionDateString: string,
  now: Date
): boolean {
  const admissionDate =
    parseLocalDate(admissionDateString);

  if (!admissionDate) {
    return false;
  }

  const admissionDateOnly = new Date(
    admissionDate.getFullYear(),
    admissionDate.getMonth(),
    admissionDate.getDate()
  );

  const todayOnly = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  if (todayOnly < admissionDateOnly) {
    return false;
  }

  const billingDay = getBillingDay(
    admissionDate,
    todayOnly.getFullYear(),
    todayOnly.getMonth()
  );

  const dueDate = new Date(
    todayOnly.getFullYear(),
    todayOnly.getMonth(),
    billingDay
  );

  const reflectionDate = new Date(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate() - 2
  );

  return todayOnly >= reflectionDate;
}

export default function StudentFeesPage() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [studentName, setStudentName] = useState("");
  const [studentUsername, setStudentUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payingFeeId, setPayingFeeId] = useState<number | null>(null);

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

    script.id =
      "razorpay-checkout-script";
    script.src =
      "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    document.body.appendChild(script);
  }

  async function ensureAutomaticFeeForStudent(
    student: Student,
    existingFees: Fee[]
  ): Promise<void> {
    const admissionDate =
      getAdmissionDate(student);

    if (!admissionDate) {
      return;
    }

    const now = new Date();

    if (
      !isFeeAvailableAutomatically(
        admissionDate,
        now
      )
    ) {
      return;
    }

    const currentMonth =
      now.getMonth() + 1;

    const currentYear =
      now.getFullYear();

    const alreadyExists =
      existingFees.some(
        (fee) =>
          Number(fee.student_id) ===
            Number(student.id) &&
          Number(fee.month) ===
            currentMonth &&
          Number(fee.year) === currentYear
      );

    if (alreadyExists) {
      return;
    }

    const {
      error: insertError,
    } = await supabase
      .from("fees")
      .insert({
        student_id: Number(student.id),
        month: currentMonth,
        year: currentYear,
        amount: getFeeAmount(student),
        status: "PENDING",
        payment_date: null,
        transaction_id: null,
        remarks:
          "Automatic monthly fee based on admission date.",
        payment_mode: null,
      });

    if (insertError) {
      console.error(
        "Automatic student fee creation error:",
        insertError
      );
    }
  }

  async function loadFees() {
    try {
      setLoading(true);
      setError("");

      const username =
        localStorage.getItem(
          "studentUsername"
        ) ||
        localStorage.getItem(
          "student_username"
        );

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
        .select("*")
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

      const currentStudent =
        student as Student;

      setStudentName(
        currentStudent.student_name ||
          "Student"
      );

      setStudentUsername(
        currentStudent.student_username
      );

      const {
        data: feeData,
        error: feeError,
      } = await supabase
        .from("fees")
        .select(
          "id, student_id, month, year, amount, status, payment_date, transaction_id, remarks, payment_mode, created_at"
        )
        .eq(
          "student_id",
          currentStudent.id
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

      const existingFees =
        (feeData || []) as Fee[];

      /*
       * Ensure current automatic monthly fee.
       */
      await ensureAutomaticFeeForStudent(
        currentStudent,
        existingFees
      );

      /*
       * Reload after creation so the student
       * immediately sees the PENDING fee.
       */
      const {
        data: finalFeeData,
        error: finalFeeError,
      } = await supabase
        .from("fees")
        .select(
          "id, student_id, month, year, amount, status, payment_date, transaction_id, remarks, payment_mode, created_at"
        )
        .eq(
          "student_id",
          currentStudent.id
        )
        .order("year", {
          ascending: false,
        })
        .order("month", {
          ascending: false,
        });

      if (finalFeeError) {
        console.error(
          "Final fee loading error:",
          finalFeeError
        );

        setFees(existingFees);
      } else {
        setFees(
          (finalFeeData || []) as Fee[]
        );
      }
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

      if (
        String(fee.status).toUpperCase() !==
        "PENDING"
      ) {
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

      const orderResponse =
        await fetch(
          "/api/fees/create-order",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
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
            "Unable to create Razorpay order."
        );
      }

      const options = {
        key: orderData.keyId,

        amount:
          orderData.order.amount,

        currency:
          orderData.order.currency ||
          "INR",

        name: "RACER ACADEMY",

        description: `${
          months[fee.month] ||
          `Month ${fee.month}`
        } ${fee.year} Fees`,

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

            const {
              error:
                paymentModeError,
            } = await supabase
              .from("fees")
              .update({
                payment_mode:
                  "ONLINE",
                status:
                  "PAID ONLINE",
                transaction_id:
                  response.razorpay_payment_id,
                payment_date:
                  new Date()
                    .toISOString()
                    .split(
                      "T"
                    )[0],
              })
              .eq("id", fee.id);

            if (paymentModeError) {
              console.error(
                "Payment mode update error:",
                paymentModeError
              );

              throw new Error(
                "Payment was successful, but payment mode could not be updated."
              );
            }

            alert(
              "Payment successful! Your fee has been updated."
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
          ondismiss:
            function () {
              setPayingFeeId(null);
            },
        },
      };

      const razorpay =
        new window.Razorpay(
          options
        );

      razorpay.on(
        "payment.failed",
        function (
          response: any
        ) {
          console.error(
            "Razorpay payment failed:",
            response
          );

          setError(
            response?.error
              ?.description ||
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

  function printReceipt(fee: Fee) {
    const monthName =
      months[fee.month] ||
      `Month ${fee.month}`;

    const receiptNumber =
      `RA-FEE-${fee.id}-${fee.year}`;

    const paymentDate =
      fee.payment_date ||
      new Date()
        .toISOString()
        .split("T")[0];

    const amount = Number(
      fee.amount || 0
    ).toLocaleString("en-IN");

    const transactionId =
      fee.transaction_id || "—";

    const status =
      String(
        fee.status || ""
      ).toUpperCase();

    const paymentMode =
      String(
        fee.payment_mode || ""
      ).toUpperCase();

    const paymentModeDisplay =
      paymentMode === "CASH"
        ? "CASH"
        : paymentMode === "ONLINE"
        ? "ONLINE"
        : "—";

    const receiptWindow =
      window.open(
        "",
        "_blank",
        "width=800,height=900"
      );

    if (!receiptWindow) {
      setError(
        "Please allow pop-ups in your browser to print the receipt."
      );
      return;
    }

    receiptWindow.document.write(`
      <!DOCTYPE html>

      <html>
        <head>
          <title>${receiptNumber}</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 30px;
              background: #f3f4f6;
              font-family:
                Arial,
                Helvetica,
                sans-serif;
              color: #111827;
            }

            .receipt {
              max-width: 700px;
              margin: 0 auto;
              background: white;
              padding: 40px;
              border-radius: 16px;
              box-shadow:
                0 8px 30px
                rgba(0,0,0,0.08);
            }

            .header {
              text-align: center;
              border-bottom:
                2px solid #111827;
              padding-bottom: 22px;
              margin-bottom: 25px;
            }

            .academy {
              font-size: 30px;
              font-weight: 900;
              letter-spacing: 1px;
              color: #111827;
            }

            .subtitle {
              margin-top: 7px;
              color: #6b7280;
              font-size: 14px;
            }

            .receipt-title {
              margin-top: 22px;
              font-size: 22px;
              font-weight: 800;
            }

            .receipt-number {
              margin-top: 6px;
              color: #6b7280;
              font-size: 13px;
            }

            .success {
              margin: 25px 0;
              padding: 14px;
              text-align: center;
              border-radius: 10px;
              background: #dcfce7;
              color: #166534;
              font-weight: 800;
            }

            .row {
              display: flex;
              justify-content: space-between;
              gap: 20px;
              padding: 13px 0;
              border-bottom:
                1px solid #e5e7eb;
            }

            .label {
              color: #6b7280;
              font-size: 14px;
            }

            .value {
              text-align: right;
              font-weight: 700;
              color: #111827;
              overflow-wrap: anywhere;
            }

            .amount {
              margin-top: 25px;
              padding: 20px;
              border-radius: 12px;
              background: #f3f4f6;
              text-align: center;
            }

            .amount-label {
              color: #6b7280;
              font-size: 14px;
            }

            .amount-value {
              margin-top: 6px;
              font-size: 32px;
              font-weight: 900;
            }

            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top:
                1px solid #e5e7eb;
              color: #6b7280;
              font-size: 12px;
              line-height: 1.6;
            }

            .print-button {
              display: block;
              margin: 25px auto 0;
              border: none;
              background: #111827;
              color: white;
              padding: 13px 25px;
              border-radius: 8px;
              font-weight: 700;
              cursor: pointer;
              font-size: 14px;
            }

            @media print {
              body {
                padding: 0;
                background: white;
              }

              .receipt {
                max-width: none;
                box-shadow: none;
                border-radius: 0;
              }

              .print-button {
                display: none;
              }
            }

            @media (max-width: 600px) {
              body {
                padding: 10px;
              }

              .receipt {
                padding: 22px 16px;
                border-radius: 12px;
              }

              .academy {
                font-size: 24px;
              }

              .receipt-title {
                font-size: 19px;
              }

              .row {
                gap: 12px;
              }

              .label,
              .value {
                font-size: 13px;
              }

              .amount-value {
                font-size: 27px;
              }
            }
          </style>
        </head>

        <body>
          <div class="receipt">

            <div class="header">

              <div class="academy">
                RACER ACADEMY
              </div>

              <div class="subtitle">
                Student Fee Payment Receipt
              </div>

              <div class="receipt-title">
                FEE RECEIPT
              </div>

              <div class="receipt-number">
                Receipt No:
                ${receiptNumber}
              </div>

            </div>

            <div class="success">
              ✓ PAYMENT RECEIVED
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
                ${monthName}
                ${fee.year}
              </div>
            </div>

            <div class="row">
              <div class="label">
                Payment Mode
              </div>

              <div class="value">
                ${paymentModeDisplay}
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
                Payment Status
              </div>

              <div class="value">
                ${status}
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

            <div class="amount">
              <div class="amount-label">
                Amount Paid
              </div>

              <div class="amount-value">
                ₹${amount}
              </div>
            </div>

            ${
              fee.remarks
                ? `
                  <div class="row">
                    <div class="label">
                      Remarks
                    </div>

                    <div class="value">
                      ${fee.remarks}
                    </div>
                  </div>
                `
                : ""
            }

            <div class="footer">
              This is a computer-generated
              fee receipt.<br />

              RACER ACADEMY •
              Student Fee Management
            </div>

            <button
              class="print-button"
              onclick="window.print()"
            >
              🖨️ Print / Save as PDF
            </button>

          </div>
        </body>
      </html>
    `);

    receiptWindow.document.close();
    receiptWindow.focus();
  }

  const totalFees = fees.reduce(
    (sum, fee) =>
      sum + Number(fee.amount || 0),
    0
  );

  const submittedFees = fees
    .filter(
      (fee) =>
        String(
          fee.status
        ).toUpperCase() === "SUBMITTED"
    )
    .reduce(
      (sum, fee) =>
        sum + Number(fee.amount || 0),
      0
    );

  const pendingFees = fees
    .filter(
      (fee) =>
        String(
          fee.status
        ).toUpperCase() === "PENDING"
    )
    .reduce(
      (sum, fee) =>
        sum + Number(fee.amount || 0),
      0
    );

  if (loading) {
    return (
      <>
        <main style={styles.loadingPage}>
          <div style={styles.loadingBox}>
            <div>💳</div>

            <h2>Loading Fees...</h2>
          </div>
        </main>

        <style jsx global>{`
          html,
          body {
            margin: 0;
            padding: 0;
            max-width: 100%;
            overflow-x: hidden;
          }

          * {
            box-sizing: border-box;
          }
        `}</style>
      </>
    );
  }

  return (
    <>
      <main
        className="student-fees-page"
        style={styles.page}
      >
        <div
          className="student-fees-container"
          style={styles.container}
        >
          <div
            className="fees-header"
            style={styles.header}
          >
            <div className="fees-header-content">
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

          <div
            className="fees-summary-grid"
            style={styles.summaryGrid}
          >
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
              <>
                <div
                  className="fees-table-wrapper desktop-fees-table"
                  style={styles.tableWrapper}
                >
                  <table
                    className="fees-table"
                    style={styles.table}
                  >
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
                          Payment Mode
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

                        <th style={styles.th}>
                          Payment
                        </th>

                        <th style={styles.th}>
                          Receipt
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {fees.map((fee) => {
                        const status =
                          String(
                            fee.status || ""
                          ).toUpperCase();

                        const paymentMode =
                          String(
                            fee.payment_mode || ""
                          ).toUpperCase();

                        const isPending =
                          status === "PENDING";

                        const isPaid =
                          status ===
                            "PAID ONLINE" ||
                          status === "PAID";

                        const canReceipt =
                          status ===
                            "SUBMITTED" ||
                          status === "PAID" ||
                          status ===
                            "PAID ONLINE";

                        return (
                          <tr
                            key={fee.id}
                            className="fee-row"
                          >
                            <td
                              className="fee-cell"
                              data-label="Month"
                              style={styles.td}
                            >
                              <strong>
                                {months[
                                  fee.month
                                ] ||
                                  `Month ${fee.month}`}
                              </strong>{" "}
                              {fee.year}
                            </td>

                            <td
                              className="fee-cell"
                              data-label="Amount"
                              style={styles.td}
                            >
                              <strong>
                                ₹
                                {Number(
                                  fee.amount || 0
                                ).toLocaleString(
                                  "en-IN"
                                )}
                              </strong>
                            </td>

                            <td
                              className="fee-cell"
                              data-label="Status"
                              style={styles.td}
                            >
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
                                      : isPaid
                                      ? "#dcfce7"
                                      : "#e5e7eb",

                                  color:
                                    status ===
                                    "SUBMITTED"
                                      ? "#166534"
                                      : status ===
                                        "PENDING"
                                      ? "#92400e"
                                      : isPaid
                                      ? "#166534"
                                      : "#374151",
                                }}
                              >
                                {status ===
                                "SUBMITTED"
                                  ? "✓ SUBMITTED"
                                  : isPaid
                                  ? "✓ PAID ONLINE"
                                  : status}
                              </span>
                            </td>

                            <td
                              className="fee-cell"
                              data-label="Payment Mode"
                              style={styles.td}
                            >
                              {paymentMode ===
                              "CASH" ? (
                                <span
                                  style={{
                                    ...styles.modeBadge,
                                    background:
                                      "#fef3c7",
                                    color:
                                      "#92400e",
                                  }}
                                >
                                  💵 CASH
                                </span>
                              ) : paymentMode ===
                                "ONLINE" ? (
                                <span
                                  style={{
                                    ...styles.modeBadge,
                                    background:
                                      "#dbeafe",
                                    color:
                                      "#1d4ed8",
                                  }}
                                >
                                  💳 ONLINE
                                </span>
                              ) : (
                                <span
                                  style={
                                    styles.noMode
                                  }
                                >
                                  —
                                </span>
                              )}
                            </td>

                            <td
                              className="fee-cell"
                              data-label="Payment Date"
                              style={styles.td}
                            >
                              {fee.payment_date ||
                                "—"}
                            </td>

                            <td
                              className="fee-cell"
                              data-label="Transaction ID"
                              style={styles.td}
                            >
                              <span className="breakable-text">
                                {fee.transaction_id ||
                                  "—"}
                              </span>
                            </td>

                            <td
                              className="fee-cell"
                              data-label="Remarks"
                              style={styles.td}
                            >
                              <span className="breakable-text">
                                {fee.remarks ||
                                  "—"}
                              </span>
                            </td>

                            <td
                              className="fee-cell"
                              data-label="Payment"
                              style={styles.td}
                            >
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
                                <span
                                  style={
                                    styles.paidText
                                  }
                                >
                                  ✓ Paid
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>

                            <td
                              className="fee-cell"
                              data-label="Receipt"
                              style={styles.td}
                            >
                              {canReceipt ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    printReceipt(
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

                <div className="mobile-fees-list">
                  {fees.map((fee) => {
                    const status =
                      String(
                        fee.status || ""
                      ).toUpperCase();

                    const paymentMode =
                      String(
                        fee.payment_mode || ""
                      ).toUpperCase();

                    const isPending =
                      status === "PENDING";

                    const isPaid =
                      status ===
                        "PAID ONLINE" ||
                      status === "PAID";

                    const canReceipt =
                      status ===
                        "SUBMITTED" ||
                      status === "PAID" ||
                      status ===
                        "PAID ONLINE";

                    return (
                      <div
                        key={fee.id}
                        className="mobile-fee-card"
                      >
                        <div className="mobile-fee-top">
                          <div>
                            <div className="mobile-fee-month">
                              {months[
                                fee.month
                              ] ||
                                `Month ${fee.month}`}
                            </div>

                            <div className="mobile-fee-year">
                              {fee.year}
                            </div>
                          </div>

                          <div className="mobile-fee-amount">
                            ₹
                            {Number(
                              fee.amount || 0
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </div>
                        </div>

                        <div className="mobile-fee-divider" />

                        <div className="mobile-fee-detail">
                          <span>Status</span>

                          <span className="mobile-fee-value">
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
                                    : isPaid
                                    ? "#dcfce7"
                                    : "#e5e7eb",

                                color:
                                  status ===
                                  "SUBMITTED"
                                    ? "#166534"
                                    : status ===
                                      "PENDING"
                                    ? "#92400e"
                                    : isPaid
                                    ? "#166534"
                                    : "#374151",

                                whiteSpace:
                                  "normal",

                                textAlign:
                                  "center",
                              }}
                            >
                              {status ===
                              "SUBMITTED"
                                ? "✓ SUBMITTED"
                                : isPaid
                                ? "✓ PAID ONLINE"
                                : status}
                            </span>
                          </span>
                        </div>

                        <div className="mobile-fee-detail">
                          <span>
                            Payment Mode
                          </span>

                          <span className="mobile-fee-value">
                            {paymentMode ===
                            "CASH" ? (
                              <span
                                style={{
                                  ...styles.modeBadge,
                                  background:
                                    "#fef3c7",
                                  color:
                                    "#92400e",
                                  whiteSpace:
                                    "normal",
                                  textAlign:
                                    "center",
                                }}
                              >
                                💵 CASH
                              </span>
                            ) : paymentMode ===
                              "ONLINE" ? (
                              <span
                                style={{
                                  ...styles.modeBadge,
                                  background:
                                    "#dbeafe",
                                  color:
                                    "#1d4ed8",
                                  whiteSpace:
                                    "normal",
                                  textAlign:
                                    "center",
                                }}
                              >
                                💳 ONLINE
                              </span>
                            ) : (
                              <span
                                style={
                                  styles.noMode
                                }
                              >
                                —
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="mobile-fee-detail">
                          <span>
                            Payment Date
                          </span>

                          <span className="mobile-fee-value">
                            {fee.payment_date ||
                              "—"}
                          </span>
                        </div>

                        <div className="mobile-fee-detail">
                          <span>
                            Transaction ID
                          </span>

                          <span className="mobile-fee-value breakable-text">
                            {fee.transaction_id ||
                              "—"}
                          </span>
                        </div>

                        <div className="mobile-fee-detail">
                          <span>
                            Remarks
                          </span>

                          <span className="mobile-fee-value breakable-text">
                            {fee.remarks ||
                              "—"}
                          </span>
                        </div>

                        <div className="mobile-fee-actions">
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
                            <span
                              style={
                                styles.paidText
                              }
                            >
                              ✓ Paid
                            </span>
                          ) : (
                            <span>—</span>
                          )}

                          {canReceipt ? (
                            <button
                              type="button"
                              onClick={() =>
                                printReceipt(
                                  fee
                                )
                              }
                              style={
                                styles.receiptButton
                              }
                            >
                              🧾 Receipt
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          <div style={styles.info}>
            <strong>
              💡 Fee Information
            </strong>

            <p>
              Fees are assigned and managed by
              your teacher. Automatic monthly fees
              become available two days before the
              student's monthly admission-date
              billing day.
            </p>
          </div>

          <footer style={styles.footer}>
            Attendance Portal • Student Fees •
            2026
          </footer>
        </div>
      </main>

      <style jsx global>{`
        html,
        body {
          margin: 0;
          padding: 0;
          max-width: 100%;
          overflow-x: hidden !important;
        }

        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }

        .student-fees-page {
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
        }

        .student-fees-container {
          min-width: 0;
        }

        .fees-header-content {
          min-width: 0;
          flex: 1 1 auto;
        }

        .fees-header-content h1,
        .fees-header-content p {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .fees-table-wrapper {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .mobile-fees-list {
          display: none;
        }

        .mobile-fee-card,
        .mobile-fee-card * {
          box-sizing: border-box;
          min-width: 0;
          max-width: 100%;
        }

        .fees-table {
          width: 100%;
        }

        .breakable-text {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        @media (max-width: 768px) {
          .student-fees-page {
            padding: 16px !important;
          }

          .student-fees-container {
            width: 100%;
            max-width: 100%;
          }

          .fees-header {
            align-items: stretch !important;
            margin-bottom: 18px !important;
          }

          .fees-header-content {
            width: 100%;
          }

          .fees-header-content h1 {
            font-size: 27px !important;
            line-height: 1.2;
          }

          .fees-header-content p {
            font-size: 13px !important;
          }

          .fees-header > button {
            width: 100%;
            min-height: 44px;
          }

          .fees-summary-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              ) !important;
            gap: 10px !important;
            margin-bottom: 18px !important;
          }

          .fees-summary-grid > div {
            min-width: 0 !important;
            padding: 15px !important;
            gap: 10px !important;
          }

          .fees-summary-grid > div:last-child {
            grid-column: 1 / -1;
          }

          .fees-summary-grid h2 {
            font-size: 20px !important;
            overflow-wrap: anywhere;
          }

          .fees-summary-grid p {
            font-size: 12px !important;
          }

          .fees-summary-grid > div > div:first-child {
            font-size: 25px !important;
            flex-shrink: 0;
          }

          section[style*="background: white"] {
            min-width: 0 !important;
          }

          .desktop-fees-table {
            display: none !important;
          }

          .mobile-fees-list {
            display: flex !important;
            flex-direction: column;
            width: 100%;
            max-width: 100%;
            min-width: 0;
            gap: 12px;
          }

          .mobile-fee-card {
            width: 100%;
            max-width: 100%;
            min-width: 0;
            overflow: hidden;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            padding: 15px;
            box-shadow:
              0 3px 12px
              rgba(0, 0, 0, 0.05);
          }

          .mobile-fee-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            width: 100%;
            min-width: 0;
          }

          .mobile-fee-month {
            color: #111827;
            font-size: 17px;
            font-weight: 800;
            overflow-wrap: anywhere;
          }

          .mobile-fee-year {
            margin-top: 3px;
            color: #6b7280;
            font-size: 12px;
          }

          .mobile-fee-amount {
            flex: 0 0 auto;
            max-width: 45%;
            color: #111827;
            font-size: 19px;
            font-weight: 900;
            text-align: right;
            overflow-wrap: anywhere;
          }

          .mobile-fee-divider {
            height: 1px;
            width: 100%;
            background: #e5e7eb;
            margin: 12px 0 4px;
          }

          .mobile-fee-detail {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            width: 100%;
            min-width: 0;
            padding: 11px 0;
            border-bottom:
              1px solid #f1f5f9;
            color: #64748b;
            font-size: 12px;
            line-height: 1.4;
          }

          .mobile-fee-detail > span:first-child {
            flex: 0 0 38%;
            max-width: 38%;
            font-weight: 700;
          }

          .mobile-fee-value {
            flex: 1 1 auto;
            max-width: 62%;
            min-width: 0;
            color: #374151;
            text-align: right;
            overflow-wrap: anywhere;
            word-break: break-word;
          }

          .mobile-fee-actions {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            width: 100%;
            min-width: 0;
            padding-top: 13px;
          }

          .mobile-fee-actions button {
            max-width: 100%;
            white-space: normal !important;
          }

          .student-fees-page section {
            padding: 18px !important;
            border-radius: 14px !important;
          }

          .student-fees-page h2 {
            overflow-wrap: anywhere;
          }

          .student-fees-page p {
            overflow-wrap: anywhere;
          }

          .student-fees-page [style*="padding: 18px"] {
            max-width: 100%;
          }
        }

        @media (max-width: 480px) {
          .student-fees-page {
            padding: 11px !important;
          }

          .fees-header-content h1 {
            font-size: 24px !important;
          }

          .fees-summary-grid {
            grid-template-columns: 1fr !important;
          }

          .fees-summary-grid > div:last-child {
            grid-column: auto;
          }

          .fees-summary-grid > div {
            padding: 14px !important;
          }

          .fees-summary-grid h2 {
            font-size: 19px !important;
          }

          .student-fees-page section {
            padding: 14px !important;
          }

          .mobile-fee-card {
            padding: 13px;
          }

          .mobile-fee-month {
            font-size: 16px;
          }

          .mobile-fee-amount {
            font-size: 17px;
          }

          .mobile-fee-detail {
            gap: 8px;
          }

          .mobile-fee-detail > span:first-child {
            flex-basis: 40%;
            max-width: 40%;
          }

          .mobile-fee-value {
            max-width: 60%;
          }

          .mobile-fee-actions {
            align-items: stretch;
            flex-wrap: wrap;
          }

          .mobile-fee-actions button {
            flex: 1 1 auto;
          }

          .fees-table .fee-cell {
            padding: 11px 10px !important;
            gap: 8px;
            font-size: 12px !important;
          }

          .fees-table .fee-cell::before {
            flex-basis: 40%;
            max-width: 40%;
            font-size: 11px;
          }

          .fees-table .fee-cell > * {
            max-width: 60%;
          }

          .fees-table .payButton,
          .fees-table .receiptButton {
            font-size: 11px !important;
            padding: 8px 8px !important;
          }

          .fees-table .status,
          .fees-table .modeBadge {
            font-size: 10px !important;
            padding: 5px 7px !important;
          }

          .info {
            overflow-wrap: anywhere;
          }
        }

        @media (max-width: 360px) {
          .student-fees-page {
            padding: 8px !important;
          }

          .student-fees-page section {
            padding: 12px !important;
          }

          .fees-header-content h1 {
            font-size: 22px !important;
          }

          .mobile-fee-card {
            padding: 12px;
          }

          .mobile-fee-top {
            gap: 8px;
          }

          .mobile-fee-month {
            font-size: 15px;
          }

          .mobile-fee-amount {
            font-size: 16px;
            max-width: 50%;
          }

          .mobile-fee-detail {
            font-size: 11px;
          }

          .mobile-fee-detail > span:first-child {
            flex-basis: 42%;
            max-width: 42%;
          }

          .mobile-fee-value {
            max-width: 58%;
          }

          .fees-table .fee-cell {
            padding: 10px 8px !important;
          }

          .fees-table .fee-cell::before {
            flex-basis: 38%;
            max-width: 38%;
          }

          .fees-table .fee-cell > * {
            max-width: 62%;
          }
        }
      `}</style>
    </>
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
    padding: "20px",
    boxSizing: "border-box",
  },

  loadingBox: {
    background: "white",
    padding: "40px",
    borderRadius: "18px",
    textAlign: "center",
    boxShadow:
      "0 8px 25px rgba(0,0,0,0.08)",
    fontSize: "40px",
    maxWidth: "100%",
  },

  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    padding: "24px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    boxSizing: "border-box",
    width: "100%",
    maxWidth: "100vw",
    overflowX: "hidden",
  },

  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
    boxSizing: "border-box",
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
    overflowWrap: "anywhere",
  },

  subtitle: {
    margin: "7px 0 0",
    color: "#6b7280",
    fontSize: "15px",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  refreshButton: {
    border: "none",
    background: "#111827",
    color: "white",
    padding: "11px 17px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: 700,
    minHeight: "42px",
  },

  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "14px",
    borderRadius: "10px",
    marginBottom: "20px",
    fontWeight: 600,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: "16px",
    marginBottom: "25px",
    width: "100%",
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
    minWidth: 0,
    boxSizing: "border-box",
  },

  icon: {
    fontSize: "30px",
    flexShrink: 0,
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
    overflowWrap: "anywhere",
  },

  card: {
    background: "white",
    borderRadius: "15px",
    padding: "25px",
    boxShadow:
      "0 4px 14px rgba(0,0,0,0.06)",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  },

  sectionTitle: {
    margin: 0,
    color: "#111827",
    fontSize: "23px",
    overflowWrap: "anywhere",
  },

  sectionSubtitle: {
    color: "#6b7280",
    marginTop: "7px",
    marginBottom: "20px",
    overflowWrap: "anywhere",
  },

  tableWrapper: {
    width: "100%",
    maxWidth: "100%",
    overflowX: "auto",
    boxSizing: "border-box",
  },

  table: {
    width: "100%",
    minWidth: "1250px",
    borderCollapse: "collapse",
    boxSizing: "border-box",
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
    verticalAlign: "top",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  status: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  modeBadge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  noMode: {
    color: "#94a3b8",
    fontWeight: 700,
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
    cursor: "pointer",
    maxWidth: "100%",
  },

  paidText: {
    color: "#166534",
    fontWeight: 700,
    fontSize: "13px",
  },

  receiptButton: {
    border: "none",
    background: "#059669",
    color: "white",
    padding: "9px 12px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 700,
    whiteSpace: "nowrap",
    cursor: "pointer",
    maxWidth: "100%",
  },

  empty: {
    textAlign: "center",
    padding: "50px 10px",
    color: "#6b7280",
    overflowWrap: "anywhere",
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
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  footer: {
    textAlign: "center",
    color: "#9ca3af",
    marginTop: "25px",
    fontSize: "13px",
    overflowWrap: "anywhere",
  },
};