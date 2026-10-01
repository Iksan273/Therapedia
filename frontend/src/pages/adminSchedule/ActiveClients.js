import React, { Suspense, lazy, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Users, Cake, BarChart3, CalendarPlus, MessageCircle, Snowflake } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar, FilterField, SearchInput } from "@/components/common/FilterBar";
import { BranchFilter } from "@/components/common/BranchFilter";
import { BranchTag } from "@/components/common/BranchTag";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { TablePagination, usePagination } from "@/components/common/TablePagination";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { AddScheduleModal } from "@/components/calendar/AddScheduleModal";

// Tab analitik (beserta pustaka grafik) baru diunduh saat tab dibuka
const ClientAnalyticsTab = lazy(() => import("@/components/analytics/ClientAnalyticsTab"));
import { useClients } from "@/context/ClientsContext";
import { useCredits } from "@/context/CreditsContext";
import { useAuth } from "@/context/AuthContext";
import { calcAge, fmtDate, branchName, formatPackageName } from "@/lib/appUtils";
import { cn } from "@/lib/utils";

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1).padStart(2, "0"),
  label: format(new Date(2026, i, 1), "MMMM"),
}));

export default function ActiveClients() {
  const navigate = useNavigate();
  const { clients } = useClients();
  const { getRecordForClient } = useCredits();
  const { activeBranch, auth } = useAuth();
  const isMaster = auth?.role === "master";
  const defaultBranch = isMaster ? (activeBranch || "all") : (auth?.branchId || activeBranch || "branch-sby-timur");

  const [activeTab, setActiveTab] = useState("roster"); // roster | birthday | analytics
  // Filter roster disimpan di URL (q, branch, credit) agar bertahan saat pindah halaman / refresh
  const { values: rosterFilters, setFilter: setRosterFilter, reset: resetRosterFilters } = useUrlFilters({
    q: "",
    branch: defaultBranch,
    credit: "all", // all | healthy | low | zero
  });
  const searchTerm = rosterFilters.q;
  const branchFilter = rosterFilters.branch;
  const creditFilter = rosterFilters.credit;
  const [birthdayMonth, setBirthdayMonth] = useState(format(new Date(), "MM"));

  // Quick schedule modal
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);


  // Active clients list
  const activeList = useMemo(
    () => clients.filter((c) => (c.status === "admitted" || c.status === "active") && !c.dateOfDischarge),
    [clients]
  );

  // Filtered Roster
  const filteredActive = useMemo(() => {
    return activeList.filter((c) => {
      if (branchFilter !== "all" && c.branchId !== branchFilter) return false;

      const q = searchTerm.toLowerCase().trim();
      if (q) {
        const matchName = c.clientName.toLowerCase().includes(q);
        const matchParent = c.parentName?.toLowerCase().includes(q);
        const matchCode = c.clientAccessCode?.toLowerCase().includes(q);
        if (!matchName && !matchParent && !matchCode) return false;
      }

      if (creditFilter !== "all") {
        const rec = getRecordForClient(c.id);
        const rem = rec ? rec.remainingCredit : 0;
        if (creditFilter === "zero" && rem !== 0) return false;
        if (creditFilter === "low" && (rem <= 0 || rem > 2)) return false;
        if (creditFilter === "healthy" && rem <= 2) return false;
      }

      return true;
    });
  }, [activeList, branchFilter, searchTerm, creditFilter, getRecordForClient]);

  const rosterPg = usePagination(filteredActive, 10, `${searchTerm}|${branchFilter}|${creditFilter}`);

  // Birthday list for selected month
  const birthdayClients = useMemo(() => {
    return activeList.filter((c) => {
      if (!c.dob) return false;
      const parts = c.dob.split("-");
      return parts.length >= 2 && parts[1] === birthdayMonth;
    });
  }, [activeList, birthdayMonth]);

  const rosterChips = [];
  if (searchTerm.trim()) {
    rosterChips.push({ key: "q", label: `Cari: "${searchTerm.trim()}"`, onRemove: () => setRosterFilter("q", "") });
  }
  if (branchFilter !== defaultBranch) {
    rosterChips.push({
      key: "branch",
      label: `Cabang: ${branchFilter === "all" ? "Semua" : branchName(branchFilter)}`,
      onRemove: () => setRosterFilter("branch", defaultBranch),
    });
  }
  if (creditFilter !== "all") {
    const creditLabels = { healthy: "Kredit sehat", low: "Kredit menipis", zero: "0 kredit (Frozen)" };
    rosterChips.push({
      key: "credit",
      label: `Status kredit: ${creditLabels[creditFilter] || creditFilter}`,
      onRemove: () => setRosterFilter("credit", "all"),
    });
  }

  return (
    <div className="space-y-6" data-testid="active-clients-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            Active Clinical Caseload & Roster
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Active Clients
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Daftar client terapi aktif, monitoring saldo multi-paket, radar ulang tahun, dan analitik caseload skala besar.
          </p>
        </div>

      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100/90 border border-slate-200/80 p-1.5 rounded-2xl shadow-2xs gap-1.5 flex flex-wrap h-auto">
          <TabsTrigger value="roster" className="rounded-xl text-xs font-bold gap-2 h-10 px-4 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs">
            <Users className="w-4 h-4 text-sky-600" /> Active Roster ({filteredActive.length})
          </TabsTrigger>
          <TabsTrigger value="birthday" className="rounded-xl text-xs font-bold gap-2 h-10 px-4 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs">
            <Cake className="w-4 h-4 text-pink-600" /> Birthday Hub ({birthdayClients.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-xl text-xs font-bold gap-2 h-10 px-4 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs">
            <BarChart3 className="w-4 h-4 text-purple-600" /> Advanced Analytics
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ACTIVE ROSTER */}
        <TabsContent value="roster" className="space-y-4">
          <FilterBar
            title="Cari & Filter Roster"
            chips={rosterChips}
            onReset={resetRosterFilters}
            resultText={`${filteredActive.length} client`}
            gridClassName="lg:grid-cols-[2fr_1fr_1fr]"
          >
            <FilterField label="Pencarian">
              <SearchInput
                className="min-w-0"
                placeholder="Nama anak, orang tua, atau kode akses..."
                value={searchTerm}
                onChange={(v) => setRosterFilter("q", v)}
              />
            </FilterField>
            <FilterField label="Cabang">
              <BranchFilter value={branchFilter} onChange={(v) => setRosterFilter("branch", v)} isMaster={isMaster} />
            </FilterField>
            <FilterField label="Status Kredit">
              <Select value={creditFilter} onValueChange={(v) => setRosterFilter("credit", v)}>
                <SelectTrigger className="text-xs border-slate-200 bg-slate-50 font-semibold" aria-label="Status kredit">
                  <SelectValue placeholder="Status Kredit" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="all">Semua Status Kredit</SelectItem>
                  <SelectItem value="healthy">Kredit Sehat (&gt;2 sesi)</SelectItem>
                  <SelectItem value="low">Kredit Menipis (1-2 sesi)</SelectItem>
                  <SelectItem value="zero">0 Kredit (Frozen Slot)</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
          </FilterBar>

          {/* Roster Table */}
          <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <CardContent className="p-0 overflow-x-auto">
              {filteredActive.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="Tidak ada client"
                  subtitle="Tidak ada client aktif pada filter ini."
                  action={
                    rosterChips.length > 0 ? (
                      <Button variant="outline" size="sm" className="font-bold" onClick={resetRosterFilters}>
                        Reset Filter
                      </Button>
                    ) : null
                  }
                />
              ) : (
                <Table stackOnMobile className="min-w-[680px] w-full">
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                      <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6 min-w-[260px] whitespace-nowrap">Profil Client</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs min-w-[190px] whitespace-nowrap hidden md:table-cell">Orang Tua & Kontak</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs min-w-[170px] whitespace-nowrap hidden md:table-cell">Cabang</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs min-w-[240px] whitespace-nowrap">Paket Kredit Aktif</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs min-w-[180px] whitespace-nowrap hidden lg:table-cell">Riwayat Cancel</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs text-right pr-6 min-w-[170px] whitespace-nowrap">Tindakan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rosterPg.pageItems.map((c) => {
                      const rec = getRecordForClient(c.id);
                      const rem = rec ? rec.remainingCredit : 0;
                      const pkgs = rec?.packages || [];
                      const isFrozen = rem === 0;

                      return (
                        <TableRow key={c.id} className="border-b border-slate-100 hover:bg-sky-50/30 transition-colors">
                          <TableCell data-nolabel className="py-4 pl-6 min-w-[260px]">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "w-10 h-10 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs",
                                  isFrozen ? "bg-cyan-100 text-cyan-900 ring-1 ring-cyan-300" : "bg-sky-100 text-sky-800"
                                )}
                              >
                                {isFrozen ? <Snowflake className="w-5 h-5" aria-label="Frozen" /> : c.clientName[0]}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-sm text-slate-900 whitespace-nowrap">{c.clientName}</p>
                                  {isFrozen && (
                                    <span className="text-[11px] font-extrabold text-cyan-900 bg-cyan-100 border border-cyan-300 px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap">
                                      Frozen
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 font-medium mt-0.5 whitespace-nowrap">
                                  {calcAge(c.dob)} th • Kode: <strong className="font-mono text-slate-700">{c.clientAccessCode}</strong>
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell data-label="Orang Tua & Kontak" className="text-xs py-4 min-w-[190px] hidden md:table-cell">
                            <p className="font-semibold text-slate-800 whitespace-nowrap">{c.parentName}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5 whitespace-nowrap font-mono">{c.parentContact}</p>
                          </TableCell>
                          <TableCell data-label="Cabang" className="text-xs py-4 min-w-[170px] hidden md:table-cell">
                            <BranchTag
                              branchId={c.branchId}
                              className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200"
                            />
                          </TableCell>
                          <TableCell data-label="Paket Kredit Aktif" className="text-xs py-4 min-w-[240px]">
                            {pkgs.length === 0 ? (
                              <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg inline-flex items-center whitespace-nowrap">
                                0 Kredit (Menunggu Finance)
                              </span>
                            ) : (
                              <div className="space-y-1.5">
                                {pkgs.map((p) => (
                                  <div key={p.id} className="flex items-center gap-2 whitespace-nowrap">
                                    <span className="font-bold text-slate-800">{formatPackageName(p.packageName)}:</span>
                                    <span
                                      className={cn(
                                        "font-mono font-bold px-2 py-0.5 rounded-md text-[11px] shrink-0",
                                        p.remainingCredit === 0
                                          ? "bg-rose-100 text-rose-800"
                                          : p.remainingCredit <= 2
                                          ? "bg-amber-100 text-amber-800"
                                          : "bg-emerald-100 text-emerald-800"
                                      )}
                                    >
                                      {p.remainingCredit} sisa
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell data-label="Riwayat Cancel" className="text-xs font-medium py-4 min-w-[180px] hidden lg:table-cell">
                            <span
                              className={cn(
                                "px-2.5 py-1 rounded-lg font-bold text-xs border inline-flex items-center whitespace-nowrap",
                                (rec?.cancelCountTotal || 0) <= 3
                                  ? "bg-slate-100 text-slate-700 border-slate-200"
                                  : "bg-rose-100 text-rose-800 border-rose-300 font-extrabold"
                              )}
                            >
                              {rec?.cancelCountTotal || 0}x Cancel
                              {(rec?.cancelCountTotal || 0) > 3 && " (Kena Penalti)"}
                            </span>
                          </TableCell>
                          <TableCell data-nolabel className="text-right pr-6 py-4 min-w-[170px]">
                            <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                              <Button
                                size="sm"
                                variant="outline"
                                className="px-3 gap-1.5 font-bold border-slate-200 hover:bg-sky-50 hover:text-sky-700 shrink-0 whitespace-nowrap cursor-pointer"
                                onClick={() => {
                                  setSelectedClientId(c.id);
                                  setScheduleModalOpen(true);
                                }}
                              >
                                <CalendarPlus className="w-3.5 h-3.5 text-sky-600" /> Sesi
                              </Button>
                              <Button
                                size="sm"
                                className="px-3.5 font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-2xs shrink-0 whitespace-nowrap cursor-pointer"
                                onClick={() => navigate(`/admin-schedule/clients/${c.id}`)}
                              >
                                Detail
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

            <TablePagination
              {...rosterPg}
              onPageChange={rosterPg.setPage}
              onPageSizeChange={rosterPg.setPageSize}
              noun="client"
            />
          </Card>
        </TabsContent>

        {/* TAB 2: BIRTHDAY HUB */}
        <TabsContent value="birthday" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Cake className="w-4 h-4 text-pink-600" /> Radar Ulang Tahun Client Aktif
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kirim ucapan selamat ulang tahun personal ke WhatsApp orang tua secara instan
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Pilih Bulan:</span>
              <Select value={birthdayMonth} onValueChange={setBirthdayMonth}>
                <SelectTrigger className="w-44 text-xs border-slate-200 bg-slate-50 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {birthdayClients.length === 0 ? (
              <div className="col-span-full py-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
                Tidak ada client aktif yang berulang tahun pada bulan ini.
              </div>
            ) : (
              birthdayClients.map((c) => {
                return (
                  <Card key={c.id} className="rounded-2xl border border-pink-200 bg-pink-50/40 shadow-2xs p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-base">
                          <Cake className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">{c.clientName}</h4>
                          <p className="text-[11px] text-slate-500">
                            {fmtDate(c.dob)} (Ulang Tahun ke-{calcAge(c.dob)})
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-pink-800 bg-pink-100 px-2 py-0.5 rounded-full">
                        {branchName(c.branchId)}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-pink-200/70 flex items-center justify-between">
                      <span className="text-xs text-slate-600 font-medium">Ortu: {c.parentName}</span>
                      <a
                        href={`https://wa.me/${c.parentContact.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                          `Halo ${c.parentName}, segenap tim Therapedia mengucapkan Selamat Ulang Tahun untuk ${c.clientName}! 🎂`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> WA Ucapan
                      </a>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* TAB 3: ADVANCED ANALYTICS */}
        <TabsContent value="analytics">
          <Suspense fallback={<PageSkeleton variant="panel" />}>
            <ClientAnalyticsTab activeList={activeList} />
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* Add Schedule Modal */}
      <AddScheduleModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        defaults={{ clientId: selectedClientId }}
      />
    </div>
  );
}
