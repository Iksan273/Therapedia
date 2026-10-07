import React from "react";
import { cn } from "@/shared/lib/utils";
import { leaveRemainingOf, leaveTotalOf } from "@/domain/credit";

// Pilihan WAJIB saat membatalkan sesi (Cancel / Off): potong atau tidak (keputusan admin). Tanpa nilai awal.
// "Potong" memakai CREDIT LEAVE paket target lebih dulu (kredit sesi utuh); bila credit leave habis, 1 kredit sesi yang dipotong.
// "Jangan potong" tidak memakai apa pun. `pkg` = paket target sesi.
export function DeductCreditChoice({ value, onChange, pkg, count = 1, bulk = false, kind = "cancel", testId = "deduct-credit" }) {
  const isOff = kind === "off";
  const leaveLeft = pkg ? leaveRemainingOf(pkg) : 0;
  const leaveTotal = pkg ? leaveTotalOf(pkg) : 0;
  const canDeduct = bulk || (Boolean(pkg) && (leaveLeft > 0 || pkg.remainingCredit > 0));
  const deductHint = bulk
    ? "Per sesi: credit leave paket dipakai dulu (kredit sesi utuh); bila habis, 1 kredit sesi dipotong."
    : pkg && leaveLeft > 0
    ? `Memakai 1 credit leave paket (sisa ${leaveLeft} → ${Math.max(0, leaveLeft - count)}); kredit sesi tetap utuh.`
    : "Credit leave paket habis: memotong 1 kredit sesi paket.";
  const options = [
    { value: "deduct", title: pkg && leaveLeft > 0 ? "Potong (pakai credit leave)" : "Potong kredit", hint: deductHint },
    { value: "keep", title: "Jangan potong", hint: "Tidak ada yang berkurang; pembatalan tetap tercatat di riwayat kredit." },
  ];
  return (
    <div className="space-y-2" data-testid={testId}>
      <p className="font-bold text-slate-700 text-xs">Kredit sesi *</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Potong kredit atau tidak">
        {options.map((o) => {
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
      {isOff ? (
        <p className="text-[11px] text-slate-600 leading-relaxed" data-testid={`${testId}-quota`}>
          Pembatalan karena cuti (Finance) memotong jatah cuti, bukan credit leave paket maupun kredit sesi.
        </p>
      ) : bulk ? (
        <p className="text-[11px] text-slate-600 leading-relaxed" data-testid={`${testId}-quota`}>
          Berlaku untuk semua sesi terpilih. Sesi yang client-nya tanpa paket aktif atau tanpa sisa apa pun tidak dipotong.
        </p>
      ) : pkg ? (
        <p className="text-[11px] leading-relaxed text-slate-600" data-testid={`${testId}-quota`}>
          Credit leave paket {pkg.packageName}: sisa {leaveLeft} dari {leaveTotal}. Sisa kredit sesi: {pkg.remainingCredit}.
          {!canDeduct && " Credit leave dan kredit sesi habis, tidak ada yang bisa dipotong."}
        </p>
      ) : (
        <p className="text-[11px] text-slate-600" data-testid={`${testId}-quota`}>Client belum punya paket kredit aktif, kredit tidak dapat dipotong.</p>
      )}
    </div>
  );
}
