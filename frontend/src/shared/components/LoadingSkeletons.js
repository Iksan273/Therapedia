import React from "react";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";

// Kerangka loading (shimmer) untuk data yang masih diambil dari server. Pakai saat `isLoading` (muat pertama kali, belum ada
// data), bukan saat muat ulang di latar. Semua berperan `status` + `aria-busy` agar terbaca pembaca layar.
// Bentuknya mengikuti tampilan akhir (tabel, kartu, daftar, detail) supaya halaman tidak "melompat" saat data tiba.

const Frame = ({ children, label, className, testId }) => (
  <div role="status" aria-busy="true" aria-live="polite" className={className} data-testid={testId}>
    <span className="sr-only">{label}</span>
    {children}
  </div>
);

// Baris tabel: `columns` sel dengan lebar bervariasi agar terlihat natural
export function TableSkeleton({ rows = 6, columns = 4, label = "Memuat data…", className, testId = "table-skeleton" }) {
  const widths = ["w-3/4", "w-1/2", "w-2/3", "w-1/3", "w-5/6"];
  return (
    <Frame label={label} className={cn("divide-y divide-slate-100", className)} testId={testId}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
          <div className="flex-1 grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: columns }).map((__, c) => (
              <Skeleton key={c} className={cn("h-4", widths[(r + c) % widths.length])} />
            ))}
          </div>
        </div>
      ))}
    </Frame>
  );
}

// Kartu dalam grid (paket, kuadran, ...)
export function CardGridSkeleton({ count = 6, columns = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3", label = "Memuat data…", className, testId = "card-grid-skeleton" }) {
  return (
    <Frame label={label} className={cn("grid gap-4", columns, className)} testId={testId}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      ))}
    </Frame>
  );
}

// Daftar vertikal sederhana (alasan, hari libur, ...)
export function ListSkeleton({ rows = 5, label = "Memuat data…", className, testId = "list-skeleton" }) {
  return (
    <Frame label={label} className={cn("space-y-2.5", className)} testId={testId}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-7 w-16 rounded-lg" />
        </div>
      ))}
    </Frame>
  );
}

// Halaman detail: header + beberapa kartu bagian
export function DetailSkeleton({ sections = 4, label = "Memuat data…", className, testId = "detail-skeleton" }) {
  return (
    <Frame label={label} className={cn("space-y-4 max-w-5xl mx-auto", className)} testId={testId}>
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg hidden sm:block" />
      </div>
      {Array.from({ length: sections }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-xl" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-10 rounded-xl sm:col-span-2" />
          </div>
        </div>
      ))}
    </Frame>
  );
}
