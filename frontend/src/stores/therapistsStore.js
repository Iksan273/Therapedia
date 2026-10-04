import React, { createContext, useContext } from "react";
import { usePersistentReducer } from "@/shared/hooks/usePersistentState";
import { getSeedLoader } from "@/data/seedRegistry";

const TherapistsContext = createContext(null);

function therapistsReducer(state, action) {
  switch (action.type) {
    case "DELETE_BY_BRANCH": // hanya dipakai hapus cabang (ADR 0005)
      return state.filter((t) => t.branchId !== action.branchId);
    default:
      return state;
  }
}

export const TherapistsProvider = ({ children }) => {
  const [therapists, dispatch] = usePersistentReducer("therapists", therapistsReducer, () => getSeedLoader().loadTherapistsSeed());
  const getTherapist = (id) => therapists.find((t) => t.id === id);
  const removeTherapistsByBranch = (branchId) => dispatch({ type: "DELETE_BY_BRANCH", branchId });

  return (
    <TherapistsContext.Provider value={{ therapists, getTherapist, removeTherapistsByBranch }}>
      {children}
    </TherapistsContext.Provider>
  );
};

export const useTherapists = () => useContext(TherapistsContext);
