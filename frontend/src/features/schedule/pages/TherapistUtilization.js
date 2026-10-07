import React, { useMemo, useState } from "react";
import { Clock, Gauge, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Button } from "@/shared/ui/button";
import { FilterBar, FilterField } from "@/shared/components/FilterBar";
import { BranchFilter } from "@/shared/components/BranchFilter";
import { PeriodFilter } from "@/shared/components/PeriodFilter";
import { EmptyState } from "@/shared/components/EmptyState";
import { BranchTag } from "@/shared/components/BranchTag";
import { TablePagination, usePagination } from "@/shared/components/TablePagination";
import { useUrlFilters } from "@/shared/hooks/useUrlFilters";
import { periodLabel, periodRange } from "@/shared/lib/periods";
import { fmtDate } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { useAuth } from "@/stores/authStore";
import { useTherapists } from "@/stores/therapistsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useHolidays } from "@/stores/holidaysStore";
import { hasAllBranchAccess } from "@/domain/auth";
import { branchName } from "@/domain/branch";
import { buildTherapistUtilization } from "@/domain/therapistUtilization";
import { maxSessionsOf } from "@/domain/workHours";
import { WorkHoursDialog } from "@/features/schedule/components/utilization/WorkHoursDialog";

const PERIODS = ["this_week", "7days", "this_month", "last_month", "quarter", "custom"];

const rateTone = (rate) => (rate >= 85 ? "text-rose-700" : rate >= 50 ? "text-emerald-700" : "text-amber-700");

// Utilisasi Terapis (revisi 7 Okt 2026): Availability & Utilization Rate per terapis dan cabang dari jam kerja + jadwal,
// serta pengaturan jam kerja per hari tiap terapis. Semua angka diturunkan (domain/therapistUtilization), tidak disimpan.
export default function TherapistUtilization() {
  const { auth, activeBranch } = useAuth();
  const { therapists } = useTherapists();
  const { schedules } = useSchedules();
  const { holidays } = useHolidays();
  const isMaster = hasAllBranchAccess(auth);
  const defaultBranch = !isMaster && auth?.branchId ? auth.branchId : activeBranch && activeBranch !== "all" ? activeBranch : "all";

  const { values: filters, setFilter, setFilters, reset } = useUrlFilters({ branch: defaultBranch, period: "this_month", start: "", end: "" });
  const [editing, setEditing] = useState(null);

  const range = useMemo(() => periodRange(filters.period, filters.start, filters.end), [filters.period, filters.start, filters.end]);

  const data = useMemo(
    () => (range ? buildTherapistUtilization({ therapists, schedules, holidays, from: range.from, to: range.to, branchId: filters.branch }) : null),
    [range, therapists, schedules, holidays, filters.branch]
  );

  const rows = useMemo(() => (data ? [...data.rows].sort((a, b) => b.utilizationRate - a.utilizationRate || a.name.localeCompare(b.name)) : []), [data]);
  const pg = usePagination(rows, 10, `${filters.branch}|${filters.period}|${filters.start}|${filters.end}`);
  const chartData = (data?.branches || []).map((b) => ({ name: branchName(b.branchId), Utilization: b.utilizationRate, Availability: b.availabilityRate }));

  const chips = [];
  if (filters.period !== "this_month") chips.push({ key: "period", label: `Periode: ${periodLabel(filters.period)}`, onRemove: () => setFilters({ period: "this_month", start: "", end: "" }) });
  if (filters.branch !== defaultBranch) chips.push({ key: "branch", label: `Cabang: ${filters.branch === "all" ? "Semua" : branchName(filters.branch)}`, onRemove: () => setFilter("branch", defaultBranch) });

  const total = data?.total;

  return (
    <div className="space-y-6" data-testid="therapist-utilization-page">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100/80 text-sky-800 text-xs font-semibold mb-2">
          <Gauge className="w-3.5 h-3.5 text-sky-600" /> Availability & Utilization
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Utilisasi Terapis</h1>
        <p className="text-sm text-slate-500 mt-1">
          Sesi tersedia dan terisi per terapis dan cabang: jadwal sesi (1 sesi = 1 jam) ÷ maksimal sesi per bulan yang diatur per terapis, disesuaikan dengan periode filter (hari libur dikurangi).
        </p>
      </div>

      <FilterBar title="Filter Utilisasi" chips={chips} onReset={reset} resultText={`${rows.length} terapis`}>
        <FilterField label="Cabang Klinik">
          <BranchFilter value={filters.branch} onChange={(v) => setFilter("branch", v)} isMaster={isMaster} />
        </FilterField>
        <PeriodFilter
          preset={filters.period}
          start={filters.start}
          end={filters.end}
          allowed={PERIODS}
          testidPrefix="utilization"
          onChange={({ preset, start, end }) =>
            setFilters({
              ...(preset !== undefined && { period: preset }),
              ...(start !== undefined && { start }),
              ...(end !== undefined && { end }),
            })
          }
        />
      </FilterBar>

      {!range ? (
        <Card className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500" data-testid="utilization-need-range">
          Isi tanggal mulai dan selesai pada rentang kustom untuk menghitung utilisasi.
        </Card>
      ) : (
        <>
          <p className="text-[11px] font-semibold text-slate-500" data-testid="utilization-range">
            Periode {fmtDate(range.from)} – {fmtDate(range.to)}
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1" data-testid="kpi-utilization">
              <span className="text-[11px] font-bold uppercase text-slate-400">Utilization Rate</span>
              <p className={cn("text-2xl font-black tabular-nums", rateTone(total.utilizationRate))}>{total.utilizationRate}%</p>
              <p className="text-[11px] text-slate-500">Sesi terisi ÷ kapasitas</p>
            </Card>
            <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1" data-testid="kpi-availability">
              <span className="text-[11px] font-bold uppercase text-slate-400">Availability Rate</span>
              <p className="text-2xl font-black tabular-nums text-sky-700">{total.availabilityRate}%</p>
              <p className="text-[11px] text-slate-500">Sesi kosong ÷ kapasitas</p>
            </Card>
            <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1" data-testid="kpi-filled">
              <span className="text-[11px] font-bold uppercase text-slate-400">Sesi Terisi</span>
              <p className="text-2xl font-black tabular-nums text-slate-900">{total.filledSessions}</p>
              <p className="text-[11px] text-slate-500">dari {total.capacitySessions} sesi kapasitas</p>
            </Card>
            <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1" data-testid="kpi-available">
              <span className="text-[11px] font-bold uppercase text-slate-400">Sesi Tersedia</span>
              <p className="text-2xl font-black tabular-nums text-emerald-700">{total.availableSessions}</p>
              <p className="text-[11px] text-slate-500">Siap diisi jadwal baru</p>
            </Card>
          </div>

          {chartData.length > 0 && (
            <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs" data-testid="utilization-branch-chart">
              <CardHeader className="pb-2 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900">Perbandingan per Cabang</CardTitle>
                <CardDescription className="text-xs text-slate-500">Utilization dan Availability (%) agregat seluruh terapis di cabang</CardDescription>
              </CardHeader>
              <CardContent className="h-64 pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Utilization" fill="#0284c7" radius={[6, 6, 0, 0]} maxBarSize={36} />
                    <Bar dataKey="Availability" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-600" /> Per Terapis ({rows.length})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Kapasitas = maksimal sesi per bulan terapis (1 sesi = 1 jam), disesuaikan dengan periode filter. Ubah lewat tombol Atur Kapasitas.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {rows.length === 0 ? (
                <EmptyState icon={Users} title="Tidak ada terapis" subtitle="Belum ada terapis pada cabang ini." />
              ) : (
                <Table stackOnMobile className="min-w-[860px] w-full" data-testid="utilization-table">
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 border-b border-slate-200">
                      <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6">Terapis & Cabang</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs text-center">Kapasitas</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs text-center">Terisi</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs text-center">Tersedia</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs min-w-[170px]">Utilization</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs text-center">Availability</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs pr-6 text-right">Maks Sesi / Bulan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pg.pageItems.map((r) => {
                      const therapist = therapists.find((t) => t.id === r.therapistId);
                      return (
                        <TableRow key={r.therapistId} className="border-b border-slate-100 text-xs" data-testid={`utilization-row-${r.therapistId}`}>
                          <TableCell data-nolabel className="py-3 pl-6">
                            <p className="font-bold text-slate-900">{r.name}</p>
                            <BranchTag branchId={r.branchId} className="mt-1 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200" />
                          </TableCell>
                          <TableCell data-label="Kapasitas" className="text-center tabular-nums">{r.capacitySessions} sesi</TableCell>
                          <TableCell data-label="Terisi" className="text-center tabular-nums font-semibold">{r.filledSessions}</TableCell>
                          <TableCell data-label="Tersedia" className="text-center tabular-nums font-semibold text-emerald-700">{r.availableSessions}</TableCell>
                          <TableCell data-label="Utilization">
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={r.utilizationRate} aria-valuemin={0} aria-valuemax={100}>
                                <div className="h-full rounded-full bg-sky-500" style={{ width: `${r.utilizationRate}%` }} />
                              </div>
                              <span className={cn("w-10 text-right font-black tabular-nums", rateTone(r.utilizationRate))} data-testid={`utilization-rate-${r.therapistId}`}>{r.utilizationRate}%</span>
                            </div>
                          </TableCell>
                          <TableCell data-label="Availability" className="text-center font-bold tabular-nums text-sky-700">{r.availabilityRate}%</TableCell>
                          <TableCell data-nolabel className="pr-6 text-right">
                            <p className="text-[11px] text-slate-500 mb-1" data-testid={`max-sessions-${r.therapistId}`}>{maxSessionsOf(therapist)} sesi / bulan</p>
                            <Button size="sm" variant="outline" className="gap-1.5 font-bold border-sky-200 text-sky-700 hover:bg-sky-50 min-h-10 md:min-h-0" onClick={() => setEditing(therapist)} data-testid={`edit-work-hours-${r.therapistId}`}>
                              <Clock className="w-3.5 h-3.5" /> Atur Kapasitas
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              <TablePagination {...pg} onPageChange={pg.setPage} onPageSizeChange={pg.setPageSize} noun="terapis" />
            </CardContent>
          </Card>
        </>
      )}

      <WorkHoursDialog therapist={editing} open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)} />
    </div>
  );
}
