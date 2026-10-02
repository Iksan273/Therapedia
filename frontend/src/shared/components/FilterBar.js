import React, { useEffect, useState } from "react";
import { ChevronDown, Filter, RotateCcw, Search, X } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";

// Kartu filter seragam: judul, tombol reset, kolom filter, dan chip filter aktif.
// chips: [{ key, label, onRemove }]
export function FilterBar({ title = "Filter", children, chips = [], onReset, resultText, gridClassName, className, plain = false }) {
  const hasActive = chips.length > 0;
  const Shell = plain ? "div" : Card;
  // Di ponsel hanya filter pertama yang tampil; sisanya dilipat agar layar tidak habis oleh filter
  const [expanded, setExpanded] = useState(false);
  const childCount = React.Children.toArray(children).length;
  return (
    <Shell className={cn(!plain && "rounded-2xl border border-slate-200/90 bg-white shadow-2xs p-4 sm:p-5", className)}>
      <div className="flex flex-col gap-3">
        <div className={cn("flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5", plain && "hidden")}>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-sky-600" />
            <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">{title}</span>
            {resultText && <span className="text-xs text-slate-500 font-medium">• {resultText}</span>}
          </div>
          {onReset && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              disabled={!hasActive}
              className="text-slate-500 hover:text-slate-800 gap-1.5 cursor-pointer"
              data-testid="filter-reset-button"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Filter
            </Button>
          )}
        </div>

        <div
          className={cn(
            "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5",
            !expanded && "max-sm:[&>*:not(:first-child)]:hidden",
            gridClassName
          )}
        >
          {children}
        </div>
        {childCount > 1 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="sm:hidden inline-flex items-center justify-center gap-1.5 h-10 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
            aria-expanded={expanded}
            data-testid="filter-toggle-more"
          >
            {expanded ? "Sembunyikan filter lain" : `Filter lainnya (${childCount - 1})`}
            <ChevronDown className={cn("w-4 h-4 transition-transform", expanded && "rotate-180")} />
          </button>
        )}

        {hasActive && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1" aria-label="Filter aktif">
            <span className="text-xs font-bold text-slate-400 mr-1">Aktif:</span>
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200 text-xs font-semibold hover:bg-sky-100 cursor-pointer"
                aria-label={`Hapus filter ${chip.label}`}
              >
                {chip.label}
                <X className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}
        {plain && onReset && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              disabled={!hasActive}
              className="text-slate-500 hover:text-slate-800 gap-1.5 cursor-pointer"
              data-testid="filter-reset-button"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Filter
            </Button>
          </div>
        )}
      </div>
    </Shell>
  );
}

export function FilterField({ label, children, className }) {
  return (
    <div className={cn("space-y-1.5 min-w-0", className)}>
      <label className="text-xs font-bold text-slate-700">{label}</label>
      {children}
    </div>
  );
}

// Input pencarian dengan debounce: mengetik terasa instan, filter dijalankan setelah jeda.
export function SearchInput({ value, onChange, placeholder, delay = 250, className, ...props }) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    if (local === value) return undefined;
    const t = setTimeout(() => onChange(local), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local, delay]);

  return (
    <div className={cn("relative flex-1 min-w-[220px]", className)}>
      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <Input
        className="pl-10 pr-9 border-slate-200 bg-slate-50 focus:bg-white text-xs"
        placeholder={placeholder}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        {...props}
      />
      {local && (
        <button
          type="button"
          onClick={() => {
            setLocal("");
            onChange("");
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          aria-label="Hapus pencarian"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
