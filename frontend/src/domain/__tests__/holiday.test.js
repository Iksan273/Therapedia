import { buildRecurringSchedules, isReportEmpty, isUnreportedSession, reportFilledCount } from "@/domain/schedule";
import { DEFAULT_HOLIDAYS, findHoliday, holidayDateSet, holidaysForBranch, expandHolidayRange, isHoliday, makeHoliday, validateHoliday, validateHolidayRange } from "@/domain/holiday";

describe("hari libur", () => {
  const holidays = [
    { id: "h1", date: "2026-12-25", name: "Natal", branchId: null },
    { id: "h2", date: "2026-12-26", name: "Libur cabang Timur", branchId: "branch-sby-timur" },
  ];

  test("libur semua cabang dan libur khusus cabang", () => {
    expect(isHoliday(holidays, "2026-12-25", "branch-citraland")).toBe(true);
    expect(isHoliday(holidays, "2026-12-26", "branch-sby-timur")).toBe(true);
    expect(isHoliday(holidays, "2026-12-26", "branch-citraland")).toBe(false);
    expect(findHoliday(holidays, "2026-12-27")).toBeNull();
    expect(holidaysForBranch(holidays, "branch-citraland").map((h) => h.id)).toEqual(["h1"]);
    expect([...holidayDateSet(holidays, "branch-sby-timur")].sort()).toEqual(["2026-12-25", "2026-12-26"]);
  });

  test("validateHoliday: wajib isi, tidak duplikat pada cakupan yang sama", () => {
    expect(validateHoliday(holidays, { date: "", name: "x" })).toMatch(/Tanggal/);
    expect(validateHoliday(holidays, { date: "2026-12-30", name: " " })).toMatch(/Nama/);
    expect(validateHoliday(holidays, { date: "2026-12-25", name: "Natal lagi" })).toMatch(/sudah terdaftar/);
    expect(validateHoliday(holidays, { date: "2026-12-25", name: "Natal Timur", branchId: "branch-sby-timur" })).toBeNull();
    expect(makeHoliday({ date: "2026-12-30", name: "  Cuti  " })).toMatchObject({ date: "2026-12-30", name: "Cuti", branchId: null });
    expect(DEFAULT_HOLIDAYS.every((h) => /^\d{4}-\d{2}-\d{2}$/.test(h.date))).toBe(true);
  });

  test("jadwal berulang melewati tanggal libur (tidak dibuatkan sesi)", () => {
    // Senin 2026-12-21 + 3 minggu mingguan: 21 Des, 28 Des, 4 Jan; libur 28 Des
    const base = { id: "s-0", clientId: "c-1", therapistId: "t-1", date: "2026-12-21", startTime: "09:00", endTime: "10:00", type: "therapy" };
    const all = buildRecurringSchedules(base, 3, ["Monday"], {});
    expect(all.map((s) => s.date)).toEqual(["2026-12-21", "2026-12-28", "2027-01-04"]);
    const skipped = buildRecurringSchedules(base, 3, ["Monday"], {}, new Set(["2026-12-28"]));
    expect(skipped.map((s) => s.date)).toEqual(["2026-12-21", "2027-01-04"]);
    // tanpa pilihan hari (mingguan tunggal) juga melewati libur
    expect(buildRecurringSchedules(base, 3, [], {}, new Set(["2026-12-28"])).map((s) => s.date)).toEqual(["2026-12-21", "2027-01-04"]);
  });
});

describe("laporan sesi belum diisi (monitoring)", () => {
  test("hitung bagian terisi dan sesi completed tanpa laporan", () => {
    expect(reportFilledCount({ activitySection: "a", noteSection: " ", homeworkSection: "" })).toBe(1);
    expect(isReportEmpty({})).toBe(true);
    expect(isReportEmpty({ noteSection: "x" })).toBe(false);
    expect(isUnreportedSession({ status: "completed" })).toBe(true);
    expect(isUnreportedSession({ status: "completed", homeworkSection: "PR" })).toBe(false);
    expect(isUnreportedSession({ status: "scheduled" })).toBe(false);
    expect(isUnreportedSession(null)).toBe(false);
  });
});

import { deriveRecurringRoutines, upcomingActiveSessions } from "@/domain/schedule";

describe("jadwal rutin dan jadwal aktif di detail client", () => {
  const s = (id, date, startTime, extra = {}) => ({ id, date, startTime, endTime: "10:00", therapistId: "t-1", type: "therapy", status: "scheduled", ...extra });
  const today = "2026-10-05";

  test("jadwal aktif: hanya sesi mendatang berstatus scheduled / rescheduled / pending, urut terdekat", () => {
    const list = [s("a", "2026-10-12", "09:00"), s("b", "2026-10-05", "08:00"), s("c", "2026-10-04", "08:00"), s("d", "2026-10-06", "08:00", { status: "cancelled" }), s("e", "2026-10-07", "08:00", { status: "reschedule_pending" }), s("f", "2026-10-08", "08:00", { status: "completed" })];
    expect(upcomingActiveSessions(list, today).map((x) => x.id)).toEqual(["b", "e", "a"]);
  });

  test("jadwal rutin: pola hari + jam + terapis yang berulang atau bertanda recurring; asesmen & pending tidak dihitung", () => {
    const list = [
      s("1", "2026-10-05", "09:00"), // Senin
      s("2", "2026-10-12", "09:00"), // Senin (pola sama → rutin)
      s("3", "2026-10-07", "13:00"), // Rabu sekali → bukan rutin
      s("4", "2026-10-08", "14:00", { isRecurring: true }), // Kamis, bertanda recurring → rutin
      s("5", "2026-10-09", "10:00", { type: "assessment" }),
      s("6", "2026-10-19", "09:00", { status: "reschedule_pending" }),
    ];
    const routines = deriveRecurringRoutines(list, today);
    expect(routines.map((r) => [r.day, r.startTime, r.count])).toEqual([["Senin", "09:00", 2], ["Kamis", "14:00", 1]]);
  });

  test("rentang tanggal libur: diurai per hari, divalidasi per tanggal", () => {
    const holidays = [{ id: "h1", date: "2026-12-25", name: "Natal", branchId: null }];
    expect(expandHolidayRange("2026-12-30", "2027-01-02")).toEqual(["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
    expect(expandHolidayRange("2026-12-30", "")).toEqual(["2026-12-30"]);
    expect(expandHolidayRange("2026-12-30", "2026-12-29")).toEqual([]);
    expect(validateHolidayRange(holidays, { start: "2026-12-30", end: "2026-12-29", name: "x" })).toMatch(/sebelum/);
    expect(validateHolidayRange(holidays, { start: "2026-12-24", end: "2026-12-26", name: "Cuti" })).toMatch(/sudah terdaftar.*2026-12-25/);
    expect(validateHolidayRange(holidays, { start: "2026-12-27", end: "2026-12-29", name: "Cuti" })).toBeNull();
    expect(validateHolidayRange(holidays, { start: "2026-01-01", end: "2028-01-01", name: "Cuti" })).toMatch(/maksimal/);
  });
});
