import React, { createContext, useContext } from "react";
import { usePersistentReducer } from "@/shared/hooks/usePersistentState";
import { getSeedLoader } from "@/data/seedRegistry";
import { todayStr, uid } from "@/shared/lib/id";
import {
  appendInvoiceLog,
  applyBalanceToAmount,
  applyPackageAdded,
  applyPackageConversion,
  applySessionCancelled,
  applySessionCompleted,
  applySessionReverted,
  canUploadProof,
  directRenewalReasonLabel,
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

    case "DELETE_INVOICES": { // soft delete (invoice paid yang dihapus keluar dari omzet; paket & kredit tidak berubah)
      // Invoice belum lunas yang sempat memakai saldo lebihan mengembalikan saldonya ke client.
      let records = state.records;
      const invoices = (state.invoices || []).map((inv) => {
        if (!action.ids.includes(inv.id) || inv.deletedAt) return inv;
        let next = { ...inv, deletedAt: new Date().toISOString(), deletedBy: action.by || null };
        if (inv.balanceApplied > 0 && inv.status !== "paid") {
          records = adjustBalance(records, inv, inv.balanceApplied);
          next = appendInvoiceLog(next, { action: "balance_restored", by: action.by, note: "Invoice dihapus: saldo lebihan dikembalikan ke client", data: { amount: inv.balanceApplied } });
        }
        return appendInvoiceLog(next, { action: "deleted", by: action.by, note: "Invoice dihapus (soft delete)" });
      });
      return { ...state, invoices, records };
    }

    case "ISSUE_INVOICE": {
      const base = appendInvoiceLog(newInvoice(state, action, { amount: action.amount, status: "unpaid", proofOfPaymentUrl: null, paidAt: null }), {
        action: "issued",
        by: action.by,
        note: `Invoice diterbitkan (${action.packageName || "Assessment"})`,
      });
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
                ? { action: "verified", by: action.by, note: "Pembayaran diverifikasi Finance" }
                : { action: "rejected", by: action.by, note: "Pembayaran ditandai belum valid" }
            )
          : inv
      );
      // Invoice assessment tidak membuat paket/kredit: hanya lunas (membuka kuesioner ortu).
      if (!isApproving || !target || invoiceType(target) === "assessment") return { ...state, invoices };

      // Pembayaran disetujui → paket kredit baru untuk client (record dibuat bila belum ada).
      // Kredit & harga memakai snapshot invoice; `creditsToAdd` hanya untuk invoice lama tanpa snapshot.
      const credits = target.credits || action.creditsToAdd || 10;
      const pkg = { ...newClientPackage({ packageId: target.packageId, packageName: target.packageName, credits, price: target.grossAmount || target.amount }), invoiceId: target.id };
      const note = `Pembayaran ${target.invoiceNumber} diverifikasi Finance (+${credits} kredit)`;
      return { ...state, invoices, records: addPackageToClient(state.records, target, pkg, note) };
    }

    case "RENEW_CREDIT": {
      const pkg = newClientPackage({ packageId: action.packageId, packageName: action.packageName, credits: action.credits, price: action.amount || null });
      const hasRecord = state.records.some((r) => r.clientId === action.clientId);
      const note = hasRecord
        ? `Renewal kredit oleh Finance (+${action.credits} sesi)`
        : `Aktivasi paket awal oleh Finance (+${action.credits} sesi)`;
      const base = appendInvoiceLog(
        newInvoice(state, { ...action, invoiceType: "package" }, {
          amount: action.amount || 2500000,
          status: "paid",
          proofOfPaymentUrl: "verified-by-finance.png",
          paidAt: todayStr(),
          renewalReason: action.reason || null,
          renewalJustification: action.justification || null,
        }),
        {
          action: "renewal_paid",
          by: action.by,
          note: `Renewal langsung oleh Finance (+${action.credits} sesi). Alasan: ${directRenewalReasonLabel(action.reason)}. Justifikasi: ${action.justification || "—"}`,
          data: { reason: action.reason || null, justification: action.justification || null },
        }
      );
      const { invoice, records } = withBalanceApplied(state, base, action.by);
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
              note: `${action.sourceName} (sisa ${action.remainingCredit} sesi) → ${action.target.packageName} ${action.sessions} sesi. ${action.mode === "manual" ? `Manual: ${action.reason}` : "Dihitung otomatis"}${action.leftover > 0 ? `. Lebihan Rp${action.leftover} jadi saldo client` : ""}`,
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
  const credits = React.useMemo(() => ({ ...rawCredits, invoices: (rawCredits.invoices || []).filter((inv) => !inv.deletedAt) }), [rawCredits]);

  const deleteInvoices = (ids, by) => dispatch({ type: "DELETE_INVOICES", ids, by });
  const addMasterPackage = (packageData) => dispatch({ type: "ADD_MASTER_PACKAGE", packageData });
  const addRecord = (record) => dispatch({ type: "ADD_RECORD", record });
  const spendPackageCredit = ({ clientId, packageId, scheduleId, date }) =>
    dispatch({ type: "SPEND_PACKAGE_CREDIT", clientId, packageId, scheduleId, date });
  const handleScheduleCancellation = ({ clientId, packageId, scheduleId, cancelReason, date, deductCredit }) =>
    dispatch({ type: "HANDLE_CANCELLATION", clientId, packageId, scheduleId, cancelReason, date, deductCredit });
  const revertSessionCredit = ({ clientId, scheduleId, date, reason }) =>
    dispatch({ type: "REVERT_SESSION_CREDIT", clientId, scheduleId, date, reason });
  const issueInvoice = ({ clientId, clientName, branchId, packageId, packageName, amount, type, typeCode, credits, by }) =>
    dispatch({ type: "ISSUE_INVOICE", clientId, clientName, branchId, packageId, packageName, amount, invoiceType: type, typeCode, credits, by });
  const uploadPaymentProof = ({ invoiceId, clientId, proofUrl, fileName, fileType, fileSize, uploadedAt }) =>
    dispatch({ type: "UPLOAD_PAYMENT_PROOF", invoiceId, clientId, proofUrl, fileName, fileType, fileSize, uploadedAt });
  const verifyPaymentProof = ({ invoiceId, status, proofUrl, creditsToAdd, by }) =>
    dispatch({ type: "VERIFY_PAYMENT_PROOF", invoiceId, status, proofUrl, creditsToAdd, by });
  // Renewal langsung lunas: `reason` + `justification` wajib (divalidasi `validateDirectRenewal` oleh pemanggil)
  const renewClientCredit = ({ clientId, clientName, branchId, packageId, packageName, credits, amount, typeCode, reason, justification, by }) =>
    dispatch({ type: "RENEW_CREDIT", clientId, clientName, branchId, packageId, packageName, credits, amount, typeCode, reason, justification, by });
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
      }}
    >
      {children}
    </CreditsContext.Provider>
  );
};

export const useCredits = () => useContext(CreditsContext);
