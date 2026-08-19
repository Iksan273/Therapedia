import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Users,
  Cake,
  BarChart3,
  ChevronRight,
  Sparkles,
  UserCheck,
  Calendar,
  Search,
  Filter,
  Clock,
  Phone,
  Mail,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Layers,
  LayoutGrid,
  ListFilter,
  Send,
  CalendarPlus,
  RefreshCw,
  SlidersHorizontal,
  Baby,
  Activity,
  Flame,
  User,
  ShieldCheck,
  MessageCircle,
  HelpCircle
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreditBar, LeaveInfo } from "@/components/common/CreditBar";
import { StatusBadge, ConcernTag } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { AddScheduleModal } from "@/components/calendar/AddScheduleModal";
import { useClients } from "@/context/ClientsContext";
import { useSchedules } from "@/context/SchedulesContext";
import { useCredits } from "@/context/CreditsContext";
import { useTherapists } from "@/context/TherapistsContext";
import { calcAge, fmtDate } from "@/lib/appUtils";
import { cn } from "@/lib/utils";

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1).padStart(2, "0"),
  label: format(new Date(2026, i, 1), "MMMM"),
}));

const CHART_COLORS = ["#0284c7", "#0d9488", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#64748b"];

export default function ActiveClients() {
  const navigate = useNavigate();
  const { clients } = useClients();
  const { schedules } = useSchedules();
  const { getRecordForClient } = useCredits();
  const { therapists } = useTherapists();

  const [birthdayMonth, setBirthdayMonth] = useState(format(new Date(), "MM"));
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [creditFilter, setCreditFilter] = useState("all"); // all | low (<=2) | healthy (>2) | over_leave
  const [viewMode, setViewMode] = useState("table"); // table | grid
  const [quickScheduleClientId, setQuickScheduleClientId] = useState(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  const active = useMemo(
    () => clients.filter((c) => c.status === "admitted" && !c.dateOfDischarge),
    [clients]
  );

  // Filtered roster
  const filteredActive = useMemo(() => {
    return active.filter((c) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.clientName.toLowerCase().includes(q) ||
        (c.parentName && c.parentName.toLowerCase().includes(q)) ||
        (c.parentContact && c.parentContact.toLowerCase().includes(q)) ||
        (c.clientAccessCode && c.clientAccessCode.toLowerCase().includes(q));

      const matchService =
        serviceFilter === "all" ||
        (c.concernTags && c.concernTags.includes(serviceFilter)) ||
        c.serviceType === serviceFilter;

      const record = getRecordForClient(c.id);
      let matchCredit = true;
      if (creditFilter === "low") {
        matchCredit = record ? record.remainingCredit <= 2 : true;
      } else if (creditFilter === "healthy") {
        matchCredit = record ? record.remainingCredit > 2 : false;
      } else if (creditFilter === "over_leave") {
        matchCredit = record ? record.leaveUsed > record.leaveQuota : false;
      }

      return matchSearch && matchService && matchCredit;
    });
  }, [active, searchTerm, serviceFilter, creditFilter, getRecordForClient]);

  // Birthday clients
  const birthdayClients = useMemo(
    () =>
      active
        .filter((c) => c.dob && c.dob.split("-")[1] === birthdayMonth)
        .sort((a, b) => Number(a.dob.split("-")[2]) - Number(b.dob.split("-")[2])),
    [active, birthdayMonth]
  );

  // Overall KPIs
  const kpis = useMemo(() => {
    let totalSessions = 0;
    let completedSessions = 0;
    let cancelledSessions = 0;
    let rescheduledSessions = 0;
    let lowCreditCount = 0;
    let overLeaveCount = 0;

    active.forEach((c) => {
      const own = schedules.filter((s) => s.clientId === c.id);
      totalSessions += own.length;
      completedSessions += own.filter((s) => s.status === "completed").length;
      cancelledSessions += own.filter((s) => s.status === "cancelled").length;
      rescheduledSessions += own.filter((s) => s.status === "rescheduled").length;

      const rec = getRecordForClient(c.id);
      if (rec) {
        if (rec.remainingCredit <= 2) lowCreditCount += 1;
        if (rec.leaveUsed > rec.leaveQuota) overLeaveCount += 1;
      }
    });

    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
    const cancellationRate = totalSessions > 0 ? Math.round((cancelledSessions / totalSessions) * 100) : 0;

    return {
      totalClients: active.length,
      totalSessions,
      completedSessions,
      cancelledSessions,
      rescheduledSessions,
      completionRate,
      cancellationRate,
      lowCreditCount,
      overLeaveCount,
    };
  }, [active, schedules, getRecordForClient]);

  // Detailed client-level analytics
  const clientAnalytics = useMemo(
    () =>
      active.map((c) => {
        const own = schedules.filter((s) => s.clientId === c.id);
        const comp = own.filter((s) => s.status === "completed").length;
        const canc = own.filter((s) => s.status === "cancelled").length;
        const resc = own.filter((s) => s.status === "rescheduled").length;
        const rec = getRecordForClient(c.id);
        const rate = own.length > 0 ? Math.round((comp / own.length) * 100) : 0;
        return {
          id: c.id,
          name: c.clientName,
          client: c,
          completed: comp,
          cancelled: canc,
          rescheduled: resc,
          total: own.length,
          completionRate: rate,
          remainingCredit: rec ? rec.remainingCredit : 0,
          totalCredit: rec ? rec.totalCredit : 0,
          leaveUsed: rec ? rec.leaveUsed : 0,
          leaveQuota: rec ? rec.leaveQuota : 0,
        };
      }),
    [active, schedules, getRecordForClient]
  );

  // Service distribution chart data
  const serviceDistributionData = useMemo(() => {
    const counts = {};
    active.forEach((c) => {
      if (c.concernTags && c.concernTags.length > 0) {
        c.concernTags.forEach((tag) => {
          counts[tag] = (counts[tag] || 0) + 1;
        });
      } else {
        counts["general"] = (counts["general"] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  }, [active]);

  // Therapist active client distribution data
  const therapistLoadData = useMemo(() => {
    const map = {};
    therapists.forEach((t) => {
      map[t.id] = { name: t.name.split(" ")[0], count: 0, specialty: t.specialty };
    });
    schedules.forEach((s) => {
      if (s.therapistId && map[s.therapistId]) {
        map[s.therapistId].count += 1;
      }
    });
    return Object.values(map);
  }, [therapists, schedules]);

  // Renewal Alert list (clients with <= 2 credits remaining)
  const renewalWatchlist = useMemo(() => {
    return active
      .map((c) => {
        const rec = getRecordForClient(c.id);
        return { client: c, record: rec };
      })
      .filter(({ record }) => record && record.remainingCredit <= 2)
      .sort((a, b) => (a.record?.remainingCredit || 0) - (b.record?.remainingCredit || 0));
  }, [active, getRecordForClient]);

  // Age group demographics
  const ageDemographicsData = useMemo(() => {
    let toddler = 0; // 0-3
    let preschool = 0; // 4-6
    let school = 0; // 7-10
    let preteen = 0; // 11+
    active.forEach((c) => {
      const age = calcAge(c.dob);
      if (age == null) return;
      if (age <= 3) toddler += 1;
      else if (age <= 6) preschool += 1;
      else if (age <= 10) school += 1;
      else preteen += 1;
    });
    return [
      { group: "0-3 yrs (Toddler)", count: toddler },
      { group: "4-6 yrs (Preschool)", count: preschool },
      { group: "7-10 yrs (School Age)", count: school },
      { group: "11+ yrs (Pre-teen)", count: preteen },
    ];
  }, [active]);

  const goTo = (id) => navigate(`/admin-schedule/clients/${id}`);

  const handleOpenQuickSchedule = (e, clientId) => {
    e.stopPropagation();
    setQuickScheduleClientId(clientId);
    setScheduleModalOpen(true);
  };

  return (
    <div className="space-y-6" data-testid="active-clients-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100/80 text-sky-800 text-xs font-semibold mb-2">
            <UserCheck className="w-3.5 h-3.5 text-sky-600" />
            Enrolled Patient Roster & Telemetry
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Active Clients & Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            <strong className="text-slate-800 tabular-nums">{active.length}</strong> active pediatric clients enrolled across clinical programs.
          </p>
        </div>
      </div>

      {/* Top Telemetry KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Enrolled Clients</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 tabular-nums">{kpis.totalClients}</p>
          <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> 100% Active in care
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Session Completion Rate</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 tabular-nums">{kpis.completionRate}%</p>
          <p className="text-[11px] font-medium text-slate-500 tabular-nums">
            {kpis.completedSessions} of {kpis.totalSessions} sessions logged
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Low-Credit Pipeline</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 tabular-nums">{kpis.lowCreditCount}</p>
          <p className="text-[11px] font-medium text-amber-700">
            Clients with ≤ 2 credits remaining
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Birthdays This Month</span>
            <Cake className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-700 tabular-nums">{birthdayClients.length}</p>
          <p className="text-[11px] font-medium text-purple-600">
            Celebrations in {format(new Date(), "MMMM")}
          </p>
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="bg-slate-100 p-1 rounded-xl border border-slate-200">
            <TabsTrigger value="all" className="rounded-lg text-xs font-bold px-4 data-[state=active]:bg-white data-[state=active]:text-sky-900 data-[state=active]:shadow-2xs cursor-pointer" data-testid="active-clients-tab-all">
              <Users className="w-3.5 h-3.5 mr-1.5" /> All Clients ({active.length})
            </TabsTrigger>
            <TabsTrigger value="birthday" className="rounded-lg text-xs font-bold px-4 data-[state=active]:bg-white data-[state=active]:text-sky-900 data-[state=active]:shadow-2xs cursor-pointer" data-testid="active-clients-tab-birthday">
              <Cake className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Birthday Hub ({birthdayClients.length})
            </TabsTrigger>
            <TabsTrigger value="analytic" className="rounded-lg text-xs font-bold px-4 data-[state=active]:bg-white data-[state=active]:text-sky-900 data-[state=active]:shadow-2xs cursor-pointer" data-testid="active-clients-tab-analytic">
              <BarChart3 className="w-3.5 h-3.5 mr-1.5 text-sky-600" /> Advanced Analytics
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: All Active Clients Roster */}
        <TabsContent value="all" className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-10 h-10 rounded-xl border-slate-200 bg-slate-50 focus:bg-white text-xs"
                  placeholder="Search by client name, parent, phone, or access code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="active-clients-search-input"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={creditFilter} onValueChange={setCreditFilter}>
                  <SelectTrigger className="w-44 h-10 text-xs rounded-xl border-slate-200 bg-slate-50 font-semibold" data-testid="credit-status-filter">
                    <SelectValue placeholder="Package Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="all">All Package Statuses</SelectItem>
                    <SelectItem value="low">⚠️ Low Credit (≤ 2 left)</SelectItem>
                    <SelectItem value="healthy">✅ Healthy (> 2 left)</SelectItem>
                    <SelectItem value="over_leave">🚨 Over Leave Quota</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={serviceFilter} onValueChange={setServiceFilter}>
                  <SelectTrigger className="w-40 h-10 text-xs rounded-xl border-slate-200 bg-slate-50 font-semibold" data-testid="service-type-filter">
                    <SelectValue placeholder="Clinical Focus" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="all">All Focus Areas</SelectItem>
                    <SelectItem value="sensory">Sensory</SelectItem>
                    <SelectItem value="motor">Motor Skills</SelectItem>
                    <SelectItem value="speech">Speech</SelectItem>
                    <SelectItem value="behavior">Behavior</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="feeding">Feeding</SelectItem>
                    <SelectItem value="attention">Attention</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex rounded-xl border border-slate-200 p-0.5 bg-slate-100">
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={cn("p-2 rounded-lg transition-all cursor-pointer", viewMode === "table" ? "bg-white text-sky-800 shadow-2xs" : "text-slate-500 hover:text-slate-800")}
                    title="Table View"
                  >
                    <ListFilter className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={cn("p-2 rounded-lg transition-all cursor-pointer", viewMode === "grid" ? "bg-white text-sky-800 shadow-2xs" : "text-slate-500 hover:text-slate-800")}
                    title="Grid View"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {(searchTerm || creditFilter !== "all" || serviceFilter !== "all") && (
              <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
                <span>Showing {filteredActive.length} of {active.length} enrolled clients</span>
                <button
                  type="button"
                  onClick={() => { setSearchTerm(""); setCreditFilter("all"); setServiceFilter("all"); }}
                  className="text-sky-700 font-bold hover:underline cursor-pointer ml-auto"
                >
                  Reset all filters
                </button>
              </div>
            )}
          </div>

          {/* Roster View (Table / Grid) */}
          {filteredActive.length === 0 ? (
            <Card className="rounded-2xl border border-slate-200/90 bg-white p-8">
              <EmptyState icon={Users} title="No clients found" subtitle="No active clients match the search and filter query." />
            </Card>
          ) : viewMode === "table" ? (
            <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                      <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6">Client Profile</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Parent / Contact</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Age & DOB</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Focus Tags</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs w-56">Credit Status</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Leave Usage</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredActive.map((c) => {
                      const record = getRecordForClient(c.id);
                      const isLowCredit = record && record.remainingCredit <= 2;
                      const cleanPhone = c.parentContact ? c.parentContact.replace(/[^0-9]/g, "") : "";
                      return (
                        <TableRow
                          key={c.id}
                          className="cursor-pointer hover:bg-sky-50/40 transition-colors border-b border-slate-100 group"
                          onClick={() => goTo(c.id)}
                          data-testid={`active-client-row-${c.id}`}
                        >
                          <TableCell className="py-3.5 pl-6">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs shadow-2xs shrink-0",
                                isLowCredit ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"
                              )}>
                                {c.clientName.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-sm text-slate-900 group-hover:text-sky-700 transition-colors">{c.clientName}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-slate-400 font-mono">#{c.clientAccessCode}</span>
                                  {isLowCredit && (
                                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                                      Low
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-slate-600 text-xs font-medium">
                            <p className="font-bold text-slate-800">{c.parentName}</p>
                            {c.parentContact ? (
                              <a
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold hover:underline mt-0.5"
                                title="Chat on WhatsApp"
                              >
                                <MessageCircle className="w-3 h-3" /> {c.parentContact}
                              </a>
                            ) : (
                              <span className="text-[11px] text-slate-400">—</span>
                            )}
                          </TableCell>

                          <TableCell className="text-xs font-semibold text-slate-800">
                            <p className="font-bold tabular-nums">{calcAge(c.dob) != null ? `${calcAge(c.dob)} yrs` : "—"}</p>
                            <p className="text-[11px] text-slate-400 font-normal">{fmtDate(c.dob)}</p>
                          </TableCell>

                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[160px]">
                              {(c.concernTags || []).slice(0, 2).map((t) => (
                                <ConcernTag key={t} tag={t} />
                              ))}
                              {(c.concernTags || []).length > 2 && (
                                <span className="text-[10px] text-slate-400 font-semibold self-center">
                                  +{(c.concernTags || []).length - 2}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            {record ? (
                              <CreditBar remaining={record.remainingCredit} total={record.totalCredit} compact />
                            ) : (
                              <span className="text-xs text-slate-400 italic">No package</span>
                            )}
                          </TableCell>

                          <TableCell>
                            {record ? <LeaveInfo leaveUsed={record.leaveUsed} leaveQuota={record.leaveQuota} /> : "—"}
                          </TableCell>

                          <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5 rounded-xl border-slate-200 text-xs font-bold text-sky-700 hover:bg-sky-50"
                                onClick={(e) => handleOpenQuickSchedule(e, c.id)}
                                title="Schedule Session Slot"
                              >
                                <CalendarPlus className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 rounded-xl text-slate-400 group-hover:text-sky-600"
                                onClick={() => goTo(c.id)}
                              >
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            /* Bento Grid Mode */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredActive.map((c) => {
                const record = getRecordForClient(c.id);
                const isLowCredit = record && record.remainingCredit <= 2;
                const cleanPhone = c.parentContact ? c.parentContact.replace(/[^0-9]/g, "") : "";
                return (
                  <Card
                    key={c.id}
                    className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs hover:shadow-md hover:border-sky-300 transition-all cursor-pointer clinical-card p-5 space-y-3.5 flex flex-col justify-between"
                    onClick={() => goTo(c.id)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shadow-2xs",
                            isLowCredit ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"
                          )}>
                            {c.clientName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-sm text-slate-900 leading-tight">{c.clientName}</h3>
                            <p className="text-[11px] font-mono text-slate-400">#{c.clientAccessCode}</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
                          {calcAge(c.dob) != null ? `${calcAge(c.dob)} yrs` : "—"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                        <span className="text-slate-500 font-medium">Parent: <strong className="text-slate-800">{c.parentName}</strong></span>
                        {c.parentContact && (
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-emerald-600 font-bold hover:underline flex items-center gap-1 text-[11px]"
                          >
                            <MessageCircle className="w-3 h-3" /> WhatsApp
                          </a>
                        )}
                      </div>

                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                          <span>Credit Remaining</span>
                          <span className={cn(isLowCredit ? "text-amber-600" : "text-slate-900")}>
                            {record ? `${record.remainingCredit} / ${record.totalCredit} sessions` : "No package"}
                          </span>
                        </div>
                        {record && <CreditBar remaining={record.remainingCredit} total={record.totalCredit} compact />}
                      </div>

                      {(c.concernTags || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {(c.concernTags || []).slice(0, 3).map((t) => (
                            <ConcernTag key={t} tag={t} />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 rounded-xl border-slate-200 text-xs font-bold text-sky-700 hover:bg-sky-50"
                        onClick={(e) => handleOpenQuickSchedule(e, c.id)}
                      >
                        <CalendarPlus className="w-3.5 h-3.5" /> Book Slot
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 gap-1 bg-slate-900 hover:bg-sky-600 text-white rounded-xl text-xs font-bold"
                        onClick={() => goTo(c.id)}
                      >
                        View Record <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Birthday Hub */}
        <TabsContent value="birthday" className="space-y-4">
          <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-sky-500/10 border border-amber-200/70">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                    <Cake className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Pediatric Birthday Radar</h3>
                    <p className="text-xs text-slate-500">Celebrate milestone birthdays and strengthen caregiver relationships with timely greetings.</p>
                  </div>
                </div>
                <Select value={birthdayMonth} onValueChange={setBirthdayMonth}>
                  <SelectTrigger className="w-48 h-10 text-xs rounded-xl border-amber-200 bg-white font-bold" data-testid="birthday-month-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {birthdayClients.length === 0 ? (
                <EmptyState icon={Cake} title="No birthdays in this month" subtitle="Select another month above to view upcoming celebrations." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {birthdayClients.map((c) => {
                    const nextAge = (calcAge(c.dob) || 0) + 1;
                    const cleanPhone = c.parentContact ? c.parentContact.replace(/[^0-9]/g, "") : "";
                    const greetingMsg = encodeURIComponent(
                      `Hello ${c.parentName}, the entire team at Therapedia wishes ${c.clientName} a very Happy ${nextAge}th Birthday! 🎉 May the coming year bring boundless growth and joy!`
                    );
                    return (
                      <div
                        key={c.id}
                        className="p-5 rounded-2xl border border-amber-200/80 bg-white hover:border-amber-400 transition-all shadow-2xs space-y-3.5"
                        data-testid={`birthday-client-row-${c.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-base shadow-2xs">
                              🎂
                            </div>
                            <div>
                              <h4 className="font-extrabold text-sm text-slate-900">{c.clientName}</h4>
                              <p className="text-xs font-semibold text-amber-800 mt-0.5">
                                Turning <strong className="font-black text-amber-900">{nextAge} Years Old</strong>
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 text-xs space-y-1">
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Birth Date:</span>
                            <strong className="text-slate-900">{fmtDate(c.dob)}</strong>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Parent:</span>
                            <span className="font-semibold text-slate-800">{c.parentName}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <a
                            href={`https://wa.me/${cleanPhone}?text=${greetingMsg}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors"
                          >
                            <Send className="w-3 h-3" /> Send WA Greeting
                          </a>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-xl border-slate-200 text-xs font-bold text-slate-700"
                            onClick={() => goTo(c.id)}
                          >
                            View Record
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Comprehensive Multi-Chart Analytics */}
        <TabsContent value="analytic" className="space-y-6">
          {/* Charts Row 1: Session Attendance Breakdown + Service Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Stacked Completion Telemetry */}
            <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
              <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-sky-600" />
                  Client Session Attendance Breakdown
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Completed vs Cancelled vs Rescheduled count per client
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-6">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={clientAnalytics.slice(0, 8)} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-25} textAnchor="end" />
                      <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "11px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                      <Bar dataKey="completed" name="Completed" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="rescheduled" name="Rescheduled" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="cancelled" name="Cancelled" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Chart 2: Service Focus Distribution Donut */}
            <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
              <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-600" />
                  Clinical Focus Area Distribution
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Enrolled caseload distribution by pediatric developmental focus
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-6">
                <div className="h-64 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={serviceDistributionData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {serviceDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "11px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2: Therapist Patient Allocation + Age Demographics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 3: Therapist Caseload Allocation */}
            <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
              <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-600" />
                  Therapist Caseload & Session Load
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Total clinical sessions booked per specialist
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-6">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={therapistLoadData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#334155", fontWeight: 700 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "11px" }}
                      />
                      <Bar dataKey="count" name="Sessions Booked" fill="#0284c7" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Chart 4: Age Group Clusters */}
            <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
              <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Baby className="w-4 h-4 text-purple-600" />
                  Pediatric Age Demographics
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Distribution of enrolled children by developmental age bracket
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-6">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageDemographicsData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="group" tick={{ fontSize: 10, fill: "#64748b" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "11px" }}
                      />
                      <Bar dataKey="count" name="Children Count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Low Credit & Renewal Alert Watchlist */}
          <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                  Package Renewal Forecast Pipeline ({renewalWatchlist.length} clients)
                </CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">Clients nearing credit exhaustion (≤ 2 credits remaining)</p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {renewalWatchlist.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-medium">
                  🎉 All enrolled clients have healthy credit balances (&gt; 2 credits remaining).
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                      <TableHead className="font-bold text-slate-700 text-xs py-3 pl-6">Client Name</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Parent Contact</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Package Plan</TableHead>
                      <TableHead className="font-bold text-amber-700 text-xs text-right">Remaining Credits</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs text-right pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renewalWatchlist.map(({ client, record }) => (
                      <TableRow key={client.id} className="border-b border-slate-100 hover:bg-amber-50/30 transition-colors">
                        <TableCell className="pl-6 font-bold text-xs text-slate-900">{client.clientName}</TableCell>
                        <TableCell className="text-xs text-slate-600">{client.parentName} ({client.parentContact || "—"})</TableCell>
                        <TableCell className="text-xs text-slate-700 font-medium">{record.packageName}</TableCell>
                        <TableCell className="text-right tabular-nums font-black text-xs text-amber-600">
                          {record.remainingCredit} / {record.totalCredit} left
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button
                            size="sm"
                            className="h-8 gap-1 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold"
                            onClick={() => goTo(client.id)}
                          >
                            Process Renewal <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Schedule Booking Modal */}
      {quickScheduleClientId && (
        <AddScheduleModal
          open={scheduleModalOpen}
          onOpenChange={(open) => {
            setScheduleModalOpen(open);
            if (!open) setQuickScheduleClientId(null);
          }}
          defaults={{
            clientId: quickScheduleClientId,
            lockClient: true,
            type: "therapy",
          }}
        />
      )}
    </div>
  );
}
