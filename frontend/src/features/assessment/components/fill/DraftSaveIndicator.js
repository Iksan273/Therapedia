import React from "react";
import { CheckCircle2, CloudOff, Loader2, Save } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const fmtTime = (d) => (d ? `${String(d.getHours()).padStart(2, "0")}.${String(d.getMinutes()).padStart(2, "0")}` : "");

// Indikator simpan otomatis kuesioner: idle | saving | saved | error.
export function DraftSaveIndicator({ state }) {
  const { status, savedAt } = state;
  const view = {
    idle: { icon: Save, text: "Jawaban tersimpan otomatis", cls: "text-slate-500" },
    saving: { icon: Loader2, text: "Menyimpan…", cls: "text-sky-700", spin: true },
    saved: { icon: CheckCircle2, text: `Tersimpan pukul ${fmtTime(savedAt)}`, cls: "text-emerald-700" },
    error: { icon: CloudOff, text: "Gagal menyimpan. Jawaban masih ada di layar, coba lagi.", cls: "text-rose-700" },
  }[status] || { icon: Save, text: "", cls: "text-slate-500" };
  const Icon = view.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-bold", view.cls)} data-testid="assessment-save-status" data-status={status} role="status" aria-live="polite">
      <Icon className={cn("w-3.5 h-3.5 shrink-0", view.spin && "animate-spin")} />
      {view.text}
    </span>
  );
}
