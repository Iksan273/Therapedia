import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { RESPONDENT_PROFILES } from "@/domain/assessment";
import { isApiMode } from "@/config/env";

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
              <p className="text-[11px] text-slate-500">Awalan kode kuesioner (mis. SP2-K7M4QX). Huruf/angka, unik per template.{isApiMode() && catDialog.editingId ? " Dapat diubah selama belum ada kode kuesioner yang terbit dari template ini." : ""}</p>
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
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Profil Data Pengisi</Label>
              <div className="grid gap-2" role="radiogroup" aria-label="Profil Data Pengisi">
                {RESPONDENT_PROFILES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    role="radio"
                    aria-checked={(catDialog.respondentProfile || "none") === p.value}
                    onClick={() => setCatDialog((prev) => ({ ...prev, respondentProfile: p.value }))}
                    className={cn(
                      "text-left rounded-xl border px-3 py-2 min-h-10 transition-colors",
                      (catDialog.respondentProfile || "none") === p.value ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                    data-testid={`category-respondent-profile-${p.value}`}
                  >
                    <span className="block text-xs font-bold text-slate-800">{p.label}</span>
                    <span className="block text-[11px] text-slate-500">{p.hint}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">Langkah "Data Pengisi" otomatis muncul di awal formulir ortu; tidak perlu membuat section pengisi manual.</p>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              className="border-slate-200 font-bold"
              onClick={() => setCatDialog({ open: false, editingId: null, name: "", domain: "", typeCode: "", respondentProfile: "parent" })}
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
