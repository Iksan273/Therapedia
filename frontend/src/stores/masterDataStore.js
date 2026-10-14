import React, { createContext, useContext, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePersistentReducer } from "@/shared/hooks/usePersistentState";
import { readPersisted } from "@/services/storage/localStore";
import { DEFAULT_DISCHARGE_REASONS, INTAKE_SERVICES, dischargeReasonLabel } from "@/domain/client";
import { DEFAULT_CANCEL_REASONS, DEFAULT_THERAPIST_OFF_REASONS, cancelReasonCode, cancelReasonLabel } from "@/domain/schedule";
import { isStaffSession } from "@/domain/auth";
import { isApiMode } from "@/config/env";
import { api } from "@/services/http/httpClient";
import { ENDPOINTS } from "@/services/api/endpoints";
import {
  quadrantFromApi,
  quadrantToApi,
  reasonFromApi,
  reasonToApi,
  serviceFromApi,
  serviceToApi,
} from "@/services/api/mappers/masterDataMapper";
import { useAuth } from "@/stores/authStore";

const MasterDataContext = createContext(null);

// Palet warna kuadran. Class ditulis literal agar ikut ter-generate oleh Tailwind.
export const QUADRANT_COLORS = {
  blue: {
    label: "Biru",
    dot: "bg-blue-600",
    badge: "bg-blue-100 text-blue-900 border-blue-300 font-black",
    solid: "bg-blue-600 text-white font-black",
    card: "bg-blue-50/70 border-blue-200",
    text: "text-blue-950",
    textSoft: "text-blue-800/80",
    count: "text-blue-900",
  },
  lime: {
    label: "Hijau Lime",
    dot: "bg-lime-600",
    badge: "bg-lime-100 text-lime-900 border-lime-300 font-black",
    solid: "bg-lime-600 text-white font-black",
    card: "bg-lime-50/70 border-lime-200",
    text: "text-lime-950",
    textSoft: "text-lime-800/80",
    count: "text-lime-900",
  },
  pink: {
    label: "Pink",
    dot: "bg-pink-600",
    badge: "bg-pink-100 text-pink-900 border-pink-300 font-black",
    solid: "bg-pink-600 text-white font-black",
    card: "bg-pink-50/70 border-pink-200",
    text: "text-pink-950",
    textSoft: "text-pink-800/80",
    count: "text-pink-900",
  },
  amber: {
    label: "Kuning",
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-900 border-amber-300 font-black",
    solid: "bg-amber-500 text-white font-black",
    card: "bg-amber-50/70 border-amber-200",
    text: "text-amber-950",
    textSoft: "text-amber-800/80",
    count: "text-amber-900",
  },
  purple: {
    label: "Ungu",
    dot: "bg-purple-600",
    badge: "bg-purple-100 text-purple-900 border-purple-300 font-black",
    solid: "bg-purple-600 text-white font-black",
    card: "bg-purple-50/70 border-purple-200",
    text: "text-purple-950",
    textSoft: "text-purple-800/80",
    count: "text-purple-900",
  },
  teal: {
    label: "Teal",
    dot: "bg-teal-600",
    badge: "bg-teal-100 text-teal-900 border-teal-300 font-black",
    solid: "bg-teal-600 text-white font-black",
    card: "bg-teal-50/70 border-teal-200",
    text: "text-teal-950",
    textSoft: "text-teal-800/80",
    count: "text-teal-900",
  },
  rose: {
    label: "Merah Muda",
    dot: "bg-rose-600",
    badge: "bg-rose-100 text-rose-900 border-rose-300 font-black",
    solid: "bg-rose-600 text-white font-black",
    card: "bg-rose-50/70 border-rose-200",
    text: "text-rose-950",
    textSoft: "text-rose-800/80",
    count: "text-rose-900",
  },
  slate: {
    label: "Abu-abu",
    dot: "bg-slate-600",
    badge: "bg-slate-100 text-slate-900 border-slate-300 font-black",
    solid: "bg-slate-600 text-white font-black",
    card: "bg-slate-50/70 border-slate-200",
    text: "text-slate-950",
    textSoft: "text-slate-700/80",
    count: "text-slate-900",
  },
};

export const getQuadrantColor = (colorKey) => QUADRANT_COLORS[colorKey] || QUADRANT_COLORS.slate;

const SEED_QUADRANTS = [
  { code: "AV", title: "Avoiding", fullName: "Sensation Avoiding", description: "Penghindar Sensori (Perilaku aktif menjauh)", color: "blue" },
  { code: "SN", title: "Sensitivity", fullName: "Sensory Sensitivity", description: "Sensitivitas Tinggi (Mudah terganggu stimulus)", color: "lime" },
  { code: "RG", title: "Registration", fullName: "Low Registration", description: "Pendaftaran Rendah (Pasif / Butuh intensitas lebih)", color: "pink" },
  { code: "SK", title: "Seeking", fullName: "Sensory Seeking", description: "Pencari Sensori (Mendambakan stimulasi ekstra)", color: "amber" },
];

const seedServices = () => INTAKE_SERVICES.map((s) => ({ ...s, active: true }));
const seedQuadrants = () => SEED_QUADRANTS.map((q) => ({ ...q }));
const seedBaseCancelReasons = () => DEFAULT_CANCEL_REASONS.map((r) => ({ ...r, active: true, therapistOff: false }));
const seedTherapistOffReasons = () => DEFAULT_THERAPIST_OFF_REASONS.map((r) => ({ ...r, active: true, therapistOff: true }));

// SATU daftar alasan Cancel / Off (padanan tabel `cancel_reasons`): alasan Therapist Off hanyalah alasan yang ditandai
// `therapistOff = true` (padanan kolom `is_therapist_off`), bukan daftar lain. Data demo lama tersimpan di dua key
// (`master_cancel_off_codes` + `master_therapist_off_codes`): digabung otomatis agar perubahan user tidak hilang.
const initCancelReasons = () => {
  const legacyBase = readPersisted("master_cancel_off_codes");
  const legacyOff = readPersisted("master_therapist_off_codes");
  if (Array.isArray(legacyBase) || Array.isArray(legacyOff)) {
    return [
      ...(Array.isArray(legacyBase) ? legacyBase : seedBaseCancelReasons()).map((r) => ({ ...r, therapistOff: false })),
      ...(Array.isArray(legacyOff) ? legacyOff : seedTherapistOffReasons()).map((r) => ({ ...r, therapistOff: true })),
    ];
  }
  return [...seedBaseCancelReasons(), ...seedTherapistOffReasons()];
};
const seedDischargeReasons = () => DEFAULT_DISCHARGE_REASONS.map((r) => ({ ...r, active: true }));

// Reducer generik untuk daftar master yang dikunci oleh `idKey`.
const makeListReducer = (idKey) => (state, action) => {
  switch (action.type) {
    case "ADD":
      return [...state, action.item];
    case "UPDATE":
      return state.map((i) => (i[idKey] === action.id ? { ...i, ...action.patch } : i));
    case "DELETE":
      return state.filter((i) => i[idKey] !== action.id);
    default:
      return state;
  }
};

const servicesReducer = makeListReducer("value");
const quadrantsReducer = makeListReducer("code");
const reasonsReducer = makeListReducer("value");

// Nilai context dari data + aksi tulis. Dipakai kedua mode, jadi halaman tidak peduli sumber datanya. Aksi tulis di mode API
// mengembalikan Promise dan melempar `ApiError` (`message`, `fieldErrors`); di mode demo sinkron (halaman cukup `await`).
const buildMasterValue = ({ services, quadrants, cancelReasons, dischargeReasons }, actions) => {
  const quadrantMap = Object.fromEntries(quadrants.map((q) => [q.code, q]));
  const therapistOffReasons = cancelReasons.filter((r) => r.therapistOff);
  const therapistOffCodes = therapistOffReasons.map((r) => r.value);
  return {
    services,
    // Layanan yang boleh dipilih di form; yang nonaktif tetap bisa dilabeli lewat getService
    activeServices: services.filter((s) => s.active !== false),
    getService: (val) => services.find((s) => s.value === val),
    addService: actions.addService,
    updateService: actions.updateService,
    deleteService: actions.deleteService,

    quadrants,
    quadrantMap,
    getQuadrant: (code) => quadrantMap[code],
    addQuadrant: actions.addQuadrant,
    updateQuadrant: actions.updateQuadrant,
    deleteQuadrant: actions.deleteQuadrant,

    // Pilihan cepat alasan. Data transaksi menyimpan string (code atau teks custom), bukan relasi ke daftar ini.
    // `cancelReasons` = SATU daftar alasan Cancel / Off (dipakai form, label, dan grafik); `therapistOffReasons`/`therapistOffCodes`
    // turunan dari item yang ditandai `therapistOff` (dasar Therapist Off Rate; tetap terhitung di Cancellation Rate keseluruhan)
    cancelReasons,
    activeCancelReasons: cancelReasons.filter((r) => r.active !== false),
    therapistOffReasons,
    therapistOffCodes,
    getCancelReasonLabel: (val) => cancelReasonLabel(val, cancelReasons),
    getCancelReasonCode: (val) => cancelReasonCode(val),
    addCancelReason: actions.addCancelReason,
    updateCancelReason: actions.updateCancelReason,
    deleteCancelReason: actions.deleteCancelReason,

    dischargeReasons,
    activeDischargeReasons: dischargeReasons.filter((r) => r.active !== false),
    getDischargeReasonLabel: (val) => dischargeReasonLabel(val, dischargeReasons),
    addDischargeReason: actions.addDischargeReason,
    updateDischargeReason: actions.updateDischargeReason,
    deleteDischargeReason: actions.deleteDischargeReason,
  };
};

// ---- Mode demo (localStorage)
const LocalMasterDataProvider = ({ children }) => {
  const [services, dispatchServices] = usePersistentReducer("master_services", servicesReducer, seedServices);
  const [quadrants, dispatchQuadrants] = usePersistentReducer("master_quadrants", quadrantsReducer, seedQuadrants);
  const [cancelReasons, dispatchCancel] = usePersistentReducer("master_cancel_reasons", reasonsReducer, initCancelReasons); // satu daftar alasan Cancel / Off ber-CODE; `therapistOff` menandai alasan terapis berhalangan
  const [dischargeReasons, dispatchDischarge] = usePersistentReducer("master_discharge_reasons", reasonsReducer, seedDischargeReasons);

  const value = useMemo(
    () =>
      buildMasterValue(
        { services, quadrants, cancelReasons, dischargeReasons },
        {
          addService: (item) => dispatchServices({ type: "ADD", item }),
          updateService: (id, patch) => dispatchServices({ type: "UPDATE", id, patch }),
          deleteService: (id) => dispatchServices({ type: "DELETE", id }),
          addQuadrant: (item) => dispatchQuadrants({ type: "ADD", item }),
          updateQuadrant: (id, patch) => dispatchQuadrants({ type: "UPDATE", id, patch }),
          deleteQuadrant: (id) => dispatchQuadrants({ type: "DELETE", id }),
          addCancelReason: (item) => dispatchCancel({ type: "ADD", item: { therapistOff: false, ...item } }),
          updateCancelReason: (id, patch) => dispatchCancel({ type: "UPDATE", id, patch }),
          deleteCancelReason: (id) => dispatchCancel({ type: "DELETE", id }),
          addDischargeReason: (item) => dispatchDischarge({ type: "ADD", item }),
          updateDischargeReason: (id, patch) => dispatchDischarge({ type: "UPDATE", id, patch }),
          deleteDischargeReason: (id) => dispatchDischarge({ type: "DELETE", id }),
        }
      ),
    [services, quadrants, cancelReasons, dischargeReasons, dispatchServices, dispatchQuadrants, dispatchCancel, dispatchDischarge]
  );

  return <MasterDataContext.Provider value={value}>{children}</MasterDataContext.Provider>;
};

// ---- Mode API (Laravel M3): `GET /master/*` dibaca semua staf; tulis butuh modul `inquiry_master_data`. Hapus layanan/kuadran
// yang dipakai dijawab 409 `in_use` (pesan server ditampilkan halaman); alasan Cancel/Off dan Discharge dihapus bebas.
export const MASTER_QUERY_KEYS = {
  services: ["master", "services"],
  quadrants: ["master", "quadrants"],
  cancelReasons: ["master", "cancel-reasons"],
  dischargeReasons: ["master", "discharge-reasons"],
};

const EMPTY_LIST = [];

// Satu resource master: daftar (react-query) + tambah/ubah/hapus. Mutasi mengembalikan item hasil pemetaan.
function useMasterResource({ enabled, queryKey, endpoints, fromApi, toApi }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey,
    queryFn: ({ signal }) => api.get(endpoints.list, undefined, { signal }).then((rows) => rows.map(fromApi)),
    enabled,
    staleTime: 5 * 60_000,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey });

  const create = useMutation({ mutationFn: (item) => api.post(endpoints.list, toApi(item, { create: true })), onSuccess: refresh });
  const update = useMutation({ mutationFn: ({ id, patch }) => api.patch(endpoints.detail(id), toApi(patch)), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (id) => api.delete(endpoints.detail(id)), onSuccess: refresh });

  return {
    items: data ?? EMPTY_LIST,
    add: async (item) => fromApi(await create.mutateAsync(item)),
    update: async (id, patch) => fromApi(await update.mutateAsync({ id, patch })),
    remove: (id) => remove.mutateAsync(id),
  };
}

const ApiMasterDataProvider = ({ children }) => {
  const { auth } = useAuth();
  const enabled = isStaffSession(auth);

  const services = useMasterResource({ enabled, queryKey: MASTER_QUERY_KEYS.services, endpoints: ENDPOINTS.master.services, fromApi: serviceFromApi, toApi: serviceToApi });
  const quadrants = useMasterResource({ enabled, queryKey: MASTER_QUERY_KEYS.quadrants, endpoints: ENDPOINTS.master.quadrants, fromApi: quadrantFromApi, toApi: quadrantToApi });
  const cancel = useMasterResource({
    enabled,
    queryKey: MASTER_QUERY_KEYS.cancelReasons,
    endpoints: ENDPOINTS.master.cancelReasons,
    fromApi: reasonFromApi,
    toApi: (item, opts) => reasonToApi(item, { ...opts, withTherapistOff: true }),
  });
  const discharge = useMasterResource({ enabled, queryKey: MASTER_QUERY_KEYS.dischargeReasons, endpoints: ENDPOINTS.master.dischargeReasons, fromApi: reasonFromApi, toApi: reasonToApi });

  const value = buildMasterValue(
    { services: services.items, quadrants: quadrants.items, cancelReasons: cancel.items, dischargeReasons: discharge.items },
    {
      addService: services.add,
      updateService: services.update,
      deleteService: services.remove,
      addQuadrant: quadrants.add,
      updateQuadrant: quadrants.update,
      deleteQuadrant: quadrants.remove,
      addCancelReason: cancel.add,
      updateCancelReason: cancel.update,
      deleteCancelReason: cancel.remove,
      addDischargeReason: discharge.add,
      updateDischargeReason: discharge.update,
      deleteDischargeReason: discharge.remove,
    }
  );

  return <MasterDataContext.Provider value={value}>{children}</MasterDataContext.Provider>;
};

export const MasterDataProvider = isApiMode() ? ApiMasterDataProvider : LocalMasterDataProvider;

export const useMasterData = () => useContext(MasterDataContext);
