import { useEffect, useRef } from "react";

// Infinite scroll di dalam wadah yang bisa di-scroll sendiri (mis. satu kolom kanban).
// Pasang `ref` pada elemen kecil di DASAR daftar (sentinel) dan beri atribut `data-infinite-root` pada wadah scroll-nya.
// `onVisible` dipanggil saat sentinel masuk area pandang wadah (dengan margin 120px agar data dimuat sebelum benar-benar mentok).
// `watch` (mis. jumlah item termuat) mengganti pengamat tiap kali daftar bertambah: bila sentinel masih terlihat
// (daftar masih pendek), halaman berikutnya langsung dimuat lagi sampai wadah penuh atau data habis.
// Mengembalikan `supported`; bila browser tak punya IntersectionObserver, tampilkan tombol "Muat lebih banyak" sebagai gantinya.
export function useInfiniteSentinel({ enabled, onVisible, watch }) {
  const ref = useRef(null);
  const callback = useRef(onVisible);
  callback.current = onVisible;
  const supported = typeof IntersectionObserver !== "undefined";

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || !supported) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) callback.current();
      },
      { root: el.closest("[data-infinite-root]"), rootMargin: "0px 0px 120px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, supported, watch]);

  return { ref, supported };
}
