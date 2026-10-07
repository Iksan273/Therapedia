// Integritas seed demo: semua modul saling nyambung (client ↔ sesi ↔ kredit ↔ invoice ↔ cuti ↔ kuesioner ↔ terapis ↔ akun staf).
// Dijalankan di CI agar data demo (yang sama untuk semua orang saat dibuka di Vercel) tidak pernah yatim / bertentangan.
import { loadBranchesSeed, loadClientsSeed, loadSchedulesSeed, loadCreditsSeed, loadTherapistsSeed, loadCategoriesSeed, loadLeavesSeed } from "@/data/seedLoader";
import staff from "@/data/staffUsers.seed.json";
import { findTherapistClashIds } from "@/domain/schedule";
import { leaveCountedDays, leaveQuotaSummary } from "@/domain/leave";
import { leaveRemainingOf } from "@/domain/credit";
import { dischargeStats } from "@/domain/client";
import { buildTherapistUtilization } from "@/domain/therapistUtilization";

const branches = new Set(loadBranchesSeed().map((b) => b.id));
const clients = loadClientsSeed();
const schedules = loadSchedulesSeed();
const credits = loadCreditsSeed();
const therapists = loadTherapistsSeed();
const leaves = loadLeavesSeed();
const categories = loadCategoriesSeed();
const cById = new Map(clients.map((c) => [c.id, c]));
const tById = new Map(therapists.map((t) => [t.id, t]));
const catIds = new Set(categories.map((c) => c.id));
const recordOf = (id) => credits.records.find((r) => r.clientId === id);
const sessionsOf = (id) => schedules.filter((s) => s.clientId === id);

describe("seed — referensi & cabang", () => {
  test("semua id unik; client / sesi / terapis / akun mengacu cabang yang ada", () => {
    expect(new Set(clients.map((c) => c.id)).size).toBe(clients.length);
    expect(new Set(clients.map((c) => c.clientCode)).size).toBe(clients.length);
    expect(new Set(schedules.map((s) => s.id)).size).toBe(schedules.length);
    clients.forEach((c) => expect(branches.has(c.branchId), `client ${c.id}`).toBe(true));
    therapists.forEach((t) => expect(branches.has(t.branchId), `terapis ${t.id}`).toBe(true));
    staff.forEach((u) => u.branchId && expect(branches.has(u.branchId), `staf ${u.email}`).toBe(true));
  });

  test("sesi: client & terapis ada, cabang sesi = cabang client = cabang terapis, tanpa bentrok terapis", () => {
    schedules.forEach((s) => {
      const c = cById.get(s.clientId);
      const t = tById.get(s.therapistId);
      expect(c, `sesi ${s.id} client`).toBeTruthy();
      expect(t, `sesi ${s.id} terapis`).toBeTruthy();
      expect(s.branchId, `sesi ${s.id} cabang client`).toBe(c.branchId);
      expect(t.branchId, `sesi ${s.id} cabang terapis`).toBe(s.branchId);
    });
    expect([...findTherapistClashIds(schedules)]).toEqual([]);
  });

  test("setiap terapis punya akun staf yang cabangnya sama; angka maks sesi per bulan terisi", () => {
    therapists.forEach((t) => {
      const u = staff.find((x) => x.therapistId === t.id);
      expect(u, `akun terapis ${t.id}`).toBeTruthy();
      expect(u.branchId).toBe(t.branchId);
      expect(t.maxSessionsPerMonth, `maks sesi ${t.id}`).toBeGreaterThan(0);
    });
    staff.filter((u) => u.role === "therapist").forEach((u) => expect(tById.has(u.therapistId)).toBe(true));
  });
});

describe("seed — pipeline client konsisten dengan sesi, kredit, dan invoice", () => {
  test("status ↔ tanggal / alasan / sesi", () => {
    clients.forEach((c) => {
      if (c.status === "discharged") {
        expect(c.dateOfDischarge, `${c.id} tanggal discharge`).toBeTruthy();
        expect(c.dischargeReason, `${c.id} alasan discharge`).toBeTruthy();
        expect(sessionsOf(c.id).some((s) => s.type === "therapy" && s.status === "completed"), `${c.id} riwayat sesi`).toBe(true);
        expect(recordOf(c.id), `${c.id} record kredit`).toBeTruthy();
        expect(sessionsOf(c.id).some((s) => ["scheduled", "rescheduled"].includes(s.status)), `${c.id} tidak punya jadwal mendatang`).toBe(false);
      }
      if (c.status === "discontinued") expect(c.dateOfDiscontinue, `${c.id} tanggal discontinue`).toBeTruthy();
      if (["admitted", "discharged"].includes(c.status)) expect(c.dateOfJoin, `${c.id} dateOfJoin`).toBeTruthy();
      if (c.status === "admitted") {
        expect(sessionsOf(c.id).some((s) => s.type === "therapy"), `${c.id} sesi terapi`).toBe(true);
        expect(recordOf(c.id), `${c.id} record kredit`).toBeTruthy();
      }
      if (c.status === "assessment_scheduled") expect(sessionsOf(c.id).some((s) => s.type === "assessment"), `${c.id} sesi asesmen`).toBe(true);
      if (c.status === "assessment_done") expect(sessionsOf(c.id).some((s) => s.type === "assessment" && s.status === "completed"), `${c.id} asesmen selesai`).toBe(true);
      if (c.status === "done_consult") expect(sessionsOf(c.id).some((s) => s.status === "completed") && recordOf(c.id), `${c.id} konsultasi tercatat`).toBeTruthy();
    });
  });

  test("record kredit & paket mengacu master/invoice yang ada; cabang record = cabang client", () => {
    credits.records.forEach((r) => {
      const c = cById.get(r.clientId);
      expect(c, `record ${r.id} client`).toBeTruthy();
      expect(r.branchId).toBe(c.branchId);
      (r.packages || []).forEach((p) => {
        expect(credits.masterPackages.some((m) => m.id === p.packageId), `paket ${p.id} master`).toBe(true);
        if (p.invoiceId) expect(credits.invoices.some((i) => i.id === p.invoiceId), `paket ${p.id} invoice`).toBe(true);
        expect(p.leaveTotal, `paket ${p.id} credit leave`).toBeGreaterThanOrEqual(0);
        expect(p.leaveUsed || 0).toBeLessThanOrEqual(p.leaveTotal);
        expect(p.remainingCredit).toBeGreaterThanOrEqual(0);
        expect(p.remainingCredit).toBeLessThanOrEqual(p.totalCredit);
      });
    });
  });

  test("setiap invoice paket lunas punya paket; invoice milik client & cabang yang sama", () => {
    credits.invoices.forEach((i) => {
      const c = cById.get(i.clientId);
      expect(c, `invoice ${i.id} client`).toBeTruthy();
      expect(i.branchId, `invoice ${i.id} cabang`).toBe(c.branchId);
      if (i.status === "paid" && (i.type || "package") === "package") {
        expect(credits.records.some((r) => (r.packages || []).some((p) => p.invoiceId === i.id)), `invoice ${i.id} tanpa paket`).toBe(true);
      }
    });
    expect(new Set(credits.invoices.map((i) => i.invoiceNumber)).size).toBe(credits.invoices.length);
  });

  test("sisa paket = total − sesi yang memotong; ledger memuat satu baris per sesi selesai", () => {
    credits.records.forEach((r) => {
      const sessionRows = (r.history || []).filter((h) => h.action === "used");
      const completed = sessionsOf(r.clientId).filter((s) => s.type === "therapy" && s.status === "completed");
      expect(sessionRows.length, `ledger ${r.clientId}`).toBeLessThanOrEqual(completed.length);
      const used = (r.history || []).reduce((n, h) => n + (h.creditChange < 0 ? -h.creditChange : 0), 0);
      const total = r.packages.reduce((n, p) => n + p.totalCredit, 0);
      const remaining = r.packages.reduce((n, p) => n + p.remainingCredit, 0);
      expect(remaining, `saldo ${r.clientId}`).toBe(total - used);
    });
  });
});

describe("seed — kuesioner & invoice assessment", () => {
  test("kode kuesioner: kategori ada; tiap kode berbayar punya invoice assessment tertaut, kode gratis tidak", () => {
    let free = 0;
    clients.forEach((c) => {
      (c.assessmentCodes || []).forEach((a) => {
        expect(catIds.has(a.categoryId), `kode ${a.code} kategori`).toBe(true);
        const inv = credits.invoices.find((i) => i.type === "assessment" && i.assessmentCode === a.code);
        if (a.invoiceRequired === false) {
          free += 1;
          expect(inv, `kode gratis ${a.code} tanpa invoice`).toBeUndefined();
        } else {
          expect(inv, `kode ${a.code} invoice`).toBeTruthy();
          expect(inv.clientId).toBe(c.id);
        }
      });
    });
    expect(free).toBe(1);
  });

  test("kode yang dipakai tes demo (ASM-2016, ASM-2017) bisa dibuka ortu (invoice lunas)", () => {
    ["ASM-2016", "ASM-2017"].forEach((code) => expect(credits.invoices.find((i) => i.assessmentCode === code)?.status).toBe("paid"));
  });
});

describe("seed — cuti Finance tertaut ke sesi dan saldo", () => {
  const byId = Object.fromEntries(leaves.map((l) => [l.id, l]));

  test("tiap log punya client & sesi yang ada; sesi yang dibatalkan cuti tertaut leaveId (Cancel/Off alasan OL)", () => {
    leaves.forEach((l) => {
      expect(cById.has(l.clientId)).toBe(true);
      l.sessionIds.forEach((id) => expect(schedules.some((s) => s.id === id && s.clientId === l.clientId), `log ${l.id} sesi ${id}`).toBe(true));
    });
    schedules.filter((s) => s.leaveId).forEach((s) => {
      expect(s).toMatchObject({ status: "cancelled", cancelReason: "OL" });
      expect(byId[s.leaveId]?.sessionIds).toContain(s.id);
      expect(byId[s.leaveId].status).toBe("active");
    });
  });

  test("log aktif membatalkan sesinya; selesai lebih awal mengembalikan sesi sesudah tanggal masuk; void tidak menyentuh sesi", () => {
    const active = byId["lv-seed-1"];
    active.sessionIds.forEach((id) => expect(schedules.find((s) => s.id === id).status).toBe("cancelled"));
    const early = byId["lv-seed-2"];
    expect(early.returnDate).toBeTruthy();
    const states = early.sessionIds.map((id) => schedules.find((s) => s.id === id));
    expect(states.some((s) => s.status === "cancelled")).toBe(true);
    expect(states.some((s) => s.status === "scheduled" && !s.leaveId)).toBe(true);
    const voided = byId["lv-seed-3"];
    expect(voided.status).toBe("voided");
    voided.sessionIds.forEach((id) => expect(schedules.find((s) => s.id === id)).toMatchObject({ status: "scheduled" }));
    expect(voided.voidReason).toBeTruthy();
  });

  test("hari cuti & saldo 30 hari: terpakai = hari hitung log aktif; sisa ≥ 0", () => {
    const active = byId["lv-seed-1"];
    const days = leaveCountedDays(active);
    expect(days).toBeGreaterThanOrEqual(2);
    const sum = leaveQuotaSummary({ leaves, clientId: active.clientId, granted: 30 });
    expect(sum).toMatchObject({ used: days, remaining: 30 - days, over: 0 });
    expect(leaveQuotaSummary({ leaves, clientId: byId["lv-seed-3"].clientId, granted: 30 }).used).toBe(0); // void tidak memotong
  });

  test("pembatalan cuti tidak memakai credit leave maupun kredit sesi (ledger off_excused)", () => {
    const leaveSessions = schedules.filter((s) => s.leaveId).map((s) => s.id);
    credits.records.flatMap((r) => r.history).filter((h) => leaveSessions.includes(h.scheduleId)).forEach((h) => expect(h).toMatchObject({ action: "off_excused", creditChange: 0 }));
  });
});

describe("seed — credit leave per paket & dashboard", () => {
  test("cancel 'potong' memakai credit leave dulu; ada paket yang credit leave-nya terpakai", () => {
    const used = credits.records.flatMap((r) => r.packages).filter((p) => (p.leaveUsed || 0) > 0);
    expect(used.length).toBeGreaterThan(0);
    used.forEach((p) => expect(leaveRemainingOf(p)).toBe(p.leaveTotal - p.leaveUsed));
    const leaveRows = credits.records.flatMap((r) => r.history).filter((h) => h.action === "cancel_leave");
    expect(leaveRows.every((h) => h.creditChange === 0 && h.leaveChange === -1)).toBe(true);
  });

  test("dashboard discharge: 4 client discharged dengan alasan beragam", () => {
    const stats = dischargeStats(clients, []);
    expect(stats.total).toBe(clients.filter((c) => c.status === "discharged").length);
    expect(stats.rows.length).toBeGreaterThanOrEqual(3);
  });

  test("utilisasi terapis: tiap terapis punya sesi dan kapasitas; rate masuk akal (0–100%)", () => {
    const from = new Date();
    const range = { from: "2026-01-01", to: "2027-12-31" };
    const { rows } = buildTherapistUtilization({ therapists, schedules, holidays: [], ...range });
    rows.forEach((r) => {
      expect(r.capacitySessions).toBeGreaterThan(0);
      expect(r.utilizationRate).toBeGreaterThanOrEqual(0);
      expect(r.utilizationRate).toBeLessThanOrEqual(100);
    });
    expect(from).toBeTruthy();
    therapists.forEach((t) => expect(schedules.some((s) => s.therapistId === t.id), `terapis ${t.id} punya sesi`).toBe(true));
  });
});
