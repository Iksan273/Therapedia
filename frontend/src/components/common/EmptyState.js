import React from "react";
import { cn } from "@/lib/utils";

export const EmptyState = ({ icon: Icon, title, subtitle, action, className }) => (
  <div className={cn("flex flex-col items-center justify-center py-16 px-6 text-center", className)}>
    {Icon && (
      <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-sky-100/90 flex items-center justify-center text-sky-600 mb-4 shadow-2xs">
        <Icon className="w-7 h-7 stroke-[1.75]" />
      </div>
    )}
    <p className="text-base sm:text-lg font-bold text-slate-900">{title}</p>
    {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md leading-relaxed">{subtitle}</p>}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

