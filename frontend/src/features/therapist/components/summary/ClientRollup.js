import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/components/EmptyState";
import { FileText, Printer, StickyNote, Users } from "lucide-react";
import { calcAge, fmtDate } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Link } from "react-router-dom";
import { Button } from "@/shared/ui/button";

export function ClientRollup({ completedSchedules, filteredClients, handleOpenClientDrawer }) {
  return (
    <div className="space-y-4">
          {filteredClients.length === 0 ? (
            <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs p-8">
              <EmptyState
                icon={Users}
                title="Tidak Ada Client Ditemukan"
                subtitle="Tidak ada data client yang sesuai dengan kata kunci pencarian atau filter."
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredClients.map((client) => {
                const clientSessions = completedSchedules.filter((s) => s.clientId === client.id);
                const totalC = clientSessions.length;
                const completedReports = clientSessions.filter(
                  (s) => s.activitySection?.trim() && s.noteSection?.trim() && s.homeworkSection?.trim()
                ).length;
                const pendingC = totalC - completedReports;
                const percent = totalC > 0 ? Math.round((completedReports / totalC) * 100) : 0;
                const latestSession = clientSessions[0];

                return (
                  <Card
                    key={client.id}
                    className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                    data-testid={`summary-client-card-${client.id}`}
                  >
                    <CardHeader className="p-5 pb-3 border-b border-slate-100 bg-slate-50/50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-sky-100 text-sky-800 font-black text-sm flex items-center justify-center shrink-0 shadow-2xs">
                            {client.clientName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <CardTitle className="text-base font-bold text-slate-900 leading-tight">
                              {client.clientName}
                            </CardTitle>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Usia {calcAge(client.dob) != null ? `${calcAge(client.dob)} Th` : "—"} • DOB: {fmtDate(client.dob)}
                            </p>
                          </div>
                        </div>

                        {pendingC > 0 ? (
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                            {pendingC} Belum Lengkap
                          </span>
                        ) : (
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                            ✓ 100% Lengkap
                          </span>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 space-y-4 text-xs flex-1">
                      {/* Documentation Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-slate-600">Kelengkapan Laporan Klinis:</span>
                          <span className={percent === 100 ? "text-emerald-700" : "text-amber-700"}>
                            {completedReports} dari {totalC} Sesi ({percent}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all duration-300 rounded-full",
                              percent === 100 ? "bg-emerald-500" : "bg-amber-500"
                            )}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Demographics details */}
                      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-400 font-bold uppercase text-[11px]">Orang Tua / Wali</span>
                          <p className="font-bold text-slate-800 mt-0.5 truncate">{client.parentName || "—"}</p>
                          <p className="text-slate-500 font-mono text-[11px]">{client.parentContact || "—"}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-400 font-bold uppercase text-[11px]">Sesi Terakhir</span>
                          <p className="font-bold text-slate-800 mt-0.5">
                            {latestSession ? fmtDate(latestSession.date) : "—"}
                          </p>
                          <p className="text-slate-500 text-[11px]">
                            {latestSession ? `${latestSession.startTime}–${latestSession.endTime}` : ""}
                          </p>
                        </div>
                      </div>

                      {/* Latest Note preview */}
                      {latestSession && (latestSession.noteSection || latestSession.progressNote) && (
                        <div className="p-2.5 rounded-xl bg-sky-50/50 border border-sky-100 space-y-1">
                          <p className="text-[11px] font-bold text-sky-800 uppercase flex items-center gap-1">
                            <StickyNote className="w-3 h-3 text-sky-600" /> Catatan Sesi Terakhir:
                          </p>
                          <p className="text-slate-700 line-clamp-2 leading-relaxed italic text-[11px]">
                            "{latestSession.noteSection || latestSession.progressNote}"
                          </p>
                        </div>
                      )}
                    </CardContent>

                    {/* Card Footer Actions */}
                    <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between gap-2">
                      <Link
                        to={`/therapist/clients/${client.id}`}
                        className="text-[11px] font-bold text-slate-600 hover:text-slate-900"
                      >
                        Buka Profil
                      </Link>

                      <div className="flex items-center gap-2">
                        <Link to={`/print/client/${client.id}`} target="_blank">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[11px] font-bold border-slate-200"
                            title="Cetak Summary PDF"
                          >
                            <Printer className="w-3 h-3 text-slate-600" />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          className="text-[11px] font-bold bg-sky-600 hover:bg-sky-700 text-white gap-1.5 shadow-2xs"
                          onClick={() => handleOpenClientDrawer(client)}
                          data-testid={`btn-open-client-drawer-${client.id}`}
                        >
                          <FileText className="w-3.5 h-3.5" /> Buka Riwayat Laporan
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
  );
}
