"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type PaymentSettings = {
  id: number;
  bank_name: string | null;
  account_holder_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  branch_name: string | null;
  upi_id: string | null;
  qr_code_url: string | null;
};

export default function TeacherPaymentsPage() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);

  const [bankName, setBankName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [branchName, setBranchName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  const [qrFile, setQrFile] = useState<File | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPaymentSettings();
  }, []);

  const loadPaymentSettings = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("payment_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(error);
      setMessage("Unable to load payment details.");
      setLoading(false);
      return;
    }

    if (data) {
      setSettings(data);

      setBankName(data.bank_name || "");
      setAccountHolderName(data.account_holder_name || "");
      setAccountNumber(data.account_number || "");
      setIfscCode(data.ifsc_code || "");
      setBranchName(data.branch_name || "");
      setUpiId(data.upi_id || "");
      setQrCodeUrl(data.qr_code_url || "");
    }

    setLoading(false);
  };

  const handleQrChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("QR image must be smaller than 5 MB.");
      return;
    }

    setQrFile(file);
    setMessage("");
  };

  const uploadQrCode = async () => {
    if (!qrFile) {
      return qrCodeUrl;
    }

    const extension =
      qrFile.name.split(".").pop()?.toLowerCase() || "png";

    const fileName = `payment-qr-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("payment-qr")
      .upload(fileName, qrFile, {
        cacheControl: "3600",
        upsert: true,
        contentType: qrFile.type,
      });

    if (uploadError) {
      console.error(uploadError);
      throw new Error(
        "QR upload failed. Please check the payment-qr bucket."
      );
    }

    const { data } = supabase.storage
      .from("payment-qr")
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    try {
      const finalQrUrl = await uploadQrCode();

      const paymentData = {
        bank_name: bankName.trim(),
        account_holder_name: accountHolderName.trim(),
        account_number: accountNumber.trim(),
        ifsc_code: ifscCode.trim().toUpperCase(),
        branch_name: branchName.trim(),
        upi_id: upiId.trim(),
        qr_code_url: finalQrUrl || null,
        updated_at: new Date().toISOString(),
      };

      let error;

      if (settings?.id) {
        const result = await supabase
          .from("payment_settings")
          .update(paymentData)
          .eq("id", settings.id);

        error = result.error;
      } else {
        const result = await supabase
          .from("payment_settings")
          .insert(paymentData);

        error = result.error;
      }

      if (error) {
        console.error(error);
        throw new Error(error.message);
      }

      setQrCodeUrl(finalQrUrl);
      setQrFile(null);

      setMessage("Payment details saved successfully.");
      setEditing(false);

      await loadPaymentSettings();
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Something went wrong while saving.");
      }
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (settings) {
      setBankName(settings.bank_name || "");
      setAccountHolderName(settings.account_holder_name || "");
      setAccountNumber(settings.account_number || "");
      setIfscCode(settings.ifsc_code || "");
      setBranchName(settings.branch_name || "");
      setUpiId(settings.upi_id || "");
      setQrCodeUrl(settings.qr_code_url || "");
    }

    setQrFile(null);
    setMessage("");
    setEditing(false);
  };

  if (loading) {
    return (
      <main className="loading-page">
        <div className="loader" />
        <p>Loading payment details...</p>

        <style jsx>{`
          .loading-page {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: #070b17;
            color: white;
            font-family:
              Inter,
              ui-sans-serif,
              system-ui,
              sans-serif;
          }

          .loader {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top-color: #818cf8;
            animation: spin 0.9s linear infinite;
            margin-bottom: 16px;
          }

          .loading-page p {
            color: #94a3b8;
            font-size: 13px;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="payments-page">
      <div className="background-grid" />
      <div className="glow glow-one" />
      <div className="glow glow-two" />

      <div className="page-container">
        {/* HEADER */}
        <header className="header">
          <div>
            <div className="kicker">RACER ACADEMY</div>
            <h1>Payment Details</h1>
            <p>
              Manage the bank account, UPI and QR code that students
              will use for fee payments.
            </p>
          </div>

          <button
            type="button"
            className="back-button"
            onClick={() => window.history.back()}
          >
            ← Back
          </button>
        </header>

        {/* MESSAGE */}
        {message && (
          <div
            className={`message ${
              message.toLowerCase().includes("success")
                ? "success"
                : "error"
            }`}
          >
            <span>
              {message.toLowerCase().includes("success") ? "✓" : "!"}
            </span>
            {message}
          </div>
        )}

        <div className="content-grid">
          {/* PAYMENT DETAILS */}
          <section className="card details-card">
            <div className="card-heading">
              <div className="heading-icon">₹</div>

              <div>
                <h2>Bank & UPI Details</h2>
                <p>Students will see these details for online payments.</p>
              </div>
            </div>

            <div className="fields">
              <div className="field">
                <label>Bank Name</label>
                <input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  disabled={!editing}
                  placeholder="e.g. State Bank of India"
                />
              </div>

              <div className="field">
                <label>Account Holder Name</label>
                <input
                  value={accountHolderName}
                  onChange={(e) =>
                    setAccountHolderName(e.target.value)
                  }
                  disabled={!editing}
                  placeholder="Account holder name"
                />
              </div>

              <div className="field">
                <label>Account Number</label>
                <input
                  value={accountNumber}
                  onChange={(e) =>
                    setAccountNumber(e.target.value)
                  }
                  disabled={!editing}
                  placeholder="Bank account number"
                />
              </div>

              <div className="field">
                <label>IFSC Code</label>
                <input
                  value={ifscCode}
                  onChange={(e) =>
                    setIfscCode(e.target.value.toUpperCase())
                  }
                  disabled={!editing}
                  placeholder="e.g. SBIN0000000"
                />
              </div>

              <div className="field">
                <label>Branch Name</label>
                <input
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  disabled={!editing}
                  placeholder="Branch name"
                />
              </div>

              <div className="field">
                <label>UPI ID</label>
                <input
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  disabled={!editing}
                  placeholder="e.g. raceracademy@upi"
                />
              </div>
            </div>

            <div className="actions">
              {!editing ? (
                <button
                  type="button"
                  className="edit-button"
                  onClick={() => {
                    setEditing(true);
                    setMessage("");
                  }}
                >
                  ✏️ Edit Payment Details
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="save-button"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "✓ Save Details"}
                  </button>
                </>
              )}
            </div>
          </section>

          {/* QR CODE */}
          <section className="card qr-card">
            <div className="card-heading">
              <div className="heading-icon qr-heading-icon">
                ▣
              </div>

              <div>
                <h2>Payment QR Code</h2>
                <p>Students can scan this QR code to pay online.</p>
              </div>
            </div>

            <div className="qr-area">
              {qrCodeUrl ? (
                <div className="qr-wrapper">
                  <img
                    src={qrCodeUrl}
                    alt="Racer Academy Payment QR Code"
                    className="qr-image"
                  />
                </div>
              ) : (
                <div className="qr-placeholder">
                  <div className="placeholder-icon">▣</div>
                  <strong>No QR Code Added</strong>
                  <span>
                    Add your UPI payment QR code from Edit mode.
                  </span>
                </div>
              )}
            </div>

            {editing && (
              <div className="upload-area">
                <label className="upload-button">
                  📷 Choose QR Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrChange}
                  />
                </label>

                {qrFile && (
                  <div className="selected-file">
                    <span>✓</span>
                    {qrFile.name}
                  </div>
                )}

                <small>
                  PNG, JPG or WEBP • Maximum 5 MB
                </small>
              </div>
            )}

            {!editing && qrCodeUrl && (
              <div className="qr-status">
                <span>●</span>
                QR Code Active
              </div>
            )}
          </section>
        </div>

        {/* STUDENT PREVIEW */}
        <section className="student-preview card">
          <div className="preview-header">
            <div>
              <div className="kicker">STUDENT VIEW</div>
              <h2>What Students Will See</h2>
              <p>
                This is how your payment information will appear on
                the student side.
              </p>
            </div>

            <div className="online-badge">
              <span>●</span>
              ONLINE PAYMENT
            </div>
          </div>

          <div className="student-payment-layout">
            <div className="student-info">
              <div className="info-row">
                <span>Bank</span>
                <strong>
                  {bankName || "Not added"}
                </strong>
              </div>

              <div className="info-row">
                <span>Account Holder</span>
                <strong>
                  {accountHolderName || "Not added"}
                </strong>
              </div>

              <div className="info-row">
                <span>Account Number</span>
                <strong>
                  {accountNumber || "Not added"}
                </strong>
              </div>

              <div className="info-row">
                <span>IFSC</span>
                <strong>
                  {ifscCode || "Not added"}
                </strong>
              </div>

              <div className="info-row">
                <span>Branch</span>
                <strong>
                  {branchName || "Not added"}
                </strong>
              </div>

              <div className="info-row">
                <span>UPI ID</span>
                <strong>
                  {upiId || "Not added"}
                </strong>
              </div>
            </div>

            <div className="student-qr">
              {qrCodeUrl ? (
                <>
                  <img
                    src={qrCodeUrl}
                    alt="Online payment QR"
                  />
                  <span>Scan to Pay</span>
                </>
              ) : (
                <div className="no-student-qr">
                  QR Code
                  <small>Not added yet</small>
                </div>
              )}
            </div>
          </div>

          <div className="cash-online-note">
            <div className="cash-box">
              <span className="method-icon">💵</span>
              <div>
                <strong>Cash Payment</strong>
                <p>
                  Students who pay fees in cash can select the
                  <b> Cash</b> payment method.
                </p>
              </div>
            </div>

            <div className="online-box">
              <span className="method-icon">📱</span>
              <div>
                <strong>Online Payment</strong>
                <p>
                  Students paying online can use the bank details,
                  UPI ID or QR code shown above.
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer>
          <span>Racer Academy</span>
          <span>Secure • Private • Connected</span>
        </footer>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .payments-page {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          color: #f8fafc;
          background:
            radial-gradient(
              circle at 10% 10%,
              rgba(245, 158, 11, 0.12),
              transparent 28%
            ),
            radial-gradient(
              circle at 90% 30%,
              rgba(99, 102, 241, 0.13),
              transparent 30%
            ),
            linear-gradient(
              135deg,
              #060914 0%,
              #0b1020 50%,
              #070b16 100%
            );
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .background-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.2;
          background-image:
            linear-gradient(
              rgba(148, 163, 184, 0.04) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(148, 163, 184, 0.04) 1px,
              transparent 1px
            );
          background-size: 45px 45px;
        }

        .glow {
          position: fixed;
          width: 330px;
          height: 330px;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.13;
          pointer-events: none;
        }

        .glow-one {
          left: -170px;
          top: 20%;
          background: #f59e0b;
        }

        .glow-two {
          right: -170px;
          bottom: 10%;
          background: #6366f1;
        }

        .page-container {
          width: min(1180px, calc(100% - 36px));
          margin: auto;
          position: relative;
          z-index: 2;
          padding-bottom: 40px;
        }

        .header {
          min-height: 150px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        }

        .kicker {
          color: #fbbf24;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 2.5px;
          margin-bottom: 8px;
        }

        .header h1 {
          margin: 0;
          font-size: clamp(32px, 5vw, 52px);
          letter-spacing: -2px;
        }

        .header p {
          color: #94a3b8;
          font-size: 13px;
          line-height: 1.6;
          margin: 12px 0 0;
          max-width: 650px;
        }

        .back-button {
          border: 1px solid rgba(148, 163, 184, 0.14);
          background: rgba(15, 23, 42, 0.7);
          color: #cbd5e1;
          padding: 11px 17px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 700;
          transition: 0.25s ease;
        }

        .back-button:hover {
          transform: translateY(-2px);
          border-color: rgba(129, 140, 248, 0.4);
          color: white;
        }

        .message {
          margin: 22px 0 0;
          padding: 13px 16px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          font-weight: 700;
        }

        .message.success {
          color: #86efac;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .message.error {
          color: #fca5a5;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .content-grid {
          display: grid;
          grid-template-columns: 1.45fr 0.85fr;
          gap: 18px;
          margin-top: 24px;
        }

        .card {
          border: 1px solid rgba(148, 163, 184, 0.11);
          border-radius: 22px;
          background:
            linear-gradient(
              145deg,
              rgba(22, 30, 55, 0.92),
              rgba(10, 16, 31, 0.9)
            );
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.2);
        }

        .details-card {
          padding: 27px;
        }

        .qr-card {
          padding: 27px;
        }

        .card-heading {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-bottom: 25px;
        }

        .heading-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          background: rgba(245, 158, 11, 0.11);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.17);
          font-size: 21px;
          font-weight: 900;
        }

        .qr-heading-icon {
          background: rgba(99, 102, 241, 0.11);
          color: #a5b4fc;
          border-color: rgba(129, 140, 248, 0.17);
        }

        .card-heading h2 {
          margin: 0;
          font-size: 19px;
        }

        .card-heading p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 11px;
          line-height: 1.5;
        }

        .fields {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 17px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field label {
          color: #94a3b8;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.5px;
        }

        .field input {
          width: 100%;
          height: 46px;
          padding: 0 13px;
          border-radius: 11px;
          outline: none;
          border: 1px solid rgba(148, 163, 184, 0.12);
          background: rgba(2, 6, 23, 0.55);
          color: white;
          font-size: 12px;
          transition: 0.2s ease;
        }

        .field input:focus {
          border-color: rgba(129, 140, 248, 0.55);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.08);
        }

        .field input:disabled {
          color: #cbd5e1;
          opacity: 0.78;
          cursor: not-allowed;
        }

        .field input::placeholder {
          color: #475569;
        }

        .actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 24px;
        }

        .edit-button,
        .save-button,
        .cancel-button {
          border: 0;
          border-radius: 11px;
          padding: 12px 17px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 800;
          transition: 0.25s ease;
        }

        .edit-button {
          color: #c7d2fe;
          background: rgba(99, 102, 241, 0.14);
          border: 1px solid rgba(129, 140, 248, 0.22);
        }

        .edit-button:hover {
          background: rgba(99, 102, 241, 0.23);
          transform: translateY(-2px);
        }

        .save-button {
          color: white;
          background: linear-gradient(135deg, #4f46e5, #2563eb);
          box-shadow: 0 10px 25px rgba(79, 70, 229, 0.25);
        }

        .save-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(79, 70, 229, 0.35);
        }

        .cancel-button {
          color: #cbd5e1;
          background: rgba(148, 163, 184, 0.08);
          border: 1px solid rgba(148, 163, 184, 0.12);
        }

        .cancel-button:hover {
          background: rgba(148, 163, 184, 0.14);
        }

        .save-button:disabled,
        .cancel-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .qr-area {
          min-height: 280px;
          display: grid;
          place-items: center;
          border-radius: 17px;
          background:
            radial-gradient(
              circle at center,
              rgba(99, 102, 241, 0.07),
              transparent 65%
            ),
            rgba(2, 6, 23, 0.35);
          border: 1px dashed rgba(148, 163, 184, 0.14);
          padding: 20px;
        }

        .qr-wrapper {
          background: white;
          padding: 13px;
          border-radius: 15px;
          box-shadow: 0 15px 45px rgba(0, 0, 0, 0.35);
        }

        .qr-image {
          width: 210px;
          height: 210px;
          object-fit: contain;
          display: block;
        }

        .qr-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 8px;
          color: #64748b;
        }

        .placeholder-icon {
          font-size: 52px;
          color: #475569;
          margin-bottom: 5px;
        }

        .qr-placeholder strong {
          color: #94a3b8;
          font-size: 14px;
        }

        .qr-placeholder span {
          max-width: 210px;
          font-size: 10px;
          line-height: 1.6;
        }

        .upload-area {
          margin-top: 16px;
          padding: 15px;
          border-radius: 13px;
          background: rgba(2, 6, 23, 0.35);
          border: 1px solid rgba(148, 163, 184, 0.1);
          text-align: center;
        }

        .upload-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 11px 15px;
          border-radius: 10px;
          background: rgba(99, 102, 241, 0.14);
          border: 1px solid rgba(129, 140, 248, 0.25);
          color: #c7d2fe;
          cursor: pointer;
          font-size: 11px;
          font-weight: 800;
        }

        .upload-button input {
          display: none;
        }

        .selected-file {
          margin-top: 10px;
          color: #86efac;
          font-size: 10px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .upload-area small {
          display: block;
          color: #475569;
          font-size: 9px;
          margin-top: 8px;
        }

        .qr-status {
          margin-top: 13px;
          text-align: center;
          color: #4ade80;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.5px;
        }

        .qr-status span {
          margin-right: 5px;
        }

        .student-preview {
          margin-top: 18px;
          padding: 27px;
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 25px;
        }

        .preview-header h2 {
          margin: 0;
          font-size: 21px;
        }

        .preview-header p {
          color: #64748b;
          font-size: 11px;
          margin: 6px 0 0;
        }

        .online-badge {
          padding: 9px 12px;
          border-radius: 100px;
          background: rgba(34, 197, 94, 0.09);
          border: 1px solid rgba(34, 197, 94, 0.17);
          color: #86efac;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1px;
          white-space: nowrap;
        }

        .online-badge span {
          margin-right: 5px;
        }

        .student-payment-layout {
          display: grid;
          grid-template-columns: 1fr 260px;
          gap: 25px;
          padding: 20px;
          border-radius: 17px;
          background: rgba(2, 6, 23, 0.35);
          border: 1px solid rgba(148, 163, 184, 0.08);
        }

        .student-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1px;
        }

        .info-row {
          padding: 13px 14px;
          background: rgba(15, 23, 42, 0.45);
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .info-row span {
          color: #64748b;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .info-row strong {
          color: #e2e8f0;
          font-size: 11px;
          word-break: break-word;
        }

        .student-qr {
          min-height: 240px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 9px;
        }

        .student-qr img {
          width: 190px;
          height: 190px;
          object-fit: contain;
          background: white;
          padding: 10px;
          border-radius: 13px;
        }

        .student-qr span {
          color: #cbd5e1;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .no-student-qr {
          width: 190px;
          height: 190px;
          border: 1px dashed rgba(148, 163, 184, 0.18);
          border-radius: 13px;
          display: grid;
          place-items: center;
          align-content: center;
          color: #475569;
          font-weight: 900;
          font-size: 17px;
          gap: 6px;
        }

        .no-student-qr small {
          font-size: 9px;
          font-weight: 500;
        }

        .cash-online-note {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 13px;
          margin-top: 18px;
        }

        .cash-box,
        .online-box {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 16px;
          border-radius: 14px;
        }

        .cash-box {
          background: rgba(245, 158, 11, 0.07);
          border: 1px solid rgba(245, 158, 11, 0.13);
        }

        .online-box {
          background: rgba(99, 102, 241, 0.07);
          border: 1px solid rgba(99, 102, 241, 0.13);
        }

        .method-icon {
          font-size: 21px;
        }

        .cash-box strong,
        .online-box strong {
          font-size: 11px;
        }

        .cash-box p,
        .online-box p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 10px;
          line-height: 1.55;
        }

        .cash-box b,
        .online-box b {
          color: #cbd5e1;
        }

        footer {
          min-height: 70px;
          border-top: 1px solid rgba(148, 163, 184, 0.08);
          margin-top: 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #475569;
          font-size: 9px;
          letter-spacing: 0.6px;
        }

        footer span:first-child {
          color: #64748b;
          font-weight: 800;
        }

        @media (max-width: 900px) {
          .content-grid {
            grid-template-columns: 1fr;
          }

          .student-payment-layout {
            grid-template-columns: 1fr;
          }

          .student-qr {
            order: -1;
          }
        }

        @media (max-width: 650px) {
          .page-container {
            width: min(100% - 24px, 600px);
          }

          .header {
            padding: 30px 0;
            min-height: auto;
            align-items: flex-start;
          }

          .header h1 {
            font-size: 35px;
          }

          .back-button {
            padding: 9px 12px;
            font-size: 10px;
          }

          .fields {
            grid-template-columns: 1fr;
          }

          .details-card,
          .qr-card,
          .student-preview {
            padding: 20px;
          }

          .student-info {
            grid-template-columns: 1fr;
          }

          .cash-online-note {
            grid-template-columns: 1fr;
          }

          .preview-header {
            flex-direction: column;
          }

          .online-badge {
            align-self: flex-start;
          }

          footer {
            flex-direction: column;
            justify-content: center;
            gap: 8px;
            padding: 20px 0;
          }
        }
      `}</style>
    </main>
  );
}