import { useBranches } from "@/stores/branchesStore";
import { useClients } from "@/stores/clientsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useCredits } from "@/stores/creditsStore";
import { useTherapists } from "@/stores/therapistsStore";
import { useHolidays } from "@/stores/holidaysStore";
import { useLeaves } from "@/stores/leavesStore";
import { useAuth } from "@/stores/authStore";
import { branchDeleteImpact } from "@/domain/branch";

// Use-case hapus cabang (PERMANEN, hanya role `canDelete`): seluruh isi cabang dihapus berurutan: sesi, client beserta
// data kreditnya, invoice, hari libur cabang, akun staf/terapis cabang, lalu cabangnya. Akun master tidak tersentuh.
// Fase API: DELETE /branches/{id} = job antrean berurutan (schema.md §6.7).
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

  const deleteBranchCascade = (branch) => {
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

  return { impactOf, deleteBranchCascade };
}
