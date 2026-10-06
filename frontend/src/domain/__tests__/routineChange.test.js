import { defaultRoutineWeeks, deriveRecurringRoutines, planRoutineChange, routineKeyOf, routineSessionsToRemove, seriesPeriod } from "@/domain/schedule";

// 2026-10-05 = Senin
const mk = (id, date, extra = {}) => ({ id, clientId: "c1", type: "therapy", status: "scheduled", date, startTime: "09:00", endTime: "10:00", therapistId: "t1", ...extra });
const therapists = [{ id: "t1", name: "Rina" }, { id: "t2", name: "Dewi" }];
const monday = ["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"].map((d, i) => mk(`m${i}`, d, { isRecurring: true }));
const rowOf = (s, extra = {}) => ({ originalKey: routineKeyOf(s), weekday: 1, startTime: s.startTime, endTime: s.endTime, therapistId: s.therapistId, ...extra });

describe("ganti / hapus jadwal rutin", () => {
  test("hanya sesi scheduled pada pola & tanggal >= from yang dihapus", () => {
    const sessions = [...monday, mk("done", "2026-10-12", { status: "completed" }), mk("moved", "2026-10-19", { startTime: "13:00", endTime: "14:00" }), mk("past", "2026-09-28")];
    const ids = routineSessionsToRemove(sessions, [routineKeyOf(monday[0])], "2026-10-12").map((s) => s.id);
    expect(ids.sort()).toEqual(["m1", "m2", "m3"]);
  });

  test("ganti per hari: pindah Senin 09:00 → Rabu 10:00, sesi lama terhapus & sesi baru dibuat", () => {
    const r = planRoutineChange({
      sessions: monday, from: "2026-10-12", weeks: 3, therapists,
      rows: [rowOf(monday[0], { weekday: 3, startTime: "10:00", endTime: "11:00" })],
      template: { clientId: "c1", branchId: "b1", creditPackageId: "cp1", createdBy: "Admin" },
    });
    expect(r.removeIds.sort()).toEqual(["m1", "m2", "m3"]);
    expect(r.createList.map((s) => s.date)).toEqual(["2026-10-14", "2026-10-21", "2026-10-28"]);
    expect(r.createList.every((s) => s.status === "scheduled" && s.isRecurring && s.recurrenceRule === "weekly_Wednesday" && s.creditPackageId === "cp1")).toBe(true);
    expect(new Set(r.createList.map((s) => s.id)).size).toBe(3);
    expect(r.conflicts).toEqual([]);
  });

  test("baris tidak berubah dibiarkan; baris dihapus hanya menghapus tanpa membuat sesi baru", () => {
    expect(planRoutineChange({ sessions: monday, from: "2026-10-05", rows: [rowOf(monday[0])], therapists })).toMatchObject({ removeIds: [], createList: [] });
    const del = planRoutineChange({ sessions: monday, from: "2026-10-05", rows: [rowOf(monday[0], { removed: true })], therapists });
    expect(del.removeIds).toHaveLength(4);
    expect(del.createList).toEqual([]);
  });

  test("ganti keseluruhan: hapus semua pola lama + buat hari baru; hari libur dilewati", () => {
    const r = planRoutineChange({
      sessions: monday, from: "2026-10-05", weeks: 2, therapists, holidayDates: new Set(["2026-10-13"]),
      rows: [rowOf(monday[0], { removed: true }), { originalKey: null, weekday: 2, startTime: "09:00", endTime: "10:00", therapistId: "t2" }],
      template: { clientId: "c1" },
    });
    expect(r.removeIds).toHaveLength(4);
    expect(r.createList.map((s) => s.date)).toEqual(["2026-10-06"]);
    expect(r.skippedHoliday).toBe(1);
  });

  test("bentrok terapis dengan client lain dilaporkan (sesi lama yang dihapus tidak dihitung)", () => {
    const other = mk("x1", "2026-10-14", { clientId: "c2", therapistId: "t2", startTime: "10:00", endTime: "11:00" });
    const r = planRoutineChange({
      sessions: [...monday, other], from: "2026-10-12", weeks: 1, therapists,
      rows: [rowOf(monday[0], { weekday: 3, startTime: "10:00", endTime: "11:00", therapistId: "t2" })],
    });
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0]).toMatch(/2026-10-14/);
  });

  test("rutinitas membawa tanggal mulai & akhir dari sesi terjadwal pada pola itu", () => {
    const [r] = deriveRecurringRoutines(monday, "2026-10-05");
    expect([r.nextDate, r.lastDate, r.count]).toEqual(["2026-10-05", "2026-10-26", 4]);
  });

  test("minggu bawaan dari sesi terjadwal terakhir (min 4, 12 bila kosong)", () => {
    expect(defaultRoutineWeeks([], "2026-10-05")).toBe(12);
    expect(defaultRoutineWeeks(monday, "2026-10-05")).toBe(4);
    expect(defaultRoutineWeeks([mk("far", "2027-01-04")], "2026-10-05")).toBe(14);
  });
});

describe("paket kredit pada rutin", () => {
  test("ganti hanya paket kredit = sesi lama diganti sesi baru dengan paket baru", () => {
    const s = ["2026-10-05", "2026-10-12"].map((d, i) => mk(`p${i}`, d, { creditPackageId: "cp-old" }));
    const r = planRoutineChange({ sessions: s, from: "2026-10-05", weeks: 2, therapists, rows: [rowOf(s[0], { creditPackageId: "cp-new", originalPackageId: "cp-old" })], template: { creditPackageId: "cp-old" } });
    expect(r.removeIds).toHaveLength(2);
    expect(r.createList).toHaveLength(2);
    expect(r.createList.every((x) => x.creditPackageId === "cp-new")).toBe(true);
  });

  test("hari baru memakai paket pilihan barisnya; tanpa pilihan ikut template", () => {
    const withPkg = planRoutineChange({ sessions: [], from: "2026-10-05", weeks: 1, therapists, rows: [{ originalKey: null, weekday: 2, startTime: "09:00", endTime: "10:00", therapistId: "t1", creditPackageId: "cp-2" }], template: { creditPackageId: "cp-1" } });
    expect(withPkg.createList[0].creditPackageId).toBe("cp-2");
    const noPkg = planRoutineChange({ sessions: [], from: "2026-10-05", weeks: 1, therapists, rows: [{ originalKey: null, weekday: 2, startTime: "09:00", endTime: "10:00", therapistId: "t1" }], template: { creditPackageId: "cp-1" } });
    expect(noPkg.createList[0].creditPackageId).toBe("cp-1");
  });
});

describe("masa berlaku seri", () => {
  test("semua hari satu seri berbagi mulai & akhir (termasuk sesi yang sudah lewat/selesai); seri lain terpisah", () => {
    const a1 = mk("a1", "2026-09-28", { seriesId: "A", status: "completed" });
    const a2 = mk("a2", "2026-10-07", { seriesId: "A", startTime: "11:00", endTime: "12:00" });
    const a3 = mk("a3", "2026-10-28", { seriesId: "A", startTime: "11:00", endTime: "12:00" });
    const b1 = mk("b1", "2026-10-10", { seriesId: "B" });
    expect(seriesPeriod([a1, a2, a3, b1], "A")).toEqual({ start: "2026-09-28", end: "2026-10-28" });
    expect(seriesPeriod([a1, a2, a3, b1], "B")).toEqual({ start: "2026-10-10", end: "2026-10-10" });
    expect(seriesPeriod([a1], "Z")).toBeNull();
  });

  test("data lama tanpa seriesId dianggap satu seri; penggantian membuat satu seriesId baru untuk semua sesi baru", () => {
    expect(seriesPeriod(monday, null)).toEqual({ start: "2026-10-05", end: "2026-10-26" });
    const r = planRoutineChange({ sessions: [], from: "2026-10-05", weeks: 2, therapists, rows: [
      { originalKey: null, weekday: 1, startTime: "09:00", endTime: "10:00", therapistId: "t1" },
      { originalKey: null, weekday: 3, startTime: "10:00", endTime: "11:00", therapistId: "t2" },
    ] });
    const ids = new Set(r.createList.map((s) => s.seriesId));
    expect(ids.size).toBe(1);
    expect([...ids][0]).toBeTruthy();
  });
});
