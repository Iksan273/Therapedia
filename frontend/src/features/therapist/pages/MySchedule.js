import React, { useMemo, useState } from "react";
import { useActingTherapist } from "@/features/therapist/hooks/useActingTherapist";
import { ViewAsTherapistBar } from "@/features/therapist/components/ViewAsTherapistBar";
import { ClientCombobox } from "@/shared/components/ClientCombobox";
import { Link } from "react-router-dom";
import { addDays, addWeeks, format, startOfWeek, subDays, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight, Stethoscope, ExternalLink, User, BookOpen, ClipboardCheck, FileCheck2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { SearchInput } from "@/shared/components/FilterBar";
import { matchesClientSearch } from "@/domain/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { CalendarLegend, DayAgenda, SessionDetailModal, WeeklyCalendar } from "@/features/schedule";
import { useSchedules } from "@/stores/schedulesStore";
import { useClients } from "@/stores/clientsStore";
import { useTherapists } from "@/stores/therapistsStore";
import { cn } from "@/shared/lib/utils";

export default function MySchedule() {
  const { schedules } = useSchedules();
  const { clients } = useClients();
  const { getTherapist } = useTherapists();
  const acting = useActingTherapist();

  const [view, setView] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "day" : "week"
  );
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [clientFilter, setClientFilter] = useState("all");
  const [reportFilter, setReportFilter] = useState("all"); // all | pending | filled
  const [search, setSearch] = useState(""); // nama anak / ortu / kode client
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionOpen, setSessionOpen] = useState(false);

  const therapist = getTherapist(acting.therapistId);

  // Filter schedules exclusively for this therapist
  const mySchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (s.therapistId !== acting.therapistId) return false;
      if (clientFilter !== "all" && s.clientId !== clientFilter) return false;
      if (search.trim() && !matchesClientSearch(clients.find((c) => c.id === s.clientId), search)) return false;
      return true;
    });
  }, [schedules, acting.therapistId, clientFilter, search, clients]);

  // Unique clients handled by this therapist
  const myClients = useMemo(() => {
    const ids = new Set(schedules.filter((s) => s.therapistId === acting.therapistId).map((s) => s.clientId));
    return clients.filter((c) => ids.has(c.id));
  }, [schedules, acting.therapistId, clients]);

  // Report statistics (Activity, Note & Homework)
  const reportMetrics = useMemo(() => {
    const total = mySchedules.length;
    const filled = mySchedules.filter((s) => s.activitySection || s.noteSection || s.progressNote || s.homeworkSection).length;
    const pending = mySchedules.filter(
      (s) => !s.activitySection && !s.noteSection && !s.progressNote && !s.homeworkSection && s.status !== "cancelled" && s.status !== "off"
    ).length;
    return { total, filled, pending };
  }, [mySchedules]);

  // Displayed schedules based on reportFilter
  const displayedSchedules = useMemo(() => {
    return mySchedules.filter((s) => {
      const hasReport = Boolean(s.activitySection || s.noteSection || s.progressNote || s.homeworkSection);
      if (reportFilter === "pending") return !hasReport && s.status !== "cancelled" && s.status !== "off";
      if (reportFilter === "filled") return hasReport;
      return true;
    });
  }, [mySchedules, reportFilter]);

  const getClientName = (clientId) => {
    const c = clients.find((cl) => cl.id === clientId);
    return c ? c.clientName : "Unknown";
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

  return (
    <div className="space-y-6" data-testid="my-schedule-page">
      <ViewAsTherapistBar acting={acting} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-semibold mb-2">
            <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
            Therapist Clinical Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            My Clinical Schedule
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {therapist ? `${therapist.name} (${therapist.specialty})` : "Specialist Practitioner"} •{" "}
            <strong className="text-slate-800 tabular-nums">{mySchedules.length}</strong> sesi terdaftar.
            <span className="block text-xs text-slate-400 mt-0.5">
              Reschedule & pembatalan dikelola Admin Jadwal • Terapis dapat mengisi laporan sesi kapan pun
            </span>
          </p>
        </div>

        <Link to="/therapist/summary" className="self-start sm:self-auto shrink-0">
          <Button
            size="sm"
            className="bg-[#007AFF] hover:bg-[#0062cc] text-white font-bold gap-1.5 shadow-2xs min-h-10 md:min-h-9"
            data-testid="link-to-summary-header"
          >
            <FileCheck2 className="w-3.5 h-3.5" /> Summary Laporan ({reportMetrics.pending} Pending)
          </Button>
        </Link>
      </div>

      {/* Pencarian & filter client */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3" data-testid="my-schedule-filters">
        <SearchInput
          className="w-full sm:flex-1 sm:max-w-xl"
          placeholder="Cari nama anak, ortu, atau kode client..."
          value={search}
          onChange={setSearch}
          data-testid="my-schedule-search"
        />
        <div className="w-full sm:w-64">
          <ClientCombobox clients={myClients} value={clientFilter} onChange={setClientFilter} allOption={{ value: "all", label: `Semua Client Saya (${myClients.length})` }} placeholder="Filter Client" testId="my-schedule-client-filter" />
        </div>
      </div>

      {/* Date & View Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" className="border-slate-200" onClick={goPrev} aria-label="Previous">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </Button>
          <Button size="sm" variant="outline" className="border-slate-200 font-semibold text-slate-700" onClick={goToday}>
            Hari Ini
          </Button>
          <Button variant="outline" size="icon" className="border-slate-200" onClick={goNext} aria-label="Next">
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </Button>
          <span className="text-sm font-bold text-slate-900 ml-2 tabular-nums">{label}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Report quick filter */}
          <div className="flex rounded-xl border border-slate-200 p-0.5 bg-slate-100 text-xs">
            <button
              type="button"
              onClick={() => setReportFilter("all")}
              className={cn(
                "px-2.5 py-1 font-bold rounded-lg transition-all cursor-pointer",
                reportFilter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
              )}
            >
              Semua ({reportMetrics.total})
            </button>
            <button
              type="button"
              onClick={() => setReportFilter("pending")}
              className={cn(
                "px-2.5 py-1 font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1",
                reportFilter === "pending" ? "bg-amber-100 text-amber-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
              )}
              title="Sesi yang belum diisi laporan Activity / Homework"
            >
              Belum Laporan ({reportMetrics.pending})
            </button>
            <button
              type="button"
              onClick={() => setReportFilter("filled")}
              className={cn(
                "px-2.5 py-1 font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1",
                reportFilter === "filled" ? "bg-emerald-100 text-emerald-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
              )}
              title="Sesi dengan laporan terisi"
            >
              Laporan Terisi ({reportMetrics.filled})
            </button>
          </div>

          <div className="flex rounded-xl border border-slate-200 p-0.5 bg-slate-100">
            <button
              type="button"
              onClick={() => setView("week")}
              className={cn(
                "px-3 py-2 sm:py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                view === "week" ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-500 hover:text-slate-800"
              )}
            >
              Week Grid
            </button>
            <button
              type="button"
              onClick={() => setView("day")}
              className={cn(
                "px-3 py-2 sm:py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                view === "day" ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-500 hover:text-slate-800"
              )}
            >
              Day Agenda
            </button>
          </div>
        </div>
      </div>

      {/* Client Quick Resource Strip */}
      {myClients.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-sky-600" /> Akses Cepat Arsip & Profil Client:
            </p>
            <span className="text-[11px] text-slate-400">Klik nama untuk melihat profil lengkap & riwayat sesi</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {myClients.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs"
              >
                <Link
                  to={`/therapist/clients/${c.id}`}
                  className="font-bold text-slate-900 hover:text-emerald-700 transition-colors flex items-center gap-1"
                  title="Buka Profil Lengkap & Histori Sesi Client"
                  data-testid={`client-strip-link-${c.id}`}
                >
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{c.clientName}</span>
                </Link>
                {c.gdriveClientLink && (
                  <a
                    href={c.gdriveClientLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-sky-700 hover:underline flex items-center gap-0.5 min-h-9 px-1"
                    title="Buka Google Drive Client"
                  >
                    <ExternalLink className="w-3 h-3" /> GDrive
                  </a>
                )}
                {(c.assessmentAnswers || []).length > 0 && (
                  <Link
                    to={`/therapist/parent-assessment/${c.id}`}
                    className="text-[11px] font-bold text-purple-700 hover:underline flex items-center gap-0.5 min-h-9 px-1"
                    title="Buka Tabel Psikologi & Jawaban Ortu"
                  >
                    <ClipboardCheck className="w-3 h-3" /> Kuesioner
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar Grid View */}
      {view === "week" ? (
        <WeeklyCalendar
          weekStart={weekStart}
          schedules={displayedSchedules}
          getClientName={getClientName}
          onSessionClick={(session) => {
            setSelectedSession(session);
            setSessionOpen(true);
          }}
        />
      ) : (
        <DayAgenda
          day={selectedDay}
          date={selectedDay}
          schedules={displayedSchedules}
          getClientName={getClientName}
          getTherapistName={(id) => getTherapist(id)?.name || "—"}
          onSessionClick={(session) => {
            setSelectedSession(session);
            setSessionOpen(true);
          }}
        />
      )}

      <CalendarLegend />

      {/* Session Detail Modal (Activity + Homework, restricted complete) */}
      <SessionDetailModal
        schedule={selectedSession}
        open={sessionOpen}
        onOpenChange={setSessionOpen}
      />
    </div>
  );
}
