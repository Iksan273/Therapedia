import { useEffect, useReducer, useState } from "react";

export const STORAGE_PREFIX = "therapedia_v2_";

// Reducer-backed state persisted to localStorage.
// Loads from localStorage on mount; falls back to seedFactory() when empty/corrupted.
// Auto-saves on every state change.
export function usePersistentReducer(key, reducer, seedFactory) {
  const storageKey = STORAGE_PREFIX + key;
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw !== null) return JSON.parse(raw);
    } catch (e) {
      // corrupted entry -> fall back to seed
    }
    return seedFactory();
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {
      // storage full or unavailable -> keep in-memory state
    }
  }, [storageKey, state]);

  return [state, dispatch];
}

// Simple useState variant persisted to localStorage.
export function usePersistentState(key, seedFactory) {
  const storageKey = STORAGE_PREFIX + key;
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw !== null) return JSON.parse(raw);
    } catch (e) {
      // ignore
    }
    return typeof seedFactory === "function" ? seedFactory() : seedFactory;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch (e) {
      // ignore
    }
  }, [storageKey, value]);

  return [value, setValue];
}

export function clearPersistedData() {
  Object.keys(window.localStorage)
    .filter((k) => k.startsWith(STORAGE_PREFIX))
    .forEach((k) => window.localStorage.removeItem(k));
}
