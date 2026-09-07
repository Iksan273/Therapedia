import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  BookOpen,
  StickyNote,
  Home,
  CheckCircle2,
  Sparkles,
  Clock,
  User,
  Calendar,
  X,
  Stethoscope
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSchedules } from "@/context/SchedulesContext";
import { useClients } from "@/context/ClientsContext";
import { fmtDate } from "@/lib/appUtils";
import { cn } from "@/lib/utils";

const STARTER_TEMPLATES = [
  {
    target: "activity",
    label: "+ Sensori Integrasi (Tactile)",
    text: "Latihan sensorik integrasi dengan tactile bin (beras warna & sensory sand). Anak melatih toleransi tekstur dan eksplorasi sensori aktif.",
  },
  {
    target: "activity",
    label: "+ Motor Planning (Obstacle Course)",
    text: "Aktivitas motor planning meniti balok titian, lompat trampolin terarah, dan panjat tangga busa untuk stimulasi vestibular & proprioseptif.",
  },
  {
    target: "note",
    label: "+ Regulasi Emosi & Fokus",
    text: "Anak menunjukkan regulasi diri yang baik, atensi bersama (joint attention) meningkat hingga 15 menit, kontak mata konsisten saat instruksi verbal diberikan.",
  },
  {
    target: "note",
    label: "+ Respon Stimulasi Positif",
    text: "Respon positif terhadap stimulasi vestibular berayun; modulasi sensori stabil tanpa tanda-tanda overstimulasi.",
  },
  {
    target: "homework",
    label: "+ Home Program: Bermain Tekstur",
    text: "Lanjutkan bermain adonan playdough atau spons busa di rumah 10-15 menit setiap sore sebelum mandi untuk desensitisasi taktil.",
  },
  {
    target: "homework",
    label: "+ Home Program: Deep Pressure",
    text: "Lakukan pijat deep pressure (tekanan lembut berirama) pada lengan dan tungkai anak sebelum tidur selama 5-7 menit.",
  },
];

export function SessionReportModal({ schedule, open, onOpenChange }) {
  const { updateSchedule } = useSchedules();
  const { clients } = useClients();

  const [activitySection, setActivitySection] = useState("");
  const [noteSection, setNoteSection] = useState("");
  const [homeworkSection, setHomeworkSection] = useState("");

  useEffect(() => {
    if (schedule && open) {
      setActivitySection(schedule.activitySection || "");
      setNoteSection(schedule.noteSection || schedule.progressNote || "");
      setHomeworkSection(schedule.homeworkSection || "");
    }
  }, [schedule, open]);

  if (!schedule) return null;

  const client = clients.find((c) => c.id === schedule.clientId);

  const filledCount = [
    activitySection.trim(),
    noteSection.trim(),
    homeworkSection.trim(),
  ].filter(Boolean).length;

  const handleApplyTemplate = (item) => {
    if (item.target === "activity") {
      setActivitySection((prev) => (prev ? `${prev}\n${item.text}` : item.text));
    } else if (item.target === "note") {
      setNoteSection((prev) => (prev ? `${prev}\n${item.text}` : item.text));
    } else if (item.target === "homework") {
      setHomeworkSection((prev) => (prev ? `${prev}\n${item.text}` : item.text));
    }
    toast.info(`Template "${item.label}" ditambahkan.`);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const now = new Date().toISOString();

    updateSchedule(schedule.id, {
      activitySection: activitySection.trim(),
      noteSection: noteSection.trim(),
      progressNote: noteSection.trim(),
      homeworkSection: homeworkSection.trim(),
      reportUpdatedAt: now,
    });

    toast.success(
      `Laporan sesi untuk ${client ? client.clientName : "Client"} berhasil disimpan!`
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl p-0 overflow-hidden border-slate-200" data-testid="session-report-modal">
        {/* Header */}
        <DialogHeader className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-200">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[11px] font-bold">
                  <Stethoscope className="w-3.5 h-3.5 text-sky-600" />
                  Dokumentasi Klinis Terapis
                </span>
                {filledCount === 3 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Lengkap (3/3)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    {filledCount}/3 Bagian Terisi
                  </span>
                )}
              </div>
              <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 tracking-tight pt-1">
                {client ? client.clientName : "Pasien Terapi"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {fmtDate(schedule.date)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {schedule.startTime} – {schedule.endTime}
                </span>
                {schedule.reportUpdatedAt && (
                  <span className="text-[11px] text-slate-400 italic">
                    (Disimpan: {fmtDate(schedule.reportUpdatedAt.slice(0, 10))})
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body Content */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4 max-h-[72vh] overflow-y-auto">
          {/* Quick Helper Templates */}
          <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-200/80 space-y-2">
            <p className="text-[11px] font-bold text-sky-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              Template Catatan Klinis Cepat (Klik untuk menyisipkan teks):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {STARTER_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white border border-sky-200 text-slate-700 hover:bg-sky-100 hover:text-sky-900 transition-colors shadow-2xs cursor-pointer"
                >
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* 1. Activity Section */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-sky-600" />
                1. Activity Section (Aktivitas Klinis Sesi)
              </span>
              {activitySection.trim() ? (
                <span className="text-[10px] font-bold text-emerald-600">✓ Terisi</span>
              ) : (
                <span className="text-[10px] font-medium text-slate-400">Belum diisi</span>
              )}
            </Label>
            <Textarea
              className="rounded-xl border-slate-200 bg-slate-50 text-xs min-h-[90px] leading-relaxed p-3 focus:bg-white"
              placeholder="Tuliskan aktivitas dan stimulasi yang dilakukan (misal: stimulasi taktil, latihan rintangan, perosotan, koordinasi kedua tangan)..."
              value={activitySection}
              onChange={(e) => setActivitySection(e.target.value)}
              data-testid="report-input-activity"
            />
          </div>

          {/* 2. Note Section */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5 text-amber-600" />
                2. Note Section (Catatan Evaluasi & Observasi Terapis)
              </span>
              {noteSection.trim() ? (
                <span className="text-[10px] font-bold text-emerald-600">✓ Terisi</span>
              ) : (
                <span className="text-[10px] font-medium text-slate-400">Belum diisi</span>
              )}
            </Label>
            <Textarea
              className="rounded-xl border-slate-200 bg-slate-50 text-xs min-h-[90px] leading-relaxed p-3 focus:bg-white"
              placeholder="Catat perkembangan, respon sensori, kestabilan emosi, durasi atensi, kepatuhan instruksi, atau milestone yang tercapai..."
              value={noteSection}
              onChange={(e) => setNoteSection(e.target.value)}
              data-testid="report-input-note"
            />
          </div>

          {/* 3. Homework Section */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-emerald-600" />
                3. Homework Section (Panduan Latihan Rumah untuk Ortu)
              </span>
              {homeworkSection.trim() ? (
                <span className="text-[10px] font-bold text-emerald-600">✓ Terisi</span>
              ) : (
                <span className="text-[10px] font-medium text-slate-400">Belum diisi</span>
              )}
            </Label>
            <Textarea
              className="rounded-xl border-slate-200 bg-slate-50 text-xs min-h-[90px] leading-relaxed p-3 focus:bg-white"
              placeholder="Rekomendasi latihan stimulasi mandiri yang dapat diterapkan keluarga di rumah agar hasil terapi berkesinambungan..."
              value={homeworkSection}
              onChange={(e) => setHomeworkSection(e.target.value)}
              data-testid="report-input-homework"
            />
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl text-xs"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold px-5"
              data-testid="btn-save-session-report"
            >
              Simpan Laporan Sesi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
