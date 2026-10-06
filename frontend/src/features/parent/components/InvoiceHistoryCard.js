import React from "react";
import { Receipt } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { EmptyState } from "@/shared/components/EmptyState";
import { TablePagination, usePagination } from "@/shared/components/TablePagination";
import { PARENT_INVOICE_STATUS, invoiceTypeLabel, parentInvoiceStatus } from "@/domain/credit";
import { fmtCurrency, fmtDate } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

// Riwayat semua invoice anak Anda (paket, assessment, cuti) agar ortu bisa memantau status pembayarannya.
// `invoices` = hasil invoicesForParent (sudah milik anak ini, tanpa void).
export function InvoiceHistoryCard({ invoices }) {
  const pg = usePagination(invoices, 10);
  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden" data-testid="parent-invoice-history">
      <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
        <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-sky-600" /> Riwayat Invoice ({invoices.length})
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Semua tagihan anak Anda beserta status pembayarannya. Pembayaran dikonfirmasi oleh tim Finance.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {invoices.length === 0 ? (
          <EmptyState icon={Receipt} title="Belum ada invoice" subtitle="Tagihan yang diterbitkan klinik untuk anak Anda akan tampil di sini." />
        ) : (
          <Table stackOnMobile className="min-w-[720px] w-full" data-testid="parent-invoice-table">
            <TableHeader>
              <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                <TableHead className="font-bold text-slate-700 text-xs py-3 pl-6 whitespace-nowrap">No. Invoice</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Jenis & Keterangan</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Tanggal Terbit</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs text-right whitespace-nowrap">Nominal</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs pr-6 whitespace-nowrap">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pg.pageItems.map((inv) => {
                const key = parentInvoiceStatus(inv);
                const meta = PARENT_INVOICE_STATUS[key];
                return (
                  <TableRow key={inv.id} className="border-b border-slate-100 text-xs" data-testid={`parent-invoice-${inv.id}`}>
                    <TableCell data-nolabel className="pl-6 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">{inv.invoiceNumber}</TableCell>
                    <TableCell data-label="Jenis & Keterangan" className="text-slate-700">
                      <span className="text-[10px] font-bold uppercase text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded mr-1.5">{invoiceTypeLabel(inv)}</span>
                      {inv.packageName}
                    </TableCell>
                    <TableCell data-label="Tanggal Terbit" className="text-slate-600 whitespace-nowrap">{fmtDate(inv.createdAt)}</TableCell>
                    <TableCell data-label="Nominal" className="text-right tabular-nums font-bold text-slate-900 whitespace-nowrap">{fmtCurrency(inv.amount)}</TableCell>
                    <TableCell data-label="Status" className="pr-6">
                      <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold", meta.cls)} data-testid={`parent-invoice-status-${inv.id}`}>{meta.label}</span>
                      {key === "paid" && inv.paidAt && <p className="text-[11px] text-slate-500 mt-0.5">Lunas {fmtDate(inv.paidAt)}</p>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <TablePagination {...pg} onPageChange={pg.setPage} onPageSizeChange={pg.setPageSize} noun="invoice" />
      </CardContent>
    </Card>
  );
}
