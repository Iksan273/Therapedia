import { useAuth } from "@/stores/authStore";
import { useCredits } from "@/stores/creditsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { validateVoid, voidSummary } from "@/domain/credit";
import { todayStr } from "@/shared/lib/id";

const UPCOMING = ["scheduled", "rescheduled", "reschedule_pending"];

// Use-case Void invoice lunas (aksi modul finance, bukan hapus). Merangkai kredit (status void, log, pencabutan kredit
// bila dipilih) dan jadwal: pada "cabut sisa kredit", sesi terapi MENDATANG yang memakai paket itu dipindah ke paket aktif
// lain; bila tak ada, dibiarkan tanpa paket = Frozen (tidak ada jadwal yang dihapus). Sesi selesai & laporannya tidak disentuh.
// Fase API: satu transaksi `POST /invoices/{id}/void` (schema.md §6.5).
export function useInvoiceVoidActions() {
  const { auth } = useAuth();
  const { getRawRecord, voidInvoice } = useCredits();
  const { schedules, updateSchedulesMany } = useSchedules();
  const by = auth?.staffName || auth?.role || null;

  const previewVoid = (invoice) => voidSummary(getRawRecord(invoice.clientId), invoice, schedules, todayStr());

  const voidInvoiceAction = (invoice, { reason, creditAction }) => {
    const summary = previewVoid(invoice);
    const error = validateVoid({ reason, creditAction, hasPackage: summary.hasPackage });
    if (error) return { ok: false, error };

    let relinked = 0;
    let frozen = 0;
    if (summary.hasPackage && creditAction === "revoke") {
      const record = getRawRecord(invoice.clientId);
      const chain = new Set(summary.chainIds);
      const other = (record?.packages || []).find((p) => !chain.has(p.id) && p.status !== "voided" && p.remainingCredit > 0);
      const upcoming = schedules
        .filter((s) => s.creditPackageId && chain.has(s.creditPackageId) && s.type === "therapy" && UPCOMING.includes(s.status) && s.date >= todayStr())
        .map((s) => s.id);
      if (upcoming.length) updateSchedulesMany(upcoming, { creditPackageId: other ? other.id : null });
      relinked = other ? upcoming.length : 0;
      frozen = other ? 0 : upcoming.length;
    }
    voidInvoice({ invoiceId: invoice.id, reason: reason.trim(), creditAction: summary.hasPackage ? creditAction : null, by });
    return { ok: true, relinked, frozen, revoked: summary.hasPackage && creditAction === "revoke" ? summary.remaining : 0 };
  };

  return { previewVoid, voidInvoiceAction };
}
