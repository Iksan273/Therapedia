import React, { useEffect, useState } from "react";
import { ChevronDown, ExternalLink, FileText } from "lucide-react";
import { isLocalPdfUrl, toDocumentEmbedUrl } from "@/domain/assessment";
import { PdfViewer } from "@/shared/components/PdfViewer";
import { cn } from "@/shared/lib/utils";

// Dokumen PDF lokal (`/documents/*.pdf`) dirender sendiri lewat pdf.js (`PdfViewer`): pas lebar layar dan ikut scroll halaman.
// Dokumen Google Docs / Drive yang dibaca langsung di layar (mis. kesepakatan asesmen). Hanya link Google yang bisa
// di-embed (`toDocumentEmbedUrl`); dokumen harus dibagikan "Siapa saja yang memiliki link". Bila iframe tidak bisa
// menampilkan (belum publik / diblokir), tombol "Buka di tab baru" selalu tersedia sebagai cadangan.
export function DocumentEmbed({ url, title = "Dokumen", className, height = "h-[65dvh] md:h-[70dvh]", testId = "document-embed", collapsible = false }) {
  const isPdf = isLocalPdfUrl(url);
  const embedUrl = isPdf ? String(url).trim() : toDocumentEmbedUrl(url);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(true); // hanya relevan bila `collapsible`

  useEffect(() => {
    setLoaded(false);
  }, [embedUrl]);

  if (!embedUrl) return null;

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white overflow-hidden", className)} data-testid={testId}>
      <div className="flex items-center justify-between gap-3 px-3 sm:px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex items-center gap-2 text-xs font-bold text-slate-800 min-w-0 min-h-10 cursor-pointer text-left"
            data-testid={`${testId}-toggle`}
          >
            <FileText className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="truncate">{title}</span>
            <ChevronDown className={cn("w-4 h-4 text-slate-400 shrink-0 transition-transform", open && "rotate-180")} />
          </button>
        ) : (
          <p className="flex items-center gap-2 text-xs font-bold text-slate-800 min-w-0">
            <FileText className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="truncate">{title}</span>
          </p>
        )}
        <a
          href={String(url).trim()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 min-h-10 px-2 text-[11px] font-bold text-sky-700 hover:text-sky-900 shrink-0"
          data-testid={`${testId}-open-link`}
        >
          <ExternalLink className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Buka di tab baru</span><span className="sm:hidden">Buka</span>
        </a>
      </div>
      {isPdf ? (
        <div className={cn("bg-slate-100 p-2 sm:p-3", collapsible && !open && "hidden")}>
          <PdfViewer url={embedUrl} testId={`${testId}-pdf`} />
        </div>
      ) : (
      <div className={cn("relative min-h-[320px] bg-slate-100", height, collapsible && !open && "hidden")}>
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-500 animate-pulse" data-testid={`${testId}-loading`}>
            Memuat dokumen...
          </div>
        )}
        <iframe
          src={embedUrl}
          title={title}
          className="absolute inset-0 w-full h-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          data-testid={`${testId}-frame`}
        />
      </div>
      )}
      <p className={cn("px-3 sm:px-4 py-2 text-[11px] text-slate-500 bg-slate-50 border-t border-slate-200", collapsible && !open && "hidden")}>
        Dokumen tidak tampil? Gunakan tombol "Buka di tab baru" di atas.
      </p>
    </div>
  );
}
