import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";

export function SectionDialog({ saveSection, secDialog, setSecDialog }) {
  return (
    <Dialog open={secDialog.open} onOpenChange={(open) => setSecDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-7 border-slate-200 shadow-xl">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-xl font-black text-slate-900">
              {secDialog.editingSectionId ? "Edit Domain Klinis" : "Tambah Domain Klinis Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Domain adalah payung kelompok aspek observasi klinis (misal: Classroom Attention, Peer Socialization, dsb.) yang menaungi butir pernyataan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Nama Judul Domain</Label>
              <Input
                placeholder="misal: Pemrosesan Auditori atau Classroom Attention"
                value={secDialog.title}
                onChange={(e) => setSecDialog((prev) => ({ ...prev, title: e.target.value }))}
                className="border-slate-200 text-xs font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Kalimat Pengantar (Lead Text) <span className="font-medium text-slate-400">(opsional)</span></Label>
              <Input
                placeholder="misal: Anakku ... atau Di kelas, siswa ..."
                value={secDialog.leadText}
                onChange={(e) => setSecDialog((prev) => ({ ...prev, leadText: e.target.value }))}
                className="border-slate-200 text-xs font-medium"
              />
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              className="font-bold"
              onClick={() => setSecDialog({ open: false, categoryId: null, editingSectionId: null, title: "", leadText: "" })}
            >
              Batal
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer"
              onClick={saveSection}
            >
              Simpan Domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
