import React, { useState, useEffect, useRef } from "react";
import { format, isValid } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Calendar } from "@/shared/ui/calendar";
import { cn } from "@/shared/lib/utils";
import { parseDdMmYyyy } from "@/shared/lib/format";

/**
 * Standard Global DD/MM/YYYY Date Filter & Input Component
 * - Displays in global format: DD/MM/YYYY
 * - Placeholder: DD/MM/YYYY
 * - Supports direct text typing (DD/MM/YYYY or DD-MM-YYYY)
 * - Interactive calendar popover picker: terbuka saat KOLOM diklik (tidak harus mengeklik ikon). Fokus tetap di kolom sehingga bisa
 *   langsung mengetik; ikon kalender, panah bawah, dan Esc tetap bekerja (aksesibilitas papan ketik).
 * - Quick clear (✕) button
 * - Compatible with both onChange(isoString) and onChange({ target: { value: isoString } })
 *
 * Opsi tampilan (default tidak berubah, jadi pemakai lama tetap sama):
 * - `iconPosition="left"`: ikon kalender di kiri (sejajar ikon pada input lain, mis. ikon kunci di form login), tombol hapus di kanan.
 * - `displayFormat="spaced"`: "DD / MM / YYYY" dengan pemisah otomatis saat mengetik angka (keypad numerik di ponsel).
 * - `size="lg"`: tinggi 44px, ramah jempol.
 * - `clearOnInvalid`: ketikan yang belum lengkap / tidak valid mengosongkan nilai induk, supaya form tidak mengirim tanggal lama
 *   yang sudah tidak tampil di kolom.
 */
const DISPLAY_FORMATS = { slash: "dd/MM/yyyy", spaced: "dd / MM / yyyy" };

// "05032018" -> "05 / 03 / 2018" (pemisah baru muncul saat angka berikutnya diketik, jadi hapus mundur tetap wajar)
const maskSpaced = (raw) => {
  const digits = String(raw).replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
  return `${digits.slice(0, 2)} / ${digits.slice(2, 4)} / ${digits.slice(4)}`;
};

export default function DateFilterPicker({
  value = "",
  onChange,
  placeholder = "DD/MM/YYYY",
  className = "",
  disabled = false,
  allowClear = true,
  name,
  id,
  minDate,
  maxDate,
  isDateDisabled, // (yyyy-MM-dd) => boolean; mis. hari libur. Nonaktif di kalender dan diabaikan bila diketik
  iconPosition = "right",
  displayFormat = "slash",
  size = "md",
  clearOnInvalid = false,
  openOnInputClick = true,
  "data-testid": testId,
}) {
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const rootRef = useRef(null);
  const [fromInput, setFromInput] = useState(false); // kalender dibuka dari kolom: fokus tetap di kolom agar tetap bisa mengetik
  const spaced = displayFormat === "spaced";
  const dateFormat = DISPLAY_FORMATS[displayFormat] || DISPLAY_FORMATS.slash;
  const iconLeft = iconPosition === "left";
  const large = size === "lg";

  // Sync displayed text when external value changes
  useEffect(() => {
    if (!value) {
      setInputText("");
      return;
    }
    const clean = typeof value === "string" ? value.slice(0, 10) : "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      try {
        const [y, m, d] = clean.split("-").map(Number);
        const dateObj = new Date(y, m - 1, d);
        if (isValid(dateObj)) {
          setInputText(format(dateObj, dateFormat));
          return;
        }
      } catch (e) {
        // fallback
      }
    }
    setInputText(value);
  }, [value, dateFormat]);

  const emitChange = (isoString) => {
    if (!onChange) return;
    const finalVal = isoString || "";
    const eventLike = {
      target: { value: finalVal, name },
      currentTarget: { value: finalVal, name },
      toString: () => finalVal,
      valueOf: () => finalVal,
    };
    onChange(eventLike);
  };

  // Batas tanggal (yyyy-MM-dd): hari di luar rentang nonaktif di kalender dan input ketikan di luar rentang diabaikan
  const toDate = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(iso || "") ? new Date(`${iso}T00:00:00`) : null);
  const minD = toDate(minDate);
  const maxD = toDate(maxDate);
  const outOfRange = (iso) => Boolean((minDate && iso < minDate) || (maxDate && iso > maxDate) || (isDateDisabled && isDateDisabled(iso)));
  const disabledDays = [minD && { before: minD }, maxD && { after: maxD }, isDateDisabled && ((d) => isDateDisabled(format(d, "yyyy-MM-dd")))].filter(Boolean);

  // Handle direct text input
  const handleTextChange = (e) => {
    const raw = spaced ? maskSpaced(e.target.value) : e.target.value;
    setInputText(raw);

    if (!raw.trim()) {
      emitChange("");
      return;
    }

    const iso = parseDdMmYyyy(raw);
    if (iso && !outOfRange(iso)) {
      emitChange(iso);
      setOpen(false); // tanggal lengkap sudah valid: kalender tidak perlu terbuka lagi
    } else if (clearOnInvalid) {
      emitChange(""); // belum lengkap / tidak valid: jangan biarkan tanggal lama tetap terkirim
    }
  };

  // Handle selection from calendar
  const handleCalendarSelect = (selectedDate) => {
    if (!selectedDate) {
      setInputText("");
      emitChange("");
      setOpen(false);
      return;
    }
    const iso = format(selectedDate, "yyyy-MM-dd");
    setInputText(format(selectedDate, dateFormat));
    emitChange(iso);
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setInputText("");
    emitChange("");
  };

  // Convert current value to Date for calendar highlight
  const selectedDateObj = (() => {
    if (!value || typeof value !== "string") return undefined;
    const clean = value.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return undefined;
    const [y, m, d] = clean.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return isValid(dateObj) ? dateObj : undefined;
  })();

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setFromInput(false);
      }}
    >
    <PopoverAnchor asChild>
    <div
      ref={rootRef}
      className={cn(
        "relative inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 hover:border-slate-300 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:bg-white transition-all text-xs",
        large && "min-h-11",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      <input
        type="text"
        id={id}
        name={name}
        disabled={disabled}
        placeholder={placeholder}
        value={inputText}
        onChange={handleTextChange}
        onClick={() => {
          if (!openOnInputClick || disabled) return;
          setFromInput(true);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setFromInput(true);
            setOpen(true);
          } else if (e.key === "Escape" && open) {
            e.stopPropagation(); // Esc menutup kalender saja, tidak menutup dialog di belakangnya
            setOpen(false);
          }
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid={testId}
        inputMode={spaced ? "numeric" : undefined}
        autoComplete={spaced ? "bday" : undefined}
        className={cn(
          "w-full text-xs font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal bg-transparent border-none outline-none focus:ring-0",
          large ? "h-11" : "h-9",
          iconLeft ? "pl-12 pr-11" : "pl-3 pr-14"
        )}
      />

      <div className={cn("absolute flex items-center gap-0.5", iconLeft ? "left-1" : "right-1.5")}>
        {allowClear && inputText && !disabled && !iconLeft && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Hapus Tanggal"
            data-testid={testId ? `${testId}-clear` : undefined}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "text-slate-500 hover:text-sky-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer",
              iconLeft ? "min-h-10 min-w-10 flex items-center justify-center text-slate-400" : "p-1.5"
            )}
            aria-label="Pilih tanggal dari kalender"
            title="Pilih Tanggal (DD/MM/YYYY)"
            data-testid={testId ? `${testId}-picker-btn` : undefined}
          >
            <CalendarIcon className={iconLeft ? "w-4 h-4" : "w-3.5 h-3.5"} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 bg-white border border-slate-200 shadow-xl rounded-2xl z-50"
          align="start"
          sideOffset={6}
          onOpenAutoFocus={(e) => fromInput && e.preventDefault()} // dibuka dari kolom: fokus tetap di kolom
          onInteractOutside={(e) => rootRef.current?.contains(e.target) && e.preventDefault()} // klik di kolom sendiri tidak menutup
        >
          <div className="p-3 pb-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Pilih Tanggal ({spaced ? "DD / MM / YYYY" : "DD/MM/YYYY"})
            </span>
            {inputText && (
              <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
                {inputText}
              </span>
            )}
          </div>
          <Calendar
            mode="single"
            selected={selectedDateObj}
            onSelect={handleCalendarSelect}
            disabled={disabledDays.length ? disabledDays : undefined}
            initialFocus={!fromInput}
            className="p-3"
          />
          <div className="p-2 border-t border-slate-100 flex items-center justify-between bg-slate-50/60 rounded-b-2xl">
            <button
              type="button"
              onClick={() => handleCalendarSelect(new Date())}
              className="text-[11px] font-bold text-sky-600 hover:text-sky-800 hover:underline px-2 py-1 cursor-pointer"
            >
              Hari Ini
            </button>
            {allowClear && (
              <button
                type="button"
                onClick={() => handleCalendarSelect(null)}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline px-2 py-1 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          </PopoverContent>
      </div>

      {iconLeft && allowClear && inputText && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-1 min-h-10 min-w-10 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer"
          title="Hapus Tanggal"
          aria-label="Hapus tanggal"
          data-testid={testId ? `${testId}-clear` : undefined}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
    </PopoverAnchor>
    </Popover>
  );
}
