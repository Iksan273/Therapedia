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
import { useCredits } from "@/stores/creditsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useTherapists } from "@/stores/therapistsStore";
import { distinctActivePackages, summarizeCreditRecord } from "@/domain/credit";
import { buildClientMoneyLedger } from "@/domain/creditLedger";
import { fmtCurrency } from "@/shared/lib/format";

// Modul Finance "Log Kredit & Saldo": daftar client (yang punya mutasi kredit) beserta saldo rupiah-nya; tombol Lihat Log
// membuka laporan per client. `clients` sudah difilter pencarian oleh FinancePortal.
export function ClientLedgerTab({ clients, search }) {
  const { credits, getMasterPackages } = useCredits();
  const { schedules } = useSchedules();
  const { getTherapist } = useTherapists();
  const [selectedId, setSelectedId] = useState(null);

  const masterPackages = getMasterPackages();
  const rows = useMemo(() => {
    const recordByClient = new Map((credits.records || []).map((r) => [r.clientId, r]));
    const opts = { masterPackages, getTherapistName: (id) => getTherapist(id)?.name || "" };
    return clients
      .filter((c) => (recordByClient.get(c.id)?.history || []).length > 0)
      .map((c) => {
        const record = recordByClient.get(c.id);
        const ledger = buildClientMoneyLedger(record, schedules.filter((s) => s.clientId === c.id), opts);
        return { client: c, record, remaining: summarizeCreditRecord(record).remainingCredit ?? 0, ledger, balance: ledger.length ? ledger[ledger.length - 1].balance : 0 };
      })
      .sort((a, b) => a.client.clientName.localeCompare(b.client.clientName));
  }, [clients, credits.records, schedules, masterPackages, getTherapist]);

  const pg = usePagination(rows, 10, search);
  const selected = rows.find((r) => r.client.id === selectedId) || null;

  return (
    <TabsContent value="ledger" className="space-y-4">
      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-sm font-bold text-slate-900">Log Kredit & Saldo Client ({rows.length})</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Daftar client beserta saldo dalam rupiah. Setiap sesi yang memotong kredit mengurangi saldo sebesar harga per sesi paketnya. Klik Lihat Log untuk rincian per sesi.
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
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[220px] whitespace-nowrap">Paket Aktif</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-right min-w-[110px] whitespace-nowrap">Sisa Sesi</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-right min-w-[150px] whitespace-nowrap">Saldo</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-center pr-6 min-w-[130px] whitespace-nowrap">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pg.pageItems.map(({ client, record, remaining, balance }) => {
                  const active = distinctActivePackages(record.packages, { fallbackLast: false });
                  return (
                    <TableRow key={client.id} className="border-b border-slate-100 hover:bg-slate-50/50" data-testid={`ledger-client-${client.id}`}>
                      <TableCell data-nolabel className="pl-6 py-3.5">
                        <p className="font-bold text-sm text-slate-900">{client.clientName}</p>
                        <p className="font-mono text-[11px] text-slate-500">{client.clientCode} • {client.parentName}</p>
                        <BranchTag branchId={client.branchId} className="mt-1 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200" />
                      </TableCell>
                      <TableCell data-label="Paket Aktif" className="text-xs text-slate-700">
                        {active.length ? active.map((p) => `${p.name} (${p.remainingCredit})`).join(", ") : <span className="text-slate-400">Tidak ada paket aktif</span>}
                      </TableCell>
                      <TableCell data-label="Sisa Sesi" className="text-right tabular-nums font-bold text-slate-900">{remaining}</TableCell>
                      <TableCell data-label="Saldo" className="text-right tabular-nums font-extrabold text-slate-900">{balance == null ? "—" : fmtCurrency(balance)}</TableCell>
                      <TableCell data-nolabel className="text-center pr-6">
                        <Button size="sm" variant="outline" className="font-bold text-sky-700 border-sky-200 hover:bg-sky-50 cursor-pointer" onClick={() => setSelectedId(client.id)} data-testid={`ledger-open-${client.id}`}>
                          Lihat Log
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <TablePagination {...pg} onPageChange={pg.setPage} onPageSizeChange={pg.setPageSize} noun="client" />
        </CardContent>
      </Card>

      <ClientLedgerDialog client={selected?.client} rows={selected?.ledger || []} open={Boolean(selected)} onOpenChange={(o) => !o && setSelectedId(null)} />
    </TabsContent>
  );
}
