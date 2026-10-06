import React from "react";
import { Flame, RefreshCw, Snowflake } from "lucide-react";
import { TabsContent } from "@/shared/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/components/EmptyState";
import { BranchTag } from "@/shared/components/BranchTag";
import { TablePagination } from "@/shared/components/TablePagination";
import { RENEWAL_CREDIT_THRESHOLD } from "@/domain/credit";
import { fmtCurrency } from "@/shared/lib/format";

// Client aktif dengan sisa kredit < RENEWAL_CREDIT_THRESHOLD. Tombol Renew langsung menerbitkan invoice paket yang sama
// (masuk tab Menunggu Pembayaran). `rows` = { client, remaining, plan (buildSamePackageRenewal), hasOpenInvoice }.
export function RenewalNeededTab({ rows, renewalPg, onRenew }) {
  return (
    <TabsContent value="renewal" className="space-y-4">
      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-sm font-bold text-slate-900">Perlu Renewal ({rows.length})</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Client aktif dengan sisa kredit kurang dari {RENEWAL_CREDIT_THRESHOLD} sesi. Tombol Renew langsung menerbitkan invoice dengan paket yang sama dan masuk ke Menunggu Pembayaran.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {rows.length === 0 ? (
            <EmptyState icon={Flame} title="Tidak ada client yang perlu renewal" subtitle={`Semua client aktif masih punya sisa kredit ${RENEWAL_CREDIT_THRESHOLD}+ sesi (atau tidak cocok dengan pencarian).`} />
          ) : (
            <Table stackOnMobile className="min-w-[860px] w-full" data-testid="renewal-needed-table">
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                  <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6 min-w-[220px] whitespace-nowrap">Client & Cabang</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[120px] whitespace-nowrap">Sisa Kredit</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[240px] whitespace-nowrap">Paket Renewal (Sama)</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-center pr-6 min-w-[170px] whitespace-nowrap">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renewalPg.pageItems.map(({ client, remaining, plan, hasOpenInvoice }) => (
                  <TableRow key={client.id} className="border-b border-slate-100 hover:bg-slate-50/50" data-testid={`renewal-row-${client.id}`}>
                    <TableCell data-nolabel className="pl-6 py-3.5">
                      <p className="font-bold text-sm text-slate-900">{client.clientName}</p>
                      <p className="font-mono text-[11px] text-slate-500">{client.clientCode} • {client.parentName}</p>
                      <BranchTag branchId={client.branchId} className="mt-1 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200" />
                    </TableCell>
                    <TableCell data-label="Sisa Kredit" className="whitespace-nowrap">
                      {remaining === 0 ? (
                        <span className="inline-flex items-center gap-1 font-extrabold text-cyan-800 text-xs"><Snowflake className="w-3.5 h-3.5" /> Frozen</span>
                      ) : (
                        <span className="font-black text-amber-700 text-sm">{remaining} sesi</span>
                      )}
                    </TableCell>
                    <TableCell data-label="Paket Renewal" className="text-xs text-slate-700">
                      {plan ? (
                        <>
                          <p className="font-semibold">{plan.packageName}</p>
                          <p className="tabular-nums text-slate-500">{fmtCurrency(plan.amount)}</p>
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell data-nolabel className="text-center pr-6">
                      {hasOpenInvoice ? (
                        <span className="text-[11px] font-bold text-amber-700" data-testid={`renewal-open-${client.id}`}>Invoice menunggu pembayaran</span>
                      ) : (
                        <Button
                          size="sm"
                          className="gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold cursor-pointer min-h-10 md:min-h-0"
                          disabled={!plan}
                          onClick={() => onRenew(client, plan)}
                          data-testid={`renew-now-${client.id}`}
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Add Renewal
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <TablePagination {...renewalPg} onPageChange={renewalPg.setPage} onPageSizeChange={renewalPg.setPageSize} noun="client" />
        </CardContent>
      </Card>
    </TabsContent>
  );
}
