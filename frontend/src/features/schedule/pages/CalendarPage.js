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
  CalendarDays, Hourglass, Undo2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import DateFilterPicker from "@/shared/components/DateFilterPicker";
import { SearchInput } from "@/shared/components/FilterBar";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { WeeklyCalendar, CalendarLegend } from "@/features/schedule/components/calendar/WeeklyCalendar";
import { DayAgenda } from "@/features/schedule/components/calendar/DayAgenda";
import { AddScheduleModal } from "@/features/schedule/components/calendar/AddScheduleModal";
import { SessionDetailModal } from "@/features/schedule/components/calendar/SessionDetailModal";
import { BulkRevertDialog } from "@/features/schedule/components/calendar/BulkRevertDialog";
import { DeductCreditChoice } from "@/features/schedule/components/calendar/DeductCreditChoice";
import { useSchedules } from "@/stores/schedulesStore";
import { useClients } from "@/stores/clientsStore";
import { useTherapists } from "@/stores/therapistsStore";
import { useCredits } from "@/stores/creditsStore";
import { useHolidays } from "@/stores/holidaysStore";
import { findHoliday } from "@/domain/holiday";
import { useMasterData } from "@/stores/masterDataStore";
import { CLEAR_PENDING_PATCH, getOriginSlot, scheduleSlot } from "@/domain/schedule";
import { useSessionActions } from "@/features/schedule/hooks/useSessionActions";
import { fmtDate } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

export default function CalendarPage() {
  const { schedules } = useSchedules();
  const sessionActions = useSessionActions();
  const { holidays } = useHolidays();
  const { clients } = useClients();
  const { therapists } = useTherapists();
  const { getRecordForClient } = useCredits();
  const { getCancelReasonLabel } = useMasterData();

  // Mobile defaults to day agenda, desktop to weekly grid
  const [view, setView] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "day" : "week"
  );
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [therapistFilter, setTherapistFilter] = useState("all");
  const [showDischarged, setShowDischarged] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllPending, setShowAllPending] = useState(false);

  // Bulk mode states
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState([]);
  const [bulkRescheduleOpen, setBulkRescheduleOpen] = useState(false);
  const [bulkCancelOpen, setBulkCancelOpen] = useState(false);
  const [bulkRevertOpen, setBulkRevertOpen] = useState(false);

  // Bulk Reschedule form states
  const [bulkTargetDate, setBulkTargetDate] = useState("");
  const [bulkDayOffset, setBulkDayOffset] = useState("0");
  const [bulkTargetTherapist, setBulkTargetTherapist] = useState("keep");

  // Bulk Cancel form states
  const [bulkCancelReason, setBulkCancelReason] = useState("leave");
  const [bulkCancelNote, setBulkCancelNote] = useState("");
  const [bulkDeductChoice, setBulkDeductChoice] = useState(""); // "" | "deduct" | "keep" (wajib dipilih)

  // Modals
  const [addModal, setAddModal] = useState({ open: false, defaults: {} });
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionOpen, setSessionOpen] = useState(false);

  // Map of discharged client IDs
  const dischargedClientIds = useMemo(
    () => new Set(clients.filter((c) => c.status === "discharged").map((c) => c.id)),
    [clients]
  );

  // Teks pencarian per sesi: nama anak, orang tua, kode akses, terapis, dan catatan
  const searchIndex = useMemo(() => {
    const clientById = new Map(clients.map((c) => [c.id, c]));
    const therapistById = new Map(therapists.map((t) => [t.id, t]));
    const index = new Map();
    schedules.forEach((s) => {
      const c = clientById.get(s.clientId);
      const t = therapistById.get(s.therapistId);
      index.set(
        s.id,
        [c?.clientName, c?.parentName, c?.clientCode, t?.name, s.notes, s.cancelReason]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
      );
    });
    return index;
  }, [schedules, clients, therapists]);

  const query = searchQuery.trim().toLowerCase();

  // Filter visible schedules based on therapist filter, discharge rule, and search
  const visibleSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (therapistFilter !== "all" && s.therapistId !== therapistFilter) return false;
      if (!showDischarged && dischargedClientIds.has(s.clientId)) return false;
      if (query && !searchIndex.get(s.id)?.includes(query)) return false;
      return true;
    });
  }, [schedules, therapistFilter, showDischarged, dischargedClientIds, query, searchIndex]);

  // Hasil pencarian terdekat dengan hari ini, untuk lompat cepat ke sesi
  const searchResults = useMemo(() => {
    if (!query) return [];
    const now = Date.now();
    return [...visibleSchedules]
      .filter((s) => s.date)
      .sort((a, b) => Math.abs(parseISO(a.date).getTime() - now) - Math.abs(parseISO(b.date).getTime() - now));
  }, [visibleSchedules, query]);

  // Sesi reschedule yang belum punya jadwal pengganti (perlu tindak lanjut admin)
  const pendingSessions = useMemo(
    () => visibleSchedules.filter((s) => s.status === "reschedule_pending").sort((a, b) => (a.date || "").localeCompare(b.date || "")),
    [visibleSchedules]
  );

  const jumpToSession = (s) => {
    const d = parseISO(s.date);
    setWeekStart(startOfWeek(d, { weekStartsOn: 1 }));
    setSelectedDay(d);
    setSelectedSession(s);
    setSessionOpen(true);
  };

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

  // Bulk Action: Complete (aturan kredit & pipeline sama dengan complete tunggal)
  const handleBulkComplete = () => {
    if (selectedSessionIds.length === 0) return;
    sessionActions.bulkComplete(selectedSessionIds);
    toast.success(`Bulk operation complete: ${selectedSessionIds.length} session(s) marked as Completed.`);
    clearSelection();
  };

  // Bulk Action: Reschedule Confirm
  const handleBulkRescheduleConfirm = () => {
    if (selectedSessionIds.length === 0) return;
    const selectedSchedules = schedules.filter((s) => selectedSessionIds.includes(s.id));
    const offsetDays = parseInt(bulkDayOffset, 10) || 0;
    const itemsMap = {};

    const blocked = [];
    selectedSchedules.forEach((s) => {
      let finalDate = s.date;
      if (bulkTargetDate) {
        finalDate = bulkTargetDate;
      } else if (offsetDays !== 0) {
        finalDate = format(addDays(parseISO(s.date), offsetDays), "yyyy-MM-dd");
      }

      if (finalDate !== s.date && findHoliday(holidays, finalDate, s.branchId)) {
        blocked.push(finalDate);
        return;
      }

      itemsMap[s.id] = {
        date: finalDate,
        status: "rescheduled",
        therapistId: bulkTargetTherapist !== "keep" ? bulkTargetTherapist : s.therapistId,
        // Jejak jadwal asal agar sesi yang dipindah massal tetap bertanda
        rescheduledFrom: getOriginSlot(s) || scheduleSlot(s),
        rescheduledPrev: scheduleSlot(s),
        revertedAt: null,
        rescheduledAt: new Date().toISOString(),
        ...CLEAR_PENDING_PATCH,
      };
    });

    if (blocked.length > 0) toast.warning(`${blocked.length} sesi dilewati karena tanggal tujuan adalah hari libur.`);
    if (Object.keys(itemsMap).length === 0) return;
    sessionActions.bulkReschedule(itemsMap);
    toast.success(`Bulk operation complete: ${Object.keys(itemsMap).length} session(s) rescheduled.`);
    setBulkRescheduleOpen(false);
    clearSelection();
  };

  // Bulk Action: Revert (batalkan completed / cancel / reschedule). Sesi yang slot-nya terisi dilewati.
  const handleBulkRevertConfirm = (reason) => {
    const result = sessionActions.bulkRevert(selectedSessionIds, { reason });
    const parts = [`${result.reverted} sesi di-revert`];
    if (result.creditChange > 0) parts.push(`+${result.creditChange} kredit dikembalikan`);
    if (result.reverted > 0) toast.success(`${parts.join(", ")}.`);
    const conflicts = result.skipped.filter((x) => x.cause === "conflict").length;
    const statusSkips = result.skipped.length - conflicts;
    if (conflicts > 0) toast.warning(`${conflicts} sesi dilewati karena slot-nya sudah terisi sesi lain.`);
    if (statusSkips > 0) toast.info(`${statusSkips} sesi dilewati karena statusnya tidak bisa di-revert.`);
    if (result.reverted === 0 && result.skipped.length === 0) toast.info("Tidak ada sesi yang di-revert.");
    clearSelection();
  };

  // Bulk Action: Cancel Confirm. "leave" = masuk kuota cancel client; "other" = tanpa perubahan kredit.
  const handleBulkCancelConfirm = () => {
    if (selectedSessionIds.length === 0) return;
    if (!bulkDeductChoice) {
      toast.error("Pilih dulu: potong 1 kredit atau jangan potong kredit.");
      return;
    }
    sessionActions.bulkCancel(selectedSessionIds, { mode: bulkCancelReason, note: bulkCancelNote, deductCredit: bulkDeductChoice === "deduct" });
    toast.success(`Bulk operation complete: ${selectedSessionIds.length} session(s) cancelled.`);
    setBulkCancelOpen(false);
    setBulkDeductChoice("");
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
              "font-semibold border-slate-200",
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
            className="bg-sky-600 hover:bg-sky-700 text-white font-semibold gap-2 shadow-sm shadow-sky-600/20"
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
            <Button size="sm" variant="ghost" className="font-semibold text-sky-800 hover:bg-sky-100" onClick={selectAllVisible}>
              Select All Visible
            </Button>
            {selectedSessionIds.length > 0 && (
              <Button size="sm" variant="ghost" className="font-semibold text-rose-600 hover:bg-rose-50" onClick={clearSelection}>
                Clear Selection
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
              disabled={selectedSessionIds.length === 0}
              onClick={handleBulkComplete}
              data-testid="bulk-complete-button"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Bulk Complete
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 bg-white border-slate-200 font-semibold"
              disabled={selectedSessionIds.length === 0}
              onClick={() => setBulkRescheduleOpen(true)}
              data-testid="bulk-reschedule-button"
            >
              <CalendarClock className="w-3.5 h-3.5 text-amber-600" /> Bulk Reschedule
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 bg-white text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50 font-semibold"
              disabled={selectedSessionIds.length === 0}
              onClick={() => setBulkCancelOpen(true)}
              data-testid="bulk-cancel-button"
            >
              <XCircle className="w-3.5 h-3.5" /> Bulk Cancel
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 bg-white text-violet-700 hover:text-violet-800 border-violet-200 hover:bg-violet-50 font-semibold"
              disabled={selectedSessionIds.length === 0}
              onClick={() => setBulkRevertOpen(true)}
              data-testid="bulk-revert-button"
            >
              <Undo2 className="w-3.5 h-3.5" /> Bulk Revert
            </Button>
          </div>
        </div>
      )}

      {/* Date controls and filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" className="border-slate-200 shadow-2xs" onClick={goPrev} aria-label="Previous" data-testid="calendar-prev-week-button">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </Button>
          <Button variant="outline" className="border-slate-200 font-bold text-slate-700 px-4 shadow-2xs" onClick={goToday} data-testid="calendar-today-button">
            Today
          </Button>
          <Button variant="outline" size="icon" className="border-slate-200 shadow-2xs" onClick={goNext} aria-label="Next" data-testid="calendar-next-week-button">
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
                "px-3 py-2 sm:py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
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
                "px-3 py-2 sm:py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
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
            <SelectTrigger className="w-44 sm:w-48 text-xs border-slate-200 bg-white font-semibold" data-testid="calendar-therapist-filter">
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

        <div className="w-full space-y-2" data-testid="calendar-search">
          <SearchInput
            className="min-w-0"
            placeholder="Cari sesi: nama anak, orang tua, kode akses, atau terapis..."
            value={searchQuery}
            onChange={setSearchQuery}
            data-testid="calendar-search-input"
          />
          {query && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 space-y-1.5">
              <p className="text-xs font-semibold text-slate-600 px-1">
                {searchResults.length === 0
                  ? "Tidak ada sesi yang cocok. Coba kata kunci lain atau tampilkan client discharged."
                  : `${searchResults.length} sesi cocok — kalender hanya menampilkan sesi ini. Klik untuk melompat ke sesinya.`}
              </p>
              {searchResults.length > 0 && (
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 max-h-52 overflow-y-auto">
                  {searchResults.slice(0, 8).map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => jumpToSession(s)}
                        className="w-full flex items-center justify-between gap-2 text-left px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 cursor-pointer"
                      >
                        <span className="min-w-0">
                          <span className="block text-xs font-bold text-slate-900 truncate">{getClientName(s.clientId)}</span>
                          <span className="block text-[11px] text-slate-500 truncate">
                            {fmtDate(s.date)} • {s.startTime}–{s.endTime} • {getTherapistName(s.therapistId)}
                          </span>
                        </span>
                        <StatusBadge status={s.status} showDot={false} className="shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tindak lanjut: reschedule tanpa jadwal pengganti */}
      {pendingSessions.length > 0 && (
        <div className="rounded-2xl border border-dashed border-orange-300 bg-orange-50/60 p-4 space-y-3" data-testid="pending-reschedule-panel">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-extrabold text-orange-950 flex items-center gap-2">
              <Hourglass className="w-4 h-4 text-orange-600" />
              {pendingSessions.length} sesi menunggu jadwal pengganti
            </p>
            <p className="text-[11px] text-orange-800/80 font-medium">Kredit tidak berubah. Tetapkan jadwal baru atau batalkan tanpa potong kredit.</p>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(showAllPending ? pendingSessions : pendingSessions.slice(0, 4)).map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => jumpToSession(s)}
                  className="w-full text-left flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-white border border-orange-200 hover:border-orange-400 cursor-pointer"
                  data-testid={`pending-item-${s.id}`}
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-slate-900 truncate">{getClientName(s.clientId)}</span>
                    <span className="block text-[11px] text-slate-500 truncate">
                      Asal {fmtDate(s.date)} • {s.startTime}–{s.endTime}
                      {s.pendingReason ? ` • ${getCancelReasonLabel(s.pendingReason)}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] font-extrabold text-orange-800">Tindak lanjuti</span>
                </button>
              </li>
            ))}
          </ul>
          {pendingSessions.length > 4 && (
            <Button variant="ghost" size="sm" className="text-orange-900 hover:bg-orange-100 font-bold" onClick={() => setShowAllPending((v) => !v)}>
              {showAllPending ? "Tampilkan lebih sedikit" : `Lihat semua (${pendingSessions.length})`}
            </Button>
          )}
        </div>
      )}

      {/* Main View */}
      {view === "week" ? (
        <WeeklyCalendar
          weekStart={weekStart}
          schedules={visibleSchedules}
          getClientName={getClientName}
          getTherapistName={getTherapistName}
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
                <SelectTrigger className="border-slate-200 bg-slate-50 focus:bg-white" data-testid="bulk-reschedule-offset-select">
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
                <SelectTrigger className="border-slate-200 bg-slate-50 focus:bg-white" data-testid="bulk-reschedule-therapist-select">
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
            <Button variant="outline" className="border-slate-200" onClick={() => setBulkRescheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold"
              onClick={handleBulkRescheduleConfirm}
              data-testid="bulk-reschedule-confirm-button"
            >
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Revert Dialog */}
      <BulkRevertDialog
        key={bulkRevertOpen ? "open" : "closed"}
        open={bulkRevertOpen}
        onOpenChange={setBulkRevertOpen}
        sessions={schedules.filter((s) => selectedSessionIds.includes(s.id))}
        previewRevert={sessionActions.previewRevert}
        onConfirm={handleBulkRevertConfirm}
      />

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
                <SelectTrigger className="border-slate-200 bg-slate-50 focus:bg-white" data-testid="bulk-cancel-reason-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="leave">Leave — izin / keperluan keluarga</SelectItem>
                  <SelectItem value="other">Other Reason — alasan lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DeductCreditChoice value={bulkDeductChoice} onChange={setBulkDeductChoice} bulk testId="bulk-cancel-deduct" />

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Cancellation Note (Optional)</Label>
              <Input
                placeholder="Brief reason for cancellation..."
                className="border-slate-200 bg-slate-50 focus:bg-white"
                value={bulkCancelNote}
                onChange={(e) => setBulkCancelNote(e.target.value)}
                data-testid="bulk-cancel-note-input"
              />
            </div>
          </div>
          <DialogFooter className="mt-5 gap-2">
            <Button variant="outline" className="border-slate-200" onClick={() => setBulkCancelOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white font-bold" onClick={handleBulkCancelConfirm} disabled={!bulkDeductChoice} data-testid="bulk-cancel-confirm-button">
              Confirm Cancel All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

