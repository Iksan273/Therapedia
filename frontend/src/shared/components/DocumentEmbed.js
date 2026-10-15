import React, { useEffect, useState } from "react";
import { ExternalLink, FileText } from "lucide-react";
import { toDocumentEmbedUrl } from "@/domain/assessment";
import { cn } from "@/shared/lib/utils";

// Dokumen Google Docs / Drive yang dibaca langsung di layar (mis. kesepakatan asesmen). Hanya link Google yang bisa
// di-embed (`toDocumentEmbedUrl`); dokumen harus dibagikan "Siapa saja yang memiliki link". Bila iframe tidak bisa
// menampilkan (belum publik / diblokir), tombol "Buka di tab baru" selalu tersedia sebagai cadangan.
export function DocumentEmbed({ url, title = "Dokumen", className, height = "h-[60vh]", testId = "document-embed" }) {
  const embedUrl = toDocumentEmbedUrl(url);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [embedUrl]);

  if (!embedUrl) return null;

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white overflow-hidden", className)} data-testid={testId}>
      <div className="flex items-center justify-between gap-3 px-3 sm:px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <p className="flex items-center gap-2 text-xs font-bold text-slate-800 min-w-0">
          <FileText className="w-4 h-4 text-sky-600 shrink-0" />
          <span className="truncate">{title}</span>
        </p>
        <a
          href={String(url).trim()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 min-h-10 px-2 text-[11px] font-bold text-sky-700 hover:text-sky-900 shrink-0"
          data-testid={`${testId}-open-link`}
        >
          <ExternalLink className="w-3.5 h-3.5" /> Buka di tab baru
        </a>
      </div>
      <div className={cn("relative min-h-[320px] bg-slate-100", height)}>
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
      <p className="px-3 sm:px-4 py-2 text-[11px] text-slate-500 bg-slate-50 border-t border-slate-200">
        Dokumen tidak tampil? Gunakan tombol "Buka di tab baru" di atas.
      </p>
    </div>
  );
}
