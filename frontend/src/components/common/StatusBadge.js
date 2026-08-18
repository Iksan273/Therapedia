import React from "react";
import { STATUS_META, CONCERN_TAGS } from "@/lib/appUtils";
import { cn } from "@/lib/utils";

export const StatusBadge = ({ status, className, ...props }) => {
  const meta = STATUS_META[status] || { label: status || "—", cls: "bg-gray-100 text-gray-600" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        meta.cls,
        className
      )}
      {...props}
    >
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
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap",
        meta.cls,
        className
      )}
      {...props}
    >
      {meta.label}
    </span>
  );
};
