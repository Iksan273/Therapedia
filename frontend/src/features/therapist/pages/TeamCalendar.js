import React, { useMemo, useState } from "react";
import { addDays, addWeeks, format, startOfWeek, subDays, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight, Eye, UsersRound } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { BranchFilter } from "@/shared/components/BranchFilter";
import { CalendarLegend, WeeklyCalendar } from "@/features/schedule";
import { TeamDayGrid } from "@/features/therapist/components/TeamDayGrid";
import { useAuth } from "@/stores/authStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useClients } from "@/stores/clientsStore";
import { useTherapists } from "@/stores/therapistsStore";
import { cn } from "@/shared/lib/utils";

// Kalender Tim Terapis (revisi 7 Okt 2026): terapis boleh MELIHAT jadwal terapis lain (read-only, tanpa klik slot / sesi /
// isi laporan). Tampilan HARI = satu kalender berisi semua terapis (kolom per terapis); tampilan MINGGU =
// satu terapis saja (dipilih) agar tidak terlalu padat.
export default function TeamCalendar() {
  const { auth } = useAuth();
  const { schedules } = useSchedules();
  const { clients } = useClients();
  const { therapists, getTherapist } = useTherapists();

  const [view, setView] = useState("day");
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [branch, setBranch] = useState(auth?.branchId || "all");
  const [therapistId, setTherapistId] = useState(""); // dipakai tampilan minggu (satu terapis)

  const branchTherapists = useMemo(() => therapists.filter((t) => branch === "all" || t.branchId === branch), [therapists, branch]);
  // Tampilan minggu: satu terapis (pilihan, atau terapis pertama di cabang itu)
  const weekTherapist = branchTherapists.find((t) => t.id === therapistId) || branchTherapists[0] || null;
  const branchIds = useMemo(() => new Set(branchTherapists.map((t) => t.id)), [branchTherapists]);
  const dayStr = format(selectedDay, "yyyy-MM-dd");
  const daySchedules = useMemo(() => schedules.filter((s) => branchIds.has(s.therapistId) && s.date === dayStr), [schedules, branchIds, dayStr]);
  const weekSchedules = useMemo(() => schedules.filter((s) => s.therapistId === weekTherapist?.id), [schedules, weekTherapist?.id]);

  const getClientName = (clientId) => clients.find((c) => c.id === clientId)?.clientName || "Client";
  const getTherapistName = (id) => getTherapist(id)?.name || "";

  const goPrev = () => (view === "week" ? setWeekStart((w) => subWeeks(w, 1)) : setSelectedDay((d) => subDays(d, 1)));
  const goNext = () => (view === "week" ? setWeekStart((w) => addWeeks(w, 1)) : setSelectedDay((d) => addDays(d, 1)));
  const goToday = () => {
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    setSelectedDay(new Date());
  };
  const label = view === "week" ? `${format(weekStart, "dd/MM/yyyy")} – ${format(addDays(weekStart, 5), "dd/MM/yyyy")}` : format(selectedDay, "EEEE, dd/MM/yyyy");

  return (
    <div className="space-y-6" data-testid="team-calendar-page">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-semibold mb-2">
          <UsersRound className="w-3.5 h-3.5 text-emerald-600" /> Therapist Clinical Portal
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Kalender Tim Terapis</h1>
        <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" /> Hanya lihat: jadwal terapis lain. Tampilan Hari = semua terapis dalam satu kalender; tampilan Minggu = satu terapis.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-48"><BranchFilter value={branch} onChange={(v) => { setBranch(v); setTherapistId(""); }} isMaster /></div>
          {view === "week" && (
            <Select value={weekTherapist?.id || ""} onValueChange={setTherapistId}>
              <SelectTrigger className="w-56 text-xs border-slate-200 bg-slate-50 font-semibold" aria-label="Pilih terapis" data-testid="team-therapist-filter"><SelectValue placeholder="Pilih terapis" /></SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                {branchTherapists.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="min-h-10 min-w-10 md:min-h-9 md:min-w-9" onClick={goPrev} aria-label="Sebelumnya"><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-xs font-bold text-slate-800 tabular-nums min-w-[200px] text-center" data-testid="team-calendar-label">{label}</span>
          <Button variant="outline" size="icon" className="min-h-10 min-w-10 md:min-h-9 md:min-w-9" onClick={goNext} aria-label="Berikutnya"><ChevronRight className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" className="font-bold min-h-10 md:min-h-9" onClick={goToday}>Hari Ini</Button>
          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
            {["day", "week"].map((v) => (
              <button key={v} type="button" onClick={() => setView(v)} data-testid={`team-view-${v}`} className={cn("px-3 py-2 md:py-1.5 text-xs font-bold min-h-10 md:min-h-0", view === v ? "bg-sky-600 text-white" : "bg-white text-slate-600")}>{v === "week" ? "Minggu" : "Hari"}</button>
            ))}
          </div>
        </div>
      </div>

      <CalendarLegend />

      {view === "week" ? (
        weekTherapist ? (
          <WeeklyCalendar weekStart={weekStart} schedules={weekSchedules} getClientName={getClientName} getTherapistName={getTherapistName} />
        ) : (
          <Card className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">Belum ada terapis pada cabang ini.</Card>
        )
      ) : (
        <TeamDayGrid day={selectedDay} therapists={branchTherapists} schedules={daySchedules} getClientName={getClientName} />
      )}
    </div>
  );
}
