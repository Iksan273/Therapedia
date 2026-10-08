import React, { useEffect } from "react";
import { ScrollText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { TablePagination, usePagination } from "@/shared/components/TablePagination";
import { EmptyState } from "@/shared/components/EmptyState";
import { fmtCurrency, fmtDate } from "@/shared/lib/format";
import { LogExportButtons } from "@/shared/components/LogExportButtons";
import { STATUS_META } from "@/domain/status";
import { BRANCHES } from "@/domain/branch";
import { cn } from "@/shared/lib/utils";

const money = (v) => (v == null ? "—" : fmtCurrency(v));

// Isi laporan: satu baris per perubahan kredit, dengan nilai rupiah (Per Sesi) dan saldo berjalan.
function LedgerTable({ rows, onEditNote }) {
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
        <Table stackOnMobile className="min-w-[1280px] w-full" data-testid="client-ledger-table">
          <TableHeader>
            <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
              <TableHead className="font-bold text-slate-700 text-xs py-3 pl-4 whitespace-nowrap">Oleh</TableHead>
              <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Tanggal & Jam</TableHead>
              <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Terapis</TableHead>
              <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Paket Kredit</TableHead>
              <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Status</TableHead>
              <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Catatan Penjadwalan</TableHead>
              <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Catatan</TableHead>
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
                <TableCell data-label="Catatan" className="min-w-[200px] text-slate-700" data-testid={`ledger-note-${r.id}`}>
                  {r.historyNote && <p className="whitespace-pre-wrap">{r.historyNote}</p>}
                  {r.scheduleId ? (
                    <button type="button" className="min-h-10 text-[11px] font-bold text-sky-700 hover:underline cursor-pointer" onClick={() => onEditNote(r.scheduleId)} data-testid={`ledger-note-edit-${r.id}`}>
                      {r.historyNote ? "Ubah Catatan" : "Tambah Catatan"}
                    </button>
                  ) : (
                    !r.historyNote && "—"
                  )}
                </TableCell>
                <TableCell data-label="Detail" className="text-slate-600 whitespace-nowrap">
                  {r.detail}
                  {r.reasonCode && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono text-[11px] font-black text-slate-800" data-testid={`ledger-reason-${r.id}`}>
                      {r.reasonCode}
                    </span>
                  )}
                  {r.leaveChange < 0 && <span className="ml-1.5 text-[11px] font-bold text-violet-700">credit leave {r.leaveChange}</span>}
                </TableCell>
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

const signed = (v) => (v == null ? "—" : v === 0 ? "-" : `${v > 0 ? "+" : "−"}${fmtCurrency(Math.abs(v))}`);

// Spesifikasi unduhan (PDF/Excel) untuk satu log paket; teks sudah diformat.
function buildLedgerExportSpec(client, packageLabel, rows) {
  return {
    title: "Log Kredit & Saldo",
    meta: [
      { label: "Nama Anak", value: client?.clientName },
      { label: "Kode Client", value: client?.clientCode },
      { label: "Cabang", value: BRANCHES.find((b) => b.id === client?.branchId)?.name },
      { label: "Paket", value: packageLabel },
      { label: "Saldo Saat Ini", value: money(rows[rows.length - 1]?.balance) },
    ],
    columns: [
      { key: "by", label: "Oleh", width: "80px" },
      { key: "date", label: "Tanggal", width: "78px" },
      { key: "time", label: "Jam", width: "80px" },
      { key: "therapist", label: "Terapis", width: "110px" },
      { key: "status", label: "Status", width: "80px" },
      { key: "detail", label: "Detail" },
      { key: "bookingNote", label: "Catatan Penjadwalan" },
      { key: "note", label: "Catatan" },
      { key: "change", label: "Kredit", align: "right", width: "50px" },
      { key: "amount", label: "Per Sesi", align: "right", width: "90px" },
      { key: "balance", label: "Saldo", align: "right", width: "100px" },
    ],
    rows: rows.map((r) => ({
      by: r.by,
      date: fmtDate(r.date),
      time: r.time,
      therapist: r.therapistName,
      status: r.status ? STATUS_META[r.status]?.label || r.status : "",
      detail: [r.detail, r.reasonCode, r.leaveChange < 0 ? `credit leave ${r.leaveChange}` : ""].filter(Boolean).join(" • "),
      bookingNote: r.note,
      note: r.historyNote,
      change: r.creditChange ? `${r.creditChange > 0 ? "+" : ""}${r.creditChange}` : "0",
      amount: signed(r.amount),
      balance: money(r.balance),
    })),
  };
}

// Laporan log kredit + uang satu client (turunan dari ledger kredit; tidak ada data baru yang disimpan).
export function ClientLedgerDialog({ client, packageLabel, rows, open, onOpenChange, onEditNote }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-2xl p-5 sm:p-6 border-slate-200" data-testid="client-ledger-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-sky-600" /> Log Kredit & Saldo — {client?.clientName}{packageLabel ? ` • ${packageLabel}` : ""}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {client?.clientCode}. Log ini khusus satu paket. Tiap sesi yang memotong kredit mengurangi saldo sebesar harga per sesi paketnya (harga paket ÷ jumlah sesi); top up / renewal menambah saldo sebesar harga paket. Kolom Oleh = staf yang memicu mutasi.
          </DialogDescription>
        </DialogHeader>
        {open && rows.length > 0 && (
          <LogExportButtons spec={buildLedgerExportSpec(client, packageLabel, rows)} filename={`log-kredit-${client?.clientCode}-${packageLabel}`} testIdPrefix="ledger-export" />
        )}
        {open && <LedgerTable key={`${client?.id}:${packageLabel}`} rows={rows} onEditNote={onEditNote} />}
      </DialogContent>
    </Dialog>
  );
}
