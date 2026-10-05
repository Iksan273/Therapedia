import React, { useMemo, useState } from "react";
import { hasAllBranchAccess } from "@/domain/auth";
import { useNavigate } from "react-router-dom";
import { format, subMonths } from "date-fns";
import { ClipboardList, UserX, ArrowRight, Clock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Button } from "@/shared/ui/button";
import { FilterBar, FilterField } from "@/shared/components/FilterBar";
import { BranchFilter } from "@/shared/components/BranchFilter";
import { usePagination } from "@/shared/components/TablePagination";
import { useUrlFilters } from "@/shared/hooks/useUrlFilters";
import { PeriodFilter } from "@/shared/components/PeriodFilter";
import { makePeriodMatcher, periodLabel } from "@/shared/lib/periods";
import { useClients } from "@/stores/clientsStore";
import { useAssessments } from "@/stores/assessmentsStore";
import { useAuth } from "@/stores/authStore";
import { useMasterData } from "@/stores/masterDataStore";
import { branchName } from "@/domain/branch";
import { getClientServiceIds, matchesClientSearch } from "@/domain/client";
import { todayStr } from "@/shared/lib/id";
import { KpiCards } from "@/features/inquiry/components/dashboard/KpiCards";
import { FunnelServiceCharts } from "@/features/inquiry/components/dashboard/FunnelServiceCharts";
import { TrendCharts } from "@/features/inquiry/components/dashboard/TrendCharts";
import { AwaitingQuestionnaireTab } from "@/features/inquiry/components/dashboard/AwaitingQuestionnaireTab";
import { FilteredRosterTab } from "@/features/inquiry/components/dashboard/FilteredRosterTab";
import { DiscontinuedTab } from "@/features/inquiry/components/dashboard/DiscontinuedTab";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "inquiry", label: "Inquiry Baru" },
  { value: "service_selected", label: "Layanan Dipilih" },
  { value: "assessment_scheduled", label: "Asesmen Terjadwal" },
  { value: "assessment_done", label: "Asesmen Selesai" },
  { value: "active_admitted", label: "Active Client (Admitted)" },
  { value: "done_consult", label: "Done Consult" },
  { value: "done_assessment", label: "Done Assessment" },
  { value: "discontinued", label: "Discontinued (Batal)" },
  { value: "discharged", label: "Discharged" },
];

const CHART_COLORS = ["#0284c7", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#64748b"];

export default function DashboardInquiry() {
  const navigate = useNavigate();
  const { clients } = useClients();
  const { categories, getCategory } = useAssessments();
  const { services, activeServices, getService } = useMasterData();
  const { activeBranch, auth } = useAuth();

  const isMaster = hasAllBranchAccess(auth); // Master atau akun dengan akses semua cabang
  const defaultBranch = !isMaster && auth?.branchId
    ? auth.branchId
    : (activeBranch && activeBranch !== "all" ? activeBranch : (!isMaster ? "branch-sby-timur" : "all"));

  // Filter disimpan di URL agar tidak hilang saat pindah halaman / refresh
  const { values: filters, setFilter, setFilters, reset: resetUrlFilters } = useUrlFilters({
    branch: defaultBranch,
    period: "all",
    start: "",
    end: "",
    service: "all",
    status: "all",
  });
  const branchFilter = filters.branch;
  const periodPreset = filters.period;
  const customStart = filters.start;
  const customEnd = filters.end;
  const serviceFilter = filters.service;
  const statusFilter = filters.status;
  const [searchRoster, setSearchRoster] = useState("");
  const [searchAwaiting, setSearchAwaiting] = useState("");
  const [searchDiscontinued, setSearchDiscontinued] = useState("");

  const filteredClients = useMemo(() => {
    const inPeriod = makePeriodMatcher(periodPreset, customStart, customEnd);
    const today = todayStr();
    return clients.filter((c) => {
      if (branchFilter !== "all" && c.branchId !== branchFilter) return false;
      if (serviceFilter !== "all" && !getClientServiceIds(c).includes(serviceFilter)) return false;
      if (statusFilter === "active_admitted") {
        if (c.status !== "admitted" && c.status !== "active") return false;
      } else if (statusFilter !== "all" && c.status !== statusFilter) {
        return false;
      }
      return inPeriod(c.createdAt ? c.createdAt.slice(0, 10) : today);
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
        count: filteredClients.filter((c) => getClientServiceIds(c).length > 0 && c.status !== "inquiry").length,
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
    services.forEach((s) => {
      counts[s.value] = 0;
    });

    // Satu klien dihitung di setiap layanan yang dipilihnya
    filteredClients.forEach((c) => {
      getClientServiceIds(c).forEach((st) => {
        counts[st] = (counts[st] || 0) + 1;
      });
    });

    return services.map((s, idx) => ({
      name: s.shortLabel,
      fullName: s.label,
      value: counts[s.value] || 0,
      color: CHART_COLORS[idx % CHART_COLORS.length],
    })).filter((item) => item.value > 0);
  }, [filteredClients, services]);

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
    const q = searchRoster.trim();
    return filteredClients.filter((c) => matchesClientSearch(c, q) || (c.parentContact && c.parentContact.includes(q)));
  }, [filteredClients, searchRoster]);

  const discontinuedList = useMemo(
    () => filteredClients.filter((c) => c.status === "discontinued"),
    [filteredClients]
  );

  // Pencarian di tab "Menunggu Kuesioner Ortu" dan log drop-off (awal nama anak / ortu / kode client / telepon)
  const matchSearch = (c, term) => {
    const q = term.trim();
    return !q || matchesClientSearch(c, q) || Boolean(c.parentContact && c.parentContact.includes(q));
  };
  const awaitingShown = useMemo(() => awaitingQuestionnaires.filter((c) => matchSearch(c, searchAwaiting)), [awaitingQuestionnaires, searchAwaiting]);
  const discontinuedShown = useMemo(() => discontinuedList.filter((c) => matchSearch(c, searchDiscontinued)), [discontinuedList, searchDiscontinued]);

  const filterKey = `${branchFilter}|${periodPreset}|${customStart}|${customEnd}|${serviceFilter}|${statusFilter}`;
  const awaitPg = usePagination(awaitingShown, 10, `${filterKey}|${searchAwaiting}`);
  const rosterPg = usePagination(searchedRoster, 10, `${filterKey}|${searchRoster}`);
  const discPg = usePagination(discontinuedShown, 10, `${filterKey}|${searchDiscontinued}`);

  const resetFilters = () => {
    resetUrlFilters();
    setSearchRoster("");
  };

  const filterChips = [];
  if (branchFilter !== defaultBranch) {
    filterChips.push({
      key: "branch",
      label: `Cabang: ${branchFilter === "all" ? "Semua" : branchName(branchFilter)}`,
      onRemove: () => setFilter("branch", defaultBranch),
    });
  }
  if (periodPreset !== "all") {
    const range = periodPreset === "custom" ? ` (${customStart || "…"} – ${customEnd || "…"})` : "";
    filterChips.push({
      key: "period",
      label: `Periode: ${periodLabel(periodPreset)}${range}`,
      onRemove: () => setFilters({ period: null, start: null, end: null }),
    });
  }
  if (serviceFilter !== "all") {
    filterChips.push({
      key: "service",
      label: `Layanan: ${getService(serviceFilter)?.shortLabel || serviceFilter}`,
      onRemove: () => setFilter("service", "all"),
    });
  }
  if (statusFilter !== "all") {
    filterChips.push({
      key: "status",
      label: `Status: ${STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label || statusFilter}`,
      onRemove: () => setFilter("status", "all"),
    });
  }

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
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold gap-2 shadow-xs"
          >
            Buka Pipeline Kanban <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* FILTER BAR */}
      <FilterBar
        title="Filter & Segmentasi Dashboard"
        chips={filterChips}
        onReset={resetFilters}
        resultText={`${filteredClients.length} client`}
      >
        <FilterField label="Cabang Klinik">
          <BranchFilter value={branchFilter} onChange={(v) => setFilter("branch", v)} isMaster={isMaster} />
        </FilterField>

        <PeriodFilter
          preset={periodPreset}
          start={customStart}
          end={customEnd}
          testidPrefix="inquiry"
          onChange={({ preset, start, end }) =>
            setFilters({
              ...(preset !== undefined && { period: preset }),
              ...(start !== undefined && { start }),
              ...(end !== undefined && { end }),
            })
          }
        />

        <FilterField label="Layanan Klinis">
          <Select value={serviceFilter} onValueChange={(v) => setFilter("service", v)}>
            <SelectTrigger className="text-xs border-slate-200 bg-slate-50 font-semibold" aria-label="Layanan klinis">
              <SelectValue placeholder="Pilih Layanan" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="all">Semua Layanan</SelectItem>
              {activeServices.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Status Pipeline">
          <Select value={statusFilter} onValueChange={(v) => setFilter("status", v)}>
            <SelectTrigger className="text-xs border-slate-200 bg-slate-50 font-semibold" aria-label="Status pipeline">
              <SelectValue placeholder="Pilih Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              {STATUS_FILTER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

      </FilterBar>

      {/* KPI METRIC CARDS */}
      <KpiCards admittedCount={admittedCount} assessmentDoneCount={assessmentDoneCount} assessmentScheduledCount={assessmentScheduledCount} awaitingQuestionnaires={awaitingQuestionnaires} conversionRate={conversionRate} discontinuedCount={discontinuedCount} totalInquiries={totalInquiries} />

      {/* CHARTS ROW 1: FUNNEL & SERVICE DISTRIBUTION */}
      <FunnelServiceCharts conversionRate={conversionRate} funnelData={funnelData} serviceDistributionData={serviceDistributionData} />

      {/* CHARTS ROW 2: 6-MONTH TRENDS */}
      <TrendCharts monthlyIntakeTrends={monthlyIntakeTrends} />

      {/* TABS FOR ACTIONABLE OPERATIONAL LISTS */}
      <Tabs defaultValue="awaiting" className="space-y-4">
        <TabsList className="bg-white border border-slate-200 p-1 rounded-2xl shadow-2xs h-auto w-full sm:w-auto flex flex-wrap justify-start gap-1">
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
        <AwaitingQuestionnaireTab awaitPg={awaitPg} awaitingQuestionnaires={awaitingShown} totalAwaiting={awaitingQuestionnaires.length} search={searchAwaiting} setSearch={setSearchAwaiting} navigate={navigate} />

        {/* TAB 2: FILTERED ROSTER */}
        <FilteredRosterTab navigate={navigate} rosterPg={rosterPg} searchRoster={searchRoster} searchedRoster={searchedRoster} setSearchRoster={setSearchRoster} />

        {/* TAB 3: DISCONTINUED LOG */}
        <DiscontinuedTab discPg={discPg} discontinuedList={discontinuedShown} totalDiscontinued={discontinuedList.length} search={searchDiscontinued} setSearch={setSearchDiscontinued} navigate={navigate} />
      </Tabs>
    </div>
  );
}
