import React, { useMemo } from "react";
import { CalendarOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { useLeaves } from "@/stores/leavesStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useCredits } from "@/stores/creditsStore";
import { LEAVE_PHASE_META, leaveCountedDays, leavePhase, leavePolicyOf, leaveQuotaSummary } from "@/domain/leave";
import { fmtDate } from "@/shared/lib/format";
import { todayStr } from "@/shared/lib/id";
import { cn } from "@/shared/lib/utils";

// Kartu saldo jatah cuti client (read-only): terpakai/jatah (diisi per paket, reset saat renewal) + riwayat log cuti.
// Pencatatan & void cuti dilakukan Finance (tab Cuti di /finance); Off manual lewat detail sesi di kalender.
export function LeaveQuotaCard({ clientId }) {
  const { getRawRecord, getLeaveResetAt } = useCredits();
  const { leaves } = useLeaves();
  const { schedules } = useSchedules();
  const today = todayStr();

  const policy = leavePolicyOf(getRawRecord(clientId), getLeaveResetAt());
  const summary = useMemo(() => leaveQuotaSummary({ schedules, leaves, clientId, granted: policy.granted, since: policy.since }), [schedules, leaves, clientId, policy.granted, policy.since]);
  // Semua log client (termasuk void, tetap tampil sebagai riwayat).
  const logs = useMemo(
    () =>
      leaves
        .filter((l) => l.clientId === clientId)
        .sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [leaves, clientId]
  );
  const pct = summary.quota > 0 ? Math.min(100, Math.round((summary.used / summary.quota) * 100)) : summary.used > 0 ? 100 : 0;

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden" data-testid="leave-quota-card">
      <CardHeader className="p-5 sm:p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
        <CardTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
          <CalendarOff className="w-4 h-4 text-violet-600" /> Saldo Jatah Cuti
        </CardTitle>
        <CardDescription className="text-xs text-slate-500 mt-0.5">
          Jatah {summary.quota} hari per tahun (sisa hangus saat reset tahunan Finance){policy.since ? ` (direset ${fmtDate(policy.since)})` : ""}. Terpakai dari log Finance (tab Cuti): sesi pertama s.d. terakhir di rentang, (cuti hanya dicatat Finance).
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 sm:p-6 space-y-4">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <p className={cn("text-2xl font-black tabular-nums", summary.over > 0 ? "text-rose-700" : "text-slate-900")} data-testid="leave-quota-used">
              {summary.used}<span className="text-sm font-bold text-slate-400">/{summary.quota} hari</span>
            </p>
            <p className={cn("text-xs font-bold", summary.over > 0 ? "text-rose-700" : "text-emerald-700")} data-testid="leave-quota-remaining">
              {summary.over > 0 ? `Lewat ${summary.over} hari` : `Sisa ${summary.remaining} hari`}
            </p>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={summary.used} aria-valuemin={0} aria-valuemax={summary.quota}>
            <div className={cn("h-full rounded-full", summary.over > 0 ? "bg-rose-500" : "bg-violet-500")} style={{ width: `${pct}%` }} />
          </div>
        </div>

        {logs.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Belum ada cuti tercatat.</p>
        ) : (
          <ul className="space-y-2 text-xs" data-testid="leave-quota-list">
            {logs.map((l) => {
              const meta = LEAVE_PHASE_META[leavePhase(l, today)];
              return (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                  <span className="font-semibold text-slate-800">
                    {fmtDate(l.startDate)} – {fmtDate(l.endDate)}
                    {l.reason ? <span className="font-normal text-slate-500"> • {l.reason}</span> : null}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums text-slate-600">{leaveCountedDays(l)} hari</span>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-bold", meta.className)}>{meta.label}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
