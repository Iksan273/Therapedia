import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { endOfWeek, format, parseISO, startOfWeek, subMonths } from "date-fns";
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
import { Users, CalendarDays, Wallet, Cake, PieChart as PieIcon, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { CreditBar } from "@/components/common/CreditBar";
import { useClients } from "@/context/ClientsContext";
import { useSchedules } from "@/context/SchedulesContext";
import { useCredits } from "@/context/CreditsContext";
import { calcAge, dischargeReasonLabel, fmtDate } from "@/lib/appUtils";

const PIE_COLORS = ["#2FA8E0", "#22C55E", "#F59E0B", "#EF4444", "#3B82F6", "#8B5CF6"];

export default function DashboardSchedule() {
  const navigate = useNavigate();
  const { clients } = useClients();
  const { schedules } = useSchedules();
  const { credits } = useCredits();

  const [monthFilter, setMonthFilter] = useState("all");

  const activeClients = useMemo(() => clients.filter((c) => c.status === "admitted"), [clients]);

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(now, 5 - i);
      return { key: format(m, "yyyy-MM"), label: format(m, "MMM yyyy") };
    });
  }, []);

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

  return (
    <div className="space-y-6" data-testid="dashboard-schedule-page">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Schedule Dashboard</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Clinic operations at a glance.</p>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Clients" value={activeClients.length} icon={Users} accent="primary" onClick={() => navigate("/admin-schedule/clients")} testid="stat-active-clients" />
        <StatCard label="Sessions This Week" value={sessionsThisWeek} icon={CalendarDays} accent="info" onClick={() => navigate("/admin-schedule/calendar")} testid="stat-sessions-week" />
        <StatCard label="Low / Out of Credit" value={lowCredit.length} icon={Wallet} accent="warning" testid="stat-low-credit" />
        <StatCard label="Over Leave Quota" value={overLeave.length} icon={AlertTriangle} accent="danger" testid="stat-over-leave" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Session status chart */}
        <Card className="rounded-xl border-[var(--color-border)] shadow-sm lg:col-span-7">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Sessions by Status</CardTitle>
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
