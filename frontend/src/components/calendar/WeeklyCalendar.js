import React from "react";
import { addDays, format, isToday } from "date-fns";
import { CALENDAR_HOURS, timeToMin } from "@/lib/appUtils";
import { cn } from "@/lib/utils";

const CHIP_STYLES = {
  scheduled: "bg-sky-50 border-sky-200/90 text-sky-900 hover:border-sky-300",
  completed: "bg-emerald-50 border-emerald-200/90 text-emerald-900 hover:border-emerald-300",
  cancelled: "bg-rose-50 border-rose-200/90 text-rose-600 hover:border-rose-300",
  rescheduled: "bg-amber-50 border-amber-200/90 text-amber-900 hover:border-amber-300",
  frozen: "bg-cyan-50 border-cyan-300 text-cyan-950 ring-1 ring-cyan-400 shadow-2xs",
};

const TYPE_DOT = {
  therapy: "bg-sky-500",
  therapy_speech: "bg-emerald-500",
  therapy_physio: "bg-purple-500",
  therapy_behavior: "bg-amber-500",
  assessment: "bg-indigo-500",
  consultation: "bg-teal-500",
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
    <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-sm" data-testid="weekly-calendar-grid">
      <div className="overflow-x-auto">
        <div className="min-w-[880px]">
          {/* Header row */}
          <div className="grid border-b border-slate-200 bg-slate-50/70" style={{ gridTemplateColumns: "68px repeat(6, 1fr)" }}>
            <div className="py-3 px-2 text-[11px] font-bold text-slate-400 bg-slate-50/90 text-center uppercase tracking-wider">
              Time
            </div>
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  "py-3 px-2 text-center border-l border-slate-200/80 transition-colors",
                  isToday(day) ? "bg-sky-50/90" : "hover:bg-slate-100/50"
                )}
              >
                <p className={cn("text-[11px] font-bold uppercase tracking-wider", isToday(day) ? "text-sky-700" : "text-slate-500")}>
                  {format(day, "EEE")}
                </p>
                <p className={cn("text-sm font-extrabold tabular-nums mt-0.5", isToday(day) ? "text-sky-900 font-black" : "text-slate-800")}>
                  {format(day, "MMM d")}
                </p>
              </div>
            ))}
          </div>

          {/* Hour rows */}
          {CALENDAR_HOURS.map((hour) => (
            <div
              key={hour}
              className="grid border-b border-slate-100 last:border-b-0 hover:bg-slate-50/30 transition-colors"
              style={{ gridTemplateColumns: "68px repeat(6, 1fr)" }}
            >
              <div className="py-2.5 px-2 text-[11px] font-bold text-slate-400 bg-slate-50/50 border-r border-slate-100 text-center tabular-nums">
                {hour}
              </div>
              {days.map((day) => {
                const dayStr = format(day, "yyyy-MM-dd");
                const cellSessions = sessionsFor(dayStr, hour);
                const isDayToday = isToday(day);
                return (
                  <div
                    key={dayStr + hour}
                    className={cn(
                      "calendar-grid-cell border-l border-slate-100 p-1.5 space-y-1.5 min-h-[58px]",
                      isDayToday && "bg-sky-50/20",
                      onSlotClick && !isBulkMode && "cursor-pointer hover:bg-sky-50/40 transition-colors duration-150"
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
                            "w-full text-left rounded-xl border p-2 text-xs leading-snug shadow-2xs hover:shadow-xs transition-all duration-150 relative cursor-pointer group",
                            isFrozen ? CHIP_STYLES.frozen : CHIP_STYLES[s.status] || CHIP_STYLES.scheduled,
                            isSelected && "ring-2 ring-sky-600 shadow-md scale-[1.01]"
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
                                  className="w-3.5 h-3.5 rounded text-sky-600 cursor-pointer accent-sky-600"
                                />
                              )}
                              <span className={cn("w-2 h-2 rounded-full shrink-0", TYPE_DOT[s.type] || TYPE_DOT.therapy)} />
                              <span className={cn("font-bold truncate text-[11px]", s.status === "cancelled" && "line-through text-rose-500")}>
                                {getClientName(s.clientId)}
                              </span>
                            </span>
                            {isFrozen && <span title="Frozen — Zero session credits remaining" className="text-xs">❄️</span>}
                          </div>
                          <div className="flex items-center justify-between text-[10px] opacity-80 tabular-nums mt-1 font-medium">
                            <span>{s.startTime}–{s.endTime}</span>
                            {isFrozen && <span className="font-bold text-cyan-900">Frozen</span>}
                          </div>
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
  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 font-medium">
    {[
      ["Scheduled", "bg-sky-100 border-sky-300 text-sky-900"],
      ["Completed", "bg-emerald-100 border-emerald-300 text-emerald-900"],
      ["Cancelled", "bg-rose-100 border-rose-300 text-rose-900"],
      ["Rescheduled", "bg-amber-100 border-amber-300 text-amber-900"],
      ["Frozen (0 Credit)", "bg-cyan-100 border-cyan-400 text-cyan-950"],
    ].map(([label, cls]) => (
      <span key={label} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200">
        <span className={cn("w-2.5 h-2.5 rounded-full border", cls)} />
        {label}
      </span>
    ))}
  </div>
);

