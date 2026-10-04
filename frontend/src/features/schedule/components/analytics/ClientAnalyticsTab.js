import DateFilterPicker from "@/shared/components/DateFilterPicker";
import React, { useMemo, useState } from "react";
import { isCreditedAbsence } from "@/domain/credit";
import { useNavigate } from "react-router-dom";
import { addWeeks, format, parseISO, startOfWeek } from "date-fns";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Users,
  Activity,
  CalendarClock,
  Wallet,
  Flame,
  CheckCircle2,
  Download,
  Snowflake,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  Baby,
  Layers,
  Stethoscope,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Button } from "@/shared/ui/button";
import { FilterBar, FilterField, SearchInput } from "@/shared/components/FilterBar";
import { BranchFilter } from "@/shared/components/BranchFilter";
import { BranchTag } from "@/shared/components/BranchTag";
import { TablePagination, usePagination } from "@/shared/components/TablePagination";
import { useSchedules } from "@/stores/schedulesStore";
import { useCredits } from "@/stores/creditsStore";
import { useTherapists } from "@/stores/therapistsStore";
import { useAuth } from "@/stores/authStore";
import { useMasterData } from "@/stores/masterDataStore";
import { PERIOD_OPTIONS, makePeriodMatcher, periodLabel } from "@/shared/lib/periods";
import { branchName } from "@/domain/branch";
import { calcAge, fmtDate } from "@/shared/lib/format";
import { isCreditNeutralCancel } from "@/domain/schedule";
import { getClientServiceIds, matchesClientSearch } from "@/domain/client";
import { todayStr } from "@/shared/lib/id";
import { cn } from "@/shared/lib/utils";

const COLOR = {
  completed: "#10b981",
  upcoming: "#0284c7",
  cancelled: "#f43f5e",
  amber: "#f59e0b",
  purple: "#8b5cf6",
  slate: "#94a3b8",
};
const REASON_COLORS = ["#f43f5e", "#f59e0b", "#8b5cf6", "#0ea5e9", "#64748b"];
const TOOLTIP_STYLE = { backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" };
const AXIS_TICK = { fontSize: 11, fill: "#64748b" };
const PERIODS = PERIOD_OPTIONS; // termasuk "Rentang Kustom" (pilih tanggal awal & akhir)
const SORTS = [
  { value: "attendance_asc", label: "Kehadiran terendah" },
  { value: "credit_asc", label: "Kredit tersedikit" },
  { value: "cancel_desc", label: "Tidak hadir terbanyak" },
  { value: "name", label: "Nama A–Z" },
];

const isUpcoming = (s) => s.status === "scheduled" || s.status === "rescheduled";

const KpiCard = ({ icon: Icon, tone, label, value, sub }) => (
  <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1.5">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
      <span className={cn("p-1.5 rounded-lg", tone)}>
        <Icon className="w-4 h-4" />
      </span>
    </div>
    <p className="text-2xl font-black text-slate-900 tabular-nums leading-none">{value}</p>
    <p className="text-xs text-slate-500 leading-snug">{sub}</p>
  </Card>
);

const ChartCard = ({ icon: Icon, iconClass, title, description, className, children }) => (
  <Card className={cn("rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden", className)}>
    <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
      <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
        <Icon className={cn("w-4 h-4", iconClass)} />
        {title}
      </CardTitle>
      {description && <CardDescription className="text-xs text-slate-500">{description}</CardDescription>}
    </CardHeader>
    <CardContent className="p-4 sm:p-5">{children}</CardContent>
  </Card>
);

const NoData = ({ icon: Icon = CheckCircle2, text }) => (
  <div className="h-48 flex flex-col items-center justify-center gap-2 text-center text-xs text-slate-400">
    <Icon className="w-7 h-7 text-slate-300" />
    {text}
  </div>
);

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export default function ClientAnalyticsTab({ activeList }) {
  const navigate = useNavigate();
  const { schedules } = useSchedules();
  const { getRecordForClient } = useCredits();
  const { therapists } = useTherapists();
  const { activeBranch, auth } = useAuth();
  const { getService, getCancelReasonLabel } = useMasterData();

  const isMaster = auth?.role === "master";
  const defaultBranch = isMaster ? activeBranch || "all" : auth?.branchId || activeBranch || "branch-sby-timur";

  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState(defaultBranch);
  const [therapistId, setTherapistId] = useState("all");
  const [period, setPeriod] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [sort, setSort] = useState("attendance_asc");

  const therapistOptions = useMemo(
    () => therapists.filter((t) => branch === "all" || !t.branchId || t.branchId === branch),
    [therapists, branch]
  );
  // Terapis yang dipilih bisa hilang dari daftar saat cabang diganti
  const effectiveTherapist = therapistOptions.some((t) => t.id === therapistId) ? therapistId : "all";
  const therapistName = (id) => therapists.find((t) => t.id === id)?.name?.split(",")[0] || id;

  // ---- Data dasar sesuai filter ----
  const scopeClients = useMemo(() => {
    return activeList.filter((c) => {
      if (branch !== "all" && c.branchId !== branch) return false;
      return matchesClientSearch(c, search);
    });
  }, [activeList, branch, search]);

  const scopeSchedules = useMemo(() => {
    const ids = new Set(scopeClients.map((c) => c.id));
    const inPeriod = makePeriodMatcher(period, customStart, customEnd);
    return schedules.filter(
      (s) =>
        ids.has(s.clientId) &&
        !isCreditNeutralCancel(s) && // sesi yang dibatalkan dari reschedule menggantung tidak memengaruhi kehadiran
        (effectiveTherapist === "all" || s.therapistId === effectiveTherapist) &&
        inPeriod(s.date || "")
    );
  }, [schedules, scopeClients, effectiveTherapist, period, customStart, customEnd]);

  const today = todayStr();

  const rows = useMemo(() => {
    const byClient = new Map();
    scopeSchedules.forEach((s) => {
      const list = byClient.get(s.clientId);
      if (list) list.push(s);
      else byClient.set(s.clientId, [s]);
    });

    const out = [];
    scopeClients.forEach((client) => {
      const sessions = byClient.get(client.id) || [];
      if (effectiveTherapist !== "all" && sessions.length === 0) return;

      const completed = sessions.filter((s) => s.status === "completed").length;
      const cancelled = sessions.filter((s) => s.status === "cancelled").length;
      // Tidak hadir = cancel yang memotong kredit (cancel tanpa potong kredit tidak dihitung)
      const absent = sessions.filter((s) => s.status === "cancelled" && isCreditedAbsence(getRecordForClient(client.id), s.id)).length;
      const upcoming = sessions.filter(isUpcoming);
      const finished = completed + absent;
      const next = upcoming
        .map((s) => s.date)
        .filter((d) => d && d >= today)
        .sort()[0];

      const rec = getRecordForClient(client.id);
      const remaining = rec ? rec.remainingCredit : 0;

      out.push({
        id: client.id,
        client,
        completed,
        cancelled,
        absent,
        upcomingCount: upcoming.length,
        attendanceRate: finished > 0 ? Math.round((completed / finished) * 100) : null,
        nextSession: next || null,
        remaining,
        total: rec ? rec.totalCredit : 0,
        creditStatus: remaining === 0 ? "zero" : remaining <= 2 ? "low" : "healthy",
      });
    });
    return out;
  }, [scopeClients, scopeSchedules, effectiveTherapist, getRecordForClient, today]);

  // ---- KPI ----
  const kpi = useMemo(() => {
    const completed = scopeSchedules.filter((s) => s.status === "completed").length;
    const cancelled = scopeSchedules.filter((s) => s.status === "cancelled" && isCreditedAbsence(getRecordForClient(s.clientId), s.id)).length; // tidak hadir (potong kredit)
    const upcoming = scopeSchedules.filter((s) => isUpcoming(s) && (s.date || "") >= today).length;
    const finished = completed + cancelled;
    const total = rows.reduce((a, r) => a + r.total, 0);
    const remaining = rows.reduce((a, r) => a + r.remaining, 0);
    return {
      clients: rows.length,
      withNext: rows.filter((r) => r.nextSession).length,
      completed,
      cancelled,
      attendance: finished > 0 ? Math.round((completed / finished) * 100) : null,
      upcoming,
      utilization: total > 0 ? Math.round(((total - remaining) / total) * 100) : null,
      remaining,
      needRenewal: rows.filter((r) => r.remaining <= 2).length,
      frozen: rows.filter((r) => r.remaining === 0).length,
    };
  }, [scopeSchedules, rows, today, getRecordForClient]);

  // ---- Tren mingguan: 6 minggu terakhir sampai 2 minggu ke depan ----
  const weeklyTrend = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    const buckets = Array.from({ length: 8 }, (_, i) => {
      const start = addWeeks(base, i - 5);
      return { key: format(start, "yyyy-MM-dd"), label: format(start, "d MMM"), completed: 0, upcoming: 0, cancelled: 0 };
    });
    const index = new Map(buckets.map((b) => [b.key, b]));
    scopeSchedules.forEach((s) => {
      if (!s.date) return;
      const key = format(startOfWeek(parseISO(s.date), { weekStartsOn: 1 }), "yyyy-MM-dd");
      const b = index.get(key);
      if (!b) return;
      if (s.status === "completed") b.completed += 1;
      else if (s.status === "cancelled") b.cancelled += 1;
      else if (isUpcoming(s)) b.upcoming += 1;
    });
    return buckets;
  }, [scopeSchedules]);
  const trendHasData = weeklyTrend.some((b) => b.completed + b.upcoming + b.cancelled > 0);

  // ---- Alasan pembatalan ----
  const cancelReasons = useMemo(() => {
    const counts = new Map();
    scopeSchedules.forEach((s) => {
      if (s.status !== "cancelled") return;
      const key = s.cancelReason || "lainnya";
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([key, value]) => ({ key, name: getCancelReasonLabel(key), value }))
      .sort((a, b) => b.value - a.value)
      .map((r, i) => ({ ...r, color: REASON_COLORS[i % REASON_COLORS.length] }));
  }, [scopeSchedules, getCancelReasonLabel]);

  // ---- Beban terapis ----
  const therapistLoad = useMemo(() => {
    const map = new Map();
    scopeSchedules.forEach((s) => {
      if (!s.therapistId) return;
      const row = map.get(s.therapistId) || { id: s.therapistId, completed: 0, upcoming: 0, cancelled: 0 };
      if (s.status === "completed") row.completed += 1;
      else if (s.status === "cancelled") row.cancelled += 1;
      else if (isUpcoming(s)) row.upcoming += 1;
      map.set(s.therapistId, row);
    });
    return [...map.values()]
      .map((r) => ({ ...r, name: therapistName(r.id), total: r.completed + r.upcoming + r.cancelled }))
      .sort((a, b) => b.total - a.total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeSchedules, therapists]);

  // ---- Kesehatan kredit ----
  const creditHealth = useMemo(() => {
    const healthy = rows.filter((r) => r.creditStatus === "healthy").length;
    const low = rows.filter((r) => r.creditStatus === "low").length;
    const zero = rows.filter((r) => r.creditStatus === "zero").length;
    return [
      { name: "Sehat (>2 sesi)", value: healthy, color: COLOR.completed },
      { name: "Menipis (1–2 sesi)", value: low, color: COLOR.amber },
      { name: "Frozen (0 sesi)", value: zero, color: "#06b6d4" },
    ];
  }, [rows]);

  const packageUsage = useMemo(() => {
    const fam = { regular: { used: 0, total: 0 }, senior: { used: 0, total: 0 } };
    rows.forEach((r) => {
      const rec = getRecordForClient(r.id);
      (rec?.packages || []).forEach((p) => {
        const key = /vip|senior/.test(`${p.packageId} ${p.packageName}`.toLowerCase()) ? "senior" : "regular";
        fam[key].total += p.totalCredit || 0;
        fam[key].used += (p.totalCredit || 0) - (p.remainingCredit || 0);
      });
    });
    return fam;
  }, [rows, getRecordForClient]);

  // ---- Demografi & layanan ----
  const ageData = useMemo(() => {
    const b = { "0–3 th": 0, "4–6 th": 0, "7–10 th": 0, "11+ th": 0 };
    rows.forEach((r) => {
      const age = calcAge(r.client.dob);
      if (age === null || age === undefined) return;
      if (age <= 3) b["0–3 th"] += 1;
      else if (age <= 6) b["4–6 th"] += 1;
      else if (age <= 10) b["7–10 th"] += 1;
      else b["11+ th"] += 1;
    });
    return Object.entries(b).map(([group, count]) => ({ group, count }));
  }, [rows]);

  const serviceData = useMemo(() => {
    const counts = new Map();
    rows.forEach((r) => {
      getClientServiceIds(r.client).forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
    });
    return [...counts.entries()]
      .map(([id, count]) => ({ name: getService(id)?.shortLabel || id, count }))
      .sort((a, b) => b.count - a.count);
  }, [rows, getService]);

  // ---- Tabel ----
  const sortedRows = useMemo(() => {
    const list = [...rows];
    if (sort === "attendance_asc") list.sort((a, b) => (a.attendanceRate ?? 101) - (b.attendanceRate ?? 101));
    else if (sort === "credit_asc") list.sort((a, b) => a.remaining - b.remaining);
    else if (sort === "cancel_desc") list.sort((a, b) => b.absent - a.absent);
    else list.sort((a, b) => a.client.clientName.localeCompare(b.client.clientName));
    return list;
  }, [rows, sort]);

  const tablePg = usePagination(sortedRows, 10, `${branch}|${search}|${effectiveTherapist}|${period}|${customStart}|${customEnd}|${sort}`);

  const renewal = useMemo(() => rows.filter((r) => r.remaining <= 2).sort((a, b) => a.remaining - b.remaining), [rows]);
  const renewalPg = usePagination(renewal, 6, `${branch}|${search}|${effectiveTherapist}|${period}|${customStart}|${customEnd}`);

  const exportCsv = () => {
    const header = ["Nama", "Kode", "Cabang", "Kehadiran (%)", "Hadir (Selesai)", "Tidak Hadir (Cancel Potong Kredit)", "Sesi Berikutnya"];
    const lines = sortedRows.map((r) =>
      [
        r.client.clientName,
        r.client.clientCode,
        branchName(r.client.branchId),
        r.attendanceRate ?? "",
        r.completed,
        r.absent,
        r.nextSession || "",
      ]
        .map(csvCell)
        .join(",")
    );
    const blob = new Blob(["﻿" + [header.map(csvCell).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analitik-caseload-${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Filter chips ----
  const chips = [];
  if (search.trim()) chips.push({ key: "q", label: `Cari: "${search.trim()}"`, onRemove: () => setSearch("") });
  if (branch !== defaultBranch) {
    chips.push({
      key: "branch",
      label: `Cabang: ${branch === "all" ? "Semua" : branchName(branch)}`,
      onRemove: () => setBranch(defaultBranch),
    });
  }
  if (effectiveTherapist !== "all") {
    chips.push({ key: "th", label: `Terapis: ${therapistName(effectiveTherapist)}`, onRemove: () => setTherapistId("all") });
  }
  if (period !== "all") {
    const customText = period === "custom" ? `: ${customStart ? fmtDate(customStart) : "…"} – ${customEnd ? fmtDate(customEnd) : "…"}` : `: ${periodLabel(period)}`;
    chips.push({ key: "period", label: `Periode${customText}`, onRemove: () => setPeriod("all") });
  }

  const resetAll = () => {
    setSearch("");
    setBranch(defaultBranch);
    setTherapistId("all");
    setPeriod("all");
    setCustomStart("");
    setCustomEnd("");
  };

  const insights = [
    therapistLoad[0] && { icon: Stethoscope, text: `Terapis terpadat: ${therapistLoad[0].name} (${therapistLoad[0].total} sesi)` },
    cancelReasons[0] && { icon: AlertCircle, text: `Alasan batal terbanyak: ${cancelReasons[0].name} (${cancelReasons[0].value}x)` },
    kpi.frozen > 0 && { icon: Snowflake, text: `${kpi.frozen} client Frozen — perlu diteruskan ke Finance` },
  ].filter(Boolean);

  return (
    <div className="space-y-6" data-testid="client-analytics-tab">
      <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Kebijakan Finansial:</strong> tab ini menyajikan analitik kehadiran dan kuota kredit. Penambahan/renewal paket dikelola
            eksklusif oleh <strong>Role Finance</strong>.
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-amber-300 text-amber-900 hover:bg-amber-100 font-bold shrink-0"
          onClick={() => navigate("/finance")}
        >
          Buka Finance Hub
        </Button>
      </div>

      <FilterBar
        title="Filter Analitik"
        chips={chips}
        onReset={resetAll}
        resultText={`${rows.length} client • ${scopeSchedules.length} sesi`}
        gridClassName="lg:grid-cols-[2fr_1fr_1fr_1fr]"
      >
        <FilterField label="Pencarian">
          <SearchInput className="min-w-0" placeholder="Nama anak atau kode akses..." value={search} onChange={setSearch} />
        </FilterField>
        <FilterField label="Cabang">
          <BranchFilter value={branch} onChange={setBranch} isMaster={isMaster} />
        </FilterField>
        <FilterField label="Terapis">
          <Select value={effectiveTherapist} onValueChange={setTherapistId}>
            <SelectTrigger className="text-xs border-slate-200 bg-slate-50 font-semibold" aria-label="Filter terapis">
              <SelectValue placeholder="Semua Terapis" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="all">Semua Terapis</SelectItem>
              {therapistOptions.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name.split(",")[0]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Periode Sesi">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="text-xs border-slate-200 bg-slate-50 font-semibold" aria-label="Periode sesi">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {period === "custom" && (
            <div className="grid grid-cols-2 gap-2 pt-2" data-testid="analytics-custom-period">
              <DateFilterPicker placeholder="Dari" className="w-full bg-white" value={customStart} onChange={(e) => setCustomStart(e?.target?.value ?? e ?? "")} data-testid="analytics-custom-start" />
              <DateFilterPicker placeholder="Sampai" className="w-full bg-white" value={customEnd} onChange={(e) => setCustomEnd(e?.target?.value ?? e ?? "")} data-testid="analytics-custom-end" />
              {customStart && customEnd && customStart > customEnd && (
                <p className="col-span-2 text-[11px] font-semibold text-rose-600">Tanggal awal melewati tanggal akhir.</p>
              )}
            </div>
          )}
        </FilterField>
      </FilterBar>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        <KpiCard icon={Users} tone="bg-sky-50 text-sky-700" label="Client Aktif" value={kpi.clients} sub={`${kpi.withNext} punya jadwal berikutnya`} />
        <KpiCard
          icon={Activity}
          tone="bg-emerald-50 text-emerald-700"
          label="Tingkat Kehadiran"
          value={kpi.attendance === null ? "—" : `${kpi.attendance}%`}
          sub={`${kpi.completed} hadir • ${kpi.cancelled} tidak hadir (potong kredit)`}
        />
        <KpiCard icon={CalendarClock} tone="bg-blue-50 text-blue-700" label="Sesi Mendatang" value={kpi.upcoming} sub="Terjadwal dari hari ini" />
        <KpiCard
          icon={Wallet}
          tone="bg-purple-50 text-purple-700"
          label="Utilisasi Kredit"
          value={kpi.utilization === null ? "—" : `${kpi.utilization}%`}
          sub={`${kpi.remaining} sesi tersisa`}
        />
        <KpiCard icon={Flame} tone="bg-amber-50 text-amber-700" label="Perlu Renewal" value={kpi.needRenewal} sub={`${kpi.frozen} Frozen (0 kredit)`} />
      </div>

      {insights.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Sorotan">
          {insights.map((it) => (
            <span
              key={it.text}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-2xs text-xs font-semibold text-slate-700"
            >
              <it.icon className="w-3.5 h-3.5 text-sky-600" /> {it.text}
            </span>
          ))}
        </div>
      )}

      {/* Tren + alasan batal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard
          icon={TrendingUp}
          iconClass="text-sky-600"
          title="Tren Sesi Mingguan"
          description="6 minggu terakhir hingga 2 minggu ke depan, berdasarkan status sesi"
          className="lg:col-span-2"
        >
          {trendHasData ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={AXIS_TICK} />
                  <YAxis allowDecimals={false} tick={AXIS_TICK} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#f8fafc" }} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="completed" name="Selesai" stackId="s" fill={COLOR.completed} />
                  <Bar dataKey="upcoming" name="Terjadwal" stackId="s" fill={COLOR.upcoming} />
                  <Bar dataKey="cancelled" name="Batal" stackId="s" fill={COLOR.cancelled} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <NoData icon={CalendarClock} text="Belum ada sesi pada rentang minggu ini untuk filter yang dipilih." />
          )}
        </ChartCard>

        <ChartCard icon={AlertCircle} iconClass="text-rose-600" title="Alasan Pembatalan" description="Dari seluruh sesi batal pada filter ini">
          {cancelReasons.length > 0 ? (
            <div className="space-y-3">
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={cancelReasons} dataKey="value" nameKey="name" innerRadius={38} outerRadius={64} paddingAngle={3}>
                      {cancelReasons.map((r) => (
                        <Cell key={r.key} fill={r.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1.5 text-xs">
                {cancelReasons.map((r) => (
                  <li key={r.key} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-slate-700 font-medium min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                      <span className="truncate">{r.name}</span>
                    </span>
                    <span className="font-bold tabular-nums text-slate-900">{r.value}x</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <NoData text="Tidak ada pembatalan pada filter ini." />
          )}
        </ChartCard>
      </div>

      {/* Terapis + kredit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard icon={Stethoscope} iconClass="text-sky-600" title="Beban Kerja Terapis" description="Jumlah sesi per terapis, dipisah berdasarkan status">
          {therapistLoad.length > 0 ? (
            <div className="w-full" style={{ height: Math.max(220, therapistLoad.length * 38 + 50) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={therapistLoad} layout="vertical" margin={{ top: 5, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#f8fafc" }} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="completed" name="Selesai" stackId="t" fill={COLOR.completed} />
                  <Bar dataKey="upcoming" name="Terjadwal" stackId="t" fill={COLOR.upcoming} />
                  <Bar dataKey="cancelled" name="Batal" stackId="t" fill={COLOR.cancelled} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <NoData icon={Stethoscope} text="Belum ada sesi terapis pada filter ini." />
          )}
        </ChartCard>

        <ChartCard icon={Wallet} iconClass="text-purple-600" title="Kesehatan Kredit" description="Sebaran saldo kredit dan pemakaian paket">
          {rows.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={creditHealth} dataKey="value" nameKey="name" innerRadius={42} outerRadius={68} paddingAngle={3}>
                      {creditHealth.map((c) => (
                        <Cell key={c.name} fill={c.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                <ul className="space-y-1.5 text-xs">
                  {creditHealth.map((c) => (
                    <li key={c.name} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-slate-700 font-medium">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </span>
                      <span className="font-bold tabular-nums text-slate-900">{c.value}</span>
                    </li>
                  ))}
                </ul>
                <div className="space-y-2.5 pt-3 border-t border-slate-100">
                  {[
                    ["Regular Therapist", packageUsage.regular, "bg-sky-500"],
                    ["Senior Therapist", packageUsage.senior, "bg-purple-500"],
                  ].map(([label, u, bar]) => {
                    const pct = u.total > 0 ? Math.round((u.used / u.total) * 100) : 0;
                    return (
                      <div key={label} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-700">{label}</span>
                          <span className="text-slate-500 tabular-nums">
                            {u.used}/{u.total} terpakai ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className={cn("h-full rounded-full", bar)} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <NoData icon={Wallet} text="Tidak ada client pada filter ini." />
          )}
        </ChartCard>
      </div>

      {/* Demografi + layanan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard icon={Baby} iconClass="text-purple-600" title="Demografi Usia" description="Sebaran client aktif berdasarkan kelompok usia">
          {rows.length > 0 ? (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="group" tick={AXIS_TICK} />
                  <YAxis allowDecimals={false} tick={AXIS_TICK} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="count" name="Jumlah anak" fill={COLOR.purple} radius={[6, 6, 0, 0]} maxBarSize={56} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <NoData icon={Baby} text="Tidak ada client pada filter ini." />
          )}
        </ChartCard>

        <ChartCard icon={Layers} iconClass="text-sky-600" title="Layanan yang Diambil" description="Satu client dihitung di setiap layanan yang dipilihnya">
          {serviceData.length > 0 ? (
            <div className="w-full" style={{ height: Math.max(224, serviceData.length * 38 + 40) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serviceData} layout="vertical" margin={{ top: 5, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="count" name="Client" fill={COLOR.upcoming} radius={[0, 6, 6, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <NoData icon={Layers} text="Belum ada data layanan pada client di filter ini." />
          )}
        </ChartCard>
      </div>

      {/* Renewal */}
      {renewal.length > 0 && (
        <Card className="rounded-2xl border border-amber-200 bg-amber-50/40 shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-amber-200/70 bg-amber-100/50">
            <CardTitle className="text-sm font-bold text-amber-950 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-600" />
              Perlu Renewal ({renewal.length} client)
            </CardTitle>
            <CardDescription className="text-xs text-amber-800/80">
              Saldo kredit ≤ 2 sesi — urut dari yang paling sedikit. Teruskan ke Finance.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table stackOnMobile className="w-full min-w-[520px]">
              <TableHeader>
                <TableRow className="bg-amber-100/30 hover:bg-amber-100/30 border-b border-amber-200/60">
                  <TableHead className="font-bold text-amber-950 text-xs pl-6 whitespace-nowrap">Client</TableHead>
                  <TableHead className="font-bold text-amber-950 text-xs whitespace-nowrap hidden md:table-cell">Orang Tua</TableHead>
                  <TableHead className="font-bold text-amber-950 text-xs whitespace-nowrap">Sisa Kredit</TableHead>
                  <TableHead className="font-bold text-amber-950 text-xs text-right pr-6 whitespace-nowrap">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renewalPg.pageItems.map((r) => (
                  <TableRow key={r.id} className="border-b border-amber-200/40 hover:bg-amber-100/40 text-xs">
                    <TableCell data-nolabel className="pl-6 font-bold text-slate-900 whitespace-nowrap">{r.client.clientName}</TableCell>
                    <TableCell data-label="Orang Tua" className="text-slate-600 whitespace-nowrap hidden md:table-cell">
                      {r.client.parentName} ({r.client.parentContact})
                    </TableCell>
                    <TableCell data-label="Sisa Kredit" className="whitespace-nowrap">
                      {r.remaining === 0 ? (
                        <span className="inline-flex items-center gap-1 font-extrabold text-cyan-800">
                          <Snowflake className="w-3.5 h-3.5" /> Frozen
                        </span>
                      ) : (
                        <span className="font-black text-amber-700">{r.remaining} sesi</span>
                      )}
                    </TableCell>
                    <TableCell data-nolabel className="text-right pr-6 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 border-amber-300 text-amber-900 hover:bg-amber-200 font-bold cursor-pointer"
                        onClick={() => navigate(`/admin-schedule/clients/${r.id}`)}
                      >
                        Tinjau <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <TablePagination
            {...renewalPg}
            onPageChange={renewalPg.setPage}
            onPageSizeChange={renewalPg.setPageSize}
            pageSizeOptions={[6, 12, 24]}
            noun="client"
            className="border-amber-200/50 bg-amber-50/40"
          />
        </Card>
      )}

      {/* Tabel performa */}
      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">Tabel Performa Kehadiran ({rows.length} client)</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Kehadiran = sesi selesai ÷ (selesai + tidak hadir) pada filter. Tidak hadir = cancel yang memotong kredit; cancel tanpa potong kredit tidak dihitung.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-48 text-xs border-slate-200 bg-white font-semibold" aria-label="Urutkan tabel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  {SORTS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      Urut: {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="font-bold gap-1.5 border-slate-200 cursor-pointer"
                onClick={exportCsv}
                disabled={rows.length === 0}
                data-testid="analytics-export-csv"
              >
                <Download className="w-3.5 h-3.5" /> Ekspor CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {rows.length === 0 ? (
            <NoData icon={Users} text="Tidak ada client yang cocok dengan filter ini." />
          ) : (
            <Table stackOnMobile className="w-full min-w-[680px]">
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                  <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6 whitespace-nowrap">Client & Kode</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap hidden md:table-cell">Cabang</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Kehadiran</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Hadir (Selesai)</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Tidak Hadir (Cancel Potong Kredit)</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs pr-6 whitespace-nowrap hidden lg:table-cell">Sesi Berikutnya</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tablePg.pageItems.map((r) => (
                  <TableRow
                    key={r.id}
                    className="border-b border-slate-100 text-xs hover:bg-slate-50/50"
                  >
                    <TableCell data-nolabel className="pl-6 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin-schedule/clients/${r.id}`)}
                        className="font-bold text-slate-900 hover:text-sky-700 hover:underline text-left cursor-pointer"
                      >
                        {r.client.clientName}
                      </button>
                      <p className="font-mono text-[11px] text-slate-500">
                        {r.client.clientCode}
                      </p>
                    </TableCell>
                    <TableCell data-label="Cabang" className="whitespace-nowrap hidden md:table-cell">
                      <BranchTag
                        branchId={r.client.branchId}
                        className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200"
                      />
                    </TableCell>
                    <TableCell data-label="Kehadiran" className="whitespace-nowrap">
                      {r.attendanceRate === null ? (
                        <span className="text-slate-400">Belum ada riwayat</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                r.attendanceRate >= 80 ? "bg-emerald-500" : r.attendanceRate >= 60 ? "bg-amber-500" : "bg-rose-500"
                              )}
                              style={{ width: `${r.attendanceRate}%` }}
                            />
                          </div>
                          <span className="font-bold tabular-nums">{r.attendanceRate}%</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell data-label="Hadir (Selesai)" className="whitespace-nowrap tabular-nums font-bold text-emerald-700">{r.completed}x</TableCell>
                    <TableCell data-label="Tidak Hadir (Cancel Potong Kredit)" className={cn("whitespace-nowrap tabular-nums font-bold", r.absent > 0 ? "text-rose-700" : "text-slate-500")}>{r.absent}x</TableCell>
                    <TableCell data-label="Sesi Berikutnya" className="pr-6 whitespace-nowrap hidden lg:table-cell text-slate-700">
                      {r.nextSession ? fmtDate(r.nextSession) : <span className="text-slate-400">Belum dijadwalkan</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <TablePagination {...tablePg} onPageChange={tablePg.setPage} onPageSizeChange={tablePg.setPageSize} noun="client" />
      </Card>
    </div>
  );
}
