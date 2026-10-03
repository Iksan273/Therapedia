import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import { CheckCircle2, FileText, LogOut, UserCheck, XCircle } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { PIPELINE_STATUSES } from "@/domain/client";
import { STATUS_META } from "@/domain/status";
import { fmtDate } from "@/shared/lib/format";

export function OutcomeCard({ client, handleOutcomeAdmit, handleOutcomeDoneAssessment, handleOutcomeDoneConsult, handleChangeStatus, setDiscontinueOpen, setDischargeOpen }) {
  const [targetStatus, setTargetStatus] = useState("");
  return (
    <Card className="rounded-2xl border-2 border-slate-300 bg-white shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/70 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                8
              </span>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Final Decision Outcomes</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Tentukan keputusan kelanjutan alur client di Therapedia
                </CardDescription>
              </div>
            </div>
            {client.finalOutcome && (
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                Outcome: {client.finalOutcome.toUpperCase()}
              </span>
            )}
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
              {/* Option 1: Admit to Active Client */}
              <div
                className={cn(
                  "relative p-4 rounded-xl border-2 transition-all flex flex-col justify-between gap-3 text-left group",
                  client.status === "admitted"
                    ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-300/40"
                    : "bg-white border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/20"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-extrabold text-sm text-emerald-900">Admit to Active</p>
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Masuk ke Active Client Roster & siap dijadwalkan. <strong>Bisa di-admit meski kredit masih 0</strong> (slot kalender berstatus Frozen ).
                  </p>
                </div>
                <Button
                  onClick={handleOutcomeAdmit} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full after:absolute after:inset-0 after:content-[''] after:rounded-xl">
                  {client.status === "admitted" ? "✓ Active Client" : "Admit Client"}
                </Button>
              </div>

              {/* Option 2: Done Consult */}
              <div
                className={cn(
                  "relative p-4 rounded-xl border-2 transition-all flex flex-col justify-between gap-3 text-left group",
                  client.status === "done_consult"
                    ? "bg-amber-50 border-amber-500 ring-2 ring-amber-300/40"
                    : "bg-white border-slate-200 hover:border-amber-400 hover:bg-amber-50/20"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-extrabold text-sm text-amber-900">Done Consult</p>
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Sesi konsultasi evaluasi selesai. Tidak melanjutkan sesi terapi berkala di klinik.
                  </p>
                </div>
                <Button
                  onClick={handleOutcomeDoneConsult} size="sm" variant="outline" className="border-amber-300 text-amber-900 hover:bg-amber-100 font-bold w-full after:absolute after:inset-0 after:content-[''] after:rounded-xl">
                  Tandai Selesai Konsul
                </Button>
              </div>

              {/* Option 3: Done Assessment */}
              <div
                className={cn(
                  "relative p-4 rounded-xl border-2 transition-all flex flex-col justify-between gap-3 text-left group",
                  client.status === "done_assessment"
                    ? "bg-indigo-50 border-indigo-500 ring-2 ring-indigo-300/40"
                    : "bg-white border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-extrabold text-sm text-indigo-900">Done Assessment</p>
                    <FileText className="w-4 h-4 text-indigo-600" />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Asesmen & penyerahan laporan klinis selesai. Tidak melanjutkan terapi aktif di cabang ini.
                  </p>
                </div>
                <Button
                  onClick={handleOutcomeDoneAssessment} size="sm" variant="outline" className="border-indigo-300 text-indigo-900 hover:bg-indigo-100 font-bold w-full after:absolute after:inset-0 after:content-[''] after:rounded-xl">
                  Tandai Selesai Asesmen
                </Button>
              </div>

              {/* Option 4: Discontinue */}
              <div
                className={cn(
                  "relative p-4 rounded-xl border-2 transition-all flex flex-col justify-between gap-3 text-left group",
                  client.status === "discontinued"
                    ? "bg-rose-50 border-rose-500 ring-2 ring-rose-300/40"
                    : "bg-white border-slate-200 hover:border-rose-400 hover:bg-rose-50/20"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-extrabold text-sm text-rose-900">Discontinue</p>
                    <XCircle className="w-4 h-4 text-rose-600" />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Batal atau tidak melanjutkan proses intake. Sertakan catatan alasan pembatalan.
                  </p>
                </div>
                <Button
                  onClick={() => setDiscontinueOpen(true)} size="sm" variant="outline" className="border-rose-300 text-rose-900 hover:bg-rose-100 font-bold w-full after:absolute after:inset-0 after:content-[''] after:rounded-xl">
                  Discontinue
                </Button>
              </div>

              {/* Option 5: Discharge */}
              <div
                className={cn(
                  "relative p-4 rounded-xl border-2 transition-all flex flex-col justify-between gap-3 text-left group",
                  client.status === "discharged"
                    ? "bg-slate-100 border-slate-500 ring-2 ring-slate-300/40"
                    : "bg-white border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-extrabold text-sm text-slate-900">Discharge</p>
                    <LogOut className="w-4 h-4 text-slate-600" />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Client selesai / keluar dari terapi aktif. Sertakan alasan discharge. Bisa diaktifkan kembali dari Active Clients.
                  </p>
                </div>
                <Button
                  onClick={() => setDischargeOpen(true)} size="sm" variant="outline" data-testid="outcome-discharge" className="border-slate-300 text-slate-800 hover:bg-slate-100 font-bold w-full after:absolute after:inset-0 after:content-[''] after:rounded-xl">
                  {client.status === "discharged" ? "✓ Discharged" : "Discharge"}
                </Button>
              </div>
            </div>

            {/* Ubah status manual ke tahap mana pun (koreksi salah klik / kembali ke tahap lain) */}
            <div className="pt-3 border-t border-slate-100 space-y-2" data-testid="manual-status-change">
              <p className="text-xs font-bold text-slate-700">Ubah status ke tahap lain</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Salah klik atau perlu kembali ke tahap sebelumnya? Pilih status tujuan (tahap mana pun), lalu terapkan. Perpindahan tercatat di riwayat client.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <Select value={targetStatus} onValueChange={setTargetStatus}>
                  <SelectTrigger className="sm:w-64 text-xs border-slate-200 bg-slate-50 font-semibold" data-testid="manual-status-select">
                    <SelectValue placeholder="Pilih status tujuan..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    {PIPELINE_STATUSES.filter((s) => s !== client.status).map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_META[s]?.label || s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!targetStatus}
                  className="font-bold border-slate-300 cursor-pointer"
                  onClick={() => {
                    handleChangeStatus(targetStatus);
                    setTargetStatus("");
                  }}
                  data-testid="manual-status-apply"
                >
                  Terapkan Status
                </Button>
              </div>
              {client.dateOfDiscontinue && client.status === "discontinued" && (
                <p className="text-[11px] font-semibold text-rose-700" data-testid="date-of-discontinue">Discontinue sejak {fmtDate(client.dateOfDiscontinue)}</p>
              )}
            </div>
          </CardContent>
        </Card>
  );
}
