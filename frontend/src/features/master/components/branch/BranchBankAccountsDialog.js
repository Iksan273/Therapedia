import React, { useState } from "react";
import { toast } from "sonner";
import { Landmark, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { useConfirm } from "@/shared/components/ConfirmDialog";
import { IfCanDelete } from "@/shared/components/DeleteControls";
import { useBranches } from "@/stores/branchesStore";
import { useAuth } from "@/stores/authStore";
import { validateBankAccount } from "@/domain/branch";
import { apiErrorText } from "@/domain/auth";

const EMPTY_FORM = { bankName: "", accountNumber: "", accountHolder: "" };

// Kelola rekening bank pembayaran satu cabang (Master Cabang). Rekening aktif ditampilkan ke ortu di kuesioner publik
// dan portal ortu sesuai cabang intake client. `branchId` null = dialog tertutup.
export function BranchBankAccountsDialog({ branchId, onClose }) {
  const { branches, addBankAccount, updateBankAccount, setBankAccountActive, removeBankAccount } = useBranches();
  const { auth } = useAuth();
  const { confirm, confirmDialog } = useConfirm();
  const by = auth?.staffName || auth?.role || null;

  const branch = branches.find((b) => b.id === branchId) || null;
  const accounts = [...(branch?.bankAccounts || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const [editing, setEditing] = useState(null); // rekening yang diedit; null = tambah
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const closeAll = () => {
    setFormOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    onClose();
  };
  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };
  const openEdit = (a) => {
    setEditing(a);
    setForm({ bankName: a.bankName, accountNumber: a.accountNumber, accountHolder: a.accountHolder });
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validateBankAccount(form, accounts, editing?.id || null);
    if (error) {
      toast.error(error);
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateBankAccount(branch.id, editing.id, form, by);
        toast.success(`Rekening ${form.bankName.trim()} diperbarui.`);
      } else {
        await addBankAccount(branch.id, form, by);
        toast.success(`Rekening ${form.bankName.trim()} ditambahkan.`);
      }
      setFormOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      toast.error(apiErrorText(err, ["bank_name", "account_number", "account_holder"]));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (a, checked) => {
    try {
      await setBankAccountActive(branch.id, a.id, checked, by);
      toast.success(`Rekening ${a.bankName} ${checked ? "diaktifkan" : "dinonaktifkan"}.`);
    } catch (err) {
      toast.error(apiErrorText(err));
    }
  };

  const remove = async (a) => {
    const ok = await confirm({
      title: "Hapus rekening?",
      description: `Rekening ${a.bankName} ${a.accountNumber} dihapus permanen dan tidak lagi tampil ke ortu.`,
      confirmLabel: "Hapus",
    });
    if (!ok) return;
    try {
      await removeBankAccount(branch.id, a.id, by);
      toast.success(`Rekening ${a.bankName} dihapus.`);
    } catch (err) {
      toast.error(apiErrorText(err));
    }
  };

  return (
    <>
      <Dialog open={Boolean(branch)} onOpenChange={(v) => !v && closeAll()}>
        <DialogContent className="max-w-lg max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-2xl p-6 border-slate-200" data-testid="branch-bank-accounts-dialog">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-sky-600" /> Rekening Bank {branch?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Rekening aktif tampil ke ortu client cabang ini sebagai info pembayaran (kuesioner & portal ortu).
            </DialogDescription>
          </DialogHeader>

          {accounts.length === 0 ? (
            <p className="text-xs text-slate-500 rounded-xl border border-dashed border-slate-200 p-4 text-center" data-testid="bank-account-empty">
              Belum ada rekening. Tambahkan rekening pembayaran cabang ini.
            </p>
          ) : (
            <ul className="space-y-2">
              {accounts.map((a) => (
                <li key={a.id} className="rounded-xl border border-slate-200 p-3 flex items-start justify-between gap-3" data-testid={`bank-account-row-${a.id}`}>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{a.bankName}</p>
                    <p className="font-mono text-sm font-black text-slate-900 break-all">{a.accountNumber}</p>
                    <p className="text-[11px] text-slate-500">a.n. {a.accountHolder}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Switch checked={a.isActive !== false} onCheckedChange={(v) => toggle(a, v)} aria-label={`Aktifkan rekening ${a.bankName}`} data-testid={`bank-account-toggle-${a.id}`} />
                    <Button type="button" size="icon" variant="ghost" className="cursor-pointer" aria-label={`Ubah rekening ${a.bankName}`} onClick={() => openEdit(a)} data-testid={`bank-account-edit-${a.id}`}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <IfCanDelete module="branch_master">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-rose-600 hover:bg-rose-50 cursor-pointer"
                        aria-label={`Hapus rekening ${a.bankName}`}
                        onClick={() => remove(a)}
                        data-testid={`bank-account-delete-${a.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </IfCanDelete>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {formOpen ? (
            <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-sky-100 bg-sky-50/40 p-3.5" data-testid="bank-account-form">
              <p className="text-xs font-bold text-slate-800">{editing ? "Ubah Rekening" : "Tambah Rekening"}</p>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Nama Bank *</Label>
                <Input className="bg-white text-xs font-semibold" placeholder="mis. BCA" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} data-testid="bank-account-form-bank" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Nomor Rekening *</Label>
                <Input className="bg-white text-xs font-mono" inputMode="numeric" placeholder="mis. 0123456789" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} data-testid="bank-account-form-number" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Atas Nama *</Label>
                <Input className="bg-white text-xs" placeholder="mis. PT Therapedia Tumbuh Kembang" value={form.accountHolder} onChange={(e) => setForm({ ...form, accountHolder: e.target.value })} data-testid="bank-account-form-holder" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" className="border-slate-200" onClick={() => { setFormOpen(false); setEditing(null); }}>
                  Batal
                </Button>
                <Button type="submit" disabled={saving} className="bg-sky-600 hover:bg-sky-700 text-white font-bold" data-testid="bank-account-form-submit">
                  {editing ? "Simpan" : "Tambah"}
                </Button>
              </div>
            </form>
          ) : (
            <Button type="button" className="w-full gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold min-h-10" onClick={openAdd} data-testid="bank-account-add-button">
              <Plus className="w-4 h-4" /> Tambah Rekening
            </Button>
          )}
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </>
  );
}
