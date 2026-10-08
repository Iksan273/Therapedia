import React from "react";
import { TabsContent } from "@/shared/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/components/EmptyState";
import { History } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { BRANCHES } from "@/domain/branch";
import { fmtDate } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { TablePagination } from "@/shared/components/TablePagination";

export function HistoryTab({ allHistoryLogs, historyPg }) {
  return (
    <TabsContent value="history" className="space-y-4">
          <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-900">Riwayat Buku Besar Kredit</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Log real-time pergerakan kredit (pemakaian sesi, penambahan renewal, kuota cancel wajar, dan penalti cancel &gt;3x)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {allHistoryLogs.length === 0 ? (
                <EmptyState icon={History} title="Belum ada riwayat" subtitle="Belum ada pencatatan kredit." />
              ) : (
                <Table stackOnMobile className="min-w-[940px] w-full">
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                      <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6 min-w-[130px] whitespace-nowrap">Tanggal</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs min-w-[200px] whitespace-nowrap">Client & Cabang</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs min-w-[160px] whitespace-nowrap">Paket Kredit</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs min-w-[180px] whitespace-nowrap">Jenis Transaksi</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs min-w-[140px] whitespace-nowrap">Perubahan Kredit</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs pr-6 min-w-[220px]">Keterangan / Alasan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyPg.pageItems.map((log) => {
                      const br = BRANCHES.find((b) => b.id === log.branchId);
                      return (
                        <TableRow key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50 text-xs">
                          <TableCell data-nolabel className="font-mono text-slate-600 pl-6 tabular-nums min-w-[130px] whitespace-nowrap">{fmtDate(log.date)}</TableCell>
                          <TableCell data-label="Client & Cabang" className="min-w-[200px] whitespace-nowrap">
                            <p className="font-bold text-slate-900">{log.clientName}</p>
                            <span className="text-[11px] text-slate-500 font-medium">{br ? br.name : "—"}</span>
                          </TableCell>
                          <TableCell data-label="Paket Kredit" className="font-semibold text-slate-700 min-w-[160px] whitespace-nowrap">{log.packageName || "Regular Therapist"}</TableCell>
                          <TableCell data-label="Jenis Transaksi" className="min-w-[180px] whitespace-nowrap">
                            <span
                              className={cn(
                                "px-2.5 py-0.5 rounded-lg text-[11px] font-bold border inline-flex items-center whitespace-nowrap",
                                log.action === "renewed" && "bg-emerald-50 text-emerald-800 border-emerald-200",
                                log.action === "used" && "bg-sky-50 text-sky-800 border-sky-200",
                                (log.action === "cancel_excused" || log.action === "cancel_leave") && "bg-slate-100 text-slate-700 border-slate-200",
                                log.action === "cancel_penalty" && "bg-rose-50 text-rose-800 border-rose-200 font-extrabold",
                                (log.action === "off_excused" || log.action === "off_penalty") && "bg-violet-50 text-violet-800 border-violet-200",
                                log.action === "reversal" && "bg-violet-50 text-violet-800 border-violet-200",
                                (log.action === "converted_out" || log.action === "converted_in") && "bg-amber-50 text-amber-800 border-amber-200",
                                (log.action === "manual_adjust" || log.action === "discharge") && "bg-rose-50 text-rose-800 border-rose-200"
                              )}
                            >
                              {log.action === "renewed" && "Top Up / Renewal"}
                              {log.action === "used" && "Sesi Terpakai"}
                              {log.action === "cancel_excused" && "Cancel (Kredit Utuh)"}
                              {log.action === "cancel_penalty" && "Cancel (Potong Kredit)"}
                              {log.action === "cancel_leave" && "Cancel (Pakai Credit Leave)"}
                              {log.action === "off_excused" && "Sesi Cuti (Kredit Utuh)"}
                              {log.action === "off_penalty" && "Sesi Cuti (Potong Kredit)"}
                              {log.action === "reversal" && "Dibatalkan (Reversal)"}
                              {log.action === "converted_out" && "Konversi Keluar"}
                              {log.action === "converted_in" && "Konversi Masuk"}
                              {log.action === "discharge" && "Discharge (Sisa Sesi Hangus)"}
                              {log.action === "manual_adjust" && "Koreksi / Pencabutan Kredit (Void)"}
                            </span>
                          </TableCell>
                          <TableCell data-label="Perubahan Kredit" className="font-bold tabular-nums min-w-[140px] whitespace-nowrap">
                            {log.creditChange > 0 ? (
                              <span className="text-emerald-600 font-extrabold">+{log.creditChange}</span>
                            ) : log.creditChange < 0 ? (
                              <span className="text-rose-600 font-extrabold">{log.creditChange}</span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </TableCell>
                          <TableCell data-label="Keterangan / Alasan" className="text-slate-600 pr-6 min-w-[220px]">{log.note}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>

            <TablePagination
              {...historyPg}
              onPageChange={historyPg.setPage}
              onPageSizeChange={historyPg.setPageSize}
              noun="catatan"
            />
          </Card>
        </TabsContent>
  );
}
