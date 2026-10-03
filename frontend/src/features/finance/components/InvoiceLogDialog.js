import React from "react";
import { History } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { cn } from "@/shared/lib/utils";
import { invoiceLogMeta, invoiceLogsOf } from "@/domain/credit";

const TONE = {
  info: "bg-sky-50 text-sky-800 border-sky-200",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  danger: "bg-rose-50 text-rose-800 border-rose-200",
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
};

const fmtAt = (at) => {
  if (!at) return "—";
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? at : d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: at.length > 10 ? "short" : undefined });
};

// Log milik invoice sendiri (invoice.logs), terbaru di atas. Terpisah dari audit log.
export function InvoiceLogDialog({ invoice, open, onOpenChange }) {
  const logs = [...invoiceLogsOf(invoice)].reverse();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-2xl p-6 border-slate-200" data-testid="invoice-log-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-sky-600" /> Log Invoice
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">{invoice ? `${invoice.invoiceNumber} • ${invoice.clientName}` : ""}</DialogDescription>
        </DialogHeader>
        <ol className="space-y-2.5 pt-2" data-testid="invoice-log-list">
          {logs.map((log) => {
            const meta = invoiceLogMeta(log.action);
            return (
              <li key={log.id} className="rounded-xl border border-slate-200 p-3 text-xs space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={cn("px-2 py-0.5 rounded-lg border text-[11px] font-bold", TONE[meta.tone] || TONE.neutral)}>{meta.label}</span>
                  <span className="text-[11px] text-slate-500 tabular-nums">{fmtAt(log.at)}{log.by ? ` • ${log.by}` : ""}</span>
                </div>
                {log.note && <p className="text-slate-700">{log.note}</p>}
              </li>
            );
          })}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
