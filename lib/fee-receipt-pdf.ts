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

async function loadSealDataUrl() {
  const response = await fetch("/racer-academy-official-seal.png", { cache: "force-cache" });
  if (!response.ok) throw new Error("RACER ACADEMY official seal could not be loaded.");
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
  const seal = await loadSealDataUrl();

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

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(222, 231, 242);
  doc.roundedRect(margin, 57, pageWidth - margin * 2, 43, 4, 4, "FD");
  doc.setTextColor(99, 119, 145);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("AMOUNT RECEIVED", 21, 68);
  doc.setTextColor(12, 67, 126);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(27);
  doc.text(`INR ${Number(details.amount || 0).toLocaleString("en-IN")}`, 21, 84);
  doc.setTextColor(102, 120, 143);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Fee period: ${details.feePeriod}`, 21, 93);

  const normalizedStatus = details.paymentStatus.toUpperCase();
  const statusColor: [number, number, number] = normalizedStatus.includes("REFUND")
    ? [155, 66, 76]
    : [28, 125, 91];
  doc.setFillColor(normalizedStatus.includes("REFUND") ? 255 : 232, normalizedStatus.includes("REFUND") ? 239 : 248, normalizedStatus.includes("REFUND") ? 240 : 240);
  doc.roundedRect(153, 65, 38, 12, 6, 6, "F");
  doc.setTextColor(...statusColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(normalizedStatus || "PAID", 172, 73, { align: "center", maxWidth: 34 });

  const cardY = 106;
  const cardHeight = 103;
  const cardGap = 8;
  const cardWidth = (pageWidth - margin * 2 - cardGap) / 2;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(222, 231, 242);
  doc.roundedRect(margin, cardY, cardWidth, cardHeight, 4, 4, "FD");
  doc.roundedRect(margin + cardWidth + cardGap, cardY, cardWidth, cardHeight, 4, 4, "FD");

  doc.setTextColor(20, 54, 96);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("STUDENT DETAILS", margin + 8, cardY + 13);
  doc.text("PAYMENT DETAILS", margin + cardWidth + cardGap + 8, cardY + 13);
  doc.setDrawColor(230, 236, 244);
  doc.line(margin + 8, cardY + 18, margin + cardWidth - 8, cardY + 18);
  doc.line(margin + cardWidth + cardGap + 8, cardY + 18, pageWidth - margin - 8, cardY + 18);

  drawField(doc, "Student Name", details.studentName, margin + 8, cardY + 29, cardWidth - 16);
  drawField(doc, "Father's Name", details.fatherName || "—", margin + 8, cardY + 48, 36);
  drawField(doc, "Mother's Name", details.motherName || "—", margin + 48, cardY + 48, 34);
  drawField(doc, "Class", details.className || "—", margin + 8, cardY + 68, 34);
  drawField(doc, "Roll No.", details.rollNumber || "—", margin + 48, cardY + 68, 34);
  drawField(doc, "Student ID / Username", details.username, margin + 8, cardY + 87, cardWidth - 16);
  drawField(doc, "Fee Period", details.feePeriod, margin + cardWidth + cardGap + 8, cardY + 29, cardWidth - 16);
  drawField(doc, "Payment Mode", details.paymentMode, margin + cardWidth + cardGap + 8, cardY + 50, cardWidth - 16);
  drawField(doc, "Payment Date", details.paymentDate, margin + cardWidth + cardGap + 8, cardY + 71, cardWidth - 16);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(222, 231, 242);
  doc.roundedRect(margin, 216, pageWidth - margin * 2, 25, 4, 4, "FD");
  drawField(doc, "Transaction ID", details.transactionId, margin + 8, 226, 92);
  drawField(doc, "Receipt Date", new Date().toLocaleDateString("en-IN"), 126, 226, 60);

  if (details.remarks && details.remarks !== "—") {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(222, 231, 242);
    doc.roundedRect(margin, 247, 113, 20, 4, 4, "FD");
    doc.setTextColor(111, 128, 151);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("REMARKS", margin + 8, 255);
    doc.setTextColor(54, 72, 95);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(doc.splitTextToSize(details.remarks, 96).slice(0, 2), margin + 8, 262);
  }

  doc.setDrawColor(50, 73, 105);
  doc.setLineWidth(0.35);
  doc.line(margin + 5, 277, 97, 277);
  doc.setTextColor(44, 62, 85);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Authorized Signatory", margin + 5, 283);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(117, 132, 151);
  doc.text("For RACER ACADEMY", margin + 5, 287);

  doc.addImage(seal, "PNG", 151, 232, 42, 42);
  doc.setTextColor(72, 91, 117);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("OFFICIAL ACADEMY SEAL", 172, 278, { align: "center" });

  doc.setDrawColor(220, 229, 240);
  doc.line(margin, 291, pageWidth - margin, 291);
  doc.setTextColor(117, 132, 151);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Computer-generated receipt · Keep this document for your records.", pageWidth / 2, 295, { align: "center" });
  return doc;
}
