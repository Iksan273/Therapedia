import React from "react";
import { Card } from "@/shared/ui/card";
import { CalendarCheck, ClipboardList, Clock, FileCheck2, UserCheck, UserX } from "lucide-react";

export function KpiCards({ admittedCount, assessmentDoneCount, assessmentScheduledCount, awaitingQuestionnaires, conversionRate, discontinuedCount, totalInquiries }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Total Inquiry</span>
            <span className="p-1.5 rounded-lg bg-sky-50 text-sky-700"><ClipboardList className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-black text-slate-900 tabular-nums">{totalInquiries}</p>
          <p className="text-[11px] text-slate-500">Konversi: <strong className="text-emerald-700">{conversionRate}%</strong></p>
        </Card>

        <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Asesmen Terjadwal</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700"><CalendarCheck className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-black text-blue-800 tabular-nums">{assessmentScheduledCount}</p>
          <p className="text-[11px] text-slate-500">Menunggu sesi klinis</p>
        </Card>

        <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Menunggu Kuesioner</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700"><Clock className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-black text-amber-800 tabular-nums">{awaitingQuestionnaires.length}</p>
          <p className="text-[11px] text-amber-700 font-semibold">Perlu follow-up ortu</p>
        </Card>

        <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Asesmen Selesai</span>
            <span className="p-1.5 rounded-lg bg-teal-50 text-teal-700"><FileCheck2 className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-black text-teal-800 tabular-nums">{assessmentDoneCount}</p>
          <p className="text-[11px] text-slate-500">Siap keputusan akhir</p>
        </Card>

        <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Admitted (Active)</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700"><UserCheck className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-black text-emerald-800 tabular-nums">{admittedCount}</p>
          <p className="text-[11px] text-emerald-700 font-bold">Masuk terapi aktif</p>
        </Card>

        <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Discontinued</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-700"><UserX className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-black text-rose-800 tabular-nums">{discontinuedCount}</p>
          <p className="text-[11px] text-rose-600 font-medium">Batal / Tidak lanjut</p>
        </Card>
      </div>
  );
}
