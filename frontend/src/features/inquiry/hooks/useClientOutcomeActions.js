import { useClients } from "@/stores/clientsStore";
import { useCredits } from "@/stores/creditsStore";
import { newCreditRecord } from "@/domain/credit";
import { buildActivationPatch, buildStatusChangePatch } from "@/domain/client";
import { todayStr } from "@/shared/lib/id";

// Use-case keputusan akhir pipeline inquiry (step 8 Client Detail).
// Fase API: satu endpoint POST /clients/{id}/transition yang juga menulis client_status_histories.
export function useClientOutcomeActions() {
  const { updateClient } = useClients();
  const { getRecordForClient, addRecord } = useCredits();

  // Admit menjadi Active Client (boleh dengan 0 kredit) + pastikan record kredit ada
  const activate = (client) => {
    updateClient(client.id, buildActivationPatch(client, todayStr()));
    if (!getRecordForClient(client.id)) {
      addRecord(newCreditRecord({ id: `cr-${client.id}`, clientId: client.id, branchId: client.branchId }));
    }
  };

  const admit = (client) => activate(client);

  // Kembalikan client discharged/discontinued menjadi Active Client (Active Client Roster & detail client)
  const reactivate = (client) => activate(client);

  const markDoneConsult = (client) => {
    updateClient(client.id, { status: "done_consult", finalOutcome: "done_consult" });
  };

  const markDoneAssessment = (client) => {
    updateClient(client.id, { status: "done_assessment", finalOutcome: "done_assessment" });
  };

  const discontinue = (client, reason) => {
    updateClient(client.id, {
      status: "discontinued",
      finalOutcome: "discontinued",
      dateOfDischarge: null,
      dateOfDiscontinue: todayStr(),
      dischargeReason: "other",
      dischargeNote: reason.trim(),
    });
  };

  // Discharge client (dari Final Decision Outcomes maupun detail Active Client). Alasan = string bebas / pilihan cepat.
  const discharge = (client, reason, note = null) => {
    updateClient(client.id, {
      status: "discharged",
      dateOfDischarge: todayStr(),
      dischargeReason: reason.trim(),
      dischargeNote: note?.trim() || null,
    });
  };

  // Ubah status manual ke tahap pipeline mana pun (koreksi salah klik, kembali ke tahap awal, reaktivasi).
  // Fase API: POST /clients/{id}/transition dengan `to_status` bebas (riwayat `client_status_histories`, trigger manual).
  const changeStatus = (client, toStatus, { reason, note } = {}) => {
    if (!toStatus || toStatus === client.status) return { changed: false };
    updateClient(client.id, buildStatusChangePatch(client, toStatus, todayStr(), { reason, note }));
    if (toStatus === "admitted" && !getRecordForClient(client.id)) {
      addRecord(newCreditRecord({ id: `cr-${client.id}`, clientId: client.id, branchId: client.branchId }));
    }
    return { changed: true, from: client.status, to: toStatus };
  };

  return { admit, reactivate, discharge, markDoneConsult, markDoneAssessment, discontinue, changeStatus };
}
