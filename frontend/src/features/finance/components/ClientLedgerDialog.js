import React, { useEffect } from "react";
import { ScrollText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { TablePagination, usePagination } from "@/shared/components/TablePagination";
import { EmptyState } from "@/shared/components/EmptyState";
import { fmtCurrency, fmtDate } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

const money = (v) => (v == null ? "—" : fmtCurrency(v));

// Isi laporan: satu baris per perubahan kredit, dengan nilai rupiah (Per Sesi) dan saldo berjalan.
function LedgerTable({ rows }) {
  // Urut dari yang terlama sampai yang terbaru (sesuai saldo berjalan)
  const pg = usePagination(rows, 10);
  // Buka di halaman terakhir agar saldo terbaru langsung terlihat (sama dengan Saldo di daftar client)
  const { setPage, totalPages } = pg;
  useEffect(() => {
    setPage(totalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (rows.length === 0) return <EmptyState icon={ScrollText} title="Belum ada log kredit" subtitle="Client ini belum punya mutasi kredit." />;
  const current = rows[rows.length - 1]?.balance;
  return (
    <>
      <p className="text-xs font-semibold text-slate-600" data-testid="client-ledger-current-balance">
        Saldo saat ini: <span className="font-extrabold text-slate-900 tabular-nums">{money(current)}</span>
      </p>
      <div className="overflow-x-auto">
        <Table stackOnMobile className="min-w-[1080px] w-full" data-testid="client-ledger-table">
          <TableHeader>
            <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
              <TableHead className="font-bold text-slate-700 text-xs py-3 pl-4 whitespace-nowrap">Oleh</TableHead>
              <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Tanggal & Jam</TableHead>
              <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Terapis</TableHead>
              <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Paket Kredit</TableHead>
              <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Status</TableHead>
              <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Catatan Penjadwalan</TableHead>
              <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Detail</TableHead>
              <TableHead className="font-bold text-slate-700 text-xs text-right whitespace-nowrap">Per Sesi</TableHead>
              <TableHead className="font-bold text-slate-700 text-xs text-right pr-4 whitespace-nowrap">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pg.pageItems.map((r) => (
              <TableRow key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50 text-xs" data-testid={`ledger-row-${r.id}`}>
                <TableCell data-label="Oleh" className="pl-4 py-2.5 text-slate-600 whitespace-nowrap" data-testid={`ledger-by-${r.id}`}>{r.by}</TableCell>
                <TableCell data-nolabel className="py-2.5 font-semibold text-slate-900 whitespace-nowrap">
                  {fmtDate(r.date)}
                  {r.time && <span className="ml-1.5 font-mono text-slate-500">{r.time}</span>}
                </TableCell>
                <TableCell data-label="Terapis" className="text-slate-700 whitespace-nowrap">{r.therapistName || "—"}</TableCell>
                <TableCell data-label="Paket Kredit" className="text-slate-700 whitespace-nowrap">{r.packageName}</TableCell>
                <TableCell data-label="Status" className="whitespace-nowrap">{r.status ? <StatusBadge status={r.status} /> : "—"}</TableCell>
                <TableCell data-label="Catatan Penjadwalan" className="text-slate-600">{r.note || "—"}</TableCell>
                <TableCell data-label="Detail" className="text-slate-600 whitespace-nowrap">{r.detail}</TableCell>
                <TableCell
                  data-label="Per Sesi"
                  className={cn("text-right tabular-nums font-bold whitespace-nowrap", r.amount > 0 && "text-emerald-700", r.amount < 0 && "text-rose-700", !r.amount && "text-slate-400")}
                >
                  {r.amount == null ? "—" : r.amount === 0 ? "-" : `${r.amount > 0 ? "+" : "−"}${fmtCurrency(Math.abs(r.amount))}`}
                </TableCell>
                <TableCell data-label="Saldo" className="text-right pr-4 tabular-nums font-extrabold text-slate-900 whitespace-nowrap">{money(r.balance)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <TablePagination {...pg} onPageChange={pg.setPage} onPageSizeChange={pg.setPageSize} noun="baris" />
    </>
  );
}

// Laporan log kredit + uang satu client (turunan dari ledger kredit; tidak ada data baru yang disimpan).
export function ClientLedgerDialog({ client, rows, open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-2xl p-5 sm:p-6 border-slate-200" data-testid="client-ledger-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-sky-600" /> Log Kredit & Saldo — {client?.clientName}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {client?.clientCode}. Tiap sesi yang memotong kredit mengurangi saldo sebesar harga per sesi paketnya (harga paket ÷ jumlah sesi); top up / renewal menambah saldo sebesar harga paket. Kolom Oleh = staf yang memicu mutasi.
          </DialogDescription>
        </DialogHeader>
        {open && <LedgerTable key={client?.id} rows={rows} />}
      </DialogContent>
    </Dialog>
  );
}
