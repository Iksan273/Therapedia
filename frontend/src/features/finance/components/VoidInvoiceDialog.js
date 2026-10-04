import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Ban } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { cn } from "@/shared/lib/utils";
import { fmtCurrency } from "@/shared/lib/format";
import { VOID_CREDIT_ACTIONS } from "@/domain/credit";
import { useInvoiceVoidActions } from "@/features/finance/hooks/useInvoiceVoidActions";

// Void invoice lunas: invoice tetap tercatat (status Void, alasan, log) tetapi keluar dari omzet. Bila invoice punya paket,
// Finance WAJIB memilih perlakuan kredit (tanpa nilai default): pertahankan kredit atau cabut sisa kredit.
export function VoidInvoiceDialog({ invoice, open, onOpenChange }) {
  const { previewVoid, voidInvoiceAction } = useInvoiceVoidActions();
  const [reason, setReason] = useState("");
  const [creditAction, setCreditAction] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
      setCreditAction("");
    }
  }, [open, invoice?.id]);

  if (!invoice) return null;
  const summary = previewVoid(invoice);

  const handleSubmit = (e) => {
    e.preventDefault();
    const res = voidInvoiceAction(invoice, { reason, creditAction });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    const extra = res.revoked
      ? ` Sisa ${res.revoked} kredit dicabut.${res.relinked ? ` ${res.relinked} jadwal mendatang dipindah ke paket aktif lain.` : ""}${res.frozen ? ` ${res.frozen} jadwal mendatang menjadi Frozen.` : ""}`
      : "";
    toast.success(`Invoice ${invoice.invoiceNumber} di-void.${extra}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-2xl p-6 border-slate-200" data-testid="void-invoice-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Ban className="w-5 h-5 text-rose-600" /> Void Invoice {invoice.invoiceNumber}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {invoice.clientName} • {fmtCurrency(invoice.amount)}. Invoice tetap tercatat dengan status Void dan keluar dari omzet. Void tidak bisa dibatalkan.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          {summary.hasPackage && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-1" data-testid="void-summary">
              <p className="font-bold text-slate-900">{summary.packageName}</p>
              <p>Sisa kredit: <strong>{summary.remaining}</strong> • Sesi selesai yang sudah memakai paket: <strong>{summary.usedSessions}</strong> • Sesi mendatang: <strong>{summary.upcomingSessions}</strong></p>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Alasan Void *</Label>
            <Textarea rows={3} className="border-slate-200 bg-slate-50 text-xs" placeholder="mis. Nominal invoice salah ketik / pembayaran dibatalkan" value={reason} onChange={(e) => setReason(e.target.value)} data-testid="void-reason" />
          </div>

          {summary.hasPackage && (
            <div className="space-y-1.5" role="radiogroup" aria-label="Perlakuan kredit" data-testid="void-credit-choice">
              <Label className="text-xs font-bold text-slate-700">Perlakuan kredit paket * (wajib dipilih)</Label>
              {Object.entries(VOID_CREDIT_ACTIONS).map(([key, meta]) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={creditAction === key}
                  onClick={() => setCreditAction(key)}
                  data-testid={`void-credit-${key}`}
                  className={cn(
                    "w-full min-h-10 rounded-xl border p-3 text-left text-xs cursor-pointer",
                    creditAction === key ? "border-sky-500 bg-sky-50 text-sky-900" : "border-slate-200 bg-white text-slate-600"
                  )}
                >
                  <span className="block font-bold">{meta.label}</span>
                  <span className="block text-[11px] font-normal">{meta.hint}</span>
                </button>
              ))}
              {creditAction === "revoke" && summary.balanceApplied > 0 && (
                <p className="text-[11px] text-amber-700">Saldo lebihan {fmtCurrency(summary.balanceApplied)} yang dipakai invoice ini dikembalikan ke client.</p>
              )}
            </div>
          )}

          <DialogFooter className="mt-4 gap-2">
            <Button type="button" variant="outline" className="border-slate-200" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white font-bold" data-testid="void-submit">
              Void Invoice
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
