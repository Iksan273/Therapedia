import { describe, expect, it } from "vitest";
import { dailySessionReport, formatHours, sessionHours } from "@/domain/schedule";

const s = (over = {}) => ({ id: "s", clientId: "c1", date: "2026-10-22", startTime: "09:00", endTime: "10:00", status: "completed", ...over });
const names = { c1: "Aira", c2: "Bima", c3: "Citra" };

describe("rekap harian sesi selesai (report terapis)", () => {
  it("format jam", () => {
    expect(sessionHours(s({ startTime: "09:00", endTime: "10:30" }))).toBe(1.5);
    expect(formatHours(3)).toBe("3 Hours");
    expect(formatHours(1)).toBe("1 Hour");
    expect(formatHours(1.5)).toBe("1.5 Hours");
  });

  it("per tanggal: jumlah sesi, total jam, client unik; terbaru dulu", () => {
    const sessions = [
      s({ id: "1", date: "2026-10-22", startTime: "09:00", endTime: "10:00", clientId: "c1" }),
      s({ id: "2", date: "2026-10-22", startTime: "10:00", endTime: "11:00", clientId: "c2" }),
      s({ id: "3", date: "2026-10-22", startTime: "13:00", endTime: "14:00", clientId: "c1" }), // client sama → tidak dobel di daftar
      s({ id: "4", date: "2026-10-20", startTime: "09:00", endTime: "10:30", clientId: "c3" }),
    ];
    const { rows, totals } = dailySessionReport(sessions, (id) => names[id]);
    expect(rows.map((r) => r.date)).toEqual(["2026-10-22", "2026-10-20"]);
    expect(rows[0]).toMatchObject({ sessions: 3, hours: 3 });
    expect(rows[0].clients.map((c) => c.name)).toEqual(["Aira", "Bima"]);
    expect(rows[1]).toMatchObject({ sessions: 1, hours: 1.5 });
    expect(totals).toEqual({ days: 2, sessions: 4, hours: 4.5, clients: 3 });
  });

  it("tanpa sesi: kosong", () => {
    expect(dailySessionReport([])).toEqual({ rows: [], totals: { days: 0, sessions: 0, hours: 0, clients: 0 } });
  });
});
