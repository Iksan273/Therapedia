import { addDays, addWeeks, format, startOfWeek, subDays, subMonths } from "date-fns";
import branchesSeed from "@/data/branches.seed.json";
import clientsSeed from "@/data/clients.seed.json";
import therapistsSeed from "@/data/therapists.seed.json";
import schedulesSeed from "@/data/schedules.seed.json";
import creditsSeed from "@/data/credits.seed.json";
import categoriesSeed from "@/data/assessmentCategories.seed.json";
import staffSeed from "@/data/staffUsers.seed.json";
import { buildAuditSeed } from "@/data/auditSeed";

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
    return client;
  });
}

export function loadSchedulesSeed() {
  const now = new Date();
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  const today = format(now, "yyyy-MM-dd");
  const dateOf = (weekOffset, dayOfWeek) =>
    format(addDays(addWeeks(monday, weekOffset != null ? weekOffset : 0), (dayOfWeek != null ? dayOfWeek : 1) - 1), "yyyy-MM-dd");

  return schedulesSeed.map((raw) => {
    const { _weekOffset, _dayOfWeek, _movedFrom, _markedDaysAgo, ...schedule } = raw;
    schedule.date = dateOf(_weekOffset, _dayOfWeek);
    // Sesi terjadwal yang tanggalnya sudah lewat dianggap selesai, agar data demo tetap realistis kapan pun dibuka
    if (schedule.status === "scheduled" && schedule.date < today) schedule.status = "completed";

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

// Tanggal invoice dan riwayat kredit dihitung relatif terhadap hari ini (lihat scripts/generate_demo_seed.py)
export function loadCreditsSeed() {
  const now = new Date();
  const scheduleDates = new Map(loadSchedulesSeed().map((s) => [s.id, s.date]));

  const invoices = (creditsSeed.invoices || []).map((raw) => {
    const { _seq, _issuedDaysAgo, _paidDaysAgo, ...inv } = raw;
    if (_issuedDaysAgo != null) {
      const issued = subDays(now, _issuedDaysAgo);
      inv.issuedAt = issued.toISOString();
      inv.createdAt = format(issued, "yyyy-MM-dd");
      inv.invoiceNumber = `INV-${format(issued, "yyyy-MM")}-${String(_seq).padStart(3, "0")}`;
    }
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

export function loadTherapistsSeed() {
  return therapistsSeed;
}

export function loadCategoriesSeed() {
  return categoriesSeed;
}

// Audit log demo diturunkan dari seed lain (lihat data/auditSeed.js)
export function loadAuditLogsSeed() {
  return buildAuditSeed({
    clients: loadClientsSeed(),
    schedules: loadSchedulesSeed(),
    credits: loadCreditsSeed(),
    therapists: therapistsSeed,
    staff: staffSeed,
  });
}
