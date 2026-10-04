import React, { createContext, useContext } from "react";
import { usePersistentReducer } from "@/shared/hooks/usePersistentState";
import { getSeedLoader } from "@/data/seedRegistry";
import { nowIso } from "@/shared/lib/id";

const ClientsContext = createContext(null);

function clientsReducer(state, action) {
  switch (action.type) {
    case "ADD":
      return [...state, action.client];
    case "UPDATE":
      return state.map((c) =>
        c.id === action.id ? { ...c, ...action.patch, updatedAt: nowIso() } : c
      );
    case "DELETE": // hapus permanen (ADR 0005); data terkait dihapus hook use-case useClientDeleteActions
      return state.filter((c) => c.id !== action.id);
    default:
      return state;
  }
}

export const ClientsProvider = ({ children }) => {
  const [clients, dispatch] = usePersistentReducer("clients", clientsReducer, () => getSeedLoader().loadClientsSeed());

  const addClient = (client) => dispatch({ type: "ADD", client });
  const updateClient = (id, patch) => dispatch({ type: "UPDATE", id, patch });
  const deleteClient = (id) => dispatch({ type: "DELETE", id });
  const getClient = (id) => clients.find((c) => c.id === id);

  return (
    <ClientsContext.Provider value={{ clients, addClient, updateClient, deleteClient, getClient }}>
      {children}
    </ClientsContext.Provider>
  );
};

export const useClients = () => useContext(ClientsContext);
