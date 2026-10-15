import { useCallback, useEffect, useRef, useState } from "react";

// Data dari server hanya diambil bila ada komponen yang BENAR-BENAR membacanya (aturan "jangan fetch yang tidak diperlukan",
// docs/guide/08). Store mode API memakai hook ini: tiap daftar punya kunci, `demand(kunci)` dipanggil saat komponen membaca
// daftar itu (getter di nilai context), dan query react-query baru `enabled` setelah kunci itu diminta.
//
//   const { demand, isOn, loading } = useDemand(isStaffSession(auth));
//   useQuery({ ..., enabled: active && isOn("services") });
//   // di nilai context:  get services() { demand("services"); return items; }
//
// - `demand(kunci)`: dipanggil saat render konsumen. Hanya mencatat (ref) lalu menjadwalkan setState di microtask, jadi aman
//   dipanggil di fase render. Pemanggilan berulang murah.
// - `loading(kunci, queryLoading)`: true sejak kunci diminta sampai datanya tiba. Termasuk jeda sebelum query sempat
//   aktif, jadi konsumen tidak sempat menampilkan "data kosong" sesaat.
// - Semua catatan dibuang saat sesi berakhir (`active` false): login berikutnya mulai dari nol.
export function useDemand(active) {
  const [on, setOn] = useState(() => new Set());
  const requested = useRef(new Set());
  const queued = useRef(new Set());

  useEffect(() => {
    if (active) return;
    requested.current = new Set();
    queued.current = new Set();
    setOn((prev) => (prev.size ? new Set() : prev));
  }, [active]);

  const demand = useCallback((key) => {
    requested.current.add(key);
    if (queued.current.has(key)) return;
    queued.current.add(key);
    queueMicrotask(() => setOn((prev) => (prev.has(key) ? prev : new Set(prev).add(key))));
  }, []);

  const isOn = (key) => on.has(key);
  const loading = (key, queryLoading = false) => active && requested.current.has(key) && (!on.has(key) || queryLoading);
  const anyLoading = (checks) => checks.some(([key, queryLoading]) => loading(key, queryLoading));

  return { demand, isOn, loading, anyLoading };
}

// Bungkus objek nilai context: properti di `map` menjadi getter yang memanggil `demand` untuk kunci-kuncinya saat DIBACA.
// Properti lain (aksi tulis, isLoading, ...) dibiarkan. Fungsi yang baru dipanggil di tengah render (mis. `getService(id)`)
// sebaiknya menjalankan `demand` saat dipanggil (bukan saat dibaca) supaya sekadar mengambilnya dari context tidak memicu fetch.
export function withDemand(base, map, demand) {
  const result = {};
  Object.keys(base).forEach((prop) => {
    const keys = map[prop];
    if (!keys) {
      Object.defineProperty(result, prop, { value: base[prop], enumerable: true, writable: true, configurable: true });
    } else if (typeof base[prop] === "function") {
      const fn = base[prop];
      Object.defineProperty(result, prop, { value: (...args) => { keys.forEach(demand); return fn(...args); }, enumerable: true, configurable: true });
    } else {
      Object.defineProperty(result, prop, { get: () => { keys.forEach(demand); return base[prop]; }, enumerable: true, configurable: true });
    }
  });
  return result;
}
