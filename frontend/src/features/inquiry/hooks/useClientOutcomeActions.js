import { useClients } from "@/stores/clientsStore";
import { useCredits } from "@/stores/creditsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useAuth } from "@/stores/authStore";
import { newCreditRecord } from "@/domain/credit";
import { buildActivationPatch, buildStatusChangePatch } from "@/domain/client";
import { ACTIVE_SESSION_STATUSES } from "@/domain/schedule";
import { todayStr } from "@/shared/lib/id";

// Sesi yang masih "hidup" di kalender (scheduled, rescheduled = sudah dipindah, reschedule_pending): dihapus saat discharge.
// Completed/cancelled = riwayat, tidak disentuh.
const LIVE_SESSION_STATUSES = ACTIVE_SESSION_STATUSES;

// Use-case keputusan akhir pipeline inquiry (step 8 Client Detail).
// Fase API: satu endpoint POST /clients/{id}/transition yang juga menulis client_status_histories.
export function useClientOutcomeActions() {
  const { updateClient } = useClients();
  const { getRecordForClient, addRecord, forfeitCreditOnDischarge } = useCredits();
  const { schedules, deleteSchedules } = useSchedules();
  const { auth } = useAuth();
  const by = auth?.staffName || auth?.role || null;

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

  // Efek discharge: status + semua jadwal aktif dihapus + sisa sesi hangus. Dipakai `discharge` dan `changeStatus(..., "discharged")`.
  const applyDischarge = (client, reason, note, patch) => {
    const text = (reason || "").trim();
    const live = schedules.filter((s) => s.clientId === client.id && LIVE_SESSION_STATUSES.includes(s.status));
    const forfeited = getRecordForClient(client.id)?.remainingCredit || 0;
    updateClient(client.id, patch);
    if (live.length) deleteSchedules(live.map((s) => s.id));
    if (forfeited > 0) forfeitCreditOnDischarge({ clientId: client.id, reason: text, by }); // satu baris ledger per paket (catatan dihitung per paket)
    return { deletedSchedules: live.length, forfeitedCredits: forfeited };
  };

  // Discharge client (dari Final Decision Outcomes maupun detail Active Client). Alasan = string bebas / pilihan cepat.
  // Efek samping: semua jadwal yang masih aktif (termasuk recurring) dihapus, dan sisa sesi paket hangus (ledger `discharge`,
  // tampil di Log Kredit & Saldo Finance). Riwayat sesi yang sudah berjalan tidak berubah.
  // Fase API: bagian dari POST /clients/{id}/transition (to_status = discharged), satu transaksi.
  const discharge = (client, reason, note = null) =>
    applyDischarge(client, reason, note, { status: "discharged", dateOfDischarge: todayStr(), dischargeReason: reason.trim(), dischargeNote: note?.trim() || null });

  // Ubah status manual ke tahap pipeline mana pun (koreksi salah klik, kembali ke tahap awal, reaktivasi).
  // Fase API: POST /clients/{id}/transition dengan `to_status` bebas (riwayat `client_status_histories`, trigger manual).
  const changeStatus = (client, toStatus, { reason, note } = {}) => {
    if (!toStatus || toStatus === client.status) return { changed: false };
    if (toStatus === "discharged") return { changed: true, from: client.status, to: toStatus, ...applyDischarge(client, reason, note, buildStatusChangePatch(client, toStatus, todayStr(), { reason, note })) }; // efek sama dengan `discharge`
    updateClient(client.id, buildStatusChangePatch(client, toStatus, todayStr(), { reason, note }));
    if (toStatus === "admitted" && !getRecordForClient(client.id)) {
      addRecord(newCreditRecord({ id: `cr-${client.id}`, clientId: client.id, branchId: client.branchId }));
    }
    return { changed: true, from: client.status, to: toStatus };
  };

  return { admit, reactivate, discharge, markDoneConsult, markDoneAssessment, discontinue, changeStatus };
}
