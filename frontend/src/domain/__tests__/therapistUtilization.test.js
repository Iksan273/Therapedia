import { describe, expect, it } from "vitest";
import { buildTherapistUtilization, capacityForRange } from "@/domain/therapistUtilization";
import { DEFAULT_MAX_SESSIONS_PER_MONTH, maxSessionsOf, validateMaxSessions } from "@/domain/workHours";
import { periodRange } from "@/shared/lib/periods";

// Oktober 2026: 1 Okt = Kamis. Hari kerja = Senin–Sabtu → 31 hari − 4 Minggu (4, 11, 18, 25) = 27 hari kerja.
const t1 = { id: "t1", name: "Terapis 1", branchId: "b1", specialty: "OT", maxSessionsPerMonth: 54 }; // 2 sesi per hari kerja
const t2 = { id: "t2", name: "Terapis 2", branchId: "b2", specialty: "ST" }; // bawaan 100
const s = (over = {}) => ({ id: "s1", therapistId: "t1", date: "2026-10-05", startTime: "09:00", endTime: "10:00", status: "scheduled", ...over });
const month = { from: "2026-10-01", to: "2026-10-31" };

describe("domain/workHours — maks sesi per bulan", () => {
  it("bawaan 100; angka terapis dipakai bila valid", () => {
    expect(maxSessionsOf(t2)).toBe(DEFAULT_MAX_SESSIONS_PER_MONTH);
    expect(maxSessionsOf(t1)).toBe(54);
    expect(maxSessionsOf({ maxSessionsPerMonth: "abc" })).toBe(100);
  });
  it("validasi bilangan bulat 1..744", () => {
    expect(validateMaxSessions(120)).toBeNull();
    expect(validateMaxSessions(0)).toMatch(/minimal 1/);
    expect(validateMaxSessions(2.5)).toMatch(/bilangan bulat/);
    expect(validateMaxSessions(1000)).toMatch(/744/);
  });
});

describe("domain/therapistUtilization", () => {
  it("sebulan penuh: kapasitas = maks sesi sebulan; terisi = jumlah jam sesi; rate = terisi ÷ kapasitas", () => {
    const schedules = [s(), s({ id: "s2", startTime: "10:00", endTime: "11:00" }), s({ id: "s3", date: "2026-10-06", startTime: "09:00", endTime: "10:30" })]; // 3,5 jam
    const { rows, total } = buildTherapistUtilization({ therapists: [t1], schedules, holidays: [], ...month });
    expect(rows[0]).toMatchObject({ capacitySessions: 54, filledSessions: 3.5, availableSessions: 50.5, utilizationRate: 6, availabilityRate: 94 });
    expect(total).toMatchObject({ capacitySessions: 54, filledSessions: 3.5 });
  });

  it("filter disesuaikan: kapasitas periode = porsi hari kerja bulan itu (minggu 5–10 Okt = 6 dari 27 hari kerja)", () => {
    const week = { from: "2026-10-05", to: "2026-10-11" }; // Sen–Sab = 6 hari kerja, Minggu tidak dihitung
    expect(capacityForRange({ maxSessions: 54, ...week })).toBe(12);
    const { rows } = buildTherapistUtilization({ therapists: [t1], schedules: [s(), s({ id: "s2", startTime: "10:00", endTime: "11:00" }), s({ id: "out", date: "2026-10-14" })], ...week });
    expect(rows[0]).toMatchObject({ capacitySessions: 12, filledSessions: 2, utilizationRate: 17, availabilityRate: 83 }); // sesi 14 Okt di luar filter
  });

  it("rentang lintas bulan dihitung proporsional per bulan; hari libur cabang mengurangi hari kerja", () => {
    // 28 Sep (Sen) – 3 Okt (Sab): September 2026 punya 26 hari kerja (30 − 4 Minggu), 28–30 Sep = 3 hari; Oktober 1–3 = 3 hari dari 27
    const cross = capacityForRange({ maxSessions: 54, from: "2026-09-28", to: "2026-10-03" });
    expect(Math.round(cross * 100) / 100).toBe(Math.round(((54 * 3) / 26 + (54 * 3) / 27) * 100) / 100);
    const holidays = [{ id: "h", date: "2026-10-05", name: "Libur", branchId: "b1" }];
    expect(capacityForRange({ maxSessions: 54, from: "2026-10-05", to: "2026-10-05", holidays, branchId: "b1" })).toBe(0);
    expect(capacityForRange({ maxSessions: 54, ...month, holidays, branchId: "b1" })).toBe(54); // bulan penuh tetap = maks sesi
    expect(capacityForRange({ maxSessions: 54, from: "2026-10-05", to: "2026-10-05", holidays, branchId: "b2" })).toBe(2); // libur cabang lain
  });

  it("cancelled / reschedule_pending tidak mengisi sesi; sesi 90 menit = 1,5 sesi", () => {
    const schedules = [s({ status: "cancelled" }), s({ id: "p", status: "reschedule_pending" }), s({ id: "ok", startTime: "13:00", endTime: "14:30" })];
    expect(buildTherapistUtilization({ therapists: [t1], schedules, ...month }).rows[0].filledSessions).toBe(1.5);
  });

  it("agregat per cabang dan filter cabang", () => {
    const schedules = [s(), s({ id: "x", therapistId: "t2", startTime: "09:00", endTime: "12:00" })];
    const all = buildTherapistUtilization({ therapists: [t1, t2], schedules, ...month });
    expect(all.branches.map((b) => [b.branchId, b.capacitySessions, b.filledSessions])).toEqual([["b1", 54, 1], ["b2", 100, 3]]);
    expect(all.total).toMatchObject({ capacitySessions: 154, filledSessions: 4 });
    expect(buildTherapistUtilization({ therapists: [t1, t2], schedules, branchId: "b2", ...month }).rows.map((r) => r.therapistId)).toEqual(["t2"]);
  });

  it("kapasitas 0 → rate 0 tanpa pembagian nol; terisi melebihi kapasitas = 100%", () => {
    const sunday = { from: "2026-10-11", to: "2026-10-11" };
    expect(buildTherapistUtilization({ therapists: [t1], schedules: [], ...sunday }).rows[0]).toMatchObject({ capacitySessions: 0, utilizationRate: 0, availabilityRate: 0 });
    const heavy = Array.from({ length: 5 }, (_, i) => s({ id: `h${i}`, date: "2026-10-05", startTime: "08:00", endTime: "12:00" }));
    expect(buildTherapistUtilization({ therapists: [t1], schedules: heavy, from: "2026-10-05", to: "2026-10-05" }).rows[0]).toMatchObject({ capacitySessions: 2, utilizationRate: 100, availabilityRate: 0 });
  });
});

describe("shared/lib/periods — periodRange", () => {
  const now = new Date(2026, 9, 7); // Rabu, 7 Okt 2026
  it("rentang tertutup per preset; all/custom tak lengkap = null", () => {
    expect(periodRange("this_week", "", "", now)).toEqual({ from: "2026-10-05", to: "2026-10-11" });
    expect(periodRange("this_month", "", "", now)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(periodRange("last_month", "", "", now)).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(periodRange("custom", "2026-10-01", "2026-10-03", now)).toEqual({ from: "2026-10-01", to: "2026-10-03" });
    expect(periodRange("custom", "", "2026-10-03", now)).toBeNull();
    expect(periodRange("all", "", "", now)).toBeNull();
  });
});
