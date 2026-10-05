import React, { useState } from "react";
import { canDeleteInvoice, canVoidInvoice, invoiceConversionCount, invoicePackageName, invoiceTypeLabel, isInvoiceConverted, lastInvoiceConversion } from "@/domain/credit";
import { DeleteButton } from "@/shared/components/DeleteControls";
import { TabsContent } from "@/shared/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { BRANCHES } from "@/domain/branch";
import { fmtCurrency, fmtDate } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { getProofFileType } from "@/shared/lib/fileUpload";
import { ArrowRightLeft, Ban, Eye, FileText, History } from "lucide-react";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { TablePagination } from "@/shared/components/TablePagination";
import { ConvertPackageDialog } from "@/features/finance/components/ConvertPackageDialog";
import { InvoiceLogDialog } from "@/features/finance/components/InvoiceLogDialog";
import { VoidInvoiceDialog } from "@/features/finance/components/VoidInvoiceDialog";
import { usePackageConversionActions } from "@/features/finance/hooks/usePackageConversionActions";

export function BillingTab({ invoicesPg, setSelectedProofInvoice, onDeleteInvoice }) {
  const { canConvert } = usePackageConversionActions();
  const [convertInvoice, setConvertInvoice] = useState(null);
  const [logInvoice, setLogInvoice] = useState(null);
  const [voidTarget, setVoidTarget] = useState(null);
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
              <Table stackOnMobile className="min-w-[980px] w-full">
                <TableHeader>
                  <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                    <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6 min-w-[150px] whitespace-nowrap">No. Invoice</TableHead>
                    <TableHead className="font-bold text-slate-700 text-xs min-w-[200px] whitespace-nowrap">Client & Cabang</TableHead>
                    <TableHead className="font-bold text-slate-700 text-xs min-w-[180px] whitespace-nowrap">Paket Layanan</TableHead>
                    <TableHead className="font-bold text-slate-700 text-xs min-w-[150px] whitespace-nowrap">Nominal</TableHead>
                    <TableHead className="font-bold text-slate-700 text-xs min-w-[130px] whitespace-nowrap">Tanggal</TableHead>
                    <TableHead className="font-bold text-slate-700 text-xs min-w-[140px] whitespace-nowrap">Bukti Transfer</TableHead>
                    <TableHead className="font-bold text-slate-700 text-xs min-w-[210px] whitespace-nowrap">Aksi</TableHead>
                    <TableHead className="font-bold text-slate-700 text-xs text-right pr-6 min-w-[130px] whitespace-nowrap">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesPg.pageItems.map((inv) => {
                    const br = BRANCHES.find((b) => b.id === inv.branchId);
                    return (
                      <TableRow key={inv.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <TableCell data-nolabel className="font-mono text-xs font-bold text-slate-900 pl-6 min-w-[150px] whitespace-nowrap">
                          {inv.invoiceNumber}
                        </TableCell>
                        <TableCell data-label="Client & Cabang" className="text-xs min-w-[200px] whitespace-nowrap">
                          <p className="font-bold text-slate-900">{inv.clientName}</p>
                          <span className="text-[11px] text-slate-500 font-medium">{br ? br.name : "—"}</span>
                        </TableCell>
                        <TableCell data-label="Paket Layanan" className="text-xs font-semibold text-slate-800 min-w-[180px] whitespace-nowrap">
                          {invoicePackageName(inv)}
                          <span className="ml-1.5 text-[10px] font-bold uppercase text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded" data-testid={`invoice-type-${inv.id}`}>{invoiceTypeLabel(inv)}</span>
                          {inv.isRenewal && (
                            <span className="ml-1.5 text-[10px] font-bold uppercase text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded" data-testid={`invoice-renewal-${inv.id}`}>Renewal</span>
                          )}
                          {isInvoiceConverted(inv) && (
                            <>
                              <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded" data-testid={`invoice-converted-${inv.id}`}>
                                <ArrowRightLeft className="w-3 h-3" /> Dikonversi{invoiceConversionCount(inv) > 1 ? ` ${invoiceConversionCount(inv)}x` : ""}
                              </span>
                              <span className="block text-[10px] font-semibold text-amber-700" data-testid={`invoice-converted-to-${inv.id}`}>
                                dari {lastInvoiceConversion(inv).data?.fromPackage || inv.packageName}
                                {lastInvoiceConversion(inv).data?.toSessions != null ? ` • ${lastInvoiceConversion(inv).data.toSessions} sesi` : ""}
                              </span>
                            </>
                          )}
                        </TableCell>
                        <TableCell data-label="Nominal" className="text-xs font-bold text-slate-900 tabular-nums min-w-[150px] whitespace-nowrap">
                          {fmtCurrency(inv.amount)}
                          {inv.balanceApplied > 0 && (
                            <span className="mt-0.5 flex flex-col gap-0.5 text-[10px] leading-tight" data-testid={`invoice-balance-${inv.id}`}>
                              <span className="font-medium text-slate-400 line-through decoration-slate-300">{fmtCurrency(inv.grossAmount)}</span>
                              <span className="inline-flex w-fit rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 font-semibold text-amber-700">
                                Saldo −{fmtCurrency(inv.balanceApplied)}
                              </span>
                            </span>
                          )}
                        </TableCell>
                        <TableCell data-label="Tanggal" className="text-xs text-slate-500 tabular-nums min-w-[130px] whitespace-nowrap">{fmtDate(inv.createdAt)}</TableCell>
                        <TableCell data-label="Bukti Transfer" className="text-xs min-w-[140px] whitespace-nowrap">
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
                        <TableCell data-label="Aksi" className="min-w-[200px]">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="px-2.5 min-h-10 md:min-h-0 text-[11px] font-semibold gap-1.5 cursor-pointer"
                              onClick={() => setLogInvoice(inv)}
                              data-testid={`invoice-log-${inv.id}`}
                            >
                              <History className="w-3 h-3 text-slate-500" /> Log
                            </Button>
                            {canVoidInvoice(inv) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="px-2.5 min-h-10 md:min-h-0 text-[11px] font-semibold text-rose-700 border-rose-200 hover:bg-rose-50 gap-1.5 cursor-pointer"
                                onClick={() => setVoidTarget(inv)}
                                data-testid={`void-invoice-${inv.id}`}
                              >
                                <Ban className="w-3 h-3" /> Void
                              </Button>
                            )}
                            {canConvert(inv) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="px-2.5 min-h-10 md:min-h-0 text-[11px] font-semibold text-sky-700 border-sky-200 hover:bg-sky-50 gap-1.5 cursor-pointer"
                                onClick={() => setConvertInvoice(inv)}
                                data-testid={`convert-invoice-${inv.id}`}
                              >
                                <ArrowRightLeft className="w-3 h-3" /> Konversi
                              </Button>
                            )}
                            {canDeleteInvoice(inv) && (
                              <DeleteButton
                                module="finance"
                                label="Hapus"
                                title={`Hapus invoice ${inv.invoiceNumber}?`}
                                description="Invoice belum lunas ini DIHAPUS PERMANEN beserta bukti bayar dan lognya. Saldo lebihan yang dipakainya dikembalikan ke client. Invoice yang sudah lunas tidak bisa dihapus, gunakan Void."
                                onConfirm={() => onDeleteInvoice?.(inv)}
                                testId={`delete-invoice-${inv.id}`}
                              />
                            )}
                          </div>
                        </TableCell>
                        <TableCell data-label="Status" className="text-right pr-6 min-w-[130px] whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <StatusBadge status={inv.status} />
                          </div>
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
          <ConvertPackageDialog invoice={convertInvoice} open={Boolean(convertInvoice)} onOpenChange={(v) => !v && setConvertInvoice(null)} />
          <InvoiceLogDialog invoice={logInvoice} open={Boolean(logInvoice)} onOpenChange={(v) => !v && setLogInvoice(null)} />
          <VoidInvoiceDialog invoice={voidTarget} open={Boolean(voidTarget)} onOpenChange={(v) => !v && setVoidTarget(null)} />
        </TabsContent>
  );
}
