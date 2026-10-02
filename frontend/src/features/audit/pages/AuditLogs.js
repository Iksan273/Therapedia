import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Activity, ShieldAlert, ScrollText, Undo2, Users } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { BranchFilter } from "@/shared/components/BranchFilter";
import { BranchTag } from "@/shared/components/BranchTag";
import { EmptyState } from "@/shared/components/EmptyState";
import { FilterBar, FilterField, SearchInput } from "@/shared/components/FilterBar";
import { PeriodFilter } from "@/shared/components/PeriodFilter";
import { StatCard } from "@/shared/components/StatCard";
import { TablePagination, usePagination } from "@/shared/components/TablePagination";
import { useUrlFilters } from "@/shared/hooks/useUrlFilters";
import { makePeriodMatcher, periodLabel } from "@/shared/lib/periods";
import { cn } from "@/shared/lib/utils";
import { useAuth } from "@/stores/authStore";
import { useAudit } from "@/stores/auditStore";
import { branchName } from "@/domain/branch";
import { AUDIT_CATEGORIES, auditActionMeta, auditCategoryLabel, auditChanges, auditInBranch, indexReverts } from "@/domain/audit";
import { AuditDetailSheet } from "@/features/audit/components/AuditDetailSheet";
import { ACTOR_TYPE_LABEL, TONE_CLASSES, fieldLabel, formatAuditValue } from "@/features/audit/components/auditConfig";

const fmtDateTime = (iso) => format(new Date(iso), "dd/MM/yyyy HH:mm");

// Ringkasan perubahan untuk satu sel tabel (maks. 2 field, sisanya "+n")
function ChangeSummary({ entry }) {
  const changes = auditChanges(entry);
  if (changes.length === 0) {
    return entry.reason ? <span className="text-slate-600 line-clamp-2">{entry.reason}</span> : <span className="text-slate-400">—</span>;
  }
  return (
    <div className="space-y-0.5">
      {changes.slice(0, 2).map((c) => (
        <p key={c.field} className="truncate">
          <span className="font-semibold text-slate-500">{fieldLabel(c.field)}:</span>{" "}
          <span className="text-slate-500">{formatAuditValue(c.field, c.from)}</span> → <span className="font-bold text-slate-800">{formatAuditValue(c.field, c.to)}</span>
        </p>
      ))}
      {changes.length > 2 && <p className="text-slate-400">+{changes.length - 2} field lain</p>}
    </div>
  );
}

export default function AuditLogs() {
  const { auth, activeBranch, rolesList } = useAuth();
  const { auditLogs } = useAudit();
  const isMaster = auth?.role === "master";
  const defaultBranch = isMaster ? activeBranch || "all" : auth?.branchId || activeBranch || "branch-sby-timur";

  // Filter disimpan di URL agar bisa dibagikan / bertahan saat refresh
  const { values: f, setFilter, setFilters, reset } = useUrlFilters({
    q: "",
    branch: defaultBranch,
    period: "7days",
    start: "",
    end: "",
    category: "all",
    actorRole: "all",
  });
  // Non-master selalu dikunci ke cabangnya walau URL diubah manual
  const branchFilter = isMaster ? f.branch : defaultBranch;

  const [selected, setSelected] = useState(null);

  const roleLabel = (roleId) => rolesList.find((r) => r.id === roleId)?.label || (roleId === "client" ? "Orang tua" : roleId || "");

  const revertMap = useMemo(() => indexReverts(auditLogs), [auditLogs]);
  const byId = useMemo(() => new Map(auditLogs.map((e) => [e.id, e])), [auditLogs]);

  const filtered = useMemo(() => {
    const inPeriod = makePeriodMatcher(f.period, f.start, f.end);
    const q = f.q.trim().toLowerCase();
    return auditLogs.filter((e) => {
      if (!auditInBranch(e, branchFilter)) return false;
      if (!inPeriod(format(new Date(e.occurredAt), "yyyy-MM-dd"))) return false;
      const meta = auditActionMeta(e.action);
      if (f.category !== "all" && meta.category !== f.category) return false;
      if (f.actorRole !== "all" && (e.actorRole || e.actorType) !== f.actorRole) return false;
      if (q) {
        const hay = [e.actorName, e.entityLabel, e.subjectLabel, e.reason, meta.label, e.action].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [auditLogs, branchFilter, f.period, f.start, f.end, f.category, f.actorRole, f.q]);

  const stats = useMemo(() => {
    const actors = new Set(filtered.map((e) => `${e.actorType}:${e.actorId || e.actorName}`));
    return {
      total: filtered.length,
      reverts: filtered.filter((e) => e.revertsAuditId).length,
      risky: filtered.filter((e) => auditActionMeta(e.action).tone === "danger").length,
      actors: actors.size,
    };
  }, [filtered]);

  const pg = usePagination(filtered, 25, `${branchFilter}|${f.period}|${f.start}|${f.end}|${f.category}|${f.actorRole}|${f.q}`);

  const actorRoleOptions = useMemo(() => {
    const ids = [...new Set(auditLogs.map((e) => e.actorRole || e.actorType).filter(Boolean))];
    return ids.map((id) => ({ value: id, label: roleLabel(id) || ACTOR_TYPE_LABEL[id] || id }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditLogs, rolesList]);

  const chips = [];
  if (f.q.trim()) chips.push({ key: "q", label: `Cari: "${f.q.trim()}"`, onRemove: () => setFilter("q", "") });
  if (isMaster && f.branch !== defaultBranch) {
    chips.push({ key: "branch", label: `Cabang: ${f.branch === "all" ? "Semua" : branchName(f.branch)}`, onRemove: () => setFilter("branch", defaultBranch) });
  }
  if (f.period !== "7days") chips.push({ key: "period", label: `Periode: ${periodLabel(f.period)}`, onRemove: () => setFilters({ period: "7days", start: "", end: "" }) });
  if (f.category !== "all") chips.push({ key: "category", label: `Kategori: ${auditCategoryLabel(f.category)}`, onRemove: () => setFilter("category", "all") });
  if (f.actorRole !== "all") chips.push({ key: "actorRole", label: `Pelaku: ${roleLabel(f.actorRole) || f.actorRole}`, onRemove: () => setFilter("actorRole", "all") });

  const batchEntries = selected?.batchId ? auditLogs.filter((e) => e.batchId === selected.batchId) : [];

  return (
    <div className="space-y-6" data-testid="audit-logs-page">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100/80 text-sky-800 text-xs font-semibold mb-2">
          <ScrollText className="w-3.5 h-3.5 text-sky-600" />
          Audit Trail
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Audit Logs</h1>
        <p className="text-sm text-slate-500 mt-1">
          Jejak seluruh aksi perubahan data{isMaster ? " di semua cabang" : ` di cabang ${branchName(defaultBranch)}`}: siapa, melakukan apa, kapan, nilai sebelum & sesudah, serta aksi yang dibatalkan.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total aksi" value={stats.total} icon={Activity} accent="primary" testid="audit-stat-total" />
        <StatCard label="Aksi dibatalkan" value={stats.reverts} icon={Undo2} accent="info" testid="audit-stat-reverts" />
        <StatCard label="Aksi berisiko" value={stats.risky} icon={ShieldAlert} accent="danger" testid="audit-stat-risky" />
        <StatCard label="Pelaku aktif" value={stats.actors} icon={Users} accent="neutral" testid="audit-stat-actors" />
      </div>

      <FilterBar title="Cari & Filter Log" chips={chips} onReset={reset} resultText={`${filtered.length} log`} gridClassName="lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
        <FilterField label="Pencarian">
          <SearchInput className="min-w-0" placeholder="Pelaku, client, objek, atau alasan..." value={f.q} onChange={(v) => setFilter("q", v)} data-testid="audit-search-input" />
        </FilterField>
        <FilterField label="Cabang">
          <BranchFilter value={branchFilter} onChange={(v) => setFilter("branch", v)} isMaster={isMaster} />
        </FilterField>
        <PeriodFilter preset={f.period} start={f.start} end={f.end} onChange={setFilters} testidPrefix="audit-period" />
        <FilterField label="Kategori">
          <Select value={f.category} onValueChange={(v) => setFilter("category", v)}>
            <SelectTrigger className="text-xs border-slate-200 bg-slate-50 font-semibold" aria-label="Kategori aksi" data-testid="audit-category-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="all">Semua Kategori</SelectItem>
              {AUDIT_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Pelaku">
          <Select value={f.actorRole} onValueChange={(v) => setFilter("actorRole", v)}>
            <SelectTrigger className="text-xs border-slate-200 bg-slate-50 font-semibold" aria-label="Role pelaku" data-testid="audit-actor-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="all">Semua Pelaku</SelectItem>
              {actorRoleOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
      </FilterBar>

      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="Belum ada log untuk filter ini"
              subtitle="Perluas rentang waktu atau reset filter untuk melihat aktivitas lain."
              className="py-14"
            />
          ) : (
            <Table stackOnMobile className="min-w-[980px] w-full">
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                  <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6 whitespace-nowrap">Waktu</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Pelaku</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Aksi</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Objek</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Perubahan / Alasan</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs pr-6 whitespace-nowrap">Cabang</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pg.pageItems.map((e) => {
                  const meta = auditActionMeta(e.action);
                  const revertedBy = revertMap.get(e.id);
                  return (
                    <TableRow
                      key={e.id}
                      className="border-b border-slate-100 hover:bg-sky-50/40 cursor-pointer transition-colors"
                      onClick={() => setSelected(e)}
                      data-testid={`audit-row-${e.id}`}
                    >
                      <TableCell data-label="Waktu" className="py-3 pl-6 text-xs font-mono text-slate-600 whitespace-nowrap">{fmtDateTime(e.occurredAt)}</TableCell>
                      <TableCell data-label="Pelaku" className="text-xs max-w-[200px]">
                        <p className="font-bold text-slate-900 truncate">{e.actorName}</p>
                        <p className="text-slate-500 truncate">{roleLabel(e.actorRole) || ACTOR_TYPE_LABEL[e.actorType]}</p>
                      </TableCell>
                      <TableCell data-label="Aksi" className="text-xs">
                        <span className={cn("inline-flex px-2 py-0.5 rounded-lg border font-bold whitespace-nowrap", TONE_CLASSES[meta.tone])}>{meta.label}</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {revertedBy && <span className="px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-800 text-[10px] font-bold">Sudah dibatalkan</span>}
                          {e.revertsAuditId && <span className="px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700 text-[10px] font-bold">Membatalkan aksi</span>}
                          {e.batchId && <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-semibold">batch</span>}
                        </div>
                      </TableCell>
                      <TableCell data-label="Objek" className="text-xs max-w-[220px]">
                        <p className="font-semibold text-slate-800 truncate">{e.entityLabel || e.entityType}</p>
                        {e.subjectLabel && e.subjectLabel !== e.entityLabel && <p className="text-slate-500 truncate">Client: {e.subjectLabel}</p>}
                      </TableCell>
                      <TableCell data-label="Perubahan / Alasan" className="text-xs max-w-[280px]">
                        <ChangeSummary entry={e} />
                      </TableCell>
                      <TableCell data-label="Cabang" className="text-xs pr-6 whitespace-nowrap text-slate-600">
                        {e.branchId ? <BranchTag branchId={e.branchId} /> : <span className="text-slate-400">Global</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <TablePagination
            page={pg.page}
            totalPages={pg.totalPages}
            totalItems={pg.totalItems}
            pageSize={pg.pageSize}
            onPageChange={pg.setPage}
            onPageSizeChange={pg.setPageSize}
            pageSizeOptions={[25, 50, 100]}
            noun="log"
          />
        </CardContent>
      </Card>

      <AuditDetailSheet
        entry={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
        roleLabel={roleLabel}
        revertedBy={selected ? revertMap.get(selected.id) : null}
        revertsEntry={selected?.revertsAuditId ? byId.get(selected.revertsAuditId) : null}
        batchEntries={batchEntries}
        onSelect={setSelected}
      />
    </div>
  );
}
