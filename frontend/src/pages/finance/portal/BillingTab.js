import React from "react";
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BRANCHES, fmtCurrency, fmtDate } from "@/lib/appUtils";
import { Button } from "@/components/ui/button";
import { getProofFileType } from "@/lib/fileUploadUtils";
import { Eye, FileText } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TablePagination } from "@/components/common/TablePagination";

export function BillingTab({ invoicesPg, setSelectedProofInvoice }) {
  return (
    <TabsContent value="billing" className="space-y-4">
          <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-900">Seluruh Arsip Tagihan & Invoice</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Riwayat invoice awal dan tagihan renewal yang diterbitkan untuk setiap client
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[880px] w-full">
                <TableHeader>
                  <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                    <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6 min-w-[150px] whitespace-nowrap">No. Invoice</TableHead>
                    <TableHead className="font-bold text-slate-700 text-xs min-w-[200px] whitespace-nowrap">Client & Cabang</TableHead>
                    <TableHead className="font-bold text-slate-700 text-xs min-w-[180px] whitespace-nowrap">Paket Layanan</TableHead>
                    <TableHead className="font-bold text-slate-700 text-xs min-w-[150px] whitespace-nowrap">Nominal</TableHead>
                    <TableHead className="font-bold text-slate-700 text-xs min-w-[130px] whitespace-nowrap">Tanggal</TableHead>
                    <TableHead className="font-bold text-slate-700 text-xs min-w-[140px] whitespace-nowrap">Bukti Transfer</TableHead>
                    <TableHead className="font-bold text-slate-700 text-xs text-right pr-6 min-w-[130px] whitespace-nowrap">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesPg.pageItems.map((inv) => {
                    const br = BRANCHES.find((b) => b.id === inv.branchId);
                    return (
                      <TableRow key={inv.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <TableCell className="font-mono text-xs font-bold text-slate-900 pl-6 min-w-[150px] whitespace-nowrap">
                          {inv.invoiceNumber}
                        </TableCell>
                        <TableCell className="text-xs min-w-[200px] whitespace-nowrap">
                          <p className="font-bold text-slate-900">{inv.clientName}</p>
                          <span className="text-[11px] text-slate-500 font-medium">{br ? br.name : "—"}</span>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-800 min-w-[180px] whitespace-nowrap">{inv.packageName}</TableCell>
                        <TableCell className="text-xs font-bold text-slate-900 tabular-nums min-w-[150px] whitespace-nowrap">{fmtCurrency(inv.amount)}</TableCell>
                        <TableCell className="text-xs text-slate-500 tabular-nums min-w-[130px] whitespace-nowrap">{fmtDate(inv.createdAt)}</TableCell>
                        <TableCell className="text-xs min-w-[140px] whitespace-nowrap">
                          {inv.proofOfPaymentUrl || inv.proofUrl ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="px-2.5 text-[11px] font-semibold text-slate-700 hover:text-sky-700 border-slate-200 hover:bg-sky-50 gap-1.5 cursor-pointer"
                              onClick={() => setSelectedProofInvoice(inv)}
                            >
                              {getProofFileType(inv.proofOfPaymentUrl || inv.proofUrl, inv.proofFileType, inv.proofFileName) === "pdf" ? (
                                <>
                                  <FileText className="w-3 h-3 text-rose-600" />
                                  <span>Lihat PDF</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3 h-3 text-sky-600" />
                                  <span>Lihat Foto</span>
                                </>
                              )}
                            </Button>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6 min-w-[130px] whitespace-nowrap">
                          <StatusBadge status={inv.status} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>

            <TablePagination
              {...invoicesPg}
              onPageChange={invoicesPg.setPage}
              onPageSizeChange={invoicesPg.setPageSize}
              noun="tagihan"
            />
          </Card>
        </TabsContent>
  );
}
