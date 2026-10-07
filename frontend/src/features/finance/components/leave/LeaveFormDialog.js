import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarOff } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { ClientCombobox } from "@/shared/components/ClientCombobox";
import { useLeaveActions } from "@/features/finance/hooks/useLeaveActions";
import { fmtDate } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

const EMPTY = { clientId: "", startDate: "", endDate: "", reason: "", note: "" };

// Catat cuti client (rentang tanggal dari ortu). Hanya bisa bila client punya sesi terapi di rentang itu. Pratinjau: hari cuti
// (sesi pertama s.d. terakhir), saldo jatah cuti client, dan sesi terapi yang akan jadi Off. Jatah terlewati hanya peringatan;
// cuti memotong saldo jatah cuti (30 hari/tahun), bukan kredit sesi.
export function LeaveFormDialog({ open, onOpenChange, clients }) {
  const { previewLeave, createLeave } = useLeaveActions();
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (open) {
      setForm(EMPTY);
    }
  }, [open]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const ready = Boolean(form.clientId && form.startDate && form.endDate);
  const plan = ready ? previewLeave(form) : null;
  const client = clients.find((c) => c.id === form.clientId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!client) {
      toast.error("Pilih client terlebih dahulu.");
      return;
    }
    const res = createLeave({
      clientId: client.id,
      branchId: client.branchId,
      startDate: form.startDate,
      endDate: form.endDate,
      reason: form.reason,
      note: form.note,
    });
    if (!res.ok) {
      toast.error(res.errors[0]);
      return;
    }
    toast.success(
      `Cuti ${client.clientName} dicatat (${res.days} hari cuti, sisa jatah ${res.balance.remaining}). ${res.sessionsOff} sesi dibatalkan (kredit sesi tidak dipotong).${res.warnings.length ? ` ${res.warnings[0]}` : ""}`
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-2xl p-6 border-slate-200" data-testid="leave-form-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CalendarOff className="w-5 h-5 text-violet-600" /> Catat Cuti Client
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Isi rentang cuti sesuai yang disampaikan ortu. Client harus punya jadwal sesi terapi di rentang itu. Hari cuti dihitung dari hari sesi pertama sampai sesi terakhir di rentang, dan memotong saldo jatah cuti client.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Client *</Label>
            <ClientCombobox clients={clients} value={form.clientId} onChange={(val) => set({ clientId: val })} placeholder="Cari client..." testId="leave-client-select" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Mulai cuti *</Label>
              <Input type="date" className="border-slate-200 bg-slate-50 text-xs font-semibold" value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} data-testid="leave-start" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Selesai cuti *</Label>
              <Input type="date" min={form.startDate || undefined} className="border-slate-200 bg-slate-50 text-xs font-semibold" value={form.endDate} onChange={(e) => set({ endDate: e.target.value })} data-testid="leave-end" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Alasan / keterangan</Label>
            <Input className="border-slate-200 bg-slate-50 text-xs" placeholder="mis. Liburan keluarga" value={form.reason} onChange={(e) => set({ reason: e.target.value })} data-testid="leave-reason" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Catatan Finance</Label>
            <Textarea rows={2} className="border-slate-200 bg-slate-50 text-xs" value={form.note} onChange={(e) => set({ note: e.target.value })} data-testid="leave-note" />
          </div>

          {plan && !plan.ok && (
            <ul className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 space-y-0.5" data-testid="leave-errors">
              {plan.errors.map((er) => (
                <li key={er}>{er}</li>
              ))}
            </ul>
          )}

          {plan?.ok && (
            <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 text-xs text-slate-700 space-y-2" data-testid="leave-preview">
              <p className="font-bold text-slate-900" data-testid="leave-counted">
                Hari cuti {fmtDate(plan.countedStart)} – {fmtDate(plan.countedEnd)} ({plan.days} hari)
              </p>
              <p className={cn("text-[11px]", plan.balance.over > 0 ? "text-rose-700 font-semibold" : "text-slate-700")} data-testid="leave-quota">
                Jatah cuti: terpakai {plan.balance.used}, +{plan.balance.adding} hari → <strong>{plan.balance.after}/{plan.balance.quota}</strong> (sisa {plan.balance.remaining})
              </p>
              {plan.warnings.map((w) => (
                <p key={w} className="text-[11px] font-semibold text-rose-700" data-testid="leave-warning">{w}</p>
              ))}
              <div>
                <p className="font-bold text-slate-900">Sesi terapi di rentang ini: {plan.sessions.length}</p>
                {plan.sessions.length > 0 && (
                  <ul className="mt-1 max-h-28 overflow-y-auto space-y-0.5 text-[11px] text-slate-600" data-testid="leave-sessions">
                    {plan.sessions.map((s) => (
                      <li key={s.id}>
                        {fmtDate(s.date)} • {s.startTime}–{s.endTime}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 gap-2">
            <Button type="button" variant="outline" className="border-slate-200" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white font-bold" disabled={!plan?.ok} data-testid="leave-submit">
              Simpan Cuti
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
