import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import { fmtCurrency, fmtDate } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Eye } from "lucide-react";

export function InvoiceCard({ latestInvoice, setProofModalOpen }) {
  return (
    <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                7
              </span>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Tagihan Invoice & Bukti Pembayaran</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Diskusi via WA → Tagihan diinput Finance → Ortu upload bukti transfer di portal
                </CardDescription>
              </div>
            </div>
            {latestInvoice ? (
              <span
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold border",
                  latestInvoice.status === "paid"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                )}
              >
                {latestInvoice.status === "paid" ? "LUNAS TERVERIFIKASI" : "MENUNGGU PEMBAYARAN"}
              </span>
            ) : (
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                BELUM ADA INVOICE
              </span>
            )}
          </CardHeader>
          <CardContent className="p-4 text-xs text-slate-600">
            {latestInvoice ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">
                    {latestInvoice.invoiceNumber} — {latestInvoice.packageName}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Nominal: {fmtCurrency(latestInvoice.amount)} • Terbit: {fmtDate(latestInvoice.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {latestInvoice.proofOfPaymentUrl || latestInvoice.proofUrl ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 font-bold flex items-center gap-1.5 cursor-pointer"
                      onClick={() => setProofModalOpen(true)}
                    >
                      <Eye className="w-3.5 h-3.5" /> Lihat Bukti Transfer
                    </Button>
                  ) : (
                    <span className="text-xs text-amber-600 italic">Menunggu upload slip dari ortu</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-amber-900">
                Tagihan belum diinput oleh Finance. Setelah diskusi paket dengan orang tua melalui WhatsApp, tim Finance akan memasukkan invoice tagihan agar orang tua dapat mengupload bukti transfer.
              </div>
            )}
          </CardContent>
        </Card>
  );
}
