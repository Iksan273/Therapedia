import React, { useEffect, useRef, useState } from "react";

// pdf.js dimuat lazy (hanya saat ada dokumen PDF) agar tidak membebani bundel utama.
let pdfjsPromise = null;
const loadPdfjs = () => {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([import("pdfjs-dist"), import("pdfjs-dist/build/pdf.worker.min.mjs?url")]).then(([lib, worker]) => {
      lib.GlobalWorkerOptions.workerSrc = worker.default;
      return lib;
    });
  }
  return pdfjsPromise;
};

// Render PDF per halaman ke <canvas> selebar kontainer (fit-width), mengalir di halaman biasa tanpa scroll bersarang,
// sehingga scroll & pinch-zoom normal di HP/tablet/desktop. Dirender ulang saat lebar kontainer berubah.
export function PdfViewer({ url, testId = "pdf-viewer" }) {
  const wrapRef = useRef(null);
  const canvasRefs = useRef([]);
  const [pdf, setPdf] = useState(null);
  const [width, setWidth] = useState(0);
  const [status, setStatus] = useState("loading"); // loading | ready | error

  // Muat dokumen
  useEffect(() => {
    let cancelled = false;
    let task = null;
    setStatus("loading");
    setPdf(null);
    loadPdfjs()
      .then((lib) => {
        // Tanpa permintaan Range / streaming: satu GET sederhana (tanpa preflight CORS) sehingga PDF dari API lintas-origin (dev) tetap
        // terbaca; dokumen section dibatasi 10 MB jadi muat sekaligus.
        task = lib.getDocument({ url, disableRange: true, disableStream: true });
        return task.promise;
      })
      .then((doc) => {
        if (cancelled) return;
        setPdf(doc);
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
      task?.destroy?.();
    };
  }, [url]);

  // Pantau lebar kontainer (debounce agar tidak render ulang di tiap piksel)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    let timer = null;
    const update = () => setWidth((prev) => {
      const next = Math.floor(el.clientWidth);
      return Math.abs(next - prev) > 2 ? next : prev;
    });
    update();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(update, 150);
    });
    ro.observe(el);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, []);

  // Gambar semua halaman berurutan; dibatalkan bila lebar/dokumen berubah
  useEffect(() => {
    if (!pdf || !width) return undefined;
    let cancelled = false;
    let current = null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    (async () => {
      try {
        for (let i = 1; i <= pdf.numPages; i += 1) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const fit = width / base.width;
          const viewport = page.getViewport({ scale: fit * dpr });
          const canvas = canvasRefs.current[i - 1];
          if (!canvas) continue;
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = `${Math.floor(base.width * fit)}px`;
          canvas.style.height = `${Math.floor(base.height * fit)}px`;
          current = page.render({ canvasContext: canvas.getContext("2d"), viewport });
          await current.promise;
          if (i === 1 && !cancelled) setStatus("ready");
        }
      } catch (err) {
        if (!cancelled && err?.name !== "RenderingCancelledException") setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      current?.cancel?.();
    };
  }, [pdf, width]);

  const pages = pdf ? Array.from({ length: pdf.numPages }, (_, i) => i) : [];

  return (
    <div ref={wrapRef} className="w-full" data-testid={testId}>
      {status === "loading" && (
        <p className="py-10 text-center text-xs font-medium text-slate-500 animate-pulse" data-testid={`${testId}-loading`}>Memuat dokumen...</p>
      )}
      {status === "error" && (
        <p className="py-10 px-4 text-center text-xs font-semibold text-rose-600" data-testid={`${testId}-error`}>
          Dokumen tidak dapat ditampilkan. Gunakan tombol "Buka di tab baru".
        </p>
      )}
      <div className="space-y-2">
        {pages.map((i) => (
          <canvas
            key={i}
            ref={(el) => { canvasRefs.current[i] = el; }}
            className="block mx-auto bg-white shadow-xs"
            data-testid={`${testId}-page-${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
