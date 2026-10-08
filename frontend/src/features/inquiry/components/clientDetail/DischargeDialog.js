import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { LogOut } from "lucide-react";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { Button } from "@/shared/ui/button";
import { ReasonPicker } from "@/shared/components/ReasonPicker";

export function DischargeDialog({ open, onOpenChange, reasons, reason, setReason, note, setNote, onConfirm }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-2xl p-6 border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <LogOut className="w-4 h-4 text-slate-600" /> Konfirmasi Discharge Client
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Client keluar dari terapi aktif. Bisa diaktifkan kembali kapan saja dari Active Clients Roster.
          </DialogDescription>
          <p className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-2 mt-2">
            Semua jadwal aktif (termasuk recurring) akan dihapus dan sisa sesi hangus. Tercatat di Log Kredit & Saldo sebagai Discharge.
          </p>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Alasan Discharge *</Label>
            <ReasonPicker options={reasons} value={reason} onChange={setReason} testId="outcome-discharge-reason" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Catatan Klinis Discharge</Label>
            <Textarea
              className="rounded-xl border-slate-200 bg-slate-50 text-xs min-h-[80px]"
              placeholder="Opsional: rangkuman progres atau rekomendasi lanjutan..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button className="bg-slate-800 hover:bg-slate-900 text-white font-bold" onClick={onConfirm} data-testid="outcome-discharge-confirm">
            Simpan Discharge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
