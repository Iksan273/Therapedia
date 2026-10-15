import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { usePagination } from "@/shared/components/TablePagination";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { isStaffSession } from "@/domain/auth";
import { isActiveClient, isRosterClient, matchesClientSearch, matchesRosterStatus } from "@/domain/client";
import { isApiMode } from "@/config/env";
import { api } from "@/services/http/httpClient";
import { ENDPOINTS } from "@/services/api/endpoints";
import { clientFromApi } from "@/services/api/mappers/clientMapper";
import { useAuth } from "@/stores/authStore";
import { useClients, CLIENTS_QUERY_KEY } from "@/stores/clientsStore";
import { useCredits } from "@/stores/creditsStore";

// Hook data halaman Active Clients: Client Roster (active + discharged + discontinued) dan Birthday Hub.
// Dua implementasi dengan bentuk keluaran sama (dipilih per build): mode demo menyaring `clientsStore` di klien, mode API
// memanggil `GET /clients` dengan paginasi di server (per_page bawaan 10), jadi tidak lagi tergantung cache client global.
// Keluaran: { items, pagination, total, isLoading, isFetching }. `isLoading` = muat pertama (tampilkan shimmer),
// `isFetching` = muat ulang karena filter / halaman berubah (data lama tetap tampil, diredupkan).

const ROSTER_STATUSES = ["admitted", "discharged", "discontinued"];
const STATUS_FILTER_TO_API = { all: ROSTER_STATUSES, active: ["admitted"], discharged: ["discharged"], discontinued: ["discontinued"] };

// ---------------------------------------------------------------- Roster
function useRosterLocal({ branchFilter, statusFilter, search, creditFilter }) {
  const { clients } = useClients();
  const { getRecordForClient } = useCredits();

  const filtered = useMemo(
    () =>
      clients.filter(isRosterClient).filter((c) => {
        if (branchFilter !== "all" && c.branchId !== branchFilter) return false;
        if (!matchesRosterStatus(c, statusFilter)) return false;
        if (!matchesClientSearch(c, search)) return false;
        if (creditFilter !== "all") {
          const rec = getRecordForClient(c.id);
          const rem = rec ? rec.remainingCredit : 0;
          if (creditFilter === "zero" && rem !== 0) return false;
          if (creditFilter === "low" && (rem <= 0 || rem > 2)) return false;
          if (creditFilter === "healthy" && rem <= 2) return false;
        }
        return true;
      }),
    [clients, branchFilter, search, creditFilter, statusFilter, getRecordForClient]
  );
  const pagination = usePagination(filtered, 10, `${search}|${branchFilter}|${creditFilter}|${statusFilter}`);

  return { items: pagination.pageItems, pagination, total: filtered.length, isLoading: false, isFetching: false };
}

// Paginasi dari server: state halaman + ukuran halaman; kembali ke halaman 1 saat filter / ukuran halaman berubah.
function useServerPage(resetKey) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  useEffect(() => setPage(1), [resetKey, pageSize]);
  return { page, setPage, pageSize, setPageSize };
}

const toPagination = (state, meta) => ({ ...state, totalPages: Math.max(1, meta?.lastPage ?? 1), totalItems: meta?.total ?? 0 });

function useRosterApi({ branchFilter, statusFilter, search, creditFilter }) {
  const { auth } = useAuth();
  const q = useDebouncedValue(search.trim(), 300);
  const resetKey = `${q}|${branchFilter}|${creditFilter}|${statusFilter}`;
  const pageState = useServerPage(resetKey);

  const params = {
    status: STATUS_FILTER_TO_API[statusFilter] || ROSTER_STATUSES,
    branchId: branchFilter === "all" ? undefined : branchFilter,
    q: q || undefined,
    creditStatus: creditFilter === "all" ? undefined : creditFilter,
    sort: "child_name",
    page: pageState.page,
    perPage: pageState.pageSize,
  };
  const { data, isLoading, isFetching } = useQuery({
    queryKey: [...CLIENTS_QUERY_KEY, "roster", params],
    queryFn: ({ signal }) => api.list(ENDPOINTS.clients.list, params, { signal }).then(({ items, meta: m }) => ({ items: items.map(clientFromApi), meta: m })),
    enabled: isStaffSession(auth),
    placeholderData: keepPreviousData,
  });

  return {
    items: data?.items ?? [],
    pagination: toPagination(pageState, data?.meta),
    total: data?.meta?.total ?? 0,
    isLoading: isLoading && isStaffSession(auth),
    isFetching,
  };
}

export const useRosterClients = isApiMode() ? useRosterApi : useRosterLocal;

// ---------------------------------------------------------------- Birthday Hub
// `enabled` = tab Birthday sedang dibuka (data baru diambil saat dibutuhkan). `month` = "01".."12".
function useBirthdayLocal({ month, branchFilter }) {
  const { clients } = useClients();
  const items = useMemo(
    () =>
      clients.filter(isActiveClient).filter((c) => {
        if (branchFilter !== "all" && c.branchId !== branchFilter) return false;
        if (!c.dob) return false;
        const parts = c.dob.split("-");
        return parts.length >= 2 && parts[1] === month;
      }),
    [clients, month, branchFilter]
  );
  const pagination = usePagination(items, 10, `${month}|${branchFilter}`);
  return { items: pagination.pageItems, pagination, total: items.length, isLoading: false, isFetching: false, loaded: true };
}

function useBirthdayApi({ enabled, month, branchFilter }) {
  const { auth } = useAuth();
  const resetKey = `${month}|${branchFilter}`;
  const pageState = useServerPage(resetKey);

  const params = {
    status: ["admitted"],
    birthMonth: Number(month),
    branchId: branchFilter === "all" ? undefined : branchFilter,
    sort: "child_name",
    page: pageState.page,
    perPage: pageState.pageSize,
  };
  const { data, isLoading, isFetching } = useQuery({
    queryKey: [...CLIENTS_QUERY_KEY, "birthday", params],
    queryFn: ({ signal }) => api.list(ENDPOINTS.clients.list, params, { signal }).then(({ items, meta: m }) => ({ items: items.map(clientFromApi), meta: m })),
    enabled: enabled && isStaffSession(auth),
    placeholderData: keepPreviousData,
  });

  return {
    items: data?.items ?? [],
    pagination: toPagination(pageState, data?.meta),
    total: data?.meta?.total ?? 0,
    isLoading: isLoading && enabled && isStaffSession(auth),
    isFetching,
    loaded: Boolean(data),
  };
}

export const useBirthdayClients = isApiMode() ? useBirthdayApi : useBirthdayLocal;
