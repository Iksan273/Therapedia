import React, { useMemo, useState } from "react";
import { addDays, addWeeks, format, startOfWeek, subDays, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
    <div className="space-y-5" data-testid="my-schedule-page">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Schedule</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          {therapist ? `${therapist.name} · ${therapist.specialty}` : "Therapist"} — {mySchedules.length} total sessions on the books.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={goPrev} aria-label="Previous" data-testid="my-schedule-prev-week">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={goToday} data-testid="my-schedule-today">
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={goNext} aria-label="Next" data-testid="my-schedule-next-week">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium ml-1 tabular-nums">{label}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden" data-testid="my-schedule-view-toggle">
            <button
              type="button"
              onClick={() => setView("week")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                view === "week" ? "bg-[var(--color-primary)] text-white" : "bg-white text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
              )}
              data-testid="my-schedule-view-week-button"
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setView("day")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                view === "day" ? "bg-[var(--color-primary)] text-white" : "bg-white text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
              )}
              data-testid="my-schedule-view-day-button"
            >
              Day
            </button>
          </div>
          <div className="hidden sm:block">
            <CalendarLegend />
          </div>
        </div>
      </div>

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

      <SessionDetailModal
        schedule={selectedSession}
        open={sessionOpen}
        onOpenChange={setSessionOpen}
        clientLinkBase="/therapist/clients"
      />
    </div>
  );
}
