import { useEffect, useReducer, useState } from "react";

export const STORAGE_PREFIX = "therapedia_v5_";
export const LEGACY_PREFIX = "therapedia_v4_";

function migrateRawState(raw) {
  if (!raw) return null;
  try {
    const replaced = raw
      .replace(/Paket Reguler/g, "Regular Therapist")
      .replace(/Paket VIP/g, "Senior Therapist")
      .replace(/Surabaya Timur/g, "East")
      .replace(/Surabaya Barat/g, "West");
    return JSON.parse(replaced);
  } catch (e) {
    return null;
  }
}

// Reducer-backed state persisted to localStorage.
// Loads from localStorage on mount; falls back to seedFactory() when empty/corrupted.
// Auto-saves on every state change.
export function usePersistentReducer(key, reducer, seedFactory) {
  const storageKey = STORAGE_PREFIX + key;
  const legacyKey = LEGACY_PREFIX + key;

  const [state, dispatch] = useReducer(reducer, undefined, () => {
    try {
      // 1. Check current v5 storage
      const rawV5 = window.localStorage.getItem(storageKey);
      if (rawV5 !== null) {
        const migrated = migrateRawState(rawV5);
        if (migrated !== null) return migrated;
      }

      // 2. Check legacy v4 storage and migrate seamlessly
      const rawV4 = window.localStorage.getItem(legacyKey);
      if (rawV4 !== null) {
        const migrated = migrateRawState(rawV4);
        if (migrated !== null) {
          try {
            window.localStorage.setItem(storageKey, JSON.stringify(migrated));
            window.localStorage.removeItem(legacyKey);
          } catch (_) {}
          return migrated;
        }
      }
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
  const legacyKey = LEGACY_PREFIX + key;

  const [value, setValue] = useState(() => {
    try {
      const rawV5 = window.localStorage.getItem(storageKey);
      if (rawV5 !== null) {
        const migrated = migrateRawState(rawV5);
        if (migrated !== null) return migrated;
      }

      const rawV4 = window.localStorage.getItem(legacyKey);
      if (rawV4 !== null) {
        const migrated = migrateRawState(rawV4);
        if (migrated !== null) {
          try {
            window.localStorage.setItem(storageKey, JSON.stringify(migrated));
            window.localStorage.removeItem(legacyKey);
          } catch (_) {}
          return migrated;
        }
      }
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
    .filter((k) => k.startsWith("therapedia_"))
    .forEach((k) => window.localStorage.removeItem(k));
}
