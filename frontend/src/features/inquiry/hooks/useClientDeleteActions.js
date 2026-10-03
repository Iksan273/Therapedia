import { useClients } from "@/stores/clientsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useCredits } from "@/stores/creditsStore";
import { useAuth } from "@/stores/authStore";

// Use-case hapus client (soft delete; hanya role `canDelete`, dicek di tombol). Sesi dan invoice milik client ikut
// disembunyikan agar tidak muncul sebagai data yatim di kalender/finance. Fase API: DELETE /clients/{id} (soft delete,
// `deleted_at`/`deleted_by`; view dashboard memfilter client terhapus). Client terhapus tidak bisa login portal ortu.
export function useClientDeleteActions() {
  const { auth } = useAuth();
  const { deleteClient } = useClients();
  const { schedules, deleteSchedules } = useSchedules();
  const { getInvoicesForClient, deleteInvoices } = useCredits();

  const deleteClientCascade = (client) => {
    const by = auth?.staffName || auth?.role || null;
    const sessionIds = schedules.filter((s) => s.clientId === client.id).map((s) => s.id);
    const invoiceIds = getInvoicesForClient(client.id).map((i) => i.id);
    deleteClient(client.id, by);
    if (sessionIds.length) deleteSchedules(sessionIds, by);
    if (invoiceIds.length) deleteInvoices(invoiceIds, by);
    return { sessions: sessionIds.length, invoices: invoiceIds.length };
  };

  return { deleteClientCascade };
}
