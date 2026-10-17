import React from "react";
import { Save } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { cn } from "@/shared/lib/utils";

// Persetujuan data (kartu biasa di akhir form) + bar kirim sticky di bawah layar.
// HP: bar ramping (tombol Simpan ikon + Kirim); ≥sm: ringkasan + dua tombol sejajar.
export function SubmitBar({ submitting = false, consented, onConsentChange, formError, onJumpToUnanswered, requiredLeft, progress, onSaveLater }) {
  const complete = requiredLeft === 0;
  return (
    <>
      <label className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs text-xs sm:text-sm text-slate-700 leading-relaxed cursor-pointer" data-testid="assessment-consent-label">
        <Checkbox checked={consented} onCheckedChange={(v) => onConsentChange(v === true)} className="mt-0.5 w-5 h-5" data-testid="assessment-consent-checkbox" />
        <span>
          Saya menyetujui data anak saya dikumpulkan dan digunakan oleh Therapedia untuk keperluan asesmen dan layanan terapi,
          sesuai ketentuan pelindungan data pribadi. <span className="text-slate-400">(Boleh dicentang sekarang; persetujuan ikut tersimpan.)</span>
        </span>
      </label>

      <div className="sticky bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-20 bg-white rounded-2xl border border-slate-200 shadow-lg p-3 sm:p-4 space-y-2.5">
        {formError && (
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold" data-testid="assessment-form-error">
            <span>{formError}</span>
            <button type="button" onClick={onJumpToUnanswered} className="px-3 min-h-9 rounded-lg bg-rose-600 text-white text-[11px] hover:bg-rose-700 transition-colors shrink-0 cursor-pointer">
              Lihat
            </button>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <p className="hidden sm:block text-xs text-slate-600 min-w-0">
            <span className="block font-bold text-slate-800">
              {complete ? "Seluruh pertanyaan wajib telah lengkap terisi!" : `Masih ada ${requiredLeft} pertanyaan wajib yang belum diisi.`}
            </span>
            <span className="block text-[11px] text-slate-400">Isi seobjektif mungkin demi akurasi penanganan klinis.</span>
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onSaveLater}
              className="font-bold gap-1.5 border-slate-300 min-h-11 px-3 sm:px-4 cursor-pointer shrink-0"
              aria-label="Simpan dan lanjutkan nanti"
              data-testid="assessment-save-later-button"
            >
              <Save className="w-4 h-4" /> <span className="hidden sm:inline">Simpan & Lanjutkan Nanti</span>
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className={cn("font-bold min-h-11 px-4 sm:px-6 shadow-xs cursor-pointer flex-1 sm:flex-none text-white", complete ? "bg-emerald-600 hover:bg-emerald-700" : "bg-sky-600 hover:bg-sky-700")}
              data-testid="assessment-submit-button"
            >
              {submitting ? "Mengirim…" : `Kirim Jawaban Asesmen (${progress.answered}/${progress.total})`}
            </Button>
          </div>
        </div>
        <p className="sm:hidden text-[11px] text-slate-500 text-center">
          {complete ? "Semua soal wajib terisi" : `${requiredLeft} soal wajib belum diisi`} • ikon simpan untuk lanjut nanti
        </p>
      </div>
    </>
  );
}
