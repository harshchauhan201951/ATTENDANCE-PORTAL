import type jsPDF from "jspdf";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

/** Save PDFs through the browser on web and the device Documents folder in the app. */
export function downloadPdfFile(pdf: jsPDF, filename: string) {
  const safeFilename = filename.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_");
  const pdfFilename = safeFilename.toLowerCase().endsWith(".pdf")
    ? safeFilename
    : `${safeFilename}.pdf`;

  if (!Capacitor.isNativePlatform()) {
    pdf.save(pdfFilename);
    return;
  }

  void (async () => {
    try {
      const permission = await Filesystem.checkPermissions();
      if (permission.publicStorage !== "granted") {
        const requested = await Filesystem.requestPermissions();
        if (requested.publicStorage !== "granted") {
          throw new Error("Storage permission was not granted.");
        }
      }

      const base64 = pdf.output("datauristring").split(",", 2)[1];
      if (!base64) throw new Error("The PDF could not be prepared.");

      const saved = await Filesystem.writeFile({
        path: `RACER Academy/${pdfFilename}`,
        data: base64,
        directory: Directory.Documents,
        recursive: true,
      });

      // The document is already persisted, so dismissing the share sheet won't lose it.
      await Share.share({
        title: pdfFilename,
        text: `PDF saved in Documents/RACER Academy: ${pdfFilename}`,
        files: [saved.uri],
        dialogTitle: "Open or share PDF",
      });
    } catch (error) {
      console.error("Could not save PDF in the RACER Academy app:", error);
      window.alert("PDF save nahi ho payi. Storage permission check karke dobara try karein.");
    }
  })();
}
