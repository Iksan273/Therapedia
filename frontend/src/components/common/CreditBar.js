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
    ? "bg-rose-500"
    : isLow
      ? "bg-amber-500"
      : "bg-gradient-to-r from-sky-500 to-blue-600";

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className={cn("tabular-nums font-semibold text-slate-800", compact ? "text-xs" : "text-sm")} data-testid="credit-remaining-value">
          {remaining} <span className="font-normal text-slate-500">/ {total} credits</span>
        </span>
        {isZero && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 text-[11px] font-semibold tracking-tight" data-testid="credit-zero-badge">
            <Ban className="w-3 h-3 text-rose-600" /> Out of credit
          </span>
        )}
        {isLow && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold tracking-tight" data-testid="credit-low-badge">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> Low credit
          </span>
        )}
      </div>
      <div className={cn("w-full rounded-full bg-slate-100 border border-slate-200/60 overflow-hidden", compact ? "h-2" : "h-2.5")}>
        <div
          className={cn("h-full rounded-full transition-all duration-500 shadow-xs", fillColor)}
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
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-tight shadow-xs transition-colors",
        over
          ? "bg-rose-50 text-rose-700 border border-rose-200"
          : "bg-slate-50 text-slate-600 border border-slate-200/80",
        className
      )}
      data-testid="leave-info-badge"
    >
      {over && <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />}
      <span className="tabular-nums">Leave {leaveUsed} / {leaveQuota}</span>
      {over && <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wide">(over quota)</span>}
    </span>
  );
};

