import React, { createContext, useContext, useMemo } from "react";
import { usePersistentReducer } from "@/shared/hooks/usePersistentState";
import { DEFAULT_DISCHARGE_REASONS, INTAKE_SERVICES, dischargeReasonLabel } from "@/domain/client";
import { DEFAULT_CANCEL_REASONS, DEFAULT_THERAPIST_OFF_REASONS, cancelReasonCode, cancelReasonLabel } from "@/domain/schedule";

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
const seedCancelReasons = () => DEFAULT_CANCEL_REASONS.map((r) => ({ ...r, active: true }));
const seedTherapistOffReasons = () => DEFAULT_THERAPIST_OFF_REASONS.map((r) => ({ ...r, active: true }));
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

export const MasterDataProvider = ({ children }) => {
  const [services, dispatchServices] = usePersistentReducer("master_services", servicesReducer, seedServices);
  const [quadrants, dispatchQuadrants] = usePersistentReducer("master_quadrants", quadrantsReducer, seedQuadrants);
  const [cancelReasons, dispatchCancel] = usePersistentReducer("master_cancel_off_codes", reasonsReducer, seedCancelReasons); // satu daftar alasan Cancel / Off (key baru: tiap alasan punya CODE)
  const [therapistOffReasons, dispatchTherapistOff] = usePersistentReducer("master_therapist_off_codes", reasonsReducer, seedTherapistOffReasons); // master Therapist Off (ber-CODE), ikut jadi pilihan Cancel / Off
  const [dischargeReasons, dispatchDischarge] = usePersistentReducer("master_discharge_reasons", reasonsReducer, seedDischargeReasons);

  const value = useMemo(() => {
    const quadrantMap = Object.fromEntries(quadrants.map((q) => [q.code, q]));
    const allCancelReasons = [...cancelReasons, ...therapistOffReasons.map((r) => ({ ...r, therapistOff: true }))];
    const therapistOffCodes = therapistOffReasons.map((r) => r.value);
    return {
      services,
      // Layanan yang boleh dipilih di form; yang nonaktif tetap bisa dilabeli lewat getService
      activeServices: services.filter((s) => s.active !== false),
      getService: (val) => services.find((s) => s.value === val),
      addService: (item) => dispatchServices({ type: "ADD", item }),
      updateService: (id, patch) => dispatchServices({ type: "UPDATE", id, patch }),
      deleteService: (id) => dispatchServices({ type: "DELETE", id }),

      quadrants,
      quadrantMap,
      getQuadrant: (code) => quadrantMap[code],
      addQuadrant: (item) => dispatchQuadrants({ type: "ADD", item }),
      updateQuadrant: (id, patch) => dispatchQuadrants({ type: "UPDATE", id, patch }),
      deleteQuadrant: (id) => dispatchQuadrants({ type: "DELETE", id }),

      // Pilihan cepat alasan. Data transaksi menyimpan string (code atau teks custom), bukan relasi ke daftar ini.
      // `cancelReasons` = alasan Cancel / Off + alasan Therapist Off (dipakai form, label, dan grafik); `baseCancelReasons` = hanya daftar Cancel / Off
      cancelReasons: allCancelReasons,
      baseCancelReasons: cancelReasons,
      activeCancelReasons: allCancelReasons.filter((r) => r.active !== false),
      therapistOffReasons,
      therapistOffCodes,
      getCancelReasonLabel: (val) => cancelReasonLabel(val, allCancelReasons),
      getCancelReasonCode: (val) => cancelReasonCode(val),
      addCancelReason: (item) => dispatchCancel({ type: "ADD", item }),
      updateCancelReason: (id, patch) => dispatchCancel({ type: "UPDATE", id, patch }),
      deleteCancelReason: (id) => dispatchCancel({ type: "DELETE", id }),

      addTherapistOffReason: (item) => dispatchTherapistOff({ type: "ADD", item }),
      updateTherapistOffReason: (id, patch) => dispatchTherapistOff({ type: "UPDATE", id, patch }),
      deleteTherapistOffReason: (id) => dispatchTherapistOff({ type: "DELETE", id }),

      dischargeReasons,
      activeDischargeReasons: dischargeReasons.filter((r) => r.active !== false),
      getDischargeReasonLabel: (val) => dischargeReasonLabel(val, dischargeReasons),
      addDischargeReason: (item) => dispatchDischarge({ type: "ADD", item }),
      updateDischargeReason: (id, patch) => dispatchDischarge({ type: "UPDATE", id, patch }),
      deleteDischargeReason: (id) => dispatchDischarge({ type: "DELETE", id }),
    };
  }, [services, quadrants, cancelReasons, therapistOffReasons, dischargeReasons, dispatchServices, dispatchQuadrants, dispatchCancel, dispatchTherapistOff, dispatchDischarge]);

  return <MasterDataContext.Provider value={value}>{children}</MasterDataContext.Provider>;
};

export const useMasterData = () => useContext(MasterDataContext);
