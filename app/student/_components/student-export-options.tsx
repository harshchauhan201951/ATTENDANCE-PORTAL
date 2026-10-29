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
  pdfLayout?: "rows" | "profile";
};

export default function StudentExportOptions({
  title,
  fileName,
  headers,
  rows,
  formats = ["excel", "pdf"],
  pdfLayout = "rows",
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
    if (pdfLayout === "profile") {
      rows.forEach((row, rowIndex) => {
        if (y > 266) {
          pdf.addPage();
          y = 16;
        }
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.text(pdf.splitTextToSize(String(row[1] || `Student ${rowIndex + 1}`), 125), left, y);
        pdf.setFontSize(8);
        pdf.text(`ID: ${String(row[0] ?? "—")}`, left + 130, y, { maxWidth: 52, align: "right" });
        y += 7;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        for (let index = 2; index < headers.length; index += 2) {
          const cells = [index, index + 1].filter((cellIndex) => cellIndex < headers.length);
          const cellLines = cells.map((cellIndex) => pdf.splitTextToSize(`${headers[cellIndex]}: ${String(row[cellIndex] ?? "—")}`, 86));
          const blockHeight = Math.max(...cellLines.map((lines) => lines.length)) * 3.7 + 3;
          if (y + blockHeight > 282) {
            pdf.addPage();
            y = 16;
          }
          cells.forEach((cellIndex, cellPosition) => {
            pdf.text(cellLines[cellPosition], left + (cellPosition * 94), y);
          });
          y += blockHeight;
        }
        y += 2;
        pdf.setDrawColor(225, 232, 240);
        pdf.line(left, y - 1, left + width, y - 1);
        y += 3;
      });
    } else {
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
    }
    downloadPdfFile(pdf, `${fileName}.pdf`);
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }} aria-label={`Download ${title}`}>
      {formats.includes("excel") && <button type="button" onClick={downloadExcel} disabled={disabled} style={buttonStyle("#16734b", disabled)}>Export Excel</button>}
      {formats.includes("pdf") && <button type="button" onClick={downloadPdf} disabled={disabled} style={buttonStyle("#a83a3a", disabled)}>Download PDF</button>}
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
