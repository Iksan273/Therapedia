import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Package } from "lucide-react";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";

export function NewPackageDialog({ handleAddMasterPackageSubmit, newPkgForm, newPkgOpen, setNewPkgForm, setNewPkgOpen, isEdit = false }) {
  return (
    <Dialog open={newPkgOpen} onOpenChange={setNewPkgOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-sky-600" /> {isEdit ? "Edit Paket Kredit" : "Tambah Paket Kredit Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {isEdit ? "Perubahan berlaku untuk invoice berikutnya. Invoice & paket client yang sudah terbit tetap memakai harga dan isi paket lama, tidak ikut berubah." : "Buat definisi paket layanan baru yang dapat dibeli oleh client."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMasterPackageSubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Nama Paket *</Label>
              <Input
                className="border-slate-200 bg-slate-50 text-xs"
                placeholder="e.g. Paket Intensif Sensori 15x"
                value={newPkgForm.name}
                onChange={(e) => setNewPkgForm({ ...newPkgForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Kode Paket (untuk nomor invoice) *</Label>
              <Input
                className="border-slate-200 bg-slate-50 text-xs font-mono font-bold uppercase tracking-widest"
                placeholder="e.g. REG"
                maxLength={10}
                value={newPkgForm.invoiceCode}
                onChange={(e) => setNewPkgForm({ ...newPkgForm, invoiceCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
                data-testid="new-package-invoice-code"
              />
              <p className="text-[11px] text-slate-500">Muncul di nomor invoice: INV-{newPkgForm.invoiceCode || "KODE"}-20261003-001. Kode ASM dicadangkan untuk invoice Assessment.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Jumlah Kredit Sesi *</Label>
                <Input
                  type="number"
                  className="border-slate-200 bg-slate-50 text-xs font-bold"
                  value={newPkgForm.credits}
                  onChange={(e) => setNewPkgForm({ ...newPkgForm, credits: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Harga Standar (IDR) *</Label>
                <Input
                  type="number"
                  className="border-slate-200 bg-slate-50 text-xs font-bold"
                  value={newPkgForm.price}
                  onChange={(e) => setNewPkgForm({ ...newPkgForm, price: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Credit Leave per Paket (sesi)</Label>
              <Input
                type="number"
                min={0}
                className="border-slate-200 bg-slate-50 text-xs font-bold"
                value={newPkgForm.leaveQuota}
                onChange={(e) => setNewPkgForm({ ...newPkgForm, leaveQuota: e.target.value })}
                data-testid="new-package-leave-quota"
              />
              <p className="text-[11px] text-slate-500">Jumlah pembatalan yang ditanggung per paket. Saat Admin Schedule memilih potong pada Cancel / Off, credit leave ini dipakai dulu (kredit sesi utuh); habis baru kredit sesi dipotong. Berbeda dari jatah cuti 30 hari/tahun (hanya diatur Finance).</p>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div>
                <Label className="text-xs font-bold text-slate-800">Paket satuan (per sesi)</Label>
                <p className="text-[11px] text-slate-500">Credit leave tidak reset otomatis saat renewal (sisa dilanjutkan); cuti maks 1x per bulan.</p>
              </div>
              <Switch checked={Boolean(newPkgForm.isSatuan)} onCheckedChange={(v) => setNewPkgForm({ ...newPkgForm, isSatuan: v })} data-testid="new-package-is-satuan" />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div>
                <Label className="text-xs font-bold text-slate-800">Paket asesmen</Label>
                <p className="text-[11px] text-slate-500">Tampil sebagai pilihan layanan saat menerbitkan kode asesmen/re-assessment.</p>
              </div>
              <Switch checked={Boolean(newPkgForm.isAssessment)} onCheckedChange={(v) => setNewPkgForm({ ...newPkgForm, isAssessment: v })} data-testid="new-package-is-assessment" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Deskripsi Layanan</Label>
              <Input
                className="border-slate-200 bg-slate-50 text-xs"
                placeholder="e.g. Paket khusus kebutuhan intensif 3x seminggu"
                value={newPkgForm.description}
                onChange={(e) => setNewPkgForm({ ...newPkgForm, description: e.target.value })}
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button type="button" variant="outline" className="border-slate-200" onClick={() => setNewPkgOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold">
                {isEdit ? "Simpan Perubahan" : "Simpan Paket Baru"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
  );
}
