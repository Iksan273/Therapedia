import { useAuth } from "@/stores/authStore";
import { useCredits } from "@/stores/creditsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { computePackageConversion, isInvoiceConvertible, resolveInvoicePackage } from "@/domain/credit";
import { ACTIVE_SESSION_STATUSES } from "@/domain/schedule";

// Jadwal yang dihapus saat konversi: SEMUA jadwal terapi aktif client (scheduled, rescheduled = sudah dipindah tapi masih
// aktif, reschedule_pending), termasuk seri recurring. Sesi completed/cancelled adalah riwayat (terikat ledger) dan asesmen
// tidak terkait paket, jadi tidak disentuh.
const UPCOMING_STATUSES = ACTIVE_SESSION_STATUSES;

// Use-case Finance: konversi sisa sesi paket (mis. Senior → Regular). Merangkai 2 store: kredit (paket, ledger, saldo,
// log invoice) dan jadwal (hapus sesi mendatang; pelaku di `deletedBy`). Toast tetap di komponen.
// Fase API: satu request transaksional `POST /invoices/{id}/convert-package` (docs/guide/10).
export function usePackageConversionActions() {
  const { auth } = useAuth();
  const { getRawRecord, convertPackage } = useCredits();
  const { schedules, deleteSchedules } = useSchedules();
  const by = auth?.staffName || auth?.role || null;

  const canConvert = (invoice) => isInvoiceConvertible(getRawRecord(invoice.clientId), invoice);

  // Paket sumber + harga bayar (snapshot). Paket lama tanpa snapshot memakai nominal invoice.
  const sourceOf = (invoice) => {
    const pkg = resolveInvoicePackage(getRawRecord(invoice.clientId), invoice);
    if (!pkg) return null;
    return { pkg, price: pkg.price ?? invoice.grossAmount ?? invoice.amount };
  };

  // Paket client yang akan dikonversi (untuk pratinjau sebelum -> sesudah)
  const sourceInfo = (invoice) => {
    const src = sourceOf(invoice);
    return src ? { name: src.pkg.packageName, remainingCredit: src.pkg.remainingCredit } : null;
  };

  const upcomingSchedules = (clientId) => schedules.filter((s) => s.clientId === clientId && s.type !== "assessment" && UPCOMING_STATUSES.includes(s.status));

  // Pratinjau/validasi tanpa mengubah data. `sessions` kosong = otomatis.
  const previewConversion = ({ invoice, target, sessions = null }) => {
    const src = sourceOf(invoice);
    if (!src || !target) return { ok: false, error: "Pilih paket tujuan." };
    return computePackageConversion({
      source: { remainingCredit: src.pkg.remainingCredit, totalCredit: src.pkg.totalCredit, price: src.price },
      target: { credits: target.credits, price: target.price },
      sessions,
    });
  };

  // `sessions` kosong = otomatis; diisi = manual (catatan wajib). Mengembalikan { ok, error? , result?, deletedSchedules? }.
  const convertInvoicePackage = ({ invoice, target, sessions = null, reason = "" }) => {
    const src = sourceOf(invoice);
    if (!src || !canConvert(invoice)) return { ok: false, error: "Paket invoice ini tidak bisa dikonversi." };
    const manual = sessions !== null && sessions !== undefined && sessions !== "";
    if (!reason.trim()) return { ok: false, error: "Catatan Finance wajib diisi." };
    const result = previewConversion({ invoice, target, sessions });
    if (!result.ok) return result;

    const { pkg } = src;
    const upcoming = upcomingSchedules(invoice.clientId);
    const targetName = `${target.name} (${result.sessions}x)`;

    convertPackage({
      clientId: invoice.clientId,
      invoiceId: invoice.id,
      sourcePackageId: pkg.id,
      sourceName: pkg.packageName,
      remainingCredit: pkg.remainingCredit,
      target: { packageId: target.id, packageName: targetName },
      sessions: result.sessions,
      price: result.remainingValue - result.leftover, // nilai yang dibawa ke paket baru
      leftover: result.leftover,
      mode: result.mode,
      reason: reason.trim(),
      by,
    });
    if (upcoming.length) deleteSchedules(upcoming.map((s) => s.id), by);

    return { ok: true, result, deletedSchedules: upcoming.length };
  };

  return { canConvert, previewConversion, convertInvoicePackage, upcomingSchedules, sourceInfo };
}
