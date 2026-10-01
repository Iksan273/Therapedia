import { useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";

// State filter yang disimpan di query string URL (mode replace, tidak menumpuk riwayat).
// Nilai yang sama dengan default tidak ditulis ke URL agar URL tetap pendek.
// `defaults` adalah objek { key: nilaiDefault }; hanya key di dalamnya yang dikelola hook ini.
export function useUrlFilters(defaults) {
  const [params, setParams] = useSearchParams();
  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;
  const defaultsKey = JSON.stringify(defaults);

  const values = useMemo(() => {
    const out = {};
    Object.keys(defaultsRef.current).forEach((k) => {
      out[k] = params.get(k) ?? defaultsRef.current[k];
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, defaultsKey]);

  const apply = useCallback(
    (patch) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(patch).forEach(([k, v]) => {
            if (v == null || v === "" || v === defaultsRef.current[k]) next.delete(k);
            else next.set(k, v);
          });
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  const setFilter = useCallback((key, val) => apply({ [key]: val }), [apply]);

  const reset = useCallback(() => {
    apply(Object.fromEntries(Object.keys(defaultsRef.current).map((k) => [k, null])));
  }, [apply]);

  return { values, setFilter, setFilters: apply, reset };
}
