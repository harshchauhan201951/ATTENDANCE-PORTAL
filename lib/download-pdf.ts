import type jsPDF from "jspdf";

/** Start a real PDF file download without opening a print popup. */
export function downloadPdfFile(document: jsPDF, filename: string) {
  const file = document.output("blob");
  const url = URL.createObjectURL(file);
  const link = window.document.createElement("a");
  link.href = url;
  const safeFilename = filename.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_");
  link.download = safeFilename.toLowerCase().endsWith(".pdf") ? safeFilename : `${safeFilename}.pdf`;
  link.style.display = "none";
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
