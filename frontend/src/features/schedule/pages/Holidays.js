import React, { useMemo, useState } from "react";
import DateFilterPicker from "@/shared/components/DateFilterPicker";
import { hasAllBranchAccess } from "@/domain/auth";
import { TablePagination, usePagination } from "@/shared/components/TablePagination";
import { toast } from "sonner";
import { CalendarOff, Pencil, Plus } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/components/EmptyState";
import { DeleteButton } from "@/shared/components/DeleteControls";
import { useHolidays } from "@/stores/holidaysStore";
import { useHolidayActions } from "@/features/schedule/hooks/useHolidayActions";
import { useConfirm } from "@/shared/components/ConfirmDialog";
import { useAuth } from "@/stores/authStore";
import { BRANCHES, branchName } from "@/domain/branch";
import { makeHoliday, validateHoliday } from "@/domain/holiday";
import { fmtDate } from "@/shared/lib/format";
import { todayStr } from "@/shared/lib/id";

// Pengaturan hari libur: jadwal berulang melewati tanggal libur dan kalender tidak bisa memilihnya.
// Menambah libur membatalkan sesi aktif di tanggal itu (konfirmasi + info jumlah sesi); lihat useHolidayActions.
export default function Holidays() {
  const { holidays, removeHoliday } = useHolidays();
  const { previewAffected, createHoliday, changeHoliday } = useHolidayActions();
  const { confirm, confirmDialog } = useConfirm();
  const { auth } = useAuth();
  const isMaster = hasAllBranchAccess(auth); // Master atau akun dengan akses semua cabang

  // Master boleh libur semua cabang; role lain terkunci ke cabangnya
  const emptyForm = { date: "", name: "", scope: isMaster ? "all" : auth?.branchId || "all" };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null); // id libur yang sedang diubah (null = tambah baru)

  const visible = useMemo(
    () =>
      [...holidays]
        .filter((h) => isMaster || !h.branchId || h.branchId === auth?.branchId)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [holidays, isMaster, auth?.branchId]
  );

  const holidaysPg = usePagination(visible, 10);

  // Menetapkan libur membatalkan sesi aktif di tanggal itu (kecuali completed / cancelled / rescheduled). Admin diberi info dulu.
  const handleAdd = async (e) => {
    e.preventDefault();
    const branchId = form.scope === "all" ? null : form.scope;
    const error = validateHoliday(holidays, { date: form.date, name: form.name, branchId, excludeId: editingId });
    if (error) {
      toast.error(error);
      return;
    }
    const draft = editingId ? { date: form.date, name: form.name.trim(), branchId } : makeHoliday({ date: form.date, name: form.name, branchId });
    const affected = previewAffected(draft);
    if (affected.length > 0) {
      const ok = await confirm({
        title: `${affected.length} sesi akan dibatalkan`,
        description: `Ada ${affected.length} sesi (scheduled / menunggu jadwal pengganti) pada ${fmtDate(draft.date)}${branchId ? ` di ${branchName(branchId)}` : ""}. Semuanya otomatis dibatalkan karena hari libur "${draft.name}" tanpa memotong kredit. Sesi completed, cancelled, dan rescheduled tidak berubah.`,
        confirmLabel: "Tetapkan Libur & Batalkan Sesi",
      });
      if (!ok) return;
    }
    const { cancelled } = editingId ? changeHoliday(editingId, { date: draft.date, name: draft.name, branchId }) : createHoliday(draft);
    const info = cancelled > 0 ? ` ${cancelled} sesi pada tanggal itu dibatalkan otomatis (tanpa potong kredit).` : "";
    toast.success(`${editingId ? "Hari libur diperbarui." : "Hari libur ditambahkan."}${info}`);
    if (editingId) setEditingId(null);
    setForm(editingId ? emptyForm : (f) => ({ ...f, date: "", name: "" }));
  };

  const today = todayStr();

  return (
    <div className="space-y-6" data-testid="holidays-page">
      {confirmDialog}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100/80 text-rose-800 text-xs font-semibold mb-2">
          <CalendarOff className="w-3.5 h-3.5 text-rose-600" />
          Pengaturan Hari Libur
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Hari Libur</h1>
        <p className="text-sm text-slate-500 mt-1">
          Tanggal libur dilewati oleh jadwal berulang dan tidak bisa dipilih saat membuat atau memindahkan sesi. Sesi aktif di tanggal libur (scheduled / menunggu jadwal pengganti) otomatis dibatalkan tanpa potong kredit; completed, cancelled, dan rescheduled tidak berubah.
        </p>
      </div>

      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
        <CardContent className="p-4 sm:p-5">
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr_auto_auto] gap-3 items-end" data-testid="holiday-form">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Tanggal *</Label>
              <DateFilterPicker allowClear={false} className="w-full" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="holiday-date-input" />
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
              {editingId ? "Simpan" : <><Plus className="w-4 h-4" /> Tambah</>}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" className="border-slate-200 font-bold" onClick={() => { setEditingId(null); setForm(emptyForm); }} data-testid="holiday-cancel-edit">
                Batal
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          {visible.length === 0 ? (
            <EmptyState icon={CalendarOff} title="Belum ada hari libur" subtitle="Tambahkan tanggal libur nasional atau libur klinik di atas." />
          ) : (
            <>
            <Table stackOnMobile className="min-w-[480px] w-full">
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                  <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6 whitespace-nowrap">Tanggal</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Nama</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">Cabang</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-right pr-6 whitespace-nowrap">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidaysPg.pageItems.map((h) => {
                  return (
                    <TableRow key={h.id} className="border-b border-slate-100 hover:bg-slate-50/50" data-testid={`holiday-row-${h.id}`}>
                      <TableCell data-label="Tanggal" className="pl-6 text-xs font-bold text-slate-900 whitespace-nowrap">
                        {fmtDate(h.date)}
                        {h.date < today && <span className="ml-2 text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Lewat</span>}
                      </TableCell>
                      <TableCell data-label="Nama" className="text-xs font-semibold text-slate-800">{h.name}</TableCell>
                      <TableCell data-label="Cabang" className="text-xs text-slate-600">{h.branchId ? branchName(h.branchId) : "Semua cabang"}</TableCell>
                      <TableCell data-nolabel className="text-right pr-6 whitespace-nowrap">
                        <Button
                          aria-label={`Edit hari libur ${h.name}`}
                          size="icon"
                          variant="ghost"
                          className="text-slate-400 hover:text-sky-700 hover:bg-sky-50 cursor-pointer"
                          onClick={() => {
                            setEditingId(h.id);
                            setForm({ date: h.date, name: h.name, scope: h.branchId || "all" });
                            window.scrollTo?.({ top: 0, behavior: "smooth" });
                          }}
                          title="Edit hari libur"
                          data-testid={`edit-holiday-${h.id}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
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
            <TablePagination {...holidaysPg} onPageChange={holidaysPg.setPage} onPageSizeChange={holidaysPg.setPageSize} noun="hari libur" />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
