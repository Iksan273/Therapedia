import { useClients } from "@/stores/clientsStore";
import { useCredits } from "@/stores/creditsStore";
import { useAuditLogger } from "@/features/audit";
import { newCreditRecord } from "@/domain/credit";
import { todayStr } from "@/shared/lib/id";

// Use-case keputusan akhir pipeline inquiry (step 8 Client Detail).
// Fase API: satu endpoint POST /clients/{id}/transition yang juga menulis client_status_histories & audit_logs.
export function useClientOutcomeActions() {
  const { updateClient } = useClients();
  const { getRecordForClient, addRecord } = useCredits();
  const { record } = useAuditLogger();

  const audit = (client, action, nextStatus, reason = null) =>
    record({
      action,
      branchId: client.branchId,
      entityType: "client",
      entityId: client.id,
      entityLabel: client.clientName,
      subjectType: "client",
      subjectId: client.id,
      subjectLabel: client.clientName,
      oldValues: { status: client.status },
      newValues: { status: nextStatus },
      reason,
    });

  // Admit menjadi Active Client (boleh dengan 0 kredit) + pastikan record kredit ada
  const admit = (client) => {
    updateClient(client.id, { status: "admitted", finalOutcome: "admitted", dateOfJoin: todayStr() });
    if (!getRecordForClient(client.id)) {
      addRecord(newCreditRecord({ id: `cr-${client.id}`, clientId: client.id, branchId: client.branchId }));
    }
    audit(client, "client.admitted", "admitted");
  };

  const markDoneConsult = (client) => {
    updateClient(client.id, { status: "done_consult", finalOutcome: "done_consult" });
    audit(client, "client.done_consult", "done_consult");
  };

  const markDoneAssessment = (client) => {
    updateClient(client.id, { status: "done_assessment", finalOutcome: "done_assessment" });
    audit(client, "client.done_assessment", "done_assessment");
  };

  const discontinue = (client, reason) => {
    updateClient(client.id, {
      status: "discontinued",
      finalOutcome: "discontinued",
      dischargeReason: "other",
      dischargeNote: reason.trim(),
    });
    audit(client, "client.discontinued", "discontinued", reason.trim());
  };

  return { admit, markDoneConsult, markDoneAssessment, discontinue };
}
