import React, { useMemo, useState } from "react";
import { hasAllBranchAccess } from "@/domain/auth";
import { FileWarning } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/components/EmptyState";
import { FilterBar, FilterField, SearchInput } from "@/shared/components/FilterBar";
import { BranchFilter } from "@/shared/components/BranchFilter";
import { BranchTag } from "@/shared/components/BranchTag";
import DateFilterPicker from "@/shared/components/DateFilterPicker";
import { TablePagination, usePagination } from "@/shared/components/TablePagination";
import { useUrlFilters } from "@/shared/hooks/useUrlFilters";
import { SessionDetailModal } from "@/features/schedule/components/calendar/SessionDetailModal";
import { useSchedules } from "@/stores/schedulesStore";
import { useClients } from "@/stores/clientsStore";
import { useTherapists } from "@/stores/therapistsStore";
import { useAuth } from "@/stores/authStore";
import { filterSessionsByDate, isUnreportedSession } from "@/domain/schedule";
import { matchesClientSearch } from "@/domain/client";
import { fmtDate } from "@/shared/lib/format";

// Monitoring manager: semua sesi completed yang laporannya (Activity / Note / Homework) belum diisi.
// Fase API: view `v_unreported_sessions` (schema.md §04-G, Q19).
export default function UnreportedSessions() {
  const { schedules } = useSchedules();
  const { getClient } = useClients();
  const { therapists, getTherapist } = useTherapists();
  const { activeBranch, auth } = useAuth();
  const isMaster = hasAllBranchAccess(auth); // Master atau akun dengan akses semua cabang
  const defaultBranch = isMaster ? activeBranch || "all" : auth?.branchId || activeBranch || "branch-sby-timur";

  const { values: filters, setFilter, reset } = useUrlFilters({ q: "", branch: defaultBranch, therapist: "all", from: "", to: "" });
  const [openSessionId, setOpenSessionId] = useState(null);

  const unreported = useMemo(() => schedules.filter(isUnreportedSession), [schedules]);

  const filtered = useMemo(() => {
    const byDate = filterSessionsByDate(unreported, filters.from, filters.to);
    return byDate
      .filter((s) => (filters.branch === "all" || s.branchId === filters.branch) && (filters.therapist === "all" || s.therapistId === filters.therapist))
      .filter((s) => {
        const client = getClient(s.clientId);
        return client ? matchesClientSearch(client, filters.q) : !filters.q;
      })
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  }, [unreported, filters, getClient]);

  // Ringkasan jumlah sesi belum dilaporkan per terapis (hasil filter)
  const perTherapist = useMemo(() => {
    const map = new Map();
    filtered.forEach((s) => map.set(s.therapistId, (map.get(s.therapistId) || 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const pg = usePagination(filtered, 10, JSON.stringify(filters));
  const openSession = openSessionId ? schedules.find((s) => s.id === openSessionId) : null;

  const chips = [
    filters.q && { key: "q", label: `Cari: ${filters.q}`, onRemove: () => setFilter("q", "") },
    filters.therapist !== "all" && { key: "therapist", label: `Terapis: ${getTherapist(filters.therapist)?.name || filters.therapist}`, onRemove: () => setFilter("therapist", "all") },
    filters.from && { key: "from", label: `Dari ${fmtDate(filters.from)}`, onRemove: () => setFilter("from", "") },
    filters.to && { key: "to", label: `Sampai ${fmtDate(filters.to)}`, onRemove: () => setFilter("to", "") },
  ].filter(Boolean);

  return (
    <div className="space-y-6" data-testid="unreported-sessions-page">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/80 text-amber-900 text-xs font-semibold mb-2">
          <FileWarning className="w-3.5 h-3.5 text-amber-600" />
          Monitoring Laporan Sesi
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Sesi Completed Belum Dilaporkan</h1>
        <p className="text-sm text-slate-500 mt-1">
          Semua sesi berstatus Completed yang laporan klinisnya (Activity, Note, Homework) belum diisi terapis. Pantau dan ingatkan terapis terkait.
        </p>
      </div>

      <FilterBar title="Filter" chips={chips} onReset={reset} resultText={`${filtered.length} sesi`} gridClassName="lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
        <FilterField label="Pencarian client">
          <SearchInput className="min-w-0" placeholder="Nama anak, orang tua, atau kode client..." value={filters.q} onChange={(v) => setFilter("q", v)} />
        </FilterField>
        <FilterField label="Cabang">
          <BranchFilter value={filters.branch} onChange={(v) => setFilter("branch", v)} isMaster={isMaster} />
        </FilterField>
        <FilterField label="Terapis">
          <Select value={filters.therapist} onValueChange={(v) => setFilter("therapist", v)}>
            <SelectTrigger className="text-xs border-slate-200 bg-slate-50 font-semibold" aria-label="Terapis" data-testid="unreported-therapist-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="all">Semua terapis</SelectItem>
              {therapists.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Dari tanggal">
          <DateFilterPicker placeholder="DD/MM/YYYY" className="w-full bg-white" value={filters.from} onChange={(e) => setFilter("from", e?.target?.value ?? e ?? "")} />
        </FilterField>
        <FilterField label="Sampai tanggal">
          <DateFilterPicker placeholder="DD/MM/YYYY" className="w-full bg-white" value={filters.to} onChange={(e) => setFilter("to", e?.target?.value ?? e ?? "")} />
        </FilterField>
      </FilterBar>

      {perTherapist.length > 0 && (
        <div className="flex flex-wrap gap-2" data-testid="unreported-per-therapist">
          {perTherapist.map(([id, count]) => (
            <span key={id} className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
              {getTherapist(id)?.name || id}: {count} sesi
            </span>
          ))}
        </div>
      )}

      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          {filtered.length === 0 ? (
            <EmptyState icon={FileWarning} title="Semua laporan sudah terisi" subtitle="Tidak ada sesi completed tanpa laporan pada filter ini." />
          ) : (
            <Table stackOnMobile className="min-w-[640px] w-full">
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                  <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6 whitespace-nowrap">Tanggal & Jam</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Client</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Terapis</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap hidden md:table-cell">Cabang</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-right pr-6 whitespace-nowrap">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pg.pageItems.map((s) => {
                  const client = getClient(s.clientId);
                  return (
                    <TableRow key={s.id} className="border-b border-slate-100 hover:bg-slate-50/50" data-testid={`unreported-row-${s.id}`}>
                      <TableCell data-label="Tanggal" className="pl-6 text-xs whitespace-nowrap">
                        <p className="font-bold text-slate-900">{fmtDate(s.date)}</p>
                        <p className="font-mono text-slate-500">{s.startTime} – {s.endTime}</p>
                      </TableCell>
                      <TableCell data-label="Client" className="text-xs">
                        <p className="font-bold text-slate-900">{client?.clientName || "—"}</p>
                        <p className="font-mono text-[11px] text-slate-500">{client?.clientCode}</p>
                      </TableCell>
                      <TableCell data-label="Terapis" className="text-xs font-semibold text-slate-800">{getTherapist(s.therapistId)?.name || "—"}</TableCell>
                      <TableCell data-label="Cabang" className="text-xs hidden md:table-cell"><BranchTag branchId={s.branchId} /></TableCell>
                      <TableCell data-nolabel className="text-right pr-6">
                        <Button size="sm" variant="outline" className="font-bold border-slate-300 cursor-pointer" onClick={() => setOpenSessionId(s.id)} data-testid={`open-unreported-${s.id}`}>
                          Buka Sesi
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {filtered.length > 0 && <TablePagination {...pg} onPageChange={pg.setPage} onPageSizeChange={pg.setPageSize} noun="sesi" />}
      </Card>

      <SessionDetailModal schedule={openSession} open={Boolean(openSession)} onOpenChange={(o) => !o && setOpenSessionId(null)} />
    </div>
  );
}
