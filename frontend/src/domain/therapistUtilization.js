import { addDays, addMonths, endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { occupiesTherapist, timeToMin } from "@/domain/schedule";
import { holidayDateSet } from "@/domain/holiday";
import { maxSessionsOf } from "@/domain/workHours";

// Availability Rate & Utilization Rate per terapis dan per cabang (revisi 7 Okt 2026). Murni TURUNAN; tidak ada yang disimpan.
//  - Kapasitas = **maksimal sesi per bulan** terapis (`maxSessionsPerMonth`, 1 sesi = 1 jam; domain/workHours), disesuaikan
//    dengan filter periode: kapasitas periode = Σ per bulan [maks sesi × (hari kerja periode itu ÷ hari kerja bulan itu)].
//    Hari kerja = Senin–Sabtu di luar hari libur cabang terapis. Filter satu bulan penuh = tepat maks sesi sebulan.
//  - Terisi    = jumlah jam sesi terapis di periode (sesi selain cancelled / reschedule_pending; 1 jam = 1 sesi).
//  - Utilization = terisi ÷ kapasitas; Availability = sesi tersedia ÷ kapasitas (= 100% − Utilization).

const DATE_FMT = "yyyy-MM-dd";
const round1 = (n) => Math.round(n * 10) / 10;
const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

// Jumlah hari kerja (Senin–Sabtu, bukan libur) pada rentang tertutup.
function workdaysBetween(from, to, holidays) {
  if (!from || !to || from > to) return 0;
  let n = 0;
  let cur = parseISO(from);
  const last = parseISO(to);
  while (cur <= last) {
    const d = format(cur, DATE_FMT);
    if (cur.getDay() !== 0 && !holidays.has(d)) n += 1;
    cur = addDays(cur, 1);
  }
  return n;
}

// Kapasitas (jumlah sesi) sebuah terapis pada rentang [from, to], proporsional per bulan kalender yang disentuh.
export function capacityForRange({ maxSessions, from, to, holidays = [], branchId = null }) {
  if (!from || !to || from > to) return 0;
  const holidaySet = holidayDateSet(holidays, branchId);
  let capacity = 0;
  let month = startOfMonth(parseISO(from));
  const lastMonth = startOfMonth(parseISO(to));
  while (month <= lastMonth) {
    const mStart = format(month, DATE_FMT);
    const mEnd = format(endOfMonth(month), DATE_FMT);
    const total = workdaysBetween(mStart, mEnd, holidaySet);
    const part = workdaysBetween(from > mStart ? from : mStart, to < mEnd ? to : mEnd, holidaySet);
    if (total > 0) capacity += (maxSessions * part) / total;
    month = addMonths(month, 1);
  }
  return capacity;
}

const hoursOf = (s) => Math.max(0, (timeToMin(s.endTime) - timeToMin(s.startTime)) / 60);

const summarize = (capacity, filled) => {
  const filledCapped = Math.min(capacity, filled);
  const utilizationRate = pct(filledCapped, capacity);
  return {
    capacitySessions: round1(capacity),
    filledSessions: round1(filled),
    availableSessions: round1(Math.max(0, capacity - filled)),
    utilizationRate,
    availabilityRate: capacity > 0 ? 100 - utilizationRate : 0,
  };
};

// `branchId` "all"/kosong = semua cabang. Mengembalikan { rows (per terapis), branches (per cabang), total }.
export function buildTherapistUtilization({ therapists = [], schedules = [], holidays = [], from, to, branchId = "all" }) {
  const scoped = therapists.filter((t) => branchId === "all" || !branchId || t.branchId === branchId);

  const rows = scoped.map((t) => {
    const maxSessions = maxSessionsOf(t);
    const capacity = capacityForRange({ maxSessions, from, to, holidays, branchId: t.branchId });
    const filled = schedules
      .filter((s) => s.therapistId === t.id && s.date >= from && s.date <= to && occupiesTherapist(s))
      .reduce((n, s) => n + hoursOf(s), 0);
    return { therapistId: t.id, name: t.name, branchId: t.branchId, specialty: t.specialty || "", maxSessions, capacity, filled, ...summarize(capacity, filled) };
  });

  const aggregate = (list) => summarize(list.reduce((n, r) => n + r.capacity, 0), list.reduce((n, r) => n + r.filled, 0));
  const branchIds = [...new Set(rows.map((r) => r.branchId))];
  const branches = branchIds.map((id) => ({ branchId: id, therapists: rows.filter((r) => r.branchId === id).length, ...aggregate(rows.filter((r) => r.branchId === id)) }));

  return { rows, branches, total: aggregate(rows) };
}
