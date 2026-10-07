import { useAuth } from "@/stores/authStore";
import { useCredits } from "@/stores/creditsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { buildRefundPlan, validateRefund } from "@/domain/credit";
import { todayStr } from "@/shared/lib/id";

const UPCOMING = ["scheduled", "rescheduled", "reschedule_pending"];

// Use-case Refund (aksi modul finance): mengembalikan uang untuk sisa kredit invoice paket lunas. Merangkai kredit
// (sisa kredit paket jadi 0, ledger `refund`, invoice memegang `refundAmount`, log) dan jadwal: sesi terapi MENDATANG yang
// memakai paket itu dipindah ke paket aktif lain; bila tak ada, dibiarkan tanpa paket = Frozen. Sesi selesai tidak disentuh.
// Bagian yang sudah terpakai tetap Verified Revenue; nominal refund tetap di Gross Revenue (domain `revenueMetrics`).
// Fase API: satu transaksi `POST /invoices/{id}/refund` (schema.md).
export function useInvoiceRefundActions() {
  const { auth } = useAuth();
  const { getRawRecord, refundInvoice } = useCredits();
  const { schedules, updateSchedulesMany } = useSchedules();
  const by = auth?.staffName || auth?.role || null;

  const previewRefund = (invoice) => buildRefundPlan(getRawRecord(invoice.clientId), invoice, schedules, todayStr());

  const refundInvoiceAction = (invoice, { amount, reason }) => {
    const plan = previewRefund(invoice);
    const error = validateRefund({ amount, reason, plan });
    if (error) return { ok: false, error };

    const record = getRawRecord(invoice.clientId);
    const chain = new Set(plan.summary.chainIds);
    const other = (record?.packages || []).find((p) => !chain.has(p.id) && p.status !== "voided" && p.remainingCredit > 0);
    const upcoming = schedules
      .filter((s) => s.creditPackageId && chain.has(s.creditPackageId) && s.type === "therapy" && UPCOMING.includes(s.status) && s.date >= todayStr())
      .map((s) => s.id);
    if (upcoming.length) updateSchedulesMany(upcoming, { creditPackageId: other ? other.id : null });

    refundInvoice({ invoiceId: invoice.id, amount: Number(amount), credits: plan.credits, reason: reason.trim(), by });
    return { ok: true, credits: plan.credits, relinked: other ? upcoming.length : 0, frozen: other ? 0 : upcoming.length };
  };

  return { previewRefund, refundInvoiceAction };
}
