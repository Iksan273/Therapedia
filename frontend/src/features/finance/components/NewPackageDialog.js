import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Package } from "lucide-react";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";

export function NewPackageDialog({ handleAddMasterPackageSubmit, newPkgForm, newPkgOpen, setNewPkgForm, setNewPkgOpen }) {
  return (
    <Dialog open={newPkgOpen} onOpenChange={setNewPkgOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-sky-600" /> Tambah Paket Kredit Baru
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Buat definisi paket layanan baru yang dapat dibeli oleh client.
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
                Simpan Paket Baru
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
  );
}
