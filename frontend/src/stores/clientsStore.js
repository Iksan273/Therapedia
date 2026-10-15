import React, { createContext, useContext, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePersistentReducer } from "@/shared/hooks/usePersistentState";
import { getSeedLoader } from "@/data/seedRegistry";
import { nowIso } from "@/shared/lib/id";
import { isStaffSession } from "@/domain/auth";
import { useDemand } from "@/shared/hooks/useDemand";
import { isApiMode } from "@/config/env";
import { api } from "@/services/http/httpClient";
import { ENDPOINTS } from "@/services/api/endpoints";
import { clientFromApi } from "@/services/api/mappers/clientMapper";
import { useAuth } from "@/stores/authStore";

const ClientsContext = createContext(null);

function clientsReducer(state, action) {
  switch (action.type) {
    case "ADD":
      return [...state, action.client];
    case "UPDATE":
      return state.map((c) =>
        c.id === action.id ? { ...c, ...action.patch, updatedAt: nowIso() } : c
      );
    case "DELETE": // hapus permanen (ADR 0005); data terkait dihapus hook use-case useClientDeleteActions
      return state.filter((c) => c.id !== action.id);
    default:
      return state;
  }
}

// ---- Mode demo (localStorage)
const LocalClientsProvider = ({ children }) => {
  const [clients, dispatch] = usePersistentReducer("clients", clientsReducer, () => getSeedLoader().loadClientsSeed());

  const addClient = (client) => dispatch({ type: "ADD", client });
  const updateClient = (id, patch) => dispatch({ type: "UPDATE", id, patch });
  const deleteClient = (id) => dispatch({ type: "DELETE", id });
  const getClient = (id) => clients.find((c) => c.id === id);

  return (
    <ClientsContext.Provider value={{ clients, addClient, updateClient, deleteClient, getClient }}>
      {children}
    </ClientsContext.Provider>
  );
};

// ---- Mode API (Laravel). Sumber kebenaran client = server; halaman Inquiry (pipeline, detail) memakai hook use-case
// sendiri (`features/inquiry/hooks/useInquiryClients.js`) dengan query ber-filter + paginasi di server.
// Store ini hanya menyediakan CACHE ringan (10 client terbaru, per_page bawaan) agar halaman modul lain yang belum diintegrasikan
// (jadwal, finance, terapis) tetap punya `clients`/`getClient` tanpa error. Mutator di sini hanya mengubah cache di memori
// (tidak ke server): jalur yang masih memakainya (kode kuesioner, jadwal, kredit) menunggu integrasi modulnya.
export const CLIENTS_QUERY_KEY = ["clients"];
const CACHE_KEY = [...CLIENTS_QUERY_KEY, "cache"];

const ApiClientsProvider = ({ children }) => {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const { demand, isOn } = useDemand(isStaffSession(auth));

  const { data } = useQuery({
    queryKey: CACHE_KEY,
    queryFn: ({ signal }) =>
      // per_page bawaan server (10): sama dengan semua daftar; modul yang butuh lebih punya hook server sendiri
      api.list(ENDPOINTS.clients.list, { sort: "-created_at" }, { signal }).then(({ items }) => items.map(clientFromApi)),
    enabled: isStaffSession(auth) && isOn("clients"), // baru diambil saat halaman modul lain membaca `clients` / memanggil getClient
  });
  const clients = useMemo(() => data ?? [], [data]);

  const setCache = (fn) => queryClient.setQueryData(CACHE_KEY, (old) => fn(old ?? []));
  const addClient = (client) => setCache((list) => [...list, client]);
  const updateClient = (id, patch) => setCache((list) => list.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: nowIso() } : c)));
  const deleteClient = (id) => setCache((list) => list.filter((c) => c.id !== id));
  const getClient = (id) => {
    demand("clients");
    return clients.find((c) => c.id === id);
  };

  return (
    <ClientsContext.Provider
      value={{
        get clients() {
          demand("clients");
          return clients;
        },
        addClient,
        updateClient,
        deleteClient,
        getClient,
      }}
    >
      {children}
    </ClientsContext.Provider>
  );
};

export const ClientsProvider = isApiMode() ? ApiClientsProvider : LocalClientsProvider;

export const useClients = () => useContext(ClientsContext);
