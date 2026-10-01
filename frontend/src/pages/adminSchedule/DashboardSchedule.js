import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, CalendarDays, Cake, CheckCircle2, XCircle, Building2, MessageCircle, Activity, CalendarClock, PieChart as PieIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useClients } from "@/context/ClientsContext";
import { useSchedules } from "@/context/SchedulesContext";
import { useCredits } from "@/context/CreditsContext";
import { useTherapists } from "@/context/TherapistsContext";
import { useAuth } from "@/context/AuthContext";
import { calcAge, fmtDate, BRANCHES, branchName, isCreditNeutralCancel } from "@/lib/appUtils";
import DateFilterPicker from "@/components/common/DateFilterPicker";
import { FilterBar, FilterField } from "@/components/common/FilterBar";
import { BranchFilter } from "@/components/common/BranchFilter";
import { PeriodFilter } from "@/components/common/PeriodFilter";
import { makePeriodMatcher, periodLabel } from "@/lib/periods";

const PIE_COLORS = ["#0284C7", "#10B981", "#F59E0B", "#F43F5E", "#8B5CF6", "#64748B"];

export default function DashboardSchedule() {
  const navigate = useNavigate();
  const { clients } = useClients();
  const { schedules } = useSchedules();
  const { getRecordForClient } = useCredits();
  const { therapists } = useTherapists();
  const { activeBranch, auth } = useAuth();
  const isMaster = auth?.role === "master";

  const defaultBranch = isMaster ? (activeBranch || "all") : (auth?.branchId || activeBranch || "branch-sby-timur");
  const [selectedBranch, setSelectedBranch] = useState(defaultBranch);
  const [period, setPeriod] = useState("quarter"); // lihat PERIOD_OPTIONS
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Advanced Client Analytics & Attendance Filters state (User requested restoration)
  const [telemetryClientId, setTelemetryClientId] = useState("all");
  const [telemetryTherapistId, setTelemetryTherapistId] = useState("all");
  const [telemetryBranchId, setTelemetryBranchId] = useState("all");
  const [telemetryStatus, setTelemetryStatus] = useState("all");
  const [telemetryStartDate, setTelemetryStartDate] = useState("");
  const [telemetryEndDate, setTelemetryEndDate] = useState("");

  const activeClients = useMemo(() => {
    return clients.filter((c) => {
      if (c.status !== "admitted" && c.status !== "active") return false;
      if (selectedBranch !== "all" && c.branchId !== selectedBranch) return false;
      return true;
    });
  }, [clients, selectedBranch]);

  // Filter schedules by branch and period
  const filteredSchedules = useMemo(() => {
    const inPeriod = makePeriodMatcher(period, customStart, customEnd);
    return schedules.filter((s) => {
      if (selectedBranch !== "all" && s.branchId && s.branchId !== selectedBranch) return false;
      if (!s.date) return true;
      return inPeriod(s.date);
    });
  }, [schedules, selectedBranch, period, customStart, customEnd]);

  const filterChips = [];
  if (selectedBranch !== defaultBranch) {
    filterChips.push({
      key: "branch",
      label: `Cabang: ${selectedBranch === "all" ? "Semua" : branchName(selectedBranch)}`,
      onRemove: () => setSelectedBranch(defaultBranch),
    });
  }
  if (period !== "quarter") {
    const range = period === "custom" ? ` (${customStart || "…"} – ${customEnd || "…"})` : "";
    filterChips.push({
      key: "period",
      label: `Periode: ${periodLabel(period)}${range}`,
      onRemove: () => {
        setPeriod("quarter");
        setCustomStart("");
        setCustomEnd("");
      },
    });
  }
  const resetGlobalFilters = () => {
    setSelectedBranch(defaultBranch);
    setPeriod("quarter");
    setCustomStart("");
    setCustomEnd("");
  };

  // Metrics
  const metrics = useMemo(() => {
    const totalSessions = filteredSchedules.length;
    const completed = filteredSchedules.filter((s) => s.status === "completed").length;
    const cancelled = filteredSchedules.filter((s) => s.status === "cancelled" && !isCreditNeutralCancel(s)).length;
    const scheduled = filteredSchedules.filter((s) => s.status === "scheduled").length;

    return {
      totalSessions,
      completed,
      cancelled,
      scheduled,
      completionRate: totalSessions > 0 ? Math.round((completed / totalSessions) * 100) : 0,
    };
  }, [filteredSchedules]);

  // Cancellation Breakdown by Reason
  const cancellationByReasonData = useMemo(() => {
    const reasonCounts = {
      sakit: 0,
      izin_keluarga: 0,
      bentrok_sekolah: 0,
      tanpa_kabar: 0,
      lainnya: 0,
    };

    filteredSchedules.forEach((s) => {
      if (s.status === "cancelled" && s.cancelReason && !isCreditNeutralCancel(s)) {
        if (reasonCounts[s.cancelReason] !== undefined) {
          reasonCounts[s.cancelReason] += 1;
        } else {
          reasonCounts.lainnya += 1;
        }
      }
    });

    return [
      { name: "Sakit / Medis", value: reasonCounts.sakit },
      { name: "Izin Keluarga", value: reasonCounts.izin_keluarga },
      { name: "Bentrok Sekolah", value: reasonCounts.bentrok_sekolah },
      { name: "Tanpa Kabar (No Show)", value: reasonCounts.tanpa_kabar },
      { name: "Lainnya", value: reasonCounts.lainnya },
    ].filter((item) => item.value > 0);
  }, [filteredSchedules]);

  // Birthday Radar (active clients with birthday this month)
  const birthdayClients = useMemo(() => {
    const currentMonth = format(new Date(), "MM");
    return activeClients.filter((c) => {
      if (!c.dob) return false;
      const m = c.dob.slice(5, 7);
      return m === currentMonth;
    });
  }, [activeClients]);

  // ---------------------------------------------------------------------------
  // Advanced Telemetry Filtered Results (Requested: Restored & Optimized)
  // ---------------------------------------------------------------------------
  const filteredTelemetrySchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (telemetryClientId !== "all" && s.clientId !== telemetryClientId) return false;
      if (telemetryTherapistId !== "all" && s.therapistId !== telemetryTherapistId) return false;
      if (telemetryBranchId !== "all" && s.branchId !== telemetryBranchId) return false;
      if (telemetryStatus !== "all" && s.status !== telemetryStatus) return false;
      if (telemetryStartDate && s.date && s.date < telemetryStartDate) return false;
      if (telemetryEndDate && s.date && s.date > telemetryEndDate) return false;
      return true;
    });
  }, [schedules, telemetryClientId, telemetryTherapistId, telemetryBranchId, telemetryStatus, telemetryStartDate, telemetryEndDate]);

  const resetTelemetry = () => {
    setTelemetryClientId("all");
    setTelemetryTherapistId("all");
    setTelemetryBranchId("all");
    setTelemetryStatus("all");
    setTelemetryStartDate("");
    setTelemetryEndDate("");
  };

  const telemetryChips = [];
  if (telemetryClientId !== "all") {
    telemetryChips.push({
      key: "client",
      label: `Client: ${clients.find((c) => c.id === telemetryClientId)?.clientName || telemetryClientId}`,
      onRemove: () => setTelemetryClientId("all"),
    });
  }
  if (telemetryTherapistId !== "all") {
    telemetryChips.push({
      key: "therapist",
      label: `Terapis: ${therapists.find((t) => t.id === telemetryTherapistId)?.name?.split(",")[0] || telemetryTherapistId}`,
      onRemove: () => setTelemetryTherapistId("all"),
    });
  }
  if (telemetryBranchId !== "all") {
    telemetryChips.push({ key: "branch", label: `Cabang: ${branchName(telemetryBranchId)}`, onRemove: () => setTelemetryBranchId("all") });
  }
  if (telemetryStatus !== "all") {
    telemetryChips.push({ key: "status", label: `Status: ${telemetryStatus}`, onRemove: () => setTelemetryStatus("all") });
  }
  if (telemetryStartDate || telemetryEndDate) {
    telemetryChips.push({
      key: "dates",
      label: `Tanggal: ${telemetryStartDate || "…"} – ${telemetryEndDate || "…"}`,
      onRemove: () => {
        setTelemetryStartDate("");
        setTelemetryEndDate("");
      },
    });
  }

  const telemetryMetrics = useMemo(() => {
    const total = filteredTelemetrySchedules.length;
    const completed = filteredTelemetrySchedules.filter((s) => s.status === "completed").length;
    const rescheduled = filteredTelemetrySchedules.filter((s) => s.status === "rescheduled").length;
    const cancelled = filteredTelemetrySchedules.filter((s) => s.status === "cancelled" && !isCreditNeutralCancel(s)).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;

    return { total, completed, rescheduled, cancelled, completionRate, cancellationRate };
  }, [filteredTelemetrySchedules]);

  const telemetryTypeDistribution = useMemo(() => {
    const counts = {};
    filteredTelemetrySchedules.forEach((s) => {
      const t = s.type === "therapy" ? "Regular Therapist" : s.type === "assessment" ? "Asesmen Klinis" : "Lainnya";
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredTelemetrySchedules]);

  const clientNameMap = useMemo(() => {
    const map = {};
    clients.forEach((c) => {
      map[c.id] = c.clientName;
    });
    return map;
  }, [clients]);

  const therapistMap = useMemo(() => {
    const map = {};
    therapists.forEach((t) => {
      map[t.id] = t.name;
    });
    return map;
  }, [therapists]);

  return (
    <div className="space-y-6" data-testid="dashboard-schedule-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100/80 text-sky-800 text-xs font-semibold mb-2">
            <Building2 className="w-3.5 h-3.5 text-sky-600" />
            Scheduling & Operations Hub
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Schedule & Caseload Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitoring performa kehadiran, jadwal rutin, pembatalan izin, dan analitik caseload antar cabang.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => navigate("/admin-schedule/calendar")}
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold gap-2 shadow-xs"
          >
            <CalendarDays className="w-4 h-4" /> Buka Kalender Sesi
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/admin-schedule/clients")}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 font-bold gap-2 shadow-2xs"
          >
            <Users className="w-4 h-4" /> Active Clients Roster
          </Button>
        </div>
      </div>

      {/* Global Filter Bar: Branch + Periode */}
      <FilterBar
        title="Filter Dashboard"
        chips={filterChips}
        onReset={resetGlobalFilters}
        resultText={`${filteredSchedules.length} sesi`}
        gridClassName="lg:grid-cols-4"
      >
        <FilterField label="Cabang">
          <BranchFilter value={selectedBranch} onChange={setSelectedBranch} isMaster={isMaster} />
        </FilterField>
        <PeriodFilter
          preset={period}
          start={customStart}
          end={customEnd}
          testidPrefix="schedule"
          onChange={({ preset, start, end }) => {
            if (preset !== undefined) setPeriod(preset);
            if (start !== undefined) setCustomStart(start);
            if (end !== undefined) setCustomEnd(end);
          }}
        />
      </FilterBar>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Active Clients"
          value={activeClients.length}
          helper="Terdaftar dalam terapi aktif"
          trend="neutral"
          data-testid="stat-active-clients"
        />
        <StatCard
          icon={CalendarDays}
          label="Sesi Terjadwal"
          value={metrics.scheduled}
          helper="Akan datang di periode ini"
          trend="neutral"
          data-testid="stat-scheduled-sessions"
        />
        <StatCard
          icon={CheckCircle2}
          label="Sesi Selesai (Completed)"
          value={metrics.completed}
          helper={`${metrics.completionRate}% rasio kehadiran`}
          trend="up"
          data-testid="stat-completed-sessions"
        />
        <StatCard
          icon={XCircle}
          label="Sesi Dibatalkan (Cancelled)"
          value={metrics.cancelled}
          helper="Dipisahkan per alasan izin"
          trend="down"
          data-testid="stat-cancelled-sessions"
        />
      </div>

      {/* Charts Row: Cancellation Breakdown + Birthday Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cancellation Breakdown by Reason */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
          <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-600" />
              Statistik Pembatalan Sesi Berdasarkan Alasan
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Setiap pembatalan dipisahkan per alasan (Sakit, Izin, Bentrok Sekolah, Tanpa Kabar)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-6">
            {cancellationByReasonData.length === 0 ? (
              <div className="h-60 flex items-center justify-center text-xs text-slate-400">
                Tidak ada pembatalan sesi pada periode ini.
              </div>
            ) : (
              <div className="h-60 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={cancellationByReasonData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      innerRadius={40}
                      paddingAngle={3}
                    >
                      {cancellationByReasonData.map((_, idx) => (
                        <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "11px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "6px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Birthday Radar Dashboard */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Cake className="w-4 h-4 text-pink-600" />
              Birthday Dashboard (Bulan Berjalan)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Radar perayaan ulang tahun anak bulan ini untuk ucapan & loyalty care
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 flex-1 space-y-3">
            {birthdayClients.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                Tidak ada client aktif yang berulang tahun bulan ini.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {birthdayClients.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl bg-pink-50/50 border border-pink-200/80 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-xs shrink-0">
                        <Cake className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-900">{c.clientName}</p>
                        <p className="text-[11px] text-slate-500">
                          Ulang tahun ke-{calcAge(c.dob)} ({fmtDate(c.dob)})
                        </p>
                      </div>
                    </div>

                    <a
                      href={`https://wa.me/${c.parentContact.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                        `Halo ${c.parentName}, segenap keluarga besar Therapedia mengucapkan Selamat Ulang Tahun untuk ananda ${c.clientName}! Semoga senantiasa sehat dan bertumbuh optimal. 🎂`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs shrink-0"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Kirim Ucapan
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* Advanced Client Analytics & Attendance Filters (filter sendiri, tidak mengikuti filter atas) */}
      {/* ========================================================================= */}
      <Card className="rounded-2xl border border-sky-200 bg-white shadow-sm overflow-hidden" data-testid="advanced-attendance-telemetry-card">
        <CardHeader className="pb-3 border-b border-sky-100 bg-sky-50/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-sky-600" />
                Advanced Client Analytics & Attendance Filters
                <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-white text-sky-700 border border-sky-200">
                  Filter terpisah
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-600 mt-0.5">
                Filter di kartu ini berdiri sendiri dan tidak mengikuti filter cabang/periode di bagian atas halaman
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          <FilterBar
            plain
            chips={telemetryChips}
            onReset={resetTelemetry}
            gridClassName="lg:grid-cols-6"
          >
            <FilterField label="Client / Anak">
              <Select value={telemetryClientId} onValueChange={setTelemetryClientId}>
                <SelectTrigger className="border-slate-200 bg-slate-50" aria-label="Client">
                  <SelectValue placeholder="Semua Client" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="all">Semua Client ({clients.length})</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.clientName} ({c.clientAccessCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Terapis">
              <Select value={telemetryTherapistId} onValueChange={setTelemetryTherapistId}>
                <SelectTrigger className="border-slate-200 bg-slate-50" aria-label="Terapis">
                  <SelectValue placeholder="Semua Terapis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Praktisi Terapis</SelectItem>
                  {therapists.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Cabang Sesi">
              <Select value={telemetryBranchId} onValueChange={setTelemetryBranchId}>
                <SelectTrigger className="border-slate-200 bg-slate-50" aria-label="Cabang sesi">
                  <SelectValue placeholder="Semua Cabang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Cabang</SelectItem>
                  {BRANCHES.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Status Sesi">
              <Select value={telemetryStatus} onValueChange={setTelemetryStatus}>
                <SelectTrigger className="border-slate-200 bg-slate-50" aria-label="Status sesi">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled (sudah pindah)</SelectItem>
                  <SelectItem value="reschedule_pending">Reschedule – belum ada jadwal</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Dari Tanggal">
              <DateFilterPicker
                placeholder="DD/MM/YYYY"
                className="w-full bg-slate-50"
                value={telemetryStartDate}
                onChange={(e) => setTelemetryStartDate(e?.target?.value ?? e)}
                data-testid="schedule-telemetry-start"
              />
            </FilterField>
            <FilterField label="Sampai Tanggal">
              <DateFilterPicker
                placeholder="DD/MM/YYYY"
                className="w-full bg-slate-50"
                value={telemetryEndDate}
                onChange={(e) => setTelemetryEndDate(e?.target?.value ?? e)}
                data-testid="schedule-telemetry-end"
              />
            </FilterField>
          </FilterBar>

          {/* Telemetry Metric Scorecards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <p className="text-[11px] font-bold text-slate-500">Total Filtered</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{telemetryMetrics.total}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
              <p className="text-[11px] font-bold text-emerald-700">Completed</p>
              <p className="text-xl font-black text-emerald-800 mt-0.5">{telemetryMetrics.completed}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
              <p className="text-[11px] font-bold text-amber-700">Rescheduled</p>
              <p className="text-xl font-black text-amber-800 mt-0.5">{telemetryMetrics.rescheduled}</p>
            </div>
            <div className="bg-rose-50 rounded-xl p-3 border border-rose-200">
              <p className="text-[11px] font-bold text-rose-700">Cancelled</p>
              <p className="text-xl font-black text-rose-800 mt-0.5">{telemetryMetrics.cancelled}</p>
            </div>
            <div className="bg-sky-50 rounded-xl p-3 border border-sky-200">
              <p className="text-[11px] font-bold text-sky-700">Completion Rate</p>
              <p className="text-xl font-black text-sky-800 mt-0.5">{telemetryMetrics.completionRate}%</p>
            </div>
            <div className="bg-rose-50 rounded-xl p-3 border border-rose-200">
              <p className="text-[11px] font-bold text-rose-700">Cancel Rate</p>
              <p className="text-xl font-black text-rose-800 mt-0.5">{telemetryMetrics.cancellationRate}%</p>
            </div>
          </div>

          {/* Telemetry Details: Session List + Distribution Pie */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Filtered Session Roster */}
            <div className="lg:col-span-8 bg-slate-50/50 rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-sky-600" />
                  Daftar Sesi Terfilter ({filteredTelemetrySchedules.length} Sesi)
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  Menampilkan s/d 20 sesi teratas
                </span>
              </div>

              {filteredTelemetrySchedules.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Tidak ada data sesi yang sesuai dengan kombinasi filter di atas.
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-200/80 pr-1 space-y-1">
                  {filteredTelemetrySchedules.slice(0, 20).map((s) => (
                    <div key={s.id} className="py-2 px-2 flex items-center justify-between text-xs hover:bg-white rounded-lg transition-colors">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-900">{clientNameMap[s.clientId] || "Client"}</p>
                        <p className="text-[11px] text-slate-500">
                          {s.date} · {s.startTime}–{s.endTime} · Terapis: {therapistMap[s.therapistId] || "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={s.type} />
                        <StatusBadge status={s.status} />
                      </div>
                    </div>
                  ))}
                  {filteredTelemetrySchedules.length > 20 && (
                    <p className="text-[11px] text-center text-slate-500 pt-2 font-medium">
                      + Menampilkan 20 dari {filteredTelemetrySchedules.length} sesi.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Service Type Distribution */}
            <div className="lg:col-span-4 bg-slate-50/50 rounded-xl border border-slate-200 p-4 space-y-3 flex flex-col justify-between">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
                <PieIcon className="w-4 h-4 text-purple-600" />
                Distribusi Tipe Layanan Sesi
              </h3>
              <div className="h-52 flex items-center justify-center">
                {telemetryTypeDistribution.length === 0 ? (
                  <p className="text-xs text-slate-400">Tidak ada data tipe sesi.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={telemetryTypeDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={65}
                        innerRadius={35}
                        paddingAngle={3}
                      >
                        {telemetryTypeDistribution.map((_, idx) => (
                          <Cell key={`pie-cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: "10px", fontSize: "11px" }} />
                      <Legend wrapperStyle={{ fontSize: "10px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
