import React, { createContext, useContext } from "react";
import { usePersistentReducer } from "@/shared/hooks/usePersistentState";
import { getSeedLoader } from "@/data/seedRegistry";
import { todayStr } from "@/shared/lib/id";
import {
  applyPackageAdded,
  applySessionCancelled,
  applySessionCompleted,
  newClientPackage,
  newCreditRecord,
  nextInvoiceNumber,
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

const newInvoice = (state, action, extra) => ({
  id: `inv-${Date.now()}`,
  invoiceNumber: nextInvoiceNumber(state.invoices || []),
  clientId: action.clientId,
  clientName: action.clientName,
  branchId: action.branchId || "branch-sby-timur",
  packageName: action.packageName,
  packageId: action.packageId,
  createdAt: todayStr(),
  ...extra,
});

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

    case "ISSUE_INVOICE":
      return {
        ...state,
        invoices: [newInvoice(state, action, { amount: action.amount, status: "unpaid", proofOfPaymentUrl: null, paidAt: null }), ...(state.invoices || [])],
      };

    case "UPLOAD_PAYMENT_PROOF":
      return {
        ...state,
        invoices: (state.invoices || []).map((inv) => {
          const matches = action.invoiceId ? inv.id === action.invoiceId : inv.clientId === action.clientId;
          if (!matches) return inv;
          return {
            ...inv,
            proofOfPaymentUrl: action.proofUrl,
            proofUrl: action.proofUrl,
            proofFileName: action.fileName || inv.proofFileName || (action.fileType?.includes("pdf") ? "bukti-transfer.pdf" : "bukti-transfer.jpg"),
            proofFileType: action.fileType || inv.proofFileType || "image/jpeg",
            proofFileSize: action.fileSize != null ? action.fileSize : inv.proofFileSize,
            proofUploadedAt: action.uploadedAt || new Date().toISOString(),
          };
        }),
      };

    case "VERIFY_PAYMENT_PROOF": {
      const target = (state.invoices || []).find((inv) => inv.id === action.invoiceId);
      const isApproving = action.status === "paid";
      const invoices = (state.invoices || []).map((inv) =>
        inv.id === action.invoiceId
          ? {
              ...inv,
              status: action.status,
              paidAt: isApproving ? todayStr() : null,
              proofOfPaymentUrl: action.proofUrl || inv.proofOfPaymentUrl || inv.proofUrl,
              proofUrl: action.proofUrl || inv.proofUrl || inv.proofOfPaymentUrl,
            }
          : inv
      );
      if (!isApproving || !target) return { ...state, invoices };

      // Pembayaran disetujui → paket kredit baru untuk client (record dibuat bila belum ada)
      const credits = action.creditsToAdd || 10;
      const pkg = newClientPackage({ packageId: target.packageId, packageName: target.packageName, credits });
      const note = `Pembayaran ${target.invoiceNumber} diverifikasi Finance (+${credits} kredit)`;
      return { ...state, invoices, records: addPackageToClient(state.records, target, pkg, note) };
    }

    case "RENEW_CREDIT": {
      const pkg = newClientPackage({ packageId: action.packageId, packageName: action.packageName, credits: action.credits });
      const hasRecord = state.records.some((r) => r.clientId === action.clientId);
      const note = hasRecord
        ? `Renewal kredit oleh Finance (+${action.credits} sesi)`
        : `Aktivasi paket awal oleh Finance (+${action.credits} sesi)`;
      const invoice = newInvoice(state, action, {
        amount: action.amount || 2500000,
        status: "paid",
        proofOfPaymentUrl: "verified-by-finance.png",
        paidAt: todayStr(),
      });
      return {
        ...state,
        invoices: [invoice, ...(state.invoices || [])],
        records: addPackageToClient(state.records, action, pkg, note),
      };
    }

    default:
      return state;
  }
}

export const CreditsProvider = ({ children }) => {
  const [credits, dispatch] = usePersistentReducer("credits", creditsReducer, () => getSeedLoader().loadCreditsSeed());

  const addMasterPackage = (packageData) => dispatch({ type: "ADD_MASTER_PACKAGE", packageData });
  const addRecord = (record) => dispatch({ type: "ADD_RECORD", record });
  const spendPackageCredit = ({ clientId, packageId, scheduleId, date }) =>
    dispatch({ type: "SPEND_PACKAGE_CREDIT", clientId, packageId, scheduleId, date });
  const handleScheduleCancellation = ({ clientId, packageId, scheduleId, cancelReason, date }) =>
    dispatch({ type: "HANDLE_CANCELLATION", clientId, packageId, scheduleId, cancelReason, date });
  const issueInvoice = ({ clientId, clientName, branchId, packageId, packageName, amount }) =>
    dispatch({ type: "ISSUE_INVOICE", clientId, clientName, branchId, packageId, packageName, amount });
  const uploadPaymentProof = ({ invoiceId, clientId, proofUrl, fileName, fileType, fileSize, uploadedAt }) =>
    dispatch({ type: "UPLOAD_PAYMENT_PROOF", invoiceId, clientId, proofUrl, fileName, fileType, fileSize, uploadedAt });
  const verifyPaymentProof = ({ invoiceId, status, proofUrl, creditsToAdd }) =>
    dispatch({ type: "VERIFY_PAYMENT_PROOF", invoiceId, status, proofUrl, creditsToAdd });
  const renewClientCredit = ({ clientId, clientName, branchId, packageId, packageName, credits, amount }) =>
    dispatch({ type: "RENEW_CREDIT", clientId, clientName, branchId, packageId, packageName, credits, amount });

  // Selector
  const getRecordForClient = (clientId) => summarizeCreditRecord((credits.records || []).find((r) => r.clientId === clientId));
  const getInvoicesForClient = (clientId) => (credits.invoices || []).filter((inv) => inv.clientId === clientId);
  const getAllInvoices = () => credits.invoices || [];
  const getMasterPackages = () => credits.masterPackages || [];

  return (
    <CreditsContext.Provider
      value={{
        credits,
        addMasterPackage,
        addRecord,
        spendPackageCredit,
        handleScheduleCancellation,
        issueInvoice,
        uploadPaymentProof,
        verifyPaymentProof,
        renewClientCredit,
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
