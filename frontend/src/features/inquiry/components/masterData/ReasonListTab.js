import { IfCanDelete } from "@/shared/components/DeleteControls";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { EmptyState } from "@/shared/components/EmptyState";
import { useConfirm } from "@/shared/components/ConfirmDialog";

const EMPTY = { open: false, editingValue: null, value: "", label: "", active: true };

const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

// CRUD daftar pilihan cepat alasan (cancel / discharge). Data transaksi menyimpan alasan sebagai string,
// jadi menghapus pilihan tidak merusak riwayat; hanya label lama tampil sebagai kodenya.
// `codeMode` = kode wajib, singkat, HURUF BESAR (mis. S, OL, SCA). Kode itulah yang disimpan di transaksi dan tampil di riwayat.
export function ReasonListTab({ noun, hint, icon: Icon, items, onAdd, onUpdate, onDelete, testId, codeMode = false, reservedCodes = [] }) {
  const { confirm, confirmDialog } = useConfirm();
  const [dialog, setDialog] = useState(EMPTY);

  const openEdit = (r) => setDialog({ open: true, editingValue: r.value, value: r.value, label: r.label, active: r.active !== false });

  const save = () => {
    const label = dialog.label.trim();
    if (!label) {
      toast.error(`Nama ${noun} wajib diisi.`);
      return;
    }
    if (dialog.editingValue) {
      onUpdate(dialog.editingValue, { label, active: dialog.active });
      toast.success(`${noun} "${label}" diperbarui.`);
    } else {
      const code = codeMode ? dialog.value.trim().toUpperCase() : slugify(dialog.value || label);
      if (codeMode ? !/^[A-Z0-9]{1,10}$/.test(code) : !code) {
        toast.error(codeMode ? `Kode ${noun} wajib diisi: 1-10 karakter huruf/angka (mis. S, OL, SCA).` : `Kode ${noun} tidak valid.`);
        return;
      }
      if (items.some((r) => r.value === code) || reservedCodes.includes(code)) {
        toast.error(`Kode "${code}" sudah dipakai.`);
        return;
      }
      onAdd({ value: code, label, active: dialog.active });
      toast.success(`${noun} "${label}" ditambahkan.`);
    }
    setDialog(EMPTY);
  };

  const remove = async (r) => {
    const description = `"${r.label}" akan dihapus dari pilihan cepat. Riwayat lama tetap tersimpan, tetapi tampil sebagai kode "${r.value}".`;
    if (!(await confirm({ title: `Hapus ${noun}?`, description }))) return;
    onDelete(r.value);
    toast.success(`${noun} "${r.label}" dihapus.`);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden" data-testid={`${testId}-tab`}>
      {confirmDialog}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-100">
        <p className="text-xs text-slate-500 font-medium">{hint}</p>
        <Button
          size="sm"
          className="gap-1.5 font-bold bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shrink-0"
          onClick={() => setDialog({ ...EMPTY, open: true })}
          data-testid={`add-${testId}-button`}
        >
          <Plus className="w-4 h-4" /> Tambah {noun}
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Icon} title={`Belum ada ${noun}`} subtitle="User tetap bisa mengetik alasan sendiri saat mengisi form." />
      ) : (
        <div className="overflow-x-auto">
          <Table stackOnMobile>
            <TableHeader>
              <TableRow>
                {codeMode && <TableHead className="text-xs font-bold">Kode</TableHead>}
                <TableHead className="text-xs font-bold">Nama</TableHead>
                {!codeMode && <TableHead className="text-xs font-bold">Kode</TableHead>}
                <TableHead className="text-xs font-bold text-center">Aktif</TableHead>
                <TableHead className="text-xs font-bold text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.value} data-testid={`${testId}-row-${r.value}`}>
                  {codeMode && <TableCell data-label="Kode" className="font-mono text-xs font-black text-slate-900">{r.value}</TableCell>}
                  <TableCell data-nolabel className="min-w-[200px] text-xs font-bold text-slate-900">{r.label}</TableCell>
                  {!codeMode && <TableCell data-label="Kode" className="font-mono text-[11px] text-slate-600">{r.value}</TableCell>}
                  <TableCell data-label="Aktif" className="text-center">
                    <Switch
                      checked={r.active !== false}
                      onCheckedChange={(checked) => {
                        onUpdate(r.value, { active: checked });
                        toast.success(`"${r.label}" ${checked ? "diaktifkan" : "dinonaktifkan"}.`);
                      }}
                      aria-label={`Aktifkan ${r.label}`}
                    />
                  </TableCell>
                  <TableCell data-nolabel className="text-right whitespace-nowrap">
                    <Button aria-label={`Edit ${noun}`} size="icon" variant="ghost" className="cursor-pointer" onClick={() => openEdit(r)} data-testid={`edit-${testId}-${r.value}`}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <IfCanDelete module="inquiry_pipeline">
                    <Button
                      aria-label={`Hapus ${noun}`}
                      size="icon"
                      variant="ghost"
                      className="text-rose-600 hover:bg-rose-50 cursor-pointer"
                      onClick={() => remove(r)}
                      data-testid={`delete-${testId}-${r.value}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    </IfCanDelete>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialog.open} onOpenChange={(open) => !open && setDialog(EMPTY)}>
        <DialogContent className="max-w-md rounded-2xl max-h-[calc(100dvh-2.5rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog.editingValue ? `Edit ${noun}` : `Tambah ${noun}`}</DialogTitle>
            <DialogDescription>Muncul sebagai pilihan cepat. User tetap bisa mengetik alasan sendiri.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Nama *</Label>
              <Input value={dialog.label} onChange={(e) => setDialog((p) => ({ ...p, label: e.target.value }))} maxLength={120} data-testid={`${testId}-label-input`} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Kode{codeMode ? " *" : ""}</Label>
              <Input
                value={dialog.value}
                disabled={Boolean(dialog.editingValue)}
                onChange={(e) => setDialog((p) => ({ ...p, value: codeMode ? e.target.value.toUpperCase() : e.target.value }))}
                maxLength={codeMode ? 10 : undefined}
                placeholder={codeMode ? "mis. SCA" : slugify(dialog.label) || "otomatis"}
                className="font-mono text-xs"
                data-testid={`${testId}-code-input`}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <Label className="text-xs font-bold">Aktif</Label>
              <Switch checked={dialog.active} onCheckedChange={(v) => setDialog((p) => ({ ...p, active: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(EMPTY)}>
              Batal
            </Button>
            <Button className="bg-sky-600 hover:bg-sky-700 text-white" onClick={save} data-testid={`save-${testId}-button`}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
