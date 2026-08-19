import React, { useMemo, useState } from "react";
import { addDays, addWeeks, format, startOfWeek, subDays, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight, Stethoscope, CalendarDays, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WeeklyCalendar, CalendarLegend } from "@/components/calendar/WeeklyCalendar";
import { DayAgenda } from "@/components/calendar/DayAgenda";
import { SessionDetailModal } from "@/components/calendar/SessionDetailModal";
import { useAuth } from "@/context/AuthContext";
import { useSchedules } from "@/context/SchedulesContext";
import { useClients } from "@/context/ClientsContext";
import { useTherapists } from "@/context/TherapistsContext";
import { cn } from "@/lib/utils";

export default function MySchedule() {
  const { auth } = useAuth();
  const { schedules } = useSchedules();
  const { clients } = useClients();
  const { getTherapist } = useTherapists();

  // Mobile defaults to the day agenda; desktop to the weekly grid.
  const [view, setView] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "day" : "week"
  );
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionOpen, setSessionOpen] = useState(false);

  const therapist = getTherapist(auth.therapistId);

  const mySchedules = useMemo(
    () => schedules.filter((s) => s.therapistId === auth.therapistId),
    [schedules, auth.therapistId]
  );

  const getClientName = (clientId) => {
    const c = clients.find((cl) => cl.id === clientId);
    return c ? c.clientName : "Unknown";
  };

  const goPrev = () =>
    view === "week" ? setWeekStart((w) => subWeeks(w, 1)) : setSelectedDay((d) => subDays(d, 1));
  const goNext = () =>
    view === "week" ? setWeekStart((w) => addWeeks(w, 1)) : setSelectedDay((d) => addDays(d, 1));
  const goToday = () => {
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    setSelectedDay(new Date());
  };

  const label =
    view === "week"
      ? `${format(weekStart, "MMM d")} \u2013 ${format(addWeeks(weekStart, 1), "MMM d, yyyy")}`
      : format(selectedDay, "EEE, MMM d yyyy");

  return (
    <div className="space-y-6" data-testid="my-schedule-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-semibold mb-2">
            <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
            Therapist Clinical Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            My Clinical Schedule
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {therapist ? `${therapist.name} (${therapist.specialty})` : "Specialist Practitioner"} · <strong className="text-slate-800 tabular-nums">{mySchedules.length}</strong> total sessions assigned.
          </p>
        </div>
      </div>

      {/* Date & View Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" className="rounded-xl border-slate-200 h-9 w-9" onClick={goPrev} aria-label="Previous" data-testid="my-schedule-prev-week">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </Button>
          <Button variant="outline" className="rounded-xl border-slate-200 text-xs font-semibold text-slate-700 h-9" onClick={goToday} data-testid="my-schedule-today">
            Today
          </Button>
          <Button variant="outline" size="icon" className="rounded-xl border-slate-200 h-9 w-9" onClick={goNext} aria-label="Next" data-testid="my-schedule-next-week">
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </Button>
          <span className="text-sm font-bold text-slate-900 ml-2 tabular-nums">{label}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-slate-200 p-0.5 bg-slate-100" data-testid="my-schedule-view-toggle">
            <button
              type="button"
              onClick={() => setView("week")}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                view === "week" ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-500 hover:text-slate-800"
              )}
              data-testid="my-schedule-view-week-button"
            >
              Week Grid
            </button>
            <button
              type="button"
              onClick={() => setView("day")}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                view === "day" ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-500 hover:text-slate-800"
              )}
              data-testid="my-schedule-view-day-button"
            >
              Day Agenda
            </button>
          </div>
          <div className="hidden lg:block">
            <CalendarLegend />
          </div>
        </div>
      </div>

      {/* Main Timetable */}
      {view === "week" ? (
        <WeeklyCalendar
          weekStart={weekStart}
          schedules={mySchedules}
          getClientName={getClientName}
          onSessionClick={(s) => {
            setSelectedSession(s);
            setSessionOpen(true);
          }}
        />
      ) : (
        <DayAgenda
          day={selectedDay}
          schedules={mySchedules}
          getClientName={getClientName}
          getTherapistName={() => (therapist ? therapist.name : "\u2014")}
          onSessionClick={(s) => {
            setSelectedSession(s);
            setSessionOpen(true);
          }}
        />
      )}

      {/* Session Progress Note & Status Sheet */}
      <SessionDetailModal
        schedule={selectedSession}
        open={sessionOpen}
        onOpenChange={setSessionOpen}
        clientLinkBase="/therapist/clients"
      />
    </div>
  );
}

