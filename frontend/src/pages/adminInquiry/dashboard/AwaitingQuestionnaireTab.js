import React from "react";
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BranchTag } from "@/components/common/BranchTag";
import { ServiceChips } from "@/components/common/ServiceChips";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/common/TablePagination";

export function AwaitingQuestionnaireTab({ awaitPg, awaitingQuestionnaires, navigate }) {
  return (
    <TabsContent value="awaiting">
          <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Client yang Belum Mengisi Kuesioner Asesmen
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Kode kuesioner sudah diterbitkan, menunggu orang tua menyelesaikan form online
                </CardDescription>
              </div>
              <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-lg">
                {awaitingQuestionnaires.length} Menunggu Follow-up
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {awaitingQuestionnaires.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="Semua kuesioner telah terisi!"
                  subtitle="Tidak ada kuesioner yang tertunda pengisiannya oleh orang tua saat ini."
                />
              ) : (
                <Table stackOnMobile>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                      <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6">Client & Ortu</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Cabang</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Layanan Dipilih</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Kode Kuesioner</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Kontak WhatsApp</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs text-right pr-6">Tindakan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {awaitPg.pageItems.map((c) => {
                      const codes = (c.assessmentCodes || []).map((i) => i.code).join(", ") || c.assessmentAccessCode || "—";

                      return (
                        <TableRow key={c.id} className="border-b border-slate-100 hover:bg-amber-50/20 text-xs">
                          <TableCell data-nolabel className="py-3 pl-6">
                            <p className="font-bold text-slate-900">{c.clientName}</p>
                            <p className="text-[11px] text-slate-500">Ortu: {c.parentName}</p>
                          </TableCell>
                          <TableCell data-label="Cabang">
                            <BranchTag
                              branchId={c.branchId}
                              className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
                            />
                          </TableCell>
                          <TableCell data-label="Layanan Dipilih">
                            <ServiceChips client={c} />
                          </TableCell>
                          <TableCell data-label="Kode Kuesioner">
                            <span className="font-mono font-bold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 tracking-wider">
                              {codes}
                            </span>
                          </TableCell>
                          <TableCell data-label="Kontak WhatsApp">
                            <p className="font-mono text-slate-700">{c.parentContact}</p>
                            <p className="text-[11px] text-slate-400">{c.parentEmail}</p>
                          </TableCell>
                          <TableCell data-nolabel className="text-right pr-6">
                            <div className="flex items-center justify-end gap-2">
                              {c.parentContact && (
                                <a
                                  href={`https://wa.me/${c.parentContact.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                                    `Halo ${c.parentName}, mohon mengisi kuesioner asesmen Therapedia untuk ananda ${c.clientName} dengan kode akses: ${codes}. Buka di: ${window.location.origin}/assessment`
                                  )}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold hover:bg-emerald-100 text-[11px]"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" /> WA Link
                                </a>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="font-bold border-slate-200 hover:bg-sky-50"
                                onClick={() => navigate(`/admin-inquiry/pipeline/${c.id}`)}
                              >
                                Detail Pipeline
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            <TablePagination
              {...awaitPg}
              onPageChange={awaitPg.setPage}
              onPageSizeChange={awaitPg.setPageSize}
              noun="client"
            />
          </Card>
        </TabsContent>
  );
}
