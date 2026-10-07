import React, { useMemo, useState } from "react";
import { CalendarOff, Eye, Plus, Receipt, RotateCcw } from "lucide-react";
import { fmtCurrency } from "@/shared/lib/format";
import { TabsContent } from "@/shared/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Button } from "@/shared/ui/button";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { EmptyState } from "@/shared/components/EmptyState";
import { BranchTag } from "@/shared/components/BranchTag";
import { TablePagination, usePagination } from "@/shared/components/TablePagination";
import { LeaveFormDialog } from "@/features/finance/components/leave/LeaveFormDialog";
import { LeaveDetailDialog } from "@/features/finance/components/leave/LeaveDetailDialog";
import { ResetLeaveDialog } from "@/features/finance/components/leave/ResetLeaveDialog";
import { EndLeaveDialog } from "@/features/finance/components/leave/EndLeaveDialog";
import { useLeaveActions } from "@/features/finance/hooks/useLeaveActions";
import { useSchedules } from "@/stores/schedulesStore";
import { invoicesOfLeave, matchesFinanceSearch } from "@/domain/credit";
import { LEAVE_PHASE_META, leaveCountedDays, leavePhase, leaveQuotaSummary } from "@/domain/leave";
import { fmtDate } from "@/shared/lib/format";
import { todayStr } from "@/shared/lib/id";
import { cn } from "@/shared/lib/utils";

// Log cuti client (berdiri sendiri). Finance mencatat rentang cuti, mengakhiri lebih awal, atau void; hari tidak terpakai
// kembali ke saldo jatah cuti client dan sesi cuti kembali Scheduled. `clients` & `search` dari FinancePortal.
export function LeaveTab({ clients, search, invoices = [], onIssueInvoice }) {
  const { leaves, leaveContextOf } = useLeaveActions();
  const { schedules } = useSchedules();
  const [formOpen, setFormOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [detail, setDetail] = useState(null); // log cuti yang dilihat riwayatnya
  const [endState, setEndState] = useState({ leave: null, mode: "early" });
  const today = todayStr();

  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const rows = useMemo(
    () =>
      leaves
        .map((l) => ({ leave: l, client: clientById.get(l.clientId) }))
        .filter(({ client }) => client && matchesFinanceSearch({ clientName: client.clientName }, client, search))
        .map(({ leave, client }) => ({
          leave: { ...leave, clientName: client.clientName },
          client,
          phase: leavePhase(leave, today),
          days: leaveCountedDays(leave),
          sessionsOff: schedules.filter((s) => s.leaveId === leave.id && s.status === "cancelled").length,
          quota: leaveQuotaSummary({ schedules, leaves, clientId: client.id, ...leaveContextOf(client.id) }),
        }))
        .sort((a, b) => b.leave.startDate.localeCompare(a.leave.startDate)),
    [leaves, schedules, clientById, search, today, leaveContextOf]
  );
  const pg = usePagination(rows, 10, search);

  return (
    <TabsContent value="leave" className="space-y-4" data-testid="leave-tab">
      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">Log Cuti Client ({rows.length})</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Cuti hanya bisa dicatat bila client punya sesi terapi di rentang. Hari cuti dihitung dari sesi pertama sampai sesi terakhir di rentang dan memotong saldo jatah cuti client (30 hari per tahun; kredit sesi tidak dipotong). Sesi terapi di rentang dibatalkan. Paket satuan hanya boleh 1x cuti per bulan. Bila anak masuk lebih awal, akhiri cuti agar sesinya Scheduled lagi dan jatahnya kembali.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
            <Button type="button" size="sm" variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50 font-bold gap-1.5 min-h-10 md:min-h-0" onClick={() => setResetOpen(true)} data-testid="leave-reset-button">
              <RotateCcw className="w-4 h-4" /> Reset Cuti Tahunan
            </Button>
            <Button type="button" size="sm" className="bg-violet-600 hover:bg-violet-700 text-white font-bold gap-1.5 min-h-10 md:min-h-0" onClick={() => setFormOpen(true)} data-testid="leave-add-button">
              <Plus className="w-4 h-4" /> Catat Cuti
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {rows.length === 0 ? (
            <EmptyState icon={CalendarOff} title="Belum ada log cuti" subtitle="Klik Catat Cuti untuk menambahkan cuti client." />
          ) : (
            <Table stackOnMobile className="min-w-[1180px] w-full" data-testid="leave-table">
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                  <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6 min-w-[210px] whitespace-nowrap">Client & Cabang</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[190px] whitespace-nowrap">Periode</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[150px] whitespace-nowrap">Sesi Dibatalkan</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[160px] whitespace-nowrap">Saldo Jatah Cuti</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[190px] whitespace-nowrap">Invoice Cuti</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[130px] whitespace-nowrap">Status</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs pr-6 min-w-[250px] whitespace-nowrap">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pg.pageItems.map(({ leave, client, phase, days, sessionsOff, quota }) => {
                  const meta = LEAVE_PHASE_META[phase];
                  const editable = phase !== "voided";
                  return (
                    <TableRow key={leave.id} className="border-b border-slate-100 hover:bg-slate-50/50 align-top" data-testid={`leave-row-${leave.id}`}>
                      <TableCell data-nolabel className="pl-6 py-3.5">
                        <p className="font-bold text-sm text-slate-900">{client.clientName}</p>
                        <p className="font-mono text-[11px] text-slate-500">{client.clientCode} • {client.parentName}</p>
                        <BranchTag branchId={client.branchId} className="mt-1 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200" />
                      </TableCell>
                      <TableCell data-label="Periode" className="py-3.5 text-xs">
                        <p className="font-semibold text-slate-900">{fmtDate(leave.startDate)} – {fmtDate(leave.endDate)}</p>
                        {leave.returnDate && phase !== "voided" && <p className="text-[11px] text-emerald-700">Masuk kembali {fmtDate(leave.returnDate)}</p>}
                        {leave.reason && <p className="text-[11px] text-slate-500">{leave.reason}</p>}
                        {phase === "voided" && leave.voidReason && <p className="text-[11px] text-rose-700">Void: {leave.voidReason}</p>}
                      </TableCell>
                      <TableCell data-label="Sesi Dibatalkan" className="py-3.5 text-xs">
                        <p className="font-bold text-slate-900 tabular-nums" data-testid={`leave-days-${leave.id}`}>{sessionsOff} sesi dibatalkan</p>
                        <p className="text-[11px] text-slate-500">{days} hari cuti dihitung</p>
                      </TableCell>
                      <TableCell data-label="Jatah" className="py-3.5 text-xs">
                        <p className={cn("font-bold tabular-nums", quota.over > 0 ? "text-rose-700" : "text-slate-900")}>
                          {quota.used}/{quota.quota} hari
                        </p>
                        <p className="text-[11px] text-slate-500">{quota.over > 0 ? `lewat ${quota.over} hari` : `sisa ${quota.remaining}`}</p>
                      </TableCell>
                      <TableCell data-label="Invoice Cuti" className="py-3.5 text-xs" data-testid={`leave-invoices-${leave.id}`}>
                        {invoicesOfLeave(invoices, leave.id).map((inv) => (
                          <p key={inv.id} className="mb-1 flex flex-wrap items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</span>
                            <span className="tabular-nums text-slate-600">{fmtCurrency(inv.amount)}</span>
                            <StatusBadge status={inv.status} />
                          </p>
                        ))}
                        {onIssueInvoice && editable && (
                          <Button type="button" size="sm" variant="outline" className="font-bold border-violet-200 text-violet-700 hover:bg-violet-50 gap-1.5 min-h-10 md:min-h-0" onClick={() => onIssueInvoice(leave)} data-testid={`leave-issue-invoice-${leave.id}`}>
                            <Receipt className="w-3.5 h-3.5" /> Terbitkan Invoice
                          </Button>
                        )}
                        {!editable && invoicesOfLeave(invoices, leave.id).length === 0 && <span className="text-slate-400">—</span>}
                      </TableCell>
                      <TableCell data-label="Status" className="py-3.5">
                        <span className={cn("inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-bold", meta.className)} data-testid={`leave-status-${leave.id}`}>
                          {meta.label}
                        </span>
                      </TableCell>
                      <TableCell data-nolabel className="py-3.5 pr-6">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button type="button" size="sm" variant="outline" className="font-bold border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 min-h-10 md:min-h-0" onClick={() => setDetail({ leave, clientName: client.clientName })} data-testid={`leave-detail-${leave.id}`}>
                            <Eye className="w-3.5 h-3.5" /> Detail
                          </Button>
                          {editable && phase !== "done" && (
                            <Button type="button" size="sm" variant="outline" className="font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50 min-h-10 md:min-h-0" onClick={() => setEndState({ leave, mode: "early" })} data-testid={`leave-end-${leave.id}`}>
                              Akhiri Lebih Awal
                            </Button>
                          )}
                          {editable && (
                            <Button type="button" size="sm" variant="outline" className="font-bold border-rose-200 text-rose-700 hover:bg-rose-50 min-h-10 md:min-h-0" onClick={() => setEndState({ leave, mode: "void" })} data-testid={`leave-void-${leave.id}`}>
                              Void
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <TablePagination {...pg} onPageChange={pg.setPage} onPageSizeChange={pg.setPageSize} noun="cuti" />
      </Card>

      <LeaveFormDialog open={formOpen} onOpenChange={setFormOpen} clients={clients} />
      <ResetLeaveDialog open={resetOpen} onOpenChange={setResetOpen} />
      <LeaveDetailDialog leave={detail ? leaves.find((l) => l.id === detail.leave.id) || detail.leave : null} clientName={detail?.clientName} open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)} />
      <EndLeaveDialog leave={endState.leave} mode={endState.mode} open={Boolean(endState.leave)} onOpenChange={(o) => !o && setEndState((s) => ({ ...s, leave: null }))} />
    </TabsContent>
  );
}
