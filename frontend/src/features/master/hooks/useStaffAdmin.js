import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePagination } from "@/shared/components/TablePagination";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { isStaffSession, validateStaffDeletion } from "@/domain/auth";
import { isApiMode } from "@/config/env";
import { api } from "@/services/http/httpClient";
import { ENDPOINTS } from "@/services/api/endpoints";
import { staffUserFromApi, staffUserToApi } from "@/services/api/mappers/organizationMapper";
import { useAuth } from "@/stores/authStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useRolesQuery } from "@/features/master/hooks/useRoleAdmin";

export const STAFF_QUERY_KEY = "staff-users";
const PAGE_SIZE = 10;

// Hook use-case halaman User Management. Dua implementasi dengan bentuk keluaran yang sama:
//   { users, pagination, isLoading, rolesList, addStaff, updateStaff, setStaffActive, deleteStaff, resetPassword, isEmailTaken }
// `branchFilter` ("all" = semua cabang) dan `search` berasal dari halaman. Mutasi async dan melempar `ApiError`
// (fieldErrors: email, roleId, branchId, password) untuk ditampilkan halaman. `deleteStaff` hanya Master dan menolak
// terapis yang punya jadwal (409 di server, `validateStaffDeletion` di demo).

// ---- Mode demo: filter + paginasi di sisi klien atas data localStorage.
function useStaffAdminLocal({ branchFilter, search }) {
  const { staffUsers, addStaffUser, updateStaffUser, setStaffActive, removeStaffUser, resetStaffPassword, rolesList, auth } = useAuth();
  const { schedules } = useSchedules();

  const filtered = useMemo(
    () =>
      (staffUsers || []).filter((u) => {
        if (branchFilter !== "all" && u.branchId && u.branchId !== branchFilter) return false; // akun semua cabang tampil di tiap cabang
        if (search.trim()) {
          const q = search.toLowerCase();
          return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
        }
        return true;
      }),
    [staffUsers, branchFilter, search]
  );
  const pg = usePagination(filtered, PAGE_SIZE, `${branchFilter}|${search}`);

  return {
    users: pg.pageItems,
    pagination: pg,
    isLoading: false,
    rolesList: rolesList || [],
    isEmailTaken: (email, exceptId) => (staffUsers || []).some((u) => u.id !== exceptId && u.email.trim().toLowerCase() === email.trim().toLowerCase()),
    addStaff: async (form) => ({ user: addStaffUser(form), temporaryPassword: form.password }),
    updateStaff: async (id, profile) => updateStaffUser(id, profile),
    setStaffActive: async (id, active) => setStaffActive(id, active),
    deleteStaff: async (id) => {
      const target = (staffUsers || []).find((u) => u.id === id);
      if (!target) throw new Error("Akun tidak ditemukan.");
      const scheduleCount = target.therapistId ? schedules.filter((s) => s.therapistId === target.therapistId).length : 0;
      const error = validateStaffDeletion({ actor: { role: auth?.role, userId: auth?.userId, name: auth?.staffName }, target, staffUsers, scheduleCount });
      if (error) throw new Error(error);
      removeStaffUser(id);
    },
    resetPassword: async (id, password) => {
      resetStaffPassword(id, password);
      return { temporaryPassword: password };
    },
  };
}

// ---- Mode API: daftar dipaginasi di server (`GET /users?page&per_page&q&branch_id`), pencarian prefix nama/email.
function useStaffAdminApi({ branchFilter, search }) {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const { data: roles } = useRolesQuery();
  const rolesList = useMemo(() => roles ?? [], [roles]);

  const q = useDebouncedValue(search.trim(), 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  useEffect(() => setPage(1), [branchFilter, q, pageSize]);

  const params = { branchId: branchFilter === "all" ? undefined : branchFilter, q: q || undefined, page, perPage: pageSize };
  const { data, isLoading, isFetching } = useQuery({
    queryKey: [STAFF_QUERY_KEY, params],
    queryFn: ({ signal }) =>
      api.list(ENDPOINTS.users.list, params, { signal }).then(({ items, meta }) => ({ users: items.map(staffUserFromApi), meta })),
    enabled: isStaffSession(auth),
    placeholderData: keepPreviousData, // tabel tidak berkedip saat pindah halaman / mengetik
  });

  const meta = data?.meta;
  const pagination = {
    page: meta?.page ?? page,
    setPage,
    pageSize,
    setPageSize,
    totalPages: Math.max(1, meta?.lastPage ?? 1),
    totalItems: meta?.total ?? 0,
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: [STAFF_QUERY_KEY] });
  const create = useMutation({ mutationFn: (body) => api.post(ENDPOINTS.users.list, body), onSuccess: refresh });
  const update = useMutation({ mutationFn: ({ id, body }) => api.patch(ENDPOINTS.users.detail(id), body), onSuccess: refresh });
  const toggle = useMutation({ mutationFn: ({ id, isActive }) => api.patch(ENDPOINTS.users.setActive(id), { isActive }), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (id) => api.delete(ENDPOINTS.users.detail(id)), onSuccess: refresh });
  const reset = useMutation({ mutationFn: ({ id, password }) => api.post(ENDPOINTS.users.resetPassword(id), password ? { password } : {}), onSuccess: refresh });

  return {
    users: data?.users ?? [],
    pagination,
    isLoading: isLoading || (isFetching && !data),
    rolesList,
    isEmailTaken: () => false, // keunikan email diputuskan server (422 `email`)
    addStaff: async (form) => {
      const body = { ...staffUserToApi(form, rolesList), password: form.password || undefined };
      const res = await create.mutateAsync(body);
      return { user: staffUserFromApi(res), temporaryPassword: res.temporaryPassword ?? form.password };
    },
    updateStaff: async (id, form) => staffUserFromApi(await update.mutateAsync({ id, body: staffUserToApi(form, rolesList) })),
    setStaffActive: async (id, active) => staffUserFromApi(await toggle.mutateAsync({ id, isActive: active })),
    deleteStaff: (id) => remove.mutateAsync(id),
    resetPassword: async (id, password) => {
      const res = await reset.mutateAsync({ id, password });
      return { temporaryPassword: res.temporaryPassword ?? password };
    },
  };
}

export const useStaffAdmin = isApiMode() ? useStaffAdminApi : useStaffAdminLocal;
