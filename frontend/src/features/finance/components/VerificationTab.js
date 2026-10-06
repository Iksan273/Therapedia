import React from "react";
import { TabsContent } from "@/shared/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/components/EmptyState";
import { CheckCircle2, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { BRANCHES } from "@/domain/branch";
import { fmtCurrency } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { DeleteButton } from "@/shared/components/DeleteControls";
import { ProofFileButton } from "@/shared/components/ProofFileButton";
import { TablePagination } from "@/shared/components/TablePagination";

export function VerificationTab({ handleApprovePayment, pendingInvoices, pendingPg, onDeleteInvoice, setSelectedProofInvoice, onUploadProof }) {
  return (
    <TabsContent value="verification" className="space-y-4">
          <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-900">
                Tagihan Menunggu Pembayaran ({pendingInvoices.length})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Invoice Assessment: ortu wajib mengunggah bukti transfer sebelum mengisi kuesioner. Klik Lihat Bukti untuk memeriksanya, lalu tandai lunas setelah pembayaran diterima; invoice paket langsung mengaktifkan kredit.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {pendingInvoices.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="Tidak Ada Tagihan Menunggu"
                  subtitle="Semua tagihan sudah lunas."
                />
              ) : (
                <Table stackOnMobile className="min-w-[760px] w-full">
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                      <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6 min-w-[160px] whitespace-nowrap">No. Invoice</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs min-w-[200px] whitespace-nowrap">Nama Client & Cabang</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs min-w-[190px] whitespace-nowrap">Paket & Nominal</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs text-right pr-6 min-w-[240px] whitespace-nowrap">Tindakan</TableHead>
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
                          <TableCell data-nolabel className="text-right pr-6 py-4 min-w-[240px] whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                              {!(inv.proofOfPaymentUrl || inv.proofUrl) && onUploadProof && (
                                <ProofFileButton
                                  label="Upload Bukti"
                                  className="px-3 font-bold gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 whitespace-nowrap cursor-pointer"
                                  onFile={(file) => onUploadProof(inv, file)}
                                  testId={`upload-proof-${inv.id}`}
                                />
                              )}
                              {(inv.proofOfPaymentUrl || inv.proofUrl) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="px-3 font-bold gap-1.5 border-sky-200 text-sky-700 hover:bg-sky-50 whitespace-nowrap cursor-pointer"
                                  onClick={() => setSelectedProofInvoice?.(inv)}
                                  data-testid={`view-proof-${inv.id}`}
                                >
                                  <Eye className="w-3.5 h-3.5" /> Lihat Bukti
                                </Button>
                              )}
                              <Button
                                size="sm"
                                className="px-3.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs whitespace-nowrap cursor-pointer"
                                onClick={() => handleApprovePayment(inv)}
                              >
                                Tandai Lunas
                              </Button>
                              <DeleteButton
                                module="finance"
                                iconOnly
                                label={`Hapus invoice ${inv.invoiceNumber}`}
                                title={`Hapus invoice ${inv.invoiceNumber}?`}
                                description="Invoice belum lunas ini DIHAPUS PERMANEN beserta bukti bayar dan lognya. Saldo lebihan yang dipakainya dikembalikan ke client."
                                onConfirm={() => onDeleteInvoice?.(inv)}
                                testId={`delete-pending-invoice-${inv.id}`}
                              />
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
