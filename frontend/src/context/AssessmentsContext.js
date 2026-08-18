import React, { createContext, useContext } from "react";
import { usePersistentReducer } from "@/hooks/useLocalStorage";
import { loadCategoriesSeed } from "@/data/seedLoader";

const AssessmentsContext = createContext(null);

function categoriesReducer(state, action) {
  switch (action.type) {
    case "ADD":
      return [...state, action.category];
    case "UPDATE":
      return state.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c));
    case "DELETE":
      return state.filter((c) => c.id !== action.id);
    default:
      return state;
  }
}

export const AssessmentsProvider = ({ children }) => {
  const [categories, dispatch] = usePersistentReducer("assessment_categories", categoriesReducer, loadCategoriesSeed);

  const addCategory = (category) => dispatch({ type: "ADD", category });
  const updateCategory = (id, patch) => dispatch({ type: "UPDATE", id, patch });
  const deleteCategory = (id) => dispatch({ type: "DELETE", id });
  const getCategory = (id) => categories.find((c) => c.id === id);

  return (
    <AssessmentsContext.Provider value={{ categories, addCategory, updateCategory, deleteCategory, getCategory }}>
      {children}
    </AssessmentsContext.Provider>
  );
};

export const useAssessments = () => useContext(AssessmentsContext);
