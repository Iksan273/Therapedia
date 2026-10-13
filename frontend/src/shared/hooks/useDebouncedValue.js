import { useEffect, useState } from "react";

// Nilai yang tertunda `delay` ms setelah perubahan terakhir. Dipakai kotak pencarian yang memanggil API agar tidak
// mengirim satu request per ketukan tombol.
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
