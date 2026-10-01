import React from "react";
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/common/FilterBar";
import { EmptyState } from "@/components/common/EmptyState";
import { ClipboardList } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BranchTag } from "@/components/common/BranchTag";
import { ServiceChips } from "@/components/common/ServiceChips";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/common/TablePagination";

export function FilteredRosterTab({ navigate, rosterPg, searchRoster, searchedRoster, setSearchRoster }) {
  return (
    <TabsContent value="roster">
          <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Daftar Client Sesuai Filter Dashboard ({searchedRoster.length})
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Data intake terkini yang sedang berjalan di pipeline
                </CardDescription>
              </div>
              <SearchInput
                className="w-full sm:w-72 flex-none"
                placeholder="Cari client, ortu, telepon..."
                value={searchRoster}
                onChange={setSearchRoster}
              />
            </CardHeader>
            <CardContent className="p-0">
              {searchedRoster.length === 0 ? (
                <EmptyState icon={ClipboardList} title="Tidak ada data" subtitle="Tidak ada client yang memenuhi kriteria pencarian ini." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                      <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6">Client & Kode</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Cabang</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Layanan</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Tahap Pipeline</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Tagihan</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs text-right pr-6">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rosterPg.pageItems.map((c) => {

                      return (
                        <TableRow key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50 text-xs">
                          <TableCell className="py-3 pl-6">
                            <p className="font-bold text-slate-900">{c.clientName}</p>
                            <p className="font-mono text-[11px] text-slate-500">
                              Kode: {c.clientAccessCode} • {c.parentName}
                            </p>
                          </TableCell>
                          <TableCell>
                            <BranchTag branchId={c.branchId} className="font-semibold text-slate-700" />
                          </TableCell>
                          <TableCell>
                            <ServiceChips client={c} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={c.status} />
                          </TableCell>
                          <TableCell>
                            {c.invoiceStatus === "paid" ? (
                              <span className="font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded text-[11px]">
                                Lunas
                              </span>
                            ) : (
                              <span className="font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded text-[11px]">
                                Belum Ada / Belum Lunas
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button
                              size="sm"
                              className="font-bold bg-sky-600 hover:bg-sky-700 text-white"
                              onClick={() => navigate(`/admin-inquiry/pipeline/${c.id}`)}
                            >
                              Detail
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
              {...rosterPg}
              onPageChange={rosterPg.setPage}
              onPageSizeChange={rosterPg.setPageSize}
              noun="client"
            />
          </Card>
        </TabsContent>
  );
}
