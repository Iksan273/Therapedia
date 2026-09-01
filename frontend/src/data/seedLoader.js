import { addDays, addWeeks, format, startOfWeek, subDays, subMonths } from "date-fns";
import branchesSeed from "@/data/branches.seed.json";
import clientsSeed from "@/data/clients.seed.json";
import therapistsSeed from "@/data/therapists.seed.json";
import schedulesSeed from "@/data/schedules.seed.json";
import creditsSeed from "@/data/credits.seed.json";
import categoriesSeed from "@/data/assessmentCategories.seed.json";

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
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  return schedulesSeed.map((raw) => {
    const { _weekOffset, _dayOfWeek, ...schedule } = raw;
    const date = addDays(addWeeks(monday, _weekOffset != null ? _weekOffset : 0), (_dayOfWeek != null ? _dayOfWeek : 1) - 1);
    schedule.date = format(date, "yyyy-MM-dd");
    return schedule;
  });
}

export function loadCreditsSeed() {
  return {
    masterPackages: creditsSeed.masterPackages || [],
    records: creditsSeed.records || [],
    invoices: creditsSeed.invoices || [],
    renewals: []
  };
}

export function loadTherapistsSeed() {
  return therapistsSeed;
}

export function loadCategoriesSeed() {
  return categoriesSeed;
}
