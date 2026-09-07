import React, { useState, useEffect, useRef } from "react";
import { format, parseISO, isValid } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { parseDdMmYyyy } from "@/lib/appUtils";

/**
 * Standard Global DD/MM/YYYY Date Filter & Input Component
 * - Displays in global format: DD/MM/YYYY
 * - Placeholder: DD/MM/YYYY
 * - Supports direct text typing (DD/MM/YYYY or DD-MM-YYYY)
 * - Interactive calendar popover picker
 * - Quick clear (✕) button
 * - Compatible with both onChange(isoString) and onChange({ target: { value: isoString } })
 */
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
  "data-testid": testId,
}) {
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState("");

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
          setInputText(format(dateObj, "dd/MM/yyyy"));
          return;
        }
      } catch (e) {
        // fallback
      }
    }
    setInputText(value);
  }, [value]);

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

  // Handle direct text input
  const handleTextChange = (e) => {
    const raw = e.target.value;
    setInputText(raw);

    if (!raw.trim()) {
      emitChange("");
      return;
    }

    const iso = parseDdMmYyyy(raw);
    if (iso) {
      emitChange(iso);
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
    setInputText(format(selectedDate, "dd/MM/yyyy"));
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
    <div
      className={cn(
        "relative inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 hover:border-slate-300 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:bg-white transition-all text-xs",
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
        data-testid={testId}
        className="w-full h-9 pl-3 pr-14 text-xs font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal bg-transparent border-none outline-none focus:ring-0"
      />

      <div className="absolute right-1.5 flex items-center gap-0.5">
        {allowClear && inputText && !disabled && (
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

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className="p-1.5 text-slate-500 hover:text-sky-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Pilih Tanggal (DD/MM/YYYY)"
              data-testid={testId ? `${testId}-picker-btn` : undefined}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0 bg-white border border-slate-200 shadow-xl rounded-2xl z-50"
            align="start"
            sideOffset={6}
          >
            <div className="p-3 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Pilih Tanggal (DD/MM/YYYY)
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
              initialFocus
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
        </Popover>
      </div>
    </div>
  );
}
