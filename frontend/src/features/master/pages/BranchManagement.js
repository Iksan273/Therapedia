import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { Building2, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { SearchInput } from "@/shared/components/FilterBar";
import { EmptyState } from "@/shared/components/EmptyState";
import { TablePagination, usePagination } from "@/shared/components/TablePagination";
import { useConfirm } from "@/shared/components/ConfirmDialog";
import { useBranches } from "@/stores/branchesStore";
import { useClients } from "@/stores/clientsStore";
import { IfCanDelete } from "@/shared/components/DeleteControls";
import { useBranchDeleteActions } from "@/features/master/hooks/useBranchDeleteActions";
import { useAuth } from "@/stores/authStore";
import { branchCodeOf, validateBranch } from "@/domain/branch";

const EMPTY_FORM = { name: "", code: "", city: "Surabaya", address: "", phone: "" };

// Master Cabang (khusus Master): tambah, ubah, dan aktif/nonaktif cabang. Tanpa hapus: client, staf, jadwal, dan invoice
// menunjuk ke cabang, jadi cabang yang tak lagi beroperasi dinonaktifkan (tidak muncul di pilihan baru, riwayat tetap).
export default function BranchManagement() {
  const { branches, addBranch, updateBranch, setBranchActive } = useBranches();
  const { clients } = useClients();
  const { auth } = useAuth();
  const { impactOf, deleteBranchCascade } = useBranchDeleteActions();
  const { confirm, confirmDialog } = useConfirm();
  const by = auth?.staffName || auth?.role || null;

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null); // branch yang diedit, null = tambah
  const [form, setForm] = useState(EMPTY_FORM);

  const clientCount = useMemo(() => {
    const map = new Map();
    clients.forEach((c) => map.set(c.branchId, (map.get(c.branchId) || 0) + 1));
    return map;
  }, [clients]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return branches.filter((b) => !q || [b.name, b.code, b.city, b.address].some((v) => String(v || "").toLowerCase().includes(q)));
  }, [branches, search]);
  const pg = usePagination(filtered, 10, search);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };
  const openEdit = (b) => {
    setEditing(b);
    setForm({ name: b.name, code: b.code, city: b.city || "", address: b.address || "", phone: b.phone || "" });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const error = validateBranch(form, branches, editing?.id || null);
    if (error) {
      toast.error(error);
      return;
    }
    if (editing) {
      updateBranch(editing.id, { name: form.name.trim(), code: form.code.trim().toUpperCase(), city: form.city.trim(), address: form.address.trim(), phone: form.phone.trim() }, by);
      toast.success(`Cabang ${form.name.trim()} diperbarui.`);
    } else {
      const created = addBranch(form, by);
      toast.success(`Cabang ${created.name} ditambahkan.`);
    }
    setDialogOpen(false);
  };

  // Hapus cabang PERMANEN beserta seluruh isinya; wajib mengetik kode cabang
  const [deleting, setDeleting] = useState(null); // { branch, impact }
  const [confirmCode, setConfirmCode] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const openDelete = (b) => {
    setDeleting({ branch: b, impact: impactOf(b.id) });
    setConfirmCode("");
  };
  // Hapus sinkron (tanpa job async): tombol terkunci "Menghapus…" selama proses; di fase API ini menunggu respons DELETE yang boleh lama
  const confirmDelete = async () => {
    const { branch } = deleting;
    if (confirmCode.trim().toUpperCase() !== branch.code.toUpperCase()) {
      toast.error(`Ketik kode cabang "${branch.code}" untuk mengonfirmasi.`);
      return;
    }
    setDeleteBusy(true);
    let impact;
    try {
      impact = await Promise.resolve(deleteBranchCascade(branch));
    } finally {
      setDeleteBusy(false);
    }
    setDeleting(null);
    toast.success(`Cabang ${branch.name} dihapus permanen (${impact.clients} client, ${impact.sessions} jadwal, ${impact.invoices} invoice, ${impact.staff} akun staf).`);
  };

  const toggleActive = async (b) => {
    const next = b.isActive === false;
    const ok = await confirm({
      title: next ? `Aktifkan cabang ${b.name}?` : `Nonaktifkan cabang ${b.name}?`,
      description: next
        ? "Cabang akan muncul lagi di pilihan penugasan dan input baru."
        : `Cabang tidak muncul di pilihan baru (penugasan staf, intake client). ${clientCount.get(b.id) || 0} client dan seluruh riwayat jadwal/invoice cabang ini tetap tersimpan.`,
      confirmLabel: next ? "Aktifkan" : "Nonaktifkan",
    });
    if (!ok) return;
    setBranchActive(b.id, next, by);
    toast.success(`Cabang ${b.name} ${next ? "diaktifkan" : "dinonaktifkan"}.`);
  };

  return (
    <div className="space-y-6" data-testid="master-branch-management-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100/90 text-sky-800 text-xs font-semibold mb-2">
            <Building2 className="w-3.5 h-3.5 text-sky-600" />
            Master Data • Cabang Klinik
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Master Cabang</h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola data cabang klinik. Cabang yang tidak lagi beroperasi dinonaktifkan (tidak dihapus) agar riwayat tetap utuh.
          </p>
        </div>
        <Button className="bg-sky-600 hover:bg-sky-700 text-white font-bold gap-2 min-h-10 self-start sm:self-auto" onClick={openAdd} data-testid="branch-add-button">
          <Plus className="w-4 h-4" /> Tambah Cabang
        </Button>
      </div>

      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 space-y-3">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">Daftar Cabang ({filtered.length})</CardTitle>
            <CardDescription className="text-xs text-slate-500">Cari berdasarkan nama, kode, kota, atau alamat.</CardDescription>
          </div>
          <SearchInput className="max-w-md" placeholder="Cari nama, kode, kota, atau alamat cabang..." value={search} onChange={setSearch} data-testid="branch-search" />
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {filtered.length === 0 ? (
            <EmptyState icon={Building2} title="Cabang tidak ditemukan" subtitle="Ubah kata kunci pencarian atau tambah cabang baru." />
          ) : (
            <Table stackOnMobile className="min-w-[860px] w-full">
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                  <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6">Cabang</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Alamat & Kontak</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Status</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-right pr-6">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pg.pageItems.map((b) => (
                  <TableRow key={b.id} className="border-b border-slate-100 hover:bg-slate-50/50" data-testid={`branch-row-${b.id}`}>
                    <TableCell data-nolabel className="py-3.5 pl-6">
                      <div className="flex items-center gap-2.5">
                        <div className="min-w-10 h-8 px-1.5 rounded-xl bg-sky-50 text-sky-700 font-bold text-[11px] flex items-center justify-center border border-sky-100 shrink-0">
                          {b.code}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900">{b.name}</p>
                          <p className="text-[11px] text-slate-400 font-medium">{b.city || "—"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell data-label="Alamat & Kontak" className="text-xs text-slate-600 min-w-[220px]">
                      <p>{b.address || <span className="text-slate-400">Alamat belum diisi</span>}</p>
                      <p className="font-mono text-[11px] text-slate-500 mt-0.5">{b.phone || "—"}</p>
                    </TableCell>
                    <TableCell data-label="Status" className="whitespace-nowrap">
                      {b.isActive === false ? (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold">Nonaktif</span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">Aktif</span>
                      )}
                    </TableCell>
                    <TableCell data-nolabel className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <Button size="sm" variant="outline" className="px-2.5 min-h-10 md:min-h-0 text-[11px] font-semibold gap-1.5 cursor-pointer" onClick={() => openEdit(b)} data-testid={`branch-edit-${b.id}`}>
                          <Pencil className="w-3 h-3" /> Ubah
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="px-2.5 min-h-10 md:min-h-0 text-[11px] font-semibold gap-1.5 cursor-pointer"
                          onClick={() => toggleActive(b)}
                          data-testid={`branch-toggle-${b.id}`}
                        >
                          <Power className="w-3 h-3" /> {b.isActive === false ? "Aktifkan" : "Nonaktifkan"}
                        </Button>
                        <IfCanDelete module="branch_master">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="text-rose-600 hover:bg-rose-50 cursor-pointer"
                            aria-label={`Hapus cabang ${b.name}`}
                            title={`Hapus cabang ${b.name}`}
                            onClick={() => openDelete(b)}
                            data-testid={`branch-delete-${b.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </IfCanDelete>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <TablePagination {...pg} onPageChange={pg.setPage} onPageSizeChange={pg.setPageSize} noun="cabang" />
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-2xl p-6 border-slate-200" data-testid="branch-dialog">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-sky-600" /> {editing ? `Ubah Cabang ${editing.name}` : "Tambah Cabang"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Kode cabang unik (2–10 huruf/angka) dan dipakai sebagai singkatan di tabel & laporan.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Nama Cabang *</Label>
              <Input
                className="border-slate-200 bg-slate-50 text-xs font-semibold"
                placeholder="mis. Surabaya Selatan"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value, code: editing || form.code ? form.code : branchCodeOf(e.target.value) })}
                data-testid="branch-form-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Kode *</Label>
                <Input
                  className="border-slate-200 bg-slate-50 text-xs font-mono font-bold uppercase"
                  maxLength={10}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  data-testid="branch-form-code"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Kota</Label>
                <Input className="border-slate-200 bg-slate-50 text-xs" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Alamat</Label>
              <Input className="border-slate-200 bg-slate-50 text-xs" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Telepon</Label>
              <Input className="border-slate-200 bg-slate-50 text-xs font-mono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <DialogFooter className="mt-4 gap-2">
              <Button type="button" variant="outline" className="border-slate-200" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold" data-testid="branch-form-submit">
                {editing ? "Simpan Perubahan" : "Tambah Cabang"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(deleting)} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent className="max-w-md max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-2xl p-6 border-rose-200" data-testid="branch-delete-dialog">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-rose-700 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Hapus permanen cabang {deleting?.branch.name}?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 leading-relaxed">
              Seluruh data cabang ini dihapus <strong>permanen</strong> dan tidak bisa dipulihkan (kecuali dari backup).
            </DialogDescription>
          </DialogHeader>
          {deleting && (
            <ul className="text-xs text-slate-700 space-y-1 rounded-xl border border-rose-100 bg-rose-50/60 p-3" data-testid="branch-delete-impact">
              <li><strong>{deleting.impact.clients}</strong> client beserta kuesioner, riwayat status, dan data kreditnya</li>
              <li><strong>{deleting.impact.sessions}</strong> jadwal sesi beserta laporannya</li>
              <li><strong>{deleting.impact.invoices}</strong> invoice beserta bukti bayar, log, dan paket kredit</li>
              <li><strong>{deleting.impact.staff}</strong> akun staf/terapis cabang ini</li>
              <li><strong>{deleting.impact.holidays}</strong> hari libur khusus cabang</li>
            </ul>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Ketik kode cabang <span className="font-mono text-rose-700">{deleting?.branch.code}</span> untuk mengonfirmasi</Label>
            <Input className="font-mono uppercase" value={confirmCode} onChange={(e) => setConfirmCode(e.target.value)} data-testid="branch-delete-confirm-input" />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" className="border-slate-200" disabled={deleteBusy} onClick={() => setDeleting(null)}>Batal</Button>
            <Button
              type="button"
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              disabled={deleteBusy || confirmCode.trim().toUpperCase() !== (deleting?.branch.code || "").toUpperCase()}
              onClick={confirmDelete}
              data-testid="branch-delete-confirm"
            >
              {deleteBusy ? "Menghapus… mohon tunggu" : "Hapus Permanen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </div>
  );
}
