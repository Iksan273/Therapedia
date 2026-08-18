import React from "react";
import { AlertTriangle, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

// Credit progress with threshold badges:
// remaining === 0 -> danger badge; remaining <= 2 -> warning badge.
export const CreditBar = ({ remaining, total, compact = false, className }) => {
  const pct = total > 0 ? Math.min(100, Math.round((remaining / total) * 100)) : 0;
  const isZero = remaining === 0;
  const isLow = !isZero && remaining <= 2;
  const fillColor = isZero
    ? "bg-[var(--color-danger)]"
    : isLow
      ? "bg-[var(--color-warning)]"
      : "bg-[var(--color-primary)]";

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className={cn("tabular-nums font-medium", compact ? "text-xs" : "text-sm")} data-testid="credit-remaining-value">
          {remaining} / {total} credits
        </span>
        {isZero && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-[var(--color-danger)] px-2 py-0.5 text-[11px] font-medium" data-testid="credit-zero-badge">
            <Ban className="w-3 h-3" /> Out of credit
          </span>
        )}
        {isLow && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-[var(--color-warning)] px-2 py-0.5 text-[11px] font-medium" data-testid="credit-low-badge">
            <AlertTriangle className="w-3 h-3" /> Low credit
          </span>
        )}
      </div>
      <div className={cn("w-full rounded-full bg-[var(--color-border)]", compact ? "h-1.5" : "h-2")}>
        <div
          className={cn("h-full rounded-full transition-[width] duration-300", fillColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export const LeaveInfo = ({ leaveUsed, leaveQuota, className }) => {
  const over = leaveUsed > leaveQuota;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        over ? "bg-blue-50 text-[var(--color-info)]" : "bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)]",
        className
      )}
      data-testid="leave-info-badge"
    >
      {over && <AlertTriangle className="w-3 h-3" />}
      Leave {leaveUsed} / {leaveQuota}
      {over && " (over quota)"}
    </span>
  );
};
