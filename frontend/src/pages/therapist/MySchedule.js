import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addDays, addWeeks, format, startOfWeek, subDays, subWeeks } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  CalendarDays,
  ExternalLink,
  FileText,
  User,
  Filter,
  Search,
  Building2,
  BookOpen,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WeeklyCalendar, CalendarLegend } from "@/components/calendar/WeeklyCalendar";
import { DayAgenda } from "@/components/calendar/DayAgenda";
import { SessionDetailModal } from "@/components/calendar/SessionDetailModal";
import { useAuth } from "@/context/AuthContext";
import { useSchedules } from "@/context/SchedulesContext";
import { useClients } from "@/context/ClientsContext";
import { useTherapists } from "@/context/TherapistsContext";
import { BRANCHES } from "@/lib/appUtils";
import { cn } from "@/lib/utils";

export default function MySchedule() {
  const { auth } = useAuth();
  const { schedules } = useSchedules();
  const { clients } = useClients();
  const { getTherapist } = useTherapists();

  const [view, setView] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "day" : "week"
  );
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [clientFilter, setClientFilter] = useState("all");
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionOpen, setSessionOpen] = useState(false);

  const therapist = getTherapist(auth.therapistId);

  // Filter schedules exclusively for this therapist
  const mySchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (s.therapistId !== auth.therapistId) return false;
      if (clientFilter !== "all" && s.clientId !== clientFilter) return false;
      return true;
    });
  }, [schedules, auth.therapistId, clientFilter]);

  // Unique clients handled by this therapist
  const myClients = useMemo(() => {
    const ids = new Set(schedules.filter((s) => s.therapistId === auth.therapistId).map((s) => s.clientId));
    return clients.filter((c) => ids.has(c.id));
  }, [schedules, auth.therapistId, clients]);

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
      ? `${format(weekStart, "MMM d")} – ${format(addWeeks(weekStart, 1), "MMM d, yyyy")}`
      : format(selectedDay, "EEE, MMM d yyyy");

  return (
    <div className="space-y-6" data-testid="my-schedule-page">
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
            <strong className="text-slate-800 tabular-nums">{mySchedules.length}</strong> sesi aktif terdaftar.
          </p>
        </div>

        {/* Filter per Client */}
        <div className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-xl px-3 py-1.5 shadow-2xs self-start sm:self-auto">
          <User className="w-4 h-4 text-sky-600 shrink-0" />
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="h-8 border-none bg-transparent shadow-none text-xs font-bold text-slate-800 focus:ring-0 p-0 w-44">
              <SelectValue placeholder="Filter Client" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="all">Semua Client Saya ({myClients.length})</SelectItem>
              {myClients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.clientName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Date & View Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" className="rounded-xl border-slate-200 h-9 w-9" onClick={goPrev} aria-label="Previous">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </Button>
          <Button variant="outline" className="rounded-xl border-slate-200 text-xs font-semibold text-slate-700 h-9" onClick={goToday}>
            Hari Ini
          </Button>
          <Button variant="outline" size="icon" className="rounded-xl border-slate-200 h-9 w-9" onClick={goNext} aria-label="Next">
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </Button>
          <span className="text-sm font-bold text-slate-900 ml-2 tabular-nums">{label}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-slate-200 p-0.5 bg-slate-100">
            <button
              type="button"
              onClick={() => setView("week")}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                view === "week" ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-500 hover:text-slate-800"
              )}
            >
              Week Grid
            </button>
            <button
              type="button"
              onClick={() => setView("day")}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
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
              <BookOpen className="w-4 h-4 text-sky-600" /> Akses Cepat Arsip Klinis Client Anda:
            </p>
            <span className="text-[11px] text-slate-400">GDrive & Hasil Kuesioner Ortu</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {myClients.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs"
              >
                <span className="font-bold text-slate-900">{c.clientName}</span>
                {c.gdriveClientLink && (
                  <a
                    href={c.gdriveClientLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-sky-700 hover:underline flex items-center gap-0.5"
                    title="Buka Google Drive Client"
                  >
                    <ExternalLink className="w-3 h-3" /> GDrive
                  </a>
                )}
                {(c.assessmentAnswers || []).length > 0 && (
                  <Link
                    to={`/therapist/parent-assessment/${c.id}`}
                    className="text-[11px] font-bold text-purple-700 hover:underline flex items-center gap-0.5"
                    title="Buka Tabel Psikologi & Jawaban Ortu"
                  >
                    <ClipboardCheck className="w-3 h-3" /> Hasil Kuesioner
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
          schedules={mySchedules}
          getClientName={getClientName}
          onSessionClick={(session) => {
            setSelectedSession(session);
            setSessionOpen(true);
          }}
        />
      ) : (
        <DayAgenda
          date={selectedDay}
          schedules={mySchedules}
          getClientName={getClientName}
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
