import { useBranches } from "@/stores/branchesStore";
import { useClients } from "@/stores/clientsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useCredits } from "@/stores/creditsStore";
import { useTherapists } from "@/stores/therapistsStore";
import { useHolidays } from "@/stores/holidaysStore";
import { useLeaves } from "@/stores/leavesStore";
import { useAuth } from "@/stores/authStore";
import { branchDeleteImpact } from "@/domain/branch";
import { isApiMode } from "@/config/env";
import { api } from "@/services/http/httpClient";
import { ENDPOINTS } from "@/services/api/endpoints";
import { branchImpactFromApi } from "@/services/api/mappers/organizationMapper";

// Use-case hapus cabang (PERMANEN, hanya role master).
// Mode demo: seluruh isi cabang dihapus berurutan di localStorage (sesi, client beserta data kreditnya, invoice, hari libur
// cabang, akun staf/terapis cabang, lalu cabangnya). Akun master tidak tersentuh.
// Mode API: `GET /branches/{id}/delete-impact` untuk pratinjau; `DELETE /branches/{id}` (sinkron, atomik, schema.md §6.7)
// dikerjakan di Sprint 4 sehingga server masih membalas 501.
// Keduanya melalui `loadImpact` dan `deleteBranchCascade` yang async, jadi halaman memakai satu alur.
export function useBranchDeleteActions() {
  const { deleteBranch } = useBranches();
  const { clients, deleteClient } = useClients();
  const { schedules, deleteSchedules } = useSchedules();
  const { credits, deleteInvoices, purgeClientCredit } = useCredits();
  const { therapists, removeTherapistsByBranch } = useTherapists();
  const { holidays, removeHoliday } = useHolidays();
  const { leaves, deleteLeaves } = useLeaves();
  const { staffUsers, removeStaffUser } = useAuth();

  const nonMasterStaff = staffUsers.filter((u) => u.role !== "master");

  const impactOf = (branchId) =>
    branchDeleteImpact(branchId, {
      clients,
      schedules,
      invoices: credits.invoices || [],
      staff: [...nonMasterStaff, ...therapists],
      holidays,
    });

  const loadImpact = async (branch) => {
    if (isApiMode()) return branchImpactFromApi(await api.get(ENDPOINTS.branches.deleteImpact(branch.id)));
    return impactOf(branch.id);
  };

  const deleteBranchCascade = async (branch) => {
    if (isApiMode()) {
      const impact = await loadImpact(branch);
      await deleteBranch(branch.id);
      return impact;
    }

    const impact = impactOf(branch.id);
    const sessionIds = schedules.filter((s) => s.branchId === branch.id).map((s) => s.id);
    if (sessionIds.length) deleteSchedules(sessionIds);
    const leaveIds = leaves.filter((l) => l.branchId === branch.id).map((l) => l.id);
    if (leaveIds.length) deleteLeaves(leaveIds);
    clients.filter((c) => c.branchId === branch.id).forEach((c) => {
      purgeClientCredit(c.id);
      deleteClient(c.id);
    });
    (credits.records || []).filter((r) => r.branchId === branch.id).forEach((r) => purgeClientCredit(r.clientId));
    const leftoverInvoices = (credits.invoices || []).filter((i) => i.branchId === branch.id).map((i) => i.id);
    if (leftoverInvoices.length) deleteInvoices(leftoverInvoices);
    holidays.filter((h) => h.branchId === branch.id).forEach((h) => removeHoliday(h.id));
    nonMasterStaff.filter((u) => u.branchId === branch.id).forEach((u) => removeStaffUser(u.id));
    removeTherapistsByBranch(branch.id);
    deleteBranch(branch.id);
    return impact;
  };

  return { impactOf, loadImpact, deleteBranchCascade };
}
