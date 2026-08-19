import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { addWeeks, format, parseISO } from "date-fns";
import {
  AlertTriangle,
  Check,
  ChevronsUpDown,
  Repeat,
  CalendarPlus,
  Sparkles,
  Layers,
  Clock,
  UserCheck,
  Calendar,
  Zap,
  Trash2,
  PlusCircle,
  Settings2,
} from "lucide-react";
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

export const AddScheduleModal = ({ open, onOpenChange, defaults = {}, onCreated }) => {
  const { clients } = useClients();
  const { therapists } = useTherapists();
  const { schedules, addSchedule, addSchedules } = useSchedules();

  // Primary appointment state
  const [clientId, setClientId] = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [defaultTherapistId, setDefaultTherapistId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [defaultStartTime, setDefaultStartTime] = useState("09:00");
  const [defaultEndTime, setDefaultEndTime] = useState("10:00");
  const [defaultType, setDefaultType] = useState("therapy");
  const [notes, setNotes] = useState("");

  // Mode: "single" (1 session on specific date) vs "multi_day" (weekly schedule pattern)
  const [scheduleMode, setScheduleMode] = useState("single"); // "single" | "multi_day"

  // Multi-day pattern state: array of selected day IDs, e.g. ["Monday", "Tuesday", "Wednesday"]
  const [selectedDays, setSelectedDays] = useState(["Monday"]);
  // Per-day custom configuration: { [dayId]: { startTime, endTime, therapistId, type } }
  const [dayConfigs, setDayConfigs] = useState({});

  // Recurrence settings for multi-day pattern:
  // isRecurring = false -> plot for 1 week only
  // isRecurring = true -> repeat across recurringWeeks
  const [isRecurring, setIsRecurring] = useState(true);
  const [recurringWeeks, setRecurringWeeks] = useState("12");

  // Optional: Pre-book recurring therapy session when booking an initial assessment
  const [bundleTherapy, setBundleTherapy] = useState(false);
  const [bundleDays, setBundleDays] = useState(["Monday", "Wednesday"]);
  const [bundleDayConfigs, setBundleDayConfigs] = useState({});
  const [bundleIsRecurring, setBundleIsRecurring] = useState(true);
  const [bundleWeeks, setBundleWeeks] = useState("12");
  const [bundleStartDate, setBundleStartDate] = useState("");

  useEffect(() => {
    if (open) {
      const initialClient = defaults.clientId || "";
      setClientId(initialClient);
      const initialTh = defaults.therapistId || (therapists[0]?.id || "");
      setDefaultTherapistId(initialTh);
      const initialDate = defaults.date || todayStr();
      setDate(initialDate);

      const start = defaults.startTime || "09:00";
      setDefaultStartTime(start);
      if (defaults.endTime) {
        setDefaultEndTime(defaults.endTime);
      } else {
        const [h, m] = start.split(":").map(Number);
        setDefaultEndTime(`${String(Math.min(h + 1, 18)).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }

      const initialType = defaults.type || "therapy";
      setDefaultType(initialType);
      setNotes("");
      setClientOpen(false);

      if (defaults.defaultRecurring || defaults.multiDay) {
        setScheduleMode("multi_day");
      } else {
        setScheduleMode("single");
      }

      // Initialize default day config for Monday & Wednesday
      setSelectedDays(["Monday", "Wednesday"]);
      setDayConfigs({
        Monday: { startTime: "14:00", endTime: "15:00", therapistId: initialTh, type: "therapy" },
        Wednesday: { startTime: "16:00", endTime: "17:00", therapistId: initialTh, type: "therapy" },
      });
      setIsRecurring(Boolean(defaults.defaultRecurring || true));
      setRecurringWeeks("12");

      // Reset bundled therapy booking
      setBundleTherapy(false);
      setBundleDays(["Monday", "Wednesday"]);
      setBundleDayConfigs({
        Monday: { startTime: "14:00", endTime: "15:00", therapistId: initialTh, type: "therapy" },
        Wednesday: { startTime: "16:00", endTime: "17:00", therapistId: initialTh, type: "therapy" },
      });
      setBundleIsRecurring(true);
      setBundleWeeks("12");
      try {
        const baseDate = parseISO(initialDate);
        setBundleStartDate(format(addWeeks(baseDate, 1), "yyyy-MM-dd"));
      } catch (e) {
        setBundleStartDate(todayStr());
      }
    }
  }, [open, defaults, therapists]);

  const selectableClients = useMemo(
    () => clients.filter((c) => c.status !== "discharged"),
    [clients]
  );
  const lockedClient = defaults.lockClient ? clients.find((c) => c.id === defaults.clientId) : null;
  const selectedClient = clients.find((c) => c.id === clientId);

  // Helper to update per-day config
  const updateDayConfig = (dayId, field, value) => {
    setDayConfigs((prev) => {
      const cur = prev[dayId] || {
        startTime: defaultStartTime,
        endTime: defaultEndTime,
        therapistId: defaultTherapistId,
        type: defaultType,
      };
      const updated = { ...cur, [field]: value };
      if (field === "startTime" && timeToMin(updated.endTime) <= timeToMin(value)) {
        const [h, m] = value.split(":").map(Number);
        updated.endTime = `${String(Math.min(h + 1, 18)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      }
      return { ...prev, [dayId]: updated };
    });
  };

  const toggleSelectDay = (dayId) => {
    setSelectedDays((prev) => {
      if (prev.includes(dayId)) {
        if (prev.length === 1) {
          toast.warning("At least one day must remain selected.");
          return prev;
        }
        return prev.filter((d) => d !== dayId);
      } else {
        // Initialize day config if missing
        if (!dayConfigs[dayId]) {
          setDayConfigs((configs) => ({
            ...configs,
            [dayId]: {
              startTime: defaultStartTime,
              endTime: defaultEndTime,
              therapistId: defaultTherapistId,
              type: defaultType,
            },
          }));
        }
        return [...prev, dayId];
      }
    });
  };

  // Helper for bundle day config
  const updateBundleDayConfig = (dayId, field, value) => {
    setBundleDayConfigs((prev) => {
      const cur = prev[dayId] || {
        startTime: "14:00",
        endTime: "15:00",
        therapistId: defaultTherapistId,
        type: "therapy",
      };
      const updated = { ...cur, [field]: value };
      if (field === "startTime" && timeToMin(updated.endTime) <= timeToMin(value)) {
        const [h, m] = value.split(":").map(Number);
        updated.endTime = `${String(Math.min(h + 1, 18)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      }
      return { ...prev, [dayId]: updated };
    });
  };

  const toggleBundleSelectDay = (dayId) => {
    setBundleDays((prev) => {
      if (prev.includes(dayId)) {
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== dayId);
      } else {
        if (!bundleDayConfigs[dayId]) {
          setBundleDayConfigs((configs) => ({
            ...configs,
            [dayId]: {
              startTime: "14:00",
              endTime: "15:00",
              therapistId: defaultTherapistId,
              type: "therapy",
            },
          }));
        }
        return [...prev, dayId];
      }
    });
  };

  const isAssessmentType = defaultType === "assessment";

  // Check conflicts for single session mode
  const singleConflicts = useMemo(() => {
    if (scheduleMode !== "single") return [];
    return checkConflicts({
      therapistId: defaultTherapistId,
      date,
      startTime: defaultStartTime,
      endTime: defaultEndTime,
      schedules,
      therapists,
    });
  }, [scheduleMode, defaultTherapistId, date, defaultStartTime, defaultEndTime, schedules, therapists]);

  const handleSubmit = () => {
    if (!clientId) {
      toast.error("Please select a child/client.");
      return;
    }

    const createdList = [];

    if (scheduleMode === "single") {
      if (!defaultTherapistId || !date || !defaultStartTime || !defaultEndTime) {
        toast.error("Please fill in date, therapist, and time.");
        return;
      }
      const singleBase = {
        id: uid(),
        clientId,
        type: defaultType,
        therapistId: defaultTherapistId,
        date,
        startTime: defaultStartTime,
        endTime: defaultEndTime,
        status: "scheduled",
        isRecurring: false,
        recurrenceRule: "none",
        notes: notes.trim() || null,
      };
      addSchedule(singleBase);
      createdList.push(singleBase);
      toast.success(`${isAssessmentType ? "Assessment session" : "Session"} scheduled for ${date}.`);
    } else {
      // Multi-day pattern
      if (selectedDays.length === 0) {
        toast.error("Please select at least one day for the weekly schedule.");
        return;
      }
      const weeksCount = isRecurring ? parseInt(recurringWeeks, 10) || 12 : 1;
      const baseSession = {
        id: uid(),
        clientId,
        type: defaultType,
        therapistId: defaultTherapistId,
        date,
        startTime: defaultStartTime,
        endTime: defaultEndTime,
        status: "scheduled",
        notes: notes.trim() || null,
      };

      const schedulesList = buildRecurringSchedules(baseSession, weeksCount, selectedDays, dayConfigs);
      addSchedules(schedulesList);
      createdList.push(...schedulesList);

      if (isRecurring) {
        toast.success(
          `Weekly schedule generated — ${schedulesList.length} session(s) repeating across ${weeksCount} weeks.`
        );
      } else {
        toast.success(
          `One-week schedule generated — ${schedulesList.length} session(s) plotted for this week.`
        );
      }
    }

    // Handle optional bundled therapy schedule on assessment
    if (isAssessmentType && bundleTherapy) {
      const bundleWeeksCount = bundleIsRecurring ? parseInt(bundleWeeks, 10) || 12 : 1;
      const thStartDate = bundleStartDate || date;
      const baseBundle = {
        id: uid(),
        clientId,
        type: "therapy",
        therapistId: defaultTherapistId,
        date: thStartDate,
        startTime: "14:00",
        endTime: "15:00",
        status: "scheduled",
        notes: `Pre-booked recurring therapy package alongside initial intake assessment.`,
      };

      const bundledList = buildRecurringSchedules(baseBundle, bundleWeeksCount, bundleDays, bundleDayConfigs);
      addSchedules(bundledList);
      createdList.push(...bundledList);
      toast.success(
        `⚡ Also pre-booked ${bundledList.length} therapy sessions starting ${thStartDate}!`
      );
    }

    if (onCreated) onCreated(createdList[0], createdList);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[calc(100dvh-2.5rem)] overflow-y-auto p-5 sm:p-6"
        data-testid="add-schedule-modal"
      >
        <DialogHeader className="pb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold shrink-0">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-extrabold text-slate-900">
                {defaults.lockType
                  ? `Book Clinical ${defaultType.toUpperCase()} Appointment`
                  : "Clinical Schedule & Weekly Timetable Planner"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Configure flexible single dates or multi-day weekly patterns with custom times per day.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1 text-xs">
          {/* Patient Selection */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Child / Client</Label>
            {lockedClient ? (
              <div className="h-9 px-3.5 flex items-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800">
                <UserCheck className="w-3.5 h-3.5 text-sky-600 mr-2" />
                {lockedClient.clientName}
                <span className="text-slate-500 font-normal ml-1.5">({lockedClient.parentName})</span>
              </div>
            ) : (
              <Popover open={clientOpen} onOpenChange={setClientOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-semibold text-xs rounded-xl border-slate-200 h-9 bg-slate-50 focus:bg-white"
                    data-testid="add-schedule-client-select"
                  >
                    {selectedClient
                      ? `${selectedClient.clientName} (${selectedClient.parentName})`
                      : "Search active client roster..."}
                    <ChevronsUpDown className="w-4 h-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[360px] p-0 rounded-2xl border-slate-200 shadow-xl" align="start">
                  <Command>
                    <CommandInput placeholder="Search client or parent..." data-testid="add-schedule-client-search" />
                    <CommandList>
                      <CommandEmpty className="p-3 text-xs text-slate-500 text-center">No matching client found.</CommandEmpty>
                      <CommandGroup>
                        {selectableClients.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={`${c.clientName} ${c.parentName}`}
                            onSelect={() => {
                              setClientId(c.id);
                              setClientOpen(false);
                            }}
                            className="cursor-pointer py-2 px-3 rounded-lg"
                            data-testid={`add-schedule-client-option-${c.id}`}
                          >
                            <Check className={cn("mr-2 w-4 h-4 text-sky-600", clientId === c.id ? "opacity-100" : "opacity-0")} />
                            <span className="font-bold text-xs text-slate-900">{c.clientName}</span>
                            <span className="ml-auto text-[11px] text-slate-400 font-normal">{c.parentName}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Scheduling Mode Switcher */}
          {!defaults.lockType && (
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setScheduleMode("single")}
                className={cn(
                  "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  scheduleMode === "single"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                📅 Single Session (One Specific Date)
              </button>
              <button
                type="button"
                onClick={() => setScheduleMode("multi_day")}
                className={cn(
                  "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  scheduleMode === "multi_day"
                    ? "bg-white text-sky-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                🗓️ Weekly Pattern Builder (Custom Times per Day)
              </button>
            </div>
          )}

          {/* MODE 1: Single Session Form */}
          {scheduleMode === "single" && (
            <div className="space-y-3 p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Clinical Service Discipline</Label>
                  <Select value={defaultType} onValueChange={setDefaultType} disabled={Boolean(defaults.lockType)}>
                    <SelectTrigger className="rounded-xl border-slate-200 bg-white text-xs h-9 font-semibold">
                      <SelectValue placeholder="Select discipline..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      {SESSION_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Assigned Therapist</Label>
                  <Select value={defaultTherapistId} onValueChange={setDefaultTherapistId}>
                    <SelectTrigger className="rounded-xl border-slate-200 bg-white text-xs h-9 font-semibold">
                      <SelectValue placeholder="Select therapist..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      {therapists.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.specialty})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Session Date</Label>
                  <Input
                    type="date"
                    className="rounded-xl border-slate-200 bg-white text-xs h-9"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Start Time</Label>
                  <Select value={defaultStartTime} onValueChange={(val) => {
                    setDefaultStartTime(val);
                    if (timeToMin(defaultEndTime) <= timeToMin(val)) {
                      const [h, m] = val.split(":").map(Number);
                      setDefaultEndTime(`${String(Math.min(h + 1, 18)).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
                    }
                  }}>
                    <SelectTrigger className="rounded-xl border-slate-200 bg-white text-xs h-9 font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      {TIME_OPTIONS.slice(0, -1).map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">End Time</Label>
                  <Select value={defaultEndTime} onValueChange={setDefaultEndTime}>
                    <SelectTrigger className="rounded-xl border-slate-200 bg-white text-xs h-9 font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      {TIME_OPTIONS.filter((t) => timeToMin(t) > timeToMin(defaultStartTime)).map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: Flexible Multi-Day Weekly Pattern Builder */}
          {scheduleMode === "multi_day" && (
            <div className="space-y-3.5 p-4 rounded-2xl border border-sky-200 bg-sky-50/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-100 pb-2.5">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Settings2 className="w-3.5 h-3.5 text-sky-600" />
                    Weekly Days & Flexible Time Pattern
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Select days in a week and assign individual times/therapists for each day.
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                  {WEEKDAY_OPTIONS.map((day) => {
                    const isSel = selectedDays.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => toggleSelectDay(day.id)}
                        className={cn(
                          "px-2 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                          isSel
                            ? "bg-sky-600 text-white shadow-2xs"
                            : "text-slate-600 hover:bg-slate-100"
                        )}
                      >
                        {day.short}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Per-Day Detailed Configuration Cards */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {selectedDays.map((dayId) => {
                  const dayMeta = WEEKDAY_OPTIONS.find((w) => w.id === dayId);
                  const cfg = dayConfigs[dayId] || {
                    startTime: defaultStartTime,
                    endTime: defaultEndTime,
                    therapistId: defaultTherapistId,
                    type: defaultType,
                  };

                  return (
                    <div
                      key={dayId}
                      className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs px-2.5 py-0.5 rounded-lg bg-sky-100 text-sky-800">
                            {dayMeta ? dayMeta.label : dayId}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            Slot: {cfg.startTime} - {cfg.endTime}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleSelectDay(dayId)}
                          className="text-slate-400 hover:text-rose-600 text-xs p-1"
                          title="Remove day"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-bold text-slate-500">Start Time</Label>
                          <Select
                            value={cfg.startTime}
                            onValueChange={(val) => updateDayConfig(dayId, "startTime", val)}
                          >
                            <SelectTrigger className="h-8 text-xs rounded-lg border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200">
                              {TIME_OPTIONS.slice(0, -1).map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-bold text-slate-500">End Time</Label>
                          <Select
                            value={cfg.endTime}
                            onValueChange={(val) => updateDayConfig(dayId, "endTime", val)}
                          >
                            <SelectTrigger className="h-8 text-xs rounded-lg border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200">
                              {TIME_OPTIONS.filter((t) => timeToMin(t) > timeToMin(cfg.startTime)).map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-bold text-slate-500">Therapist</Label>
                          <Select
                            value={cfg.therapistId}
                            onValueChange={(val) => updateDayConfig(dayId, "therapistId", val)}
                          >
                            <SelectTrigger className="h-8 text-xs rounded-lg border-slate-200 truncate">
                              <SelectValue placeholder="Therapist" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200">
                              {therapists.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-bold text-slate-500">Service</Label>
                          <Select
                            value={cfg.type}
                            onValueChange={(val) => updateDayConfig(dayId, "type", val)}
                          >
                            <SelectTrigger className="h-8 text-xs rounded-lg border-slate-200 truncate">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200">
                              {SESSION_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.shortLabel || t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Recurrence Selection: 1 Week vs Recurring Multi-Week */}
              <div className="pt-2 border-t border-sky-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isRecurring}
                    onCheckedChange={setIsRecurring}
                    data-testid="toggle-recurring-schedule"
                  />
                  <div>
                    <Label className="text-xs font-bold text-slate-800 cursor-pointer">
                      {isRecurring ? "Repeat Weekly (Recurring Package)" : "One-Week Only (Plot This Week Only)"}
                    </Label>
                    <p className="text-[10px] text-slate-500">
                      {isRecurring
                        ? "Repeats this exact pattern across consecutive weeks"
                        : "Creates sessions for the selected days for 1 single week"}
                    </p>
                  </div>
                </div>

                {isRecurring && (
                  <div className="flex items-center gap-2">
                    <Label className="text-[11px] font-bold text-slate-600 shrink-0">Duration:</Label>
                    <Select value={recurringWeeks} onValueChange={setRecurringWeeks}>
                      <SelectTrigger className="w-40 h-8 text-xs rounded-lg border-slate-200 font-semibold bg-slate-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        <SelectItem value="4">4 Weeks (1 Month)</SelectItem>
                        <SelectItem value="8">8 Weeks (2 Months)</SelectItem>
                        <SelectItem value="12">12 Weeks (3 Months - Standard)</SelectItem>
                        <SelectItem value="16">16 Weeks (4 Months)</SelectItem>
                        <SelectItem value="24">24 Weeks (6 Months)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Real-time Calculation Badge */}
              <div className="p-2.5 rounded-xl bg-sky-100/70 border border-sky-200 text-xs font-semibold text-sky-900 flex items-center justify-between">
                <span>
                  ✨ Summary: <strong>{selectedDays.length} sessions/week</strong>{" "}
                  {isRecurring ? `× ${recurringWeeks} weeks = ${selectedDays.length * parseInt(recurringWeeks, 10)} total sessions` : "for 1 week"}
                </span>
                <span className="font-mono text-[11px] text-sky-800 bg-white px-2 py-0.5 rounded-md border border-sky-300">
                  {selectedDays.map((d) => d.slice(0, 3)).join(", ")}
                </span>
              </div>
            </div>
          )}

          {/* OPTIONAL: Pre-book recurring therapy session when booking an initial assessment */}
          {isAssessmentType && (
            <div className="space-y-3 rounded-2xl border border-purple-200 bg-purple-50/40 p-3.5 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-purple-950">Also Pre-book Recurring Therapy Schedule?</p>
                    <p className="text-[11px] text-purple-700">Optional: reserve regular therapy slots immediately after assessment</p>
                  </div>
                </div>
                <Switch
                  checked={bundleTherapy}
                  onCheckedChange={setBundleTherapy}
                  data-testid="bundle-therapy-toggle"
                />
              </div>

              {bundleTherapy && (
                <div className="space-y-3 pt-2.5 border-t border-purple-200/70">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-[11px] font-bold text-slate-700">Select Therapy Days in Week:</Label>
                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-purple-200">
                      {WEEKDAY_OPTIONS.map((day) => {
                        const isSel = bundleDays.includes(day.id);
                        return (
                          <button
                            key={day.id}
                            type="button"
                            onClick={() => toggleBundleSelectDay(day.id)}
                            className={cn(
                              "px-2 py-0.5 text-[11px] font-bold rounded-md transition-all cursor-pointer",
                              isSel
                                ? "bg-purple-600 text-white shadow-2xs"
                                : "text-slate-600 hover:bg-slate-100"
                            )}
                          >
                            {day.short}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bundled Day Configs */}
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {bundleDays.map((dayId) => {
                      const cfg = bundleDayConfigs[dayId] || {
                        startTime: "14:00",
                        endTime: "15:00",
                        therapistId: defaultTherapistId,
                        type: "therapy",
                      };
                      return (
                        <div key={dayId} className="p-2.5 rounded-xl bg-white border border-purple-200 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <span className="font-bold text-purple-900 block text-[11px]">{dayId}</span>
                            <Select value={cfg.startTime} onValueChange={(val) => updateBundleDayConfig(dayId, "startTime", val)}>
                              <SelectTrigger className="h-7 text-xs rounded-lg mt-0.5">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-slate-200">
                                {TIME_OPTIONS.slice(0, -1).map((t) => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[11px]">End Time</span>
                            <Select value={cfg.endTime} onValueChange={(val) => updateBundleDayConfig(dayId, "endTime", val)}>
                              <SelectTrigger className="h-7 text-xs rounded-lg mt-0.5">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-slate-200">
                                {TIME_OPTIONS.filter((t) => timeToMin(t) > timeToMin(cfg.startTime)).map((t) => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[11px]">Therapist</span>
                            <Select value={cfg.therapistId} onValueChange={(val) => updateBundleDayConfig(dayId, "therapistId", val)}>
                              <SelectTrigger className="h-7 text-xs rounded-lg mt-0.5 truncate">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-slate-200">
                                {therapists.map((t) => (
                                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[11px]">Service</span>
                            <Select value={cfg.type} onValueChange={(val) => updateBundleDayConfig(dayId, "type", val)}>
                              <SelectTrigger className="h-7 text-xs rounded-lg mt-0.5 truncate">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-slate-200">
                                {SESSION_TYPES.map((t) => (
                                  <SelectItem key={t.value} value={t.value}>{t.shortLabel || t.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-700">Therapy Start Date</Label>
                      <Input
                        type="date"
                        className="rounded-xl border-slate-200 bg-white text-xs h-8"
                        value={bundleStartDate}
                        onChange={(e) => setBundleStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-700">Package Recurrence</Label>
                      <Select value={bundleWeeks} onValueChange={setBundleWeeks}>
                        <SelectTrigger className="rounded-xl border-slate-200 bg-white text-xs h-8 font-semibold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200">
                          <SelectItem value="1">1 Week Only</SelectItem>
                          <SelectItem value="4">4 Weeks (1 Month)</SelectItem>
                          <SelectItem value="8">8 Weeks (2 Months)</SelectItem>
                          <SelectItem value="12">12 Weeks (3 Months - Standard)</SelectItem>
                          <SelectItem value="24">24 Weeks (6 Months)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Clinical / Booking Notes (Optional)</Label>
            <Textarea
              rows={2}
              className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white text-xs"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Session target focus, sensory accommodations, parent reminders..."
              data-testid="add-schedule-notes-input"
            />
          </div>

          {/* Conflict warning */}
          {singleConflicts.length > 0 && (
            <div
              className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 space-y-1"
              data-testid="add-schedule-conflict-warning"
            >
              <p className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Scheduling conflict detected
              </p>
              {singleConflicts.map((c, i) => (
                <p key={i}>• {c}</p>
              ))}
              <p className="text-[10px] text-amber-700 italic">Warning notification only — you can still proceed with scheduling.</p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button
            variant="outline"
            className="rounded-xl border-slate-200 text-xs font-bold h-9"
            onClick={() => onOpenChange(false)}
            data-testid="add-schedule-cancel-button"
          >
            Cancel
          </Button>
          <Button
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs h-9 shadow-xs"
            onClick={handleSubmit}
            data-testid="add-schedule-submit-button"
          >
            {singleConflicts.length > 0 ? "Schedule Anyway" : "Confirm Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
