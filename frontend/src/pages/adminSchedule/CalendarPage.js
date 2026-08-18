import React, { useMemo, useState } from "react";
import { addDays, addWeeks, format, startOfWeek, subDays, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WeeklyCalendar, CalendarLegend } from "@/components/calendar/WeeklyCalendar";
import { DayAgenda } from "@/components/calendar/DayAgenda";
import { AddScheduleModal } from "@/components/calendar/AddScheduleModal";
import { SessionDetailModal } from "@/components/calendar/SessionDetailModal";
import { useSchedules } from "@/context/SchedulesContext";
import { useClients } from "@/context/ClientsContext";
import { useTherapists } from "@/context/TherapistsContext";
import { cn } from "@/lib/utils";

export default function CalendarPage() {
  const { schedules } = useSchedules();
  const { clients } = useClients();
  const { therapists } = useTherapists();

  // Mobile defaults to the day agenda; desktop to the weekly grid.
  const [view, setView] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "day" : "week"
  );
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [therapistFilter, setTherapistFilter] = useState("all");
  const [addModal, setAddModal] = useState({ open: false, defaults: {} });
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionOpen, setSessionOpen] = useState(false);

  const visibleSchedules = useMemo(
    () => (therapistFilter === "all" ? schedules : schedules.filter((s) => s.therapistId === therapistFilter)),
    [schedules, therapistFilter]
  );

  const getClientName = (clientId) => {
    const c = clients.find((cl) => cl.id === clientId);
    return c ? c.clientName : "Unknown";
  };
  const getTherapistName = (therapistId) => {
    const t = therapists.find((th) => th.id === therapistId);
    return t ? t.name : "\u2014";
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

  const openAdd = (date, hour) =>
    setAddModal({
      open: true,
      defaults: {
        date,
        startTime: hour,
        therapistId: therapistFilter !== "all" ? therapistFilter : undefined,
      },
    });

  return (
    <div className="space-y-5" data-testid="weekly-calendar-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Therapy Calendar</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {view === "week"
              ? "Click an empty slot to add a session, or a filled slot to manage it."
              : "Today's agenda \u2014 tap a session to manage it."}
          </p>
        </div>
        <Button
          className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] gap-2"
          onClick={() => setAddModal({ open: true, defaults: {} })}
          data-testid="calendar-add-session-button"
        >
          <Plus className="w-4 h-4" /> Add Schedule
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={goPrev} aria-label="Previous" data-testid="calendar-prev-week-button">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={goToday} data-testid="calendar-today-button">
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={goNext} aria-label="Next" data-testid="calendar-next-week-button">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium ml-1 tabular-nums" data-testid="calendar-week-label">{label}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* View toggle */}
          <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden" data-testid="calendar-view-toggle">
            <button
              type="button"
              onClick={() => setView("week")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                view === "week" ? "bg-[var(--color-primary)] text-white" : "bg-white text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
              )}
              data-testid="calendar-view-week-button"
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
              data-testid="calendar-view-day-button"
            >
              Day
            </button>
          </div>
          <div className="hidden sm:block">
            <CalendarLegend />
          </div>
          <Select value={therapistFilter} onValueChange={setTherapistFilter}>
            <SelectTrigger className="w-44 sm:w-48 h-9" data-testid="calendar-therapist-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All therapists</SelectItem>
              {therapists.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {view === "week" ? (
        <WeeklyCalendar
          weekStart={weekStart}
          schedules={visibleSchedules}
          getClientName={getClientName}
          onSlotClick={(date, hour) => openAdd(date, hour)}
          onSessionClick={(s) => {
            setSelectedSession(s);
            setSessionOpen(true);
          }}
        />
      ) : (
        <DayAgenda
          day={selectedDay}
          schedules={visibleSchedules}
          getClientName={getClientName}
          getTherapistName={getTherapistName}
          onSessionClick={(s) => {
            setSelectedSession(s);
            setSessionOpen(true);
          }}
          onAddClick={() => openAdd(format(selectedDay, "yyyy-MM-dd"), "09:00")}
        />
      )}

      <AddScheduleModal
        open={addModal.open}
        onOpenChange={(open) => setAddModal((m) => ({ ...m, open }))}
        defaults={addModal.defaults}
      />
      <SessionDetailModal
        schedule={selectedSession}
        open={sessionOpen}
        onOpenChange={setSessionOpen}
        clientLinkBase="/admin-schedule/clients"
      />
    </div>
  );
}
