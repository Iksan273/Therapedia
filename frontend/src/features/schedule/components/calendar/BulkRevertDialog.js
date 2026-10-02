import { useState } from "react";
import { Undo2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { canRevertSession } from "@/domain/schedule";

// Revert massal: completed / cancelled / rescheduled. Sesi lain dilewati. Alasan wajib (satu alasan untuk semua sesi).
// `previewRevert` dari useSessionActions menghitung efek kredit & kuota per sesi sebelum konfirmasi.
export function BulkRevertDialog({ open, onOpenChange, sessions, previewRevert, onConfirm }) {
  const [reason, setReason] = useState("");
  const eligible = sessions.filter(canRevertSession);
  const skippedCount = sessions.length - eligible.length;
  const previews = eligible.map((s) => previewRevert(s));
  const count = (kind) => previews.filter((p) => p.kind === kind).length;
  const credit = previews.reduce((sum, p) => sum + p.creditChange, 0);
  const quota = previews.reduce((sum, p) => sum + p.quotaChange, 0);

  const close = (next) => {
    onOpenChange(next);
    if (!next) setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200 max-h-[calc(100dvh-2.5rem)] overflow-y-auto" data-testid="bulk-revert-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Undo2 className="w-5 h-5 text-violet-600" /> Bulk Revert ({sessions.length} Sessions)
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Batalkan status Completed, Cancel, atau pemindahan Reschedule pada semua sesi terpilih. Tercatat di audit log.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 pt-2">
          <div className="p-3.5 rounded-xl bg-violet-50/70 border border-violet-200 text-xs text-slate-800 space-y-1 leading-relaxed" data-testid="bulk-revert-summary">
            <p className="font-bold text-slate-900">{eligible.length} sesi akan di-revert:</p>
            <p>• Completed: {count("completion")} • Cancel: {count("cancellation")} • Reschedule: {count("reschedule")}</p>
            <p>• Kredit dikembalikan: <strong>+{credit}</strong>{quota < 0 ? <> • Kuota cancel: <strong>{quota}</strong></> : null}</p>
            {skippedCount > 0 && <p className="text-amber-800">• {skippedCount} sesi dilewati (status tidak bisa di-revert).</p>}
            <p className="text-slate-600">Sesi yang slot-nya sudah terisi akan dilewati dan dilaporkan setelah proses.</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Alasan *</Label>
            <Textarea
              className="border-slate-200 bg-slate-50 text-xs min-h-[70px]"
              placeholder="e.g. Salah pilih sesi saat bulk complete..."
              value={reason}
              maxLength={300}
              onChange={(e) => setReason(e.target.value)}
              data-testid="bulk-revert-reason"
            />
          </div>
        </div>

        <DialogFooter className="mt-5 gap-2">
          <Button variant="outline" className="border-slate-200" onClick={() => close(false)}>
            Batal
          </Button>
          <Button
            className="bg-violet-600 hover:bg-violet-700 text-white font-bold"
            disabled={!reason.trim() || eligible.length === 0}
            onClick={() => {
              onConfirm(reason.trim());
              close(false);
            }}
            data-testid="bulk-revert-confirm-button"
          >
            Konfirmasi Revert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
