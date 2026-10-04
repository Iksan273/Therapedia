import React from "react";
import { cn } from "@/shared/lib/utils";
import { cancelQuotaByPackage } from "@/domain/credit";

// Kuota cancel dirinci PER PAKET (tiap paket punya penghitung sendiri, kuota 3x per paket). Satu baris per paket.
export function CancelQuotaList({ record, className, compact = false }) {
  const { rows } = cancelQuotaByPackage(record);
  if (rows.length === 0) {
    return <span className={cn("text-xs text-slate-400", className)} data-testid="cancel-quota-empty">Belum ada paket</span>;
  }
  return (
    <ul className={cn("space-y-1", className)} data-testid="cancel-quota-list">
      {rows.map((r) => (
        <li
          key={r.id}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-2 py-1 text-xs whitespace-nowrap",
            r.over ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-slate-50 border-slate-200 text-slate-700"
          )}
          data-testid={`cancel-quota-${r.id}`}
        >
          <span className="font-bold">{r.label}</span>
          {!compact && <span className="text-slate-500">sisa {r.remainingCredit}</span>}
          <span className="ml-auto font-mono font-bold tabular-nums">
            {r.cancelCount}/{r.quota} cancel{r.over ? " (lewat kuota)" : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
