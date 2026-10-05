import React, { useMemo, useState } from "react";
import { useActingTherapist } from "@/features/therapist/hooks/useActingTherapist";
import { ViewAsTherapistBar } from "@/features/therapist/components/ViewAsTherapistBar";
import { ClientCombobox } from "@/shared/components/ClientCombobox";
import { Link, useSearchParams } from "react-router-dom";
import { FileCheck2, Clock, Users, CalendarDays } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { SessionReportModal } from "@/features/therapist/components/SessionReportModal";
import { ClientReportHistoryDrawer } from "@/features/therapist/components/ClientReportHistoryDrawer";
import { useSchedules } from "@/stores/schedulesStore";
import { useClients } from "@/stores/clientsStore";
import { matchesClientSearch } from "@/domain/client";
import { TablePagination, usePagination } from "@/shared/components/TablePagination";
import { useTherapists } from "@/stores/therapistsStore";
import { FilterBar, FilterField, SearchInput } from "@/shared/components/FilterBar";
import { PeriodFilter } from "@/shared/components/PeriodFilter";
import { makePeriodMatcher, periodLabel } from "@/shared/lib/periods";
import { cn } from "@/shared/lib/utils";
import { parseISO } from "date-fns";
import { SummaryStats } from "@/features/therapist/components/summary/SummaryStats";
import { SessionFeed } from "@/features/therapist/components/summary/SessionFeed";
import { ClientRollup } from "@/features/therapist/components/summary/ClientRollup";

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
  const [dateFilter, setDateFilter] = useState("all"); // lihat PERIOD_OPTIONS
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [selectedScheduleForReport, setSelectedScheduleForReport] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const [selectedClientForDrawer, setSelectedClientForDrawer] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const acting = useActingTherapist();
  const therapist = getTherapist(acting.therapistId);

  // 1. All completed sessions for this therapist
  const completedSchedules = useMemo(() => {
    return schedules
      .filter((s) => s.therapistId === acting.therapistId && s.status === "completed")
      .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
  }, [schedules, acting.therapistId]);

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

  const summaryChips = [];
  if (searchQuery.trim()) summaryChips.push({ key: "q", label: `Cari: "${searchQuery.trim()}"`, onRemove: () => setSearchQuery("") });
  if (clientFilter !== "all") {
    summaryChips.push({
      key: "client",
      label: `Client: ${clients.find((c) => c.id === clientFilter)?.clientName || clientFilter}`,
      onRemove: () => setClientFilter("all"),
    });
  }
  if (activeTab === "sessions" && reportFilter !== "all") {
    summaryChips.push({
      key: "report",
      label: `Laporan: ${reportFilter === "pending" ? "Belum lengkap" : "Lengkap"}`,
      onRemove: () => setReportFilter("all"),
    });
  }
  if (activeTab === "sessions" && dateFilter !== "all") {
    const range = dateFilter === "custom" ? ` (${customStartDate || "…"} – ${customEndDate || "…"})` : "";
    summaryChips.push({
      key: "period",
      label: `Periode: ${periodLabel(dateFilter)}${range}`,
      onRemove: () => {
        setDateFilter("all");
        setCustomStartDate("");
        setCustomEndDate("");
      },
    });
  }
  const resetSummaryFilters = () => {
    setClientFilter("all");
    setReportFilter("all");
    setDateFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setSearchQuery("");
  };

  // 4. Filtered Completed Schedules for Tab 1
  const filteredSchedules = useMemo(() => {
    const inPeriod = makePeriodMatcher(dateFilter, customStartDate, customEndDate);
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
      if (s.date && !inPeriod(s.date)) return false;

      // Search query (client name, parent name, notes, activity)
      if (q) {
        const client = clients.find((c) => c.id === s.clientId);
        const nameMatch = client ? matchesClientSearch(client, q) : false; // nama anak / ortu / kode client
        const parentMatch = false;
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

  // Pagination 10 data per halaman (feed tidak scroll tanpa batas); kembali ke halaman 1 saat filter berubah
  const filterKey = [searchQuery, clientFilter, reportFilter, dateFilter, customStartDate, customEndDate].join("|");
  const sessionsPg = usePagination(filteredSchedules, 10, filterKey);

  // 5. Filtered Clients for Tab 2
  const filteredClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return myClients.filter((c) => {
      if (clientFilter !== "all" && c.id !== clientFilter) return false;
      if (q) {
        const nameMatch = matchesClientSearch(c, q); // nama anak / ortu / kode client
        const parentMatch = false;
        const contactMatch = c.parentContact?.toLowerCase().includes(q);
        if (!nameMatch && !parentMatch && !contactMatch) return false;
      }
      return true;
    });
  }, [myClients, clientFilter, searchQuery]);
  const clientsPg = usePagination(filteredClients, 10, filterKey);

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
      <ViewAsTherapistBar acting={acting} />
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
            className="border-slate-200 font-bold gap-2 shadow-2xs"
            data-testid="link-to-schedule"
          >
            <CalendarDays className="w-4 h-4 text-sky-600" />
            Ke Kalender Jadwal
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <SummaryStats setActiveTab={setActiveTab} setReportFilter={setReportFilter} stats={stats} />

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
      <FilterBar
        title="Cari & Filter"
        chips={summaryChips}
        onReset={resetSummaryFilters}
        resultText={`${activeTab === "sessions" ? filteredSchedules.length : filteredClients.length} data`}
        gridClassName="lg:grid-cols-4"
      >
        <FilterField label="Pencarian">
          <SearchInput
            className="min-w-0"
            placeholder={activeTab === "sessions" ? "Anak / ortu / kode client / catatan..." : "Nama client / ortu / kode client..."}
            value={searchQuery}
            onChange={setSearchQuery}
            data-testid="summary-search-input"
          />
        </FilterField>

        <FilterField label="Client">
          <ClientCombobox
            clients={myClients}
            value={clientFilter}
            onChange={setClientFilter}
            allOption={{ value: "all", label: `Semua Client (${myClients.length})` }}
            placeholder="Pilih Client"
            testId="summary-client-filter"
            renderMeta={(c) => ((clientPendingCounts[c.id] || 0) > 0 ? `${clientPendingCounts[c.id]} belum lengkap` : <span className="font-mono">{c.clientCode}</span>)}
          />
        </FilterField>

        {activeTab === "sessions" && (
          <>
            <FilterField label="Status Laporan">
              <Select value={reportFilter} onValueChange={setReportFilter}>
                <SelectTrigger className="border-slate-200 bg-slate-50" aria-label="Status laporan">
                  <SelectValue placeholder="Status Laporan" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="all">Semua Status Laporan</SelectItem>
                  <SelectItem value="pending">Belum Ada / Belum Lengkap ({stats.pendingDocumented})</SelectItem>
                  <SelectItem value="filled">Laporan Lengkap 3/3 ({stats.fullyDocumented})</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>

            <PeriodFilter
              preset={dateFilter}
              start={customStartDate}
              end={customEndDate}
              testidPrefix="summary"
              onChange={({ preset, start, end }) => {
                if (preset !== undefined) setDateFilter(preset);
                if (start !== undefined) setCustomStartDate(start);
                if (end !== undefined) setCustomEndDate(end);
              }}
            />
          </>
        )}
      </FilterBar>

      {/* ========================================================================= */}
      {/* TAB 1: DAFTAR SESI KELAR (SESSION-CENTRIC FEED)                            */}
      {/* ========================================================================= */}
      {activeTab === "sessions" && (
        <>
        <SessionFeed clients={clients} filteredSchedules={sessionsPg.pageItems} getDayName={getDayName} handleOpenClientDrawer={handleOpenClientDrawer} handleOpenReportModal={handleOpenReportModal} setClientFilter={setClientFilter} setDateFilter={setDateFilter} setReportFilter={setReportFilter} setSearchQuery={setSearchQuery} />
        <TablePagination {...sessionsPg} onPageChange={sessionsPg.setPage} onPageSizeChange={sessionsPg.setPageSize} noun="sesi" className="rounded-2xl border" />
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RANGKUMAN PER CLIENT (CLIENT DOSSIER & PROGRESSION)                  */}
      {/* ========================================================================= */}
      {activeTab === "clients" && (
        <>
        <ClientRollup completedSchedules={completedSchedules} filteredClients={clientsPg.pageItems} handleOpenClientDrawer={handleOpenClientDrawer} />
        <TablePagination {...clientsPg} onPageChange={clientsPg.setPage} onPageSizeChange={clientsPg.setPageSize} noun="client" className="rounded-2xl border" />
        </>
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
