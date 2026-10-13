import { useClients } from "@/stores/clientsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useCredits } from "@/stores/creditsStore";
import { useLeaves } from "@/stores/leavesStore";
import { useAssessmentDrafts } from "@/stores/assessmentDraftsStore";

// Use-case hapus client (PERMANEN, hanya role master, dicek di tombol): client + seluruh sesinya + record kredit
// (paket, ledger, konversi) + invoice-nya + log cuti-nya dihapus. Kuesioner/dokumen/riwayat status ada di objek client sehingga ikut hilang.
// Fase API: DELETE /clients/{id} (FK ON DELETE CASCADE, schema.md §6.7; file bukti bayar dihapus setelah commit).
export function useClientDeleteActions() {
  const { deleteClient } = useClients();
  const { schedules, deleteSchedules } = useSchedules();
  const { getInvoicesForClient, purgeClientCredit } = useCredits();
  const { purgeClientLeaves } = useLeaves();
  const { removeDraftsOfClient } = useAssessmentDrafts();

  const deleteClientCascade = (client) => {
    const sessionIds = schedules.filter((s) => s.clientId === client.id).map((s) => s.id);
    const invoices = getInvoicesForClient(client.id).length;
    if (sessionIds.length) deleteSchedules(sessionIds);
    purgeClientCredit(client.id);
    purgeClientLeaves(client.id);
    removeDraftsOfClient(client.id);
    deleteClient(client.id);
    return { sessions: sessionIds.length, invoices };
  };

  return { deleteClientCascade };
}
