import { addDays, addWeeks, format, startOfWeek, subDays, subMonths } from "date-fns";
import branchesSeed from "@/data/branches.seed.json";
import clientsSeed from "@/data/clients.seed.json";
import therapistsSeed from "@/data/therapists.seed.json";
import schedulesSeed from "@/data/schedules.seed.json";
import creditsSeed from "@/data/credits.seed.json";
import categoriesSeed from "@/data/assessmentCategories.seed.json";
import leavesSeed from "@/data/leaves.seed.json";
import { reconcileDemoCredits } from "@/domain/creditSeed";

export function loadBranchesSeed() {
  return branchesSeed;
}

export function loadClientsSeed() {
  const now = new Date();
  return clientsSeed.map((raw) => {
    const { _birthdayThisMonth, _createdDaysAgo, _joinMonthsAgo, _dischargeMonthsAgo, ...client } = raw;
    if (_birthdayThisMonth && client.dob) {
      const parts = client.dob.split("-");
      client.dob = `${parts[0]}-${format(now, "MM")}-${parts[2]}`;
    }
    const created = subDays(now, _createdDaysAgo != null ? _createdDaysAgo : 30);
    client.createdAt = created.toISOString();
    client.updatedAt = created.toISOString();
    if (_joinMonthsAgo != null) {
      client.dateOfJoin = format(subMonths(now, _joinMonthsAgo), "yyyy-MM-dd");
    }
    if (_dischargeMonthsAgo != null) {
      client.dateOfDischarge = format(subMonths(now, _dischargeMonthsAgo), "yyyy-MM-dd");
    }
    // Client discontinued punya tanggal discontinue sendiri (±3 hari setelah dibuat, tidak melewati hari ini)
    if (client.status === "discontinued" && !client.dateOfDiscontinue) {
      const when = addDays(created, 3);
      client.dateOfDiscontinue = format(when > now ? now : when, "yyyy-MM-dd");
    }
    return client;
  });
}

// Tanggal sesi seed: minggu relatif terhadap minggu ini + hari (1 = Senin)
const weekDate = (now, weekOffset, dayOfWeek) =>
  format(addDays(addWeeks(startOfWeek(now, { weekStartsOn: 1 }), weekOffset != null ? weekOffset : 0), (dayOfWeek != null ? dayOfWeek : 1) - 1), "yyyy-MM-dd");

// Sesi yang dibatalkan oleh log cuti seed (kecuali yang dikembalikan lewat "selesai lebih awal"; log void tidak menyentuh sesi)
const leaveCancelledSessions = () => {
  const map = new Map();
  leavesSeed.forEach((l) => {
    if (l.status === "voided") return;
    const restored = new Set(l.restoredSessionIds || []);
    l.sessionIds.filter((id) => !restored.has(id)).forEach((id) => map.set(id, l));
  });
  return map;
};

function buildSchedulesSeed() {
  const now = new Date();
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  const today = format(now, "yyyy-MM-dd");
  const dateOf = (weekOffset, dayOfWeek) =>
    format(addDays(addWeeks(monday, weekOffset != null ? weekOffset : 0), (dayOfWeek != null ? dayOfWeek : 1) - 1), "yyyy-MM-dd");

  const leaveCancelled = leaveCancelledSessions();
  return schedulesSeed.map((raw) => {
    const { _weekOffset, _dayOfWeek, _movedFrom, _markedDaysAgo, ...schedule } = raw;
    schedule.date = dateOf(_weekOffset, _dayOfWeek);
    // Sesi terjadwal yang tanggalnya sudah lewat dianggap selesai, agar data demo tetap realistis kapan pun dibuka
    if (schedule.status === "scheduled" && schedule.date < today) schedule.status = "completed";
    const leave = leaveCancelled.get(schedule.id);
    if (leave && schedule.status === "scheduled") {
      // dibatalkan oleh log cuti Finance (Cancel / Off: alasan OL, tertaut leaveId)
      Object.assign(schedule, { status: "cancelled", previousStatus: "scheduled", cancelReason: "OL", cancelNote: `Cuti${leave.reason ? `: ${leave.reason}` : ""}`, leaveId: leave.id });
    }

    const markedAt = _markedDaysAgo != null ? subDays(now, _markedDaysAgo).toISOString() : now.toISOString();
    if (_movedFrom) {
      // Jejak jadwal asal sesi yang sudah dipindah
      schedule.rescheduledFrom = {
        date: dateOf(_movedFrom._weekOffset, _movedFrom._dayOfWeek),
        startTime: _movedFrom.startTime,
        endTime: _movedFrom.endTime,
        therapistId: _movedFrom.therapistId,
      };
      schedule.rescheduledAt = markedAt;
    }
    if (schedule.status === "reschedule_pending") {
      schedule.pendingFrom = { date: schedule.date, startTime: schedule.startTime, endTime: schedule.endTime, therapistId: schedule.therapistId };
      schedule.pendingAt = markedAt;
    }
    return schedule;
  });
}

// Paket + ledger kredit dibangun ulang dari jadwal (reconcileDemoCredits) agar sisa paket, log, saldo rupiah, dan paket tiap
// sesi selalu sinkron, walau tanggal seed bergeser terhadap hari ini.
function buildCreditPlan() {
  const schedules = buildSchedulesSeed();
  const credits = buildCreditsSeed(schedules);
  const plan = reconcileDemoCredits({
    records: credits.records,
    schedules,
    invoices: credits.invoices,
    masterPackages: credits.masterPackages,
    today: format(new Date(), "yyyy-MM-dd"),
    financeBy: "Siti Rahmawati, S.E. (Finance)",
    scheduleBy: "Fajar Prasetyo (Admin Schedule)",
  });
  return { schedules, credits: { ...credits, records: plan.records }, packageBySchedule: plan.packageBySchedule };
}

export function loadSchedulesSeed() {
  const { schedules, packageBySchedule } = buildCreditPlan();
  return schedules.map((s) => ({ ...s, createdBy: s.createdBy || "Fajar Prasetyo (Admin Schedule)", ...(packageBySchedule.has(s.id) ? { creditPackageId: packageBySchedule.get(s.id) } : {}) }));
}

export function loadCreditsSeed() {
  return buildCreditPlan().credits;
}

// Tanggal invoice dan riwayat kredit dihitung relatif terhadap hari ini (lihat scripts/generate_demo_seed.py)
function buildCreditsSeed(loadedSchedules) {
  const now = new Date();
  const scheduleDates = new Map(loadedSchedules.map((s) => [s.id, s.date]));

  const invoices = (creditsSeed.invoices || []).map((raw) => {
    const { _seq, _issuedDaysAgo, _paidDaysAgo, ...inv } = raw;
    if (_issuedDaysAgo != null) {
      const issued = subDays(now, _issuedDaysAgo);
      inv.issuedAt = issued.toISOString();
      inv.createdAt = format(issued, "yyyy-MM-dd");
      inv.invoiceNumber = `INV-${format(issued, "yyyy-MM")}-${String(_seq).padStart(3, "0")}`;
    }
    if (inv.typeCode && _issuedDaysAgo != null) inv.invoiceNumber = `INV-${inv.typeCode}-${format(subDays(now, _issuedDaysAgo), "yyyyMMdd")}-${String(_seq).padStart(3, "0")}`; // format baru per jenis (ASM)
    if (_paidDaysAgo != null) inv.paidAt = subDays(now, _paidDaysAgo).toISOString();
    return inv;
  });

  const records = (creditsSeed.records || []).map((record) => ({
    ...record,
    history: (record.history || [])
      .map((h) => {
        const { _daysAgo, ...rest } = h;
        const date =
          (rest.scheduleId && scheduleDates.get(rest.scheduleId)) ||
          (_daysAgo != null ? format(subDays(now, _daysAgo), "yyyy-MM-dd") : rest.date);
        return { ...rest, date };
      })
      .sort((a, b) => (a.date || "").localeCompare(b.date || "")),
  }));

  return {
    masterPackages: creditsSeed.masterPackages || [],
    records,
    invoices,
    renewals: [],
  };
}

// Log cuti Finance seed (3 contoh: aktif, selesai lebih awal, void). Tanggal relatif ke minggu ini; hari hitung = sesi pertama–terakhir.
export function loadLeavesSeed() {
  const now = new Date();
  const dateOfSession = (id) => {
    const s = schedulesSeed.find((x) => x.id === id);
    return weekDate(now, s._weekOffset, s._dayOfWeek);
  };
  return leavesSeed.map((raw) => {
    const { _startWeekOffset, _startDay, _endWeekOffset, _endDay, _returnWeekOffset, _returnDay, _createdDaysAgo, _returnedDaysAgo, _voidedDaysAgo, restoredSessionIds, ...l } = raw;
    const dates = l.sessionIds.map(dateOfSession).sort();
    const created = subDays(now, _createdDaysAgo != null ? _createdDaysAgo : 3).toISOString();
    return {
      ...l,
      startDate: weekDate(now, _startWeekOffset, _startDay),
      endDate: weekDate(now, _endWeekOffset, _endDay),
      countedStart: dates[0],
      countedEnd: dates[dates.length - 1],
      returnDate: _returnWeekOffset != null ? weekDate(now, _returnWeekOffset, _returnDay) : null,
      returnNote: l.returnNote || null,
      returnedAt: _returnedDaysAgo != null ? subDays(now, _returnedDaysAgo).toISOString() : null,
      returnedBy: _returnedDaysAgo != null ? l.createdBy : null,
      createdAt: created,
      updatedBy: l.createdBy,
      updatedAt: created,
      voidedAt: l.status === "voided" ? subDays(now, _voidedDaysAgo != null ? _voidedDaysAgo : 1).toISOString() : null,
      voidedBy: l.status === "voided" ? l.voidedBy || l.createdBy : null,
      voidReason: l.status === "voided" ? l.voidReason || null : null,
    };
  });
}

export function loadTherapistsSeed() {
  return therapistsSeed;
}

export function loadCategoriesSeed() {
  return categoriesSeed;
}

