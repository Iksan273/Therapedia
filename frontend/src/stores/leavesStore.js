import React, { createContext, useContext } from "react";
import { usePersistentReducer } from "@/shared/hooks/usePersistentState";
import { nowIso } from "@/shared/lib/id";
import { getSeedLoader } from "@/data/seedRegistry";

const LeavesContext = createContext(null);

function leavesReducer(state, action) {
  switch (action.type) {
    case "ADD":
      return [action.leave, ...state];
    case "UPDATE":
      return state.map((l) => (l.id === action.id ? { ...l, ...action.patch, updatedAt: nowIso() } : l));
    case "DELETE_MANY": // hapus permanen (ADR 0005)
      return state.filter((l) => !action.ids.includes(l.id));
    case "DELETE_BY_CLIENT":
      return state.filter((l) => l.clientId !== action.clientId);
    default:
      return state;
  }
}

// Log cuti client (jatah 30 hari/tahun). Berdiri sendiri; seed demo 3 contoh (aktif / selesai lebih awal / void) yang tertaut ke sesi seed.
// Efek ke sesi (Off / kembali scheduled) dirangkai di useLeaveActions (features/finance).
export const LeavesProvider = ({ children }) => {
  const [leaves, dispatch] = usePersistentReducer("leaves", leavesReducer, () => getSeedLoader().loadLeavesSeed());

  const addLeave = (leave) => dispatch({ type: "ADD", leave });
  const updateLeave = (id, patch) => dispatch({ type: "UPDATE", id, patch });
  const deleteLeaves = (ids) => dispatch({ type: "DELETE_MANY", ids });
  const purgeClientLeaves = (clientId) => dispatch({ type: "DELETE_BY_CLIENT", clientId });
  const getLeave = (id) => leaves.find((l) => l.id === id) || null;
  const getLeavesForClient = (clientId) => leaves.filter((l) => l.clientId === clientId);

  return (
    <LeavesContext.Provider value={{ leaves, addLeave, updateLeave, deleteLeaves, purgeClientLeaves, getLeave, getLeavesForClient }}>
      {children}
    </LeavesContext.Provider>
  );
};

export const useLeaves = () => useContext(LeavesContext);
