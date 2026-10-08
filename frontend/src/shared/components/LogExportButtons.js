import React from "react";
import { toast } from "sonner";
import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { buildLogDocumentHtml, downloadFile, safeFilename } from "@/shared/lib/logExport";
import { buildXlsx } from "@/shared/lib/xlsxWriter";
import { printHtmlDocument } from "@/shared/lib/reportExport";
import { fmtDate } from "@/shared/lib/format";
import { todayStr } from "@/shared/lib/id";

// Tombol unduh log (PDF lewat dialog cetak + Excel). `spec` = { title, meta, columns, rows } (lihat shared/lib/logExport.js);
// `filename` = awalan nama file. Dipakai riwayat sesi Detail Client dan Log Kredit & Saldo Finance.
export function LogExportButtons({ spec, filename, disabled = false, testIdPrefix = "log-export", className = "" }) {
  const empty = disabled || !spec?.rows?.length;
  const full = () => ({ ...spec, generatedLabel: fmtDate(todayStr()), logoUrl: `${window.location.origin}/images/therapedia_logo.png`, subtitle: "Log" });

  const handlePdf = () => {
    if (!printHtmlDocument(buildLogDocumentHtml(full()))) toast.error("Pop-up diblokir browser. Izinkan pop-up untuk mengunduh PDF.");
  };
  const handleExcel = () => {
    const name = `${safeFilename(filename, todayStr())}.xlsx`;
    if (downloadFile(name, buildXlsx(full()))) toast.success(`File ${name} diunduh.`);
    else toast.error("Unduhan tidak didukung di perangkat ini.");
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Button type="button" size="sm" variant="outline" disabled={empty} onClick={handlePdf} className="font-bold text-sky-700 border-sky-200 hover:bg-sky-50 min-h-10 cursor-pointer" data-testid={`${testIdPrefix}-pdf`}>
        <FileText className="w-4 h-4 mr-1.5" /> Unduh PDF
      </Button>
      <Button type="button" size="sm" variant="outline" disabled={empty} onClick={handleExcel} className="font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50 min-h-10 cursor-pointer" data-testid={`${testIdPrefix}-excel`}>
        <FileSpreadsheet className="w-4 h-4 mr-1.5" /> Unduh Excel
      </Button>
    </div>
  );
}
