import React from "react";
import { ClientCombobox } from "@/shared/components/ClientCombobox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Receipt } from "lucide-react";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { fmtCurrency } from "@/shared/lib/format";
import { INVOICE_TYPES } from "@/domain/credit";
import { leaveOptionLabel, linkableLeaves } from "@/domain/leave";
import { fmtDate } from "@/shared/lib/format";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import { Textarea } from "@/shared/ui/textarea";
import { BalanceHint } from "@/features/finance/components/BalanceHint";
import { ReplacementChoice } from "@/features/finance/components/ReplacementChoice";

export function CreateInvoiceDialog({ clients, handleIssueSubmit, issueForm, issueOpen, masterPackages, replacementOptions = [], leaves = [], setIssueForm, setIssueOpen }) {
  const isLeave = issueForm.type === "leave";
  const isAssessment = issueForm.type === "assessment";
  const leaveOptions = linkableLeaves(leaves, issueForm.clientId);
  return (
    <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-sky-600" /> Terbitkan Tagihan Invoice
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pilih client, jenis invoice (Paket Sesi, Assessment, atau Cuti), dan nominal untuk menerbitkan tagihan.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleIssueSubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Pilih Client *</Label>
              <ClientCombobox clients={clients} value={issueForm.clientId} onChange={(val) => setIssueForm({ ...issueForm, clientId: val, replacesInvoiceId: "", leaveId: "" })} placeholder="Cari client..." testId="invoice-client-select" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Jenis Invoice *</Label>
              <Select
                value={issueForm.type || "package"}
                onValueChange={(val) =>
                  setIssueForm({
                    ...issueForm,
                    type: val,
                    leaveId: "",
                    amount: val === "assessment" || val === "leave" ? "" : masterPackages.find((p) => p.id === issueForm.packageId)?.price ?? issueForm.amount,
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
              {isAssessment && (
                <p className="text-[11px] text-slate-500">Invoice assessment yang belum lunas menahan akses ortu ke kuesioner; Finance menandai lunas setelah pembayaran diterima.</p>
              )}
              {isLeave && (
                <p className="text-[11px] text-slate-500">Invoice cuti: nominal diisi Finance, lunas tanpa efek ke kredit atau paket. Boleh disambungkan ke log cuti yang sudah dibuat bila diperlukan.</p>
              )}
            </div>

            {isLeave && (
              <div className="space-y-1" data-testid="invoice-leave-link-section">
                <Label className="text-xs font-bold text-slate-700">Hubungkan dengan log cuti <span className="font-normal text-slate-500">(opsional)</span></Label>
                <Select value={issueForm.leaveId || "none"} onValueChange={(v) => setIssueForm({ ...issueForm, leaveId: v === "none" ? "" : v })} disabled={!issueForm.clientId}>
                  <SelectTrigger className="border-slate-200 bg-slate-50 text-xs font-semibold" data-testid="invoice-leave-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="none">Tidak dihubungkan (tagihan cuti mandiri)</SelectItem>
                    {leaveOptions.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{leaveOptionLabel(l, fmtDate)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {issueForm.clientId && leaveOptions.length === 0 && <p className="text-[11px] text-slate-500" data-testid="invoice-leave-empty">Client ini belum punya log cuti aktif. Invoice tetap bisa diterbitkan tanpa hubungan.</p>}
              </div>
            )}

            {!isAssessment && !isLeave && (
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

            {!isAssessment && !isLeave && (
              <ReplacementChoice options={replacementOptions} value={issueForm.replacesInvoiceId} onChange={(v) => setIssueForm({ ...issueForm, replacesInvoiceId: v })} />
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
            {!isAssessment && !isLeave && <BalanceHint clientId={issueForm.clientId} amount={issueForm.amount} />}

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 space-y-2">
              <div className="flex items-center justify-between gap-3 min-h-10">
                <div>
                  <Label htmlFor="invoice-paid-direct" className="text-xs font-bold text-slate-700 cursor-pointer">Langsung lunas</Label>
                  <p className="text-[11px] text-slate-500">Pembayaran sudah diterima (mis. paket pertama). Invoice langsung lunas{isAssessment || isLeave ? "" : " dan paket aktif"}.</p>
                </div>
                <Switch id="invoice-paid-direct" checked={Boolean(issueForm.paidDirect)} onCheckedChange={(v) => setIssueForm({ ...issueForm, paidDirect: v })} data-testid="invoice-paid-direct-switch" />
              </div>
              {issueForm.paidDirect && (
                <Textarea rows={2} className="border-slate-200 bg-white text-xs" placeholder="Catatan Finance (opsional), mis. dibayar tunai di kasir" value={issueForm.note || ""} onChange={(e) => setIssueForm({ ...issueForm, note: e.target.value })} data-testid="invoice-paid-note" />
              )}
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button type="button" variant="outline" className="border-slate-200" onClick={() => setIssueOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold" data-testid="invoice-submit">
                {issueForm.paidDirect ? "Terbitkan & Tandai Lunas" : "Terbitkan Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
  );
}
