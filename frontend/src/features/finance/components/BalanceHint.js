import React from "react";
import { applyBalanceToAmount } from "@/domain/credit";
import { fmtCurrency } from "@/shared/lib/format";
import { useCredits } from "@/stores/creditsStore";

// Info saldo lebihan konversi client: otomatis memotong invoice paket yang diterbitkan/di-renew berikutnya.
export function BalanceHint({ clientId, amount }) {
  const { getCreditBalance } = useCredits();
  const balance = clientId ? getCreditBalance(clientId) : 0;
  if (balance <= 0) return null;
  const { applied, net } = applyBalanceToAmount(balance, amount);
  return (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900" data-testid="balance-hint">
      Saldo lebihan konversi client {fmtCurrency(balance)} otomatis mengurangi tagihan: −{fmtCurrency(applied)} → bayar <b>{fmtCurrency(net)}</b>.
    </p>
  );
}
