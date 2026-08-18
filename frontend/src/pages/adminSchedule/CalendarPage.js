import React, { useMemo, useState } from "react";
import { addDays, addWeeks, format, parseISO, startOfWeek, subDays, subWeeks } from "date-fns";
import { toast } from "sonner";
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  ListChecks,
  Plus,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WeeklyCalendar, CalendarLegend } from "@/components/calendar/WeeklyCalendar";
import { DayAgenda } from "@/components/calendar/DayAgenda";
import { AddScheduleModal } from "@/components/calendar/AddScheduleModal";
import { SessionDetailModal } from "@/components/calendar/SessionDetailModal";
import { useSchedules } from "@/context/SchedulesContext";
import { useClients } from "@/context/ClientsContext";
import { useTherapists } from "@/context/TherapistsContext";
import { useCredits } from "@/context/CreditsContext";
import { cn } from "@/lib/utils";

export default function CalendarPage() {
  const { schedules, updateSchedulesMany, rescheduleSchedulesBulk } = useSchedules();
  const { clients } = useClients();
  const { therapists } = useTherapists();
  const { getRecordForClient, spendCredit, recordLeave } = useCredits();

  // Mobile defaults to day agenda, desktop to weekly grid
  const [view, setView] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "day" : "week"
  );
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [therapistFilter, setTherapistFilter] = useState("all");
  const [showDischarged, setShowDischarged] = useState(false);

  // Bulk mode states
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState([]);
  const [bulkRescheduleOpen, setBulkRescheduleOpen] = useState(false);
  const [bulkCancelOpen, setBulkCancelOpen] = useState(false);

  // Bulk Reschedule form states
  const [bulkTargetDate, setBulkTargetDate] = useState("");
  const [bulkDayOffset, setBulkDayOffset] = useState("0");
  const [bulkTargetTherapist, setBulkTargetTherapist] = useState("keep");

  // Bulk Cancel form states
  const [bulkCancelReason, setBulkCancelReason] = useState("leave");
  const [bulkCancelNote, setBulkCancelNote] = useState("");

  // Modals
  const [addModal, setAddModal] = useState({ open: false, defaults: {} });
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionOpen, setSessionOpen] = useState(false);

  // Map of discharged client IDs
  const dischargedClientIds = useMemo(
    () => new Set(clients.filter((c) => c.status === "discharged").map((c) => c.id)),
    [clients]
  );

  // Filter visible schedules based on therapist filter and discharge rule
  const visibleSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (therapistFilter !== "all" && s.therapistId !== therapistFilter) return false;
      if (!showDischarged && dischargedClientIds.has(s.clientId)) return false;
      return true;
    });
  }, [schedules, therapistFilter, showDischarged, dischargedClientIds]);

  const isClientCreditZero = (clientId) => {
    const rec = getRecordForClient(clientId);
    return rec ? rec.remainingCredit === 0 : false;
  };

  const getClientName = (clientId) => {
    const c = clients.find((cl) => cl.id === clientId);
    return c ? c.clientName : "Unknown";
  };
  const getTherapistName = (therapistId) => {
    const t = therapists.find((th) => th.id === therapistId);
    return t ? t.name : "\u2014";
  };

  const toggleSelectSession = (id) => {
    setSelectedSessionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllVisible = () => {
    const ids = visibleSchedules.map((s) => s.id);
    setSelectedSessionIds(ids);
  };

  const clearSelection = () => {
    setSelectedSessionIds([]);
  };

  // Bulk Action: Complete
  const handleBulkComplete = () => {
    if (selectedSessionIds.length === 0) return;
    const selectedSchedules = schedules.filter((s) => selectedSessionIds.includes(s.id));

    selectedSchedules.forEach((s) => {
      if (s.type === "therapy") {
        spendCredit({ clientId: s.clientId, scheduleId: s.id, date: s.date });
      }
    });

    updateSchedulesMany(selectedSessionIds, { status: "completed" });
    toast.success(`Bulk operation complete: ${selectedSessionIds.length} session(s) marked as Completed.`);
    clearSelection();
  };

  // Bulk Action: Reschedule Confirm
  const handleBulkRescheduleConfirm = () => {
    if (selectedSessionIds.length === 0) return;
    const selectedSchedules = schedules.filter((s) => selectedSessionIds.includes(s.id));
    const offsetDays = parseInt(bulkDayOffset, 10) || 0;
    const itemsMap = {};

    selectedSchedules.forEach((s) => {
      let finalDate = s.date;
      if (bulkTargetDate) {
        finalDate = bulkTargetDate;
      } else if (offsetDays !== 0) {
        finalDate = format(addDays(parseISO(s.date), offsetDays), "yyyy-MM-dd");
      }

      itemsMap[s.id] = {
        date: finalDate,
        status: "rescheduled",
        therapistId: bulkTargetTherapist !== "keep" ? bulkTargetTherapist : s.therapistId,
      };
    });

    rescheduleSchedulesBulk(itemsMap);
    toast.success(`Bulk operation complete: ${selectedSessionIds.length} session(s) rescheduled.`);
    setBulkRescheduleOpen(false);
    clearSelection();
  };

  // Bulk Action: Cancel Confirm
  const handleBulkCancelConfirm = () => {
    if (selectedSessionIds.length === 0) return;
    const selectedSchedules = schedules.filter((s) => selectedSessionIds.includes(s.id));

    if (bulkCancelReason === "leave") {
      selectedSchedules.forEach((s) => {
        recordLeave({ clientId: s.clientId, scheduleId: s.id, date: s.date });
      });
    }

    const patchNote = bulkCancelNote ? ` | Bulk Cancel: ${bulkCancelNote}` : " | Bulk Cancelled";
    updateSchedulesMany(selectedSessionIds, { status: "cancelled", notes: patchNote });
    toast.success(`Bulk operation complete: ${selectedSessionIds.length} session(s) cancelled.`);
    setBulkCancelOpen(false);
    clearSelection();
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
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Therapy Calendar</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {view === "week"
              ? "Click an empty slot to add a session, or use Bulk Mode for multi-session updates."
              : "Today's agenda \u2014 tap a session to manage it."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isBulkMode ? "default" : "outline"}
            className={cn(isBulkMode && "bg-[var(--color-primary-dark)] text-white")}
            onClick={() => {
              setIsBulkMode(!isBulkMode);
              if (isBulkMode) clearSelection();
            }}
            data-testid="calendar-bulk-mode-toggle"
          >
            <ListChecks className="w-4 h-4 mr-2" />
            {isBulkMode ? "Exit Bulk Mode" : "Bulk Operations"}
          </Button>

          <Button
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] gap-2"
            onClick={() => setAddModal({ open: true, defaults: {} })}
            data-testid="calendar-add-session-button"
          >
            <Plus className="w-4 h-4" /> Add Schedule
          </Button>
        </div>
      </div>

      {/* Bulk Toolbar if Bulk Mode Active */}
      {isBulkMode && (
        <div
          className="rounded-xl border border-[var(--color-primary)] bg-[var(--color-primary-light)] p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm"
          data-testid="calendar-bulk-toolbar"
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary-dark)]">
              {selectedSessionIds.length} Session(s) Selected
            </span>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={selectAllVisible}>
              Select All Visible
            </Button>
            {selectedSessionIds.length > 0 && (
              <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600" onClick={clearSelection}>
                Clear
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="bg-[var(--color-success)] hover:bg-green-600 gap-1.5 h-8 text-xs"
              disabled={selectedSessionIds.length === 0}
              onClick={handleBulkComplete}
              data-testid="bulk-complete-button"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Bulk Complete
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-8 text-xs bg-white"
              disabled={selectedSessionIds.length === 0}
              onClick={() => setBulkRescheduleOpen(true)}
              data-testid="bulk-reschedule-button"
            >
              <CalendarClock className="w-3.5 h-3.5 text-amber-600" /> Bulk Reschedule
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-8 text-xs bg-white text-red-600 hover:text-red-700"
              disabled={selectedSessionIds.length === 0}
              onClick={() => setBulkCancelOpen(true)}
              data-testid="bulk-cancel-button"
            >
              <XCircle className="w-3.5 h-3.5" /> Bulk Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Date controls and filters */}
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
          <span className="text-sm font-medium ml-1 tabular-nums" data-testid="calendar-week-label">
            {label}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View toggle */}
          <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden" data-testid="calendar-view-toggle">
            <button
              type="button"
              onClick={() => setView("week")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                view === "week"
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-white text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
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
                view === "day"
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-white text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
              )}
              data-testid="calendar-view-day-button"
            >
              Day
            </button>
          </div>

          {/* Discharge Filter Toggle */}
          <button
            type="button"
            onClick={() => setShowDischarged(!showDischarged)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5",
              showDischarged
                ? "bg-gray-800 text-white border-gray-800"
                : "bg-white text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-gray-50"
            )}
            title="Sembunyikan atau tampilkan jadwal klien berstatus Discharge"
            data-testid="calendar-toggle-discharged"
          >
            <Filter className="w-3 h-3" />
            {showDischarged ? "Showing Discharged" : "Hide Discharged"}
          </button>

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
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main View */}
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
          isBulkMode={isBulkMode}
          selectedSessionIds={selectedSessionIds}
          onToggleSelectSession={toggleSelectSession}
          isClientCreditZero={isClientCreditZero}
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

      {/* Add Schedule Modal */}
      <AddScheduleModal
        open={addModal.open}
        onOpenChange={(open) => setAddModal((m) => ({ ...m, open }))}
        defaults={addModal.defaults}
      />

      {/* Single Session Detail Sheet */}
      <SessionDetailModal
        schedule={selectedSession}
        open={sessionOpen}
        onOpenChange={setSessionOpen}
        clientLinkBase="/admin-schedule/clients"
      />

      {/* Bulk Reschedule Dialog */}
      <Dialog open={bulkRescheduleOpen} onOpenChange={setBulkRescheduleOpen}>
        <DialogContent data-testid="bulk-reschedule-dialog">
          <DialogHeader>
            <DialogTitle>Bulk Reschedule ({selectedSessionIds.length} Sessions)</DialogTitle>
            <DialogDescription>Shift all selected sessions to a specific date or offset by days/weeks.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Option 1: Shift by Days Offset</Label>
              <Select value={bulkDayOffset} onValueChange={setBulkDayOffset}>
                <SelectTrigger data-testid="bulk-reschedule-offset-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No Offset (Use target date below)</SelectItem>
                  <SelectItem value="1">+1 Hari (Besok)</SelectItem>
                  <SelectItem value="2">+2 Hari</SelectItem>
                  <SelectItem value="7">+1 Minggu (7 Hari)</SelectItem>
                  <SelectItem value="14">+2 Minggu (14 Hari)</SelectItem>
                  <SelectItem value="-7">-1 Minggu (-7 Hari)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Option 2: Set Exact Target Date (Overrides offset)</Label>
              <Input
                type="date"
                value={bulkTargetDate}
                onChange={(e) => setBulkTargetDate(e.target.value)}
                data-testid="bulk-reschedule-date-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Reassign Therapist (Optional)</Label>
              <Select value={bulkTargetTherapist} onValueChange={setBulkTargetTherapist}>
                <SelectTrigger data-testid="bulk-reschedule-therapist-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">Keep Current Therapist(s)</SelectItem>
                  {therapists.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkRescheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]"
              onClick={handleBulkRescheduleConfirm}
              data-testid="bulk-reschedule-confirm-button"
            >
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Cancel Dialog */}
      <Dialog open={bulkCancelOpen} onOpenChange={setBulkCancelOpen}>
        <DialogContent data-testid="bulk-cancel-dialog">
          <DialogHeader>
            <DialogTitle>Bulk Cancel ({selectedSessionIds.length} Sessions)</DialogTitle>
            <DialogDescription>Cancel all selected sessions with cancellation reason and notes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Select value={bulkCancelReason} onValueChange={setBulkCancelReason}>
                <SelectTrigger data-testid="bulk-cancel-reason-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leave">Leave — Count as leave quota, credit preserved</SelectItem>
                  <SelectItem value="other">Other — No leave/credit deduction</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Note (Optional)</Label>
              <Input
                placeholder="Reason for bulk cancellation..."
                value={bulkCancelNote}
                onChange={(e) => setBulkCancelNote(e.target.value)}
                data-testid="bulk-cancel-note-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkCancelOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleBulkCancelConfirm} data-testid="bulk-cancel-confirm-button">
              Confirm Cancel All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
