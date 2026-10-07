import { describe, expect, it } from "vitest";
import {
  LEAVE_QUOTA_DAYS,
  activeLeaveOn,
  clientLeaveDateSet,
  dateRange,
  isLeaveOff,
  leaveCountedDates,
  leaveCountedDays,
  leaveDates,
  leaveDays,
  leavePolicyOf,
  leaveEffectiveEnd,
  leavePhase,
  leaveQuotaSummary,
  leaveSessionDates,
  planEarlyReturn,
  planLeave,
  remainingLeaveDays,
  satuanLeaveBlocked,
  usedLeaveDays,
} from "@/domain/leave";

const leave = (over = {}) => ({ id: "l1", clientId: "c1", startDate: "2026-10-10", endDate: "2026-10-24", status: "active", returnDate: null, ...over });
const session = (over = {}) => ({
  id: "s1",
  clientId: "c1",
  type: "therapy",
  status: "scheduled",
  date: "2026-10-12",
  startTime: "09:00",
  endTime: "10:00",
  therapistId: "t1",
  ...over,
});
const offLeave = (id, date, over = {}) => session({ id, status: "cancelled", date, leaveId: "l1", ...over });

describe("domain/leave — rentang log (penampung)", () => {
  it("dateRange inklusif, kosong bila terbalik", () => {
    expect(dateRange("2026-10-10", "2026-10-12")).toEqual(["2026-10-10", "2026-10-11", "2026-10-12"]);
    expect(dateRange("2026-10-12", "2026-10-10")).toEqual([]);
  });

  it("rentang penuh = hari kalender inklusif (hanya info, bukan jatah)", () => {
    expect(leaveDays(leave())).toBe(15);
  });

  it("masuk lebih awal memotong rentang efektif (returnDate = hari pertama masuk)", () => {
    const l = leave({ returnDate: "2026-10-15" });
    expect(leaveEffectiveEnd(l)).toBe("2026-10-14");
    expect(leaveDays(l)).toBe(5);
  });

  it("void tidak punya rentang berlaku; masuk kembali di hari mulai = 0", () => {
    expect(leaveDays(leave({ status: "voided" }))).toBe(0);
    expect(leaveEffectiveEnd(leave({ status: "voided" }))).toBeNull();
    expect(leaveDays(leave({ returnDate: "2026-10-10" }))).toBe(0);
  });
});

describe("domain/leave — jatah (hari hitung sesi pertama–terakhir)", () => {
  const counted = (over = {}) => leave({ countedStart: "2026-10-12", countedEnd: "2026-10-16", ...over });

  it("leaveCountedDates: hari kalender sesi pertama s.d. terakhir; void = 0; masuk lebih awal memotong", () => {
    expect(leaveCountedDays(counted())).toBe(5);
    expect(leaveCountedDays(counted({ status: "voided" }))).toBe(0);
    expect(leaveCountedDates(counted({ returnDate: "2026-10-14" }))).toEqual(["2026-10-12", "2026-10-13"]);
    expect(leaveCountedDays(counted({ returnDate: "2026-10-10" }))).toBe(0);
    expect(leaveCountedDays(leave())).toBe(15); // log lama tanpa countedStart/End memakai rentang log
  });

  it("tanpa log/Off: belum memakai jatah", () => {
    expect(usedLeaveDays({ schedules: [], leaves: [], clientId: "c1" })).toBe(0);
  });

  it("hanya log cuti Finance yang memakai saldo; sesi cancelled biasa (tanpa log) tidak", () => {
    const schedules = [
      session({ id: "d", status: "cancelled", date: "2026-11-02" }), // Cancel / Off biasa: tidak memakai jatah
      session({ id: "e", status: "cancelled", date: "2026-11-03", countsAsLeave: true }), // flag lama diabaikan
    ];
    expect(usedLeaveDays({ schedules, leaves: [counted()], clientId: "c1" })).toBe(5); // hanya 5 hari log
    expect(usedLeaveDays({ schedules, leaves: [counted()], clientId: "c2" })).toBe(0);
  });

  it("since (reset jatah): pemakaian sebelum tanggal reset tidak dihitung", () => {
    expect(usedLeaveDays({ schedules: [], leaves: [counted()], clientId: "c1", since: "2026-10-14" })).toBe(3);
  });

  it("sisa tidak negatif; ringkasan menandai over; bawaan 30 bila tanpa jatah paket", () => {
    const big = counted({ countedStart: "2026-01-01", countedEnd: "2026-02-04" }); // 35 hari
    expect(remainingLeaveDays({ schedules: [], leaves: [big], clientId: "c1" })).toBe(0);
    expect(remainingLeaveDays({ schedules: [], leaves: [big], clientId: "c2" })).toBe(LEAVE_QUOTA_DAYS);
    expect(leaveQuotaSummary({ schedules: [], leaves: [big], clientId: "c1", granted: 10 })).toMatchObject({ quota: 10, used: 35, remaining: 0, over: 25 });
  });

  it("leavePolicyOf: jatah dari record kredit, bawaan 30", () => {
    expect(leavePolicyOf({ leaveGranted: 6, leaveResetAt: "2026-10-01" })).toEqual({ granted: 6, since: "2026-10-01" });
    expect(leavePolicyOf(null)).toEqual({ granted: LEAVE_QUOTA_DAYS, since: null });
  });

  it("satuanLeaveBlocked: ada hari cuti di bulan yang sama (log cuti)", () => {
    expect(satuanLeaveBlocked({ leaves: [counted()], clientId: "c1", dates: ["2026-10-25"] })).toBe(true);
    expect(satuanLeaveBlocked({ leaves: [counted()], clientId: "c1", dates: ["2026-11-02"] })).toBe(false);
    expect(satuanLeaveBlocked({ leaves: [counted()], clientId: "c1", dates: ["2026-10-25"], ignoreLeaveId: "l1" })).toBe(false);
  });

  it("leaveSessionDates: tanggal sesi Off tertaut satu log, bisa difilter tahun", () => {
    const schedules = [offLeave("a", "2026-12-30"), offLeave("b", "2027-01-02"), offLeave("c", "2026-12-30", { leaveId: "l2" })];
    expect([...leaveSessionDates(leave(), schedules)].sort()).toEqual(["2026-12-30", "2027-01-02"]);
    expect([...leaveSessionDates(leave(), schedules, 2027)]).toEqual(["2027-01-02"]);
  });
});

describe("domain/leave — planLeave", () => {
  const base = { clientId: "c1", startDate: "2026-10-07", endDate: "2026-10-14" };

  it("hari cuti = sesi pertama s.d. terakhir (8–12 Okt = 5), bukan hari kalender rentang", () => {
    const schedules = [
      session({ id: "in1", date: "2026-10-08" }),
      session({ id: "in2", date: "2026-10-12", status: "rescheduled" }),
      session({ id: "out", date: "2026-10-20" }),
      session({ id: "done", date: "2026-10-11", status: "completed" }),
      session({ id: "asm", date: "2026-10-09", type: "assessment" }),
      session({ id: "other", date: "2026-10-13", clientId: "c2" }),
    ];
    const plan = planLeave({ ...base, leaves: [], schedules });
    expect(plan.ok).toBe(true);
    expect(plan.days).toBe(5);
    expect([plan.countedStart, plan.countedEnd]).toEqual(["2026-10-08", "2026-10-12"]);
    expect(plan.sessions.map((s) => s.id)).toEqual(["in1", "in2"]);
    expect(plan.balance).toEqual({ quota: LEAVE_QUOTA_DAYS, used: 0, adding: 5, after: 5, remaining: 25, over: 0 });
    expect(plan.warnings).toEqual([]);
  });

  it("ditolak bila client tidak punya sesi terapi di rentang", () => {
    const plan = planLeave({ ...base, leaves: [], schedules: [session({ date: "2026-10-20" })] });
    expect(plan.ok).toBe(false);
    expect(plan.errors.join(" ")).toMatch(/belum punya jadwal/i);
  });

  it("menolak rentang terbalik dan yang bertumpuk dengan cuti aktif", () => {
    const schedules = [session({ date: "2026-10-12" })];
    expect(planLeave({ ...base, startDate: "2026-10-15", endDate: "2026-10-10", leaves: [], schedules }).ok).toBe(false);
    const overlap = planLeave({ ...base, startDate: "2026-10-10", endDate: "2026-10-14", leaves: [leave()], schedules });
    expect(overlap.ok).toBe(false);
    expect(overlap.errors.join(" ")).toMatch(/bertumpuk/i);
  });

  it("cuti void / yang sudah selesai lebih awal tidak memblokir rentang yang dilepas", () => {
    const schedules = [session({ date: "2026-10-13" })];
    const r = { clientId: "c1", startDate: "2026-10-13", endDate: "2026-10-14", schedules };
    expect(planLeave({ ...r, leaves: [leave({ status: "voided" })] }).ok).toBe(true);
    expect(planLeave({ ...r, leaves: [leave({ returnDate: "2026-10-12" })] }).ok).toBe(true);
    expect(planLeave({ ...r, startDate: "2026-10-11", leaves: [leave({ returnDate: "2026-10-12" })], schedules: [session({ date: "2026-10-11" })] }).ok).toBe(false); // 10-11 masih berlaku
  });

  it("melewati jatah hanya peringatan, tetap ok", () => {
    const schedules = [session({ id: "a", date: "2026-10-01" }), session({ id: "b", date: "2026-10-12" })]; // 12 hari
    const plan = planLeave({ clientId: "c1", startDate: "2026-10-01", endDate: "2026-10-12", leaves: [], schedules, granted: 10 });
    expect(plan.ok).toBe(true);
    expect(plan.balance).toMatchObject({ adding: 12, over: 2 });
    expect(plan.warnings).toHaveLength(1);
  });

  it("reset (since) mengabaikan pemakaian lama; log aktif lain tidak dihitung dua kali", () => {
    const other = leave({ id: "l9", countedStart: "2026-10-11", countedEnd: "2026-10-11", startDate: "2026-10-11", endDate: "2026-10-11" });
    const schedules = [session({ id: "p", date: "2026-10-10" }), session({ id: "q", date: "2026-10-12" })];
    const plan = planLeave({ ...base, startDate: "2026-10-10", endDate: "2026-10-12", leaves: [{ ...other, startDate: "2026-10-20", endDate: "2026-10-20" }], schedules });
    expect(plan.balance).toMatchObject({ used: 1, adding: 2, after: 3 });
    expect(planLeave({ ...base, leaves: [], schedules, since: "2026-10-12" }).balance).toMatchObject({ used: 0, adding: 1 });
  });

  it("paket satuan: ditolak bila bulan itu sudah ada cuti, boleh di bulan lain", () => {
    const schedules = [session({ date: "2026-10-26" })];
    const args = { clientId: "c1", startDate: "2026-10-25", endDate: "2026-10-26", leaves: [leave()], schedules, isSatuan: true };
    const blocked = planLeave(args);
    expect(blocked.ok).toBe(false);
    expect(blocked.errors.join(" ")).toMatch(/1x cuti/i);
    expect(planLeave({ ...args, isSatuan: false }).ok).toBe(true);
    expect(planLeave({ ...args, leaves: [], isSatuan: true }).ok).toBe(true);
  });
});

describe("domain/leave — planEarlyReturn", () => {
  const therapists = [{ id: "t1", name: "Terapis 1" }];
  const cl = (over = {}) => leave({ countedStart: "2026-10-12", countedEnd: "2026-10-17", ...over }); // hari hitung 12–17 Okt (6 hari)
  const offs = [
    offLeave("s1", "2026-10-12"),
    offLeave("s2", "2026-10-15"),
    offLeave("s3", "2026-10-17"),
    session({ id: "manual", status: "cancelled", date: "2026-10-18" }), // Off manual: tidak tersentuh
  ];

  it("mengembalikan sesi Off cuti pada/sesudah tanggal masuk kembali; hari jatah = hari hitung setelah tanggal masuk kembali", () => {
    const plan = planEarlyReturn({ leave: cl(), returnDate: "2026-10-15", schedules: offs, therapists });
    expect(plan.ok).toBe(true);
    expect(plan.isVoid).toBe(false);
    expect(plan.restorable.map((s) => s.id)).toEqual(["s2", "s3"]);
    expect(plan.daysReturned).toBe(3); // 15, 16, 17
    expect(plan.conflicted).toEqual([]);
  });

  it("dua sesi di hari yang sama tetap dihitung per hari", () => {
    const schedules = [...offs, offLeave("s2b", "2026-10-12", { startTime: "13:00", endTime: "14:00" })];
    expect(planEarlyReturn({ leave: cl(), returnDate: "2026-10-15", schedules, therapists }).daysReturned).toBe(3);
    expect(planEarlyReturn({ leave: cl(), returnDate: "2026-10-01", schedules, therapists }).daysReturned).toBe(6);
  });

  it("slot yang sudah terisi dilewati dan dilaporkan; tidak dihitung kembali sebagai sesi aktif tapi tetap lepas dari log", () => {
    const schedules = [...offs, session({ id: "x", clientId: "c2", date: "2026-10-15" })];
    const plan = planEarlyReturn({ leave: cl(), returnDate: "2026-10-15", schedules, therapists });
    expect(plan.restorable.map((s) => s.id)).toEqual(["s3"]);
    expect(plan.conflicted.map((s) => s.id)).toEqual(["s2"]);
    expect(plan.daysReturned).toBe(3); // 15, 16, 17
  });

  it("tanggal masuk kembali <= tanggal mulai = void penuh", () => {
    const plan = planEarlyReturn({ leave: cl(), returnDate: "2026-10-01", schedules: offs, therapists });
    expect(plan.isVoid).toBe(true);
    expect(plan.returnDate).toBe("2026-10-10");
    expect(plan.daysReturned).toBe(6);
    expect(plan.restorable.map((s) => s.id)).toEqual(["s1", "s2", "s3"]);
  });

  it("menolak bila lewat akhir cuti, tanpa tanggal, atau cuti sudah void", () => {
    expect(planEarlyReturn({ leave: cl(), returnDate: "2026-10-30", schedules: [], therapists }).ok).toBe(false);
    expect(planEarlyReturn({ leave: cl(), returnDate: "", schedules: [], therapists }).ok).toBe(false);
    expect(planEarlyReturn({ leave: leave({ status: "voided" }), returnDate: "2026-10-12", schedules: [], therapists }).ok).toBe(false);
  });

  it("tanpa sesi Off tertaut: tetap ok; hari hitung log tetap kembali ke jatah", () => {
    const plan = planEarlyReturn({ leave: cl(), returnDate: "2026-10-15", schedules: [], therapists });
    expect(plan).toMatchObject({ ok: true, daysReturned: 3 });
    expect(plan.restorable).toEqual([]);
  });
});

describe("domain/leavePhase", () => {
  it("menurunkan fase dari status, tanggal masuk kembali, dan hari ini", () => {
    expect(leavePhase(leave({ status: "voided" }), "2026-10-12")).toBe("voided");
    expect(leavePhase(leave({ returnDate: "2026-10-15" }), "2026-10-12")).toBe("early");
    expect(leavePhase(leave(), "2026-10-01")).toBe("upcoming");
    expect(leavePhase(leave(), "2026-10-12")).toBe("ongoing");
    expect(leavePhase(leave(), "2026-11-01")).toBe("done");
  });
});

describe("domain/leave — jadwal baru di tanggal cuti", () => {
  it("activeLeaveOn: hanya log aktif client itu pada hari efektif", () => {
    const l = leave({ returnDate: "2026-10-15" }); // efektif 10..14
    expect(activeLeaveOn([l], "c1", "2026-10-12")?.id).toBe("l1");
    expect(activeLeaveOn([l], "c1", "2026-10-15")).toBeNull(); // sudah masuk kembali
    expect(activeLeaveOn([l], "c2", "2026-10-12")).toBeNull();
    expect(activeLeaveOn([leave({ status: "voided" })], "c1", "2026-10-12")).toBeNull();
  });

  it("clientLeaveDateSet: gabungan tanggal rentang cuti aktif client", () => {
    const set = clientLeaveDateSet([leave({ endDate: "2026-10-11" }), leave({ id: "l2", clientId: "c2" })], "c1");
    expect([...set]).toEqual(["2026-10-10", "2026-10-11"]);
  });
});

describe("domain/leave — badge", () => {
  it("isLeaveOff: hanya sesi cancelled yang tertaut log cuti", () => {
    expect(isLeaveOff(session({ status: "cancelled", leaveId: "l1" }))).toBe(true);
    expect(isLeaveOff(session({ status: "cancelled", countsAsLeave: true }))).toBe(false);
    expect(isLeaveOff(session({ status: "cancelled" }))).toBe(false);
    expect(isLeaveOff(session({ status: "scheduled", leaveId: "l1" }))).toBe(false);
  });

  it("leaveDates konsisten dengan leaveDays", () => {
    expect(leaveDates(leave()).length).toBe(leaveDays(leave()));
  });
});
