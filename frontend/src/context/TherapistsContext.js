import React, { createContext, useContext } from "react";
import { usePersistentReducer } from "@/hooks/useLocalStorage";
import { loadTherapistsSeed } from "@/data/seedLoader";

const TherapistsContext = createContext(null);

function therapistsReducer(state, action) {
  switch (action.type) {
    default:
      return state;
  }
}

export const TherapistsProvider = ({ children }) => {
  const [therapists] = usePersistentReducer("therapists", therapistsReducer, loadTherapistsSeed);
  const getTherapist = (id) => therapists.find((t) => t.id === id);

  return (
    <TherapistsContext.Provider value={{ therapists, getTherapist }}>
      {children}
    </TherapistsContext.Provider>
  );
};

export const useTherapists = () => useContext(TherapistsContext);
