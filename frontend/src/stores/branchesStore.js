import React, { createContext, useContext } from "react";
import { usePersistentReducer } from "@/shared/hooks/usePersistentState";
import { DEFAULT_BRANCHES, newBranchId, syncBranches } from "@/domain/branch";

const BranchesContext = createContext(null);

function branchesReducer(state, action) {
  switch (action.type) {
    case "ADD":
      return [...state, action.branch];
    case "UPDATE":
      return state.map((b) => (b.id === action.id ? { ...b, ...action.patch, updatedBy: action.by || null } : b));
    case "DELETE": // hapus permanen (ADR 0005); isi cabang dihapus hook use-case useBranchDeleteActions
      return state.filter((b) => b.id !== action.id);
    case "SET_ACTIVE": // nonaktif = tidak muncul di pilihan baru; data & riwayat cabang tetap
      return state.map((b) => (b.id === action.id ? { ...b, isActive: action.isActive, updatedBy: action.by || null } : b));
    default:
      return state;
  }
}

// Master data cabang (dikelola Master). Hapus = permanen beserta seluruh isi cabang (hook useBranchDeleteActions, ADR 0005);
// cabang yang hanya tidak beroperasi lagi cukup dinonaktifkan.
export const BranchesProvider = ({ children }) => {
  const [branches, dispatch] = usePersistentReducer("branches", branchesReducer, () => DEFAULT_BRANCHES);
  syncBranches(branches); // registry domain (`BRANCHES`, `branchName`) selalu mengikuti store

  const addBranch = ({ name, code, city, address, phone }, by) => {
    const id = newBranchId(name);
    const branch = {
      id: branches.some((b) => b.id === id) ? `${id}-${Date.now().toString(36)}` : id,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      city: (city || "").trim(),
      address: (address || "").trim(),
      phone: (phone || "").trim(),
      isActive: true,
      createdBy: by || null,
    };
    dispatch({ type: "ADD", branch });
    return branch;
  };
  const updateBranch = (id, patch, by) => dispatch({ type: "UPDATE", id, patch, by });
  const deleteBranch = (id) => dispatch({ type: "DELETE", id });
  const setBranchActive = (id, isActive, by) => dispatch({ type: "SET_ACTIVE", id, isActive, by });

  return (
    <BranchesContext.Provider value={{ branches, addBranch, updateBranch, setBranchActive, deleteBranch }}>{children}</BranchesContext.Provider>
  );
};

export const useBranches = () => useContext(BranchesContext);
