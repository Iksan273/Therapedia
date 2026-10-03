import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";

export function CategoryDialog({ catDialog, saveCategory, setCatDialog }) {
  return (
    <Dialog open={catDialog.open} onOpenChange={(open) => setCatDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-7 border-slate-200 shadow-xl">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-xl font-black text-slate-900">
              {catDialog.editingId ? "Edit Kategori Asesmen" : "Kategori Asesmen Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Buat template baku instrumen observasi baru untuk disimpan dalam bank data master klinik.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Nama Template Asesmen</Label>
              <Input
                placeholder="misal: Pediatric Occupational Therapy Profile"
                value={catDialog.name}
                onChange={(e) => setCatDialog((prev) => ({ ...prev, name: e.target.value }))}
                className="border-slate-200 text-xs font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Kode Jenis Asesmen</Label>
              <Input
                placeholder="misal: SP2"
                value={catDialog.typeCode || ""}
                maxLength={10}
                onChange={(e) => setCatDialog((prev) => ({ ...prev, typeCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))}
                className="border-slate-200 font-mono text-xs font-bold uppercase tracking-widest"
                data-testid="category-type-code-input"
              />
              <p className="text-[11px] text-slate-500">Awalan kode kuesioner (mis. SP2-K7M4QX). Huruf/angka, unik per template.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Domain / Spesialisasi Klinis</Label>
              <Input
                placeholder="misal: Sensory & Motor Functional Development"
                value={catDialog.domain}
                onChange={(e) => setCatDialog((prev) => ({ ...prev, domain: e.target.value }))}
                className="border-slate-200 text-xs font-medium"
              />
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              className="border-slate-200 font-bold"
              onClick={() => setCatDialog({ open: false, editingId: null, name: "", domain: "", typeCode: "" })}
            >
              Batal
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer"
              onClick={saveCategory}
            >
              Simpan Kategori
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
