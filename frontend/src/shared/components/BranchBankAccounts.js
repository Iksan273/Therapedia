import React from "react";
import { toast } from "sonner";
import { Copy, Landmark } from "lucide-react";
import { Button } from "@/shared/ui/button";

// Info rekening pembayaran cabang untuk ortu (kuesioner publik & portal ortu). `accounts` = rekening aktif cabang client
// (lihat `activeBankAccounts` di domain/branch.js). Kosong → ajakan menghubungi admin cabang.
export function BranchBankAccounts({ accounts = [], branchName, className = "" }) {
  const copy = async (account) => {
    try {
      await navigator.clipboard.writeText(account.accountNumber.replace(/\D/g, ""));
      toast.success(`Nomor rekening ${account.bankName} disalin.`);
    } catch {
      toast.error("Tidak bisa menyalin otomatis. Salin nomor rekening secara manual.");
    }
  };

  return (
    <div className={`rounded-xl border border-sky-100 bg-sky-50/60 p-3.5 space-y-2.5 ${className}`} data-testid="branch-bank-accounts">
      <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
        <Landmark className="w-3.5 h-3.5 text-sky-600" /> Transfer ke rekening{branchName ? ` Therapedia ${branchName}` : ""}
      </p>
      {accounts.length === 0 ? (
        <p className="text-xs text-slate-500" data-testid="branch-bank-accounts-empty">
          Info rekening belum tersedia. Hubungi admin cabang untuk info rekening pembayaran.
        </p>
      ) : (
        <ul className="space-y-2">
          {accounts.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg bg-white border border-slate-200 p-2.5" data-testid={`branch-bank-account-${a.id}`}>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{a.bankName}</p>
                <p className="font-mono text-sm font-black text-slate-900 break-all">{a.accountNumber}</p>
                <p className="text-[11px] text-slate-500">a.n. {a.accountHolder}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0 min-h-10 md:min-h-0 gap-1.5 text-[11px] font-bold cursor-pointer"
                onClick={() => copy(a)}
                aria-label={`Salin nomor rekening ${a.bankName}`}
                data-testid={`branch-bank-account-copy-${a.id}`}
              >
                <Copy className="w-3 h-3" /> Salin
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
