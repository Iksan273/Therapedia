import React, { useMemo, useState } from "react";
import { format, subMonths, startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";
import {
  TrendingUp,
  Building2,
  DollarSign,
  Receipt,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Filter,
  Download,
  ArrowUpRight,
  PieChart as PieIcon,
  Layers,
  ChevronLeft,
  ChevronRight,
  Users,
  UserCheck,
  UserCog,
  CalendarDays,
  CalendarCheck,
  Activity,
  BarChart3
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocation } from "react-router-dom";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { useCredits } from "@/context/CreditsContext";
import { useAuth } from "@/context/AuthContext";
import { useClients } from "@/context/ClientsContext";
import { useTherapists } from "@/context/TherapistsContext";
import { useSchedules } from "@/context/SchedulesContext";
import { BRANCHES, fmtCurrency, fmtDate } from "@/lib/appUtils";
import DateFilterPicker from "@/components/common/DateFilterPicker";
import { cn } from "@/lib/utils";

const CHART_COLORS = ["#0284c7", "#0d9488", "#f59e0b", "#8b5cf6", "#ec4899", "#10b981"];

export default function DashboardRevenue() {
  const location = useLocation();
  const { auth, activeBranch } = useAuth();
  const isMaster = auth?.role === "master" && !location.pathname.startsWith("/manager");

  const { getAllInvoices } = useCredits();
  const { clients } = useClients();
  const { therapists } = useTherapists();
  const { schedules } = useSchedules();

  const [selectedBranch, setSelectedBranch] = useState(
    auth?.role === "manager" && auth?.branchId ? auth.branchId : (activeBranch || "all")
  );
  const [period, setPeriod] = useState("month"); // week | month | quarter | custom
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const allInvoices = getAllInvoices();

  // Filter clients by selected branch
  const branchClients = useMemo(() => {
    return clients.filter((c) => selectedBranch === "all" || c.branchId === selectedBranch);
  }, [clients, selectedBranch]);
  const totalClientsCount = branchClients.length;
  const activeClientsCount = branchClients.filter((c) => ["admitted", "active"].includes(c.status)).length;

  // Filter therapists by selected branch
  const branchTherapists = useMemo(() => {
    return therapists.filter((t) => selectedBranch === "all" || t.branchId === selectedBranch);
  }, [therapists, selectedBranch]);
  const totalTherapistsCount = branchTherapists.length;

  // Filter schedules by selected branch
  const branchSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (selectedBranch !== "all" && s.branchId !== selectedBranch) return false;
      return true;
    });
  }, [schedules, selectedBranch]);
  const totalScheduledSessions = branchSchedules.filter((s) => s.status === "scheduled").length;
  const completedSessions = branchSchedules.filter((s) => s.status === "completed").length;

  // Data per therapist: berapa schedule yang sudah di-handle
  const therapistWorkload = useMemo(() => {
    const maxSessions = 1;
    const list = branchTherapists.map((t) => {
      const tSchedules = schedules.filter((s) => s.therapistId === t.id);
      const scheduledCount = tSchedules.filter((s) => s.status === "scheduled").length;
      const completedCount = tSchedules.filter((s) => s.status === "completed").length;
      const cancelledCount = tSchedules.filter((s) => s.status === "cancelled").length;
      const total = tSchedules.length;

      return {
        id: t.id,
        name: t.name,
        specialty: t.specialty,
        branchId: t.branchId,
        branchName: BRANCHES.find((b) => b.id === t.branchId)?.name || "—",
        scheduledCount,
        completedCount,
        cancelledCount,
        total,
      };
    }).sort((a, b) => b.scheduledCount - a.scheduledCount);

    return list;
  }, [branchTherapists, schedules]);

  // Branch inquiry comparison data (cross-branch intake, admitted, discontinued)
  const branchInquiryData = useMemo(() => {
    return BRANCHES.map((b) => {
      const bClients = clients.filter((c) => c.branchId === b.id);
      const admitted = bClients.filter((c) => ["admitted", "active"].includes(c.status)).length;
      const drop = bClients.filter((c) => c.status === "discontinued").length;
      return {
        branchName: b.name,
        total: bClients.length,
        admitted,
        discontinued: drop,
      };
    });
  }, [clients]);

  // Filter invoices by branch and period
  const filteredInvoices = useMemo(() => {
    return allInvoices.filter((inv) => {
      // Branch filter
      if (selectedBranch !== "all" && inv.branchId !== selectedBranch) return false;

      // Date period filter
      if (!inv.createdAt) return true;
      const invDate = inv.createdAt;

      if (period === "custom") {
        if (customStart && invDate < customStart) return false;
        if (customEnd && invDate > customEnd) return false;
        return true;
      }

      const today = new Date();
      if (period === "week") {
        const start = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
        const end = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
        return invDate >= start && invDate <= end;
      }

      if (period === "month") {
        const curMonth = format(today, "yyyy-MM");
        return invDate.startsWith(curMonth);
      }

      if (period === "quarter") {
        const quarterMonthsAgo = format(subMonths(today, 3), "yyyy-MM-dd");
        return invDate >= quarterMonthsAgo;
      }

      return true;
    });
  }, [allInvoices, selectedBranch, period, customStart, customEnd]);

  // Pagination for Invoices Table
  const [invoicesPage, setInvoicesPage] = useState(1);
  const invoicesPageSize = 8;
  const totalInvoicesPages = Math.ceil(filteredInvoices.length / invoicesPageSize) || 1;
  const paginatedInvoices = useMemo(() => {
    const start = (invoicesPage - 1) * invoicesPageSize;
    return filteredInvoices.slice(start, start + invoicesPageSize);
  }, [filteredInvoices, invoicesPage, invoicesPageSize]);

  // Aggregate KPI metrics
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let verifiedRevenue = 0;
    let pendingRevenue = 0;
    let totalInvoices = filteredInvoices.length;
    let paidCount = 0;

    filteredInvoices.forEach((inv) => {
      const amt = Number(inv.amount) || 0;
      totalRevenue += amt;
      if (inv.status === "paid") {
        verifiedRevenue += amt;
        paidCount++;
      } else {
        pendingRevenue += amt;
      }
    });

    return {
      totalRevenue,
      verifiedRevenue,
      pendingRevenue,
      totalInvoices,
      paidCount,
      collectionRate: totalRevenue > 0 ? Math.round((verifiedRevenue / totalRevenue) * 100) : 0,
    };
  }, [filteredInvoices]);

  // Branch omzet comparison data
  const branchRevenueData = useMemo(() => {
    const map = {};
    BRANCHES.forEach((b) => {
      map[b.id] = { name: b.name, total: 0 };
    });

    allInvoices.forEach((inv) => {
      if (inv.status === "paid" && map[inv.branchId]) {
        map[inv.branchId].total += Number(inv.amount) || 0;
      }
    });

    return Object.values(map);
  }, [allInvoices]);

  // Package revenue breakdown
  const packageBreakdownData = useMemo(() => {
    const counts = {};
    filteredInvoices.forEach((inv) => {
      if (inv.status === "paid") {
        const name = inv.packageName || "Other Services";
        counts[name] = (counts[name] || 0) + (Number(inv.amount) || 0);
      }
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredInvoices]);

  return (
    <div className="space-y-6" data-testid="dashboard-revenue-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100/80 text-sky-800 text-xs font-semibold mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
            Executive Revenue & Financial Telemetry
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {isMaster ? "Revenue Dashboard (All Branches)" : "Revenue Overview"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isMaster
              ? "Real-time multi-branch financial settlement and package transaction tracking across Surabaya centers."
              : "Ringkasan operasional omzet paket dan transaksi keuangan cabang."}
          </p>
        </div>

        {/* Global Branch Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-xl px-3 py-1.5 shadow-2xs">
            <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="h-8 border-none bg-transparent shadow-none text-xs font-bold text-slate-800 focus:ring-0 p-0 w-44">
                <SelectValue placeholder="Pilih Cabang" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                <SelectItem value="all">🏢 Semua Cabang (All)</SelectItem>
                {BRANCHES.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    📍 {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Period & Flexible Date Range Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Periode:</span>
          <div className="flex rounded-xl border border-slate-200 p-0.5 bg-slate-100">
            {[
              { id: "week", label: "This Week" },
              { id: "month", label: "This Month" },
              { id: "quarter", label: "Last 3 Months" },
              { id: "custom", label: "Custom Dates" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
                  period === p.id ? "bg-white text-sky-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {period === "custom" && (
          <div className="flex flex-wrap items-center gap-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">Dari:</span>
              <DateFilterPicker
                placeholder="DD/MM/YYYY"
                className="w-38"
                value={customStart}
                onChange={(e) => setCustomStart(e?.target?.value ?? e)}
                data-testid="revenue-filter-start"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">Sampai:</span>
              <DateFilterPicker
                placeholder="DD/MM/YYYY"
                className="w-38"
                value={customEnd}
                onChange={(e) => setCustomEnd(e?.target?.value ?? e)}
                data-testid="revenue-filter-end"
              />
            </div>
            {(customStart || customEnd) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs text-slate-500 hover:text-rose-600 rounded-xl"
                onClick={() => {
                  setCustomStart("");
                  setCustomEnd("");
                }}
              >
                Reset
              </Button>
            )}
          </div>
        )}
      </div>

      {/* EXECUTIVE OPERATIONS TELEMETRY (Client, Therapist, Invoices, Sessions) */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Ringkasan Operasional & Kapasitas Cabang
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Total Client */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Total Client</span>
              <Users className="w-4 h-4 text-sky-600" />
            </div>
            <p className="text-2xl font-black text-slate-900 tabular-nums">
              {totalClientsCount} <span className="text-xs font-semibold text-slate-500">Client</span>
            </p>
            <p className="text-[11px] font-medium text-emerald-700">
              {activeClientsCount} klien aktif berkala (admitted)
            </p>
          </div>

          {/* 2. Total Therapist */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Total Therapist</span>
              <UserCog className="w-4 h-4 text-teal-600" />
            </div>
            <p className="text-2xl font-black text-teal-700 tabular-nums">
              {totalTherapistsCount} <span className="text-xs font-semibold text-teal-600">Praktisi</span>
            </p>
            <p className="text-[11px] font-medium text-slate-500">
              {selectedBranch === "all" ? "Seluruh cabang operasional" : "Terapis cabang terpilih"}
            </p>
          </div>

          {/* 3. Total Transaction Tagihan */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Total Transaksi Tagihan</span>
              <Receipt className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-black text-purple-700 tabular-nums">
              {totalInvoicesPages > 0 ? filteredInvoices.length : 0} <span className="text-xs font-semibold text-purple-600">Invoice</span>
            </p>
            <p className="text-[11px] font-medium text-slate-500">
              {metrics.paidCount} terverifikasi lunas ({metrics.totalInvoices - metrics.paidCount} pending)
            </p>
          </div>

          {/* 4. Total Session yg udah di-schedule */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Total Sesi Terjadwal</span>
              <CalendarDays className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-black text-indigo-700 tabular-nums">
              {totalScheduledSessions} <span className="text-xs font-semibold text-indigo-600">Sesi</span>
            </p>
            <p className="text-[11px] font-medium text-slate-500">
              {completedSessions} sesi telah selesai terlaksana
            </p>
          </div>
        </div>
      </div>

      {/* FINANCIAL SETTLEMENTS METRICS */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Metrik Settlement & Finansial
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Verified Revenue</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-600 tabular-nums">
              {fmtCurrency(metrics.verifiedRevenue)}
            </p>
            <p className="text-[11px] font-medium text-slate-500">
              {metrics.paidCount} dari {metrics.totalInvoices} tagihan lunas
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Pending Settlements</span>
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-600 tabular-nums">
              {fmtCurrency(metrics.pendingRevenue)}
            </p>
            <p className="text-[11px] font-medium text-amber-700">
              Menunggu verifikasi transfer ortu
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Gross Invoiced</span>
              <Receipt className="w-4 h-4 text-sky-600" />
            </div>
            <p className="text-2xl font-black text-slate-900 tabular-nums">
              {fmtCurrency(metrics.totalRevenue)}
            </p>
            <p className="text-[11px] font-medium text-slate-500">
              Total nilai tagihan terbit
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Collection Ratio</span>
              <Activity className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-black text-purple-700 tabular-nums">
              {metrics.collectionRate}%
            </p>
            <p className="text-[11px] font-medium text-purple-600">
              Rasio pembayaran sukses
            </p>
          </div>
        </div>
      </div>

      {/* CHARTS ROW 1: Multi-Branch Omzet & Cross-Branch Inquiry Performance (Khusus Role Master) */}
      {isMaster && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Branch Omzet Comparison */}
          <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-600" />
                Perbandingan Omzet Terverifikasi Antar Cabang
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Total pendapatan lunas dari East, West, dan Citraland
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-6">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={branchRevenueData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `Rp${v / 1000000}M`} />
                    <Tooltip
                      formatter={(val) => [fmtCurrency(val), "Verified Omzet"]}
                      contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "11px" }}
                    />
                    <Bar dataKey="total" fill="#0284c7" radius={[8, 8, 0, 0]} barSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Performa Inquiry per Cabang (Cross-branch comparison chart moved to Master) */}
          <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-teal-600" />
                Performa Inquiry per Cabang
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Perbandingan total intake, admitted (aktif), dan drop-off antar cabang
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-6">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={branchInquiryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="branchName" tick={{ fill: "#64748B", fontSize: 11, fontWeight: 600 }} />
                    <YAxis allowDecimals={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="total" name="Total Intake" fill="#0284c7" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="admitted" name="Admitted (Active)" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="discontinued" name="Discontinued" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CHARTS ROW 2: Package Revenue Share */}
      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-600" />
            Distribusi Pendapatan per Paket Layanan
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Kontribusi paket Regular Therapist, Senior Therapist, BOT-A, FOT-A terhadap total pendapatan
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-6">
          {packageBreakdownData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">
              Belum ada transaksi paket terverifikasi pada periode ini.
            </div>
          ) : (
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={packageBreakdownData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {packageBreakdownData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [fmtCurrency(val), "Revenue"]}
                    contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "11px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* THERAPIST WORKLOAD TELEMETRY (Data per Therapist Handle Berapa Schedule) */}
      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden" data-testid="master-therapist-workload-card">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-600" />
              Telemetri Jadwal & Beban Kerja per Therapist ({therapistWorkload.length} Praktisi)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Rincian jumlah sesi jadwal yang ditangani oleh masing-masing praktisi klinis sesuai filter cabang
            </CardDescription>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg w-fit">
            Total {totalScheduledSessions} Sesi Terjadwal
          </span>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {therapistWorkload.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Tidak ada terapis pada filter cabang ini.
            </div>
          ) : (
            <Table className="min-w-[700px] w-full">
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                  <TableHead className="font-bold text-slate-700 text-xs py-3 pl-6">Nama Therapist</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Cabang</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-center">Sesi Terjadwal</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-center">Sesi Selesai</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-center">Total Penanganan</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[160px]">Beban Sesi Aktif</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {therapistWorkload.map((t) => {
                  const maxWorkload = Math.max(...therapistWorkload.map((tw) => tw.scheduledCount), 1);
                  const pct = Math.round((t.scheduledCount / maxWorkload) * 100);
                  return (
                    <TableRow key={t.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="py-3 pl-6">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-800 font-bold text-xs flex items-center justify-center shrink-0">
                            {t.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-slate-900">{t.name}</p>
                            <p className="text-[10px] text-slate-500 font-medium">{t.specialty}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 font-medium">
                        {t.branchName}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {t.scheduledCount} Sesi
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {t.completedCount} Selesai
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-xs text-slate-800">
                        {t.total} Sesi
                      </TableCell>
                      <TableCell className="pr-6">
                        <div className="space-y-1">
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {t.scheduledCount} sesi terjadwal aktif
                          </span>
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

      {/* Transaction & Settlement Ledger */}
      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Transaksi & Tagihan Pembayaran ({filteredInvoices.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Daftar tagihan, paket yang dipilih, dan status verifikasi per cabang
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {filteredInvoices.length === 0 ? (
            <EmptyState icon={Receipt} title="Tidak ada transaksi" subtitle="Belum ada transaksi pada filter periode ini." />
          ) : (
            <Table className="min-w-[860px] w-full">
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                  <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6 min-w-[150px] whitespace-nowrap">No. Invoice</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[200px] whitespace-nowrap">Client & Cabang</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[180px] whitespace-nowrap">Paket Layanan</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[150px] whitespace-nowrap">Nominal Tagihan</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[130px] whitespace-nowrap">Tanggal Terbit</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-right pr-6 min-w-[130px] whitespace-nowrap">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInvoices.map((inv) => {
                  const br = BRANCHES.find((b) => b.id === inv.branchId);
                  return (
                    <TableRow key={inv.id} className="border-b border-slate-100 hover:bg-sky-50/30 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-slate-900 pl-6 min-w-[150px] whitespace-nowrap">
                        {inv.invoiceNumber || inv.id}
                      </TableCell>
                      <TableCell className="text-xs min-w-[200px] whitespace-nowrap">
                        <p className="font-bold text-slate-900">{inv.clientName}</p>
                        <span className="text-[11px] text-slate-500 font-medium">📍 {br ? br.name : "Surabaya"}</span>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-700 min-w-[180px] whitespace-nowrap">{inv.packageName}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-900 tabular-nums min-w-[150px] whitespace-nowrap">
                        {fmtCurrency(inv.amount)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 tabular-nums min-w-[130px] whitespace-nowrap">
                        {fmtDate(inv.createdAt)}
                      </TableCell>
                      <TableCell className="text-right pr-6 min-w-[130px] whitespace-nowrap">
                        <StatusBadge status={inv.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination for Invoices Table */}
        {filteredInvoices.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50/50">
            <span className="font-medium">
              Menampilkan {(invoicesPage - 1) * invoicesPageSize + 1} –{" "}
              {Math.min(invoicesPage * invoicesPageSize, filteredInvoices.length)} dari {filteredInvoices.length} transaksi
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5 rounded-xl text-xs font-semibold border-slate-200 hover:bg-slate-100 cursor-pointer"
                disabled={invoicesPage <= 1}
                onClick={() => setInvoicesPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
              </Button>
              <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-bold text-slate-800 text-xs shadow-2xs">
                {invoicesPage} / {totalInvoicesPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5 rounded-xl text-xs font-semibold border-slate-200 hover:bg-slate-100 cursor-pointer"
                disabled={invoicesPage >= totalInvoicesPages}
                onClick={() => setInvoicesPage((p) => Math.min(totalInvoicesPages, p + 1))}
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
