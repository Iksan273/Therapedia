import { useCallback, useEffect, useRef, useState } from "react";
import { diffAnswers, diffRespondent } from "@/domain/assessment";

// Simpan otomatis draft kuesioner: debounce setelah perubahan, interval pengaman, dan flush saat tab disembunyikan / ditutup /
// komponen dilepas. Yang dikirim ke `save` hanya PATCH jawaban (selisih dari simpanan terakhir), sesuai kontrak
// PUT /public/assessments/{code}/draft. Draft baru dibuat hanya bila ada jawaban/persetujuan yang berubah.
// `save` boleh sinkron (mode demo) atau mengembalikan Promise (mode API: PUT …/draft). Versi Promise: titik acuan simpanan baru maju
// setelah server membalas; bila simpan masih berjalan, perubahan berikutnya diantrekan lalu dikirim begitu selesai (satu request
// berjalan pada satu waktu, supaya `version` draft tidak bentrok dengan dirinya sendiri).
// Mengembalikan: state { status: idle|saving|saved|error, savedAt }, flush() → "saved" | "clean" | "error" (sinkron) atau Promise
// bagi simpan asinkron, reset(baseline), cancel().
export function useDraftAutosave({ enabled, save, answers, respondent = {}, consentAt, lastSectionId, debounceMs = 1000, intervalMs = 30000 }) {
  const [state, setState] = useState({ status: "idle", savedAt: null });
  const latest = useRef({ answers, respondent, consentAt, lastSectionId });
  const baseline = useRef({ answers: {}, respondent: {}, consentAt: null, lastSectionId: null });
  const enabledRef = useRef(enabled);
  const saveRef = useRef(save);
  const timer = useRef(null);
  const inflight = useRef(null); // Promise simpan yang sedang berjalan (mode API)
  const queued = useRef(false); // ada perubahan baru saat simpan berjalan

  latest.current = { answers, respondent, consentAt, lastSectionId };
  enabledRef.current = enabled;
  saveRef.current = save;

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  // Mengembalikan "saved" | "clean" | "error" (clean = tidak ada yang perlu disimpan)
  const flush = useCallback(function flush() {
    clearTimer();
    if (!enabledRef.current) return "clean";
    const cur = latest.current;
    const base = baseline.current;
    if (inflight.current) {
      queued.current = true;
      return inflight.current;
    }
    const patch = diffAnswers(base.answers, cur.answers);
    const respondentPatch = diffRespondent(base.respondent, cur.respondent);
    const dirty = Object.keys(patch).length > 0 || Object.keys(respondentPatch).length > 0 || cur.consentAt !== base.consentAt;
    if (!dirty) return "clean";
    const next = { answers: { ...cur.answers }, respondent: { ...cur.respondent }, consentAt: cur.consentAt, lastSectionId: cur.lastSectionId };
    const done = () => {
      baseline.current = next;
      setState({ status: "saved", savedAt: new Date() });
    };
    try {
      setState((s) => ({ ...s, status: "saving" }));
      const result = saveRef.current({ answers: patch, respondent: respondentPatch, lastSectionId: cur.lastSectionId, consentAt: cur.consentAt });
      if (result && typeof result.then === "function") {
        inflight.current = result
          .then(() => {
            done();
            return "saved";
          })
          .catch(() => {
            setState((s) => ({ ...s, status: "error" }));
            return "error";
          })
          .then((outcome) => {
            inflight.current = null;
            if (queued.current) {
              queued.current = false;
              if (outcome === "saved") flush(); // perubahan yang masuk selama simpan berjalan
            }
            return outcome;
          });
        return inflight.current;
      }
      done();
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
  }, [enabled, answers, respondent, consentAt, lastSectionId, debounceMs, flush]);

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
    baseline.current = { answers: { ...(next.answers || {}) }, respondent: { ...(next.respondent || {}) }, consentAt: next.consentAt ?? null, lastSectionId: next.lastSectionId ?? null };
    setState({ status: "idle", savedAt: null });
  }, []);

  // Dipanggil sebelum submit final agar tidak ada simpan draft yang menyusul
  const cancel = useCallback(() => {
    clearTimer();
    enabledRef.current = false;
  }, []);

  return { state, flush, reset, cancel };
}
