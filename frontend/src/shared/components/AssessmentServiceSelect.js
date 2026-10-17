import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { fmtCurrency } from "@/shared/lib/format";

// Pilih layanan (master paket) yang harganya dipakai invoice assessment otomatis saat kode kuesioner dibuat.
// Hanya master paket berflag `isAssessment` (Finance → Master Paket → "Assessment"). Belum ada → pesan, bukan semua paket.
export function AssessmentServiceSelect({ packages, value, onChange, className, testId = "assessment-service-select" }) {
  const options = packages.filter((p) => p.isAssessment);
  if (options.length === 0) {
    return (
      <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 max-w-72" data-testid={`${testId}-empty`}>
        Belum ada paket asesmen. Buat di Finance → Master Paket dan aktifkan "Assessment", atau matikan "Masuk invoice".
      </p>
    );
  }
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className={className || "w-72 text-xs border-slate-200 bg-slate-50 font-semibold"} data-testid={testId}>
        <SelectValue placeholder="Pilih layanan (harga invoice)..." />
      </SelectTrigger>
      <SelectContent className="rounded-xl border-slate-200">
        {options.map((p) => (
          <SelectItem key={p.id} value={p.id} className="text-xs font-medium">
            {p.name} ({p.credits}x) — {fmtCurrency(p.price)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
