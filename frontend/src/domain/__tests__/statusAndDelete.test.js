import { buildActivationPatch, buildStatusChangePatch } from "@/domain/client";
import { canDeleteIn, roleCanDelete } from "@/domain/rbac";

describe("ubah status manual ke tahap mana pun", () => {
  const client = { status: "discontinued", dateOfJoin: "2026-01-05", dateOfDiscontinue: "2026-09-01", dischargeReason: "other", dischargeNote: "pindah" };

  test("kembali ke tahap awal: outcome dan data keluar dikosongkan", () => {
    expect(buildStatusChangePatch(client, "inquiry", "2026-10-03")).toMatchObject({
      status: "inquiry",
      finalOutcome: null,
      dateOfDischarge: null,
      dateOfDiscontinue: null,
      dischargeReason: null,
      dischargeNote: null,
    });
    expect(buildStatusChangePatch({ status: "admitted" }, "assessment_done", "2026-10-03").status).toBe("assessment_done");
  });

  test("admitted memakai aktivasi (tanggal bergabung asal dipertahankan, tanggal discontinue dikosongkan)", () => {
    const patch = buildStatusChangePatch(client, "admitted", "2026-10-03");
    expect(patch).toEqual(buildActivationPatch(client, "2026-10-03"));
    expect(patch).toMatchObject({ status: "admitted", dateOfJoin: "2026-01-05", dateOfDiscontinue: null });
  });

  test("discontinued mencatat tanggal discontinue (field sendiri) dan alasan", () => {
    const patch = buildStatusChangePatch({ status: "admitted" }, "discontinued", "2026-10-03", { reason: " tidak lanjut " });
    expect(patch).toMatchObject({ status: "discontinued", finalOutcome: "discontinued", dateOfDiscontinue: "2026-10-03", dateOfDischarge: null, dischargeNote: "tidak lanjut" });
  });

  test("discharged mencatat tanggal discharge dan alasan; done_* mengisi finalOutcome", () => {
    expect(buildStatusChangePatch({ status: "admitted" }, "discharged", "2026-10-03", { reason: "graduate", note: "target tercapai" })).toMatchObject({
      status: "discharged",
      dateOfDischarge: "2026-10-03",
      dateOfDiscontinue: null,
      dischargeReason: "graduate",
      dischargeNote: "target tercapai",
    });
    expect(buildStatusChangePatch({ status: "assessment_done" }, "done_consult", "2026-10-03")).toMatchObject({ status: "done_consult", finalOutcome: "done_consult" });
  });
});

describe("hak hapus per role (akses modul = semua aksi kecuali hapus)", () => {
  const roles = [
    { id: "master", canDelete: true },
    { id: "admin_inquiry" },
    { id: "manager", canDelete: true },
    { id: "custom_x", canDelete: false },
  ];
  const permissions = { manager: { inquiry_pipeline: true, finance: false }, admin_inquiry: { inquiry_pipeline: true }, custom_x: { inquiry_pipeline: true } };

  test("master selalu boleh; role tanpa flag default tidak boleh; flag eksplisit menang", () => {
    expect(roleCanDelete("master", roles)).toBe(true);
    expect(roleCanDelete("admin_inquiry", roles)).toBe(false);
    expect(roleCanDelete("manager", roles)).toBe(true);
    expect(roleCanDelete("custom_x", roles)).toBe(false);
    expect(roleCanDelete(null, roles)).toBe(false);
    expect(roleCanDelete("master", [])).toBe(true);
  });

  test("hapus butuh flag canDelete DAN akses modul", () => {
    const check = (roleId, moduleKey) => canDeleteIn({ roleId, rolesList: roles, permissions, moduleKey });
    expect(check("manager", "inquiry_pipeline")).toBe(true);
    expect(check("manager", "finance")).toBe(false); // flag ya, tapi tanpa akses modul finance
    expect(check("admin_inquiry", "inquiry_pipeline")).toBe(false); // akses modul ya, tapi flag tidak
    expect(check("master", "finance")).toBe(true);
  });
});
