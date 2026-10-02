import { createContext, useContext } from "react";
import { usePersistentReducer } from "@/shared/hooks/usePersistentState";
import { getSeedLoader } from "@/data/seedRegistry";

// Audit log mode demo. Append-only: tidak ada aksi edit/hapus (sama dengan tabel audit_logs di backend).
// Batas jumlah entri menjaga kuota localStorage; backend menyimpan semuanya (partisi bulanan).
const MAX_ENTRIES = 2000;

const AuditContext = createContext(null);

function auditReducer(state, action) {
  switch (action.type) {
    case "APPEND": {
      const next = [...action.entries].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
      return [...next, ...state].slice(0, MAX_ENTRIES);
    }
    default:
      return state;
  }
}

export const AuditProvider = ({ children }) => {
  const [auditLogs, dispatch] = usePersistentReducer("audit_logs", auditReducer, () => getSeedLoader().loadAuditLogsSeed());

  // Terima satu entri atau array entri (satu batch aksi)
  const appendAudit = (entryOrEntries) => {
    const entries = Array.isArray(entryOrEntries) ? entryOrEntries : [entryOrEntries];
    if (entries.length) dispatch({ type: "APPEND", entries });
  };

  return <AuditContext.Provider value={{ auditLogs, appendAudit }}>{children}</AuditContext.Provider>;
};

export const useAudit = () => useContext(AuditContext);
