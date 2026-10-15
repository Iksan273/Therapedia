import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useClients, CLIENTS_QUERY_KEY } from "@/stores/clientsStore";
import { useAuth } from "@/stores/authStore";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { isStaffSession } from "@/domain/auth";
import { advanceStatus, getClientServiceIds, makeInquiryClient, matchesClientSearch } from "@/domain/client";
import { isApiMode } from "@/config/env";
import { api } from "@/services/http/httpClient";
import { ENDPOINTS } from "@/services/api/endpoints";
import { clientCreateToApi, clientFromApi, clientUpdateToApi } from "@/services/api/mappers/clientMapper";
import { STAGE_COLUMNS } from "@/features/inquiry/components/pipeline/pipelineConfig";

// Hook use-case halaman Inquiry (pipeline + detail client). Dua implementasi dengan bentuk keluaran yang sama
// (dipilih per build lewat `isApiMode()`): mode demo membaca/menulis `clientsStore` (localStorage), mode API memanggil
// endpoint M4. Mutasi bersifat async dan melempar `ApiError` (`message`, `fieldErrors`) untuk ditampilkan halaman.

// Halaman pertama papan = SATU request (`GET /clients/board`): tiap tahap memuat 10 kartu terbaru + jumlah asli (`totals`).
// (Sebelumnya 9 request paralel: tiap request membayar bootstrap PHP sendiri dan antre di server dev satu-proses.)
// Halaman berikutnya satu tahap = `GET /clients?status[]=…&page=N&per_page=10` (infinite scroll per kolom, filter sama).
export const PIPELINE_PAGE_SIZE = 10;

// ---------------------------------------------------------------- Pipeline
function usePipelineLocal({ branchFilter, serviceFilter, search }) {
  const { clients, addClient } = useClients();

  const filtered = useMemo(
    () =>
      clients.filter((c) => {
        if (branchFilter !== "all" && c.branchId !== branchFilter) return false;
        if (serviceFilter !== "all" && !getClientServiceIds(c).includes(serviceFilter)) return false;
        return matchesClientSearch(c, search);
      }),
    [clients, search, branchFilter, serviceFilter]
  );

  const clientsByStage = useMemo(() => {
    const groups = {};
    STAGE_COLUMNS.forEach((col) => {
      groups[col.status] = [];
    });
    filtered.forEach((c) => {
      if (groups[c.status]) groups[c.status].push(c);
      else if (c.status === "active") groups.admitted?.push(c); // status lama
      else groups.inquiry.push(c);
    });
    return groups;
  }, [filtered]);

  return {
    clientsByStage,
    totals: null, // mode demo: jumlah = panjang daftar
    total: filtered.length,
    hasAnyClient: clients.length > 0,
    isLoading: false,
    isFetching: false,
    isSearching: false,
    loadMore: null, // mode demo: kolom menampilkan bertahap dari daftar yang sudah ada (PipelineBoard)
    loadingMore: {},
    loadMoreFailed: {},
    createIntake: async (form) => {
      const client = makeInquiryClient({ ...form, status: "inquiry" }, clients.map((c) => c.clientCode));
      addClient(client);
      return client;
    },
  };
}

function usePipelineApi({ branchFilter, serviceFilter, search }) {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const q = useDebouncedValue(search.trim(), 300);

  const params = {
    branchId: branchFilter === "all" ? undefined : branchFilter,
    serviceCode: serviceFilter === "all" ? undefined : serviceFilter,
    q: q || undefined,
    perStage: PIPELINE_PAGE_SIZE,
  };
  const paramsKey = JSON.stringify(params);
  const { data, isLoading, isFetching, dataUpdatedAt } = useQuery({
    queryKey: [...CLIENTS_QUERY_KEY, "pipeline", params],
    queryFn: ({ signal }) =>
      api.get(ENDPOINTS.clients.board, params, { signal }).then((res) => {
        const clientsByStage = {};
        const totals = {};
        STAGE_COLUMNS.forEach((col) => {
          clientsByStage[col.status] = [];
          totals[col.status] = 0;
        });
        (res.stages || []).forEach((st) => {
          clientsByStage[st.status] = st.items.map(clientFromApi);
          totals[st.status] = st.total;
        });
        return { clientsByStage, totals };
      }),
    enabled: isStaffSession(auth),
    placeholderData: keepPreviousData, // papan tidak kosong sesaat saat filter/pencarian berubah
  });

  // Halaman tambahan per tahap (infinite scroll). Dibuang saat filter berubah atau papan dasar disegarkan dari server
  // (mis. setelah tambah / ubah status), supaya urutan dan jumlah selalu konsisten dengan server.
  const [more, setMore] = useState({}); // { [status]: { items: [], page } }
  const [loadingMore, setLoadingMore] = useState({});
  const [loadMoreFailed, setLoadMoreFailed] = useState({});
  const inFlight = useRef({});
  useEffect(() => {
    setMore({});
    setLoadingMore({});
    setLoadMoreFailed({});
    inFlight.current = {};
  }, [paramsKey, dataUpdatedAt]);

  const baseByStage = data?.clientsByStage;
  const totals = data?.totals ?? Object.fromEntries(STAGE_COLUMNS.map((col) => [col.status, 0]));
  const clientsByStage = useMemo(() => {
    const merged = {};
    STAGE_COLUMNS.forEach((col) => {
      const base = baseByStage?.[col.status] ?? [];
      const seen = new Set(base.map((c) => c.id));
      const extra = (more[col.status]?.items ?? []).filter((c) => !seen.has(c.id)); // offset bergeser bila ada data baru: buang duplikat
      merged[col.status] = [...base, ...extra];
    });
    return merged;
  }, [baseByStage, more]);
  const total = Object.values(totals).reduce((sum, n) => sum + n, 0);

  const loadMore = async (status) => {
    if (inFlight.current[status]) return;
    const loaded = clientsByStage[status]?.length ?? 0;
    if (loaded >= (totals[status] ?? 0)) return;
    const page = (more[status]?.page ?? 1) + 1;
    inFlight.current[status] = true;
    setLoadingMore((prev) => ({ ...prev, [status]: true }));
    setLoadMoreFailed((prev) => ({ ...prev, [status]: false }));
    try {
      const { items } = await api.list(ENDPOINTS.clients.list, {
        status: [status],
        branchId: params.branchId,
        serviceCode: params.serviceCode,
        q: params.q,
        perPage: PIPELINE_PAGE_SIZE,
        page,
        sort: "-created_at",
      });
      setMore((prev) => ({ ...prev, [status]: { page, items: [...(prev[status]?.items ?? []), ...items.map(clientFromApi)] } }));
    } catch {
      setLoadMoreFailed((prev) => ({ ...prev, [status]: true })); // kolom menampilkan tombol "Coba lagi"; tidak mengulang otomatis
    } finally {
      inFlight.current[status] = false;
      setLoadingMore((prev) => ({ ...prev, [status]: false }));
    }
  };

  const create = useMutation({
    mutationFn: (form) => api.post(ENDPOINTS.clients.list, clientCreateToApi(form)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY }),
  });

  return {
    clientsByStage,
    totals,
    total,
    hasAnyClient: total > 0 || Boolean(q) || branchFilter !== "all" || serviceFilter !== "all",
    isLoading: isLoading && isStaffSession(auth), // muat pertama kali (belum ada data sama sekali)
    isFetching, // muat ulang di latar (filter berubah / disegarkan)
    isSearching: isFetching || search.trim() !== q, // true sejak mengetik (menunggu jeda) sampai hasil tiba
    loadMore, // (status) => ambil halaman berikutnya kolom itu
    loadingMore, // { [status]: true } selama halaman berikutnya dimuat
    loadMoreFailed, // { [status]: true } bila gagal (tombol coba lagi)
    createIntake: async (form) => clientFromApi(await create.mutateAsync(form)),
  };
}

export const useInquiryPipeline = isApiMode() ? usePipelineApi : usePipelineLocal;

// ------------------------------------------------------------ Client Detail
// Keluaran: { client, isLoading, notFound, updateProfile, saveServices, saveGdriveLink, remove }
function useClientDetailLocal(id) {
  const { clients, updateClient } = useClients();
  const client = clients.find((c) => c.id === id) || null;

  return {
    client,
    isLoading: false,
    notFound: !client,
    updateProfile: async (form) =>
      updateClient(client.id, {
        clientName: form.clientName.trim(),
        gender: form.gender,
        dob: form.dob,
        parentName: form.parentName.trim(),
        parentContact: form.parentContact.trim(),
        parentEmail: form.parentEmail.trim(),
        intakeNote: (form.intakeNote || "").trim() || null,
        branchId: form.branchId,
        updatedAt: new Date().toISOString(),
      }),
    saveServices: async (codes) =>
      updateClient(client.id, {
        serviceTypes: codes,
        serviceType: codes[0] || "",
        status: codes.length > 0 ? advanceStatus(client.status, "service_selected") : client.status,
      }),
    saveGdriveLink: async (url) => updateClient(client.id, { gdriveClientLink: url.trim() }),
  };
}

function useClientDetailApi(id) {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const key = [...CLIENTS_QUERY_KEY, "detail", id];

  const { data, isLoading, error } = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => api.get(ENDPOINTS.clients.detail(id), undefined, { signal }).then(clientFromApi),
    enabled: isStaffSession(auth) && Boolean(id),
    retry: (count, err) => err?.status !== 404 && count < 2,
  });
  const client = data ?? null;

  // Hasil mutasi (detail terbaru) langsung dipasang ke cache detail; daftar/papan disegarkan dari server.
  const apply = (raw) => {
    const next = clientFromApi(raw);
    queryClient.setQueryData(key, next);
    queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY, predicate: (q) => q.queryKey[1] !== "detail" });
    return next;
  };

  return {
    client,
    isLoading,
    notFound: !isLoading && (error?.status === 404 || (!client && !error)),
    updateProfile: async (form) => apply(await api.patch(ENDPOINTS.clients.detail(client.id), clientUpdateToApi(form, client.version))),
    saveServices: async (codes) => apply(await api.put(ENDPOINTS.clients.services(client.id), { serviceCodes: codes })),
    // UI satu link: ganti semua link GDrive client dengan link baru (kosong = hapus)
    saveGdriveLink: async (url) => {
      const link = url.trim();
      for (const doc of client.gdriveLinks) await api.delete(ENDPOINTS.clients.gdriveLink(client.id, doc.id));
      if (link) await api.post(ENDPOINTS.clients.gdriveLinks(client.id), { url: link });
      const fresh = await api.get(ENDPOINTS.clients.detail(client.id));
      return apply(fresh);
    },
  };
}

export const useClientDetail = isApiMode() ? useClientDetailApi : useClientDetailLocal;
