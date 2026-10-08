import { isLeaveOff } from "@/domain/leave";

// Palet warna sesi di semua kalender (mingguan, agenda harian, kalender tim) + legend. SATU sumber agar tiap status punya
// warna yang berbeda jelas: biru, magenta, hijau, merah, abu, kuning, cyan = isian PASTEL (bg shade 200, border 400, teks 900;
// revisi 8 Okt 2026: sebelumnya solid terlalu mencolok). "pending" (outline oranye putus-putus) dan "conflict" (putih + bingkai
// merah tebal) dibedakan lewat bentuk. Semua class warna ikut dipetakan generator mode gelap (`npm run gen:dark`).
export const SESSION_COLORS = {
  scheduled: { label: "Scheduled", chip: "bg-blue-200 border-blue-400 text-blue-900", swatch: "bg-blue-200 border-blue-400", bar: "bg-blue-400" },
  assessment: { label: "Asesmen", chip: "bg-fuchsia-200 border-fuchsia-400 text-fuchsia-900", swatch: "bg-fuchsia-200 border-fuchsia-400", bar: "bg-fuchsia-400" },
  completed: { label: "Completed", chip: "bg-green-200 border-green-400 text-green-900", swatch: "bg-green-200 border-green-400", bar: "bg-green-400" },
  cancelled: { label: "Cancelled", chip: "bg-red-200 border-red-400 text-red-900", swatch: "bg-red-200 border-red-400", bar: "bg-red-400" },
  leave: { label: "Cancel / Off (Cuti)", chip: "bg-slate-300 border-slate-400 text-slate-900", swatch: "bg-slate-300 border-slate-400", bar: "bg-slate-400" },
  rescheduled: { label: "Rescheduled (sudah pindah)", chip: "bg-yellow-200 border-yellow-500 text-yellow-900", swatch: "bg-yellow-200 border-yellow-500", bar: "bg-yellow-400" },
  reschedule_pending: { label: "Menunggu jadwal pengganti", chip: "bg-white border-2 border-dashed border-orange-400 text-orange-800", swatch: "bg-white border-2 border-dashed border-orange-400", bar: "bg-orange-400" },
  frozen: { label: "Frozen (0 Credit)", chip: "bg-cyan-200 border-cyan-500 text-cyan-900", swatch: "bg-cyan-200 border-cyan-500", bar: "bg-cyan-400" },
  conflict: { label: "Bentrok terapis", chip: "bg-white border-2 border-red-500 text-red-700 ring-2 ring-red-300", swatch: "bg-white border-2 border-red-500", bar: "bg-red-600" },
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
