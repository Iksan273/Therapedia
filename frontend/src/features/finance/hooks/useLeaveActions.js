import { useAuth } from "@/stores/authStore";
import { useLeaves } from "@/stores/leavesStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useCredits } from "@/stores/creditsStore";
import { useTherapists } from "@/stores/therapistsStore";
import { useClients } from "@/stores/clientsStore";
import { useSessionActions } from "@/features/schedule";
import { clientLeaveContext } from "@/domain/credit";
import { LEAVE_QUOTA_DAYS, LEAVE_STATUS, makeLeave, planAnnualLeaveReset, planEarlyReturn, planLeave } from "@/domain/leave";
import { nowIso } from "@/shared/lib/id";

// Use-case cuti client (aksi modul finance; log cuti TIDAK bisa dihapus: hanya Akhiri Lebih Awal atau Void). Merangkai log cuti (leavesStore) dengan
// sesi (Off / kembali scheduled) dan kredit lewat `useSessionActions` agar ledger konsisten dengan Off biasa.
// Cuti memotong saldo jatah cuti (30 hari/tahun), BUKAN kredit sesi: sesi di rentang dibatalkan tanpa memotong kredit.
// Jatah = saldo cuti client (record kredit, diisi per paket); melewati jatah hanya peringatan. Cuti hanya bisa dicatat bila
// client punya sesi terapi di rentang; hari hitung = sesi pertama s.d. terakhir (domain/leave). Pemakaian dihitung, tidak disimpan.
// Fase API: createLeave → POST /leaves, endLeaveEarly/voidLeave → POST /leaves/{id}/end|void (satu transaksi; docs/guide/10).
export function useLeaveActions() {
  const { auth } = useAuth();
  const { leaves, addLeave, updateLeave } = useLeaves();
  const { schedules, updateSchedulesMany } = useSchedules();
  const { therapists } = useTherapists();
  const { clients } = useClients();
  const { credits, getRawRecord, getMasterPackages, getLeaveResetAt, getLeaveResets, resetAllLeave } = useCredits();
  const sessionActions = useSessionActions();
  const by = auth?.staffName || auth?.role || null;

  // Pratinjau untuk dialog (hari, jatah per tahun, sesi yang akan jadi Off, peringatan)
  const leaveContextOf = (clientId) => clientLeaveContext(getRawRecord(clientId), getMasterPackages(), getLeaveResetAt());
  const previewLeave = ({ clientId, startDate, endDate }) => planLeave({ leaves, schedules, clientId, startDate, endDate, ...leaveContextOf(clientId) });

  const createLeave = ({ clientId, branchId, startDate, endDate, reason, note }) => {
    const plan = previewLeave({ clientId, startDate, endDate });
    if (!plan.ok) return { ok: false, errors: plan.errors };

    const leave = makeLeave({ clientId, branchId, startDate, endDate, countedStart: plan.countedStart, countedEnd: plan.countedEnd, sessionIds: plan.sessions.map((s) => s.id), reason, note, by });
    addLeave(leave);

    let deducted = 0;
    plan.sessions.forEach((s) => {
      const r = sessionActions.cancelForLeave(s, {
        note: `Cuti ${startDate} s.d. ${endDate}${leave.reason ? `: ${leave.reason}` : ""}`,
        deductCredit: false, // cuti memotong saldo cuti, bukan kredit sesi
        leaveId: leave.id,
      });
      if (r.deducted) deducted += 1;
    });
    return { ok: true, leave, days: plan.days, balance: plan.balance, sessionsOff: plan.sessions.length, deducted, warnings: plan.warnings };
  };

  // Pratinjau akhiri lebih awal / void (hari yang kembali ke jatah, sesi yang kembali scheduled, slot yang terisi)
  const previewEarlyReturn = (leave, returnDate) => planEarlyReturn({ leave, returnDate, schedules, therapists });

  // Anak masuk lebih awal dari perkiraan: hari sesudah `returnDate` kembali ke jatah dan sesi Off cuti pada/sesudahnya
  // kembali `scheduled` (jadwal aktif). `returnDate` <= tanggal mulai = void penuh (alasan wajib).
  const endLeaveEarly = (leave, { returnDate, reason = "" }) => {
    const plan = previewEarlyReturn(leave, returnDate);
    if (!plan.ok) return { ok: false, errors: plan.errors };
    const note = reason.trim();
    if (plan.isVoid && !note) return { ok: false, errors: ["Alasan void wajib diisi."] };

    const { creditChange } = sessionActions.releaseFromLeave(plan.restorable, { reason: note || "Cuti diakhiri lebih awal" });
    // Slot yang sudah terisi tidak bisa dikembalikan otomatis: dilepas dari cuti, tetap Off biasa agar bisa di-revert manual
    if (plan.conflicted.length > 0) updateSchedulesMany(plan.conflicted.map((s) => s.id), { leaveId: null });

    if (plan.isVoid) {
      updateLeave(leave.id, { status: LEAVE_STATUS.voided, voidedAt: nowIso(), voidedBy: by, voidReason: note, updatedBy: by });
    } else {
      updateLeave(leave.id, { returnDate: plan.returnDate, returnNote: note || null, returnedAt: nowIso(), returnedBy: by, updatedBy: by });
    }
    return { ok: true, isVoid: plan.isVoid, daysReturned: plan.daysReturned, released: plan.restorable.length, conflicted: plan.conflicted.length, creditChange };
  };

  const voidLeave = (leave, { reason }) => endLeaveEarly(leave, { returnDate: leave.startDate, reason });


  // Reset tahunan (awal tahun): semua client kembali ke jatah dasar 30 hari, sisa hangus. Pratinjau lalu eksekusi.
  const previewAnnualReset = () => planAnnualLeaveReset({ clients, records: credits.records || [], leaves, globalSince: getLeaveResetAt() });
  const resetAllBalances = () => {
    const plan = previewAnnualReset();
    resetAllLeave({ quota: LEAVE_QUOTA_DAYS, clients: plan.clients, forfeitedDays: plan.forfeitedDays, by });
    return { ok: true, ...plan };
  };

  return { leaves, leaveContextOf, previewAnnualReset, resetAllBalances, resets: getLeaveResets(), lastResetAt: getLeaveResetAt(), previewLeave, createLeave, previewEarlyReturn, endLeaveEarly, voidLeave };
}
