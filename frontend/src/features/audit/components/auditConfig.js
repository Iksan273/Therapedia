import { STATUS_META } from "@/domain/status";
import { fmtCurrency, fmtDate } from "@/shared/lib/format";

// Kelas badge per tone aksi (tone berasal dari domain/audit.js)
export const TONE_CLASSES = {
  neutral: "bg-slate-50 text-slate-700 border-slate-200",
  info: "bg-sky-50 text-sky-700 border-sky-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  danger: "bg-rose-50 text-rose-700 border-rose-200",
  revert: "bg-violet-50 text-violet-700 border-violet-200 border-dashed",
};

export const ACTOR_TYPE_LABEL = { user: "Staf", client: "Orang tua", public: "Publik", system: "Sistem" };

const FIELD_LABELS = {
  status: "Status",
  cancelReason: "Alasan cancel",
  date: "Tanggal",
  startTime: "Jam mulai",
  therapist: "Terapis",
  amount: "Nominal",
  price: "Harga",
  credits: "Kredit",
  packageName: "Paket",
  parentName: "Orang tua",
  proof: "Bukti",
  activitySection: "Aktivitas",
  noteSection: "Catatan klinis",
  homeworkSection: "Homework",
};

export const fieldLabel = (field) => FIELD_LABELS[field] || field;

// Format nilai perubahan agar mudah dibaca (status → label, uang → Rupiah, tanggal → dd/MM/yyyy)
export function formatAuditValue(field, value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (field === "status") return STATUS_META[value]?.label || value;
  if (field === "amount" || field === "price") return fmtCurrency(value);
  if (field === "date" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return fmtDate(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
