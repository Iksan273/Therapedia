import React from "react";
import { cn } from "@/lib/utils";

export const EmptyState = ({ icon: Icon, title, subtitle, action, className }) => (
  <div className={cn("flex flex-col items-center justify-center py-12 px-6 text-center", className)}>
    {Icon && (
      <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 mb-3.5 shadow-xs">
        <Icon className="w-6 h-6 stroke-[1.75]" />
      </div>
    )}
    <p className="text-base font-semibold text-slate-800">{title}</p>
    {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm leading-relaxed">{subtitle}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

