import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { AlignLeft, CalendarDays, CheckCircle2, CheckSquare, ClipboardList, Plus, Sliders, Trash2 } from "lucide-react";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { QUESTION_TYPES, isOptionBasedType } from "@/features/assessment/components/masterData/assessmentConfig";
import { Textarea } from "@/shared/ui/textarea";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";

// Radix Select tidak menerima value kosong, jadi "tanpa kuadran" memakai sentinel ini
const NO_QUADRANT = "none";

const INPUT_TYPE_HINTS = {
  short_text: { title: "Jawaban Singkat", desc: "Responden mengisi satu baris teks singkat." },
  number: { title: "Angka", desc: "Responden hanya dapat mengisi angka." },
  date: { title: "Tanggal", desc: "Responden memilih tanggal dari kalender." },
  birth_date: { title: "Tanggal Lahir", desc: "Responden memilih tanggal lahir (tidak boleh di masa depan). Usia ditampilkan otomatis di bawah isian." },
  time: { title: "Waktu", desc: "Responden memilih jam (format HH:mm)." },
};

export function QuestionDialog({ addOptionToDialog, applyOptionPreset, qDialog, quadrants, removeOptionFromDialog, saveQuestion, setQDialog, updateOptionText }) {
  return (
    <Dialog open={qDialog.open} onOpenChange={(open) => setQDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-7 border-slate-200 shadow-xl">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-600" />
              {qDialog.editingId ? "Edit Butir Pertanyaan Klinis" : "Tambah Butir Pertanyaan Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Konfigurasikan tipe respons (skala baku Winnie Dunn, range kustom, pilihan ganda, multi-centang, dropdown, jawaban singkat, esai, angka, tanggal, tanggal lahir, waktu), kuadran sensori (opsional), serta opsi jawaban.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* ROW 1: TIPE SOAL & KUADRAN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Tipe Input Jawaban</Label>
                <Select
                  value={qDialog.type}
                  onValueChange={(val) => setQDialog((prev) => ({ ...prev, type: val }))}
                >
                  <SelectTrigger className="border-slate-200 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    {QUESTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-xs font-medium">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Kuadran Sensorik <span className="font-medium text-slate-400">(opsional)</span></Label>
                <Select
                  value={qDialog.quadrant || NO_QUADRANT}
                  onValueChange={(val) => setQDialog((prev) => ({ ...prev, quadrant: val === NO_QUADRANT ? "" : val }))}
                >
                  <SelectTrigger className="border-slate-200 text-xs font-semibold" data-testid="question-quadrant">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value={NO_QUADRANT} className="text-xs font-bold">
                      Tanpa kuadran
                    </SelectItem>
                    {quadrants.map((q) => (
                      <SelectItem key={q.code} value={q.code} className="text-xs font-bold">
                        {q.code} - {q.fullName || q.title}
                        {q.description ? ` (${q.description.split("(")[0].trim()})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ROW 2: TEKS PERNYATAAN */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Teks Pernyataan / Indikator Klinis</Label>
              <Textarea
                placeholder="misal: Menutup telinga untuk melindunginya dari suara-suara bising atau respon berlebih..."
                value={qDialog.text}
                onChange={(e) => setQDialog((prev) => ({ ...prev, text: e.target.value }))}
                className="rounded-xl border-slate-200 text-xs min-h-[90px] leading-relaxed font-medium"
              />
            </div>

            {/* TIPE 1: SKALA 0-5 STANDAR WINNIE DUNN */}
            {qDialog.type === "scale_0_5" && (
              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Format Skala Baku Skor 0–5 (Standar Winnie Dunn Sensory Profile)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-emerald-900 font-medium">
                  <div className="p-2 rounded-xl bg-white border border-emerald-200"><strong>5:</strong> Hampir Selalu (90%+)</div>
                  <div className="p-2 rounded-xl bg-white border border-emerald-200"><strong>4:</strong> Sering (75%)</div>
                  <div className="p-2 rounded-xl bg-white border border-emerald-200"><strong>3:</strong> Kadang (50%)</div>
                  <div className="p-2 rounded-xl bg-white border border-emerald-200"><strong>2:</strong> Jarang (25%)</div>
                  <div className="p-2 rounded-xl bg-white border border-emerald-200"><strong>1:</strong> Hampir Tdk Pernah (10%)</div>
                  <div className="p-2 rounded-xl bg-white border border-emerald-200"><strong>0:</strong> Tidak Berlaku</div>
                </div>
              </div>
            )}

            {/* TIPE 2: RANGE ANGKA KUSTOM */}
            {qDialog.type === "range" && (
              <div className="p-4 rounded-2xl border border-cyan-200 bg-cyan-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-950 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-cyan-600" />
                    Konfigurasi Rentang Skala (Range Angka)
                  </span>
                  <span className="text-[11px] text-cyan-800 font-medium">Contoh: 1 s/d 5 atau 1 s/d 10</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Nilai Minimum (Min)</Label>
                    <Input
                      type="number"
                      value={qDialog.scaleMin}
                      onChange={(e) => setQDialog((prev) => ({ ...prev, scaleMin: e.target.value }))}
                      className="border-slate-200 bg-white text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Nilai Maksimum (Max)</Label>
                    <Input
                      type="number"
                      value={qDialog.scaleMax}
                      onChange={(e) => setQDialog((prev) => ({ ...prev, scaleMax: e.target.value }))}
                      className="border-slate-200 bg-white text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Label Ujung Kiri (Nilai Min)</Label>
                    <Input
                      placeholder="misal: Sangat Rendah"
                      value={qDialog.minLabel}
                      onChange={(e) => setQDialog((prev) => ({ ...prev, minLabel: e.target.value }))}
                      className="border-slate-200 bg-white text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Label Ujung Kanan (Nilai Max)</Label>
                    <Input
                      placeholder="misal: Sangat Tinggi"
                      value={qDialog.maxLabel}
                      onChange={(e) => setQDialog((prev) => ({ ...prev, maxLabel: e.target.value }))}
                      className="border-slate-200 bg-white text-xs font-medium"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TIPE 3: PILIHAN GANDA ATAU MULTI-CENTANG */}
            {isOptionBasedType(qDialog.type) && (
              <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-950">
                    Daftar Pilihan Opsi ({qDialog.options.length} Opsi):
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="px-2.5 text-[11px] font-bold border-purple-200 text-purple-800 hover:bg-purple-100 cursor-pointer"
                      onClick={() => applyOptionPreset("independence")}
                    >
                      Preset Mandiri
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="px-2.5 text-[11px] font-bold border-purple-200 text-purple-800 hover:bg-purple-100 cursor-pointer"
                      onClick={() => applyOptionPreset("frequency")}
                    >
                      Preset Frekuensi
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Tuliskan teks opsi jawaban baru..."
                    value={qDialog.newOptionInput}
                    onChange={(e) => setQDialog((prev) => ({ ...prev, newOptionInput: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addOptionToDialog();
                      }
                    }}
                    className="border-slate-200 bg-white text-xs flex-1 font-medium"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="px-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer"
                    onClick={addOptionToDialog}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Tambah
                  </Button>
                </div>

                {qDialog.options.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2 text-center">
                    Belum ada opsi jawaban. Silakan ketik di atas atau pilih tombol preset.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {qDialog.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className="p-2 px-3 rounded-xl border border-purple-200/80 bg-white flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="font-black text-purple-900 w-5 shrink-0 text-center">
                          {oIdx + 1}.
                        </span>
                        <Input
                          value={opt}
                          onChange={(e) => updateOptionText(oIdx, e.target.value)}
                          className="h-8 text-xs border-0 focus-visible:ring-1 focus-visible:ring-purple-400 px-1 font-medium text-slate-800"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-slate-400 hover:text-rose-600 shrink-0 cursor-pointer"
                          onClick={() => removeOptionFromDialog(oIdx)}
                          aria-label="Hapus opsi jawaban"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TIPE 4: TEKS BEBAS */}
            {qDialog.type === "free_text" && (
              <div className="p-4 rounded-2xl border border-sky-200 bg-sky-50/60 text-xs text-sky-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlignLeft className="w-4 h-4 text-sky-600" /> Format Esai / Teks Bebas
                </p>
                <p className="text-[11px] text-sky-700 leading-relaxed font-medium">
                  Responden akan diberikan kotak teks (textarea) terbuka untuk menuliskan uraian deskriptif atau catatan observasi kualitatif.
                </p>
              </div>
            )}

            {/* TIPE: JAWABAN SINGKAT / ANGKA / TANGGAL / TANGGAL LAHIR / WAKTU */}
            {INPUT_TYPE_HINTS[qDialog.type] && (
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-800 space-y-1" data-testid="question-type-hint">
                <p className="font-bold flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-slate-600" /> Format {INPUT_TYPE_HINTS[qDialog.type].title}
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">{INPUT_TYPE_HINTS[qDialog.type].desc}</p>
              </div>
            )}

            {/* TIPE 5: YA / TIDAK */}
            {qDialog.type === "yes_no" && (
              <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/60 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-amber-600" /> Format Pilihan Biner (Ya / Tidak)
                </p>
                <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                  Responden akan memilih salah satu tombol: <strong>Ya</strong> atau <strong>Tidak</strong>.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              className="font-bold"
              onClick={() => setQDialog((prev) => ({ ...prev, open: false }))}
            >
              Batal
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-xs cursor-pointer"
              onClick={saveQuestion}
            >
              <CheckCircle2 className="w-4 h-4" /> Simpan Pertanyaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
