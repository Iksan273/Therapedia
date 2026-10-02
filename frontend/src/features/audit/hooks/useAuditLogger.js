import { useAuth } from "@/stores/authStore";
import { useAudit } from "@/stores/auditStore";
import { buildAuditEntry, newAuditBatchId } from "@/domain/audit";

// Pencatat audit untuk hook use-case. Satu panggilan `record()` = satu aksi user (satu batchId).
// Fase API: hook ini tidak dipakai lagi — backend menulis audit_logs di transaksi yang sama.
export function useAuditLogger() {
  const { auth, staffUsers, rolesList } = useAuth();
  const { appendAudit } = useAudit();

  const currentActor = () => {
    if (auth?.role === "client") return { type: "client", id: auth.clientId, name: "Orang tua", role: "client" };
    const staff =
      (auth?.therapistId && staffUsers.find((u) => u.therapistId === auth.therapistId)) ||
      staffUsers.find((u) => u.name === auth?.staffName);
    const roleLabel = rolesList.find((r) => r.id === auth?.role)?.label;
    return { type: "user", id: staff?.id ?? null, name: auth?.staffName || staff?.name || roleLabel || "Staf", role: auth?.role || null };
  };

  // items: satu objek atau array { action, entityType, entityId, entityLabel, branchId, subject*, oldValues, newValues, meta, reason, revertsAuditId }
  const record = (items) => {
    const list = Array.isArray(items) ? items : [items];
    const actor = currentActor();
    const batchId = list.length > 1 ? newAuditBatchId() : null;
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 120) : null;
    const entries = list.map((item) => buildAuditEntry({ ...item, actor, batchId, userAgent }));
    appendAudit(entries);
    return entries;
  };

  return { record };
}
