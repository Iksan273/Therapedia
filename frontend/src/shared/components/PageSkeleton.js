import React from "react";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";

const Bone = ({ className }) => <Skeleton className={cn("bg-slate-200/70", className)} />;

// Kerangka halaman saat modul lazy dimuat. `variant`:
//  - "dashboard": judul + filter + kartu KPI + dua panel
//  - "table": judul + filter + tabel
//  - "panel": hanya panel konten (untuk tab di dalam halaman)
export function PageSkeleton({ variant = "dashboard", className }) {
  return (
    <div className={cn("space-y-6", className)} role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Memuat halaman…</span>

      {variant !== "panel" && (
        <div className="space-y-2">
          <Bone className="h-5 w-40 rounded-full" />
          <Bone className="h-8 w-72 max-w-full" />
          <Bone className="h-4 w-96 max-w-full" />
        </div>
      )}

      {variant !== "panel" && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 space-y-3">
          <Bone className="h-4 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Bone key={i} className="h-10 rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {variant === "dashboard" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5">
                <Bone className="h-3 w-20" />
                <Bone className="h-7 w-14" />
                <Bone className="h-3 w-28" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                <Bone className="h-4 w-44" />
                <Bone className="h-48 w-full" />
              </div>
            ))}
          </div>
        </>
      )}

      {(variant === "table" || variant === "panel") && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <Bone className="h-4 w-56" />
          </div>
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Bone className="h-9 w-9 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Bone className="h-4 w-1/3" />
                  <Bone className="h-3 w-1/2" />
                </div>
                <Bone className="h-6 w-20 rounded-full hidden sm:block" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
