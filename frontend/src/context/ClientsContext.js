import React, { createContext, useContext } from "react";
import { usePersistentReducer } from "@/hooks/useLocalStorage";
import { loadClientsSeed } from "@/data/seedLoader";
import { nowIso } from "@/lib/appUtils";

const ClientsContext = createContext(null);

function clientsReducer(state, action) {
  switch (action.type) {
    case "ADD":
      return [...state, action.client];
    case "UPDATE":
      return state.map((c) =>
        c.id === action.id ? { ...c, ...action.patch, updatedAt: nowIso() } : c
      );
    default:
      return state;
  }
}

export const ClientsProvider = ({ children }) => {
  const [clients, dispatch] = usePersistentReducer("clients", clientsReducer, loadClientsSeed);

  const addClient = (client) => dispatch({ type: "ADD", client });
  const updateClient = (id, patch) => dispatch({ type: "UPDATE", id, patch });
  const getClient = (id) => clients.find((c) => c.id === id);

  return (
    <ClientsContext.Provider value={{ clients, addClient, updateClient, getClient }}>
      {children}
    </ClientsContext.Provider>
  );
};

export const useClients = () => useContext(ClientsContext);
