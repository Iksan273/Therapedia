import { useCallback, useEffect, useState } from "react";

// Hitung mundur dalam detik (mis. jeda kirim ulang OTP, masa berlaku OTP). `start(detik)` memulai ulang,
// `reset()` menghentikan. `active` = hitung mundur pernah dimulai; `remaining` = sisa detik (0 setelah habis).
export function useCountdown() {
  const [endsAt, setEndsAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return undefined;
    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= endsAt) clearInterval(id);
    }, 500);
    return () => clearInterval(id);
  }, [endsAt]);

  const start = useCallback((seconds) => {
    const current = Date.now();
    setNow(current);
    setEndsAt(current + seconds * 1000);
  }, []);
  const reset = useCallback(() => setEndsAt(0), []);

  return { remaining: endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0, active: endsAt > 0, start, reset };
}

// "7:05" untuk 425 detik
export const fmtCountdown = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
