import React from "react";
import { Lock } from "lucide-react";
import { fmtCountdown } from "@/shared/hooks/useCountdown";

// Pemberitahuan lockout login (429): hitung mundur real-time sampai boleh mencoba lagi. Pembaca layar diberi satu pesan
// tetap saat muncul (bukan tiap detik); angka yang berjalan disembunyikan dari pembaca layar.
export function LockoutNotice({ remaining, label = "Terlalu banyak percobaan login.", testId = "login-lockout" }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 animate-in fade-in duration-150" role="status" data-testid={testId}>
      <Lock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" aria-hidden="true" />
      <p>
        <span className="sr-only">{label} Tunggu sebelum mencoba lagi.</span>
        <span aria-hidden="true" className="font-semibold">{label}</span>{" "}
        <span aria-hidden="true">Coba lagi dalam </span>
        <span aria-hidden="true" className="font-mono font-black text-sm tabular-nums" data-testid={`${testId}-timer`}>{fmtCountdown(remaining)}</span>
      </p>
    </div>
  );
}
