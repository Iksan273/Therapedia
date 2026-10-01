import React from "react";
import { Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DateFilterPicker from "@/components/common/DateFilterPicker";
import { FilterField } from "@/components/common/FilterBar";
import { PERIOD_OPTIONS } from "@/lib/periods";

// Filter periode seragam untuk dipasang di dalam <FilterBar>. Saat "custom" dipilih,
// dua kolom tanggal ikut tampil di grid yang sama (tanpa baris baru yang menggeser layout).
//   onChange(patch) menerima { preset?, start?, end? }
export function PeriodFilter({ preset, start, end, onChange, allowed, label = "Rentang Waktu", testidPrefix = "period" }) {
  const options = allowed ? PERIOD_OPTIONS.filter((o) => allowed.includes(o.value)) : PERIOD_OPTIONS;
  return (
    <>
      <FilterField label={label}>
        <Select value={preset} onValueChange={(v) => onChange({ preset: v, start: "", end: "" })}>
          <SelectTrigger className="border-slate-200 bg-slate-50" aria-label={label}>
            <Calendar className="w-3.5 h-3.5 text-sky-600 shrink-0 mr-1.5" />
            <SelectValue placeholder="Pilih Periode" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200">
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      {preset === "custom" && (
        <>
          <FilterField label="Dari Tanggal">
            <DateFilterPicker
              placeholder="DD/MM/YYYY"
              className="w-full bg-slate-50"
              value={start}
              onChange={(e) => onChange({ start: e?.target?.value ?? e })}
              data-testid={`${testidPrefix}-filter-start`}
            />
          </FilterField>
          <FilterField label="Sampai Tanggal">
            <DateFilterPicker
              placeholder="DD/MM/YYYY"
              className="w-full bg-slate-50"
              value={end}
              onChange={(e) => onChange({ end: e?.target?.value ?? e })}
              data-testid={`${testidPrefix}-filter-end`}
            />
          </FilterField>
        </>
      )}
    </>
  );
}
