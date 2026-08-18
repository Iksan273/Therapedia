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
      addSchedules(buildRecurringSchedules(base, 12));
      toast.success("Recurring schedule created — 12 weekly sessions added.");
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
          <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4 text-[var(--color-text-muted)]" />
              <div>
                <p className="text-sm font-medium">Recurring weekly</p>
                <p className="text-xs text-[var(--color-text-muted)]">Auto-creates 12 weekly sessions ahead</p>
              </div>
            </div>
            <Switch checked={recurring} onCheckedChange={setRecurring} data-testid="add-schedule-recurring-toggle" />
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
