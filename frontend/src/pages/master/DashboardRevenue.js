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
  Sparkles,
  PieChart as PieIcon,
  Layers
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
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { useCredits } from "@/context/CreditsContext";
import { useAuth } from "@/context/AuthContext";
import { BRANCHES, fmtCurrency, fmtDate } from "@/lib/appUtils";
import { cn } from "@/lib/utils";

const CHART_COLORS = ["#0284c7", "#0d9488", "#f59e0b", "#8b5cf6", "#ec4899", "#10b981"];

export default function DashboardRevenue() {
  const { activeBranch } = useAuth();
  const { getAllInvoices } = useCredits();

  const [selectedBranch, setSelectedBranch] = useState(activeBranch || "all");
  const [period, setPeriod] = useState("month"); // week | month | quarter | custom
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const allInvoices = getAllInvoices();

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
    const map = {
      "branch-sby-timur": { name: "Surabaya Timur", total: 0 },
      "branch-citraland": { name: "Citraland", total: 0 },
      "branch-sby-barat": { name: "Surabaya Barat", total: 0 },
    };

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
            Revenue Dashboard (All Branches)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time multi-branch financial settlement and package transaction tracking across Surabaya centers.
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
              <span className="text-xs text-slate-500 font-medium">From:</span>
              <Input
                type="date"
                className="h-9 w-36 text-xs rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">To:</span>
              <Input
                type="date"
                className="h-9 w-36 text-xs rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
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

      {/* KPI Cards */}
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
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-700 tabular-nums">
            {metrics.collectionRate}%
          </p>
          <p className="text-[11px] font-medium text-purple-600">
            Rasio pembayaran sukses
          </p>
        </div>
      </div>

      {/* Charts Row: Branch Comparison + Package Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branch Omzet Comparison */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
          <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-600" />
              Perbandingan Omzet Terverifikasi Antar Cabang
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Total pendapatan lunas dari Surabaya Timur, Citraland, dan Surabaya Barat
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

        {/* Package Revenue Share */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
          <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600" />
              Distribusi Pendapatan per Paket Layanan
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Kontribusi paket Reguler, VIP, B-OTA, F-OTA terhadap total pendapatan
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-6">
            {packageBreakdownData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400">
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
                    <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "6px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
        <CardContent className="p-0">
          {filteredInvoices.length === 0 ? (
            <EmptyState icon={Receipt} title="Tidak ada transaksi" subtitle="Belum ada transaksi pada filter periode ini." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                  <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6">No. Invoice</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Client & Cabang</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Paket Layanan</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Nominal Tagihan</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Tanggal Terbit</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-right pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((inv) => {
                  const br = BRANCHES.find((b) => b.id === inv.branchId);
                  return (
                    <TableRow key={inv.id} className="border-b border-slate-100 hover:bg-sky-50/30 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-slate-900 pl-6">
                        {inv.invoiceNumber || inv.id}
                      </TableCell>
                      <TableCell className="text-xs">
                        <p className="font-bold text-slate-900">{inv.clientName}</p>
                        <span className="text-[11px] text-slate-500 font-medium">📍 {br ? br.name : "Surabaya"}</span>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-700">{inv.packageName}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-900 tabular-nums">
                        {fmtCurrency(inv.amount)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 tabular-nums">
                        {fmtDate(inv.createdAt)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <StatusBadge status={inv.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
