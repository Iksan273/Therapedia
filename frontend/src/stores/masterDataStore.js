import React, { createContext, useContext, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePersistentReducer } from "@/shared/hooks/usePersistentState";
import { useDemand, withDemand } from "@/shared/hooks/useDemand";
import { readPersisted } from "@/services/storage/localStore";
import { DEFAULT_DISCHARGE_REASONS, INTAKE_SERVICES, dischargeReasonLabel } from "@/domain/client";
import { DEFAULT_CANCEL_REASONS, DEFAULT_THERAPIST_OFF_REASONS, cancelReasonCode, cancelReasonLabel } from "@/domain/schedule";
import { isStaffSession } from "@/domain/auth";
import { isApiMode } from "@/config/env";
import { api } from "@/services/http/httpClient";
import { ENDPOINTS } from "@/services/api/endpoints";
import {
  reasonFromApi,
  reasonToApi,
  serviceFromApi,
  serviceToApi,
} from "@/services/api/mappers/masterDataMapper";
import { useAuth } from "@/stores/authStore";

const MasterDataContext = createContext(null);

const seedServices = () => INTAKE_SERVICES.map((s) => ({ ...s, active: true }));
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
const reasonsReducer = makeListReducer("value");

// Nilai context dari data + aksi tulis. Dipakai kedua mode, jadi halaman tidak peduli sumber datanya. Aksi tulis di mode API
// mengembalikan Promise dan melempar `ApiError` (`message`, `fieldErrors`); di mode demo sinkron (halaman cukup `await`).
const buildMasterValue = ({ services, cancelReasons, dischargeReasons }, actions) => {
  const therapistOffReasons = cancelReasons.filter((r) => r.therapistOff);
  const therapistOffCodes = therapistOffReasons.map((r) => r.value);
  return {
    isLoading: false, // mode API menimpa saat daftar master masih dimuat
    services,
    // Layanan yang boleh dipilih di form; yang nonaktif tetap bisa dilabeli lewat getService
    activeServices: services.filter((s) => s.active !== false),
    getService: (val) => services.find((s) => s.value === val),
    addService: actions.addService,
    updateService: actions.updateService,
    deleteService: actions.deleteService,

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
  const [cancelReasons, dispatchCancel] = usePersistentReducer("master_cancel_reasons", reasonsReducer, initCancelReasons); // satu daftar alasan Cancel / Off ber-CODE; `therapistOff` menandai alasan terapis berhalangan
  const [dischargeReasons, dispatchDischarge] = usePersistentReducer("master_discharge_reasons", reasonsReducer, seedDischargeReasons);

  const value = useMemo(
    () =>
      buildMasterValue(
        { services, cancelReasons, dischargeReasons },
        {
          addService: (item) => dispatchServices({ type: "ADD", item }),
          updateService: (id, patch) => dispatchServices({ type: "UPDATE", id, patch }),
          deleteService: (id) => dispatchServices({ type: "DELETE", id }),
          addCancelReason: (item) => dispatchCancel({ type: "ADD", item: { therapistOff: false, ...item } }),
          updateCancelReason: (id, patch) => dispatchCancel({ type: "UPDATE", id, patch }),
          deleteCancelReason: (id) => dispatchCancel({ type: "DELETE", id }),
          addDischargeReason: (item) => dispatchDischarge({ type: "ADD", item }),
          updateDischargeReason: (id, patch) => dispatchDischarge({ type: "UPDATE", id, patch }),
          deleteDischargeReason: (id) => dispatchDischarge({ type: "DELETE", id }),
        }
      ),
    [services, cancelReasons, dischargeReasons, dispatchServices, dispatchCancel, dispatchDischarge]
  );

  return <MasterDataContext.Provider value={value}>{children}</MasterDataContext.Provider>;
};

// ---- Mode API (Laravel M3): `GET /master/*` dibaca semua staf; tulis butuh modul `inquiry_master_data`. Hapus layanan
// yang dipakai dijawab 409 `in_use` (pesan server ditampilkan halaman); alasan Cancel/Off dan Discharge dihapus bebas.
export const MASTER_QUERY_KEYS = {
  services: ["master", "services"],
  cancelReasons: ["master", "cancel-reasons"],
  dischargeReasons: ["master", "discharge-reasons"],
};

const EMPTY_LIST = [];

// Satu resource master: daftar (react-query) + tambah/ubah/hapus. Mutasi mengembalikan item hasil pemetaan.
function useMasterResource({ enabled, queryKey, endpoints, fromApi, toApi }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: ({ signal }) => api.get(endpoints.list, undefined, { signal }).then((rows) => rows.map(fromApi)),
    enabled, // sudah memuat kunci permintaan (lihat ApiMasterDataProvider)
    staleTime: 5 * 60_000,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey });

  const create = useMutation({ mutationFn: (item) => api.post(endpoints.list, toApi(item, { create: true })), onSuccess: refresh });
  const update = useMutation({ mutationFn: ({ id, patch }) => api.patch(endpoints.detail(id), toApi(patch)), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (id) => api.delete(endpoints.detail(id)), onSuccess: refresh });

  return {
    items: data ?? EMPTY_LIST,
    isLoading: isLoading && enabled, // muat pertama (query sedang berjalan)
    add: async (item) => fromApi(await create.mutateAsync(item)),
    update: async (id, patch) => fromApi(await update.mutateAsync({ id, patch })),
    remove: (id) => remove.mutateAsync(id),
  };
}

const ApiMasterDataProvider = ({ children }) => {
  const { auth } = useAuth();
  const active = isStaffSession(auth);
  // Tiap daftar master baru diambil saat ada komponen yang membacanya (aturan "jangan fetch yang tidak diperlukan").
  const { demand, isOn, anyLoading } = useDemand(active);

  const services = useMasterResource({ enabled: active && isOn("services"), queryKey: MASTER_QUERY_KEYS.services, endpoints: ENDPOINTS.master.services, fromApi: serviceFromApi, toApi: serviceToApi });
  const cancel = useMasterResource({
    enabled: active && isOn("cancelReasons"),
    queryKey: MASTER_QUERY_KEYS.cancelReasons,
    endpoints: ENDPOINTS.master.cancelReasons,
    fromApi: reasonFromApi,
    toApi: (item, opts) => reasonToApi(item, { ...opts, withTherapistOff: true }),
  });
  const discharge = useMasterResource({ enabled: active && isOn("dischargeReasons"), queryKey: MASTER_QUERY_KEYS.dischargeReasons, endpoints: ENDPOINTS.master.dischargeReasons, fromApi: reasonFromApi, toApi: reasonToApi });

  const base = buildMasterValue(
    { services: services.items, cancelReasons: cancel.items, dischargeReasons: discharge.items },
    {
      addService: services.add,
      updateService: services.update,
      deleteService: services.remove,
      addCancelReason: cancel.add,
      updateCancelReason: cancel.update,
      deleteCancelReason: cancel.remove,
      addDischargeReason: discharge.add,
      updateDischargeReason: discharge.update,
      deleteDischargeReason: discharge.remove,
    }
  );

  // Properti -> daftar yang diminta saat dibaca (array: saat dibaca; fungsi: saat dipanggil)
  const value = withDemand(
    base,
    {
      services: ["services"], activeServices: ["services"], getService: ["services"],
      cancelReasons: ["cancelReasons"], activeCancelReasons: ["cancelReasons"], therapistOffReasons: ["cancelReasons"], therapistOffCodes: ["cancelReasons"], getCancelReasonLabel: ["cancelReasons"],
      dischargeReasons: ["dischargeReasons"], activeDischargeReasons: ["dischargeReasons"], getDischargeReasonLabel: ["dischargeReasons"],
    },
    demand
  );
  // Muat pertama kali: salah satu daftar yang diminta belum tiba (halaman menampilkan kerangka shimmer)
  Object.defineProperty(value, "isLoading", {
    get: () => anyLoading([["services", services.isLoading], ["cancelReasons", cancel.isLoading], ["dischargeReasons", discharge.isLoading]]),
    enumerable: true,
  });

  return <MasterDataContext.Provider value={value}>{children}</MasterDataContext.Provider>;
};

export const MasterDataProvider = isApiMode() ? ApiMasterDataProvider : LocalMasterDataProvider;

export const useMasterData = () => useContext(MasterDataContext);
