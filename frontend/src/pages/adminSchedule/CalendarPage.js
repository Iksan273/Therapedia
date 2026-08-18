import React, { useMemo, useState } from "react";
import { addWeeks, format, startOfWeek, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WeeklyCalendar, CalendarLegend } from "@/components/calendar/WeeklyCalendar";
import { AddScheduleModal } from "@/components/calendar/AddScheduleModal";
import { SessionDetailModal } from "@/components/calendar/SessionDetailModal";
import { useSchedules } from "@/context/SchedulesContext";
import { useClients } from "@/context/ClientsContext";
import { useTherapists } from "@/context/TherapistsContext";

export default function CalendarPage() {
  const { schedules } = useSchedules();
  const { clients } = useClients();
  const { therapists } = useTherapists();

  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
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

  const weekLabel = `${format(weekStart, "MMM d")} – ${format(addWeeks(weekStart, 1), "MMM d, yyyy")}`;

  return (
    <div className="space-y-5" data-testid="weekly-calendar-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Weekly Calendar</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Click an empty slot to add a session, or a filled slot to manage it.</p>
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart((w) => subWeeks(w, 1))} aria-label="Previous week" data-testid="calendar-prev-week-button">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} data-testid="calendar-today-button">
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart((w) => addWeeks(w, 1))} aria-label="Next week" data-testid="calendar-next-week-button">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium ml-2 tabular-nums" data-testid="calendar-week-label">{weekLabel}</span>
        </div>
        <div className="flex items-center gap-4">
          <CalendarLegend />
          <Select value={therapistFilter} onValueChange={setTherapistFilter}>
            <SelectTrigger className="w-48 h-9" data-testid="calendar-therapist-filter">
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

      <WeeklyCalendar
        weekStart={weekStart}
        schedules={visibleSchedules}
        getClientName={getClientName}
        onSlotClick={(date, hour) =>
          setAddModal({
            open: true,
            defaults: {
              date,
              startTime: hour,
              therapistId: therapistFilter !== "all" ? therapistFilter : undefined,
            },
          })
        }
        onSessionClick={(s) => {
          setSelectedSession(s);
          setSessionOpen(true);
        }}
      />

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
