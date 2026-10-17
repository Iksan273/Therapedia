import React from "react";
import { Construction } from "lucide-react";
import { cn } from "@/shared/lib/utils";

// Penanda modul yang BELUM tersambung ke backend (mode API). Dipakai agar QA tidak bingung membedakan modul yang
// belum selesai dari modul yang sudah memakai data server. Daftar modul/tab: shared/lib/devStatus.js.

export const UNDER_DEVELOPMENT_TEXT = "Sedang dalam pengembangan";

// Badge kecil untuk menu / tab
export const DevBadge = ({ className, testId = "dev-badge" }) => (
  <span
    className={cn("ml-auto shrink-0 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold uppercase tracking-wide", className)}
    title="Modul ini belum tersambung ke server"
    data-testid={testId}
  >
    Dev
  </span>
);

// Pengganti isi halaman / tab
export const UnderDevelopment = ({ title, className, testId = "under-development" }) => (
  <div className={cn("flex flex-col items-center justify-center text-center py-16 px-6 rounded-3xl border border-dashed border-amber-300 bg-amber-50/60", className)} data-testid={testId}>
    <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 mb-4">
      <Construction className="w-7 h-7 stroke-[1.75]" />
    </div>
    <p className="text-base sm:text-lg font-bold text-slate-900">{title ? `${title}: ` : ""}{UNDER_DEVELOPMENT_TEXT}</p>
    <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-md leading-relaxed">
      Fitur ini belum tersambung ke server dan dijadwalkan di sprint berikutnya. Tidak ada data yang bisa dinilai di sini; abaikan saat UAT.
    </p>
  </div>
);
