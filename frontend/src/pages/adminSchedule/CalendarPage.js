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
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DateFilterPicker from "@/components/common/DateFilterPicker";
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
      ? `${format(weekStart, "dd/MM/yyyy")} – ${format(addDays(addWeeks(weekStart, 1), -1), "dd/MM/yyyy")}`
      : format(selectedDay, "EEEE, dd/MM/yyyy");

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
    <div className="space-y-6" data-testid="weekly-calendar-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100/80 text-sky-800 text-xs font-semibold mb-2">
            <CalendarDays className="w-3.5 h-3.5 text-sky-600" />
            Clinical Timetable
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Weekly Therapy Calendar
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {view === "week"
              ? "Click any time slot to schedule sessions or switch to Bulk Mode for multi-client adjustments."
              : "Day Agenda overview — tap sessions to view and edit progress notes."}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant={isBulkMode ? "default" : "outline"}
            className={cn(
              "rounded-xl font-semibold text-xs border-slate-200 h-10",
              isBulkMode ? "bg-sky-700 text-white hover:bg-sky-800" : "text-slate-700 hover:bg-sky-50"
            )}
            onClick={() => {
              setIsBulkMode(!isBulkMode);
              if (isBulkMode) clearSelection();
            }}
            data-testid="calendar-bulk-mode-toggle"
          >
            <ListChecks className="w-4 h-4 mr-2 text-sky-600" />
            {isBulkMode ? "Exit Bulk Mode" : "Bulk Operations"}
          </Button>

          <Button
            className="bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl gap-2 shadow-sm shadow-sky-600/20 h-10"
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
          className="rounded-2xl border border-sky-300 bg-sky-50 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs"
          data-testid="calendar-bulk-toolbar"
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-900 bg-sky-200/70 px-2.5 py-1 rounded-lg">
              {selectedSessionIds.length} Session(s) Selected
            </span>
            <Button size="sm" variant="ghost" className="h-8 text-xs font-semibold text-sky-800 hover:bg-sky-100 rounded-lg" onClick={selectAllVisible}>
              Select All Visible
            </Button>
            {selectedSessionIds.length > 0 && (
              <Button size="sm" variant="ghost" className="h-8 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg" onClick={clearSelection}>
                Clear Selection
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl gap-1.5 h-9 text-xs"
              disabled={selectedSessionIds.length === 0}
              onClick={handleBulkComplete}
              data-testid="bulk-complete-button"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Bulk Complete
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-9 text-xs bg-white border-slate-200 font-semibold rounded-xl"
              disabled={selectedSessionIds.length === 0}
              onClick={() => setBulkRescheduleOpen(true)}
              data-testid="bulk-reschedule-button"
            >
              <CalendarClock className="w-3.5 h-3.5 text-amber-600" /> Bulk Reschedule
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-9 text-xs bg-white text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50 font-semibold rounded-xl"
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
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" className="rounded-xl border-slate-200 h-10 w-10 shadow-2xs" onClick={goPrev} aria-label="Previous" data-testid="calendar-prev-week-button">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </Button>
          <Button variant="outline" className="rounded-xl border-slate-200 text-xs font-bold text-slate-700 h-10 px-4 shadow-2xs" onClick={goToday} data-testid="calendar-today-button">
            Today
          </Button>
          <Button variant="outline" size="icon" className="rounded-xl border-slate-200 h-10 w-10 shadow-2xs" onClick={goNext} aria-label="Next" data-testid="calendar-next-week-button">
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </Button>
          <span className="text-sm font-black text-slate-900 ml-2 tabular-nums tracking-tight" data-testid="calendar-week-label">
            {label}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View toggle */}
          <div className="flex rounded-xl border border-slate-200 p-0.5 bg-slate-100" data-testid="calendar-view-toggle">
            <button
              type="button"
              onClick={() => setView("week")}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                view === "week"
                  ? "bg-white text-sky-800 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              )}
              data-testid="calendar-view-week-button"
            >
              Week Grid
            </button>
            <button
              type="button"
              onClick={() => setView("day")}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                view === "day"
                  ? "bg-white text-sky-800 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              )}
              data-testid="calendar-view-day-button"
            >
              Day Agenda
            </button>
          </div>

          {/* Discharge Filter Toggle */}
          <button
            type="button"
            onClick={() => setShowDischarged(!showDischarged)}
            className={cn(
              "px-3.5 h-10 text-xs font-bold rounded-xl border transition-all flex items-center gap-2 cursor-pointer shadow-2xs",
              showDischarged
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
            title="Toggle visibility of discharged clients"
            data-testid="calendar-toggle-discharged"
          >
            <Filter className="w-3.5 h-3.5" />
            {showDischarged ? "Showing Discharged" : "Hide Discharged"}
          </button>

          <div className="hidden lg:block">
            <CalendarLegend />
          </div>

          <Select value={therapistFilter} onValueChange={setTherapistFilter}>
            <SelectTrigger className="w-44 sm:w-48 h-10 text-xs rounded-xl border-slate-200 bg-white font-semibold" data-testid="calendar-therapist-filter">
              <SelectValue placeholder="Filter therapist" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="all">All Therapists</SelectItem>
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
        <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200" data-testid="bulk-reschedule-dialog">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Bulk Reschedule ({selectedSessionIds.length} Sessions)</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Shift selected sessions by a weekday offset or assign to a target calendar date.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Option 1: Shift by Days Offset</Label>
              <Select value={bulkDayOffset} onValueChange={setBulkDayOffset}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white" data-testid="bulk-reschedule-offset-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="0">No Offset (Use exact target date below)</SelectItem>
                  <SelectItem value="1">+1 Day (Tomorrow)</SelectItem>
                  <SelectItem value="2">+2 Days</SelectItem>
                  <SelectItem value="7">+1 Week (7 Days)</SelectItem>
                  <SelectItem value="14">+2 Weeks (14 Days)</SelectItem>
                  <SelectItem value="-7">-1 Week (-7 Days)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Option 2: Exact Target Date (DD/MM/YYYY) (Overrides offset)</Label>
              <DateFilterPicker
                placeholder="DD/MM/YYYY"
                className="w-full bg-slate-50"
                value={bulkTargetDate}
                onChange={(e) => setBulkTargetDate(e?.target?.value ?? e)}
                data-testid="bulk-reschedule-date-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Reassign Therapist (Optional)</Label>
              <Select value={bulkTargetTherapist} onValueChange={setBulkTargetTherapist}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white" data-testid="bulk-reschedule-therapist-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="keep">Keep Currently Assigned Therapist(s)</SelectItem>
                  {therapists.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-5 gap-2">
            <Button variant="outline" className="rounded-xl border-slate-200" onClick={() => setBulkRescheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl"
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
        <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200" data-testid="bulk-cancel-dialog">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Bulk Cancel ({selectedSessionIds.length} Sessions)</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Cancel all selected appointments with cancellation reasons recorded in audit logs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Cancellation Reason</Label>
              <Select value={bulkCancelReason} onValueChange={setBulkCancelReason}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white" data-testid="bulk-cancel-reason-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="leave">Leave — Count toward leave quota, preserve session credit</SelectItem>
                  <SelectItem value="other">Other Reason — No leave or credit alteration</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Cancellation Note (Optional)</Label>
              <Input
                placeholder="Brief reason for cancellation..."
                className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
                value={bulkCancelNote}
                onChange={(e) => setBulkCancelNote(e.target.value)}
                data-testid="bulk-cancel-note-input"
              />
            </div>
          </div>
          <DialogFooter className="mt-5 gap-2">
            <Button variant="outline" className="rounded-xl border-slate-200" onClick={() => setBulkCancelOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl" onClick={handleBulkCancelConfirm} data-testid="bulk-cancel-confirm-button">
              Confirm Cancel All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

