import React from "react";
import { STATUS_META, CONCERN_TAGS } from "@/lib/appUtils";
import { cn } from "@/lib/utils";

export const StatusBadge = ({ status, showDot = true, className, ...props }) => {
  const meta = STATUS_META[status] || { label: status || "—", cls: "bg-slate-100 text-slate-700 border border-slate-200" };
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

export const ConcernTag = ({ tag, className, ...props }) => {
  const meta = CONCERN_TAGS.find((t) => t.value === tag);
  if (!meta) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-tight whitespace-nowrap shadow-xs",
        meta.cls,
        className
      )}
      {...props}
    >
      {meta.label}
    </span>
  );
};

