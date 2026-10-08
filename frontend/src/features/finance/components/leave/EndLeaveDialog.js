import React, { useEffect, useState } from "react";
import DateFilterPicker from "@/shared/components/DateFilterPicker";
import { toast } from "sonner";
import { Ban, CalendarCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { useLeaveActions } from "@/features/finance/hooks/useLeaveActions";
import { leaveEffectiveEnd } from "@/domain/leave";
import { fmtDate } from "@/shared/lib/format";

// Akhiri cuti lebih awal (anak masuk sebelum perkiraan) atau void penuh. Hari yang tidak terpakai kembali ke jatah 30 hari
// dan sesi cuti pada/sesudah tanggal masuk kembali kembali `scheduled`. mode: "early" | "void". Invoice cuti yang sudah
// tersambung TIDAK ikut berubah (ditangani Finance terpisah, mis. void/refund).
export function EndLeaveDialog({ leave, mode, open, onOpenChange }) {
  const { previewEarlyReturn, endLeaveEarly, voidLeave } = useLeaveActions();
  const [returnDate, setReturnDate] = useState("");
  const [reason, setReason] = useState("");
  const isVoid = mode === "void";

  useEffect(() => {
    if (open) {
      setReturnDate("");
      setReason("");
    }
  }, [open, leave?.id, mode]);

  if (!leave) return null;
  const lastDay = leaveEffectiveEnd(leave);
  const plan = isVoid ? previewEarlyReturn(leave, leave.startDate) : returnDate ? previewEarlyReturn(leave, returnDate) : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const res = isVoid ? voidLeave(leave, { reason }) : endLeaveEarly(leave, { returnDate, reason });
    if (!res.ok) {
      toast.error(res.errors[0]);
      return;
    }
    toast.success(
      `${res.isVoid ? "Cuti di-void" : "Cuti diakhiri lebih awal"}: ${res.daysReturned} hari kembali ke jatah, ${res.released} sesi kembali Scheduled${res.creditChange ? `, ${res.creditChange} kredit dikembalikan` : ""}.${res.conflicted ? ` ${res.conflicted} sesi dilewati karena slot sudah terisi (tetap Off, revert manual dari kalender).` : ""}`
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-2xl p-6 border-slate-200" data-testid="end-leave-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            {isVoid ? <Ban className="w-5 h-5 text-rose-600" /> : <CalendarCheck className="w-5 h-5 text-emerald-600" />}
            {isVoid ? "Void Cuti" : "Akhiri Cuti Lebih Awal"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {leave.clientName || ""} • {fmtDate(leave.startDate)} – {fmtDate(lastDay || leave.endDate)}.{" "}
            {isVoid ? "Seluruh hari cuti kembali ke jatah dan semua sesi Off cuti kembali Scheduled." : "Hari sejak tanggal masuk kembali dikembalikan ke jatah; sesi Off sesudahnya kembali Scheduled."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          {!isVoid && (
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Tanggal anak masuk kembali *</Label>
              <DateFilterPicker allowClear={false} minDate={leave.startDate} maxDate={lastDay || leave.endDate} className="w-full" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} data-testid="leave-return-date" />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">{isVoid ? "Alasan void *" : "Keterangan"}</Label>
            <Textarea rows={2} className="border-slate-200 bg-slate-50 text-xs" placeholder={isVoid ? "mis. Rencana cuti dibatalkan ortu" : "mis. Anak sudah pulang lebih cepat"} value={reason} onChange={(e) => setReason(e.target.value)} data-testid="leave-end-reason" />
          </div>

          {plan && !plan.ok && (
            <ul className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700" data-testid="leave-end-errors">
              {plan.errors.map((er) => (
                <li key={er}>{er}</li>
              ))}
            </ul>
          )}

          {plan?.ok && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-slate-700 space-y-1" data-testid="leave-end-preview">
              <p>
                <strong>{plan.daysReturned}</strong> hari kembali ke jatah • <strong>{plan.restorable.length}</strong> sesi kembali Scheduled
              </p>
              {plan.restorable.length > 0 && (
                <ul className="max-h-24 overflow-y-auto text-[11px] text-slate-600 space-y-0.5">
                  {plan.restorable.map((s) => (
                    <li key={s.id}>{fmtDate(s.date)} • {s.startTime}–{s.endTime}</li>
                  ))}
                </ul>
              )}
              {plan.conflicted.length > 0 && (
                <p className="text-[11px] font-semibold text-amber-700" data-testid="leave-end-conflicts">
                  {plan.conflicted.length} sesi tidak bisa dikembalikan karena slot terapis sudah terisi: tetap Off, revert manual dari kalender.
                </p>
              )}
            </div>
          )}

          <DialogFooter className="mt-4 gap-2">
            <Button type="button" variant="outline" className="border-slate-200" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              className={isVoid ? "bg-rose-600 hover:bg-rose-700 text-white font-bold" : "bg-emerald-600 hover:bg-emerald-700 text-white font-bold"}
              disabled={!plan?.ok || (isVoid && !reason.trim())}
              data-testid="leave-end-submit"
            >
              {isVoid ? "Void Cuti" : "Akhiri Cuti"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
