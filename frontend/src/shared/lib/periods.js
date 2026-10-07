import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subDays, subMonths } from "date-fns";

export const PERIOD_OPTIONS = [
  { value: "all", label: "Semua Waktu" },
  { value: "this_week", label: "Minggu Ini" },
  { value: "7days", label: "7 Hari Terakhir" },
  { value: "this_month", label: "Bulan Ini" },
  { value: "last_month", label: "Bulan Lalu" },
  { value: "quarter", label: "Kuartal Ini (3 Bulan)" },
  { value: "custom", label: "Rentang Kustom" },
];

export const periodLabel = (value) => PERIOD_OPTIONS.find((p) => p.value === value)?.label || value;

// Batas periode dihitung sekali, lalu dipakai berulang per baris (perbandingan string yyyy-MM-dd).
export function makePeriodMatcher(preset, start = "", end = "", now = new Date()) {
  if (!preset || preset === "all") return () => true;
  if (preset === "this_week") {
    const from = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const to = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    return (d) => d >= from && d <= to;
  }
  if (preset === "7days") {
    const cutoff = format(subDays(now, 7), "yyyy-MM-dd");
    return (d) => d >= cutoff;
  }
  if (preset === "this_month") {
    const m = format(now, "yyyy-MM");
    return (d) => d.startsWith(m);
  }
  if (preset === "last_month") {
    const m = format(subMonths(now, 1), "yyyy-MM");
    return (d) => d.startsWith(m);
  }
  if (preset === "quarter") {
    const cutoff = format(subMonths(now, 3), "yyyy-MM-dd");
    return (d) => d >= cutoff;
  }
  if (preset === "custom") {
    return (d) => (!start || d >= start) && (!end || d <= end);
  }
  return () => true;
}

// Rentang tanggal tertutup { from, to } (yyyy-MM-dd) untuk perhitungan yang butuh batas jelas (mis. kapasitas jam kerja).
// "all" tidak punya batas → null; rentang kustom wajib terisi keduanya, selain itu null.
export function periodRange(preset, start = "", end = "", now = new Date()) {
  const f = (d) => format(d, "yyyy-MM-dd");
  if (preset === "this_week") return { from: f(startOfWeek(now, { weekStartsOn: 1 })), to: f(endOfWeek(now, { weekStartsOn: 1 })) };
  if (preset === "7days") return { from: f(subDays(now, 7)), to: f(now) };
  if (preset === "this_month") return { from: f(startOfMonth(now)), to: f(endOfMonth(now)) };
  if (preset === "last_month") return { from: f(startOfMonth(subMonths(now, 1))), to: f(endOfMonth(subMonths(now, 1))) };
  if (preset === "quarter") return { from: f(subMonths(now, 3)), to: f(now) };
  if (preset === "custom") return start && end && start <= end ? { from: start, to: end } : null;
  return null;
}
