import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Clock,
  Calendar,
  User,
  Phone,
  FileText,
  Printer,
  ExternalLink,
  BookOpen,
  StickyNote,
  Home,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  ClipboardCheck,
  ChevronRight
} from "lucide-react";
import { fmtDate, calcAge, BRANCHES } from "@/lib/appUtils";
import { cn } from "@/lib/utils";

export function ClientReportHistoryDrawer({
  client,
  open,
  onOpenChange,
  schedules = [],
  onEditReport,
}) {
  const clientCompletedSchedules = useMemo(() => {
    if (!client) return [];
    return schedules
      .filter((s) => s.clientId === client.id && s.status === "completed")
      .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
  }, [client, schedules]);

  if (!client) return null;

  const br = BRANCHES.find((b) => b.id === client.branchId);

  const totalSessions = clientCompletedSchedules.length;
  const fullyDocumented = clientCompletedSchedules.filter(
    (s) => s.activitySection?.trim() && s.noteSection?.trim() && s.homeworkSection?.trim()
  ).length;
  const pendingDocumented = totalSessions - fullyDocumented;
  const completionPercentage = totalSessions > 0 ? Math.round((fullyDocumented / totalSessions) * 100) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 flex flex-col bg-white overflow-hidden shadow-2xl border-l border-slate-200"
        data-testid="client-report-history-drawer"
      >
        {/* Header */}
        <SheetHeader className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-200">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-black text-xs">
                  {client.clientName.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <SheetTitle className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                    {client.clientName}
                  </SheetTitle>
                  <p className="text-xs text-slate-500 font-medium">
                    Usia {calcAge(client.dob) != null ? `${calcAge(client.dob)} Th` : "—"} • DOB: {fmtDate(client.dob)} • {br ? br.name : "Surabaya"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Link to={`/print/client/${client.id}`} target="_blank">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-bold rounded-xl gap-1.5 border-slate-200 shadow-2xs"
                  title="Cetak Resume Klinis PDF"
                  data-testid="btn-drawer-print"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" /> Cetak PDF
                </Button>
              </Link>
            </div>
          </div>

          {/* KPI Mini Bar */}
          <div className="grid grid-cols-3 gap-2.5 pt-3 text-xs">
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Sesi Selesai</span>
              <p className="text-sm font-extrabold text-slate-900 mt-0.5">{totalSessions} Sesi</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-800 uppercase">Laporan Lengkap</span>
              <p className="text-sm font-extrabold text-emerald-700 mt-0.5">
                {fullyDocumented} ({completionPercentage}%)
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 shadow-2xs">
              <span className="text-[10px] font-bold text-amber-800 uppercase">Perlu Dilengkapi</span>
              <p className="text-sm font-extrabold text-amber-700 mt-0.5">{pendingDocumented} Sesi</p>
            </div>
          </div>

          {/* Quick links strip */}
          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
            <Link
              to={`/therapist/clients/${client.id}`}
              className="font-bold text-sky-700 hover:text-sky-900 hover:underline flex items-center gap-1 text-[11px]"
            >
              <User className="w-3 h-3" /> Buka Profil Detail Client
            </Link>
            {(client.assessmentAnswers || []).length > 0 && (
              <>
                <span className="text-slate-300">•</span>
                <Link
                  to={`/therapist/parent-assessment/${client.id}`}
                  className="font-bold text-purple-700 hover:text-purple-900 hover:underline flex items-center gap-1 text-[11px]"
                >
                  <ClipboardCheck className="w-3 h-3" /> Kuesioner Ortu
                </Link>
              </>
            )}
            {client.gdriveClientLink && (
              <>
                <span className="text-slate-300">•</span>
                <a
                  href={client.gdriveClientLink}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-teal-700 hover:text-teal-900 hover:underline flex items-center gap-1 text-[11px]"
                >
                  <ExternalLink className="w-3 h-3" /> GDrive
                </a>
              </>
            )}
          </div>
        </SheetHeader>

        {/* Timeline Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          <div className="flex items-center justify-between pb-1">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" /> Linimasa Riwayat Laporan Sesi Selesai
            </h4>
            <span className="text-[11px] text-slate-400 font-medium">Urutan terbaru</span>
          </div>

          {clientCompletedSchedules.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-2">
              <Calendar className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-600">Belum ada sesi selesai</p>
              <p>Belum ada rekaman sesi dengan status 'completed' untuk client ini.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {clientCompletedSchedules.map((s, idx) => {
                const isComplete =
                  Boolean(s.activitySection?.trim()) &&
                  Boolean(s.noteSection?.trim()) &&
                  Boolean(s.homeworkSection?.trim());
                const isPartial =
                  !isComplete &&
                  Boolean(s.activitySection?.trim() || s.noteSection?.trim() || s.homeworkSection?.trim());

                return (
                  <div
                    key={s.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-sky-300 transition-all space-y-3"
                    data-testid={`drawer-session-card-${s.id}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 flex items-center gap-1 text-xs">
                          <Calendar className="w-3.5 h-3.5 text-sky-600" />
                          {fmtDate(s.date)}
                        </span>
                        <span className="text-slate-500 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded-md font-semibold">
                          {s.startTime} – {s.endTime}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {s.type === "assessment" ? "Asesmen Klinis" : "Sesi Terapi"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isComplete ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Lengkap (3/3)
                          </span>
                        ) : isPartial ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3 text-amber-600" /> Sebagian Terisi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3 text-rose-600" /> Belum Diisi (0/3)
                          </span>
                        )}

                        <Button
                          size="sm"
                          variant={isComplete ? "outline" : "default"}
                          className={cn(
                            "h-7 text-[11px] font-bold rounded-lg gap-1",
                            isComplete
                              ? "border-slate-200 hover:bg-slate-50"
                              : "bg-sky-600 hover:bg-sky-700 text-white shadow-2xs"
                          )}
                          onClick={() => onEditReport(s)}
                          data-testid={`btn-edit-drawer-report-${s.id}`}
                        >
                          <Edit3 className="w-3 h-3" />
                          {isComplete ? "Edit Laporan" : "Lengkapi Laporan"}
                        </Button>
                      </div>
                    </div>

                    {/* 3 Sections Display */}
                    <div className="space-y-2 text-xs">
                      {/* Activity */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-sky-800 uppercase flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-sky-600" /> Activity Section:
                        </span>
                        {s.activitySection ? (
                          <p className="text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                            {s.activitySection}
                          </p>
                        ) : (
                          <p className="text-slate-400 italic text-[11px]">Belum ada aktivitas yang dicatat.</p>
                        )}
                      </div>

                      {/* Note */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-amber-800 uppercase flex items-center gap-1">
                          <StickyNote className="w-3 h-3 text-amber-600" /> Note & Evaluasi Klinis:
                        </span>
                        {s.noteSection || s.progressNote ? (
                          <p className="text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                            {s.noteSection || s.progressNote}
                          </p>
                        ) : (
                          <p className="text-slate-400 italic text-[11px]">Belum ada catatan observasi klinis.</p>
                        )}
                      </div>

                      {/* Homework */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                          <Home className="w-3 h-3 text-emerald-600" /> Homework (Latihan Rumah Ortu):
                        </span>
                        {s.homeworkSection ? (
                          <p className="text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                            {s.homeworkSection}
                          </p>
                        ) : (
                          <p className="text-slate-400 italic text-[11px]">Belum ada panduan latihan mandiri rumah.</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
