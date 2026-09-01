import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  User,
  XCircle,
  FileText,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  BookOpen,
  Home
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useClients } from "@/context/ClientsContext";
import { useTherapists } from "@/context/TherapistsContext";
import { useSchedules } from "@/context/SchedulesContext";
import { useCredits } from "@/context/CreditsContext";
import { useAuth } from "@/context/AuthContext";
import {
  TIME_OPTIONS,
  CANCEL_REASONS,
  cancelReasonLabel,
  checkConflicts,
  fmtDate,
  timeToMin,
  todayStr
} from "@/lib/appUtils";
import { cn } from "@/lib/utils";

export const SessionDetailModal = ({ schedule, open, onOpenChange, clientLinkBase }) => {
  const { auth } = useAuth();
  const { clients, updateClient } = useClients();
  const { therapists, getTherapist } = useTherapists();
  const { schedules, updateSchedule } = useSchedules();
  const {
    getRecordForClient,
    spendPackageCredit,
    handleScheduleCancellation,
  } = useCredits();

  const [mode, setMode] = useState("view"); // view | cancel | reschedule
  const [cancelReason, setCancelReason] = useState("sakit");
  const [cancelNote, setCancelNote] = useState("");

  // Report sections (Activity & Homework)
  const [activitySection, setActivitySection] = useState("");
  const [homeworkSection, setHomeworkSection] = useState("");

  // Reschedule form
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("10:00");
  const [newTherapist, setNewTherapist] = useState("");

  useEffect(() => {
    if (open && schedule) {
      setMode("view");
      setCancelReason(schedule.cancelReason || "sakit");
      setCancelNote(schedule.notes || "");
      setActivitySection(schedule.activitySection || "");
      setHomeworkSection(schedule.homeworkSection || "");
      setNewDate(schedule.date);
      setNewStart(schedule.startTime);
      setNewEnd(schedule.endTime);
      setNewTherapist(schedule.therapistId);
    }
  }, [open, schedule]);

  const rescheduleConflicts = useMemo(() => {
    if (!schedule || mode !== "reschedule") return [];
    return checkConflicts({
      therapistId: newTherapist,
      date: newDate,
      startTime: newStart,
      endTime: newEnd,
      schedules,
      therapists,
      excludeId: schedule.id,
    });
  }, [schedule, mode, newTherapist, newDate, newStart, newEnd, schedules, therapists]);

  if (!schedule) return null;

  const client = clients.find((c) => c.id === schedule.clientId);
  const therapist = getTherapist(schedule.therapistId);
  const record = client ? getRecordForClient(client.id) : null;
  const actionable = schedule.status === "scheduled" || schedule.status === "rescheduled";

  // Role permissions
  const canMarkCompleted = ["master", "admin_schedule"].includes(auth.role);
  const isTherapist = auth.role === "therapist";

  // Target credit package for this session
  const targetPackage = record?.packages?.find(
    (p) => p.id === schedule.creditPackageId || p.packageId === schedule.creditPackageId
  ) || record?.packages?.[0];

  // Save clinical report (Activity Section & Homework Section)
  const handleSaveReport = () => {
    updateSchedule(schedule.id, {
      activitySection: activitySection.trim(),
      homeworkSection: homeworkSection.trim(),
    });
    toast.success("Laporan sesi klinis (Activity & Homework) berhasil disimpan.");
  };

  // Complete session (restricted to admin_schedule & master)
  const handleComplete = () => {
    if (!canMarkCompleted) {
      toast.error("Hanya Admin Schedule yang berhak menyelesaikan status sesi (Completed).");
      return;
    }

    updateSchedule(schedule.id, {
      status: "completed",
      activitySection: activitySection.trim(),
      homeworkSection: homeworkSection.trim(),
    });

    if (schedule.type === "therapy" && record) {
      spendPackageCredit({
        clientId: client.id,
        packageId: schedule.creditPackageId || targetPackage?.id,
        scheduleId: schedule.id,
        date: schedule.date,
      });
      toast.success(`Sesi selesai — 1 kredit terpakai untuk ${client.clientName}.`);
    } else {
      toast.success("Sesi berhasil diselesaikan (Completed).");
    }

    if (schedule.type === "assessment" && client && ["inquiry", "service_selected", "assessment_scheduled"].includes(client.status)) {
      updateClient(client.id, { status: "assessment_done" });
      toast.info(`${client.clientName} otomatis beralih ke tahap "Asesmen Selesai" di pipeline.`);
    }

    onOpenChange(false);
  };

  // Cancel session with reason and penalty rule > 3x
  const handleCancel = () => {
    const nextCancelCount = (record?.cancelCountTotal || 0) + 1;

    updateSchedule(schedule.id, {
      status: "cancelled",
      cancelReason,
      notes: cancelNote.trim() || null,
    });

    handleScheduleCancellation({
      clientId: client.id,
      packageId: schedule.creditPackageId || targetPackage?.id,
      scheduleId: schedule.id,
      cancelReason,
      date: schedule.date,
    });

    if (nextCancelCount <= 3) {
      toast.info(`Sesi dibatalkan (${cancelReasonLabel(cancelReason)}). Kuota cancel wajar (${nextCancelCount}/3) — Kredit sesi tetap utuh.`);
    } else {
      toast.warning(`Sesi dibatalkan (${cancelReasonLabel(cancelReason)}). Cancel ke-${nextCancelCount} (>3x cancel) — Penalti memotong 1 kredit dari paket sesi.`);
    }

    onOpenChange(false);
  };

  // Reschedule session
  const handleReschedule = () => {
    if (rescheduleConflicts.length > 0) {
      toast.error("Terdapat bentrok jadwal pada waktu yang dipilih.");
      return;
    }

    updateSchedule(schedule.id, {
      date: newDate,
      startTime: newStart,
      endTime: newEnd,
      therapistId: newTherapist,
      status: "rescheduled",
    });

    toast.success(`Jadwal sesi berhasil dipindahkan ke ${fmtDate(newDate)} ${newStart}–${newEnd}.`);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl p-0 flex flex-col bg-white overflow-hidden shadow-2xl border-l border-slate-200"
        data-testid="session-detail-sheet"
      >
        <SheetHeader className="p-6 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-xs">
                <CalendarClock className="w-5 h-5" />
              </span>
              <div>
                <SheetTitle className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  {client ? client.clientName : "Sesi Terapi"}
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 font-medium">
                  {fmtDate(schedule.date)} • {schedule.startTime} – {schedule.endTime}
                </SheetDescription>
              </div>
            </div>
            <StatusBadge status={schedule.status} />
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Client & Therapist Metadata */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Praktisi Terapis</span>
              <p className="font-bold text-slate-900 mt-0.5">{therapist?.name || "—"}</p>
              <p className="text-[11px] text-slate-500">{therapist?.specialty}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Paket Kredit Sesi</span>
              <p className="font-bold text-slate-900 mt-0.5">
                {targetPackage ? targetPackage.packageName : "Default (0 Kredit)"}
              </p>
              <p className="text-[11px] text-slate-500">
                Sisa Saldo: {record?.remainingCredit ?? 0} Sesi
              </p>
            </div>
          </div>

          {/* Quick links for therapist / assessor */}
          {client && (
            <div className="flex flex-wrap items-center gap-2">
              {client.gdriveClientLink && (
                <a
                  href={client.gdriveClientLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 font-bold hover:bg-sky-100 transition-colors shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Buka Google Drive Client
                </a>
              )}
              {(client.assessmentAnswers || []).length > 0 && (
                <Link
                  to={`/admin-inquiry/parent-assessment/${client.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 font-bold hover:bg-purple-100 transition-colors shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5" /> Lihat Hasil Kuesioner Ortu
                </Link>
              )}
            </div>
          )}

          {/* CLINICAL REPORT SECTIONS: ACTIVITY + HOMEWORK */}
          <div className="space-y-4 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-600" /> Laporan Sesi Klinis Terapis
                </h4>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Dapat diisi kapan saja (sekarang, nanti, atau setelah sesi selesai).
                </p>
              </div>
              <Button size="sm" onClick={handleSaveReport} className="rounded-xl text-xs font-bold h-8 bg-sky-600 hover:bg-sky-700 text-white">
                Simpan Laporan
              </Button>
            </div>

            {/* 1. Activity Section */}
            <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <Label className="font-bold text-slate-800 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-sky-600" /> 1. Activity Section (Aktivitas Sesi)
              </Label>
              <Textarea
                className="rounded-xl border-slate-200 bg-white text-xs min-h-[75px]"
                placeholder="Dokumentasi aktivitas klinis yang dilakukan bersama anak (stimulasi sensori, motor planning, latihan fokus)..."
                value={activitySection}
                onChange={(e) => setActivitySection(e.target.value)}
              />
            </div>

            {/* 2. Homework Section */}
            <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <Label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-emerald-600" /> 2. Homework Section (PR untuk Orang Tua)
              </Label>
              <Textarea
                className="rounded-xl border-slate-200 bg-white text-xs min-h-[75px]"
                placeholder="Instruksi stimulasi dan program latihan mandiri untuk orang tua di rumah..."
                value={homeworkSection}
                onChange={(e) => setHomeworkSection(e.target.value)}
              />
            </div>
          </div>

          {/* ACTION MODES: COMPLETE / CANCEL / RESCHEDULE */}
          {actionable && (
            <div className="pt-4 border-t border-slate-200 space-y-4">
              {mode === "view" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <Button
                      variant="outline"
                      className="rounded-xl border-slate-200 font-bold text-xs h-10 hover:bg-slate-100"
                      onClick={() => setMode("reschedule")}
                    >
                      Reschedule Sesi
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs h-10"
                      onClick={() => setMode("cancel")}
                    >
                      Batalkan Sesi (Cancel)
                    </Button>
                  </div>

                  {/* Complete Button Protection */}
                  {canMarkCompleted ? (
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl h-11 shadow-sm shadow-emerald-600/20 gap-2"
                      onClick={handleComplete}
                    >
                      <CheckCircle2 className="w-4 h-4" /> Tandai Selesai (Completed Sesi)
                    </Button>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-medium">
                      🔒 <strong>Role Therapist:</strong> Anda dapat mengisi dan menyimpan laporan (Activity & Homework). Penyelesaian status sesi (Mark Completed) dilakukan secara resmi oleh <strong>Admin Schedule</strong>.
                    </div>
                  )}
                </div>
              )}

              {/* CANCEL MODE */}
              {mode === "cancel" && (
                <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-3">
                  <h4 className="font-extrabold text-sm text-rose-900 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-600" /> Pembatalan Sesi & Aturan Kuota
                  </h4>

                  <div className="space-y-1">
                    <Label className="font-bold text-slate-700">Pilih Alasan Pembatalan *</Label>
                    <Select value={cancelReason} onValueChange={setCancelReason}>
                      <SelectTrigger className="rounded-xl border-slate-200 bg-white font-semibold h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        {CANCEL_REASONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="font-bold text-slate-700">Catatan Tambahan</Label>
                    <Input
                      className="rounded-xl border-slate-200 bg-white h-9 text-xs"
                      placeholder="e.g. Surat dokter terlampir via WA..."
                      value={cancelNote}
                      onChange={(e) => setCancelNote(e.target.value)}
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-rose-200 text-[11px] text-rose-900 space-y-1">
                    <p className="font-bold">Ketentuan Kuota Pembatalan:</p>
                    <p>• Cancel ke-1, 2, dan 3: Kuota izin wajar, <strong>kredit sesi tetap utuh</strong>.</p>
                    <p>• Cancel ke-4 dst (&gt;3x): Sistem mengenakan penalti dan <strong>langsung memotong 1 kredit dari paket sesi ini</strong> ({targetPackage?.packageName || "Paket Sesi"}).</p>
                    <p className="font-bold text-slate-900 pt-1">
                      Status Saat Ini: Client telah membatalkan {record?.cancelCountTotal || 0} kali sebelumnya.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button variant="outline" className="rounded-xl text-xs flex-1" onClick={() => setMode("view")}>
                      Batal
                    </Button>
                    <Button className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex-1" onClick={handleCancel}>
                      Konfirmasi Pembatalan
                    </Button>
                  </div>
                </div>
              )}

              {/* RESCHEDULE MODE */}
              {mode === "reschedule" && (
                <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200 space-y-3">
                  <h4 className="font-extrabold text-sm text-sky-950 flex items-center gap-1.5">
                    <CalendarClock className="w-4 h-4 text-sky-600" /> Pindahkan Jadwal Sesi (Reschedule)
                  </h4>

                  <div className="space-y-1">
                    <Label className="font-bold text-slate-700">Tanggal Baru</Label>
                    <Input
                      type="date"
                      className="rounded-xl border-slate-200 bg-white h-9"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="font-bold text-slate-700">Jam Mulai</Label>
                      <Select value={newStart} onValueChange={setNewStart}>
                        <SelectTrigger className="rounded-xl border-slate-200 bg-white h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200">
                          {TIME_OPTIONS.slice(0, -1).map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="font-bold text-slate-700">Jam Selesai</Label>
                      <Select value={newEnd} onValueChange={setNewEnd}>
                        <SelectTrigger className="rounded-xl border-slate-200 bg-white h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200">
                          {TIME_OPTIONS.filter((t) => timeToMin(t) > timeToMin(newStart)).map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="font-bold text-slate-700">Terapis</Label>
                    <Select value={newTherapist} onValueChange={setNewTherapist}>
                      <SelectTrigger className="rounded-xl border-slate-200 bg-white h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        {therapists.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {rescheduleConflicts.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                      {rescheduleConflicts.map((c, i) => (
                        <p key={i}>⚠️ {c}</p>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <Button variant="outline" className="rounded-xl text-xs flex-1" onClick={() => setMode("view")}>
                      Batal
                    </Button>
                    <Button className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl flex-1" onClick={handleReschedule}>
                      Simpan Jadwal Baru
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
