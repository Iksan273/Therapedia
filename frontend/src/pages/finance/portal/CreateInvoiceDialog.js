import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Receipt } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtCurrency } from "@/lib/appUtils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function CreateInvoiceDialog({ clients, handleIssueSubmit, issueForm, issueOpen, masterPackages, setIssueForm, setIssueOpen }) {
  return (
    <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-sky-600" /> Terbitkan Tagihan Invoice
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pilih client dan paket yang disepakati melalui WhatsApp untuk menerbitkan tagihan.
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
                      {c.clientName} ({c.parentName}) — {c.clientAccessCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
