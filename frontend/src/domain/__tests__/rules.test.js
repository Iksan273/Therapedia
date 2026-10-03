import { advanceStatus, buildActivationPatch, canReactivateClient, dischargeReasonLabel, isActiveClient, isQuestionnaireCodeFilled, matchesRosterStatus, PIPELINE_STATUSES } from "@/domain/client";
import { buildRecurringSchedules, canRevertSession, cancelReasonLabel, checkConflicts, restoreSlotOf, restoreStatusOf, filterSessionsByDate, findTherapistClashIds, getOriginSlot } from "@/domain/schedule";
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
  const therapists = [{ id: "t-1", name: "Terapis A" }];
  const base = { therapistId: "t-1", date: "2026-10-05", therapists };

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
  test("tidak ada konsep jam kerja: jam bebas selama terapis kosong", () => {
    expect(checkConflicts({ ...base, startTime: "13:00", endTime: "14:00", schedules: [] })).toHaveLength(0);
    expect(checkConflicts({ ...base, date: "2026-10-11", startTime: "20:00", endTime: "21:00", schedules: [] })).toHaveLength(0);
  });
  test("berurutan (back-to-back) dan terapis lain tidak bentrok", () => {
    const schedules = [
      { id: "s-1", therapistId: "t-1", date: "2026-10-05", startTime: "09:00", endTime: "10:00", status: "scheduled" },
      { id: "s-2", therapistId: "t-2", date: "2026-10-05", startTime: "10:00", endTime: "11:00", status: "scheduled" },
    ];
    expect(checkConflicts({ ...base, startTime: "10:00", endTime: "11:00", schedules })).toHaveLength(0);
  });
});

describe("label alasan (string: pilihan cepat atau teks custom)", () => {
  const list = [{ value: "macet", label: "Terjebak Macet" }];
  test("kode pilihan cepat → label dari daftar master", () => {
    expect(cancelReasonLabel("macet", list)).toBe("Terjebak Macet");
    expect(cancelReasonLabel("sakit")).toBe("Sakit / Kondisi Medis");
    expect(dischargeReasonLabel("graduate")).toBe("Tercapai Target (Graduated)");
  });
  test("teks custom ditampilkan apa adanya; kode lama & kosong tetap aman", () => {
    expect(cancelReasonLabel("Anak sedang ujian sekolah")).toBe("Anak sedang ujian sekolah");
    expect(dischargeReasonLabel("Pindah ke luar negeri")).toBe("Pindah ke luar negeri");
    expect(cancelReasonLabel("lainnya")).toBe("Alasan Lainnya");
    expect(dischargeReasonLabel("other")).toBe("Lainnya");
    expect(cancelReasonLabel(null)).toBe("—");
  });
  test("alasan sistem reschedule_dibatalkan tetap berlabel walau tidak ada di daftar master", () => {
    expect(cancelReasonLabel("reschedule_dibatalkan", list)).toContain("tidak dilanjutkan");
  });
});

describe("isQuestionnaireCodeFilled", () => {
  test("kode baru mengikuti status issued / submitted", () => {
    const client = { assessmentAnswers: [{ categoryId: "cat-001" }] };
    expect(isQuestionnaireCodeFilled(client, { code: "ASM-1", categoryId: "cat-001", status: "issued" })).toBe(false);
    expect(isQuestionnaireCodeFilled(client, { code: "ASM-2", categoryId: "cat-001", status: "submitted" })).toBe(true);
  });
  test("kode lama tanpa status: terisi bila ada jawaban untuk kategorinya", () => {
    const client = { assessmentAnswers: [{ categoryId: "cat-001" }] };
    expect(isQuestionnaireCodeFilled(client, { code: "ASM-3", categoryId: "cat-001" })).toBe(true);
    expect(isQuestionnaireCodeFilled(client, { code: "ASM-4", categoryId: "cat-002" })).toBe(false);
    expect(isQuestionnaireCodeFilled({}, { code: "ASM-5", categoryId: "cat-001" })).toBe(false);
  });
});

describe("revert sesi", () => {
  test("hanya completed / cancelled yang bisa di-revert", () => {
    expect(canRevertSession({ status: "completed" })).toBe(true);
    expect(canRevertSession({ status: "cancelled" })).toBe(true);
    expect(canRevertSession({ status: "scheduled" })).toBe(false);
    expect(canRevertSession({ status: "rescheduled", rescheduledFrom: { date: "2026-10-01" } })).toBe(true);
    expect(canRevertSession({ status: "rescheduled" })).toBe(false);
    expect(canRevertSession(null)).toBe(false);
  });
  test("revert reschedule: kembali ke slot asal dengan status scheduled", () => {
    const s = { status: "rescheduled", date: "2026-10-08", startTime: "10:00", endTime: "11:00", therapistId: "t-2", rescheduledFrom: { date: "2026-10-05", startTime: "09:00", endTime: "10:00", therapistId: "t-1" } };
    expect(restoreStatusOf(s)).toBe("scheduled");
    expect(restoreSlotOf(s)).toEqual(s.rescheduledFrom);
    expect(restoreSlotOf({ status: "completed", date: "2026-10-08", startTime: "10:00", endTime: "11:00", therapistId: "t-2" })).toMatchObject({ date: "2026-10-08", therapistId: "t-2" });
  });
  test("status tujuan: previousStatus bila ada, kalau tidak ditebak dari jejak reschedule", () => {
    expect(restoreStatusOf({ status: "completed", previousStatus: "rescheduled" })).toBe("rescheduled");
    expect(restoreStatusOf({ status: "cancelled", previousStatus: "reschedule_pending" })).toBe("reschedule_pending");
    expect(restoreStatusOf({ status: "completed" })).toBe("scheduled");
    expect(restoreStatusOf({ status: "completed", rescheduledFrom: { date: "2026-10-01" } })).toBe("rescheduled");
  });
});

describe("findTherapistClashIds", () => {
  const mk = (id, therapistId, startTime, endTime, status = "scheduled", date = "2026-10-05") => ({ id, therapistId, date, startTime, endTime, status });
  test("overlap sebagian pada terapis & tanggal sama = bentrok keduanya", () => {
    const ids = findTherapistClashIds([mk("a", "t-1", "09:00", "10:00"), mk("b", "t-1", "09:30", "10:30"), mk("c", "t-1", "11:00", "12:00")]);
    expect([...ids].sort()).toEqual(["a", "b"]);
  });
  test("back-to-back, terapis berbeda, tanggal berbeda = aman", () => {
    const ids = findTherapistClashIds([
      mk("a", "t-1", "09:00", "10:00"),
      mk("b", "t-1", "10:00", "11:00"),
      mk("c", "t-2", "09:00", "10:00"),
      mk("d", "t-1", "09:00", "10:00", "scheduled", "2026-10-06"),
    ]);
    expect(ids.size).toBe(0);
  });
  test("cancelled & reschedule_pending diabaikan", () => {
    const ids = findTherapistClashIds([mk("a", "t-1", "09:00", "10:00"), mk("b", "t-1", "09:00", "10:00", "cancelled"), mk("c", "t-1", "09:00", "10:00", "reschedule_pending")]);
    expect(ids.size).toBe(0);
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

describe("Client Roster (active / discharged / discontinued)", () => {
  const active = { status: "admitted" };
  const discharged = { status: "discharged", dateOfDischarge: "2026-08-01" };
  const discontinued = { status: "discontinued" };
  const inquiry = { status: "inquiry" };

  test("discharged termasuk status pipeline", () => {
    expect(PIPELINE_STATUSES).toContain("discharged");
  });
  test("filter status roster", () => {
    expect([active, discharged, discontinued, inquiry].filter((c) => matchesRosterStatus(c, "all"))).toHaveLength(3);
    expect(matchesRosterStatus(active, "active")).toBe(true);
    expect(matchesRosterStatus(discharged, "active")).toBe(false);
    expect(matchesRosterStatus(discharged, "discharged")).toBe(true);
    expect(matchesRosterStatus(discontinued, "discontinued")).toBe(true);
  });
  test("hanya discharged/discontinued yang bisa diaktifkan kembali", () => {
    expect(canReactivateClient(discharged)).toBe(true);
    expect(canReactivateClient(discontinued)).toBe(true);
    expect(canReactivateClient(active)).toBe(false);
    expect(isActiveClient(active)).toBe(true);
    expect(isActiveClient(inquiry)).toBe(false);
  });
  test("buildActivationPatch: pertahankan tanggal join, kosongkan data discharge", () => {
    const patch = buildActivationPatch({ ...discharged, dateOfJoin: "2026-01-10", dischargeReason: "moving" }, "2026-10-03");
    expect(patch).toMatchObject({ status: "admitted", dateOfJoin: "2026-01-10", dateOfDischarge: null, dischargeReason: null, dischargeNote: null });
    expect(buildActivationPatch(discontinued, "2026-10-03").dateOfJoin).toBe("2026-10-03");
  });
});
