import { useClients } from "@/stores/clientsStore";
import { useAuditLogger } from "@/features/audit";
import { isQuestionnaireCodeFilled } from "@/domain/client";

// Use-case kode kuesioner. Fase API: deleteCode → DELETE /clients/{id}/assessment-codes/{code}
// (hanya kode berstatus `issued`; audit `assessment_code.deleted` ditulis backend di transaksi yang sama).
export function useQuestionnaireCodeActions() {
  const { updateClient } = useClients();
  const { record } = useAuditLogger();

  // Hapus kode yang belum diisi ortu. Hanya dicatat di audit (tanpa revert). Status client tidak dimundurkan.
  const deleteCode = (client, codeItem) => {
    if (isQuestionnaireCodeFilled(client, codeItem)) return { deleted: false, reason: "filled" };

    updateClient(client.id, { assessmentCodes: (client.assessmentCodes || []).filter((c) => c.code !== codeItem.code) });
    record({
      branchId: client.branchId,
      action: "assessment_code.deleted",
      entityType: "assessment_code",
      entityId: codeItem.code,
      entityLabel: `Kode ${codeItem.code} (${codeItem.name || "kuesioner"})`,
      subjectType: "client",
      subjectId: client.id,
      subjectLabel: client.clientName,
      oldValues: { code: codeItem.code, category: codeItem.name || codeItem.categoryId, status: "issued" },
    });
    return { deleted: true };
  };

  return { deleteCode };
}
