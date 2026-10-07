import React from "react";
import { ClientCombobox } from "@/shared/components/ClientCombobox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { RefreshCw } from "lucide-react";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { fmtCurrency } from "@/shared/lib/format";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Switch } from "@/shared/ui/switch";
import { cn } from "@/shared/lib/utils";
import { RENEWAL_MODES } from "@/domain/credit";
import { BalanceHint } from "@/features/finance/components/BalanceHint";
import { ReplacementChoice } from "@/features/finance/components/ReplacementChoice";

export function RenewalDialog({ clients, handleRenewSubmit, masterPackages, renewForm, renewOpen, replacementOptions = [], setRenewForm, setRenewOpen }) {
  const isDirect = renewForm.mode === "direct";
  const selectedMaster = masterPackages.find((p) => p.id === renewForm.packageId);
  const isSatuanPackage = Boolean(selectedMaster?.isSatuan);
  return (
    <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent className="max-w-md max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-2xl p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-sky-600" /> Renewal Paket Kredit Client
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Penambahan sesi baru (Regular Therapist / Senior Therapist) untuk client aktif: terbitkan invoice baru, atau langsung lunas bila pembayaran sudah diterima.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRenewSubmit} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Jalur renewal" data-testid="renewal-mode">
              {Object.entries(RENEWAL_MODES).map(([mode, meta]) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={renewForm.mode === mode}
                  onClick={() => setRenewForm({ ...renewForm, mode })}
                  data-testid={`renewal-mode-${mode}`}
                  className={cn(
                    "min-h-10 rounded-xl border p-2.5 text-left text-xs cursor-pointer",
                    renewForm.mode === mode ? "border-sky-500 bg-sky-50 text-sky-900" : "border-slate-200 bg-white text-slate-600"
                  )}
                >
                  <span className="block font-bold">{meta.label}</span>
                  <span className="block text-[11px] font-normal">{meta.hint}</span>
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Pilih Client Aktif *</Label>
              <ClientCombobox
                clients={clients.filter((c) => c.status === "admitted" || c.status === "active")}
                value={renewForm.clientId}
                onChange={(val) => setRenewForm({ ...renewForm, clientId: val, replacesInvoiceId: "" })}
                placeholder="Cari client aktif..."
                testId="renewal-client-select"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Pilihan Paket Renewal *</Label>
              <Select
                value={renewForm.packageId}
                onValueChange={(val) => {
                  const pkg = masterPackages.find((p) => p.id === val);
                  setRenewForm({
                    ...renewForm,
                    packageId: val,
                    credits: pkg ? pkg.credits : 10,
                    amount: pkg ? pkg.price : 2500000,
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Jumlah Sesi</Label>
                <Input
                  type="number"
                  className="border-slate-200 bg-slate-50 text-xs font-bold"
                  value={renewForm.credits}
                  onChange={(e) => setRenewForm({ ...renewForm, credits: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Nominal Bayar (IDR)</Label>
                <Input
                  type="number"
                  className="border-slate-200 bg-slate-50 text-xs font-bold"
                  value={renewForm.amount}
                  onChange={(e) => setRenewForm({ ...renewForm, amount: e.target.value })}
                />
              </div>
            </div>
            <BalanceHint clientId={renewForm.clientId} amount={renewForm.amount} />
            <ReplacementChoice options={replacementOptions} value={renewForm.replacesInvoiceId} onChange={(v) => setRenewForm({ ...renewForm, replacesInvoiceId: v })} />

            {isSatuanPackage ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50/50 p-3" data-testid="renewal-reset-leave-section">
                <div>
                  <Label className="text-xs font-bold text-slate-800">Reset credit leave</Label>
                  <p className="text-[11px] text-slate-500">Paket satuan: credit leave tidak reset otomatis tiap renewal (sisa dilanjutkan, bisa jadi 0). Aktifkan untuk mengisi ulang ke jumlah di master ({selectedMaster?.leaveQuota ?? 0}); sisa lama hangus. Biasanya sekali sebulan.</p>
                </div>
                <Switch checked={Boolean(renewForm.resetLeave)} onCheckedChange={(v) => setRenewForm({ ...renewForm, resetLeave: v })} data-testid="renewal-reset-leave" />
              </div>
            ) : (
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-600" data-testid="renewal-leave-auto-note">
                Paket reguler: credit leave otomatis baru ({selectedMaster?.leaveQuota ?? 0} sesi) di setiap paket, tidak perlu reset.
              </p>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Catatan Finance <span className="font-normal text-slate-500">(opsional)</span></Label>
              <Textarea
                rows={2}
                className="border-slate-200 bg-slate-50 text-xs"
                placeholder={isDirect ? "Mis. dibayar tunai di kasir, struk no. ..." : "Catatan untuk invoice ini"}
                value={renewForm.reason || ""}
                onChange={(e) => setRenewForm({ ...renewForm, reason: e.target.value })}
                data-testid="renewal-reason"
              />
              <p className="text-[11px] text-slate-500">Catatan tampil di log invoice.</p>
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button type="button" variant="outline" className="border-slate-200" onClick={() => setRenewOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold" data-testid="renewal-submit">
                {isDirect ? "Aktivasi Renewal (Langsung Lunas)" : "Terbitkan Invoice Renewal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
  );
}
