import React, { useMemo } from "react";
import { format, isToday } from "date-fns";
import { teamDayHours, timeToMin } from "@/domain/schedule";
import { cn } from "@/shared/lib/utils";
import { SESSION_COLORS, sessionColorKey } from "@/shared/constants/sessionColors";

const chipOf = (s) => SESSION_COLORS[sessionColorKey(s)].chip;

// Kalender tim tampilan HARI (read-only): SATU kalender berisi SEMUA terapis (kolom per terapis) pada satu tanggal, baris per jam.
// Jam bawaan 09:00–18:00 dan melebar otomatis mengikuti sesi hari itu (`teamDayHours`). Banyak terapis = geser ke samping;
// kolom jam (kiri) dan nama terapis (atas) menempel saat digeser. Mobile: kolom lebih sempit + area scroll dua arah.
// Tanpa klik slot. `onSessionClick` opsional: bila ada, sesi bisa diklik (mis. membuka detail di Weekly Calendar admin);
// tanpa itu murni tampilan (Kalender Tim Terapis). `therapists` = kolom yang tampil, `schedules` = sesi (sudah difilter cabang).
export function TeamDayGrid({ day, therapists, schedules, getClientName, onSessionClick }) {
  const dayStr = format(day, "yyyy-MM-dd");
  const daySessions = useMemo(() => schedules.filter((s) => s.date === dayStr), [schedules, dayStr]);
  const hours = useMemo(() => teamDayHours(daySessions), [daySessions]);
  const inHour = (startTime, hour) => timeToMin(startTime) >= timeToMin(hour) && timeToMin(startTime) < timeToMin(hour) + 60;
  const cols = `var(--thead) repeat(${Math.max(1, therapists.length)}, minmax(var(--tcol), 1fr))`;

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-sm" data-testid="team-day-grid">
      <div className="px-3 sm:px-4 py-3 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className={cn("text-sm font-bold", isToday(day) ? "text-sky-800" : "text-slate-900")}>{format(day, "EEEE, dd/MM/yyyy")}</p>
        <span className="text-xs font-bold text-slate-600 tabular-nums" data-testid="team-day-count">{daySessions.length} sesi • {therapists.length} terapis</span>
      </div>
      {therapists.length === 0 ? (
        <p className="p-6 text-center text-xs text-slate-500" data-testid="team-day-empty">Belum ada terapis pada cabang ini.</p>
      ) : (
        <>
          {therapists.length > 2 && (
            <p className="md:hidden px-3 py-1.5 text-[11px] font-medium text-slate-500 bg-sky-50/60 border-b border-slate-100" data-testid="team-day-scroll-hint">
              Geser ke samping untuk melihat terapis lain.
            </p>
          )}
          <div className="overflow-auto max-h-[70dvh] [--thead:48px] md:[--thead:64px] [--tcol:132px] md:[--tcol:150px]" data-testid="team-day-scroll">
            <div style={{ minWidth: `calc(var(--thead) + ${therapists.length} * var(--tcol))` }}>
              <div className="grid border-b border-slate-200 bg-slate-50 sticky top-0 z-20" style={{ gridTemplateColumns: cols }}>
                <div className="py-2.5 px-1 md:px-2 text-[10px] md:text-[11px] font-bold text-slate-400 text-center uppercase tracking-wider sticky left-0 z-30 bg-slate-50">Jam</div>
                {therapists.map((t) => (
                  <div key={t.id} className="py-2.5 px-2 border-l border-slate-200/80 min-w-0 bg-slate-50" data-testid={`team-col-${t.id}`}>
                    <p className="text-xs font-extrabold text-slate-900 truncate">{t.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{t.specialty}</p>
                  </div>
                ))}
              </div>
              {hours.map((hour) => (
                <div key={hour} className="grid border-b border-slate-100 last:border-b-0" style={{ gridTemplateColumns: cols }} data-testid={`team-hour-${hour}`}>
                  <div className="py-2.5 px-1 md:px-2 text-[11px] font-bold text-slate-400 bg-slate-50 text-center tabular-nums sticky left-0 z-10 border-r border-slate-100">{hour}</div>
                  {therapists.map((t) => {
                    const items = daySessions
                      .filter((s) => s.therapistId === t.id && inHour(s.startTime, hour))
                      .sort((a, b) => timeToMin(a.startTime) - timeToMin(b.startTime));
                    return (
                      <div key={t.id + hour} className="border-l border-slate-100 p-1 space-y-1 min-h-[56px] min-w-0">
                        {items.map((s) => {
                          const chipClass = cn("rounded-lg border px-2 py-1 text-[11px] leading-tight w-full text-left", chipOf(s), s.status === "cancelled" && "[&_p:first-child]:line-through");
                          const body = (
                            <>
                              <p className="font-bold truncate">{getClientName(s.clientId)}</p>
                              <p className="tabular-nums opacity-80">{s.startTime}–{s.endTime}{s.type === "assessment" ? " • Asesmen" : ""}</p>
                            </>
                          );
                          return onSessionClick ? (
                            <button key={s.id} type="button" onClick={() => onSessionClick(s)} className={cn(chipClass, "block cursor-pointer hover:shadow-sm min-h-10 md:min-h-0")} data-testid={`team-session-${s.id}`}>
                              {body}
                            </button>
                          ) : (
                            <div key={s.id} className={chipClass} data-testid={`team-session-${s.id}`}>{body}</div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
