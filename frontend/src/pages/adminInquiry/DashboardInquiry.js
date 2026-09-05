import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, subDays, subMonths, isWithinInterval, parseISO, differenceInYears } from "date-fns";
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
  AreaChart,
  Area
} from "recharts";
import {
  ClipboardList,
  CalendarCheck,
  FileCheck2,
  FileText,
  UserCheck,
  UserX,
  ArrowRight,
  Building2,
  Filter,
  Search,
  MessageCircle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  Phone,
  Mail,
  Receipt,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  RotateCcw,
  BarChart3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { useClients } from "@/context/ClientsContext";
import { useAssessments } from "@/context/AssessmentsContext";
import { useAuth } from "@/context/AuthContext";
import {
  BRANCHES,
  CLINICAL_SERVICES,
  PIPELINE_STATUSES,
  STATUS_META,
  fmtDate,
  todayStr
} from "@/lib/appUtils";
import { cn } from "@/lib/utils";

const CHART_COLORS = ["#0284c7", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#64748b"];

export default function DashboardInquiry() {
  const navigate = useNavigate();
  const { clients } = useClients();
  const { categories, getCategory } = useAssessments();
  const { activeBranch, auth } = useAuth();

  const isMaster = auth?.role === "master";
  const defaultBranch = !isMaster && auth?.branchId
    ? auth.branchId
    : (activeBranch && activeBranch !== "all" ? activeBranch : (!isMaster ? "branch-sby-timur" : "all"));

  // Filters state
  const [branchFilter, setBranchFilter] = useState(defaultBranch);
  const [branchChartView, setBranchChartView] = useState("pipeline"); // "pipeline" | "age"
  const [periodPreset, setPeriodPreset] = useState("all"); // all | 7days | this_month | last_month | quarter | custom
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchRoster, setSearchRoster] = useState("");

  // Filter clients based on all selected criteria
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      // 1. Branch filter
      if (branchFilter !== "all" && c.branchId !== branchFilter) return false;

      // 2. Service filter
      if (serviceFilter !== "all" && c.serviceType !== serviceFilter) return false;

      // 3. Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "active_admitted" && !["admitted", "active"].includes(c.status)) return false;
        else if (statusFilter !== "active_admitted" && c.status !== statusFilter) return false;
      }

      // 4. Period filter
      if (periodPreset !== "all") {
        const clientDateStr = c.createdAt ? c.createdAt.slice(0, 10) : todayStr();
        const clientDate = parseISO(clientDateStr);
        const now = new Date();

        if (periodPreset === "7days") {
          const sevenDaysAgo = subDays(now, 7);
          if (clientDate < sevenDaysAgo) return false;
        } else if (periodPreset === "this_month") {
          const curMonth = format(now, "yyyy-MM");
          if (!clientDateStr.startsWith(curMonth)) return false;
        } else if (periodPreset === "last_month") {
          const lastM = format(subMonths(now, 1), "yyyy-MM");
          if (!clientDateStr.startsWith(lastM)) return false;
        } else if (periodPreset === "quarter") {
          const threeMonthsAgo = subMonths(now, 3);
          if (clientDate < threeMonthsAgo) return false;
        } else if (periodPreset === "custom") {
          if (customStart && clientDateStr < customStart) return false;
          if (customEnd && clientDateStr > customEnd) return false;
        }
      }

      return true;
    });
  }, [clients, branchFilter, serviceFilter, statusFilter, periodPreset, customStart, customEnd]);

  // Overall KPIs calculation
  const totalInquiries = filteredClients.length;
  const admittedCount = filteredClients.filter((c) => ["admitted", "active"].includes(c.status)).length;
  const conversionRate = totalInquiries > 0 ? Math.round((admittedCount / totalInquiries) * 100) : 0;

  const assessmentScheduledCount = filteredClients.filter((c) => c.status === "assessment_scheduled").length;
  const assessmentDoneCount = filteredClients.filter((c) => c.status === "assessment_done").length;
  const discontinuedCount = filteredClients.filter((c) => c.status === "discontinued").length;
  const doneConsultOrAssessment = filteredClients.filter((c) =>
    ["done_consult", "done_assessment"].includes(c.status)
  ).length;

  // Awaiting parent questionnaires
  const awaitingQuestionnaires = useMemo(() => {
    return filteredClients.filter((c) => {
      const hasCode =
        (c.assessmentCodes && c.assessmentCodes.length > 0) || Boolean(c.assessmentAccessCode);
      const hasAnswers = c.assessmentAnswers && c.assessmentAnswers.length > 0;
      return hasCode && !hasAnswers && !["admitted", "discharged", "discontinued"].includes(c.status);
    });
  }, [filteredClients]);

  // Pipeline Funnel data
  const funnelData = useMemo(() => {
    return [
      {
        stage: "1. Intake Masuk",
        count: filteredClients.length,
        fill: "#0284c7",
      },
      {
        stage: "2. Layanan Dipilih",
        count: filteredClients.filter((c) => c.serviceType && c.status !== "inquiry").length,
        fill: "#8b5cf6",
      },
      {
        stage: "3. Asesmen Terjadwal",
        count: filteredClients.filter((c) =>
          ["assessment_scheduled", "assessment_done", "admitted", "active", "done_assessment"].includes(c.status)
        ).length,
        fill: "#3b82f6",
      },
      {
        stage: "4. Asesmen Selesai",
        count: filteredClients.filter((c) =>
          ["assessment_done", "admitted", "active", "done_assessment"].includes(c.status)
        ).length,
        fill: "#10b981",
      },
      {
        stage: "5. Active Client",
        count: admittedCount,
        fill: "#059669",
      },
    ];
  }, [filteredClients, admittedCount]);

  // Service distribution chart data
  const serviceDistributionData = useMemo(() => {
    const counts = {};
    CLINICAL_SERVICES.forEach((s) => {
      counts[s.value] = 0;
    });

    filteredClients.forEach((c) => {
      const st = c.serviceType || "b_ota";
      counts[st] = (counts[st] || 0) + 1;
    });

    return CLINICAL_SERVICES.map((s, idx) => ({
      name: s.shortLabel,
      fullName: s.label,
      value: counts[s.value] || 0,
      color: CHART_COLORS[idx % CHART_COLORS.length],
    })).filter((item) => item.value > 0);
  }, [filteredClients]);

  const activeBranchMeta = useMemo(() => {
    return BRANCHES.find((b) => b.id === branchFilter);
  }, [branchFilter]);

  // Branch Pipeline Status distribution (Specific to filtered branch)
  const branchPipelineDistribution = useMemo(() => {
    const total = filteredClients.length || 1;
    const stages = [
      {
        id: "inquiry",
        label: "Inquiry Baru",
        count: filteredClients.filter((c) => c.status === "inquiry").length,
        fill: "#0284c7",
      },
      {
        id: "service_selected",
        label: "Pilih Layanan",
        count: filteredClients.filter((c) => c.status === "service_selected").length,
        fill: "#8b5cf6",
      },
      {
        id: "assessment_scheduled",
        label: "Jadwal Asesmen",
        count: filteredClients.filter((c) => c.status === "assessment_scheduled").length,
        fill: "#3b82f6",
      },
      {
        id: "assessment_done",
        label: "Selesai Asesmen",
        count: filteredClients.filter((c) =>
          ["assessment_done", "done_assessment", "done_consult"].includes(c.status)
        ).length,
        fill: "#0d9488",
      },
      {
        id: "admitted",
        label: "Admitted (Aktif)",
        count: filteredClients.filter((c) => ["admitted", "active"].includes(c.status)).length,
        fill: "#10b981",
      },
      {
        id: "discontinued",
        label: "Discontinued",
        count: filteredClients.filter((c) => c.status === "discontinued").length,
        fill: "#f43f5e",
      },
    ];

    return stages.map((s) => ({
      ...s,
      percentage: Math.round((s.count / total) * 100),
    }));
  }, [filteredClients]);

  // Branch Age Demographics (Specific to filtered branch)
  const branchAgeDemographics = useMemo(() => {
    const groups = [
      { id: "toddler", label: "Balita (1-3 th)", fill: "#0284c7" },
      { id: "preschool", label: "Prasekolah (4-6 th)", fill: "#8b5cf6" },
      { id: "school", label: "Usia Sekolah (7-12 th)", fill: "#10b981" },
      { id: "teen", label: "Remaja (>12 th)", fill: "#f59e0b" },
    ];

    const counts = { toddler: 0, preschool: 0, school: 0, teen: 0 };
    const now = new Date();

    filteredClients.forEach((c) => {
      if (!c.dob) return;
      try {
        const age = differenceInYears(now, parseISO(c.dob));
        if (age <= 3) counts.toddler++;
        else if (age <= 6) counts.preschool++;
        else if (age <= 12) counts.school++;
        else counts.teen++;
      } catch (e) {
        counts.preschool++;
      }
    });

    const total = filteredClients.length || 1;
    return groups.map((g) => ({
      ...g,
      count: counts[g.id],
      percentage: Math.round((counts[g.id] / total) * 100),
    }));
  }, [filteredClients]);

  // Monthly intake trends (last 6 months)
  const monthlyIntakeTrends = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(now, 5 - i);
      const key = format(m, "yyyy-MM");
      const inMonth = clients.filter((c) => {
        if (branchFilter !== "all" && c.branchId !== branchFilter) return false;
        const dStr = c.createdAt ? c.createdAt.slice(0, 7) : "";
        return dStr === key;
      });
      const admittedInMonth = inMonth.filter((c) => ["admitted", "active"].includes(c.status)).length;

      return {
        month: format(m, "MMM yyyy"),
        totalIntake: inMonth.length,
        admitted: admittedInMonth,
      };
    });
  }, [clients, branchFilter]);

  // Roster filtered by search input
  const searchedRoster = useMemo(() => {
    if (!searchRoster.trim()) return filteredClients;
    const q = searchRoster.toLowerCase();
    return filteredClients.filter(
      (c) =>
        c.clientName.toLowerCase().includes(q) ||
        (c.parentName && c.parentName.toLowerCase().includes(q)) ||
        (c.parentContact && c.parentContact.includes(q)) ||
        (c.clientAccessCode && c.clientAccessCode.toLowerCase().includes(q))
    );
  }, [filteredClients, searchRoster]);

  const resetFilters = () => {
    setBranchFilter(defaultBranch);
    setPeriodPreset("all");
    setCustomStart("");
    setCustomEnd("");
    setServiceFilter("all");
    setStatusFilter("all");
    setSearchRoster("");
  };

  return (
    <div className="space-y-6" data-testid="dashboard-inquiry-page">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-semibold mb-2">
            Intake Analytics & Pipeline Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Inquiry & Intake Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Analitik alur masuk client baru, konversi asesmen, distribusi layanan, dan monitoring kuesioner orang tua.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => navigate("/admin-inquiry/pipeline")}
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs h-10 gap-2 shadow-xs"
          >
            Buka Pipeline Kanban <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* COMPREHENSIVE FILTER BAR */}
      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-sky-600" />
              <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                Filter & Segmentasi Dashboard
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-7 text-xs text-slate-500 hover:text-slate-800 gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset Filter
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Branch Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Cabang Klinik</label>
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="h-10 text-xs rounded-xl border-slate-200 bg-slate-50 font-semibold">
                  <SelectValue placeholder="Pilih Cabang" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  {isMaster && <SelectItem value="all">🏢 Semua Cabang (Master View)</SelectItem>}
                  {BRANCHES.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      📍 {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Period Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Rentang Waktu</label>
              <Select value={periodPreset} onValueChange={setPeriodPreset}>
                <SelectTrigger className="h-10 text-xs rounded-xl border-slate-200 bg-slate-50 font-semibold">
                  <SelectValue placeholder="Pilih Periode" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="all">Semua Waktu</SelectItem>
                  <SelectItem value="7days">7 Hari Terakhir</SelectItem>
                  <SelectItem value="this_month">Bulan Ini</SelectItem>
                  <SelectItem value="last_month">Bulan Lalu</SelectItem>
                  <SelectItem value="quarter">Kuartal Ini (3 Bulan)</SelectItem>
                  <SelectItem value="custom">📅 Rentang Kustom (Custom)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 3. Service Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Layanan Klinis</label>
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger className="h-10 text-xs rounded-xl border-slate-200 bg-slate-50 font-semibold">
                  <SelectValue placeholder="Pilih Layanan" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="all">Semua Layanan</SelectItem>
                  {CLINICAL_SERVICES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 4. Status Pipeline Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Status Pipeline</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 text-xs rounded-xl border-slate-200 bg-slate-50 font-semibold">
                  <SelectValue placeholder="Pilih Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="inquiry_received">Inquiry Baru</SelectItem>
                  <SelectItem value="service_selected">Layanan Dipilih</SelectItem>
                  <SelectItem value="assessment_scheduled">Asesmen Terjadwal</SelectItem>
                  <SelectItem value="assessment_done">Asesmen Selesai</SelectItem>
                  <SelectItem value="active_admitted">Active Client (Admitted)</SelectItem>
                  <SelectItem value="done_consult">Done Consult</SelectItem>
                  <SelectItem value="done_assessment">Done Assessment</SelectItem>
                  <SelectItem value="discontinued">Discontinued (Batal)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Date Pickers if custom is selected */}
          {periodPreset === "custom" && (
            <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">Dari Tanggal:</span>
              <Input
                type="date"
                className="h-8 text-xs rounded-xl border-slate-200 bg-slate-50 w-40"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
              <span className="text-xs font-bold text-slate-700">Sampai:</span>
              <Input
                type="date"
                className="h-8 text-xs rounded-xl border-slate-200 bg-slate-50 w-40"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          )}
        </div>
      </Card>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Total Inquiry</span>
            <span className="p-1.5 rounded-lg bg-sky-50 text-sky-700"><ClipboardList className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-black text-slate-900 tabular-nums">{totalInquiries}</p>
          <p className="text-[11px] text-slate-500">Konversi: <strong className="text-emerald-700">{conversionRate}%</strong></p>
        </Card>

        <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Asesmen Terjadwal</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700"><CalendarCheck className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-black text-blue-800 tabular-nums">{assessmentScheduledCount}</p>
          <p className="text-[11px] text-slate-500">Menunggu sesi klinis</p>
        </Card>

        <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Menunggu Kuesioner</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700"><Clock className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-black text-amber-800 tabular-nums">{awaitingQuestionnaires.length}</p>
          <p className="text-[11px] text-amber-700 font-semibold">Perlu follow-up ortu</p>
        </Card>

        <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Asesmen Selesai</span>
            <span className="p-1.5 rounded-lg bg-teal-50 text-teal-700"><FileCheck2 className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-black text-teal-800 tabular-nums">{assessmentDoneCount}</p>
          <p className="text-[11px] text-slate-500">Siap keputusan akhir</p>
        </Card>

        <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Admitted (Active)</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700"><UserCheck className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-black text-emerald-800 tabular-nums">{admittedCount}</p>
          <p className="text-[11px] text-emerald-700 font-bold">Masuk terapi aktif</p>
        </Card>

        <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Discontinued</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-700"><UserX className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-black text-rose-800 tabular-nums">{discontinuedCount}</p>
          <p className="text-[11px] text-rose-600 font-medium">Batal / Tidak lanjut</p>
        </Card>
      </div>

      {/* CHARTS ROW 1: FUNNEL & SERVICE DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pipeline Progression Funnel */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs lg:col-span-7">
          <CardHeader className="pb-2 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Funnel Progresi Pipeline Inquiry
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Pergerakan client dari intake baru hingga resmi admitted
                </CardDescription>
              </div>
              <span className="text-xs font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-lg border border-sky-200">
                Konversi {conversionRate}%
              </span>
            </div>
          </CardHeader>
          <CardContent className="h-64 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={funnelData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis
                  dataKey="stage"
                  type="category"
                  tick={{ fontSize: 11, fontWeight: 600, fill: "#1e293b" }}
                  width={130}
                />
                <Tooltip
                  formatter={(val) => [`${val} Client`, "Jumlah"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} maxBarSize={28}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Clinical Service Distribution */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs lg:col-span-5 flex flex-col justify-between">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900">
              Distribusi Layanan Klinis
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Pilihan layanan asesmen dan konsultasi yang diminati
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 pt-2">
            {serviceDistributionData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Tidak ada data layanan pada filter ini
              </div>
            ) : (
              <div className="h-full flex items-center justify-between">
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={serviceDistributionData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={4}
                      >
                        {serviceDistributionData.map((entry, index) => (
                          <Cell key={`slice-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val, name, item) => [`${val} Client`, item.payload.fullName]}
                        contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 space-y-2 pr-2 text-xs">
                  {serviceDistributionData.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="font-semibold text-slate-700 truncate">{s.name}</span>
                      </div>
                      <span className="font-bold font-mono text-slate-900">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CHARTS ROW 2: BRANCH STATUS & 6-MONTH TRENDS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Branch-Specific Intake & Status Performance Chart */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs lg:col-span-6" data-testid="branch-status-chart-card">
          <CardHeader className="pb-2 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-sky-600" />
                  {branchChartView === "pipeline" ? "Status Intake Cabang" : "Demografi Usia Pasien"}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  {branchChartView === "pipeline"
                    ? `Persebaran status pipeline client di ${activeBranchMeta ? activeBranchMeta.name : "cabang terpilih"} (${filteredClients.length} total intake)`
                    : `Profil sebaran kelompok usia anak di ${activeBranchMeta ? activeBranchMeta.name : "cabang terpilih"}`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-[11px] self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setBranchChartView("pipeline")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                    branchChartView === "pipeline" ? "bg-white text-sky-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Status Pipeline
                </button>
                <button
                  type="button"
                  onClick={() => setBranchChartView("age")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                    branchChartView === "age" ? "bg-white text-sky-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Demografi Usia
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-64 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={branchChartView === "pipeline" ? branchPipelineDistribution : branchAgeDemographics}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="label" tick={{ fill: "#64748B", fontSize: 10, fontWeight: 600 }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  formatter={(val, name, item) => [`${val} Client (${item.payload.percentage}%)`, "Jumlah"]}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={36}>
                  {(branchChartView === "pipeline" ? branchPipelineDistribution : branchAgeDemographics).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 6-Month Intake History */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs lg:col-span-6">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900">
              Tren Intake 6 Bulan Terakhir
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Volume pendaftaran client baru dan hasil konversi per bulan
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyIntakeTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="intakeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fill: "#64748B", fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="totalIntake"
                  name="Intake Baru"
                  stroke="#0284c7"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#intakeGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* TABS FOR ACTIONABLE OPERATIONAL LISTS */}
      <Tabs defaultValue="awaiting" className="space-y-4">
        <TabsList className="bg-white border border-slate-200 p-1 rounded-2xl shadow-2xs">
          <TabsTrigger value="awaiting" className="rounded-xl text-xs font-bold gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            Menunggu Kuesioner Ortu ({awaitingQuestionnaires.length})
          </TabsTrigger>
          <TabsTrigger value="roster" className="rounded-xl text-xs font-bold gap-2">
            <ClipboardList className="w-4 h-4 text-sky-600" />
            Daftar Intake Terfilter ({searchedRoster.length})
          </TabsTrigger>
          <TabsTrigger value="discontinued" className="rounded-xl text-xs font-bold gap-2">
            <UserX className="w-4 h-4 text-rose-600" />
            Log Drop-off / Discontinued ({discontinuedCount})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: AWAITING QUESTIONNAIRE */}
        <TabsContent value="awaiting">
          <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Client yang Belum Mengisi Kuesioner Asesmen
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Kode kuesioner sudah diterbitkan, menunggu orang tua menyelesaikan form online
                </CardDescription>
              </div>
              <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-lg">
                {awaitingQuestionnaires.length} Menunggu Follow-up
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {awaitingQuestionnaires.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="Semua kuesioner telah terisi!"
                  subtitle="Tidak ada kuesioner yang tertunda pengisiannya oleh orang tua saat ini."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                      <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6">Client & Ortu</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Cabang</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Layanan Dipilih</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Kode Kuesioner</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Kontak WhatsApp</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs text-right pr-6">Tindakan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {awaitingQuestionnaires.map((c) => {
                      const br = BRANCHES.find((b) => b.id === c.branchId);
                      const svc = CLINICAL_SERVICES.find((s) => s.value === c.serviceType);
                      const codes = (c.assessmentCodes || []).map((i) => i.code).join(", ") || c.assessmentAccessCode || "—";

                      return (
                        <TableRow key={c.id} className="border-b border-slate-100 hover:bg-amber-50/20 text-xs">
                          <TableCell className="py-3 pl-6">
                            <p className="font-bold text-slate-900">{c.clientName}</p>
                            <p className="text-[11px] text-slate-500">Ortu: {c.parentName}</p>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              📍 {br ? br.name : "Surabaya"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              {svc ? svc.shortLabel : "BOT-A"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono font-bold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 tracking-wider">
                              {codes}
                            </span>
                          </TableCell>
                          <TableCell>
                            <p className="font-mono text-slate-700">{c.parentContact}</p>
                            <p className="text-[10px] text-slate-400">{c.parentEmail}</p>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-2">
                              {c.parentContact && (
                                <a
                                  href={`https://wa.me/${c.parentContact.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                                    `Halo ${c.parentName}, mohon mengisi kuesioner asesmen Therapedia untuk ananda ${c.clientName} dengan kode akses: ${codes}. Buka di: ${window.location.origin}/assessment`
                                  )}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold hover:bg-emerald-100 text-[11px]"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" /> WA Link
                                </a>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 rounded-lg text-xs font-bold border-slate-200 hover:bg-sky-50"
                                onClick={() => navigate(`/admin-inquiry/pipeline/${c.id}`)}
                              >
                                Detail Pipeline
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: FILTERED ROSTER */}
        <TabsContent value="roster">
          <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Daftar Client Sesuai Filter Dashboard ({searchedRoster.length})
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Data intake terkini yang sedang berjalan di pipeline
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9 h-8 text-xs rounded-xl border-slate-200 bg-white"
                  placeholder="Cari client, ortu, telepon..."
                  value={searchRoster}
                  onChange={(e) => setSearchRoster(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {searchedRoster.length === 0 ? (
                <EmptyState icon={ClipboardList} title="Tidak ada data" subtitle="Tidak ada client yang memenuhi kriteria pencarian ini." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                      <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6">Client & Kode</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Cabang</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Layanan</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Tahap Pipeline</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Tagihan</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs text-right pr-6">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchedRoster.map((c) => {
                      const br = BRANCHES.find((b) => b.id === c.branchId);
                      const svc = CLINICAL_SERVICES.find((s) => s.value === c.serviceType);

                      return (
                        <TableRow key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50 text-xs">
                          <TableCell className="py-3 pl-6">
                            <p className="font-bold text-slate-900">{c.clientName}</p>
                            <p className="font-mono text-[11px] text-slate-500">
                              Kode: {c.clientAccessCode} • {c.parentName}
                            </p>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-slate-700">📍 {br ? br.name : "Surabaya"}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-slate-800">{svc ? svc.shortLabel : "—"}</span>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={c.status} />
                          </TableCell>
                          <TableCell>
                            {c.invoiceStatus === "paid" ? (
                              <span className="font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded text-[11px]">
                                🟢 Lunas
                              </span>
                            ) : (
                              <span className="font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded text-[11px]">
                                🔴 Belum Ada / Belum Lunas
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button
                              size="sm"
                              className="h-8 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white"
                              onClick={() => navigate(`/admin-inquiry/pipeline/${c.id}`)}
                            >
                              Detail
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: DISCONTINUED LOG */}
        <TabsContent value="discontinued">
          <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-900">
                Catatan Inquiry yang Tidak Berlanjut (Discontinued)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Penyebab dan catatan evaluasi client yang batal atau berhenti di tahap intake
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filteredClients.filter((c) => c.status === "discontinued").length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  Tidak ada intake yang discontinue pada filter saat ini.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 border-b border-slate-200 text-xs">
                      <TableHead className="py-3 pl-6">Client</TableHead>
                      <TableHead>Cabang</TableHead>
                      <TableHead>Layanan Terakhir</TableHead>
                      <TableHead>Alasan / Catatan</TableHead>
                      <TableHead className="text-right pr-6">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients
                      .filter((c) => c.status === "discontinued")
                      .map((c) => {
                        const br = BRANCHES.find((b) => b.id === c.branchId);
                        return (
                          <TableRow key={c.id} className="border-b border-slate-100 text-xs">
                            <TableCell className="py-3 pl-6 font-bold text-slate-900">{c.clientName}</TableCell>
                            <TableCell>📍 {br ? br.name : "Surabaya"}</TableCell>
                            <TableCell>{c.serviceType ? c.serviceType.toUpperCase() : "—"}</TableCell>
                            <TableCell className="text-rose-700 font-medium">
                              {c.dischargeNote || c.notes || "Keluarga memutuskan tunda asesmen / lokasi terlalu jauh"}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs rounded-lg"
                                onClick={() => navigate(`/admin-inquiry/pipeline/${c.id}`)}
                              >
                                Tinjau
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
