import React from "react";
import { format } from "date-fns";
import { CalendarPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { cn } from "@/lib/utils";

const STATUS_BAR = {
  scheduled: "bg-[var(--color-primary)]",
  completed: "bg-[var(--color-success)]",
  cancelled: "bg-[var(--color-danger)]",
  rescheduled: "bg-[var(--color-warning)]",
};

// Single-day agenda list — mobile-friendly alternative to the weekly grid.
export const DayAgenda = ({ day, schedules, getClientName, getTherapistName, onSessionClick, onAddClick }) => {
  const dayStr = format(day, "yyyy-MM-dd");
  const sessions = schedules
    .filter((s) => s.date === dayStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white shadow-sm overflow-hidden" data-testid="day-agenda">
      <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between">
        <p className="text-sm font-semibold">{format(day, "EEEE, MMM d yyyy")}</p>
        <span className="text-xs text-[var(--color-text-muted)] tabular-nums" data-testid="day-agenda-session-count">
          {sessions.length} session{sessions.length === 1 ? "" : "s"}
        </span>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon={CalendarPlus}
          title="No sessions this day"
          subtitle="Enjoy the quiet, or add a session below."
          action={
            onAddClick && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onAddClick()} data-testid="day-agenda-add-empty-button">
                <Plus className="w-3.5 h-3.5" /> Add Session
              </Button>
            )
          }
        />
      ) : (
        <ul className="divide-y divide-[var(--color-border)]">
          {sessions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSessionClick && onSessionClick(s)}
                className="w-full flex items-stretch gap-3 px-4 py-3 text-left hover:bg-[rgba(47,168,224,0.05)] transition-colors"
                data-testid={`day-agenda-session-${s.id}`}
              >
                <div className="w-16 shrink-0 pt-0.5">
                  <p className="text-sm font-semibold tabular-nums">{s.startTime}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums">{s.endTime}</p>
                </div>
                <div className={cn("w-1 rounded-full self-stretch shrink-0", STATUS_BAR[s.status] || STATUS_BAR.scheduled)} />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium truncate", s.status === "cancelled" && "line-through text-[var(--color-text-muted)]")}>
                    {getClientName(s.clientId)}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate">{getTherapistName(s.therapistId)}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <StatusBadge status={s.type} />
                    <StatusBadge status={s.status} />
                    {s.isRecurring && (
                      <span className="inline-flex items-center rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                        Weekly
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {onAddClick && sessions.length > 0 && (
        <div className="p-3 border-t border-[var(--color-border)]">
          <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => onAddClick()} data-testid="day-agenda-add-button">
            <Plus className="w-3.5 h-3.5" /> Add session on this day
          </Button>
        </div>
      )}
    </div>
  );
};
