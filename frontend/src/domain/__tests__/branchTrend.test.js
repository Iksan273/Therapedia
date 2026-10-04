import { buildMonthlyIntakeTrend, trendMonthCount } from "@/domain/branch";

const now = new Date(2026, 9, 15); // 15 Okt 2026
const branches = [{ id: "a", name: "East" }, { id: "b", name: "West" }];
const clients = [
  { branchId: "a", createdAt: "2026-10-02T01:00:00Z" },
  { branchId: "a", createdAt: "2026-08-20T01:00:00Z" },
  { branchId: "b", createdAt: "2026-08-21T01:00:00Z" },
  { branchId: "b", createdAt: "2025-11-05T01:00:00Z" },
];

describe("buildMonthlyIntakeTrend", () => {
  test("jumlah bulan mengikuti rentang, berakhir di bulan berjalan", () => {
    expect(buildMonthlyIntakeTrend({ clients, branches, range: "3", now })).toHaveLength(3);
    expect(buildMonthlyIntakeTrend({ clients, branches, range: "12", now })).toHaveLength(12);
    expect(trendMonthCount("ytd", now)).toBe(10);
    const t = buildMonthlyIntakeTrend({ clients, branches, range: "3", now });
    expect(t.map((r) => r.month)).toEqual(["Aug 2026", "Sep 2026", "Oct 2026"]);
  });

  test("hitung per cabang per bulan", () => {
    const t = buildMonthlyIntakeTrend({ clients, branches, range: "3", now });
    expect(t[0]).toMatchObject({ East: 1, West: 1 });
    expect(t[2]).toMatchObject({ East: 1, West: 0 });
  });

  test("12 bulan menjangkau Nov 2025, 6 bulan tidak", () => {
    const sum = (r) => buildMonthlyIntakeTrend({ clients, branches, range: r, now }).reduce((n, x) => n + x.West, 0);
    expect(sum("12")).toBe(2);
    expect(sum("6")).toBe(1);
  });
});
