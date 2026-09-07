import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  FileCheck2,
  Calendar,
  Clock,
  User,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
  BookOpen,
  StickyNote,
  Home,
  Users,
  Printer,
  ChevronRight,
  ExternalLink,
  ClipboardList,
  Edit3,
  BarChart3,
  CalendarDays,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { SessionReportModal } from "@/components/therapist/SessionReportModal";
import { ClientReportHistoryDrawer } from "@/components/therapist/ClientReportHistoryDrawer";
import { useAuth } from "@/context/AuthContext";
import { useSchedules } from "@/context/SchedulesContext";
import { useClients } from "@/context/ClientsContext";
import { useTherapists } from "@/context/TherapistsContext";
import { fmtDate, calcAge, BRANCHES } from "@/lib/appUtils";
import DateFilterPicker from "@/components/common/DateFilterPicker";
import { cn } from "@/lib/utils";
import { parseISO, subDays } from "date-fns";

const DAY_NAMES_ID = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  0: "Minggu",
};

export default function TherapistSummary() {
  const { auth } = useAuth();
  const { schedules } = useSchedules();
  const { clients } = useClients();
  const { getTherapist } = useTherapists();
  const [searchParams] = useSearchParams();

  // Active View Tab: 'sessions' | 'clients'
  const [activeTab, setActiveTab] = useState("sessions");

  // Filters
  const [clientFilter, setClientFilter] = useState("all");
  const [reportFilter, setReportFilter] = useState(
    searchParams.get("filter") === "pending" ? "pending" : "all"
  ); // all | pending | filled
  const [dateFilter, setDateFilter] = useState("all"); // all | 7days | 30days | custom
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [selectedScheduleForReport, setSelectedScheduleForReport] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const [selectedClientForDrawer, setSelectedClientForDrawer] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const therapist = getTherapist(auth.therapistId);

  // 1. All completed sessions for this therapist
  const completedSchedules = useMemo(() => {
    return schedules
      .filter((s) => s.therapistId === auth.therapistId && s.status === "completed")
      .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
  }, [schedules, auth.therapistId]);

  // 2. Clients that this therapist has completed sessions with
  const myClients = useMemo(() => {
    const clientIds = new Set(completedSchedules.map((s) => s.clientId));
    return clients.filter((c) => clientIds.has(c.id));
  }, [completedSchedules, clients]);

  // 3. Stats & Metrics
  const stats = useMemo(() => {
    const total = completedSchedules.length;
    const fullyDocumented = completedSchedules.filter(
      (s) => s.activitySection?.trim() && s.noteSection?.trim() && s.homeworkSection?.trim()
    ).length;
    const pendingDocumented = total - fullyDocumented;
    const uniqueClientCount = myClients.length;
    const completionRate = total > 0 ? Math.round((fullyDocumented / total) * 100) : 100;

    return {
      total,
      fullyDocumented,
      pendingDocumented,
      uniqueClientCount,
      completionRate,
    };
  }, [completedSchedules, myClients]);

  // Client pending report counts mapping for dropdown badges
  const clientPendingCounts = useMemo(() => {
    const map = {};
    completedSchedules.forEach((s) => {
      const isComplete =
        Boolean(s.activitySection?.trim()) &&
        Boolean(s.noteSection?.trim()) &&
        Boolean(s.homeworkSection?.trim());
      if (!isComplete) {
        map[s.clientId] = (map[s.clientId] || 0) + 1;
      }
    });
    return map;
  }, [completedSchedules]);

  // 4. Filtered Completed Schedules for Tab 1
  const filteredSchedules = useMemo(() => {
    const now = new Date();
    const q = searchQuery.trim().toLowerCase();

    return completedSchedules.filter((s) => {
      // Filter by Client
      if (clientFilter !== "all" && s.clientId !== clientFilter) return false;

      // Filter by Report Status
      const isComplete =
        Boolean(s.activitySection?.trim()) &&
        Boolean(s.noteSection?.trim()) &&
        Boolean(s.homeworkSection?.trim());

      if (reportFilter === "pending" && isComplete) return false;
      if (reportFilter === "filled" && !isComplete) return false;

      // Filter by Date range
      if (dateFilter === "7days") {
        try {
          const sDate = parseISO(s.date);
          if (sDate < subDays(now, 7)) return false;
        } catch (e) {
          // ignore parsing error
        }
      } else if (dateFilter === "30days") {
        try {
          const sDate = parseISO(s.date);
          if (sDate < subDays(now, 30)) return false;
        } catch (e) {
          // ignore parsing error
        }
      } else if (dateFilter === "custom") {
        if (customStartDate && s.date < customStartDate) return false;
        if (customEndDate && s.date > customEndDate) return false;
      }

      // Search query (client name, parent name, notes, activity)
      if (q) {
        const client = clients.find((c) => c.id === s.clientId);
        const nameMatch = client?.clientName?.toLowerCase().includes(q);
        const parentMatch = client?.parentName?.toLowerCase().includes(q);
        const activityMatch = s.activitySection?.toLowerCase().includes(q);
        const noteMatch = (s.noteSection || s.progressNote)?.toLowerCase().includes(q);
        const homeworkMatch = s.homeworkSection?.toLowerCase().includes(q);

        if (!nameMatch && !parentMatch && !activityMatch && !noteMatch && !homeworkMatch) {
          return false;
        }
      }

      return true;
    });
  }, [completedSchedules, clientFilter, reportFilter, dateFilter, customStartDate, customEndDate, searchQuery, clients]);

  // 5. Filtered Clients for Tab 2
  const filteredClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return myClients.filter((c) => {
      if (clientFilter !== "all" && c.id !== clientFilter) return false;
      if (q) {
        const nameMatch = c.clientName?.toLowerCase().includes(q);
        const parentMatch = c.parentName?.toLowerCase().includes(q);
        const contactMatch = c.parentContact?.toLowerCase().includes(q);
        if (!nameMatch && !parentMatch && !contactMatch) return false;
      }
      return true;
    });
  }, [myClients, clientFilter, searchQuery]);

  const handleOpenReportModal = (schedule) => {
    setSelectedScheduleForReport(schedule);
    setReportModalOpen(true);
  };

  const handleOpenClientDrawer = (client) => {
    setSelectedClientForDrawer(client);
    setDrawerOpen(true);
  };

  const getDayName = (dateStr) => {
    try {
      const d = parseISO(dateStr);
      return DAY_NAMES_ID[d.getDay()] || "";
    } catch (e) {
      return "";
    }
  };

  return (
    <div className="space-y-6" data-testid="therapist-summary-page">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-[#007AFF] text-xs font-semibold mb-2">
            <FileCheck2 className="w-3.5 h-3.5 text-[#007AFF]" />
            Clinical Documentation Hub
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Summary & Laporan Sesi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Rangkuman sesi terapi selesai &bull; Pantau kelengkapan laporan klinis (Activity, Note, Homework) &bull;{" "}
            <strong className="text-slate-700">{therapist ? therapist.name : "Terapis"}</strong>
          </p>
        </div>

        {/* Quick link back to Weekly Schedule */}
        <Link to="/therapist">
          <Button
            variant="outline"
            className="rounded-xl border-slate-200 text-xs font-bold gap-2 h-10 shadow-2xs"
            data-testid="link-to-schedule"
          >
            <CalendarDays className="w-4 h-4 text-sky-600" />
            Ke Kalender Jadwal
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Sesi Selesai */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Sesi Selesai
              </span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                {stats.total}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">Rekam sesi terlaksana</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
            </div>
          </CardContent>
        </Card>

        {/* Laporan Perlu Dilengkapi (Urgent / Pending Action) */}
        <Card
          className={cn(
            "rounded-2xl border transition-all cursor-pointer overflow-hidden",
            stats.pendingDocumented > 0
              ? "border-amber-200 bg-amber-50/40 hover:bg-amber-50/70 hover:shadow-md"
              : "border-slate-200/90 bg-white shadow-2xs"
          )}
          onClick={() => {
            setReportFilter("pending");
            setActiveTab("sessions");
          }}
          title="Klik untuk memfilter sesi yang laporannya belum lengkap"
          data-testid="kpi-pending-reports"
        >
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  Perlu Dilengkapi
                </span>
                {stats.pendingDocumented > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                )}
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-900 tabular-nums">
                {stats.pendingDocumented}
              </p>
              <p className="text-[11px] text-amber-800/80 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {stats.pendingDocumented > 0 ? "Klik untuk lengkapi" : "Semua laporan terisi"}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100/80 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
              <Edit3 className="w-6 h-6 stroke-[2.2]" />
            </div>
          </CardContent>
        </Card>

        {/* Laporan Lengkap (3/3) */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Laporan Lengkap
              </span>
              <p className="text-2xl sm:text-3xl font-black text-emerald-700 tabular-nums">
                {stats.fullyDocumented}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                Tingkat kelengkapan: <strong className="text-slate-800">{stats.completionRate}%</strong>
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <FileCheck2 className="w-6 h-6 stroke-[2.2]" />
            </div>
          </CardContent>
        </Card>

        {/* Total Client Binaan */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Client Selesai Sesi
              </span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                {stats.uniqueClientCount}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">Anak unik ditangani</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 stroke-[2.2]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Navigation Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 border border-slate-200/80 self-start">
          <button
            type="button"
            onClick={() => setActiveTab("sessions")}
            className={cn(
              "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "sessions"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            )}
            data-testid="tab-sessions-list"
          >
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            Daftar Sesi Kelar ({completedSchedules.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("clients")}
            className={cn(
              "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "clients"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            )}
            data-testid="tab-clients-dossier"
          >
            <Users className="w-3.5 h-3.5 text-purple-600" />
            Rangkuman Per Client ({myClients.length})
          </button>
        </div>

        {/* Global Filter Information */}
        <p className="text-xs text-slate-500 font-medium">
          Menampilkan <strong className="text-slate-900">{activeTab === "sessions" ? filteredSchedules.length : filteredClients.length}</strong> data.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              className="pl-9 rounded-xl border-slate-200 bg-slate-50 text-xs h-9 focus:bg-white"
              placeholder={activeTab === "sessions" ? "Cari anak / ortu / catatan..." : "Cari nama client / ortu..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="summary-search-input"
            />
          </div>

          {/* 2. Client Filter Dropdown */}
          <div>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50 text-xs h-9 font-semibold text-slate-800">
                <SelectValue placeholder="Pilih Client" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                <SelectItem value="all">Semua Client ({myClients.length})</SelectItem>
                {myClients.map((c) => {
                  const pending = clientPendingCounts[c.id] || 0;
                  return (
                    <SelectItem key={c.id} value={c.id}>
                      {c.clientName} {pending > 0 ? `(${pending} belum lengkap)` : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Report Completeness Status Filter (for Tab 1) */}
          {activeTab === "sessions" ? (
            <div>
              <Select value={reportFilter} onValueChange={setReportFilter}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50 text-xs h-9 font-semibold text-slate-800">
                  <SelectValue placeholder="Status Laporan" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="all">Semua Status Laporan</SelectItem>
                  <SelectItem value="pending">
                    ⚠️ Belum Ada / Belum Lengkap ({stats.pendingDocumented})
                  </SelectItem>
                  <SelectItem value="filled">
                    ✓ Laporan Lengkap 3/3 ({stats.fullyDocumented})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex items-center text-xs text-slate-500 italic px-2">
              Filter client binaan terapis
            </div>
          )}

          {/* 4. Date Range Filter */}
          {activeTab === "sessions" && (
            <div>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50 text-xs h-9 font-semibold text-slate-800">
                  <SelectValue placeholder="Rentang Waktu" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="all">Semua Periode</SelectItem>
                  <SelectItem value="7days">7 Hari Terakhir</SelectItem>
                  <SelectItem value="30days">30 Hari Terakhir</SelectItem>
                  <SelectItem value="custom">📅 Rentang Kustom (DD/MM/YYYY)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Custom Date Pickers if custom range is selected */}
        {activeTab === "sessions" && dateFilter === "custom" && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 animate-in fade-in duration-200">
            <span className="text-xs font-bold text-slate-700">Dari Tanggal:</span>
            <DateFilterPicker
              placeholder="DD/MM/YYYY"
              className="w-38 bg-slate-50"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e?.target?.value ?? e)}
              data-testid="summary-filter-start"
            />
            <span className="text-xs font-bold text-slate-700">Sampai:</span>
            <DateFilterPicker
              placeholder="DD/MM/YYYY"
              className="w-38 bg-slate-50"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e?.target?.value ?? e)}
              data-testid="summary-filter-end"
            />
          </div>
        )}

        {/* Active Filter Chips */}
        {(clientFilter !== "all" || reportFilter !== "all" || dateFilter !== "all" || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
            <span className="text-[11px] font-bold text-slate-400">Filter Aktif:</span>
            {clientFilter !== "all" && (
              <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 font-medium text-[11px]">
                Client: {clients.find((c) => c.id === clientFilter)?.clientName}
              </span>
            )}
            {reportFilter !== "all" && (
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-medium text-[11px]">
                Status: {reportFilter === "pending" ? "Belum Lengkap" : "Lengkap"}
              </span>
            )}
            {dateFilter !== "all" && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                Periode: {dateFilter === "7days" ? "7 Hari Terakhir" : dateFilter === "30days" ? "30 Hari Terakhir" : "Rentang Kustom"}
              </span>
            )}
            {searchQuery && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                Search: "{searchQuery}"
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setClientFilter("all");
                setReportFilter("all");
                setDateFilter("all");
                setCustomStartDate("");
                setCustomEndDate("");
                setSearchQuery("");
              }}
              className="text-[11px] font-bold text-rose-600 hover:underline ml-1 cursor-pointer"
            >
              Reset Semua Filter
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DAFTAR SESI KELAR (SESSION-CENTRIC FEED)                            */}
      {/* ========================================================================= */}
      {activeTab === "sessions" && (
        <div className="space-y-3">
          {filteredSchedules.length === 0 ? (
            <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs p-8">
              <EmptyState
                icon={Calendar}
                title="Tidak Ada Sesi yang Sesuai Filter"
                subtitle="Tidak ditemukan jadwal sesi berstatus 'completed' dengan kriteria filter yang Anda pilih saat ini."
                action={
                  <Button
                    variant="outline"
                    className="rounded-xl text-xs"
                    onClick={() => {
                      setClientFilter("all");
                      setReportFilter("all");
                      setDateFilter("all");
                      setSearchQuery("");
                    }}
                  >
                    Reset Filter
                  </Button>
                }
              />
            </Card>
          ) : (
            filteredSchedules.map((s) => {
              const client = clients.find((c) => c.id === s.clientId);
              const dayName = getDayName(s.date);
              const isComplete =
                Boolean(s.activitySection?.trim()) &&
                Boolean(s.noteSection?.trim()) &&
                Boolean(s.homeworkSection?.trim());
              const isPartial =
                !isComplete &&
                Boolean(s.activitySection?.trim() || s.noteSection?.trim() || s.homeworkSection?.trim());

              const filledParts = [
                Boolean(s.activitySection?.trim()),
                Boolean(s.noteSection?.trim() || s.progressNote?.trim()),
                Boolean(s.homeworkSection?.trim()),
              ].filter(Boolean).length;

              return (
                <Card
                  key={s.id}
                  className={cn(
                    "rounded-2xl border transition-all duration-150 overflow-hidden shadow-2xs group hover:shadow-md",
                    !isComplete
                      ? "border-amber-200/90 bg-white"
                      : "border-slate-200/90 bg-white"
                  )}
                  data-testid={`summary-session-row-${s.id}`}
                >
                  <CardContent className="p-4 sm:p-5 space-y-3.5">
                    {/* Top Row: Date, Client info, Badges & Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                          {client ? client.clientName.slice(0, 2).toUpperCase() : "PA"}
                        </div>

                        {/* Title & Demographics */}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-extrabold text-sm sm:text-base text-slate-900 leading-snug">
                              {client ? client.clientName : "Client"}
                            </p>
                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              {client && calcAge(client.dob) != null ? `${calcAge(client.dob)} Th` : ""}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              {s.type === "assessment" ? "Asesmen Klinis" : "Sesi Terapi"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 font-medium">
                            Orang Tua: <strong className="text-slate-700">{client ? client.parentName : "—"}</strong>
                            {client?.parentContact ? ` (${client.parentContact})` : ""}
                          </p>
                        </div>
                      </div>

                      {/* Time & Report Badge */}
                      <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold bg-slate-100 px-2.5 py-1 rounded-xl">
                          <Calendar className="w-3.5 h-3.5 text-sky-600" />
                          <span>{dayName ? `${dayName}, ` : ""}{fmtDate(s.date)}</span>
                          <span className="text-slate-400">•</span>
                          <span className="font-mono text-slate-600">{s.startTime}–{s.endTime}</span>
                        </div>

                        {isComplete ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Lengkap (3/3)
                          </span>
                        ) : isPartial ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            Sebagian ({filledParts}/3)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            Belum Ada Laporan (0/3)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Content preview snippet */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                      {/* Activity */}
                      <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-0.5">
                        <span className="text-[10px] font-bold text-sky-800 uppercase flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-sky-600" /> 1. Aktivitas Sesi:
                        </span>
                        <p className="text-slate-700 line-clamp-2 leading-relaxed">
                          {s.activitySection || (
                            <span className="text-slate-400 italic">Belum diisi</span>
                          )}
                        </p>
                      </div>

                      {/* Notes */}
                      <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-0.5">
                        <span className="text-[10px] font-bold text-amber-800 uppercase flex items-center gap-1">
                          <StickyNote className="w-3 h-3 text-amber-600" /> 2. Catatan Evaluasi:
                        </span>
                        <p className="text-slate-700 line-clamp-2 leading-relaxed">
                          {s.noteSection || s.progressNote || (
                            <span className="text-slate-400 italic">Belum diisi</span>
                          )}
                        </p>
                      </div>

                      {/* Homework */}
                      <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-0.5">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                          <Home className="w-3 h-3 text-emerald-600" /> 3. Home Program:
                        </span>
                        <p className="text-slate-700 line-clamp-2 leading-relaxed">
                          {s.homeworkSection || (
                            <span className="text-slate-400 italic">Belum diisi</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs">
                        {client && (
                          <button
                            type="button"
                            onClick={() => handleOpenClientDrawer(client)}
                            className="font-bold text-sky-700 hover:text-sky-900 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" /> Buka Rekam Kumulatif Client
                          </button>
                        )}
                        <span className="text-slate-300">•</span>
                        {client && (
                          <Link
                            to={`/therapist/clients/${client.id}`}
                            className="text-slate-500 hover:text-slate-800 hover:underline flex items-center gap-1"
                          >
                            <User className="w-3.5 h-3.5" /> Profil Lengkap
                          </Link>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className={cn(
                            "h-8 text-xs font-bold rounded-xl gap-1.5 px-3.5 shadow-2xs",
                            isComplete
                              ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                              : "bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/20"
                          )}
                          onClick={() => handleOpenReportModal(s)}
                          data-testid={`btn-edit-report-${s.id}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          {isComplete ? "Lihat / Edit Laporan" : "Isi Laporan Sekarang"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RANGKUMAN PER CLIENT (CLIENT DOSSIER & PROGRESSION)                  */}
      {/* ========================================================================= */}
      {activeTab === "clients" && (
        <div className="space-y-4">
          {filteredClients.length === 0 ? (
            <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs p-8">
              <EmptyState
                icon={Users}
                title="Tidak Ada Client Ditemukan"
                subtitle="Tidak ada data client yang sesuai dengan kata kunci pencarian atau filter."
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredClients.map((client) => {
                const clientSessions = completedSchedules.filter((s) => s.clientId === client.id);
                const totalC = clientSessions.length;
                const completedReports = clientSessions.filter(
                  (s) => s.activitySection?.trim() && s.noteSection?.trim() && s.homeworkSection?.trim()
                ).length;
                const pendingC = totalC - completedReports;
                const percent = totalC > 0 ? Math.round((completedReports / totalC) * 100) : 0;
                const latestSession = clientSessions[0];

                return (
                  <Card
                    key={client.id}
                    className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                    data-testid={`summary-client-card-${client.id}`}
                  >
                    <CardHeader className="p-5 pb-3 border-b border-slate-100 bg-slate-50/50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-sky-100 text-sky-800 font-black text-sm flex items-center justify-center shrink-0 shadow-2xs">
                            {client.clientName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <CardTitle className="text-base font-bold text-slate-900 leading-tight">
                              {client.clientName}
                            </CardTitle>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Usia {calcAge(client.dob) != null ? `${calcAge(client.dob)} Th` : "—"} • DOB: {fmtDate(client.dob)}
                            </p>
                          </div>
                        </div>

                        {pendingC > 0 ? (
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                            {pendingC} Belum Lengkap
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                            ✓ 100% Lengkap
                          </span>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 space-y-4 text-xs flex-1">
                      {/* Documentation Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-slate-600">Kelengkapan Laporan Klinis:</span>
                          <span className={percent === 100 ? "text-emerald-700" : "text-amber-700"}>
                            {completedReports} dari {totalC} Sesi ({percent}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all duration-300 rounded-full",
                              percent === 100 ? "bg-emerald-500" : "bg-amber-500"
                            )}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Demographics details */}
                      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-400 font-bold uppercase text-[9px]">Orang Tua / Wali</span>
                          <p className="font-bold text-slate-800 mt-0.5 truncate">{client.parentName || "—"}</p>
                          <p className="text-slate-500 font-mono text-[10px]">{client.parentContact || "—"}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-400 font-bold uppercase text-[9px]">Sesi Terakhir</span>
                          <p className="font-bold text-slate-800 mt-0.5">
                            {latestSession ? fmtDate(latestSession.date) : "—"}
                          </p>
                          <p className="text-slate-500 text-[10px]">
                            {latestSession ? `${latestSession.startTime}–${latestSession.endTime}` : ""}
                          </p>
                        </div>
                      </div>

                      {/* Latest Note preview */}
                      {latestSession && (latestSession.noteSection || latestSession.progressNote) && (
                        <div className="p-2.5 rounded-xl bg-sky-50/50 border border-sky-100 space-y-1">
                          <p className="text-[10px] font-bold text-sky-800 uppercase flex items-center gap-1">
                            <StickyNote className="w-3 h-3 text-sky-600" /> Catatan Sesi Terakhir:
                          </p>
                          <p className="text-slate-700 line-clamp-2 leading-relaxed italic text-[11px]">
                            "{latestSession.noteSection || latestSession.progressNote}"
                          </p>
                        </div>
                      )}
                    </CardContent>

                    {/* Card Footer Actions */}
                    <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between gap-2">
                      <Link
                        to={`/therapist/clients/${client.id}`}
                        className="text-[11px] font-bold text-slate-600 hover:text-slate-900"
                      >
                        Buka Profil
                      </Link>

                      <div className="flex items-center gap-2">
                        <Link to={`/print/client/${client.id}`} target="_blank">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-[11px] font-bold rounded-xl border-slate-200"
                            title="Cetak Summary PDF"
                          >
                            <Printer className="w-3 h-3 text-slate-600" />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          className="h-8 text-[11px] font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white gap-1.5 shadow-2xs"
                          onClick={() => handleOpenClientDrawer(client)}
                          data-testid={`btn-open-client-drawer-${client.id}`}
                        >
                          <FileText className="w-3.5 h-3.5" /> Buka Riwayat Laporan
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS & DRAWERS                                                          */}
      {/* ========================================================================= */}

      {/* Modal to Fill / Edit Clinical Report (Activity, Note, Homework) */}
      <SessionReportModal
        schedule={selectedScheduleForReport}
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
      />

      {/* Drawer to View Complete Cumulative Client History */}
      <ClientReportHistoryDrawer
        client={selectedClientForDrawer}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        schedules={completedSchedules}
        onEditReport={(session) => {
          setSelectedScheduleForReport(session);
          setReportModalOpen(true);
        }}
      />
    </div>
  );
}
