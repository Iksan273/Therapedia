import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Receipt } from "lucide-react";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { fmtCurrency } from "@/shared/lib/format";
import { INVOICE_TYPES } from "@/domain/credit";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";

export function CreateInvoiceDialog({ clients, handleIssueSubmit, issueForm, issueOpen, masterPackages, setIssueForm, setIssueOpen }) {
  return (
    <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-sky-600" /> Terbitkan Tagihan Invoice
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pilih client, jenis invoice (Paket Sesi atau Assessment), dan nominal untuk menerbitkan tagihan.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleIssueSubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Pilih Client *</Label>
              <Select value={issueForm.clientId} onValueChange={(val) => setIssueForm({ ...issueForm, clientId: val })}>
                <SelectTrigger className="border-slate-200 bg-slate-50 text-xs font-semibold">
                  <SelectValue placeholder="Pilih client..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 max-h-56">
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.clientName} ({c.parentName}) — {c.clientCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Jenis Invoice *</Label>
              <Select
                value={issueForm.type || "package"}
                onValueChange={(val) =>
                  setIssueForm({
                    ...issueForm,
                    type: val,
                    amount: val === "assessment" ? "" : masterPackages.find((p) => p.id === issueForm.packageId)?.price ?? issueForm.amount,
                  })
                }
              >
                <SelectTrigger className="border-slate-200 bg-slate-50 text-xs font-semibold" data-testid="invoice-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  {INVOICE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {issueForm.type === "assessment" && (
                <p className="text-[11px] text-slate-500">Invoice assessment yang belum dibayar menahan akses ortu ke kuesioner.</p>
              )}
            </div>

            {issueForm.type !== "assessment" && (
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Pilih Paket Layanan *</Label>
              <Select
                value={issueForm.packageId}
                onValueChange={(val) => {
                  const pkg = masterPackages.find((p) => p.id === val);
                  setIssueForm({
                    ...issueForm,
                    packageId: val,
                    amount: pkg ? pkg.price : issueForm.amount,
                  });
                }}
              >
                <SelectTrigger className="border-slate-200 bg-slate-50 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  {masterPackages.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.credits} sesi) — {fmtCurrency(p.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Nominal Tagihan (IDR) *</Label>
              <Input
                type="number"
                className="border-slate-200 bg-slate-50 text-xs font-bold"
                value={issueForm.amount}
                onChange={(e) => setIssueForm({ ...issueForm, amount: e.target.value })}
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button type="button" variant="outline" className="border-slate-200" onClick={() => setIssueOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold">
                Terbitkan Invoice
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
  );
}
