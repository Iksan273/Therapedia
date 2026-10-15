import { useQueryClient } from "@tanstack/react-query";
import { isApiMode } from "@/config/env";
import { api } from "@/services/http/httpClient";
import { ENDPOINTS } from "@/services/api/endpoints";
import { useClients, CLIENTS_QUERY_KEY } from "@/stores/clientsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useCredits } from "@/stores/creditsStore";
import { useLeaves } from "@/stores/leavesStore";
import { useAssessmentDrafts } from "@/stores/assessmentDraftsStore";

// Use-case hapus client (PERMANEN, hanya role master, dicek di tombol): client + seluruh sesinya + record kredit
// (paket, ledger, konversi) + invoice-nya + log cuti-nya dihapus. Kuesioner/dokumen/riwayat status ada di objek client sehingga ikut hilang.
// Fase API: DELETE /clients/{id} (FK ON DELETE CASCADE, schema.md §6.7; file bukti bayar dihapus setelah commit).
function useClientDeleteActionsLocal() {
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

// Mode API: satu DELETE /clients/{id} (hanya master; cascade di server). Mengembalikan jumlah 0 karena server tidak
// merinci; galat (403/404) dilempar sebagai `ApiError`.
function useClientDeleteActionsApi() {
  const queryClient = useQueryClient();

  const deleteClientCascade = async (client) => {
    await api.delete(ENDPOINTS.clients.detail(client.id));
    queryClient.removeQueries({ queryKey: [...CLIENTS_QUERY_KEY, "detail", client.id] });
    await queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
    return { sessions: 0, invoices: 0 };
  };

  return { deleteClientCascade };
}

export const useClientDeleteActions = isApiMode() ? useClientDeleteActionsApi : useClientDeleteActionsLocal;
