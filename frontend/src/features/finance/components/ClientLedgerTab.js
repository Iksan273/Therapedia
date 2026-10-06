import React, { useMemo, useState } from "react";
import { ScrollText } from "lucide-react";
import { TabsContent } from "@/shared/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/components/EmptyState";
import { BranchTag } from "@/shared/components/BranchTag";
import { TablePagination, usePagination } from "@/shared/components/TablePagination";
import { ClientLedgerDialog } from "@/features/finance/components/ClientLedgerDialog";
import { toast } from "sonner";
import { SessionHistoryNoteDialog } from "@/shared/components/SessionHistoryNoteDialog";
import { useAuth } from "@/stores/authStore";
import { useCredits } from "@/stores/creditsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useTherapists } from "@/stores/therapistsStore";
import { packageBaseName } from "@/domain/credit";
import { buildPackageMoneyLedgers } from "@/domain/creditLedger";
import { fmtCurrency } from "@/shared/lib/format";

// Modul Finance "Log Kredit & Saldo": satu baris = satu PAKET milik satu client (client dengan 2 paket = 2 baris, masing-masing
// punya log & saldo rupiah sendiri); tombol Lihat Log membuka laporan paket itu. `clients` sudah difilter pencarian oleh FinancePortal.
export function ClientLedgerTab({ clients, search }) {
  const { credits, getMasterPackages } = useCredits();
  const { schedules, updateSchedule } = useSchedules();
  const { getTherapist } = useTherapists();
  const { auth } = useAuth();
  const [selectedKey, setSelectedKey] = useState(null);
  const [noteScheduleId, setNoteScheduleId] = useState(null);

  const masterPackages = getMasterPackages();
  const rows = useMemo(() => {
    const recordByClient = new Map((credits.records || []).map((r) => [r.clientId, r]));
    const opts = { masterPackages, getTherapistName: (id) => getTherapist(id)?.name || "" };
    return clients
      .flatMap((c) => {
        const record = recordByClient.get(c.id);
        if (!record) return [];
        return buildPackageMoneyLedgers(record, schedules.filter((s) => s.clientId === c.id), opts).map(({ pkg, ledger, balance }) => ({
          key: `${c.id}:${pkg.id}`,
          client: c,
          pkg,
          ledger,
          balance,
        }));
      })
      .sort((a, b) => a.client.clientName.localeCompare(b.client.clientName) || (a.pkg.createdAt || "").localeCompare(b.pkg.createdAt || ""));
  }, [clients, credits.records, schedules, masterPackages, getTherapist]);

  const pg = usePagination(rows, 10, search);
  const selected = rows.find((r) => r.key === selectedKey) || null;
  const noteSession = noteScheduleId ? schedules.find((x) => x.id === noteScheduleId) || null : null;

  return (
    <TabsContent value="ledger" className="space-y-4">
      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-sm font-bold text-slate-900">Log Kredit & Saldo per Paket ({rows.length})</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Satu baris = satu paket milik satu client, beserta saldo rupiahnya. Setiap sesi yang memotong kredit mengurangi saldo sebesar harga per sesi paketnya. Klik Lihat Log untuk rincian per sesi.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {rows.length === 0 ? (
            <EmptyState icon={ScrollText} title="Belum ada log kredit" subtitle="Belum ada client dengan mutasi kredit (atau tidak cocok dengan pencarian)." />
          ) : (
            <Table stackOnMobile className="min-w-[860px] w-full" data-testid="client-ledger-list">
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                  <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6 min-w-[220px] whitespace-nowrap">Client & Cabang</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[220px] whitespace-nowrap">Paket</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-right min-w-[110px] whitespace-nowrap">Sisa Sesi</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-right min-w-[150px] whitespace-nowrap">Saldo</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-center pr-6 min-w-[130px] whitespace-nowrap">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pg.pageItems.map(({ key, client, pkg, balance }) => {
                  return (
                    <TableRow key={key} className="border-b border-slate-100 hover:bg-slate-50/50" data-testid={`ledger-client-${key}`}>
                      <TableCell data-nolabel className="pl-6 py-3.5">
                        <p className="font-bold text-sm text-slate-900">{client.clientName}</p>
                        <p className="font-mono text-[11px] text-slate-500">{client.clientCode} • {client.parentName}</p>
                        <BranchTag branchId={client.branchId} className="mt-1 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200" />
                      </TableCell>
                      <TableCell data-label="Paket" className="text-xs text-slate-700">
                        {packageBaseName(pkg.packageName)} ({pkg.totalCredit}x)
                        {pkg.status === "voided" && <span className="ml-1.5 text-[10px] font-bold text-rose-600">Void</span>}
                      </TableCell>
                      <TableCell data-label="Sisa Sesi" className="text-right tabular-nums font-bold text-slate-900">{pkg.remainingCredit ?? 0}</TableCell>
                      <TableCell data-label="Saldo" className="text-right tabular-nums font-extrabold text-slate-900">{balance == null ? "—" : fmtCurrency(balance)}</TableCell>
                      <TableCell data-nolabel className="text-center pr-6">
                        <Button size="sm" variant="outline" className="font-bold text-sky-700 border-sky-200 hover:bg-sky-50 cursor-pointer" onClick={() => setSelectedKey(key)} data-testid={`ledger-open-${key}`}>
                          Lihat Log
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <TablePagination {...pg} onPageChange={pg.setPage} onPageSizeChange={pg.setPageSize} noun="paket" />
        </CardContent>
      </Card>

      <ClientLedgerDialog
        client={selected?.client}
        packageLabel={selected ? `${packageBaseName(selected.pkg.packageName)} (${selected.pkg.totalCredit}x)` : ""}
        rows={selected?.ledger || []}
        open={Boolean(selected)}
        onOpenChange={(o) => !o && setSelectedKey(null)}
        onEditNote={setNoteScheduleId}
      />
      <SessionHistoryNoteDialog
        session={noteSession}
        open={Boolean(noteSession)}
        onOpenChange={(o) => !o && setNoteScheduleId(null)}
        onSave={(text) => {
          updateSchedule(noteSession.id, { historyNote: text, historyNoteBy: auth?.staffName || auth?.role || null });
          toast.success("Catatan sesi disimpan.");
          setNoteScheduleId(null);
        }}
      />
    </TabsContent>
  );
}
