import { differenceInYears, format, parseISO } from "date-fns";

// Format tampilan: tanggal (dd/MM/yyyy), usia, dan mata uang Rupiah.

export const fmtDate = (d) => {
  if (!d) return "—";
  try {
    return format(typeof d === "string" ? parseISO(d) : d, "dd/MM/yyyy");
  } catch (e) {
    return d;
  }
};

export const formatDdMmYyyy = (d) => {
  if (!d) return "";
  try {
    return format(typeof d === "string" ? parseISO(d) : d, "dd/MM/yyyy");
  } catch (e) {
    return "";
  }
};

export const parseDdMmYyyy = (str) => {
  if (!str || typeof str !== "string") return null;
  const clean = str.trim();
  const m = clean.match(/^(\d{1,2})[/\-.\s](\d{1,2})[/\-.\s](\d{4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const year = parseInt(m[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      const d = new Date(year, month - 1, day);
      if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
        return format(d, "yyyy-MM-dd");
      }
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }
  return null;
};

export const calcAge = (dob) => {
  if (!dob) return null;
  try {
    return differenceInYears(new Date(), parseISO(dob));
  } catch (e) {
    return null;
  }
};

export const calcAgeDetailed = (dob, testDate = new Date()) => {
  if (!dob) return { years: 0, months: 0, days: 0 };
  try {
    const birth = typeof dob === "string" ? parseISO(dob) : dob;
    const test = typeof testDate === "string" ? parseISO(testDate) : testDate;
    let years = test.getFullYear() - birth.getFullYear();
    let months = test.getMonth() - birth.getMonth();
    let days = test.getDate() - birth.getDate();
    if (days < 0) {
      months -= 1;
      const prevMonthLastDay = new Date(test.getFullYear(), test.getMonth(), 0).getDate();
      days += prevMonthLastDay;
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    return { years: Math.max(0, years), months: Math.max(0, months), days: Math.max(0, days) };
  } catch (e) {
    return { years: 0, months: 0, days: 0 };
  }
};

export const fmtCurrency = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
};
