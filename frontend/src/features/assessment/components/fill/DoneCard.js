import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";

export function DoneCard({ client }) {
  return (
    <Card className="rounded-2xl border border-slate-200/90 shadow-sm bg-white overflow-hidden clinical-card" data-testid="assessment-success-card">
      <CardContent className="p-5 sm:p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">Kuesioner Berhasil Dikirimkan</h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Terima kasih Ayah / Bunda atas pengisian kuesioner observasi perkembangan untuk{" "}
            <strong className="text-slate-900 font-bold">{client?.clientName || "anak"}</strong>.
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 text-left space-y-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            Konfirmasi Proses Selanjutnya
          </p>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            Seluruh data jawaban Anda telah tersimpan rapi dan akan dipelajari oleh tim psikolog klinis / terapis okupasi kami sebagai bahan evaluasi tatap muka.
          </p>
          <p className="text-xs sm:text-sm text-emerald-900 font-semibold leading-relaxed">
            Silakan lakukan konfirmasi ke Admin / Customer Care Therapedia untuk penjadwalan sesi asesmen langsung di klinik.
          </p>
        </div>

        {client && (
          <a
            href={`https://wa.me/6281234567890?text=${encodeURIComponent(
              `Halo Admin Therapedia, saya orang tua dari ${client.clientName} (Kode Klien: ${client.clientCode || "-"}). Saya sudah selesai mengisi kuesioner asesmen. Mohon bantuan untuk konfirmasi dan proses selanjutnya ya. Terima kasih!`
            )}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full min-h-12 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition-colors"
          >
            <MessageCircle className="w-4 h-4" /> Konfirmasi ke Admin Therapedia via WhatsApp
          </a>
        )}

        <div className="pt-2">
          <Link to="/login">
            <Button variant="outline" className="border-slate-200 font-semibold w-full sm:w-auto min-h-11">
              Ke Halaman Masuk
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
