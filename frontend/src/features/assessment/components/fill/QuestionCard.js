import React from "react";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { calcAgeDetailed } from "@/shared/lib/format";
import { todayStr } from "@/shared/lib/id";
import { cn } from "@/shared/lib/utils";
import { isAnswerFilled, isQuestionRequired } from "@/domain/assessment";

const SCALE_ITEMS = [
  { val: 5, label: "Hampir Selalu (90%+)" },
  { val: 4, label: "Sering (75%)" },
  { val: 3, label: "Kadang (50%)" },
  { val: 2, label: "Jarang (25%)" },
  { val: 1, label: "Hampir Tidak Pernah (10%)" },
  { val: 0, label: "Tidak Pernah / Tidak Berlaku" },
];

const INPUT_TYPE = { short_text: "text", number: "number", date: "date", birth_date: "date", time: "time" };

// Satu kartu pertanyaan kuesioner untuk semua 12 tipe soal. Dipisah dari halaman dan di-memo agar kuesioner
// 200+ soal tidak merender ulang semua kartu saat satu jawaban berubah. `onChange(questionId, nilai)`.
function QuestionCardBase({ q, value, onChange }) {
  const isAnswered = isAnswerFilled(value);
  const required = isQuestionRequired(q);
  const set = (v) => onChange(q.id, v);

  return (
    <div
      id={`q-card-${q.id}`}
      className={cn(
        "p-3.5 sm:p-4 rounded-xl border transition-all space-y-3",
        // Hanya soal wajib yang belum terisi diberi sorotan amber; soal opsional kosong tampil netral
        isAnswered || !required ? "bg-slate-50/40 border-slate-200" : "bg-white border-amber-200/80 shadow-2xs ring-1 ring-amber-200/40"
      )}
      data-testid={`assessment-question-${q.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <Label className="text-xs sm:text-sm font-bold text-slate-800 leading-snug flex items-start gap-2.5 flex-1 min-w-0 break-words">
          <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[11px] shrink-0 font-black mt-0.5", isAnswered ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700")}>
            {q.itemNo}
          </span>
          <span className="flex-1 min-w-0 break-words">
            {q.question}
            {required ? (
              <span className="text-rose-500 ml-0.5" aria-label="wajib diisi">*</span>
            ) : (
              <span className="ml-1.5 text-[11px] font-semibold text-slate-400" data-testid={`assessment-optional-${q.id}`}>(opsional)</span>
            )}
          </span>
        </Label>
        {q.quadrant && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0">{q.quadrant}</span>
        )}
      </div>

      {/* 1. Teks bebas / esai */}
      {(q.type === "free_text" || q.type === "text") && (
        <Textarea
          rows={3}
          className="rounded-xl border-slate-200 bg-white text-base sm:text-sm"
          value={value || ""}
          onChange={(e) => set(e.target.value)}
          placeholder="Tuliskan catatan observasi / respon anak..."
          data-testid={`assessment-answer-input-${q.id}`}
        />
      )}

      {/* 2. Ya / Tidak */}
      {q.type === "yes_no" && (
        <RadioGroup value={value || ""} onValueChange={set} className="grid grid-cols-2 sm:flex gap-2.5 pt-1">
          {["Ya", "Tidak"].map((opt) => (
            <label
              key={opt}
              className={cn(
                "flex items-center justify-center sm:justify-start gap-2 min-h-11 text-sm font-bold px-5 py-2 rounded-xl border transition-all cursor-pointer",
                value === opt ? "bg-sky-50 border-sky-300 text-sky-900 shadow-2xs ring-1 ring-sky-300" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
            >
              <RadioGroupItem value={opt} data-testid={`assessment-answer-${q.id}-${opt.toLowerCase()}`} />
              {opt}
            </label>
          ))}
        </RadioGroup>
      )}

      {/* 3. Range angka kustom (mis. 1-5, 1-10) */}
      {q.type === "range" && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
            <span>{q.scaleMin} — {q.minLabel}</span>
            <span>{q.scaleMax} — {q.maxLabel}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {Array.from({ length: q.scaleMax - q.scaleMin + 1 }, (_, i) => q.scaleMin + i).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => set(num)}
                className={cn(
                  "w-11 h-11 rounded-xl border text-sm font-black transition-all cursor-pointer",
                  String(value) === String(num) ? "bg-cyan-600 text-white border-cyan-600 shadow-sm scale-105" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                )}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Multi-centang */}
      {q.type === "checkbox_multi" && (
        <div className="space-y-2 pt-1">
          {q.options.map((opt) => {
            const currentArr = Array.isArray(value) ? value : [];
            const isChecked = currentArr.includes(opt);
            return (
              <label
                key={opt}
                className={cn(
                  "flex items-center gap-3 min-h-11 text-sm font-semibold px-4 py-2.5 rounded-xl border transition-all cursor-pointer",
                  isChecked ? "bg-indigo-50 border-indigo-300 text-indigo-950 shadow-2xs ring-1 ring-indigo-300" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                )}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => set(e.target.checked ? [...currentArr, opt] : currentArr.filter((item) => item !== opt))}
                  className="w-5 h-5 shrink-0 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                />
                <span>{opt}</span>
              </label>
            );
          })}
        </div>
      )}

      {/* 5. Skala standar Winnie Dunn 0-5 dengan tombol angka cepat */}
      {q.type === "scale_0_5" && (
        <div className="space-y-2.5 pt-1">
          <div className="flex justify-between text-[11px] text-slate-500 font-medium px-0.5">
            <span>5 = Hampir Selalu</span>
            <span>0 = Tidak Pernah / Tidak Berlaku</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
            {SCALE_ITEMS.map((item) => {
              const matchingOpt = q.options.find((opt) => opt.startsWith(String(item.val))) || `${item.val} - ${item.label}`;
              const isSelected = value !== undefined && value !== null && String(value).startsWith(String(item.val));
              return (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => set(matchingOpt)}
                  title={item.label}
                  data-testid={`assessment-scale-${q.id}-${item.val}`}
                  className={cn(
                    "h-12 rounded-xl border text-base font-black transition-all cursor-pointer flex flex-col items-center justify-center select-none",
                    isSelected ? "bg-sky-600 text-white border-sky-600 shadow-xs scale-105 ring-2 ring-sky-300" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300"
                  )}
                >
                  <span>{item.val}</span>
                </button>
              );
            })}
          </div>
          {value && (
            <div className="p-2 rounded-lg bg-sky-50/70 border border-sky-200/80 text-[11px] font-bold text-sky-900 flex items-center justify-between">
              <span>Pilihan: <strong>{value}</strong></span>
              <span className="text-[11px] text-sky-600">Terpilih ✓</span>
            </div>
          )}
        </div>
      )}

      {/* 6. Jawaban singkat / angka / tanggal / tanggal lahir / waktu */}
      {INPUT_TYPE[q.type] && (
        <div className="space-y-1.5 pt-1">
          <Input
            type={INPUT_TYPE[q.type]}
            max={q.type === "birth_date" ? todayStr() : undefined}
            inputMode={q.type === "number" ? "decimal" : undefined}
            className="rounded-xl border-slate-200 bg-white text-base sm:text-sm h-11 sm:max-w-xs"
            value={value ?? ""}
            onChange={(e) => set(e.target.value)}
            placeholder={q.type === "short_text" ? "Tulis jawaban singkat..." : q.type === "number" ? "Masukkan angka" : undefined}
            data-testid={`assessment-answer-input-${q.id}`}
          />
          {q.type === "birth_date" && value && (
            <p className="text-[11px] font-bold text-sky-800" data-testid={`assessment-age-${q.id}`}>
              Usia: {(() => {
                const age = calcAgeDetailed(value);
                return `${age.years} tahun ${age.months} bulan`;
              })()}
            </p>
          )}
        </div>
      )}

      {/* 7. Dropdown */}
      {q.type === "dropdown" && (
        <Select value={value ?? ""} onValueChange={set}>
          <SelectTrigger className="rounded-xl border-slate-200 bg-white text-base sm:text-sm h-11 sm:max-w-xs" data-testid={`assessment-answer-input-${q.id}`}>
            <SelectValue placeholder="Pilih salah satu..." />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200">
            {q.options.map((opt) => (
              <SelectItem key={opt} value={opt} className="text-sm min-h-10">{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* 8. Pilihan ganda standar (selain scale_0_5) */}
      {q.type === "multiple_choice" && (
        <RadioGroup value={value !== undefined && value !== null ? String(value) : ""} onValueChange={set} className="space-y-2 pt-1">
          {q.options.map((opt) => (
            <label
              key={opt}
              className={cn(
                "flex items-center gap-3 min-h-11 text-sm font-semibold px-4 py-2.5 rounded-xl border transition-all cursor-pointer",
                String(value) === opt ? "bg-sky-50 border-sky-300 text-sky-900 shadow-2xs ring-1 ring-sky-300" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
            >
              <RadioGroupItem value={opt} />
              <span>{opt}</span>
            </label>
          ))}
        </RadioGroup>
      )}
    </div>
  );
}

export const QuestionCard = React.memo(QuestionCardBase);
