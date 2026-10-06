import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarHeart, Wallet, HeartHandshake, CheckCircle2, BookOpen, StickyNote, Home, ExternalLink, FileText, RefreshCw, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { EmptyState } from "@/shared/components/EmptyState";
import DateFilterPicker from "@/shared/components/DateFilterPicker";
import { TablePagination, usePagination } from "@/shared/components/TablePagination";
import { useAuth } from "@/stores/authStore";
import { useClients } from "@/stores/clientsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useCredits } from "@/stores/creditsStore";
import { useTherapists } from "@/stores/therapistsStore";
import { fmtDate } from "@/shared/lib/format";
import { BRANCHES } from "@/domain/branch";
import { filterSessionsByDate, isReportEmpty } from "@/domain/schedule";
import { distinctActivePackages, invoicesForParent } from "@/domain/credit";
import { InvoiceHistoryCard } from "@/features/parent/components/InvoiceHistoryCard";
import { buildSessionReportsHtml, printHtmlDocument } from "@/shared/lib/reportExport";

export default function ClientDashboard() {
  const { auth } = useAuth();
  const { getClient } = useClients();
  const { schedules } = useSchedules();
  const { getRecordForClient, getInvoicesForClient } = useCredits();
  const { getTherapist } = useTherapists();

  const [selectedReportSession, setSelectedReportSession] = useState(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const client = getClient(auth.clientId);
  const record = client ? getRecordForClient(client.id) : null;
  const activePackages = distinctActivePackages(record?.packages, { fallbackLast: true });

  const parentInvoices = useMemo(() => invoicesForParent(client ? getInvoicesForClient(client.id) : [], client?.id), [client, getInvoicesForClient]); // riwayat invoice (semua jenis, tanpa void)

  // RULE: Only COMPLETED sessions appear in parent history!
  const completedHistory = useMemo(() => {
    return schedules
      .filter((s) => s.clientId === auth.clientId && s.status === "completed")
      .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
  }, [schedules, auth.clientId]);

  // Filter tanggal riwayat (yyyy-MM-dd) + pagination
  const [historyFrom, setHistoryFrom] = useState("");
  const [historyTo, setHistoryTo] = useState("");
  const invalidRange = Boolean(historyFrom && historyTo && historyFrom > historyTo);
  const filteredHistory = useMemo(
    () => filterSessionsByDate(completedHistory, historyFrom, historyTo),
    [completedHistory, historyFrom, historyTo]
  );
  const historyPg = usePagination(filteredHistory, 10, `${historyFrom}|${historyTo}`);
  // Kembali ke atas list saat pindah halaman / ubah jumlah per halaman
  const historyListRef = React.useRef(null);
  React.useEffect(() => {
    historyListRef.current?.scrollTo?.({ top: 0 });
  }, [historyPg.page, historyPg.pageSize]);
  const resetHistoryFilter = () => {
    setHistoryFrom("");
    setHistoryTo("");
  };

  // Export laporan sesi: dokumen cetak (simpan sebagai PDF lewat dialog cetak). Hanya sesi yang laporannya sudah terisi.
  const exportSessions = (list) => {
    const items = list
      .filter((s) => !isReportEmpty(s))
      .map((s) => ({
        dateLabel: fmtDate(s.date),
        timeLabel: `${s.startTime} – ${s.endTime}`,
        therapistName: getTherapist(s.therapistId)?.name,
        activity: s.activitySection,
        note: s.noteSection || s.progressNote,
        homework: s.homeworkSection,
      }));
    if (items.length === 0) {
      toast.info("Belum ada laporan sesi yang terisi untuk diexport.");
      return;
    }
    const branch = BRANCHES.find((b) => b.id === client?.branchId);
    const html = buildSessionReportsHtml(items, {
      clientName: client?.clientName,
      clientCode: client?.clientCode,
      branchName: branch ? `Therapedia ${branch.name}` : undefined,
      generatedLabel: fmtDate(new Date().toISOString().slice(0, 10)),
      logoUrl: `${window.location.origin}/images/therapedia_logo.png`,
    });
    if (!printHtmlDocument(html)) toast.error("Jendela cetak diblokir browser. Izinkan pop-up lalu coba lagi.");
  };

  if (!client) {
    return <EmptyState icon={CalendarHeart} title="Sesi Berakhir" subtitle="Silakan login kembali dengan kode unik client Anda." />;
  }

  const br = BRANCHES.find((b) => b.id === client.branchId);

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="client-dashboard-page">
      {/* Welcome Family Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#007AFF] via-[#0062cc] to-[#004bb5] text-white p-6 sm:p-7 shadow-md shadow-[#007AFF]/20 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-xs border border-white/20">
              <HeartHandshake className="w-3.5 h-3.5 text-cyan-200" />
              Parent & Family Care Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Halo, Orang Tua {client.clientName}!
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 font-medium">
              Pantau perkembangan {client.clientName} di <strong>Therapedia ({br ? br.name : "—"})</strong>.
            </p>
          </div>
          <div className="shrink-0 bg-white/15 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/25 text-right shadow-xs">
            <p className="text-[11px] uppercase font-bold tracking-wider text-cyan-200">Kode Unik Client</p>
            <p className="font-mono text-base font-black text-white">{client.clientCode}</p>
          </div>
        </div>
      </div>

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
            {activePackages.length === 0 ? (
              <p className="text-slate-400 italic">Belum ada paket terapi aktif.</p>
            ) : (
              activePackages.map((p) => (
                <div key={p.name} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-800">{p.name}</span>
                  <span className="font-mono font-black text-slate-900">{p.remainingCredit} Sesi</span>
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
              <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                Google Drive
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Akses folder Google Drive khusus {client.clientName} untuk melihat rekaman video observasi dan salinan dokumen laporan asesmen klinis.
            </p>
          </div>
          {client.gdriveClientLink ? (
            <a
              href={client.gdriveClientLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Buka Google Drive {client.clientName}
            </a>
          ) : (
            <span className="text-xs text-slate-400 italic text-center py-2">Link folder sedang dipersiapkan tim klinik.</span>
          )}
        </Card>
      </div>

      {/* RIWAYAT INVOICE anak (semua jenis, tanpa void) */}
      <InvoiceHistoryCard invoices={parentInvoices} />

      {/* RIWAYAT SESI HANYA YANG COMPLETED */}
      <Card className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 space-y-3">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Riwayat Sesi Terapi yang Telah Selesai ({completedHistory.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Daftar sesi terapi yang telah selesai. Klik &ldquo;View Report&rdquo; untuk melihat detail catatan klinis dan PR latihan.
            </CardDescription>
          </div>

          {completedHistory.length > 0 && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="font-bold gap-1.5 cursor-pointer"
                onClick={() => exportSessions(filteredHistory)}
                data-testid="export-all-reports"
              >
                <Download className="w-3.5 h-3.5" /> Export Laporan{historyFrom || historyTo ? " (sesuai filter)" : ""}
              </Button>
            </div>
          )}

          {/* Filter tanggal sesi */}
          {completedHistory.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_auto] gap-2 sm:gap-3 items-end" data-testid="history-date-filter">
              <label className="space-y-1 min-w-0">
                <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Dari tanggal</span>
                <DateFilterPicker
                  placeholder="DD/MM/YYYY"
                  className="w-full bg-white"
                  value={historyFrom}
                  onChange={(e) => setHistoryFrom(e?.target?.value ?? e ?? "")}
                  data-testid="history-filter-from"
                />
              </label>
              <label className="space-y-1 min-w-0">
                <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Sampai tanggal</span>
                <DateFilterPicker
                  placeholder="DD/MM/YYYY"
                  className="w-full bg-white"
                  value={historyTo}
                  onChange={(e) => setHistoryTo(e?.target?.value ?? e ?? "")}
                  data-testid="history-filter-to"
                />
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={resetHistoryFilter}
                disabled={!historyFrom && !historyTo}
                className="col-span-2 sm:col-span-1 h-10 border-slate-200 text-slate-600 font-semibold gap-1.5 cursor-pointer"
                data-testid="history-filter-reset"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset
              </Button>
              {invalidRange && (
                <p className="col-span-2 sm:col-span-3 text-xs font-semibold text-rose-600">Tanggal awal melewati tanggal akhir. Periksa kembali rentang tanggalnya.</p>
              )}
              {(historyFrom || historyTo) && !invalidRange && (
                <p className="col-span-2 sm:col-span-3 text-xs text-slate-500">
                  Menampilkan <strong className="text-slate-800">{filteredHistory.length}</strong> dari {completedHistory.length} sesi
                </p>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {completedHistory.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Belum ada sesi terapi yang berstatus selesai (Completed).
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3" data-testid="history-empty-filter">
              <p className="text-xs text-slate-500">Tidak ada sesi selesai pada rentang tanggal ini.</p>
              <Button type="button" variant="outline" size="sm" onClick={resetHistoryFilter} className="border-slate-200 font-semibold cursor-pointer">
                Tampilkan semua riwayat
              </Button>
            </div>
          ) : (
            <>
            {/* List bisa di-scroll; tinggi dibatasi agar halaman tidak memanjang */}
            <div ref={historyListRef} className="max-h-[min(520px,60vh)] overflow-y-auto overscroll-contain p-4 space-y-2.5" data-testid="history-scroll-list">
              {historyPg.pageItems.map((s) => {
                const th = getTherapist(s.therapistId);
                return (
                  <div
                    key={s.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:px-4 sm:py-3 rounded-xl border border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/20 transition-all shadow-2xs"
                  >
                    {/* Sisi Kiri: Status Completed & Info Jadwal */}
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      {/* Status Completed di posisi kiri */}
                      <div className="shrink-0 pt-0.5 sm:pt-0">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          Completed
                        </span>
                      </div>

                      {/* Detail Sesi Jadwal */}
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">
                            {fmtDate(s.date)}
                          </span>
                          <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-md">
                            {s.startTime} &ndash; {s.endTime}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          Praktisi: <strong className="text-slate-800 font-semibold">{th ? th.name : "Terapis"}</strong>
                          {th?.specialty && <span className="text-slate-400 font-normal"> ({th.specialty})</span>}
                        </p>
                      </div>
                    </div>

                    {/* Sisi Kanan: View Report (nonaktif bila laporan belum diisi terapis) + export */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {isReportEmpty(s) && (
                        <span className="text-[11px] font-semibold text-slate-400" data-testid={`report-pending-${s.id}`}>Laporan belum tersedia</span>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isReportEmpty(s)}
                        title={isReportEmpty(s) ? "Laporan belum diisi terapis" : "Lihat laporan sesi"}
                        onClick={() => {
                          setSelectedReportSession(s);
                          setIsReportOpen(true);
                        }}
                        className="border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-sky-700 font-bold gap-1.5 shadow-2xs cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        data-testid={`view-report-${s.id}`}
                      >
                        <FileText className="w-3.5 h-3.5 text-sky-600" />
                        View Report
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isReportEmpty(s)}
                        onClick={() => exportSessions([s])}
                        className="font-bold gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Export laporan sesi (simpan sebagai PDF)"
                        aria-label="Export laporan sesi"
                        data-testid={`export-report-${s.id}`}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <TablePagination
              page={historyPg.page}
              totalPages={historyPg.totalPages}
              totalItems={historyPg.totalItems}
              pageSize={historyPg.pageSize}
              onPageChange={historyPg.setPage}
              onPageSizeChange={historyPg.setPageSize}
              pageSizeOptions={[10, 20, 50]}
              noun="sesi"
            />
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal View Report Sesi Terapi */}
      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-5 sm:p-6 border-slate-200">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900">
                    Laporan Sesi Terapi
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Hasil observasi klinis & panduan latihan mandiri di rumah
                  </DialogDescription>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Completed
              </span>
            </div>
          </DialogHeader>

          {selectedReportSession && (
            <div className="space-y-4 pt-2">
              {/* Info Ringkas Sesi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Waktu Pelaksanaan</p>
                  <p className="font-bold text-slate-900">
                    {fmtDate(selectedReportSession.date)}
                  </p>
                  <p className="font-mono text-slate-600 text-[11px]">
                    {selectedReportSession.startTime} &ndash; {selectedReportSession.endTime} WIB
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Praktisi Terapis</p>
                  <p className="font-bold text-slate-900">
                    {getTherapist(selectedReportSession.therapistId)?.name || "Terapis"}
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    {getTherapist(selectedReportSession.therapistId)?.specialty || "Spesialis Terapi"}
                  </p>
                </div>
              </div>

              {/* 1. Activity Section */}
              <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-200/80 space-y-1.5">
                <p className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-sky-600 shrink-0" />
                  Aktivitas Klinis Terapi (Activity Section)
                </p>
                <p className="text-xs text-sky-900 leading-relaxed whitespace-pre-wrap">
                  {selectedReportSession.activitySection || <em className="text-sky-700/60">Belum diisi</em>}
                </p>
              </div>

              {/* 2. Note Section */}
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-1.5">
                <p className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <StickyNote className="w-4 h-4 text-amber-600 shrink-0" />
                  Catatan Evaluasi & Observasi Terapis (Note Section)
                </p>
                <p className="text-xs text-amber-950 leading-relaxed whitespace-pre-wrap">
                  {selectedReportSession.noteSection || selectedReportSession.progressNote || <em className="text-amber-800/60">Belum diisi</em>}
                </p>
              </div>

              {/* 3. Homework Section */}
              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-1.5">
                <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <Home className="w-4 h-4 text-emerald-600 shrink-0" />
                  PR & Latihan Mandiri di Rumah (Homework Section)
                </p>
                <p className="text-xs text-emerald-900 leading-relaxed whitespace-pre-wrap">
                  {selectedReportSession.homeworkSection || <em className="text-emerald-800/60">Belum diisi</em>}
                </p>
              </div>

              <DialogFooter className="mt-5 pt-3 border-t border-slate-100 flex flex-row items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="font-semibold gap-1.5 cursor-pointer"
                  onClick={() => exportSessions([selectedReportSession])}
                  data-testid="report-modal-export"
                >
                  <Download className="w-4 h-4" /> Export
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="font-semibold cursor-pointer"
                  onClick={() => setIsReportOpen(false)}
                >
                  Tutup Laporan
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
