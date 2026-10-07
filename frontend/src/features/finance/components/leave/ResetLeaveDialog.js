import React from "react";
import { toast } from "sonner";
import { RotateCcw, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { useLeaveActions } from "@/features/finance/hooks/useLeaveActions";
import { fmtDate } from "@/shared/lib/format";

// Reset tahunan jatah cuti (dipakai di awal tahun): jatah SEMUA client kembali 30 hari; sisa yang tidak diambil di tahun berjalan
// HANGUS dan tidak bisa dikembalikan. Menampilkan pratinjau (jumlah client & hari yang hangus) sebelum konfirmasi.
export function ResetLeaveDialog({ open, onOpenChange }) {
  const { previewAnnualReset, resetAllBalances, lastResetAt, resets } = useLeaveActions();
  if (!open) return null;
  const plan = previewAnnualReset();
  const last = resets[resets.length - 1];

  const handleConfirm = () => {
    const res = resetAllBalances();
    toast.success(`Jatah cuti ${res.clients} client direset ke ${res.quota} hari. ${res.forfeitedDays} hari tersisa hangus.`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-2xl p-6 border-slate-200" data-testid="reset-leave-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-600" /> Reset Cuti Tahunan
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Hanguskan seluruh cuti tersisa dan kembalikan jatah semua client menjadi {plan.quota} hari. Dipakai di awal tahun.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-950 space-y-1" data-testid="reset-leave-summary">
          <p className="flex items-center gap-1.5 font-bold"><AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Yang akan terjadi</p>
          <p>• <strong>{plan.clients}</strong> client direset ke <strong>{plan.quota} hari</strong>.</p>
          <p>• <strong data-testid="reset-forfeited">{plan.forfeitedDays}</strong> hari cuti tersisa dari <strong>{plan.withRemaining}</strong> client akan <strong>hangus</strong>.</p>
          <p>• Pemakaian cuti sebelum hari ini tidak dihitung lagi. Log cuti tetap tersimpan. <strong>Tidak bisa dibatalkan.</strong></p>
        </div>
        {lastResetAt && (
          <p className="text-[11px] text-slate-500" data-testid="reset-leave-last">
            Reset terakhir {fmtDate(lastResetAt)}{last?.by ? ` oleh ${last.by}` : ""} ({last?.clients ?? 0} client, {last?.forfeitedDays ?? 0} hari hangus).
          </p>
        )}

        <DialogFooter className="mt-3 gap-2">
          <Button type="button" variant="outline" className="border-slate-200" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button type="button" className="bg-amber-600 hover:bg-amber-700 text-white font-bold" onClick={handleConfirm} data-testid="reset-leave-confirm">
            Hanguskan & Reset ke {plan.quota} Hari
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
