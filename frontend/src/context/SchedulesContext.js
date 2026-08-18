import React, { createContext, useContext } from "react";
import { usePersistentReducer } from "@/hooks/useLocalStorage";
import { loadSchedulesSeed } from "@/data/seedLoader";

const SchedulesContext = createContext(null);

function schedulesReducer(state, action) {
  switch (action.type) {
    case "ADD":
      return [...state, action.schedule];
    case "ADD_MANY":
      return [...state, ...action.schedules];
    case "UPDATE":
      return state.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s));
    default:
      return state;
  }
}

export const SchedulesProvider = ({ children }) => {
  const [schedules, dispatch] = usePersistentReducer("schedules", schedulesReducer, loadSchedulesSeed);

  const addSchedule = (schedule) => dispatch({ type: "ADD", schedule });
  const addSchedules = (list) => dispatch({ type: "ADD_MANY", schedules: list });
  const updateSchedule = (id, patch) => dispatch({ type: "UPDATE", id, patch });

  return (
    <SchedulesContext.Provider value={{ schedules, addSchedule, addSchedules, updateSchedule }}>
      {children}
    </SchedulesContext.Provider>
  );
};

export const useSchedules = () => useContext(SchedulesContext);
