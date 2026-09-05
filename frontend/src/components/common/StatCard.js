import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const StatCard = ({ label, value, icon: Icon, accent = "primary", onClick, testid, trend }) => {
  const accents = {
    primary: "bg-sky-50 text-sky-700 ring-1 ring-sky-200/80",
    success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80",
    warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/80",
    danger: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/80",
    info: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200/80",
    neutral: "bg-slate-50 text-slate-600 ring-1 ring-slate-200/80",
  };

  return (
    <Card
      className={cn(
        "clinical-card rounded-2xl border border-slate-200/80 transition-all duration-200",
        onClick
          ? "cursor-pointer clinical-card-hover active:scale-[0.99]"
          : "hover:border-slate-300 shadow-2xs"
      )}
      onClick={onClick}
      data-testid={testid}
    >
      <CardContent className="p-5 sm:p-6 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-500 tracking-wider uppercase truncate">{label}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums leading-none">
              {value}
            </p>
            {trend && (
              <span className="text-xs font-semibold text-slate-500">{trend}</span>
            )}
          </div>
        </div>
        {Icon && (
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs", accents[accent])}>
            <Icon className="w-5 h-5 stroke-[2.2]" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

