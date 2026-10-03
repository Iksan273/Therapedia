import { format } from "date-fns";

// Pembuat ID, kode akses, dan cap waktu.

export const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const nowIso = () => new Date().toISOString();

export const todayStr = () => format(new Date(), "yyyy-MM-dd");
