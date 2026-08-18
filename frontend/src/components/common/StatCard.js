import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const StatCard = ({ label, value, icon: Icon, accent = "primary", onClick, testid }) => {
  const accents = {
    primary: "bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]",
    success: "bg-green-50 text-[var(--color-success)]",
    warning: "bg-amber-50 text-[var(--color-warning)]",
    danger: "bg-red-50 text-[var(--color-danger)]",
    info: "bg-blue-50 text-[var(--color-info)]",
    neutral: "bg-[var(--color-surface)] text-[var(--color-text-muted)]",
  };
  return (
    <Card
      className={cn(
        "rounded-xl border-[var(--color-border)] shadow-sm",
        onClick && "cursor-pointer hover:shadow-md hover:-translate-y-[1px] transition-shadow duration-150"
      )}
      onClick={onClick}
      data-testid={testid}
    >
      <CardContent className="p-4 sm:p-5 flex items-center gap-4">
        {Icon && (
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", accents[accent])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-2xl font-semibold tabular-nums leading-none">{value}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1.5 truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
};
