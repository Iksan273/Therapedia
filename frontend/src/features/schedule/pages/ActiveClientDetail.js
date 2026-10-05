import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, CalendarPlus, RotateCcw, Receipt, User, CalendarDays, Calendar, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { EmptyState } from "@/shared/components/EmptyState";
import { useConfirm } from "@/shared/components/ConfirmDialog";
import { ClientReportMonitoringCard } from "@/features/schedule/components/clientDetail/ClientReportMonitoringCard";
import { SessionHistoryNoteDialog } from "@/features/schedule/components/clientDetail/SessionHistoryNoteDialog";
import { AddScheduleModal } from "@/features/schedule/components/calendar/AddScheduleModal";
import { SessionDetailModal } from "@/features/schedule/components/calendar/SessionDetailModal";
import { useClientOutcomeActions, useClientDeleteActions } from "@/features/inquiry";
import { DeleteButton } from "@/shared/components/DeleteControls";
import { useAuth } from "@/stores/authStore";
import { useClients } from "@/stores/clientsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useCredits } from "@/stores/creditsStore";
import { useTherapists } from "@/stores/therapistsStore";
import { ReasonPicker } from "@/shared/components/ReasonPicker";
import { useMasterData } from "@/stores/masterDataStore";
import { calcAge, fmtDate } from "@/shared/lib/format";
import { BRANCHES } from "@/domain/branch";
import { distinctActivePackages, packageBaseName } from "@/domain/credit";
import { CancelQuotaList } from "@/shared/components/CancelQuotaList";
import { isActiveClient, canReactivateClient, dischargeReasonLabel } from "@/domain/client";
import { bookingNoteOf, cancelNoteOf, deriveRecurringRoutines, upcomingActiveSessions } from "@/domain/schedule";
import { todayStr } from "@/shared/lib/id";
import { cn } from "@/shared/lib/utils";

export default function ActiveClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clients } = useClients();
  const { schedules, updateSchedule } = useSchedules();
  const { getRecordForClient } = useCredits();
  const { getTherapist } = useTherapists();
  const { activeDischargeReasons, getCancelReasonLabel, getOffReasonLabel } = useMasterData();
  const { auth } = useAuth();
  const { reactivate, discharge } = useClientOutcomeActions();
  const { deleteClientCascade } = useClientDeleteActions();
  const { confirm, confirmDialog } = useConfirm();

  const [addOpen, setAddOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [noteSession, setNoteSession] = useState(null); // sesi yang catatan riwayatnya sedang diedit
  const [sessionOpen, setSessionOpen] = useState(false);
  const [dischargeOpen, setDischargeOpen] = useState(false);
  const [dischargeReason, setDischargeReason] = useState("");
  const [dischargeNote, setDischargeNote] = useState("");

  const client = clients.find((c) => c.id === id);
  const record = client ? getRecordForClient(client.id) : null;

  // Schedules associated with this client
  const clientSchedules = useMemo(() => {
    return schedules.filter((s) => s.clientId === id).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [schedules, id]);

  // Session history pagination
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 8;
  const totalHistoryPages = Math.ceil(clientSchedules.length / historyPageSize) || 1;
  const paginatedSchedules = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return clientSchedules.slice(start, start + historyPageSize);
  }, [clientSchedules, historyPage, historyPageSize]);

  // Jadwal rutin (recurring): pola hari + jam + terapis dari sesi aktif mendatang (seri berulang)
  const today = todayStr();
  const weeklyRoutines = useMemo(
    () =>
      deriveRecurringRoutines(clientSchedules, today).map((g) => {
        const th = getTherapist(g.therapistId);
        return { ...g, time: `${g.startTime} – ${g.endTime}`, therapistName: th ? th.name : "Terapis", specialty: th ? th.specialty : "Clinical OT" };
      }),
    [clientSchedules, getTherapist, today]
  );

  // Jadwal yang sedang aktif di kalender (mendatang: scheduled / rescheduled / menunggu jadwal pengganti)
  const activeSessions = useMemo(() => upcomingActiveSessions(clientSchedules, today), [clientSchedules, today]);

  if (!client) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-base text-slate-600">Client tidak ditemukan.</p>
        <Button onClick={() => navigate("/admin-schedule/clients")} variant="outline" className="">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Kembali ke Roster
        </Button>
      </div>
    );
  }

  const br = BRANCHES.find((b) => b.id === client.branchId);
  const pkgs = record?.packages || [];
  const activePkgs = distinctActivePackages(pkgs, { fallbackLast: true }); // hanya paket bersisa, distinct per jenis; semua habis = 1 paket terakhir
  const remCredit = record ? record.remainingCredit : 0;
  const isActive = isActiveClient(client);
  const isFrozen = isActive && remCredit === 0;

  // Discharge client handler
  const handleDischarge = () => {
    const reason = dischargeReason.trim();
    if (!reason) {
      toast.error("Mohon pilih atau tulis alasan discharge.");
      return;
    }
    discharge(client, reason, dischargeNote);
    setDischargeOpen(false);
    toast.success(`${client.clientName} resmi di-discharge.`);
    navigate("/admin-schedule/clients");
  };

  // Aktifkan kembali client discharged / discontinued
  const handleReactivate = async () => {
    const ok = await confirm({
      title: `Aktifkan kembali ${client.clientName}?`,
      description: `Status ${client.status === "discharged" ? "Discharged" : "Discontinued"} akan diganti menjadi Active Client dan client bisa dijadwalkan sesi lagi. Saldo kredit & riwayat sesi tetap dipertahankan.`,
      confirmLabel: "Aktifkan Kembali",
    });
    if (!ok) return;
    reactivate(client);
    toast.success(`${client.clientName} kembali menjadi Active Client.`);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto" data-testid="active-client-detail-page">
      {confirmDialog}
      {/* Header Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Button
            variant="outline"
           
            className="border-slate-200 text-slate-700 hover:bg-slate-100 px-3.5 font-bold shadow-2xs"
            onClick={() => navigate("/admin-schedule/clients")}
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Roster
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{client.clientName}</h1>
              <StatusBadge status={client.status} />
              {isFrozen && (
                <span className="text-xs font-extrabold text-cyan-900 bg-cyan-100 border border-cyan-300 px-2.5 py-0.5 rounded-lg">
                  Sesi Frozen (0 Kredit)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Kode Akses: <strong className="font-mono text-slate-800">{client.clientCode}</strong> • Cabang: {br ? br.name : "—"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {client.gdriveClientLink && (
            <a
              href={client.gdriveClientLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 shadow-2xs transition-colors h-10"
            >
              <ExternalLink className="w-3.5 h-3.5" /> GDrive Client
            </a>
          )}

          {isActive && (
            <Button
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 gap-2 shadow-xs"
              onClick={() => setAddOpen(true)}
            >
              <CalendarPlus className="w-4 h-4" /> Jadwalkan Sesi Baru
            </Button>
          )}
          <DeleteButton
            module="active_clients"
            label="Hapus Client"
            title={`Hapus ${client.clientName}?`}
            description="Client beserta sesi dan invoice-nya akan disembunyikan dari semua daftar dan client tidak bisa login portal ortu. Penghapusan bersifat soft delete."
            onConfirm={() => {
              deleteClientCascade(client);
              toast.success(`Client ${client.clientName} dihapus.`);
              navigate("/admin-schedule/clients");
            }}
            testId="delete-active-client-button"
          />
          {canReactivateClient(client) && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 gap-2 shadow-xs"
              onClick={handleReactivate}
              data-testid="reactivate-client"
            >
              <RotateCcw className="w-4 h-4" /> Aktifkan Kembali
            </Button>
          )}
        </div>
      </div>

      {canReactivateClient(client) && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700" data-testid="client-inactive-banner">
          <strong>{client.status === "discharged" ? "Discharged" : "Discontinued"}</strong>
          {client.dateOfDischarge ? ` pada ${fmtDate(client.dateOfDischarge)}` : ""}
          {client.dischargeReason ? ` · Alasan: ${dischargeReasonLabel(client.dischargeReason, activeDischargeReasons)}` : ""}
          {client.dischargeNote ? ` · ${client.dischargeNote}` : ""}
        </div>
      )}

      {/* Overview Demographics Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Child & Parent Demographics */}
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-2xs p-6 lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              Informasi Demografis Client
            </h3>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
              Bergabung: {fmtDate(client.dateOfJoin || client.createdAt)}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Nama Anak</span>
              <p className="font-bold text-slate-900 mt-1 text-sm">{client.clientName}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tanggal Lahir / Usia</span>
              <p className="font-bold text-slate-800 mt-1 text-sm">
                {fmtDate(client.dob)} ({calcAge(client.dob)} th)
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Orang Tua / Wali</span>
              <p className="font-bold text-slate-800 mt-1 text-sm">{client.parentName}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Kontak WhatsApp</span>
              <p className="font-bold text-slate-800 mt-1 text-sm">{client.parentContact}</p>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">{client.parentEmail}</p>
            </div>
          </div>
        </Card>

        {/* Credit Package Card (NO renewal here - managed by Finance) */}
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-2xs p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-teal-600" /> Saldo Kredit Sesi
              </h3>
              <span
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold",
                  isFrozen ? "bg-cyan-100 text-cyan-900" : remCredit <= 2 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                )}
              >
                {remCredit} Sesi Total
              </span>
            </div>

            <div className="space-y-2.5 pt-3.5 text-xs">
              {activePkgs.length === 0 ? (
                <p className="text-xs text-rose-600 font-bold bg-rose-50 p-3 rounded-xl border border-rose-200 leading-relaxed">
                  Client belum memiliki paket kredit (Kredit 0). Sesi kalender otomatis berstatus Frozen .
                </p>
              ) : (
                activePkgs.map((p) => (
                  <div key={p.name} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between" data-testid={`detail-package-${p.name}`}>
                    <div>
                      <p className="font-bold text-slate-900">{p.name}</p>
                      <p className="text-[11px] text-slate-500 font-medium">Status: {p.depleted ? "habis (Frozen)" : "active"}{p.packageCount > 1 ? ` • ${p.packageCount} paket digabung` : ""}</p>
                    </div>
                    <span className="font-mono font-extrabold text-sm text-slate-800">{p.remainingCredit} sisa</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Renewal Paket Kredit:</span>
              <span className="font-bold text-slate-700">Dikelola Role Finance</span>
            </div>
            <Button
             
              variant="outline"
              className="w-full mt-2.5 font-bold text-sky-700 border-sky-200 hover:bg-sky-50"
              onClick={() => navigate("/finance")}
            >
              Buka Finance Hub untuk Renewal
            </Button>
          </div>
        </Card>
      </div>

      {/* JADWAL AKTIF DI KALENDER: tepat di bawah jadwal rutin (lihat blok berikutnya) */}
      {/* JADWAL RUTIN MINGGUAN (HARI APA SAJA & SAMA SIAPA TERAPISNYA) */}
      <Card className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <CardHeader className="p-5 sm:p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-sky-600" />
            Jadwal Rutin Mingguan Client (Hari & Terapis Pendamping)
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Rangkuman jadwal mingguan anak: hari apa saja, jam berapa, dan terapis yang menangani
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          {weeklyRoutines.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Belum ada jadwal rutin mingguan aktif untuk client ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {weeklyRoutines.map((routine, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-sky-50/50 border border-sky-200/90 space-y-2 text-xs shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-sky-900">{routine.day}</span>
                    <span className="font-mono text-xs text-sky-800 font-bold bg-white px-2.5 py-0.5 rounded-lg border border-sky-200 shadow-2xs">
                      {routine.time}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-sky-200/60 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{routine.therapistName}</p>
                      <p className="text-[11px] text-slate-500 font-medium">{routine.specialty}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* JADWAL AKTIF DI KALENDER (mendatang) */}
      <Card className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden" data-testid="active-calendar-sessions">
        <CardHeader className="p-5 sm:p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            Jadwal Aktif di Kalender ({activeSessions.length})
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Sesi mendatang yang masih aktif (terjadwal, dipindah, atau menunggu jadwal pengganti). Klik sesi untuk membuka detail.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {activeSessions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">Belum ada jadwal aktif di kalender untuk client ini.</div>
          ) : (
            <Table stackOnMobile className="min-w-[520px] w-full">
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                  <TableHead className="font-bold text-slate-700 text-xs py-3 pl-6 whitespace-nowrap">Tanggal & Jam</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Terapis</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Jenis</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-right pr-6 whitespace-nowrap">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeSessions.slice(0, 12).map((s) => (
                  <TableRow
                    key={s.id}
                    className="border-b border-slate-100 hover:bg-emerald-50/30 cursor-pointer"
                    onClick={() => {
                      setSelectedSession(s);
                      setSessionOpen(true);
                    }}
                    data-testid={`active-session-${s.id}`}
                  >
                    <TableCell data-label="Tanggal" className="pl-6 text-xs whitespace-nowrap">
                      <span className="font-bold text-slate-900">{fmtDate(s.date)}</span>
                      <span className="ml-2 font-mono text-slate-500">{s.startTime} – {s.endTime}</span>
                    </TableCell>
                    <TableCell data-label="Terapis" className="text-xs font-semibold text-slate-800">{getTherapist(s.therapistId)?.name || "—"}</TableCell>
                    <TableCell data-label="Jenis" className="text-xs text-slate-600">{s.type === "assessment" ? "Asesmen" : "Terapi"}</TableCell>
                    <TableCell data-label="Status" className="text-right pr-6"><StatusBadge status={s.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {activeSessions.length > 12 && (
            <p className="px-6 py-3 text-[11px] text-slate-500 border-t border-slate-100">Menampilkan 12 dari {activeSessions.length} sesi. Lihat selengkapnya di Weekly Calendar.</p>
          )}
        </CardContent>
      </Card>

      <ClientReportMonitoringCard
        sessions={clientSchedules}
        getTherapistName={(tid) => getTherapist(tid)?.name || "—"}
        onOpenSession={(s) => {
          setSelectedSession(s);
          setSessionOpen(true);
        }}
      />

      {/* Sessions History & Cancellation Log */}
      <Card className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Riwayat Sesi Terapi ({clientSchedules.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Kuota cancel dihitung per paket (hanya penghitung; potong kredit atau tidak ditentukan admin tiap cancel):
            </CardDescription>
            <CancelQuotaList record={record} className="mt-2" />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {clientSchedules.length === 0 ? (
            <EmptyState icon={Calendar} title="Belum ada sesi" subtitle="Belum ada sesi tercatat untuk client ini." />
          ) : (
            <Table stackOnMobile className="min-w-[1280px] w-full">
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                  <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6 min-w-[180px] whitespace-nowrap">Tanggal & Jam</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[150px] whitespace-nowrap">Terapis</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[150px] whitespace-nowrap">Paket Kredit</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[130px] whitespace-nowrap">Status</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[200px]">Alasan Cancel / Off</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[220px]">Catatan Penjadwalan</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[220px]">Catatan</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-center min-w-[240px] whitespace-nowrap">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSchedules.map((s) => {
                  const th = getTherapist(s.therapistId);
                  const pkg = pkgs.find((p) => p.id === s.creditPackageId || p.packageId === s.creditPackageId);
                  return (
                    <TableRow key={s.id} className="border-b border-slate-100 hover:bg-slate-50/50 text-xs">
                      <TableCell data-nolabel className="pl-6 py-3 font-semibold text-slate-900 min-w-[180px] whitespace-nowrap">
                        {fmtDate(s.date)} • <span className="font-mono text-slate-500">{s.startTime}–{s.endTime}</span>
                      </TableCell>
                      <TableCell data-label="Terapis" className="font-medium text-slate-700 min-w-[150px] whitespace-nowrap">{th?.name || "—"}</TableCell>
                      <TableCell data-label="Paket Kredit" className="font-medium text-slate-700 min-w-[150px] whitespace-nowrap">{pkg ? packageBaseName(pkg.packageName) : "Default"}</TableCell>
                      <TableCell data-label="Status" className="min-w-[130px] whitespace-nowrap">
                        <StatusBadge status={s.status} />
                      </TableCell>
                      <TableCell data-label="Alasan Cancel / Off" className="text-slate-600 min-w-[200px]">
                        {s.status === "off" && s.offReason ? (
                          <>
                            <span className="font-semibold">Off: {getOffReasonLabel(s.offReason)}</span>
                            {s.offNote && <span className="block text-[11px] text-slate-500">{s.offNote}</span>}
                          </>
                        ) : s.status === "cancelled" && s.cancelReason ? (
                          <>
                            <span className="font-semibold">{getCancelReasonLabel(s.cancelReason)}</span>
                            {cancelNoteOf(s) && <span className="block text-[11px] text-slate-500">{cancelNoteOf(s)}</span>}
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell data-label="Catatan Penjadwalan" className="text-slate-500 min-w-[220px]">
                        {bookingNoteOf(s) || "—"}
                      </TableCell>
                      <TableCell data-label="Catatan" className="min-w-[220px] text-slate-700 whitespace-pre-wrap" data-testid={`history-note-${s.id}`}>
                        {s.historyNote || "—"}
                      </TableCell>
                      <TableCell data-label="Aksi" className="text-center min-w-[240px]">
                        <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="font-bold text-sky-700 hover:bg-sky-50 whitespace-nowrap cursor-pointer"
                            onClick={() => {
                              setSelectedSession(s);
                              setSessionOpen(true);
                            }}
                            data-testid={`view-session-${s.id}`}
                          >
                            Lihat Detail
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="font-bold text-sky-700 hover:bg-sky-50 whitespace-nowrap cursor-pointer"
                            onClick={() => setNoteSession(s)}
                            data-testid={`edit-history-note-${s.id}`}
                          >
                            {s.historyNote ? "Ubah Catatan" : "Tambah Catatan"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination controls for session history */}
        {clientSchedules.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50/50">
            <span className="font-medium">
              Menampilkan {(historyPage - 1) * historyPageSize + 1} –{" "}
              {Math.min(historyPage * historyPageSize, clientSchedules.length)} dari {clientSchedules.length} sesi
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="px-2.5 font-semibold border-slate-200 hover:bg-slate-100 cursor-pointer"
                disabled={historyPage <= 1}
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
              </Button>
              <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-bold text-slate-800 text-xs shadow-2xs">
                {historyPage} / {totalHistoryPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="px-2.5 font-semibold border-slate-200 hover:bg-slate-100 cursor-pointer"
                disabled={historyPage >= totalHistoryPages}
                onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Discharge Client Button (Footer) */}
      {isActive && (
        <div className="pt-4 flex justify-end">
          <Button
            variant="outline"
            className="border-rose-200 text-rose-700 hover:bg-rose-50 font-bold"
            onClick={() => setDischargeOpen(true)}
          >
            Discharge Client
          </Button>
        </div>
      )}

      {/* Modals */}
      <SessionHistoryNoteDialog
        session={noteSession}
        open={Boolean(noteSession)}
        onOpenChange={(o) => !o && setNoteSession(null)}
        onSave={(text) => {
          updateSchedule(noteSession.id, { historyNote: text, historyNoteBy: auth?.staffName || auth?.role || null });
          toast.success("Catatan riwayat sesi disimpan.");
          setNoteSession(null);
        }}
      />
      <AddScheduleModal
        open={addOpen}
        onOpenChange={setAddOpen}
        defaults={{ clientId: client.id }}
      />

      <SessionDetailModal
        schedule={selectedSession}
        open={sessionOpen}
        onOpenChange={setSessionOpen}
      />

      {/* Discharge Dialog */}
      <Dialog open={dischargeOpen} onOpenChange={setDischargeOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Discharge Client</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tandai kelulusan atau penghentian sesi terapi untuk {client.clientName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Alasan Discharge *</Label>
              <ReasonPicker options={activeDischargeReasons} value={dischargeReason} onChange={setDischargeReason} testId="discharge-reason" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Catatan Klinis Discharge</Label>
              <Textarea
                className="rounded-xl border-slate-200 bg-slate-50 text-xs"
                placeholder="Evaluasi akhir perkembangan anak..."
                value={dischargeNote}
                onChange={(e) => setDischargeNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" className="" onClick={() => setDischargeOpen(false)}>
              Batal
            </Button>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white font-bold" onClick={handleDischarge}>
              Konfirmasi Discharge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
