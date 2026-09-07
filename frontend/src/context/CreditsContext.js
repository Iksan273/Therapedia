import React, { createContext, useContext } from "react";
import { usePersistentReducer } from "@/hooks/useLocalStorage";
import { loadCreditsSeed } from "@/data/seedLoader";
import { todayStr, uid } from "@/lib/appUtils";

const CreditsContext = createContext(null);

function creditsReducer(state, action) {
  switch (action.type) {
    case "ADD_MASTER_PACKAGE": {
      const newPkg = { id: `pkg-${Date.now()}`, ...action.packageData };
      return {
        ...state,
        masterPackages: [...(state.masterPackages || []), newPkg],
      };
    }

    case "ADD_RECORD": {
      const exists = state.records.some((r) => r.clientId === action.record.clientId);
      if (exists) {
        return {
          ...state,
          records: state.records.map((r) => (r.clientId === action.record.clientId ? { ...r, ...action.record } : r)),
        };
      }
      return { ...state, records: [...state.records, action.record] };
    }

    case "SPEND_PACKAGE_CREDIT": {
      return {
        ...state,
        records: state.records.map((r) => {
          if (r.clientId !== action.clientId) return r;
          const pkgList = r.packages || [];
          if (pkgList.length === 0) return r;

          // Find target package or fallback to first package with remaining credits
          let targetIndex = pkgList.findIndex((p) => p.id === action.packageId || p.packageId === action.packageId);
          if (targetIndex === -1) {
            targetIndex = pkgList.findIndex((p) => p.remainingCredit > 0);
          }
          if (targetIndex === -1) return r; // No credits remaining

          const targetPkg = pkgList[targetIndex];
          // Prevent double charge for same schedule
          if (r.history && r.history.some((h) => h.scheduleId === action.scheduleId && h.action === "used")) {
            return r;
          }

          const updatedPackages = [...pkgList];
          updatedPackages[targetIndex] = {
            ...targetPkg,
            remainingCredit: Math.max(0, targetPkg.remainingCredit - 1),
            status: targetPkg.remainingCredit - 1 <= 0 ? "depleted" : "active",
          };

          return {
            ...r,
            packages: updatedPackages,
            history: [
              ...(r.history || []),
              {
                id: uid(),
                date: action.date || todayStr(),
                scheduleId: action.scheduleId,
                packageId: targetPkg.id,
                packageName: targetPkg.packageName,
                action: "used",
                creditChange: -1,
                note: `Sesi terapi selesai menggunakan ${targetPkg.packageName}`,
              },
            ],
          };
        }),
      };
    }

    case "HANDLE_CANCELLATION": {
      return {
        ...state,
        records: state.records.map((r) => {
          if (r.clientId !== action.clientId) return r;
          const currentCancelTotal = (r.cancelCountTotal || 0) + 1;
          const pkgList = r.packages || [];

          // Find package used for session
          let targetIndex = pkgList.findIndex((p) => p.id === action.packageId || p.packageId === action.packageId);
          if (targetIndex === -1) {
            targetIndex = pkgList.findIndex((p) => p.remainingCredit > 0);
          }
          const targetPkg = targetIndex !== -1 ? pkgList[targetIndex] : null;

          // Rule: Max 3x cancel excused. Cancel ke-4 and above deducts 1 credit from specific package!
          if (currentCancelTotal <= 3 || !targetPkg) {
            return {
              ...r,
              cancelCountTotal: currentCancelTotal,
              history: [
                ...(r.history || []),
                {
                  id: uid(),
                  date: action.date || todayStr(),
                  scheduleId: action.scheduleId,
                  packageId: targetPkg ? targetPkg.id : null,
                  packageName: targetPkg ? targetPkg.packageName : "General",
                  action: "cancel_excused",
                  creditChange: 0,
                  cancelReason: action.cancelReason || "lainnya",
                  note: `Cancel ke-${currentCancelTotal} (${action.cancelReason || "Izin"}) — Kuota wajar (Kredit utuh)`,
                },
              ],
            };
          }

          // Penalty case: cancelCount > 3
          const updatedPackages = [...pkgList];
          updatedPackages[targetIndex] = {
            ...targetPkg,
            remainingCredit: Math.max(0, targetPkg.remainingCredit - 1),
            cancelCount: (targetPkg.cancelCount || 0) + 1,
            status: targetPkg.remainingCredit - 1 <= 0 ? "depleted" : "active",
          };

          return {
            ...r,
            cancelCountTotal: currentCancelTotal,
            packages: updatedPackages,
            history: [
              ...(r.history || []),
              {
                id: uid(),
                date: action.date || todayStr(),
                scheduleId: action.scheduleId,
                packageId: targetPkg.id,
                packageName: targetPkg.packageName,
                action: "cancel_penalty",
                creditChange: -1,
                cancelReason: action.cancelReason || "lainnya",
                note: `Cancel ke-${currentCancelTotal} (>3x) — Penalti memotong 1 kredit ${targetPkg.packageName}`,
              },
            ],
          };
        }),
      };
    }

    case "ISSUE_INVOICE": {
      const newInv = {
        id: `inv-${Date.now()}`,
        invoiceNumber: `INV-${new Date().getFullYear()}-${String((state.invoices || []).length + 1).padStart(3, "0")}`,
        clientId: action.clientId,
        clientName: action.clientName,
        branchId: action.branchId || "branch-sby-timur",
        packageName: action.packageName,
        packageId: action.packageId,
        amount: action.amount,
        status: "unpaid",
        proofOfPaymentUrl: null,
        createdAt: todayStr(),
        paidAt: null,
      };
      return {
        ...state,
        invoices: [newInv, ...(state.invoices || [])],
      };
    }

    case "UPLOAD_PAYMENT_PROOF": {
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
    }

    case "VERIFY_PAYMENT_PROOF": {
      const targetInvoice = (state.invoices || []).find((inv) => inv.id === action.invoiceId);
      const isApproving = action.status === "paid";

      const updatedInvoices = (state.invoices || []).map((inv) =>
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

      if (!isApproving || !targetInvoice) {
        return { ...state, invoices: updatedInvoices };
      }

      // If approved, automatically add/renew the package in client record
      const creditsToAdd = action.creditsToAdd || 10;
      const updatedRecords = state.records.map((r) => {
        if (r.clientId !== targetInvoice.clientId) return r;
        const newPackageItem = {
          id: `cp-${uid().slice(-6)}`,
          packageId: targetInvoice.packageId || "pkg-reguler",
          packageName: targetInvoice.packageName || "Regular Therapist (10x)",
          totalCredit: creditsToAdd,
          remainingCredit: creditsToAdd,
          cancelCount: 0,
          status: "active",
        };
        return {
          ...r,
          packages: [...(r.packages || []), newPackageItem],
          history: [
            ...(r.history || []),
            {
              id: uid(),
              date: todayStr(),
              scheduleId: null,
              packageId: newPackageItem.id,
              packageName: newPackageItem.packageName,
              action: "renewed",
              creditChange: creditsToAdd,
              note: `Pembayaran ${targetInvoice.invoiceNumber} diverifikasi Finance (+${creditsToAdd} kredit)`,
            },
          ],
        };
      });

      return {
        ...state,
        invoices: updatedInvoices,
        records: updatedRecords,
      };
    }

    case "RENEW_CREDIT": {
      const newPackageItem = {
        id: `cp-${uid().slice(-6)}`,
        packageId: action.packageId || "pkg-reguler",
        packageName: action.packageName || "Regular Therapist (10x)",
        totalCredit: action.credits,
        remainingCredit: action.credits,
        cancelCount: 0,
        status: "active",
      };

      const newInv = {
        id: `inv-${Date.now()}`,
        invoiceNumber: `INV-${new Date().getFullYear()}-${String((state.invoices || []).length + 1).padStart(3, "0")}`,
        clientId: action.clientId,
        clientName: action.clientName,
        branchId: action.branchId || "branch-sby-timur",
        packageName: action.packageName,
        packageId: action.packageId,
        amount: action.amount || 2500000,
        status: "paid",
        proofOfPaymentUrl: "verified-by-finance.png",
        createdAt: todayStr(),
        paidAt: todayStr(),
      };

      const clientRecordExists = state.records.some((r) => r.clientId === action.clientId);
      let updatedRecords;

      if (clientRecordExists) {
        updatedRecords = state.records.map((r) => {
          if (r.clientId !== action.clientId) return r;
          return {
            ...r,
            packages: [...(r.packages || []), newPackageItem],
            history: [
              ...(r.history || []),
              {
                id: uid(),
                date: todayStr(),
                scheduleId: null,
                packageId: newPackageItem.id,
                packageName: newPackageItem.packageName,
                action: "renewed",
                creditChange: action.credits,
                note: `Renewal kredit oleh Finance (+${action.credits} sesi)`,
              },
            ],
          };
        });
      } else {
        updatedRecords = [
          ...state.records,
          {
            id: `cr-${uid().slice(-6)}`,
            clientId: action.clientId,
            branchId: action.branchId || "branch-sby-timur",
            packages: [newPackageItem],
            cancelCountTotal: 0,
            history: [
              {
                id: uid(),
                date: todayStr(),
                scheduleId: null,
                packageId: newPackageItem.id,
                packageName: newPackageItem.packageName,
                action: "renewed",
                creditChange: action.credits,
                note: `Aktivasi paket awal oleh Finance (+${action.credits} sesi)`,
              },
            ],
          },
        ];
      }

      return {
        ...state,
        invoices: [newInv, ...(state.invoices || [])],
        records: updatedRecords,
      };
    }

    default:
      return state;
  }
}

export const CreditsProvider = ({ children }) => {
  const [credits, dispatch] = usePersistentReducer("credits", creditsReducer, loadCreditsSeed);

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

  // Helper selectors
  const getRecordForClient = (clientId) => {
    const rec = (credits.records || []).find((r) => r.clientId === clientId);
    if (!rec) return null;
    const pkgs = rec.packages || [];
    const remainingCredit = pkgs.reduce((acc, p) => acc + (p.remainingCredit || 0), 0);
    const totalCredit = pkgs.reduce((acc, p) => acc + (p.totalCredit || 0), 0);
    return {
      ...rec,
      remainingCredit,
      totalCredit,
      packages: pkgs,
      cancelCountTotal: rec.cancelCountTotal || 0,
      leaveUsed: rec.cancelCountTotal || 0,
      leaveQuota: 3,
    };
  };

  const getInvoicesForClient = (clientId) =>
    (credits.invoices || []).filter((inv) => inv.clientId === clientId);

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
