import { getClientServiceIds } from "@/domain/client";
import { findHoliday, holidayDateSet, holidayMessage } from "@/domain/holiday";
import { useHolidays } from "@/stores/holidaysStore";
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/stores/authStore";
import { ClientCombobox } from "@/shared/components/ClientCombobox";
import { toast } from "sonner";
import { AlertTriangle, Check, ChevronsUpDown, CalendarPlus, UserCheck, Trash2, Settings2, Info, Snowflake } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import DateFilterPicker from "@/shared/components/DateFilterPicker";
import { Textarea } from "@/shared/ui/textarea";
import { Switch } from "@/shared/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/shared/ui/command";
import { useClients } from "@/stores/clientsStore";
import { useTherapists } from "@/stores/therapistsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useCredits } from "@/stores/creditsStore";
import { useSessionActions } from "@/features/schedule/hooks/useSessionActions";
import { TIME_OPTIONS, WEEKDAY_OPTIONS, buildRecurringSchedules, checkConflicts, timeToMin } from "@/domain/schedule";
import { todayStr, uid } from "@/shared/lib/id";
import { cn } from "@/shared/lib/utils";

export const AddScheduleModal = ({
  open,
  onOpenChange,
  defaults,
  defaultClientId,
  defaultType: defaultTypeProp,
  onCreated,
}) => {
  const { clients } = useClients();
  const { therapists } = useTherapists();
  const { schedules } = useSchedules();
  const { getRecordForClient } = useCredits();
  const { auth } = useAuth();
  const sessionActions = useSessionActions();
  const { holidays } = useHolidays();

  // Stable primitives extracted from defaults / props to prevent infinite re-render loops
  const defaultsClientId = defaults?.clientId || defaultClientId || "";
  const defaultsTherapistId = defaults?.therapistId || "";
  const defaultsDate = defaults?.date || "";
  const defaultsStartTime = defaults?.startTime || "09:00";
  const defaultsEndTime = defaults?.endTime || "";
  const defaultsType = defaults?.type || defaultTypeProp || "therapy";
  const defaultsRecurring = Boolean(defaults?.defaultRecurring || defaults?.multiDay);
  const defaultsLockClient = Boolean(defaults?.lockClient);
  const defaultsLockType = Boolean(defaults?.lockType);

  // Primary appointment state
  const [clientId, setClientId] = useState("");
  const [defaultTherapistId, setDefaultTherapistId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [defaultStartTime, setDefaultStartTime] = useState("09:00");
  const [defaultEndTime, setDefaultEndTime] = useState("10:00");
  const [defaultType, setDefaultType] = useState("therapy");
  const [notes, setNotes] = useState("");
  const [singleCreditPackageId, setSingleCreditPackageId] = useState("");

  // Mode: "single" (1 session on specific date) vs "multi_day" (weekly schedule pattern)
  const [scheduleMode, setScheduleMode] = useState("single"); // "single" | "multi_day"

  // Multi-day pattern state: array of selected day IDs, e.g. ["Monday", "Tuesday", "Wednesday"]
  const [selectedDays, setSelectedDays] = useState(["Monday"]);
  // Per-day custom configuration: { [dayId]: { startTime, endTime, therapistId, type } }
  const [dayConfigs, setDayConfigs] = useState({});

  // Recurrence settings for multi-day pattern:
  const [isRecurring, setIsRecurring] = useState(true);
  const [recurringWeeks, setRecurringWeeks] = useState("12");

  const fallbackTherapistId = therapists[0]?.id || "";

  useEffect(() => {
    if (!open) return;

    setClientId(defaultsClientId);
    const initialTh = defaultsTherapistId || fallbackTherapistId;
    setDefaultTherapistId(initialTh);
    const initialDate = defaultsDate || todayStr();
    setDate(initialDate);

    setDefaultStartTime(defaultsStartTime);
    if (defaultsEndTime) {
      setDefaultEndTime(defaultsEndTime);
    } else {
      const [h, m] = defaultsStartTime.split(":").map(Number);
      setDefaultEndTime(`${String(Math.min(h + 1, 18)).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }

    setDefaultType(defaultsType);
    setNotes("");

    if (defaultsType === "assessment") {
      setScheduleMode("single");
    } else if (defaultsRecurring) {
      setScheduleMode("multi_day");
    } else {
      setScheduleMode("single");
    }

    // Initialize default day config for Monday & Wednesday
    setSelectedDays(["Monday", "Wednesday"]);
    setDayConfigs({
      Monday: { startTime: "14:00", endTime: "15:00", therapistId: initialTh },
      Wednesday: { startTime: "16:00", endTime: "17:00", therapistId: initialTh },
    });
    setIsRecurring(Boolean(defaultsRecurring || true));
    setRecurringWeeks("12");
  }, [
    open,
    defaultsClientId,
    defaultsTherapistId,
    fallbackTherapistId,
    defaultsDate,
    defaultsStartTime,
    defaultsEndTime,
    defaultsType,
    defaultsRecurring
  ]);

  const selectableClients = useMemo(
    () => clients.filter((c) => c.status !== "discharged"),
    [clients]
  );
  const lockedClient = defaultsLockClient ? clients.find((c) => c.id === defaultsClientId) : null;
  const selectedClient = clients.find((c) => c.id === clientId);
  const clientRecord = useMemo(() => (clientId ? getRecordForClient(clientId) : null), [clientId, getRecordForClient]);
  // Pilihan paket: hanya paket yang masih punya sisa (urutan FIFO; paket 0 sesi disembunyikan agar tidak jadi data sampah).
  // Bila tidak ada paket bersisa sama sekali, tampilkan paket terakhir (0 sesi = Frozen) sebagai satu-satunya pilihan.
  // Kuota cancel / pemotongan kredit sesi ini mengikuti paket yang dipilih (`creditPackageId`).
  const clientPackages = useMemo(() => {
    const all = clientRecord?.packages || [];
    const active = all.filter((p) => p.remainingCredit > 0);
    return active.length ? active : all.length ? [all[all.length - 1]] : [];
  }, [clientRecord]);

  // Service tidak dipilih di form jadwal: diturunkan dari layanan client (keputusan klien).
  const derivedServiceType = getClientServiceIds(selectedClient)[0] || null;

  // Helper to update per-day config
  const updateDayConfig = (dayId, field, value) => {
    setDayConfigs((prev) => {
      const cur = prev[dayId] || {
        startTime: defaultStartTime,
        endTime: defaultEndTime,
        therapistId: defaultTherapistId,
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
            },
          }));
        }
        return [...prev, dayId];
      }
    });
  };

  // Helper for bundle day config
  const isAssessmentType = defaultsType === "assessment" || defaultTypeProp === "assessment" || defaultType === "assessment";

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
      const holiday = findHoliday(holidays, date, selectedClient?.branchId);
      if (holiday) {
        toast.error(holidayMessage(holiday));
        return;
      }
      const singleBase = {
        id: uid(),
        clientId,
        branchId: selectedClient?.branchId || "branch-sby-timur",
        creditPackageId: isAssessmentType ? null : (singleCreditPackageId || (clientPackages[0]?.id || null)),
        type: isAssessmentType ? "assessment" : "therapy",
        serviceType: derivedServiceType,
        therapistId: defaultTherapistId,
        date,
        startTime: defaultStartTime,
        endTime: defaultEndTime,
        status: "scheduled",
        isRecurring: false,
        recurrenceRule: "none",
        bookingNote: notes.trim() || null,
        createdBy: auth?.staffName || auth?.role || null,
        activitySection: "",
        homeworkSection: "",
      };
      const { assessmentScheduled } = sessionActions.createSessions([singleBase]);
      createdList.push(singleBase);
      if (assessmentScheduled) toast.info(`${selectedClient?.clientName || "Client"} otomatis beralih ke tahap "Asesmen Terjadwal".`);
      toast.success(`${isAssessmentType ? "Sesi asesmen" : "Sesi terapi"} berhasil dijadwalkan untuk ${date}.`);
    } else {
      // Multi-day pattern (therapy only)
      if (selectedDays.length === 0) {
        toast.error("Please select at least one day for the weekly schedule.");
        return;
      }
      const weeksCount = isRecurring ? parseInt(recurringWeeks, 10) || 12 : 1;
      const baseSession = {
        id: uid(),
        clientId,
        branchId: selectedClient?.branchId || "branch-sby-timur",
        creditPackageId: clientPackages[0]?.id || null,
        type: "therapy",
        serviceType: derivedServiceType,
        therapistId: defaultTherapistId,
        date,
        startTime: defaultStartTime,
        endTime: defaultEndTime,
        status: "scheduled",
        bookingNote: notes.trim() || null,
        createdBy: auth?.staffName || auth?.role || null,
        activitySection: "",
        homeworkSection: "",
      };

      // Jadwal berulang melewati tanggal libur (tidak dibuatkan sesi)
      const holidayDates = holidayDateSet(holidays, selectedClient?.branchId);
      const rawCount = buildRecurringSchedules(baseSession, weeksCount, selectedDays, dayConfigs).length;
      const seriesId = uid(); // semua hari pada pola ini = satu seri (satu masa berlaku)
      const schedulesList = buildRecurringSchedules(baseSession, weeksCount, selectedDays, dayConfigs, holidayDates).map((s) => ({ ...s, seriesId }));
      if (schedulesList.length === 0) {
        toast.error("Semua tanggal pada pola ini jatuh di hari libur. Pilih tanggal atau hari lain.");
        return;
      }
      if (rawCount > schedulesList.length) toast.info(`${rawCount - schedulesList.length} tanggal dilewati karena hari libur.`);
      sessionActions.createSessions(schedulesList);
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

    if (onCreated) onCreated(createdList[0], createdList);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[calc(100dvh-2.5rem)] flex flex-col p-0 overflow-hidden rounded-2xl border-slate-200 shadow-2xl"
        data-testid="add-schedule-modal"
      >
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-slate-100 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold shrink-0 shadow-xs">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-extrabold text-slate-900">
                {isAssessmentType
                  ? "Penjadwalan Asesmen Klinis"
                  : "Clinical Schedule & Weekly Timetable Planner"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                {isAssessmentType
                  ? "Jadwalkan sesi evaluasi asesmen intake awal bersama praktisi terapis (Tanpa kuota kredit)."
                  : "Configure flexible single dates or multi-day weekly patterns with custom times per day."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
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
              <ClientCombobox clients={selectableClients} value={clientId} onChange={setClientId} testId="add-schedule-client-select" />
            )}
          </div>

          {/* Client tanpa kredit sisa: sesi terapi tetap boleh dibuat, berstatus Frozen sampai paket aktif */}
          {!isAssessmentType && clientId && !clientPackages.some((p) => p.remainingCredit > 0) && (
            <div className="flex items-start gap-2 rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-xs text-cyan-900" data-testid="add-schedule-frozen-notice">
              <Snowflake className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                Client ini <strong>tidak punya kredit sisa</strong>. Sesi tetap bisa dijadwalkan dan berstatus <strong>Frozen</strong>
                {" "}sampai Finance mengaktifkan paket baru; setelah itu jadwal mendatang otomatis memakai paket yang aktif.
              </p>
            </div>
          )}

          {/* Scheduling Mode Switcher (Hanya untuk Sesi Terapi Rutin, Asesmen khusus Single Date) */}
          {!defaults.lockType && !isAssessmentType && (
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
                Single Session (One Specific Date)
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
                Weekly Pattern Builder (Custom Times per Day)
              </button>
            </div>
          )}

          {/* MODE 1: Single Session Form */}
          {scheduleMode === "single" && (
            <div className="space-y-3 p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Assigned Therapist</Label>
                  <Select value={defaultTherapistId} onValueChange={setDefaultTherapistId}>
                    <SelectTrigger className="border-slate-200 bg-white text-xs font-semibold">
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

                {isAssessmentType ? (
                  <div className="sm:col-span-2 p-3 rounded-xl bg-sky-50 border border-sky-200 flex items-start gap-2.5 text-xs text-sky-900">
                    <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sky-950">Sesi Asesmen Klinis (Tanpa Kuota Kredit)</p>
                      <p className="text-[11px] text-sky-700 leading-relaxed mt-0.5">
                        Jadwal ini digunakan khusus untuk mengevaluasi dan meng-asses kondisi klien di awal (Pipeline Inquiry Step 4), sehingga tidak memotong saldo paket kredit terapi.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-bold text-slate-700">Paket Kredit yang Digunakan</Label>
                    <Select
                      value={singleCreditPackageId || (clientPackages[0]?.id || "none")}
                      onValueChange={(val) => setSingleCreditPackageId(val === "none" ? "" : val)}
                    >
                      <SelectTrigger className="border-slate-200 bg-white text-xs font-semibold">
                        <SelectValue placeholder="Pilih paket kredit..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        {clientPackages.length === 0 ? (
                          <SelectItem value="none">0 Kredit (Sesi Akan Berstatus Frozen )</SelectItem>
                        ) : (
                          clientPackages.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.packageName} — {p.remainingCredit > 0 ? `Sisa ${p.remainingCredit} Sesi` : "Habis (Frozen)"}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Session Date (DD/MM/YYYY)</Label>
                  <DateFilterPicker
                    placeholder="DD/MM/YYYY"
                    className="w-full bg-white h-9"
                    value={date}
                    onChange={(e) => setDate(e?.target?.value ?? e)}
                  />
                  {findHoliday(holidays, date, selectedClient?.branchId) && (
                    <p className="text-[11px] font-semibold text-rose-600" data-testid="holiday-warning">
                      Hari libur: {findHoliday(holidays, date, selectedClient?.branchId).name}
                    </p>
                  )}
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
                    <SelectTrigger className="border-slate-200 bg-white text-xs font-semibold">
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
                    <SelectTrigger className="border-slate-200 bg-white text-xs font-semibold">
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

                <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
                  {WEEKDAY_OPTIONS.map((day) => {
                    const isSel = selectedDays.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => toggleSelectDay(day.id)}
                        className={cn(
                          "min-w-[36px] h-9 px-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center",
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Start Time</Label>
                          <Select
                            value={cfg.startTime}
                            onValueChange={(val) => updateDayConfig(dayId, "startTime", val)}
                          >
                            <SelectTrigger className="text-xs border-slate-200 font-semibold">
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
                          <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">End Time</Label>
                          <Select
                            value={cfg.endTime}
                            onValueChange={(val) => updateDayConfig(dayId, "endTime", val)}
                          >
                            <SelectTrigger className="text-xs border-slate-200 font-semibold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200">
                              {TIME_OPTIONS.filter((t) => timeToMin(t) > timeToMin(cfg.startTime)).map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Therapist</Label>
                          <Select
                            value={cfg.therapistId}
                            onValueChange={(val) => updateDayConfig(dayId, "therapistId", val)}
                          >
                            <SelectTrigger className="text-xs border-slate-200 font-semibold truncate">
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

                        <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                          <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Paket Kredit</Label>
                          <Select
                            value={cfg.creditPackageId || (clientPackages[0]?.id || "none")}
                            onValueChange={(val) => updateDayConfig(dayId, "creditPackageId", val === "none" ? null : val)}
                          >
                            <SelectTrigger className="text-xs border-slate-200 font-semibold truncate">
                              <SelectValue placeholder="Pilih Paket" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200">
                              {clientPackages.length === 0 ? (
                                <SelectItem value="none">0 Kredit (Frozen)</SelectItem>
                              ) : (
                                clientPackages.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.packageName} ({p.remainingCredit > 0 ? `${p.remainingCredit} sisa` : "Habis/Frozen"})
                                  </SelectItem>
                                ))
                              )}
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
                    <p className="text-[11px] text-slate-500">
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
                      <SelectTrigger className="w-40 text-xs border-slate-200 font-semibold bg-slate-50">
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
                  Summary: <strong>{selectedDays.length} sessions/week</strong>{" "}
                  {isRecurring ? `× ${recurringWeeks} weeks = ${selectedDays.length * parseInt(recurringWeeks, 10)} total sessions` : "for 1 week"}
                </span>
                <span className="font-mono text-[11px] text-sky-800 bg-white px-2 py-0.5 rounded-md border border-sky-300">
                  {selectedDays.map((d) => d.slice(0, 3)).join(", ")}
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Catatan Penjadwalan (Opsional)</Label>
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
              <p className="text-[11px] text-amber-700 italic">Warning notification only — you can still proceed with scheduling.</p>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 shrink-0 flex items-center justify-end gap-2.5">
          <Button
            variant="outline"
            className="border-slate-200 font-bold px-4"
            onClick={() => onOpenChange(false)}
            data-testid="add-schedule-cancel-button"
          >
            Cancel
          </Button>
          <Button
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-5 shadow-xs"
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
