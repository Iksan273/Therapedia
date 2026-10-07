import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Ban } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { fmtCurrency } from "@/shared/lib/format";
import { useInvoiceVoidActions } from "@/features/finance/hooks/useInvoiceVoidActions";

// Void invoice lunas yang kreditnya BELUM dipakai: invoice tetap tercatat (status Void, alasan, log) tetapi keluar dari
// omzet; kredit/paket dipertahankan (tidak ada pencabutan sisa kredit). Bila kredit sudah terpakai, void ditolak dan
// Finance diarahkan ke Refund.
export function VoidInvoiceDialog({ invoice, open, onOpenChange }) {
  const { previewVoid, voidInvoiceAction } = useInvoiceVoidActions();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open, invoice?.id]);

  if (!invoice) return null;
  const summary = previewVoid(invoice);

  const handleSubmit = (e) => {
    e.preventDefault();
    const res = voidInvoiceAction(invoice, { reason });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Invoice ${invoice.invoiceNumber} di-void.${summary.hasPackage ? " Kredit paket dipertahankan." : ""}`);
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
            {invoice.clientName} • {fmtCurrency(invoice.amount)}. Invoice tetap tercatat dengan status Void dan keluar dari omzet; kredit/paket client dipertahankan. Void tidak bisa dibatalkan.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          {summary.hasPackage && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-1" data-testid="void-summary">
              <p className="font-bold text-slate-900">{summary.packageName}</p>
              <p>Sisa kredit: <strong>{summary.remaining}</strong> • Kredit terpakai: <strong>{summary.usedCredits}</strong> • Sesi mendatang: <strong>{summary.upcomingSessions}</strong></p>
            </div>
          )}

          {summary.voidBlocked && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700" data-testid="void-blocked">{summary.voidBlocked}</p>
          )}

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Alasan Void *</Label>
            <Textarea rows={3} className="border-slate-200 bg-slate-50 text-xs" placeholder="mis. Nominal invoice salah ketik / invoice dobel" value={reason} onChange={(e) => setReason(e.target.value)} data-testid="void-reason" />
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button type="button" variant="outline" className="border-slate-200" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white font-bold" disabled={Boolean(summary.voidBlocked)} data-testid="void-submit">
              Void Invoice
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
