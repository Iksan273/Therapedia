import React from "react";
import { TabsContent } from "@/shared/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/components/EmptyState";
import { Wallet } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { BranchTag } from "@/shared/components/BranchTag";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { TablePagination } from "@/shared/components/TablePagination";
import { Button } from "@/shared/ui/button";
import { fmtCurrency, fmtDate } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

// Daftar client dengan saldo lebihan konversi paket: berapa sisanya, berasal dari invoice/konversi mana, dan sudah dipakai
// untuk invoice mana. `rows` = hasil leftoverSummaryByClient + data client; `leftoverPg` = usePagination(rows).
export function LeftoverTab({ rows, leftoverPg, includeZero, setIncludeZero }) {
  return (
    <TabsContent value="leftover" className="space-y-4">
      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">Saldo Lebihan Client ({rows.length})</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Lebihan rupiah dari konversi paket. Otomatis memotong invoice paket berikutnya milik client. Tiap baris menunjukkan sumber (invoice asal konversi) dan pemakaiannya.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn("shrink-0 text-[11px] font-semibold min-h-10 md:min-h-0 cursor-pointer", includeZero && "border-sky-300 bg-sky-50 text-sky-800")}
            onClick={() => setIncludeZero(!includeZero)}
            aria-pressed={includeZero}
            data-testid="leftover-include-zero"
          >
            {includeZero ? "Termasuk saldo 0" : "Hanya saldo > 0"}
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {rows.length === 0 ? (
            <EmptyState icon={Wallet} title="Tidak ada saldo lebihan" subtitle="Belum ada client dengan saldo lebihan konversi paket." />
          ) : (
            <Table stackOnMobile className="min-w-[980px] w-full" data-testid="leftover-table">
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                  <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6 min-w-[210px] whitespace-nowrap">Client & Cabang</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[140px] whitespace-nowrap">Sisa Saldo</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[300px] whitespace-nowrap">Sumber Lebihan (Invoice Asal)</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs pr-6 min-w-[260px] whitespace-nowrap">Sudah Dipakai di Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leftoverPg.pageItems.map((r) => (
                  <TableRow key={r.clientId} className="border-b border-slate-100 hover:bg-slate-50/50 align-top" data-testid={`leftover-row-${r.clientId}`}>
                    <TableCell data-nolabel className="pl-6 py-3.5">
                      <p className="font-bold text-sm text-slate-900">{r.client.clientName}</p>
                      <p className="font-mono text-[11px] text-slate-500">{r.client.clientCode} • {r.client.parentName}</p>
                      <BranchTag branchId={r.client.branchId} className="mt-1 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200" />
                    </TableCell>
                    <TableCell data-label="Sisa Saldo" className="py-3.5">
                      <p className={cn("text-base font-black tabular-nums", r.balance > 0 ? "text-amber-700" : "text-slate-400")} data-testid={`leftover-balance-${r.clientId}`}>
                        {fmtCurrency(r.balance)}
                      </p>
                      <p className="text-[10px] text-slate-400 tabular-nums">Masuk {fmtCurrency(r.totalIn)} • Terpakai {fmtCurrency(r.totalOut)}</p>
                      {!r.inSync && (
                        <p className="mt-1 inline-block rounded bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700" title="Saldo tersimpan berbeda dari hitungan masuk − terpakai (data lama atau koreksi manual). Periksa sumbernya.">
                          Tidak sinkron: seharusnya {fmtCurrency(r.expected)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell data-label="Sumber Lebihan" className="py-3.5 text-xs">
                      {r.sources.length === 0 ? (
                        <span className="text-slate-400 italic">Tidak ada konversi tercatat</span>
                      ) : (
                        <ul className="space-y-1.5">
                          {r.sources.map((s) => (
                            <li key={s.conversionId} className="leading-tight">
                              <span className="font-mono font-bold text-slate-900">{s.invoiceNumber}</span>
                              <span className="ml-1.5 font-bold text-emerald-700 tabular-nums">+{fmtCurrency(s.amount)}</span>
                              <span className="block text-[11px] text-slate-500">
                                Konversi → {s.toPackageName} ({s.toSessions} sesi, {s.mode === "manual" ? "manual" : "otomatis"}) • {s.date ? fmtDate(s.date) : "—"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                    <TableCell data-label="Sudah Dipakai" className="py-3.5 pr-6 text-xs">
                      {r.uses.length === 0 ? (
                        <span className="text-slate-400 italic">Belum dipakai</span>
                      ) : (
                        <ul className="space-y-1.5">
                          {r.uses.map((u) => (
                            <li key={u.invoiceId} className="leading-tight">
                              <span className="font-mono font-bold text-slate-900">{u.invoiceNumber}</span>
                              <span className="ml-1.5 font-bold text-rose-600 tabular-nums">−{fmtCurrency(u.amount)}</span>
                              <span className="ml-1.5 align-middle"><StatusBadge status={u.status} /></span>
                              {u.returned && <span className="block text-[11px] text-slate-500">Dikembalikan ke saldo (invoice di-void, kredit dicabut)</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <TablePagination {...leftoverPg} onPageChange={leftoverPg.setPage} onPageSizeChange={leftoverPg.setPageSize} noun="client" />
      </Card>
    </TabsContent>
  );
}
