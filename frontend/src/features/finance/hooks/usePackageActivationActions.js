import { useAuth } from "@/stores/authStore";
import { useCredits } from "@/stores/creditsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { newClientPackageId, planSessionRelink } from "@/domain/credit";
import { todayStr } from "@/shared/lib/id";

// Use-case Finance: aktivasi paket (approve pembayaran paket / renewal langsung lunas). Merangkai 2 store: kredit (paket
// baru, ledger, invoice) dan jadwal: sesi terapi mendatang yang masih menunjuk paket habis (atau tanpa paket) dipindah
// ke paket aktif, sehingga sesi tidak lagi Frozen dan memakai paket yang sedang aktif. Toast tetap di komponen.
// Fase API: dilakukan di transaksi yang sama dengan verify / renewal (docs/guide/10).
export function usePackageActivationActions() {
  const { auth } = useAuth();
  const { getRawRecord, verifyPaymentProof, renewClientCredit } = useCredits();
  const { schedules, updateSchedulesMany } = useSchedules();
  const by = auth?.staffName || auth?.role || null;

  const relinkFutureSessions = (clientId, newPackageId) => {
    const { ids, targetId } = planSessionRelink({
      record: getRawRecord(clientId),
      schedules: schedules.filter((s) => s.clientId === clientId),
      newPackageId,
      today: todayStr(),
    });
    if (ids.length) updateSchedulesMany(ids, { creditPackageId: targetId });
    return ids.length;
  };

  // Approve pembayaran invoice paket → paket baru; kembalikan jumlah sesi yang dipindah ke paket aktif.
  const approvePackagePayment = (invoice, { creditsToAdd } = {}) => {
    const newPackageId = newClientPackageId();
    verifyPaymentProof({ invoiceId: invoice.id, status: "paid", creditsToAdd, newPackageId, by });
    if (invoice.replacesInvoiceId) return { relinked: 0, reused: true }; // paket lama dipakai ulang: tidak ada paket baru, jadwal sudah terhubung
    return { relinked: relinkFutureSessions(invoice.clientId, newPackageId) };
  };

  // Renewal langsung lunas → invoice paid + paket baru.
  const renewDirect = (payload) => {
    const newPackageId = newClientPackageId();
    renewClientCredit({ ...payload, newPackageId, by });
    if (payload.replacesInvoiceId) return { relinked: 0, reused: true }; // paket lama dipakai ulang: tidak ada paket baru
    return { relinked: relinkFutureSessions(payload.clientId, newPackageId) };
  };

  return { approvePackagePayment, renewDirect };
}
