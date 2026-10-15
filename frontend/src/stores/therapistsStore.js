import React, { createContext, useContext } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePersistentReducer } from "@/shared/hooks/usePersistentState";
import { getSeedLoader } from "@/data/seedRegistry";
import { isStaffSession } from "@/domain/auth";
import { useDemand } from "@/shared/hooks/useDemand";
import { isApiMode } from "@/config/env";
import { api } from "@/services/http/httpClient";
import { ENDPOINTS } from "@/services/api/endpoints";
import { therapistFromApi } from "@/services/api/mappers/organizationMapper";
import { useAuth } from "@/stores/authStore";

const TherapistsContext = createContext(null);

function therapistsReducer(state, action) {
  switch (action.type) {
    case "UPDATE_MAX_SESSIONS": // maksimal sesi per bulan (domain/workHours); tidak memengaruhi jadwal
      return state.map((t) => (t.id === action.id ? { ...t, maxSessionsPerMonth: action.maxSessionsPerMonth } : t));
    case "DELETE_BY_BRANCH": // hanya dipakai hapus cabang (ADR 0005)
      return state.filter((t) => t.branchId !== action.branchId);
    default:
      return state;
  }
}

// ---- Mode demo (localStorage)
const LocalTherapistsProvider = ({ children }) => {
  const [therapists, dispatch] = usePersistentReducer("therapists", therapistsReducer, () => getSeedLoader().loadTherapistsSeed());
  const getTherapist = (id) => therapists.find((t) => t.id === id);
  const updateTherapistMaxSessions = (id, maxSessionsPerMonth) => dispatch({ type: "UPDATE_MAX_SESSIONS", id, maxSessionsPerMonth });
  const removeTherapistsByBranch = (branchId) => dispatch({ type: "DELETE_BY_BRANCH", branchId });

  return (
    <TherapistsContext.Provider value={{ therapists, getTherapist, updateTherapistMaxSessions, removeTherapistsByBranch }}>
      {children}
    </TherapistsContext.Provider>
  );
};

// ---- Mode API: terapis = akun staf berperan `therapist` (aktif). `GET /therapists` dibaca semua staf (daftar ringan, tanpa
// data akun). Terapis ber-`branchId` null (semua cabang) tampil di tiap cabang. Kapasitas: `PATCH /therapists/{id}/capacity`.
export const THERAPISTS_QUERY_KEY = ["therapists"];

const ApiTherapistsProvider = ({ children }) => {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  const { demand, isOn } = useDemand(isStaffSession(auth));
  const { data } = useQuery({
    queryKey: THERAPISTS_QUERY_KEY,
    queryFn: ({ signal }) => api.get(ENDPOINTS.therapists.list, undefined, { signal }).then((rows) => rows.map(therapistFromApi)),
    enabled: isStaffSession(auth) && isOn("therapists"), // baru diambil saat ada yang membaca daftar / memanggil getTherapist
    staleTime: 60_000,
  });
  const therapists = React.useMemo(() => data ?? [], [data]);

  const capacity = useMutation({
    mutationFn: ({ id, maxSessionsPerMonth }) => api.patch(ENDPOINTS.therapists.capacity(id), { maxSessionsPerMonth }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: THERAPISTS_QUERY_KEY }),
  });

  const getTherapist = (id) => {
    demand("therapists"); // dipanggil saat render hanya bila ada terapis yang perlu ditampilkan
    return therapists.find((t) => t.id === String(id));
  };
  const updateTherapistMaxSessions = async (id, maxSessionsPerMonth) => therapistFromApi(await capacity.mutateAsync({ id, maxSessionsPerMonth }));
  // Server menghapus akun terapis cabang lewat cascade hapus cabang (Sprint 4); cukup segarkan daftar.
  const removeTherapistsByBranch = () => queryClient.invalidateQueries({ queryKey: THERAPISTS_QUERY_KEY });

  return (
    <TherapistsContext.Provider
      value={{
        get therapists() {
          demand("therapists");
          return therapists;
        },
        getTherapist,
        updateTherapistMaxSessions,
        removeTherapistsByBranch,
      }}
    >
      {children}
    </TherapistsContext.Provider>
  );
};

export const TherapistsProvider = isApiMode() ? ApiTherapistsProvider : LocalTherapistsProvider;

export const useTherapists = () => useContext(TherapistsContext);
