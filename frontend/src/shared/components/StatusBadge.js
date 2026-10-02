import React from "react";
import { STATUS_META } from "@/domain/status";
import { useMasterData } from "@/stores/masterDataStore";
import { cn } from "@/shared/lib/utils";

export const StatusBadge = ({ status, showDot = true, className, ...props }) => {
  const masterData = useMasterData();
  const service = masterData?.getService(status);
  const base = STATUS_META[status] || { label: status || "—", cls: "bg-slate-100 text-slate-700 border border-slate-200" };
  // Label layanan mengikuti master data agar hasil edit langsung terlihat
  const meta = service ? { ...base, label: service.shortLabel || service.label } : base;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-tight whitespace-nowrap shadow-xs transition-colors",
        meta.cls,
        className
      )}
      {...props}
    >
      {showDot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0" />
      )}
      {meta.label}
    </span>
  );
};

