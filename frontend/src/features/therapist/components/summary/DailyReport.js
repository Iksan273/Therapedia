import React from "react";
import { CalendarCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { EmptyState } from "@/shared/components/EmptyState";
import { fmtDate } from "@/shared/lib/format";
import { formatHours } from "@/domain/schedule";

// Rekap harian sesi completed untuk report terapis: per tanggal tampil hari, jumlah sesi, total jam, dan client yang ditangani.
// Contoh baris: "Kamis, 25/10/2026 • 3 Hours • Aira, Bima, Citra". `rows` = hasil `dailySessionReport` (halaman aktif),
// `totals` = ringkasan seluruh hasil filter.
export function DailyReport({ rows, totals, getDayName }) {
  return (
    <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden" data-testid="daily-report">
      <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
        <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <CalendarCheck className="w-4 h-4 text-sky-600" /> Rekap Harian Sesi Selesai
        </CardTitle>
        <CardDescription className="text-xs text-slate-500" data-testid="daily-report-totals">
          {totals.days} hari • {totals.sessions} sesi • <strong className="text-slate-800">{formatHours(totals.hours)}</strong> • {totals.clients} client berbeda (sesuai filter periode)
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {rows.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="Belum ada sesi selesai" subtitle="Ubah periode atau filter untuk melihat rekap harian." />
        ) : (
          <Table stackOnMobile className="min-w-[640px] w-full" data-testid="daily-report-table">
            <TableHeader>
              <TableRow className="bg-slate-50/70 border-b border-slate-200">
                <TableHead className="font-bold text-slate-700 text-xs py-3 pl-6">Hari & Tanggal</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs text-center">Sesi</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs text-center">Total Jam</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs pr-6">Client</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.date} className="border-b border-slate-100 text-xs align-top" data-testid={`daily-report-row-${r.date}`}>
                  <TableCell data-nolabel className="py-3 pl-6 font-semibold text-slate-900 whitespace-nowrap">
                    {getDayName(r.date)}, {fmtDate(r.date)}
                  </TableCell>
                  <TableCell data-label="Sesi" className="text-center tabular-nums">{r.sessions}</TableCell>
                  <TableCell data-label="Total Jam" className="text-center font-bold tabular-nums text-sky-800" data-testid={`daily-report-hours-${r.date}`}>{formatHours(r.hours)}</TableCell>
                  <TableCell data-label="Client" className="pr-6 text-slate-700" data-testid={`daily-report-clients-${r.date}`}>
                    {r.clients.map((c) => c.name).join(", ")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
