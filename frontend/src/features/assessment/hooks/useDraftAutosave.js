import { useCallback, useEffect, useRef, useState } from "react";
import { diffAnswers } from "@/domain/assessment";

// Simpan otomatis draft kuesioner: debounce setelah perubahan, interval pengaman, dan flush saat tab disembunyikan / ditutup /
// komponen dilepas. Yang dikirim ke `save` hanya PATCH jawaban (selisih dari simpanan terakhir), sesuai kontrak
// PUT /public/assessments/{code}/draft. Draft baru dibuat hanya bila ada jawaban/persetujuan yang berubah.
// Mengembalikan: state { status: idle|saving|saved|error, savedAt }, flush({ manual }), reset(baseline), cancel().
export function useDraftAutosave({ enabled, save, answers, consentAt, lastSectionId, debounceMs = 1000, intervalMs = 30000 }) {
  const [state, setState] = useState({ status: "idle", savedAt: null });
  const latest = useRef({ answers, consentAt, lastSectionId });
  const baseline = useRef({ answers: {}, consentAt: null, lastSectionId: null });
  const enabledRef = useRef(enabled);
  const saveRef = useRef(save);
  const timer = useRef(null);

  latest.current = { answers, consentAt, lastSectionId };
  enabledRef.current = enabled;
  saveRef.current = save;

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  // Mengembalikan "saved" | "clean" | "error" (clean = tidak ada yang perlu disimpan)
  const flush = useCallback(() => {
    clearTimer();
    if (!enabledRef.current) return "clean";
    const cur = latest.current;
    const base = baseline.current;
    const patch = diffAnswers(base.answers, cur.answers);
    const dirty = Object.keys(patch).length > 0 || cur.consentAt !== base.consentAt;
    if (!dirty) return "clean";
    try {
      setState((s) => ({ ...s, status: "saving" }));
      saveRef.current({ answers: patch, lastSectionId: cur.lastSectionId, consentAt: cur.consentAt });
      baseline.current = { answers: { ...cur.answers }, consentAt: cur.consentAt, lastSectionId: cur.lastSectionId };
      setState({ status: "saved", savedAt: new Date() });
      return "saved";
    } catch {
      setState((s) => ({ ...s, status: "error" }));
      return "error";
    }
  }, []);

  // Jadwalkan simpan setiap jawaban/persetujuan berubah
  useEffect(() => {
    if (!enabled) return undefined;
    clearTimer();
    timer.current = setTimeout(flush, debounceMs);
    return clearTimer;
  }, [enabled, answers, consentAt, lastSectionId, debounceMs, flush]);

  // Interval pengaman + flush saat tab disembunyikan / ditutup
  useEffect(() => {
    if (!enabled) return undefined;
    const interval = setInterval(flush, intervalMs);
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
    };
  }, [enabled, intervalMs, flush]);

  // Lepas komponen (pindah halaman): simpan sisa perubahan
  useEffect(() => () => { flush(); }, [flush]);

  // Titik acuan simpanan saat form dibuka (jawaban hasil resume dianggap sudah tersimpan)
  const reset = useCallback((next = {}) => {
    clearTimer();
    baseline.current = { answers: { ...(next.answers || {}) }, consentAt: next.consentAt ?? null, lastSectionId: next.lastSectionId ?? null };
    setState({ status: "idle", savedAt: null });
  }, []);

  // Dipanggil sebelum submit final agar tidak ada simpan draft yang menyusul
  const cancel = useCallback(() => {
    clearTimer();
    enabledRef.current = false;
  }, []);

  return { state, flush, reset, cancel };
}
