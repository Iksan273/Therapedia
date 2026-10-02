import { subDays } from "date-fns";
import { auditActionMeta, auditChanges, auditInBranch, buildAuditEntry, indexReverts } from "@/domain/audit";
import { DEFAULT_PERMISSIONS, roleHasPermission, withDefaultPermissions } from "@/domain/rbac";
import { buildAuditSeed } from "@/data/auditSeed";
import clientsSeedRaw from "@/data/clients.seed.json";
import therapists from "@/data/therapists.seed.json";
import staff from "@/data/staffUsers.seed.json";
import { loadClientsSeed, loadCreditsSeed, loadSchedulesSeed } from "@/data/seedLoader";

describe("domain audit", () => {
  test("buildAuditEntry mengisi pelaku & default", () => {
    const e = buildAuditEntry({ action: "schedule.completed", actor: { type: "user", id: "usr-5", name: "Fajar", role: "admin_schedule" }, entityType: "schedule", entityId: "s-1", branchId: "b-1" });
    expect(e).toMatchObject({ actorName: "Fajar", actorRole: "admin_schedule", branchId: "b-1", source: "web", revertsAuditId: null });
    expect(e.id).toMatch(/^aud-/);
  });

  test("auditChanges menggabungkan field lama & baru", () => {
    expect(auditChanges({ oldValues: { status: "scheduled" }, newValues: { status: "completed", note: "x" } })).toEqual([
      { field: "status", from: "scheduled", to: "completed" },
      { field: "note", from: null, to: "x" },
    ]);
  });

  test("aksi tak dikenal tetap punya label & kategori", () => {
    expect(auditActionMeta("foo.bar")).toMatchObject({ label: "foo.bar", category: "foo", tone: "neutral" });
  });

  test("scope cabang: log global hanya untuk filter all", () => {
    expect(auditInBranch({ branchId: null }, "all")).toBe(true);
    expect(auditInBranch({ branchId: null }, "b-1")).toBe(false);
    expect(auditInBranch({ branchId: "b-1" }, "b-1")).toBe(true);
  });
});

describe("RBAC modul audit_logs", () => {
  test("default: master & manager boleh, role lain tidak", () => {
    expect(DEFAULT_PERMISSIONS.master.audit_logs).toBe(true);
    expect(DEFAULT_PERMISSIONS.manager.audit_logs).toBe(true);
    ["admin_inquiry", "admin_schedule", "finance", "therapist"].forEach((r) => expect(DEFAULT_PERMISSIONS[r].audit_logs).toBe(false));
  });

  test("matriks tersimpan lama (tanpa key baru) memakai default role", () => {
    const stored = { manager: { revenue: true } }; // browser lama: belum ada audit_logs
    expect(roleHasPermission("manager", stored, "audit_logs")).toBe(true);
    expect(roleHasPermission("finance", stored, "audit_logs")).toBe(false);
    expect(withDefaultPermissions(stored).manager).toMatchObject({ revenue: true, audit_logs: true });
  });

  test("nilai yang sudah diubah Master tetap dihormati", () => {
    expect(roleHasPermission("manager", { manager: { audit_logs: false } }, "audit_logs")).toBe(false);
  });
});

describe("seed audit demo", () => {
  const now = new Date();
  const entries = buildAuditSeed({
    clients: loadClientsSeed(),
    schedules: loadSchedulesSeed(),
    credits: loadCreditsSeed(),
    therapists,
    staff,
    now,
  });

  test("tersedia di setiap cabang dan berada dalam 45 hari terakhir", () => {
    const branches = new Set(clientsSeedRaw.map((c) => c.branchId));
    branches.forEach((b) => expect(entries.filter((e) => e.branchId === b).length).toBeGreaterThan(20));
    const cutoff = subDays(now, 46).toISOString();
    expect(entries.every((e) => e.occurredAt >= cutoff && e.occurredAt <= now.toISOString())).toBe(true);
  });

  test("urut terbaru dulu & id unik", () => {
    const sorted = [...entries].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    expect(entries.map((e) => e.occurredAt)).toEqual(sorted.map((e) => e.occurredAt));
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
  });

  test("contoh 'completed lalu dibatalkan' terhubung ke log asal", () => {
    const reverted = entries.filter((e) => e.action === "schedule.completion_reverted");
    expect(reverted.length).toBeGreaterThan(0);
    const reverts = indexReverts(entries);
    reverted.forEach((r) => {
      const original = entries.find((e) => e.id === r.revertsAuditId);
      expect(original).toMatchObject({ action: "schedule.completed", entityId: r.entityId });
      expect(reverts.get(original.id)).toBe(r);
      expect(r.reason).toBeTruthy();
    });
  });

  test("aksi global Master tanpa cabang", () => {
    expect(entries.some((e) => e.branchId === null && e.actorRole === "master")).toBe(true);
  });
});
