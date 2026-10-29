"use client";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { downloadPdfFile } from "../../../lib/download-pdf";

type StudentExportOptionsProps = {
  title: string;
  fileName: string;
  headers: string[];
  rows: Array<Array<string | number>>;
  formats?: Array<"excel" | "pdf">;
};

export default function StudentExportOptions({
  title,
  fileName,
  headers,
  rows,
  formats = ["excel", "pdf"],
}: StudentExportOptionsProps) {
  const disabled = rows.length === 0;

  function downloadExcel() {
    if (disabled) return;
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    worksheet["!cols"] = headers.map((header, index) => ({
      wch: Math.min(34, Math.max(header.length + 2, ...rows.map((row) => String(row[index] ?? "").length + 2))),
    }));
    XLSX.utils.book_append_sheet(workbook, worksheet, "Student Records");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  }

  function downloadPdf() {
    if (disabled) return;
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const left = 14;
    const width = 182;
    let y = 18;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.text(title, left, y);
    y += 9;
    pdf.setFontSize(8);
    rows.forEach((row, rowIndex) => {
      const lines = row.map((value, index) => `${headers[index]}: ${String(value ?? "—")}`);
      const wrapped = pdf.splitTextToSize(`${rowIndex + 1}. ${lines.join("   |   ")}`, width);
      const blockHeight = wrapped.length * 4 + 4;
      if (y + blockHeight > 282) {
        pdf.addPage();
        y = 16;
      }
      pdf.setFont("helvetica", "normal");
      pdf.text(wrapped, left, y);
      y += blockHeight;
      pdf.setDrawColor(225, 232, 240);
      pdf.line(left, y - 2, left + width, y - 2);
    });
    downloadPdfFile(pdf, `${fileName}.pdf`);
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }} aria-label={`Download ${title}`}>
      {formats.includes("excel") && <button type="button" onClick={downloadExcel} disabled={disabled} style={buttonStyle("#16734b", disabled)}>↓ Excel</button>}
      {formats.includes("pdf") && <button type="button" onClick={downloadPdf} disabled={disabled} style={buttonStyle("#a83a3a", disabled)}>↓ PDF</button>}
    </div>
  );
}

function buttonStyle(background: string, disabled: boolean): React.CSSProperties {
  return {
    minHeight: 36,
    padding: "8px 12px",
    border: "1px solid rgba(20, 48, 80, .12)",
    borderRadius: 10,
    background: disabled ? "#e8edf3" : background,
    color: disabled ? "#8a98a8" : "#fff",
    fontSize: 12,
    fontWeight: 850,
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
  };
}
