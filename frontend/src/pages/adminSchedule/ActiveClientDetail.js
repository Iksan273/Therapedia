import React, { useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowLeft,
  CalendarPlus,
  LogOut,
  Receipt,
  User,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  CalendarDays,
  Building2,
  Calendar,
  AlertCircle,
  ExternalLink,
  MessageCircle,
  Activity,
  History,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { AddScheduleModal } from "@/components/calendar/AddScheduleModal";
import { SessionDetailModal } from "@/components/calendar/SessionDetailModal";
import { useClients } from "@/context/ClientsContext";
import { useSchedules } from "@/context/SchedulesContext";
import { useCredits } from "@/context/CreditsContext";
import { useTherapists } from "@/context/TherapistsContext";
import { DISCHARGE_REASONS, calcAge, fmtDate, todayStr, BRANCHES, fmtCurrency } from "@/lib/appUtils";
import { cn } from "@/lib/utils";

export default function ActiveClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clients, updateClient } = useClients();
  const { schedules } = useSchedules();
  const { getRecordForClient } = useCredits();
  const { getTherapist } = useTherapists();

  const [addOpen, setAddOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
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

  // Derive weekly recurring timetable pattern: "Jadwal setiap hari apa dan sama siapa therapist nya"
  const weeklyRoutines = useMemo(() => {
    if (!clientSchedules) return [];
    const routinesMap = {};

    clientSchedules.forEach((s) => {
      if (s.status !== "cancelled") {
        let dayName = "";
        try {
          const d = new Date(s.date + "T00:00:00");
          dayName = format(d, "EEEE");
        } catch (e) {
          dayName = "Sesi Rutin";
        }
        const key = `${dayName}_${s.startTime}_${s.therapistId}`;
        if (!routinesMap[key]) {
          const th = getTherapist(s.therapistId);
          routinesMap[key] = {
            day: dayName,
            time: `${s.startTime} – ${s.endTime}`,
            therapistName: th ? th.name : "Terapis",
            specialty: th ? th.specialty : "Clinical OT",
            creditPackageId: s.creditPackageId,
          };
        }
      }
    });

    return Object.values(routinesMap);
  }, [clientSchedules, getTherapist]);

  if (!client) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-base text-slate-600">Client tidak ditemukan.</p>
        <Button onClick={() => navigate("/admin-schedule/clients")} variant="outline" className="rounded-xl text-xs">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Kembali ke Roster
        </Button>
      </div>
    );
  }

  const br = BRANCHES.find((b) => b.id === client.branchId);
  const pkgs = record?.packages || [];
  const remCredit = record ? record.remainingCredit : 0;
  const isFrozen = remCredit === 0;

  // Discharge client handler
  const handleDischarge = () => {
    if (!dischargeReason) {
      toast.error("Mohon pilih alasan discharge.");
      return;
    }
    updateClient(client.id, {
      status: "discharged",
      dateOfDischarge: todayStr(),
      dischargeReason,
      dischargeNote: dischargeNote.trim() || null,
    });
    setDischargeOpen(false);
    toast.success(`${client.clientName} resmi di-discharge.`);
    navigate("/admin-schedule/clients");
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto" data-testid="active-client-detail-page">
      {/* Header Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 h-10 px-3.5 font-bold text-xs shadow-2xs"
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
                  ❄️ Sesi Frozen (0 Kredit)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Kode Akses: <strong className="font-mono text-slate-800">{client.clientAccessCode}</strong> • Cabang: {br ? br.name : "Surabaya"}
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

          <Button
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs h-10 px-4 gap-2 shadow-xs"
            onClick={() => setAddOpen(true)}
          >
            <CalendarPlus className="w-4 h-4" /> Jadwalkan Sesi Baru
          </Button>
        </div>
      </div>

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
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nama Anak</span>
              <p className="font-bold text-slate-900 mt-1 text-sm">{client.clientName}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tanggal Lahir / Usia</span>
              <p className="font-bold text-slate-800 mt-1 text-sm">
                {fmtDate(client.dob)} ({calcAge(client.dob)} th)
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Orang Tua / Wali</span>
              <p className="font-bold text-slate-800 mt-1 text-sm">{client.parentName}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Kontak WhatsApp</span>
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
              {pkgs.length === 0 ? (
                <p className="text-xs text-rose-600 font-bold bg-rose-50 p-3 rounded-xl border border-rose-200 leading-relaxed">
                  Client belum memiliki paket kredit (Kredit 0). Sesi kalender otomatis berstatus Frozen ❄️.
                </p>
              ) : (
                pkgs.map((p) => (
                  <div key={p.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{p.packageName}</p>
                      <p className="text-[10px] text-slate-500 font-medium">Status: {p.status}</p>
                    </div>
                    <span className="font-mono font-extrabold text-sm text-slate-800">
                      {p.remainingCredit} / {p.totalCredit}
                    </span>
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
              size="sm"
              variant="outline"
              className="w-full mt-2.5 rounded-xl text-xs font-bold text-sky-700 border-sky-200 hover:bg-sky-50 h-10"
              onClick={() => navigate("/finance")}
            >
              Buka Finance Hub untuk Renewal
            </Button>
          </div>
        </Card>
      </div>

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

      {/* Sessions History & Cancellation Log */}
      <Card className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Riwayat Sesi Terapi & Log Pembatalan ({clientSchedules.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Total pembatalan: {record?.cancelCountTotal || 0}x (Maksimal 3x cancel wajar sebelum terkena penalti kredit)
            </CardDescription>
          </div>
          {(record?.cancelCountTotal || 0) > 3 && (
            <span className="text-xs font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
              ⚠️ Melebihi Kuota Cancel (&gt;3x)
            </span>
          )}
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {clientSchedules.length === 0 ? (
            <EmptyState icon={Calendar} title="Belum ada sesi" subtitle="Belum ada sesi tercatat untuk client ini." />
          ) : (
            <Table className="min-w-[860px] w-full">
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                  <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6 min-w-[180px] whitespace-nowrap">Tanggal & Jam</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[150px] whitespace-nowrap">Terapis</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[150px] whitespace-nowrap">Paket Kredit</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[130px] whitespace-nowrap">Status</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[220px]">Alasan Cancel / Catatan</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-right pr-6 min-w-[100px] whitespace-nowrap">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSchedules.map((s) => {
                  const th = getTherapist(s.therapistId);
                  const pkg = pkgs.find((p) => p.id === s.creditPackageId || p.packageId === s.creditPackageId);
                  return (
                    <TableRow key={s.id} className="border-b border-slate-100 hover:bg-slate-50/50 text-xs">
                      <TableCell className="pl-6 py-3 font-semibold text-slate-900 min-w-[180px] whitespace-nowrap">
                        {fmtDate(s.date)} • <span className="font-mono text-slate-500">{s.startTime}–{s.endTime}</span>
                      </TableCell>
                      <TableCell className="font-medium text-slate-700 min-w-[150px] whitespace-nowrap">{th?.name || "—"}</TableCell>
                      <TableCell className="font-medium text-slate-700 min-w-[150px] whitespace-nowrap">{pkg ? pkg.packageName : "Default"}</TableCell>
                      <TableCell className="min-w-[130px] whitespace-nowrap">
                        <StatusBadge status={s.status} />
                      </TableCell>
                      <TableCell className="text-slate-500 min-w-[220px]">
                        {s.status === "cancelled" ? (
                          <span className="font-bold text-rose-700">
                            {s.cancelReason ? `[${s.cancelReason.toUpperCase()}] ${s.notes || ""}` : s.notes || "Dibatalkan"}
                          </span>
                        ) : s.activitySection ? (
                          <span className="text-emerald-700 font-medium">✓ Activity report tersimpan</span>
                        ) : (
                          s.notes || "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6 min-w-[100px] whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 rounded-lg text-xs font-bold text-sky-700 hover:bg-sky-50 whitespace-nowrap cursor-pointer"
                          onClick={() => {
                            setSelectedSession(s);
                            setSessionOpen(true);
                          }}
                        >
                          Lihat
                        </Button>
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
                className="h-8 px-2.5 rounded-xl text-xs font-semibold border-slate-200 hover:bg-slate-100 cursor-pointer"
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
                className="h-8 px-2.5 rounded-xl text-xs font-semibold border-slate-200 hover:bg-slate-100 cursor-pointer"
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
      <div className="pt-4 flex justify-end">
        <Button
          variant="outline"
          className="border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-xl"
          onClick={() => setDischargeOpen(true)}
        >
          Discharge Client
        </Button>
      </div>

      {/* Modals */}
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
              <Select value={dischargeReason} onValueChange={setDischargeReason}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50 text-xs">
                  <SelectValue placeholder="Pilih alasan..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  {DISCHARGE_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button variant="outline" className="rounded-xl text-xs" onClick={() => setDischargeOpen(false)}>
              Batal
            </Button>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs" onClick={handleDischarge}>
              Konfirmasi Discharge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
