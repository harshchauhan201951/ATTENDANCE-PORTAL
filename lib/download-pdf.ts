import type jsPDF from "jspdf";

/** Save a generated PDF through jsPDF's browser-aware download implementation. */
export function downloadPdfFile(pdf: jsPDF, filename: string) {
  const safeFilename = filename.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_");
  const pdfFilename = safeFilename.toLowerCase().endsWith(".pdf")
    ? safeFilename
    : `${safeFilename}.pdf`;

  pdf.save(pdfFilename);
}
