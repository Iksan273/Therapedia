import { isLeaveOff } from "@/domain/leave";

// Palet warna sesi di semua kalender (mingguan, agenda harian, kalender tim) + legend. SATU sumber agar tiap status punya
// warna yang berbeda jelas (bukan satu keluarga warna): biru, magenta, hijau, merah, abu tua, kuning, cyan = isian solid;
// "pending" (outline oranye putus-putus) dan "conflict" (merah muda + bingkai tebal) dibedakan lewat bentuk.
// Isian solid memakai shade ≥400 + teks putih/hitam agar tidak diubah generator mode gelap dan tetap terbaca.
export const SESSION_COLORS = {
  scheduled: { label: "Scheduled", chip: "bg-blue-600 border-blue-700 text-white", swatch: "bg-blue-600 border-blue-700", bar: "bg-blue-600" },
  assessment: { label: "Asesmen", chip: "bg-fuchsia-600 border-fuchsia-700 text-white", swatch: "bg-fuchsia-600 border-fuchsia-700", bar: "bg-fuchsia-600" },
  completed: { label: "Completed", chip: "bg-green-600 border-green-700 text-white", swatch: "bg-green-600 border-green-700", bar: "bg-green-600" },
  cancelled: { label: "Cancelled", chip: "bg-red-600 border-red-700 text-white", swatch: "bg-red-600 border-red-700", bar: "bg-red-600" },
  leave: { label: "Cancel / Off (Cuti)", chip: "bg-slate-600 border-slate-700 text-white", swatch: "bg-slate-600 border-slate-700", bar: "bg-slate-600" },
  rescheduled: { label: "Rescheduled (sudah pindah)", chip: "bg-yellow-400 border-yellow-500 text-black", swatch: "bg-yellow-400 border-yellow-500", bar: "bg-yellow-400" },
  reschedule_pending: { label: "Menunggu jadwal pengganti", chip: "bg-white border-2 border-dashed border-orange-500 text-orange-700", swatch: "bg-white border-2 border-dashed border-orange-500", bar: "bg-orange-500" },
  frozen: { label: "Frozen (0 Credit)", chip: "bg-cyan-400 border-cyan-500 text-black", swatch: "bg-cyan-400 border-cyan-500", bar: "bg-cyan-400" },
  conflict: { label: "Bentrok terapis", chip: "bg-red-100 border-2 border-red-600 text-red-800 ring-2 ring-red-600", swatch: "bg-red-100 border-2 border-red-600", bar: "bg-red-800" },
};

// Urutan legend. Jadwal asal (dipindah) digambar terpisah (GhostChip: outline abu putus-putus).
export const SESSION_LEGEND_KEYS = ["scheduled", "assessment", "completed", "cancelled", "leave", "rescheduled", "reschedule_pending", "frozen", "conflict"];

// Kunci warna sebuah sesi. Prioritas: bentrok > frozen > asesmen (scheduled/completed) > cuti > status.
export function sessionColorKey(s, { isFrozen = false, isConflict = false } = {}) {
  if (isConflict) return "conflict";
  if (isFrozen) return "frozen";
  if (s.type === "assessment" && (s.status === "scheduled" || s.status === "completed")) return "assessment";
  if (isLeaveOff(s)) return "leave";
  return SESSION_COLORS[s.status] ? s.status : "scheduled";
}
