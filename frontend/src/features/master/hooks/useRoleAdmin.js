import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ACCESS_MODULES } from "@/domain/rbac";
import { isStaffSession } from "@/domain/auth";
import { isApiMode } from "@/config/env";
import { api } from "@/services/http/httpClient";
import { ENDPOINTS } from "@/services/api/endpoints";
import { permissionItem, permissionMatrixFromRoles, roleFromApi, roleToApi } from "@/services/api/mappers/organizationMapper";
import { useAuth } from "@/stores/authStore";

export const ROLES_QUERY_KEY = ["roles"];
const MODULE_KEYS = ACCESS_MODULES.map((m) => m.key);

// Daftar role dari server (mode API). `GET /roles` boleh dibaca modul `rbac` atau `user_management`; sesi tanpa keduanya
// tidak memanggilnya. Bentuk item: { id: kodeRole, serverId, label, badge, description, isSystem, usersCount, permissions[] }.
export function useRolesQuery() {
  const { auth, hasPermission } = useAuth();
  const enabled = isApiMode() && isStaffSession(auth) && (hasPermission("rbac") || hasPermission("user_management"));

  return useQuery({
    queryKey: ROLES_QUERY_KEY,
    queryFn: ({ signal }) => api.get(ENDPOINTS.roles.list, undefined, { signal }).then((rows) => rows.map(roleFromApi)),
    enabled,
    staleTime: 60_000,
  });
}

// ---- Mode demo: role & matriks izin tersimpan di authStore (localStorage). Fungsi dibuat async agar pemanggil sama
// dengan mode API (halaman selalu `await`).
function useRoleAdminLocal() {
  const { rolesList, rbacPermissions, addRole, updateRole, deleteRole, updateRolePermission, staffUsers } = useAuth();

  return {
    rolesList: rolesList || [],
    rbacPermissions,
    isLoading: false,
    addRole: async (form) => addRole(form),
    updateRole: async (id, fields) => updateRole(id, fields),
    deleteRole: async (id) => deleteRole(id),
    updateRolePermission: async (roleId, moduleKey, allowed) => updateRolePermission(roleId, moduleKey, allowed),
    usersCountOf: (roleId) => (staffUsers || []).filter((u) => u.role === roleId).length,
  };
}

// ---- Mode API: role + matriks dari Laravel. Matriks izin dikirim sebagai array `[{ moduleCode, allowed }]` (satu format key).
function useRoleAdminApi() {
  const queryClient = useQueryClient();
  const { auth, refreshSession } = useAuth();
  const { data, isLoading } = useRolesQuery();
  const rolesList = useMemo(() => data ?? [], [data]);
  const rbacPermissions = useMemo(() => permissionMatrixFromRoles(rolesList, MODULE_KEYS), [rolesList]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
  const serverIdOf = (roleId) => rolesList.find((r) => r.id === roleId)?.serverId ?? roleId;

  const create = useMutation({ mutationFn: (form) => api.post(ENDPOINTS.roles.list, roleToApi(form)), onSuccess: refresh });
  const update = useMutation({
    mutationFn: ({ id, fields }) =>
      api.patch(ENDPOINTS.roles.detail(serverIdOf(id)), { name: fields.label, badge: fields.badge ?? "", description: fields.description ?? "" }),
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: (id) => api.delete(ENDPOINTS.roles.detail(serverIdOf(id))), onSuccess: refresh });

  // Saklar izin terasa instan: cache diubah dulu, dikembalikan bila server menolak.
  const permission = useMutation({
    mutationFn: ({ roleId, moduleKey, allowed }) =>
      api.put(ENDPOINTS.roles.permissions(serverIdOf(roleId)), { permissions: [permissionItem(moduleKey, allowed)] }),
    onMutate: async ({ roleId, moduleKey, allowed }) => {
      await queryClient.cancelQueries({ queryKey: ROLES_QUERY_KEY });
      const previous = queryClient.getQueryData(ROLES_QUERY_KEY);
      queryClient.setQueryData(ROLES_QUERY_KEY, (rows = []) =>
        rows.map((r) => {
          if (r.id !== roleId) return r;
          const next = new Set(r.permissions);
          if (allowed) next.add(moduleKey);
          else next.delete(moduleKey);
          return { ...r, permissions: [...next] };
        })
      );
      return { previous };
    },
    onError: (_error, _vars, context) => queryClient.setQueryData(ROLES_QUERY_KEY, context?.previous),
    onSettled: refresh,
  });

  return {
    rolesList,
    rbacPermissions,
    isLoading,
    addRole: async (form) => roleFromApi(await create.mutateAsync(form)),
    updateRole: async (id, fields) => roleFromApi(await update.mutateAsync({ id, fields })),
    deleteRole: (id) => remove.mutateAsync(id),
    updateRolePermission: async (roleId, moduleKey, allowed) => {
      await permission.mutateAsync({ roleId, moduleKey, allowed });
      // Izin role akun yang sedang login berubah: muat ulang profil agar menu & akses mengikuti.
      if (roleId === auth?.role) await refreshSession();
    },
    usersCountOf: (roleId) => rolesList.find((r) => r.id === roleId)?.usersCount ?? 0,
  };
}

// Dipilih per build (mode tidak berubah saat aplikasi berjalan), jadi urutan hook tetap stabil.
export const useRoleAdmin = isApiMode() ? useRoleAdminApi : useRoleAdminLocal;
