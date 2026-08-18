import React from "react";
import { addDays, format, isToday } from "date-fns";
import { CALENDAR_HOURS, timeToMin } from "@/lib/appUtils";
import { cn } from "@/lib/utils";

const CHIP_STYLES = {
  scheduled: "bg-[var(--color-primary-light)] border-[rgba(47,168,224,0.35)] text-[var(--color-primary-dark)]",
  completed: "bg-green-50 border-green-200 text-green-700",
  cancelled: "bg-red-50 border-red-200 text-red-500",
  rescheduled: "bg-amber-50 border-amber-200 text-amber-700",
  frozen: "bg-cyan-50 border-cyan-300 text-cyan-900 shadow-inner",
};

const TYPE_DOT = {
  therapy: "bg-[var(--color-primary)]",
  assessment: "bg-violet-400",
  consultation: "bg-cyan-500",
};

// Custom weekly grid: Monday-Saturday columns x hourly rows (08:00-18:00).
export const WeeklyCalendar = ({
  weekStart,
  schedules,
  getClientName,
  onSlotClick,
  onSessionClick,
  isBulkMode = false,
  selectedSessionIds = [],
  onToggleSelectSession,
  isClientCreditZero,
}) => {
  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));

  const sessionsFor = (dayStr, hour) =>
    schedules.filter(
      (s) =>
        s.date === dayStr &&
        timeToMin(s.startTime) >= timeToMin(hour) &&
        timeToMin(s.startTime) < timeToMin(hour) + 60
    );

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white overflow-hidden shadow-sm" data-testid="weekly-calendar-grid">
      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          {/* Header row */}
          <div className="grid border-b border-[var(--color-border)] bg-white" style={{ gridTemplateColumns: "64px repeat(6, 1fr)" }}>
            <div className="py-3 px-2 text-[11px] font-medium text-[var(--color-text-muted)] bg-[var(--color-surface)]" />
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  "py-2.5 px-2 text-center border-l border-[var(--color-border)]",
                  isToday(day) && "bg-[var(--color-primary-light)]"
                )}
              >
                <p className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
                  {format(day, "EEE")}
                </p>
                <p className={cn("text-sm font-semibold tabular-nums", isToday(day) && "text-[var(--color-primary-dark)]")}>
                  {format(day, "MMM d")}
                </p>
              </div>
            ))}
          </div>
          {/* Hour rows */}
          {CALENDAR_HOURS.map((hour) => (
            <div
              key={hour}
              className="grid border-b border-[var(--color-border)] last:border-b-0"
              style={{ gridTemplateColumns: "64px repeat(6, 1fr)" }}
            >
              <div className="py-2 px-2 text-[11px] text-[var(--color-text-muted)] bg-[var(--color-surface)] tabular-nums">
                {hour}
              </div>
              {days.map((day) => {
                const dayStr = format(day, "yyyy-MM-dd");
                const cellSessions = sessionsFor(dayStr, hour);
                return (
                  <div
                    key={dayStr + hour}
                    className={cn(
                      "calendar-grid-cell border-l border-[var(--color-border)] p-1 space-y-1",
                      onSlotClick && !isBulkMode && "cursor-pointer hover:bg-[rgba(47,168,224,0.05)] transition-colors duration-150"
                    )}
                    onClick={() => !isBulkMode && onSlotClick && onSlotClick(dayStr, hour)}
                    data-testid={`calendar-slot-${dayStr}-${hour.replace(":", "")}`}
                  >
                    {cellSessions.map((s) => {
                      const isSelected = selectedSessionIds.includes(s.id);
                      const isFrozen =
                        s.type === "therapy" &&
                        ["scheduled", "rescheduled"].includes(s.status) &&
                        isClientCreditZero &&
                        isClientCreditZero(s.clientId);

                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isBulkMode && onToggleSelectSession) {
                              onToggleSelectSession(s.id);
                            } else if (onSessionClick) {
                              onSessionClick(s);
                            }
                          }}
                          className={cn(
                            "w-full text-left rounded-lg border px-2 py-1 text-[11px] leading-tight shadow-sm hover:shadow transition-all duration-150 relative",
                            isFrozen ? CHIP_STYLES.frozen : CHIP_STYLES[s.status] || CHIP_STYLES.scheduled,
                            isSelected && "ring-2 ring-[var(--color-primary-dark)] shadow-md"
                          )}
                          data-testid={`calendar-session-${s.id}`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="flex items-center gap-1.5 truncate">
                              {isBulkMode && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="w-3.5 h-3.5 rounded text-[var(--color-primary)] cursor-pointer"
                                />
                              )}
                              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", TYPE_DOT[s.type] || TYPE_DOT.therapy)} />
                              <span className={cn("font-medium truncate", s.status === "cancelled" && "line-through")}>
                                {getClientName(s.clientId)}
                              </span>
                            </span>
                            {isFrozen && <span title="Frozen - Credit Depleted (0 Remaining)">❄️</span>}
                          </div>
                          <span className="block text-[10px] opacity-75 tabular-nums mt-0.5">
                            {s.startTime}–{s.endTime}
                            {isFrozen && <span className="ml-1 font-semibold text-cyan-950">(Frozen)</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const CalendarLegend = () => (
  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--color-text-muted)]">
    {[
      ["Scheduled", "bg-[var(--color-primary-light)] border-[rgba(47,168,224,0.35)]"],
      ["Completed", "bg-green-50 border-green-200"],
      ["Cancelled", "bg-red-50 border-red-200"],
      ["Rescheduled", "bg-amber-50 border-amber-200"],
      ["Frozen (0 Credit)", "bg-cyan-50 border-cyan-300"],
    ].map(([label, cls]) => (
      <span key={label} className="inline-flex items-center gap-1.5">
        <span className={cn("w-3 h-3 rounded border", cls)} />
        {label}
      </span>
    ))}
  </div>
);
