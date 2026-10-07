import React from "react";
import { CalendarOff, CheckCircle2, FilePlus2, Undo2, Ban } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { LEAVE_PHASE_META, LEAVE_STATUS, leaveCountedDays, leavePhase } from "@/domain/leave";
import { invoicesOfLeave } from "@/domain/credit";
import { useCredits } from "@/stores/creditsStore";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { fmtCurrency } from "@/shared/lib/format";
import { useSchedules } from "@/stores/schedulesStore";
import { fmtDate } from "@/shared/lib/format";
import { todayStr } from "@/shared/lib/id";
import { cn } from "@/shared/lib/utils";

const fmtAt = (iso) => (iso ? fmtDate(String(iso).slice(0, 10)) : "—");

// Riwayat (log) satu pengajuan cuti, diturunkan dari field log: Dicatat → (Selesai lebih awal) → (Void). Void TIDAK sama dengan
// hapus: log tetap tersimpan dengan alasan, pelaku, dan waktunya; sesi kembali ke jadwal dan hari kembali ke saldo.
export function LeaveDetailDialog({ leave, clientName, open, onOpenChange }) {
  const { schedules } = useSchedules();
  const { getAllInvoices } = useCredits();
  if (!leave) return null;
  const linkedInvoices = invoicesOfLeave(getAllInvoices(), leave.id);
  const phase = leavePhase(leave, todayStr());
  const meta = LEAVE_PHASE_META[phase];
  const sessions = (leave.sessionIds || []).map((id) => schedules.find((s) => s.id === id)).filter(Boolean).sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  const voided = leave.status === LEAVE_STATUS.voided;
  const early = Boolean(leave.returnDate) && !voided;

  const events = [
    { key: "created", icon: FilePlus2, tone: "text-violet-700 bg-violet-50 border-violet-200", title: "Cuti dicatat", at: leave.createdAt, by: leave.createdBy, lines: [`Rentang ${fmtDate(leave.startDate)} – ${fmtDate(leave.endDate)}`, `Hari dihitung ${fmtDate(leave.countedStart)} – ${fmtDate(leave.countedEnd)} (${leaveCountedDays({ ...leave, returnDate: null, status: "active" })} hari)`, leave.reason && `Keterangan: ${leave.reason}`, leave.note && `Catatan Finance: ${leave.note}`] },
    early && { key: "early", icon: Undo2, tone: "text-emerald-700 bg-emerald-50 border-emerald-200", title: "Diakhiri lebih awal", at: leave.returnedAt, by: leave.returnedBy, lines: [`Anak masuk kembali ${fmtDate(leave.returnDate)}`, leave.returnNote && `Catatan: ${leave.returnNote}`] },
    voided && { key: "void", icon: Ban, tone: "text-rose-700 bg-rose-50 border-rose-200", title: "Di-void", at: leave.voidedAt, by: leave.voidedBy, lines: [leave.voidReason && `Alasan: ${leave.voidReason}`, "Sesi kembali ke jadwal dan seluruh hari cuti kembali ke saldo. Log tetap tersimpan."] },
  ].filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-2xl p-6 border-slate-200" data-testid="leave-detail-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CalendarOff className="w-5 h-5 text-violet-600" /> Detail Cuti {clientName || ""}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 flex items-center gap-2">
            Riwayat pengajuan, selesai lebih awal, dan void.
            <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-bold", meta.className)} data-testid="leave-detail-status">{meta.label}</span>
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-3 pt-1" data-testid="leave-detail-timeline">
          {events.map((e) => {
            const Icon = e.icon;
            return (
              <li key={e.key} className={cn("rounded-xl border p-3 text-xs space-y-0.5", e.tone)} data-testid={`leave-event-${e.key}`}>
                <p className="font-extrabold flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" /> {e.title}</p>
                <p className="text-[11px] opacity-80">{fmtAt(e.at)}{e.by ? ` • oleh ${e.by}` : ""}</p>
                {e.lines.filter(Boolean).map((l) => <p key={l} className="text-slate-800">{l}</p>)}
              </li>
            );
          })}
        </ol>

        <div className="space-y-1.5" data-testid="leave-detail-invoices">
          <p className="text-xs font-bold text-slate-800">Invoice cuti terkait ({linkedInvoices.length})</p>
          {linkedInvoices.length === 0 ? (
            <p className="text-[11px] text-slate-500">Belum ada invoice yang dihubungkan ke cuti ini.</p>
          ) : (
            <ul className="space-y-1 text-[11px]">
              {linkedInvoices.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-2.5 py-1.5">
                  <span className="font-mono font-bold text-slate-800">{inv.invoiceNumber}</span>
                  <span className="tabular-nums text-slate-700">{fmtCurrency(inv.amount)}</span>
                  <StatusBadge status={inv.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-1.5" data-testid="leave-detail-sessions">
          <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-slate-500" /> Sesi yang terdampak ({sessions.length})</p>
          {sessions.length === 0 ? (
            <p className="text-[11px] text-slate-500">Tidak ada data sesi.</p>
          ) : (
            <ul className="max-h-40 overflow-y-auto space-y-1 text-[11px]">
              {sessions.map((s) => {
                const stillCancelled = s.status === "cancelled" && s.leaveId === leave.id;
                return (
                  <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-2.5 py-1.5">
                    <span className="tabular-nums text-slate-700">{fmtDate(s.date)} • {s.startTime}–{s.endTime}</span>
                    <span className={cn("font-bold", stillCancelled ? "text-rose-700" : "text-emerald-700")}>{stillCancelled ? "Dibatalkan (cuti)" : "Kembali ke jadwal"}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
