import { useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { CalendarClock, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import DateFilterPicker from "@/shared/components/DateFilterPicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { TIME_OPTIONS, planBulkReschedule } from "@/domain/schedule";
import { fmtDate } from "@/shared/lib/format";

const OFFSETS = [
  ["1", "+1 hari"],
  ["2", "+2 hari"],
  ["7", "+1 minggu"],
  ["14", "+2 minggu"],
  ["-7", "-1 minggu"],
];

const toRow = (s) => ({ id: s.id, date: s.date, startTime: s.startTime, endTime: s.endTime, therapistId: s.therapistId });

// Reschedule massal: tiap sesi punya tujuan sendiri (tanggal, jam, terapis). Pengisian cepat "terapkan ke semua" hanya
// mengisi baris; hasil akhir tetap bisa diubah per baris. ATOMIK: tombol simpan nonaktif selama ada baris bermasalah
// (bentrok / hari libur / belum diubah), dan tidak ada sesi yang tersimpan sebagian.
export function BulkRescheduleDialog({ open, onOpenChange, sessions, schedules, therapists, holidays, getClientName, onConfirm }) {
  const [rows, setRows] = useState(() => sessions.map(toRow));
  const [offset, setOffset] = useState("");
  const [date, setDate] = useState("");
  const [therapistId, setTherapistId] = useState("keep");

  const plan = useMemo(
    () => planBulkReschedule({ rows, schedules, therapists, holidays }),
    [rows, schedules, therapists, holidays]
  );
  const badCount = Object.keys(plan.issues).length;
  const sessionById = useMemo(() => new Map(sessions.map((s) => [s.id, s])), [sessions]);

  const patchRow = (id, patch) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  // Isi cepat: geser N hari dari tanggal asal masing-masing ATAU satu tanggal pasti; opsional satu terapis untuk semua
  const applyToAll = () => {
    setRows((prev) =>
      prev.map((r) => {
        const orig = sessionById.get(r.id);
        let nextDate = r.date;
        if (date) nextDate = date;
        else if (offset) nextDate = format(addDays(parseISO(orig.date), parseInt(offset, 10)), "yyyy-MM-dd");
        return { ...r, date: nextDate, therapistId: therapistId !== "keep" ? therapistId : r.therapistId };
      })
    );
  };

  const submit = () => {
    const result = onConfirm(rows);
    if (result?.ok) onOpenChange(false);
  };

  const timeSelect = (r, field, testId) => (
    <Select value={r[field]} onValueChange={(v) => patchRow(r.id, { [field]: v })}>
      <SelectTrigger className="h-10 w-[88px] border-slate-200 bg-slate-50 text-xs" data-testid={testId}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-xl border-slate-200 max-h-60">
        {TIME_OPTIONS.map((t) => (
          <SelectItem key={t} value={t}>{t}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-2xl p-5 sm:p-6 border-slate-200 max-h-[calc(100dvh-2.5rem)] overflow-y-auto" data-testid="bulk-reschedule-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-amber-600" /> Bulk Reschedule ({sessions.length} sesi)
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Atur tanggal, jam, dan terapis baru untuk setiap sesi. Semua sesi disimpan bersamaan; bila ada satu yang bermasalah, tidak ada yang tersimpan.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2" data-testid="bulk-reschedule-quickfill">
          <p className="text-xs font-bold text-slate-700">Isi cepat (opsional) — lalu bisa diubah per sesi</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-600">Geser dari tanggal asal</Label>
              <Select value={offset || "none"} onValueChange={(v) => { setOffset(v === "none" ? "" : v); if (v !== "none") setDate(""); }}>
                <SelectTrigger className="h-10 border-slate-200 bg-white text-xs" data-testid="bulk-reschedule-offset-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="none">Tidak digeser</SelectItem>
                  {OFFSETS.map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-600">Atau satu tanggal untuk semua</Label>
              <DateFilterPicker
                placeholder="DD/MM/YYYY"
                className="w-full bg-white"
                value={date}
                onChange={(e) => { setDate(e?.target?.value ?? e); setOffset(""); }}
                data-testid="bulk-reschedule-date-input"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-600">Terapis untuk semua</Label>
              <Select value={therapistId} onValueChange={setTherapistId}>
                <SelectTrigger className="h-10 border-slate-200 bg-white text-xs" data-testid="bulk-reschedule-therapist-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="keep">Tetap (per sesi)</SelectItem>
                  {therapists.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="outline" className="h-10 border-slate-300" onClick={applyToAll} data-testid="bulk-reschedule-apply-all">
              Terapkan ke semua
            </Button>
          </div>
        </div>

        <ul className="space-y-2.5 pt-1" data-testid="bulk-reschedule-rows">
          {rows.map((r) => {
            const orig = sessionById.get(r.id);
            const problems = plan.issues[r.id] || [];
            return (
              <li
                key={r.id}
                className={`rounded-xl border p-3 space-y-2 ${problems.length ? "border-red-300 bg-red-50/50" : "border-slate-200 bg-white"}`}
                data-testid={`bulk-reschedule-row-${r.id}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <p className="text-sm font-bold text-slate-900">{getClientName(orig.clientId)}</p>
                  <p className="text-[11px] text-slate-500">
                    Asal: {fmtDate(orig.date)} · {orig.startTime}–{orig.endTime}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <DateFilterPicker
                    placeholder="DD/MM/YYYY"
                    className="w-[150px] bg-slate-50"
                    value={r.date}
                    onChange={(e) => patchRow(r.id, { date: e?.target?.value ?? e })}
                    data-testid={`bulk-reschedule-row-date-${r.id}`}
                  />
                  {timeSelect(r, "startTime", `bulk-reschedule-row-start-${r.id}`)}
                  <span className="text-xs text-slate-400">–</span>
                  {timeSelect(r, "endTime", `bulk-reschedule-row-end-${r.id}`)}
                  <Select value={r.therapistId} onValueChange={(v) => patchRow(r.id, { therapistId: v })}>
                    <SelectTrigger className="h-10 min-w-[150px] flex-1 border-slate-200 bg-slate-50 text-xs" data-testid={`bulk-reschedule-row-therapist-${r.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      {therapists.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {problems.length > 0 ? (
                  <div className="text-[11px] text-red-700 space-y-0.5" data-testid={`bulk-reschedule-row-issue-${r.id}`}>
                    {problems.map((m) => (
                      <p key={m} className="flex items-start gap-1"><AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" /> {m}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Aman</p>
                )}
              </li>
            );
          })}
        </ul>

        <DialogFooter className="mt-4 gap-2 sm:items-center">
          <p className={`text-xs sm:mr-auto ${badCount ? "text-red-700 font-semibold" : "text-emerald-700"}`} data-testid="bulk-reschedule-summary">
            {badCount ? `${badCount} sesi bermasalah — perbaiki dulu, tidak ada yang tersimpan sebelum semuanya aman.` : "Semua sesi aman untuk disimpan."}
          </p>
          <Button variant="outline" className="border-slate-200" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold"
            disabled={!plan.ok || rows.length === 0}
            onClick={submit}
            data-testid="bulk-reschedule-confirm-button"
          >
            Simpan semua
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
