import React from "react";
import { cn } from "@/shared/lib/utils";
import { CANCEL_QUOTA } from "@/domain/credit";

const OPTIONS = [
  { value: "deduct", title: "Potong 1 kredit", hint: "Kredit paket berkurang 1 (ledger cancel_penalty)." },
  { value: "keep", title: "Jangan potong kredit", hint: "Kredit tetap utuh (ledger cancel_excused)." },
];

// Pilihan WAJIB saat membatalkan sesi: potong kredit atau tidak (keputusan admin). Tanpa nilai awal.
// `pkg` = paket target sesi; kuota cancel 3 per paket hanya penghitung (tidak otomatis memotong).
export function DeductCreditChoice({ value, onChange, pkg, count = 1, bulk = false, testId = "deduct-credit" }) {
  const canDeduct = bulk || (Boolean(pkg) && pkg.remainingCredit > 0);
  const used = pkg?.cancelCount || 0;
  const after = used + count;
  return (
    <div className="space-y-2" data-testid={testId}>
      <p className="font-bold text-slate-700 text-xs">Kredit sesi *</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Potong kredit atau tidak">
        {OPTIONS.map((o) => {
          const disabled = o.value === "deduct" && !canDeduct;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={value === o.value}
              disabled={disabled}
              onClick={() => onChange(o.value)}
              className={cn(
                "text-left p-3 rounded-xl border-2 transition-colors",
                disabled ? "opacity-50 cursor-not-allowed bg-slate-50 border-slate-200" : "cursor-pointer",
                value === o.value ? "bg-white border-rose-500 ring-2 ring-rose-200" : !disabled && "bg-white/60 border-slate-200 hover:border-rose-300"
              )}
              data-testid={`${testId}-${o.value}`}
            >
              <span className="block font-extrabold text-xs text-slate-900">{o.title}</span>
              <span className="block text-[11px] text-slate-500 mt-0.5">{o.hint}</span>
            </button>
          );
        })}
      </div>
      {bulk ? (
        <p className="text-[11px] text-slate-600 leading-relaxed" data-testid={`${testId}-quota`}>
          Berlaku untuk semua sesi terpilih. Sesi yang client-nya tanpa paket aktif atau saldo 0 tidak dipotong. Kuota cancel 3x per paket hanya penghitung.
        </p>
      ) : pkg ? (
        <p className={cn("text-[11px] leading-relaxed", after > CANCEL_QUOTA ? "text-rose-700 font-semibold" : "text-slate-600")} data-testid={`${testId}-quota`}>
          Kuota cancel paket {pkg.packageName}: {used}/{CANCEL_QUOTA} terpakai (setelah ini {after}/{CANCEL_QUOTA}
          {after > CANCEL_QUOTA ? ", melewati kuota" : ""}). Kuota hanya penghitung; keputusan potong kredit ada pada admin.
          {!canDeduct && " Saldo paket 0, kredit tidak bisa dipotong."}
        </p>
      ) : (
        <p className="text-[11px] text-slate-600" data-testid={`${testId}-quota`}>Client belum punya paket kredit aktif, kredit tidak dapat dipotong.</p>
      )}
    </div>
  );
}
