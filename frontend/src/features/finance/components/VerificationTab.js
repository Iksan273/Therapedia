import React from "react";
import { TabsContent } from "@/shared/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/components/EmptyState";
import { CheckCircle2, Eye, FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { BRANCHES } from "@/domain/branch";
import { fmtCurrency } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { getProofFileType } from "@/shared/lib/fileUpload";
import { TablePagination } from "@/shared/components/TablePagination";

export function VerificationTab({ handleApprovePayment, handleRejectPayment, pendingInvoices, pendingPg, setSelectedProofInvoice }) {
  return (
    <TabsContent value="verification" className="space-y-4">
          <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-900">
                Antrean Bukti Transfer Orang Tua ({pendingInvoices.length})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Periksa slip transfer yang diupload oleh orang tua melalui Parent Portal. Begitu disetujui, paket kredit akan langsung aktif.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {pendingInvoices.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="Seluruh Pembayaran Telah Bersih"
                  subtitle="Tidak ada antrean bukti transfer yang menunggu verifikasi saat ini."
                />
              ) : (
                <Table stackOnMobile className="min-w-[960px] w-full">
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                      <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6 min-w-[160px] whitespace-nowrap">No. Invoice</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs min-w-[200px] whitespace-nowrap">Nama Client & Cabang</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs min-w-[190px] whitespace-nowrap">Paket & Nominal</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs min-w-[160px] whitespace-nowrap">Bukti Transfer</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs text-right pr-6 min-w-[240px] whitespace-nowrap">Tindakan Verifikasi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPg.pageItems.map((inv) => {
                      const br = BRANCHES.find((b) => b.id === inv.branchId);
                      return (
                        <TableRow key={inv.id} className="border-b border-slate-100 hover:bg-sky-50/30 transition-colors">
                          <TableCell data-nolabel className="font-mono text-xs font-bold text-slate-900 pl-6 min-w-[160px] whitespace-nowrap">
                            {inv.invoiceNumber}
                          </TableCell>
                          <TableCell data-label="Nama Client & Cabang" className="text-xs min-w-[200px] whitespace-nowrap">
                            <p className="font-bold text-slate-900">{inv.clientName}</p>
                            <span className="text-[11px] text-slate-500 font-medium">{br ? br.name : "—"}</span>
                          </TableCell>
                          <TableCell data-label="Paket & Nominal" className="text-xs min-w-[190px] whitespace-nowrap">
                            <p className="font-semibold text-slate-800">{inv.packageName}</p>
                            <p className="font-bold text-slate-900 tabular-nums">{fmtCurrency(inv.amount)}</p>
                          </TableCell>
                          <TableCell data-label="Bukti Transfer" className="text-xs min-w-[160px] whitespace-nowrap">
                            {inv.proofOfPaymentUrl || inv.proofUrl ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-sky-700 border-sky-200 bg-sky-50/70 hover:bg-sky-100 whitespace-nowrap cursor-pointer font-semibold shadow-2xs"
                                onClick={() => setSelectedProofInvoice(inv)}
                              >
                                {getProofFileType(inv.proofOfPaymentUrl || inv.proofUrl, inv.proofFileType, inv.proofFileName) === "pdf" ? (
                                  <>
                                    <FileText className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Lihat Dokumen PDF</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-3.5 h-3.5 text-sky-600" />
                                    <span>Lihat Foto Slip</span>
                                  </>
                                )}
                              </Button>
                            ) : (
                              <span className="text-xs text-rose-500 font-medium italic whitespace-nowrap">Belum upload slip</span>
                            )}
                          </TableCell>
                          <TableCell data-nolabel className="text-right pr-6 py-4 min-w-[240px] whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                              <Button
                                size="sm"
                                variant="outline"
                                className="px-3 font-bold text-rose-600 hover:bg-rose-50 border-rose-200 whitespace-nowrap cursor-pointer"
                                onClick={() => handleRejectPayment(inv)}
                              >
                                Tolak
                              </Button>
                              <Button
                                size="sm"
                                className="px-3.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs whitespace-nowrap cursor-pointer"
                                onClick={() => handleApprovePayment(inv)}
                              >
                                Setujui & Tambah Kredit
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              <TablePagination
                {...pendingPg}
                onPageChange={pendingPg.setPage}
                onPageSizeChange={pendingPg.setPageSize}
                noun="tagihan"
              />
            </CardContent>
          </Card>
        </TabsContent>
  );
}
