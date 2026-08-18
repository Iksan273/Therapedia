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
    case "UPDATE_MANY":
      return state.map((s) => (action.ids.includes(s.id) ? { ...s, ...action.patch } : s));
    case "RESCHEDULE_BULK":
      return state.map((s) => {
        if (!action.itemsMap[s.id]) return s;
        return { ...s, ...action.itemsMap[s.id] };
      });
    default:
      return state;
  }
}

export const SchedulesProvider = ({ children }) => {
  const [schedules, dispatch] = usePersistentReducer("schedules", schedulesReducer, loadSchedulesSeed);

  const addSchedule = (schedule) => dispatch({ type: "ADD", schedule });
  const addSchedules = (list) => dispatch({ type: "ADD_MANY", schedules: list });
  const updateSchedule = (id, patch) => dispatch({ type: "UPDATE", id, patch });
  const updateSchedulesMany = (ids, patch) => dispatch({ type: "UPDATE_MANY", ids, patch });
  const rescheduleSchedulesBulk = (itemsMap) => dispatch({ type: "RESCHEDULE_BULK", itemsMap });

  return (
    <SchedulesContext.Provider
      value={{
        schedules,
        addSchedule,
        addSchedules,
        updateSchedule,
        updateSchedulesMany,
        rescheduleSchedulesBulk,
      }}
    >
      {children}
    </SchedulesContext.Provider>
  );
};

export const useSchedules = () => useContext(SchedulesContext);
