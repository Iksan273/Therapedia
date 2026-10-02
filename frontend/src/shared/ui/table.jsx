import * as React from "react"

import { cn } from "@/shared/lib/utils"

// Mode kartu di ponsel dan tablet (<1024px; 1 kolom di ponsel, 2 kolom di tablet): thead disembunyikan, tiap baris jadi kartu, dan setiap sel diberi label
// dari atribut data-label. Sel tanpa label (kolom identitas & aksi) memakai atribut data-nolabel.
const STACK_ON_MOBILE = [
  "max-lg:block max-lg:!min-w-0",
  "max-lg:[&_thead]:hidden",
  "max-lg:[&_tbody]:grid max-lg:[&_tbody]:grid-cols-1 md:max-lg:[&_tbody]:grid-cols-2 max-lg:[&_tbody]:gap-3 max-lg:[&_tbody]:p-3",
  "max-lg:[&_tr]:block max-lg:[&_tr]:rounded-2xl max-lg:[&_tr]:border max-lg:[&_tr]:border-slate-200 max-lg:[&_tr]:bg-white max-lg:[&_tr]:p-3.5 max-lg:[&_tr]:shadow-sm",
  "max-lg:[&_td]:!block max-lg:[&_td]:!min-w-0 max-lg:[&_td]:!w-auto max-lg:[&_td]:whitespace-normal max-lg:[&_td]:!px-0 max-lg:[&_td]:!py-1.5 max-lg:[&_td]:border-0 max-lg:[&_td]:text-left",
  "max-lg:[&_td]:before:block max-lg:[&_td]:before:mb-0.5 max-lg:[&_td]:before:text-[11px] max-lg:[&_td]:before:font-bold max-lg:[&_td]:before:uppercase max-lg:[&_td]:before:tracking-wide max-lg:[&_td]:before:text-slate-400 max-lg:[&_td]:before:content-[attr(data-label)]",
  "max-lg:[&_td[data-nolabel]]:before:hidden",
  "max-lg:[&_td:first-child]:!border-b max-lg:[&_td:first-child]:border-slate-100 max-lg:[&_td:first-child]:!pb-2.5 max-lg:[&_td:first-child]:mb-1",
].join(" ");

const Table = React.forwardRef(({ className, stackOnMobile = false, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", stackOnMobile && STACK_ON_MOBILE, className)}
      {...props} />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props} />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
    {...props} />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props} />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props} />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props} />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props} />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
