import React from "react";
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BranchTag } from "@/components/common/BranchTag";
import { ServiceChips } from "@/components/common/ServiceChips";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/common/TablePagination";

export function DiscontinuedTab({ discPg, discontinuedList, navigate }) {
  return (
    <TabsContent value="discontinued">
          <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-900">
                Catatan Inquiry yang Tidak Berlanjut (Discontinued)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Penyebab dan catatan evaluasi client yang batal atau berhenti di tahap intake
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {discontinuedList.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  Tidak ada intake yang discontinue pada filter saat ini.
                </div>
              ) : (
                <Table stackOnMobile>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 border-b border-slate-200 text-xs">
                      <TableHead className="py-3 pl-6">Client</TableHead>
                      <TableHead>Cabang</TableHead>
                      <TableHead>Layanan Terakhir</TableHead>
                      <TableHead>Alasan / Catatan</TableHead>
                      <TableHead className="text-right pr-6">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discPg.pageItems
                      .map((c) => {
                        return (
                          <TableRow key={c.id} className="border-b border-slate-100 text-xs">
                            <TableCell data-nolabel className="py-3 pl-6 font-bold text-slate-900">{c.clientName}</TableCell>
                            <TableCell data-label="Cabang"><BranchTag branchId={c.branchId} /></TableCell>
                            <TableCell data-label="Layanan Terakhir"><ServiceChips client={c} /></TableCell>
                            <TableCell data-label="Alasan / Catatan" className="text-rose-700 font-medium">
                              {c.dischargeNote || c.notes || "Keluarga memutuskan tunda asesmen / lokasi terlalu jauh"}
                            </TableCell>
                            <TableCell data-nolabel className="text-right pr-6">
                              <Button
                                size="sm"
                                variant="outline"
                                className=""
                                onClick={() => navigate(`/admin-inquiry/pipeline/${c.id}`)}
                              >
                                Tinjau
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            <TablePagination
              {...discPg}
              onPageChange={discPg.setPage}
              onPageSizeChange={discPg.setPageSize}
              noun="client"
            />
          </Card>
        </TabsContent>
  );
}
