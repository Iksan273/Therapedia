import React, { createContext, useContext } from "react";
import { usePersistentState } from "@/hooks/useLocalStorage";

const EMPTY_AUTH = { role: null, therapistId: null, clientId: null };

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = usePersistentState("auth", () => EMPTY_AUTH);

  const login = (payload) => setAuth({ ...EMPTY_AUTH, ...payload });
  const logout = () => setAuth(EMPTY_AUTH);

  return <AuthContext.Provider value={{ auth, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
