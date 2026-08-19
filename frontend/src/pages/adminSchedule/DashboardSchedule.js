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
  Sparkles,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

const PIE_COLORS = ["#0284C7", "#10B981", "#F59E0B", "#F43F5E", "#6366F1", "#8B5CF6"];

const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl text-xs shadow-xl border border-slate-800 space-y-1">
        <p className="font-bold border-b border-slate-700 pb-1 mb-1">{label}</p>
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 font-medium" style={{ color: entry.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-bold tabular-nums">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

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
    <div className="space-y-7" data-testid="dashboard-schedule-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100/80 text-sky-800 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            Clinic Operations & Scheduling
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Schedule & Analytics Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time clinic schedule performance, therapist occupancy, credit health, and attendance.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => navigate("/admin-schedule/calendar")}
            className="bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl gap-2 shadow-sm shadow-sky-600/20"
          >
            <CalendarDays className="w-4 h-4" />
            Open Weekly Calendar
          </Button>
        </div>
      </div>

      {/* Birthday reminder banner (next 7 days) */}
      {upcomingBirthdays.length > 0 && (
        <div
          className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs"
          data-testid="birthday-reminder-banner"
        >
          <div className="flex items-center gap-2.5 text-sm font-bold text-sky-900">
            <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0">
              <Cake className="w-4 h-4" />
            </div>
            <span>Upcoming Client Birthdays (Next 7 Days):</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {upcomingBirthdays.map(({ client, days, date }) => (
              <button
                key={client.id}
                type="button"
                onClick={() => navigate(`/admin-schedule/clients/${client.id}`)}
                className="inline-flex items-center gap-2 rounded-xl bg-white border border-sky-200 px-3 py-1.5 text-xs font-bold text-sky-800 hover:border-sky-400 hover:shadow-xs transition-all cursor-pointer"
                data-testid={`birthday-reminder-chip-${client.id}`}
              >
                <span>{client.clientName}</span>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-md">
                  {days === 0 ? "Today! 🎂" : days === 1 ? "Tomorrow" : `In ${days}d (${format(date, "MMM d")})`}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Active Enrolled Clients" value={activeClients.length} icon={Users} accent="primary" onClick={() => navigate("/admin-schedule/clients")} testid="stat-active-clients" />
        <StatCard label="Sessions This Week" value={sessionsThisWeek} icon={CalendarDays} accent="info" onClick={() => navigate("/admin-schedule/calendar")} testid="stat-sessions-week" />
        <StatCard label="Low / Out of Credit" value={lowCredit.length} icon={Wallet} accent="warning" testid="stat-low-credit" />
        <StatCard label="Over Leave Quota" value={overLeave.length} icon={AlertTriangle} accent="danger" testid="stat-over-leave" />
      </div>

      {/* SECTION: ADVANCED CLIENT ANALYTICS FILTER BAR */}
      <Card className="clinical-card rounded-2xl border-slate-200/90" data-testid="advanced-analytics-card">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100">
                <Filter className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Advanced Client Analytics & Attendance Filters</CardTitle>
                <CardDescription className="text-xs text-slate-500">Filter session telemetry across children, therapists, and date ranges</CardDescription>
              </div>
            </div>
            <Button size="sm" variant="outline" className="h-8 text-xs font-semibold rounded-xl gap-1.5 border-slate-200" onClick={resetFilters} data-testid="reset-analytics-filters">
              <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
          {/* Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* Filter 1: Per Child / Client */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600 font-bold">Child / Client</Label>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 bg-white" data-testid="filter-client-select">
                  <SelectValue placeholder="All Children" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="all">All Children ({clients.length})</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter 2: Per Therapy Type */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600 font-bold">Service Type</Label>
              <Select value={filterTherapyType} onValueChange={setFilterTherapyType}>
                <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 bg-white" data-testid="filter-therapy-type-select">
                  <SelectValue placeholder="All Services" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="all">All Services</SelectItem>
                  <SelectItem value="therapy">Therapy</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter 3: Per Therapist */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600 font-bold">Assigned Therapist</Label>
              <Select value={filterTherapist} onValueChange={setFilterTherapist}>
                <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 bg-white" data-testid="filter-therapist-select">
                  <SelectValue placeholder="All Therapists" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="all">All Therapists</SelectItem>
                  {therapists.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter 4: Per Status */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600 font-bold">Session Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 bg-white" data-testid="filter-status-select">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter 5: Date Start */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600 font-bold">Start Date</Label>
              <Input
                type="date"
                className="h-9 text-xs rounded-xl border-slate-200 bg-white"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                data-testid="filter-start-date-input"
              />
            </div>

            {/* Filter 6: Date End */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600 font-bold">End Date</Label>
              <Input
                type="date"
                className="h-9 text-xs rounded-xl border-slate-200 bg-white"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                data-testid="filter-end-date-input"
              />
            </div>
          </div>

          {/* Filter Analytics Results Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Filtered Sessions</p>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5 tabular-nums">{totalFiltered}</p>
            </div>
            <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-200/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Completed</p>
              <p className="text-xl font-extrabold text-emerald-800 mt-0.5 tabular-nums">{completedFiltered}</p>
            </div>
            <div className="bg-amber-50/70 rounded-xl p-3 border border-amber-200/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Rescheduled</p>
              <p className="text-xl font-extrabold text-amber-800 mt-0.5 tabular-nums">{rescheduledFiltered}</p>
            </div>
            <div className="bg-rose-50/70 rounded-xl p-3 border border-rose-200/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Cancelled</p>
              <p className="text-xl font-extrabold text-rose-800 mt-0.5 tabular-nums">{cancelledFiltered}</p>
            </div>
            <div className="bg-sky-50/70 rounded-xl p-3 border border-sky-200/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-sky-700">Completion Rate</p>
              <p className="text-xl font-extrabold text-sky-900 mt-0.5 tabular-nums">{completionRate}%</p>
            </div>
            <div className="bg-purple-50/70 rounded-xl p-3 border border-purple-200/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Cancellation Rate</p>
              <p className="text-xl font-extrabold text-purple-900 mt-0.5 tabular-nums">{cancellationRate}%</p>
            </div>
          </div>

          {/* Detailed Breakdown Charts & List for Filtered Selection */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
            {/* Filtered Session List */}
            <div className="lg:col-span-8 bg-slate-50/50 rounded-2xl border border-slate-200/80 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-600" />
                Filtered Session Records ({filteredAnalyticsSchedules.length})
              </h3>
              {filteredAnalyticsSchedules.length === 0 ? (
                <EmptyState icon={CalendarClock} title="No matching sessions" subtitle="Try loosening the filter parameters above." />
              ) : (
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-200/70 pr-1 space-y-0.5" data-testid="filtered-analytics-session-list">
                  {filteredAnalyticsSchedules.slice(0, 20).map((s) => {
                    const t = getTherapist(s.therapistId);
                    return (
                      <div key={s.id} className="py-2.5 px-2 flex items-center justify-between text-xs hover:bg-white rounded-xl transition-colors">
                        <div>
                          <p className="font-bold text-slate-900">{clientName(s.clientId)}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {s.date} · {s.startTime}–{s.endTime} · Therapist: {t ? t.name : "—"}
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
                    <p className="text-[11px] text-center text-slate-500 pt-3 font-semibold">
                      + Showing 20 of {filteredAnalyticsSchedules.length} session records
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Service Type Breakdown Pie */}
            <div className="lg:col-span-4 bg-slate-50/50 rounded-2xl border border-slate-200/80 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-purple-600" />
                Service Distribution
              </h3>
              <div className="h-56">
                {therapyTypeBreakdown.length === 0 ? (
                  <EmptyState icon={PieIcon} title="No data" subtitle="No matching service records." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={therapyTypeBreakdown} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={64} innerRadius={36} paddingAngle={4}>
                        {therapyTypeBreakdown.map((entry, i) => (
                          <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tomorrow's sessions — attendance confirmation list */}
      <Card className="clinical-card rounded-2xl border-slate-200/90">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Tomorrow's Clinical Sessions ({tomorrowSessions.length}) · {format(tomorrow, "EEE, MMM d")}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">Upcoming sessions requiring parent attendance confirmation</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs font-semibold rounded-xl border-slate-200" onClick={() => navigate("/admin-schedule/calendar")} data-testid="tomorrow-open-calendar-button">
            View on Calendar
          </Button>
        </CardHeader>
        <CardContent className="p-4">
          {tomorrowSessions.length === 0 ? (
            <EmptyState icon={CalendarClock} title="No sessions tomorrow" subtitle="No client appointments are scheduled for tomorrow." />
          ) : (
            <ul className="divide-y divide-slate-100" data-testid="tomorrow-sessions-list">
              {tomorrowSessions.map((s) => {
                const t = getTherapist(s.therapistId);
                return (
                  <li
                    key={s.id}
                    className="py-3 px-3 flex flex-wrap items-center gap-3 cursor-pointer hover:bg-sky-50/60 rounded-xl transition-colors group"
                    onClick={() => navigate(`/admin-schedule/clients/${s.clientId}`)}
                    data-testid={`tomorrow-session-item-${s.id}`}
                  >
                    <span className="w-28 text-xs font-bold text-slate-800 tabular-nums bg-slate-100 px-2 py-1 rounded-md shrink-0">
                      {s.startTime}–{s.endTime}
                    </span>
                    <span className="text-sm font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                      {clientName(s.clientId)}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Therapist: {t ? t.name : "—"}</span>
                    <span className="ml-auto flex items-center gap-2">
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
        <Card className="clinical-card rounded-2xl border-slate-200/90 lg:col-span-7">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Session Status Overview</CardTitle>
              <CardDescription className="text-xs text-slate-500">Monthly breakdown of completed, cancelled, and rescheduled visits</CardDescription>
            </div>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-40 h-9 text-xs rounded-xl border-slate-200 bg-white" data-testid="session-chart-month-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                <SelectItem value="all">Last 6 months</SelectItem>
                {months.map((m) => (
                  <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="h-72 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sessionChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#047857" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="roseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#BE123C" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#B45309" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#64748B", fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "#64748B", fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                <Bar dataKey="Completed" fill="url(#emeraldGrad)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Cancelled" fill="url(#roseGrad)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Rescheduled" fill="url(#amberGrad)" radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Discharge reason pie */}
        <Card className="clinical-card rounded-2xl border-slate-200/90 lg:col-span-5">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">Discharge Reasons</CardTitle>
            <CardDescription className="text-xs text-slate-500">Distribution of historical reasons for discharge</CardDescription>
          </CardHeader>
          <CardContent className="h-72 pt-2">
            {dischargeData.length === 0 ? (
              <EmptyState icon={PieIcon} title="No discharges yet" subtitle="Discharge reasons will appear here." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dischargeData} dataKey="value" nameKey="name" cx="50%" cy="46%" outerRadius={76} innerRadius={42} paddingAngle={3}>
                    {dischargeData.map((entry, i) => (
                      <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Low credit list */}
        <Card className="clinical-card rounded-2xl border-slate-200/90 lg:col-span-6">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Low or Depleted Credits</CardTitle>
                <CardDescription className="text-xs text-slate-500">Enrolled clients with 2 or fewer remaining session credits</CardDescription>
              </div>
              <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full">
                {lowCredit.length} Clients
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {lowCredit.length === 0 ? (
              <EmptyState icon={Wallet} title="All accounts healthy" subtitle="No active client has depleted session credits." />
            ) : (
              <ul className="divide-y divide-slate-100" data-testid="low-credit-list">
                {lowCredit.map(({ record, client }) => (
                  <li
                    key={record.id}
                    className="py-3 px-2 flex items-center gap-4 cursor-pointer hover:bg-sky-50/60 rounded-xl transition-colors"
                    onClick={() => navigate(`/admin-schedule/clients/${client.id}`)}
                    data-testid={`low-credit-item-${client.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800">{client.clientName}</p>
                      <p className="text-xs text-slate-500 font-medium">{record.packageName}</p>
                    </div>
                    <div className="w-44">
                      <CreditBar remaining={record.remainingCredit} total={record.totalCredit} compact />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Birthdays */}
        <Card className="clinical-card rounded-2xl border-slate-200/90 lg:col-span-6">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Birthdays This Month</CardTitle>
                <CardDescription className="text-xs text-slate-500">Enrolled children celebrating their birthdays this month</CardDescription>
              </div>
              <span className="text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-0.5 rounded-full">
                {birthdays.length} Children
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {birthdays.length === 0 ? (
              <EmptyState icon={Cake} title="No birthdays this month" subtitle="Check the Active Clients birthday tab for upcoming months." />
            ) : (
              <ul className="divide-y divide-slate-100" data-testid="birthday-list">
                {birthdays.map((c) => (
                  <li
                    key={c.id}
                    className="py-3 px-2 flex items-center gap-3 cursor-pointer hover:bg-sky-50/60 rounded-xl transition-colors group"
                    onClick={() => navigate(`/admin-schedule/clients/${c.id}`)}
                    data-testid={`birthday-item-${c.id}`}
                  >
                    <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-sm shrink-0 border border-sky-200">
                      <Cake className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 group-hover:text-sky-700 transition-colors">{c.clientName}</p>
                      <p className="text-xs text-slate-500 font-medium">Born {fmtDate(c.dob)} · Turning {(calcAge(c.dob) || 0) + 1} years old</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-sky-600 transition-transform group-hover:translate-x-0.5" />
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

