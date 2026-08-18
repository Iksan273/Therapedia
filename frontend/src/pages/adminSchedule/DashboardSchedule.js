import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { endOfWeek, format, startOfWeek, subMonths, addDays, parseISO, isAfter, isBefore } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Users,
  CalendarDays,
  Wallet,
  Cake,
  PieChart as PieIcon,
  AlertTriangle,
  CalendarClock,
  Filter,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { CreditBar } from "@/components/common/CreditBar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useClients } from "@/context/ClientsContext";
import { useSchedules } from "@/context/SchedulesContext";
import { useCredits } from "@/context/CreditsContext";
import { useTherapists } from "@/context/TherapistsContext";
import { calcAge, dischargeReasonLabel, fmtDate } from "@/lib/appUtils";

const PIE_COLORS = ["#2FA8E0", "#22C55E", "#F59E0B", "#EF4444", "#3B82F6", "#8B5CF6"];

export default function DashboardSchedule() {
  const navigate = useNavigate();
  const { clients } = useClients();
  const { schedules } = useSchedules();
  const { credits } = useCredits();
  const { therapists, getTherapist } = useTherapists();

  const [monthFilter, setMonthFilter] = useState("all");

  // Advanced Analytics Filters
  const [filterClient, setFilterClient] = useState("all");
  const [filterTherapyType, setFilterTherapyType] = useState("all");
  const [filterTherapist, setFilterTherapist] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const activeClients = useMemo(() => clients.filter((c) => c.status === "admitted"), [clients]);

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(now, 5 - i);
      return { key: format(m, "yyyy-MM"), label: format(m, "MMM yyyy") };
    });
  }, []);

  // Filtered schedules for Advanced Analytics section
  const filteredAnalyticsSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (filterClient !== "all" && s.clientId !== filterClient) return false;
      if (filterTherapyType !== "all" && s.type !== filterTherapyType) return false;
      if (filterTherapist !== "all" && s.therapistId !== filterTherapist) return false;
      if (filterStatus !== "all" && s.status !== filterStatus) return false;

      if (filterStartDate && s.date < filterStartDate) return false;
      if (filterEndDate && s.date > filterEndDate) return false;

      return true;
    });
  }, [schedules, filterClient, filterTherapyType, filterTherapist, filterStatus, filterStartDate, filterEndDate]);

  // Analytics Metrics
  const totalFiltered = filteredAnalyticsSchedules.length;
  const completedFiltered = filteredAnalyticsSchedules.filter((s) => s.status === "completed").length;
  const cancelledFiltered = filteredAnalyticsSchedules.filter((s) => s.status === "cancelled").length;
  const rescheduledFiltered = filteredAnalyticsSchedules.filter((s) => s.status === "rescheduled").length;
  const scheduledFiltered = filteredAnalyticsSchedules.filter((s) => s.status === "scheduled").length;

  const completionRate = totalFiltered > 0 ? Math.round((completedFiltered / totalFiltered) * 100) : 0;
  const cancellationRate = totalFiltered > 0 ? Math.round((cancelledFiltered / totalFiltered) * 100) : 0;

  // Breakdown by Therapy Type
  const therapyTypeBreakdown = useMemo(() => {
    const counts = { therapy: 0, assessment: 0, consultation: 0 };
    filteredAnalyticsSchedules.forEach((s) => {
      if (counts[s.type] !== undefined) counts[s.type]++;
    });
    return [
      { name: "Therapy", value: counts.therapy },
      { name: "Assessment", value: counts.assessment },
      { name: "Consultation", value: counts.consultation },
    ].filter((item) => item.value > 0);
  }, [filteredAnalyticsSchedules]);

  const resetFilters = () => {
    setFilterClient("all");
    setFilterTherapyType("all");
    setFilterTherapist("all");
    setFilterStatus("all");
    setFilterStartDate("");
    setFilterEndDate("");
  };

  const sessionChartData = useMemo(() => {
    const source = monthFilter === "all" ? months : months.filter((m) => m.key === monthFilter);
    return source.map((m) => {
      const inMonth = schedules.filter((s) => s.date && s.date.startsWith(m.key));
      return {
        month: m.label,
        Completed: inMonth.filter((s) => s.status === "completed").length,
        Cancelled: inMonth.filter((s) => s.status === "cancelled").length,
        Rescheduled: inMonth.filter((s) => s.status === "rescheduled").length,
      };
    });
  }, [schedules, months, monthFilter]);

  const sessionsThisWeek = useMemo(() => {
    const start = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const end = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
    return schedules.filter((s) => s.date >= start && s.date <= end).length;
  }, [schedules]);

  const lowCredit = useMemo(() => {
    return credits.records
      .filter((r) => r.remainingCredit <= 2)
      .map((r) => ({ record: r, client: activeClients.find((c) => c.id === r.clientId) }))
      .filter((x) => x.client);
  }, [credits.records, activeClients]);

  const overLeave = useMemo(
    () => credits.records.filter((r) => r.leaveUsed > r.leaveQuota && activeClients.some((c) => c.id === r.clientId)),
    [credits.records, activeClients]
  );

  const birthdays = useMemo(() => {
    const currentMonth = format(new Date(), "MM");
    return activeClients
      .filter((c) => c.dob && c.dob.split("-")[1] === currentMonth)
      .sort((a, b) => Number(a.dob.split("-")[2]) - Number(b.dob.split("-")[2]));
  }, [activeClients]);

  // Clients whose birthday falls within the next 7 days (including today).
  const upcomingBirthdays = useMemo(() => {
    const now = new Date();
    const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return activeClients
      .map((c) => {
        if (!c.dob) return null;
        const [, m, d] = c.dob.split("-").map(Number);
        let next = new Date(today0.getFullYear(), m - 1, d);
        if (next < today0) next = new Date(today0.getFullYear() + 1, m - 1, d);
        const days = Math.round((next - today0) / 86400000);
        return { client: c, days, date: next };
      })
      .filter((x) => x && x.days <= 7)
      .sort((a, b) => a.days - b.days);
  }, [activeClients]);

  const dischargeData = useMemo(() => {
    const map = {};
    clients
      .filter((c) => c.dischargeReason)
      .forEach((c) => {
        const label = dischargeReasonLabel(c.dischargeReason);
        map[label] = (map[label] || 0) + 1;
      });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [clients]);

  // Tomorrow's sessions for attendance confirmation.
  const tomorrow = addDays(new Date(), 1);
  const tomorrowSessions = useMemo(() => {
    const tomorrowStr = format(tomorrow, "yyyy-MM-dd");
    return schedules
      .filter((s) => s.date === tomorrowStr && s.status !== "cancelled")
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [schedules, tomorrow]);

  const clientName = (clientId) => {
    const c = clients.find((cl) => cl.id === clientId);
    return c ? c.clientName : "Unknown";
  };

  return (
    <div className="space-y-6" data-testid="dashboard-schedule-page">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Schedule & Analytics Dashboard</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Clinic operations, scheduling metrics, and advanced client analytics at a glance.</p>
      </div>

      {/* Birthday reminder banner (next 7 days) */}
      {upcomingBirthdays.length > 0 && (
        <div
          className="rounded-xl border border-[rgba(47,168,224,0.35)] bg-[var(--color-primary-light)] px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2"
          data-testid="birthday-reminder-banner"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary-dark)]">
            <Cake className="w-4 h-4" /> Birthdays coming up!
          </span>
          <div className="flex flex-wrap gap-2">
            {upcomingBirthdays.map(({ client, days, date }) => (
              <button
                key={client.id}
                type="button"
                onClick={() => navigate(`/admin-schedule/clients/${client.id}`)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[rgba(47,168,224,0.35)] px-3 py-1 text-xs font-medium text-[var(--color-primary-dark)] hover:shadow-sm transition-shadow"
                data-testid={`birthday-reminder-chip-${client.id}`}
              >
                {client.clientName}
                <span className="text-[var(--color-text-muted)] font-normal">
                  {days === 0 ? "today 🎂" : days === 1 ? "tomorrow" : `in ${days} days (${format(date, "MMM d")})`}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Clients" value={activeClients.length} icon={Users} accent="primary" onClick={() => navigate("/admin-schedule/clients")} testid="stat-active-clients" />
        <StatCard label="Sessions This Week" value={sessionsThisWeek} icon={CalendarDays} accent="info" onClick={() => navigate("/admin-schedule/calendar")} testid="stat-sessions-week" />
        <StatCard label="Low / Out of Credit" value={lowCredit.length} icon={Wallet} accent="warning" testid="stat-low-credit" />
        <StatCard label="Over Leave Quota" value={overLeave.length} icon={AlertTriangle} accent="danger" testid="stat-over-leave" />
      </div>

      {/* SECTION: ADVANCED CLIENT ANALYTICS FILTER BAR */}
      <Card className="rounded-xl border-[var(--color-primary)] border-opacity-30 bg-gradient-to-r from-blue-50/50 to-cyan-50/30 shadow-sm" data-testid="advanced-analytics-card">
        <CardHeader className="pb-3 border-b border-[var(--color-border)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-[var(--color-primary-dark)]" />
              <CardTitle className="text-base font-semibold">Advanced Client Analytics & Filters</CardTitle>
            </div>
            <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5" onClick={resetFilters} data-testid="reset-analytics-filters">
              <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-5">
          {/* Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* Filter 1: Per Child / Client */}
            <div className="space-y-1">
              <Label className="text-xs text-[var(--color-text-muted)] font-medium">Per Anak / Client</Label>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="h-9 text-xs" data-testid="filter-client-select">
                  <SelectValue placeholder="Semua Anak" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Anak ({clients.length})</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter 2: Per Therapy Type */}
            <div className="space-y-1">
              <Label className="text-xs text-[var(--color-text-muted)] font-medium">Per Layanan / Terapi</Label>
              <Select value={filterTherapyType} onValueChange={setFilterTherapyType}>
                <SelectTrigger className="h-9 text-xs" data-testid="filter-therapy-type-select">
                  <SelectValue placeholder="Semua Layanan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Layanan</SelectItem>
                  <SelectItem value="therapy">Therapy</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter 3: Per Terapis */}
            <div className="space-y-1">
              <Label className="text-xs text-[var(--color-text-muted)] font-medium">Per Terapis</Label>
              <Select value={filterTherapist} onValueChange={setFilterTherapist}>
                <SelectTrigger className="h-9 text-xs" data-testid="filter-therapist-select">
                  <SelectValue placeholder="Semua Terapis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Terapis</SelectItem>
                  {therapists.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter 4: Per Status */}
            <div className="space-y-1">
              <Label className="text-xs text-[var(--color-text-muted)] font-medium">Status Sesi</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 text-xs" data-testid="filter-status-select">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter 5: Date Start */}
            <div className="space-y-1">
              <Label className="text-xs text-[var(--color-text-muted)] font-medium">Dari Tanggal</Label>
              <Input
                type="date"
                className="h-9 text-xs"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                data-testid="filter-start-date-input"
              />
            </div>

            {/* Filter 6: Date End */}
            <div className="space-y-1">
              <Label className="text-xs text-[var(--color-text-muted)] font-medium">Sampai Tanggal</Label>
              <Input
                type="date"
                className="h-9 text-xs"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                data-testid="filter-end-date-input"
              />
            </div>
          </div>

          {/* Filter Analytics Results Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
            <div className="bg-white rounded-lg p-3 border shadow-sm">
              <p className="text-[11px] font-medium text-[var(--color-text-muted)]">Total Filtered</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{totalFiltered}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border shadow-sm">
              <p className="text-[11px] font-medium text-green-600">Completed</p>
              <p className="text-xl font-bold text-green-700 mt-0.5">{completedFiltered}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border shadow-sm">
              <p className="text-[11px] font-medium text-amber-600">Rescheduled</p>
              <p className="text-xl font-bold text-amber-700 mt-0.5">{rescheduledFiltered}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border shadow-sm">
              <p className="text-[11px] font-medium text-red-600">Cancelled</p>
              <p className="text-xl font-bold text-red-700 mt-0.5">{cancelledFiltered}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border shadow-sm">
              <p className="text-[11px] font-medium text-[var(--color-primary-dark)]">Completion Rate</p>
              <p className="text-xl font-bold text-[var(--color-primary-dark)] mt-0.5">{completionRate}%</p>
            </div>
            <div className="bg-white rounded-lg p-3 border shadow-sm">
              <p className="text-[11px] font-medium text-rose-600">Cancel Rate</p>
              <p className="text-xl font-bold text-rose-700 mt-0.5">{cancellationRate}%</p>
            </div>
          </div>

          {/* Detailed Breakdown Charts & List for Filtered Selection */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2">
            {/* Filtered Session List */}
            <div className="lg:col-span-8 bg-white rounded-xl border p-4 shadow-sm">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[var(--color-primary)]" />
                Filtered Session Records ({filteredAnalyticsSchedules.length})
              </h3>
              {filteredAnalyticsSchedules.length === 0 ? (
                <EmptyState icon={CalendarClock} title="Tidak ada sesi" subtitle="Tidak ada data sesi yang sesuai dengan kombinasi filter di atas." />
              ) : (
                <div className="max-h-64 overflow-y-auto divide-y divide-gray-100" data-testid="filtered-analytics-session-list">
                  {filteredAnalyticsSchedules.slice(0, 20).map((s) => {
                    const t = getTherapist(s.therapistId);
                    return (
                      <div key={s.id} className="py-2 flex items-center justify-between text-xs hover:bg-gray-50 px-2 rounded">
                        <div>
                          <p className="font-semibold text-gray-900">{clientName(s.clientId)}</p>
                          <p className="text-[11px] text-gray-500">
                            {s.date} · {s.startTime}–{s.endTime} · Terapis: {t ? t.name : "—"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={s.type} />
                          <StatusBadge status={s.status} />
                        </div>
                      </div>
                    );
                  })}
                  {filteredAnalyticsSchedules.length > 20 && (
                    <p className="text-[11px] text-center text-gray-500 pt-2 font-medium">
                      + Menampilkan 20 dari {filteredAnalyticsSchedules.length} sesi.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Service Type Breakdown Pie */}
            <div className="lg:col-span-4 bg-white rounded-xl border p-4 shadow-sm">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-violet-500" />
                Distribusi Layanan
              </h3>
              <div className="h-52">
                {therapyTypeBreakdown.length === 0 ? (
                  <EmptyState icon={PieIcon} title="No data" subtitle="Select filters with sessions." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={therapyTypeBreakdown} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={60} innerRadius={30} paddingAngle={4}>
                        {therapyTypeBreakdown.map((entry, i) => (
                          <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tomorrow's sessions — attendance confirmation list */}
      <Card className="rounded-xl border-[var(--color-border)] shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-[var(--color-primary-dark)]" />
            Tomorrow's Sessions ({tomorrowSessions.length}) · {format(tomorrow, "EEE, MMM d")}
          </CardTitle>
          <Button variant="outline" size="sm" className="h-8" onClick={() => navigate("/admin-schedule/calendar")} data-testid="tomorrow-open-calendar-button">
            Open Calendar
          </Button>
        </CardHeader>
        <CardContent>
          {tomorrowSessions.length === 0 ? (
            <EmptyState icon={CalendarClock} title="No sessions tomorrow" subtitle="A quiet day ahead — nothing to confirm." />
          ) : (
            <ul className="divide-y divide-[var(--color-border)]" data-testid="tomorrow-sessions-list">
              {tomorrowSessions.map((s) => {
                const t = getTherapist(s.therapistId);
                return (
                  <li
                    key={s.id}
                    className="py-2.5 flex flex-wrap items-center gap-3 cursor-pointer hover:bg-[rgba(47,168,224,0.04)] rounded-lg px-2 -mx-2"
                    onClick={() => navigate(`/admin-schedule/clients/${s.clientId}`)}
                    data-testid={`tomorrow-session-item-${s.id}`}
                  >
                    <span className="w-24 text-sm font-semibold tabular-nums shrink-0">
                      {s.startTime}–{s.endTime}
                    </span>
                    <span className="text-sm font-medium">{clientName(s.clientId)}</span>
                    <span className="text-xs text-[var(--color-text-muted)]">{t ? t.name : "—"}</span>
                    <span className="ml-auto flex gap-1.5">
                      <StatusBadge status={s.type} />
                      <StatusBadge status={s.status} />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Session status chart */}
        <Card className="rounded-xl border-[var(--color-border)] shadow-sm lg:col-span-7">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Sessions by Status (Monthly Overview)</CardTitle>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-40 h-9" data-testid="session-chart-month-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Last 6 months</SelectItem>
                {months.map((m) => (
                  <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sessionChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(229,231,235,0.9)" />
                <XAxis dataKey="month" tick={{ fill: "#6B7280", fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: "#6B7280", fontSize: 12 }} />
                <Tooltip cursor={{ fill: "rgba(47,168,224,0.06)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Completed" fill="#22C55E" radius={[5, 5, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Cancelled" fill="#EF4444" radius={[5, 5, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Rescheduled" fill="#F59E0B" radius={[5, 5, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Discharge reason pie */}
        <Card className="rounded-xl border-[var(--color-border)] shadow-sm lg:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Discharge Reasons</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {dischargeData.length === 0 ? (
              <EmptyState icon={PieIcon} title="No discharges yet" subtitle="Discharge reasons will appear here." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dischargeData} dataKey="value" nameKey="name" cx="50%" cy="46%" outerRadius={78} innerRadius={44} paddingAngle={3}>
                    {dischargeData.map((entry, i) => (
                      <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Low credit list */}
        <Card className="rounded-xl border-[var(--color-border)] shadow-sm lg:col-span-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Low on Credit</CardTitle>
          </CardHeader>
          <CardContent>
            {lowCredit.length === 0 ? (
              <EmptyState icon={Wallet} title="Everyone has credit" subtitle="No active client is low or out of credit." />
            ) : (
              <ul className="divide-y divide-[var(--color-border)]" data-testid="low-credit-list">
                {lowCredit.map(({ record, client }) => (
                  <li
                    key={record.id}
                    className="py-3 flex items-center gap-4 cursor-pointer hover:bg-[rgba(47,168,224,0.04)] rounded-lg px-2 -mx-2"
                    onClick={() => navigate(`/admin-schedule/clients/${client.id}`)}
                    data-testid={`low-credit-item-${client.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{client.clientName}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{record.packageName}</p>
                    </div>
                    <div className="w-40">
                      <CreditBar remaining={record.remainingCredit} total={record.totalCredit} compact />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Birthdays */}
        <Card className="rounded-xl border-[var(--color-border)] shadow-sm lg:col-span-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Birthdays This Month</CardTitle>
          </CardHeader>
          <CardContent>
            {birthdays.length === 0 ? (
              <EmptyState icon={Cake} title="No birthdays this month" subtitle="Check the Active Clients birthday tab for other months." />
            ) : (
              <ul className="divide-y divide-[var(--color-border)]" data-testid="birthday-list">
                {birthdays.map((c) => (
                  <li
                    key={c.id}
                    className="py-3 flex items-center gap-3 cursor-pointer hover:bg-[rgba(47,168,224,0.04)] rounded-lg px-2 -mx-2"
                    onClick={() => navigate(`/admin-schedule/clients/${c.id}`)}
                    data-testid={`birthday-item-${c.id}`}
                  >
                    <div className="w-9 h-9 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center">
                      <Cake className="w-4 h-4 text-[var(--color-primary-dark)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{c.clientName}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{fmtDate(c.dob)} · turning {(calcAge(c.dob) || 0) + 1}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
