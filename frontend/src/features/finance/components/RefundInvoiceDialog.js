import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Undo2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { fmtCurrency } from "@/shared/lib/format";
import { useInvoiceRefundActions } from "@/features/finance/hooks/useInvoiceRefundActions";

// Refund sisa kredit invoice paket lunas. Nominal terisi otomatis (sisa kredit × harga per sesi) dan boleh diubah Finance.
// Bagian yang sudah terpakai tetap Verified Revenue; nominal refund tetap di Gross Revenue tetapi keluar dari Verified.
export function RefundInvoiceDialog({ invoice, open, onOpenChange }) {
  const { previewRefund, refundInvoiceAction } = useInvoiceRefundActions();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const plan = invoice ? previewRefund(invoice) : null;

  useEffect(() => {
    if (open && invoice) {
      setAmount(String(previewRefund(invoice).suggestedAmount || ""));
      setReason("");
    }
  }, [open, invoice?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!invoice || !plan) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const res = refundInvoiceAction(invoice, { amount, reason });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      `Refund ${fmtCurrency(Number(amount))} untuk ${invoice.invoiceNumber} dicatat. ${res.credits} sisa kredit dinolkan.${res.relinked ? ` ${res.relinked} jadwal mendatang dipindah ke paket aktif lain.` : ""}${res.frozen ? ` ${res.frozen} jadwal mendatang menjadi Frozen.` : ""}`
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-2xl p-6 border-slate-200" data-testid="refund-invoice-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Undo2 className="w-5 h-5 text-amber-600" /> Refund Invoice {invoice.invoiceNumber}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {invoice.clientName} • nilai invoice {fmtCurrency(invoice.amount)}. Sisa kredit paket dikembalikan sebagai uang dan dinolkan; refund hanya bisa sekali per invoice.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-1" data-testid="refund-summary">
            <p className="font-bold text-slate-900">{plan.packageName || "—"}</p>
            <p>Sisa kredit: <strong>{plan.credits}</strong> • Kredit terpakai: <strong>{plan.summary.usedCredits}</strong> • Sesi mendatang: <strong>{plan.summary.upcomingSessions}</strong></p>
            <p>Usulan otomatis: <strong>{fmtCurrency(plan.suggestedAmount)}</strong> (sisa kredit × harga per sesi)</p>
          </div>

          {!plan.ok && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700" data-testid="refund-blocked">{plan.errors[0]}</p>
          )}

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Nominal refund (Rp) *</Label>
            <Input type="number" min={0} max={plan.maxAmount || undefined} inputMode="numeric" className="border-slate-200 bg-slate-50 text-xs font-bold" value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="refund-amount" />
            <p className="text-[11px] text-slate-500">Otomatis dari sisa kredit; ubah bila ada kebijakan lain (maks {fmtCurrency(plan.maxAmount)}).</p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Alasan refund *</Label>
            <Textarea rows={3} className="border-slate-200 bg-slate-50 text-xs" placeholder="mis. Pindah kota, sisa sesi dikembalikan" value={reason} onChange={(e) => setReason(e.target.value)} data-testid="refund-reason" />
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button type="button" variant="outline" className="border-slate-200" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white font-bold" disabled={!plan.ok} data-testid="refund-submit">
              Catat Refund
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
