import React, { useMemo, useState } from "react";
import { format, subMonths } from "date-fns";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line
} from "recharts";
import {
  Building2,
  TrendingUp,
  Users,
  UserCheck,
  UserX,
  Clock,
  Award,
  BarChart3,
  Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useClients } from "@/context/ClientsContext";
import { BRANCHES } from "@/lib/appUtils";

const COLORS = {
  timur: "#0284c7",
  citraland: "#10b981",
  barat: "#f59e0b",
  total: "#0284c7",
  admitted: "#10b981",
  inProgress: "#8b5cf6",
  discontinued: "#f43f5e"
};

export default function BranchPerformance() {
  const { clients } = useClients();

  // Cross-branch inquiry performance comparison data
  const branchComparisonData = useMemo(() => {
    return BRANCHES.map((b) => {
      const branchClients = clients.filter((c) => c.branchId === b.id);
      const branchAdmitted = branchClients.filter((c) => ["admitted", "active"].includes(c.status)).length;
      const branchPending = branchClients.filter((c) =>
        ["inquiry", "service_selected", "assessment_scheduled"].includes(c.status)
      ).length;
      const branchDoneAssessment = branchClients.filter((c) =>
        ["assessment_done", "done_assessment", "done_consult"].includes(c.status)
      ).length;
      const branchDrop = branchClients.filter((c) => c.status === "discontinued").length;
      const conversionRate = branchClients.length > 0 ? Math.round((branchAdmitted / branchClients.length) * 100) : 0;
      const dropRate = branchClients.length > 0 ? Math.round((branchDrop / branchClients.length) * 100) : 0;

      return {
        branchId: b.id,
        branchName: b.name,
        code: b.code,
        city: b.city,
        total: branchClients.length,
        admitted: branchAdmitted,
        inProgress: branchPending,
        doneAssessment: branchDoneAssessment,
        discontinued: branchDrop,
        conversionRate,
        dropRate
      };
    });
  }, [clients]);

  // Overall multi-branch metrics
  const totalAllInquiries = useMemo(() => clients.length, [clients]);
  const totalAllAdmitted = useMemo(
    () => clients.filter((c) => ["admitted", "active"].includes(c.status)).length,
    [clients]
  );
  const totalAllInProgress = useMemo(
    () => clients.filter((c) => ["inquiry", "service_selected", "assessment_scheduled"].includes(c.status)).length,
    [clients]
  );
  const totalAllDiscontinued = useMemo(
    () => clients.filter((c) => c.status === "discontinued").length,
    [clients]
  );
  const overallConversionRate = totalAllInquiries > 0 ? Math.round((totalAllAdmitted / totalAllInquiries) * 100) : 0;

  // Best performing branch
  const bestBranch = useMemo(() => {
    if (branchComparisonData.length === 0) return null;
    return [...branchComparisonData].sort((a, b) => b.conversionRate - a.conversionRate)[0];
  }, [branchComparisonData]);

  // 6-Month Intake Trend per Branch
  const monthlyTrends = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(now, 5 - i);
      const key = format(m, "yyyy-MM");
      const label = format(m, "MMM yyyy");

      const item = { month: label };
      BRANCHES.forEach((b) => {
        const count = clients.filter((c) => {
          if (c.branchId !== b.id) return false;
          const dStr = c.createdAt ? c.createdAt.slice(0, 7) : "";
          return dStr === key;
        }).length;
        item[b.name] = count;
      });

      return item;
    });
  }, [clients]);

  return (
    <div className="space-y-6" data-testid="master-branch-performance-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100/90 text-sky-800 text-xs font-semibold mb-2">
            Master Executive Telemetry • Multi-Branch Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Performa Inquiry & Intake All-Branch
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Analitik komparatif performa inquiry, konversi admitted, dan laju drop-off antar seluruh cabang Therapedia (East, West, Citraland). Akses eksklusif Role Master.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-white border-slate-200 text-slate-700 font-bold px-3 py-1.5 text-xs rounded-xl shadow-2xs gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-sky-600" />
            3 Cabang Aktif
          </Badge>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Total Intake All-Branch</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 tabular-nums">
            {totalAllInquiries} <span className="text-xs font-medium text-slate-500">Client</span>
          </p>
          <p className="text-[11px] font-medium text-slate-500">
            Akumulasi seluruh cabang
          </p>
        </Card>

        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Admitted (Active)</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 tabular-nums">
            {totalAllAdmitted} <span className="text-xs font-medium text-emerald-700">({overallConversionRate}%)</span>
          </p>
          <p className="text-[11px] font-medium text-emerald-700">
            Rasio konversi rata-rata
          </p>
        </Card>

        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Sedang Berproses</span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-700 tabular-nums">
            {totalAllInProgress} <span className="text-xs font-medium text-purple-600">Client</span>
          </p>
          <p className="text-[11px] font-medium text-purple-600">
            Tahap inquiry & jadwal asesmen
          </p>
        </Card>

        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Discontinued (Drop-off)</span>
            <UserX className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-600 tabular-nums">
            {totalAllDiscontinued} <span className="text-xs font-medium text-rose-500">Client</span>
          </p>
          <p className="text-[11px] font-medium text-rose-600">
            Batal atau tidak lanjut asesmen
          </p>
        </Card>

        <Card className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/70 to-white shadow-2xs p-4 space-y-1 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-xs font-bold text-amber-700">
            <span>Top Conversion Branch</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-lg font-black text-amber-900 truncate">
            {bestBranch ? bestBranch.branchName : "—"}
          </p>
          <p className="text-[11px] font-semibold text-amber-700">
            {bestBranch ? `${bestBranch.conversionRate}% konversi sukses` : "—"}
          </p>
        </Card>
      </div>

      {/* CHARTS ROW 1: PRIMARY CROSS-BRANCH BAR CHART & CONVERSION COMPARISON */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Branch Intake Performance BarChart (The moved chart) */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs lg:col-span-7">
          <CardHeader className="pb-2 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-sky-600" />
                  Performa Inquiry per Cabang
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Perbandingan total intake masuk, admitted (active), in-progress, dan discontinued antar cabang
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200 font-semibold">
                Multi-Branch View
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="h-72 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="branchName" tick={{ fill: "#64748B", fontSize: 11, fontWeight: 600 }} />
                <YAxis allowDecimals={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  formatter={(val, name) => [`${val} Client`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="total" name="Total Intake" fill={COLORS.total} radius={[6, 6, 0, 0]} />
                <Bar dataKey="admitted" name="Admitted (Active)" fill={COLORS.admitted} radius={[6, 6, 0, 0]} />
                <Bar dataKey="inProgress" name="In Progress" fill={COLORS.inProgress} radius={[6, 6, 0, 0]} />
                <Bar dataKey="discontinued" name="Discontinued" fill={COLORS.discontinued} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversion Rate Comparison Bar Chart */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs lg:col-span-5">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Tingkat Konversi Admitted Antar Cabang
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Persentase keberhasilan intake menjadi klien aktif berkala
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchComparisonData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" unit="%" domain={[0, 100]} tick={{ fill: "#64748B", fontSize: 11 }} />
                <YAxis dataKey="branchName" type="category" tick={{ fill: "#334155", fontSize: 11, fontWeight: 600 }} width={100} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  formatter={(val) => [`${val}%`, "Tingkat Konversi"]}
                />
                <Bar dataKey="conversionRate" name="Konversi Admitted (%)" fill="#10b981" radius={[0, 8, 8, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* CHARTS ROW 2: 6-MONTH TREND COMPARISON PER BRANCH */}
      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
        <CardHeader className="pb-2 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-600" />
            Tren Volume Intake 6 Bulan Terakhir per Cabang
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Pergerakan pendaftaran client baru tiap bulan di East, West, dan Citraland
          </CardDescription>
        </CardHeader>
        <CardContent className="h-64 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTrends} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fill: "#64748B", fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#64748B", fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="East" stroke={COLORS.timur} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="Citraland" stroke={COLORS.citraland} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="West" stroke={COLORS.barat} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* COMPREHENSIVE BRANCH COMPARATIVE MATRIX TABLE */}
      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-sm font-bold text-slate-900">
            Matriks Komparasi Performa Operasional Cabang
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Ringkasan data intake, tingkat konversi aktif, dan rasio drop-off per cabang
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[750px] w-full">
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200">
                <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6">Nama Cabang</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs text-center">Total Intake</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs text-center">Admitted (Aktif)</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs text-center">Dalam Proses</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs text-center">Discontinued</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs text-center">Rasio Konversi</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs text-center">Rasio Drop-off</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branchComparisonData.map((b) => (
                <TableRow key={b.branchId} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                  <TableCell className="py-3.5 pl-6">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 font-bold text-xs flex items-center justify-center border border-sky-100 shrink-0">
                        {b.code}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900">{b.branchName}</p>
                        <p className="text-[11px] text-slate-400 font-medium">{b.city}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-bold font-mono text-slate-800">
                    {b.total}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {b.admitted}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      {b.inProgress}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      {b.discontinued}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="font-black text-xs text-emerald-600">{b.conversionRate}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-semibold text-xs text-slate-500">{b.dropRate}%</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
