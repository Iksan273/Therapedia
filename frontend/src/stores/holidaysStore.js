import React, { createContext, useContext } from "react";
import { usePersistentReducer } from "@/shared/hooks/usePersistentState";
import { DEFAULT_HOLIDAYS } from "@/domain/holiday";
import { nowIso } from "@/shared/lib/id";

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

// Pengaturan hari libur. Disimpan terpisah dari seed demo (data konfigurasi, bukan data domain).
export const HolidaysProvider = ({ children }) => {
  const [holidays, dispatch] = usePersistentReducer("holidays", holidaysReducer, () => DEFAULT_HOLIDAYS);

  const addHoliday = (holiday) => dispatch({ type: "ADD", holiday });
  const updateHoliday = (id, patch) => dispatch({ type: "UPDATE", id, patch });
  const removeHoliday = (id) => dispatch({ type: "REMOVE", id });

  return <HolidaysContext.Provider value={{ holidays, addHoliday, updateHoliday, removeHoliday }}>{children}</HolidaysContext.Provider>;
};

export const useHolidays = () => useContext(HolidaysContext);
