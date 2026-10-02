import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { CheckCircle2, KeyRound } from "lucide-react";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { genCode } from "@/shared/lib/id";

export function GenerateCodeDialog({ categories, clients, genDialog, handleConfirmGenerateCode, setGenDialog }) {
  return (
    <Dialog open={genDialog.open} onOpenChange={(open) => setGenDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-7 border-slate-200 shadow-xl">
          <DialogHeader className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
              <KeyRound className="w-6 h-6 stroke-[2.2]" />
            </div>
            <DialogTitle className="text-xl font-black text-slate-900">
              Terbitkan Kode Kuesioner Asesmen
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed font-medium">
              Terbitkan kode akses unik (format ASM-XXXX) agar orang tua atau pihak sekolah dapat mengisi kuesioner asesmen online tanpa perlu login.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Pilih Klien Tujuan</Label>
              <Select
                value={genDialog.selectedClientId}
                onValueChange={(val) => setGenDialog((prev) => ({ ...prev, selectedClientId: val }))}
              >
                <SelectTrigger className="border-slate-200 text-xs font-semibold">
                  <SelectValue placeholder="Pilih Klien..." />
                </SelectTrigger>
                <SelectContent className="max-h-56 rounded-xl">
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs font-medium">
                      {c.clientName} ({c.clientAccessCode}) • {c.branchId === "branch-citraland" ? "Citraland" : c.branchId === "branch-sby-barat" ? "West" : "East"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Pilih Template Asesmen</Label>
              <Select
                value={genDialog.selectedCategoryId}
                onValueChange={(val) => setGenDialog((prev) => ({ ...prev, selectedCategoryId: val }))}
              >
                <SelectTrigger className="border-slate-200 text-xs font-semibold">
                  <SelectValue placeholder="Pilih Kategori..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="text-xs font-medium">
                      {cat.categoryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Kode Akses Dihasilkan</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={genDialog.generatedCode}
                  onChange={(e) => setGenDialog((prev) => ({ ...prev, generatedCode: e.target.value.toUpperCase() }))}
                  className="border-slate-200 font-mono font-black text-sm text-emerald-800 uppercase tracking-widest bg-emerald-50/50"
                />
                <Button
                  variant="outline"
                 
                  className="font-bold shrink-0 cursor-pointer"
                  onClick={() => setGenDialog((prev) => ({ ...prev, generatedCode: genCode("ASM") }))}
                >
                  Acak Ulang
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              className="border-slate-200 font-bold"
              onClick={() => setGenDialog((prev) => ({ ...prev, open: false }))}
            >
              Batal
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-xs cursor-pointer"
              onClick={handleConfirmGenerateCode}
            >
              <CheckCircle2 className="w-4 h-4" /> Simpan & Terbitkan Kode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
