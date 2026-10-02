import { useEffect, useReducer, useState } from "react";
import { readPersisted, writePersisted } from "@/services/storage/localStore";

const seedValue = (seedFactory) => (typeof seedFactory === "function" ? seedFactory() : seedFactory);

// Reducer yang dipersist ke storage lokal.
// Load saat mount; fallback ke seedFactory() bila kosong/rusak. Auto-save setiap state berubah.
export function usePersistentReducer(key, reducer, seedFactory) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const stored = readPersisted(key);
    return stored !== undefined ? stored : seedValue(seedFactory);
  });

  useEffect(() => {
    writePersisted(key, state);
  }, [key, state]);

  return [state, dispatch];
}

// Varian useState yang dipersist ke storage lokal.
export function usePersistentState(key, seedFactory) {
  const [value, setValue] = useState(() => {
    const stored = readPersisted(key);
    return stored !== undefined ? stored : seedValue(seedFactory);
  });

  useEffect(() => {
    writePersisted(key, value);
  }, [key, value]);

  return [value, setValue];
}
