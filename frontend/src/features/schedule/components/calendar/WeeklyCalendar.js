import { useMemo } from "react";
import { addDays, format, isToday, parseISO } from "date-fns";
import { AlertTriangle, CalendarOff, CornerUpRight, FileText, Hourglass, Snowflake } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";
import { CALENDAR_HOURS, findTherapistClashIds, timeToMin } from "@/domain/schedule";
import { isLeaveOff } from "@/domain/leave";
import { STATUS_META } from "@/domain/status";
import { cn } from "@/shared/lib/utils";

const CHIP_STYLES = {
  scheduled: "bg-sky-50 border-sky-200/90 text-sky-900 hover:border-sky-300",
  completed: "bg-emerald-50 border-emerald-200/90 text-emerald-900 hover:border-emerald-300",
  cancelled: "bg-rose-50 border-rose-200/90 text-rose-600 hover:border-rose-300",
  rescheduled: "bg-amber-50 border-amber-200/90 text-amber-900 hover:border-amber-300",
  reschedule_pending: "bg-orange-50 border-dashed border-orange-300 text-orange-950 hover:border-orange-400",
  frozen: "bg-cyan-50 border-cyan-300 text-cyan-950 ring-1 ring-cyan-400 shadow-2xs",
  conflict: "bg-red-50 border-red-400 text-red-950 ring-1 ring-red-400 hover:border-red-500",
};

const TYPE_DOT = {
  therapy: "bg-sky-500",
  therapy_speech: "bg-emerald-500",
  therapy_physio: "bg-purple-500",
  therapy_behavior: "bg-amber-500",
  assessment: "bg-indigo-500",
  consultation: "bg-teal-500",
};

// Lebar kolom dikunci: minmax(0, 1fr) mencegah isi panjang melebarkan kolom,
// sehingga header & semua baris jam punya garis hari yang sama persis.
// Sel boleh berisi banyak sesi (baris jam memanjang ke bawah), tetapi lebar hari tidak berubah.
const GRID_COLUMNS = "68px repeat(6, minmax(0, 1fr))";

// "28/09 09:00" dari sebuah slot { date, startTime }
const shortSlot = (slot) => {
  try {
    return `${format(parseISO(slot.date), "dd/MM")} ${slot.startTime}`;
  } catch (e) {
    return slot.startTime;
  }
};

const hasReport = (s) => Boolean(s.activitySection || s.noteSection || s.progressNote || s.homeworkSection);

// Detail lengkap sesi untuk tooltip hover
function SessionTooltip({ s, name, therapistName, isFrozen, isConflict }) {
  return (
    <div className="space-y-1 text-xs max-w-[260px]">
      <p className="font-extrabold text-sm">{name}</p>
      <p className="tabular-nums">
        {s.startTime}–{s.endTime} • {s.type === "assessment" ? "Asesmen" : "Terapi"}
      </p>
      <p>Status: {STATUS_META[s.status]?.label || s.status}</p>
      {therapistName && <p>Terapis: {therapistName}</p>}
      {s.status === "rescheduled" && s.rescheduledFrom && <p>Dipindah dari {shortSlot(s.rescheduledFrom)}</p>}
      {s.status === "reschedule_pending" && <p>Menunggu jadwal pengganti</p>}
      {isLeaveOff(s) && <p>Cuti (Finance): memakai saldo jatah cuti client</p>}
      {isFrozen && <p className="font-bold">Frozen — kredit client 0</p>}
      {isConflict && <p className="font-bold text-red-600">Bentrok — terapis sudah menangani client lain di jam ini</p>}
      <p className="opacity-80">{hasReport(s) ? "Laporan sesi terisi" : "Laporan sesi belum diisi"}</p>
    </div>
  );
}

// Kartu sesi ringkas dengan tinggi seragam (2 baris). Detail lengkap ada di tooltip.
function SessionChip({ s, name, therapistName, isFrozen, isConflict, isSelected, isBulkMode, onActivate }) {
  let subLabel = null;
  if (isConflict) subLabel = { icon: AlertTriangle, text: "Bentrok", cls: "text-red-700" };
  else if (isFrozen) subLabel = { icon: Snowflake, text: "Frozen", cls: "text-cyan-800" };
  else if (s.status === "rescheduled" && s.rescheduledFrom) subLabel = { icon: CornerUpRight, text: `dari ${shortSlot(s.rescheduledFrom)}`, cls: "text-amber-800" };
  else if (s.status === "reschedule_pending") subLabel = { icon: Hourglass, text: "Menunggu", cls: "text-orange-800" };
  else if (isLeaveOff(s)) subLabel = { icon: CalendarOff, text: "Cuti", cls: "text-violet-800" };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onActivate(s);
          }}
          className={cn(
            "w-full min-w-0 text-left rounded-lg border px-2 py-1.5 text-[11px] leading-tight shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer",
            isConflict ? CHIP_STYLES.conflict : isFrozen ? CHIP_STYLES.frozen : CHIP_STYLES[s.status] || CHIP_STYLES.scheduled,
            isSelected && "ring-2 ring-sky-600 shadow-md"
          )}
          data-testid={`calendar-session-${s.id}`}
          data-conflict={isConflict ? "true" : undefined}
        >
          <span className="flex items-center gap-1.5 min-w-0">
            {isBulkMode && (
              <input type="checkbox" checked={isSelected} onChange={() => {}} className="w-3 h-3 shrink-0 accent-sky-600 cursor-pointer" aria-label="Pilih sesi" />
            )}
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", TYPE_DOT[s.type] || TYPE_DOT.therapy)} />
            <span className={cn("font-bold truncate min-w-0", s.status === "cancelled" && "line-through text-rose-500")}>{name}</span>
            {hasReport(s) && <FileText className="w-2.5 h-2.5 shrink-0 ml-auto text-emerald-700" aria-label="Laporan terisi" />}
          </span>
          <span className="flex items-center gap-1 mt-0.5 min-w-0 tabular-nums">
            <span className="opacity-80 shrink-0">{s.startTime}–{s.endTime}</span>
            {subLabel && (
              <span className={cn("flex items-center gap-0.5 font-bold truncate min-w-0", subLabel.cls)} data-testid={`calendar-status-${s.id}`}>
                <subLabel.icon className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">{subLabel.text}</span>
              </span>
            )}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" align="start" className="z-50">
        <SessionTooltip s={s} name={name} therapistName={therapistName} isFrozen={isFrozen} isConflict={isConflict} />
      </TooltipContent>
    </Tooltip>
  );
}

// Jejak slot asal sesi yang sudah dipindah (redup, satu baris)
function GhostChip({ s, name, onActivate }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onActivate(s);
          }}
          className="w-full min-w-0 text-left rounded-lg border border-dashed border-slate-300 bg-slate-50/80 px-2 py-1 text-[11px] leading-tight text-slate-400 hover:text-slate-600 hover:border-slate-400 cursor-pointer"
          data-testid={`calendar-ghost-${s.id}`}
        >
          <span className="flex items-center gap-1 min-w-0 font-semibold">
            <CornerUpRight className="w-3 h-3 shrink-0" />
            <span className="truncate line-through">{name}</span>
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" align="start" className="z-50 text-xs">
        Jadwal asal {s.rescheduledFrom.startTime} — sudah dipindah ke {shortSlot(s)}
      </TooltipContent>
    </Tooltip>
  );
}

// Custom weekly grid: Monday-Saturday columns x hourly rows (08:00-18:00).
export const WeeklyCalendar = ({
  weekStart,
  schedules,
  getClientName,
  getTherapistName,
  onSlotClick,
  onSessionClick,
  isBulkMode = false,
  selectedSessionIds = [],
  onToggleSelectSession,
  isClientCreditZero,
}) => {
  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));

  // Sesi yang bentrok: terapis sama handle client lain di jam yang overlap
  const clashIds = useMemo(() => findTherapistClashIds(schedules), [schedules]);

  const inHour = (startTime, hour) => timeToMin(startTime) >= timeToMin(hour) && timeToMin(startTime) < timeToMin(hour) + 60;
  const sessionsFor = (dayStr, hour) =>
    schedules.filter((s) => s.date === dayStr && inHour(s.startTime, hour)).sort((a, b) => timeToMin(a.startTime) - timeToMin(b.startTime));

  // Jejak jadwal asal sesi yang sudah dipindah: tampil redup di slot lamanya agar admin tidak bingung
  const ghostsFor = (dayStr, hour) =>
    schedules.filter((s) => s.status === "rescheduled" && s.rescheduledFrom && s.rescheduledFrom.date === dayStr && inHour(s.rescheduledFrom.startTime, hour));

  const activate = (s) => {
    if (isBulkMode && onToggleSelectSession) onToggleSelectSession(s.id);
    else if (onSessionClick) onSessionClick(s);
  };

  const renderItem = (item) => {
    const { s } = item;
    const name = getClientName(s.clientId);
    if (item.ghost) return <GhostChip key={`ghost-${s.id}`} s={s} name={name} onActivate={activate} />;
    const isFrozen = s.type === "therapy" && ["scheduled", "rescheduled"].includes(s.status) && Boolean(isClientCreditZero?.(s.clientId));
    return (
      <SessionChip
        key={s.id}
        s={s}
        name={name}
        therapistName={getTherapistName?.(s.therapistId)}
        isFrozen={isFrozen}
        isConflict={clashIds.has(s.id)}
        isSelected={selectedSessionIds.includes(s.id)}
        isBulkMode={isBulkMode}
        onActivate={activate}
      />
    );
  };

  return (
    <TooltipProvider delayDuration={250}>
      <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-sm" data-testid="weekly-calendar-grid">
        <div className="overflow-x-auto">
          <div className="min-w-[880px]">
            {/* Header row */}
            <div className="grid border-b border-slate-200 bg-slate-50/70" style={{ gridTemplateColumns: GRID_COLUMNS }}>
              <div className="py-3 px-2 text-[11px] font-bold text-slate-400 bg-slate-50/90 text-center uppercase tracking-wider">Time</div>
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn("py-3 px-2 text-center border-l border-slate-200/80 min-w-0", isToday(day) ? "bg-sky-50/90" : "")}
                >
                  <p className={cn("text-[11px] font-bold uppercase tracking-wider", isToday(day) ? "text-sky-700" : "text-slate-500")}>{format(day, "EEE")}</p>
                  <p className={cn("text-xs sm:text-sm font-extrabold tabular-nums mt-0.5", isToday(day) ? "text-sky-900 font-black" : "text-slate-800")}>
                    {format(day, "dd/MM/yyyy")}
                  </p>
                </div>
              ))}
            </div>

            {/* Hour rows */}
            {CALENDAR_HOURS.map((hour) => (
              <div key={hour} className="grid border-b border-slate-100 last:border-b-0" style={{ gridTemplateColumns: GRID_COLUMNS }}>
                <div className="py-2.5 px-2 text-[11px] font-bold text-slate-400 bg-slate-50/50 text-center tabular-nums">{hour}</div>
                {days.map((day) => {
                  const dayStr = format(day, "yyyy-MM-dd");
                  const items = [
                    ...sessionsFor(dayStr, hour).map((s) => ({ s, ghost: false })),
                    ...ghostsFor(dayStr, hour).map((s) => ({ s, ghost: true })),
                  ];

                  return (
                    <div
                      key={dayStr + hour}
                      className={cn(
                        "calendar-grid-cell border-l border-slate-100 p-1 space-y-1 min-h-[58px] min-w-0",
                        isToday(day) && "bg-sky-50/30",
                        onSlotClick && !isBulkMode && "cursor-pointer hover:bg-sky-50/50 transition-colors duration-150"
                      )}
                      onClick={() => !isBulkMode && onSlotClick && onSlotClick(dayStr, hour)}
                      data-testid={`calendar-slot-${dayStr}-${hour.replace(":", "")}`}
                    >
                      {items.map(renderItem)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export const CalendarLegend = () => (
  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 font-medium">
    {[
      ["Scheduled", "bg-sky-100 border-sky-300 text-sky-900"],
      ["Completed", "bg-emerald-100 border-emerald-300 text-emerald-900"],
      ["Cancelled", "bg-rose-100 border-rose-300 text-rose-900"],
      ["Cancel / Off (Cuti)", "bg-rose-100 border-rose-300 text-rose-900"],
      ["Rescheduled (sudah pindah)", "bg-amber-100 border-amber-300 text-amber-900"],
      ["Menunggu jadwal pengganti", "bg-orange-100 border-orange-400 border-dashed text-orange-950"],
      ["Jadwal asal (dipindah)", "bg-slate-50 border-slate-400 border-dashed text-slate-500"],
      ["Frozen (0 Credit)", "bg-cyan-100 border-cyan-400 text-cyan-950"],
      ["Bentrok terapis", "bg-red-100 border-red-400 text-red-950"],
    ].map(([label, cls]) => (
      <span key={label} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200">
        <span className={cn("w-2.5 h-2.5 rounded-full border", cls)} />
        {label}
      </span>
    ))}
    <span className="text-slate-400">• Arahkan kursor ke kartu untuk detail</span>
  </div>
);
