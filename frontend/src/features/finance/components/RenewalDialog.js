import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { RefreshCw } from "lucide-react";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { fmtCurrency } from "@/shared/lib/format";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";

export function RenewalDialog({ clients, handleRenewSubmit, masterPackages, renewForm, renewOpen, setRenewForm, setRenewOpen }) {
  return (
    <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-sky-600" /> Renewal Paket Kredit Client
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Penambahan sesi baru (Regular Therapist / Senior Therapist) untuk client aktif. Tindakan ini eksklusif bagi Role Finance.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRenewSubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Pilih Client Aktif *</Label>
              <Select value={renewForm.clientId} onValueChange={(val) => setRenewForm({ ...renewForm, clientId: val })}>
                <SelectTrigger className="border-slate-200 bg-slate-50 text-xs font-semibold">
                  <SelectValue placeholder="Pilih client aktif..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 max-h-56">
                  {clients
                    .filter((c) => c.status === "admitted" || c.status === "active")
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.clientName} ({c.clientCode})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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

            <DialogFooter className="mt-4 gap-2">
              <Button type="button" variant="outline" className="border-slate-200" onClick={() => setRenewOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold">
                Aktivasi Renewal Sesi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
  );
}
