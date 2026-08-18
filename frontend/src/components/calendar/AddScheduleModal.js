import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Check, ChevronsUpDown, Repeat } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useClients } from "@/context/ClientsContext";
import { useTherapists } from "@/context/TherapistsContext";
import { useSchedules } from "@/context/SchedulesContext";
import {
  SESSION_TYPES,
  TIME_OPTIONS,
  WEEKDAY_OPTIONS,
  buildRecurringSchedules,
  checkConflicts,
  timeToMin,
  todayStr,
  uid,
} from "@/lib/appUtils";
import { cn } from "@/lib/utils";

// Shared "Add Schedule" dialog used by: weekly calendar, inquiry flow (offer assessment),
// inquiry flow (recurring therapy), and active client detail. All write to the same schedules state.
export const AddScheduleModal = ({ open, onOpenChange, defaults = {}, onCreated }) => {
  const { clients } = useClients();
  const { therapists } = useTherapists();
  const { schedules, addSchedule, addSchedules } = useSchedules();

  const [clientId, setClientId] = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [therapistId, setTherapistId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [type, setType] = useState("therapy");
  const [recurring, setRecurring] = useState(false);
  const [notes, setNotes] = useState("");

  const [selectedDays, setSelectedDays] = useState([]);
  const [recurringWeeks, setRecurringWeeks] = useState("12");

  useEffect(() => {
    if (open) {
      setClientId(defaults.clientId || "");
      setTherapistId(defaults.therapistId || "");
      setDate(defaults.date || todayStr());
      setStartTime(defaults.startTime || "09:00");
      const start = defaults.startTime || "09:00";
      const [h, m] = start.split(":").map(Number);
      setEndTime(`${String(Math.min(h + 1, 18)).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      setType(defaults.type || "therapy");
      setRecurring(Boolean(defaults.defaultRecurring));
      setSelectedDays([]);
      setRecurringWeeks("12");
      setNotes("");
      setClientOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectableClients = useMemo(
    () => clients.filter((c) => c.status === "admitted"),
    [clients]
  );
  const lockedClient = defaults.lockClient ? clients.find((c) => c.id === defaults.clientId) : null;
  const selectedClient = clients.find((c) => c.id === clientId);

  const conflicts = useMemo(
    () => checkConflicts({ therapistId, date, startTime, endTime, schedules, therapists }),
    [therapistId, date, startTime, endTime, schedules, therapists]
  );

  const handleStartChange = (value) => {
    setStartTime(value);
    if (timeToMin(endTime) <= timeToMin(value)) {
      const [h, m] = value.split(":").map(Number);
      setEndTime(`${String(Math.min(h + 1, 18)).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  };

  const toggleDay = (dayId) => {
    setSelectedDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  };

  const valid = clientId && therapistId && date && startTime && endTime && timeToMin(endTime) > timeToMin(startTime);

  const handleSubmit = () => {
    if (!valid) {
      toast.error("Please fill in client, therapist, date and a valid time range.");
      return;
    }
    const base = {
      id: uid(),
      clientId,
      type,
      therapistId,
      date,
      startTime,
      endTime,
      status: "scheduled",
      isRecurring: recurring,
      recurrenceRule: recurring ? "weekly" : "none",
      notes,
    };
    if (recurring) {
      const weeksNum = parseInt(recurringWeeks, 10) || 12;
      const schedulesList = buildRecurringSchedules(base, weeksNum, selectedDays);
      addSchedules(schedulesList);
      toast.success(
        `Recurring schedule created — ${schedulesList.length} session(s) generated for ${weeksNum} week(s).`
      );
    } else {
      addSchedule(base);
      toast.success("Session scheduled.");
    }
    if (onCreated) onCreated(base);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="add-schedule-modal">
        <DialogHeader>
          <DialogTitle>Add Schedule</DialogTitle>
          <DialogDescription>
            {defaults.lockType ? `Book a ${type} session.` : "Book a session on the shared clinic calendar."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client */}
          <div className="space-y-1.5">
            <Label>Client</Label>
            {lockedClient ? (
              <div className="h-10 px-3 flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-medium">
                {lockedClient.clientName}
              </div>
            ) : (
              <Popover open={clientOpen} onOpenChange={setClientOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                    data-testid="add-schedule-client-select"
                  >
                    {selectedClient ? selectedClient.clientName : "Search active clients..."}
                    <ChevronsUpDown className="w-4 h-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Type a client name..." data-testid="add-schedule-client-search" />
                    <CommandList>
                      <CommandEmpty>No active client found.</CommandEmpty>
                      <CommandGroup>
                        {selectableClients.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={c.clientName}
                            onSelect={() => {
                              setClientId(c.id);
                              setClientOpen(false);
                            }}
                            data-testid={`add-schedule-client-option-${c.id}`}
                          >
                            <Check className={cn("mr-2 w-4 h-4", clientId === c.id ? "opacity-100" : "opacity-0")} />
                            {c.clientName}
                            <span className="ml-auto text-xs text-[var(--color-text-muted)]">{c.parentName}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Therapist + type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Therapist</Label>
              <Select value={therapistId} onValueChange={setTherapistId}>
                <SelectTrigger data-testid="add-schedule-therapist-select">
                  <SelectValue placeholder="Select therapist" />
                </SelectTrigger>
                <SelectContent>
                  {therapists.map((t) => (
                    <SelectItem key={t.id} value={t.id} data-testid={`add-schedule-therapist-option-${t.id}`}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Session Type</Label>
              <Select value={type} onValueChange={setType} disabled={Boolean(defaults.lockType)}>
                <SelectTrigger data-testid="add-schedule-type-select">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date + times */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                data-testid="add-schedule-date-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Start</Label>
              <Select value={startTime} onValueChange={handleStartChange}>
                <SelectTrigger data-testid="add-schedule-start-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.slice(0, -1).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>End</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger data-testid="add-schedule-end-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.filter((t) => timeToMin(t) > timeToMin(startTime)).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Recurring */}
          <div className="space-y-3 rounded-lg border border-[var(--color-border)] p-3 bg-[var(--color-surface)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-[var(--color-primary-dark)]" />
                <div>
                  <p className="text-sm font-medium">Recurring Schedule</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Repeat session automatically across multiple weeks</p>
                </div>
              </div>
              <Switch checked={recurring} onCheckedChange={setRecurring} data-testid="add-schedule-recurring-toggle" />
            </div>

            {recurring && (
              <div className="space-y-3 pt-2 border-t border-[var(--color-border)]">
                {/* Select days of week */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                    Pilih Hari Recurring (Multiply Days)
                  </Label>
                  <div className="flex flex-wrap gap-1.5" data-testid="recurring-day-selector">
                    {WEEKDAY_OPTIONS.map((day) => {
                      const selected = selectedDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => toggleDay(day.id)}
                          className={cn(
                            "px-2.5 py-1 text-xs font-medium rounded-lg border transition-all",
                            selected
                              ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm"
                              : "bg-white text-[var(--color-text)] border-[var(--color-border)] hover:bg-gray-50"
                          )}
                          data-testid={`recurring-day-${day.id}`}
                        >
                          {day.label} ({day.short})
                        </button>
                      );
                    })}
                  </div>
                  {selectedDays.length > 0 && (
                    <p className="text-[11px] text-[var(--color-primary-dark)] font-medium">
                      Dipilih: {selectedDays.map((d) => WEEKDAY_OPTIONS.find((w) => w.id === d)?.label).join(", ")}
                    </p>
                  )}
                </div>

                {/* Duration select */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                    Durasi Repetisi (Duration Weeks)
                  </Label>
                  <Select value={recurringWeeks} onValueChange={setRecurringWeeks}>
                    <SelectTrigger className="w-full h-9" data-testid="recurring-weeks-select">
                      <SelectValue placeholder="Pilih durasi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4 Minggu (1 Bulan)</SelectItem>
                      <SelectItem value="8">8 Minggu (2 Bulan)</SelectItem>
                      <SelectItem value="12">12 Minggu (3 Bulan - Default)</SelectItem>
                      <SelectItem value="16">16 Minggu (4 Bulan)</SelectItem>
                      <SelectItem value="24">24 Minggu (6 Bulan)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Session focus, reminders..."
              data-testid="add-schedule-notes-input"
            />
          </div>

          {/* Conflict warning — warns but never blocks */}
          {conflicts.length > 0 && (
            <div
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700 space-y-1"
              data-testid="add-schedule-conflict-warning"
            >
              <p className="flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" /> Scheduling conflict detected
              </p>
              {conflicts.map((c, i) => (
                <p key={i}>• {c}</p>
              ))}
              <p className="italic">You can still submit — the conflict is only a warning.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="add-schedule-cancel-button">
            Cancel
          </Button>
          <Button
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]"
            onClick={handleSubmit}
            data-testid="add-schedule-submit-button"
          >
            {conflicts.length > 0 ? "Schedule Anyway" : "Add Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
