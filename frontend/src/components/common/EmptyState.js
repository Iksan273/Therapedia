import React from "react";
import { cn } from "@/lib/utils";

export const EmptyState = ({ icon: Icon, title, subtitle, action, className }) => (
  <div className={cn("flex flex-col items-center justify-center py-10 px-4 text-center", className)}>
    {Icon && <Icon className="w-9 h-9 text-[var(--color-text-muted)] opacity-50 mb-3" />}
    <p className="text-sm font-medium text-[var(--color-text)]">{title}</p>
    {subtitle && <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-xs">{subtitle}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
