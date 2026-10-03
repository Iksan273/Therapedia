import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarOff, Plus } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/components/EmptyState";
import { DeleteButton } from "@/shared/components/DeleteControls";
import { useHolidays } from "@/stores/holidaysStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useAuth } from "@/stores/authStore";
import { BRANCHES, branchName } from "@/domain/branch";
import { makeHoliday, validateHoliday } from "@/domain/holiday";
import { fmtDate } from "@/shared/lib/format";
import { todayStr } from "@/shared/lib/id";

// Pengaturan hari libur: jadwal berulang melewati tanggal libur dan kalender tidak bisa memilihnya.
// Menambah libur tidak mengubah sesi yang sudah ada (hanya diberi penanda jumlah sesi terdampak).
export default function Holidays() {
  const { holidays, addHoliday, removeHoliday } = useHolidays();
  const { schedules } = useSchedules();
  const { auth } = useAuth();
  const isMaster = auth?.role === "master";

  // Master boleh libur semua cabang; role lain terkunci ke cabangnya
  const [form, setForm] = useState({ date: "", name: "", scope: isMaster ? "all" : auth?.branchId || "all" });

  const visible = useMemo(
    () =>
      [...holidays]
        .filter((h) => isMaster || !h.branchId || h.branchId === auth?.branchId)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [holidays, isMaster, auth?.branchId]
  );

  const affectedCount = (h) =>
    schedules.filter(
      (s) => s.date === h.date && !["cancelled", "completed"].includes(s.status) && (!h.branchId || s.branchId === h.branchId)
    ).length;

  const handleAdd = (e) => {
    e.preventDefault();
    const branchId = form.scope === "all" ? null : form.scope;
    const error = validateHoliday(holidays, { date: form.date, name: form.name, branchId });
    if (error) {
      toast.error(error);
      return;
    }
    const holiday = makeHoliday({ date: form.date, name: form.name, branchId });
    addHoliday(holiday);
    const affected = affectedCount(holiday);
    toast.success(
      affected > 0
        ? `Hari libur ditambahkan. ${affected} sesi terjadwal pada tanggal itu tidak berubah otomatis: atur manual (reschedule/cancel).`
        : "Hari libur ditambahkan."
    );
    setForm((f) => ({ ...f, date: "", name: "" }));
  };

  const today = todayStr();

  return (
    <div className="space-y-6" data-testid="holidays-page">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100/80 text-rose-800 text-xs font-semibold mb-2">
          <CalendarOff className="w-3.5 h-3.5 text-rose-600" />
          Pengaturan Hari Libur
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Hari Libur</h1>
        <p className="text-sm text-slate-500 mt-1">
          Tanggal libur dilewati oleh jadwal berulang dan tidak bisa dipilih saat membuat atau memindahkan sesi. Sesi yang sudah ada tidak berubah otomatis.
        </p>
      </div>

      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
        <CardContent className="p-4 sm:p-5">
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr_auto] gap-3 items-end" data-testid="holiday-form">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Tanggal *</Label>
              <Input type="date" className="border-slate-200 bg-slate-50 text-xs font-semibold" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="holiday-date-input" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Nama Hari Libur *</Label>
              <Input className="border-slate-200 bg-slate-50 text-xs" placeholder="mis. Hari Raya Idul Fitri" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="holiday-name-input" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Berlaku untuk</Label>
              <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v })} disabled={!isMaster}>
                <SelectTrigger className="border-slate-200 bg-slate-50 text-xs font-semibold" data-testid="holiday-scope-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  {isMaster && <SelectItem value="all">Semua cabang</SelectItem>}
                  {BRANCHES.filter((b) => isMaster || b.id === auth?.branchId).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5" data-testid="holiday-add-button">
              <Plus className="w-4 h-4" /> Tambah
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          {visible.length === 0 ? (
            <EmptyState icon={CalendarOff} title="Belum ada hari libur" subtitle="Tambahkan tanggal libur nasional atau libur klinik di atas." />
          ) : (
            <Table stackOnMobile className="min-w-[560px] w-full">
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                  <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6 whitespace-nowrap">Tanggal</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Nama</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Cabang</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Sesi terdampak</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-right pr-6 whitespace-nowrap">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((h) => {
                  const affected = affectedCount(h);
                  return (
                    <TableRow key={h.id} className="border-b border-slate-100 hover:bg-slate-50/50" data-testid={`holiday-row-${h.id}`}>
                      <TableCell data-label="Tanggal" className="pl-6 text-xs font-bold text-slate-900 whitespace-nowrap">
                        {fmtDate(h.date)}
                        {h.date < today && <span className="ml-2 text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Lewat</span>}
                      </TableCell>
                      <TableCell data-label="Nama" className="text-xs font-semibold text-slate-800">{h.name}</TableCell>
                      <TableCell data-label="Cabang" className="text-xs text-slate-600">{h.branchId ? branchName(h.branchId) : "Semua cabang"}</TableCell>
                      <TableCell data-label="Sesi terdampak" className="text-xs">
                        {affected > 0 ? (
                          <span className="font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">{affected} sesi perlu diatur manual</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell data-nolabel className="text-right pr-6">
                        <DeleteButton
                          module="holidays"
                          iconOnly
                          label={`Hapus hari libur ${h.name}`}
                          title="Hapus hari libur?"
                          description={`${h.name} (${fmtDate(h.date)}) tidak lagi dilewati jadwal berulang dan bisa dipilih di kalender. Sesi yang sudah dibuat tidak berubah.`}
                          onConfirm={() => {
                            removeHoliday(h.id);
                            toast.success("Hari libur dihapus.");
                          }}
                          testId={`delete-holiday-${h.id}`}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
