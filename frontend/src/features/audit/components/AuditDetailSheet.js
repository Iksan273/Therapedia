import { ArrowRight, Fingerprint, History, Layers, MonitorSmartphone, Undo2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import { Button } from "@/shared/ui/button";
import { BranchTag } from "@/shared/components/BranchTag";
import { auditActionMeta, auditCategoryLabel, auditChanges } from "@/domain/audit";
import { cn } from "@/shared/lib/utils";
import { ACTOR_TYPE_LABEL, TONE_CLASSES, fieldLabel, formatAuditValue } from "@/features/audit/components/auditConfig";

const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });

const Row = ({ label, children }) => (
  <div className="grid grid-cols-[120px_1fr] gap-3 py-2 border-b border-slate-100 last:border-0 text-xs">
    <span className="font-bold text-slate-500">{label}</span>
    <span className="text-slate-800 font-medium break-words min-w-0">{children}</span>
  </div>
);

// Detail satu entri audit: pelaku, objek, perubahan nilai, alasan, rantai pembatalan, & batch.
export function AuditDetailSheet({ entry, open, onOpenChange, roleLabel, revertedBy, revertsEntry, batchEntries, onSelect }) {
  if (!entry) return null;
  const meta = auditActionMeta(entry.action);
  const changes = auditChanges(entry);
  const related = (batchEntries || []).filter((e) => e.id !== entry.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col bg-white overflow-hidden border-l border-slate-200" data-testid="audit-detail-sheet">
        <SheetHeader className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-200 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("px-2.5 py-1 rounded-lg border text-xs font-bold", TONE_CLASSES[meta.tone])}>{meta.label}</span>
            <span className="text-[11px] font-semibold text-slate-500">{auditCategoryLabel(meta.category)}</span>
          </div>
          <SheetTitle className="text-lg font-black text-slate-900 leading-tight mt-2">{entry.entityLabel || entry.entityType}</SheetTitle>
          <SheetDescription className="text-xs text-slate-500">
            {fmtDateTime(entry.occurredAt)} • <code className="font-mono">{entry.action}</code>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {revertedBy && (
            <div className="rounded-xl border border-dashed border-violet-300 bg-violet-50 p-3.5 text-xs text-violet-900 space-y-2" data-testid="audit-reverted-banner">
              <p className="font-bold flex items-center gap-1.5">
                <Undo2 className="w-3.5 h-3.5" /> Aksi ini sudah dibatalkan
              </p>
              <p>
                oleh <strong>{revertedBy.actorName}</strong> pada {fmtDateTime(revertedBy.occurredAt)}
                {revertedBy.reason ? ` — "${revertedBy.reason}"` : ""}
              </p>
              <Button size="sm" variant="outline" className="h-8 text-xs border-violet-300 bg-white" onClick={() => onSelect(revertedBy)}>
                Lihat log pembatalan
              </Button>
            </div>
          )}
          {revertsEntry && (
            <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3.5 text-xs text-violet-900 space-y-2">
              <p className="font-bold flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" /> Membatalkan aksi sebelumnya
              </p>
              <p>
                {auditActionMeta(revertsEntry.action).label} oleh <strong>{revertsEntry.actorName}</strong> pada {fmtDateTime(revertsEntry.occurredAt)}
              </p>
              <Button size="sm" variant="outline" className="h-8 text-xs border-violet-300 bg-white" onClick={() => onSelect(revertsEntry)}>
                Lihat log asal
              </Button>
            </div>
          )}

          <section>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Pelaku & objek</h3>
            <div className="rounded-xl border border-slate-200 px-3.5">
              <Row label="Pelaku">
                {entry.actorName}
                <span className="text-slate-500"> • {roleLabel(entry.actorRole) || ACTOR_TYPE_LABEL[entry.actorType]}</span>
              </Row>
              <Row label="Cabang">{entry.branchId ? <BranchTag branchId={entry.branchId} /> : "Global (semua cabang)"}</Row>
              <Row label="Objek">
                {entry.entityLabel || "—"} <span className="text-slate-400 font-mono">({entry.entityType}{entry.entityId ? ` #${entry.entityId}` : ""})</span>
              </Row>
              {entry.subjectLabel && <Row label="Client">{entry.subjectLabel}</Row>}
              {entry.reason && <Row label="Alasan">{entry.reason}</Row>}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Perubahan data</h3>
            {changes.length === 0 ? (
              <p className="text-xs text-slate-500 rounded-xl border border-slate-200 p-3.5">Tidak ada perubahan field (aksi akses / catatan).</p>
            ) : (
              <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                {changes.map((c) => (
                  <div key={c.field} className="p-3 text-xs grid grid-cols-1 sm:grid-cols-[110px_1fr] gap-1.5 sm:gap-3 items-center">
                    <span className="font-bold text-slate-600">{fieldLabel(c.field)}</span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 line-through decoration-rose-300">{formatAuditValue(c.field, c.from)}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold">{formatAuditValue(c.field, c.to)}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
            {entry.meta && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(entry.meta).map(([k, v]) => (
                  <span key={k} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-semibold">
                    {k}: {typeof v === "object" ? JSON.stringify(v) : String(v)}
                  </span>
                ))}
              </div>
            )}
          </section>

          {related.length > 0 && (
            <section>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Bagian dari aksi yang sama
              </h3>
              <div className="space-y-1.5">
                {related.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onSelect(r)}
                    className="w-full text-left rounded-xl border border-slate-200 px-3 py-2 text-xs hover:bg-sky-50/50 min-h-10 cursor-pointer"
                  >
                    <span className="font-bold text-slate-800">{auditActionMeta(r.action).label}</span>
                    <span className="text-slate-500"> • {r.entityLabel}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Konteks teknis</h3>
            <div className="rounded-xl border border-slate-200 px-3.5">
              <Row label={<span className="inline-flex items-center gap-1"><Fingerprint className="w-3 h-3" /> ID log</span>}>
                <code className="font-mono">{entry.id}</code>
              </Row>
              {entry.batchId && <Row label="Batch">{<code className="font-mono">{entry.batchId}</code>}</Row>}
              <Row label="Sumber">{entry.source}</Row>
              <Row label={<span className="inline-flex items-center gap-1"><MonitorSmartphone className="w-3 h-3" /> Perangkat</span>}>
                {[entry.ipAddress, entry.userAgent].filter(Boolean).join(" • ") || "—"}
              </Row>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
