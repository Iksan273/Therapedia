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
    case "DELETE": // soft delete: baris tetap ada (deletedAt/deletedBy), tidak muncul di daftar mana pun
      return state.map((c) => (c.id === action.id ? { ...c, deletedAt: nowIso(), deletedBy: action.by || null } : c));
    default:
      return state;
  }
}

export const ClientsProvider = ({ children }) => {
  const [allClients, dispatch] = usePersistentReducer("clients", clientsReducer, () => getSeedLoader().loadClientsSeed());
  const clients = React.useMemo(() => allClients.filter((c) => !c.deletedAt), [allClients]);

  const addClient = (client) => dispatch({ type: "ADD", client });
  const updateClient = (id, patch) => dispatch({ type: "UPDATE", id, patch });
  const deleteClient = (id, by) => dispatch({ type: "DELETE", id, by });
  const getClient = (id) => clients.find((c) => c.id === id);

  return (
    <ClientsContext.Provider value={{ clients, addClient, updateClient, deleteClient, getClient }}>
      {children}
    </ClientsContext.Provider>
  );
};

export const useClients = () => useContext(ClientsContext);
