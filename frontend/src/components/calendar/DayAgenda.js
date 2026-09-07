import React from "react";
import { format } from "date-fns";
import { CalendarPlus, Plus, Clock, CalendarDays, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { cn } from "@/lib/utils";

const STATUS_BAR = {
  scheduled: "bg-sky-500",
  completed: "bg-emerald-500",
  cancelled: "bg-rose-500",
  rescheduled: "bg-amber-500",
};

// Single-day agenda list — mobile-friendly alternative to the weekly grid.
export const DayAgenda = ({ day, date, schedules = [], getClientName, getTherapistName, onSessionClick, onAddClick }) => {
  const activeDay = day || date || new Date();
  const dayStr = format(activeDay, "yyyy-MM-dd");
  const sessions = schedules
    .filter((s) => s.date === dayStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden clinical-card" data-testid="day-agenda">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-xs">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{format(day, "EEEE, dd/MM/yyyy")}</p>
            <p className="text-xs text-slate-500">Day Schedule & Clinical Progress</p>
          </div>
        </div>
        <span className="text-xs font-bold bg-white text-slate-700 border border-slate-200 rounded-full px-3 py-1 tabular-nums shadow-2xs" data-testid="day-agenda-session-count">
          {sessions.length} session{sessions.length === 1 ? "" : "s"}
        </span>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon={CalendarPlus}
          title="No sessions on this day"
          subtitle="No clinical sessions scheduled for this day yet."
          action={
            onAddClick && (
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl border-slate-200 font-semibold text-xs" onClick={() => onAddClick()} data-testid="day-agenda-add-empty-button">
                <Plus className="w-3.5 h-3.5 text-sky-600" /> Add Session Slot
              </Button>
            )
          }
        />
      ) : (
        <ul className="divide-y divide-slate-100">
          {sessions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSessionClick && onSessionClick(s)}
                className="w-full flex items-stretch gap-4 px-5 py-3.5 text-left hover:bg-sky-50/50 transition-colors group cursor-pointer"
                data-testid={`day-agenda-session-${s.id}`}
              >
                <div className="w-20 shrink-0 pt-0.5">
                  <p className="text-xs font-bold text-slate-900 tabular-nums">{s.startTime}</p>
                  <p className="text-[11px] font-medium text-slate-400 tabular-nums">{s.endTime}</p>
                </div>
                <div className={cn("w-1.5 rounded-full self-stretch shrink-0", STATUS_BAR[s.status] || STATUS_BAR.scheduled)} />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-bold text-slate-900 group-hover:text-sky-700 transition-colors truncate", s.status === "cancelled" && "line-through text-slate-400")}>
                    {getClientName(s.clientId)}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">
                    Therapist: {getTherapistName ? getTherapistName(s.therapistId) : "—"}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <StatusBadge status={s.type} />
                    <StatusBadge status={s.status} />
                    {s.isRecurring && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        Weekly Recurring
                      </span>
                    )}
                    {s.activitySection || s.noteSection || s.progressNote || s.homeworkSection ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        <FileText className="w-3 h-3 text-emerald-600" /> Laporan Terisi
                      </span>
                    ) : s.status !== "cancelled" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                        <FileText className="w-3 h-3 text-slate-400" /> Belum Ada Laporan
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {onAddClick && sessions.length > 0 && (
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <Button variant="outline" size="sm" className="w-full gap-2 rounded-xl border-slate-200 font-semibold text-xs text-slate-700 hover:bg-sky-50 hover:text-sky-800" onClick={() => onAddClick()} data-testid="day-agenda-add-button">
            <Plus className="w-3.5 h-3.5 text-sky-600" /> Add session on this day
          </Button>
        </div>
      )}
    </div>
  );
};

