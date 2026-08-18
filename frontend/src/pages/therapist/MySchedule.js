import React, { useMemo, useState } from "react";
import { addWeeks, format, startOfWeek, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WeeklyCalendar, CalendarLegend } from "@/components/calendar/WeeklyCalendar";
import { SessionDetailModal } from "@/components/calendar/SessionDetailModal";
import { useAuth } from "@/context/AuthContext";
import { useSchedules } from "@/context/SchedulesContext";
import { useClients } from "@/context/ClientsContext";
import { useTherapists } from "@/context/TherapistsContext";

export default function MySchedule() {
  const { auth } = useAuth();
  const { schedules } = useSchedules();
  const { clients } = useClients();
  const { getTherapist } = useTherapists();

  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
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

  const weekLabel = `${format(weekStart, "MMM d")} – ${format(addWeeks(weekStart, 1), "MMM d, yyyy")}`;

  return (
    <div className="space-y-5" data-testid="my-schedule-page">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Schedule</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          {therapist ? `${therapist.name} · ${therapist.specialty}` : "Therapist"} — {mySchedules.length} total sessions on the books.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart((w) => subWeeks(w, 1))} aria-label="Previous week" data-testid="my-schedule-prev-week">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} data-testid="my-schedule-today">
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart((w) => addWeeks(w, 1))} aria-label="Next week" data-testid="my-schedule-next-week">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium ml-2 tabular-nums">{weekLabel}</span>
        </div>
        <CalendarLegend />
      </div>

      <WeeklyCalendar
        weekStart={weekStart}
        schedules={mySchedules}
        getClientName={getClientName}
        onSessionClick={(s) => {
          setSelectedSession(s);
          setSessionOpen(true);
        }}
      />

      <SessionDetailModal
        schedule={selectedSession}
        open={sessionOpen}
        onOpenChange={setSessionOpen}
        clientLinkBase="/therapist/clients"
      />
    </div>
  );
}
