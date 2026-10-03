import { uid } from "@/shared/lib/id";

// Domain audit log: katalog kode aksi, pembuat entri, dan helper perubahan.
// Bentuk entri mengikuti tabel `audit_logs` di schema.md §05 (versi camelCase).

export const AUDIT_CATEGORIES = [
  { value: "schedule", label: "Sesi & Jadwal" },
  { value: "credit", label: "Kredit Sesi" },
  { value: "client", label: "Client & Pipeline" },
  { value: "assessment", label: "Asesmen" },
  { value: "finance", label: "Invoice & Pembayaran" },
  { value: "access", label: "Akun & Hak Akses" },
  { value: "master", label: "Master Data" },
  { value: "auth", label: "Login & Sesi Akun" },
];

// tone: neutral | success | warning | danger | info | revert
export const AUDIT_ACTIONS = {
  "auth.login": { label: "Login", category: "auth", tone: "neutral" },
  "auth.logout": { label: "Logout", category: "auth", tone: "neutral" },
  "auth.login_failed": { label: "Login gagal", category: "auth", tone: "danger" },
  "auth.client_login": { label: "Login portal ortu", category: "auth", tone: "neutral" },

  "client.created": { label: "Intake baru dibuat", category: "client", tone: "info" },
  "client.updated": { label: "Data client diubah", category: "client", tone: "neutral" },
  "client.status_changed": { label: "Tahap pipeline berubah", category: "client", tone: "info" },
  "client.services_updated": { label: "Layanan client diubah", category: "client", tone: "neutral" },
  "client.admitted": { label: "Client di-admit", category: "client", tone: "success" },
  "client.done_consult": { label: "Ditandai Done Consult", category: "client", tone: "success" },
  "client.done_assessment": { label: "Ditandai Done Assessment", category: "client", tone: "success" },
  "client.discontinued": { label: "Client discontinued", category: "client", tone: "warning" },
  "client.discharged": { label: "Client di-discharge", category: "client", tone: "warning" },
  "client.reactivated": { label: "Client diaktifkan kembali", category: "client", tone: "success" },
  "client.document_added": { label: "Dokumen/GDrive ditambahkan", category: "client", tone: "neutral" },

  "assessment_code.issued": { label: "Kode kuesioner diterbitkan", category: "assessment", tone: "info" },
  "assessment_code.deleted": { label: "Kode kuesioner dihapus (belum diisi)", category: "assessment", tone: "warning" },
  "assessment_response.submitted": { label: "Kuesioner dikirim ortu", category: "assessment", tone: "success" },
  "assessment_response.viewed": { label: "Hasil asesmen dibuka", category: "assessment", tone: "neutral" },

  "schedule.created": { label: "Sesi dijadwalkan", category: "schedule", tone: "info" },
  "schedule.series_created": { label: "Jadwal berulang dibuat", category: "schedule", tone: "info" },
  "schedule.completed": { label: "Sesi completed", category: "schedule", tone: "success" },
  "schedule.completion_reverted": { label: "Completed dibatalkan", category: "schedule", tone: "revert" },
  "schedule.cancelled": { label: "Sesi dibatalkan", category: "schedule", tone: "warning" },
  "schedule.cancellation_reverted": { label: "Pembatalan sesi dibatalkan", category: "schedule", tone: "revert" },
  "schedule.rescheduled": { label: "Sesi dipindah", category: "schedule", tone: "info" },
  "schedule.reschedule_reverted": { label: "Pemindahan jadwal dibatalkan", category: "schedule", tone: "revert" },
  "schedule.marked_pending": { label: "Reschedule menggantung", category: "schedule", tone: "warning" },
  "schedule.pending_dropped": { label: "Sesi menggantung dibatalkan", category: "schedule", tone: "warning" },
  "schedule.pending_reverted": { label: "Reschedule menggantung dibatalkan (revert)", category: "schedule", tone: "revert" },
  "schedule.deleted": { label: "Sesi dihapus", category: "schedule", tone: "danger" },
  "schedule.report_saved": { label: "Laporan sesi disimpan", category: "schedule", tone: "neutral" },
  "schedule.bulk_completed": { label: "Bulk complete", category: "schedule", tone: "success" },
  "schedule.bulk_cancelled": { label: "Bulk cancel", category: "schedule", tone: "warning" },
  "schedule.bulk_rescheduled": { label: "Bulk reschedule", category: "schedule", tone: "info" },
  "schedule.bulk_reverted": { label: "Bulk revert", category: "schedule", tone: "revert" },

  "credit.package_activated": { label: "Paket kredit aktif", category: "credit", tone: "success" },
  "credit.used": { label: "Kredit terpakai", category: "credit", tone: "neutral" },
  "credit.cancel_excused": { label: "Cancel dalam kuota", category: "credit", tone: "neutral" },
  "credit.cancel_penalty": { label: "Penalti cancel (−1 kredit)", category: "credit", tone: "danger" },
  "credit.reversed": { label: "Mutasi kredit dibalik", category: "credit", tone: "revert" },

  "invoice.issued": { label: "Invoice diterbitkan", category: "finance", tone: "info" },
  "invoice.proof_uploaded": { label: "Bukti bayar diunggah", category: "finance", tone: "info" },
  "invoice.proof_viewed": { label: "Bukti bayar dibuka", category: "finance", tone: "neutral" },
  "invoice.verified": { label: "Pembayaran diverifikasi", category: "finance", tone: "success" },
  "invoice.rejected": { label: "Pembayaran ditolak", category: "finance", tone: "danger" },
  "invoice.renewal_created": { label: "Renewal paket", category: "finance", tone: "success" },
  "invoice.deleted": { label: "Invoice dihapus", category: "finance", tone: "danger" },
  "invoice.package_converted": { label: "Paket dikonversi", category: "finance", tone: "warning" },

  "user.created": { label: "Akun staf dibuat", category: "access", tone: "info" },
  "user.deleted": { label: "Akun staf dihapus", category: "access", tone: "danger" },
  "role.created": { label: "Role dibuat", category: "access", tone: "info" },
  "role.permission_changed": { label: "Hak akses role diubah", category: "access", tone: "warning" },

  "package.created": { label: "Paket master dibuat", category: "master", tone: "info" },
  "service.updated": { label: "Layanan diubah", category: "master", tone: "neutral" },
};

export const auditActionMeta = (action) =>
  AUDIT_ACTIONS[action] || { label: action, category: action.split(".")[0], tone: "neutral" };

export const auditCategoryLabel = (value) => AUDIT_CATEGORIES.find((c) => c.value === value)?.label || value;

export const newAuditBatchId = () => `bat-${uid().slice(0, 8)}`;

// Bentuk satu entri audit. `actor` = { type, id, name, role }.
export function buildAuditEntry({
  action,
  actor,
  branchId = null,
  entityType,
  entityId = null,
  entityLabel = null,
  subjectType = null,
  subjectId = null,
  subjectLabel = null,
  oldValues = null,
  newValues = null,
  meta = null,
  reason = null,
  revertsAuditId = null,
  batchId = null,
  source = "web",
  ipAddress = null,
  userAgent = null,
  occurredAt = new Date().toISOString(),
  id = `aud-${uid()}`,
}) {
  return {
    id,
    occurredAt,
    batchId,
    actorType: actor?.type || "user",
    actorId: actor?.id ?? null,
    actorName: actor?.name || "Sistem",
    actorRole: actor?.role || null,
    branchId,
    action,
    entityType,
    entityId,
    entityLabel,
    subjectType,
    subjectId,
    subjectLabel,
    oldValues,
    newValues,
    meta,
    reason,
    revertsAuditId,
    source,
    ipAddress,
    userAgent,
  };
}

// Daftar field yang berubah: [{ field, from, to }] (gabungan key old & new)
export function auditChanges(entry) {
  const oldV = entry?.oldValues || {};
  const newV = entry?.newValues || {};
  const keys = [...new Set([...Object.keys(oldV), ...Object.keys(newV)])];
  return keys.map((field) => ({ field, from: oldV[field] ?? null, to: newV[field] ?? null }));
}

// Map id log asal → log yang membatalkannya (untuk menandai "sudah dibatalkan")
export function indexReverts(entries) {
  const map = new Map();
  entries.forEach((e) => {
    if (e.revertsAuditId) map.set(e.revertsAuditId, e);
  });
  return map;
}

// Audit dicakup per cabang: user non-master hanya melihat log cabangnya.
// Log tanpa cabang (aksi global Master, mis. ubah RBAC) hanya terlihat oleh filter "all".
export const auditInBranch = (entry, branchFilter) => branchFilter === "all" || entry.branchId === branchFilter;
