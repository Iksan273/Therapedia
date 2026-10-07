import { useAuth } from "@/stores/authStore";
import { useCredits } from "@/stores/creditsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { validateVoid, voidSummary } from "@/domain/credit";
import { todayStr } from "@/shared/lib/id";

// Use-case Void invoice lunas (aksi modul finance, bukan hapus). Void hanya untuk invoice yang kreditnya BELUM dipakai dan
// selalu mempertahankan kredit/paket (tidak ada pencabutan sisa kredit; untuk itu gunakan Refund). Invoice tetap tercatat
// (status void, alasan, log) dan keluar dari omzet; jadwal tidak berubah.
// Fase API: satu transaksi `POST /invoices/{id}/void` (schema.md §6.5).
export function useInvoiceVoidActions() {
  const { auth } = useAuth();
  const { getRawRecord, voidInvoice } = useCredits();
  const { schedules } = useSchedules();
  const by = auth?.staffName || auth?.role || null;

  const previewVoid = (invoice) => voidSummary(getRawRecord(invoice.clientId), invoice, schedules, todayStr());

  const voidInvoiceAction = (invoice, { reason }) => {
    const summary = previewVoid(invoice);
    const error = validateVoid({ reason, blockedReason: summary.voidBlocked });
    if (error) return { ok: false, error };
    voidInvoice({ invoiceId: invoice.id, reason: reason.trim(), by });
    return { ok: true };
  };

  return { previewVoid, voidInvoiceAction };
}
