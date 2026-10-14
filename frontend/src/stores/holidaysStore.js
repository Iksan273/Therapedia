import React, { createContext, useContext } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePersistentReducer } from "@/shared/hooks/usePersistentState";
import { DEFAULT_HOLIDAYS } from "@/domain/holiday";
import { isStaffSession } from "@/domain/auth";
import { isApiMode } from "@/config/env";
import { api } from "@/services/http/httpClient";
import { ENDPOINTS } from "@/services/api/endpoints";
import { holidayFromApi, holidayToApi } from "@/services/api/mappers/masterDataMapper";
import { nowIso } from "@/shared/lib/id";
import { useAuth } from "@/stores/authStore";

const HolidaysContext = createContext(null);

function holidaysReducer(state, action) {
  switch (action.type) {
    case "ADD":
      return [...state, action.holiday];
    case "UPDATE":
      return state.map((h) => (h.id === action.id ? { ...h, ...action.patch, updatedAt: nowIso() } : h));
    case "REMOVE": // hard delete (data konfigurasi, tanpa riwayat)
      return state.filter((h) => h.id !== action.id);
    default:
      return state;
  }
}

// ---- Mode demo (localStorage). Pengaturan hari libur disimpan terpisah dari seed demo (data konfigurasi, bukan data domain).
const LocalHolidaysProvider = ({ children }) => {
  const [holidays, dispatch] = usePersistentReducer("holidays", holidaysReducer, () => DEFAULT_HOLIDAYS);

  const addHoliday = (holiday) => dispatch({ type: "ADD", holiday });
  const updateHoliday = (id, patch) => dispatch({ type: "UPDATE", id, patch });
  const removeHoliday = (id) => dispatch({ type: "REMOVE", id });

  return <HolidaysContext.Provider value={{ holidays, addHoliday, updateHoliday, removeHoliday }}>{children}</HolidaysContext.Provider>;
};

// ---- Mode API (Laravel M3): `GET /holidays` dibaca semua staf (libur cabang sendiri + semua cabang); tulis butuh modul
// `holidays`. Server menyimpan satu baris per tanggal: `createHolidayRange` mengirim satu tanggal atau rentang dan membalas
// daftar baris baru (tiap baris memuat `affectedSessions`). Mutasi mengembalikan Promise dan melempar `ApiError`
// (mis. 422 tanggal sudah ada, 403 cabang lain).
export const HOLIDAYS_QUERY_KEY = ["holidays"];

const ApiHolidaysProvider = ({ children }) => {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: HOLIDAYS_QUERY_KEY,
    queryFn: ({ signal }) => api.get(ENDPOINTS.holidays.list, undefined, { signal }).then((rows) => rows.map(holidayFromApi)),
    enabled: isStaffSession(auth),
    staleTime: 5 * 60_000,
  });
  const holidays = React.useMemo(() => data ?? [], [data]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: HOLIDAYS_QUERY_KEY });
  const create = useMutation({ mutationFn: (form) => api.post(ENDPOINTS.holidays.list, holidayToApi(form, { create: true })), onSuccess: refresh });
  const update = useMutation({ mutationFn: ({ id, form }) => api.patch(ENDPOINTS.holidays.detail(id), holidayToApi(form)), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (id) => api.delete(ENDPOINTS.holidays.detail(id)), onSuccess: refresh });

  // form: { date, endDate?, name, branchId } → daftar libur baru (satu per tanggal)
  const createHolidayRange = async (form) => (await create.mutateAsync(form)).map(holidayFromApi);
  // patch: { date, name, branchId } → libur yang diubah (memuat `affectedSessions`)
  const updateHoliday = async (id, patch) => holidayFromApi(await update.mutateAsync({ id, form: patch }));
  const removeHoliday = (id) => remove.mutateAsync(id);

  return <HolidaysContext.Provider value={{ holidays, createHolidayRange, updateHoliday, removeHoliday }}>{children}</HolidaysContext.Provider>;
};

export const HolidaysProvider = isApiMode() ? ApiHolidaysProvider : LocalHolidaysProvider;

export const useHolidays = () => useContext(HolidaysContext);
