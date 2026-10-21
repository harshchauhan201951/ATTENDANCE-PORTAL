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
      let directory = Directory.Documents;
      try {
        const permission = await Filesystem.checkPermissions();
        if (permission.publicStorage !== "granted") {
          const requested = await Filesystem.requestPermissions();
          if (requested.publicStorage !== "granted") directory = Directory.Cache;
        }
      } catch {
        // Android 11+ uses scoped storage. If legacy public storage is unavailable,
        // keep the PDF in app cache and still hand it to the system share sheet.
        directory = Directory.Cache;
      }

      const base64 = pdf.output("datauristring").split(",", 2)[1];
      if (!base64) throw new Error("The PDF could not be prepared.");

      let saved;
      try {
        saved = await Filesystem.writeFile({
          path: `RACER Academy/${pdfFilename}`,
          data: base64,
          directory,
          recursive: true,
        });
      } catch (error) {
        if (directory !== Directory.Documents) throw error;
        directory = Directory.Cache;
        saved = await Filesystem.writeFile({
          path: `RACER Academy/${pdfFilename}`,
          data: base64,
          directory,
          recursive: true,
        });
      }

      // The document is already persisted, so dismissing the share sheet won't lose it.
      await Share.share({
        title: pdfFilename,
        text: directory === Directory.Documents
          ? `PDF saved in Documents/RACER Academy: ${pdfFilename}`
          : `Choose an app or Downloads to save this PDF: ${pdfFilename}`,
        files: [saved.uri],
        dialogTitle: "Open or share PDF",
      });
    } catch (error) {
      console.error("Could not save PDF in the RACER Academy app:", error);
      window.alert("PDF tayyar nahi ho payi. Dobara try karein.");
    }
  })();
}
