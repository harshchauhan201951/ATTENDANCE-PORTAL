import jsPDF from "jspdf";

export type FeeReceiptDetails = {
  receiptNumber: string;
  studentName: string;
  username: string;
  className: string;
  rollNumber: string;
  fatherName: string;
  motherName: string;
  feePeriod: string;
  amount: number;
  paymentStatus: string;
  paymentMode: string;
  paymentDate: string;
  transactionId: string;
  remarks: string;
};

function drawField(doc: jsPDF, label: string, value: string, x: number, y: number, width: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(111, 128, 151);
  doc.text(label.toUpperCase(), x, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(26, 48, 77);
  const lines = doc.splitTextToSize(value || "—", width).slice(0, 2);
  doc.text(lines, x, y + 6);
}

async function loadReceiptImageDataUrl(path: string, description: string) {
  const response = await fetch(path, { cache: "force-cache" });
  if (!response.ok) throw new Error(`RACER ACADEMY ${description} could not be loaded.`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return `data:image/png;base64,${btoa(binary)}`;
}

export async function buildFeeReceiptPdf(details: FeeReceiptDetails) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const [seal, digitalMark] = await Promise.all([
    loadReceiptImageDataUrl("/racer-academy-official-seal.png", "official seal"),
    loadReceiptImageDataUrl("/racer-academy-digital-mark.png", "digital mark"),
  ]);

  doc.setFillColor(246, 249, 253);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  doc.setFillColor(12, 48, 91);
  doc.rect(0, 0, pageWidth, 47, "F");
  doc.setFillColor(224, 178, 65);
  doc.rect(0, 45, pageWidth, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("RACER ACADEMY", margin, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(210, 225, 245);
  doc.text("LEARN  ·  GROW  ·  ACHIEVE", margin, 25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("OFFICIAL FEE RECEIPT", margin, 38);

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(132, 10, 64, 25, 3, 3, "F");
  doc.setTextColor(103, 121, 145);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("RECEIPT NUMBER", 138, 18);
  doc.setTextColor(20, 54, 96);
  doc.setFontSize(10);
  doc.text(doc.splitTextToSize(details.receiptNumber, 52).slice(0, 2), 138, 25);

  const normalizedStatus = details.paymentStatus.toUpperCase();
  const statusColor: [number, number, number] = normalizedStatus.includes("REFUND")
    ? [155, 66, 76]
    : [28, 125, 91];

  // Keep the receipt in a single page: student identity first, payment second.
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(222, 231, 242);
  doc.roundedRect(margin, 56, pageWidth - margin * 2, 82, 4, 4, "FD");
  doc.setTextColor(20, 54, 96);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("STUDENT DETAILS", 22, 68);
  doc.setDrawColor(230, 236, 244);
  doc.line(22, 73, pageWidth - 22, 73);
  drawField(doc, "Student Name", details.studentName, 22, 84, 166);
  drawField(doc, "Father's Name", details.fatherName || "—", 22, 103, 78);
  drawField(doc, "Mother's Name", details.motherName || "—", 111, 103, 77);
  drawField(doc, "Class", details.className || "—", 22, 122, 42);
  drawField(doc, "Roll No.", details.rollNumber || "—", 76, 122, 36);
  drawField(doc, "Student ID / Username", details.username, 124, 122, 64);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(222, 231, 242);
  doc.roundedRect(margin, 146, pageWidth - margin * 2, 86, 4, 4, "FD");
  doc.setTextColor(20, 54, 96);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("PAYMENT DETAILS", 22, 158);
  doc.setDrawColor(230, 236, 244);
  doc.line(22, 163, pageWidth - 22, 163);

  doc.setTextColor(99, 119, 145);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("FEE PERIOD", 22, 175);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(26, 48, 77);
  doc.text(doc.splitTextToSize(details.feePeriod, 66).slice(0, 2), 22, 182);

  doc.setFillColor(normalizedStatus.includes("REFUND") ? 255 : 232, normalizedStatus.includes("REFUND") ? 239 : 248, normalizedStatus.includes("REFUND") ? 240 : 240);
  doc.roundedRect(146, 168, 44, 12, 6, 6, "F");
  doc.setTextColor(...statusColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(normalizedStatus || "PAID", 168, 176, { align: "center", maxWidth: 40 });

  doc.setTextColor(99, 119, 145);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("AMOUNT RECEIVED", 22, 198);
  doc.setTextColor(12, 67, 126);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.text(`INR ${Number(details.amount || 0).toLocaleString("en-IN")}`, 22, 211);
  drawField(doc, "Payment Mode", details.paymentMode, 111, 181, 77);
  drawField(doc, "Payment Date", details.paymentDate, 111, 202, 77);
  drawField(doc, "Transaction ID", details.transactionId, 22, 223, 96);
  drawField(doc, "Receipt Date", new Date().toLocaleDateString("en-IN"), 124, 223, 64);

  if (details.remarks && details.remarks !== "—") {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(222, 231, 242);
    doc.roundedRect(margin, 240, 113, 22, 4, 4, "FD");
    doc.setTextColor(111, 128, 151);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("REMARKS", 22, 249);
    doc.setTextColor(54, 72, 95);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(doc.splitTextToSize(details.remarks, 96).slice(0, 2), 22, 257);
  }

  // The supplied script sheet is used as a clearly labeled, computer-generated academy wordmark.
  doc.addImage(digitalMark, "PNG", 20, 264, 69, 22);
  doc.setTextColor(91, 108, 131);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.4);
  doc.text("COMPUTER-GENERATED ACADEMY MARK", 54.5, 289, { align: "center" });
  doc.addImage(seal, "PNG", 155, 246, 38, 38);
  doc.text("OFFICIAL ACADEMY SEAL", 174, 289, { align: "center" });

  doc.setDrawColor(220, 229, 240);
  doc.line(margin, 292, pageWidth - margin, 292);
  doc.setTextColor(117, 132, 151);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Computer-generated one-page receipt · RACER ACADEMY", pageWidth / 2, 296, { align: "center" });
  return doc;
}
