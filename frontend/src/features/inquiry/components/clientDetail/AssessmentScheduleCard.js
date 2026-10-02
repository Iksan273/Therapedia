import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { CalendarPlus } from "lucide-react";
import { fmtDate } from "@/shared/lib/format";
import { StatusBadge } from "@/shared/components/StatusBadge";

export function AssessmentScheduleCard({ assessmentSessions, getTherapist, setScheduleModalOpen }) {
  return (
    <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center">
                4
              </span>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Schedule Assessment ({assessmentSessions.length} Sesi Terjadwal)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Booking sesi asesmen klinis dengan praktisi terapis di kalender (bisa dijadwalkan lebih dari 1 sesi)
                </CardDescription>
              </div>
            </div>

            {/* BUTTON ALWAYS VISIBLE TO SCHEDULE MULTIPLE ASSESSMENTS */}
            <Button
              size="sm"
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold gap-1.5 shadow-xs"
              onClick={() => setScheduleModalOpen(true)}
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              {assessmentSessions.length === 0 ? "Jadwalkan Asesmen" : "+ Tambah Jadwal Asesmen"}
            </Button>
          </CardHeader>
          <CardContent className="p-4 text-xs text-slate-600 space-y-3">
            {assessmentSessions.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
                <p className="text-slate-400 italic">Belum ada sesi asesmen klinis yang dijadwalkan untuk klien ini.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="font-bold text-sky-700 border-sky-200 hover:bg-sky-50"
                  onClick={() => setScheduleModalOpen(true)}
                >
                  <CalendarPlus className="w-3.5 h-3.5 mr-1" /> Jadwalkan Sesi Asesmen Pertama
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pb-1">
                  <span>Daftar Sesi Asesmen Terjadwal:</span>
                  <span className="text-emerald-700 font-bold">
                    {assessmentSessions.filter((s) => s.status === "completed").length} dari {assessmentSessions.length} Selesai
                  </span>
                </div>

                {assessmentSessions.map((s, sIdx) => {
                  const therapist = getTherapist(s.therapistId);
                  return (
                    <div
                      key={s.id}
                      className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 flex items-center justify-between gap-3 hover:bg-white hover:border-slate-300 transition-all shadow-2xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {sIdx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900 text-xs">
                            Sesi Asesmen #{sIdx + 1} — {therapist?.name || "Terapis Klinis"}
                            {therapist?.specialty && (
                              <span className="ml-1 text-[11px] font-medium text-slate-500">
                                ({therapist.specialty})
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Tanggal: <strong>{fmtDate(s.date)}</strong> • Jam: <strong>{s.startTime} – {s.endTime}</strong>
                          </p>
                          {s.notes && (
                            <p className="text-[11px] text-slate-400 italic mt-0.5">
                              Catatan: {s.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={s.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
  );
}
