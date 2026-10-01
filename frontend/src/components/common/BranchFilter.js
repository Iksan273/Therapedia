import React from "react";
import { Building2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BRANCHES, branchName } from "@/lib/appUtils";
import { cn } from "@/lib/utils";

// Filter cabang seragam. Non-master hanya melihat cabangnya sendiri (teks statis).
export function BranchFilter({ value, onChange, isMaster, className }) {
  if (!isMaster) {
    return (
      <div
        className={cn(
          "h-10 flex items-center gap-2 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800",
          className
        )}
      >
        <Building2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
        {value === "all" ? "Semua Cabang" : branchName(value)}
      </div>
    );
  }
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn("text-xs border-slate-200 bg-slate-50 font-semibold", className)}
        aria-label="Filter cabang"
      >
        <Building2 className="w-3.5 h-3.5 text-sky-600 shrink-0 mr-1.5" />
        <SelectValue placeholder="Semua Cabang" />
      </SelectTrigger>
      <SelectContent className="rounded-xl border-slate-200">
        <SelectItem value="all">Semua Cabang</SelectItem>
        {BRANCHES.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
