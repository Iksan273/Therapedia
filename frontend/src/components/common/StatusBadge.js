import React from "react";
import { STATUS_META } from "@/lib/appUtils";
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
