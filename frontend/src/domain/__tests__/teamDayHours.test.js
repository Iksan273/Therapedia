import { teamDayHours } from "@/domain/schedule";

describe("teamDayHours (jam kalender tim: bawaan 09:00–18:00, melebar mengikuti sesi hari itu)", () => {
  test("tanpa sesi: 09:00 sampai 17:00 (selesai 18:00)", () => {
    const h = teamDayHours([]);
    expect(h[0]).toBe("09:00");
    expect(h[h.length - 1]).toBe("17:00");
    expect(h).toHaveLength(9);
  });

  test("sesi di dalam rentang tidak mengubah baris", () => {
    expect(teamDayHours([{ startTime: "10:00", endTime: "11:00" }])).toHaveLength(9);
  });

  test("sesi lebih pagi atau lebih malam memperlebar rentang", () => {
    const early = teamDayHours([{ startTime: "08:00", endTime: "09:00" }]);
    expect(early[0]).toBe("08:00");
    const late = teamDayHours([{ startTime: "18:00", endTime: "19:00" }]);
    expect(late[late.length - 1]).toBe("18:00");
    const half = teamDayHours([{ startTime: "17:30", endTime: "18:30" }]);
    expect(half[half.length - 1]).toBe("18:00");
  });
});
