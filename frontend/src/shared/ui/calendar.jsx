import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/shared/lib/utils"
import { buttonVariants } from "@/shared/ui/button"

// Rentang tahun dropdown: pindah tahun langsung (tanpa klik panah bulan berkali-kali), mis. tanggal lahir anak.
const YEAR_RANGE_BEFORE = 25;
const YEAR_RANGE_AFTER = 10;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "dropdown-buttons",
  fromYear,
  toYear,
  ...props
}) {
  const thisYear = new Date().getFullYear();
  const dropdown = captionLayout !== "buttons";
  const selectedYear = props.selected instanceof Date ? props.selected.getFullYear() : thisYear; // tahun terpilih selalu ada di dropdown
  fromYear = fromYear ?? Math.min(thisYear, selectedYear) - YEAR_RANGE_BEFORE;
  toYear = toYear ?? Math.max(thisYear, selectedYear) + YEAR_RANGE_AFTER;
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      captionLayout={captionLayout}
      fromYear={dropdown ? fromYear : undefined}
      toYear={dropdown ? toYear : undefined}
      defaultMonth={props.defaultMonth ?? props.selected ?? undefined}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        // Mode dropdown: [‹] [Bulan ▾] [Tahun ▾] [›] satu baris. Panah (di dalam `nav` yang dibuat `contents`) diurutkan ke kiri/kanan
        // lewat `order`, jadi tidak lagi menumpuk di atas pill bulan/tahun. Mode tombol saja: label di tengah, panah di tepi.
        caption: dropdown ? "flex items-center justify-between gap-1 pt-1" : "flex justify-center pt-1 relative items-center",
        // Mode dropdown: <select> asli dibuat transparan di atas label berbentuk pill (klik = buka daftar bulan/tahun bawaan browser)
        caption_label: dropdown
          ? "flex items-center gap-1 h-8 rounded-lg border border-slate-200 bg-white px-2 text-[13px] font-semibold text-slate-800 pointer-events-none whitespace-nowrap"
          : "text-sm font-medium",
        caption_dropdowns: "flex items-center justify-center gap-1 flex-1 min-w-0",
        dropdown: "absolute inset-0 z-10 w-full h-full opacity-0 cursor-pointer text-sm",
        dropdown_month: "relative inline-flex items-center rounded-lg focus-within:ring-2 focus-within:ring-sky-500/30 hover:[&>div]:bg-slate-50",
        dropdown_year: "relative inline-flex items-center rounded-lg focus-within:ring-2 focus-within:ring-sky-500/30 hover:[&>div]:bg-slate-50",
        dropdown_icon: "h-3.5 w-3.5 shrink-0 text-slate-400",
        vhidden: "sr-only",
        nav: dropdown ? "contents" : "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 shrink-0 bg-transparent p-0 opacity-70 hover:opacity-100"
        ),
        nav_button_previous: dropdown ? "order-first" : "absolute left-1",
        nav_button_next: dropdown ? "order-last" : "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "[&:has([aria-selected])]:rounded-md"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_start: "day-range-start",
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("h-4 w-4", className)} {...props} />
        ),
      }}
      {...props} />
  );
}
Calendar.displayName = "Calendar"

export { Calendar }
