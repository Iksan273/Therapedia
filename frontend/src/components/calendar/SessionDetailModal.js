import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, User, XCircle, FileText, ShieldAlert, ExternalLink, BookOpen, StickyNote, Home, Hourglass, CornerUpRight } from "lucide-react";
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
import DateFilterPicker from "@/components/common/DateFilterPicker";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useClients } from "@/context/ClientsContext";
import { useTherapists } from "@/context/TherapistsContext";
import { useSchedules } from "@/context/SchedulesContext";
import { useCredits } from "@/context/CreditsContext";
import { useAuth } from "@/context/AuthContext";
import { TIME_OPTIONS, CANCEL_REASONS, RESCHEDULE_DROPPED, cancelReasonLabel, checkConflicts, fmtDate, isCreditNeutralCancel, scheduleSlot, timeToMin } from "@/lib/appUtils";
import { cn } from "@/lib/utils";

export const SessionDetailModal = ({ schedule, open, onOpenChange, clientLinkBase, readOnly = false }) => {
  const { auth } = useAuth();
  const { clients, updateClient } = useClients();
  const { therapists, getTherapist } = useTherapists();
  const { schedules, updateSchedule } = useSchedules();
  const {
    getRecordForClient,
    spendPackageCredit,
    handleScheduleCancellation,
  } = useCredits();

  const [mode, setMode] = useState("view"); // view | cancel | reschedule | drop
  const [rescheduleKind, setRescheduleKind] = useState("move"); // move = pindah sekarang, pending = jadwal pengganti menyusul
  const [pendingReason, setPendingReason] = useState("sakit");
  const [pendingNote, setPendingNote] = useState("");
  const [dropNote, setDropNote] = useState("");
  const [cancelReason, setCancelReason] = useState("sakit");
  const [cancelNote, setCancelNote] = useState("");

  // Report sections (Activity, Note & Homework)
  const [activitySection, setActivitySection] = useState("");
  const [noteSection, setNoteSection] = useState("");
  const [homeworkSection, setHomeworkSection] = useState("");

  // Reschedule form
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("10:00");
  const [newTherapist, setNewTherapist] = useState("");

  useEffect(() => {
    if (open && schedule) {
      setMode("view");
      setRescheduleKind("move");
      setPendingReason(schedule.pendingReason || "sakit");
      setPendingNote(schedule.pendingNote || "");
      setDropNote("");
      setCancelReason(schedule.cancelReason || "sakit");
      setCancelNote(schedule.notes || "");
      setActivitySection(schedule.activitySection || "");
      setNoteSection(schedule.noteSection || schedule.progressNote || "");
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
  const isPending = schedule.status === "reschedule_pending";
  const actionable = schedule.status === "scheduled" || schedule.status === "rescheduled" || isPending;
  // Slot asal: untuk sesi menggantung = slot saat ini; untuk sesi yang sudah dipindah = jejak yang tersimpan
  const originSlot = isPending ? schedule.pendingFrom || scheduleSlot(schedule) : schedule.rescheduledFrom || null;
  const slotText = (slot) => `${fmtDate(slot.date)} • ${slot.startTime}–${slot.endTime}`;
  const originTherapist = originSlot ? getTherapist(originSlot.therapistId) : null;

  // Role permissions
  const canManageSchedule = ["master", "admin_schedule"].includes(auth.role);
  const canMarkCompleted = canManageSchedule;
  const canCancel = canManageSchedule;
  const canReschedule = canManageSchedule;
  const isTherapist = auth.role === "therapist";

  // Target credit package for this session
  const targetPackage = record?.packages?.find(
    (p) => p.id === schedule.creditPackageId || p.packageId === schedule.creditPackageId
  ) || record?.packages?.[0];

  // Save clinical report (Activity, Note & Homework) - anytime
  const handleSaveReport = () => {
    const now = new Date().toISOString();
    updateSchedule(schedule.id, {
      activitySection: activitySection.trim(),
      noteSection: noteSection.trim(),
      progressNote: noteSection.trim(), // Keep progressNote in sync
      homeworkSection: homeworkSection.trim(),
      reportUpdatedAt: now,
    });
    toast.success("Laporan sesi klinis (Activity, Note & Homework) berhasil disimpan.");
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
      noteSection: noteSection.trim(),
      progressNote: noteSection.trim(),
      homeworkSection: homeworkSection.trim(),
      reportUpdatedAt: new Date().toISOString(),
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

  // Cancel session with reason and penalty rule > 3x (Admin Schedule only)
  const handleCancel = () => {
    if (!canCancel) {
      toast.error("Hanya Admin Schedule yang berhak membatalkan sesi.");
      return;
    }

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

  const clearPendingPatch = { pendingFrom: null, pendingAt: null, pendingReason: null, pendingNote: null };

  // Reschedule langsung pindah ke jadwal baru (Admin Schedule only)
  const handleReschedule = () => {
    if (!canReschedule) {
      toast.error("Hanya Admin Schedule yang berhak mereschedule atau memindahkan sesi.");
      return;
    }

    if (
      newDate === schedule.date &&
      newStart === schedule.startTime &&
      newEnd === schedule.endTime &&
      newTherapist === schedule.therapistId
    ) {
      toast.error("Pilih tanggal, jam, atau terapis yang berbeda dari jadwal saat ini.");
      return;
    }

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
      // Jejak jadwal asal (pertama) supaya admin tahu sesi ini sudah dipindah
      rescheduledFrom: originSlot || scheduleSlot(schedule),
      rescheduledAt: new Date().toISOString(),
      ...clearPendingPatch,
    });

    toast.success(`Jadwal sesi dipindahkan ke ${fmtDate(newDate)} ${newStart}–${newEnd}.`);
    onOpenChange(false);
  };

  // Reschedule menggantung: jadwal pengganti belum ada. Kredit dan kuota cancel tidak berubah.
  const handleMarkPending = () => {
    if (!canReschedule) {
      toast.error("Hanya Admin Schedule yang berhak mereschedule sesi.");
      return;
    }
    updateSchedule(schedule.id, {
      status: "reschedule_pending",
      pendingFrom: scheduleSlot(schedule),
      pendingAt: new Date().toISOString(),
      pendingReason,
      pendingNote: pendingNote.trim() || null,
    });
    toast.info("Sesi ditandai menunggu jadwal pengganti. Kredit tidak berubah dan tidak dihitung sebagai cancel.");
    onOpenChange(false);
  };

  // Batalkan sesi yang menggantung tanpa memotong kredit / kuota cancel
  const handleDropPending = () => {
    if (!canCancel) {
      toast.error("Hanya Admin Schedule yang berhak membatalkan sesi.");
      return;
    }
    updateSchedule(schedule.id, {
      status: "cancelled",
      cancelReason: RESCHEDULE_DROPPED,
      notes: dropNote.trim() || null,
      ...clearPendingPatch,
    });
    toast.success("Sesi dibatalkan tanpa memotong kredit dan tidak dihitung ke kuota cancel.");
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
            <div className="flex items-center gap-2">
              {readOnly && (
                <span className="text-[11px] font-extrabold uppercase bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-full">
                  Read-Only
                </span>
              )}
              <StatusBadge status={schedule.status} />
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Client & Therapist Metadata */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-400">Praktisi Terapis</span>
              <p className="font-bold text-slate-900 mt-0.5">{therapist?.name || "—"}</p>
              <p className="text-[11px] text-slate-500">{therapist?.specialty}</p>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-400">
                {schedule.type === "assessment" ? "Tipe Sesi" : "Paket Kredit Sesi"}
              </span>
              <p className="font-bold text-slate-900 mt-0.5">
                {schedule.type === "assessment"
                  ? "Sesi Asesmen Klinis"
                  : (targetPackage ? targetPackage.packageName : "Default (0 Kredit)")}
              </p>
              <p className="text-[11px] text-slate-500">
                {schedule.type === "assessment"
                  ? "Tanpa Kuota Kredit"
                  : `Sisa Saldo: ${record?.remainingCredit ?? 0} Sesi`}
              </p>
            </div>
          </div>

          {/* Penanda status reschedule (terlihat oleh semua peran) */}
          {isPending && (
            <div className="p-4 rounded-2xl bg-orange-50 border border-dashed border-orange-300 space-y-1.5" data-testid="session-pending-banner">
              <p className="font-extrabold text-orange-950 flex items-center gap-2">
                <Hourglass className="w-4 h-4 text-orange-600" /> Menunggu jadwal pengganti
              </p>
              <p className="text-orange-900/90 leading-relaxed">
                Jadwal asal: <strong>{slotText(originSlot)}</strong>
                {originTherapist ? ` • ${originTherapist.name}` : ""}.
                {schedule.pendingReason && <> Alasan: <strong>{cancelReasonLabel(schedule.pendingReason)}</strong>.</>}
                {schedule.pendingAt && <> Ditandai {fmtDate(schedule.pendingAt.slice(0, 10))}.</>}
              </p>
              {schedule.pendingNote && <p className="text-orange-900/80 italic">"{schedule.pendingNote}"</p>}
              <p className="text-[11px] text-orange-800/80">Kredit tidak berubah dan tidak dihitung sebagai cancel.</p>
            </div>
          )}
          {!isPending && schedule.status === "rescheduled" && schedule.rescheduledFrom && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1" data-testid="session-moved-banner">
              <p className="font-extrabold text-amber-950 flex items-center gap-2">
                <CornerUpRight className="w-4 h-4 text-amber-600" /> Sudah dipindah jadwalnya
              </p>
              <p className="text-amber-900/90 leading-relaxed">
                Dari <strong>{slotText(schedule.rescheduledFrom)}</strong>
                {originTherapist ? ` (${originTherapist.name})` : ""} ke <strong>{slotText(schedule)}</strong>.
                {schedule.rescheduledAt && <> Dipindah {fmtDate(schedule.rescheduledAt.slice(0, 10))}.</>}
              </p>
            </div>
          )}
          {isCreditNeutralCancel(schedule) && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1" data-testid="session-dropped-banner">
              <p className="font-extrabold text-slate-900 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-slate-500" /> Dibatalkan dari reschedule yang menggantung
              </p>
              <p className="text-slate-600 leading-relaxed">Kredit tidak dipotong dan sesi ini tidak dihitung ke kuota cancel client.</p>
            </div>
          )}

          {/* Quick links for therapist / assessor */}
          {client && (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={isTherapist ? `/therapist/clients/${client.id}` : `/admin-schedule/clients/${client.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold hover:bg-emerald-100 transition-colors shadow-2xs"
                data-testid="session-modal-client-profile-link"
              >
                <User className="w-3.5 h-3.5 text-emerald-700" /> Profil Lengkap Client
              </Link>
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
                  to={isTherapist ? `/therapist/parent-assessment/${client.id}` : `/admin-inquiry/parent-assessment/${client.id}`}
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
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-sky-600" /> Laporan Sesi Klinis Terapis
                  </h4>
                  {activitySection?.trim() && noteSection?.trim() && homeworkSection?.trim() ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ✓ Laporan Lengkap (3/3)
                    </span>
                  ) : activitySection?.trim() || noteSection?.trim() || homeworkSection?.trim() ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      Sebagian Terisi ({[activitySection?.trim(), noteSection?.trim(), homeworkSection?.trim()].filter(Boolean).length}/3)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      Belum Diisi (0/3)
                    </span>
                  )}
                  {readOnly && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200">
                      Read-Only
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  {readOnly ? (
                    "Dokumentasi laporan sesi untuk ditinjau (read-only)."
                  ) : (
                    "Dapat diisi & disimpan kapan saja (Activity, Note & Homework)."
                  )}
                  {schedule.reportUpdatedAt && (
                    <span className="ml-1 text-slate-400 font-medium">
                      • Terakhir disimpan: {fmtDate(schedule.reportUpdatedAt.slice(0, 10))}
                    </span>
                  )}
                </p>
              </div>

              {!readOnly && (
                <Button size="sm" onClick={handleSaveReport} className="font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-xs" data-testid="save-report-button">
                  Simpan Laporan
                </Button>
              )}
            </div>

            {/* 1. Activity Section */}
            <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-200/90">
              <Label className="font-bold text-slate-800 flex items-center gap-2 text-xs">
                <BookOpen className="w-4 h-4 text-sky-600" /> 1. Activity Section (Aktivitas Sesi)
              </Label>
              {readOnly ? (
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs min-h-[60px] leading-relaxed text-slate-800" data-testid="readonly-activity-section">
                  {activitySection ? (
                    <p className="whitespace-pre-wrap">{activitySection}</p>
                  ) : (
                    <p className="text-slate-400 italic">Belum ada dokumentasi aktivitas klinis pada sesi ini.</p>
                  )}
                </div>
              ) : (
                <Textarea
                  className="rounded-xl border-slate-200 bg-white text-xs min-h-[85px] leading-relaxed p-3"
                  placeholder="Dokumentasi aktivitas klinis yang dilakukan bersama anak (stimulasi sensori, motor planning, latihan fokus)..."
                  value={activitySection}
                  onChange={(e) => setActivitySection(e.target.value)}
                  data-testid="textarea-activity-section"
                />
              )}
            </div>

            {/* 2. Note Section */}
            <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-200/90">
              <Label className="font-bold text-slate-800 flex items-center gap-2 text-xs">
                <StickyNote className="w-4 h-4 text-amber-600" /> 2. Note Section (Catatan Evaluasi & Observasi Terapis)
              </Label>
              {readOnly ? (
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs min-h-[60px] leading-relaxed text-slate-800" data-testid="readonly-note-section">
                  {noteSection ? (
                    <p className="whitespace-pre-wrap">{noteSection}</p>
                  ) : (
                    <p className="text-slate-400 italic">Belum ada catatan observasi klinis terapis pada sesi ini.</p>
                  )}
                </div>
              ) : (
                <Textarea
                  className="rounded-xl border-slate-200 bg-white text-xs min-h-[85px] leading-relaxed p-3"
                  placeholder="Catatan perkembangan, observasi perilaku, mood anak, respon stimulasi, atau catatan klinis penting..."
                  value={noteSection}
                  onChange={(e) => setNoteSection(e.target.value)}
                  data-testid="textarea-note-section"
                />
              )}
            </div>

            {/* 3. Homework Section */}
            <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-200/90">
              <Label className="font-bold text-slate-800 flex items-center gap-2 text-xs">
                <Home className="w-4 h-4 text-emerald-600" /> 3. Homework Section (Aktivitas Rumah untuk Ortu)
              </Label>
              {readOnly ? (
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs min-h-[60px] leading-relaxed text-slate-800" data-testid="readonly-homework-section">
                  {homeworkSection ? (
                    <p className="whitespace-pre-wrap">{homeworkSection}</p>
                  ) : (
                    <p className="text-slate-400 italic">Belum ada panduan latihan rumah yang didokumentasikan.</p>
                  )}
                </div>
              ) : (
                <Textarea
                  className="rounded-xl border-slate-200 bg-white text-xs min-h-[85px] leading-relaxed p-3"
                  placeholder="Panduan latihan mandiri yang dapat diterapkan orang tua di rumah agar stimulasi berkelanjutan..."
                  value={homeworkSection}
                  onChange={(e) => setHomeworkSection(e.target.value)}
                  data-testid="textarea-homework-section"
                />
              )}
            </div>
          </div>

          {/* READ-ONLY BANNER OR ACTION MODES: COMPLETE / CANCEL / RESCHEDULE */}
          {readOnly ? (
            <div className="pt-4 border-t border-slate-200">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2 leading-relaxed" data-testid="session-modal-readonly-notice">
                <span className="font-bold text-slate-800">Mode Baca (Read-Only):</span>
                <span>Riwayat sesi klinis pada profil client ini bersifat read-only. Pengisian & revisi laporan sesi aktif dilakukan melalui menu <strong>My Clinical Schedule</strong>.</span>
              </div>
            </div>
          ) : actionable ? (
            <div className="pt-4 border-t border-slate-200 space-y-4">
              {mode === "view" && (
                <div className="space-y-3">
                  {canManageSchedule ? (
                    <>
                      {isPending ? (
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            className="bg-sky-600 hover:bg-sky-700 text-white font-bold"
                            onClick={() => {
                              setRescheduleKind("move");
                              setMode("reschedule");
                            }}
                            data-testid="session-assign-replacement-button"
                          >
                            Tetapkan Jadwal Pengganti
                          </Button>
                          <Button
                            variant="outline"
                            className="border-slate-300 text-slate-800 hover:bg-slate-100 font-bold"
                            onClick={() => setMode("drop")}
                            data-testid="session-drop-pending-button"
                          >
                            Batalkan Tanpa Potong Kredit
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              variant="outline"
                              className="border-slate-200 font-bold hover:bg-slate-100"
                              onClick={() => setMode("reschedule")}
                              data-testid="session-reschedule-button"
                            >
                              Reschedule Sesi
                            </Button>
                            <Button
                              variant="outline"
                              className="border-rose-200 text-rose-700 hover:bg-rose-50 font-bold"
                              onClick={() => setMode("cancel")}
                              data-testid="session-cancel-button"
                            >
                              Batalkan Sesi (Cancel)
                            </Button>
                          </div>

                          <Button size="lg"
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-sm shadow-emerald-600/20 gap-2"
                            onClick={handleComplete}
                            data-testid="session-complete-button"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Tandai Selesai (Completed Sesi)
                          </Button>
                        </>
                      )}
                    </>
                  ) : (
                    /* Role Therapist: No Cancel / Reschedule / Complete - Centralized to Admin Jadwal */
                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 text-xs space-y-2" data-testid="therapist-action-notice">
                      <div className="flex items-center gap-2 font-bold text-amber-950">
                        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Kewenangan Jadwal Terpusat di Admin Jadwal</span>
                      </div>
                      <p className="text-amber-900/90 leading-relaxed text-[11px]">
                        Sesuai SOP klinis Therapedia, pembatalan (<strong>Cancel</strong>), penjadwalan ulang (<strong>Reschedule</strong>), dan verifikasi kehadiran (<strong>Completed</strong>) dikelola secara terpusat oleh <strong>Admin Jadwal</strong>.
                      </p>
                      <div className="flex items-center gap-2 font-semibold text-emerald-800 bg-white/80 border border-emerald-200/80 rounded-xl p-2.5 text-[11px]">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Therapist berwenang mendokumentasikan <strong>Laporan Sesi Klinis (Activity & Homework)</strong> di atas kapanpun.</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CANCEL MODE */}
              {mode === "cancel" && (
                <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-3.5">
                  <h4 className="font-extrabold text-sm text-rose-900 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-rose-600" /> Pembatalan Sesi & Aturan Kuota
                  </h4>

                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700 text-xs">Pilih Alasan Pembatalan *</Label>
                    <Select value={cancelReason} onValueChange={setCancelReason}>
                      <SelectTrigger className="border-slate-200 bg-white font-semibold text-xs">
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

                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700 text-xs">Catatan Tambahan</Label>
                    <Input
                      className="border-slate-200 bg-white text-xs"
                      placeholder="e.g. Surat dokter terlampir via WA..."
                      value={cancelNote}
                      onChange={(e) => setCancelNote(e.target.value)}
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-rose-200 text-xs text-rose-900 space-y-1.5 leading-relaxed">
                    <p className="font-bold text-slate-900">Ketentuan Kuota Pembatalan:</p>
                    <p>• Cancel ke-1, 2, dan 3: Kuota izin wajar, <strong>kredit sesi tetap utuh</strong>.</p>
                    <p>• Cancel ke-4 dst (&gt;3x): Sistem mengenakan penalti dan <strong>langsung memotong 1 kredit dari paket sesi ini</strong> ({targetPackage?.packageName || "Paket Sesi"}).</p>
                    <p className="font-bold text-slate-900 pt-1">
                      Status Saat Ini: Client telah membatalkan {record?.cancelCountTotal || 0} kali sebelumnya.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 pt-1">
                    <Button variant="outline" className="font-bold flex-1" onClick={() => setMode("view")}>
                      Batal
                    </Button>
                    <Button className="bg-rose-600 hover:bg-rose-700 text-white font-bold flex-1" onClick={handleCancel}>
                      Konfirmasi Pembatalan
                    </Button>
                  </div>
                </div>
              )}

              {/* RESCHEDULE MODE */}
              {mode === "reschedule" && (
                <div className="p-4 sm:p-5 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-3.5">
                  <h4 className="font-extrabold text-sm text-sky-950 flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-sky-600" />
                    {isPending ? "Tetapkan Jadwal Pengganti" : "Reschedule Sesi"}
                  </h4>

                  {!isPending && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Jenis reschedule">
                      {[
                        ["move", "Pindah ke jadwal baru", "Pilih tanggal dan jam pengganti sekarang."],
                        ["pending", "Jadwal pengganti menyusul", "Tandai dulu; jadwal baru ditetapkan nanti."],
                      ].map(([value, title, hint]) => (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={rescheduleKind === value}
                          onClick={() => setRescheduleKind(value)}
                          className={cn(
                            "text-left p-3 rounded-xl border-2 transition-colors cursor-pointer",
                            rescheduleKind === value ? "bg-white border-sky-500 ring-2 ring-sky-200" : "bg-white/60 border-slate-200 hover:border-sky-300"
                          )}
                          data-testid={`reschedule-kind-${value}`}
                        >
                          <span className="block font-extrabold text-xs text-slate-900">{title}</span>
                          <span className="block text-[11px] text-slate-500 mt-0.5">{hint}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {!isPending && rescheduleKind === "pending" ? (
                    <>
                      <div className="space-y-1.5">
                        <Label className="font-bold text-slate-700 text-xs">Alasan Reschedule *</Label>
                        <Select value={pendingReason} onValueChange={setPendingReason}>
                          <SelectTrigger className="border-slate-200 bg-white font-semibold text-xs">
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
                      <div className="space-y-1.5">
                        <Label className="font-bold text-slate-700 text-xs">Catatan</Label>
                        <Input
                          className="border-slate-200 bg-white text-xs"
                          placeholder="e.g. Ortu minta jadwal pekan depan, menunggu konfirmasi hari..."
                          value={pendingNote}
                          onChange={(e) => setPendingNote(e.target.value)}
                        />
                      </div>
                      <div className="p-3.5 rounded-xl bg-white border border-orange-200 text-xs text-orange-950 space-y-1 leading-relaxed">
                        <p>• Sesi tetap di slot asal dengan tanda <strong>"menunggu jadwal pengganti"</strong> dan muncul di daftar tindak lanjut.</p>
                        <p>• <strong>Kredit tidak berubah</strong> dan <strong>tidak dihitung sebagai cancel</strong>.</p>
                        <p>• Nanti bisa ditetapkan jadwal penggantinya, atau dibatalkan tanpa memotong kredit.</p>
                      </div>
                      <div className="flex items-center gap-2.5 pt-1">
                        <Button variant="outline" className="font-bold flex-1" onClick={() => setMode("view")}>
                          Batal
                        </Button>
                        <Button className="bg-orange-600 hover:bg-orange-700 text-white font-bold flex-1" onClick={handleMarkPending} data-testid="session-mark-pending-button">
                          Tandai Menunggu Jadwal
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700 text-xs">Tanggal Baru (DD/MM/YYYY)</Label>
                    <DateFilterPicker
                      placeholder="DD/MM/YYYY"
                      className="w-full bg-white h-10"
                      value={newDate}
                      onChange={(e) => setNewDate(e?.target?.value ?? e)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1.5">
                      <Label className="font-bold text-slate-700 text-xs">Jam Mulai</Label>
                      <Select value={newStart} onValueChange={setNewStart}>
                        <SelectTrigger className="border-slate-200 bg-white text-xs font-semibold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200">
                          {TIME_OPTIONS.slice(0, -1).map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-bold text-slate-700 text-xs">Jam Selesai</Label>
                      <Select value={newEnd} onValueChange={setNewEnd}>
                        <SelectTrigger className="border-slate-200 bg-white text-xs font-semibold">
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

                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700 text-xs">Terapis</Label>
                    <Select value={newTherapist} onValueChange={setNewTherapist}>
                      <SelectTrigger className="border-slate-200 bg-white text-xs font-semibold">
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
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                      {rescheduleConflicts.map((c, i) => (
                        <p key={i}>{c}</p>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2.5 pt-1">
                    <Button variant="outline" className="font-bold flex-1" onClick={() => setMode("view")}>
                      Batal
                    </Button>
                    <Button className="bg-sky-600 hover:bg-sky-700 text-white font-bold flex-1" onClick={handleReschedule} data-testid="session-save-reschedule-button">
                      {isPending ? "Tetapkan Jadwal" : "Simpan Jadwal Baru"}
                    </Button>
                  </div>
                    </>
                  )}
                </div>
              )}

              {/* DROP MODE: batalkan sesi yang menggantung tanpa potong kredit */}
              {mode === "drop" && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-300 space-y-3.5">
                  <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-slate-600" /> Batalkan Tanpa Potong Kredit
                  </h4>
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700 text-xs">Catatan (opsional)</Label>
                    <Input
                      className="border-slate-200 bg-white text-xs"
                      placeholder="e.g. Ortu memutuskan tidak melanjutkan sesi ini..."
                      value={dropNote}
                      onChange={(e) => setDropNote(e.target.value)}
                    />
                  </div>
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 space-y-1 leading-relaxed">
                    <p>• <strong>Kredit tidak dipotong</strong> dan sesi tidak dihitung ke <strong>kuota cancel</strong> client.</p>
                    <p>• Berbeda dengan pembatalan biasa (cancel ke-4 dst. dikenai penalti 1 kredit).</p>
                    <p>• Sesi tercatat sebagai dibatalkan dengan alasan <strong>{cancelReasonLabel(RESCHEDULE_DROPPED)}</strong>.</p>
                  </div>
                  <div className="flex items-center gap-2.5 pt-1">
                    <Button variant="outline" className="font-bold flex-1" onClick={() => setMode("view")}>
                      Kembali
                    </Button>
                    <Button className="bg-slate-800 hover:bg-slate-900 text-white font-bold flex-1" onClick={handleDropPending} data-testid="session-confirm-drop-button">
                      Konfirmasi Pembatalan
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
};
