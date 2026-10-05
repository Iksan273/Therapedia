import React, { createContext, useContext } from "react";
import { usePersistentReducer } from "@/shared/hooks/usePersistentState";
import { getSeedLoader } from "@/data/seedRegistry";
import { todayStr, uid } from "@/shared/lib/id";
import {
  appendInvoiceLog,
  applyBalanceToAmount,
  adoptPackageForReplacement,
  applyVoidRevoke,
  canDeleteInvoice,
  canVoidInvoice,
  applyPackageAdded,
  applyPackageConversion,
  applySessionCancelled,
  applySessionCompleted,
  applySessionReverted,
  canUploadProof,
  invoiceType,
  invoiceTypeCode,
  newClientPackage,
  newCreditRecord,
  nextInvoiceNumber,
  proofUploadsUsed,
  summarizeCreditRecord,
} from "@/domain/credit";

const CreditsContext = createContext(null);

// Terapkan `fn` ke record milik clientId (record lain tidak berubah)
const mapClientRecord = (records, clientId, fn) => records.map((r) => (r.clientId === clientId ? fn(r) : r));

// Tambah paket ke record client; buat record baru bila client belum punya
const addPackageToClient = (records, { clientId, branchId }, pkg, note) =>
  records.some((r) => r.clientId === clientId)
    ? mapClientRecord(records, clientId, (r) => applyPackageAdded(r, pkg, note))
    : [...records, applyPackageAdded(newCreditRecord({ clientId, branchId: branchId || "branch-sby-timur" }), pkg, note)];

// Tambah/kurangi saldo lebihan (rupiah) client; record dibuat bila belum ada (hanya saat saldo bertambah).
const adjustBalance = (records, { clientId, branchId }, delta) => {
  if (!delta) return records;
  const exists = records.some((r) => r.clientId === clientId);
  if (!exists) return delta > 0 ? [...records, { ...newCreditRecord({ clientId, branchId: branchId || "branch-sby-timur" }), balance: delta }] : records;
  return mapClientRecord(records, clientId, (r) => ({ ...r, balance: Math.max(0, (r.balance || 0) + delta) }));
};

const balanceOf = (records, clientId) => records.find((r) => r.clientId === clientId)?.balance || 0;

// Invoice paket memakai saldo lebihan client sebagai pengurang nominal (hanya sampai nominal invoice).
// Mengembalikan { invoice (nominal bersih + log), records (saldo berkurang) }.
const withBalanceApplied = (state, invoice, by) => {
  if (invoice.type !== "package") return { invoice, records: state.records };
  const { gross, applied, net } = applyBalanceToAmount(balanceOf(state.records, invoice.clientId), invoice.amount);
  if (applied <= 0) return { invoice, records: state.records };
  const next = appendInvoiceLog({ ...invoice, grossAmount: gross, balanceApplied: applied, amount: net }, {
    action: "balance_applied",
    by,
    note: `Saldo lebihan konversi dipakai sebagai pengurang tagihan (${gross} − ${applied} = ${net})`,
    data: { gross, applied, net },
  });
  return { invoice: next, records: adjustBalance(state.records, invoice, -applied) };
};

// Invoice baru: jenis (package | assessment), kode jenis untuk nomor INV-{KODE}-{YYYYMMDD}-{NNN}, dan snapshot
// nama/kredit/harga paket saat terbit (perubahan master paket tidak memengaruhi invoice ini).
const newInvoice = (state, action, extra) => {
  const type = action.invoiceType === "assessment" ? "assessment" : "package";
  const typeCode = action.typeCode || invoiceTypeCode(type, null);
  return {
    id: `inv-${Date.now()}`,
    type,
    typeCode,
    invoiceNumber: nextInvoiceNumber(state.invoices || [], { typeCode }),
    clientId: action.clientId,
    clientName: action.clientName,
    branchId: action.branchId || "branch-sby-timur",
    packageName: action.packageName,
    packageId: action.packageId,
    credits: type === "assessment" ? 0 : action.credits ?? null,
    isRenewal: type === "package" && Boolean(action.isRenewal), // invoice perpanjangan paket (jalur renewal)
    replacesInvoiceId: type === "package" ? action.replacesInvoiceId || null : null, // invoice void yang digantikan (paket lama dipakai ulang)
    createdAt: todayStr(),
    proofUploadCount: 0,
    ...extra,
  };
};

// Reducer hanya merangkai state; aturan bisnis ada di domain/credit.js
function creditsReducer(state, action) {
  switch (action.type) {
    case "ADD_MASTER_PACKAGE":
      return { ...state, masterPackages: [...(state.masterPackages || []), { id: `pkg-${Date.now()}`, ...action.packageData }] };

    case "UPDATE_MASTER_PACKAGE": // invoice lama memakai snapshot paket, jadi tidak ikut berubah
      return { ...state, masterPackages: (state.masterPackages || []).map((p) => (p.id === action.id ? { ...p, ...action.patch } : p)) };

    case "ADD_RECORD": {
      const exists = state.records.some((r) => r.clientId === action.record.clientId);
      return {
        ...state,
        records: exists
          ? mapClientRecord(state.records, action.record.clientId, (r) => ({ ...r, ...action.record }))
          : [...state.records, action.record],
      };
    }

    case "SPEND_PACKAGE_CREDIT":
      return { ...state, records: mapClientRecord(state.records, action.clientId, (r) => applySessionCompleted(r, action)) };

    case "HANDLE_CANCELLATION":
      return { ...state, records: mapClientRecord(state.records, action.clientId, (r) => applySessionCancelled(r, action)) };

    case "REVERT_SESSION_CREDIT":
      return { ...state, records: mapClientRecord(state.records, action.clientId, (r) => applySessionReverted(r, action)) };

    case "DELETE_INVOICES": { // hapus permanen: HANYA invoice belum lunas/ditolak (belum punya paket); invoice lunas lewat VOID
      const ids = new Set(action.ids);
      const doomed = (state.invoices || []).filter((inv) => ids.has(inv.id) && canDeleteInvoice(inv));
      if (doomed.length === 0) return state;
      const gone = new Set(doomed.map((i) => i.id));
      let records = state.records;
      doomed.forEach((inv) => {
        if (inv.balanceApplied > 0) records = adjustBalance(records, inv, inv.balanceApplied); // saldo lebihan yang dipakai kembali ke client
      });
      return { ...state, invoices: (state.invoices || []).filter((inv) => !gone.has(inv.id)), records };
    }

    case "VOID_INVOICE": { // invoice lunas dibatalkan: tetap tercatat (status void, alasan, log); keluar dari omzet
      const inv = (state.invoices || []).find((i) => i.id === action.invoiceId);
      if (!inv || !canVoidInvoice(inv)) return state;
      const isPackage = invoiceType(inv) === "package";
      const creditAction = isPackage ? action.creditAction : null;
      const revoke = creditAction === "revoke";
      const voided = appendInvoiceLog(
        { ...inv, status: "void", voidReason: action.reason, voidedAt: todayStr(), voidedBy: action.by || null, voidCreditAction: creditAction },
        {
          action: "voided",
          by: action.by,
          note: `Void: ${action.reason}.${isPackage ? (revoke ? " Sisa kredit paket dicabut." : " Kredit paket dipertahankan.") : ""}`,
          data: { reason: action.reason, creditAction },
        }
      );
      const hasRecord = state.records.some((r) => r.clientId === inv.clientId);
      return {
        ...state,
        invoices: state.invoices.map((i) => (i.id === inv.id ? voided : i)),
        records:
          revoke && hasRecord
            ? mapClientRecord(state.records, inv.clientId, (r) => applyVoidRevoke(r, inv, { note: `Void ${inv.invoiceNumber}: ${action.reason}` }))
            : state.records,
      };
    }

    case "PURGE_CLIENT": // hapus client: seluruh data kreditnya (record paket+ledger, invoice, konversi)
      return {
        ...state,
        records: state.records.filter((r) => r.clientId !== action.clientId),
        invoices: (state.invoices || []).filter((inv) => inv.clientId !== action.clientId),
        conversions: (state.conversions || []).filter((c) => c.clientId !== action.clientId),
      };

    case "ISSUE_INVOICE": {
      // `paidDirect` (invoice assessment): Finance langsung menandai lunas, tanpa bukti bayar dari ortu.
      const paidDirect = Boolean(action.paidDirect);
      const issued = appendInvoiceLog(newInvoice(state, action, { amount: action.amount, status: paidDirect ? "paid" : "unpaid", proofOfPaymentUrl: null, paidAt: paidDirect ? todayStr() : null }), {
        action: "issued",
        by: action.by,
        note: `Invoice ${action.isRenewal ? "renewal " : ""}diterbitkan (${action.packageName || "Assessment"})${action.replacesInvoiceId ? `, menggantikan ${(state.invoices || []).find((i) => i.id === action.replacesInvoiceId)?.invoiceNumber || "invoice void"}` : ""}`,
      });
      const base = paidDirect
        ? appendInvoiceLog(issued, { action: "verified", by: action.by, note: `Langsung ditandai lunas oleh Finance.${action.note ? ` Catatan: ${action.note}` : ""}` })
        : issued;
      const { invoice, records } = withBalanceApplied(state, base, action.by);
      return { ...state, records, invoices: [invoice, ...(state.invoices || [])] };
    }

    case "UPLOAD_PAYMENT_PROOF":
      return {
        ...state,
        invoices: (state.invoices || []).map((inv) => {
          const matches = action.invoiceId ? inv.id === action.invoiceId : inv.clientId === action.clientId;
          if (!matches || !canUploadProof(inv)) return inv; // upload sekali + re-upload maks 3x
          return appendInvoiceLog({
            ...inv,
            proofUploadCount: proofUploadsUsed(inv) + 1,
            proofOfPaymentUrl: action.proofUrl,
            proofUrl: action.proofUrl,
            proofFileName: action.fileName || inv.proofFileName || (action.fileType?.includes("pdf") ? "bukti-transfer.pdf" : "bukti-transfer.jpg"),
            proofFileType: action.fileType || inv.proofFileType || "image/jpeg",
            proofFileSize: action.fileSize != null ? action.fileSize : inv.proofFileSize,
            proofUploadedAt: action.uploadedAt || new Date().toISOString(),
          }, { action: "proof_uploaded", by: action.by || "Orang tua", note: `Bukti bayar diunggah (upload ke-${proofUploadsUsed(inv) + 1})` });
        }),
      };

    case "VERIFY_PAYMENT_PROOF": {
      const target = (state.invoices || []).find((inv) => inv.id === action.invoiceId);
      const isApproving = action.status === "paid";
      // Invoice pengganti (invoice void sebelumnya): paket lama dipakai ulang, kredit TIDAK bertambah
      const rec = target ? state.records.find((r) => r.clientId === target.clientId) : null;
      const adoption =
        isApproving && target?.replacesInvoiceId && rec && invoiceType(target) === "package"
          ? adoptPackageForReplacement(rec, target.replacesInvoiceId, target)
          : { adopted: false };
      const replacedNumber = (state.invoices || []).find((i) => i.id === target?.replacesInvoiceId)?.invoiceNumber || "invoice void";
      const invoices = (state.invoices || []).map((inv) =>
        inv.id === action.invoiceId
          ? appendInvoiceLog(
              {
                ...inv,
                status: action.status,
                paidAt: isApproving ? todayStr() : null,
                proofOfPaymentUrl: action.proofUrl || inv.proofOfPaymentUrl || inv.proofUrl,
                proofUrl: action.proofUrl || inv.proofUrl || inv.proofOfPaymentUrl,
              },
              isApproving
                ? { action: "verified", by: action.by, note: adoption.adopted ? `Pembayaran diverifikasi Finance. Menggantikan ${replacedNumber}: paket lama dipakai ulang (kredit tidak bertambah)` : "Pembayaran diverifikasi Finance" }
                : { action: "rejected", by: action.by, note: "Pembayaran ditandai belum valid" }
            )
          : inv
      );
      // Invoice assessment tidak membuat paket/kredit: hanya lunas (membuka kuesioner ortu).
      if (!isApproving || !target || invoiceType(target) === "assessment") return { ...state, invoices };
      if (adoption.adopted) return { ...state, invoices, records: state.records.map((r) => (r.clientId === target.clientId ? adoption.record : r)) };

      // Pembayaran disetujui → paket kredit baru untuk client (record dibuat bila belum ada).
      // Kredit & harga memakai snapshot invoice; `creditsToAdd` hanya untuk invoice lama tanpa snapshot.
      const credits = target.credits || action.creditsToAdd || 10;
      const pkg = { ...newClientPackage({ id: action.newPackageId, packageId: target.packageId, packageName: target.packageName, credits, price: target.grossAmount || target.amount }), invoiceId: target.id };
      const note = `Pembayaran ${target.invoiceNumber} diverifikasi Finance (+${credits} kredit)`;
      return { ...state, invoices, records: addPackageToClient(state.records, target, pkg, note) };
    }

    case "RENEW_CREDIT": {
      const pkg = newClientPackage({ id: action.newPackageId, packageId: action.packageId, packageName: action.packageName, credits: action.credits, price: action.amount || null });
      const hasRecord = state.records.some((r) => r.clientId === action.clientId);
      const note = hasRecord
        ? `${action.isRenewal === false ? "Paket baru langsung lunas oleh Finance" : "Renewal kredit oleh Finance"} (+${action.credits} sesi)`
        : `Aktivasi paket awal oleh Finance (+${action.credits} sesi)`;
      const base = appendInvoiceLog(
        newInvoice(state, { ...action, invoiceType: "package", isRenewal: action.isRenewal !== false, replacesInvoiceId: action.replacesInvoiceId }, {
          amount: action.amount || 2500000,
          status: "paid",
          proofOfPaymentUrl: "verified-by-finance.png",
          paidAt: todayStr(),
          renewalReason: action.reason || null,
        }),
        {
          action: "renewal_paid",
          by: action.by,
          note: `${action.isRenewal === false ? "Invoice paket langsung lunas oleh Finance" : "Renewal langsung oleh Finance"} (${action.replacesInvoiceId ? "menggantikan invoice void, paket lama dipakai ulang" : `+${action.credits} sesi`}).${action.reason ? ` Catatan: ${action.reason}` : ""}`,
          data: { reason: action.reason || null },
        }
      );
      const { invoice, records } = withBalanceApplied(state, base, action.by);
      // Renewal yang menggantikan invoice void: paket lama dipakai ulang (invoiceId dipindah), kredit TIDAK bertambah
      const rec = action.replacesInvoiceId ? records.find((r) => r.clientId === action.clientId) : null;
      const adoption = rec ? adoptPackageForReplacement(rec, action.replacesInvoiceId, invoice) : { adopted: false };
      if (adoption.adopted) {
        return {
          ...state,
          invoices: [invoice, ...(state.invoices || [])],
          records: records.map((r) => (r.clientId === action.clientId ? adoption.record : r)),
        };
      }
      const withInvoiceId = { ...pkg, invoiceId: invoice.id, price: invoice.grossAmount || invoice.amount };
      return {
        ...state,
        invoices: [invoice, ...(state.invoices || [])],
        records: addPackageToClient(records, action, withInvoiceId, note),
      };
    }

    case "CONVERT_PACKAGE": {
      // Konversi sisa sesi ke paket lain (aturan di domain/credit.js; angka sudah divalidasi pemanggil).
      const conversionId = action.conversionId || `cv-${uid().slice(-8)}`;
      const note = `Konversi paket oleh Finance: ${action.sourceName} → ${action.target.packageName} (${action.mode === "manual" ? "manual" : "otomatis"})`;
      const records = mapClientRecord(state.records, action.clientId, (r) =>
        applyPackageConversion(r, {
          sourcePackageId: action.sourcePackageId,
          target: action.target,
          sessions: action.sessions,
          price: action.price,
          leftover: action.leftover,
          conversionId,
          note,
        })
      );
      const invoices = (state.invoices || []).map((inv) =>
        inv.id === action.invoiceId
          ? appendInvoiceLog(inv, {
              action: "converted",
              by: action.by,
              note: `${action.sourceName} (sisa ${action.remainingCredit} sesi) → ${action.target.packageName} ${action.sessions} sesi. ${action.mode === "manual" ? "Manual" : "Dihitung otomatis"}${action.leftover > 0 ? `. Lebihan Rp${action.leftover} jadi saldo client` : ""}${action.reason ? `. Catatan Finance: ${action.reason}` : ""}`,
              data: {
                conversionId,
                mode: action.mode,
                reason: action.reason || null,
                fromPackage: action.sourceName,
                fromRemaining: action.remainingCredit,
                toPackage: action.target.packageName,
                toSessions: action.sessions,
                leftover: action.leftover,
              },
            })
          : inv
      );
      return {
        ...state,
        records,
        invoices,
        conversions: [
          ...(state.conversions || []),
          {
            id: conversionId,
            clientId: action.clientId,
            invoiceId: action.invoiceId,
            fromPackageId: action.sourcePackageId,
            fromRemaining: action.remainingCredit,
            toPackageName: action.target.packageName,
            toSessions: action.sessions,
            mode: action.mode,
            reason: action.reason || null,
            leftover: action.leftover,
            createdAt: new Date().toISOString(),
            createdBy: action.by || null,
          },
        ],
      };
    }

    default:
      return state;
  }
}

export const CreditsProvider = ({ children }) => {
  const [rawCredits, dispatch] = usePersistentReducer("credits", creditsReducer, () => getSeedLoader().loadCreditsSeed());
  const credits = rawCredits;

  const deleteInvoices = (ids) => dispatch({ type: "DELETE_INVOICES", ids });
  const purgeClientCredit = (clientId) => dispatch({ type: "PURGE_CLIENT", clientId });
  const addMasterPackage = (packageData) => dispatch({ type: "ADD_MASTER_PACKAGE", packageData });
  const updateMasterPackage = (id, patch) => dispatch({ type: "UPDATE_MASTER_PACKAGE", id, patch });
  const addRecord = (record) => dispatch({ type: "ADD_RECORD", record });
  const spendPackageCredit = ({ clientId, packageId, scheduleId, date }) =>
    dispatch({ type: "SPEND_PACKAGE_CREDIT", clientId, packageId, scheduleId, date });
  const handleScheduleCancellation = ({ clientId, packageId, scheduleId, cancelReason, date, deductCredit, kind }) =>
    dispatch({ type: "HANDLE_CANCELLATION", clientId, packageId, scheduleId, cancelReason, date, deductCredit, kind });
  const revertSessionCredit = ({ clientId, scheduleId, date, reason }) =>
    dispatch({ type: "REVERT_SESSION_CREDIT", clientId, scheduleId, date, reason });
  const issueInvoice = ({ clientId, clientName, branchId, packageId, packageName, amount, type, typeCode, credits, isRenewal, replacesInvoiceId, paidDirect, note, by }) =>
    dispatch({ type: "ISSUE_INVOICE", clientId, clientName, branchId, packageId, packageName, amount, invoiceType: type, typeCode, credits, isRenewal, replacesInvoiceId, paidDirect, note, by });
  // Void invoice lunas (alasan wajib; `creditAction` keep | revoke wajib bila invoice punya paket). Jadwal: lihat useInvoiceVoidActions.
  const voidInvoice = ({ invoiceId, reason, creditAction, by }) => dispatch({ type: "VOID_INVOICE", invoiceId, reason, creditAction, by });
  const uploadPaymentProof = ({ invoiceId, clientId, proofUrl, fileName, fileType, fileSize, uploadedAt }) =>
    dispatch({ type: "UPLOAD_PAYMENT_PROOF", invoiceId, clientId, proofUrl, fileName, fileType, fileSize, uploadedAt });
  const verifyPaymentProof = ({ invoiceId, status, proofUrl, creditsToAdd, newPackageId, by }) =>
    dispatch({ type: "VERIFY_PAYMENT_PROOF", invoiceId, status, proofUrl, creditsToAdd, newPackageId, by });
  // Renewal / invoice paket langsung lunas: `reason` = catatan Finance (opsional); `isRenewal: false` untuk paket pertama
  const renewClientCredit = ({ clientId, clientName, branchId, packageId, packageName, credits, amount, typeCode, reason, isRenewal, newPackageId, replacesInvoiceId, by }) =>
    dispatch({ type: "RENEW_CREDIT", clientId, clientName, branchId, packageId, packageName, credits, amount, typeCode, reason, isRenewal, newPackageId, replacesInvoiceId, by });
  // Konversi paket (angka sudah divalidasi `computePackageConversion`): lihat usePackageConversionActions.
  const convertPackage = (payload) => dispatch({ type: "CONVERT_PACKAGE", ...payload });

  // Selector
  const getRecordForClient = (clientId) => summarizeCreditRecord((credits.records || []).find((r) => r.clientId === clientId));
  const getInvoicesForClient = (clientId) => (credits.invoices || []).filter((inv) => inv.clientId === clientId);
  const getAllInvoices = () => credits.invoices || [];
  const getCreditBalance = (clientId) => balanceOf(credits.records || [], clientId);
  const getRawRecord = (clientId) => (credits.records || []).find((r) => r.clientId === clientId) || null;
  const getMasterPackages = () => credits.masterPackages || [];

  return (
    <CreditsContext.Provider
      value={{
        credits,
        addMasterPackage,
        deleteInvoices,
        voidInvoice,
        purgeClientCredit,
        addRecord,
        spendPackageCredit,
        handleScheduleCancellation,
        revertSessionCredit,
        issueInvoice,
        uploadPaymentProof,
        verifyPaymentProof,
        renewClientCredit,
        convertPackage,
        getCreditBalance,
        getRawRecord,
        getRecordForClient,
        getInvoicesForClient,
        getAllInvoices,
        getMasterPackages,
        updateMasterPackage,
      }}
    >
      {children}
    </CreditsContext.Provider>
  );
};

export const useCredits = () => useContext(CreditsContext);
