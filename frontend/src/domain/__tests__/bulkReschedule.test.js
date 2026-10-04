import { planBulkReschedule } from "@/domain/schedule";

const mk = (id, over = {}) => ({
  id, therapistId: "t1", date: "2030-01-07", startTime: "09:00", endTime: "10:00", status: "scheduled", branchId: "b1", ...over,
});
const therapists = [{ id: "t1", name: "Ayu" }, { id: "t2", name: "Budi" }];

describe("planBulkReschedule (atomik)", () => {
  test("tujuan berbeda per sesi, semua aman", () => {
    const schedules = [mk("a"), mk("b", { startTime: "11:00", endTime: "12:00" })];
    const rows = [
      { id: "a", date: "2030-01-08", startTime: "09:00", endTime: "10:00", therapistId: "t1" },
      { id: "b", date: "2030-01-10", startTime: "13:00", endTime: "14:00", therapistId: "t2" },
    ];
    expect(planBulkReschedule({ rows, schedules, therapists }).ok).toBe(true);
  });

  test("satu baris bentrok dengan sesi lain → ok false, baris lain tetap bersih", () => {
    const schedules = [mk("a"), mk("b", { startTime: "11:00", endTime: "12:00" }), mk("x", { date: "2030-01-08", startTime: "09:30", endTime: "10:30" })];
    const rows = [
      { id: "a", date: "2030-01-08", startTime: "09:00", endTime: "10:00", therapistId: "t1" },
      { id: "b", date: "2030-01-09", startTime: "11:00", endTime: "12:00", therapistId: "t1" },
    ];
    const plan = planBulkReschedule({ rows, schedules, therapists });
    expect(plan.ok).toBe(false);
    expect(Object.keys(plan.issues)).toEqual(["a"]);
  });

  test("dua sesi dalam batch yang sama saling bentrok terdeteksi", () => {
    const schedules = [mk("a"), mk("b", { startTime: "11:00", endTime: "12:00" })];
    const rows = [
      { id: "a", date: "2030-01-08", startTime: "09:00", endTime: "10:00", therapistId: "t1" },
      { id: "b", date: "2030-01-08", startTime: "09:30", endTime: "10:30", therapistId: "t1" },
    ];
    const plan = planBulkReschedule({ rows, schedules, therapists });
    expect(Object.keys(plan.issues).sort()).toEqual(["a", "b"]);
  });

  test("slot asal yang ditinggalkan sesi lain dalam batch boleh dipakai", () => {
    const schedules = [mk("a"), mk("b", { date: "2030-01-08" })];
    const rows = [
      { id: "a", date: "2030-01-08", startTime: "09:00", endTime: "10:00", therapistId: "t1" },
      { id: "b", date: "2030-01-09", startTime: "09:00", endTime: "10:00", therapistId: "t1" },
    ];
    expect(planBulkReschedule({ rows, schedules, therapists }).ok).toBe(true);
  });

  test("hari libur, belum berubah, dan jam terbalik ditolak", () => {
    const holidays = [{ id: "h", date: "2030-01-08", name: "Libur", branchId: null }];
    const schedules = [mk("a"), mk("b"), mk("c")];
    const rows = [
      { id: "a", date: "2030-01-08", startTime: "09:00", endTime: "10:00", therapistId: "t1" },
      { id: "b", date: "2030-01-07", startTime: "09:00", endTime: "10:00", therapistId: "t1" },
      { id: "c", date: "2030-01-09", startTime: "10:00", endTime: "09:00", therapistId: "t2" },
    ];
    const plan = planBulkReschedule({ rows, schedules, therapists, holidays });
    expect(Object.keys(plan.issues).sort()).toEqual(["a", "b", "c"]);
  });
});
