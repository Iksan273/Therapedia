import React from "react";
import { ClientCombobox } from "@/shared/components/ClientCombobox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { CheckCircle2, KeyRound } from "lucide-react";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { CODE_VALIDITY_OPTIONS } from "@/domain/assessment";
import { AssessmentServiceSelect } from "@/shared/components/AssessmentServiceSelect";
import { Switch } from "@/shared/ui/switch";

export function GenerateCodeDialog({ masterPackages = [], categories, clients, genDialog, handleConfirmGenerateCode, previewCode, setGenDialog }) {
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
              Terbitkan kode akses unik (kode jenis asesmen + acak, mis. SP2-K7M4QX) agar orang tua atau pihak sekolah dapat mengisi kuesioner asesmen online tanpa perlu login.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Pilih Klien Tujuan</Label>
              <ClientCombobox
                clients={clients}
                value={genDialog.selectedClientId}
                onChange={(val) => setGenDialog((prev) => ({ ...prev, selectedClientId: val }))}
                placeholder="Cari klien..."
                testId="generate-code-client"
                renderMeta={(c) => <><span className="font-mono">{c.clientCode}</span> • {c.branchId === "branch-citraland" ? "Citraland" : c.branchId === "branch-sby-barat" ? "West" : "East"}</>}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Pilih Template Asesmen</Label>
              <Select
                value={genDialog.selectedCategoryId}
                onValueChange={(val) =>
                  setGenDialog((prev) => ({
                    ...prev,
                    selectedCategoryId: val,
                    generatedCode: previewCode(categories.find((c) => c.id === val)),
                  }))
                }
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

            <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <span>
                <span className="block text-xs font-bold text-slate-800">Masuk invoice</span>
                <span className="block text-[11px] text-slate-500">Matikan untuk kode gratis (mis. School Companion): tanpa invoice dan tanpa form bayar.</span>
              </span>
              <Switch checked={genDialog.withInvoice !== false} onCheckedChange={(v) => setGenDialog((prev) => ({ ...prev, withInvoice: v }))} data-testid="generate-code-invoice-toggle" />
            </label>

            {genDialog.withInvoice !== false && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Layanan (harga invoice assessment)</Label>
              <AssessmentServiceSelect
                packages={masterPackages}
                value={genDialog.servicePackageId}
                onChange={(val) => setGenDialog((prev) => ({ ...prev, servicePackageId: val }))}
                className="w-full border-slate-200 text-xs font-semibold"
                testId="generate-code-service"
              />
            </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Masa Berlaku Kode</Label>
              <Select
                value={genDialog.validity || "none"}
                onValueChange={(val) => setGenDialog((prev) => ({ ...prev, validity: val }))}
              >
                <SelectTrigger className="border-slate-200 text-xs font-semibold" data-testid="generate-code-validity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {CODE_VALIDITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs font-medium">
                      {o.label}
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
                  readOnly
                  className="border-slate-200 font-mono font-black text-sm text-emerald-800 uppercase tracking-widest bg-emerald-50/50"
                />
                <Button
                  variant="outline"
                 
                  className="font-bold shrink-0 cursor-pointer"
                  onClick={() =>
                    setGenDialog((prev) => ({
                      ...prev,
                      generatedCode: previewCode(categories.find((c) => c.id === prev.selectedCategoryId)),
                    }))
                  }
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
