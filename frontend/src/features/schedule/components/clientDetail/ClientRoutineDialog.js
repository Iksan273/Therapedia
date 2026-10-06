import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CalendarDays, RotateCcw, Settings2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { useClients } from "@/stores/clientsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useTherapists } from "@/stores/therapistsStore";
import { useHolidays } from "@/stores/holidaysStore";
import { useAuth } from "@/stores/authStore";
import { useCredits } from "@/stores/creditsStore";
import { useSessionActions } from "@/features/schedule/hooks/useSessionActions";
import { TIME_OPTIONS, WEEKDAY_OPTIONS, defaultRoutineWeeks, deriveRecurringRoutines, planRoutineChange, routineKeyOfRow, routineSessionsToRemove, seriesPeriod, timeToMin } from "@/domain/schedule";
import { holidayDateSet } from "@/domain/holiday";
import { fmtDate } from "@/shared/lib/format";
import { todayStr } from "@/shared/lib/id";
import { cn } from "@/shared/lib/utils";

const WEEKDAY_INDEX = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };

const newRow = (therapistId) => ({ rid: `n${Date.now()}${Math.random().toString(36).slice(2, 6)}`, originalKey: null, weekday: 1, startTime: "09:00", endTime: "10:00", therapistId: therapistId || "", removed: false });
const rowValid = (r) => r.startTime && r.endTime && r.therapistId && r.endTime > r.startTime;

// Ganti jadwal rutin (recurring) satu client: ubah per hari (hari/jam/terapis), hapus hari, tambah hari, atau "Buat Baru"
// (kosongkan semua lalu isi pola baru). Saat disimpan, sesi `scheduled` yang tersambung ke pola lama (mulai tanggal berlaku)
// dihapus dan diganti sesi pola baru. Sesi yang sudah completed / cancelled / dipindah tidak disentuh.
export function ClientRoutineDialog({ clientId, open, onOpenChange }) {
  const { getClient } = useClients();
  const { schedules } = useSchedules();
  const { therapists } = useTherapists();
  const { holidays } = useHolidays();
  const { auth } = useAuth();
  const actions = useSessionActions();
  const { getRecordForClient } = useCredits();
  const client = getClient(clientId);

  // Pilihan paket kredit: sama dengan AddScheduleModal (paket bersisa; bila semua habis, paket terakhir = Frozen)
  const clientPackages = useMemo(() => {
    const all = getRecordForClient(clientId)?.packages || [];
    const active = all.filter((p) => p.remainingCredit > 0);
    return active.length ? active : all.length ? [all[all.length - 1]] : [];
  }, [clientId, getRecordForClient]);

  const clientSchedules = useMemo(() => schedules.filter((s) => s.clientId === clientId), [schedules, clientId]);
  const today = todayStr();
  const routines = useMemo(() => deriveRecurringRoutines(clientSchedules, today), [clientSchedules, today]);

  const [from, setFrom] = useState(today);
  const [weeks, setWeeks] = useState(12);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!open) return;
    setFrom(today);
    setWeeks(defaultRoutineWeeks(clientSchedules, today));
    setRows(
      routines.map((r, i) => ({
        rid: `r${i}`,
        originalKey: routineKeyOfRow(r),
        weekday: r.weekday,
        startTime: r.startTime,
        endTime: r.endTime,
        therapistId: r.therapistId,
        creditPackageId: r.creditPackageId ?? null,
        originalPackageId: r.creditPackageId ?? null,
        validFrom: seriesPeriod(clientSchedules, r.seriesId)?.start || r.nextDate,
        validTo: seriesPeriod(clientSchedules, r.seriesId)?.end || r.lastDate,
        removed: false,
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clientId]);

  const patchRow = (rid, patch) => setRows((prev) => prev.map((r) => (r.rid === rid ? { ...r, ...patch } : r)));
  const activeRows = rows.filter((r) => !r.removed);
  const daySelected = (dayId) => activeRows.some((r) => Number(r.weekday) === WEEKDAY_INDEX[dayId]);
  const autoEnd = (start) => {
    const [h, m] = start.split(":").map(Number);
    return `${String(Math.min(h + 1, 18)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  // Hapus satu baris: pola lama ditandai hapus (sesinya dihapus saat simpan), hari baru langsung dibuang
  const removeRow = (r) => setRows((prev) => (r.originalKey ? prev.map((x) => (x.rid === r.rid ? { ...x, removed: true } : x)) : prev.filter((x) => x.rid !== r.rid)));

  // Chip hari: aktifkan = tambah baris (jam & terapis disalin dari baris aktif terakhir agar tinggal pindah hari); nonaktifkan = hapus baris hari itu
  const toggleDay = (dayId) => {
    const weekday = WEEKDAY_INDEX[dayId];
    if (daySelected(dayId)) {
      activeRows.filter((r) => Number(r.weekday) === weekday).forEach(removeRow);
      return;
    }
    const last = activeRows[activeRows.length - 1] || rows[rows.length - 1];
    setRows((prev) => [...prev, { ...newRow(last?.therapistId || therapists[0]?.id), weekday, startTime: last?.startTime || "09:00", endTime: last?.endTime || "10:00", creditPackageId: last?.creditPackageId ?? clientPackages[0]?.id ?? null }]);
  };

  // Buat Baru: semua pola lama ditandai hapus, hari baru yang belum disimpan dibuang; admin memilih hari lagi lewat chip
  const resetAll = () => setRows((prev) => prev.filter((r) => r.originalKey).map((r) => ({ ...r, removed: true })));

  // Field tetap sesi baru diambil dari sesi terjadwal client (paket kredit, layanan, cabang)
  const template = useMemo(() => {
    const sample = clientSchedules.find((s) => s.type === "therapy" && s.status === "scheduled" && s.date >= today) || clientSchedules.find((s) => s.type === "therapy");
    return {
      clientId,
      branchId: sample?.branchId || client?.branchId || "branch-sby-timur",
      creditPackageId: sample?.creditPackageId ?? null,
      serviceType: sample?.serviceType,
      createdBy: auth?.staffName || auth?.role || null,
    };
  }, [clientSchedules, clientId, client, auth, today]);

  const hasInvalid = rows.some((r) => !r.removed && !rowValid(r));
  const plan = useMemo(
    () =>
      planRoutineChange({
        sessions: schedules,
        rows: rows.filter((r) => r.removed || rowValid(r)),
        from,
        weeks: Math.max(1, Number(weeks) || 1),
        holidayDates: holidayDateSet(holidays, client?.branchId),
        template,
        therapists,
      }),
    [schedules, rows, from, weeks, holidays, client, template, therapists]
  );
  const canSave = (plan.removeIds.length > 0 || plan.createList.length > 0) && !hasInvalid && plan.conflicts.length === 0 && from >= today && Number(weeks) >= 1;

  const handleSave = () => {
    const { removed, created } = actions.replaceRoutine(plan);
    toast.success(`Jadwal rutin diganti: ${removed} sesi lama dihapus, ${created} sesi baru dibuat${plan.skippedHoliday ? ` (${plan.skippedHoliday} tanggal libur dilewati)` : ""}.`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-2xl p-5 sm:p-6 border-slate-200" data-testid="client-routine-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-sky-600" /> Ganti Jadwal Rutin — {client?.clientName}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Pilih hari lewat tombol hari (Mon–Sat), atur jam & terapis tiap hari, atau buat pola baru. Saat disimpan, sesi terjadwal yang tersambung ke pola lama (mulai tanggal berlaku) dihapus dan diganti sesi pola baru. Sesi yang sudah selesai, dibatalkan, atau dipindah tidak diubah.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Berlaku mulai</Label>
            <Input type="date" min={today} value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 text-xs border-slate-200 bg-slate-50" data-testid="routine-from" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Jumlah minggu (pola baru)</Label>
            <Input type="number" min={1} max={52} value={weeks} onChange={(e) => setWeeks(e.target.value)} className="h-10 text-xs border-slate-200 bg-slate-50" data-testid="routine-weeks" />
          </div>
        </div>

        {/* Pola mingguan: pilihan hari & kartu jam/terapis per hari, selaras dengan AddScheduleModal */}
        <div className="space-y-3.5 p-4 rounded-2xl border border-sky-200 bg-sky-50/30" data-testid="routine-rows">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-100 pb-2.5">
            <div>
              <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-sky-600" />
                Weekly Days & Flexible Time Pattern
              </h4>
              <p className="text-[11px] text-slate-500">Select days in a week and assign individual times/therapists for each day.</p>
            </div>
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 self-start">
              {WEEKDAY_OPTIONS.map((day) => {
                const isSel = daySelected(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleDay(day.id)}
                    className={cn(
                      "min-w-[36px] h-10 md:h-9 px-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center",
                      isSel ? "bg-sky-600 text-white shadow-2xs" : "text-slate-600 hover:bg-slate-100"
                    )}
                    aria-pressed={isSel}
                    data-testid={`routine-chip-${day.short}`}
                  >
                    {day.short}
                  </button>
                );
              })}
            </div>
          </div>

          {activeRows.length === 0 && <p className="py-2 text-center text-xs text-slate-400">Pilih hari di atas untuk membuat jadwal rutin baru.</p>}

          <div className="space-y-2">
            {activeRows.map((r) => {
              const dayMeta = WEEKDAY_OPTIONS.find((w) => WEEKDAY_INDEX[w.id] === Number(r.weekday));
              const existing = r.originalKey ? routineSessionsToRemove(clientSchedules, [r.originalKey], from).length : 0;
              return (
                <div key={r.rid} className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2" data-testid={`routine-row-${r.rid}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-xs px-2.5 py-0.5 rounded-lg bg-sky-100 text-sky-800">{dayMeta ? dayMeta.label : r.weekday}</span>
                      <span className="text-[11px] font-semibold text-slate-500">Slot: {r.startTime} - {r.endTime}</span>
                      <span className="text-[11px] text-slate-400">{r.originalKey ? `${existing} sesi terjadwal lama${r.validFrom ? ` • ${fmtDate(r.validFrom)} – ${fmtDate(r.validTo)}` : ""}` : "hari baru"}</span>
                    </div>
                    <button type="button" onClick={() => removeRow(r)} className="text-slate-400 hover:text-rose-600 text-xs p-2" title="Remove day" aria-label="Remove day" data-testid={`routine-remove-${r.rid}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Start Time</Label>
                      <Select value={r.startTime} onValueChange={(v) => patchRow(r.rid, { startTime: v, ...(timeToMin(r.endTime) <= timeToMin(v) ? { endTime: autoEnd(v) } : {}) })}>
                        <SelectTrigger className="text-xs border-slate-200 font-semibold" data-testid={`routine-start-${r.rid}`}>
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
                      <Select value={r.endTime} onValueChange={(v) => patchRow(r.rid, { endTime: v })}>
                        <SelectTrigger className="text-xs border-slate-200 font-semibold" data-testid={`routine-end-${r.rid}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200">
                          {TIME_OPTIONS.filter((t) => timeToMin(t) > timeToMin(r.startTime)).map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Paket Kredit</Label>
                      <Select value={r.creditPackageId || clientPackages[0]?.id || "none"} onValueChange={(v) => patchRow(r.rid, { creditPackageId: v === "none" ? null : v })}>
                        <SelectTrigger className="text-xs border-slate-200 font-semibold truncate" data-testid={`routine-package-${r.rid}`}>
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
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Therapist</Label>
                      <Select value={r.therapistId} onValueChange={(v) => patchRow(r.rid, { therapistId: v })}>
                        <SelectTrigger className="text-xs border-slate-200 font-semibold truncate" data-testid={`routine-therapist-${r.rid}`}>
                          <SelectValue placeholder="Therapist" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200">
                          {therapists.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Button type="button" size="sm" variant="outline" className="gap-1.5 font-bold border-amber-300 text-amber-800 hover:bg-amber-50 cursor-pointer min-h-10 md:min-h-0" onClick={resetAll} data-testid="routine-reset-all">
            <RotateCcw className="w-3.5 h-3.5" /> Buat Baru (ganti semua)
          </Button>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1" data-testid="routine-summary">
          <p>
            <strong>{plan.removeIds.length}</strong> sesi terjadwal lama akan dihapus (mulai {fmtDate(from)}) dan <strong>{plan.createList.length}</strong> sesi baru dibuat.
          </p>
          {plan.skippedHoliday > 0 && <p className="text-slate-500">{plan.skippedHoliday} tanggal dilewati karena hari libur.</p>}
          {hasInvalid && <p className="font-semibold text-rose-700">Jam selesai harus setelah jam mulai dan terapis wajib dipilih.</p>}
          {plan.conflicts.length > 0 && (
            <div className="text-rose-700 font-semibold space-y-0.5" data-testid="routine-conflicts">
              <p className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Bentrok jadwal terapis, ubah jam/terapis:</p>
              {plan.conflicts.slice(0, 5).map((c) => (
                <p key={c} className="font-normal">• {c}</p>
              ))}
              {plan.conflicts.length > 5 && <p className="font-normal">… dan {plan.conflicts.length - 5} lainnya</p>}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" className="border-slate-200" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button type="button" className="bg-sky-600 hover:bg-sky-700 text-white font-bold" disabled={!canSave} onClick={handleSave} data-testid="routine-save">
            Simpan Jadwal Rutin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
