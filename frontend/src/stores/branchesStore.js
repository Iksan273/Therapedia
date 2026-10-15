import React, { createContext, useContext } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePersistentReducer } from "@/shared/hooks/usePersistentState";
import { DEFAULT_BRANCHES, newBankAccountId, newBranchId, syncBranches } from "@/domain/branch";
import { isStaffSession } from "@/domain/auth";
import { isApiMode } from "@/config/env";
import { api } from "@/services/http/httpClient";
import { ENDPOINTS } from "@/services/api/endpoints";
import { bankAccountFromApi, bankAccountToApi, branchFromApi, branchToApi } from "@/services/api/mappers/organizationMapper";
import { useAuth } from "@/stores/authStore";

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
    // Rekening bank pembayaran cabang (ditampilkan ke ortu): tersimpan di dalam cabang
    case "ADD_BANK_ACCOUNT":
      return state.map((b) => (b.id === action.branchId ? { ...b, bankAccounts: [...(b.bankAccounts || []), action.account], updatedBy: action.by || null } : b));
    case "UPDATE_BANK_ACCOUNT":
      return state.map((b) =>
        b.id === action.branchId
          ? { ...b, bankAccounts: (b.bankAccounts || []).map((a) => (a.id === action.accountId ? { ...a, ...action.patch } : a)), updatedBy: action.by || null }
          : b
      );
    case "REMOVE_BANK_ACCOUNT":
      return state.map((b) =>
        b.id === action.branchId ? { ...b, bankAccounts: (b.bankAccounts || []).filter((a) => a.id !== action.accountId), updatedBy: action.by || null } : b
      );
    default:
      return state;
  }
}

// ---- Mode demo (localStorage)
const LocalBranchesProvider = ({ children }) => {
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

  // Rekening bank cabang (nama aksi = use-case; async agar bentuknya sama dengan mode API)
  const addBankAccount = async (branchId, form, by) => {
    const current = branches.find((b) => b.id === branchId)?.bankAccounts || [];
    const account = {
      id: newBankAccountId(),
      bankName: form.bankName.trim(),
      accountNumber: form.accountNumber.trim(),
      accountHolder: form.accountHolder.trim(),
      isActive: true,
      sortOrder: current.reduce((max, a) => Math.max(max, a.sortOrder ?? 0), 0) + 1,
    };
    dispatch({ type: "ADD_BANK_ACCOUNT", branchId, account, by });
    return account;
  };
  const updateBankAccount = async (branchId, accountId, form, by) => {
    const patch = { bankName: form.bankName.trim(), accountNumber: form.accountNumber.trim(), accountHolder: form.accountHolder.trim() };
    dispatch({ type: "UPDATE_BANK_ACCOUNT", branchId, accountId, patch, by });
  };
  const setBankAccountActive = async (branchId, accountId, isActive, by) =>
    dispatch({ type: "UPDATE_BANK_ACCOUNT", branchId, accountId, patch: { isActive }, by });
  const removeBankAccount = async (branchId, accountId, by) => dispatch({ type: "REMOVE_BANK_ACCOUNT", branchId, accountId, by });

  return (
    <BranchesContext.Provider
      value={{ branches, addBranch, updateBranch, setBranchActive, deleteBranch, addBankAccount, updateBankAccount, setBankAccountActive, removeBankAccount }}
    >
      {children}
    </BranchesContext.Provider>
  );
};

// ---- Mode API (Laravel): `GET /branches` dibaca semua staf (aktif + nonaktif; dipakai filter & combo box di semua halaman).
// Tulis (tambah/ubah/aktif) butuh modul `branch_master`. Mutasi mengembalikan Promise dan melempar `ApiError`
// (`message`, `fieldErrors`) untuk ditampilkan komponen. Hapus cabang permanen dikerjakan Sprint 4 (server membalas 501).
export const BRANCHES_QUERY_KEY = ["branches"];

const ApiBranchesProvider = ({ children }) => {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const enabled = isStaffSession(auth);

  const { data } = useQuery({
    queryKey: BRANCHES_QUERY_KEY,
    queryFn: ({ signal }) => api.get(ENDPOINTS.branches.list, undefined, { signal }).then((rows) => rows.map(branchFromApi)),
    enabled,
    staleTime: 5 * 60_000,
  });
  const branches = React.useMemo(() => data ?? [], [data]);
  syncBranches(branches);

  const refresh = () => queryClient.invalidateQueries({ queryKey: BRANCHES_QUERY_KEY });

  const create = useMutation({ mutationFn: (form) => api.post(ENDPOINTS.branches.list, branchToApi(form)), onSuccess: refresh });
  const update = useMutation({ mutationFn: ({ id, patch }) => api.patch(ENDPOINTS.branches.detail(id), branchToApi(patch)), onSuccess: refresh });
  const toggle = useMutation({ mutationFn: ({ id, isActive }) => api.patch(ENDPOINTS.branches.setActive(id), { isActive }), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (id) => api.delete(ENDPOINTS.branches.detail(id)), onSuccess: refresh });

  const addBranch = async (form) => branchFromApi(await create.mutateAsync(form));
  const updateBranch = async (id, patch) => branchFromApi(await update.mutateAsync({ id, patch }));
  const setBranchActive = async (id, isActive) => branchFromApi(await toggle.mutateAsync({ id, isActive }));
  const deleteBranch = (id) => remove.mutateAsync(id);

  // Rekening bank cabang: endpoint bersarang di cabang; daftar dibaca ulang lewat `GET /branches` (`bankAccounts`)
  const createAccount = useMutation({
    mutationFn: ({ branchId, form }) => api.post(ENDPOINTS.branches.bankAccounts(branchId), bankAccountToApi(form)),
    onSuccess: refresh,
  });
  const updateAccount = useMutation({
    mutationFn: ({ branchId, accountId, form }) => api.patch(ENDPOINTS.branches.bankAccount(branchId, accountId), bankAccountToApi(form)),
    onSuccess: refresh,
  });
  const toggleAccount = useMutation({
    mutationFn: ({ branchId, accountId, isActive }) => api.patch(ENDPOINTS.branches.bankAccountActive(branchId, accountId), { isActive }),
    onSuccess: refresh,
  });
  const removeAccount = useMutation({
    mutationFn: ({ branchId, accountId }) => api.delete(ENDPOINTS.branches.bankAccount(branchId, accountId)),
    onSuccess: refresh,
  });

  const addBankAccount = async (branchId, form) => bankAccountFromApi(await createAccount.mutateAsync({ branchId, form }));
  const updateBankAccount = async (branchId, accountId, form) => bankAccountFromApi(await updateAccount.mutateAsync({ branchId, accountId, form }));
  const setBankAccountActive = async (branchId, accountId, isActive) =>
    bankAccountFromApi(await toggleAccount.mutateAsync({ branchId, accountId, isActive }));
  const removeBankAccount = (branchId, accountId) => removeAccount.mutateAsync({ branchId, accountId });

  return (
    <BranchesContext.Provider
      value={{ branches, addBranch, updateBranch, setBranchActive, deleteBranch, addBankAccount, updateBankAccount, setBankAccountActive, removeBankAccount }}
    >
      {children}
    </BranchesContext.Provider>
  );
};

// Master data cabang (dikelola Master). Hapus = permanen beserta seluruh isi cabang (hook useBranchDeleteActions, ADR 0005);
// cabang yang hanya tidak beroperasi lagi cukup dinonaktifkan.
export const BranchesProvider = isApiMode() ? ApiBranchesProvider : LocalBranchesProvider;

export const useBranches = () => useContext(BranchesContext);
