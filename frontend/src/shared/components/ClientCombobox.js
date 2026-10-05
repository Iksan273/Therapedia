import React, { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/shared/ui/command";
import { cn } from "@/shared/lib/utils";

// Pemilih client dengan pencarian (nama anak, nama ortu, atau kode client). Dipakai seragam di semua modul.
// `allOption` = { value, label } untuk opsi "semua" (mis. "Semua client"); `renderMeta(c)` mengganti teks kanan per baris.
export function ClientCombobox({
  clients,
  value,
  onChange,
  placeholder = "Cari anak, ortu, atau kode client...",
  allOption = null,
  renderMeta,
  className,
  testId = "client-combobox",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const selected = clients.find((c) => c.id === value);
  const isAll = Boolean(allOption) && value === allOption.value;
  const triggerLabel = selected
    ? `${selected.clientName}${selected.parentName ? ` (${selected.parentName})` : ""}`
    : isAll
    ? allOption.label
    : placeholder;
  const pick = (id) => {
    onChange(id);
    setOpen(false);
  };
  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      {/* modal: popover punya area scroll sendiri; tanpa ini wheel/touch scroll diblokir oleh Dialog induk */}
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-semibold border-slate-200 bg-slate-50 focus:bg-white min-h-10", !selected && !isAll && "text-slate-500", className)}
          data-testid={testId}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[min(300px,calc(100vw-2rem))] p-0 rounded-2xl border-slate-200 shadow-xl overflow-hidden"
        align="start"
        collisionPadding={16}
      >
        <Command>
          <CommandInput placeholder="Cari nama anak, ortu, atau kode client..." data-testid={`${testId}-search`} />
          <CommandList
            className="max-h-[min(320px,calc(var(--radix-popover-content-available-height)-3.5rem))] overflow-y-auto overscroll-contain"
            data-testid={`${testId}-list`}
          >
            <CommandEmpty className="p-3 text-xs text-slate-500 text-center">Client tidak ditemukan.</CommandEmpty>
            <CommandGroup className="p-1.5">
              {allOption && (
                <CommandItem
                  value={`${allOption.label} semua`}
                  onSelect={() => pick(allOption.value)}
                  className="cursor-pointer py-2 px-3 rounded-lg"
                  data-testid={`${testId}-option-all`}
                >
                  <Check className={cn("mr-2 w-4 h-4 text-sky-600", isAll ? "opacity-100" : "opacity-0")} />
                  <span className="font-bold text-xs text-slate-900">{allOption.label}</span>
                </CommandItem>
              )}
              {clients.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.clientName} ${c.parentName || ""} ${c.clientCode}`}
                  onSelect={() => pick(c.id)}
                  className="cursor-pointer py-2 px-3 rounded-lg"
                  data-testid={`${testId}-option-${c.id}`}
                >
                  <Check className={cn("mr-2 w-4 h-4 text-sky-600", value === c.id ? "opacity-100" : "opacity-0")} />
                  <span className="font-bold text-xs text-slate-900 truncate min-w-0">{c.clientName}</span>
                  <span className="ml-auto pl-2 text-[11px] text-slate-400 font-normal truncate max-w-[45%]">
                    {renderMeta ? renderMeta(c) : <>{c.parentName} • <span className="font-mono">{c.clientCode}</span></>}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
