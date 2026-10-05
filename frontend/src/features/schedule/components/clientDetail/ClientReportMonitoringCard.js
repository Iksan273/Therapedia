import React, { useMemo } from "react";
import { FileWarning, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Button } from "@/shared/ui/button";
import { TablePagination, usePagination } from "@/shared/components/TablePagination";
import { isUnreportedSession } from "@/domain/schedule";
import { fmtDate } from "@/shared/lib/format";

// Monitoring laporan per client: sesi Completed yang laporannya (Activity / Note / Homework) belum diisi terapis.
// Versi per client dari halaman Monitoring Laporan Sesi (view v_unreported_sessions difilter client_id).
export function ClientReportMonitoringCard({ sessions, getTherapistName, onOpenSession }) {
  const unreported = useMemo(
    () => sessions.filter(isUnreportedSession).sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)),
    [sessions]
  );
  const pg = usePagination(unreported, 10);

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden" data-testid="client-report-monitoring">
      <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
        <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <FileWarning className="w-4 h-4 text-amber-600" /> Monitoring Laporan Sesi ({unreported.length} belum dilaporkan)
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Sesi Completed client ini yang laporan klinisnya (Activity, Note, Homework) belum diisi terapis.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {unreported.length === 0 ? (
          <p className="flex items-center gap-2 p-5 text-xs font-semibold text-emerald-700" data-testid="client-report-monitoring-empty">
            <CheckCircle2 className="w-4 h-4" /> Semua laporan sesi Completed sudah terisi.
          </p>
        ) : (
          <Table stackOnMobile className="min-w-[560px] w-full">
            <TableHeader>
              <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6 whitespace-nowrap">Tanggal & Jam</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Terapis</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs text-right pr-6 whitespace-nowrap">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pg.pageItems.map((s) => (
                <TableRow key={s.id} className="border-b border-slate-100 hover:bg-amber-50/30 text-xs" data-testid={`unreported-row-${s.id}`}>
                  <TableCell data-nolabel className="pl-6 py-3 font-semibold text-slate-900 whitespace-nowrap">
                    {fmtDate(s.date)} • <span className="font-mono text-slate-500">{s.startTime}–{s.endTime}</span>
                  </TableCell>
                  <TableCell data-label="Terapis" className="font-medium text-slate-700 whitespace-nowrap">{getTherapistName(s.therapistId)}</TableCell>
                  <TableCell data-label="Detail" className="text-right pr-6 whitespace-nowrap">
                    <Button size="sm" variant="ghost" className="font-bold text-sky-700 hover:bg-sky-50 cursor-pointer" onClick={() => onOpenSession(s)}>
                      Lihat
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {unreported.length > 0 && <TablePagination {...pg} onPageChange={pg.setPage} onPageSizeChange={pg.setPageSize} noun="sesi" />}
      </CardContent>
    </Card>
  );
}
