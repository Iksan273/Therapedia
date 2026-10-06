import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { fmtCurrency } from "@/shared/lib/format";

// Pilih layanan (master paket) yang harganya dipakai invoice assessment otomatis saat kode kuesioner dibuat.
export function AssessmentServiceSelect({ packages, value, onChange, className, testId = "assessment-service-select" }) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className={className || "w-72 text-xs border-slate-200 bg-slate-50 font-semibold"} data-testid={testId}>
        <SelectValue placeholder="Pilih layanan (harga invoice)..." />
      </SelectTrigger>
      <SelectContent className="rounded-xl border-slate-200">
        {packages.map((p) => (
          <SelectItem key={p.id} value={p.id} className="text-xs font-medium">
            {p.name} ({p.credits}x) — {fmtCurrency(p.price)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
