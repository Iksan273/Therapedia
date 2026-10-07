import React from "react";
import { format, isToday } from "date-fns";
import { CALENDAR_HOURS, timeToMin } from "@/domain/schedule";
import { cn } from "@/shared/lib/utils";

const CHIP = {
  scheduled: "bg-sky-50 border-sky-200 text-sky-900",
  completed: "bg-emerald-50 border-emerald-200 text-emerald-900",
  cancelled: "bg-rose-50 border-rose-200 text-rose-700 line-through",
  rescheduled: "bg-amber-50 border-amber-200 text-amber-900",
  reschedule_pending: "bg-orange-50 border-orange-300 border-dashed text-orange-900",
};

// Kalender tim tampilan HARI (read-only): SATU kalender berisi SEMUA terapis (kolom per terapis) pada satu tanggal, baris per jam.
// Tanpa klik slot / sesi. `therapists` = kolom yang tampil, `schedules` = sesi di hari itu (sudah difilter cabang).
export function TeamDayGrid({ day, therapists, schedules, getClientName }) {
  const dayStr = format(day, "yyyy-MM-dd");
  const inHour = (startTime, hour) => timeToMin(startTime) >= timeToMin(hour) && timeToMin(startTime) < timeToMin(hour) + 60;
  const cols = `64px repeat(${Math.max(1, therapists.length)}, minmax(150px, 1fr))`;

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-sm" data-testid="team-day-grid">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
        <p className={cn("text-sm font-bold", isToday(day) ? "text-sky-800" : "text-slate-900")}>{format(day, "EEEE, dd/MM/yyyy")}</p>
        <span className="text-xs font-bold text-slate-600 tabular-nums" data-testid="team-day-count">{schedules.length} sesi • {therapists.length} terapis</span>
      </div>
      <div className="overflow-x-auto">
        <div style={{ minWidth: 64 + therapists.length * 150 }}>
          <div className="grid border-b border-slate-200 bg-slate-50/70" style={{ gridTemplateColumns: cols }}>
            <div className="py-2.5 px-2 text-[11px] font-bold text-slate-400 text-center uppercase tracking-wider">Jam</div>
            {therapists.map((t) => (
              <div key={t.id} className="py-2.5 px-2 border-l border-slate-200/80 min-w-0" data-testid={`team-col-${t.id}`}>
                <p className="text-xs font-extrabold text-slate-900 truncate">{t.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{t.specialty}</p>
              </div>
            ))}
          </div>
          {CALENDAR_HOURS.map((hour) => (
            <div key={hour} className="grid border-b border-slate-100 last:border-b-0" style={{ gridTemplateColumns: cols }}>
              <div className="py-2.5 px-2 text-[11px] font-bold text-slate-400 bg-slate-50/50 text-center tabular-nums">{hour}</div>
              {therapists.map((t) => {
                const items = schedules
                  .filter((s) => s.therapistId === t.id && s.date === dayStr && inHour(s.startTime, hour))
                  .sort((a, b) => timeToMin(a.startTime) - timeToMin(b.startTime));
                return (
                  <div key={t.id + hour} className="border-l border-slate-100 p-1 space-y-1 min-h-[52px] min-w-0">
                    {items.map((s) => (
                      <div key={s.id} className={cn("rounded-lg border px-2 py-1 text-[11px] leading-tight", CHIP[s.status] || CHIP.scheduled)} data-testid={`team-session-${s.id}`}>
                        <p className="font-bold truncate">{getClientName(s.clientId)}</p>
                        <p className="tabular-nums opacity-80">{s.startTime}–{s.endTime}{s.type === "assessment" ? " • Asesmen" : ""}</p>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
