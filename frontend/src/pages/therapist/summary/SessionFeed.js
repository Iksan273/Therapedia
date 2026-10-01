import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";
import { AlertTriangle, BookOpen, Calendar, CheckCircle2, Edit3, FileText, Home, StickyNote, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { calcAge, fmtDate } from "@/lib/appUtils";
import { Link } from "react-router-dom";

export function SessionFeed({ clients, filteredSchedules, getDayName, handleOpenClientDrawer, handleOpenReportModal, setClientFilter, setDateFilter, setReportFilter, setSearchQuery }) {
  return (
    <div className="space-y-3">
          {filteredSchedules.length === 0 ? (
            <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs p-8">
              <EmptyState
                icon={Calendar}
                title="Tidak Ada Sesi yang Sesuai Filter"
                subtitle="Tidak ditemukan jadwal sesi berstatus 'completed' dengan kriteria filter yang Anda pilih saat ini."
                action={
                  <Button
                    variant="outline"
                    className=""
                    onClick={() => {
                      setClientFilter("all");
                      setReportFilter("all");
                      setDateFilter("all");
                      setSearchQuery("");
                    }}
                  >
                    Reset Filter
                  </Button>
                }
              />
            </Card>
          ) : (
            filteredSchedules.map((s) => {
              const client = clients.find((c) => c.id === s.clientId);
              const dayName = getDayName(s.date);
              const isComplete =
                Boolean(s.activitySection?.trim()) &&
                Boolean(s.noteSection?.trim()) &&
                Boolean(s.homeworkSection?.trim());
              const isPartial =
                !isComplete &&
                Boolean(s.activitySection?.trim() || s.noteSection?.trim() || s.homeworkSection?.trim());

              const filledParts = [
                Boolean(s.activitySection?.trim()),
                Boolean(s.noteSection?.trim() || s.progressNote?.trim()),
                Boolean(s.homeworkSection?.trim()),
              ].filter(Boolean).length;

              return (
                <Card
                  key={s.id}
                  className={cn(
                    "rounded-2xl border transition-all duration-150 overflow-hidden shadow-2xs group hover:shadow-md",
                    !isComplete
                      ? "border-amber-200/90 bg-white"
                      : "border-slate-200/90 bg-white"
                  )}
                  data-testid={`summary-session-row-${s.id}`}
                >
                  <CardContent className="p-4 sm:p-5 space-y-3.5">
                    {/* Top Row: Date, Client info, Badges & Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                          {client ? client.clientName.slice(0, 2).toUpperCase() : "PA"}
                        </div>

                        {/* Title & Demographics */}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-extrabold text-sm sm:text-base text-slate-900 leading-snug">
                              {client ? client.clientName : "Client"}
                            </p>
                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              {client && calcAge(client.dob) != null ? `${calcAge(client.dob)} Th` : ""}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              {s.type === "assessment" ? "Asesmen Klinis" : "Sesi Terapi"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 font-medium">
                            Orang Tua: <strong className="text-slate-700">{client ? client.parentName : "—"}</strong>
                            {client?.parentContact ? ` (${client.parentContact})` : ""}
                          </p>
                        </div>
                      </div>

                      {/* Time & Report Badge */}
                      <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold bg-slate-100 px-2.5 py-1 rounded-xl">
                          <Calendar className="w-3.5 h-3.5 text-sky-600" />
                          <span>{dayName ? `${dayName}, ` : ""}{fmtDate(s.date)}</span>
                          <span className="text-slate-400">•</span>
                          <span className="font-mono text-slate-600">{s.startTime}–{s.endTime}</span>
                        </div>

                        {isComplete ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Lengkap (3/3)
                          </span>
                        ) : isPartial ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            Sebagian ({filledParts}/3)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            Belum Ada Laporan (0/3)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Content preview snippet */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                      {/* Activity */}
                      <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-0.5">
                        <span className="text-[11px] font-bold text-sky-800 uppercase flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-sky-600" /> 1. Aktivitas Sesi:
                        </span>
                        <p className="text-slate-700 line-clamp-2 leading-relaxed">
                          {s.activitySection || (
                            <span className="text-slate-400 italic">Belum diisi</span>
                          )}
                        </p>
                      </div>

                      {/* Notes */}
                      <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-0.5">
                        <span className="text-[11px] font-bold text-amber-800 uppercase flex items-center gap-1">
                          <StickyNote className="w-3 h-3 text-amber-600" /> 2. Catatan Evaluasi:
                        </span>
                        <p className="text-slate-700 line-clamp-2 leading-relaxed">
                          {s.noteSection || s.progressNote || (
                            <span className="text-slate-400 italic">Belum diisi</span>
                          )}
                        </p>
                      </div>

                      {/* Homework */}
                      <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-0.5">
                        <span className="text-[11px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                          <Home className="w-3 h-3 text-emerald-600" /> 3. Home Program:
                        </span>
                        <p className="text-slate-700 line-clamp-2 leading-relaxed">
                          {s.homeworkSection || (
                            <span className="text-slate-400 italic">Belum diisi</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs">
                        {client && (
                          <button
                            type="button"
                            onClick={() => handleOpenClientDrawer(client)}
                            className="font-bold text-sky-700 hover:text-sky-900 hover:underline flex items-center gap-1 cursor-pointer min-h-9 py-1"
                          >
                            <FileText className="w-3.5 h-3.5" /> Buka Rekam Kumulatif Client
                          </button>
                        )}
                        <span className="text-slate-300">•</span>
                        {client && (
                          <Link
                            to={`/therapist/clients/${client.id}`}
                            className="text-slate-500 hover:text-slate-800 hover:underline flex items-center gap-1 min-h-9 py-1"
                          >
                            <User className="w-3.5 h-3.5" /> Profil Lengkap
                          </Link>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className={cn(
                            "font-bold gap-1.5 px-3.5 shadow-2xs",
                            isComplete
                              ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                              : "bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/20"
                          )}
                          onClick={() => handleOpenReportModal(s)}
                          data-testid={`btn-edit-report-${s.id}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          {isComplete ? "Lihat / Edit Laporan" : "Isi Laporan Sekarang"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
  );
}
