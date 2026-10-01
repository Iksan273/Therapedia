import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Edit3, FileCheck2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function SummaryStats({ setActiveTab, setReportFilter, stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Sesi Selesai */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Sesi Selesai
              </span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                {stats.total}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">Rekam sesi terlaksana</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
            </div>
          </CardContent>
        </Card>

        {/* Laporan Perlu Dilengkapi (Urgent / Pending Action) */}
        <Card
          className={cn(
            "rounded-2xl border transition-all cursor-pointer overflow-hidden",
            stats.pendingDocumented > 0
              ? "border-amber-200 bg-amber-50/40 hover:bg-amber-50/70 hover:shadow-md"
              : "border-slate-200/90 bg-white shadow-2xs"
          )}
          onClick={() => {
            setReportFilter("pending");
            setActiveTab("sessions");
          }}
          title="Klik untuk memfilter sesi yang laporannya belum lengkap"
          data-testid="kpi-pending-reports"
        >
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  Perlu Dilengkapi
                </span>
                {stats.pendingDocumented > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                )}
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-900 tabular-nums">
                {stats.pendingDocumented}
              </p>
              <p className="text-[11px] text-amber-800/80 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {stats.pendingDocumented > 0 ? "Klik untuk lengkapi" : "Semua laporan terisi"}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100/80 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
              <Edit3 className="w-6 h-6 stroke-[2.2]" />
            </div>
          </CardContent>
        </Card>

        {/* Laporan Lengkap (3/3) */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Laporan Lengkap
              </span>
              <p className="text-2xl sm:text-3xl font-black text-emerald-700 tabular-nums">
                {stats.fullyDocumented}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                Tingkat kelengkapan: <strong className="text-slate-800">{stats.completionRate}%</strong>
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <FileCheck2 className="w-6 h-6 stroke-[2.2]" />
            </div>
          </CardContent>
        </Card>

        {/* Total Client Binaan */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Client Selesai Sesi
              </span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                {stats.uniqueClientCount}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">Anak unik ditangani</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 stroke-[2.2]" />
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
