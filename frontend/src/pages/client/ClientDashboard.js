import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarHeart,
  Sparkles,
  Wallet,
  Clock,
  User,
  HeartHandshake,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Upload,
  BookOpen,
  Home,
  ArrowRight,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/common/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useClients } from "@/context/ClientsContext";
import { useSchedules } from "@/context/SchedulesContext";
import { useCredits } from "@/context/CreditsContext";
import { useTherapists } from "@/context/TherapistsContext";
import { fmtDate, fmtCurrency, todayStr, BRANCHES } from "@/lib/appUtils";
import { cn } from "@/lib/utils";

export default function ClientDashboard() {
  const { auth } = useAuth();
  const { getClient } = useClients();
  const { schedules } = useSchedules();
  const { getRecordForClient, getInvoicesForClient, uploadPaymentProof } = useCredits();
  const { getTherapist } = useTherapists();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [proofUrl, setProofUrl] = useState("https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=400");

  const client = getClient(auth.clientId);
  const record = client ? getRecordForClient(client.id) : null;
  const invoices = client ? getInvoicesForClient(client.id) : [];
  const latestInvoice = invoices.length > 0 ? invoices[0] : null;

  // RULE: Only COMPLETED sessions appear in parent history!
  const completedHistory = useMemo(() => {
    return schedules
      .filter((s) => s.clientId === auth.clientId && s.status === "completed")
      .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
  }, [schedules, auth.clientId]);

  if (!client) {
    return <EmptyState icon={Sparkles} title="Sesi Berakhir" subtitle="Silakan login kembali dengan kode unik client Anda." />;
  }

  const br = BRANCHES.find((b) => b.id === client.branchId);
  const isInvoicePaid = latestInvoice && latestInvoice.status === "paid";

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (latestInvoice) {
      uploadPaymentProof({
        invoiceId: latestInvoice.id,
        clientId: client.id,
        proofUrl,
      });
      toast.success("Bukti transfer pembayaran berhasil diupload! Tim Finance akan memverifikasinya.");
      setUploadOpen(false);
    } else {
      toast.error("Belum ada tagihan invoice aktif dari klinik.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="client-dashboard-page">
      {/* Welcome Family Header */}
      <div className="rounded-2xl bg-gradient-to-r from-sky-600 to-sky-800 text-white p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/15 text-sky-100 text-xs font-semibold backdrop-blur-xs">
              <HeartHandshake className="w-3.5 h-3.5" />
              Parent & Family Care Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Halo, Orang Tua {client.clientName}!
            </h1>
            <p className="text-xs sm:text-sm text-sky-100/90 font-medium">
              Pantau perkembangan ananda di <strong>Therapedia ({br ? br.name : "Surabaya"})</strong>.
            </p>
          </div>
          <div className="shrink-0 bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/20 text-right">
            <p className="text-[10px] uppercase font-bold tracking-wider text-sky-200">Kode Unik Client</p>
            <p className="font-mono text-base font-black text-white">{client.clientAccessCode}</p>
          </div>
        </div>
      </div>

      {/* STATUS TAGIHAN INVOICE (MERAH JIKA BELUM LUNAS, HIJAU JIKA SUDAH LUNAS) */}
      <Card
        className={cn(
          "rounded-2xl border-2 shadow-2xs overflow-hidden transition-all",
          isInvoicePaid
            ? "bg-emerald-50/70 border-emerald-400 text-emerald-950"
            : "bg-rose-50/70 border-rose-400 text-rose-950"
        )}
      >
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div
                className={cn(
                  "w-11 h-11 rounded-2xl flex items-center justify-center font-bold shrink-0 shadow-xs",
                  isInvoicePaid ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                )}
              >
                {isInvoicePaid ? <CheckCircle2 className="w-6 h-6" /> : <Receipt className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base sm:text-lg">
                    {isInvoicePaid ? "Status Tagihan: 🟢 LUNAS TERVERIFIKASI" : "Status Tagihan: 🔴 MENUNGGU PEMBAYARAN"}
                  </h3>
                </div>
                <p className="text-xs mt-1 leading-relaxed opacity-90">
                  {isInvoicePaid
                    ? `Terima kasih! Pembayaran untuk ${latestInvoice.packageName} sebesar ${fmtCurrency(
                        latestInvoice.amount
                      )} telah diverifikasi lunas oleh tim Finance.`
                    : latestInvoice
                    ? `Tagihan ${latestInvoice.invoiceNumber} (${latestInvoice.packageName}) sebesar ${fmtCurrency(
                        latestInvoice.amount
                      )} belum terverifikasi. Silakan upload bukti transfer bank Anda.`
                    : "Belum ada tagihan invoice yang diterbitkan untuk ananda. Tim admin/finance akan menghubungi via WhatsApp untuk konfirmasi paket."}
                </p>
              </div>
            </div>

            {!isInvoicePaid && latestInvoice && (
              <Button
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs h-10 gap-2 shrink-0 shadow-sm shadow-rose-600/20"
                onClick={() => setUploadOpen(true)}
              >
                <Upload className="w-4 h-4" /> Upload Bukti Transfer
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Saldo Kredit Sesi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-2xs p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-sky-600" /> Saldo Kredit Sesi Terapi
            </h3>
            <span className="font-bold text-xs text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-lg border border-sky-200">
              {record ? record.remainingCredit : 0} Sesi Sisa
            </span>
          </div>
          <div className="space-y-2 text-xs">
            {(record?.packages || []).length === 0 ? (
              <p className="text-slate-400 italic">Belum ada paket terapi aktif.</p>
            ) : (
              (record?.packages || []).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-800">{p.packageName}</span>
                  <span className="font-mono font-black text-slate-900">{p.remainingCredit} / {p.totalCredit} Sesi</span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Link Google Drive Portofolio */}
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-2xs p-5 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-purple-600" /> Arsip Klinis Digital
              </h3>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                Google Drive
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Akses folder Google Drive khusus ananda untuk melihat rekaman video observasi dan salinan dokumen laporan asesmen klinis.
            </p>
          </div>
          {client.gdriveClientLink ? (
            <a
              href={client.gdriveClientLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Buka Google Drive Ananda
            </a>
          ) : (
            <span className="text-xs text-slate-400 italic text-center py-2">Link folder sedang dipersiapkan tim klinik.</span>
          )}
        </Card>
      </div>

      {/* RIWAYAT SESI HANYA YANG COMPLETED */}
      <Card className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Riwayat Sesi Terapi yang Telah Selesai ({completedHistory.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Dokumentasi aktivitas terapi dan instruksi PR latihan di rumah dari praktisi terapis
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {completedHistory.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Belum ada sesi terapi yang berstatus selesai (Completed).
            </div>
          ) : (
            completedHistory.map((s) => {
              const th = getTherapist(s.therapistId);
              return (
                <div
                  key={s.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <div>
                      <span className="font-extrabold text-sm text-slate-900">{fmtDate(s.date)}</span>
                      <span className="font-mono text-xs text-slate-500 ml-2">({s.startTime} – {s.endTime})</span>
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      Praktisi: {th ? th.name : "Terapis"}
                    </span>
                  </div>

                  {/* Activity Section */}
                  <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                    <p className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-sky-600" /> Aktivitas Klinis Terapi (Activity Section):
                    </p>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {s.activitySection || s.progressNote || "Aktivitas stimulasi sensori dan latihan okupasi telah dilaksanakan dengan baik."}
                    </p>
                  </div>

                  {/* Homework Section */}
                  <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200 space-y-1">
                    <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <Home className="w-3.5 h-3.5 text-emerald-600" /> PR & Latihan Mandiri di Rumah (Homework Section):
                    </p>
                    <p className="text-xs text-emerald-900 leading-relaxed">
                      {s.homeworkSection || "Lanjutkan stimulasi harian sesuai panduan terapis saat evaluasi."}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Modal Upload Bukti Transfer */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-sky-600" /> Upload Bukti Transfer Pembayaran
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Lampirkan tautan atau konfirmasi foto slip transfer bank untuk memverifikasi invoice ananda.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUploadSubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Nomor Invoice Tagihan</Label>
              <Input
                className="rounded-xl border-slate-200 bg-slate-100 text-xs font-mono font-bold"
                value={latestInvoice ? `${latestInvoice.invoiceNumber} (${fmtCurrency(latestInvoice.amount)})` : "—"}
                disabled
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Link Foto Bukti Transfer / File URL *</Label>
              <Input
                className="rounded-xl border-slate-200 bg-slate-50 text-xs font-mono"
                placeholder="https://..."
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
              />
            </div>
            <DialogFooter className="mt-4 gap-2">
              <Button type="button" variant="outline" className="rounded-xl text-xs" onClick={() => setUploadOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs">
                Kirim Bukti Transfer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
