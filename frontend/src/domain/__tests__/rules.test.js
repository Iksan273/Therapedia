import { advanceStatus } from "@/domain/client";
import { buildRecurringSchedules, checkConflicts, filterSessionsByDate, getOriginSlot } from "@/domain/schedule";
import { roleHasPermission } from "@/domain/rbac";
import { keysToCamel, keysToSnake } from "@/shared/lib/caseConverter";

describe("advanceStatus (pipeline hanya maju)", () => {
  test("maju bila status sekarang sebelum target", () => {
    expect(advanceStatus("inquiry", "service_selected")).toBe("service_selected");
    expect(advanceStatus("service_selected", "assessment_done")).toBe("assessment_done");
  });
  test("tidak mundur dan tidak menyentuh status hasil akhir", () => {
    expect(advanceStatus("assessment_done", "assessment_scheduled")).toBe("assessment_done");
    expect(advanceStatus("admitted", "assessment_done")).toBe("admitted");
    expect(advanceStatus("discontinued", "assessment_done")).toBe("discontinued");
  });
});

describe("checkConflicts", () => {
  const therapists = [{ id: "t-1", name: "Terapis A", availableSlots: [{ day: "Monday", startTime: "08:00", endTime: "12:00" }] }];
  const base = { therapistId: "t-1", date: "2026-10-05", therapists }; // 2026-10-05 = Senin

  test("bentrok dengan sesi aktif terapis yang sama", () => {
    const schedules = [{ id: "s-1", therapistId: "t-1", date: "2026-10-05", startTime: "09:00", endTime: "10:00", status: "scheduled" }];
    expect(checkConflicts({ ...base, startTime: "09:30", endTime: "10:30", schedules })).toHaveLength(1);
  });
  test("sesi cancelled / reschedule_pending diabaikan", () => {
    const schedules = [
      { id: "s-1", therapistId: "t-1", date: "2026-10-05", startTime: "09:00", endTime: "10:00", status: "cancelled" },
      { id: "s-2", therapistId: "t-1", date: "2026-10-05", startTime: "09:00", endTime: "10:00", status: "reschedule_pending" },
    ];
    expect(checkConflicts({ ...base, startTime: "09:00", endTime: "10:00", schedules })).toHaveLength(0);
  });
  test("di luar jam kerja terapis", () => {
    expect(checkConflicts({ ...base, startTime: "13:00", endTime: "14:00", schedules: [] })).toHaveLength(1);
  });
});

describe("buildRecurringSchedules", () => {
  test("pola Senin & Kamis selama 2 minggu = 4 sesi", () => {
    const base = { id: "s-0", date: "2026-10-05", startTime: "09:00", endTime: "10:00", therapistId: "t-1" };
    const list = buildRecurringSchedules(base, 2, ["Monday", "Thursday"]);
    expect(list.map((s) => s.date)).toEqual(["2026-10-05", "2026-10-08", "2026-10-12", "2026-10-15"]);
    expect(list.every((s) => s.isRecurring)).toBe(true);
  });
});

describe("getOriginSlot", () => {
  test("sesi menggantung memakai pendingFrom, sesi pindahan memakai rescheduledFrom", () => {
    const slot = { date: "2026-10-01", startTime: "09:00", endTime: "10:00", therapistId: "t-1" };
    expect(getOriginSlot({ status: "reschedule_pending", pendingFrom: slot })).toBe(slot);
    expect(getOriginSlot({ status: "rescheduled", rescheduledFrom: slot })).toBe(slot);
    expect(getOriginSlot({ status: "scheduled" })).toBeNull();
  });
});

describe("roleHasPermission", () => {
  test("master selalu boleh; key legacy dipetakan", () => {
    expect(roleHasPermission("master", {}, "anything")).toBe(true);
    expect(roleHasPermission("admin_inquiry", { admin_inquiry: { inquiry_pipeline: true } }, "inquiry")).toBe(true);
    expect(roleHasPermission("custom_role", { custom_role: { finance: false } }, "finance")).toBe(false);
  });
});

describe("caseConverter", () => {
  test("camelCase ↔ snake_case bolak-balik (nested & array)", () => {
    const camel = { clientName: "A", creditPackages: [{ remainingCredit: 2 }] };
    const snake = { client_name: "A", credit_packages: [{ remaining_credit: 2 }] };
    expect(keysToSnake(camel)).toEqual(snake);
    expect(keysToCamel(snake)).toEqual(camel);
  });
});

describe("filterSessionsByDate (riwayat sesi portal ortu)", () => {
  const sessions = ["2026-09-01", "2026-09-15", "2026-09-30", "2026-10-02"].map((date, i) => ({ id: `s-${i}`, date }));
  test("rentang inklusif di kedua ujung", () => {
    expect(filterSessionsByDate(sessions, "2026-09-15", "2026-09-30").map((s) => s.date)).toEqual(["2026-09-15", "2026-09-30"]);
  });
  test("batas kosong = tidak dibatasi", () => {
    expect(filterSessionsByDate(sessions, "", "")).toHaveLength(4);
    expect(filterSessionsByDate(sessions, "2026-09-30", "")).toHaveLength(2);
    expect(filterSessionsByDate(sessions, "", "2026-09-01")).toHaveLength(1);
  });
  test("rentang terbalik menghasilkan kosong", () => {
    expect(filterSessionsByDate(sessions, "2026-10-01", "2026-09-01")).toHaveLength(0);
  });
});
